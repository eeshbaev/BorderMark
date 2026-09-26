import {
  addDays,
  differenceInCalendarDays,
  endOfMonth,
  endOfYear,
  format,
  isValid,
  parseISO,
  startOfMonth,
  startOfYear,
  subDays,
} from 'date-fns';

import type { DateInterval, DatePrecision, Stay } from '@/shared/types';

export const ISO_DATE = 'yyyy-MM-dd';

export function todayIso(dateProvider: () => Date = () => new Date()): string {
  return format(dateProvider(), ISO_DATE);
}

export function parseIsoDate(value: string): Date {
  return parseISO(value);
}

export function isValidIsoDate(value: string | null | undefined): value is string {
  return !!value && isValid(parseISO(value));
}

/** Inclusive calendar-day count between two ISO dates. */
export function inclusiveDayCount(start: string, end: string): number {
  if (!isValidIsoDate(start) || !isValidIsoDate(end)) {
    return 0;
  }
  return differenceInCalendarDays(parseIsoDate(end), parseIsoDate(start)) + 1;
}

export function stayContainsDate(stay: Stay, isoDate: string): boolean {
  if (stay.datePrecision !== 'exact') {
    return false;
  }
  if (!isValidIsoDate(stay.arrivalDate) || !isValidIsoDate(isoDate)) {
    return false;
  }
  const arrival = stay.arrivalDate;
  const departure = isValidIsoDate(stay.departureDate) ? stay.departureDate : null;
  if (isoDate < arrival) {
    return false;
  }
  if (departure == null) {
    return true;
  }
  return isoDate <= departure;
}

export function isCurrentStay(stay: Stay, today: string): boolean {
  return stayContainsDate(stay, today);
}

export function expandStayToInterval(stay: Stay): DateInterval | null {
  if (stay.datePrecision !== 'exact') {
    return null;
  }

  if (!isValidIsoDate(stay.arrivalDate)) {
    return null;
  }

  return {
    start: stay.arrivalDate,
    end: stay.departureDate ?? stay.arrivalDate,
    approximate: false,
  };
}

export function intersectInterval(
  interval: DateInterval,
  windowStart: string,
  windowEnd: string,
): DateInterval | null {
  const start = interval.start > windowStart ? interval.start : windowStart;
  const end = interval.end < windowEnd ? interval.end : windowEnd;
  if (start > end) {
    return null;
  }
  return { start, end, approximate: interval.approximate };
}

export function mergeIntervals(intervals: DateInterval[]): DateInterval[] {
  if (intervals.length === 0) {
    return [];
  }

  const sorted = [...intervals].sort((a, b) => a.start.localeCompare(b.start));
  const merged: DateInterval[] = [{ ...sorted[0] }];

  for (let i = 1; i < sorted.length; i += 1) {
    const current = sorted[i];
    const last = merged[merged.length - 1];
    const nextDayAfterLast = format(addDays(parseIsoDate(last.end), 1), ISO_DATE);

    if (current.start <= nextDayAfterLast) {
      if (current.end > last.end) {
        last.end = current.end;
      }
      last.approximate = last.approximate || current.approximate;
    } else {
      merged.push({ ...current });
    }
  }

  return merged;
}

export function countUniqueCalendarDays(intervals: DateInterval[]): number {
  return mergeIntervals(intervals).reduce(
    (total, interval) => total + inclusiveDayCount(interval.start, interval.end),
    0,
  );
}

export function formatPreviousStayLeftLabel(stay: Stay): string | null {
  if (!isValidIsoDate(stay.departureDate)) {
    return null;
  }

  return `until ${format(parseIsoDate(stay.departureDate), 'd MMM').toUpperCase()}`;
}

export interface PreviousStayCloseDates {
  arrivalDate: string;
  departureDate: string;
}

/** Computes how to close the previous stay when switching countries. */
export function resolvePreviousStayCloseDates(
  currentArrivalDate: string,
  newArrivalDate: string,
): PreviousStayCloseDates {
  const closeDate = format(subDays(new Date(`${newArrivalDate}T12:00:00`), 1), ISO_DATE);

  if (closeDate >= currentArrivalDate) {
    return {
      arrivalDate: currentArrivalDate,
      departureDate: closeDate,
    };
  }

  // Same-day move: keep the previous country as a single day before the new arrival.
  return {
    arrivalDate: closeDate,
    departureDate: closeDate,
  };
}

export function formatStayDateLabel(stay: Stay, today: string): string {
  if (stay.datePrecision === 'exact' && isValidIsoDate(stay.arrivalDate)) {
    const arrival = format(parseIsoDate(stay.arrivalDate), 'd MMM').toUpperCase();
    if (stay.departureDate == null && isCurrentStay(stay, today)) {
      return `${arrival} → TODAY`;
    }
    if (isValidIsoDate(stay.departureDate)) {
      const departure = format(parseIsoDate(stay.departureDate), 'd MMM yyyy').toUpperCase();
      return `${arrival} → ${departure}`;
    }
    return arrival;
  }

  if (stay.datePrecision === 'month' && stay.approximatePeriod) {
    return format(parseIsoDate(`${stay.approximatePeriod}-01`), 'MMMM yyyy');
  }

  if (stay.datePrecision === 'year' && stay.approximatePeriod) {
    return stay.approximatePeriod;
  }

  if (stay.datePrecision === 'approximate' && stay.approximatePeriod) {
    const [start, end] = stay.approximatePeriod.split('/');
    if (start && end) {
      const startYear = start.slice(0, 4);
      const endYear = end.slice(0, 4);
      const startMonth = format(parseIsoDate(`${start}-01`), 'MMM');
      const endMonth = format(parseIsoDate(`${end}-01`), 'MMM');
      return startYear === endYear
        ? `${startMonth}–${endMonth} ${startYear}`
        : `${startMonth} ${startYear}–${endMonth} ${endYear}`;
    }
  }

  return 'Approximate';
}

export function precisionLabel(precision: DatePrecision): string | null {
  if (precision === 'exact') {
    return null;
  }
  return 'Approximate';
}

export function calendarYearBounds(year: number): { start: string; end: string } {
  const start = format(startOfYear(new Date(year, 0, 1)), ISO_DATE);
  const end = format(endOfYear(new Date(year, 0, 1)), ISO_DATE);
  return { start, end };
}

export function rollingWindowStart(today: string, lookbackDays: number): string {
  return format(addDays(parseIsoDate(today), -(lookbackDays - 1)), ISO_DATE);
}

export function schengenWindowStart(today: string): string {
  return rollingWindowStart(today, 180);
}

export function daysUntil(isoDate: string, today: string): number {
  return differenceInCalendarDays(parseIsoDate(isoDate), parseIsoDate(today));
}

export function greetingForHour(hour: number): string {
  if (hour < 12) {
    return 'Good morning';
  }
  if (hour < 17) {
    return 'Good afternoon';
  }
  return 'Good evening';
}

export function generateId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function nowIso(): string {
  return new Date().toISOString();
}
