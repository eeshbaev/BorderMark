import { sha256 } from '@noble/hashes/sha2.js';
import { bytesToHex, hexToBytes } from '@noble/hashes/utils.js';

export function computeSha256Hex(data: Uint8Array): string {
  return bytesToHex(sha256(data));
}

export function verifySha256Hex(data: Uint8Array, expectedHex: string): boolean {
  return computeSha256Hex(data) === expectedHex.toLowerCase();
}

export { hexToBytes, bytesToHex };
