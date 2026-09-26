import type { CountryRecord, Rule, RuleCalculationResult, Stay } from '@/shared/types';
import {
  estimateApproximateDaysInWindow,
  getApproximatePeriodBounds,
  periodOverlapsWindow,
} from '@/domain/utils/approximatePeriod';
import {
  calendarYearBounds,
  countUniqueCalendarDays,
  expandStayToInterval,
  intersectInterval,
  isValidIsoDate,
  parseIsoDate,
  rollingWindowStart,
  schengenWindowStart,
  todayIso,
} from '@/domain/utils/dates';
import { findCrossCountrySameDayConflicts } from '@/domain/services/stayValidation';

const SCHENGEN_THRESHOLD = 90;
const US_183_THRESHOLD = 183;
const SPT_THRESHOLD = 183;

function baseResult(
  threshold: number,
  state: RuleCalculationResult['state'],
  warnings: string[] = [],
): RuleCalculationResult {
  return {
    state,
    daysUsed: null,
    daysRemaining: null,
    threshold,
    windowStart: null,
    windowEnd: null,
    applicableStays: [],
    warnings,
  };
}

function collectApplicableIntervals(
  stays: Stay[],
  windowStart: string,
  windowEnd: string,
  countryFilter: (code: string) => boolean,
): {
  intervals: ReturnType<typeof intersectInterval>[];
  approximate: boolean;
  stayIds: string[];
  approximateDayEstimate: number;
  hasUnquantifiedApproximateInWindow: boolean;
} {
  const intervals = [];
  const stayIds: string[] = [];
  let approximate = false;
  let approximateDayEstimate = 0;
  let hasUnquantifiedApproximateInWindow = false;

  for (const stay of stays) {
    if (!countryFilter(stay.countryCode)) {
      continue;
    }

    const expanded = expandStayToInterval(stay);
    if (expanded) {
      const clipped = intersectInterval(expanded, windowStart, windowEnd);
      if (clipped) {
        intervals.push(clipped);
        stayIds.push(stay.id);
      }
      continue;
    }

    if (stay.datePrecision === 'exact') {
      continue;
    }

    const bounds = getApproximatePeriodBounds(stay);
    if (!bounds || !periodOverlapsWindow(bounds, windowStart, windowEnd)) {
      continue;
    }

    approximate = true;
    stayIds.push(stay.id);

    const estimatedDays = estimateApproximateDaysInWindow(stay, windowStart, windowEnd);
    if (estimatedDays == null) {
      hasUnquantifiedApproximateInWindow = true;
      continue;
    }

    approximateDayEstimate += estimatedDays;
  }

  return {
    intervals: intervals.filter(Boolean),
    approximate,
    stayIds,
    approximateDayEstimate,
    hasUnquantifiedApproximateInWindow,
  };
}

function countApplicableDays(
  intervals: ReturnType<typeof intersectInterval>[],
  approximateDayEstimate: number,
): number {
  return countUniqueCalendarDays(intervals.filter(Boolean) as NonNullable<(typeof intervals)[number]>[]) + approximateDayEstimate;
}

export function calculateSchengenRule(
  stays: Stay[],
  countries: CountryRecord[],
  today: string = todayIso(),
): RuleCalculationResult {
  const crossCountryConflicts = findCrossCountrySameDayConflicts(stays);
  if (crossCountryConflicts.length > 0) {
    return {
      ...baseResult(SCHENGEN_THRESHOLD, 'UNAVAILABLE', [
        'Conflicting stays in different countries overlap on the same dates.',
      ]),
      disclaimer:
        'Based on your recorded stays. Resolve overlapping country stays before relying on this result.',
    };
  }

  const windowStart = schengenWindowStart(today);
  const windowEnd = today;
  const schengenCodes = new Set(countries.filter((c) => c.schengen).map((c) => c.code));

  const { intervals, approximate, stayIds, approximateDayEstimate, hasUnquantifiedApproximateInWindow } =
    collectApplicableIntervals(
    stays,
    windowStart,
    windowEnd,
    (code) => schengenCodes.has(code),
  );

  if (approximate && intervals.length === 0 && approximateDayEstimate === 0) {
    return {
      ...baseResult(SCHENGEN_THRESHOLD, 'UNAVAILABLE', [
        'Approximate stays prevent a definitive Schengen calculation.',
      ]),
      windowStart,
      windowEnd,
      disclaimer: 'Based on your recorded stays.',
    };
  }

  if (hasUnquantifiedApproximateInWindow && intervals.length === 0 && approximateDayEstimate === 0) {
    return {
      ...baseResult(SCHENGEN_THRESHOLD, 'UNAVAILABLE', [
        'Approximate stays in this window lack enough detail for a definitive calculation.',
      ]),
      windowStart,
      windowEnd,
      disclaimer: 'Based on your recorded stays.',
    };
  }

  const daysUsed = countApplicableDays(intervals, approximateDayEstimate);
  const daysRemaining = Math.max(SCHENGEN_THRESHOLD - daysUsed, 0);

  return {
    state: approximate ? 'ESTIMATED' : 'EXACT',
    daysUsed,
    daysRemaining,
    threshold: SCHENGEN_THRESHOLD,
    windowStart,
    windowEnd,
    applicableStays: stayIds,
    warnings: approximate
      ? ['One or more applicable stays use approximate dates.']
      : [],
    estimatedRange: approximate ? { min: daysUsed, max: daysUsed + 7 } : undefined,
    disclaimer: 'Based on your recorded stays.',
  };
}

export function calculateUs183DayCounter(
  stays: Stay[],
  today: string = todayIso(),
): RuleCalculationResult {
  const year = parseInt(today.slice(0, 4), 10);
  const { start, end } = calendarYearBounds(year);

  const { intervals, approximate, stayIds, approximateDayEstimate } = collectApplicableIntervals(
    stays,
    start,
    end,
    (code) => code === 'US',
  );

  const daysUsed = countApplicableDays(intervals, approximateDayEstimate);

  return {
    state: approximate ? 'ESTIMATED' : 'EXACT',
    daysUsed,
    daysRemaining: Math.max(US_183_THRESHOLD - daysUsed, 0),
    threshold: US_183_THRESHOLD,
    windowStart: start,
    windowEnd: end,
    applicableStays: stayIds,
    warnings: approximate ? ['Approximate US stays affect this count.'] : [],
    disclaimer: 'Simple calendar-year day counter. Not a tax residency determination.',
  };
}

export function calculateUsSpt(
  stays: Stay[],
  today: string = todayIso(),
): RuleCalculationResult {
  const currentYear = parseInt(today.slice(0, 4), 10);
  const years = [currentYear, currentYear - 1, currentYear - 2];
  const weights = [1, 1 / 3, 1 / 6];

  let weightedTotal = 0;
  let approximate = false;
  const applicableStays = new Set<string>();
  const warnings: string[] = [];

  years.forEach((year, index) => {
    const { start, end } = calendarYearBounds(year);
    const { intervals, approximate: yearApprox, stayIds, approximateDayEstimate } = collectApplicableIntervals(
      stays,
      start,
      end,
      (code) => code === 'US',
    );
    approximate = approximate || yearApprox;
    stayIds.forEach((id) => applicableStays.add(id));
    const days = countApplicableDays(intervals, approximateDayEstimate);
    weightedTotal += days * weights[index];
  });

  const weightedDays = Math.floor(weightedTotal);
  const daysRemaining = Math.max(SPT_THRESHOLD - weightedDays, 0);

  if (approximate) {
    warnings.push('Approximate US stays affect this weighted calculation.');
  }

  return {
    state: approximate ? 'ESTIMATED' : 'EXACT',
    daysUsed: weightedDays,
    daysRemaining,
    threshold: SPT_THRESHOLD,
    windowStart: calendarYearBounds(currentYear - 2).start,
    windowEnd: calendarYearBounds(currentYear).end,
    applicableStays: [...applicableStays],
    warnings,
    disclaimer:
      'Weighted Substantial Presence Test estimate only. Reaching 183 does not by itself determine tax residency.',
  };
}

function customRuleWindow(
  rule: Rule,
  today: string,
): { windowStart: string; windowEnd: string; disclaimer?: string } {
  const lookbackDays = rule.lookbackDays ?? 365;
  const windowMode = rule.config?.windowMode;

  if (windowMode === 'calendar_year') {
    const year = parseIsoDate(today).getFullYear();
    const { start, end } = calendarYearBounds(year);
    return {
      windowStart: start,
      windowEnd: end < today ? end : today,
      disclaimer: 'Calendar-year day count from your stays — not tax or immigration advice.',
    };
  }

  return {
    windowStart: rollingWindowStart(today, lookbackDays),
    windowEnd: today,
    disclaimer: 'Based on your recorded stays.',
  };
}

export function calculateCustomRule(
  rule: Rule,
  stays: Stay[],
  today: string = todayIso(),
): RuleCalculationResult {
  const threshold = rule.threshold ?? 0;
  const countries = new Set(rule.applicableCountries ?? []);

  if (countries.size === 0 || threshold <= 0) {
    return baseResult(threshold, 'UNAVAILABLE', ['Custom rule configuration is incomplete.']);
  }

  const { windowStart, windowEnd, disclaimer } = customRuleWindow(rule, today);

  const { intervals, approximate, stayIds, approximateDayEstimate } = collectApplicableIntervals(
    stays,
    windowStart,
    windowEnd,
    (code) => countries.has(code),
  );

  const daysUsed = countApplicableDays(intervals, approximateDayEstimate);

  return {
    state: approximate ? 'ESTIMATED' : 'EXACT',
    daysUsed,
    daysRemaining: Math.max(threshold - daysUsed, 0),
    threshold,
    windowStart,
    windowEnd,
    applicableStays: stayIds,
    warnings: approximate ? ['Approximate stays affect this custom rule.'] : [],
    disclaimer,
  };
}

export function calculateRule(
  rule: Rule,
  stays: Stay[],
  countries: CountryRecord[],
  today: string = todayIso(),
): RuleCalculationResult {
  switch (rule.ruleType) {
    case 'schengen_90_180':
      return calculateSchengenRule(stays, countries, today);
    case 'us_183_day_counter':
      return calculateUs183DayCounter(stays, today);
    case 'us_spt':
      return calculateUsSpt(stays, today);
    case 'custom_threshold':
      return calculateCustomRule(rule, stays, today);
    default:
      return baseResult(0, 'UNAVAILABLE', ['Unknown rule type.']);
  }
}

export function isStayApplicableToRule(stay: Stay, rule: Rule, countries: CountryRecord[]): boolean {
  if (rule.ruleType === 'schengen_90_180') {
    return countries.some((c) => c.code === stay.countryCode && c.schengen);
  }
  if (rule.ruleType === 'us_spt' || rule.ruleType === 'us_183_day_counter') {
    return stay.countryCode === 'US';
  }
  if (rule.ruleType === 'custom_threshold') {
    return (rule.applicableCountries ?? []).includes(stay.countryCode);
  }
  return false;
}

export function hasExactDates(stay: Stay): boolean {
  return stay.datePrecision === 'exact' && isValidIsoDate(stay.arrivalDate);
}
