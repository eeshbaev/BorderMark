import {
  buildInferredHomeSegments,
  buildLifeTimeline,
  buildRecordedLifeSegments,
} from '@/domain/services/lifeTimelineService';
import type { Stay, UserProfile } from '@/shared/types';

const profile: UserProfile = {
  id: 'p1',
  name: 'Erkin',
  homeCountry: 'UZ',
  citizenships: ['UZ'],
  birthDate: '1990-01-15',
  primaryNationality: 'UZ',
  photoUri: null,
  createdAt: '',
  updatedAt: '',
};

function stay(overrides: Partial<Stay> = {}): Stay {
  return {
    id: 'stay-1',
    countryCode: 'IT',
    city: 'Rome',
    arrivalDate: '2024-06-01',
    departureDate: null,
    datePrecision: 'exact',
    approximatePeriod: null,
    approximateDurationDays: null,
    stayType: 'visited',
    visaNeeded: true,
    notes: null,
    createdAt: '',
    updatedAt: '',
    ...overrides,
  };
}

describe('lifeTimelineService', () => {
  it('builds home segment from birth through first trip abroad', () => {
    const segments = buildInferredHomeSegments(profile, [stay()], '2026-09-09');
    expect(segments[0]?.countryCode).toBe('UZ');
    expect(segments[0]?.fromDate).toBe('1990-01-15');
    expect(segments[0]?.toDate).toBe('2024-05-31');
  });

  it('shows whole life at home when no stays are recorded', () => {
    const segments = buildInferredHomeSegments(profile, [], '2026-09-09');
    expect(segments).toHaveLength(1);
    expect(segments[0]?.fromDate).toBe('1990-01-15');
    expect(segments[0]?.toLabel).toBe('Now');
  });

  it('adds home after an ended trip abroad', () => {
    const segments = buildInferredHomeSegments(
      profile,
      [stay({ countryCode: 'US', arrivalDate: '2025-10-15', departureDate: '2026-01-26' })],
      '2026-09-09',
    );
    expect(segments).toHaveLength(2);
    expect(segments[0]?.toDate).toBe('2025-10-14');
    expect(segments[1]?.fromDate).toBe('2026-01-27');
    expect(segments[1]?.toLabel).toBe('Now');
  });

  it('orders timeline from birth through recorded stays', () => {
    const timeline = buildLifeTimeline(profile, [stay({ id: 'it', arrivalDate: '2024-06-01' })], '2026-09-09');
    expect(timeline.length).toBeGreaterThanOrEqual(2);
    expect(timeline[0]?.kind).toBe('inferred_home');
    expect(timeline.some((entry) => entry.kind === 'recorded')).toBe(true);
  });

  it('uses primary nationality as home country', () => {
    const dualProfile: UserProfile = {
      ...profile,
      citizenships: ['TR', 'UZ'],
      primaryNationality: 'UZ',
    };
    const segments = buildInferredHomeSegments(dualProfile, [], '2026-09-09');
    expect(segments[0]?.countryCode).toBe('UZ');
  });

  it('marks current stay in recorded segments', () => {
    const segments = buildRecordedLifeSegments([stay({ departureDate: null })], '2026-09-09');
    expect(segments[0]?.isCurrent).toBe(true);
  });
});
