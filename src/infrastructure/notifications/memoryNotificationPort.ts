import type {
  NotificationPermissionStatus,
  NotificationPort,
  ScheduledNotificationRecord,
} from '@/infrastructure/notifications/notificationPort';
import type { NotificationCandidate } from '@/shared/types';

export class MemoryNotificationPort implements NotificationPort {
  permissionStatus: NotificationPermissionStatus = 'granted';

  private scheduled = new Map<string, ScheduledNotificationRecord>();

  async getPermissionStatus(): Promise<NotificationPermissionStatus> {
    return this.permissionStatus;
  }

  async requestPermissions(): Promise<NotificationPermissionStatus> {
    this.permissionStatus = 'granted';
    return this.permissionStatus;
  }

  async ensureChannel(): Promise<void> {}

  async getScheduledNotifications(): Promise<ScheduledNotificationRecord[]> {
    return [...this.scheduled.values()];
  }

  async scheduleNotification(candidate: NotificationCandidate): Promise<void> {
    this.scheduled.set(candidate.id, {
      id: candidate.id,
      triggerAt: candidate.triggerAt,
      data: candidate.data,
    });
  }

  async cancelNotification(id: string): Promise<void> {
    this.scheduled.delete(id);
  }

  async cancelAllBorderMarkNotifications(): Promise<void> {
    this.scheduled.clear();
  }
}
