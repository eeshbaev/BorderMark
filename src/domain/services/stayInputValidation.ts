import {
  encodeBoundedPeriod,
  encodeYearPeriod,
  isValidBoundedPeriod,
  isValidMonthPeriod,
  isValidYearMonthHint,
  isValidYearPeriod,
} from '@/domain/utils/approximatePeriod';
import { format } from 'date-fns';

import { getCountryName } from '@/data/dataset/countries';
import { findOverlappingForeignStay } from '@/domain/services/stayValidation';
import { isValidIsoDate, parseIsoDate, stayContainsDate } from '@/domain/utils/dates';
import type { DatePrecision, Stay } from '@/shared/types';

export class StayValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'StayValidationError';
  }
}

export type ApproximateMemoryLevel = 'month' | 'year' | 'period';

export interface ExactStayInput {
  datePrecision: 'exact';
  arrivalDate: string;
  departureDate: string | null;
  stillHere: boolean;
}

export interface ApproximateStayInput {
  datePrecision: 'month' | 'year' | 'approximate';
  approximatePeriod: string;
  approximateDurationDays: number | null;
}

export type StayDateInput = ExactStayInput | ApproximateStayInput;

export interface StayInput {
  countryCode: string;
  city?: string | null;
  notes?: string | null;
  stayType?: import('@/shared/types').StayType | null;
  visaNeeded?: boolean | null;
  date: StayDateInput;
}

function validatePositiveDuration(value: number | null | undefined, label: string): void {
  if (value == null) {
    return;
  }
  if (!Number.isFinite(value) || value <= 0 || !Number.isInteger(value)) {
    throw new StayValidationError(`${label} must be a positive whole number.`);
  }
}

function formatStayIntervalLabel(stay: Stay): string {
  if (!stay.arrivalDate) {
    return '';
  }
  const from = format(parseIsoDate(stay.arrivalDate), 'd MMM yyyy');
  if (!stay.departureDate) {
    return `${from} → still open`;
  }
  return `${from} → ${format(parseIsoDate(stay.departureDate), 'd MMM yyyy')}`;
}

export function validateExactStayInput(input: ExactStayInput, today: string, existingStays: Stay[], stayId?: string): void {
  if (!isValidIsoDate(input.arrivalDate)) {
    throw new StayValidationError('Enter a valid arrival date.');
  }

  const openEnded = input.stillHere && !input.departureDate;

  if (openEnded) {
    return;
  }

  if (!isValidIsoDate(input.departureDate)) {
    throw new StayValidationError('Enter a valid end date (To), or optionally turn on “I am still here”.');
  }

  if (input.departureDate < input.arrivalDate) {
    throw new StayValidationError('Departure must be on or after arrival.');
  }

  const candidate: Stay = {
    id: stayId ?? 'candidate',
    countryCode: 'XX',
    city: null,
    arrivalDate: input.arrivalDate,
    departureDate: input.departureDate,
    datePrecision: 'exact',
    approximatePeriod: null,
    approximateDurationDays: null,
    stayType: null,
    visaNeeded: null,
    notes: null,
    createdAt: '',
    updatedAt: '',
  };

  if (stayContainsDate(candidate, today)) {
    const otherCurrent = existingStays.filter(
      (stay) => stay.id !== stayId && stay.datePrecision === 'exact' && stayContainsDate(stay, today),
    );
    if (otherCurrent.length > 0) {
      throw new StayValidationError(
        'Only one country-level stay may contain today. Resolve the existing current stay first.',
      );
    }
  }
}

export function validateApproximateStayInput(input: ApproximateStayInput, today: string): void {
  validatePositiveDuration(input.approximateDurationDays, 'Duration');

  if (input.datePrecision === 'month') {
    if (!isValidMonthPeriod(input.approximatePeriod)) {
      throw new StayValidationError('Choose a valid month and year.');
    }
  }

  if (input.datePrecision === 'year') {
    if (!isValidYearPeriod(input.approximatePeriod) && !isValidMonthPeriod(input.approximatePeriod)) {
      throw new StayValidationError('Choose a valid year.');
    }
  }

  if (input.datePrecision === 'approximate') {
    if (!isValidBoundedPeriod(input.approximatePeriod)) {
      throw new StayValidationError('Choose a valid start and end month. The start must be before the end.');
    }
  }

  const boundsStart = input.approximatePeriod.split('/')[0];
  const periodEnd =
    input.datePrecision === 'approximate'
      ? input.approximatePeriod.split('/')[1]
      : input.approximatePeriod;

  if (input.datePrecision !== 'approximate' && periodEnd >= today.slice(0, 7)) {
    const monthEnd = `${periodEnd}-31`;
    if (monthEnd >= today || periodEnd === today.slice(0, 7)) {
      throw new StayValidationError('Approximate historical stays cannot include today. Use exact dates for a current stay.');
    }
  }

  if (input.datePrecision === 'approximate') {
    const [, endMonth] = input.approximatePeriod.split('/');
    if (`${endMonth}-31` >= today) {
      throw new StayValidationError('Approximate historical stays cannot include today. Use exact dates for a current stay.');
    }
  }

  if (boundsStart && input.datePrecision === 'year' && isValidYearPeriod(input.approximatePeriod)) {
    const year = parseInt(input.approximatePeriod, 10);
    if (year >= parseInt(today.slice(0, 4), 10)) {
      throw new StayValidationError('Approximate historical stays must be in the past.');
    }
  }
}

export function validateStayInput(input: StayInput, today: string, existingStays: Stay[], stayId?: string): void {
  if (!input.countryCode) {
    throw new StayValidationError('Choose a country.');
  }

  if (!input.stayType) {
    throw new StayValidationError('Choose what kind of stay this was.');
  }

  if (input.date.datePrecision === 'exact') {
    validateExactStayInput(input.date, today, existingStays, stayId);
    return;
  }

  validateApproximateStayInput(input.date, today);
}

function validateCrossCountryOverlap(input: StayInput, existingStays: Stay[], stayId?: string): void {
  if (input.date.datePrecision !== 'exact') {
    return;
  }

  const openEnded = input.date.stillHere && !input.date.departureDate;
  const candidate: Stay = {
    id: stayId ?? 'candidate',
    countryCode: input.countryCode,
    city: null,
    arrivalDate: input.date.arrivalDate,
    departureDate: openEnded ? null : input.date.departureDate,
    datePrecision: 'exact',
    approximatePeriod: null,
    approximateDurationDays: null,
    stayType: null,
    visaNeeded: null,
    notes: null,
    createdAt: '',
    updatedAt: '',
  };

  const overlap = findOverlappingForeignStay(candidate, existingStays);
  if (!overlap) {
    return;
  }

  throw new StayValidationError(
    `These dates overlap with your ${getCountryName(overlap.countryCode)} stay (${formatStayIntervalLabel(overlap)}). You can't be in two countries at the same time—adjust the dates or update the other stay.`,
  );
}

export function buildApproximatePeriod(
  precision: Exclude<DatePrecision, 'exact'>,
  monthPeriod: string,
  yearValue: string,
  yearMonthHint: string,
  periodStart: string,
  periodEnd: string,
): string {
  if (precision === 'month') {
    return monthPeriod;
  }
  if (precision === 'year') {
    return yearMonthHint ? encodeYearPeriod(yearValue, yearMonthHint) : yearValue;
  }
  return encodeBoundedPeriod(periodStart, periodEnd);
}

export function parseDurationInput(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  const parsed = Number.parseInt(trimmed, 10);
  if (!Number.isFinite(parsed)) {
    throw new StayValidationError('Duration must be a whole number.');
  }
  return parsed;
}

export function validateYearMonthHint(value: string): void {
  if (value && !isValidYearMonthHint(value)) {
    throw new StayValidationError('Choose a valid month.');
  }
}
