import { daysUntil, todayIso } from '@/domain/utils/dates';
import type { DocumentExpiryState } from '@/shared/types';

export function getDocumentExpiryState(
  expiryDate: string | null,
  today: string = todayIso(),
): DocumentExpiryState {
  if (!expiryDate) {
    return 'normal';
  }
  const remaining = daysUntil(expiryDate, today);
  if (remaining < 0) {
    return 'expired';
  }
  if (remaining <= 7) {
    return 'urgent';
  }
  if (remaining <= 30) {
    return 'approaching';
  }
  if (remaining <= 90) {
    return 'upcoming';
  }
  return 'normal';
}

export function formatExpiryLabel(expiryDate: string | null, today: string = todayIso()): string {
  if (!expiryDate) {
    return 'No expiry recorded';
  }
  const remaining = daysUntil(expiryDate, today);
  if (remaining < 0) {
    return 'Expired';
  }
  if (remaining <= 7) {
    return `⚠ Expires in ${remaining} days`;
  }
  return `Expires in ${remaining} days`;
}
