import { addDays, format, subDays } from 'date-fns';

import { getCountryName } from '@/data/dataset/countries';
import { getPrimaryNationality } from '@/domain/services/nationalityHomeLogic';
import { MY_LIFE_ICONS, MY_LIFE_LABELS } from '@/domain/services/myLifeService';
import { formatBirthDateDisplay } from '@/domain/utils/birthDate';
import { formatIsoDateDisplay } from '@/domain/utils/isoDateInput';
import {
  formatStayDateLabel,
  isCurrentStay,
  isValidIsoDate,
  ISO_DATE,
  parseIsoDate,
  stayContainsDate,
} from '@/domain/utils/dates';
import type { Stay, StayType, UserProfile } from '@/shared/types';

export interface InferredHomeSegment {
  kind: 'inferred_home';
  countryCode: string;
  countryName: string;
  fromDate: string;
  toDate: string;
  fromLabel: string;
  toLabel: string;
  sortKey: string;
}

export interface RecordedLifeSegment {
  kind: 'recorded';
  stay: Stay;
  countryCode: string;
  countryName: string;
  stayType: StayType | null;
  label: string;
  icon: string;
  dateLabel: string;
  city: string | null;
  isCurrent: boolean;
  sortKey: string;
}

export type LifeTimelineEntry = InferredHomeSegment | RecordedLifeSegment;

function resolveHomeCountryCode(profile: UserProfile | null): string | null {
  return getPrimaryNationality(profile);
}

function dayBefore(isoDate: string): string {
  return format(subDays(parseIsoDate(isoDate), 1), ISO_DATE);
}

function dayAfter(isoDate: string): string {
  return format(addDays(parseIsoDate(isoDate), 1), ISO_DATE);
}

function stayEndDate(stay: Stay, today: string): string | null {
  if (stay.datePrecision !== 'exact' || !isValidIsoDate(stay.arrivalDate)) {
    return null;
  }
  if (isValidIsoDate(stay.departureDate)) {
    return stay.departureDate;
  }
  if (isCurrentStay(stay, today)) {
    return today;
  }
  return stay.arrivalDate;
}

function exactStaysForTimeline(stays: Stay[]): Stay[] {
  return stays
    .filter((stay) => stay.datePrecision === 'exact' && isValidIsoDate(stay.arrivalDate))
    .sort((a, b) => (a.arrivalDate ?? '').localeCompare(b.arrivalDate ?? ''));
}

function isAbroadAtHome(stays: Stay[], homeCode: string, today: string): boolean {
  return stays.some(
    (stay) =>
      stay.countryCode !== homeCode &&
      stay.datePrecision === 'exact' &&
      isValidIsoDate(stay.arrivalDate) &&
      stayContainsDate(stay, today),
  );
}

function formatInferredRangeLabel(fromDate: string, toDate: string, birthDate: string, today: string): {
  fromLabel: string;
  toLabel: string;
} {
  const fromLabel = fromDate === birthDate ? `Born ${formatBirthDateDisplay(birthDate)}` : formatIsoDateDisplay(fromDate);
  const toLabel =
    toDate >= today ? 'Now' : formatIsoDateDisplay(toDate);
  return { fromLabel, toLabel };
}

function createInferredHomeSegment(
  homeCode: string,
  fromDate: string,
  toDate: string,
  birthDate: string,
  today: string,
): InferredHomeSegment {
  const { fromLabel, toLabel } = formatInferredRangeLabel(fromDate, toDate, birthDate, today);
  return {
    kind: 'inferred_home',
    countryCode: homeCode,
    countryName: getCountryName(homeCode),
    fromDate,
    toDate,
    fromLabel,
    toLabel,
    sortKey: fromDate,
  };
}

export function buildInferredHomeSegments(
  profile: UserProfile | null,
  stays: Stay[],
  today: string,
): InferredHomeSegment[] {
  const birthDate = profile?.birthDate;
  const homeCode = resolveHomeCountryCode(profile);
  if (!isValidIsoDate(birthDate) || !homeCode) {
    return [];
  }

  const ordered = exactStaysForTimeline(stays);
  if (ordered.length === 0) {
    return [createInferredHomeSegment(homeCode, birthDate, today, birthDate, today)];
  }

  const segments: InferredHomeSegment[] = [];
  let cursor = birthDate;

  for (const stay of ordered) {
    const arrival = stay.arrivalDate!;
    const end = stayEndDate(stay, today);
    if (!end) {
      continue;
    }

    if (cursor < arrival) {
      segments.push(createInferredHomeSegment(homeCode, cursor, dayBefore(arrival), birthDate, today));
    }

    cursor = cursor > dayAfter(end) ? cursor : dayAfter(end);
  }

  if (cursor <= today && !isAbroadAtHome(stays, homeCode, today)) {
    segments.push(createInferredHomeSegment(homeCode, cursor, today, birthDate, today));
  }

  return segments;
}

function staySortKey(stay: Stay): string {
  if (stay.datePrecision === 'exact' && stay.arrivalDate) {
    return stay.arrivalDate;
  }
  if (stay.approximatePeriod) {
    return stay.approximatePeriod;
  }
  return stay.createdAt;
}

export function buildRecordedLifeSegments(stays: Stay[], today: string): RecordedLifeSegment[] {
  return [...stays]
    .sort((a, b) => staySortKey(a).localeCompare(staySortKey(b)))
    .map((stay) => {
      const stayType = stay.stayType;
      return {
        kind: 'recorded' as const,
        stay,
        countryCode: stay.countryCode,
        countryName: getCountryName(stay.countryCode),
        stayType,
        label: stayType ? MY_LIFE_LABELS[stayType] : 'Stay',
        icon: stayType ? MY_LIFE_ICONS[stayType] : '📍',
        dateLabel: formatStayDateLabel(stay, today).replace(' → TODAY', ' → Now'),
        city: stay.city,
        isCurrent: isCurrentStay(stay, today),
        sortKey: staySortKey(stay),
      };
    });
}

export function buildLifeTimeline(
  profile: UserProfile | null,
  stays: Stay[],
  today: string,
): LifeTimelineEntry[] {
  const inferred = buildInferredHomeSegments(profile, stays, today);
  const recorded = buildRecordedLifeSegments(stays, today);
  return [...inferred, ...recorded].sort((a, b) => a.sortKey.localeCompare(b.sortKey));
}
