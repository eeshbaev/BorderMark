import { endOfMonth, endOfYear, format, parseISO, startOfYear } from 'date-fns';

import { ISO_DATE, inclusiveDayCount, isValidIsoDate } from '@/domain/utils/dates';
import type { DatePrecision, Stay } from '@/shared/types';

export interface PeriodBounds {
  start: string;
  end: string;
}

const MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;
const YEAR_PATTERN = /^\d{4}$/;
const PERIOD_PATTERN = /^(\d{4}-(0[1-9]|1[0-2]))\/(\d{4}-(0[1-9]|1[0-2]))$/;

export function isValidMonthPeriod(value: string): boolean {
  return MONTH_PATTERN.test(value);
}

export function isValidYearPeriod(value: string): boolean {
  return YEAR_PATTERN.test(value);
}

export function isValidYearMonthHint(value: string): boolean {
  return /^(0[1-9]|1[0-2])$/.test(value);
}

export function isValidBoundedPeriod(value: string): boolean {
  if (!PERIOD_PATTERN.test(value)) {
    return false;
  }
  const [start, end] = value.split('/');
  return start <= end;
}

export function encodeYearPeriod(year: string, monthHint?: string | null): string {
  if (monthHint) {
    return `${year}-${monthHint.padStart(2, '0')}`;
  }
  return year;
}

export function encodeBoundedPeriod(startMonth: string, endMonth: string): string {
  return `${startMonth}/${endMonth}`;
}

export function getApproximatePeriodBounds(stay: Stay): PeriodBounds | null {
  if (!stay.approximatePeriod) {
    return null;
  }

  if (stay.datePrecision === 'month') {
    if (!isValidMonthPeriod(stay.approximatePeriod)) {
      return null;
    }
    const monthStart = `${stay.approximatePeriod}-01`;
    return {
      start: monthStart,
      end: format(endOfMonth(parseISO(monthStart)), ISO_DATE),
    };
  }

  if (stay.datePrecision === 'year') {
    if (MONTH_PATTERN.test(stay.approximatePeriod)) {
      const monthStart = `${stay.approximatePeriod}-01`;
      return {
        start: monthStart,
        end: format(endOfMonth(parseISO(monthStart)), ISO_DATE),
      };
    }
    if (!isValidYearPeriod(stay.approximatePeriod)) {
      return null;
    }
    return {
      start: format(startOfYear(parseISO(`${stay.approximatePeriod}-01-01`)), ISO_DATE),
      end: format(endOfYear(parseISO(`${stay.approximatePeriod}-01-01`)), ISO_DATE),
    };
  }

  if (stay.datePrecision === 'approximate') {
    if (!isValidBoundedPeriod(stay.approximatePeriod)) {
      return null;
    }
    const [startMonth, endMonth] = stay.approximatePeriod.split('/');
    return {
      start: `${startMonth}-01`,
      end: format(endOfMonth(parseISO(`${endMonth}-01`)), ISO_DATE),
    };
  }

  return null;
}

export function periodOverlapsWindow(
  bounds: PeriodBounds,
  windowStart: string,
  windowEnd: string,
): boolean {
  return bounds.start <= windowEnd && bounds.end >= windowStart;
}

export function overlapDaySpan(bounds: PeriodBounds, windowStart: string, windowEnd: string): number {
  const start = bounds.start > windowStart ? bounds.start : windowStart;
  const end = bounds.end < windowEnd ? bounds.end : windowEnd;
  if (start > end) {
    return 0;
  }
  return inclusiveDayCount(start, end);
}

/** Upper-bound estimate of days this stay could contribute inside a window. Never fabricates exact placement. */
export function estimateApproximateDaysInWindow(
  stay: Stay,
  windowStart: string,
  windowEnd: string,
): number | null {
  if (stay.datePrecision === 'exact') {
    return null;
  }

  const bounds = getApproximatePeriodBounds(stay);
  if (!bounds || !periodOverlapsWindow(bounds, windowStart, windowEnd)) {
    return null;
  }

  if (stay.approximateDurationDays == null || stay.approximateDurationDays <= 0) {
    return null;
  }

  const windowSpan = overlapDaySpan(bounds, windowStart, windowEnd);
  return Math.min(stay.approximateDurationDays, windowSpan);
}

export function getStaySortKey(stay: Stay): string {
  if (stay.datePrecision === 'exact' && isValidIsoDate(stay.arrivalDate)) {
    return stay.arrivalDate;
  }
  if (stay.approximatePeriod) {
    return stay.approximatePeriod.split('/')[0];
  }
  return stay.createdAt;
}

export function getStayGroupYear(stay: Stay): number {
  const key = getStaySortKey(stay);
  return parseInt(key.slice(0, 4), 10);
}

export function precisionDisplayName(precision: DatePrecision): string | null {
  if (precision === 'exact') {
    return null;
  }
  return 'Approximate';
}
