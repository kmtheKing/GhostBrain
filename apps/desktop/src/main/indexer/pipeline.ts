import type { Database } from 'better-sqlite3-multiple-ciphers';
import { computeFileBlake3, chunkMarkdown, defaultParserRouter } from '@ghostbrain/core';
import { promises as fs } from 'fs';
import { join, relative } from 'path';

export interface IndexingResult {
  status: 'indexed' | 'skipped_unchanged' | 'renamed' | 'error';
  relPath: string;
  chunkCount?: number;
  error?: string;
}

export interface FolderSyncStats {
  totalFiles: number;
  indexed: number;
  skipped: number;
  renamed: number;
  deleted: number;
  errors: number;
}

export class IngestionPipeline {
  private db: Database;

  constructor(db: Database) {
    this.db = db;
  }

  /**
   * Indexes a single file within a watched folder.
   * Performs streaming BLAKE3 hashing, rename detection, parser routing, and chunking.
   */
  async indexFile(folderId: number, folderAbsPath: string, relPath: string): Promise<IndexingResult> {
    const fullPath = join(folderAbsPath, relPath);

    try {
      // 1. Check if parser supports this file format
      if (!defaultParserRouter.findParser(fullPath)) {
        return { status: 'skipped_unchanged', relPath };
      }

      // 2. Stream compute BLAKE3 hash & stat
      const hashResult = await computeFileBlake3(fullPath);
      const hashBuffer = Buffer.from(hashResult.hash);

      // 3. Query existing document record for this folder & path
      const existingDoc = this.db
        .prepare('SELECT id, content_hash, mtime_ms FROM documents WHERE folder_id = ? AND rel_path = ?')
        .get(folderId, relPath) as { id: number; content_hash: Buffer; mtime_ms: number } | undefined;

      // Unchanged detection: exact same hash
      if (existingDoc && Buffer.compare(existingDoc.content_hash, hashBuffer) === 0) {
        // Touch mtime_ms if modified on disk without content change
        if (existingDoc.mtime_ms !== hashResult.mtimeMs) {
          this.db
            .prepare('UPDATE documents SET mtime_ms = ? WHERE id = ?')
            .run(hashResult.mtimeMs, existingDoc.id);
        }
        return { status: 'skipped_unchanged', relPath };
      }

      // 4. Rename detection: does this exact content_hash exist under a different rel_path?
      const renamedDoc = this.db
        .prepare(
          'SELECT id, rel_path FROM documents WHERE folder_id = ? AND content_hash = ? AND rel_path != ?'
        )
        .get(folderId, hashBuffer, relPath) as { id: number; rel_path: string } | undefined;

      if (renamedDoc) {
        // Verify old file no longer exists on disk
        const oldFileExists = await fs
          .access(join(folderAbsPath, renamedDoc.rel_path))
          .then(() => true)
          .catch(() => false);

        if (!oldFileExists) {
          // Update path in-place with 0 re-indexing / 0 re-embedding cost
          this.db
            .prepare('UPDATE documents SET rel_path = ?, mtime_ms = ?, indexed_at = ? WHERE id = ?')
            .run(relPath, hashResult.mtimeMs, Date.now(), renamedDoc.id);

          return { status: 'renamed', relPath };
        }
      }

      // 5. Parse document into markdown
      const parsed = await defaultParserRouter.parse(fullPath);

      // 6. Split into heading-aware semantic chunks
      const chunks = chunkMarkdown(parsed.text);

      // 7. Atomic SQLite transaction to write document & chunks
      const runTransaction = this.db.transaction(() => {
        // Upsert document record
        const now = Date.now();
        let docId: number;

        if (existingDoc) {
          this.db
            .prepare(
              `UPDATE documents 
               SET content_hash = ?, mime = ?, size_bytes = ?, mtime_ms = ?, parser = ?, status = 'indexed', error = NULL, indexed_at = ?
               WHERE id = ?`
            )
            .run(
              hashBuffer,
              parsed.mime,
              hashResult.sizeBytes,
              hashResult.mtimeMs,
              parsed.parser,
              now,
              existingDoc.id
            );
          docId = existingDoc.id;

          // Delete old chunks (triggers will automatically delete from fts_chunks & vec_chunks)
          this.db.prepare('DELETE FROM chunks WHERE document_id = ?').run(docId);
        } else {
          const insertStmt = this.db.prepare(
            `INSERT INTO documents (folder_id, rel_path, content_hash, mime, size_bytes, mtime_ms, parser, status, indexed_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, 'indexed', ?)`
          );
          const info = insertStmt.run(
            folderId,
            relPath,
            hashBuffer,
            parsed.mime,
            hashResult.sizeBytes,
            hashResult.mtimeMs,
            parsed.parser,
            now
          );
          docId = Number(info.lastInsertRowid);
        }

        // Insert new chunks (triggers automatically index into fts_chunks)
        const insertChunk = this.db.prepare(
          `INSERT INTO chunks (document_id, folder_id, ordinal, chunk_hash, heading_path, text, token_count, char_start, char_end)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
        );

        for (const chunk of chunks) {
          insertChunk.run(
            docId,
            folderId,
            chunk.ordinal,
            Buffer.from(chunk.chunkHash),
            chunk.headingPath || null,
            chunk.text,
            chunk.tokenCount,
            chunk.charStart,
            chunk.charEnd
          );
        }

        // Register index_job for the embedder stage
        this.db
          .prepare(
            `INSERT INTO index_jobs (document_id, stage, attempts, next_run_at)
             VALUES (?, 'embed', 0, ?)
             ON CONFLICT(document_id, stage) DO UPDATE SET attempts = 0, next_run_at = excluded.next_run_at`
          )
          .run(docId, now);
      });

      runTransaction();

      return {
        status: 'indexed',
        relPath,
        chunkCount: chunks.length
      };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      this.db
        .prepare(
          `INSERT INTO documents (folder_id, rel_path, content_hash, size_bytes, mtime_ms, parser, status, error)
           VALUES (?, ?, X'00', 0, 0, 'error', 'error', ?)
           ON CONFLICT(folder_id, rel_path) DO UPDATE SET status = 'error', error = excluded.error`
        )
        .run(folderId, relPath, errorMsg);

      return {
        status: 'error',
        relPath,
        error: errorMsg
      };
    }
  }

  /**
   * Removes a document when deleted from disk.
   * Cascade deletes chunks, which triggers removal from FTS5 and vec0.
   */
  removeFile(folderId: number, relPath: string): void {
    this.db.prepare('DELETE FROM documents WHERE folder_id = ? AND rel_path = ?').run(folderId, relPath);
  }

  /**
   * Recursively synchronizes an entire watched folder.
   */
  async syncFolder(folderId: number, folderAbsPath: string): Promise<FolderSyncStats> {
    const stats: FolderSyncStats = {
      totalFiles: 0,
      indexed: 0,
      skipped: 0,
      renamed: 0,
      deleted: 0,
      errors: 0
    };

    const diskRelPaths = new Set<string>();

    async function walk(dir: string) {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        // Skip ignored directories
        if (entry.isDirectory()) {
          if (entry.name === 'node_modules' || entry.name === '.git' || entry.name.startsWith('.')) {
            continue;
          }
          await walk(join(dir, entry.name));
        } else if (entry.isFile()) {
          const rel = relative(folderAbsPath, join(dir, entry.name)).replace(/\\/g, '/');
          diskRelPaths.add(rel);
        }
      }
    }

    try {
      await walk(folderAbsPath);
    } catch (err) {
      console.error(`[Pipeline] Failed walking directory ${folderAbsPath}:`, err);
      return stats;
    }

    stats.totalFiles = diskRelPaths.size;

    // Index or verify every file on disk
    for (const relPath of diskRelPaths) {
      const res = await this.indexFile(folderId, folderAbsPath, relPath);
      if (res.status === 'indexed') stats.indexed++;
      else if (res.status === 'skipped_unchanged') stats.skipped++;
      else if (res.status === 'renamed') stats.renamed++;
      else if (res.status === 'error') stats.errors++;
    }

    // Check for deleted files: records in DB not found on disk
    const dbDocs = this.db
      .prepare('SELECT rel_path FROM documents WHERE folder_id = ?')
      .all(folderId) as { rel_path: string }[];

    for (const doc of dbDocs) {
      if (!diskRelPaths.has(doc.rel_path)) {
        this.removeFile(folderId, doc.rel_path);
        stats.deleted++;
      }
    }

    return stats;
  }
}
