import {
  assertPersistedProfileEssentials,
  ProfileValidationError,
  validateProfileEssentialsForm,
} from '@/domain/services/profileValidation';

describe('profileValidation', () => {
  it('requires name, nationality, and complete birth date in forms', () => {
    expect(validateProfileEssentialsForm('', '12/01/1995', ['US'])).toMatch(/name/i);
    expect(validateProfileEssentialsForm('Erkin', '12/01/1995', [])).toMatch(/nationality/i);
    expect(validateProfileEssentialsForm('Erkin', '12/01', ['US'])).toMatch(/date of birth/i);
    expect(validateProfileEssentialsForm('Erkin', '12/01/1995', ['US'])).toBeNull();
  });

  it('blocks persisting incomplete profiles', () => {
    expect(() =>
      assertPersistedProfileEssentials({ name: null, birthDate: '1995-01-12', citizenships: ['US'] }),
    ).toThrow(ProfileValidationError);
  });
});
