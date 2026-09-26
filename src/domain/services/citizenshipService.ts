import type { Document, Rule, Stay } from '@/shared/types';

export function parseCitizenships(raw: string | null | undefined): string[] {
  if (!raw) {
    return [];
  }
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }
    return [...new Set(parsed.filter((code): code is string => typeof code === 'string' && code.length > 0))];
  } catch {
    return [];
  }
}

export function serializeCitizenships(codes: string[]): string {
  return JSON.stringify([...new Set(codes.filter(Boolean))]);
}

export function normalizeCitizenships(
  citizenships: string[] | null | undefined,
  legacyHomeCountry: string | null | undefined,
): string[] {
  const normalized = [...new Set((citizenships ?? []).filter(Boolean))];
  if (normalized.length > 0) {
    return normalized;
  }
  return legacyHomeCountry ? [legacyHomeCountry] : [];
}

export function isCitizenshipCountry(countryCode: string, citizenships: string[]): boolean {
  return citizenships.includes(countryCode);
}

/** Default immigration rules ignore days spent in citizenship countries. */
export function filterStaysForDefaultRules(stays: Stay[], citizenships: string[]): Stay[] {
  if (citizenships.length === 0) {
    return stays;
  }
  return stays.filter((stay) => !isCitizenshipCountry(stay.countryCode, citizenships));
}

export function staysForRuleCalculation(
  rule: Rule,
  stays: Stay[],
  citizenships: string[],
): Stay[] {
  if (rule.ruleType === 'custom_threshold') {
    return stays;
  }
  return filterStaysForDefaultRules(stays, citizenships);
}

export function shouldSurfaceImmigrationDocument(
  document: Document,
  citizenships: string[],
): boolean {
  if (document.documentType !== 'visa' && document.documentType !== 'residence_permit') {
    return true;
  }
  if (!document.issuingCountry || citizenships.length === 0) {
    return true;
  }
  return !isCitizenshipCountry(document.issuingCountry, citizenships);
}

export function formatCitizenshipLabel(codes: string[], getName: (code: string) => string): string {
  if (codes.length === 0) {
    return 'Add citizenship';
  }
  if (codes.length === 1) {
    return getName(codes[0]!);
  }
  if (codes.length === 2) {
    return `${getName(codes[0]!)} & ${getName(codes[1]!)}`;
  }
  return `${getName(codes[0]!)} +${codes.length - 1} more`;
}
