import { getDatabase } from '@/data/database/client';
import { nowIso } from '@/domain/utils/dates';

export async function getCountryVisaPreference(countryCode: string): Promise<boolean | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ needs_visa: number }>(
    'SELECT needs_visa FROM country_visa_preferences WHERE country_code = ?',
    [countryCode.toUpperCase()],
  );
  if (!row) {
    return null;
  }
  return row.needs_visa === 1;
}

export async function setCountryVisaPreference(countryCode: string, needsVisa: boolean): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `INSERT INTO country_visa_preferences (country_code, needs_visa, updated_at)
     VALUES (?, ?, ?)
     ON CONFLICT(country_code) DO UPDATE SET needs_visa = excluded.needs_visa, updated_at = excluded.updated_at`,
    [countryCode.toUpperCase(), needsVisa ? 1 : 0, nowIso()],
  );
}

export async function listCountryVisaPreferences(): Promise<Record<string, boolean>> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<{ country_code: string; needs_visa: number }>(
    'SELECT country_code, needs_visa FROM country_visa_preferences',
  );
  return Object.fromEntries(rows.map((row) => [row.country_code, row.needs_visa === 1]));
}
