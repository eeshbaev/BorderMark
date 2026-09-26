import { addDays, format } from 'date-fns';

import { createReminder, listReminders } from '@/data/repositories/contentRepository';
import { getCountryName } from '@/data/dataset/countries';
import { inclusiveDayCount, isValidIsoDate, ISO_DATE, parseIsoDate, todayIso } from '@/domain/utils/dates';
import type { Stay } from '@/shared/types';

const REFLECTION_PREFIX = 'borderMark:reflect:';

export async function scheduleStayReflectionReminder(
  stay: Stay,
  userName: string | null,
  today: string = todayIso(),
): Promise<void> {
  if (stay.datePrecision !== 'exact' || !isValidIsoDate(stay.departureDate)) {
    return;
  }

  const days = inclusiveDayCount(stay.arrivalDate!, stay.departureDate);
  if (days < 3) {
    return;
  }

  const triggerDate = format(addDays(parseIsoDate(stay.departureDate), 2), ISO_DATE);
  if (triggerDate < today) {
    return;
  }

  const reminders = await listReminders();
  const marker = `${REFLECTION_PREFIX}${stay.id}`;
  if (reminders.some((reminder) => reminder.message?.includes(marker))) {
    return;
  }

  const firstName = userName?.trim().split(/\s+/)[0] ?? 'there';
  const country = getCountryName(stay.countryCode);
  const verb = stay.stayType === 'worked' ? 'worked in' : stay.stayType === 'studied' ? 'studied in' : 'were in';

  await createReminder({
    title: `How was ${country}?`,
    message: `${marker} Hi ${firstName}, you ${verb} ${country} for ${days} days — add a note or photos when you have a moment.`,
    reminderType: 'one_time',
    triggerDate,
    annualMonth: null,
    annualDay: null,
    linkedDocumentId: null,
    enabled: true,
  });
}
