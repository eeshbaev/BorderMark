import { addDays, format, parseISO, setHours, setMinutes, setSeconds } from 'date-fns';

import { calculateRule } from '@/domain/rules/ruleEngine';
import {
  shouldSurfaceImmigrationDocument,
  staysForRuleCalculation,
} from '@/domain/services/citizenshipService';
import {
  documentExpiryNotificationId,
  reminderNotificationId,
  ruleThresholdNotificationId,
  stayMilestoneNotificationId,
} from '@/domain/notifications/notificationIdentity';
import { getCountryName } from '@/data/dataset/countries';
import { daysUntil, ISO_DATE, parseIsoDate, todayIso } from '@/domain/utils/dates';
import type {
  AppSettings,
  CountryRecord,
  Document,
  NotificationCandidate,
  Reminder,
  Rule,
  Stay,
} from '@/shared/types';

export const NOTIFICATION_HORIZON_DAYS = 90;
export const DEFAULT_NOTIFICATION_HOUR = 9;

const DOCUMENT_EXPIRY_OFFSETS = [90, 30, 7, 0] as const;
const RULE_THRESHOLD_OFFSETS = [30, 7, 0] as const;

export interface NotificationBuildInput {
  today?: string;
  settings: AppSettings;
  documents: Document[];
  rules: Rule[];
  reminders: Reminder[];
  stays: Stay[];
  countries: CountryRecord[];
  citizenships?: string[];
  profileName?: string | null;
  now?: Date;
}

function atDefaultLocalTime(isoDate: string): Date {
  const base = parseISO(isoDate);
  return setSeconds(setMinutes(setHours(base, DEFAULT_NOTIFICATION_HOUR), 0), 0);
}

function isWithinHorizon(triggerAt: Date, today: string): boolean {
  const triggerDate = format(triggerAt, ISO_DATE);
  if (triggerDate < today) {
    return false;
  }
  const horizonEnd = format(addDays(parseISO(today), NOTIFICATION_HORIZON_DAYS), ISO_DATE);
  return triggerDate <= horizonEnd;
}

function nextAnnualDate(reminder: Reminder, today: string): string | null {
  if (reminder.annualMonth == null || reminder.annualDay == null) {
    return null;
  }
  const year = parseInt(today.slice(0, 4), 10);
  const month = String(reminder.annualMonth).padStart(2, '0');
  const day = String(reminder.annualDay).padStart(2, '0');
  let candidate = `${year}-${month}-${day}`;
  if (candidate < today) {
    candidate = `${year + 1}-${month}-${day}`;
  }
  return candidate;
}

function buildReminderCandidates(
  reminders: Reminder[],
  today: string,
  now: Date,
): NotificationCandidate[] {
  const candidates: NotificationCandidate[] = [];

  for (const reminder of reminders) {
    if (!reminder.enabled) {
      continue;
    }

    const triggerDate =
      reminder.reminderType === 'annual'
        ? nextAnnualDate(reminder, today)
        : reminder.triggerDate;

    if (!triggerDate || triggerDate < today) {
      continue;
    }

    const triggerAt = atDefaultLocalTime(triggerDate);
    if (!isWithinHorizon(triggerAt, today)) {
      continue;
    }

    candidates.push({
      id: reminderNotificationId(reminder.id),
      sourceType: 'reminder',
      sourceId: reminder.id,
      notificationType:
        reminder.reminderType === 'annual' ? 'reminder_annual' : 'reminder_one_time',
      title: reminder.title,
      body: reminder.message ?? 'BorderMark reminder',
      triggerAt,
      data: {
        source: 'bordermark',
        sourceType: 'reminder',
        sourceId: reminder.id,
      },
    });
  }

  return candidates;
}

function buildDocumentExpiryCandidates(
  documents: Document[],
  today: string,
  now: Date,
  citizenships: string[] = [],
): NotificationCandidate[] {
  const candidates: NotificationCandidate[] = [];

  for (const document of documents) {
    if (!document.expiryDate || !shouldSurfaceImmigrationDocument(document, citizenships)) {
      continue;
    }

    for (const offset of DOCUMENT_EXPIRY_OFFSETS) {
      const notificationDate = format(
        addDays(parseISO(document.expiryDate), -offset),
        ISO_DATE,
      );
      if (notificationDate < today) {
        continue;
      }

      const triggerAt = atDefaultLocalTime(notificationDate);
      if (!isWithinHorizon(triggerAt, today)) {
        continue;
      }

      const remaining = daysUntil(document.expiryDate, notificationDate);
      const body =
        offset === 0
          ? `${document.title} expires today`
          : `${document.title} expires in ${remaining} days`;

      candidates.push({
        id: documentExpiryNotificationId(document.id, notificationDate),
        sourceType: 'document',
        sourceId: document.id,
        notificationType: 'document_expiry',
        title: offset === 0 ? 'Document expires today' : 'Document expiry reminder',
        body,
        triggerAt,
        data: {
          source: 'bordermark',
          sourceType: 'document',
          sourceId: document.id,
          offsetDays: offset,
        },
      });
    }
  }

  return candidates;
}

function buildRuleThresholdCandidates(
  rules: Rule[],
  stays: Stay[],
  countries: CountryRecord[],
  today: string,
  now: Date,
  citizenships: string[] = [],
): NotificationCandidate[] {
  const candidates: NotificationCandidate[] = [];

  for (const rule of rules) {
    if (!rule.enabled) {
      continue;
    }

    const result = calculateRule(
      rule,
      staysForRuleCalculation(rule, stays, citizenships),
      countries,
      today,
    );
    if (result.state === 'UNAVAILABLE' || result.daysRemaining == null) {
      continue;
    }

    for (const offset of RULE_THRESHOLD_OFFSETS) {
      if (result.daysRemaining < offset) {
        continue;
      }

      const daysUntilNotification = result.daysRemaining - offset;
      const notificationDate = format(addDays(parseISO(today), daysUntilNotification), ISO_DATE);
      const triggerAt = atDefaultLocalTime(notificationDate);
      if (!isWithinHorizon(triggerAt, today)) {
        continue;
      }

      const title =
        offset === 0 ? `${rule.name} threshold reached` : `${rule.name} threshold approaching`;
      const body =
        result.state === 'ESTIMATED'
          ? `About ${result.daysUsed ?? 0} of ${result.threshold} days used`
          : `${result.daysUsed ?? 0} of ${result.threshold} days used · ${offset} days remaining`;

      candidates.push({
        id: ruleThresholdNotificationId(rule.id, notificationDate, 'rule_threshold'),
        sourceType: 'rule',
        sourceId: rule.id,
        notificationType: 'rule_threshold',
        title,
        body,
        triggerAt,
        data: {
          source: 'bordermark',
          sourceType: 'rule',
          sourceId: rule.id,
          thresholdOffset: offset,
        },
      });
    }
  }

  return candidates;
}

function buildStayMilestoneCandidates(
  stays: Stay[],
  citizenships: string[],
  today: string,
  profileName: string | null | undefined,
): NotificationCandidate[] {
  const firstName = profileName?.trim().split(/\s+/)[0] ?? 'there';
  const candidates: NotificationCandidate[] = [];

  for (const stay of stays) {
    if (stay.datePrecision !== 'exact' || !stay.arrivalDate) {
      continue;
    }
    if (citizenships.includes(stay.countryCode)) {
      continue;
    }
    if (stay.departureDate && stay.departureDate < today) {
      continue;
    }

    const country = getCountryName(stay.countryCode);
    for (let milestone = 10; milestone <= 360; milestone += 10) {
      const triggerDate = format(addDays(parseIsoDate(stay.arrivalDate), milestone - 1), ISO_DATE);
      if (triggerDate < today) {
        continue;
      }
      if (stay.departureDate && triggerDate > stay.departureDate) {
        continue;
      }

      const triggerAt = atDefaultLocalTime(triggerDate);
      if (!isWithinHorizon(triggerAt, today)) {
        continue;
      }

      candidates.push({
        id: stayMilestoneNotificationId(stay.id, milestone),
        sourceType: 'reminder',
        sourceId: stay.id,
        notificationType: 'stay_milestone',
        title: `Day ${milestone} in ${country}`,
        body: `Have a nice day, ${firstName}.`,
        triggerAt,
        data: {
          source: 'bordermark',
          sourceType: 'stay',
          sourceId: stay.id,
          milestoneDay: milestone,
        },
      });
    }
  }

  return candidates;
}

export function buildNotificationCandidates(input: NotificationBuildInput): NotificationCandidate[] {
  const today = input.today ?? todayIso();
  const now = input.now ?? new Date();
  const prefs = input.settings.notificationPreferences;
  const citizenships = input.citizenships ?? [];
  const candidates: NotificationCandidate[] = [];

  if (prefs.reminders) {
    candidates.push(...buildReminderCandidates(input.reminders, today, now));
  }
  if (prefs.documentExpiry) {
    candidates.push(...buildDocumentExpiryCandidates(input.documents, today, now, citizenships));
  }
  if (prefs.ruleThresholds) {
    candidates.push(
      ...buildRuleThresholdCandidates(input.rules, input.stays, input.countries, today, now, citizenships),
    );
  }
  if (prefs.stayMilestones) {
    candidates.push(
      ...buildStayMilestoneCandidates(input.stays, citizenships, today, input.profileName),
    );
  }

  return candidates.sort((a, b) => a.triggerAt.getTime() - b.triggerAt.getTime());
}
