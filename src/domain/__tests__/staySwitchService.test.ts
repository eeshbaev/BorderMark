import { buildBackdatedAbroadStayInput } from '@/domain/services/staySwitchService';
import type { StayInput } from '@/domain/services/stayInputValidation';

const baseInput: StayInput = {
  countryCode: 'US',
  city: 'New York',
  notes: null,
  stayType: 'visited',
  date: {
    datePrecision: 'exact',
    arrivalDate: '2026-03-26',
    departureDate: null,
    stillHere: true,
  },
};

describe('buildBackdatedAbroadStayInput', () => {
  it('closes the abroad stay the day before the next stay starts', () => {
    const result = buildBackdatedAbroadStayInput(baseInput, '2026-09-25');
    expect(result.date).toMatchObject({
      datePrecision: 'exact',
      arrivalDate: '2026-03-26',
      departureDate: '2026-09-24',
      stillHere: false,
    });
  });
});
