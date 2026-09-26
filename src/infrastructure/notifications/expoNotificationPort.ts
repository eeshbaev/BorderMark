import { Platform } from 'react-native';

import type {
  NotificationPermissionStatus,
  NotificationPort,
  ScheduledNotificationRecord,
} from '@/infrastructure/notifications/notificationPort';
import type { NotificationCandidate } from '@/shared/types';

const CHANNEL_ID = 'bordermark-reminders';

type NotificationsModule = typeof import('expo-notifications');

let notificationsModulePromise: Promise<NotificationsModule> | null = null;
let handlerConfigured = false;

async function loadNotificationsModule(): Promise<NotificationsModule> {
  if (!notificationsModulePromise) {
    notificationsModulePromise = import('expo-notifications');
  }
  return notificationsModulePromise;
}

async function ensureNotificationHandler(): Promise<void> {
  if (handlerConfigured) {
    return;
  }
  handlerConfigured = true;
  const Notifications = await loadNotificationsModule();
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

function mapPermissionStatus(status: string): NotificationPermissionStatus {
  if (status === 'granted') {
    return 'granted';
  }
  if (status === 'denied') {
    return 'denied';
  }
  return 'undetermined';
}

function parseTriggerDate(trigger: unknown): Date | null {
  if (trigger == null || typeof trigger !== 'object') {
    return null;
  }
  const record = trigger as { date?: string | number | Date; value?: number };
  if (record.date != null) {
    return new Date(record.date);
  }
  if (typeof record.value === 'number') {
    return new Date(record.value);
  }
  return null;
}

export class ExpoNotificationPort implements NotificationPort {
  async getPermissionStatus(): Promise<NotificationPermissionStatus> {
    await ensureNotificationHandler();
    const Notifications = await loadNotificationsModule();
    const settings = await Notifications.getPermissionsAsync();
    return mapPermissionStatus(String(settings.status));
  }

  async requestPermissions(): Promise<NotificationPermissionStatus> {
    await ensureNotificationHandler();
    const Notifications = await loadNotificationsModule();
    const settings = await Notifications.requestPermissionsAsync();
    return mapPermissionStatus(String(settings.status));
  }

  async ensureChannel(): Promise<void> {
    if (Platform.OS !== 'android') {
      return;
    }
    const Notifications = await loadNotificationsModule();
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: 'BorderMark reminders',
      importance: Notifications.AndroidImportance.DEFAULT,
      description: 'Document expiry, rule thresholds, and personal reminders',
    });
  }

  async getScheduledNotifications(): Promise<ScheduledNotificationRecord[]> {
    const Notifications = await loadNotificationsModule();
    const requests = await Notifications.getAllScheduledNotificationsAsync();
    const records: ScheduledNotificationRecord[] = [];

    for (const request of requests) {
      const triggerAt = parseTriggerDate(request.trigger);
      if (!triggerAt) {
        continue;
      }
      records.push({
        id: request.identifier,
        triggerAt,
        data: (request.content.data ?? {}) as Record<string, unknown>,
      });
    }

    return records;
  }

  async scheduleNotification(candidate: NotificationCandidate): Promise<void> {
    const Notifications = await loadNotificationsModule();
    await Notifications.scheduleNotificationAsync({
      identifier: candidate.id,
      content: {
        title: candidate.title,
        body: candidate.body,
        data: candidate.data,
        ...(Platform.OS === 'android' ? { channelId: CHANNEL_ID } : {}),
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: candidate.triggerAt,
      },
    });
  }

  async cancelNotification(id: string): Promise<void> {
    const Notifications = await loadNotificationsModule();
    await Notifications.cancelScheduledNotificationAsync(id);
  }

  async cancelAllBorderMarkNotifications(): Promise<void> {
    const scheduled = await this.getScheduledNotifications();
    await Promise.all(
      scheduled
        .filter((record) => record.data?.source === 'bordermark')
        .map((record) => this.cancelNotification(record.id)),
    );
  }
}
