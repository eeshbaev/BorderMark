import { createDocument, listDocuments, saveDocument } from '@/data/repositories/documentRepository';
import { saveRule, listRules } from '@/data/repositories/contentRepository';
import { setCountryVisaPreference } from '@/data/repositories/visaCountryPreferenceRepository';
import { getCountryName } from '@/data/dataset/countries';
import { shouldAskVisaQuestion } from '@/domain/services/nationalityHomeLogic';
import { StayValidationError } from '@/domain/services/stayInputValidation';
import {
  listActiveVisasForCountry,
  visaCoversStayWindow,
  type StayVisaFormInput,
} from '@/domain/services/visaStayLogic';
import { parseIsoDateInput } from '@/domain/utils/isoDateInput';
import { generateId, nowIso } from '@/domain/utils/dates';
import type { Document, Rule, Stay } from '@/shared/types';

export type { StayVisaFormInput } from '@/domain/services/visaStayLogic';
export {
  activeVisaStatusMessage,
  defaultVisaNeededForCountry,
  inferPastVisaNeeded,
  isVisaDocumentActive,
  listActiveVisasForCountry,
  validateStayVisaForm,
  visaCoversStayWindow,
} from '@/domain/services/visaStayLogic';

export async function syncVisaDocumentDayCapRule(document: Document): Promise<void> {
  if (document.documentType !== 'visa' || !document.issuingCountry) {
    return;
  }
  await syncVisaDayCapRule(document, document.issuingCountry);
}

async function syncVisaDayCapRule(document: Document, countryCode: string): Promise<Rule | null> {
  if (!document.maxStayDays || document.maxStayDays <= 0) {
    return null;
  }

  const rules = await listRules();
  const existing = rules.find(
    (rule) =>
      rule.ruleType === 'custom_threshold' &&
      rule.config &&
      typeof rule.config === 'object' &&
      (rule.config as { linkedDocumentId?: string }).linkedDocumentId === document.id,
  );

  const name = `${getCountryName(countryCode)} visa · ${document.maxStayDays} days`;
  const payload = {
    id: existing?.id ?? generateId(),
    ruleType: 'custom_threshold' as const,
    name,
    enabled: true,
    applicableCountries: [countryCode.toUpperCase()],
    threshold: document.maxStayDays,
    lookbackDays: document.maxStayDays,
    config: { linkedDocumentId: document.id },
    createdAt: existing?.createdAt ?? nowIso(),
    updatedAt: nowIso(),
  };

  return saveRule(payload);
}

export async function applyStayVisaAfterSave(
  stay: Stay,
  input: StayVisaFormInput,
): Promise<Stay> {
  if (!shouldAskVisaQuestion(input.countryCode, input.nationalities)) {
    return stay;
  }

  await setCountryVisaPreference(input.countryCode, input.visaNeeded === true);

  if (input.visaNeeded !== true) {
    return { ...stay, visaNeeded: false, visaDocumentId: null };
  }

  let visaDocument: Document | null = null;
  const allDocuments = await listDocuments();
  let visaInput = input;

  if (!visaInput.visaDocumentId) {
    const autoCovering = listActiveVisasForCountry(
      allDocuments,
      visaInput.countryCode,
      visaInput.stayDepartureDate ?? visaInput.stayArrivalDate,
    ).find((document) =>
      visaCoversStayWindow(document, visaInput.stayArrivalDate, visaInput.stayDepartureDate),
    );
    if (autoCovering) {
      visaInput = { ...visaInput, visaDocumentId: autoCovering.id };
    }
  }

  if (visaInput.visaDocumentId) {
    visaDocument = allDocuments.find((item) => item.id === visaInput.visaDocumentId) ?? null;
    if (!visaDocument) {
      throw new StayValidationError('Selected visa document was not found.');
    }
    if (
      !visaCoversStayWindow(visaDocument, input.stayArrivalDate, input.stayDepartureDate)
    ) {
      throw new StayValidationError(
        'This visa does not cover your stay dates. Record a new visa with updated issue and expiry dates.',
      );
    }
  } else {
    const issueDate = parseIsoDateInput(visaInput.visaIssueDate)!;
    const expiryDate = parseIsoDateInput(visaInput.visaExpiryDate)!;
    const maxDays = visaInput.visaMaxStayDays.trim()
      ? Number.parseInt(visaInput.visaMaxStayDays.trim(), 10)
      : null;

    visaDocument = await createDocument({
      title: `${getCountryName(visaInput.countryCode)} visa`,
      documentType: 'visa',
      issueDate,
      expiryDate,
      issuingCountry: visaInput.countryCode.toUpperCase(),
      documentNumber: null,
      notes: null,
      linkedStayId: stay.id,
      maxStayDays: Number.isFinite(maxDays) && maxDays! > 0 ? maxDays : null,
    });

    if (visaDocument.maxStayDays) {
      await syncVisaDayCapRule(visaDocument, visaInput.countryCode);
    }
  }

  if (visaDocument && visaDocument.linkedStayId !== stay.id) {
    await saveDocument({ ...visaDocument, linkedStayId: stay.id });
  }

  return {
    ...stay,
    visaNeeded: true,
    visaDocumentId: visaDocument.id,
  };
}
