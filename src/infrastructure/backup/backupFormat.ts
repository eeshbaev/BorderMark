import {
  BACKUP_MAGIC,
  BACKUP_VERSION,
  bytesToBase64,
  base64ToBytes,
  deriveMasterKey,
  decryptSection,
  encryptSection,
  randomBytes,
  SALT_BYTES,
  serializeFixedHeader,
  type BackupHeader,
} from '@/infrastructure/crypto/backupCrypto';
import type { BackupDataset } from '@/shared/types';

export const SECTION_DATABASE = 1;
export const SECTION_ATTACHMENT = 2;

export interface ParsedBackupSection {
  sectionType: number;
  attachmentId: string | null;
  plaintext: Uint8Array;
}

export interface ParsedBackupFile {
  header: BackupHeader;
  aad: Uint8Array;
  sections: ParsedBackupSection[];
}

export interface EncryptedBackupSectionDescriptor {
  sectionType: number;
  attachmentId: string | null;
  nonce: Uint8Array;
  ciphertext: Uint8Array;
}

export interface EncryptedBackupFile {
  header: BackupHeader;
  aad: Uint8Array;
  sections: EncryptedBackupSectionDescriptor[];
}

function writeUint32LE(value: number): Uint8Array {
  const buffer = new Uint8Array(4);
  buffer[0] = value & 0xff;
  buffer[1] = (value >> 8) & 0xff;
  buffer[2] = (value >> 16) & 0xff;
  buffer[3] = (value >> 24) & 0xff;
  return buffer;
}

function readUint32LE(bytes: Uint8Array, offset: number): number {
  return (
    bytes[offset] |
    (bytes[offset + 1] << 8) |
    (bytes[offset + 2] << 16) |
    (bytes[offset + 3] << 24)
  ) >>> 0;
}

function writeUint16LE(value: number): Uint8Array {
  const buffer = new Uint8Array(2);
  buffer[0] = value & 0xff;
  buffer[1] = (value >> 8) & 0xff;
  return buffer;
}

function readUint16LE(bytes: Uint8Array, offset: number): number {
  return bytes[offset] | (bytes[offset + 1] << 8);
}

function concatBytes(parts: Uint8Array[]): Uint8Array {
  const total = parts.reduce((sum, part) => sum + part.length, 0);
  const output = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) {
    output.set(part, offset);
    offset += part.length;
  }
  return output;
}

function writeString(value: string): Uint8Array {
  const encoded = new TextEncoder().encode(value);
  return concatBytes([writeUint16LE(encoded.length), encoded]);
}

function readString(bytes: Uint8Array, offset: number): { value: string; nextOffset: number } {
  const length = readUint16LE(bytes, offset);
  const start = offset + 2;
  const end = start + length;
  const value = new TextDecoder().decode(bytes.slice(start, end));
  return { value, nextOffset: end };
}

export function buildFixedHeaderAad(header: Pick<BackupHeader, 'magic' | 'version' | 'backupId'>): Uint8Array {
  return concatBytes([
    new TextEncoder().encode(header.magic),
    writeUint32LE(header.version),
    writeString(header.backupId),
  ]);
}

export function serializePlaintextHeader(header: BackupHeader, sectionCount: number): Uint8Array {
  return concatBytes([
    buildFixedHeaderAad(header),
    writeString(header.createdAt),
    header.salt,
    writeUint32LE(sectionCount),
  ]);
}

export function parsePlaintextHeader(bytes: Uint8Array): {
  header: BackupHeader;
  aad: Uint8Array;
  sectionCount: number;
  nextOffset: number;
} {
  let offset = 0;
  const magic = new TextDecoder().decode(bytes.slice(offset, offset + 4));
  offset += 4;
  if (magic !== BACKUP_MAGIC) {
    throw new Error('Invalid backup magic.');
  }

  const version = readUint32LE(bytes, offset);
  offset += 4;
  if (version !== BACKUP_VERSION) {
    throw new Error(`Unsupported backup version: ${version}`);
  }

  const aadEnd = offset;
  const backupIdRead = readString(bytes, offset);
  const backupId = backupIdRead.value;
  offset = backupIdRead.nextOffset;
  const aad = bytes.slice(0, aadEnd).length === aadEnd
    ? buildFixedHeaderAad({ magic, version, backupId })
    : buildFixedHeaderAad({ magic, version, backupId });

  const createdAtRead = readString(bytes, offset);
  offset = createdAtRead.nextOffset;
  const salt = bytes.slice(offset, offset + SALT_BYTES);
  offset += SALT_BYTES;
  const sectionCount = readUint32LE(bytes, offset);
  offset += 4;

  return {
    header: {
      magic,
      version,
      backupId,
      createdAt: createdAtRead.value,
      salt,
    },
    aad,
    sectionCount,
    nextOffset: offset,
  };
}

function serializeEncryptedSection(section: EncryptedBackupSectionDescriptor): Uint8Array {
  const attachmentIdBytes = section.attachmentId
    ? writeString(section.attachmentId)
    : writeUint16LE(0);
  return concatBytes([
    new Uint8Array([section.sectionType]),
    attachmentIdBytes,
    section.nonce,
    writeUint32LE(section.ciphertext.length),
    section.ciphertext,
  ]);
}

function parseEncryptedSection(bytes: Uint8Array, offset: number): {
  section: EncryptedBackupSectionDescriptor;
  nextOffset: number;
} {
  const sectionType = bytes[offset];
  offset += 1;
  const attachmentIdLength = readUint16LE(bytes, offset);
  offset += 2;
  let attachmentId: string | null = null;
  if (attachmentIdLength > 0) {
    attachmentId = new TextDecoder().decode(bytes.slice(offset, offset + attachmentIdLength));
    offset += attachmentIdLength;
  }
  const nonce = bytes.slice(offset, offset + 12);
  offset += 12;
  const ciphertextLength = readUint32LE(bytes, offset);
  offset += 4;
  const ciphertext = bytes.slice(offset, offset + ciphertextLength);
  offset += ciphertextLength;
  return {
    section: { sectionType, attachmentId, nonce, ciphertext },
    nextOffset: offset,
  };
}

export async function buildEncryptedBackupFile(
  dataset: BackupDataset,
  attachmentFiles: Map<string, Uint8Array>,
  password: string,
  backupId: string,
  createdAt: string,
): Promise<Uint8Array> {
  const salt = randomBytes(SALT_BYTES);
  const header: BackupHeader = {
    magic: BACKUP_MAGIC,
    version: BACKUP_VERSION,
    backupId,
    createdAt,
    salt,
  };
  const aad = buildFixedHeaderAad(header);
  const masterKey = await deriveMasterKey(password, salt);

  const dbPlaintext = new TextEncoder().encode(JSON.stringify(dataset));
  const encryptedSections: EncryptedBackupSectionDescriptor[] = [];

  const dbEncrypted = await encryptSection(masterKey, aad, dbPlaintext);
  encryptedSections.push({
    sectionType: SECTION_DATABASE,
    attachmentId: null,
    nonce: dbEncrypted.nonce,
    ciphertext: dbEncrypted.ciphertext,
  });

  for (const attachment of dataset.attachments) {
    const fileBytes = attachmentFiles.get(attachment.id);
    if (!fileBytes) {
      throw new Error(`Missing attachment file for ${attachment.id}`);
    }
    const encrypted = await encryptSection(masterKey, aad, fileBytes);
    encryptedSections.push({
      sectionType: SECTION_ATTACHMENT,
      attachmentId: attachment.id,
      nonce: encrypted.nonce,
      ciphertext: encrypted.ciphertext,
    });
  }

  const headerBytes = serializePlaintextHeader(header, encryptedSections.length);
  const sectionBytes = encryptedSections.map(serializeEncryptedSection);
  return concatBytes([headerBytes, ...sectionBytes]);
}

export async function parseEncryptedBackupFile(
  bytes: Uint8Array,
  password: string,
): Promise<ParsedBackupFile> {
  const { header, aad, sectionCount, nextOffset } = parsePlaintextHeader(bytes);
  const masterKey = await deriveMasterKey(password, header.salt);

  let offset = nextOffset;
  const encryptedSections: EncryptedBackupSectionDescriptor[] = [];
  for (let i = 0; i < sectionCount; i += 1) {
    const parsed = parseEncryptedSection(bytes, offset);
    encryptedSections.push(parsed.section);
    offset = parsed.nextOffset;
  }

  const sections: ParsedBackupSection[] = [];
  for (const section of encryptedSections) {
    try {
      const plaintext = await decryptSection(masterKey, aad, {
        nonce: section.nonce,
        ciphertext: section.ciphertext,
      });
      sections.push({
        sectionType: section.sectionType,
        attachmentId: section.attachmentId,
        plaintext,
      });
    } catch {
      throw new Error('Backup authentication failed. Wrong password or tampered backup.');
    }
  }

  return { header, aad, sections };
}

export function extractBackupDataset(parsed: ParsedBackupFile): {
  dataset: BackupDataset;
  attachmentFiles: Map<string, Uint8Array>;
} {
  const databaseSection = parsed.sections.find((section) => section.sectionType === SECTION_DATABASE);
  if (!databaseSection) {
    throw new Error('Backup is missing database section.');
  }

  const dataset = JSON.parse(new TextDecoder().decode(databaseSection.plaintext)) as BackupDataset;
  const attachmentFiles = new Map<string, Uint8Array>();

  for (const section of parsed.sections) {
    if (section.sectionType === SECTION_ATTACHMENT && section.attachmentId) {
      attachmentFiles.set(section.attachmentId, section.plaintext);
    }
  }

  return { dataset, attachmentFiles };
}

export function backupFileToBase64(bytes: Uint8Array): string {
  return bytesToBase64(bytes);
}

export function backupFileFromBase64(value: string): Uint8Array {
  return base64ToBytes(value);
}
