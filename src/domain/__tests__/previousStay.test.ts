import { findPreviousStay } from '@/domain/services/stayValidation';
import {
  formatPreviousStayLeftLabel,
  resolvePreviousStayCloseDates,
} from '@/domain/utils/dates';
import type { Stay } from '@/shared/types';

function exactStay(
  overrides: Partial<Stay> & Pick<Stay, 'id' | 'countryCode' | 'arrivalDate'>,
): Stay {
  return {
    departureDate: null,
    datePrecision: 'exact',
    approximatePeriod: null,
    approximateDurationDays: null,
    stayType: null,
    visaNeeded: null,
    city: null,
    notes: null,
    createdAt: '2026-09-01',
    updatedAt: '2026-09-01',
    ...overrides,
  };
}

describe('findPreviousStay', () => {
  it('returns the most recent ended stay in a different country', () => {
    const uz = exactStay({
      id: 'uz',
      countryCode: 'UZ',
      arrivalDate: '2026-08-01',
      departureDate: '2026-09-07',
    });
    const nl = exactStay({
      id: 'nl',
      countryCode: 'NL',
      arrivalDate: '2026-09-08',
    });

    expect(findPreviousStay([uz, nl], nl)).toBe(uz);
  });

  it('ignores stays in the same country', () => {
    const earlierNl = exactStay({
      id: 'nl-old',
      countryCode: 'NL',
      arrivalDate: '2026-06-01',
      departureDate: '2026-06-30',
    });
    const nl = exactStay({
      id: 'nl',
      countryCode: 'NL',
      arrivalDate: '2026-09-08',
    });

    expect(findPreviousStay([earlierNl, nl], nl)).toBeNull();
  });

  it('ignores stays that ended after the current arrival', () => {
    const future = exactStay({
      id: 'ge',
      countryCode: 'GE',
      arrivalDate: '2026-09-01',
      departureDate: '2026-09-10',
    });
    const nl = exactStay({
      id: 'nl',
      countryCode: 'NL',
      arrivalDate: '2026-09-08',
    });

    expect(findPreviousStay([future, nl], nl)).toBeNull();
  });

  it('returns null when current stay has no exact arrival date', () => {
    const uz = exactStay({
      id: 'uz',
      countryCode: 'UZ',
      arrivalDate: '2026-08-01',
      departureDate: '2026-09-07',
    });
    const approximate = exactStay({
      id: 'nl',
      countryCode: 'NL',
      arrivalDate: '2026-09-08',
      datePrecision: 'month',
      approximatePeriod: '2026-09',
    });

    expect(findPreviousStay([uz, approximate], approximate)).toBeNull();
  });
});

describe('formatPreviousStayLeftLabel', () => {
  it('formats departure as until label', () => {
    const stay = exactStay({
      id: 'uz',
      countryCode: 'UZ',
      arrivalDate: '2026-08-01',
      departureDate: '2026-09-07',
    });

    expect(formatPreviousStayLeftLabel(stay)).toBe('until 7 SEP');
  });
});

describe('resolvePreviousStayCloseDates', () => {
  it('closes the day before a later arrival', () => {
    expect(resolvePreviousStayCloseDates('2026-08-01', '2026-09-08')).toEqual({
      arrivalDate: '2026-08-01',
      departureDate: '2026-09-07',
    });
  });

  it('compresses a same-day stay to the day before the new arrival', () => {
    expect(resolvePreviousStayCloseDates('2026-09-08', '2026-09-08')).toEqual({
      arrivalDate: '2026-09-07',
      departureDate: '2026-09-07',
    });
  });
});
