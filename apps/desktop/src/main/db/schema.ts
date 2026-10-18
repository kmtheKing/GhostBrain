export const SCHEMA_V1 = `
-- Pragmas are executed per-connection
CREATE TABLE IF NOT EXISTS schema_meta (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS settings (
  key        TEXT PRIMARY KEY,
  value_json TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS watched_folders (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  abs_path      TEXT NOT NULL UNIQUE,
  label         TEXT,
  include_globs TEXT NOT NULL DEFAULT '["**/*.{md,txt,pdf,docx,pptx,xlsx,html}"]',
  exclude_globs TEXT NOT NULL DEFAULT '["**/node_modules/**","**/.git/**"]',
  is_enabled    INTEGER NOT NULL DEFAULT 1 CHECK (is_enabled IN (0,1)),
  created_at    INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS documents (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  folder_id    INTEGER NOT NULL REFERENCES watched_folders(id) ON DELETE CASCADE,
  rel_path     TEXT NOT NULL,
  content_hash BLOB NOT NULL,
  mime         TEXT,
  size_bytes   INTEGER NOT NULL,
  mtime_ms     INTEGER NOT NULL,
  parser       TEXT NOT NULL,
  status       TEXT NOT NULL DEFAULT 'pending'
               CHECK (status IN ('pending','parsing','embedding','indexed','error','deleted')),
  error        TEXT,
  indexed_at   INTEGER,
  UNIQUE (folder_id, rel_path)
);
CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(status);
CREATE INDEX IF NOT EXISTS idx_documents_hash   ON documents(content_hash);

CREATE TABLE IF NOT EXISTS chunks (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  document_id  INTEGER NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  folder_id    INTEGER NOT NULL,
  ordinal      INTEGER NOT NULL,
  chunk_hash   BLOB NOT NULL,
  heading_path TEXT,
  text         TEXT NOT NULL,
  token_count  INTEGER NOT NULL,
  char_start   INTEGER NOT NULL,
  char_end     INTEGER NOT NULL,
  UNIQUE (document_id, ordinal)
);
CREATE INDEX IF NOT EXISTS idx_chunks_hash   ON chunks(chunk_hash);
CREATE INDEX IF NOT EXISTS idx_chunks_folder ON chunks(folder_id);

CREATE TABLE IF NOT EXISTS embedding_cache (
  chunk_hash BLOB NOT NULL,
  model_id   TEXT NOT NULL,
  vector     BLOB NOT NULL,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (chunk_hash, model_id)
) WITHOUT ROWID;

CREATE TABLE IF NOT EXISTS index_jobs (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  document_id INTEGER NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  stage       TEXT NOT NULL CHECK (stage IN ('parse','embed')),
  attempts    INTEGER NOT NULL DEFAULT 0,
  next_run_at INTEGER NOT NULL,
  last_error  TEXT,
  UNIQUE (document_id, stage)
);

CREATE TABLE IF NOT EXISTS conversations (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  title      TEXT,
  origin     TEXT NOT NULL DEFAULT 'local' CHECK (origin IN ('local','relay','demo','lan')),
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS messages (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  conversation_id INTEGER NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  role            TEXT NOT NULL CHECK (role IN ('user','assistant','system')),
  content         TEXT NOT NULL,
  citations_json  TEXT,
  model_id        TEXT,
  latency_ms      INTEGER,
  created_at      INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_messages_conv ON messages(conversation_id, created_at);
`;
