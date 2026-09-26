import { createPlaceVisit } from '@/data/repositories/placeVisitRepository';
import { getDatabase } from '@/data/database/client';
import type { Stay } from '@/shared/types';
import { generateId, nowIso, resolvePreviousStayCloseDates } from '@/domain/utils/dates';
import { findCurrentStay, validateCurrentStayInvariant } from '@/domain/services/stayValidation';
import {
  mapStayInputToStay,
} from '@/domain/services/stayMapper';
import { planForeignStayReconciliation } from '@/domain/services/stayOverlapReconciliation';
import { buildBackdatedAbroadStayInput } from '@/domain/services/staySwitchService';
import { StayValidationError, validateStayInput, type StayInput } from '@/domain/services/stayInputValidation';
import { getStayGroupYear } from '@/domain/utils/approximatePeriod';

type StayRow = {
  id: string;
  country_code: string;
  city: string | null;
  arrival_date: string | null;
  departure_date: string | null;
  date_precision: Stay['datePrecision'];
  approximate_period: string | null;
  approximate_duration_days: number | null;
  stay_type: Stay['stayType'];
  visa_needed: number | null;
  visa_document_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

function mapStay(row: StayRow): Stay {
  return {
    id: row.id,
    countryCode: row.country_code,
    city: row.city,
    arrivalDate: row.arrival_date,
    departureDate: row.departure_date,
    datePrecision: row.date_precision,
    approximatePeriod: row.approximate_period,
    approximateDurationDays: row.approximate_duration_days,
    stayType: row.stay_type,
    visaNeeded: row.visa_needed == null ? null : row.visa_needed === 1,
    visaDocumentId: row.visa_document_id,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listStays(): Promise<Stay[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<StayRow>(
    'SELECT * FROM stays ORDER BY COALESCE(arrival_date, approximate_period) DESC, created_at DESC',
  );
  return rows.map(mapStay).sort((a, b) => {
    const aKey = a.arrivalDate ?? a.approximatePeriod ?? a.createdAt;
    const bKey = b.arrivalDate ?? b.approximatePeriod ?? b.createdAt;
    return bKey.localeCompare(aKey);
  });
}

export async function getStayById(id: string): Promise<Stay | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<StayRow>('SELECT * FROM stays WHERE id = ?', [id]);
  return row ? mapStay(row) : null;
}

export async function saveStay(
  stay: Omit<Stay, 'createdAt' | 'updatedAt'> & Partial<Pick<Stay, 'createdAt' | 'updatedAt'>>,
  today: string,
): Promise<Stay> {
  const db = await getDatabase();
  const existing = await listStays();
  const candidate: Stay = {
    ...stay,
    createdAt: stay.createdAt ?? nowIso(),
    updatedAt: nowIso(),
  } as Stay;

  validateCurrentStayInvariant(existing, candidate, today);

  await db.runAsync(
    `INSERT INTO stays (
      id, country_code, city, arrival_date, departure_date, date_precision,
      approximate_period, approximate_duration_days, stay_type, visa_needed, visa_document_id, notes, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      country_code = excluded.country_code,
      city = excluded.city,
      arrival_date = excluded.arrival_date,
      departure_date = excluded.departure_date,
      date_precision = excluded.date_precision,
      approximate_period = excluded.approximate_period,
      approximate_duration_days = excluded.approximate_duration_days,
      stay_type = excluded.stay_type,
      visa_needed = excluded.visa_needed,
      visa_document_id = excluded.visa_document_id,
      notes = excluded.notes,
      updated_at = excluded.updated_at`,
    [
      candidate.id,
      candidate.countryCode,
      candidate.city,
      candidate.arrivalDate,
      candidate.departureDate,
      candidate.datePrecision,
      candidate.approximatePeriod,
      candidate.approximateDurationDays,
      candidate.stayType,
      candidate.visaNeeded == null ? null : candidate.visaNeeded ? 1 : 0,
      candidate.visaDocumentId ?? null,
      candidate.notes,
      candidate.createdAt,
      candidate.updatedAt,
    ],
  );

  return candidate;
}

async function applyForeignStayReconciliation(candidate: Stay, today: string): Promise<void> {
  const existing = await listStays();
  const actions = planForeignStayReconciliation(candidate, existing);
  const timestamp = nowIso();

  for (const action of actions) {
    if (action.type === 'delete') {
      await deleteStay(action.stayId);
      continue;
    }

    const record =
      action.type === 'insert'
        ? { ...action.stay, createdAt: timestamp, updatedAt: timestamp }
        : { ...action.stay, updatedAt: timestamp };

    await saveStay(record, today);
  }
}

export async function createStayFromInput(input: StayInput, today: string): Promise<Stay> {
  const existing = await listStays();
  validateStayInput(input, today, existing);
  const id = generateId();
  const timestamp = nowIso();
  const stay = mapStayInputToStay(input, id, { createdAt: timestamp, updatedAt: timestamp });
  await applyForeignStayReconciliation(stay, today);
  return saveStay(stay, today);
}

/** Ends the existing current stay and starts a new one — used when recording a move via +. */
export async function switchCurrentStayFromInput(input: StayInput, today: string): Promise<Stay> {
  if (input.date.datePrecision !== 'exact') {
    return createStayFromInput(input, today);
  }

  const existing = await listStays();
  const current = findCurrentStay(existing, today);
  const newArrival = input.date.arrivalDate;

  if (
    current &&
    current.countryCode !== input.countryCode &&
    current.arrivalDate &&
    newArrival < current.arrivalDate
  ) {
    return createStayFromInput(buildBackdatedAbroadStayInput(input, current.arrivalDate), today);
  }

  if (!input.date.stillHere) {
    return createStayFromInput(input, today);
  }

  if (!current) {
    return createStayFromInput(input, today);
  }

  if (current.countryCode === input.countryCode) {
    return addCityToCurrentStay(input, today);
  }

  if (!current.arrivalDate) {
    return createStayFromInput(input, today);
  }

  const { arrivalDate, departureDate } = resolvePreviousStayCloseDates(
    current.arrivalDate,
    newArrival,
  );

  await updateStayFromInput(
    current.id,
    {
      countryCode: current.countryCode,
      city: current.city,
      notes: current.notes,
      stayType: current.stayType,
      date: {
        datePrecision: 'exact',
        arrivalDate,
        departureDate,
        stillHere: false,
      },
    },
    today,
  );

  return createStayFromInput(input, today);
}

/** Records a new city within the current stay in the same country. */
export async function addCityToCurrentStay(input: StayInput, today: string): Promise<Stay> {
  const existing = await listStays();
  const current = findCurrentStay(existing, today);
  if (!current || current.countryCode !== input.countryCode) {
    return createStayFromInput(input, today);
  }

  const newCity = input.city?.trim();
  const previousCity = current.city?.trim();
  if (
    newCity &&
    previousCity &&
    previousCity.toLowerCase() !== newCity.toLowerCase()
  ) {
    await createPlaceVisit({
      stayId: current.id,
      name: previousCity,
      visitDate: input.date.datePrecision === 'exact' ? input.date.arrivalDate : current.arrivalDate,
      datePrecision: input.date.datePrecision === 'exact' ? 'exact' : current.datePrecision,
    });
  }

  return updateStayFromInput(current.id, input, today);
}

export async function updateStayFromInput(
  id: string,
  input: StayInput,
  today: string,
): Promise<Stay> {
  const existing = await listStays();
  const current = existing.find((stay) => stay.id === id);
  if (!current) {
    throw new Error('Stay not found');
  }
  validateStayInput(input, today, existing, id);
  const stay = mapStayInputToStay(input, id, {
    createdAt: current.createdAt,
    updatedAt: nowIso(),
  });
  await applyForeignStayReconciliation(stay, today);
  return saveStay(stay, today);
}

/** @deprecated Use createStayFromInput for validated creation. */
export async function createStay(
  input: {
    countryCode: string;
    city?: string | null;
    arrivalDate?: string | null;
    departureDate?: string | null;
    datePrecision?: Stay['datePrecision'];
    approximatePeriod?: string | null;
    approximateDurationDays?: number | null;
    notes?: string | null;
    stillHere?: boolean;
  },
  today: string,
): Promise<Stay> {
  if (input.datePrecision && input.datePrecision !== 'exact') {
    return createStayFromInput(
      {
        countryCode: input.countryCode,
        city: input.city,
        notes: input.notes,
        date: {
          datePrecision: input.datePrecision,
          approximatePeriod: input.approximatePeriod ?? '',
          approximateDurationDays: input.approximateDurationDays ?? null,
        },
      },
      today,
    );
  }

  return createStayFromInput(
    {
      countryCode: input.countryCode,
      city: input.city,
      notes: input.notes,
      date: {
        datePrecision: 'exact',
        arrivalDate: input.arrivalDate ?? today,
        departureDate: input.stillHere ? null : input.departureDate ?? today,
        stillHere: input.stillHere ?? false,
      },
    },
    today,
  );
}

export async function deleteStay(id: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM stays WHERE id = ?', [id]);
}

export async function countMemoriesForStay(stayId: string): Promise<number> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM memory_records WHERE stay_id = ?',
    [stayId],
  );
  return row?.count ?? 0;
}

export async function countDocumentsForStay(_stayId: string): Promise<number> {
  return 0;
}

export { getStayGroupYear };
