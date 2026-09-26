import { buildNotificationCandidates } from '@/domain/notifications/notificationCandidates';
import type { NotificationPort, ScheduledNotificationRecord } from '@/infrastructure/notifications/notificationPort';
import type {
  AppSettings,
  CountryRecord,
  Document,
  NotificationCandidate,
  NotificationPermissionStatus,
  ReconciliationResult,
  Reminder,
  Rule,
  Stay,
} from '@/shared/types';

export interface ReconciliationInput {
  settings: AppSettings;
  documents: Document[];
  rules: Rule[];
  reminders: Reminder[];
  stays: Stay[];
  countries: CountryRecord[];
  citizenships?: string[];
  profileName?: string | null;
  today?: string;
  now?: Date;
}

function isBorderMarkNotification(record: ScheduledNotificationRecord): boolean {
  return record.data?.source === 'bordermark';
}

function sameTrigger(a: Date, b: Date): boolean {
  return Math.abs(a.getTime() - b.getTime()) < 60_000;
}

export class NotificationReconciliationService {
  constructor(private readonly port: NotificationPort) {}

  getPermissionStatus(): Promise<NotificationPermissionStatus> {
    return this.port.getPermissionStatus();
  }

  requestPermissions(): Promise<NotificationPermissionStatus> {
    return this.port.requestPermissions();
  }

  async reconcile(input: ReconciliationInput): Promise<ReconciliationResult> {
    const errors: string[] = [];
    const permissionStatus = await this.port.getPermissionStatus();

    const desired = buildNotificationCandidates({
      settings: input.settings,
      documents: input.documents,
      rules: input.rules,
      reminders: input.reminders,
      stays: input.stays,
      countries: input.countries,
      citizenships: input.citizenships,
      profileName: input.profileName,
      today: input.today,
      now: input.now,
    });

    if (permissionStatus !== 'granted') {
      return {
        permissionStatus,
        desiredCount: desired.length,
        scheduledCount: 0,
        cancelledCount: 0,
        skippedCount: 0,
        errors,
      };
    }

    await this.port.ensureChannel();

    const desiredById = new Map(desired.map((candidate) => [candidate.id, candidate]));
    const scheduled = (await this.port.getScheduledNotifications()).filter(isBorderMarkNotification);

    let cancelledCount = 0;
    for (const record of scheduled) {
      const match = desiredById.get(record.id);
      if (!match || !sameTrigger(record.triggerAt, match.triggerAt)) {
        try {
          await this.port.cancelNotification(record.id);
          cancelledCount += 1;
        } catch (error) {
          errors.push(`Failed to cancel ${record.id}: ${String(error)}`);
        }
      }
    }

    const refreshed = (await this.port.getScheduledNotifications()).filter(isBorderMarkNotification);
    const scheduledIds = new Set(refreshed.map((record) => record.id));

    let scheduledCount = 0;
    let skippedCount = 0;

    for (const candidate of desired) {
      const existing = refreshed.find((record) => record.id === candidate.id);
      if (existing && sameTrigger(existing.triggerAt, candidate.triggerAt)) {
        skippedCount += 1;
        continue;
      }
      if (scheduledIds.has(candidate.id)) {
        skippedCount += 1;
        continue;
      }

      try {
        await this.port.scheduleNotification(candidate);
        scheduledCount += 1;
        scheduledIds.add(candidate.id);
      } catch (error) {
        errors.push(`Failed to schedule ${candidate.id}: ${String(error)}`);
      }
    }

    return {
      permissionStatus,
      desiredCount: desired.length,
      scheduledCount,
      cancelledCount,
      skippedCount,
      errors,
    };
  }

  buildCandidates(input: ReconciliationInput): NotificationCandidate[] {
    return buildNotificationCandidates({
      settings: input.settings,
      documents: input.documents,
      rules: input.rules,
      reminders: input.reminders,
      stays: input.stays,
      countries: input.countries,
      citizenships: input.citizenships,
      profileName: input.profileName,
      today: input.today,
      now: input.now,
    });
  }
}
