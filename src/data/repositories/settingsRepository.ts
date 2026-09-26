import { getDatabase } from '@/data/database/client';
import { assertPersistedProfileEssentials } from '@/domain/services/profileValidation';
import type { AppSettings, NotificationPreferences, UserProfile } from '@/shared/types';
import {
  normalizeCitizenships,
  parseCitizenships,
  serializeCitizenships,
} from '@/domain/services/citizenshipService';
import { nowIso } from '@/domain/utils/dates';

type SettingsRow = {
  id: string;
  appearance: AppSettings['appearance'];
  date_format: AppSettings['dateFormat'];
  default_country: string | null;
  notification_preferences: string;
  biometric_enabled: number;
  app_lock_enabled: number;
  onboarding_completed: number;
  created_at: string;
  updated_at: string;
};

type ProfileRow = {
  id: string;
  name: string | null;
  home_country: string | null;
  citizenships: string | null;
  birth_date: string | null;
  primary_nationality: string | null;
  photo_uri: string | null;
  created_at: string;
  updated_at: string;
};

function parseNotificationPreferences(raw: string): NotificationPreferences {
  const parsed = JSON.parse(raw) as Partial<NotificationPreferences>;
  return {
    documentExpiry: parsed.documentExpiry ?? true,
    ruleThresholds: parsed.ruleThresholds ?? true,
    reminders: parsed.reminders ?? true,
    stayMilestones: parsed.stayMilestones ?? true,
    stayReflection: parsed.stayReflection ?? true,
  };
}

function mapSettings(row: SettingsRow): AppSettings {
  return {
    id: row.id,
    appearance: row.appearance,
    dateFormat: row.date_format,
    defaultCountry: row.default_country,
    notificationPreferences: parseNotificationPreferences(row.notification_preferences),
    biometricEnabled: row.biometric_enabled === 1,
    appLockEnabled: row.app_lock_enabled === 1,
    onboardingCompleted: row.onboarding_completed === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapProfile(row: ProfileRow): UserProfile {
  const citizenships = normalizeCitizenships(parseCitizenships(row.citizenships), row.home_country);
  const primaryNationality =
    row.primary_nationality && citizenships.includes(row.primary_nationality)
      ? row.primary_nationality
      : citizenships[0] ?? null;

  return {
    id: row.id,
    name: row.name,
    homeCountry: citizenships[0] ?? row.home_country,
    citizenships,
    birthDate: row.birth_date,
    primaryNationality,
    photoUri: row.photo_uri,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function getAppSettings(): Promise<AppSettings> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<SettingsRow>('SELECT * FROM app_settings LIMIT 1');
  if (!row) {
    throw new Error('App settings not initialized');
  }
  return mapSettings(row);
}

export async function updateAppSettings(partial: Partial<AppSettings>): Promise<AppSettings> {
  const current = await getAppSettings();
  const next = { ...current, ...partial, updatedAt: nowIso() };
  const db = await getDatabase();
  await db.runAsync(
    `UPDATE app_settings SET
      appearance = ?,
      date_format = ?,
      default_country = ?,
      notification_preferences = ?,
      biometric_enabled = ?,
      app_lock_enabled = ?,
      onboarding_completed = ?,
      updated_at = ?
    WHERE id = ?`,
    [
      next.appearance,
      next.dateFormat,
      next.defaultCountry,
      JSON.stringify(next.notificationPreferences),
      next.biometricEnabled ? 1 : 0,
      next.appLockEnabled ? 1 : 0,
      next.onboardingCompleted ? 1 : 0,
      next.updatedAt,
      next.id,
    ],
  );
  return next;
}

export async function getUserProfile(): Promise<UserProfile> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<ProfileRow>('SELECT * FROM user_profile LIMIT 1');
  if (!row) {
    throw new Error('User profile not initialized');
  }
  return mapProfile(row);
}

export async function updateUserProfile(partial: Partial<UserProfile>): Promise<UserProfile> {
  const current = await getUserProfile();
  const nextCitizenships =
    partial.citizenships != null
      ? [...new Set(partial.citizenships.filter(Boolean))]
      : current.citizenships;
  const nextPrimaryNationality =
    partial.primaryNationality !== undefined
      ? partial.primaryNationality
      : nextCitizenships.includes(current.primaryNationality ?? '')
        ? current.primaryNationality
        : nextCitizenships[0] ?? null;

  const next: UserProfile = {
    id: current.id,
    name: partial.name !== undefined ? partial.name : current.name,
    photoUri: partial.photoUri !== undefined ? partial.photoUri : current.photoUri,
    citizenships: nextCitizenships,
    birthDate: partial.birthDate !== undefined ? partial.birthDate : current.birthDate,
    primaryNationality: nextPrimaryNationality,
    homeCountry: nextCitizenships[0] ?? current.homeCountry,
    createdAt: current.createdAt,
    updatedAt: nowIso(),
  };
  assertPersistedProfileEssentials(next);
  const db = await getDatabase();
  await db.runAsync(
    `UPDATE user_profile SET name = ?, home_country = ?, citizenships = ?, birth_date = ?, primary_nationality = ?, photo_uri = ?, updated_at = ? WHERE id = ?`,
    [
      next.name,
      next.homeCountry,
      serializeCitizenships(next.citizenships),
      next.birthDate,
      next.primaryNationality,
      next.photoUri,
      next.updatedAt,
      next.id,
    ],
  );
  return next;
}
