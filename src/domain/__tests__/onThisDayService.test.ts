import { buildOnThisDaySummary } from '@/domain/services/onThisDayService';
import type { MemoryRecord, Note, Stay } from '@/shared/types';

function exactStay(overrides: Partial<Stay> = {}): Stay {
  return {
    id: 'stay-1',
    countryCode: 'DE',
    city: 'Berlin',
    arrivalDate: '2023-09-01',
    departureDate: '2024-06-30',
    datePrecision: 'exact',
    approximatePeriod: null,
    approximateDurationDays: null,
    stayType: null,
    visaNeeded: null,
    notes: null,
    createdAt: '2023-09-01',
    updatedAt: '2023-09-01',
    ...overrides,
  };
}

const countryNames = new Map([
  ['DE', 'Germany'],
  ['CN', 'China'],
]);

describe('onThisDayService', () => {
  it('surfaces stay, memories, and notes from the same calendar day in past years', () => {
    const stays = [
      exactStay({ id: 'de', countryCode: 'DE', arrivalDate: '2023-09-01', departureDate: '2023-09-30' }),
    ];
    const memories: MemoryRecord[] = [
      {
        id: 'm1',
        stayId: 'de',
        placeVisitId: null,
        title: 'Office',
        caption: null,
        memoryDate: '2023-09-08',
        datePrecision: 'exact',
        approximatePeriod: null,
        createdAt: '',
        updatedAt: '',
      },
      {
        id: 'm2',
        stayId: 'de',
        placeVisitId: null,
        title: 'Lunch',
        caption: null,
        memoryDate: '2023-09-08',
        datePrecision: 'exact',
        approximatePeriod: null,
        createdAt: '',
        updatedAt: '',
      },
    ];
    const notes: Note[] = [
      {
        id: 'n1',
        stayId: 'de',
        placeVisitId: null,
        memoryRecordId: null,
        title: null,
        content: 'Started my new job.',
        noteDate: '2023-09-08',
        createdAt: '',
        updatedAt: '',
      },
    ];

    const summary = buildOnThisDaySummary({
      stays,
      memories,
      notes,
      countryNames,
      today: '2026-09-08',
    });

    expect(summary.todayLabel).toBe('8 September');
    expect(summary.moments).toHaveLength(1);
    expect(summary.moments[0]?.yearsAgo).toBe(3);
    expect(summary.moments[0]?.countryName).toBe('Germany');
    expect(summary.moments[0]?.headline).toBe('You were there.');
    expect(summary.moments[0]?.variant).toBe('there');
    expect(summary.moments[0]?.memoryCount).toBe(2);
    expect(summary.moments[0]?.notePreview).toBe('Started my new job.');
  });

  it('uses a living headline for lived stays', () => {
    const summary = buildOnThisDaySummary({
      stays: [
        exactStay({
          id: 'cn',
          countryCode: 'CN',
          stayType: 'lived',
          arrivalDate: '2018-01-01',
          departureDate: '2021-12-31',
        }),
      ],
      memories: [],
      notes: [],
      countryNames,
      today: '2026-09-08',
    });

    const moment = summary.moments.find((entry) => entry.yearsAgo === 7);

    expect(moment?.headline).toBe('7 years ago, you were living in China.');
    expect(moment?.variant).toBe('lived');
  });

  it('collapses many consecutive years in the same country into one row', () => {
    const summary = buildOnThisDaySummary({
      stays: [
        exactStay({
          id: 'cn',
          countryCode: 'CN',
          arrivalDate: '2010-01-01',
          departureDate: '2025-12-31',
        }),
      ],
      memories: [],
      notes: [],
      countryNames,
      today: '2026-09-26',
      maxMoments: 8,
    });

    expect(summary.moments.length).toBeLessThan(6);
    const collapsed = summary.moments.find((entry) => entry.countryCode === 'CN');
    expect(collapsed?.yearsAgoEnd).toBeDefined();
    expect(collapsed?.headline).toBe('You were there.');
  });

  it('returns an empty list when nothing matches today', () => {
    const summary = buildOnThisDaySummary({
      stays: [exactStay({ arrivalDate: '2024-01-01', departureDate: '2024-01-31' })],
      memories: [],
      notes: [],
      countryNames,
      today: '2026-09-08',
    });

    expect(summary.moments).toHaveLength(0);
  });
});
