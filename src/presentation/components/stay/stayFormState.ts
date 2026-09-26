import type { StayInput } from '@/domain/services/stayInputValidation';
import { primaryCityFromList } from '@/domain/services/stayCities';
import { getApproximatePeriodBounds } from '@/domain/utils/approximatePeriod';
import { isCurrentStay } from '@/domain/utils/dates';
import { formatIsoDateInput } from '@/domain/utils/isoDateInput';
import type { Document, Stay, StayType } from '@/shared/types';
import type { PickedStayAttachment } from '@/presentation/utils/stayAttachmentPicker';

export { StayValidationError } from '@/domain/services/stayInputValidation';

export interface PendingStayAttachment extends PickedStayAttachment {
  id: string;
}

export interface StayFormState {
  countryCode: string;
  cities: string[];
  notes: string;
  stayType: StayType | null;
  visaNeeded: boolean | null;
  visaDocumentId: string | null;
  visaIssueDate: string;
  visaExpiryDate: string;
  visaMaxStayDays: string;
  arrivalDate: string;
  departureDate: string;
  stillHere: boolean;
  pendingAttachments: PendingStayAttachment[];
}

export function buildStayInputFromForm(state: StayFormState): StayInput {
  const departureTrimmed = state.departureDate.trim();
  /** A filled To date always closes the stay, even if “still here” is toggled on. */
  const openEnded = !departureTrimmed && state.stillHere;

  return {
    countryCode: state.countryCode,
    city: primaryCityFromList(state.cities),
    notes: state.notes.trim() || null,
    stayType: state.stayType,
    visaNeeded: state.visaNeeded,
    date: {
      datePrecision: 'exact',
      arrivalDate: state.arrivalDate,
      departureDate: openEnded ? null : departureTrimmed || null,
      stillHere: openEnded,
    },
  };
}

export function visaFieldsFromDocument(document: Document | null): Pick<
  StayFormState,
  'visaDocumentId' | 'visaIssueDate' | 'visaExpiryDate' | 'visaMaxStayDays'
> {
  if (!document || document.documentType !== 'visa') {
    return {
      visaDocumentId: null,
      visaIssueDate: '',
      visaExpiryDate: '',
      visaMaxStayDays: '',
    };
  }
  return {
    visaDocumentId: document.id,
    visaIssueDate: document.issueDate ? formatIsoDateInput(document.issueDate) : '',
    visaExpiryDate: document.expiryDate ? formatIsoDateInput(document.expiryDate) : '',
    visaMaxStayDays:
      document.maxStayDays != null && document.maxStayDays > 0 ? String(document.maxStayDays) : '',
  };
}

export function stayFormFromStay(stay: Stay, today: string, linkedVisa?: Document | null): StayFormState {
  const visaFields = visaFieldsFromDocument(linkedVisa ?? null);
  if (stay.datePrecision === 'exact') {
    return {
      countryCode: stay.countryCode,
      cities: stay.city?.trim() ? [stay.city.trim()] : [],
      notes: stay.notes ?? '',
      stayType: stay.stayType,
      visaNeeded: stay.visaNeeded,
      ...visaFields,
      visaDocumentId: stay.visaDocumentId ?? visaFields.visaDocumentId,
      arrivalDate: stay.arrivalDate ?? today,
      departureDate: stay.departureDate ?? today,
      stillHere: stay.departureDate == null,
      pendingAttachments: [],
    };
  }

  const bounds = getApproximatePeriodBounds(stay);

  return {
    countryCode: stay.countryCode,
    cities: stay.city?.trim() ? [stay.city.trim()] : [],
    notes: stay.notes ?? '',
    stayType: stay.stayType,
      visaNeeded: stay.visaNeeded,
      ...visaFields,
      visaDocumentId: stay.visaDocumentId ?? visaFields.visaDocumentId,
      arrivalDate: bounds?.start ?? stay.arrivalDate ?? today,
    departureDate: bounds?.end ?? stay.departureDate ?? today,
    stillHere: isCurrentStay(stay, today),
    pendingAttachments: [],
  };
}
