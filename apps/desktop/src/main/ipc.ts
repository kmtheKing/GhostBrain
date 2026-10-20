import os from 'os';
import { ipcMain, dialog, BrowserWindow } from 'electron';
import { getDatabase } from './db/index.js';
import { hybridSearch } from './db/search.js';
import { getPowerMode, setPowerMode, isIndexingCurrentlyPaused } from './tray.js';
import { buildRagPrompt, parseCitations, OllamaProvider, generatePairingCode, generateDeviceIdentity, computeDeviceFingerprint, type ChatMessage } from '@ghostbrain/core';
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
  PairingSessionInfo
} from '@ghostbrain/shared-types';

import { FolderWatcherManager } from './indexer/watcher.js';

export function registerIpcHandlers(mainWindow: BrowserWindow, watcherManager: FolderWatcherManager): void {
  const db = getDatabase();

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

  // Search and Chat
  ipcMain.handle('search:query', (_event, payload: SearchQueryPayload): SearchHit[] => {
    try {
      return hybridSearch(db, payload);
    } catch (err) {
      console.warn('[IPC] Search query warning:', err);
      return [];
    }
  });

  ipcMain.handle('chat:ask', async (_event, payload: ChatAskPayload): Promise<ChatAskResponse> => {
    const streamId = 'stream_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
    const startTime = Date.now();

    const hits = hybridSearch(db, { query: payload.query, limit: 6 });
    const ragPrompt = buildRagPrompt(payload.query, hits);

    (async () => {
      let fullResponse = '';
      try {
        const ollama = new OllamaProvider();
        const isOllamaOnline = await ollama.checkHealth();

        if (isOllamaOnline) {
          const messages: ChatMessage[] = [
            { role: 'system', content: ragPrompt.systemPrompt },
            { role: 'user', content: ragPrompt.userPrompt }
          ];

          for await (const token of ollama.streamChat(messages)) {
            if (mainWindow.isDestroyed()) return;
            fullResponse += token;
            mainWindow.webContents.send('chat:token', { streamId, delta: token });
          }
        } else {
          const fallbackText = hits.length > 0
            ? 'Found ' + hits.length + ' relevant context chunk(s) in your local documents [S1], but your local LLM (Ollama) is offline at http://127.0.0.1:11434. Please start Ollama or llama-server to stream real-time local intelligence.'
            : 'No relevant local documents were found for your query, and your local LLM is currently offline.';

          for (const word of fallbackText.split(' ')) {
            if (mainWindow.isDestroyed()) return;
            fullResponse += word + ' ';
            mainWindow.webContents.send('chat:token', { streamId, delta: word + ' ' });
            await new Promise(r => setTimeout(r, 20));
          }
        }

        const citations = parseCitations(fullResponse, hits);
        const latencyMs = Date.now() - startTime;

        if (!mainWindow.isDestroyed()) {
          mainWindow.webContents.send('chat:done', {
            streamId,
            citations,
            latencyMs
          });
        }
      } catch (err: any) {
        console.error('[IPC] chat:ask streaming error:', err);
        if (!mainWindow.isDestroyed()) {
          mainWindow.webContents.send('chat:token', {
            streamId,
            delta: '\n\n[Error: ' + (err.message || 'Streaming failed') + ']'
          });
          mainWindow.webContents.send('chat:done', {
            streamId,
            citations: parseCitations(fullResponse, hits),
            latencyMs: Date.now() - startTime
          });
        }
      }
    })();

    return { streamId };
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

  async function checkLocalModelOnline(): Promise<{ isOnline: boolean; models: string[] }> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 600);
      const res = await fetch('http://127.0.0.1:11434/api/tags', { signal: controller.signal });
      clearTimeout(timeoutId);
      if (res.ok) {
        const data: any = await res.json();
        const models = (data.models || []).map((m: any) => m.name || m.model);
        return { isOnline: true, models };
      }
    } catch {}
    return { isOnline: false, models: [] };
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

    const modelCheck = await checkLocalModelOnline();

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
      isModelOnline: modelCheck.isOnline,
      installedModels: modelCheck.models
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
