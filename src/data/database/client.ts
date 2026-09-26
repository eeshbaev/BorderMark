import * as SQLite from 'expo-sqlite';

import {
  CREATE_INDEXES_SQL,
  CREATE_TABLES_SQL,
  DATABASE_SCHEMA_VERSION,
} from '@/data/database/schema';
import { BUILTIN_RULE_DEFINITIONS } from '@/domain/services/ruleCatalog';
import { generateId, nowIso } from '@/domain/utils/dates';

let databaseInstance: SQLite.SQLiteDatabase | null = null;
let openPromise: Promise<SQLite.SQLiteDatabase> | null = null;
/** Serializes open, close, reopen, and every getDatabase() call. */
let databaseGate: Promise<unknown> = Promise.resolve();

function enqueueDatabaseTask<T>(task: () => Promise<T>): Promise<T> {
  const run = databaseGate.then(task, task);
  databaseGate = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

function splitSqlStatements(sql: string): string[] {
  return sql
    .split(';')
    .map((statement) => statement.trim())
    .filter((statement) => statement.length > 0);
}

function isNativeDatabaseError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return (
    message.includes('NativeDatabase') ||
    message.includes('NullPointerException') ||
    message.includes('prepareAsync') ||
    message.includes('execAsync')
  );
}

async function execSqlScript(db: SQLite.SQLiteDatabase, script: string): Promise<void> {
  for (const statement of splitSqlStatements(script)) {
    if (!statement.trim()) {
      continue;
    }
    try {
      await db.execAsync(statement);
    } catch (error) {
      if (isNativeDatabaseError(error)) {
        throw error;
      }
      throw new Error(`Database setup failed near: ${statement.slice(0, 120)}`, { cause: error });
    }
  }
}

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  return enqueueDatabaseTask(async () => {
    if (databaseInstance) {
      return databaseInstance;
    }

    if (!openPromise) {
      openPromise = openDatabase()
        .then((db) => {
          databaseInstance = db;
          openPromise = null;
          return db;
        })
        .catch((error) => {
          openPromise = null;
          databaseInstance = null;
          throw error;
        });
    }

    return openPromise;
  });
}

async function resetDatabaseConnection(forceDelete = false): Promise<void> {
  if (openPromise) {
    try {
      await openPromise;
    } catch {
      // Opening failed; continue with reset.
    }
  }

  openPromise = null;
  const db = databaseInstance;
  databaseInstance = null;

  if (db) {
    try {
      await db.closeAsync();
    } catch {
      // Ignore close failures on corrupted native handles.
    }
  }

  if (forceDelete) {
    try {
      await SQLite.deleteDatabaseAsync('bordermark.db');
    } catch {
      // Ignore if the database file is already gone.
    }
  }
}

export async function reopenDatabase(forceDelete = false): Promise<SQLite.SQLiteDatabase> {
  return enqueueDatabaseTask(async () => {
    await resetDatabaseConnection(forceDelete);
    openPromise = openDatabase()
      .then((db) => {
        databaseInstance = db;
        openPromise = null;
        return db;
      })
      .catch((error) => {
        openPromise = null;
        databaseInstance = null;
        throw error;
      });
    return openPromise;
  });
}

async function openAndPrepareDatabase(): Promise<SQLite.SQLiteDatabase> {
  const db = await SQLite.openDatabaseAsync('bordermark.db');
  await execSqlScript(db, CREATE_TABLES_SQL);
  await execSqlScript(db, CREATE_INDEXES_SQL);
  await runMigrations(db);
  await ensureMetadata(db);
  await seedDefaults(db);
  return db;
}

async function openDatabase(): Promise<SQLite.SQLiteDatabase> {
  try {
    return await openAndPrepareDatabase();
  } catch (error) {
    if (!isNativeDatabaseError(error)) {
      throw error;
    }
    try {
      await SQLite.deleteDatabaseAsync('bordermark.db');
    } catch {
      // Ignore delete failures — retry open may still succeed.
    }
    return openAndPrepareDatabase();
  }
}

async function runMigrations(db: SQLite.SQLiteDatabase): Promise<void> {
  const attachmentColumns = await db.getAllAsync<{ name: string }>('PRAGMA table_info(attachments)');
  const hasSha256 = attachmentColumns.some((column) => column.name === 'sha256');
  if (!hasSha256) {
    await db.execAsync('ALTER TABLE attachments ADD COLUMN sha256 TEXT NOT NULL DEFAULT ""');
  }

  const profileColumns = await db.getAllAsync<{ name: string }>('PRAGMA table_info(user_profile)');
  const hasPhotoUri = profileColumns.some((column) => column.name === 'photo_uri');
  if (!hasPhotoUri) {
    await db.execAsync('ALTER TABLE user_profile ADD COLUMN photo_uri TEXT');
  }

  const hasCitizenships = profileColumns.some((column) => column.name === 'citizenships');
  if (!hasCitizenships) {
    await db.execAsync("ALTER TABLE user_profile ADD COLUMN citizenships TEXT NOT NULL DEFAULT '[]'");
    const profiles = await db.getAllAsync<{ id: string; home_country: string | null }>(
      'SELECT id, home_country FROM user_profile',
    );
    for (const profile of profiles) {
      if (profile.home_country) {
        await db.runAsync('UPDATE user_profile SET citizenships = ? WHERE id = ?', [
          JSON.stringify([profile.home_country]),
          profile.id,
        ]);
      }
    }
  }

  const stayColumns = await db.getAllAsync<{ name: string }>('PRAGMA table_info(stays)');
  const hasStayType = stayColumns.some((column) => column.name === 'stay_type');
  if (!hasStayType) {
    await db.execAsync('ALTER TABLE stays ADD COLUMN stay_type TEXT');
  }

  const attachmentColumnsAfter = await db.getAllAsync<{ name: string }>('PRAGMA table_info(attachments)');
  const hasAttachmentCategory = attachmentColumnsAfter.some((column) => column.name === 'category');
  if (!hasAttachmentCategory) {
    await db.execAsync('ALTER TABLE attachments ADD COLUMN category TEXT');
  }

  const profileColumnsAfter = await db.getAllAsync<{ name: string }>('PRAGMA table_info(user_profile)');
  if (!profileColumnsAfter.some((column) => column.name === 'birth_date')) {
    await db.execAsync('ALTER TABLE user_profile ADD COLUMN birth_date TEXT');
  }
  if (!profileColumnsAfter.some((column) => column.name === 'primary_nationality')) {
    await db.execAsync('ALTER TABLE user_profile ADD COLUMN primary_nationality TEXT');
  }

  const stayColumnsAfter = await db.getAllAsync<{ name: string }>('PRAGMA table_info(stays)');
  if (!stayColumnsAfter.some((column) => column.name === 'visa_needed')) {
    await db.execAsync('ALTER TABLE stays ADD COLUMN visa_needed INTEGER');
  }
  if (!stayColumnsAfter.some((column) => column.name === 'visa_document_id')) {
    await db.execAsync('ALTER TABLE stays ADD COLUMN visa_document_id TEXT');
  }

  const documentColumns = await db.getAllAsync<{ name: string }>('PRAGMA table_info(documents)');
  if (!documentColumns.some((column) => column.name === 'linked_stay_id')) {
    await db.execAsync('ALTER TABLE documents ADD COLUMN linked_stay_id TEXT');
  }
  if (!documentColumns.some((column) => column.name === 'max_stay_days')) {
    await db.execAsync('ALTER TABLE documents ADD COLUMN max_stay_days INTEGER');
  }
  if (!documentColumns.some((column) => column.name === 'max_entries')) {
    await db.execAsync('ALTER TABLE documents ADD COLUMN max_entries INTEGER');
  }

  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS country_visa_preferences (
      country_code TEXT PRIMARY KEY NOT NULL,
      needs_visa INTEGER NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  await migrateRulesLibrary(db);
}

async function migrateRulesLibrary(db: SQLite.SQLiteDatabase): Promise<void> {
  try {
    const row = await db.getFirstAsync<{ value: string }>(
      'SELECT value FROM schema_metadata WHERE key = ?',
      ['rules_library_v1'],
    );
    if (row?.value === '1') {
      return;
    }

    await db.runAsync(
      `UPDATE rules SET enabled = 0 WHERE rule_type IN ('schengen_90_180', 'us_spt', 'us_183_day_counter')`,
    );
    await db.runAsync('INSERT OR REPLACE INTO schema_metadata (key, value) VALUES (?, ?)', [
      'rules_library_v1',
      '1',
    ]);
  } catch (error) {
    console.warn('BorderMark rules library migration skipped', error);
  }
}

async function ensureMetadata(db: SQLite.SQLiteDatabase): Promise<void> {
  await db.runAsync(
    'INSERT OR IGNORE INTO schema_metadata (key, value) VALUES (?, ?)',
    ['database_schema_version', String(DATABASE_SCHEMA_VERSION)],
  );
}

async function seedDefaults(db: SQLite.SQLiteDatabase): Promise<void> {
  const profile = await db.getFirstAsync<{ id: string }>(
    'SELECT id FROM user_profile LIMIT 1',
  );
  const timestamp = nowIso();

  if (!profile) {
    await db.runAsync(
      `INSERT INTO user_profile (id, name, home_country, citizenships, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [generateId(), null, null, '[]', timestamp, timestamp],
    );
  }

  const settings = await db.getFirstAsync<{ id: string }>(
    'SELECT id FROM app_settings LIMIT 1',
  );

  if (!settings) {
    await db.runAsync(
      `INSERT INTO app_settings (
        id, appearance, date_format, default_country, notification_preferences,
        biometric_enabled, app_lock_enabled, onboarding_completed, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        generateId(),
        'system',
        'DMY',
        null,
        JSON.stringify({
          documentExpiry: true,
          ruleThresholds: true,
          reminders: true,
          stayMilestones: true,
          stayReflection: true,
        }),
        0,
        0,
        0,
        timestamp,
        timestamp,
      ],
    );
  }

  await ensureRuleTemplates(db, timestamp);
}

async function ensureRuleTemplates(db: SQLite.SQLiteDatabase, timestamp: string): Promise<void> {
  for (const template of BUILTIN_RULE_DEFINITIONS) {
    const existing = await db.getFirstAsync<{ id: string }>(
      'SELECT id FROM rules WHERE rule_type = ? LIMIT 1',
      [template.ruleType],
    );
    if (existing) {
      continue;
    }

    await db.runAsync(
      `INSERT INTO rules (
        id, rule_type, name, enabled, applicable_countries, threshold, lookback_days, config, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        generateId(),
        template.ruleType,
        template.name,
        0,
        template.applicableCountries ? JSON.stringify(template.applicableCountries) : null,
        template.threshold,
        template.lookbackDays,
        null,
        timestamp,
        timestamp,
      ],
    );
  }
}

export async function closeDatabase(): Promise<void> {
  await enqueueDatabaseTask(async () => {
    await resetDatabaseConnection(false);
  });
}

export async function resetDatabaseForTests(): Promise<void> {
  await closeDatabase();
}
