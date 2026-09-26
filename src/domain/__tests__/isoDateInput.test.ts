import {
  formatIsoDateInput,
  normalizeIsoDateInput,
  parseIsoDateInput,
  validateDocumentIssueAndExpiryDates,
  validateOptionalIsoDateInput,
} from '@/domain/utils/isoDateInput';

describe('isoDateInput', () => {
  it('formats digits as YYYY-MM-DD while typing', () => {
    expect(formatIsoDateInput('2026')).toBe('2026');
    expect(formatIsoDateInput('202612')).toBe('2026-12');
    expect(formatIsoDateInput('20261212')).toBe('2026-12-12');
  });

  it('parses compact YYYYMMDD', () => {
    expect(parseIsoDateInput('20261212')).toBe('2026-12-12');
  });

  it('parses dashed ISO input', () => {
    expect(parseIsoDateInput('1990-01-15')).toBe('1990-01-15');
  });

  it('normalizes compact input on blur-style normalize', () => {
    expect(normalizeIsoDateInput('20261212')).toBe('2026-12-12');
  });

  it('rejects invalid calendar dates', () => {
    expect(parseIsoDateInput('2026-02-31')).toBeNull();
  });

  it('allows empty optional dates', () => {
    expect(validateOptionalIsoDateInput('')).toBeNull();
    expect(validateOptionalIsoDateInput('20261212')).toBeNull();
    expect(validateOptionalIsoDateInput('not-a-date')).toBe('Enter the date as YYYY-MM-DD.');
  });

  it('requires both document issue and expiry dates', () => {
    expect(validateDocumentIssueAndExpiryDates('', '')).toBe(
      'Enter the issue date (YYYY-MM-DD).',
    );
    expect(validateDocumentIssueAndExpiryDates('2026-01-01', '')).toBe(
      'Enter the expiry date (YYYY-MM-DD).',
    );
    expect(validateDocumentIssueAndExpiryDates('2026-12-01', '2026-01-01')).toBe(
      'Issue date must be on or before expiry date.',
    );
    expect(validateDocumentIssueAndExpiryDates('2026-01-01', '2026-12-01')).toBeNull();
  });
});
