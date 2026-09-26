import { buildPersonalMilestones } from '@/domain/services/milestoneService';
import type { Stay, UserProfile } from '@/shared/types';

const profile: UserProfile = {
  id: 'p1',
  name: 'Erkin',
  homeCountry: 'UZ',
  citizenships: ['UZ'],
  birthDate: '1990-01-15',
  primaryNationality: 'UZ',
  photoUri: null,
  createdAt: '2026-09-01T00:00:00.000Z',
  updatedAt: '2026-09-01T00:00:00.000Z',
};

const countryNames = new Map([
  ['CN', 'China'],
  ['DE', 'Germany'],
  ['UZ', 'Uzbekistan'],
]);

function stay(overrides: Partial<Stay> = {}): Stay {
  return {
    id: 'stay-1',
    countryCode: 'CN',
    city: null,
    arrivalDate: '2018-01-01',
    departureDate: '2021-12-31',
    datePrecision: 'exact',
    approximatePeriod: null,
    approximateDurationDays: null,
    stayType: 'lived',
    visaNeeded: null,
    notes: null,
    createdAt: '2018-01-01',
    updatedAt: '2018-01-01',
    ...overrides,
  };
}

describe('milestoneService', () => {
  it('builds biographical milestones from journey data', () => {
    const milestones = buildPersonalMilestones({
      profile,
      stays: [
        stay({ id: 'cn', countryCode: 'CN', stayType: 'lived', arrivalDate: '2018-01-01', departureDate: '2021-12-31' }),
        stay({ id: 'de-return', countryCode: 'DE', stayType: 'visited', arrivalDate: '2024-05-01', departureDate: '2024-05-14' }),
        stay({ id: 'de-first', countryCode: 'DE', stayType: 'visited', arrivalDate: '2020-03-01', departureDate: '2020-03-10' }),
      ],
      countryNames,
      today: '2026-09-08',
    });

    expect(milestones.map((milestone) => milestone.title)).toEqual([
      'First recorded stay',
      'First time living abroad',
      '100th recorded day abroad',
      'Returned to a country',
      'Your longest stay',
    ]);
    expect(milestones[0]).toMatchObject({ countryName: 'China', detail: '2018' });
    expect(milestones[3]).toMatchObject({ countryName: 'Germany', detail: '2024' });
    expect(milestones[4]?.detail).toContain('days');
  });

  it('returns only first recorded stay when journey is minimal', () => {
    const milestones = buildPersonalMilestones({
      profile,
      stays: [
        stay({
          id: 'uz',
          countryCode: 'UZ',
          stayType: null,
          arrivalDate: '2026-09-01',
          departureDate: null,
        }),
      ],
      countryNames,
      today: '2026-09-08',
    });

    expect(milestones.map((milestone) => milestone.title)).toEqual(['First recorded stay', 'Your longest stay']);
  });

  it('returns empty list when there are no stays', () => {
    const milestones = buildPersonalMilestones({
      profile,
      stays: [],
      countryNames,
      today: '2026-09-08',
    });

    expect(milestones).toEqual([]);
  });
});
