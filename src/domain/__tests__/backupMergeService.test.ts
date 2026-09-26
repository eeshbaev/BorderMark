import {
  emptyBackupDataset,
  mergeBackupDatasets,
  validateAttachmentHashes,
  validateBackupDataset,
} from '@/domain/services/backupMergeService';
import { computeSha256Hex, verifySha256Hex } from '@/domain/utils/hash';
import type { Attachment, BackupDataset, Document, Stay } from '@/shared/types';

function stay(id: string, updatedAt: string): Stay {
  return {
    id,
    countryCode: 'UZ',
    city: null,
    arrivalDate: '2026-01-01',
    departureDate: null,
    datePrecision: 'exact',
    approximatePeriod: null,
    approximateDurationDays: null,
    stayType: null,
    visaNeeded: null,
    notes: null,
    createdAt: updatedAt,
    updatedAt,
  };
}

describe('backup merge service', () => {
  it('inserts backup-only records', () => {
    const current = emptyBackupDataset('2026-01-01T00:00:00.000Z');
    const incoming = emptyBackupDataset('2026-02-01T00:00:00.000Z');
    incoming.stays = [stay('stay-backup', '2026-02-01T00:00:00.000Z')];

    const result = mergeBackupDatasets(current, incoming);
    expect(result.dataset.stays).toHaveLength(1);
    expect(result.inserted).toBeGreaterThan(0);
  });

  it('keeps current-only records', () => {
    const current = emptyBackupDataset('2026-01-01T00:00:00.000Z');
    current.stays = [stay('stay-current', '2026-03-01T00:00:00.000Z')];
    const incoming = emptyBackupDataset('2026-02-01T00:00:00.000Z');

    const result = mergeBackupDatasets(current, incoming);
    expect(result.dataset.stays.map((item) => item.id)).toContain('stay-current');
  });

  it('uses newer updatedAt when both sides have the same id', () => {
    const current = emptyBackupDataset('2026-01-01T00:00:00.000Z');
    const incoming = emptyBackupDataset('2026-02-01T00:00:00.000Z');
    current.stays = [stay('stay-1', '2026-03-01T00:00:00.000Z')];
    incoming.stays = [stay('stay-1', '2026-04-01T00:00:00.000Z')];

    const result = mergeBackupDatasets(current, incoming);
    expect(result.updated).toBeGreaterThan(0);
    expect(result.dataset.stays[0].updatedAt).toBe('2026-04-01T00:00:00.000Z');
  });

  it('keeps current record when timestamps are equal', () => {
    const current = emptyBackupDataset('2026-01-01T00:00:00.000Z');
    const incoming = emptyBackupDataset('2026-02-01T00:00:00.000Z');
    current.stays = [{ ...stay('stay-1', '2026-03-01T00:00:00.000Z'), city: 'Tashkent' }];
    incoming.stays = [{ ...stay('stay-1', '2026-03-01T00:00:00.000Z'), city: 'Samarkand' }];

    const result = mergeBackupDatasets(current, incoming);
    expect(result.kept).toBeGreaterThan(0);
    expect(result.dataset.stays[0].city).toBe('Tashkent');
  });

  it('validates foreign keys', () => {
    const dataset = emptyBackupDataset('2026-01-01T00:00:00.000Z');
    dataset.attachments = [
      {
        id: 'att-1',
        fileName: 'passport.pdf',
        mimeType: 'application/pdf',
        fileSize: 1,
        sha256: 'abc',
        localPath: 'attachments/att-1',
        ownerType: 'document',
        ownerId: 'missing-doc',
        category: null,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
    ];

    expect(validateBackupDataset(dataset).join('\n')).toContain('missing owner');
  });

  it('validates attachment sha256 and missing files', () => {
    const dataset = emptyBackupDataset('2026-01-01T00:00:00.000Z');
    dataset.documents = [
      {
        id: 'doc-1',
        title: 'Passport',
        documentType: 'passport',
        issueDate: null,
        expiryDate: null,
        issuingCountry: null,
        documentNumber: null,
        notes: null,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      } satisfies Document,
    ];
    const bytes = new TextEncoder().encode('pdf');
    dataset.attachments = [
      {
        id: 'att-1',
        fileName: 'passport.pdf',
        mimeType: 'application/pdf',
        fileSize: bytes.length,
        sha256: computeSha256Hex(bytes),
        localPath: 'attachments/att-1',
        ownerType: 'document',
        ownerId: 'doc-1',
        category: null,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      } satisfies Attachment,
    ];

    expect(validateAttachmentHashes(dataset, new Map([['att-1', bytes]]), verifySha256Hex)).toHaveLength(0);
    expect(validateAttachmentHashes(dataset, new Map(), verifySha256Hex)[0]).toContain('Missing attachment file');
  });
});
