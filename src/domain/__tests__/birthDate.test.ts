import {
  formatBirthDateDisplay,
  formatBirthDateInput,
  parseBirthDateInput,
  validateBirthDateInput,
} from '@/domain/utils/birthDate';

describe('birthDate utils', () => {
  it('formats typed digits as YYYY-MM-DD', () => {
    expect(formatBirthDateInput('1990')).toBe('1990');
    expect(formatBirthDateInput('19900115')).toBe('1990-01-15');
  });

  it('parses ISO input', () => {
    expect(parseBirthDateInput('1990-01-15')).toBe('1990-01-15');
    expect(parseBirthDateInput('19900115')).toBe('1990-01-15');
  });

  it('still accepts legacy DD/MM/YYYY', () => {
    expect(parseBirthDateInput('15/01/1990')).toBe('1990-01-15');
  });

  it('rejects invalid dates', () => {
    expect(parseBirthDateInput('31/02/1990')).toBeNull();
  });

  it('displays stored ISO unchanged', () => {
    expect(formatBirthDateDisplay('1990-01-15')).toBe('1990-01-15');
  });

  it('validates required input format', () => {
    expect(validateBirthDateInput('1990-01')).toBe('Enter your date of birth as YYYY-MM-DD.');
  });
});
