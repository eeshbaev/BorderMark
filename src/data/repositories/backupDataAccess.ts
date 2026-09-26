import { getDatabase } from '@/data/database/client';
import type {
  AppSettings,
  Attachment,
  BackupDataset,
  CountryVisaPreference,
  Document,
  MemoryRecord,
  Note,
  PlaceVisit,
  Reminder,
  Rule,
  Stay,
  UserProfile,
} from '@/shared/types';
import { DATABASE_SCHEMA_VERSION } from '@/data/database/schema';
import { nowIso } from '@/domain/utils/dates';

export async function exportCurrentDataset(): Promise<BackupDataset> {
  const db = await getDatabase();
  return {
    schemaVersion: DATABASE_SCHEMA_VERSION,
    exportedAt: nowIso(),
    userProfile: (await db.getAllAsync('SELECT * FROM user_profile') as Record<string, unknown>[]).map(mapUserProfile),
    appSettings: (await db.getAllAsync('SELECT * FROM app_settings') as Record<string, unknown>[]).map(mapAppSettings),
    stays: (await db.getAllAsync('SELECT * FROM stays') as Record<string, unknown>[]).map(mapStay),
    placeVisits: (await db.getAllAsync('SELECT * FROM place_visits') as Record<string, unknown>[]).map(mapPlaceVisit),
    memoryRecords: (await db.getAllAsync('SELECT * FROM memory_records') as Record<string, unknown>[]).map(mapMemoryRecord),
    notes: (await db.getAllAsync('SELECT * FROM notes') as Record<string, unknown>[]).map(mapNote),
    documents: (await db.getAllAsync('SELECT * FROM documents') as Record<string, unknown>[]).map(mapDocument),
    attachments: (await db.getAllAsync('SELECT * FROM attachments') as Record<string, unknown>[]).map(mapAttachment),
    rules: (await db.getAllAsync('SELECT * FROM rules') as Record<string, unknown>[]).map(mapRule),
    reminders: (await db.getAllAsync('SELECT * FROM reminders') as Record<string, unknown>[]).map(mapReminder),
    countryVisaPreferences: (
      await db.getAllAsync('SELECT * FROM country_visa_preferences') as Record<string, unknown>[]
    ).map(mapCountryVisaPreference),
  };
}

export async function replaceDataset(dataset: BackupDataset): Promise<void> {
  const db = await getDatabase();
  await db.execAsync('BEGIN IMMEDIATE TRANSACTION');
  try {
    await db.execAsync('DELETE FROM reminders');
    await db.execAsync('DELETE FROM attachments');
    await db.execAsync('DELETE FROM notes');
    await db.execAsync('DELETE FROM memory_records');
    await db.execAsync('DELETE FROM place_visits');
    await db.execAsync('DELETE FROM documents');
    await db.execAsync('DELETE FROM stays');
    await db.execAsync('DELETE FROM rules');
    await db.execAsync('DELETE FROM country_visa_preferences');
    await db.execAsync('DELETE FROM app_settings');
    await db.execAsync('DELETE FROM user_profile');

    await insertDataset(db, dataset);
    await db.execAsync('COMMIT');
  } catch (error) {
    await db.execAsync('ROLLBACK');
    throw error;
  }
}

export async function upsertDataset(dataset: BackupDataset): Promise<void> {
  const db = await getDatabase();
  await db.execAsync('BEGIN IMMEDIATE TRANSACTION');
  try {
    await insertDataset(db, dataset);
    await db.execAsync('COMMIT');
  } catch (error) {
    await db.execAsync('ROLLBACK');
    throw error;
  }
}

async function insertDataset(db: Awaited<ReturnType<typeof getDatabase>>, dataset: BackupDataset): Promise<void> {
  for (const profile of dataset.userProfile) {
    await db.runAsync(
      'INSERT OR REPLACE INTO user_profile (id, name, home_country, citizenships, birth_date, primary_nationality, photo_uri, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        profile.id,
        profile.name,
        profile.homeCountry,
        JSON.stringify(profile.citizenships ?? (profile.homeCountry ? [profile.homeCountry] : [])),
        profile.birthDate ?? null,
        profile.primaryNationality ?? profile.citizenships[0] ?? null,
        profile.photoUri,
        profile.createdAt,
        profile.updatedAt,
      ],
    );
  }
  for (const settings of dataset.appSettings) {
    await db.runAsync(
      `INSERT OR REPLACE INTO app_settings (
        id, appearance, date_format, default_country, notification_preferences,
        biometric_enabled, app_lock_enabled, onboarding_completed, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        settings.id,
        settings.appearance,
        settings.dateFormat,
        settings.defaultCountry,
        JSON.stringify(settings.notificationPreferences),
        settings.biometricEnabled ? 1 : 0,
        settings.appLockEnabled ? 1 : 0,
        settings.onboardingCompleted ? 1 : 0,
        settings.createdAt,
        settings.updatedAt,
      ],
    );
  }
  for (const stay of dataset.stays) {
    await db.runAsync(
      `INSERT OR REPLACE INTO stays (
        id, country_code, city, arrival_date, departure_date, date_precision,
        approximate_period, approximate_duration_days, stay_type, visa_needed, visa_document_id, notes, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        stay.id, stay.countryCode, stay.city, stay.arrivalDate, stay.departureDate,
        stay.datePrecision, stay.approximatePeriod, stay.approximateDurationDays, stay.stayType,
        stay.visaNeeded == null ? null : stay.visaNeeded ? 1 : 0,
        stay.visaDocumentId ?? null,
        stay.notes, stay.createdAt, stay.updatedAt,
      ],
    );
  }
  for (const place of dataset.placeVisits) {
    await db.runAsync(
      `INSERT OR REPLACE INTO place_visits (
        id, stay_id, name, visit_date, date_precision, approximate_period, notes, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        place.id, place.stayId, place.name, place.visitDate, place.datePrecision,
        place.approximatePeriod, place.notes, place.createdAt, place.updatedAt,
      ],
    );
  }
  for (const memory of dataset.memoryRecords) {
    await db.runAsync(
      `INSERT OR REPLACE INTO memory_records (
        id, stay_id, place_visit_id, title, caption, memory_date, date_precision, approximate_period, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        memory.id, memory.stayId, memory.placeVisitId, memory.title, memory.caption,
        memory.memoryDate, memory.datePrecision, memory.approximatePeriod, memory.createdAt, memory.updatedAt,
      ],
    );
  }
  for (const note of dataset.notes) {
    await db.runAsync(
      `INSERT OR REPLACE INTO notes (
        id, stay_id, place_visit_id, memory_record_id, title, content, note_date, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        note.id, note.stayId, note.placeVisitId, note.memoryRecordId, note.title,
        note.content, note.noteDate, note.createdAt, note.updatedAt,
      ],
    );
  }
  for (const document of dataset.documents) {
    await db.runAsync(
      `INSERT OR REPLACE INTO documents (
        id, title, document_type, issue_date, expiry_date, issuing_country, document_number, notes,
        linked_stay_id, max_stay_days, max_entries, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        document.id, document.title, document.documentType, document.issueDate, document.expiryDate,
        document.issuingCountry, document.documentNumber, document.notes,
        document.linkedStayId ?? null,
        document.maxStayDays ?? null,
        document.maxEntries ?? null,
        document.createdAt, document.updatedAt,
      ],
    );
  }
  for (const attachment of dataset.attachments) {
    await db.runAsync(
      `INSERT OR REPLACE INTO attachments (
        id, file_name, mime_type, file_size, sha256, local_path, owner_type, owner_id, category, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        attachment.id, attachment.fileName, attachment.mimeType, attachment.fileSize, attachment.sha256,
        attachment.localPath, attachment.ownerType, attachment.ownerId, attachment.category, attachment.createdAt,
        attachment.updatedAt,
      ],
    );
  }
  for (const rule of dataset.rules) {
    await db.runAsync(
      `INSERT OR REPLACE INTO rules (
        id, rule_type, name, enabled, applicable_countries, threshold, lookback_days, config, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        rule.id, rule.ruleType, rule.name, rule.enabled ? 1 : 0,
        rule.applicableCountries ? JSON.stringify(rule.applicableCountries) : null,
        rule.threshold, rule.lookbackDays, rule.config ? JSON.stringify(rule.config) : null,
        rule.createdAt, rule.updatedAt,
      ],
    );
  }
  for (const preference of dataset.countryVisaPreferences ?? []) {
    await db.runAsync(
      `INSERT OR REPLACE INTO country_visa_preferences (country_code, needs_visa, updated_at)
       VALUES (?, ?, ?)`,
      [preference.countryCode, preference.needsVisa ? 1 : 0, preference.updatedAt],
    );
  }
  for (const reminder of dataset.reminders) {
    await db.runAsync(
      `INSERT OR REPLACE INTO reminders (
        id, title, message, reminder_type, trigger_date, annual_month, annual_day, linked_document_id, enabled, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        reminder.id, reminder.title, reminder.message, reminder.reminderType, reminder.triggerDate,
        reminder.annualMonth, reminder.annualDay, reminder.linkedDocumentId, reminder.enabled ? 1 : 0,
        reminder.createdAt, reminder.updatedAt,
      ],
    );
  }
}

function mapUserProfile(row: Record<string, unknown>): UserProfile {
  const homeCountry = row.home_country as string | null;
  const rawCitizenships = row.citizenships as string | null | undefined;
  let citizenships: string[] = [];
  if (rawCitizenships) {
    try {
      const parsed = JSON.parse(rawCitizenships);
      citizenships = Array.isArray(parsed) ? parsed.filter((code): code is string => typeof code === 'string') : [];
    } catch {
      citizenships = [];
    }
  }
  if (citizenships.length === 0 && homeCountry) {
    citizenships = [homeCountry];
  }
  const primaryNationality = (row.primary_nationality as string | null | undefined) ?? citizenships[0] ?? null;
  return {
    id: String(row.id),
    name: row.name as string | null,
    homeCountry: citizenships[0] ?? homeCountry,
    citizenships,
    birthDate: (row.birth_date as string | null | undefined) ?? null,
    primaryNationality,
    photoUri: (row.photo_uri as string | null | undefined) ?? null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function mapAppSettings(row: Record<string, unknown>): AppSettings {
  return {
    id: String(row.id),
    appearance: row.appearance as AppSettings['appearance'],
    dateFormat: row.date_format as AppSettings['dateFormat'],
    defaultCountry: row.default_country as string | null,
    notificationPreferences: JSON.parse(String(row.notification_preferences)),
    biometricEnabled: Number(row.biometric_enabled) === 1,
    appLockEnabled: Number(row.app_lock_enabled) === 1,
    onboardingCompleted: Number(row.onboarding_completed) === 1,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function mapCountryVisaPreference(row: Record<string, unknown>): CountryVisaPreference {
  return {
    countryCode: String(row.country_code),
    needsVisa: Number(row.needs_visa) === 1,
    updatedAt: String(row.updated_at),
  };
}

function mapStay(row: Record<string, unknown>): Stay {
  return {
    id: String(row.id),
    countryCode: String(row.country_code),
    city: row.city as string | null,
    arrivalDate: row.arrival_date as string | null,
    departureDate: row.departure_date as string | null,
    datePrecision: row.date_precision as Stay['datePrecision'],
    approximatePeriod: row.approximate_period as string | null,
    approximateDurationDays: row.approximate_duration_days as number | null,
    stayType: (row.stay_type as Stay['stayType']) ?? null,
    visaNeeded:
      row.visa_needed == null || row.visa_needed === undefined
        ? null
        : Number(row.visa_needed) === 1,
    visaDocumentId: (row.visa_document_id as string | null | undefined) ?? null,
    notes: row.notes as string | null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function mapPlaceVisit(row: Record<string, unknown>): PlaceVisit {
  return {
    id: String(row.id),
    stayId: String(row.stay_id),
    name: String(row.name),
    visitDate: row.visit_date as string | null,
    datePrecision: row.date_precision as PlaceVisit['datePrecision'],
    approximatePeriod: row.approximate_period as string | null,
    notes: row.notes as string | null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function mapMemoryRecord(row: Record<string, unknown>): MemoryRecord {
  return {
    id: String(row.id),
    stayId: row.stay_id as string | null,
    placeVisitId: row.place_visit_id as string | null,
    title: row.title as string | null,
    caption: row.caption as string | null,
    memoryDate: row.memory_date as string | null,
    datePrecision: row.date_precision as MemoryRecord['datePrecision'],
    approximatePeriod: row.approximate_period as string | null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function mapNote(row: Record<string, unknown>): Note {
  return {
    id: String(row.id),
    stayId: row.stay_id as string | null,
    placeVisitId: row.place_visit_id as string | null,
    memoryRecordId: row.memory_record_id as string | null,
    title: row.title as string | null,
    content: String(row.content),
    noteDate: row.note_date as string | null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function mapDocument(row: Record<string, unknown>): Document {
  return {
    id: String(row.id),
    title: String(row.title),
    documentType: row.document_type as Document['documentType'],
    issueDate: row.issue_date as string | null,
    expiryDate: row.expiry_date as string | null,
    issuingCountry: row.issuing_country as string | null,
    documentNumber: row.document_number as string | null,
    notes: row.notes as string | null,
    linkedStayId: (row.linked_stay_id as string | null | undefined) ?? null,
    maxStayDays: row.max_stay_days == null ? null : Number(row.max_stay_days),
    maxEntries: row.max_entries == null ? null : Number(row.max_entries),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function mapAttachment(row: Record<string, unknown>): Attachment {
  return {
    id: String(row.id),
    fileName: String(row.file_name),
    mimeType: String(row.mime_type),
    fileSize: Number(row.file_size),
    sha256: String(row.sha256),
    localPath: String(row.local_path),
    ownerType: row.owner_type as Attachment['ownerType'],
    ownerId: String(row.owner_id),
    category: row.category ? (String(row.category) as Attachment['category']) : null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function mapRule(row: Record<string, unknown>): Rule {
  return {
    id: String(row.id),
    ruleType: row.rule_type as Rule['ruleType'],
    name: String(row.name),
    enabled: Number(row.enabled) === 1,
    applicableCountries: row.applicable_countries
      ? (JSON.parse(String(row.applicable_countries)) as string[])
      : null,
    threshold: row.threshold as number | null,
    lookbackDays: row.lookback_days as number | null,
    config: row.config ? (JSON.parse(String(row.config)) as Record<string, unknown>) : null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function mapReminder(row: Record<string, unknown>): Reminder {
  return {
    id: String(row.id),
    title: String(row.title),
    message: row.message as string | null,
    reminderType: row.reminder_type as Reminder['reminderType'],
    triggerDate: String(row.trigger_date),
    annualMonth: row.annual_month as number | null,
    annualDay: row.annual_day as number | null,
    linkedDocumentId: row.linked_document_id as string | null,
    enabled: Number(row.enabled) === 1,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

export async function setRestoreMetadata(key: string, value: string | null): Promise<void> {
  const db = await getDatabase();
  if (value == null) {
    await db.runAsync('DELETE FROM schema_metadata WHERE key = ?', [key]);
    return;
  }
  await db.runAsync(
    'INSERT OR REPLACE INTO schema_metadata (key, value) VALUES (?, ?)',
    [key, value],
  );
}

export async function getRestoreMetadata(key: string): Promise<string | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ value: string }>(
    'SELECT value FROM schema_metadata WHERE key = ?',
    [key],
  );
  return row?.value ?? null;
}

export const RESTORE_IN_PROGRESS_KEY = 'restore_in_progress';
export const SAFETY_SNAPSHOT_PATH_KEY = 'safety_snapshot_path';
export const RESTORE_STAGING_PATH_KEY = 'restore_staging_path';
