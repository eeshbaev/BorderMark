import * as FileSystem from 'expo-file-system/legacy';

import type { FileInfo, FileSystemPort } from '@/infrastructure/storage/fileSystemPort';

export class ExpoFileSystemPort implements FileSystemPort {
  async readDirectory(path: string): Promise<string[]> {
    return FileSystem.readDirectoryAsync(path);
  }

  async getInfo(path: string): Promise<FileInfo> {
    const info = await FileSystem.getInfoAsync(path);
    return {
      exists: info.exists,
      size: info.exists && 'size' in info ? info.size : undefined,
      isDirectory: info.exists ? info.isDirectory : undefined,
    };
  }

  async makeDirectory(path: string): Promise<void> {
    await FileSystem.makeDirectoryAsync(path, { intermediates: true });
  }

  async copyFile(from: string, to: string): Promise<void> {
    await FileSystem.copyAsync({ from, to });
  }

  async moveFile(from: string, to: string): Promise<void> {
    await FileSystem.moveAsync({ from, to });
  }

  async delete(path: string): Promise<void> {
    await FileSystem.deleteAsync(path, { idempotent: true });
  }

  async readBytes(path: string): Promise<Uint8Array> {
    const base64 = await FileSystem.readAsStringAsync(path, {
      encoding: FileSystem.EncodingType.Base64,
    });
    return base64ToBytes(base64);
  }

  async writeBytes(path: string, data: Uint8Array): Promise<void> {
    await FileSystem.writeAsStringAsync(path, bytesToBase64(data), {
      encoding: FileSystem.EncodingType.Base64,
    });
  }

  async readBase64(path: string): Promise<string> {
    return FileSystem.readAsStringAsync(path, {
      encoding: FileSystem.EncodingType.Base64,
    });
  }

  async writeBase64(path: string, base64: string): Promise<void> {
    await FileSystem.writeAsStringAsync(path, base64, {
      encoding: FileSystem.EncodingType.Base64,
    });
  }
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return globalThis.btoa(binary);
}

function base64ToBytes(value: string): Uint8Array {
  const binary = globalThis.atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export function getProductionFileSystemPort(): ExpoFileSystemPort {
  return new ExpoFileSystemPort();
}

export function getProductionPaths() {
  const { createBorderMarkPaths } = require('@/infrastructure/storage/fileSystemPort') as typeof import('@/infrastructure/storage/fileSystemPort');
  if (!FileSystem.documentDirectory || !FileSystem.cacheDirectory) {
    throw new Error('Expo FileSystem directories are unavailable.');
  }
  return createBorderMarkPaths(FileSystem.documentDirectory, FileSystem.cacheDirectory);
}
