import type { StayDateInput, StayInput } from '@/domain/services/stayInputValidation';
import type { Stay } from '@/shared/types';

export function mapStayInputToStay(
  input: StayInput,
  id: string,
  timestamps: { createdAt: string; updatedAt: string },
): Stay {
  const base = {
    id,
    countryCode: input.countryCode,
    city: input.city ?? null,
    notes: input.notes ?? null,
    stayType: input.stayType ?? null,
    visaNeeded: input.visaNeeded ?? null,
    visaDocumentId: null,
    createdAt: timestamps.createdAt,
    updatedAt: timestamps.updatedAt,
  };

  if (input.date.datePrecision === 'exact') {
    return {
      ...base,
      datePrecision: 'exact',
      arrivalDate: input.date.arrivalDate,
      departureDate: input.date.stillHere ? null : input.date.departureDate,
      approximatePeriod: null,
      approximateDurationDays: null,
    };
  }

  return {
    ...base,
    datePrecision: input.date.datePrecision,
    arrivalDate: null,
    departureDate: null,
    approximatePeriod: input.date.approximatePeriod,
    approximateDurationDays: input.date.approximateDurationDays,
  };
}

export function mapStayToExactInput(stay: Stay): StayDateInput {
  return {
    datePrecision: 'exact',
    arrivalDate: stay.arrivalDate ?? '',
    departureDate: stay.departureDate,
    stillHere: stay.departureDate == null,
  };
}

export function mapStayToApproximateInput(stay: Stay): StayDateInput | null {
  if (stay.datePrecision === 'exact') {
    return null;
  }

  return {
    datePrecision: stay.datePrecision,
    approximatePeriod: stay.approximatePeriod ?? '',
    approximateDurationDays: stay.approximateDurationDays,
  };
}

export function convertStayToExact(
  stay: Stay,
  arrivalDate: string,
  departureDate: string | null,
  stillHere: boolean,
): Stay {
  return {
    ...stay,
    datePrecision: 'exact',
    arrivalDate,
    departureDate: stillHere ? null : departureDate,
    approximatePeriod: null,
    approximateDurationDays: null,
    updatedAt: new Date().toISOString(),
  };
}

export function convertStayToApproximate(
  stay: Stay,
  date: Exclude<StayDateInput, { datePrecision: 'exact' }>,
): Stay {
  return {
    ...stay,
    datePrecision: date.datePrecision,
    arrivalDate: null,
    departureDate: null,
    approximatePeriod: date.approximatePeriod,
    approximateDurationDays: date.approximateDurationDays,
    updatedAt: new Date().toISOString(),
  };
}
