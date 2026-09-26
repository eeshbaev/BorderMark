import type { AttachmentOwnerType } from '@/shared/types';

export const ATTACHMENTS_ROOT = 'attachments';
export const ALLOWED_ATTACHMENT_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
]);

export function attachmentRelativePath(attachmentId: string): string {
  return `${ATTACHMENTS_ROOT}/${attachmentId}`;
}

export function attachmentAbsolutePath(baseDir: string, attachmentId: string): string {
  const normalizedBase = baseDir.endsWith('/') ? baseDir : `${baseDir}/`;
  return `${normalizedBase}${ATTACHMENTS_ROOT}/${attachmentId}`;
}

export function isAllowedAttachmentMimeType(mimeType: string): boolean {
  return ALLOWED_ATTACHMENT_MIME_TYPES.has(mimeType);
}

export function inferMimeTypeFromFileName(fileName: string): string | null {
  const lower = fileName.toLowerCase();
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.webp')) return 'image/webp';
  if (lower.endsWith('.pdf')) return 'application/pdf';
  return null;
}

export const VALID_OWNER_TYPES: AttachmentOwnerType[] = [
  'stay',
  'place_visit',
  'memory_record',
  'note',
  'document',
];

export function isValidOwnerType(value: string): value is AttachmentOwnerType {
  return VALID_OWNER_TYPES.includes(value as AttachmentOwnerType);
}
