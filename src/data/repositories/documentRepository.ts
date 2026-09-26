import { getDatabase } from '@/data/database/client';
import type { Document, DocumentType } from '@/shared/types';
import { generateId, nowIso } from '@/domain/utils/dates';

type DocumentRow = {
  id: string;
  title: string;
  document_type: DocumentType;
  issue_date: string | null;
  expiry_date: string | null;
  issuing_country: string | null;
  document_number: string | null;
  notes: string | null;
  linked_stay_id: string | null;
  max_stay_days: number | null;
  max_entries: number | null;
  created_at: string;
  updated_at: string;
};

function mapDocument(row: DocumentRow): Document {
  return {
    id: row.id,
    title: row.title,
    documentType: row.document_type,
    issueDate: row.issue_date,
    expiryDate: row.expiry_date,
    issuingCountry: row.issuing_country,
    documentNumber: row.document_number,
    notes: row.notes,
    linkedStayId: row.linked_stay_id,
    maxStayDays: row.max_stay_days,
    maxEntries: row.max_entries,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listDocuments(): Promise<Document[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<DocumentRow>(
    'SELECT * FROM documents ORDER BY expiry_date IS NULL, expiry_date ASC, title ASC',
  );
  return rows.map(mapDocument);
}

export async function getDocumentById(id: string): Promise<Document | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<DocumentRow>('SELECT * FROM documents WHERE id = ?', [id]);
  return row ? mapDocument(row) : null;
}

export async function saveDocument(
  document: Omit<Document, 'createdAt' | 'updatedAt'> & Partial<Pick<Document, 'createdAt' | 'updatedAt'>>,
): Promise<Document> {
  const db = await getDatabase();
  const next: Document = {
    ...document,
    createdAt: document.createdAt ?? nowIso(),
    updatedAt: nowIso(),
  } as Document;

  await db.runAsync(
    `INSERT INTO documents (
      id, title, document_type, issue_date, expiry_date, issuing_country, document_number, notes,
      linked_stay_id, max_stay_days, max_entries, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      title = excluded.title,
      document_type = excluded.document_type,
      issue_date = excluded.issue_date,
      expiry_date = excluded.expiry_date,
      issuing_country = excluded.issuing_country,
      document_number = excluded.document_number,
      notes = excluded.notes,
      linked_stay_id = excluded.linked_stay_id,
      max_stay_days = excluded.max_stay_days,
      max_entries = excluded.max_entries,
      updated_at = excluded.updated_at`,
    [
      next.id,
      next.title,
      next.documentType,
      next.issueDate,
      next.expiryDate,
      next.issuingCountry,
      next.documentNumber,
      next.notes,
      next.linkedStayId ?? null,
      next.maxStayDays ?? null,
      next.maxEntries ?? null,
      next.createdAt,
      next.updatedAt,
    ],
  );

  return next;
}

export async function createDocument(
  input: Omit<Document, 'id' | 'createdAt' | 'updatedAt'>,
): Promise<Document> {
  return saveDocument({ ...input, id: generateId() });
}

export async function deleteDocument(id: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM documents WHERE id = ?', [id]);
}

export function documentCategory(documentType: DocumentType): 'IDENTITY' | 'IMMIGRATION' | 'OTHER' {
  if (documentType === 'passport' || documentType === 'drivers_license') {
    return 'IDENTITY';
  }
  if (documentType === 'visa' || documentType === 'residence_permit') {
    return 'IMMIGRATION';
  }
  return 'OTHER';
}

export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  passport: 'Passport',
  visa: 'Visa',
  residence_permit: 'Residence permit',
  drivers_license: "Driver's license",
  insurance: 'Insurance',
  other: 'Other',
};
