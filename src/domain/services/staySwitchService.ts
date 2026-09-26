import { format, subDays } from 'date-fns';

import { StayValidationError } from '@/domain/services/stayInputValidation';
import { ISO_DATE, parseIsoDate } from '@/domain/utils/dates';
import type { ExactStayInput, StayInput } from '@/domain/services/stayInputValidation';

/** Last day abroad before the next country stay begins (gaps after that = home). */
export function resolveBackdatedAbroadStayEnd(newArrivalDate: string, nextStayArrivalDate: string): string {
  const endDate = format(subDays(parseIsoDate(nextStayArrivalDate), 1), ISO_DATE);
  if (endDate < newArrivalDate) {
    throw new StayValidationError(
      'This trip must end before your next recorded stay starts. Adjust the arrival date or the other stay.',
    );
  }
  return endDate;
}

/** Backdated move abroad: close the new stay before the existing later stay; do not rewrite the later stay. */
export function buildBackdatedAbroadStayInput(input: StayInput, nextStayArrivalDate: string): StayInput {
  if (input.date.datePrecision !== 'exact') {
    return input;
  }

  const departureDate = resolveBackdatedAbroadStayEnd(input.date.arrivalDate, nextStayArrivalDate);

  return {
    ...input,
    date: {
      datePrecision: 'exact',
      arrivalDate: input.date.arrivalDate,
      departureDate,
      stillHere: false,
    } satisfies ExactStayInput,
  };
}
