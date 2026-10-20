import Database, { type Database as DatabaseInstance } from 'better-sqlite3-multiple-ciphers';
import * as sqliteVec from 'sqlite-vec';
import { app } from 'electron';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { SCHEMA_V1, SCHEMA_V2 } from './schema.js';

let dbInstance: DatabaseInstance | null = null;

export function getDatabasePath(): string {
  const userData = app.getPath('userData');
  const dbDir = join(userData, 'data');
  if (!existsSync(dbDir)) {
    mkdirSync(dbDir, { recursive: true });
  }
  return join(dbDir, 'brain.sqlite');
}

export function initDatabase(customPath?: string): DatabaseInstance {
  if (dbInstance) {
    return dbInstance;
  }

  const dbPath = customPath || getDatabasePath();
  const db = new Database(dbPath);

  // Apply performance & integrity pragmas
  db.pragma('journal_mode = WAL');
  db.pragma('synchronous = NORMAL');
  db.pragma('foreign_keys = ON');
  db.pragma('busy_timeout = 5000');
  db.pragma('temp_store = MEMORY');

  // Load sqlite-vec extension
  try {
    sqliteVec.load(db);
  } catch (err) {
    console.warn('[DB] sqlite-vec failed to load natively; vector search will fallback:', err);
  }

  // Execute base tables
  db.exec(SCHEMA_V1);
  db.exec(SCHEMA_V2);

  // Setup vec0 and FTS5 if not already initialized
  try {
    db.exec(`
      CREATE VIRTUAL TABLE IF NOT EXISTS vec_chunks USING vec0(
        chunk_id  INTEGER PRIMARY KEY,
        folder_id INTEGER,
        embedding float[384] distance_metric=cosine
      );
    `);
  } catch (err) {
    console.warn('[DB] Could not initialize vec_chunks virtual table:', err);
  }

  try {
    db.exec(`
      CREATE VIRTUAL TABLE IF NOT EXISTS fts_chunks USING fts5(
        text, heading_path,
        content='chunks', content_rowid='id',
        tokenize='porter unicode61 remove_diacritics 2'
      );

      -- FTS Sync Triggers
      CREATE TRIGGER IF NOT EXISTS chunks_ai AFTER INSERT ON chunks BEGIN
        INSERT INTO fts_chunks(rowid, text, heading_path) VALUES (new.id, new.text, new.heading_path);
      END;
      CREATE TRIGGER IF NOT EXISTS chunks_ad AFTER DELETE ON chunks BEGIN
        INSERT INTO fts_chunks(fts_chunks, rowid, text, heading_path)
          VALUES ('delete', old.id, old.text, old.heading_path);
      END;
    `);
  } catch (err) {
    console.warn('[DB] Could not initialize fts_chunks virtual table:', err);
  }

  // Set schema metadata version if missing
  const checkVersion = db.prepare('SELECT value FROM schema_meta WHERE key = ?').get('schema_version');
  if (!checkVersion) {
    db.prepare('INSERT INTO schema_meta (key, value) VALUES (?, ?)').run('schema_version', '1.0.0');
    db.prepare('INSERT INTO schema_meta (key, value) VALUES (?, ?)').run('embedding_model_id', 'all-MiniLM-L6-v2');
    db.prepare('INSERT INTO schema_meta (key, value) VALUES (?, ?)').run('embedding_dims', '384');
  }

  dbInstance = db;
  return db;
}

export function getDatabase(): DatabaseInstance {
  if (!dbInstance) {
    return initDatabase();
  }
  return dbInstance;
}

export function closeDatabase(): void {
  if (dbInstance) {
    try {
      dbInstance.close();
    } catch {}
    dbInstance = null;
  }
}
