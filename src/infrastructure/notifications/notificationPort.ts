import type { NotificationCandidate } from '@/shared/types';

export type NotificationPermissionStatus = 'granted' | 'denied' | 'undetermined';

export interface ScheduledNotificationRecord {
  id: string;
  triggerAt: Date;
  data: Record<string, unknown>;
}

export interface NotificationPort {
  getPermissionStatus(): Promise<NotificationPermissionStatus>;
  requestPermissions(): Promise<NotificationPermissionStatus>;
  ensureChannel(): Promise<void>;
  getScheduledNotifications(): Promise<ScheduledNotificationRecord[]>;
  scheduleNotification(candidate: NotificationCandidate): Promise<void>;
  cancelNotification(id: string): Promise<void>;
  cancelAllBorderMarkNotifications(): Promise<void>;
}
