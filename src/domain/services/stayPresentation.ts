import { format, parseISO } from 'date-fns';

import {
  getApproximatePeriodBounds,
  precisionDisplayName,
} from '@/domain/utils/approximatePeriod';
import {
  formatStayDateLabel,
  inclusiveDayCount,
  isCurrentStay,
  isValidIsoDate,
} from '@/domain/utils/dates';
import type { Stay } from '@/shared/types';

export interface StayTimelinePresentation {
  dateLabel: string;
  durationLabel: string | null;
  precisionBadge: string | null;
  isApproximate: boolean;
}

function formatMonthShort(monthValue: string): string {
  return format(parseISO(`${monthValue}-01`), 'MMM');
}

function formatBoundedPeriodLabel(approximatePeriod: string): string {
  const [start, end] = approximatePeriod.split('/');
  const startYear = start.slice(0, 4);
  const endYear = end.slice(0, 4);
  if (startYear === endYear) {
    return `${formatMonthShort(start)}–${formatMonthShort(end)} ${startYear}`;
  }
  return `${formatMonthShort(start)} ${startYear}–${formatMonthShort(end)} ${endYear}`;
}

export function formatApproximateDuration(days: number | null | undefined): string | null {
  if (days == null || days <= 0) {
    return null;
  }
  return `~${days} days`;
}

export function buildStayTimelinePresentation(stay: Stay, today: string): StayTimelinePresentation {
  const precisionBadge = precisionDisplayName(stay.datePrecision);
  const durationPart = formatApproximateDuration(stay.approximateDurationDays);

  if (stay.datePrecision === 'exact' && isValidIsoDate(stay.arrivalDate)) {
    const dayCount = isValidIsoDate(stay.departureDate)
      ? inclusiveDayCount(stay.arrivalDate, stay.departureDate)
      : isCurrentStay(stay, today)
        ? inclusiveDayCount(stay.arrivalDate, today)
        : null;

    return {
      dateLabel: formatStayDateLabel(stay, today),
      durationLabel: dayCount != null ? `${dayCount} days` : null,
      precisionBadge: null,
      isApproximate: false,
    };
  }

  if (stay.datePrecision === 'month' && stay.approximatePeriod) {
    const monthLabel = format(parseISO(`${stay.approximatePeriod}-01`), 'MMMM yyyy');
    return {
      dateLabel: durationPart ? `${monthLabel} · ${durationPart}` : monthLabel,
      durationLabel: null,
      precisionBadge,
      isApproximate: true,
    };
  }

  if (stay.datePrecision === 'year' && stay.approximatePeriod) {
    const isYearMonthHint = /^\d{4}-\d{2}$/.test(stay.approximatePeriod);
    const dateLabel = isYearMonthHint
      ? `${format(parseISO(`${stay.approximatePeriod}-01`), 'MMMM yyyy')}`
      : stay.approximatePeriod;
    return {
      dateLabel: durationPart ? `${dateLabel} · ${durationPart}` : dateLabel,
      precisionBadge,
      isApproximate: true,
      durationLabel: null,
    };
  }

  if (stay.datePrecision === 'approximate' && stay.approximatePeriod) {
    const boundedLabel = formatBoundedPeriodLabel(stay.approximatePeriod);
    return {
      dateLabel: durationPart ? `${boundedLabel} · ${durationPart}` : boundedLabel,
      durationLabel: null,
      precisionBadge,
      isApproximate: true,
    };
  }

  return {
    dateLabel: 'Approximate dates recorded',
    durationLabel: durationPart,
    precisionBadge,
    isApproximate: true,
  };
}

export interface StayDetailPresentation {
  precisionHeading: string | null;
  primaryLabel: string;
  secondaryLabel: string | null;
  durationLabel: string | null;
  helperText: string | null;
}

export function buildStayDetailPresentation(stay: Stay, today: string): StayDetailPresentation {
  const timeline = buildStayTimelinePresentation(stay, today);

  if (!timeline.isApproximate) {
    return {
      precisionHeading: null,
      primaryLabel: timeline.dateLabel,
      secondaryLabel: timeline.durationLabel,
      durationLabel: null,
      helperText: null,
    };
  }

  let primaryLabel = timeline.dateLabel;
  if (stay.datePrecision === 'month' && stay.approximatePeriod) {
    primaryLabel = format(parseISO(`${stay.approximatePeriod}-01`), 'MMMM yyyy');
  } else if (stay.datePrecision === 'year' && stay.approximatePeriod) {
    primaryLabel = /^\d{4}$/.test(stay.approximatePeriod)
      ? stay.approximatePeriod
      : format(parseISO(`${stay.approximatePeriod}-01`), 'MMMM yyyy');
  } else if (stay.datePrecision === 'approximate' && stay.approximatePeriod) {
    primaryLabel = formatBoundedPeriodLabel(stay.approximatePeriod);
  }

  const durationLabel =
    stay.approximateDurationDays != null && stay.approximateDurationDays > 0
      ? `About ${stay.approximateDurationDays} days`
      : null;

  return {
    precisionHeading: 'Approximate dates',
    primaryLabel,
    secondaryLabel: durationLabel,
    durationLabel,
    helperText:
      'BorderMark will keep these dates approximate and will not guess exact calendar dates.',
  };
}

export function stayAffectsRuleCalculation(stay: Stay): boolean {
  return stay.datePrecision !== 'exact';
}
