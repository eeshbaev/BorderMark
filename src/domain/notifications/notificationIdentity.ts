import { computeSha256Hex } from '@/domain/utils/hash';

export type DerivedNotificationKind =
  | 'reminder_one_time'
  | 'reminder_annual'
  | 'document_expiry'
  | 'rule_threshold'
  | 'stay_milestone'
  | 'stay_reflection';

function encodeIdentity(parts: string[]): string {
  return parts.join('|');
}

function derivedNotificationId(encoded: string): string {
  return computeSha256Hex(new TextEncoder().encode(encoded)).slice(0, 32);
}

export function reminderNotificationId(reminderId: string): string {
  return reminderId;
}

export function documentExpiryNotificationId(
  documentId: string,
  notificationDate: string,
): string {
  return derivedNotificationId(
    encodeIdentity(['document', documentId, notificationDate, 'document_expiry']),
  );
}

export function stayMilestoneNotificationId(stayId: string, milestoneDay: number): string {
  return derivedNotificationId(
    encodeIdentity(['stay', stayId, String(milestoneDay), 'stay_milestone']),
  );
}

export function ruleThresholdNotificationId(
  ruleId: string,
  notificationDate: string,
  notificationType: DerivedNotificationKind,
): string {
  return derivedNotificationId(
    encodeIdentity(['rule', ruleId, notificationDate, notificationType]),
  );
}
