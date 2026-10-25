import { describe, it, expect } from 'vitest';
import {
  generateDeviceIdentity,
  computeDeviceFingerprint,
  generatePairingCode,
  validatePairingCode,
  base32Encode,
  computeSharedSecret,
  deriveSessionKeys,
  encryptEnvelope,
  decryptEnvelope,
  signPayload,
  verifyPayload,
  generateEphemeralX25519
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

describe('Zero-Knowledge E2E Cryptographic Envelope', () => {
  it('performs X25519 key agreement deriving identical shared secrets', () => {
    const alice = generateDeviceIdentity();
    const bob = generateDeviceIdentity();

    const sharedAlice = computeSharedSecret(alice.x25519PrivateKey, bob.x25519PublicKey);
    const sharedBob = computeSharedSecret(bob.x25519PrivateKey, alice.x25519PublicKey);

    expect(sharedAlice.length).toBe(32);
    expect(sharedBob.length).toBe(32);
    expect(Buffer.from(sharedAlice).toString('hex')).toBe(Buffer.from(sharedBob).toString('hex'));
  });

  it('derives distinct directional 32-byte keys via HKDF-SHA256', () => {
    const shared = new Uint8Array(32).fill(0xaa);
    const keys = deriveSessionKeys(shared);

    expect(keys.clientToServerKey.length).toBe(32);
    expect(keys.serverToClientKey.length).toBe(32);
    expect(Buffer.from(keys.clientToServerKey).toString('hex')).not.toBe(
      Buffer.from(keys.serverToClientKey).toString('hex')
    );
  });

  it('encrypts and decrypts payload roundtrip with AES-256-GCM and monotonic counter', () => {
    const key = new Uint8Array(32).fill(0x42);
    const plaintext = JSON.stringify({ query: 'Find financial quarterly reports 2026', scope: 'finance' });
    const state = { lastCounter: 0 };

    const envelope = encryptEnvelope(plaintext, key, 1, 'c2s');
    expect(envelope.counter).toBe(1);
    expect(envelope.iv.length).toBe(24); // 12-byte hex
    expect(envelope.tag.length).toBe(32); // 16-byte hex auth tag

    const decrypted = decryptEnvelope(envelope, key, 'c2s', state);
    expect(decrypted).toBe(plaintext);
    expect(state.lastCounter).toBe(1);
  });

  it('rejects tampered ciphertext with authentication tag failure', () => {
    const key = new Uint8Array(32).fill(0x55);
    const envelope = encryptEnvelope('unmodified sensitive note', key, 1, 'c2s');

    // Flip last byte of ciphertext
    const tamperedHex =
      envelope.ciphertext.slice(0, -2) +
      (envelope.ciphertext.slice(-2) === 'aa' ? 'bb' : 'aa');
    const tamperedEnvelope = { ...envelope, ciphertext: tamperedHex };

    expect(() => decryptEnvelope(tamperedEnvelope, key, 'c2s')).toThrow();
  });

  it('rejects tampered authentication tag', () => {
    const key = new Uint8Array(32).fill(0x77);
    const envelope = encryptEnvelope('secure payload', key, 1, 'c2s');

    const badTagEnvelope = {
      ...envelope,
      tag: '00000000000000000000000000000000'
    };

    expect(() => decryptEnvelope(badTagEnvelope, key, 'c2s')).toThrow();
  });

  it('rejects wrong decryption key', () => {
    const keyA = new Uint8Array(32).fill(0x11);
    const keyB = new Uint8Array(32).fill(0x22);

    const envelope = encryptEnvelope('secret message', keyA, 1, 'c2s');
    expect(() => decryptEnvelope(envelope, keyB, 'c2s')).toThrow();
  });

  it('rejects replayed or out-of-order monotonic counter', () => {
    const key = new Uint8Array(32).fill(0x99);
    const state = { lastCounter: 5 };

    // Counter 5 (equal to lastCounter)
    const env5 = encryptEnvelope('msg 5', key, 5, 'c2s');
    expect(() => decryptEnvelope(env5, key, 'c2s', state)).toThrow(/Replay attack rejected/);

    // Counter 4 (less than lastCounter)
    const env4 = encryptEnvelope('msg 4', key, 4, 'c2s');
    expect(() => decryptEnvelope(env4, key, 'c2s', state)).toThrow(/Replay attack rejected/);

    // Counter 6 (greater than lastCounter) -> should succeed
    const env6 = encryptEnvelope('msg 6', key, 6, 'c2s');
    const dec6 = decryptEnvelope(env6, key, 'c2s', state);
    expect(dec6).toBe('msg 6');
    expect(state.lastCounter).toBe(6);
  });

  it('signs and verifies Ed25519 payloads correctly', () => {
    const identity = generateDeviceIdentity();
    const message = 'HELLO_HANDSHAKE:fingerprint_mobile:nonce123';

    const signature = signPayload(message, identity.ed25519PrivateKey);
    expect(signature.length).toBe(64);

    const isValid = verifyPayload(message, signature, identity.ed25519PublicKey);
    expect(isValid).toBe(true);

    const isInvalid = verifyPayload('TAMPERED_MESSAGE', signature, identity.ed25519PublicKey);
    expect(isInvalid).toBe(false);
  });
});

