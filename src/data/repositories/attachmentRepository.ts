import { v4 as uuidv4 } from 'uuid';

import { getDatabase } from '@/data/database/client';
import type { Attachment, AttachmentOwnerType } from '@/shared/types';
import { nowIso } from '@/domain/utils/dates';

type AttachmentRow = {
  id: string;
  file_name: string;
  mime_type: string;
  file_size: number;
  sha256: string;
  local_path: string;
  owner_type: AttachmentOwnerType;
  owner_id: string;
  category: string | null;
  created_at: string;
  updated_at: string;
};

function mapAttachment(row: AttachmentRow): Attachment {
  return {
    id: row.id,
    fileName: row.file_name,
    mimeType: row.mime_type,
    fileSize: row.file_size,
    sha256: row.sha256,
    localPath: row.local_path,
    ownerType: row.owner_type,
    ownerId: row.owner_id,
    category: row.category as Attachment['category'],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listAttachments(): Promise<Attachment[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<AttachmentRow>('SELECT * FROM attachments ORDER BY created_at DESC');
  return rows.map(mapAttachment);
}

export async function listAttachmentsByOwner(
  ownerType: AttachmentOwnerType,
  ownerId: string,
): Promise<Attachment[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<AttachmentRow>(
    'SELECT * FROM attachments WHERE owner_type = ? AND owner_id = ? ORDER BY created_at DESC',
    [ownerType, ownerId],
  );
  return rows.map(mapAttachment);
}

export async function getAttachmentById(id: string): Promise<Attachment | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<AttachmentRow>('SELECT * FROM attachments WHERE id = ?', [id]);
  return row ? mapAttachment(row) : null;
}

export async function insertAttachment(
  record: Omit<Attachment, 'createdAt' | 'updatedAt'> & Partial<Pick<Attachment, 'createdAt' | 'updatedAt'>>,
): Promise<Attachment> {
  const db = await getDatabase();
  const timestamp = nowIso();
  const next: Attachment = {
    ...record,
    createdAt: record.createdAt ?? timestamp,
    updatedAt: record.updatedAt ?? timestamp,
  } as Attachment;

  await db.runAsync(
    `INSERT INTO attachments (
      id, file_name, mime_type, file_size, sha256, local_path, owner_type, owner_id, category, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      next.id,
      next.fileName,
      next.mimeType,
      next.fileSize,
      next.sha256,
      next.localPath,
      next.ownerType,
      next.ownerId,
      next.category,
      next.createdAt,
      next.updatedAt,
    ],
  );

  return next;
}

export async function deleteAttachmentRecord(id: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM attachments WHERE id = ?', [id]);
}

export async function deleteAttachmentsByOwner(
  ownerType: AttachmentOwnerType,
  ownerId: string,
): Promise<Attachment[]> {
  const attachments = await listAttachmentsByOwner(ownerType, ownerId);
  const db = await getDatabase();
  await db.runAsync('DELETE FROM attachments WHERE owner_type = ? AND owner_id = ?', [ownerType, ownerId]);
  return attachments;
}

export async function upsertAttachment(record: Attachment): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `INSERT INTO attachments (
      id, file_name, mime_type, file_size, sha256, local_path, owner_type, owner_id, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      file_name = excluded.file_name,
      mime_type = excluded.mime_type,
      file_size = excluded.file_size,
      sha256 = excluded.sha256,
      local_path = excluded.local_path,
      owner_type = excluded.owner_type,
      owner_id = excluded.owner_id,
      updated_at = excluded.updated_at`,
    [
      record.id,
      record.fileName,
      record.mimeType,
      record.fileSize,
      record.sha256,
      record.localPath,
      record.ownerType,
      record.ownerId,
      record.createdAt,
      record.updatedAt,
    ],
  );
}

export function createAttachmentId(): string {
  return uuidv4();
}

export async function countAttachmentsByOwner(
  ownerType: AttachmentOwnerType,
  ownerId: string,
): Promise<number> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM attachments WHERE owner_type = ? AND owner_id = ?',
    [ownerType, ownerId],
  );
  return row?.count ?? 0;
}
