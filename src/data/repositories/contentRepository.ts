import { getDatabase } from '@/data/database/client';
import { getPresetKeyFromRule } from '@/domain/services/ruleCatalog';
import { getRulePresetByKey } from '@/domain/services/rulePresetCatalog';
import type { Reminder, Rule } from '@/shared/types';
import { generateId, nowIso } from '@/domain/utils/dates';

type RuleRow = {
  id: string;
  rule_type: Rule['ruleType'];
  name: string;
  enabled: number;
  applicable_countries: string | null;
  threshold: number | null;
  lookback_days: number | null;
  config: string | null;
  created_at: string;
  updated_at: string;
};

type ReminderRow = {
  id: string;
  title: string;
  message: string | null;
  reminder_type: Reminder['reminderType'];
  trigger_date: string;
  annual_month: number | null;
  annual_day: number | null;
  linked_document_id: string | null;
  enabled: number;
  created_at: string;
  updated_at: string;
};

function mapRule(row: RuleRow): Rule {
  return {
    id: row.id,
    ruleType: row.rule_type,
    name: row.name,
    enabled: row.enabled === 1,
    applicableCountries: row.applicable_countries
      ? (JSON.parse(row.applicable_countries) as string[])
      : null,
    threshold: row.threshold,
    lookbackDays: row.lookback_days,
    config: row.config ? (JSON.parse(row.config) as Record<string, unknown>) : null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapReminder(row: ReminderRow): Reminder {
  return {
    id: row.id,
    title: row.title,
    message: row.message,
    reminderType: row.reminder_type,
    triggerDate: row.trigger_date,
    annualMonth: row.annual_month,
    annualDay: row.annual_day,
    linkedDocumentId: row.linked_document_id,
    enabled: row.enabled === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listRules(): Promise<Rule[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<RuleRow>('SELECT * FROM rules ORDER BY name ASC');
  return rows.map(mapRule);
}

export async function saveRule(
  rule: Omit<Rule, 'createdAt' | 'updatedAt'> & Partial<Pick<Rule, 'createdAt' | 'updatedAt'>>,
): Promise<Rule> {
  const db = await getDatabase();
  const next: Rule = {
    ...rule,
    createdAt: rule.createdAt ?? nowIso(),
    updatedAt: nowIso(),
  } as Rule;

  await db.runAsync(
    `INSERT INTO rules (
      id, rule_type, name, enabled, applicable_countries, threshold, lookback_days, config, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      rule_type = excluded.rule_type,
      name = excluded.name,
      enabled = excluded.enabled,
      applicable_countries = excluded.applicable_countries,
      threshold = excluded.threshold,
      lookback_days = excluded.lookback_days,
      config = excluded.config,
      updated_at = excluded.updated_at`,
    [
      next.id,
      next.ruleType,
      next.name,
      next.enabled ? 1 : 0,
      next.applicableCountries ? JSON.stringify(next.applicableCountries) : null,
      next.threshold,
      next.lookbackDays,
      next.config ? JSON.stringify(next.config) : null,
      next.createdAt,
      next.updatedAt,
    ],
  );

  return next;
}

export async function createCustomRule(input: {
  name: string;
  applicableCountries: string[];
  threshold: number;
  lookbackDays: number;
  config?: Record<string, unknown> | null;
  enabled?: boolean;
}): Promise<Rule> {
  return saveRule({
    id: generateId(),
    ruleType: 'custom_threshold',
    name: input.name,
    enabled: input.enabled ?? true,
    applicableCountries: input.applicableCountries,
    threshold: input.threshold,
    lookbackDays: input.lookbackDays,
    config: input.config ?? null,
  });
}

export async function findRuleByPresetKey(presetKey: string): Promise<Rule | null> {
  const rules = await listRules();
  return rules.find((rule) => getPresetKeyFromRule(rule) === presetKey) ?? null;
}

export async function activateRulePreset(presetKey: string): Promise<Rule> {
  const preset = getRulePresetByKey(presetKey);
  if (!preset) {
    throw new Error('Unknown rule preset.');
  }

  const existing = await findRuleByPresetKey(presetKey);
  if (existing) {
    return setRuleEnabled(existing.id, true);
  }

  return createCustomRule({
    name: preset.name,
    applicableCountries: preset.applicableCountries,
    threshold: preset.threshold,
    lookbackDays: preset.lookbackDays,
    enabled: true,
    config: {
      presetKey: preset.key,
      windowMode: preset.windowMode,
    },
  });
}

export async function getRuleById(id: string): Promise<Rule | null> {
  const rules = await listRules();
  return rules.find((rule) => rule.id === id) ?? null;
}

export async function setRuleEnabled(id: string, enabled: boolean): Promise<Rule> {
  const rule = await getRuleById(id);
  if (!rule) {
    throw new Error('Rule not found.');
  }
  return saveRule({ ...rule, enabled });
}

export async function deleteRule(id: string): Promise<void> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ rule_type: Rule['ruleType'] }>(
    'SELECT rule_type FROM rules WHERE id = ?',
    [id],
  );
  if (!row) {
    return;
  }
  if (row.rule_type !== 'custom_threshold') {
    throw new Error('Built-in rules cannot be deleted. Turn them off instead.');
  }
  await db.runAsync('DELETE FROM rules WHERE id = ?', [id]);
}

export async function listReminders(): Promise<Reminder[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<ReminderRow>(
    'SELECT * FROM reminders ORDER BY trigger_date ASC',
  );
  return rows.map(mapReminder);
}

export async function saveReminder(
  reminder: Omit<Reminder, 'createdAt' | 'updatedAt'> & Partial<Pick<Reminder, 'createdAt' | 'updatedAt'>>,
): Promise<Reminder> {
  const db = await getDatabase();
  const next: Reminder = {
    ...reminder,
    createdAt: reminder.createdAt ?? nowIso(),
    updatedAt: nowIso(),
  } as Reminder;

  await db.runAsync(
    `INSERT INTO reminders (
      id, title, message, reminder_type, trigger_date, annual_month, annual_day, linked_document_id, enabled, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      title = excluded.title,
      message = excluded.message,
      reminder_type = excluded.reminder_type,
      trigger_date = excluded.trigger_date,
      annual_month = excluded.annual_month,
      annual_day = excluded.annual_day,
      linked_document_id = excluded.linked_document_id,
      enabled = excluded.enabled,
      updated_at = excluded.updated_at`,
    [
      next.id,
      next.title,
      next.message,
      next.reminderType,
      next.triggerDate,
      next.annualMonth,
      next.annualDay,
      next.linkedDocumentId,
      next.enabled ? 1 : 0,
      next.createdAt,
      next.updatedAt,
    ],
  );

  return next;
}

export async function createReminder(
  input: Omit<Reminder, 'id' | 'createdAt' | 'updatedAt'>,
): Promise<Reminder> {
  return saveReminder({ ...input, id: generateId() });
}
