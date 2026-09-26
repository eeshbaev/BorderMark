import { getCountryName } from '@/data/dataset/countries';
import type { Stay, UserProfile } from '@/shared/types';

export function getPrimaryNationality(profile: UserProfile | null): string | null {
  if (!profile?.citizenships.length) {
    return null;
  }
  return profile.primaryNationality ?? profile.citizenships[0] ?? null;
}

export function isNationalityCountry(countryCode: string, profile: UserProfile | null): boolean {
  return profile?.citizenships.includes(countryCode) ?? false;
}

export function isAbroad(currentStay: Stay | null, profile: UserProfile | null): boolean {
  if (!currentStay || !profile?.citizenships.length) {
    return false;
  }
  return !profile.citizenships.includes(currentStay.countryCode);
}

export function isInNationalityCountry(currentStay: Stay | null, profile: UserProfile | null): boolean {
  if (!currentStay || !profile) {
    return false;
  }
  return profile.citizenships.includes(currentStay.countryCode);
}

export function shouldShowCurrentTripCard(
  currentStay: Stay | null,
  profile: UserProfile | null,
  selectedNationality: string | null,
): boolean {
  if (!currentStay || !profile) {
    return false;
  }
  if (!isAbroad(currentStay, profile)) {
    return false;
  }
  return currentStay.countryCode !== selectedNationality;
}

export function shouldAskVisaQuestion(countryCode: string, nationalities: string[]): boolean {
  return !nationalities.includes(countryCode);
}

export function shouldSwitchNationalityStay(
  currentStay: Stay | null,
  profile: UserProfile | null,
  nextNationalityCode: string,
): boolean {
  if (!currentStay || !profile) {
    return false;
  }
  if (!profile.citizenships.includes(nextNationalityCode)) {
    return false;
  }
  if (!isInNationalityCountry(currentStay, profile)) {
    return false;
  }
  return currentStay.countryCode !== nextNationalityCode;
}

export function nationalityHomeLabel(countryCode: string): string {
  return getCountryName(countryCode);
}
