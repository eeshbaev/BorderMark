import { getStayGroupYear, getStaySortKey } from '@/domain/utils/approximatePeriod';
import { inclusiveDayCount, isCurrentStay, isValidIsoDate } from '@/domain/utils/dates';
import type { Stay } from '@/shared/types';

export interface JourneyInsightItem {
  label: string;
  countryCode: string;
  countryName: string;
  detail: string;
}

export interface JourneyInsights {
  yourFirsts: JourneyInsightItem[];
  longestStay: JourneyInsightItem | null;
  mostRevisited: JourneyInsightItem | null;
}

function computeStayDays(stay: Stay, today: string): number {
  if (stay.datePrecision === 'exact' && isValidIsoDate(stay.arrivalDate)) {
    if (stay.departureDate) {
      return inclusiveDayCount(stay.arrivalDate, stay.departureDate);
    }
    if (isCurrentStay(stay, today)) {
      return inclusiveDayCount(stay.arrivalDate, today);
    }
    return 0;
  }
  return stay.approximateDurationDays ?? 0;
}

function formatInsightYear(stay: Stay): string {
  return String(getStayGroupYear(stay));
}

function toInsightItem(
  label: string,
  stay: Stay,
  countryName: string,
  detail: string,
): JourneyInsightItem {
  return {
    label,
    countryCode: stay.countryCode,
    countryName,
    detail,
  };
}

function sortChronologically(stays: Stay[]): Stay[] {
  return [...stays].sort((a, b) => getStaySortKey(a).localeCompare(getStaySortKey(b)));
}

export function buildJourneyInsights(input: {
  stays: Stay[];
  citizenships: string[];
  countryNames: Map<string, string>;
  today: string;
}): JourneyInsights {
  if (input.stays.length === 0) {
    return { yourFirsts: [], longestStay: null, mostRevisited: null };
  }

  const chronological = sortChronologically(input.stays);
  const citizenshipSet = new Set(input.citizenships);
  const yourFirsts: JourneyInsightItem[] = [];

  const firstOutsideHome = citizenshipSet.size > 0
    ? chronological.find((stay) => !citizenshipSet.has(stay.countryCode))
    : null;
  if (firstOutsideHome) {
    yourFirsts.push(
      toInsightItem(
        'First country outside home',
        firstOutsideHome,
        input.countryNames.get(firstOutsideHome.countryCode) ?? firstOutsideHome.countryCode,
        formatInsightYear(firstOutsideHome),
      ),
    );
  }

  const firstLivedIn = chronological.find((stay) => stay.stayType === 'lived');
  if (firstLivedIn) {
    yourFirsts.push(
      toInsightItem(
        'First country lived in',
        firstLivedIn,
        input.countryNames.get(firstLivedIn.countryCode) ?? firstLivedIn.countryCode,
        formatInsightYear(firstLivedIn),
      ),
    );
  }

  const firstRecorded = chronological[0];
  if (firstRecorded) {
    yourFirsts.push(
      toInsightItem(
        'First recorded border crossing',
        firstRecorded,
        input.countryNames.get(firstRecorded.countryCode) ?? firstRecorded.countryCode,
        formatInsightYear(firstRecorded),
      ),
    );
  }

  let longestStay: JourneyInsightItem | null = null;
  let maxDays = 0;
  for (const stay of input.stays) {
    const days = computeStayDays(stay, input.today);
    if (days > maxDays) {
      maxDays = days;
      longestStay = toInsightItem(
        'Longest stay',
        stay,
        input.countryNames.get(stay.countryCode) ?? stay.countryCode,
        `${days.toLocaleString()} days`,
      );
    }
  }

  const stayCounts = new Map<string, number>();
  for (const stay of input.stays) {
    stayCounts.set(stay.countryCode, (stayCounts.get(stay.countryCode) ?? 0) + 1);
  }

  let mostRevisited: JourneyInsightItem | null = null;
  let maxCount = 0;
  for (const [countryCode, count] of stayCounts.entries()) {
    if (count > maxCount) {
      maxCount = count;
      mostRevisited = {
        label: 'Most revisited',
        countryCode,
        countryName: input.countryNames.get(countryCode) ?? countryCode,
        detail: `${count} ${count === 1 ? 'stay' : 'stays'}`,
      };
    }
  }

  if (mostRevisited && maxCount < 2) {
    mostRevisited = null;
  }

  return {
    yourFirsts,
    longestStay: maxDays > 0 ? longestStay : null,
    mostRevisited,
  };
}
