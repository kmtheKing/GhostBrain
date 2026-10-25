import { describe, it, expect, vi } from 'vitest';
import worker, { RelaySessionDO } from './index.js';
import {
  generateDeviceIdentity,
  generateEphemeralX25519,
  computeSharedSecret,
  deriveSessionKeys,
  encryptEnvelope,
  decryptEnvelope,
  signPayload,
  verifyPayload
} from '@ghostbrain/core';
import type { RelayWireMessage, RelayHelloPayload } from '@ghostbrain/shared-types';

// Mock WebSocket implementation for in-memory DO unit testing
class MockWebSocket {
  public sent: string[] = [];
  public readyState = 1; // OPEN
  public tags: string[] = [];

  constructor(tags: string[] = []) {
    this.tags = tags;
  }

  send(data: string) {
    this.sent.push(data);
  }

  close() {
    this.readyState = 3;
  }
}

describe('Cloudflare Workers & RelaySessionDO Architecture', () => {
  it('serves health check with Cloudflare Free Tier metadata', async () => {
    const req = new Request('https://relay.ghostbrain.local/health');
    const env = {
      ENVIRONMENT: 'production',
      RELAY_SESSION: {
        idFromName: vi.fn(),
        get: vi.fn()
      }
    };

    const res = await worker.fetch(req, env);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.status).toBe('healthy');
    expect(body.tier).toBe('cloudflare-workers-free-tier');
    expect(body.hibernation).toBe(true);
    expect(body.sqliteBacked).toBe(true);
  });

  it('routes /session/:id to RelaySessionDO stub', async () => {
    const mockStub = {
      fetch: vi.fn().mockResolvedValue(new Response('DO response'))
    };
    const env = {
      ENVIRONMENT: 'production',
      RELAY_SESSION: {
        idFromName: vi.fn().mockReturnValue('id_123'),
        get: vi.fn().mockReturnValue(mockStub)
      }
    };

    const req = new Request('https://relay.ghostbrain.local/session/vault_alpha');
    const res = await worker.fetch(req, env);

    expect(env.RELAY_SESSION.idFromName).toHaveBeenCalledWith('vault_alpha');
    expect(env.RELAY_SESSION.get).toHaveBeenCalledWith('id_123');
    expect(mockStub.fetch).toHaveBeenCalled();
    expect(res.status).toBe(200);
  });
});

describe('End-to-End Zero-Knowledge Simulated Relay Loop', () => {
  it('executes full loop: Mobile Encrypt -> DO Relay -> Desktop Decrypt -> RAG Search -> Desktop Encrypt -> Mobile Decrypt', async () => {
    // 1. Setup mock Cloudflare Hibernation Context
    const sockets: MockWebSocket[] = [];
    const mockCtx = {
      storage: {
        sql: {
          exec: vi.fn()
        }
      },
      acceptWebSocket: (ws: MockWebSocket, tags: string[]) => {
        ws.tags = tags;
        sockets.push(ws);
      },
      getWebSockets: (tag?: string) => {
        if (!tag) return sockets;
        return sockets.filter((s) => s.tags.includes(tag));
      }
    };

    const relayDO = new RelaySessionDO(mockCtx, {
      ENVIRONMENT: 'test',
      RELAY_SESSION: {} as any
    });

    // 2. Cryptographic identities (Pinned in Chapter 2.1)
    const desktopId = generateDeviceIdentity();
    const mobileId = generateDeviceIdentity();

    // 3. Setup mock Desktop and Mobile sockets matching their fingerprints
    const desktopWs = new MockWebSocket(['desktop', `fp:${desktopId.fingerprint}`]);
    const mobileWs = new MockWebSocket(['mobile', `fp:${mobileId.fingerprint}`]);

    mockCtx.acceptWebSocket(desktopWs, ['desktop', `fp:${desktopId.fingerprint}`]);
    mockCtx.acceptWebSocket(mobileWs, ['mobile', `fp:${mobileId.fingerprint}`]);

    // Desktop pins mobile's public key
    const pinnedMobileKeys = new Map<string, Uint8Array>();
    pinnedMobileKeys.set(mobileId.fingerprint, mobileId.ed25519PublicKey);

    // 4. Handshake: Mobile generates ephemeral X25519, signs it, and sends HELLO frame
    const mobileEph = generateEphemeralX25519();
    const mobileEphHex = Buffer.from(mobileEph.publicKey).toString('hex');
    const mobileTranscript = `GHOSTBRAIN_RELAY_HANDSHAKE:session_alpha:${mobileId.fingerprint}:${mobileEphHex}`;
    const mobileSig = signPayload(mobileTranscript, mobileId.ed25519PrivateKey);

    const helloFrame: RelayWireMessage = {
      type: 'HELLO',
      sessionId: 'session_alpha',
      from: mobileId.fingerprint,
      to: 'desktop',
      payload: {
        ephPub: mobileEphHex,
        sig: Buffer.from(mobileSig).toString('hex'),
        identityPub: Buffer.from(mobileId.ed25519PublicKey).toString('hex'),
        fingerprint: mobileId.fingerprint
      } as RelayHelloPayload
    };

    // Mobile sends HELLO to DO
    await relayDO.webSocketMessage(mobileWs, JSON.stringify(helloFrame));

    // DO must have forwarded HELLO to desktop socket without modifying payload
    expect(desktopWs.sent.length).toBe(1);
    const forwardedHello = JSON.parse(desktopWs.sent[0]) as RelayWireMessage;
    expect(forwardedHello.type).toBe('HELLO');
    expect(forwardedHello.from).toBe(mobileId.fingerprint);

    // 5. Desktop verifies signature, derives session keys, and responds with HELLO_ACK
    const helloPayload = forwardedHello.payload as RelayHelloPayload;
    const pinnedPubKey = pinnedMobileKeys.get(forwardedHello.from)!;
    const verifyTranscript = `GHOSTBRAIN_RELAY_HANDSHAKE:session_alpha:${forwardedHello.from}:${helloPayload.ephPub}`;
    const isSigValid = verifyPayload(verifyTranscript, Buffer.from(helloPayload.sig, 'hex'), pinnedPubKey);
    expect(isSigValid).toBe(true);

    const desktopEph = generateEphemeralX25519();
    const desktopEphHex = Buffer.from(desktopEph.publicKey).toString('hex');

    // Desktop derives shared secret & session keys
    const desktopSharedSecret = computeSharedSecret(desktopEph.privateKey, Buffer.from(helloPayload.ephPub, 'hex'));
    const salt = Buffer.from(`${forwardedHello.from}:${desktopId.fingerprint}:session_alpha`, 'utf8');
    const desktopKeys = deriveSessionKeys(desktopSharedSecret, salt);

    // Desktop signs ephemeral key
    const ackTranscript = `GHOSTBRAIN_RELAY_HANDSHAKE_ACK:session_alpha:${desktopId.fingerprint}:${desktopEphHex}`;
    const desktopSig = signPayload(ackTranscript, desktopId.ed25519PrivateKey);

    const helloAckFrame: RelayWireMessage = {
      type: 'HELLO_ACK',
      sessionId: 'session_alpha',
      from: desktopId.fingerprint,
      to: mobileId.fingerprint,
      payload: {
        ephPub: desktopEphHex,
        sig: Buffer.from(desktopSig).toString('hex'),
        identityPub: Buffer.from(desktopId.ed25519PublicKey).toString('hex'),
        fingerprint: desktopId.fingerprint
      }
    };

    // Desktop sends HELLO_ACK to DO
    await relayDO.webSocketMessage(desktopWs, JSON.stringify(helloAckFrame));

    // DO must have forwarded HELLO_ACK to mobile socket
    expect(mobileWs.sent.length).toBe(1);
    const forwardedAck = JSON.parse(mobileWs.sent[0]) as RelayWireMessage;
    expect(forwardedAck.type).toBe('HELLO_ACK');

    // 6. Mobile derives shared secret & session keys
    const ackPayload = forwardedAck.payload;
    const mobileSharedSecret = computeSharedSecret(mobileEph.privateKey, Buffer.from(ackPayload.ephPub, 'hex'));
    expect(Buffer.from(mobileSharedSecret).toString('hex')).toBe(Buffer.from(desktopSharedSecret).toString('hex'));

    const mobileKeys = deriveSessionKeys(mobileSharedSecret, salt);
    expect(Buffer.from(mobileKeys.clientToServerKey).toString('hex')).toBe(
      Buffer.from(desktopKeys.clientToServerKey).toString('hex')
    );
    expect(Buffer.from(mobileKeys.serverToClientKey).toString('hex')).toBe(
      Buffer.from(desktopKeys.serverToClientKey).toString('hex')
    );

    // 7. Mobile sends encrypted query DATA frame
    const mobileCounter = 1;
    const secretQuery = JSON.stringify({ query: 'Find financial forecast 2026', limit: 3 });
    const mobileEnvelope = encryptEnvelope(secretQuery, mobileKeys.clientToServerKey, mobileCounter, 'c2s');

    const queryDataFrame: RelayWireMessage = {
      type: 'DATA',
      sessionId: 'session_alpha',
      from: mobileId.fingerprint,
      to: 'desktop',
      payload: mobileEnvelope,
      ctr: mobileCounter
    };

    // Mobile sends query frame to DO
    await relayDO.webSocketMessage(mobileWs, JSON.stringify(queryDataFrame));

    // DO forwards opaque ciphertext to Desktop (DO cannot read secretQuery!)
    expect(desktopWs.sent.length).toBe(2);
    const forwardedQuery = JSON.parse(desktopWs.sent[1]) as RelayWireMessage;
    expect(forwardedQuery.type).toBe('DATA');

    // 8. Desktop decrypts incoming query and verifies monotonic counter
    const desktopState = { lastCounter: 0 };
    const decryptedQueryJson = decryptEnvelope(
      forwardedQuery.payload,
      desktopKeys.clientToServerKey,
      'c2s',
      desktopState
    );
    expect(decryptedQueryJson).toBe(secretQuery);
    expect(desktopState.lastCounter).toBe(1);

    // 9. Desktop simulates unified RAG search response and encrypts back to Mobile
    const ragAnswer = JSON.stringify({
      type: 'DONE',
      streamId: 'stream_101',
      citations: [
        { docPath: 'Reports/2026_Q3_Forecast.pdf', rrfScore: 0.985 },
        { docPath: 'Strategy/Roadmap_H2.docx', rrfScore: 0.842 }
      ],
      latencyMs: 12,
      tier: 'CPU_LITE'
    });

    const desktopCounter = 1;
    const answerEnvelope = encryptEnvelope(ragAnswer, desktopKeys.serverToClientKey, desktopCounter, 's2c');

    const answerDataFrame: RelayWireMessage = {
      type: 'DATA',
      sessionId: 'session_alpha',
      from: desktopId.fingerprint,
      to: mobileId.fingerprint,
      payload: answerEnvelope,
      ctr: desktopCounter
    };

    // Desktop sends answer frame to DO
    await relayDO.webSocketMessage(desktopWs, JSON.stringify(answerDataFrame));

    // DO forwards answer frame to Mobile
    expect(mobileWs.sent.length).toBe(2);
    const forwardedAnswer = JSON.parse(mobileWs.sent[1]) as RelayWireMessage;
    expect(forwardedAnswer.type).toBe('DATA');

    // 10. Mobile decrypts answer and validates content
    const mobileState = { lastCounter: 0 };
    const decryptedAnswerJson = decryptEnvelope(
      forwardedAnswer.payload,
      mobileKeys.serverToClientKey,
      's2c',
      mobileState
    );
    expect(decryptedAnswerJson).toBe(ragAnswer);
    expect(mobileState.lastCounter).toBe(1);

    const parsedAnswer = JSON.parse(decryptedAnswerJson);
    expect(parsedAnswer.citations.length).toBe(2);
    expect(parsedAnswer.citations[0].docPath).toBe('Reports/2026_Q3_Forecast.pdf');
    expect(parsedAnswer.tier).toBe('CPU_LITE');
  });
});
