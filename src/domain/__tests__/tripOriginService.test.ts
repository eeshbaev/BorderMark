import { buildHomeOriginForAbroadStay } from '@/domain/services/tripOriginService';
import type { Stay, UserProfile } from '@/shared/types';

function abroadStay(overrides: Partial<Stay> = {}): Stay {
  return {
    id: 'nl',
    countryCode: 'NL',
    city: null,
    arrivalDate: '2026-08-25',
    departureDate: null,
    datePrecision: 'exact',
    approximatePeriod: null,
    approximateDurationDays: null,
    stayType: 'visited',
    visaNeeded: null,
    notes: null,
    createdAt: '2026-08-25',
    updatedAt: '2026-08-25',
    ...overrides,
  };
}

const usProfile: UserProfile = {
  id: 'p1',
  name: 'Erkin',
  homeCountry: 'US',
  citizenships: ['US', 'UZ'],
  primaryNationality: 'US',
  birthDate: '1990-01-01',
  photoUri: null,
  createdAt: '2026-01-01',
  updatedAt: '2026-01-01',
};

describe('buildHomeOriginForAbroadStay', () => {
  it('shows home nationality instead of the last visited country', () => {
    const origin = buildHomeOriginForAbroadStay(abroadStay(), usProfile);
    expect(origin?.countryName).toBe('United States');
    expect(origin?.stay.countryCode).toBe('US');
    expect(origin?.leftLabel).toBe('left 25 AUG');
  });

  it('returns null when current stay is already at home', () => {
    expect(
      buildHomeOriginForAbroadStay(abroadStay({ countryCode: 'US', arrivalDate: '2026-08-25' }), usProfile),
    ).toBeNull();
  });
});
