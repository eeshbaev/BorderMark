import { addDays, format, parseISO } from 'date-fns';

import { buildNotificationCandidates } from '@/domain/notifications/notificationCandidates';
import {
  documentExpiryNotificationId,
  reminderNotificationId,
  ruleThresholdNotificationId,
} from '@/domain/notifications/notificationIdentity';
import { NotificationReconciliationService } from '@/domain/notifications/notificationReconciliationService';
import { MemoryNotificationPort } from '@/infrastructure/notifications/memoryNotificationPort';
import type { AppSettings, Document, Reminder, Rule, Stay } from '@/shared/types';

const baseSettings: AppSettings = {
  id: 'settings-1',
  appearance: 'system',
  dateFormat: 'DMY',
  defaultCountry: null,
  notificationPreferences: {
    documentExpiry: true,
    ruleThresholds: true,
    reminders: true,
    stayMilestones: true,
    stayReflection: true,
  },
  biometricEnabled: false,
  appLockEnabled: false,
  onboardingCompleted: true,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

function fixedNow(): Date {
  return parseISO('2026-06-01T09:00:00.000Z');
}

describe('notificationIdentity', () => {
  it('uses reminder id directly for user reminders', () => {
    expect(reminderNotificationId('rem-abc')).toBe('rem-abc');
  });

  it('derives stable ids for document expiry notifications', () => {
    const first = documentExpiryNotificationId('doc-1', '2026-09-01');
    const second = documentExpiryNotificationId('doc-1', '2026-09-01');
    const different = documentExpiryNotificationId('doc-1', '2026-08-01');
    expect(first).toBe(second);
    expect(first).not.toBe(different);
    expect(first).toHaveLength(32);
  });

  it('derives stable ids for rule threshold notifications', () => {
    const first = ruleThresholdNotificationId('rule-1', '2026-07-01', 'rule_threshold');
    const second = ruleThresholdNotificationId('rule-1', '2026-07-01', 'rule_threshold');
    expect(first).toBe(second);
  });
});

describe('buildNotificationCandidates', () => {
  it('schedules one-time reminders within the horizon', () => {
    const reminders: Reminder[] = [
      {
        id: 'rem-1',
        title: 'Visa check',
        message: 'Review visa',
        reminderType: 'one_time',
        triggerDate: '2026-06-15',
        annualMonth: null,
        annualDay: null,
        linkedDocumentId: null,
        enabled: true,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
    ];

    const candidates = buildNotificationCandidates({
      today: '2026-06-01',
      now: fixedNow(),
      settings: baseSettings,
      documents: [],
      rules: [],
      reminders,
      stays: [],
      countries: [],
    });

    expect(candidates).toHaveLength(1);
    expect(candidates[0].id).toBe('rem-1');
    expect(candidates[0].title).toBe('Visa check');
  });

  it('skips disabled reminders and past one-time reminders', () => {
    const reminders: Reminder[] = [
      {
        id: 'rem-disabled',
        title: 'Disabled',
        message: null,
        reminderType: 'one_time',
        triggerDate: '2026-07-01',
        annualMonth: null,
        annualDay: null,
        linkedDocumentId: null,
        enabled: false,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
      {
        id: 'rem-past',
        title: 'Past',
        message: null,
        reminderType: 'one_time',
        triggerDate: '2026-05-01',
        annualMonth: null,
        annualDay: null,
        linkedDocumentId: null,
        enabled: true,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
    ];

    const candidates = buildNotificationCandidates({
      today: '2026-06-01',
      now: fixedNow(),
      settings: baseSettings,
      documents: [],
      rules: [],
      reminders,
      stays: [],
      countries: [],
    });

    expect(candidates).toHaveLength(0);
  });

  it('schedules annual reminders for the next occurrence', () => {
    const reminders: Reminder[] = [
      {
        id: 'rem-annual',
        title: 'Renew insurance',
        message: null,
        reminderType: 'annual',
        triggerDate: '2020-12-01',
        annualMonth: 7,
        annualDay: 15,
        linkedDocumentId: null,
        enabled: true,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
    ];

    const candidates = buildNotificationCandidates({
      today: '2026-06-01',
      now: fixedNow(),
      settings: baseSettings,
      documents: [],
      rules: [],
      reminders,
      stays: [],
      countries: [],
    });

    expect(candidates).toHaveLength(1);
    expect(format(candidates[0].triggerAt, 'yyyy-MM-dd')).toBe('2026-07-15');
  });

  it('schedules document expiry notifications at 90/30/7/0 day offsets', () => {
    const documents: Document[] = [
      {
        id: 'doc-1',
        title: 'Passport',
        documentType: 'passport',
        issueDate: null,
        expiryDate: '2026-08-30',
        issuingCountry: 'US',
        documentNumber: null,
        notes: null,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
    ];

    const candidates = buildNotificationCandidates({
      today: '2026-06-01',
      now: fixedNow(),
      settings: baseSettings,
      documents,
      rules: [],
      reminders: [],
      stays: [],
      countries: [],
    });

    const triggerDates = candidates.map((candidate) => format(candidate.triggerAt, 'yyyy-MM-dd'));
    expect(triggerDates).toEqual(
      expect.arrayContaining(['2026-06-01', '2026-07-31', '2026-08-23', '2026-08-30']),
    );
  });

  it('respects notification preference toggles', () => {
    const reminders: Reminder[] = [
      {
        id: 'rem-1',
        title: 'Only this',
        message: null,
        reminderType: 'one_time',
        triggerDate: '2026-06-15',
        annualMonth: null,
        annualDay: null,
        linkedDocumentId: null,
        enabled: true,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
    ];

    const candidates = buildNotificationCandidates({
      today: '2026-06-01',
      now: fixedNow(),
      settings: {
        ...baseSettings,
        notificationPreferences: {
          documentExpiry: false,
          ruleThresholds: false,
          reminders: true,
          stayMilestones: false,
          stayReflection: false,
        },
      },
      documents: [
        {
          id: 'doc-1',
          title: 'Passport',
          documentType: 'passport',
          issueDate: null,
          expiryDate: '2026-08-30',
          issuingCountry: null,
          documentNumber: null,
          notes: null,
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
      ],
      rules: [],
      reminders,
      stays: [],
      countries: [],
    });

    expect(candidates).toHaveLength(1);
    expect(candidates[0].sourceType).toBe('reminder');
  });
});

describe('NotificationReconciliationService', () => {
  it('schedules desired notifications and cancels stale ones', async () => {
    const port = new MemoryNotificationPort();
    const service = new NotificationReconciliationService(port);

    await port.scheduleNotification({
      id: 'stale-id',
      sourceType: 'reminder',
      sourceId: 'old',
      notificationType: 'reminder_one_time',
      title: 'Old',
      body: 'Old body',
      triggerAt: addDays(fixedNow(), 5),
      data: { source: 'bordermark', sourceType: 'reminder', sourceId: 'old' },
    });

    const reminders: Reminder[] = [
      {
        id: 'rem-1',
        title: 'Visa check',
        message: null,
        reminderType: 'one_time',
        triggerDate: '2026-06-15',
        annualMonth: null,
        annualDay: null,
        linkedDocumentId: null,
        enabled: true,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
    ];

    const result = await service.reconcile({
      today: '2026-06-01',
      now: fixedNow(),
      settings: baseSettings,
      documents: [],
      rules: [],
      reminders,
      stays: [],
      countries: [],
    });

    expect(result.scheduledCount).toBe(1);
    expect(result.cancelledCount).toBe(1);
    expect(result.desiredCount).toBe(1);

    const scheduled = await port.getScheduledNotifications();
    expect(scheduled).toHaveLength(1);
    expect(scheduled[0].id).toBe('rem-1');
  });

  it('does not schedule when permission is denied but still reports desired count', async () => {
    const port = new MemoryNotificationPort();
    port.permissionStatus = 'denied';
    const service = new NotificationReconciliationService(port);

    const result = await service.reconcile({
      today: '2026-06-01',
      now: fixedNow(),
      settings: baseSettings,
      documents: [],
      rules: [],
      reminders: [
        {
          id: 'rem-1',
          title: 'Visa check',
          message: null,
          reminderType: 'one_time',
          triggerDate: '2026-06-15',
          annualMonth: null,
          annualDay: null,
          linkedDocumentId: null,
          enabled: true,
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
      ],
      stays: [],
      countries: [],
    });

    expect(result.permissionStatus).toBe('denied');
    expect(result.desiredCount).toBe(1);
    expect(result.scheduledCount).toBe(0);
  });

  it('skips rescheduling unchanged notifications', async () => {
    const port = new MemoryNotificationPort();
    const service = new NotificationReconciliationService(port);
    const reminders: Reminder[] = [
      {
        id: 'rem-1',
        title: 'Visa check',
        message: null,
        reminderType: 'one_time',
        triggerDate: '2026-06-15',
        annualMonth: null,
        annualDay: null,
        linkedDocumentId: null,
        enabled: true,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
    ];

    const input = {
      today: '2026-06-01',
      now: fixedNow(),
      settings: baseSettings,
      documents: [],
      rules: [] as Rule[],
      reminders,
      stays: [] as Stay[],
      countries: [],
    };

    const first = await service.reconcile(input);
    const second = await service.reconcile(input);

    expect(first.scheduledCount).toBe(1);
    expect(second.scheduledCount).toBe(0);
    expect(second.skippedCount).toBe(1);
  });
});
