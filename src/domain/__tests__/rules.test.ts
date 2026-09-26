import { inclusiveDayCount, countUniqueCalendarDays } from '@/domain/utils/dates';
import { calculateSchengenRule, calculateUs183DayCounter, calculateUsSpt } from '@/domain/rules/ruleEngine';
import type { CountryRecord, Stay } from '@/shared/types';

describe('date utilities', () => {
  it('counts inclusive calendar days', () => {
    expect(inclusiveDayCount('2026-03-13', '2026-03-25')).toBe(13);
  });

  it('merges overlapping intervals without double-counting', () => {
    const total = countUniqueCalendarDays([
      { start: '2026-03-13', end: '2026-03-25', approximate: false },
      { start: '2026-03-20', end: '2026-03-30', approximate: false },
    ]);
    expect(total).toBe(18);
  });
});

describe('rule engine', () => {
  const countries: CountryRecord[] = [
    { code: 'TR', name: 'Türkiye', continent: 'Europe', schengen: false },
    { code: 'IT', name: 'Italy', continent: 'Europe', schengen: true },
    { code: 'US', name: 'United States', continent: 'North America', schengen: false },
  ];

  it('calculates Schengen using unique calendar dates', () => {
    const stays: Stay[] = [
      {
        id: 'a',
        countryCode: 'IT',
        city: null,
        arrivalDate: '2026-03-13',
        departureDate: '2026-03-25',
        datePrecision: 'exact',
        approximatePeriod: null,
    approximateDurationDays: null,
    stayType: null,
    visaNeeded: null,
    notes: null,
        createdAt: '',
        updatedAt: '',
      },
      {
        id: 'b',
        countryCode: 'IT',
        city: null,
        arrivalDate: '2026-03-20',
        departureDate: '2026-03-30',
        datePrecision: 'exact',
        approximatePeriod: null,
    approximateDurationDays: null,
    stayType: null,
    visaNeeded: null,
    notes: null,
        createdAt: '',
        updatedAt: '',
      },
    ];

    const result = calculateSchengenRule(stays, countries, '2026-09-08');
    expect(result.daysUsed).toBe(18);
    expect(result.state).toBe('EXACT');
  });

  it('calculates US 183-day counter for calendar year', () => {
    const stays: Stay[] = [
      {
        id: '1',
        countryCode: 'US',
        city: null,
        arrivalDate: '2026-01-01',
        departureDate: '2026-01-10',
        datePrecision: 'exact',
        approximatePeriod: null,
    approximateDurationDays: null,
    stayType: null,
    visaNeeded: null,
    notes: null,
        createdAt: '',
        updatedAt: '',
      },
    ];
    const result = calculateUs183DayCounter(stays, '2026-09-08');
    expect(result.daysUsed).toBe(10);
  });

  it('calculates weighted US SPT', () => {
    const stays: Stay[] = [
      {
        id: '1',
        countryCode: 'US',
        city: null,
        arrivalDate: '2026-01-01',
        departureDate: '2026-12-31',
        datePrecision: 'exact',
        approximatePeriod: null,
    approximateDurationDays: null,
    stayType: null,
    visaNeeded: null,
    notes: null,
        createdAt: '',
        updatedAt: '',
      },
    ];
    const result = calculateUsSpt(stays, '2026-09-08');
    expect(result.daysUsed).toBeGreaterThan(0);
    expect(result.disclaimer).toContain('tax residency');
  });
});
