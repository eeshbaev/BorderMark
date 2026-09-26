import { validateBirthDateInput } from '@/domain/utils/birthDate';
import { isValidIsoDate } from '@/domain/utils/dates';
import type { UserProfile } from '@/shared/types';

export class ProfileValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ProfileValidationError';
  }
}

/** Validates profile form fields before onboarding or settings save. */
export function validateProfileEssentialsForm(
  name: string,
  birthDateInput: string,
  citizenships: string[],
): string | null {
  if (!name.trim()) {
    return 'Enter your name to continue.';
  }
  if (citizenships.length === 0) {
    return 'Choose at least one nationality to continue.';
  }
  return validateBirthDateInput(birthDateInput);
}

/** Ensures persisted profile always has name, birth date, and nationality. */
export function assertPersistedProfileEssentials(profile: Pick<UserProfile, 'name' | 'birthDate' | 'citizenships'>): void {
  if (!profile.name?.trim()) {
    throw new ProfileValidationError('Name is required.');
  }
  if (profile.citizenships.length === 0) {
    throw new ProfileValidationError('At least one nationality is required.');
  }
  if (!profile.birthDate || !isValidIsoDate(profile.birthDate)) {
    throw new ProfileValidationError('A valid date of birth is required.');
  }
}
