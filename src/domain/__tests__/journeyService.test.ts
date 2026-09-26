import {
  buildCountryBiographies,
  buildJourneySummary,
  buildJourneyTimelineGroups,
  filterJourneyGroups,
  formatHumanDuration,
  formatTimelineDateLabel,
} from '@/domain/services/journeyService';
import type { Stay } from '@/shared/types';

function exactStay(overrides: Partial<Stay> = {}): Stay {
  return {
    id: 'stay-1',
    countryCode: 'UZ',
    city: 'Tashkent',
    arrivalDate: '2026-08-21',
    departureDate: null,
    datePrecision: 'exact',
    approximatePeriod: null,
    approximateDurationDays: null,
    stayType: 'lived',
    visaNeeded: null,
    notes: null,
    createdAt: '2026-08-21',
    updatedAt: '2026-08-21',
    ...overrides,
  };
}

describe('journeyService', () => {
  it('builds a compact summary for rich journeys', () => {
    const stays = [
      exactStay({ id: '1', countryCode: 'UZ' }),
      exactStay({ id: '2', countryCode: 'TR', stayType: 'visited', city: 'Istanbul', arrivalDate: '2025-05-14', departureDate: '2025-05-28' }),
      exactStay({ id: '3', countryCode: 'DE', stayType: 'lived', city: 'Berlin', arrivalDate: '2023-03-01', departureDate: '2023-11-30' }),
    ];

    const summary = buildJourneySummary(stays);
    expect(summary.hasRichData).toBe(true);
    expect(summary.label).toContain('3 countries');
    expect(summary.label).toContain('2 lived in');
    expect(summary.label).toContain('3 stays');
  });

  it('uses a softer summary for early journeys', () => {
    const summary = buildJourneySummary([exactStay()]);
    expect(summary.hasRichData).toBe(false);
    expect(summary.label).toBe('Your journey so far');
  });

  it('formats timeline labels with present and human durations', () => {
    const stay = exactStay();
    expect(formatTimelineDateLabel(stay, '2026-09-08')).toBe('21 Aug — Present');
    expect(formatHumanDuration(18, false)).toBe('18 days');
    expect(formatHumanDuration(280, false)).toBe('~9 months');
  });

  it('filters timeline groups by stay type and year', () => {
    const stays = [
      exactStay({ id: '1' }),
      exactStay({
        id: '2',
        countryCode: 'TR',
        stayType: 'visited',
        arrivalDate: '2025-05-14',
        departureDate: '2025-05-28',
        city: 'Istanbul',
      }),
    ];
    const groups = buildJourneyTimelineGroups({
      stays,
      placeVisits: [],
      memories: [],
      notes: [],
      countryNames: new Map([
        ['UZ', 'Uzbekistan'],
        ['TR', 'Türkiye'],
      ]),
      today: '2026-09-08',
    });

    const filtered = filterJourneyGroups(groups, {
      stayTypes: ['visited'],
      year: 2025,
      month: null,
    });

    expect(filtered).toHaveLength(1);
    expect(filtered[0]?.year).toBe(2025);
    expect(filtered[0]?.items).toHaveLength(1);
    expect(filtered[0]?.items[0]?.countryName).toBe('Türkiye');
  });

  it('builds country biographies with chapters', () => {
    const biographies = buildCountryBiographies({
      stays: [
        exactStay({ id: '1', countryCode: 'DE', city: 'Berlin', stayType: 'lived', arrivalDate: '2018-01-01', departureDate: '2021-12-31' }),
        exactStay({ id: '2', countryCode: 'DE', city: 'Munich', stayType: 'visited', arrivalDate: '2024-05-01', departureDate: '2024-05-08' }),
      ],
      placeVisits: [],
      memories: [],
      notes: [],
      countries: [{ code: 'DE', name: 'Germany' }],
      today: '2026-09-08',
    });

    expect(biographies).toHaveLength(1);
    expect(biographies[0]?.countryName).toBe('Germany');
    expect(biographies[0]?.chapters).toHaveLength(2);
  });
});
