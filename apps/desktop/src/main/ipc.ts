import { ipcMain, dialog, BrowserWindow } from 'electron';
import { getDatabase } from './db/index.js';
import { getPowerMode, setPowerMode, isIndexingCurrentlyPaused } from './tray.js';
import type {
  WatchedFolder,
  IndexStatus,
  PowerMode,
  LicenseStatus,
  SearchQueryPayload,
  SearchHit
} from '@ghostbrain/shared-types';

import { FolderWatcherManager } from './indexer/watcher.js';

export function registerIpcHandlers(mainWindow: BrowserWindow, watcherManager: FolderWatcherManager): void {
  const db = getDatabase();

  // Helper to emit live index status to renderer
  function broadcastIndexStatus() {
    try {
      if (mainWindow.isDestroyed()) return;
      const totalIndexed = db.prepare("SELECT COUNT(*) as count FROM documents WHERE status = 'indexed'").get() as any;
      const totalPending = db.prepare("SELECT COUNT(*) as count FROM documents WHERE status IN ('pending', 'parsing', 'embedding')").get() as any;
      const totalErrors = db.prepare("SELECT COUNT(*) as count FROM documents WHERE status = 'error'").get() as any;

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

  // Subscribe watcher events to broadcast live indexing status
  watcherManager.onEvent(() => {
    broadcastIndexStatus();
  });

  // ── Folders ────────────────────────────────────────────────────────
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

      // Start live file watcher & initial sync
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

  // ── Indexing ───────────────────────────────────────────────────────
  ipcMain.handle('index:status', (): IndexStatus => {
    try {
      const totalIndexed = db.prepare("SELECT COUNT(*) as count FROM documents WHERE status = 'indexed'").get() as any;
      const totalPending = db.prepare("SELECT COUNT(*) as count FROM documents WHERE status IN ('pending', 'parsing', 'embedding')").get() as any;
      const totalErrors = db.prepare("SELECT COUNT(*) as count FROM documents WHERE status = 'error'").get() as any;

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

  // ── Search & Chat ──────────────────────────────────────────────────
  ipcMain.handle('search:query', (_event, payload: SearchQueryPayload): SearchHit[] => {
    try {
      // FTS5 Search query
      const sanitized = payload.query.replace(/["*]/g, '').trim();
      if (!sanitized) return [];

      const ftsResults = db.prepare(`
        SELECT c.id AS chunkId, c.document_id AS documentId, d.rel_path AS relPath, c.heading_path AS headingPath, c.text, bm25(fts_chunks) AS score
        FROM fts_chunks
        JOIN chunks c ON c.id = fts_chunks.rowid
        JOIN documents d ON d.id = c.document_id
        WHERE fts_chunks MATCH ?
        LIMIT ?
      `).all(`"${sanitized}"*`, payload.limit || 8) as any[];

      return ftsResults.map((r) => ({
        chunkId: r.chunkId,
        documentId: r.documentId,
        relPath: r.relPath,
        headingPath: r.headingPath,
        text: r.text,
        rrfScore: Math.abs(r.score)
      }));
    } catch (err) {
      console.warn('[IPC] Search query warning:', err);
      return [];
    }
  });

  // ── Power Mode ─────────────────────────────────────────────────────
  ipcMain.handle('power:get', (): PowerMode => {
    return getPowerMode();
  });

  ipcMain.handle('power:set', (_event, mode: PowerMode): boolean => {
    setPowerMode(mode);
    return true;
  });

  // ── Licensing ──────────────────────────────────────────────────────
  ipcMain.handle('license:status', (): LicenseStatus => {
    return {
      tier: 'PERSONAL',
      status: 'active',
      validUntil: Date.now() + 365 * 24 * 3600 * 1000,
      updatesUntil: Date.now() + 365 * 24 * 3600 * 1000
    };
  });

  // ── Window Controls ────────────────────────────────────────────────
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
