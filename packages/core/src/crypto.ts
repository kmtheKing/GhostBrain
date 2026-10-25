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

// RFC 8410 DER prefixes for raw 32-byte key import into Node.js KeyObject
const X25519_SPKI_PREFIX = Buffer.from('302a300506032b656e032100', 'hex');
const X25519_PKCS8_PREFIX = Buffer.from('302e020100300506032b656e04220420', 'hex');
const ED25519_SPKI_PREFIX = Buffer.from('302a300506032b6570032100', 'hex');
const ED25519_PKCS8_PREFIX = Buffer.from('302e020100300506032b657004220420', 'hex');

export interface SessionKeys {
  clientToServerKey: Uint8Array;
  serverToClientKey: Uint8Array;
}

export interface EncryptedEnvelope {
  counter: number;
  iv: string; // 12-byte hex
  tag: string; // 16-byte hex
  ciphertext: string; // hex
}

/**
 * Generates an ephemeral X25519 keypair for single-session key exchange.
 */
export function generateEphemeralX25519(): { publicKey: Uint8Array; privateKey: Uint8Array } {
  const kp = crypto.generateKeyPairSync('x25519');
  const pubSpki = kp.publicKey.export({ type: 'spki', format: 'der' });
  const privPkcs8 = kp.privateKey.export({ type: 'pkcs8', format: 'der' });
  return {
    publicKey: new Uint8Array(pubSpki.subarray(-32)),
    privateKey: new Uint8Array(privPkcs8.subarray(-32))
  };
}

/**
 * Computes 32-byte shared secret via X25519 Elliptic-Curve Diffie-Hellman.
 */
export function computeSharedSecret(privateKey: Uint8Array, peerPublicKey: Uint8Array): Uint8Array {
  if (privateKey.length !== 32 || peerPublicKey.length !== 32) {
    throw new Error(`Invalid X25519 key length: priv=${privateKey.length}, pub=${peerPublicKey.length} (expected 32 bytes)`);
  }

  const privKeyObj = crypto.createPrivateKey({
    key: Buffer.concat([X25519_PKCS8_PREFIX, Buffer.from(privateKey)]),
    format: 'der',
    type: 'pkcs8'
  });

  const pubKeyObj = crypto.createPublicKey({
    key: Buffer.concat([X25519_SPKI_PREFIX, Buffer.from(peerPublicKey)]),
    format: 'der',
    type: 'spki'
  });

  const secret = crypto.diffieHellman({
    privateKey: privKeyObj,
    publicKey: pubKeyObj
  });

  return new Uint8Array(secret);
}

/**
 * Derives directional 32-byte session keys using HKDF-SHA256:
 * - clientToServerKey (info: "ghostbrain/v1/client-to-server")
 * - serverToClientKey (info: "ghostbrain/v1/server-to-client")
 */
export function deriveSessionKeys(sharedSecret: Uint8Array, salt?: Uint8Array): SessionKeys {
  const saltBuf = salt && salt.length > 0 ? Buffer.from(salt) : Buffer.alloc(32, 0);
  const ikm = Buffer.from(sharedSecret);

  const c2sRaw = crypto.hkdfSync('sha256', ikm, saltBuf, Buffer.from('ghostbrain/v1/client-to-server'), 32);
  const s2cRaw = crypto.hkdfSync('sha256', ikm, saltBuf, Buffer.from('ghostbrain/v1/server-to-client'), 32);

  return {
    clientToServerKey: new Uint8Array(c2sRaw),
    serverToClientKey: new Uint8Array(s2cRaw)
  };
}

/**
 * Builds 12-byte GCM nonce from 4-byte direction tag + 8-byte big-endian counter:
 * [c2s\0 or s2c\0][uint64_be counter]
 */
export function buildDirectionalNonce(counter: number | bigint, direction: 'c2s' | 's2c' = 'c2s'): Buffer {
  const nonce = Buffer.alloc(12);
  if (direction === 'c2s') {
    nonce.write('c2s\0', 0, 4, 'ascii');
  } else {
    nonce.write('s2c\0', 0, 4, 'ascii');
  }
  nonce.writeBigUInt64BE(BigInt(counter), 4);
  return nonce;
}

/**
 * Encrypts payload with AES-256-GCM using directional monotonic nonce.
 */
export function encryptEnvelope(
  plaintext: string | Uint8Array,
  key: Uint8Array,
  counter: number,
  direction: 'c2s' | 's2c' = 'c2s'
): EncryptedEnvelope {
  if (key.length !== 32) {
    throw new Error(`Invalid AES-256 key length: ${key.length} bytes (expected 32 bytes)`);
  }

  const nonce = buildDirectionalNonce(counter, direction);
  const cipher = crypto.createCipheriv('aes-256-gcm', Buffer.from(key), nonce);

  const inputBuf = typeof plaintext === 'string' ? Buffer.from(plaintext, 'utf8') : Buffer.from(plaintext);
  const ciphertext = Buffer.concat([cipher.update(inputBuf), cipher.final()]);
  const tag = cipher.getAuthTag();

  return {
    counter,
    iv: nonce.toString('hex'),
    tag: tag.toString('hex'),
    ciphertext: ciphertext.toString('hex')
  };
}

/**
 * Decrypts AES-256-GCM envelope, enforcing monotonic counter and authentication tag check.
 */
export function decryptEnvelope(
  envelope: EncryptedEnvelope,
  key: Uint8Array,
  direction: 'c2s' | 's2c' = 'c2s',
  state?: { lastCounter: number }
): string {
  if (key.length !== 32) {
    throw new Error(`Invalid AES-256 key length: ${key.length} bytes (expected 32 bytes)`);
  }

  // Replay Attack Protection: monotonic counter must strictly increase
  if (state) {
    if (envelope.counter <= state.lastCounter) {
      throw new Error(`Replay attack rejected: received counter ${envelope.counter} <= lastCounter ${state.lastCounter}`);
    }
  }

  const expectedNonce = buildDirectionalNonce(envelope.counter, direction);
  if (envelope.iv && envelope.iv.toLowerCase() !== expectedNonce.toString('hex').toLowerCase()) {
    throw new Error('IV verification failed: envelope IV does not match expected directional nonce');
  }

  const decipher = crypto.createDecipheriv('aes-256-gcm', Buffer.from(key), expectedNonce);
  decipher.setAuthTag(Buffer.from(envelope.tag, 'hex'));

  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(envelope.ciphertext, 'hex')),
    decipher.final()
  ]);

  // Update monotonic counter state on successful authentication
  if (state) {
    state.lastCounter = envelope.counter;
  }

  return decrypted.toString('utf8');
}

/**
 * Signs data using Ed25519 identity private key (RFC 8032).
 */
export function signPayload(data: Uint8Array | string, ed25519PrivateKey: Uint8Array): Uint8Array {
  if (ed25519PrivateKey.length !== 32) {
    throw new Error('Invalid Ed25519 private key length (expected 32 bytes)');
  }

  const privKeyObj = crypto.createPrivateKey({
    key: Buffer.concat([ED25519_PKCS8_PREFIX, Buffer.from(ed25519PrivateKey)]),
    format: 'der',
    type: 'pkcs8'
  });

  const dataBuf = typeof data === 'string' ? Buffer.from(data, 'utf8') : Buffer.from(data);
  const sig = crypto.sign(null, dataBuf, privKeyObj);
  return new Uint8Array(sig);
}

/**
 * Verifies Ed25519 signature against public key (RFC 8032).
 */
export function verifyPayload(
  data: Uint8Array | string,
  signature: Uint8Array,
  ed25519PublicKey: Uint8Array
): boolean {
  if (ed25519PublicKey.length !== 32) {
    return false;
  }

  try {
    const pubKeyObj = crypto.createPublicKey({
      key: Buffer.concat([ED25519_SPKI_PREFIX, Buffer.from(ed25519PublicKey)]),
      format: 'der',
      type: 'spki'
    });

    const dataBuf = typeof data === 'string' ? Buffer.from(data, 'utf8') : Buffer.from(data);
    return crypto.verify(null, dataBuf, pubKeyObj, Buffer.from(signature));
  } catch {
    return false;
  }
}

