import type { RelayWireMessage, RelayRole } from '@ghostbrain/shared-types';

export interface Env {
  ENVIRONMENT: string;
  MAX_CLIENTS_PER_SESSION?: number;
  RELAY_SESSION: {
    idFromName(name: string): any;
    get(id: any): { fetch(request: Request): Promise<Response> };
  };
  ghostbrain_relay_db?: any;
}

/**
 * SQLite-backed Durable Object managing single-user Zero-Knowledge E2E relay room.
 * Utilizes the Cloudflare WebSocket Hibernation API for 0 GB-s duration cost while idle.
 */
export class RelaySessionDO {
  ctx: any;
  env: Env;
  private connectedPeers: Map<any, { role: RelayRole; fingerprint: string }>;

  constructor(ctx: any, env: Env) {
    this.ctx = ctx;
    this.env = env;
    this.connectedPeers = new Map();

    // Initialize SQLite table if running on SQLite-backed Durable Objects
    if (this.ctx?.storage?.sql) {
      try {
        this.ctx.storage.sql.exec(`
          CREATE TABLE IF NOT EXISTS relay_peers (
            fingerprint TEXT PRIMARY KEY,
            role TEXT NOT NULL,
            connected_at INTEGER NOT NULL
          );
        `);
      } catch (err) {
        console.warn('[RelaySessionDO] SQLite init notice:', err);
      }
    }
  }

  async fetch(request: Request): Promise<Response> {
    const upgradeHeader = request.headers.get('Upgrade');
    if (!upgradeHeader || upgradeHeader.toLowerCase() !== 'websocket') {
      return new Response(
        JSON.stringify({
          error: 'Expected WebSocket Upgrade header',
          service: 'ghostbrain-relay-do'
        }),
        { status: 426, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const url = new URL(request.url);
    const role = (url.searchParams.get('role') as RelayRole) || 'mobile';
    const fingerprint = url.searchParams.get('fingerprint') || `anon_${Date.now()}`;

    // WebSocketPair is standard in Cloudflare Workers and Node test shims
    // @ts-ignore
    const pair = typeof WebSocketPair !== 'undefined' ? new WebSocketPair() : null;
    if (!pair) {
      return new Response('WebSocketPair unavailable in current environment', { status: 500 });
    }
    const [client, server] = [pair[0] || pair.client, pair[1] || pair.server];

    // Mandatory Cloudflare WebSocket Hibernation API
    // Tags allow zero-cost socket indexing and instant lookup
    const tags = [role, `fp:${fingerprint}`];
    if (typeof this.ctx.acceptWebSocket === 'function') {
      this.ctx.acceptWebSocket(server, tags);
    }

    this.connectedPeers.set(server, { role, fingerprint });

    // Notify other connected peers that this device is online
    this.broadcastPeerStatus(server, fingerprint, role, 'online');

    return new Response(null, {
      status: 101,
      // @ts-ignore
      webSocket: client
    });
  }

  /**
   * Cloudflare Hibernation API: called when a WebSocket message is received.
   * Zero-Knowledge Guarantee: The payload is opaque ciphertext. Cloudflare never
   * inspects or decrypts application payloads.
   */
  async webSocketMessage(ws: any, message: string | ArrayBuffer): Promise<void> {
    const raw = typeof message === 'string' ? message : new TextDecoder().decode(message);
    let msg: RelayWireMessage;

    try {
      msg = JSON.parse(raw);
    } catch {
      ws.send(JSON.stringify({ type: 'ERROR', error: 'Malformed JSON wire frame' }));
      return;
    }

    // Fast-path keepalive
    if (msg.type === 'PING') {
      ws.send(JSON.stringify({ type: 'PONG', timestamp: Date.now() }));
      return;
    }

    // Determine target peers
    const targets = this.findTargetSockets(ws, msg.to);

    if (targets.length === 0) {
      // Peer not found / offline
      ws.send(
        JSON.stringify({
          type: 'ERROR',
          sessionId: msg.sessionId,
          from: 'relay-do',
          to: msg.from,
          error: `Target peer '${msg.to}' is offline or disconnected`
        })
      );
      return;
    }

    // Forward unmodified Zero-Knowledge frame to target recipient(s)
    for (const targetWs of targets) {
      try {
        targetWs.send(raw);
      } catch (err) {
        console.error('[RelaySessionDO] Forward error:', err);
      }
    }
  }

  /**
   * Cloudflare Hibernation API: called when a WebSocket connection closes.
   */
  async webSocketClose(ws: any, code: number, reason: string, wasClean: boolean): Promise<void> {
    const peer = this.connectedPeers.get(ws);
    this.connectedPeers.delete(ws);

    if (peer) {
      this.broadcastPeerStatus(ws, peer.fingerprint, peer.role, 'offline');
    }
  }

  /**
   * Cloudflare Hibernation API: called on unexpected socket errors.
   */
  async webSocketError(ws: any, error: unknown): Promise<void> {
    console.error('[RelaySessionDO] WebSocket error:', error);
    this.connectedPeers.delete(ws);
    try {
      ws.close(1011, 'Relay error');
    } catch {
      // Ignore cleanup error
    }
  }

  private findTargetSockets(senderWs: any, to: string): any[] {
    // 1. If Cloudflare getWebSockets tag query is available, use it for optimal speed
    if (typeof this.ctx.getWebSockets === 'function') {
      if (to === 'desktop') {
        return this.ctx.getWebSockets('desktop').filter((s: any) => s !== senderWs);
      }
      return this.ctx.getWebSockets(`fp:${to}`).filter((s: any) => s !== senderWs);
    }

    // 2. Fallback to in-memory map
    const matches: any[] = [];
    for (const [socket, meta] of this.connectedPeers.entries()) {
      if (socket === senderWs) continue;
      if (to === 'desktop' && meta.role === 'desktop') {
        matches.push(socket);
      } else if (meta.fingerprint === to) {
        matches.push(socket);
      }
    }
    return matches;
  }

  private broadcastPeerStatus(
    originWs: any,
    fingerprint: string,
    role: RelayRole,
    status: 'online' | 'offline'
  ): void {
    const statusMsg = JSON.stringify({
      type: 'PEER_STATUS',
      fingerprint,
      role,
      status,
      timestamp: Date.now()
    });

    const sockets =
      typeof this.ctx.getWebSockets === 'function'
        ? this.ctx.getWebSockets()
        : Array.from(this.connectedPeers.keys());

    for (const ws of sockets) {
      if (ws !== originWs) {
        try {
          ws.send(statusMsg);
        } catch {
          // Ignore write to stale socket
        }
      }
    }
  }
}

/**
 * Cloudflare Worker Default Fetch Handler
 */
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // 1. Health check & tier introspection
    if (url.pathname === '/' || url.pathname === '/health') {
      return new Response(
        JSON.stringify({
          status: 'healthy',
          service: 'ghostbrain-relay',
          architecture: 'Zero-Knowledge E2E Durable Object Tunnel',
          tier: 'cloudflare-workers-free-tier',
          hibernation: true,
          sqliteBacked: true,
          timestamp: new Date().toISOString()
        }),
        { headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 2. WebSocket Relay Route: /session/:sessionId
    const sessionMatch = url.pathname.match(/^\/session\/([a-zA-Z0-9_-]+)/);
    if (sessionMatch) {
      const sessionId = sessionMatch[1];
      const doId = env.RELAY_SESSION.idFromName(sessionId);
      const doStub = env.RELAY_SESSION.get(doId);
      return doStub.fetch(request);
    }

    return new Response(JSON.stringify({ error: 'Route Not Found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
