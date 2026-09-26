import type { Stay } from '@/shared/types';
import { isCurrentStay, isValidIsoDate, stayContainsDate } from '@/domain/utils/dates';

export class StayConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'StayConflictError';
  }
}

export function findCurrentStay(stays: Stay[], today: string): Stay | null {
  return stays.find((stay) => isCurrentStay(stay, today)) ?? null;
}

/** Most recent ended stay in a different country before the current arrival. */
export function findPreviousStay(stays: Stay[], current: Stay): Stay | null {
  const arrivalDate = current.arrivalDate;
  if (current.datePrecision !== 'exact' || !isValidIsoDate(arrivalDate)) {
    return null;
  }

  const candidates = stays.filter(
    (stay) =>
      stay.id !== current.id &&
      stay.countryCode !== current.countryCode &&
      stay.datePrecision === 'exact' &&
      isValidIsoDate(stay.departureDate) &&
      stay.departureDate <= arrivalDate,
  );

  if (candidates.length === 0) {
    return null;
  }

  return candidates.sort((a, b) =>
    (b.departureDate ?? '').localeCompare(a.departureDate ?? ''),
  )[0];
}

export function findOverlappingCurrentStays(stays: Stay[], today: string): Stay[] {
  return stays.filter((stay) => isCurrentStay(stay, today));
}

export function validateCurrentStayInvariant(stays: Stay[], candidate: Stay, today: string): void {
  if (candidate.datePrecision !== 'exact') {
    return;
  }

  const overlapsToday =
    isValidIsoDate(candidate.arrivalDate) &&
    stayContainsDate(candidate, today);

  if (!overlapsToday) {
    return;
  }

  const conflicts = stays.filter(
    (stay) => stay.id !== candidate.id && isCurrentStay(stay, today),
  );

  if (conflicts.length > 0) {
    throw new StayConflictError(
      'Only one country-level stay may contain today. Resolve the existing current stay first.',
    );
  }
}

export function findHistoricalOverlaps(stays: Stay[]): Array<{ a: Stay; b: Stay }> {
  const exactStays = stays.filter(
    (stay) =>
      stay.datePrecision === 'exact' &&
      isValidIsoDate(stay.arrivalDate) &&
      (stay.departureDate == null || isValidIsoDate(stay.departureDate)),
  );

  const overlaps: Array<{ a: Stay; b: Stay }> = [];

  for (let i = 0; i < exactStays.length; i += 1) {
    for (let j = i + 1; j < exactStays.length; j += 1) {
      const a = exactStays[i];
      const b = exactStays[j];
      if (intervalsOverlap(a, b)) {
        overlaps.push({ a, b });
      }
    }
  }

  return overlaps;
}

function intervalsOverlap(a: Stay, b: Stay): boolean {
  const aStart = a.arrivalDate!;
  const aEnd = a.departureDate ?? '9999-12-31';
  const bStart = b.arrivalDate!;
  const bEnd = b.departureDate ?? '9999-12-31';
  return aStart <= bEnd && bStart <= aEnd;
}

/** Another country stay whose dates overlap the candidate interval (open-ended = no departure). */
export function findOverlappingForeignStay(
  candidate: Pick<Stay, 'id' | 'countryCode' | 'arrivalDate' | 'departureDate' | 'datePrecision'>,
  stays: Stay[],
): Stay | null {
  if (candidate.datePrecision !== 'exact' || !isValidIsoDate(candidate.arrivalDate)) {
    return null;
  }

  const candidateStart = candidate.arrivalDate;
  const candidateEnd = candidate.departureDate ?? '9999-12-31';

  for (const stay of stays) {
    if (stay.id === candidate.id) {
      continue;
    }
    if (stay.countryCode === candidate.countryCode) {
      continue;
    }
    if (stay.datePrecision !== 'exact' || !isValidIsoDate(stay.arrivalDate)) {
      continue;
    }
    const stayStart = stay.arrivalDate;
    const stayEnd = stay.departureDate ?? '9999-12-31';
    if (candidateStart <= stayEnd && stayStart <= candidateEnd) {
      return stay;
    }
  }

  return null;
}

export function findCrossCountrySameDayConflicts(
  stays: Stay[],
): Array<{ a: Stay; b: Stay; date: string }> {
  const exactStays = stays.filter(
    (stay) => stay.datePrecision === 'exact' && isValidIsoDate(stay.arrivalDate),
  );

  const conflicts: Array<{ a: Stay; b: Stay; date: string }> = [];

  for (let i = 0; i < exactStays.length; i += 1) {
    for (let j = i + 1; j < exactStays.length; j += 1) {
      const a = exactStays[i];
      const b = exactStays[j];
      if (a.countryCode === b.countryCode) {
        continue;
      }
      const overlapStart = a.arrivalDate! > b.arrivalDate! ? a.arrivalDate! : b.arrivalDate!;
      const overlapEnd =
        (a.departureDate ?? '9999-12-31') < (b.departureDate ?? '9999-12-31')
          ? (a.departureDate ?? '9999-12-31')
          : (b.departureDate ?? '9999-12-31');
      if (overlapStart <= overlapEnd) {
        conflicts.push({ a, b, date: overlapStart });
      }
    }
  }

  return conflicts;
}
