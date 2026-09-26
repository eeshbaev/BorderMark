export interface FileInfo {
  exists: boolean;
  size?: number;
  isDirectory?: boolean;
}

export interface FileSystemPort {
  readDirectory(path: string): Promise<string[]>;
  getInfo(path: string): Promise<FileInfo>;
  makeDirectory(path: string): Promise<void>;
  copyFile(from: string, to: string): Promise<void>;
  moveFile(from: string, to: string): Promise<void>;
  delete(path: string): Promise<void>;
  readBytes(path: string): Promise<Uint8Array>;
  writeBytes(path: string, data: Uint8Array): Promise<void>;
  readBase64(path: string): Promise<string>;
  writeBase64(path: string, base64: string): Promise<void>;
}

export interface BorderMarkPaths {
  documentDirectory: string;
  cacheDirectory: string;
  databaseFilePath: string;
  attachmentsDirectory: string;
  safetySnapshotsDirectory: string;
  restoreStagingDirectory: string;
}

export function createBorderMarkPaths(documentDirectory: string, cacheDirectory: string): BorderMarkPaths {
  const root = `${documentDirectory}bordermark/`;
  return {
    documentDirectory,
    cacheDirectory,
    databaseFilePath: `${documentDirectory}SQLite/bordermark.db`,
    attachmentsDirectory: `${root}attachments/`,
    safetySnapshotsDirectory: `${cacheDirectory}bordermark-safety/`,
    restoreStagingDirectory: `${cacheDirectory}bordermark-restore-staging/`,
  };
}
