import { closeDatabase } from '@/data/database/client';
import {
  exportCurrentDataset,
  getRestoreMetadata,
  replaceDataset,
  RESTORE_IN_PROGRESS_KEY,
  RESTORE_STAGING_PATH_KEY,
  SAFETY_SNAPSHOT_PATH_KEY,
  setRestoreMetadata,
  upsertDataset,
} from '@/data/repositories/backupDataAccess';
import { mergeBackupDatasets, validateAttachmentHashes, validateBackupDataset } from '@/domain/services/backupMergeService';
import { verifySha256Hex } from '@/domain/utils/hash';
import { generateId, nowIso } from '@/domain/utils/dates';
import { AttachmentService } from '@/domain/services/attachmentService';
import {
  backupFileFromBase64,
  backupFileToBase64,
  buildEncryptedBackupFile,
  extractBackupDataset,
  parseEncryptedBackupFile,
} from '@/infrastructure/backup/backupFormat';
import type { BorderMarkPaths, FileSystemPort } from '@/infrastructure/storage/fileSystemPort';
import type { BackupDataset, RestoreSummary } from '@/shared/types';

export class BackupRestoreError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BackupRestoreError';
  }
}

export class BackupRestoreService {
  constructor(
    private readonly fs: FileSystemPort,
    private readonly paths: BorderMarkPaths,
    private readonly attachmentService: AttachmentService,
  ) {}

  async createBackup(password: string): Promise<string> {
    const dataset = await exportCurrentDataset();
    const attachmentFiles = new Map<string, Uint8Array>();

    for (const attachment of dataset.attachments) {
      const bytes = await this.attachmentService.getAttachmentContent(attachment);
      attachmentFiles.set(attachment.id, bytes);
    }

    const backupBytes = await buildEncryptedBackupFile(
      dataset,
      attachmentFiles,
      password,
      generateId(),
      nowIso(),
    );

    const outputPath = `${this.paths.cacheDirectory}bordermark-${Date.now()}.bm`;
    await this.fs.writeBytes(outputPath, backupBytes);
    return outputPath;
  }

  async readBackupFromPath(path: string): Promise<Uint8Array> {
    return this.fs.readBytes(path);
  }

  async stageBackupFromBytes(bytes: Uint8Array, password: string): Promise<{
    dataset: BackupDataset;
    attachmentFiles: Map<string, Uint8Array>;
  }> {
    const parsed = await parseEncryptedBackupFile(bytes, password);
    const extracted = extractBackupDataset(parsed);

    const fkErrors = validateBackupDataset(extracted.dataset);
    if (fkErrors.length > 0) {
      throw new BackupRestoreError(fkErrors.join('\n'));
    }

    const hashErrors = validateAttachmentHashes(
      extracted.dataset,
      extracted.attachmentFiles,
      verifySha256Hex,
    );
    if (hashErrors.length > 0) {
      throw new BackupRestoreError(hashErrors.join('\n'));
    }

    await this.fs.makeDirectory(this.paths.restoreStagingDirectory);
    await this.fs.makeDirectory(`${this.paths.restoreStagingDirectory}attachments/`);
    for (const [attachmentId, fileBytes] of extracted.attachmentFiles) {
      await this.attachmentService.stageAttachmentBytes(attachmentId, fileBytes);
    }

    await setRestoreMetadata(RESTORE_STAGING_PATH_KEY, this.paths.restoreStagingDirectory);
    return extracted;
  }

  async mergeRestore(bytes: Uint8Array, password: string): Promise<RestoreSummary> {
    const current = await exportCurrentDataset();
    const staged = await this.stageBackupFromBytes(bytes, password);
    const merged = mergeBackupDatasets(current, staged.dataset);

    const fkErrors = validateBackupDataset(merged.dataset);
    if (fkErrors.length > 0) {
      throw new BackupRestoreError(fkErrors.join('\n'));
    }

    await setRestoreMetadata(RESTORE_IN_PROGRESS_KEY, 'merge');
    try {
      await upsertDataset(merged.dataset);
      let attachmentsRestored = 0;
      for (const attachment of staged.dataset.attachments) {
        const currentAttachment = current.attachments.find((item) => item.id === attachment.id);
        if (!currentAttachment || attachment.updatedAt > currentAttachment.updatedAt) {
          await this.attachmentService.activateStagedAttachment(attachment.id);
          attachmentsRestored += 1;
        }
      }

      const summary: RestoreSummary = {
        mode: 'merge',
        inserted: merged.inserted,
        updated: merged.updated,
        kept: merged.kept,
        attachmentsRestored,
        warnings: [
          'Merge may resurrect records deleted after the backup was created because V1 does not use deletion tombstones.',
        ],
      };

      await this.clearRestoreState();
      return summary;
    } catch (error) {
      await setRestoreMetadata(RESTORE_IN_PROGRESS_KEY, null);
      throw error;
    }
  }

  async replaceRestore(bytes: Uint8Array, password: string): Promise<RestoreSummary> {
    const safetySnapshotPath = await this.createSafetySnapshot();
    await setRestoreMetadata(SAFETY_SNAPSHOT_PATH_KEY, safetySnapshotPath);
    await setRestoreMetadata(RESTORE_IN_PROGRESS_KEY, 'replace');

    try {
      const staged = await this.stageBackupFromBytes(bytes, password);
      await replaceDataset(staged.dataset);

      await this.fs.makeDirectory(this.paths.attachmentsDirectory);
      const existingFiles = await this.safeReadDirectory(this.paths.attachmentsDirectory);
      for (const fileName of existingFiles) {
        await this.fs.delete(`${this.paths.attachmentsDirectory}${fileName}`);
      }

      for (const attachment of staged.dataset.attachments) {
        await this.attachmentService.activateStagedAttachment(attachment.id);
      }

      await this.clearRestoreState();
      await this.fs.delete(safetySnapshotPath);

      return {
        mode: 'replace',
        inserted: staged.dataset.stays.length + staged.dataset.documents.length,
        updated: 0,
        kept: 0,
        attachmentsRestored: staged.dataset.attachments.length,
        warnings: [],
      };
    } catch (error) {
      await this.recoverFromSafetySnapshot(safetySnapshotPath);
      await this.clearRestoreState();
      throw error;
    }
  }

  async createSafetySnapshot(): Promise<string> {
    const snapshotPath = `${this.paths.safetySnapshotsDirectory}${Date.now()}/`;
    await this.fs.makeDirectory(snapshotPath);

    const dbCopied = await this.safeCopy(this.paths.databaseFilePath, `${snapshotPath}bordermark.db`);
    if (!dbCopied) {
      throw new BackupRestoreError('Safety snapshot could not copy the live database.');
    }

    const attachmentsInfo = await this.fs.getInfo(this.paths.attachmentsDirectory);
    if (attachmentsInfo.exists) {
      await this.fs.makeDirectory(`${snapshotPath}attachments/`);
      const files = await this.safeReadDirectory(this.paths.attachmentsDirectory);
      for (const fileName of files) {
        await this.fs.copyFile(
          `${this.paths.attachmentsDirectory}${fileName}`,
          `${snapshotPath}attachments/${fileName}`,
        );
      }
    }

    return snapshotPath;
  }

  async recoverInterruptedRestore(): Promise<RestoreSummary | null> {
    const inProgress = await getRestoreMetadata(RESTORE_IN_PROGRESS_KEY);
    if (!inProgress) {
      return null;
    }

    const safetySnapshotPath = await getRestoreMetadata(SAFETY_SNAPSHOT_PATH_KEY);
    let databaseFileReplaced = false;
    if (safetySnapshotPath) {
      await this.recoverFromSafetySnapshot(safetySnapshotPath);
      databaseFileReplaced = true;
    }

    await this.clearRestoreState();
    return {
      mode: 'replace',
      inserted: 0,
      updated: 0,
      kept: 0,
      attachmentsRestored: 0,
      databaseFileReplaced,
      warnings: ['An interrupted restore was detected. Your previous live dataset was preserved.'],
    };
  }

  private async recoverFromSafetySnapshot(snapshotPath: string): Promise<void> {
    await closeDatabase();
    const dbSnapshot = `${snapshotPath}bordermark.db`;
    const dbInfo = await this.fs.getInfo(dbSnapshot);
    if (dbInfo.exists) {
      await this.fs.copyFile(dbSnapshot, this.paths.databaseFilePath);
    }

    const attachmentsSnapshot = `${snapshotPath}attachments/`;
    const attachmentsInfo = await this.fs.getInfo(attachmentsSnapshot);
    if (attachmentsInfo.exists) {
      await this.fs.makeDirectory(this.paths.attachmentsDirectory);
      const files = await this.safeReadDirectory(attachmentsSnapshot);
      for (const fileName of files) {
        await this.fs.copyFile(
          `${attachmentsSnapshot}${fileName}`,
          `${this.paths.attachmentsDirectory}${fileName}`,
        );
      }
    }
  }

  private async clearRestoreState(): Promise<void> {
    await setRestoreMetadata(RESTORE_IN_PROGRESS_KEY, null);
    await setRestoreMetadata(SAFETY_SNAPSHOT_PATH_KEY, null);
    await setRestoreMetadata(RESTORE_STAGING_PATH_KEY, null);
    await this.fs.delete(this.paths.restoreStagingDirectory);
  }

  private async safeReadDirectory(path: string): Promise<string[]> {
    try {
      return await this.fs.readDirectory(path);
    } catch {
      return [];
    }
  }

  private async safeCopy(from: string, to: string): Promise<boolean> {
    const info = await this.fs.getInfo(from);
    if (!info.exists) {
      return false;
    }
    await this.fs.copyFile(from, to);
    return true;
  }
}

export { backupFileToBase64, backupFileFromBase64 };
