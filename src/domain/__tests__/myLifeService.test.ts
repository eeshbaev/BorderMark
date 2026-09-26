import { buildMyLifeSummary, formatMyLifeCountryCount } from '@/domain/services/myLifeService';
import type { Stay } from '@/shared/types';

function stay(overrides: Partial<Stay> = {}): Stay {
  return {
    id: 'stay-1',
    countryCode: 'DE',
    city: null,
    arrivalDate: '2020-01-01',
    departureDate: '2021-01-01',
    datePrecision: 'exact',
    approximatePeriod: null,
    approximateDurationDays: null,
    stayType: null,
    visaNeeded: null,
    notes: null,
    createdAt: '',
    updatedAt: '',
    ...overrides,
  };
}

describe('myLifeService', () => {
  it('groups unique countries by stay type in life-map order', () => {
    const summary = buildMyLifeSummary([
      stay({ id: '1', countryCode: 'DE', stayType: 'lived' }),
      stay({ id: '2', countryCode: 'CN', stayType: 'lived' }),
      stay({ id: '3', countryCode: 'UZ', stayType: 'lived' }),
      stay({ id: '4', countryCode: 'DE', stayType: 'studied' }),
      stay({ id: '5', countryCode: 'NL', stayType: 'studied' }),
      stay({ id: '6', countryCode: 'US', stayType: 'worked' }),
      stay({ id: '7', countryCode: 'GB', stayType: 'worked' }),
      stay({ id: '8', countryCode: 'FR', stayType: 'worked' }),
      stay({ id: '9', countryCode: 'IT', stayType: 'worked' }),
      stay({ id: '10', countryCode: 'TR', stayType: 'visited' }),
      stay({ id: '11', countryCode: 'GE', stayType: 'transit' }),
      stay({ id: '12', countryCode: 'GE', stayType: 'transit' }),
    ]);

    expect(summary.hasData).toBe(true);
    expect(summary.categories.map((category) => category.label)).toEqual([
      'Lived',
      'Studied',
      'Worked',
      'Visited',
      'Passed through',
    ]);
    expect(summary.categories[0]?.countryCount).toBe(3);
    expect(summary.categories[1]?.countryCount).toBe(2);
    expect(summary.categories[4]?.countryCount).toBe(1);
  });

  it('ignores stays without a stay type', () => {
    const summary = buildMyLifeSummary([stay({ stayType: null })]);
    expect(summary.hasData).toBe(false);
    expect(summary.categories).toHaveLength(0);
  });

  it('formats country counts naturally', () => {
    expect(formatMyLifeCountryCount(1)).toBe('1 country');
    expect(formatMyLifeCountryCount(12)).toBe('12 countries');
  });
});
