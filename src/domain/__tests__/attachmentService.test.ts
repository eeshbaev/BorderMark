import { AttachmentService } from '@/domain/services/attachmentService';
import { computeSha256Hex, verifySha256Hex } from '@/domain/utils/hash';
import { createBorderMarkPaths } from '@/infrastructure/storage/fileSystemPort';
import { MemoryFileSystemPort } from '@/infrastructure/storage/memoryFileSystemPort';
import type { Attachment } from '@/shared/types';

jest.mock('@/data/repositories/attachmentRepository', () => ({
  createAttachmentId: jest.fn(() => '11111111-1111-4111-8111-111111111111'),
  insertAttachment: jest.fn(async (record: Attachment) => record),
  getAttachmentById: jest.fn(async (id: string) => store.find((item) => item.id === id) ?? null),
  listAttachments: jest.fn(async () => store),
  listAttachmentsByOwner: jest.fn(),
  deleteAttachmentRecord: jest.fn(async (id: string) => {
    store = store.filter((item) => item.id !== id);
  }),
  upsertAttachment: jest.fn(),
  deleteAttachmentsByOwner: jest.fn(),
  countAttachmentsByOwner: jest.fn(),
}));

let store: Attachment[] = [];

describe('hash utils', () => {
  it('computes stable sha256 hex', () => {
    const hash = computeSha256Hex(new TextEncoder().encode('border-mark'));
    expect(hash).toHaveLength(64);
    expect(verifySha256Hex(new TextEncoder().encode('border-mark'), hash)).toBe(true);
  });
});

describe('AttachmentService', () => {
  const fs = new MemoryFileSystemPort();
  const paths = createBorderMarkPaths('/docs/', '/cache/');
  const service = new AttachmentService(fs, paths);

  beforeEach(() => {
    fs.reset();
    store = [];
  });

  it('imports bytes into controlled storage with sha256', async () => {
    const bytes = new TextEncoder().encode('pdf-content');
    await fs.writeBytes('/source/passport.pdf', bytes);

    const attachment = await service.importAttachmentFromBytes({
      fileName: 'passport.pdf',
      mimeType: 'application/pdf',
      ownerType: 'document',
      ownerId: 'doc-1',
      bytes,
    });

    expect(attachment.sha256).toBe(computeSha256Hex(bytes));
    expect(attachment.localPath).toBe('attachments/11111111-1111-4111-8111-111111111111');
    const stored = await fs.readBytes(service.resolveAbsolutePath(attachment));
    expect(stored).toEqual(bytes);
  });

  it('deletes db record before best-effort file cleanup', async () => {
    const bytes = new TextEncoder().encode('image-data');
    const attachment = await service.importAttachmentFromBytes({
      fileName: 'scan.png',
      mimeType: 'image/png',
      ownerType: 'document',
      ownerId: 'doc-1',
      bytes,
    });
    store.push(attachment);

    await service.deleteAttachment(attachment.id);
    expect(store).toHaveLength(0);
    await expect(fs.getInfo(service.resolveAbsolutePath(attachment))).resolves.toEqual({ exists: false });
  });

  it('detects orphan files and orphan records', async () => {
    const attachment = await service.importAttachmentFromBytes({
      fileName: 'passport.pdf',
      mimeType: 'application/pdf',
      ownerType: 'document',
      ownerId: 'doc-1',
      bytes: new TextEncoder().encode('pdf'),
    });
    store.push(attachment);
    await fs.writeBytes(`${paths.attachmentsDirectory}orphan-file`, new Uint8Array([1, 2, 3]));

    const report = await service.detectOrphans();
    expect(report.filesWithoutRecords).toContain('orphan-file');

    await fs.delete(service.resolveAbsolutePath(attachment));
    const missingReport = await service.detectOrphans();
    expect(missingReport.recordsWithoutFiles).toContain(attachment.id);
  });

  it('rejects unsupported mime types', async () => {
    await expect(
      service.importAttachmentFromBytes({
        fileName: 'notes.txt',
        mimeType: 'text/plain',
        ownerType: 'document',
        ownerId: 'doc-1',
        bytes: new TextEncoder().encode('hello'),
      }),
    ).rejects.toThrow('Only images and PDF files are supported');
  });

  it('detects missing-file integrity failures', async () => {
    const attachment = await service.importAttachmentFromBytes({
      fileName: 'passport.pdf',
      mimeType: 'application/pdf',
      ownerType: 'document',
      ownerId: 'doc-1',
      bytes: new TextEncoder().encode('pdf'),
    });
    await fs.delete(service.resolveAbsolutePath(attachment));
    await expect(service.verifyRecordIntegrity(attachment)).resolves.toBe(false);
  });
});
