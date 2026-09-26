import { getDatabase } from '@/data/database/client';
import type { MemoryRecord } from '@/shared/types';
import { generateId, nowIso } from '@/domain/utils/dates';

type MemoryRow = {
  id: string;
  stay_id: string | null;
  place_visit_id: string | null;
  title: string | null;
  caption: string | null;
  memory_date: string | null;
  date_precision: MemoryRecord['datePrecision'];
  approximate_period: string | null;
  created_at: string;
  updated_at: string;
};

function mapMemory(row: MemoryRow): MemoryRecord {
  return {
    id: row.id,
    stayId: row.stay_id,
    placeVisitId: row.place_visit_id,
    title: row.title,
    caption: row.caption,
    memoryDate: row.memory_date,
    datePrecision: row.date_precision,
    approximatePeriod: row.approximate_period,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listMemoryRecords(): Promise<MemoryRecord[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<MemoryRow>(
    'SELECT * FROM memory_records ORDER BY COALESCE(memory_date, approximate_period) DESC, created_at DESC',
  );
  return rows.map(mapMemory);
}

export async function getMemoryRecordById(id: string): Promise<MemoryRecord | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<MemoryRow>('SELECT * FROM memory_records WHERE id = ?', [id]);
  return row ? mapMemory(row) : null;
}

export async function createMemoryRecord(input: {
  stayId?: string | null;
  placeVisitId?: string | null;
  title?: string | null;
  caption?: string | null;
  memoryDate?: string | null;
  datePrecision?: MemoryRecord['datePrecision'];
  approximatePeriod?: string | null;
}): Promise<MemoryRecord> {
  const db = await getDatabase();
  const timestamp = nowIso();
  const memory: MemoryRecord = {
    id: generateId(),
    stayId: input.stayId ?? null,
    placeVisitId: input.placeVisitId ?? null,
    title: input.title ?? null,
    caption: input.caption ?? null,
    memoryDate: input.memoryDate ?? null,
    datePrecision: input.datePrecision ?? 'exact',
    approximatePeriod: input.approximatePeriod ?? null,
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  await db.runAsync(
    `INSERT INTO memory_records (
      id, stay_id, place_visit_id, title, caption, memory_date, date_precision, approximate_period, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      memory.id,
      memory.stayId,
      memory.placeVisitId,
      memory.title,
      memory.caption,
      memory.memoryDate,
      memory.datePrecision,
      memory.approximatePeriod,
      memory.createdAt,
      memory.updatedAt,
    ],
  );

  return memory;
}
