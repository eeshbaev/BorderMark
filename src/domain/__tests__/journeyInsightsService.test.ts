import { buildJourneyInsights } from '@/domain/services/journeyInsightsService';
import type { Stay } from '@/shared/types';

function exactStay(overrides: Partial<Stay> = {}): Stay {
  return {
    id: 'stay-1',
    countryCode: 'UZ',
    city: null,
    arrivalDate: '2018-01-01',
    departureDate: '2018-12-31',
    datePrecision: 'exact',
    approximatePeriod: null,
    approximateDurationDays: null,
    stayType: null,
    visaNeeded: null,
    notes: null,
    createdAt: '2018-01-01',
    updatedAt: '2018-01-01',
    ...overrides,
  };
}

const countryNames = new Map([
  ['UZ', 'Uzbekistan'],
  ['CN', 'China'],
  ['GE', 'Georgia'],
  ['DE', 'Germany'],
]);

describe('journeyInsightsService', () => {
  it('builds firsts, longest, and most revisited insights', () => {
    const stays = [
      exactStay({ id: 'cn-lived', countryCode: 'CN', stayType: 'lived', arrivalDate: '2018-03-01', departureDate: '2021-12-31' }),
      exactStay({ id: 'cn-long', countryCode: 'CN', stayType: 'lived', arrivalDate: '2018-03-01', departureDate: '2021-12-31' }),
      exactStay({ id: 'ge-1', countryCode: 'GE', arrivalDate: '2020-01-01', departureDate: '2020-01-10' }),
      exactStay({ id: 'ge-2', countryCode: 'GE', arrivalDate: '2021-01-01', departureDate: '2021-01-10' }),
      exactStay({ id: 'ge-3', countryCode: 'GE', arrivalDate: '2022-01-01', departureDate: '2022-01-10' }),
    ];

    const insights = buildJourneyInsights({
      stays,
      citizenships: ['UZ'],
      countryNames,
      today: '2026-09-08',
    });

    expect(insights.yourFirsts.map((item) => item.label)).toEqual([
      'First country outside home',
      'First country lived in',
      'First recorded border crossing',
    ]);
    expect(insights.yourFirsts[0]?.countryCode).toBe('CN');
    expect(insights.yourFirsts[0]?.detail).toBe('2018');
    expect(insights.longestStay?.countryCode).toBe('CN');
    expect(insights.longestStay?.detail).toContain('days');
    expect(insights.mostRevisited?.countryCode).toBe('GE');
    expect(insights.mostRevisited?.detail).toBe('3 stays');
  });

  it('hides outside-home insight when citizenships are not set', () => {
    const insights = buildJourneyInsights({
      stays: [exactStay({ countryCode: 'CN' })],
      citizenships: [],
      countryNames,
      today: '2026-09-08',
    });

    expect(insights.yourFirsts.some((item) => item.label === 'First country outside home')).toBe(false);
    expect(insights.yourFirsts.some((item) => item.label === 'First recorded border crossing')).toBe(true);
  });

  it('hides most revisited when no country has multiple stays', () => {
    const insights = buildJourneyInsights({
      stays: [exactStay({ id: '1', countryCode: 'CN' }), exactStay({ id: '2', countryCode: 'GE' })],
      citizenships: ['UZ'],
      countryNames,
      today: '2026-09-08',
    });

    expect(insights.mostRevisited).toBeNull();
  });
});
