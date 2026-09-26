import { isValidIsoDate } from '@/domain/utils/dates';

const ISO_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const LEGACY_DMY_PATTERN = /^(\d{2})\/(\d{2})\/(\d{4})$/;

/** Formats typed digits as YYYY-MM-DD (max 8 digits). */
export function formatIsoDateInput(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 4) {
    return digits;
  }
  if (digits.length <= 6) {
    return `${digits.slice(0, 4)}-${digits.slice(4)}`;
  }
  return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6)}`;
}

function toValidIso(year: number, month: number, day: number): string | null {
  if (month < 1 || month > 12 || day < 1 || day > 31 || year < 1900 || year > 9999) {
    return null;
  }

  const iso = `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  const parsed = new Date(`${iso}T12:00:00.000Z`);
  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() + 1 !== month ||
    parsed.getUTCDate() !== day
  ) {
    return null;
  }

  return isValidIsoDate(iso) ? iso : null;
}

/** Parse user input into ISO YYYY-MM-DD. Returns null if invalid or empty. */
export function parseIsoDateInput(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  if (ISO_PATTERN.test(trimmed) && isValidIsoDate(trimmed)) {
    return trimmed;
  }

  const legacyMatch = LEGACY_DMY_PATTERN.exec(trimmed);
  if (legacyMatch) {
    return toValidIso(
      Number.parseInt(legacyMatch[3]!, 10),
      Number.parseInt(legacyMatch[2]!, 10),
      Number.parseInt(legacyMatch[1]!, 10),
    );
  }

  const formatted = formatIsoDateInput(trimmed);
  const isoMatch = ISO_PATTERN.exec(formatted);
  if (isoMatch) {
    return toValidIso(
      Number.parseInt(isoMatch[1]!, 10),
      Number.parseInt(isoMatch[2]!, 10),
      Number.parseInt(isoMatch[3]!, 10),
    );
  }

  const digits = value.replace(/\D/g, '');
  if (digits.length === 8) {
    const yearLeading = Number.parseInt(digits.slice(0, 4), 10);
    if (yearLeading >= 1900 && yearLeading <= 2100) {
      const ymd = toValidIso(
        yearLeading,
        Number.parseInt(digits.slice(4, 6), 10),
        Number.parseInt(digits.slice(6, 8), 10),
      );
      if (ymd) {
        return ymd;
      }
    }

    return toValidIso(
      Number.parseInt(digits.slice(4, 8), 10),
      Number.parseInt(digits.slice(2, 4), 10),
      Number.parseInt(digits.slice(0, 2), 10),
    );
  }

  return null;
}

/** Normalize display value to YYYY-MM-DD when complete; otherwise keep formatted partial input. */
export function normalizeIsoDateInput(value: string): string {
  const parsed = parseIsoDateInput(value);
  if (parsed) {
    return parsed;
  }
  return formatIsoDateInput(value);
}

/** Display stored ISO dates consistently as YYYY-MM-DD. */
export function formatIsoDateDisplay(isoDate: string): string {
  if (ISO_PATTERN.test(isoDate) && isValidIsoDate(isoDate)) {
    return isoDate;
  }
  const parsed = parseIsoDateInput(isoDate);
  return parsed ?? isoDate;
}

export function validateOptionalIsoDateInput(value: string): string | null {
  if (!value.trim()) {
    return null;
  }
  return parseIsoDateInput(value) ? null : 'Enter the date as YYYY-MM-DD.';
}

export function validateRequiredIsoDateInput(value: string): string | null {
  if (!value.trim()) {
    return 'Enter the date as YYYY-MM-DD.';
  }
  return parseIsoDateInput(value) ? null : 'Enter the date as YYYY-MM-DD.';
}

export function validateDocumentIssueAndExpiryDates(issueDate: string, expiryDate: string): string | null {
  const issueError = validateRequiredIsoDateInput(issueDate);
  if (issueError) {
    return 'Enter the issue date (YYYY-MM-DD).';
  }
  const expiryError = validateRequiredIsoDateInput(expiryDate);
  if (expiryError) {
    return 'Enter the expiry date (YYYY-MM-DD).';
  }
  const issue = parseIsoDateInput(issueDate)!;
  const expiry = parseIsoDateInput(expiryDate)!;
  if (issue > expiry) {
    return 'Issue date must be on or before expiry date.';
  }
  return null;
}
