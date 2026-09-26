import type {
  NotificationPermissionStatus,
  NotificationPort,
  ScheduledNotificationRecord,
} from '@/infrastructure/notifications/notificationPort';
import type { NotificationCandidate } from '@/shared/types';

/** Used when expo-notifications is unavailable (e.g. Expo Go on Android SDK 53+). */
export class NoOpNotificationPort implements NotificationPort {
  async getPermissionStatus(): Promise<NotificationPermissionStatus> {
    return 'undetermined';
  }

  async requestPermissions(): Promise<NotificationPermissionStatus> {
    return 'undetermined';
  }

  async ensureChannel(): Promise<void> {}

  async getScheduledNotifications(): Promise<ScheduledNotificationRecord[]> {
    return [];
  }

  async scheduleNotification(_candidate: NotificationCandidate): Promise<void> {}

  async cancelNotification(_id: string): Promise<void> {}

  async cancelAllBorderMarkNotifications(): Promise<void> {}
}
