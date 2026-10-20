import crypto from 'node:crypto';
import { computeBlake3 } from './hash.js';

export interface DeviceIdentity {
  ed25519PublicKey: Uint8Array;
  ed25519PrivateKey: Uint8Array;
  x25519PublicKey: Uint8Array;
  x25519PrivateKey: Uint8Array;
  fingerprint: string;
}

export interface PairingCodeSession {
  userCode: string;
  deviceCode: string;
  deviceCodeHash: string;
  expiresAt: number;
}

/**
 * Standard RFC 4648 Base32 encoder for fingerprint representation.
 */
export function base32Encode(data: Uint8Array): string {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = 0;
  let value = 0;
  let output = '';

  for (let i = 0; i < data.length; i++) {
    value = (value << 8) | data[i];
    bits += 8;
    while (bits >= 5) {
      output += alphabet[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }

  if (bits > 0) {
    output += alphabet[(value << (5 - bits)) & 31];
  }

  return output;
}

/**
 * Computes the 20-character canonical device fingerprint:
 * base32(BLAKE3(ed25519_pub || x25519_pub))[0..20]
 */
export function computeDeviceFingerprint(ed25519Pub: Uint8Array, x25519Pub: Uint8Array): string {
  const combined = new Uint8Array(ed25519Pub.length + x25519Pub.length);
  combined.set(ed25519Pub, 0);
  combined.set(x25519Pub, ed25519Pub.length);

  const hash = computeBlake3(combined);
  const encoded = base32Encode(hash);
  return encoded.slice(0, 20);
}

/**
 * Generates an Ed25519 (signing) and X25519 (Diffie-Hellman) device identity keypair.
 * Raw 32-byte public and private keys are extracted from PKCS#8 / SPKI structures.
 */
export function generateDeviceIdentity(): DeviceIdentity {
  const edKeyPair = crypto.generateKeyPairSync('ed25519');
  const xKeyPair = crypto.generateKeyPairSync('x25519');

  const edPubSpki = edKeyPair.publicKey.export({ type: 'spki', format: 'der' });
  const edPrivPkcs8 = edKeyPair.privateKey.export({ type: 'pkcs8', format: 'der' });
  const ed25519PublicKey = new Uint8Array(edPubSpki.subarray(-32));
  const ed25519PrivateKey = new Uint8Array(edPrivPkcs8.subarray(-32));

  const xPubSpki = xKeyPair.publicKey.export({ type: 'spki', format: 'der' });
  const xPrivPkcs8 = xKeyPair.privateKey.export({ type: 'pkcs8', format: 'der' });
  const x25519PublicKey = new Uint8Array(xPubSpki.subarray(-32));
  const x25519PrivateKey = new Uint8Array(xPrivPkcs8.subarray(-32));

  const fingerprint = computeDeviceFingerprint(ed25519PublicKey, x25519PublicKey);

  return {
    ed25519PublicKey,
    ed25519PrivateKey,
    x25519PublicKey,
    x25519PrivateKey,
    fingerprint
  };
}

/**
 * Generates an RFC 8628 compliant device authorization session with 300-second TTL.
 * Format: GB-XXXX-XXXX (e.g. GB-8492-XQ71)
 */
export function generatePairingCode(ttlSec = 300): PairingCodeSession {
  const nums = '23456789';
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ';

  const part1 = Array.from(crypto.randomBytes(4))
    .map((b) => nums[b % nums.length])
    .join('');
  const part2 = Array.from(crypto.randomBytes(4))
    .map((b) => chars[b % chars.length])
    .join('');

  const userCode = `GB-${part1}-${part2}`;
  const deviceCode = crypto.randomBytes(32).toString('hex');
  const deviceCodeHash = crypto.createHash('sha256').update(deviceCode).digest('hex');
  const expiresAt = Date.now() + ttlSec * 1000;

  return {
    userCode,
    deviceCode,
    deviceCodeHash,
    expiresAt
  };
}

/**
 * Validates pairing code format and expiry.
 */
export function validatePairingCode(code: string, expiresAt: number): boolean {
  if (Date.now() > expiresAt) return false;
  return /^GB-[2-9]{4}-[A-Z]{4}$/.test(code.trim().toUpperCase());
}
