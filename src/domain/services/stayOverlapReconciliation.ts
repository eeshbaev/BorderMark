import { addDays, format, subDays } from 'date-fns';

import { generateId, ISO_DATE, isValidIsoDate, parseIsoDate } from '@/domain/utils/dates';
import type { Stay } from '@/shared/types';

const OPEN_END = '9999-12-31';

export type StayReconcileAction =
  | { type: 'delete'; stayId: string }
  | { type: 'update'; stay: Stay }
  | { type: 'insert'; stay: Stay };

function stayInterval(stay: Stay): { start: string; end: string } | null {
  if (stay.datePrecision !== 'exact' || !isValidIsoDate(stay.arrivalDate)) {
    return null;
  }
  return {
    start: stay.arrivalDate,
    end: stay.departureDate ?? OPEN_END,
  };
}

function intervalsOverlap(a: { start: string; end: string }, b: { start: string; end: string }): boolean {
  return a.start <= b.end && b.start <= a.end;
}

function dayBefore(iso: string): string {
  return format(subDays(parseIsoDate(iso), 1), ISO_DATE);
}

function dayAfter(iso: string): string {
  return format(addDays(parseIsoDate(iso), 1), ISO_DATE);
}

function isValidClosedInterval(start: string, end: string): boolean {
  return start <= end;
}

function withExactDates(stay: Stay, arrivalDate: string, departureDate: string | null): Stay {
  return {
    ...stay,
    datePrecision: 'exact',
    arrivalDate,
    departureDate,
    approximatePeriod: null,
    approximateDurationDays: null,
  };
}

/**
 * Plans how to trim, split, or remove existing foreign stays so a newly saved stay wins.
 * Days outside explicit abroad stays are treated as home (no rows needed).
 */
export function planForeignStayReconciliation(candidate: Stay, existing: Stay[]): StayReconcileAction[] {
  const candidateInterval = stayInterval(candidate);
  if (!candidateInterval) {
    return [];
  }

  const actions: StayReconcileAction[] = [];

  for (const other of existing) {
    if (other.id === candidate.id) {
      continue;
    }
    if (other.countryCode === candidate.countryCode) {
      continue;
    }

    const otherInterval = stayInterval(other);
    if (!otherInterval || !intervalsOverlap(candidateInterval, otherInterval)) {
      continue;
    }

    const a = candidateInterval;
    const b = otherInterval;

    if (b.start >= a.start && b.end <= a.end) {
      actions.push({ type: 'delete', stayId: other.id });
      continue;
    }

    if (b.start < a.start && b.end > a.end) {
      const beforeEnd = dayBefore(a.start);
      const afterStart = dayAfter(a.end);
      const beforeOk = isValidClosedInterval(b.start, beforeEnd);
      const afterOk = isValidClosedInterval(afterStart, b.end);

      if (beforeOk && afterOk) {
        actions.push({
          type: 'update',
          stay: withExactDates(other, other.arrivalDate!, beforeEnd),
        });
        actions.push({
          type: 'insert',
          stay: withExactDates({ ...other, id: generateId() }, afterStart, other.departureDate),
        });
      } else if (beforeOk) {
        actions.push({
          type: 'update',
          stay: withExactDates(other, other.arrivalDate!, beforeEnd),
        });
      } else if (afterOk) {
        actions.push({ type: 'delete', stayId: other.id });
        actions.push({
          type: 'insert',
          stay: withExactDates({ ...other, id: generateId() }, afterStart, other.departureDate),
        });
      } else {
        actions.push({ type: 'delete', stayId: other.id });
      }
      continue;
    }

    if (b.start < a.start && b.end >= a.start) {
      const newEnd = dayBefore(a.start);
      if (!isValidClosedInterval(b.start, newEnd)) {
        actions.push({ type: 'delete', stayId: other.id });
      } else {
        actions.push({
          type: 'update',
          stay: withExactDates(other, other.arrivalDate!, newEnd),
        });
      }
      continue;
    }

    if (b.start <= a.end && b.end > a.end) {
      const newStart = dayAfter(a.end);
      if (!isValidClosedInterval(newStart, b.end)) {
        actions.push({ type: 'delete', stayId: other.id });
      } else {
        actions.push({
          type: 'update',
          stay: withExactDates(other, newStart, other.departureDate),
        });
      }
    }
  }

  return actions;
}
