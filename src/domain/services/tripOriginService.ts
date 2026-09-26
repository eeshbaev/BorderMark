import { getCountryName } from '@/data/dataset/countries';
import { getPrimaryNationality } from '@/domain/services/nationalityHomeLogic';
import { format } from 'date-fns';

import { isValidIsoDate, parseIsoDate } from '@/domain/utils/dates';
import type { PreviousStayView, Stay, UserProfile } from '@/shared/types';

/**
 * BorderMark treats a stay's "To" date as returning home. A new abroad stay therefore
 * starts from the user's home nationality — not from the last visited country.
 */
export function buildHomeOriginForAbroadStay(
  current: Stay,
  profile: UserProfile | null,
): PreviousStayView | null {
  const homeCode = getPrimaryNationality(profile);
  if (!homeCode || current.countryCode === homeCode) {
    return null;
  }
  if (current.datePrecision !== 'exact' || !isValidIsoDate(current.arrivalDate)) {
    return null;
  }

  const leftLabel = `left ${format(parseIsoDate(current.arrivalDate), 'd MMM').toUpperCase()}`;

  return {
    countryName: getCountryName(homeCode),
    leftLabel,
    stay: {
      id: `home-origin-${homeCode}`,
      countryCode: homeCode,
      city: null,
      arrivalDate: null,
      departureDate: null,
      datePrecision: 'exact',
      approximatePeriod: null,
      approximateDurationDays: null,
      stayType: null,
      visaNeeded: null,
      notes: null,
      createdAt: current.createdAt,
      updatedAt: current.updatedAt,
    },
  };
}
