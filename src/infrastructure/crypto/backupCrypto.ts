import { gcm } from '@noble/ciphers/aes.js';
import { randomBytes } from '@noble/ciphers/utils.js';
import { argon2id } from 'hash-wasm';

export { randomBytes };

export const BACKUP_MAGIC = 'BMRK';
export const BACKUP_VERSION = 1;
export const NONCE_BYTES = 12;
export const SALT_BYTES = 32;

export interface BackupHeader {
  magic: string;
  version: number;
  backupId: string;
  createdAt: string;
  salt: Uint8Array;
}

export interface EncryptedSection {
  nonce: Uint8Array;
  ciphertext: Uint8Array;
}

export async function deriveMasterKey(password: string, salt: Uint8Array): Promise<Uint8Array> {
  const hash = await argon2id({
    password,
    salt,
    parallelism: 1,
    iterations: 3,
    memorySize: 65536,
    hashLength: 32,
    outputType: 'binary',
  });
  return hash instanceof Uint8Array ? hash : new Uint8Array(hash);
}

export function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return globalThis.btoa(binary);
}

export function base64ToBytes(value: string): Uint8Array {
  const binary = globalThis.atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export function serializeFixedHeader(header: BackupHeader): Uint8Array {
  const encoder = new TextEncoder();
  const parts = [
    header.magic,
    String(header.version),
    header.backupId,
    header.createdAt,
    bytesToBase64(header.salt),
  ];
  return encoder.encode(parts.join('|'));
}

export async function encryptSection(
  masterKey: Uint8Array,
  aad: Uint8Array,
  plaintext: Uint8Array,
): Promise<EncryptedSection> {
  const nonce = randomBytes(NONCE_BYTES);
  const cipher = gcm(masterKey, nonce, aad);
  const ciphertext = cipher.encrypt(plaintext);
  return { nonce, ciphertext };
}

export async function decryptSection(
  masterKey: Uint8Array,
  aad: Uint8Array,
  section: EncryptedSection,
): Promise<Uint8Array> {
  const cipher = gcm(masterKey, section.nonce, aad);
  return cipher.decrypt(section.ciphertext);
}
