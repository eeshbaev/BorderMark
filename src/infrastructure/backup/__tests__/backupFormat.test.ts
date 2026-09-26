import {
  buildEncryptedBackupFile,
  extractBackupDataset,
  parseEncryptedBackupFile,
  parsePlaintextHeader,
} from '@/infrastructure/backup/backupFormat';
import { BACKUP_MAGIC, BACKUP_VERSION, SALT_BYTES } from '@/infrastructure/crypto/backupCrypto';
import { emptyBackupDataset } from '@/domain/services/backupMergeService';
import type { Attachment, BackupDataset, Document } from '@/shared/types';

const password = 'correct-horse-battery-staple';

function sampleDataset(): BackupDataset {
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
  dataset.attachments = [
    {
      id: 'att-1',
      fileName: 'passport.pdf',
      mimeType: 'application/pdf',
      fileSize: 11,
      sha256: 'dffd6021bb2bd5b0af676290809ec3a53191dd81c7f70a4b28688a362182986f',
      localPath: 'attachments/att-1',
      ownerType: 'document',
      ownerId: 'doc-1',
      category: null,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
  ];
  return dataset;
}

describe('backup format', () => {
  it('roundtrips encrypted backup with binary attachment sections', async () => {
    const dataset = sampleDataset();
    const pdfBytes = new TextEncoder().encode('hello world');
    const attachmentFiles = new Map([['att-1', pdfBytes]]);

    const fileBytes = await buildEncryptedBackupFile(
      dataset,
      attachmentFiles,
      password,
      'backup-1',
      '2026-09-08T00:00:00.000Z',
    );

    const parsed = await parseEncryptedBackupFile(fileBytes, password);
    const extracted = extractBackupDataset(parsed);

    expect(extracted.dataset.documents[0].title).toBe('Passport');
    expect(extracted.attachmentFiles.get('att-1')).toEqual(pdfBytes);
  });

  it('rejects wrong password safely', async () => {
    const dataset = emptyBackupDataset('2026-09-08T00:00:00.000Z');
    const fileBytes = await buildEncryptedBackupFile(
      dataset,
      new Map(),
      password,
      'backup-1',
      '2026-09-08T00:00:00.000Z',
    );

    await expect(parseEncryptedBackupFile(fileBytes, 'wrong-password')).rejects.toThrow(
      'Backup authentication failed',
    );
  });

  it('rejects tampered ciphertext', async () => {
    const dataset = emptyBackupDataset('2026-09-08T00:00:00.000Z');
    const fileBytes = await buildEncryptedBackupFile(
      dataset,
      new Map(),
      password,
      'backup-1',
      '2026-09-08T00:00:00.000Z',
    );
    fileBytes[fileBytes.length - 1] ^= 0xff;
    await expect(parseEncryptedBackupFile(fileBytes, password)).rejects.toThrow(
      'Backup authentication failed',
    );
  });

  it('rejects unknown format version', () => {
    const bytes = new Uint8Array(SALT_BYTES + 64);
    bytes.set(new TextEncoder().encode(BACKUP_MAGIC));
    bytes[4] = 99;
    expect(() => parsePlaintextHeader(bytes)).toThrow('Unsupported backup version');
  });

  it('uses 32-byte salt in header', async () => {
    const fileBytes = await buildEncryptedBackupFile(
      emptyBackupDataset('2026-09-08T00:00:00.000Z'),
      new Map(),
      password,
      'backup-1',
      '2026-09-08T00:00:00.000Z',
    );
    const parsed = parsePlaintextHeader(fileBytes);
    expect(parsed.header.salt.length).toBe(SALT_BYTES);
    expect(SALT_BYTES).toBe(32);
    expect(parsed.header.version).toBe(BACKUP_VERSION);
  });
});
