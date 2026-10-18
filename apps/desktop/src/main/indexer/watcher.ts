import chokidar, { type FSWatcher } from 'chokidar';
import type { Database } from 'better-sqlite3-multiple-ciphers';
import { IngestionPipeline, type IndexingResult } from './pipeline.js';
import { relative } from 'path';

export interface WatcherEvent {
  type: 'add' | 'change' | 'unlink';
  folderId: number;
  relPath: string;
  result?: IndexingResult;
}

export type WatcherEventCallback = (event: WatcherEvent) => void;

export class FolderWatcherManager {
  private db: Database;
  private pipeline: IngestionPipeline;
  private watchers = new Map<number, FSWatcher>();
  private onEventCallbacks: WatcherEventCallback[] = [];
  private isPaused = false;

  constructor(db: Database) {
    this.db = db;
    this.pipeline = new IngestionPipeline(db);
  }

  getPipeline(): IngestionPipeline {
    return this.pipeline;
  }

  onEvent(callback: WatcherEventCallback): () => void {
    this.onEventCallbacks.push(callback);
    return () => {
      this.onEventCallbacks = this.onEventCallbacks.filter((cb) => cb !== callback);
    };
  }

  private emitEvent(event: WatcherEvent) {
    for (const cb of this.onEventCallbacks) {
      try {
        cb(event);
      } catch (err) {
        console.error('[Watcher] Event listener error:', err);
      }
    }
  }

  setPaused(paused: boolean) {
    this.isPaused = paused;
    console.log(`[Watcher] Indexing paused state set to: ${paused}`);
  }

  getPaused(): boolean {
    return this.isPaused;
  }

  /**
   * Starts watching a specific folder by ID and absolute path.
   */
  async watchFolder(folderId: number, absPath: string): Promise<void> {
    if (this.watchers.has(folderId)) {
      await this.unwatchFolder(folderId);
    }

    console.log(`[Watcher] Initializing watcher for folder [${folderId}]: ${absPath}`);

    // Initial folder synchronization
    try {
      const stats = await this.pipeline.syncFolder(folderId, absPath);
      console.log(
        `[Watcher] Initial sync complete for [${folderId}]: ${stats.indexed} indexed, ${stats.skipped} skipped, ${stats.renamed} renamed, ${stats.deleted} deleted`
      );
    } catch (err) {
      console.error(`[Watcher] Error during initial sync of ${absPath}:`, err);
    }

    // Configure chokidar watcher with crash-safety and write stability
    const watcher = chokidar.watch(absPath, {
      ignored: [
        '**/node_modules/**',
        '**/.git/**',
        '**/.DS_Store',
        '**/Thumbs.db',
        '**/.*'
      ],
      persistent: true,
      ignoreInitial: true, // initial scan already handled deterministically above
      awaitWriteFinish: {
        stabilityThreshold: 500,
        pollInterval: 100
      }
    });

    watcher
      .on('add', async (filePath) => {
        if (this.isPaused) return;
        const relPath = relative(absPath, filePath).replace(/\\/g, '/');
        const res = await this.pipeline.indexFile(folderId, absPath, relPath);
        this.emitEvent({ type: 'add', folderId, relPath, result: res });
      })
      .on('change', async (filePath) => {
        if (this.isPaused) return;
        const relPath = relative(absPath, filePath).replace(/\\/g, '/');
        const res = await this.pipeline.indexFile(folderId, absPath, relPath);
        this.emitEvent({ type: 'change', folderId, relPath, result: res });
      })
      .on('unlink', (filePath) => {
        if (this.isPaused) return;
        const relPath = relative(absPath, filePath).replace(/\\/g, '/');
        this.pipeline.removeFile(folderId, relPath);
        this.emitEvent({ type: 'unlink', folderId, relPath });
      })
      .on('error', (err) => {
        console.error(`[Watcher] Error in watcher [${folderId}]:`, err);
      });

    this.watchers.set(folderId, watcher);
  }

  /**
   * Unwatches and closes the file watcher for a given folder ID.
   */
  async unwatchFolder(folderId: number): Promise<void> {
    const watcher = this.watchers.get(folderId);
    if (watcher) {
      await watcher.close();
      this.watchers.delete(folderId);
      console.log(`[Watcher] Unwatched folder [${folderId}]`);
    }
  }

  /**
   * Bootstraps all active folders from the database on startup.
   */
  async startAll(): Promise<void> {
    const folders = this.db
      .prepare('SELECT id, abs_path FROM watched_folders WHERE is_enabled = 1')
      .all() as { id: number; abs_path: string }[];

    console.log(`[Watcher] Bootstrapping ${folders.length} watched folders...`);
    for (const f of folders) {
      await this.watchFolder(f.id, f.abs_path);
    }
  }

  /**
   * Stops all active watchers cleanly on app exit.
   */
  async stopAll(): Promise<void> {
    for (const [id, watcher] of this.watchers.entries()) {
      await watcher.close();
    }
    this.watchers.clear();
    console.log('[Watcher] All watchers stopped.');
  }
}
