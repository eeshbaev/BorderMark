import { addDays, format, parseISO } from 'date-fns';

import { getStayGroupYear, getStaySortKey } from '@/domain/utils/approximatePeriod';
import { inclusiveDayCount, isCurrentStay, isValidIsoDate } from '@/domain/utils/dates';
import type { Stay, UserProfile } from '@/shared/types';

export interface PersonalMilestone {
  id: string;
  title: string;
  countryCode: string;
  countryName: string;
  detail: string;
  sortKey: string;
  stayId: string | null;
}

export interface MilestonesSummary {
  milestones: PersonalMilestone[];
}

export interface MilestoneInput {
  profile: UserProfile | null;
  stays: Stay[];
  countryNames: Map<string, string>;
  today: string;
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

function sortChronologically(stays: Stay[]): Stay[] {
  return [...stays].sort((a, b) => getStaySortKey(a).localeCompare(getStaySortKey(b)));
}

function milestoneYear(stay: Stay): string {
  return String(getStayGroupYear(stay));
}

function buildMilestone(
  id: string,
  title: string,
  stay: Stay,
  countryNames: Map<string, string>,
  detail: string,
): PersonalMilestone {
  return {
    id,
    title,
    countryCode: stay.countryCode,
    countryName: countryNames.get(stay.countryCode) ?? stay.countryCode,
    detail,
    sortKey: getStaySortKey(stay),
    stayId: stay.id,
  };
}

function findFirstRecordedStay(stays: Stay[], countryNames: Map<string, string>): PersonalMilestone | null {
  const first = sortChronologically(stays)[0];
  if (!first) {
    return null;
  }
  return buildMilestone('first_recorded_stay', 'First recorded stay', first, countryNames, milestoneYear(first));
}

function findFirstLivingAbroad(
  stays: Stay[],
  citizenships: string[],
  countryNames: Map<string, string>,
): PersonalMilestone | null {
  const citizenshipSet = new Set(citizenships);
  const livedStays = sortChronologically(stays).filter((stay) => stay.stayType === 'lived');
  const abroad =
    citizenshipSet.size > 0
      ? livedStays.filter((stay) => !citizenshipSet.has(stay.countryCode))
      : livedStays;

  const first = abroad[0];
  if (!first) {
    return null;
  }

  return buildMilestone(
    'first_living_abroad',
    'First time living abroad',
    first,
    countryNames,
    milestoneYear(first),
  );
}

function findHundredthDayAbroad(
  stays: Stay[],
  citizenships: string[],
  today: string,
  countryNames: Map<string, string>,
): PersonalMilestone | null {
  if (citizenships.length === 0) {
    return null;
  }

  const citizenshipSet = new Set(citizenships);
  const abroadStays = sortChronologically(stays).filter((stay) => !citizenshipSet.has(stay.countryCode));

  let cumulative = 0;
  for (const stay of abroadStays) {
    const days = computeStayDays(stay, today);
    if (days <= 0) {
      continue;
    }

    if (cumulative + days >= 100) {
      let detail = milestoneYear(stay);
      if (stay.datePrecision === 'exact' && isValidIsoDate(stay.arrivalDate)) {
        const dayOffset = 100 - cumulative - 1;
        detail = format(addDays(parseISO(stay.arrivalDate), dayOffset), 'yyyy');
      }

      return buildMilestone('hundredth_day_abroad', '100th recorded day abroad', stay, countryNames, detail);
    }

    cumulative += days;
  }

  return null;
}

function findFirstReturnVisit(stays: Stay[], countryNames: Map<string, string>): PersonalMilestone | null {
  const seen = new Set<string>();

  for (const stay of sortChronologically(stays)) {
    if (seen.has(stay.countryCode)) {
      return buildMilestone(
        'returned_to_country',
        'Returned to a country',
        stay,
        countryNames,
        milestoneYear(stay),
      );
    }
    seen.add(stay.countryCode);
  }

  return null;
}

function findLongestStay(
  stays: Stay[],
  today: string,
  countryNames: Map<string, string>,
): PersonalMilestone | null {
  let longest: Stay | null = null;
  let maxDays = 0;

  for (const stay of stays) {
    const days = computeStayDays(stay, today);
    if (days > maxDays) {
      maxDays = days;
      longest = stay;
    }
  }

  if (!longest || maxDays <= 0) {
    return null;
  }

  return {
    id: 'longest_stay',
    title: 'Your longest stay',
    countryCode: longest.countryCode,
    countryName: countryNames.get(longest.countryCode) ?? longest.countryCode,
    detail: `${maxDays.toLocaleString()} days`,
    sortKey: getStaySortKey(longest),
    stayId: longest.id,
  };
}

function sortMilestones(milestones: PersonalMilestone[]): PersonalMilestone[] {
  return [...milestones].sort((a, b) => {
    if (a.id === 'longest_stay') {
      return 1;
    }
    if (b.id === 'longest_stay') {
      return -1;
    }
    return a.sortKey.localeCompare(b.sortKey);
  });
}

export function buildPersonalMilestones(input: MilestoneInput): PersonalMilestone[] {
  const { stays, profile, countryNames, today } = input;
  if (stays.length === 0) {
    return [];
  }

  const citizenships = profile?.citizenships ?? [];
  const milestones: PersonalMilestone[] = [];

  const firstStay = findFirstRecordedStay(stays, countryNames);
  if (firstStay) {
    milestones.push(firstStay);
  }

  const firstAbroad = findFirstLivingAbroad(stays, citizenships, countryNames);
  if (firstAbroad) {
    milestones.push(firstAbroad);
  }

  const hundredthDay = findHundredthDayAbroad(stays, citizenships, today, countryNames);
  if (hundredthDay) {
    milestones.push(hundredthDay);
  }

  const returnVisit = findFirstReturnVisit(stays, countryNames);
  if (returnVisit) {
    milestones.push(returnVisit);
  }

  const longest = findLongestStay(stays, today, countryNames);
  if (longest) {
    milestones.push(longest);
  }

  return sortMilestones(milestones);
}

export function buildMilestonesSummary(input: MilestoneInput): MilestonesSummary {
  return {
    milestones: buildPersonalMilestones(input),
  };
}
