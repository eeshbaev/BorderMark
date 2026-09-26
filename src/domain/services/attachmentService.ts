import {
  createAttachmentId,
  deleteAttachmentRecord,
  getAttachmentById,
  insertAttachment,
  listAttachments,
  listAttachmentsByOwner,
} from '@/data/repositories/attachmentRepository';
import { computeSha256Hex, verifySha256Hex } from '@/domain/utils/hash';
import { nowIso } from '@/domain/utils/dates';
import type { BorderMarkPaths, FileSystemPort } from '@/infrastructure/storage/fileSystemPort';
import {
  attachmentAbsolutePath,
  attachmentRelativePath,
  isAllowedAttachmentMimeType,
  isValidOwnerType,
} from '@/infrastructure/storage/paths';
import type { Attachment, AttachmentOwnerType, OrphanReport } from '@/shared/types';

export class AttachmentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AttachmentError';
  }
}

export class AttachmentService {
  constructor(
    private readonly fs: FileSystemPort,
    private readonly paths: BorderMarkPaths,
  ) {}

  async ensureStorageReady(): Promise<void> {
    await this.fs.makeDirectory(this.paths.attachmentsDirectory);
  }

  private liveFilePath(id: string): string {
    return `${this.paths.attachmentsDirectory}${id}`;
  }

  async importAttachment(input: {
    sourceUri: string;
    fileName: string;
    mimeType: string;
    ownerType: AttachmentOwnerType;
    ownerId: string;
    category?: import('@/shared/types').StayAttachmentCategory | null;
  }): Promise<Attachment> {
    if (!isValidOwnerType(input.ownerType)) {
      throw new AttachmentError('Invalid attachment owner type.');
    }
    if (!isAllowedAttachmentMimeType(input.mimeType)) {
      throw new AttachmentError('Only images and PDF files are supported in V1.');
    }

    await this.ensureStorageReady();
    const id = createAttachmentId();
    const destination = this.liveFilePath(id);
    await this.fs.copyFile(input.sourceUri, destination);

    const bytes = await this.fs.readBytes(destination);
    const sha256 = computeSha256Hex(bytes);

    return insertAttachment({
      id,
      fileName: input.fileName,
      mimeType: input.mimeType,
      fileSize: bytes.length,
      sha256,
      localPath: attachmentRelativePath(id),
      ownerType: input.ownerType,
      ownerId: input.ownerId,
      category: input.category ?? null,
    });
  }

  async importAttachmentFromBytes(input: {
    fileName: string;
    mimeType: string;
    ownerType: AttachmentOwnerType;
    ownerId: string;
    bytes: Uint8Array;
    id?: string;
    createdAt?: string;
    updatedAt?: string;
  }): Promise<Attachment> {
    if (!isAllowedAttachmentMimeType(input.mimeType)) {
      throw new AttachmentError('Only images and PDF files are supported in V1.');
    }

    await this.ensureStorageReady();
    const id = input.id ?? createAttachmentId();
    const destination = this.liveFilePath(id);
    await this.fs.writeBytes(destination, input.bytes);
    const sha256 = computeSha256Hex(input.bytes);
    const timestamp = nowIso();

    return insertAttachment({
      id,
      fileName: input.fileName,
      mimeType: input.mimeType,
      fileSize: input.bytes.length,
      sha256,
      localPath: attachmentRelativePath(id),
      ownerType: input.ownerType,
      ownerId: input.ownerId,
      category: null,
      createdAt: input.createdAt ?? timestamp,
      updatedAt: input.updatedAt ?? timestamp,
    });
  }

  async getAttachmentContent(attachment: Attachment): Promise<Uint8Array> {
    const absolutePath = this.resolveAbsolutePath(attachment);
    const info = await this.fs.getInfo(absolutePath);
    if (!info.exists) {
      throw new AttachmentError(`Attachment file missing: ${attachment.id}`);
    }
    const bytes = await this.fs.readBytes(absolutePath);
    if (!verifySha256Hex(bytes, attachment.sha256)) {
      throw new AttachmentError(`Attachment integrity check failed: ${attachment.id}`);
    }
    return bytes;
  }

  async deleteAttachment(id: string): Promise<void> {
    const record = await getAttachmentById(id);
    if (!record) {
      return;
    }

    await deleteAttachmentRecord(id);
    const absolutePath = this.resolveAbsolutePath(record);
    try {
      await this.fs.delete(absolutePath);
    } catch {
      // Best-effort physical cleanup after DB delete.
    }
  }

  async listForOwner(ownerType: AttachmentOwnerType, ownerId: string): Promise<Attachment[]> {
    return listAttachmentsByOwner(ownerType, ownerId);
  }

  resolveAbsolutePath(attachment: Attachment): string {
    return this.liveFilePath(attachment.id);
  }

  async detectOrphans(): Promise<OrphanReport> {
    await this.ensureStorageReady();
    const records = await listAttachments();
    const recordIds = new Set(records.map((record) => record.id));

    let files: string[] = [];
    try {
      files = await this.fs.readDirectory(this.paths.attachmentsDirectory);
    } catch {
      files = [];
    }

    const filesWithoutRecords = files.filter((fileName) => !recordIds.has(fileName));
    const recordsWithoutFiles: string[] = [];

    for (const record of records) {
      const info = await this.fs.getInfo(this.resolveAbsolutePath(record));
      if (!info.exists) {
        recordsWithoutFiles.push(record.id);
      }
    }

    return { filesWithoutRecords, recordsWithoutFiles };
  }

  async verifyRecordIntegrity(attachment: Attachment): Promise<boolean> {
    try {
      await this.getAttachmentContent(attachment);
      return true;
    } catch {
      return false;
    }
  }

  async stageAttachmentBytes(id: string, bytes: Uint8Array): Promise<string> {
    const stagingPath = `${this.paths.restoreStagingDirectory}attachments/${id}`;
    await this.fs.makeDirectory(`${this.paths.restoreStagingDirectory}attachments/`);
    await this.fs.writeBytes(stagingPath, bytes);
    return stagingPath;
  }

  async activateStagedAttachment(id: string): Promise<void> {
    const staged = `${this.paths.restoreStagingDirectory}attachments/${id}`;
    const live = this.liveFilePath(id);
    await this.ensureStorageReady();
    const info = await this.fs.getInfo(staged);
    if (!info.exists) {
      throw new AttachmentError(`Staged attachment missing: ${id}`);
    }
    await this.fs.copyFile(staged, live);
  }
}

export async function getDeletionImpact(ownerType: AttachmentOwnerType, ownerId: string): Promise<{
  attachmentCount: number;
}> {
  const attachments = await listAttachmentsByOwner(ownerType, ownerId);
  return { attachmentCount: attachments.length };
}
