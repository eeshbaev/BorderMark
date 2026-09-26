import { format, parseISO, subYears } from 'date-fns';

import { getApproximatePeriodBounds } from '@/domain/utils/approximatePeriod';
import { ISO_DATE, isValidIsoDate, stayContainsDate } from '@/domain/utils/dates';
import type { MemoryRecord, Note, Stay } from '@/shared/types';

export interface OnThisDayMoment {
  yearsAgo: number;
  /** When set, this row summarizes the same moment on consecutive anniversaries through this many years ago. */
  yearsAgoEnd?: number;
  historicalDate: string;
  countryCode: string | null;
  countryName: string | null;
  variant: 'lived' | 'there' | 'memoriesOnly';
  headline: string;
  memoryCount: number;
  noteCount: number;
  notePreview: string | null;
  stayId: string | null;
}

export interface OnThisDaySummary {
  todayLabel: string;
  moments: OnThisDayMoment[];
}

function historicalDateForYearsAgo(today: string, yearsAgo: number): string {
  return format(subYears(parseISO(today), yearsAgo), ISO_DATE);
}

function approximateStayContainsDate(stay: Stay, isoDate: string): boolean {
  const bounds = getApproximatePeriodBounds(stay);
  if (!bounds) {
    return false;
  }
  return isoDate >= bounds.start && isoDate <= bounds.end;
}

function stayOnDate(stays: Stay[], isoDate: string): Stay | null {
  const exact = stays.find((stay) => stayContainsDate(stay, isoDate));
  if (exact) {
    return exact;
  }
  return stays.find((stay) => approximateStayContainsDate(stay, isoDate)) ?? null;
}

function memoryMatchesDate(memory: MemoryRecord, isoDate: string): boolean {
  if (memory.datePrecision === 'exact' && memory.memoryDate) {
    return memory.memoryDate === isoDate;
  }
  if (memory.approximatePeriod) {
    const monthPrefix = isoDate.slice(0, 7);
    if (/^\d{4}-\d{2}$/.test(memory.approximatePeriod)) {
      return memory.approximatePeriod === monthPrefix;
    }
    if (/^\d{4}$/.test(memory.approximatePeriod)) {
      return memory.approximatePeriod === isoDate.slice(0, 4);
    }
  }
  return false;
}

function noteMatchesDate(note: Note, isoDate: string): boolean {
  return note.noteDate === isoDate;
}

function formatYearsAgoLabel(yearsAgo: number): string {
  return yearsAgo === 1 ? '1 year ago' : `${yearsAgo} years ago`;
}

export function formatYearsAgoRangeLabel(fromYearsAgo: number, toYearsAgo: number): string {
  const near = Math.min(fromYearsAgo, toYearsAgo);
  const far = Math.max(fromYearsAgo, toYearsAgo);
  if (near === far) {
    return formatYearsAgoLabel(near);
  }
  return `${near}–${far} years ago`;
}

function momentCollapseKey(moment: OnThisDayMoment): string {
  return [
    moment.variant,
    moment.countryCode ?? '',
    moment.stayId ?? '',
    moment.headline,
    moment.notePreview ?? '',
  ].join('|');
}

function canCollapseMoments(previous: OnThisDayMoment, next: OnThisDayMoment): boolean {
  if (next.yearsAgo !== previous.yearsAgo + 1) {
    return false;
  }
  if (previous.memoryCount > 0 || next.memoryCount > 0) {
    return false;
  }
  if (previous.noteCount > 0 || next.noteCount > 0) {
    return false;
  }
  return momentCollapseKey(previous) === momentCollapseKey(next);
}

function collapsedHeadline(start: OnThisDayMoment): string {
  if (start.variant === 'lived' && start.countryName) {
    return `You were living in ${start.countryName}.`;
  }
  return start.headline;
}

function collapseRepetitiveMoments(moments: OnThisDayMoment[]): OnThisDayMoment[] {
  if (moments.length <= 1) {
    return moments;
  }

  const collapsed: OnThisDayMoment[] = [];
  let groupStart = moments[0]!;
  let groupEnd = moments[0]!;

  function flushGroup() {
    if (groupStart.yearsAgo === groupEnd.yearsAgo) {
      collapsed.push(groupStart);
      return;
    }
    collapsed.push({
      ...groupStart,
      yearsAgoEnd: groupEnd.yearsAgo,
      headline: collapsedHeadline(groupStart),
    });
  }

  for (let index = 1; index < moments.length; index += 1) {
    const next = moments[index]!;
    if (canCollapseMoments(groupEnd, next)) {
      groupEnd = next;
      continue;
    }
    flushGroup();
    groupStart = next;
    groupEnd = next;
  }

  flushGroup();
  return collapsed;
}

function buildHeadline(
  stay: Stay | null,
  countryName: string | null,
  yearsAgo: number,
): { variant: OnThisDayMoment['variant']; headline: string } {
  if (stay?.stayType === 'lived' && countryName) {
    return {
      variant: 'lived',
      headline: `${formatYearsAgoLabel(yearsAgo)}, you were living in ${countryName}.`,
    };
  }
  if (stay && countryName) {
    return { variant: 'there', headline: 'You were there.' };
  }
  return { variant: 'memoriesOnly', headline: formatYearsAgoLabel(yearsAgo) };
}

function truncateNote(content: string, maxLength = 72): string {
  const trimmed = content.trim();
  if (trimmed.length <= maxLength) {
    return trimmed;
  }
  return `${trimmed.slice(0, maxLength - 1).trim()}…`;
}

function resolveCountryForMoment(
  stay: Stay | null,
  memories: MemoryRecord[],
  notes: Note[],
  staysById: Map<string, Stay>,
  countryNames: Map<string, string>,
): { countryCode: string | null; countryName: string | null; stayId: string | null } {
  if (stay) {
    return {
      countryCode: stay.countryCode,
      countryName: countryNames.get(stay.countryCode) ?? stay.countryCode,
      stayId: stay.id,
    };
  }

  const linkedStayId = memories.find((memory) => memory.stayId)?.stayId
    ?? notes.find((note) => note.stayId)?.stayId
    ?? null;

  if (!linkedStayId) {
    return { countryCode: null, countryName: null, stayId: null };
  }

  const linkedStay = staysById.get(linkedStayId);
  if (!linkedStay) {
    return { countryCode: null, countryName: null, stayId: linkedStayId };
  }

  return {
    countryCode: linkedStay.countryCode,
    countryName: countryNames.get(linkedStay.countryCode) ?? linkedStay.countryCode,
    stayId: linkedStayId,
  };
}

function earliestRecordedYear(input: {
  stays: Stay[];
  memories: MemoryRecord[];
  notes: Note[];
  today: string;
}): number {
  const todayYear = parseInt(input.today.slice(0, 4), 10);
  let earliest = todayYear;

  for (const stay of input.stays) {
    if (isValidIsoDate(stay.arrivalDate)) {
      earliest = Math.min(earliest, parseInt(stay.arrivalDate.slice(0, 4), 10));
    } else if (stay.approximatePeriod) {
      earliest = Math.min(earliest, parseInt(stay.approximatePeriod.slice(0, 4), 10));
    }
  }

  for (const memory of input.memories) {
    if (memory.memoryDate) {
      earliest = Math.min(earliest, parseInt(memory.memoryDate.slice(0, 4), 10));
    } else if (memory.approximatePeriod) {
      earliest = Math.min(earliest, parseInt(memory.approximatePeriod.slice(0, 4), 10));
    }
  }

  for (const note of input.notes) {
    if (note.noteDate) {
      earliest = Math.min(earliest, parseInt(note.noteDate.slice(0, 4), 10));
    }
  }

  return earliest;
}

export function buildOnThisDaySummary(input: {
  stays: Stay[];
  memories: MemoryRecord[];
  notes: Note[];
  countryNames: Map<string, string>;
  today: string;
  maxMoments?: number;
}): OnThisDaySummary {
  const todayLabel = format(parseISO(input.today), 'd MMMM');
  const todayYear = parseInt(input.today.slice(0, 4), 10);
  const earliestYear = earliestRecordedYear(input);
  const maxMoments = input.maxMoments ?? 8;
  const staysById = new Map(input.stays.map((stay) => [stay.id, stay]));
  const moments: OnThisDayMoment[] = [];

  for (let yearsAgo = 1; yearsAgo <= todayYear - earliestYear; yearsAgo += 1) {
    const historicalDate = historicalDateForYearsAgo(input.today, yearsAgo);
    const stay = stayOnDate(input.stays, historicalDate);
    const dayMemories = input.memories.filter((memory) => memoryMatchesDate(memory, historicalDate));
    const dayNotes = input.notes.filter((note) => noteMatchesDate(note, historicalDate));

    if (!stay && dayMemories.length === 0 && dayNotes.length === 0) {
      continue;
    }

    const { countryCode, countryName, stayId } = resolveCountryForMoment(
      stay,
      dayMemories,
      dayNotes,
      staysById,
      input.countryNames,
    );

    const notePreview = dayNotes[0] ? truncateNote(dayNotes[0].content) : null;

    const { variant, headline } = buildHeadline(stay, countryName, yearsAgo);

    moments.push({
      yearsAgo,
      historicalDate,
      countryCode,
      countryName,
      variant,
      headline,
      memoryCount: dayMemories.length,
      noteCount: dayNotes.length,
      notePreview,
      stayId: stay?.id ?? stayId,
    });
  }

  const collapsed = collapseRepetitiveMoments(moments);
  return { todayLabel, moments: collapsed.slice(0, maxMoments) };
}

export { formatYearsAgoLabel };
