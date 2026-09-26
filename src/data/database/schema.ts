export const DATABASE_SCHEMA_VERSION = 8;

export const CREATE_TABLES_SQL = `
CREATE TABLE IF NOT EXISTS schema_metadata (
  key TEXT PRIMARY KEY NOT NULL,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS user_profile (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT,
  home_country TEXT,
  citizenships TEXT NOT NULL DEFAULT '[]',
  birth_date TEXT,
  primary_nationality TEXT,
  photo_uri TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS app_settings (
  id TEXT PRIMARY KEY NOT NULL,
  appearance TEXT NOT NULL DEFAULT 'system',
  date_format TEXT NOT NULL DEFAULT 'DMY',
  default_country TEXT,
  notification_preferences TEXT NOT NULL DEFAULT '{}',
  biometric_enabled INTEGER NOT NULL DEFAULT 0,
  app_lock_enabled INTEGER NOT NULL DEFAULT 0,
  onboarding_completed INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS stays (
  id TEXT PRIMARY KEY NOT NULL,
  country_code TEXT NOT NULL,
  city TEXT,
  arrival_date TEXT,
  departure_date TEXT,
  date_precision TEXT NOT NULL DEFAULT 'exact',
  approximate_period TEXT,
  approximate_duration_days INTEGER,
  stay_type TEXT,
  visa_needed INTEGER,
  visa_document_id TEXT,
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS place_visits (
  id TEXT PRIMARY KEY NOT NULL,
  stay_id TEXT NOT NULL,
  name TEXT NOT NULL,
  visit_date TEXT,
  date_precision TEXT NOT NULL DEFAULT 'exact',
  approximate_period TEXT,
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (stay_id) REFERENCES stays(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS memory_records (
  id TEXT PRIMARY KEY NOT NULL,
  stay_id TEXT,
  place_visit_id TEXT,
  title TEXT,
  caption TEXT,
  memory_date TEXT,
  date_precision TEXT NOT NULL DEFAULT 'exact',
  approximate_period TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (stay_id) REFERENCES stays(id) ON DELETE CASCADE,
  FOREIGN KEY (place_visit_id) REFERENCES place_visits(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS notes (
  id TEXT PRIMARY KEY NOT NULL,
  stay_id TEXT,
  place_visit_id TEXT,
  memory_record_id TEXT,
  title TEXT,
  content TEXT NOT NULL,
  note_date TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (stay_id) REFERENCES stays(id) ON DELETE CASCADE,
  FOREIGN KEY (place_visit_id) REFERENCES place_visits(id) ON DELETE CASCADE,
  FOREIGN KEY (memory_record_id) REFERENCES memory_records(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS documents (
  id TEXT PRIMARY KEY NOT NULL,
  title TEXT NOT NULL,
  document_type TEXT NOT NULL,
  issue_date TEXT,
  expiry_date TEXT,
  issuing_country TEXT,
  document_number TEXT,
  notes TEXT,
  linked_stay_id TEXT,
  max_stay_days INTEGER,
  max_entries INTEGER,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS country_visa_preferences (
  country_code TEXT PRIMARY KEY NOT NULL,
  needs_visa INTEGER NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS attachments (
  id TEXT PRIMARY KEY NOT NULL,
  file_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  sha256 TEXT NOT NULL,
  local_path TEXT NOT NULL,
  owner_type TEXT NOT NULL,
  owner_id TEXT NOT NULL,
  category TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS rules (
  id TEXT PRIMARY KEY NOT NULL,
  rule_type TEXT NOT NULL,
  name TEXT NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 1,
  applicable_countries TEXT,
  threshold INTEGER,
  lookback_days INTEGER,
  config TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS reminders (
  id TEXT PRIMARY KEY NOT NULL,
  title TEXT NOT NULL,
  message TEXT,
  reminder_type TEXT NOT NULL,
  trigger_date TEXT NOT NULL,
  annual_month INTEGER,
  annual_day INTEGER,
  linked_document_id TEXT,
  enabled INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (linked_document_id) REFERENCES documents(id) ON DELETE SET NULL
);
`;

export const CREATE_INDEXES_SQL = `
CREATE INDEX IF NOT EXISTS idx_stays_country ON stays(country_code);
CREATE INDEX IF NOT EXISTS idx_stays_arrival ON stays(arrival_date);
CREATE INDEX IF NOT EXISTS idx_documents_expiry ON documents(expiry_date);
CREATE INDEX IF NOT EXISTS idx_attachments_owner ON attachments(owner_type, owner_id);
CREATE INDEX IF NOT EXISTS idx_place_visits_stay ON place_visits(stay_id);
`;
