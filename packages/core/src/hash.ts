import { blake3 } from '@noble/hashes/blake3';

/**
 * Computes BLAKE3-256 hash of a buffer or string.
 * Returns 32-byte Uint8Array.
 */
export function computeBlake3(data: Uint8Array | string): Uint8Array {
  if (typeof data === 'string') {
    const encoder = new TextEncoder();
    return blake3(encoder.encode(data));
  }
  return blake3(data);
}

/**
 * Returns hex representation of BLAKE3-256 hash.
 */
export function computeBlake3Hex(data: Uint8Array | string): string {
  const hash = computeBlake3(data);
  return Array.from(hash)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}
