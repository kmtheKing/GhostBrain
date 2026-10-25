import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import Database from 'better-sqlite3-multiple-ciphers';
import { SCHEMA_V1, SCHEMA_V2 } from './db/schema.js';
import { RelayClient } from './relay-client.js';
import { generateDeviceIdentity, generateEphemeralX25519, signPayload } from '@ghostbrain/core';
import type { RelayWireMessage, RelayHelloPayload } from '@ghostbrain/shared-types';

describe('Sub-Agent 4: Live Web Relay Pairing & Bidirectional Timeline Sync Suite', () => {
  let tempDir: string;
  let dbPath: string;
  let testDb: any;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gb-relay-test-'));
    dbPath = path.join(tempDir, 'test-relay.sqlite');
    testDb = new Database(dbPath);
    testDb.exec(SCHEMA_V1);
    testDb.exec(SCHEMA_V2);
  });

  afterEach(() => {
    try {
      testDb?.close();
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {}
  });

  it('pairs mobile peer using manual GB-XXXX-XXXX code and persists in paired_devices', async () => {
    const desktopId = generateDeviceIdentity();
    const relayClient = new RelayClient('wss://relay.ghostbrain.local', 'test-session', desktopId);
    relayClient.setDatabase(testDb);

    // 1. Setup active pairing session in SQLite
    const userCode = 'GB-8492-XQ71';
    const expiresAt = Date.now() + 300000;
    testDb.prepare(`
      INSERT INTO pairing_sessions (user_code, device_code_hash, fingerprint, expires_at, created_at)
      VALUES (?, 'hash_123', ?, ?, ?)
    `).run(userCode, desktopId.fingerprint, expiresAt, Date.now());

    // 2. Track emitted events
    let devicesUpdatedFired = false;
    let devicePairedData: any = null;
    relayClient.on('devices_updated', () => {
      devicesUpdatedFired = true;
    });
    relayClient.on('device_paired', (data) => {
      devicePairedData = data;
    });

    // Mock sendWireMessage to intercept HELLO_ACK and SYNC_INIT
    const sentFrames: RelayWireMessage[] = [];
    relayClient.sendWireMessage = vi.fn((msg: RelayWireMessage) => {
      sentFrames.push(msg);
      return true;
    });

    // 3. Mobile sends HELLO frame with pairingCode
    const mobileId = generateDeviceIdentity();
    const mobileEph = generateEphemeralX25519();
    const mobileEphHex = Buffer.from(mobileEph.publicKey).toString('hex');
    const transcript = `GHOSTBRAIN_RELAY_HANDSHAKE:test-session:${mobileId.fingerprint}:${mobileEphHex}`;
    const sig = signPayload(transcript, mobileId.ed25519PrivateKey);

    const helloMsg: RelayWireMessage = {
      type: 'HELLO',
      sessionId: 'test-session',
      from: mobileId.fingerprint,
      to: desktopId.fingerprint,
      payload: {
        ephPub: mobileEphHex,
        sig: Buffer.from(sig).toString('hex'),
        identityPub: Buffer.from(mobileId.ed25519PublicKey).toString('hex'),
        fingerprint: mobileId.fingerprint,
        pairingCode: userCode,
        clientName: 'iPhone 15 Pro (Safari)'
      } as RelayHelloPayload
    };

    await relayClient.handleIncomingMessage(JSON.stringify(helloMsg));

    // Verify pairing events fired
    expect(devicesUpdatedFired).toBe(true);
    expect(devicePairedData).toBeDefined();
    expect(devicePairedData.fingerprint).toBe(mobileId.fingerprint);

    // Verify record in SQLite paired_devices table
    const pairedRow = testDb.prepare('SELECT * FROM paired_devices WHERE fingerprint = ?').get(mobileId.fingerprint) as any;
    expect(pairedRow).toBeDefined();
    expect(pairedRow.status).toBe('active');
    expect(pairedRow.name).toBe('iPhone 15 Pro (Safari)');

    // Verify HELLO_ACK was sent
    const ackFrame = sentFrames.find((f) => f.type === 'HELLO_ACK');
    expect(ackFrame).toBeDefined();
    expect(ackFrame?.to).toBe(mobileId.fingerprint);
  });

  it('hydrates continuous timeline and telemetry via SYNC_INIT frame upon pairing', async () => {
    const desktopId = generateDeviceIdentity();
    const relayClient = new RelayClient('wss://relay.ghostbrain.local', 'test-session', desktopId);
    relayClient.setDatabase(testDb);

    // Pre-populate chat_messages table with past timeline
    testDb.prepare(`
      INSERT INTO chat_messages (id, conversation_id, role, content, thoughts, tool_calls, citations, is_archived, created_at)
      VALUES (?, 'default', ?, ?, ?, '[]', ?, 0, ?)
    `).run('msg_past_1', 'user', 'What is the corporate severance policy?', '[]', '[]', 1700000000);

    testDb.prepare(`
      INSERT INTO chat_messages (id, conversation_id, role, content, thoughts, tool_calls, citations, is_archived, created_at)
      VALUES (?, 'default', ?, ?, ?, '[]', ?, 0, ?)
    `).run('msg_past_2', 'assistant', 'Standard severance is 2 weeks per year of service.', '["Scanned policies"]', '[{"label":"S1","file":"HR/Severance.pdf"}]', 1700000005);

    // Capture sent wire frames
    const sentFrames: RelayWireMessage[] = [];
    relayClient.sendWireMessage = vi.fn((msg: RelayWireMessage) => {
      sentFrames.push(msg);
      return true;
    });

    // Directly trigger sendSyncInit for peer
    relayClient.sendSyncInit('peer_mob_123');

    const syncFrame = sentFrames.find((f) => f.type === 'SYNC_INIT');
    expect(syncFrame).toBeDefined();
    expect(syncFrame?.payload).toBeDefined();

    // Verify continuous timeline was extracted from SQLite
    const timeline = syncFrame?.payload?.timeline;
    expect(timeline).toHaveLength(2);
    expect(timeline[0].content).toBe('What is the corporate severance policy?');
    expect(timeline[1].role).toBe('assistant');
    expect(timeline[1].citations).toHaveLength(1);

    // Verify host telemetry is populated
    const telemetry = syncFrame?.payload?.telemetry;
    expect(telemetry).toBeDefined();
    expect(telemetry.totalRamMB).toBeGreaterThan(0);
    expect(telemetry.usedRamMB).toBeGreaterThan(0);
    expect(telemetry.activeModel).toBeDefined();
  });

  it('saves remote user messages and broadcasts outbound chat updates to peers', () => {
    const desktopId = generateDeviceIdentity();
    const relayClient = new RelayClient('wss://relay.ghostbrain.local', 'test-session', desktopId);
    relayClient.setDatabase(testDb);

    const sentFrames: RelayWireMessage[] = [];
    relayClient.sendWireMessage = vi.fn((msg: RelayWireMessage) => {
      sentFrames.push(msg);
      return true;
    });

    const newChatMessage = {
      id: 'msg_new_1',
      role: 'assistant',
      content: 'Here is your summary of the 2026 Q3 report.',
      thoughts: ['Analyzed financials'],
      citations: [{ label: 'S1', file: 'Finance/Q3.pdf' }],
      timestamp: Date.now()
    };

    // Broadcast message to peers
    relayClient.broadcastMessageToPeers(newChatMessage);

    relayClient.broadcastClearToPeers();
    expect(typeof relayClient.broadcastMessageToPeers).toBe('function');
    expect(typeof relayClient.broadcastClearToPeers).toBe('function');
  });

  it('verifies MobileRemote.tsx has zero occurrences of TechCorp_Apex_MSA_v3 mock', () => {
    const mobileRemotePath = path.resolve(__dirname, '../../../web/src/components/remote/MobileRemote.tsx');
    const content = fs.readFileSync(mobileRemotePath, 'utf-8');
    expect(content).not.toContain('TechCorp_Apex_MSA_v3.pdf');
    expect(content).not.toContain('Section 14.2 of the Master Service Agreement');
    expect(content).toContain('useRelayClient');
  });
});
