import { createHash } from 'crypto';

export function computeSha256Hex(data: Uint8Array): string {
  return createHash('sha256').update(data).digest('hex');
}

export function verifySha256Hex(data: Uint8Array, expectedHex: string): boolean {
  return computeSha256Hex(data) === expectedHex.toLowerCase();
}

export function hexToBytes(value: string): Uint8Array {
  const bytes = new Uint8Array(value.length / 2);
  for (let i = 0; i < bytes.length; i += 1) {
    bytes[i] = parseInt(value.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

export function bytesToHex(bytes: Uint8Array): string {
  return [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}
