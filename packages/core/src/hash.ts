import { blake3 } from '@noble/hashes/blake3';
import { createReadStream, promises as fs } from 'fs';

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

export interface FileHashResult {
  hash: Uint8Array;
  hex: string;
  sizeBytes: number;
  mtimeMs: number;
}

/**
 * Computes streaming BLAKE3-256 hash of a file on disk.
 * Uses 64KB stream chunks to maintain minimal memory footprint even on multi-gigabyte files.
 */
export async function computeFileBlake3(filePath: string): Promise<FileHashResult> {
  const stat = await fs.stat(filePath);
  const hasher = blake3.create({});

  return new Promise((resolve, reject) => {
    const stream = createReadStream(filePath, { highWaterMark: 64 * 1024 });

    stream.on('data', (chunk) => {
      hasher.update(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
    });

    stream.on('error', (err) => {
      reject(err);
    });

    stream.on('end', () => {
      const digest = hasher.digest();
      const hex = Array.from(digest)
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');

      resolve({
        hash: digest,
        hex,
        sizeBytes: stat.size,
        mtimeMs: Math.round(stat.mtimeMs)
      });
    });
  });
}
