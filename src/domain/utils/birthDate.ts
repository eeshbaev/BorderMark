import {
  formatIsoDateDisplay,
  formatIsoDateInput,
  parseIsoDateInput,
  validateRequiredIsoDateInput,
} from '@/domain/utils/isoDateInput';

export { formatIsoDateInput as formatBirthDateInput };
export { parseIsoDateInput as parseBirthDateInput };
export { formatIsoDateDisplay as formatBirthDateDisplay };

export function validateBirthDateInput(value: string): string | null {
  const required = validateRequiredIsoDateInput(value);
  if (required) {
    return 'Enter your date of birth as YYYY-MM-DD.';
  }
  const parsed = parseIsoDateInput(value)!;
  if (parsed > new Date().toISOString().slice(0, 10)) {
    return 'Date of birth cannot be in the future.';
  }
  return null;
}
