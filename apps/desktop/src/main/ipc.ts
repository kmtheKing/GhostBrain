import { ipcMain, dialog, BrowserWindow } from 'electron';
import { getDatabase } from './db/index.js';
import { hybridSearch } from './db/search.js';
import { getPowerMode, setPowerMode, isIndexingCurrentlyPaused } from './tray.js';
import { buildRagPrompt, parseCitations, OllamaProvider, type ChatMessage } from '@ghostbrain/core';
import type {
  WatchedFolder,
  IndexStatus,
  PowerMode,
  LicenseStatus,
  SearchQueryPayload,
  SearchHit,
  ChatAskPayload,
  ChatAskResponse
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
      const rows = db.prepare('SELECT id, abs_path, label, is_enabled, created_at FROM watched_folders ORDER BY id ASC').all();
      return rows.map((r: any) => ({
        id: r.id,
        absPath: r.abs_path,
        label: r.label,
        isEnabled: r.is_enabled === 1,
        createdAt: r.created_at
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
