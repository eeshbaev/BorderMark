import { validateStayInput } from '@/domain/services/stayInputValidation';
import { findOverlappingForeignStay } from '@/domain/services/stayValidation';
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

describe('stay overlap validation', () => {
  it('detects overlapping stays in different countries', () => {
    const china = exactStay({
      id: 'cn',
      countryCode: 'CN',
      arrivalDate: '2024-01-01',
      departureDate: '2024-06-30',
    });
    const candidate = {
      id: 'nl',
      countryCode: 'NL',
      arrivalDate: '2024-06-01',
      departureDate: '2024-08-01',
      datePrecision: 'exact' as const,
    };

    expect(findOverlappingForeignStay(candidate, [china])).toBe(china);
  });

  it('allows overlapping input to pass validation (reconciled on save)', () => {
    const existing = [
      exactStay({
        id: 'cn',
        countryCode: 'CN',
        arrivalDate: '2024-01-01',
        departureDate: '2024-06-30',
      }),
    ];

    expect(() =>
      validateStayInput(
        {
          countryCode: 'NL',
          stayType: 'visited',
          date: {
            datePrecision: 'exact',
            arrivalDate: '2024-06-01',
            departureDate: '2024-08-01',
            stillHere: false,
          },
        },
        '2026-09-01',
        existing,
      ),
    ).not.toThrow();
  });
});
