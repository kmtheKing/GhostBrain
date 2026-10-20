import { describe, it, expect } from 'vitest';
import {
  generateDeviceIdentity,
  computeDeviceFingerprint,
  generatePairingCode,
  validatePairingCode,
  base32Encode
} from './crypto.js';

describe('Cryptographic Identity & RFC 8628 Pairing', () => {
  it('generates 32-byte Ed25519 and X25519 keys with 20-char fingerprint', () => {
    const identity = generateDeviceIdentity();

    expect(identity.ed25519PublicKey.length).toBe(32);
    expect(identity.ed25519PrivateKey.length).toBe(32);
    expect(identity.x25519PublicKey.length).toBe(32);
    expect(identity.x25519PrivateKey.length).toBe(32);
    expect(identity.fingerprint.length).toBe(20);
    expect(typeof identity.fingerprint).toBe('string');
  });

  it('produces deterministic fingerprints for the same public keys', () => {
    const pub1 = new Uint8Array(32).fill(0x01);
    const pub2 = new Uint8Array(32).fill(0x02);

    const fpA = computeDeviceFingerprint(pub1, pub2);
    const fpB = computeDeviceFingerprint(pub1, pub2);

    expect(fpA).toBe(fpB);
    expect(fpA.length).toBe(20);
  });

  it('encodes buffer to RFC 4648 Base32 correctly', () => {
    const buf = new Uint8Array([72, 101, 108, 108, 111]); // "Hello"
    const encoded = base32Encode(buf);
    expect(encoded).toBe('JBSWY3DP');
  });

  it('generates RFC 8628 pairing code with valid format and TTL', () => {
    const session = generatePairingCode(300);

    expect(session.userCode).toMatch(/^GB-[2-9]{4}-[A-Z]{4}$/);
    expect(session.deviceCode.length).toBe(64); // 32 hex bytes
    expect(session.deviceCodeHash.length).toBe(64); // SHA-256 hex
    expect(session.expiresAt).toBeGreaterThan(Date.now() + 290 * 1000);
    expect(validatePairingCode(session.userCode, session.expiresAt)).toBe(true);
  });

  it('rejects expired pairing code', () => {
    const session = generatePairingCode(-10);
    expect(validatePairingCode(session.userCode, session.expiresAt)).toBe(false);
  });
});
