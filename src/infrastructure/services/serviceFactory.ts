import * as FileSystem from 'expo-file-system/legacy';

import { AttachmentService } from '@/domain/services/attachmentService';
import { DocumentService } from '@/domain/services/documentService';
import { NotificationReconciliationService } from '@/domain/notifications/notificationReconciliationService';
import { BackupRestoreService } from '@/infrastructure/backup/backupRestoreService';
import { createNotificationPort } from '@/infrastructure/notifications/createNotificationPort';
import { createBorderMarkPaths } from '@/infrastructure/storage/fileSystemPort';
import { ExpoFileSystemPort } from '@/infrastructure/storage/expoFileSystemPort';

let attachmentService: AttachmentService | null = null;
let backupRestoreService: BackupRestoreService | null = null;
let documentService: DocumentService | null = null;
let notificationService: NotificationReconciliationService | null = null;

function getPaths() {
  if (!FileSystem.documentDirectory || !FileSystem.cacheDirectory) {
    throw new Error('FileSystem directories unavailable.');
  }
  return createBorderMarkPaths(FileSystem.documentDirectory, FileSystem.cacheDirectory);
}

export function getAttachmentService(): AttachmentService {
  if (!attachmentService) {
    attachmentService = new AttachmentService(new ExpoFileSystemPort(), getPaths());
  }
  return attachmentService;
}

export function getBackupRestoreService(): BackupRestoreService {
  if (!backupRestoreService) {
    backupRestoreService = new BackupRestoreService(
      new ExpoFileSystemPort(),
      getPaths(),
      getAttachmentService(),
    );
  }
  return backupRestoreService;
}

export function getDocumentService(): DocumentService {
  if (!documentService) {
    documentService = new DocumentService(getAttachmentService());
  }
  return documentService;
}

export function getNotificationService(): NotificationReconciliationService {
  if (!notificationService) {
    notificationService = new NotificationReconciliationService(createNotificationPort());
  }
  return notificationService;
}
