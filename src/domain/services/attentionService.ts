import { countryFlag, getCountryName } from '@/data/dataset/countries';
import { getDocumentExpiryState } from '@/domain/utils/documentExpiry';
import { shouldSurfaceImmigrationDocument } from '@/domain/services/citizenshipService';
import { shouldAskVisaQuestion } from '@/domain/services/nationalityHomeLogic';
import { visaCoversStayWindow } from '@/domain/services/visaStayLogic';
import { daysUntil, isCurrentStay, todayIso } from '@/domain/utils/dates';
import type { AttentionItem, Document, Rule, RuleCalculationResult, Stay } from '@/shared/types';

function linkedDocumentIdFromRule(rule: Rule): string | null {
  const config = rule.config;
  if (!config || typeof config !== 'object') {
    return null;
  }
  const linked = (config as { linkedDocumentId?: unknown }).linkedDocumentId;
  return typeof linked === 'string' && linked.length > 0 ? linked : null;
}

function pickPreferredVisaPerCountry(existing: Document, candidate: Document, today: string): Document {
  const existingExpired = getDocumentExpiryState(existing.expiryDate, today) === 'expired';
  const candidateExpired = getDocumentExpiryState(candidate.expiryDate, today) === 'expired';

  if (existingExpired !== candidateExpired) {
    return candidateExpired ? existing : candidate;
  }

  if (!existingExpired && existing.expiryDate && candidate.expiryDate) {
    return candidate.expiryDate < existing.expiryDate ? candidate : existing;
  }

  return candidate.updatedAt > existing.updatedAt ? candidate : existing;
}

/** One radar card per destination — prefer the active visa, not a newer archived duplicate. */
function dedupeVisaDocumentsForRadar(documents: Document[], today: string): Document[] {
  const nonVisas = documents.filter((document) => document.documentType !== 'visa');
  const visas = documents.filter((document) => document.documentType === 'visa');
  const bestByCountry = new Map<string, Document>();

  for (const visa of visas) {
    const key = (visa.issuingCountry ?? visa.id).toUpperCase();
    const existing = bestByCountry.get(key);
    if (!existing) {
      bestByCountry.set(key, visa);
      continue;
    }
    bestByCountry.set(key, pickPreferredVisaPerCountry(existing, visa, today));
  }

  return [...nonVisas, ...bestByCountry.values()];
}

function documentAttentionTitle(document: Document): string {
  if (!document.issuingCountry) {
    return document.title;
  }
  const countryName = getCountryName(document.issuingCountry);
  const flag = countryFlag(document.issuingCountry);
  return `${flag} ${countryName} · ${document.title}`;
}

function documentAttentionSubtitle(
  document: Document,
  remaining: number,
  linkedRule?: { result: RuleCalculationResult },
): string {
  const expiryText =
    remaining < 0
      ? 'Expired'
      : remaining <= 7
        ? `Expires in ${remaining} days`
        : `Expires in ${remaining} days`;

  let subtitle = document.issuingCountry
    ? expiryText
    : `${expiryText} · Add issuing country in document details`;

  if (linkedRule?.result.daysRemaining != null && document.maxStayDays) {
    const { result } = linkedRule;
    const usage =
      result.state === 'ESTIMATED'
        ? `~${result.daysUsed ?? 0} of ${result.threshold} stay days`
        : `${result.daysUsed ?? 0} of ${result.threshold} stay days · ${result.daysRemaining} remaining`;
    subtitle = `${subtitle} · ${usage}`;
  }

  return subtitle;
}

const DOCUMENT_EXPIRY_RADAR_DAYS = 90;
const VISA_RECENTLY_EXPIRED_RADAR_DAYS = 7;

function shouldIncludeDocumentOnRadar(
  document: Document,
  remaining: number,
  linkedRule?: { result: RuleCalculationResult },
): boolean {
  if (document.documentType === 'visa') {
    if (remaining >= -VISA_RECENTLY_EXPIRED_RADAR_DAYS) {
      return true;
    }
    return false;
  }

  if (remaining <= DOCUMENT_EXPIRY_RADAR_DAYS) {
    return true;
  }

  if (linkedRule?.result.daysRemaining != null) {
    return true;
  }

  return false;
}

export function buildDocumentAttentionItems(
  documents: Document[],
  today: string = todayIso(),
  citizenships: string[] = [],
  ruleResults: Array<{ rule: Rule; result: RuleCalculationResult }> = [],
): AttentionItem[] {
  const linkedRuleByDocumentId = new Map<string, { rule: Rule; result: RuleCalculationResult }>();
  for (const entry of ruleResults) {
    const linkedId = linkedDocumentIdFromRule(entry.rule);
    if (linkedId) {
      linkedRuleByDocumentId.set(linkedId, entry);
    }
  }

  return dedupeVisaDocumentsForRadar(documents, today)
    .filter((document) => document.expiryDate)
    .filter((document) => shouldSurfaceImmigrationDocument(document, citizenships))
    .map((document) => {
      const remaining = daysUntil(document.expiryDate!, today);
      let priority: AttentionItem['priority'] = 'upcoming';
      if (remaining <= 7) {
        priority = 'urgent';
      } else if (remaining <= 30) {
        priority = 'important';
      }

      return {
        id: `document-${document.id}`,
        priority,
        title: documentAttentionTitle(document),
        subtitle: documentAttentionSubtitle(document, remaining, linkedRuleByDocumentId.get(document.id)),
        actionLabel:
          document.documentType === 'visa' || remaining <= DOCUMENT_EXPIRY_RADAR_DAYS
            ? 'Review document'
            : undefined,
        sourceType: 'document',
        sourceId: document.id,
      } satisfies AttentionItem;
    })
    .filter((item) => {
      const document = documents.find((doc) => doc.id === item.sourceId);
      if (!document?.expiryDate) {
        return false;
      }
      const remaining = daysUntil(document.expiryDate, today);
      return shouldIncludeDocumentOnRadar(
        document,
        remaining,
        linkedRuleByDocumentId.get(document.id),
      );
    });
}

export function buildStayVisaAttentionItems(
  stays: Stay[],
  documents: Document[],
  citizenships: string[],
  today: string = todayIso(),
): AttentionItem[] {
  const items: AttentionItem[] = [];

  for (const stay of stays) {
    if (!shouldAskVisaQuestion(stay.countryCode, citizenships)) {
      continue;
    }
    if (stay.visaNeeded !== true) {
      continue;
    }

    const isActive =
      isCurrentStay(stay, today) ||
      (stay.departureDate != null && stay.departureDate >= today && stay.arrivalDate != null && stay.arrivalDate <= today);
    if (!isActive) {
      continue;
    }

    const countryName = getCountryName(stay.countryCode);
    const flag = countryFlag(stay.countryCode);
    const departure = stay.departureDate;
    const linked = stay.visaDocumentId
      ? documents.find((document) => document.id === stay.visaDocumentId)
      : null;

    if (!linked) {
      items.push({
        id: `stay-visa-${stay.id}`,
        priority: 'urgent',
        title: `${flag} ${countryName} · Visa missing`,
        subtitle: 'This stay needs a visa — add dates or link a visa document.',
        actionLabel: 'Review stay',
        sourceType: 'stay',
        sourceId: stay.id,
      });
      continue;
    }

    if (
      stay.arrivalDate &&
      !visaCoversStayWindow(linked, stay.arrivalDate, departure)
    ) {
      items.push({
        id: `stay-visa-${stay.id}`,
        priority: 'important',
        title: `${flag} ${countryName} · Visa dates`,
        subtitle: 'Your visa on file does not cover this stay. Update the visa or stay dates.',
        actionLabel: 'Review stay',
        sourceType: 'document',
        sourceId: linked.id,
      });
    }
  }

  return items;
}

export function buildRuleAttentionItems(
  rules: Rule[],
  results: Array<{ rule: Rule; result: RuleCalculationResult }>,
): AttentionItem[] {
  const items: AttentionItem[] = [];

  for (const { rule, result } of results) {
    if (!rule.enabled || result.state === 'UNAVAILABLE') {
      continue;
    }

    if (linkedDocumentIdFromRule(rule)) {
      continue;
    }

    if (result.daysRemaining != null && result.daysRemaining <= 30) {
      items.push({
        id: `rule-${rule.id}`,
        priority: result.daysRemaining <= 7 ? 'important' : 'upcoming',
        title: rule.name,
        subtitle:
          result.state === 'ESTIMATED'
            ? `~${result.daysUsed ?? 0} of ${result.threshold} days`
            : `${result.daysUsed ?? 0} of ${result.threshold} days · ${result.daysRemaining} remaining`,
        actionLabel: 'View calculation',
        sourceType: 'rule',
        sourceId: rule.id,
      });
    }
  }

  return items;
}

export function sortAttentionItems(items: AttentionItem[]): AttentionItem[] {
  const order = { urgent: 0, important: 1, upcoming: 2 } as const;
  return [...items].sort((a, b) => order[a.priority] - order[b.priority]);
}
