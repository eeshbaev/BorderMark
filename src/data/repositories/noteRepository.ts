import { getDatabase } from '@/data/database/client';
import type { Note } from '@/shared/types';
import { generateId, nowIso } from '@/domain/utils/dates';

type NoteRow = {
  id: string;
  stay_id: string | null;
  place_visit_id: string | null;
  memory_record_id: string | null;
  title: string | null;
  content: string;
  note_date: string | null;
  created_at: string;
  updated_at: string;
};

function mapNote(row: NoteRow): Note {
  return {
    id: row.id,
    stayId: row.stay_id,
    placeVisitId: row.place_visit_id,
    memoryRecordId: row.memory_record_id,
    title: row.title,
    content: row.content,
    noteDate: row.note_date,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listNotes(): Promise<Note[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<NoteRow>(
    'SELECT * FROM notes ORDER BY COALESCE(note_date, created_at) DESC',
  );
  return rows.map(mapNote);
}

export async function getNoteById(id: string): Promise<Note | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<NoteRow>('SELECT * FROM notes WHERE id = ?', [id]);
  return row ? mapNote(row) : null;
}

export async function createNote(input: {
  stayId?: string | null;
  placeVisitId?: string | null;
  memoryRecordId?: string | null;
  title?: string | null;
  content: string;
  noteDate?: string | null;
}): Promise<Note> {
  const db = await getDatabase();
  const timestamp = nowIso();
  const note: Note = {
    id: generateId(),
    stayId: input.stayId ?? null,
    placeVisitId: input.placeVisitId ?? null,
    memoryRecordId: input.memoryRecordId ?? null,
    title: input.title ?? null,
    content: input.content,
    noteDate: input.noteDate ?? null,
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  await db.runAsync(
    `INSERT INTO notes (
      id, stay_id, place_visit_id, memory_record_id, title, content, note_date, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      note.id,
      note.stayId,
      note.placeVisitId,
      note.memoryRecordId,
      note.title,
      note.content,
      note.noteDate,
      note.createdAt,
      note.updatedAt,
    ],
  );

  return note;
}
