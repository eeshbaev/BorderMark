import {
  buildCountryChapter,
  buildPlacesByContinent,
  computeRecordedDaysBreakdown,
  formatRecordedDaysLabel,
} from '@/domain/services/countryChapterService';
import { buildStayTimelinePresentation } from '@/domain/services/stayPresentation';
import type { CountryRecord, Document, MemoryRecord, Note, PlaceVisit, Stay } from '@/shared/types';

const countries: CountryRecord[] = [
  { code: 'GE', name: 'Georgia', continent: 'Asia', schengen: false },
  { code: 'TR', name: 'Türkiye', continent: 'Europe', schengen: false },
  { code: 'UZ', name: 'Uzbekistan', continent: 'Asia', schengen: false },
];

function exactStay(overrides: Partial<Stay> = {}): Stay {
  return {
    id: overrides.id ?? 'stay-exact',
    countryCode: 'GE',
    city: null,
    arrivalDate: '2024-02-15',
    departureDate: '2024-03-03',
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

function approximateStay(overrides: Partial<Stay> = {}): Stay {
  return {
    id: overrides.id ?? 'stay-approx',
    countryCode: 'GE',
    city: null,
    arrivalDate: null,
    departureDate: null,
    datePrecision: 'month',
    approximatePeriod: '2023-06',
    approximateDurationDays: 12,
    stayType: null,
    visaNeeded: null,
    notes: null,
    createdAt: '',
    updatedAt: '',
    ...overrides,
  };
}

describe('country aggregation', () => {
  it('aggregates multiple stays in one country', () => {
    const stays = [
      exactStay({ id: 'a' }),
      approximateStay({ id: 'b' }),
      exactStay({ id: 'c', countryCode: 'TR', arrivalDate: '2022-01-01', departureDate: '2022-01-10' }),
    ];

    const chapter = buildCountryChapter({
      countryCode: 'GE',
      stays,
      placeVisits: [],
      memories: [],
      notes: [],
      documents: [],
      countries,
      today: '2026-09-08',
    });

    expect(chapter?.stayCount).toBe(2);
    expect(chapter?.recordedDays.exactDays).toBe(18);
    expect(chapter?.recordedDays.approximateDays).toBe(12);
  });

  it('does not combine exact and approximate into one falsely precise total', () => {
    const breakdown = computeRecordedDaysBreakdown(
      [exactStay(), approximateStay()],
      '2026-09-08',
    );
    expect(formatRecordedDaysLabel(breakdown)).toBe('18 exact days\n+ ~12 approximate days');
    expect(formatRecordedDaysLabel(breakdown, true)).toBe('18 exact + ~12 approx');
  });

  it('orders countries by continent then name', () => {
    const groups = buildPlacesByContinent({
      stays: [
        exactStay({ countryCode: 'TR' }),
        exactStay({ countryCode: 'UZ' }),
        exactStay({ countryCode: 'GE' }),
      ],
      countries,
      today: '2026-09-08',
    });

    expect(groups.map((group) => group.continent)).toEqual(['Asia', 'Europe']);
    expect(groups[0].countries.map((country) => country.countryCode)).toEqual(['GE', 'UZ']);
    expect(groups[1].countries.map((country) => country.countryCode)).toEqual(['TR']);
  });

  it('detects current country', () => {
    const chapter = buildCountryChapter({
      countryCode: 'GE',
      stays: [exactStay({ departureDate: null, arrivalDate: '2026-08-01' })],
      placeVisits: [],
      memories: [],
      notes: [],
      documents: [],
      countries,
      today: '2026-09-08',
    });

    expect(chapter?.isCurrentCountry).toBe(true);
  });

  it('shows first and last recorded periods without fabricated exact dates', () => {
    const chapter = buildCountryChapter({
      countryCode: 'GE',
      stays: [approximateStay({ id: 'old' }), exactStay({ id: 'new', arrivalDate: '2024-02-15', departureDate: '2024-03-03' })],
      placeVisits: [],
      memories: [],
      notes: [],
      documents: [],
      countries,
      today: '2026-09-08',
    });

    expect(chapter?.firstRecordedHeading).toBe('First recorded period');
    expect(chapter?.firstRecordedLabel).toBe('June 2023 · Approximate');
    expect(chapter?.lastRecordedHeading).toBe('Most recent visit');
    expect(chapter?.lastRecordedLabel).toBe('15 Feb 2024');
    expect(chapter?.firstRecordedLabel).not.toMatch(/15 Jun|26 Jun/);
  });
});

describe('places grouping', () => {
  it('groups place visits by city within a country via stay relationship', () => {
    const stays = [exactStay({ id: 'stay-1' })];
    const placeVisits: PlaceVisit[] = [
      {
        id: 'p1',
        stayId: 'stay-1',
        name: 'Tbilisi',
        visitDate: '2024-02-16',
        datePrecision: 'exact',
        approximatePeriod: null,
        notes: null,
        createdAt: '',
        updatedAt: '',
      },
      {
        id: 'p2',
        stayId: 'stay-1',
        name: 'Tbilisi',
        visitDate: '2024-02-20',
        datePrecision: 'exact',
        approximatePeriod: null,
        notes: null,
        createdAt: '',
        updatedAt: '',
      },
      {
        id: 'p3',
        stayId: 'stay-1',
        name: 'Batumi',
        visitDate: '2024-02-25',
        datePrecision: 'exact',
        approximatePeriod: null,
        notes: null,
        createdAt: '',
        updatedAt: '',
      },
    ];

    const chapter = buildCountryChapter({
      countryCode: 'GE',
      stays,
      placeVisits,
      memories: [],
      notes: [],
      documents: [],
      countries,
      today: '2026-09-08',
    });

    expect(chapter?.places).toEqual([
      { name: 'Batumi', visitCount: 1, mostRecentLabel: '25 Feb 2024' },
      { name: 'Tbilisi', visitCount: 2, mostRecentLabel: '20 Feb 2024' },
    ]);
  });

  it('does not infer cities without recorded place visits', () => {
    const chapter = buildCountryChapter({
      countryCode: 'GE',
      stays: [exactStay({ city: 'Tbilisi' })],
      placeVisits: [],
      memories: [],
      notes: [],
      documents: [],
      countries,
      today: '2026-09-08',
    });

    expect(chapter?.places).toEqual([]);
  });
});

describe('memories notes documents', () => {
  it('filters memories and notes by country through stay relationship', () => {
    const stays = [exactStay({ id: 'ge' }), exactStay({ id: 'tr', countryCode: 'TR' })];
    const memories: MemoryRecord[] = [
      {
        id: 'm1',
        stayId: 'ge',
        placeVisitId: null,
        title: 'First day in Tbilisi',
        caption: null,
        memoryDate: '2024-02-18',
        datePrecision: 'exact',
        approximatePeriod: null,
        createdAt: '',
        updatedAt: '',
      },
    ];
    const notes: Note[] = [
      {
        id: 'n1',
        stayId: 'ge',
        placeVisitId: null,
        memoryRecordId: null,
        title: 'Apartment code',
        content: '1234',
        noteDate: '2024-02-16',
        createdAt: '',
        updatedAt: '',
      },
    ];

    const chapter = buildCountryChapter({
      countryCode: 'GE',
      stays,
      placeVisits: [],
      memories,
      notes,
      documents: [],
      countries,
      today: '2026-09-08',
    });

    expect(chapter?.memoryCount).toBe(1);
    expect(chapter?.noteCount).toBe(1);
    expect(chapter?.memories[0].title).toBe('First day in Tbilisi');
  });

  it('shows only documents associated with the country', () => {
    const documents: Document[] = [
      {
        id: 'd1',
        title: 'Residence permit',
        documentType: 'residence_permit',
        issueDate: null,
        expiryDate: '2028-05-14',
        issuingCountry: 'GE',
        documentNumber: null,
        notes: null,
        createdAt: '',
        updatedAt: '',
      },
      {
        id: 'd2',
        title: 'Passport',
        documentType: 'passport',
        issueDate: null,
        expiryDate: '2028-05-14',
        issuingCountry: 'UZ',
        documentNumber: null,
        notes: null,
        createdAt: '',
        updatedAt: '',
      },
      {
        id: 'd3',
        title: 'Unassigned',
        documentType: 'other',
        issueDate: null,
        expiryDate: null,
        issuingCountry: null,
        documentNumber: null,
        notes: null,
        createdAt: '',
        updatedAt: '',
      },
    ];

    const chapter = buildCountryChapter({
      countryCode: 'GE',
      stays: [exactStay()],
      placeVisits: [],
      memories: [],
      notes: [],
      documents,
      countries,
      today: '2026-09-08',
    });

    expect(chapter?.documents.map((document) => document.id)).toEqual(['d1']);
  });
});

describe('approximate presentation in country chapter', () => {
  it('keeps approximate stays approximate in timeline labels', () => {
    const timeline = buildStayTimelinePresentation(approximateStay(), '2026-09-08');
    expect(timeline.isApproximate).toBe(true);
    expect(timeline.dateLabel).toBe('June 2023 · ~12 days');
    expect(timeline.dateLabel).not.toMatch(/\d{1,2} Jun → \d{1,2} Jun/);
  });
});
