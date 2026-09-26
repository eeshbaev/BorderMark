import { shouldAskVisaQuestion } from '@/domain/services/nationalityHomeLogic';
import { parseIsoDateInput } from '@/domain/utils/isoDateInput';
import { isValidIsoDate, todayIso } from '@/domain/utils/dates';
import type { Document, Stay } from '@/shared/types';

export interface StayVisaFormInput {
  countryCode: string;
  nationalities: string[];
  visaNeeded: boolean | null;
  visaDocumentId: string | null;
  visaIssueDate: string;
  visaExpiryDate: string;
  visaMaxStayDays: string;
  stayArrivalDate: string;
  stayDepartureDate: string | null;
}

export function isVisaDocumentActive(document: Document, onDate: string): boolean {
  if (document.documentType !== 'visa') {
    return false;
  }
  if (!isValidIsoDate(document.expiryDate) || document.expiryDate < onDate) {
    return false;
  }
  if (document.issueDate && isValidIsoDate(document.issueDate) && document.issueDate > onDate) {
    return false;
  }
  return true;
}

export function visaCoversStayWindow(
  document: Document,
  arrivalDate: string,
  departureDate: string | null,
): boolean {
  const stayEnd = departureDate ?? '9999-12-31';
  if (document.issueDate && isValidIsoDate(document.issueDate) && arrivalDate < document.issueDate) {
    return false;
  }
  if (document.expiryDate && isValidIsoDate(document.expiryDate) && stayEnd > document.expiryDate) {
    return false;
  }
  return true;
}

export function listActiveVisasForCountry(
  documents: Document[],
  countryCode: string,
  onDate: string,
): Document[] {
  return documents.filter(
    (document) =>
      document.documentType === 'visa' &&
      document.issuingCountry?.toUpperCase() === countryCode.toUpperCase() &&
      isVisaDocumentActive(document, onDate),
  );
}

export function validateStayVisaForm(input: StayVisaFormInput): string | null {
  if (!shouldAskVisaQuestion(input.countryCode, input.nationalities)) {
    return null;
  }
  if (input.visaNeeded == null) {
    return 'Answer whether you need a visa for this stay.';
  }
  if (input.visaNeeded === false) {
    return null;
  }

  if (input.visaDocumentId) {
    return null;
  }

  const issue = parseIsoDateInput(input.visaIssueDate);
  const expiry = parseIsoDateInput(input.visaExpiryDate);
  if (!issue) {
    return 'Enter the visa issue date (YYYY-MM-DD).';
  }
  if (!expiry) {
    return 'Enter the visa expiry date (YYYY-MM-DD).';
  }
  if (expiry < issue) {
    return 'Visa expiry must be on or after the issue date.';
  }

  const stayEnd = input.stayDepartureDate ?? input.stayArrivalDate;
  if (expiry < stayEnd) {
    return `Visa expiry must cover this stay (through ${stayEnd}).`;
  }
  if (issue > input.stayArrivalDate) {
    return 'Visa issue date must be on or before your stay starts.';
  }

  return null;
}

export function defaultVisaNeededForCountry(
  preference: boolean | null,
  pastStayNeeded: boolean | null,
): boolean | null {
  if (preference != null) {
    return preference;
  }
  return pastStayNeeded;
}

export function inferPastVisaNeeded(stays: Stay[], countryCode: string): boolean | null {
  const abroad = stays.filter(
    (stay) => stay.countryCode === countryCode && stay.visaNeeded != null,
  );
  if (abroad.length === 0) {
    return null;
  }
  return abroad.some((stay) => stay.visaNeeded === true);
}

export function activeVisaStatusMessage(
  documents: Document[],
  countryCode: string,
  arrivalDate: string,
  departureDate: string | null,
): string | null {
  const active = listActiveVisasForCountry(documents, countryCode, todayIso());
  const covering = active.find((document) => visaCoversStayWindow(document, arrivalDate, departureDate));
  if (covering?.expiryDate) {
    return `Valid visa on file until ${covering.expiryDate}.`;
  }
  if (active.length > 0) {
    return 'You have an active visa, but it does not cover these stay dates. Add a new visa.';
  }
  return 'No active visa for this country — add issue and expiry dates.';
}
