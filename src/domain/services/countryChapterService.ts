import { format, parseISO } from 'date-fns';

import { buildStayTimelinePresentation } from '@/domain/services/stayPresentation';
import { getStaySortKey } from '@/domain/utils/approximatePeriod';
import { inclusiveDayCount, isCurrentStay, isValidIsoDate } from '@/domain/utils/dates';
import type {
  CountryRecord,
  Document,
  MemoryRecord,
  Note,
  PlaceVisit,
  Stay,
} from '@/shared/types';

export interface RecordedDaysBreakdown {
  exactDays: number;
  approximateDays: number;
}

export interface CountrySummary {
  countryCode: string;
  countryName: string;
  continent: string;
  stayCount: number;
  recordedDays: RecordedDaysBreakdown;
  recordedDaysLabel: string;
  recordedDaysShortLabel: string;
  isCurrentCountry: boolean;
  mostRecentSortKey: string;
}

export interface PlacesContinentGroup {
  continent: string;
  countries: CountrySummary[];
}

export interface CountryChapterStayItem {
  stay: Stay;
  dateLabel: string;
  durationLabel: string | null;
  isApproximate: boolean;
  sortKey: string;
}

export interface CountryPlaceGroup {
  name: string;
  visitCount: number;
  mostRecentLabel: string | null;
}

export interface CountryMemoryItem {
  memory: MemoryRecord;
  title: string;
  dateLabel: string;
  stayId: string | null;
  sortKey: string;
}

export interface CountryNoteItem {
  note: Note;
  title: string;
  preview: string;
  dateLabel: string | null;
  stayId: string | null;
}

export interface CountryChapter {
  countryCode: string;
  countryName: string;
  continent: string;
  isCurrentCountry: boolean;
  stayCount: number;
  placeCount: number;
  memoryCount: number;
  noteCount: number;
  documentCount: number;
  recordedDays: RecordedDaysBreakdown;
  recordedDaysLabel: string;
  firstRecordedLabel: string | null;
  firstRecordedHeading: string;
  lastRecordedLabel: string | null;
  lastRecordedHeading: string;
  stays: CountryChapterStayItem[];
  places: CountryPlaceGroup[];
  memories: CountryMemoryItem[];
  notes: CountryNoteItem[];
  documents: Document[];
}

export interface CountryChapterInput {
  countryCode: string;
  stays: Stay[];
  placeVisits: PlaceVisit[];
  memories: MemoryRecord[];
  notes: Note[];
  documents: Document[];
  countries: CountryRecord[];
  today: string;
}

export function computeStayExactDays(stay: Stay, today: string): number {
  if (stay.datePrecision !== 'exact' || !isValidIsoDate(stay.arrivalDate)) {
    return 0;
  }
  if (stay.departureDate) {
    return inclusiveDayCount(stay.arrivalDate, stay.departureDate);
  }
  if (isCurrentStay(stay, today)) {
    return inclusiveDayCount(stay.arrivalDate, today);
  }
  return inclusiveDayCount(stay.arrivalDate, stay.arrivalDate);
}

export function computeRecordedDaysBreakdown(stays: Stay[], today: string): RecordedDaysBreakdown {
  let exactDays = 0;
  let approximateDays = 0;

  for (const stay of stays) {
    if (stay.datePrecision === 'exact') {
      exactDays += computeStayExactDays(stay, today);
    } else if (stay.approximateDurationDays != null && stay.approximateDurationDays > 0) {
      approximateDays += stay.approximateDurationDays;
    }
  }

  return { exactDays, approximateDays };
}

export function formatRecordedDaysLabel(breakdown: RecordedDaysBreakdown, compact = false): string {
  const { exactDays, approximateDays } = breakdown;

  if (exactDays > 0 && approximateDays > 0) {
    return compact
      ? `${exactDays} exact + ~${approximateDays} approx`
      : `${exactDays} exact days\n+ ~${approximateDays} approximate days`;
  }
  if (approximateDays > 0) {
    return compact ? `~${approximateDays} approximate days` : `~${approximateDays} approximate days`;
  }
  if (exactDays > 0) {
    return compact ? `${exactDays} recorded days` : `${exactDays} recorded days`;
  }
  return compact ? 'No recorded days' : 'No recorded days yet';
}

export function formatRecordedPeriodHeading(stay: Stay, position: 'first' | 'last'): string {
  if (stay.datePrecision === 'exact') {
    return position === 'first' ? 'First visit' : 'Most recent visit';
  }
  return position === 'first' ? 'First recorded period' : 'Most recent recorded period';
}

export function formatRecordedPeriodLabel(stay: Stay, today: string): string {
  const timeline = buildStayTimelinePresentation(stay, today);
  if (timeline.isApproximate) {
    const base = timeline.dateLabel.split(' · ~')[0];
    return `${base} · Approximate`;
  }
  if (isValidIsoDate(stay.arrivalDate)) {
    return format(parseISO(stay.arrivalDate), 'd MMM yyyy');
  }
  return timeline.dateLabel;
}

function formatPlaceRecentLabel(place: PlaceVisit): string | null {
  if (place.datePrecision === 'exact' && place.visitDate) {
    return format(parseISO(place.visitDate), 'd MMM yyyy');
  }
  if (place.approximatePeriod) {
    if (/^\d{4}-\d{2}$/.test(place.approximatePeriod)) {
      return `${format(parseISO(`${place.approximatePeriod}-01`), 'MMMM yyyy')} · Approximate`;
    }
    return `${place.approximatePeriod} · Approximate`;
  }
  return null;
}

function formatMemoryDateLabel(memory: MemoryRecord): string {
  if (memory.datePrecision === 'exact' && memory.memoryDate) {
    return format(parseISO(memory.memoryDate), 'd MMM yyyy');
  }
  if (memory.approximatePeriod) {
    if (/^\d{4}-\d{2}$/.test(memory.approximatePeriod)) {
      return `${format(parseISO(`${memory.approximatePeriod}-01`), 'MMMM yyyy')} · Approximate`;
    }
    return `${memory.approximatePeriod} · Approximate`;
  }
  return 'Approximate';
}

function memorySortKey(memory: MemoryRecord): string {
  return memory.memoryDate ?? memory.approximatePeriod ?? memory.createdAt;
}

function noteSortKey(note: Note): string {
  return note.noteDate ?? note.createdAt;
}

export function buildCountrySummary(
  countryCode: string,
  country: CountryRecord,
  stays: Stay[],
  today: string,
): CountrySummary {
  const countryStays = stays.filter((stay) => stay.countryCode === countryCode);
  const recordedDays = computeRecordedDaysBreakdown(countryStays, today);
  const sortKeys = countryStays.map((stay) => getStaySortKey(stay));
  const mostRecentSortKey = sortKeys.sort((a, b) => b.localeCompare(a))[0] ?? '';

  return {
    countryCode,
    countryName: country.name,
    continent: country.continent,
    stayCount: countryStays.length,
    recordedDays,
    recordedDaysLabel: formatRecordedDaysLabel(recordedDays),
    recordedDaysShortLabel: formatRecordedDaysLabel(recordedDays, true),
    isCurrentCountry: countryStays.some((stay) => isCurrentStay(stay, today)),
    mostRecentSortKey,
  };
}

export function buildPlacesByContinent(input: {
  stays: Stay[];
  countries: CountryRecord[];
  today: string;
}): PlacesContinentGroup[] {
  const countryCodes = [...new Set(input.stays.map((stay) => stay.countryCode))];
  const summaries = countryCodes
    .map((code) => {
      const country = input.countries.find((entry) => entry.code === code);
      if (!country) {
        return null;
      }
      return buildCountrySummary(code, country, input.stays, input.today);
    })
    .filter((summary): summary is CountrySummary => summary != null)
    .sort((a, b) => {
      const continentCompare = a.continent.localeCompare(b.continent);
      if (continentCompare !== 0) {
        return continentCompare;
      }
      return a.countryName.localeCompare(b.countryName);
    });

  const groups = new Map<string, CountrySummary[]>();
  for (const summary of summaries) {
    if (!groups.has(summary.continent)) {
      groups.set(summary.continent, []);
    }
    groups.get(summary.continent)!.push(summary);
  }

  return [...groups.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([continent, countries]) => ({
      continent,
      countries: countries.sort((a, b) => a.countryName.localeCompare(b.countryName)),
    }));
}

export function buildCountryChapter(input: CountryChapterInput): CountryChapter | null {
  const country = input.countries.find((entry) => entry.code === input.countryCode);
  if (!country) {
    return null;
  }

  const countryStays = input.stays
    .filter((stay) => stay.countryCode === input.countryCode)
    .sort((a, b) => getStaySortKey(b).localeCompare(getStaySortKey(a)));

  const stayIds = new Set(countryStays.map((stay) => stay.id));
  const recordedDays = computeRecordedDaysBreakdown(countryStays, input.today);
  const isCurrentCountry = countryStays.some((stay) => isCurrentStay(stay, input.today));

  const chronological = [...countryStays].sort((a, b) => getStaySortKey(a).localeCompare(getStaySortKey(b)));
  const firstStay = chronological[0] ?? null;
  const lastStay = chronological[chronological.length - 1] ?? null;

  const places = groupPlaceVisits(
    input.placeVisits.filter((place) => stayIds.has(place.stayId)),
  );

  const memories = input.memories
    .filter((memory) => memory.stayId && stayIds.has(memory.stayId))
    .map((memory) => ({
      memory,
      title: memory.title ?? 'Memory',
      dateLabel: formatMemoryDateLabel(memory),
      stayId: memory.stayId,
      sortKey: memorySortKey(memory),
    }))
    .sort((a, b) => b.sortKey.localeCompare(a.sortKey));

  const notes = input.notes
    .filter((note) => note.stayId && stayIds.has(note.stayId))
    .map((note) => ({
      note,
      title: note.title ?? 'Note',
      preview: note.content.length > 120 ? `${note.content.slice(0, 117)}…` : note.content,
      dateLabel: note.noteDate ? format(parseISO(note.noteDate), 'd MMM yyyy') : null,
      stayId: note.stayId,
    }))
    .sort((a, b) => noteSortKey(b.note).localeCompare(noteSortKey(a.note)));

  const documents = input.documents
    .filter((document) => document.issuingCountry === input.countryCode)
    .sort((a, b) => a.title.localeCompare(b.title));

  return {
    countryCode: input.countryCode,
    countryName: country.name,
    continent: country.continent,
    isCurrentCountry,
    stayCount: countryStays.length,
    placeCount: places.reduce((total, place) => total + place.visitCount, 0),
    memoryCount: memories.length,
    noteCount: notes.length,
    documentCount: documents.length,
    recordedDays,
    recordedDaysLabel: formatRecordedDaysLabel(recordedDays),
    firstRecordedLabel: firstStay ? formatRecordedPeriodLabel(firstStay, input.today) : null,
    firstRecordedHeading: firstStay ? formatRecordedPeriodHeading(firstStay, 'first') : 'First recorded period',
    lastRecordedLabel: lastStay ? formatRecordedPeriodLabel(lastStay, input.today) : null,
    lastRecordedHeading: lastStay ? formatRecordedPeriodHeading(lastStay, 'last') : 'Most recent recorded period',
    stays: countryStays.map((stay) => {
      const timeline = buildStayTimelinePresentation(stay, input.today);
      return {
        stay,
        dateLabel: timeline.dateLabel,
        durationLabel: timeline.durationLabel,
        isApproximate: timeline.isApproximate,
        sortKey: getStaySortKey(stay),
      };
    }),
    places,
    memories,
    notes,
    documents,
  };
}

function groupPlaceVisits(placeVisits: PlaceVisit[]): CountryPlaceGroup[] {
  const groups = new Map<string, { visits: PlaceVisit[]; normalizedName: string }>();

  for (const place of placeVisits) {
    const normalizedName = place.name.trim();
    const key = normalizedName.toLowerCase();
    if (!groups.has(key)) {
      groups.set(key, { visits: [], normalizedName });
    }
    groups.get(key)!.visits.push(place);
  }

  return [...groups.values()]
    .map(({ visits, normalizedName }) => {
      const sorted = [...visits].sort((a, b) => {
        const aKey = a.visitDate ?? a.approximatePeriod ?? a.createdAt;
        const bKey = b.visitDate ?? b.approximatePeriod ?? b.createdAt;
        return bKey.localeCompare(aKey);
      });
      return {
        name: normalizedName,
        visitCount: visits.length,
        mostRecentLabel: sorted[0] ? formatPlaceRecentLabel(sorted[0]) : null,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function buildCountryChapterStayLine(item: CountryChapterStayItem): string {
  if (item.isApproximate) {
    return item.dateLabel;
  }
  if (item.durationLabel) {
    return `${item.dateLabel} · ${item.durationLabel}`;
  }
  return item.dateLabel;
}
