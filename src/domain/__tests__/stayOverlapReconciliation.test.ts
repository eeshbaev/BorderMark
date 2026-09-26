import { planForeignStayReconciliation } from '@/domain/services/stayOverlapReconciliation';
import type { Stay } from '@/shared/types';

function exactStay(overrides: Partial<Stay> & Pick<Stay, 'id' | 'countryCode' | 'arrivalDate'>): Stay {
  return {
    departureDate: null,
    datePrecision: 'exact',
    approximatePeriod: null,
    approximateDurationDays: null,
    stayType: 'visited',
    visaNeeded: null,
    city: null,
    notes: null,
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
    ...overrides,
  };
}

describe('planForeignStayReconciliation', () => {
  it('trims the overlapping tail of an earlier stay', () => {
    const china = exactStay({
      id: 'cn',
      countryCode: 'CN',
      arrivalDate: '2024-01-01',
      departureDate: '2024-06-30',
    });
    const us = exactStay({
      id: 'us',
      countryCode: 'US',
      arrivalDate: '2024-06-01',
      departureDate: '2024-08-01',
    });

    const actions = planForeignStayReconciliation(us, [china]);
    expect(actions).toEqual([
      {
        type: 'update',
        stay: expect.objectContaining({
          id: 'cn',
          arrivalDate: '2024-01-01',
          departureDate: '2024-05-31',
        }),
      },
    ]);
  });

  it('deletes a foreign stay fully covered by the new stay', () => {
    const uz = exactStay({
      id: 'uz',
      countryCode: 'UZ',
      arrivalDate: '2026-09-24',
      departureDate: '2026-09-24',
    });
    const us = exactStay({
      id: 'us',
      countryCode: 'US',
      arrivalDate: '2026-05-22',
      departureDate: '2026-09-30',
    });

    expect(planForeignStayReconciliation(us, [uz])).toEqual([{ type: 'delete', stayId: 'uz' }]);
  });
});
