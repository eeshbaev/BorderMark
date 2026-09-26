import { getAllCountries } from '@/data/dataset/countries';
import { getNotificationService } from '@/infrastructure/services/serviceFactory';
import type { AppSettings, Document, Reminder, Rule, Stay } from '@/shared/types';
import type { ReconciliationResult } from '@/shared/types';

export async function runNotificationReconciliation(input: {
  settings: AppSettings;
  documents: Document[];
  rules: Rule[];
  reminders: Reminder[];
  stays: Stay[];
  citizenships?: string[];
  profileName?: string | null;
  today: string;
}): Promise<ReconciliationResult> {
  return getNotificationService().reconcile({
    ...input,
    countries: getAllCountries(),
    profileName: input.profileName,
  });
}
