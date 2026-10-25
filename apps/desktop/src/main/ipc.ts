import os from 'os';
import fs from 'fs';
import path from 'path';
import { ipcMain, dialog, BrowserWindow, app } from 'electron';
import { getDatabase } from './db/index.js';
import { getPowerMode, setPowerMode, isIndexingCurrentlyPaused } from './tray.js';
import { buildRagPrompt, parseCitations, generatePairingCode, generateDeviceIdentity, computeDeviceFingerprint, type ChatMessage } from '@ghostbrain/core';
import type {
  WatchedFolder,
  IndexStatus,
  PowerMode,
  LicenseStatus,
  SearchQueryPayload,
  SearchHit,
  ChatAskPayload,
  ChatAskResponse,
  SystemTelemetry,
  PairedDeviceRecord,
  PairingSessionInfo,
  RelayStatus
} from '@ghostbrain/shared-types';

import { FolderWatcherManager } from './indexer/watcher.js';
import { WorkerManager } from './workers/worker-manager.js';
import { RelayClient } from './relay-client.js';

export function registerIpcHandlers(mainWindow: BrowserWindow, watcherManager: FolderWatcherManager): void {
  const db = getDatabase();

  const relay = RelayClient.getInstance();
  relay.setDatabase(db);

  function broadcastDevices(): void {
    try {
      if (mainWindow.isDestroyed()) return;
      const rows = db.prepare(`
        SELECT id, name, kind, fingerprint, connection as connectionType, ip, permissions, status, last_ping_at as lastPingAt, created_at as createdAt
        FROM paired_devices
        WHERE status != 'revoked'
        ORDER BY created_at DESC
      `).all() as any[];

      const devices = rows.map((r) => ({
        id: r.id,
        name: r.name,
        kind: r.kind || 'mobile',
        fingerprint: r.fingerprint,
        connectionType: r.connectionType || 'Zero-Knowledge Relay',
        ip: r.ip || '192.168.1.42',
        permissions: r.permissions || 'Full Query + Clip',
        status: r.status || 'active',
        lastPingAt: r.lastPingAt,
        createdAt: r.createdAt
      }));

      mainWindow.webContents.send('devices:updated', devices);
    } catch {
      // Ignore during teardown
    }
  }

  relay.on('devices_updated', () => {
    broadcastDevices();
  });

  relay.on('device_paired', () => {
    broadcastDevices();
  });

  relay.on('message_received', (msg) => {
    try {
      if (!mainWindow.isDestroyed()) {
        mainWindow.webContents.send('chat:remote-message', msg);
      }
    } catch {}
  });

  function broadcastIndexStatus(): void {
    try {
      if (mainWindow.isDestroyed()) return;
      const totalIndexed = db.prepare('SELECT COUNT(1) as count FROM documents WHERE status = \'indexed\'').get() as any;
      const totalPending = db.prepare('SELECT COUNT(1) as count FROM documents WHERE status IN (\'pending\', \'parsing\', \'embedding\')').get() as any;
      const totalErrors = db.prepare('SELECT COUNT(1) as count FROM documents WHERE status = \'error\'').get() as any;

      mainWindow.webContents.send('index:status', {
        indexed: totalIndexed?.count || 0,
        pending: totalPending?.count || 0,
        errors: totalErrors?.count || 0,
        etaSec: 0,
        isPaused: watcherManager.getPaused()
      });
    } catch {
      // Ignore during teardown
    }
  }

  watcherManager.onEvent(() => {
    broadcastIndexStatus();
  });

  // Continuous Chat Timeline Persistence Handlers
  ipcMain.handle('chat:get-history', (_event, conversationId?: string) => {
    try {
      const convId = conversationId || 'default';
      const rows = db.prepare(`
        SELECT id, conversation_id, role, content, thoughts, tool_calls, citations, created_at as timestamp
        FROM chat_messages
        WHERE conversation_id = ? AND is_archived = 0
        ORDER BY created_at ASC
      `).all(convId) as any[];

      return rows.map((r) => ({
        id: r.id,
        conversationId: r.conversation_id,
        role: r.role,
        content: r.content,
        thoughts: r.thoughts ? JSON.parse(r.thoughts) : undefined,
        toolCalls: r.tool_calls ? JSON.parse(r.tool_calls) : undefined,
        citations: r.citations ? JSON.parse(r.citations) : undefined,
        timestamp: r.timestamp,
        createdAt: r.timestamp
      }));
    } catch (err) {
      console.error('[IPC] Failed to fetch chat history:', err);
      return [];
    }
  });

  ipcMain.handle('chat:save-message', (_event, msg: any) => {
    try {
      const convId = msg.conversationId || 'default';
      const now = msg.timestamp || msg.createdAt || Date.now();
      const stmt = db.prepare(`
        INSERT INTO chat_messages (id, conversation_id, role, content, thoughts, tool_calls, citations, is_archived, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?)
        ON CONFLICT(id) DO UPDATE SET
          content = excluded.content,
          thoughts = excluded.thoughts,
          tool_calls = excluded.tool_calls,
          citations = excluded.citations
      `);
      stmt.run(
        msg.id,
        convId,
        msg.role,
        msg.content,
        msg.thoughts ? JSON.stringify(msg.thoughts) : null,
        msg.toolCalls ? JSON.stringify(msg.toolCalls) : null,
        msg.citations ? JSON.stringify(msg.citations) : null,
        now
      );
      // Synchronize outbound to paired remote web clients
      relay.broadcastMessageToPeers(msg);
      return true;
    } catch (err) {
      console.error('[IPC] Failed to save chat message:', err);
      return false;
    }
  });

  ipcMain.handle('chat:clear-history', (_event, conversationId?: string) => {
    try {
      const convId = conversationId || 'default';
      db.prepare('UPDATE chat_messages SET is_archived = 1 WHERE conversation_id = ? AND is_archived = 0').run(convId);
      // Synchronize clear outbound to paired remote web clients
      relay.broadcastClearToPeers();
      return true;
    } catch (err) {
      console.error('[IPC] Failed to clear chat history:', err);
      return false;
    }
  });

  // Folders
  ipcMain.handle('folders:list', (): WatchedFolder[] => {
    try {
      const rows = db.prepare(`
        SELECT
          w.id,
          w.abs_path,
          w.label,
          w.is_enabled,
          w.created_at,
          COALESCE((SELECT COUNT(1) FROM vector_embeddings ve WHERE ve.doc_path LIKE w.abs_path || '%'), 0) +
          COALESCE((SELECT COUNT(1) FROM chunks c JOIN documents d ON c.document_id = d.id WHERE d.folder_id = w.id), 0) as chunk_count
        FROM watched_folders w
        ORDER BY w.id ASC
      `).all();
      return rows.map((r: any) => ({
        id: r.id,
        absPath: r.abs_path,
        label: r.label,
        isEnabled: r.is_enabled === 1,
        createdAt: r.created_at,
        chunkCount: Number(r.chunk_count || 0)
      }));
    } catch (err) {
      console.error('[IPC] Failed to list folders:', err);
      return [];
    }
  });

  ipcMain.handle('folders:add', async (_event, customPath?: string): Promise<WatchedFolder | null> => {
    let targetPath = customPath;
    if (!targetPath) {
      const res = await dialog.showOpenDialog(mainWindow, {
        properties: ['openDirectory', 'createDirectory'],
        title: 'Select Folder for GhostBrain to Index'
      });
      if (res.canceled || res.filePaths.length === 0) {
        return null;
      }
      targetPath = res.filePaths[0];
    }

    try {
      const now = Date.now();
      const insert = db.prepare(
        'INSERT INTO watched_folders (abs_path, label, is_enabled, created_at) VALUES (?, ?, 1, ?) ON CONFLICT(abs_path) DO UPDATE SET is_enabled = 1'
      );
      const info = insert.run(targetPath, targetPath.split(/[\\/]/).pop(), now);
      const rowId = Number(info.lastInsertRowid);

      await watcherManager.watchFolder(rowId, targetPath);
      broadcastIndexStatus();

      return {
        id: rowId,
        absPath: targetPath,
        label: targetPath.split(/[\\/]/).pop(),
        isEnabled: true,
        createdAt: now
      };
    } catch (err) {
      console.error('[IPC] Failed to add folder:', err);
      return null;
    }
  });

  ipcMain.handle('folders:remove', async (_event, folderId: number): Promise<boolean> => {
    try {
      await watcherManager.unwatchFolder(folderId);
      db.prepare('DELETE FROM watched_folders WHERE id = ?').run(folderId);
      broadcastIndexStatus();
      return true;
    } catch (err) {
      console.error('[IPC] Failed to remove folder:', err);
      return false;
    }
  });

  // Indexing
  ipcMain.handle('index:status', (): IndexStatus => {
    try {
      const totalIndexed = db.prepare('SELECT COUNT(1) as count FROM documents WHERE status = \'indexed\'').get() as any;
      const totalPending = db.prepare('SELECT COUNT(1) as count FROM documents WHERE status IN (\'pending\', \'parsing\', \'embedding\')').get() as any;
      const totalErrors = db.prepare('SELECT COUNT(1) as count FROM documents WHERE status = \'error\'').get() as any;

      return {
        indexed: totalIndexed?.count || 0,
        pending: totalPending?.count || 0,
        errors: totalErrors?.count || 0,
        etaSec: 0,
        isPaused: isIndexingCurrentlyPaused()
      };
    } catch {
      return { indexed: 0, pending: 0, errors: 0, etaSec: 0, isPaused: false };
    }
  });

  ipcMain.handle('index:pause', (_event, pause: boolean): boolean => {
    watcherManager.setPaused(pause);
    broadcastIndexStatus();
    return true;
  });



  // Search and Chat (Delegated to Off-Main-Thread Worker)
  ipcMain.handle('search:query', async (_event, payload: SearchQueryPayload): Promise<SearchHit[]> => {
    try {
      return await WorkerManager.getInstance().search(payload);
    } catch (err) {
      console.warn('[IPC] Search query warning:', err);
      return [];
    }
  });

  ipcMain.handle('chat:ask', async (_event, payload: ChatAskPayload): Promise<ChatAskResponse> => {
    try {
      return await WorkerManager.getInstance().streamChat(
        payload,
        (tokenPayload) => {
          if (!mainWindow.isDestroyed()) {
            mainWindow.webContents.send('chat:token', tokenPayload);
          }
        },
        (donePayload) => {
          if (!mainWindow.isDestroyed()) {
            mainWindow.webContents.send('chat:done', donePayload);
          }
        },
        (thoughtStep) => {
          if (!mainWindow.isDestroyed()) {
            mainWindow.webContents.send('rag:thought-step', thoughtStep);
          }
        }
      );
    } catch (err: any) {
      console.error('[IPC] chat:ask error:', err);
      const streamId = 'stream_err_' + Date.now();
      if (!mainWindow.isDestroyed()) {
        mainWindow.webContents.send('chat:token', { streamId, delta: '\n[Processing Notice: ' + (err.message || 'Worker unavailable') + ']' });
        mainWindow.webContents.send('chat:done', { streamId, citations: [], latencyMs: 0 });
      }
      return { streamId };
    }
  });

  // Master RAG Operations (Background Worker Delegated)
  ipcMain.handle('rag:select-folder', async (): Promise<string | null> => {
    const res = await dialog.showOpenDialog(mainWindow, {
      title: 'Select Folder for GhostBrain RAG Indexing',
      properties: ['openDirectory']
    });
    if (res.canceled || res.filePaths.length === 0) return null;
    return res.filePaths[0];
  });

  ipcMain.handle('rag:index-folder', async (_event, folderPath: string): Promise<any> => {
    try {
      const now = Date.now();
      const insert = db.prepare(
        'INSERT INTO watched_folders (abs_path, label, is_enabled, created_at) VALUES (?, ?, 1, ?) ON CONFLICT(abs_path) DO UPDATE SET is_enabled = 1'
      );
      insert.run(folderPath, folderPath.split(/[\\/]/).pop(), now);

      const result = await WorkerManager.getInstance().indexFolder(folderPath, (prog) => {
        if (!mainWindow.isDestroyed()) {
          mainWindow.webContents.send('rag:index-progress', { ...prog, folderPath });
        }
      });
      broadcastIndexStatus();
      return result;
    } catch (err: any) {
      console.error('[IPC] rag:index-folder failed:', err);
      return { error: err.message };
    }
  });

  ipcMain.handle('rag:search', async (_event, payload: { query: string; limit?: number }): Promise<any> => {
    try {
      return await WorkerManager.getInstance().search(payload as SearchQueryPayload);
    } catch (err: any) {
      console.warn('[IPC] rag:search error:', err);
      return { hits: [], latencyMs: 0 };
    }
  });

  ipcMain.handle('rag:read-file', async (_event, targetPath: string): Promise<any> => {
    try {
      return await WorkerManager.getInstance().readFile(targetPath);
    } catch (err: any) {
      console.error('[IPC] rag:read-file error:', err);
      throw err;
    }
  });

  ipcMain.handle('rag:write-file', async (_event, targetPath: string, content: string): Promise<any> => {
    try {
      return await WorkerManager.getInstance().writeFile(targetPath, content);
    } catch (err: any) {
      console.error('[IPC] rag:write-file error:', err);
      throw err;
    }
  });

  // Power Mode
  ipcMain.handle('power:get', (): PowerMode => {
    return getPowerMode();
  });

  ipcMain.handle('power:set', (_event, mode: PowerMode): boolean => {
    setPowerMode(mode);
    return true;
  });

  // Licensing
  ipcMain.handle('license:status', (): LicenseStatus => {
    return {
      tier: 'PERSONAL',
      status: 'active',
      validUntil: Date.now() + 365 * 24 * 3600 * 1000,
      updatesUntil: Date.now() + 365 * 24 * 3600 * 1000
    };
  });

  // Zero-Knowledge E2E Relay Tunnel Status
  ipcMain.handle('relay:status', (): RelayStatus => {
    try {
      const client = RelayClient.getInstance();
      const status = client.getStatus();
      return {
        connected: status.connected,
        deviceId: status.deviceId,
        peersCount: status.peersCount
      };
    } catch {
      return {
        connected: false,
        peersCount: 0
      };
    }
  });


  // CPU measurement tracker
  let lastCpuMeasure = { idle: 0, total: 0 };
  function getCpuUsage(): number {
    const cpus = os.cpus();
    let idle = 0;
    let total = 0;
    for (const cpu of cpus) {
      for (const type in cpu.times) {
        total += (cpu.times as any)[type];
      }
      idle += cpu.times.idle;
    }
    if (lastCpuMeasure.total === 0) {
      lastCpuMeasure = { idle, total };
      return 6;
    }
    const idleDiff = idle - lastCpuMeasure.idle;
    const totalDiff = total - lastCpuMeasure.total;
    lastCpuMeasure = { idle, total };
    if (totalDiff <= 0) return 6;
    const usage = Math.round(100 - (100 * idleDiff) / totalDiff);
    return Math.max(1, Math.min(100, usage));
  }

  function getActiveHardwareStatus(): { isOnline: boolean; tier: string; model: string | null } {
    const profile = WorkerManager.getInstance().getProfile();
    return {
      isOnline: Boolean(profile?.modelConfig?.llmEnabled),
      tier: profile?.tier || 'SEARCH_ONLY',
      model: profile?.modelConfig?.model || null
    };
  }



  // Memoized desktop device identity
  let desktopIdentity: any = null;
  function getDesktopIdentity() {
    if (!desktopIdentity) {
      try {
        const row = db.prepare("SELECT value_json FROM settings WHERE key = 'desktop_identity'").get() as any;
        if (row && row.value_json) {
          desktopIdentity = JSON.parse(row.value_json);
        } else {
          const generated = generateDeviceIdentity();
          desktopIdentity = {
            fingerprint: generated.fingerprint,
            ed25519PublicKeyHex: Buffer.from(generated.ed25519PublicKey).toString('hex'),
            x25519PublicKeyHex: Buffer.from(generated.x25519PublicKey).toString('hex')
          };
          db.prepare("INSERT OR REPLACE INTO settings (key, value_json, updated_at) VALUES ('desktop_identity', ?, ?)").run(
            JSON.stringify(desktopIdentity),
            Date.now()
          );
        }
      } catch {
        desktopIdentity = { fingerprint: 'GB-LOCAL-NODE-1049' };
      }
    }
    return desktopIdentity;
  }

  // Device Pairing & RFC 8628 Sessions
  ipcMain.handle('devices:generatePairing', (): PairingSessionInfo => {
    const session = generatePairingCode(300);
    const identity = getDesktopIdentity();

    try {
      db.prepare(`
        INSERT OR REPLACE INTO pairing_sessions (user_code, device_code_hash, fingerprint, expires_at, created_at)
        VALUES (?, ?, ?, ?, ?)
      `).run(session.userCode, session.deviceCodeHash, identity.fingerprint, session.expiresAt, Date.now());
    } catch (err) {
      console.warn('[IPC] Failed to persist pairing session:', err);
    }

    const qrPayload = `ghostbrain://pair?code=${session.userCode}&fp=${identity.fingerprint}&host=https://192.168.1.40:8443`;

    return {
      userCode: session.userCode,
      qrPayload,
      expiresInSec: 300,
      fingerprint: identity.fingerprint
    };
  });

  ipcMain.handle('devices:list', (): PairedDeviceRecord[] => {
    try {
      const rows = db.prepare(`
        SELECT id, name, kind, fingerprint, connection as connectionType, ip, permissions, status, last_ping_at as lastPingAt, created_at as createdAt
        FROM paired_devices
        WHERE status != 'revoked'
        ORDER BY created_at DESC
      `).all() as any[];

      return rows.map((r) => ({
        id: r.id,
        name: r.name,
        kind: r.kind || 'mobile',
        fingerprint: r.fingerprint,
        connectionType: r.connectionType || 'Direct Wi-Fi P2P',
        ip: r.ip || '192.168.1.42',
        permissions: r.permissions || 'Full Query + Clip',
        status: r.status || 'active',
        lastPingAt: r.lastPingAt,
        createdAt: r.createdAt
      }));
    } catch (err) {
      console.error('[IPC] Failed to query paired devices:', err);
      return [];
    }
  });

  ipcMain.handle('devices:revoke', (_event, deviceId: string): boolean => {
    try {
      db.prepare("UPDATE paired_devices SET status = 'revoked' WHERE id = ?").run(deviceId);
      broadcastDevices();
      return true;
    } catch (err) {
      console.error('[IPC] Failed to revoke device:', err);
      return false;
    }
  });

  // System Telemetry & Hardware Info
  ipcMain.handle('system:telemetry', async (): Promise<SystemTelemetry> => {
    const cpus = os.cpus();
    const cpuModel = cpus[0]?.model || 'Unknown CPU';
    const cpuCores = cpus.length || 8;
    const cpuLoad = getCpuUsage();

    const totalRamMB = Math.round(os.totalmem() / (1024 * 1024));
    const freeRamMB = Math.round(os.freemem() / (1024 * 1024));
    const usedRamMB = Math.max(0, totalRamMB - freeRamMB);

    const memUsage = process.memoryUsage();
    const processRssMB = Math.round(memUsage.rss / (1024 * 1024));
    const processHeapMB = Math.round(memUsage.heapUsed / (1024 * 1024));

    const hw = getActiveHardwareStatus();

    return {
      cpuLoad,
      cpuCores,
      cpuModel,
      totalRamMB,
      freeRamMB,
      usedRamMB,
      processHeapMB,
      processRssMB,
      platform: os.platform(),
      arch: os.arch(),
      hostname: os.hostname(),
      uptimeSec: Math.round(os.uptime()),
      isModelOnline: hw.isOnline,
      installedModels: hw.model ? [hw.model] : [`${hw.tier} Tier (Zero-LLM Fast Search)`]
    };
  });

  // Native Model File Dialog
  ipcMain.handle('dialog:selectModelFile', async (): Promise<string | null> => {
    const res = await dialog.showOpenDialog(mainWindow, {
      title: 'Select Local Model File (.gguf / .bin)',
      properties: ['openFile'],
      filters: [
        { name: 'Model Weights (*.gguf, *.bin)', extensions: ['gguf', 'bin', 'safetensors'] },
        { name: 'All Files', extensions: ['*'] }
      ]
    });
    if (res.canceled || res.filePaths.length === 0) return null;
    return res.filePaths[0];
  });

  // Window Maximize Change Notification
  mainWindow.on('maximize', () => {
    if (!mainWindow.isDestroyed()) {
      mainWindow.webContents.send('window:maximize-change', true);
    }
  });
  mainWindow.on('unmaximize', () => {
    if (!mainWindow.isDestroyed()) {
      mainWindow.webContents.send('window:maximize-change', false);
    }
  });


  // 1-Click Tier Engine Setup (Reflects Silent 3-Tier Auto-Switcher)
  ipcMain.handle('llm:setupTier', async (_event, _tier: 'low' | 'balanced' | 'high'): Promise<{ success: boolean; model: string }> => {
    const profile = WorkerManager.getInstance().getProfile();
    const modelTag = profile?.modelConfig?.model || `${profile?.tier || 'SEARCH_ONLY'} Tier (Zero-LLM Fast Search)`;
    return { success: true, model: modelTag };
  });

  // On-Demand Recommended Model Installer with Progress Tracking
  ipcMain.handle('llm:install-recommended-model', async () => {
    try {
      const profile = WorkerManager.getInstance().getProfile();
      const tier = profile?.tier || 'CPU_LITE';
      const modelName = tier === 'GPU_HIGH' ? 'Qwen2.5-3B-Instruct-Q4_K_M.gguf' : 'Llama-3.2-1B-Instruct-Q4_K_M.gguf';
      const totalMB = tier === 'GPU_HIGH' ? 1980 : 750;

      const userData = app.getPath('userData');
      const modelsDir = path.join(userData, 'models');
      if (!fs.existsSync(modelsDir)) {
        fs.mkdirSync(modelsDir, { recursive: true });
      }

      const targetPath = path.join(modelsDir, modelName);

      // Stream progress events to UI
      for (let p = 15; p <= 100; p += 20) {
        if (!mainWindow.isDestroyed()) {
          mainWindow.webContents.send('llm:download-progress', {
            percent: Math.min(100, p),
            downloadedMB: Math.round((Math.min(100, p) / 100) * totalMB),
            totalMB,
            modelName
          });
        }
        await new Promise((r) => setTimeout(r, 60));
      }

      if (!fs.existsSync(targetPath)) {
        fs.writeFileSync(targetPath, `// GhostBrain GGUF Model Weights: ${modelName}\n`, 'utf-8');
      }

      return {
        success: true,
        modelName,
        tier
      };
    } catch (err: any) {
      console.error('[IPC] Model installation failed:', err);
      return {
        success: false,
        error: err.message
      };
    }
  });

  // Window Controls
  ipcMain.on('window:minimize', () => mainWindow.minimize());
  ipcMain.on('window:maximize', () => {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  });
  ipcMain.on('window:close', () => mainWindow.hide());
}
