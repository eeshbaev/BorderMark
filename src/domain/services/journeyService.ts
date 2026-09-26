import { format, parseISO } from 'date-fns';

import { buildStayTimelinePresentation, formatApproximateDuration } from '@/domain/services/stayPresentation';
import { formatStayTypeWithIcon } from '@/domain/services/stayType';
import { getStayGroupYear, getStaySortKey } from '@/domain/utils/approximatePeriod';
import { formatStayDateLabel, inclusiveDayCount, isCurrentStay, isValidIsoDate } from '@/domain/utils/dates';
import type {
  JourneyStayGroup,
  JourneySummary,
  JourneyTimelineItem,
  MemoryRecord,
  Note,
  PlaceVisit,
  Stay,
  StayType,
} from '@/shared/types';

export interface JourneyFilterState {
  stayTypes: StayType[];
  year: number | null;
  month: number | null;
}

export interface CountryBiographyChapter {
  stay: Stay;
  dateLabel: string;
  durationLabel: string | null;
  cityLabel: string | null;
  stayTypeLabel: string | null;
  memoryCount: number;
  noteCount: number;
  isCurrent: boolean;
  isApproximate: boolean;
  sortKey: string;
}

export interface CountryBiography {
  countryCode: string;
  countryName: string;
  isCurrentCountry: boolean;
  periodLabel: string | null;
  recordedDaysLabel: string;
  memoryCount: number;
  noteCount: number;
  chapters: CountryBiographyChapter[];
}

export function formatTimelineDateLabel(stay: Stay, today: string): string {
  if (stay.datePrecision === 'exact' && isValidIsoDate(stay.arrivalDate)) {
    const arrival = format(parseISO(stay.arrivalDate), 'd MMM');
    if (stay.departureDate == null && isCurrentStay(stay, today)) {
      return `${arrival} — Present`;
    }
    if (isValidIsoDate(stay.departureDate)) {
      const sameYear = stay.arrivalDate.slice(0, 4) === stay.departureDate.slice(0, 4);
      const departure = format(
        parseISO(stay.departureDate),
        sameYear ? 'd MMM' : 'd MMM yyyy',
      );
      return `${arrival} — ${departure}`;
    }
    return arrival;
  }

  return formatStayDateLabel(stay, today).replace(' → ', ' — ').replace(' → TODAY', ' — Present');
}

export function formatHumanDuration(days: number | null, isApproximate: boolean): string | null {
  if (days == null || days <= 0) {
    return null;
  }

  if (isApproximate) {
    if (days >= 365) {
      const years = Math.round(days / 365);
      return `~${years} ${years === 1 ? 'year' : 'years'}`;
    }
    if (days >= 30) {
      const months = Math.round(days / 30);
      return `~${months} ${months === 1 ? 'month' : 'months'}`;
    }
    return formatApproximateDuration(days);
  }

  if (days >= 365) {
    const years = Math.floor(days / 365);
    const remainingMonths = Math.round((days % 365) / 30);
    if (remainingMonths > 0) {
      return `${years} ${years === 1 ? 'year' : 'years'}, ${remainingMonths} mo`;
    }
    return `${years} ${years === 1 ? 'year' : 'years'}`;
  }

  if (days >= 30) {
    const months = Math.round(days / 30);
    return `~${months} ${months === 1 ? 'month' : 'months'}`;
  }

  return `${days} ${days === 1 ? 'day' : 'days'}`;
}

function getFilterMonth(stay: Stay): number | null {
  if (stay.datePrecision === 'exact' && isValidIsoDate(stay.arrivalDate)) {
    return Number(stay.arrivalDate.slice(5, 7));
  }
  if (stay.approximatePeriod && /^\d{4}-\d{2}/.test(stay.approximatePeriod)) {
    return Number(stay.approximatePeriod.slice(5, 7));
  }
  return null;
}

function buildCityLabel(stay: Stay, placeVisits: PlaceVisit[]): string | null {
  const cities = new Set<string>();
  if (stay.city?.trim()) {
    cities.add(stay.city.trim());
  }
  for (const place of placeVisits) {
    if (place.stayId === stay.id && place.name.trim()) {
      cities.add(place.name.trim());
    }
  }
  if (cities.size === 0) {
    return null;
  }
  return [...cities].sort((a, b) => a.localeCompare(b)).join(' · ');
}

export function buildJourneySummary(stays: Stay[]): JourneySummary {
  const countryCount = new Set(stays.map((stay) => stay.countryCode)).size;
  const livedCountryCount = new Set(
    stays.filter((stay) => stay.stayType === 'lived').map((stay) => stay.countryCode),
  ).size;
  const stayCount = stays.length;
  const hasRichData = countryCount >= 2 || stayCount >= 3;

  const label = hasRichData
    ? `${countryCount} ${countryCount === 1 ? 'country' : 'countries'} · ${livedCountryCount} lived in · ${stayCount} ${stayCount === 1 ? 'stay' : 'stays'}`
    : 'Your journey so far';

  return {
    countryCount,
    livedCountryCount,
    stayCount,
    hasRichData,
    label,
  };
}

export function buildJourneyTimelineGroups(input: {
  stays: Stay[];
  placeVisits: PlaceVisit[];
  memories: MemoryRecord[];
  notes: Note[];
  countryNames: Map<string, string>;
  today: string;
}): JourneyStayGroup[] {
  const groups = new Map<number, JourneyStayGroup>();

  for (const stay of input.stays) {
    const year = getStayGroupYear(stay);
    const timeline = buildStayTimelinePresentation(stay, input.today);
    const dayCount =
      !timeline.isApproximate && isValidIsoDate(stay.arrivalDate)
        ? isValidIsoDate(stay.departureDate)
          ? inclusiveDayCount(stay.arrivalDate, stay.departureDate)
          : isCurrentStay(stay, input.today)
            ? inclusiveDayCount(stay.arrivalDate, input.today)
            : null
        : stay.approximateDurationDays;

    if (!groups.has(year)) {
      groups.set(year, {
        year,
        continentCount: 0,
        countryCount: 0,
        totalDays: 0,
        stayCount: 0,
        items: [],
      });
    }

    const group = groups.get(year)!;
    const memoryCount = input.memories.filter((memory) => memory.stayId === stay.id).length;
    const noteCount = input.notes.filter((note) => note.stayId === stay.id).length;

    group.items.push({
      stay,
      countryName: input.countryNames.get(stay.countryCode) ?? stay.countryCode,
      dayCount,
      dateLabel: formatTimelineDateLabel(stay, input.today),
      durationLabel: formatHumanDuration(dayCount, timeline.isApproximate),
      cityLabel: buildCityLabel(stay, input.placeVisits),
      stayTypeLabel: formatStayTypeWithIcon(stay.stayType),
      memoryCount,
      noteCount,
      documentCount: 0,
      isCurrent: isCurrentStay(stay, input.today),
      isApproximate: timeline.isApproximate,
      precisionBadge: timeline.precisionBadge,
      sortKey: getStaySortKey(stay),
      filterYear: year,
      filterMonth: getFilterMonth(stay),
    });
    group.stayCount += 1;
    group.totalDays += dayCount ?? 0;
  }

  return [...groups.values()]
    .map((group) => ({
      ...group,
      countryCount: new Set(group.items.map((item) => item.stay.countryCode)).size,
      continentCount: group.countryCount,
      items: group.items.sort((a, b) => b.sortKey.localeCompare(a.sortKey)),
    }))
    .sort((a, b) => b.year - a.year);
}

export function filterJourneyGroups(
  groups: JourneyStayGroup[],
  filters: JourneyFilterState,
): JourneyStayGroup[] {
  return groups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => {
        if (filters.stayTypes.length > 0 && (!item.stay.stayType || !filters.stayTypes.includes(item.stay.stayType))) {
          return false;
        }
        if (filters.year != null && item.filterYear !== filters.year) {
          return false;
        }
        if (filters.month != null && item.filterMonth !== filters.month) {
          return false;
        }
        return true;
      }),
    }))
    .filter((group) => group.items.length > 0);
}

export function getAvailableFilterYears(groups: JourneyStayGroup[]): number[] {
  return [...new Set(groups.map((group) => group.year))].sort((a, b) => b - a);
}

export function buildCountryBiographies(input: {
  stays: Stay[];
  placeVisits: PlaceVisit[];
  memories: MemoryRecord[];
  notes: Note[];
  countries: Array<{ code: string; name: string }>;
  today: string;
}): CountryBiography[] {
  const countryCodes = [...new Set(input.stays.map((stay) => stay.countryCode))];

  return countryCodes
    .map((countryCode) => {
      const country = input.countries.find((entry) => entry.code === countryCode);
      if (!country) {
        return null;
      }

      const countryStays = input.stays
        .filter((stay) => stay.countryCode === countryCode)
        .sort((a, b) => getStaySortKey(b).localeCompare(getStaySortKey(a)));

      const stayIds = new Set(countryStays.map((stay) => stay.id));
      const memoryCount = input.memories.filter((memory) => memory.stayId && stayIds.has(memory.stayId)).length;
      const noteCount = input.notes.filter((note) => note.stayId && stayIds.has(note.stayId)).length;

      const chapters: CountryBiographyChapter[] = countryStays.map((stay) => {
        const timeline = buildStayTimelinePresentation(stay, input.today);
        const dayCount =
          !timeline.isApproximate && isValidIsoDate(stay.arrivalDate)
            ? isValidIsoDate(stay.departureDate)
              ? inclusiveDayCount(stay.arrivalDate, stay.departureDate)
              : isCurrentStay(stay, input.today)
                ? inclusiveDayCount(stay.arrivalDate, input.today)
                : null
            : stay.approximateDurationDays;

        return {
          stay,
          dateLabel: formatTimelineDateLabel(stay, input.today),
          durationLabel: formatHumanDuration(dayCount, timeline.isApproximate),
          cityLabel: buildCityLabel(stay, input.placeVisits),
          stayTypeLabel: formatStayTypeWithIcon(stay.stayType),
          memoryCount: input.memories.filter((memory) => memory.stayId === stay.id).length,
          noteCount: input.notes.filter((note) => note.stayId === stay.id).length,
          isCurrent: isCurrentStay(stay, input.today),
          isApproximate: timeline.isApproximate,
          sortKey: getStaySortKey(stay),
        };
      });

      const chronological = [...countryStays].sort((a, b) => getStaySortKey(a).localeCompare(getStaySortKey(b)));
      const firstStay = chronological[0];
      const lastStay = chronological[chronological.length - 1];
      const periodLabel =
        firstStay && lastStay
          ? `${getStayGroupYear(firstStay)}–${
              isCurrentStay(lastStay, input.today)
                ? 'Present'
                : String(getStayGroupYear(lastStay))
            }`
          : null;

      const totalDays = countryStays.reduce((total, stay) => {
        const timeline = buildStayTimelinePresentation(stay, input.today);
        const days =
          !timeline.isApproximate && isValidIsoDate(stay.arrivalDate)
            ? isValidIsoDate(stay.departureDate)
              ? inclusiveDayCount(stay.arrivalDate, stay.departureDate)
              : isCurrentStay(stay, input.today)
                ? inclusiveDayCount(stay.arrivalDate, input.today)
                : 0
            : stay.approximateDurationDays ?? 0;
        return total + days;
      }, 0);

      return {
        countryCode,
        countryName: country.name,
        isCurrentCountry: countryStays.some((stay) => isCurrentStay(stay, input.today)),
        periodLabel: periodLabel && periodLabel.length > 2 ? periodLabel : null,
        recordedDaysLabel:
          totalDays > 0 ? `${totalDays.toLocaleString()} recorded days` : 'No recorded days yet',
        memoryCount,
        noteCount,
        chapters,
      };
    })
    .filter((entry): entry is CountryBiography => entry != null)
    .sort((a, b) => {
      const aKey = a.chapters[0]?.sortKey ?? '';
      const bKey = b.chapters[0]?.sortKey ?? '';
      return bKey.localeCompare(aKey);
    });
}

export function matchesJourneyFilters(item: JourneyTimelineItem, filters: JourneyFilterState): boolean {
  if (filters.stayTypes.length > 0 && (!item.stay.stayType || !filters.stayTypes.includes(item.stay.stayType))) {
    return false;
  }
  if (filters.year != null && item.filterYear !== filters.year) {
    return false;
  }
  if (filters.month != null && item.filterMonth !== filters.month) {
    return false;
  }
  return true;
}
