import {
  isAbroad,
  isInNationalityCountry,
  shouldAskVisaQuestion,
  shouldSwitchNationalityStay,
} from '@/domain/services/nationalityHomeLogic';
import type { Stay, UserProfile } from '@/shared/types';

const profile: UserProfile = {
  id: 'p1',
  name: 'Erkin',
  homeCountry: 'UZ',
  citizenships: ['UZ', 'RU'],
  birthDate: '1990-01-15',
  primaryNationality: 'UZ',
  photoUri: null,
  createdAt: '',
  updatedAt: '',
};

const uzStay: Stay = {
  id: '1',
  countryCode: 'UZ',
  city: 'Tashkent',
  arrivalDate: '2026-01-01',
  departureDate: null,
  datePrecision: 'exact',
  approximatePeriod: null,
  approximateDurationDays: null,
  stayType: 'lived',
  visaNeeded: null,
  notes: null,
  createdAt: '',
  updatedAt: '',
};

const itStay: Stay = {
  ...uzStay,
  id: '2',
  countryCode: 'IT',
  stayType: 'visited',
  visaNeeded: true,
};

describe('nationalityHomeService', () => {
  it('detects abroad stays', () => {
    expect(isAbroad(itStay, profile)).toBe(true);
    expect(isAbroad(uzStay, profile)).toBe(false);
  });

  it('requires visa question outside nationalities', () => {
    expect(shouldAskVisaQuestion('IT', profile.citizenships)).toBe(true);
    expect(shouldAskVisaQuestion('UZ', profile.citizenships)).toBe(false);
  });

  it('switches nationality when moving between home countries', () => {
    expect(shouldSwitchNationalityStay(uzStay, profile, 'RU')).toBe(true);
    expect(shouldSwitchNationalityStay(itStay, profile, 'RU')).toBe(false);
    expect(isInNationalityCountry(uzStay, profile)).toBe(true);
  });
});
