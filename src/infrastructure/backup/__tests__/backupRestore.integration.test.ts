import { AttachmentService } from '@/domain/services/attachmentService';
import { emptyBackupDataset } from '@/domain/services/backupMergeService';
import { computeSha256Hex } from '@/domain/utils/hash';
import { BackupRestoreService } from '@/infrastructure/backup/backupRestoreService';
import { buildEncryptedBackupFile } from '@/infrastructure/backup/backupFormat';
import { createBorderMarkPaths } from '@/infrastructure/storage/fileSystemPort';
import { MemoryFileSystemPort } from '@/infrastructure/storage/memoryFileSystemPort';
import type { Attachment, BackupDataset } from '@/shared/types';

const password = 'integration-test-password';

jest.mock('@/data/database/client', () => ({
  closeDatabase: jest.fn(async () => undefined),
}));

jest.mock('@/data/repositories/backupDataAccess', () => ({
  exportCurrentDataset: jest.fn(),
  upsertDataset: jest.fn(),
  replaceDataset: jest.fn(),
  setRestoreMetadata: jest.fn(),
  getRestoreMetadata: jest.fn(async () => null),
  RESTORE_IN_PROGRESS_KEY: 'restore_in_progress',
  SAFETY_SNAPSHOT_PATH_KEY: 'safety_snapshot_path',
  RESTORE_STAGING_PATH_KEY: 'restore_staging_path',
}));

jest.mock('@/data/repositories/attachmentRepository', () => ({
  createAttachmentId: jest.fn((id?: string) => id ?? '11111111-1111-4111-8111-111111111111'),
  insertAttachment: jest.fn(async (record: Attachment) => record),
  getAttachmentById: jest.fn(),
  listAttachments: jest.fn(async () => []),
  listAttachmentsByOwner: jest.fn(),
  deleteAttachmentRecord: jest.fn(),
  upsertAttachment: jest.fn(),
  deleteAttachmentsByOwner: jest.fn(),
  countAttachmentsByOwner: jest.fn(),
}));

const backupDataAccess = jest.requireMock('@/data/repositories/backupDataAccess') as {
  exportCurrentDataset: jest.Mock;
  upsertDataset: jest.Mock;
  replaceDataset: jest.Mock;
  setRestoreMetadata: jest.Mock;
  getRestoreMetadata: jest.Mock;
};

function datasetWithAttachment(): { dataset: BackupDataset; bytes: Uint8Array } {
  const dataset = emptyBackupDataset('2026-09-08T00:00:00.000Z');
  dataset.documents = [
    {
      id: 'doc-1',
      title: 'Passport',
      documentType: 'passport',
      issueDate: null,
      expiryDate: '2027-05-12',
      issuingCountry: 'UZ',
      documentNumber: null,
      notes: null,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
  ];
  const fileBytes = new TextEncoder().encode('%PDF-1.4 border-mark');
  dataset.attachments = [
    {
      id: 'att-1',
      fileName: 'passport.pdf',
      mimeType: 'application/pdf',
      fileSize: fileBytes.length,
      sha256: computeSha256Hex(fileBytes),
      localPath: 'attachments/att-1',
      ownerType: 'document',
      ownerId: 'doc-1',
      category: null,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
  ];
  return { dataset, bytes: fileBytes };
}

describe('BackupRestoreService integration', () => {
  const fs = new MemoryFileSystemPort();
  const paths = createBorderMarkPaths('/docs/', '/cache/');
  const attachmentService = new AttachmentService(fs, paths);
  const service = new BackupRestoreService(fs, paths, attachmentService);

  beforeEach(() => {
    fs.reset();
    jest.clearAllMocks();
    backupDataAccess.exportCurrentDataset.mockResolvedValue(emptyBackupDataset('2026-01-01T00:00:00.000Z'));
    backupDataAccess.upsertDataset.mockResolvedValue(undefined);
    backupDataAccess.replaceDataset.mockResolvedValue(undefined);
    backupDataAccess.getRestoreMetadata.mockResolvedValue(null);
  });

  it('creates encrypted backup with attachment binary sections', async () => {
    const { dataset, bytes } = datasetWithAttachment();
    backupDataAccess.exportCurrentDataset.mockResolvedValue(dataset);
    await fs.writeBytes(`${paths.attachmentsDirectory}att-1`, bytes);
    await fs.makeDirectory(paths.attachmentsDirectory);

    const output = await service.createBackup(password);
    const backupBytes = await fs.readBytes(output);
    expect(backupBytes.length).toBeGreaterThan(100);
  });

  it('merge restore preserves stable attachment UUIDs', async () => {
    const { dataset, bytes } = datasetWithAttachment();
    const backupBytes = await buildEncryptedBackupFile(
      dataset,
      new Map([['att-1', bytes]]),
      password,
      'backup-1',
      '2026-09-08T00:00:00.000Z',
    );

    const summary = await service.mergeRestore(backupBytes, password);
    expect(summary.attachmentsRestored).toBe(1);
    expect(backupDataAccess.upsertDataset).toHaveBeenCalled();
    const activated = await fs.readBytes(`${paths.attachmentsDirectory}att-1`);
    expect(activated).toEqual(bytes);
  });

  it('replace restore rolls back live data when validation fails', async () => {
    const { dataset, bytes } = datasetWithAttachment();
    dataset.attachments[0].sha256 = 'deadbeef';
    const backupBytes = await buildEncryptedBackupFile(
      dataset,
      new Map([['att-1', bytes]]),
      password,
      'backup-1',
      '2026-09-08T00:00:00.000Z',
    );

    await fs.writeBytes(paths.databaseFilePath, new TextEncoder().encode('live-db'));
    await fs.writeBytes(`${paths.attachmentsDirectory}live-file`, new TextEncoder().encode('live-file'));

    await expect(service.replaceRestore(backupBytes, password)).rejects.toThrow();
    expect(backupDataAccess.replaceDataset).not.toHaveBeenCalled();
    await expect(fs.readBytes(paths.databaseFilePath)).resolves.toEqual(new TextEncoder().encode('live-db'));
  });

  it('replace restore activates only after successful validation', async () => {
    const { dataset, bytes } = datasetWithAttachment();
    const backupBytes = await buildEncryptedBackupFile(
      dataset,
      new Map([['att-1', bytes]]),
      password,
      'backup-1',
      '2026-09-08T00:00:00.000Z',
    );

    await fs.writeBytes(paths.databaseFilePath, new TextEncoder().encode('live-db'));
    const summary = await service.replaceRestore(backupBytes, password);
    expect(summary.mode).toBe('replace');
    expect(backupDataAccess.replaceDataset).toHaveBeenCalled();
    await expect(fs.readBytes(`${paths.attachmentsDirectory}att-1`)).resolves.toEqual(bytes);
  });

  it('recovers interrupted restore using safety snapshot metadata', async () => {
    backupDataAccess.getRestoreMetadata.mockImplementation(async (key: string) => {
      if (key === 'restore_in_progress') return 'replace';
      if (key === 'safety_snapshot_path') return `${paths.safetySnapshotsDirectory}123/`;
      return null;
    });
    await fs.writeBytes(`${paths.safetySnapshotsDirectory}123/bordermark.db`, new TextEncoder().encode('recovered-db'));

    const summary = await service.recoverInterruptedRestore();
    expect(summary?.warnings[0]).toContain('interrupted restore');
    await expect(fs.readBytes(paths.databaseFilePath)).resolves.toEqual(new TextEncoder().encode('recovered-db'));
  });
});
