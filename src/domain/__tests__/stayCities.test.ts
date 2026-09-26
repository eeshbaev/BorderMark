import { citiesFromStayAndVisits, dedupeCityNamesPreserveOrder, primaryCityFromList } from '@/domain/services/stayCities';
import type { PlaceVisit, Stay } from '@/shared/types';

function stay(partial: Partial<Stay>): Stay {
  return {
    id: 's1',
    countryCode: 'CN',
    city: 'Beijing',
    arrivalDate: '2024-01-01',
    departureDate: null,
    datePrecision: 'exact',
    approximatePeriod: null,
    approximateDurationDays: null,
    stayType: 'visited',
    visaNeeded: null,
    notes: null,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    ...partial,
  };
}

function visit(name: string, visitDate: string): PlaceVisit {
  return {
    id: `pv-${name}`,
    stayId: 's1',
    name,
    visitDate,
    datePrecision: 'exact',
    approximatePeriod: null,
    notes: null,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  };
}

describe('stayCities', () => {
  it('dedupes cities case-insensitively', () => {
    expect(dedupeCityNamesPreserveOrder(['Tianjin', 'tianjin', 'Shanghai'])).toEqual(['Tianjin', 'Shanghai']);
  });

  it('orders place visits then current stay city', () => {
    const cities = citiesFromStayAndVisits(
      stay({ city: 'Beijing' }),
      [visit('Tianjin', '2018-09-25'), visit('Shanghai', '2020-01-01')],
    );
    expect(cities).toEqual(['Tianjin', 'Shanghai', 'Beijing']);
  });

  it('uses last city as primary for storage', () => {
    expect(primaryCityFromList(['Tianjin', 'Beijing'])).toBe('Beijing');
  });
});
