import { getDatabase } from '@/data/database/client';
import {
  dedupeCityNamesPreserveOrder,
  primaryCityFromList,
  secondaryCitiesFromList,
} from '@/domain/services/stayCities';
import type { PlaceVisit } from '@/shared/types';
import { generateId, nowIso } from '@/domain/utils/dates';

type PlaceVisitRow = {
  id: string;
  stay_id: string;
  name: string;
  visit_date: string | null;
  date_precision: PlaceVisit['datePrecision'];
  approximate_period: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

function mapPlaceVisit(row: PlaceVisitRow): PlaceVisit {
  return {
    id: row.id,
    stayId: row.stay_id,
    name: row.name,
    visitDate: row.visit_date,
    datePrecision: row.date_precision,
    approximatePeriod: row.approximate_period,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listPlaceVisits(): Promise<PlaceVisit[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<PlaceVisitRow>(
    'SELECT * FROM place_visits ORDER BY COALESCE(visit_date, approximate_period) DESC, name ASC',
  );
  return rows.map(mapPlaceVisit);
}

export async function listPlaceVisitsForStay(stayId: string): Promise<PlaceVisit[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<PlaceVisitRow>(
    'SELECT * FROM place_visits WHERE stay_id = ? ORDER BY COALESCE(visit_date, approximate_period) DESC, name ASC',
    [stayId],
  );
  return rows.map(mapPlaceVisit);
}

export async function getPlaceVisitById(id: string): Promise<PlaceVisit | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<PlaceVisitRow>('SELECT * FROM place_visits WHERE id = ?', [id]);
  return row ? mapPlaceVisit(row) : null;
}

export async function createPlaceVisit(input: {
  stayId: string;
  name: string;
  visitDate?: string | null;
  datePrecision?: PlaceVisit['datePrecision'];
  approximatePeriod?: string | null;
  notes?: string | null;
}): Promise<PlaceVisit> {
  const db = await getDatabase();
  const timestamp = nowIso();
  const id = generateId();
  const visit: PlaceVisit = {
    id,
    stayId: input.stayId,
    name: input.name,
    visitDate: input.visitDate ?? null,
    datePrecision: input.datePrecision ?? 'exact',
    approximatePeriod: input.approximatePeriod ?? null,
    notes: input.notes ?? null,
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  await db.runAsync(
    `INSERT INTO place_visits (
      id, stay_id, name, visit_date, date_precision, approximate_period, notes, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      visit.id,
      visit.stayId,
      visit.name,
      visit.visitDate,
      visit.datePrecision,
      visit.approximatePeriod,
      visit.notes,
      visit.createdAt,
      visit.updatedAt,
    ],
  );

  return visit;
}

export async function deletePlaceVisit(id: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM place_visits WHERE id = ?', [id]);
}

/** Persists an ordered city list: last city on the stay, earlier cities as place visits. */
export async function syncStayCityList(
  stayId: string,
  cities: string[],
  visitDate: string | null,
): Promise<void> {
  const normalized = dedupeCityNamesPreserveOrder(cities);
  const primary = primaryCityFromList(normalized);
  const secondary = secondaryCitiesFromList(normalized);
  const db = await getDatabase();

  await db.runAsync('UPDATE stays SET city = ?, updated_at = ? WHERE id = ?', [primary, nowIso(), stayId]);

  const existing = await listPlaceVisitsForStay(stayId);
  const secondaryKeys = new Set(secondary.map((name) => name.toLowerCase()));

  for (const place of existing) {
    if (!secondaryKeys.has(place.name.trim().toLowerCase())) {
      await deletePlaceVisit(place.id);
    }
  }

  const refreshed = await listPlaceVisitsForStay(stayId);
  const existingKeys = new Set(refreshed.map((place) => place.name.trim().toLowerCase()));

  for (const name of secondary) {
    if (!existingKeys.has(name.toLowerCase())) {
      await createPlaceVisit({ stayId, name, visitDate });
    }
  }
}
