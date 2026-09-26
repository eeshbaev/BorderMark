import { addCityToCurrentStay, switchCurrentStayFromInput } from '@/data/repositories/stayRepository';
import { mapStayToExactInput } from '@/domain/services/stayMapper';
import { todayIso } from '@/domain/utils/dates';
import type { Stay } from '@/shared/types';

export {
  getPrimaryNationality,
  isAbroad,
  isInNationalityCountry,
  isNationalityCountry,
  nationalityHomeLabel,
  shouldAskVisaQuestion,
  shouldShowCurrentTripCard,
  shouldSwitchNationalityStay,
} from '@/domain/services/nationalityHomeLogic';

function buildNationalityStayInput(
  nationalityCode: string,
  today: string,
  options?: { city?: string | null; arrivalDate?: string },
) {
  return {
    countryCode: nationalityCode,
    city: options?.city?.trim() || null,
    notes: null,
    stayType: 'lived' as const,
    visaNeeded: null,
    date: {
      datePrecision: 'exact' as const,
      arrivalDate: options?.arrivalDate ?? today,
      departureDate: null,
      stillHere: true,
    },
  };
}

export async function returnToNationality(
  nationalityCode: string,
  today: string = todayIso(),
): Promise<Stay> {
  return switchCurrentStayFromInput(buildNationalityStayInput(nationalityCode, today), today);
}

export async function switchToNationality(
  nationalityCode: string,
  today: string = todayIso(),
  options?: { city?: string | null; arrivalDate?: string },
): Promise<Stay> {
  return switchCurrentStayFromInput(buildNationalityStayInput(nationalityCode, today, options), today);
}

export async function updateNationalityCity(stay: Stay, city: string, today: string): Promise<Stay> {
  const exactDate = mapStayToExactInput(stay);
  if (exactDate.datePrecision !== 'exact') {
    throw new Error('Only exact stays support city updates from the nationality card.');
  }

  return addCityToCurrentStay(
    {
      countryCode: stay.countryCode,
      city,
      notes: stay.notes,
      stayType: stay.stayType ?? 'lived',
      visaNeeded: stay.visaNeeded,
      date: exactDate,
    },
    today,
  );
}
