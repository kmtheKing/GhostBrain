import { EventEmitter } from 'events';
import {
  generateDeviceIdentity,
  generateEphemeralX25519,
  computeSharedSecret,
  deriveSessionKeys,
  encryptEnvelope,
  decryptEnvelope,
  signPayload,
  verifyPayload,
  type DeviceIdentity,
  type SessionKeys
} from '@ghostbrain/core';
import type {
  RelayWireMessage,
  RelayHelloPayload,
  EncryptedEnvelope,
  RelayPeerStatus
} from '@ghostbrain/shared-types';
import { WorkerManager } from './workers/worker-manager.js';

export interface ActiveSession {
  peerFingerprint: string;
  keys: SessionKeys;
  receiveState: { lastCounter: number };
  sendCounter: number;
  establishedAt: number;
}

export interface PairedPeer {
  fingerprint: string;
  ed25519PublicKey: Uint8Array;
  name: string;
}

/**
 * Desktop Daemon Relay Client
 * Maintains an auto-reconnecting outbound WSS connection to Cloudflare Durable Object room,
 * verifies pinned mobile peers with Ed25519, performs X25519 ECDH key agreement,
 * decrypts queries with AES-256-GCM, routes to rag-worker.js, and streams back encrypted citations.
 */
export class RelayClient extends EventEmitter {
  private static instance: RelayClient | null = null;
  private ws: WebSocket | null = null;
  private relayBaseUrl: string;
  private sessionId: string;
  private identity: DeviceIdentity;
  private pairedPeers: Map<string, PairedPeer>;
  private activeSessions: Map<string, ActiveSession>;

  private reconnectTimer: NodeJS.Timeout | null = null;
  private pingInterval: NodeJS.Timeout | null = null;
  private isManuallyClosed = false;
  private isConnected = false;
  private reconnectAttempts = 0;

  public constructor(
    relayBaseUrl = 'wss://relay.ghostbrain.local',
    sessionId = 'default-vault-session',
    identity?: DeviceIdentity
  ) {
    super();
    this.relayBaseUrl = relayBaseUrl.replace(/^http/, 'ws');
    this.sessionId = sessionId;
    this.identity = identity || generateDeviceIdentity();
    this.pairedPeers = new Map();
    this.activeSessions = new Map();
  }

  public static getInstance(relayUrl?: string, sessionId?: string): RelayClient {
    if (!RelayClient.instance) {
      RelayClient.instance = new RelayClient(relayUrl, sessionId);
    }
    return RelayClient.instance;
  }

  public getIdentity(): DeviceIdentity {
    return this.identity;
  }

  public setIdentity(identity: DeviceIdentity): void {
    this.identity = identity;
  }

  public registerPairedDevice(fingerprint: string, ed25519PublicKey: Uint8Array, name = 'Paired Mobile'): void {
    this.pairedPeers.set(fingerprint, { fingerprint, ed25519PublicKey, name });
    console.log(`[RelayClient] Registered pinned paired device: ${fingerprint} (${name})`);
  }

  public revokePairedDevice(fingerprint: string): boolean {
    this.activeSessions.delete(fingerprint);
    return this.pairedPeers.delete(fingerprint);
  }

  public getStatus(): { connected: boolean; peersCount: number; deviceId: string; activeSessions: number } {
    return {
      connected: this.isConnected,
      peersCount: this.pairedPeers.size,
      deviceId: this.identity.fingerprint,
      activeSessions: this.activeSessions.size
    };
  }

  public start(): void {
    this.isManuallyClosed = false;
    this.connect();
  }

  public stop(): void {
    this.isManuallyClosed = true;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    if (this.pingInterval) clearInterval(this.pingInterval);
    if (this.ws) {
      try {
        this.ws.close(1000, 'Desktop daemon shutdown');
      } catch {
        // Ignore close errors on shutdown
      }
      this.ws = null;
    }
    this.isConnected = false;
    this.emit('status', { connected: false });
  }

  private connect(): void {
    if (this.isManuallyClosed) return;

    const targetUrl = `${this.relayBaseUrl}/session/${this.sessionId}?role=desktop&fingerprint=${this.identity.fingerprint}`;
    console.log(`[RelayClient] Connecting outbound WSS tunnel -> ${targetUrl}`);

    try {
      this.ws = new WebSocket(targetUrl);

      this.ws.onopen = () => {
        console.log('[RelayClient] E2E Relay WSS tunnel established with Cloudflare Durable Object.');
        this.isConnected = true;
        this.reconnectAttempts = 0;
        this.emit('status', { connected: true, deviceId: this.identity.fingerprint });

        // Keep-alive heartbeat every 25s for Cloudflare hibernation
        if (this.pingInterval) clearInterval(this.pingInterval);
        this.pingInterval = setInterval(() => {
          if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({ type: 'PING', timestamp: Date.now() }));
          }
        }, 25000);
      };

      this.ws.onmessage = (event) => {
        const raw = typeof event.data === 'string' ? event.data : new TextDecoder().decode(event.data);
        this.handleIncomingMessage(raw).catch((err) => {
          console.error('[RelayClient] Incoming message error:', err);
        });
      };

      this.ws.onclose = () => {
        this.isConnected = false;
        if (this.pingInterval) clearInterval(this.pingInterval);
        this.emit('status', { connected: false });

        if (!this.isManuallyClosed) {
          const delay = Math.min(15000, 1000 * Math.pow(1.5, this.reconnectAttempts++));
          console.log(`[RelayClient] Connection lost. Reconnecting in ${Math.round(delay / 1000)}s...`);
          this.reconnectTimer = setTimeout(() => this.connect(), delay);
        }
      };

      this.ws.onerror = (err) => {
        console.warn('[RelayClient] WebSocket error event:', err);
      };
    } catch (err) {
      console.error('[RelayClient] Failed to instantiate WebSocket:', err);
      this.isConnected = false;
      if (!this.isManuallyClosed) {
        this.reconnectTimer = setTimeout(() => this.connect(), 4000);
      }
    }
  }

  /**
   * Router for incoming wire frames from Cloudflare DO
   */
  public async handleIncomingMessage(raw: string): Promise<void> {
    let msg: RelayWireMessage;
    try {
      msg = JSON.parse(raw);
    } catch {
      return;
    }

    if (msg.type === 'PONG') return;

    if (msg.type === 'HELLO') {
      await this.handleHelloHandshake(msg);
      return;
    }

    if (msg.type === 'DATA') {
      await this.handleEncryptedData(msg);
      return;
    }

    if (msg.type === 'PEER_STATUS') {
      this.emit('peer_status', msg);
    }
  }

  /**
   * Step 1: Mobile sends HELLO { ephPub, sig, identityPub, fingerprint }
   * Desktop verifies mobile Ed25519 identity against pinned pairings,
   * generates its own ephemeral X25519 key, derives session keys, and replies with HELLO_ACK.
   */
  private async handleHelloHandshake(msg: RelayWireMessage): Promise<void> {
    const payload = msg.payload as RelayHelloPayload;
    if (!payload || !payload.ephPub || !payload.sig || !payload.identityPub) {
      console.warn('[RelayClient] Invalid HELLO payload structure');
      return;
    }

    const peerFp = msg.from;
    const peerIdentityPub = Buffer.from(payload.identityPub, 'hex');
    const peerEphPub = Buffer.from(payload.ephPub, 'hex');
    const signature = Buffer.from(payload.sig, 'hex');

    // 1. Verify peer identity is pinned in database
    const paired = this.pairedPeers.get(peerFp);
    if (!paired) {
      console.warn(`[RelayClient] Rejected handshake from untrusted un-paired peer: ${peerFp}`);
      this.sendWireMessage({
        type: 'ERROR',
        sessionId: this.sessionId,
        from: this.identity.fingerprint,
        to: peerFp,
        error: 'Device not paired with this desktop daemon'
      });
      return;
    }

    // 2. Verify Ed25519 signature on the ephemeral public key
    const handshakeTranscript = `GHOSTBRAIN_RELAY_HANDSHAKE:${this.sessionId}:${peerFp}:${payload.ephPub}`;
    const isValidSig = verifyPayload(handshakeTranscript, signature, paired.ed25519PublicKey);
    if (!isValidSig) {
      console.error(`[RelayClient] Cryptographic signature verification failed for peer ${peerFp}`);
      return;
    }

    // 3. Desktop generates single-session ephemeral X25519 keypair
    const desktopEph = generateEphemeralX25519();

    // 4. Compute X25519 Diffie-Hellman shared secret
    const sharedSecret = computeSharedSecret(desktopEph.privateKey, peerEphPub);

    // 5. Derive directional session keys via HKDF-SHA256
    const transcriptSalt = Buffer.from(`${peerFp}:${this.identity.fingerprint}:${this.sessionId}`, 'utf8');
    const sessionKeys = deriveSessionKeys(sharedSecret, transcriptSalt);

    // 6. Record active session
    this.activeSessions.set(peerFp, {
      peerFingerprint: peerFp,
      keys: sessionKeys,
      receiveState: { lastCounter: 0 },
      sendCounter: 0,
      establishedAt: Date.now()
    });

    console.log(`[RelayClient] Zero-Knowledge session key agreement completed with peer: ${peerFp}`);

    // 7. Desktop signs its own ephemeral public key with pinned Ed25519 identity
    const desktopEphHex = Buffer.from(desktopEph.publicKey).toString('hex');
    const desktopTranscript = `GHOSTBRAIN_RELAY_HANDSHAKE_ACK:${this.sessionId}:${this.identity.fingerprint}:${desktopEphHex}`;
    const desktopSig = signPayload(desktopTranscript, this.identity.ed25519PrivateKey);

    // 8. Send HELLO_ACK to mobile peer
    this.sendWireMessage({
      type: 'HELLO_ACK',
      sessionId: this.sessionId,
      from: this.identity.fingerprint,
      to: peerFp,
      payload: {
        ephPub: desktopEphHex,
        sig: Buffer.from(desktopSig).toString('hex'),
        identityPub: Buffer.from(this.identity.ed25519PublicKey).toString('hex'),
        fingerprint: this.identity.fingerprint
      }
    });

    this.emit('session_established', { peerFingerprint: peerFp });
  }

  /**
   * Step 2: Mobile sends DATA frame with AES-256-GCM ciphertext
   * Desktop decrypts payload, verifies monotonic counter, queries rag-worker.js,
   * and streams back encrypted citations and token deltas.
   */
  private async handleEncryptedData(msg: RelayWireMessage): Promise<void> {
    const peerFp = msg.from;
    const session = this.activeSessions.get(peerFp);

    if (!session) {
      console.warn(`[RelayClient] Received encrypted DATA from peer without active session: ${peerFp}`);
      return;
    }

    const envelope = msg.payload as EncryptedEnvelope;
    if (!envelope || typeof envelope.counter !== 'number' || !envelope.ciphertext || !envelope.tag) {
      console.warn('[RelayClient] Malformed EncryptedEnvelope');
      return;
    }

    // 1. Decrypt incoming query with clientToServerKey and enforce monotonic counter
    let decryptedJson: string;
    try {
      decryptedJson = decryptEnvelope(envelope, session.keys.clientToServerKey, 'c2s', session.receiveState);
    } catch (err: any) {
      console.error(`[RelayClient] Decryption failed for peer ${peerFp}:`, err.message);
      return;
    }

    let queryPayload: { query: string; limit?: number; streamId?: string };
    try {
      queryPayload = JSON.parse(decryptedJson);
    } catch {
      console.warn('[RelayClient] Decrypted payload was not valid JSON');
      return;
    }

    const streamId = queryPayload.streamId || `stream_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const query = (queryPayload.query || '').trim();

    if (!query) return;

    console.log(`[RelayClient] Executing private RAG query from mobile peer ${peerFp}: "${query.slice(0, 40)}..."`);

    // 2. Dispatch query directly into our unified RAG Worker
    try {
      await WorkerManager.getInstance().streamChat(
        { query },
        (tokenPayload) => {
          // Encrypt each streamed token delta with serverToClientKey
          const tokenEnv = encryptEnvelope(
            JSON.stringify({
              type: 'TOKEN',
              streamId,
              delta: tokenPayload.delta
            }),
            session.keys.serverToClientKey,
            ++session.sendCounter,
            's2c'
          );

          this.sendWireMessage({
            type: 'DATA',
            sessionId: this.sessionId,
            from: this.identity.fingerprint,
            to: peerFp,
            payload: tokenEnv,
            ctr: session.sendCounter
          });
        },
        (donePayload) => {
          // Encrypt completion frame with citations
          const doneEnv = encryptEnvelope(
            JSON.stringify({
              type: 'DONE',
              streamId,
              citations: donePayload.citations,
              latencyMs: donePayload.latencyMs,
              tier: donePayload.tier
            }),
            session.keys.serverToClientKey,
            ++session.sendCounter,
            's2c'
          );

          this.sendWireMessage({
            type: 'DATA',
            sessionId: this.sessionId,
            from: this.identity.fingerprint,
            to: peerFp,
            payload: doneEnv,
            ctr: session.sendCounter
          });
        }
      );
    } catch (err) {
      console.warn('[RelayClient] Streaming chat fallback to direct search:', err);
      // Fallback: fast search citations
      const hits = await WorkerManager.getInstance().search({ query, limit: queryPayload.limit || 4 });
      const doneEnv = encryptEnvelope(
        JSON.stringify({
          type: 'DONE',
          streamId,
          citations: hits.map((h, i) => ({
            chunkId: h.chunkId,
            documentId: h.documentId,
            relPath: h.relPath,
            score: h.rrfScore,
            tag: `[S${i + 1}]`,
            headingPath: h.headingPath
          })),
          latencyMs: 15,
          tier: 'SEARCH_ONLY'
        }),
        session.keys.serverToClientKey,
        ++session.sendCounter,
        's2c'
      );

      this.sendWireMessage({
        type: 'DATA',
        sessionId: this.sessionId,
        from: this.identity.fingerprint,
        to: peerFp,
        payload: doneEnv,
        ctr: session.sendCounter
      });
    }
  }

  public sendWireMessage(msg: RelayWireMessage): boolean {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return false;
    }
    try {
      this.ws.send(JSON.stringify(msg));
      return true;
    } catch (err) {
      console.error('[RelayClient] Send error:', err);
      return false;
    }
  }
}
