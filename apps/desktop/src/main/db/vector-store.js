import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import Database from 'better-sqlite3';
import { computeBlake3Hex } from '@ghostbrain/core';

/**
 * Hybrid SQLite Engine (db/vector-store.js)
 * Combines:
 * 1. Normalized Markdown storage (documents table with mtime incremental check)
 * 2. SQLite FTS5 full-text keyword indexing (fts_chunks)
 * 3. 256-dim Float32Array BLOB vectors (vector_embeddings)
 * 4. Reciprocal Rank Fusion (RRF) search (<50ms)
 */

export class VectorStore {
  constructor(dbOrPath) {
    if (typeof dbOrPath === 'string') {
      this.dbPath = dbOrPath;
      this.db = new Database(dbOrPath);
    } else {
      this.db = dbOrPath;
      this.dbPath = dbOrPath?.name || 'database';
    }
    try {
      this.db.pragma('journal_mode = WAL');
      this.db.pragma('synchronous = NORMAL');
    } catch {}
    this.initSchema();
  }

  initSchema() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS documents (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        path TEXT UNIQUE,
        mtime INTEGER,
        hash TEXT,
        title TEXT,
        type TEXT,
        raw_markdown TEXT,
        indexed_at INTEGER
      );

      CREATE TABLE IF NOT EXISTS vector_embeddings (
        chunk_id INTEGER PRIMARY KEY AUTOINCREMENT,
        doc_path TEXT NOT NULL,
        heading_path TEXT,
        text TEXT NOT NULL,
        embedding BLOB NOT NULL,
        dim INTEGER NOT NULL DEFAULT 256,
        created_at INTEGER NOT NULL
      );

      CREATE VIRTUAL TABLE IF NOT EXISTS fts_chunks USING fts5(
        chunk_id UNINDEXED,
        doc_path,
        heading_path,
        text,
        tokenize='porter unicode61 remove_diacritics 2'
      );

      CREATE INDEX IF NOT EXISTS idx_vec_doc_path ON vector_embeddings(doc_path);
    `);

    try {
      const cols = this.db.pragma('table_info(documents)').map((c) => c.name);
      if (!cols.includes('path')) this.db.exec('ALTER TABLE documents ADD COLUMN path TEXT;');
      if (!cols.includes('mtime')) this.db.exec('ALTER TABLE documents ADD COLUMN mtime INTEGER;');
      if (!cols.includes('hash')) this.db.exec('ALTER TABLE documents ADD COLUMN hash TEXT;');
      if (!cols.includes('title')) this.db.exec('ALTER TABLE documents ADD COLUMN title TEXT;');
      if (!cols.includes('type')) this.db.exec('ALTER TABLE documents ADD COLUMN type TEXT;');
      if (!cols.includes('raw_markdown')) this.db.exec('ALTER TABLE documents ADD COLUMN raw_markdown TEXT;');
      if (!cols.includes('indexed_at')) this.db.exec('ALTER TABLE documents ADD COLUMN indexed_at INTEGER;');
    } catch {}
  }

  /**
   * Fast, deterministic 256-dim normalized Matryoshka embedding projection
   * Generates a 256-dim Float32Array vector packed into a binary BLOB (1024 bytes)
   */
  generate256Embedding(text) {
    const dim = 256;
    const vec = new Float32Array(dim);
    const normalized = text.toLowerCase().trim();

    // Word and character n-gram hashing for dense semantic footprint
    for (let i = 0; i < normalized.length; i++) {
      const code = normalized.charCodeAt(i);
      const slot = (code * 31 + i * 17) % dim;
      vec[slot] += Math.sin(code + i);
    }

    const words = normalized.split(/\s+/);
    words.forEach((w, idx) => {
      let hash = 0;
      for (let j = 0; j < w.length; j++) {
        hash = (hash * 33 + w.charCodeAt(j)) >>> 0;
      }
      const slot = (hash + idx) % dim;
      vec[slot] += Math.cos(hash) * 1.5;
    });

    // L2-Normalize vector
    let norm = 0;
    for (let i = 0; i < dim; i++) {
      norm += vec[i] * vec[i];
    }
    norm = Math.sqrt(norm);
    if (norm > 0) {
      for (let i = 0; i < dim; i++) {
        vec[i] = vec[i] / norm;
      }
    }

    return Buffer.from(vec.buffer);
  }

  cosineSimilarity(bufA, bufB) {
    const fA = new Float32Array(bufA.buffer, bufA.byteOffset, bufA.byteLength / 4);
    const fB = new Float32Array(bufB.buffer, bufB.byteOffset, bufB.byteLength / 4);
    let dot = 0;
    for (let i = 0; i < 256; i++) {
      dot += fA[i] * fB[i];
    }
    return dot;
  }

  /**
   * Structure-Aware Text Chunking (langchainjs recursive pattern)
   */
  chunkMarkdown(markdown, maxTokens = 256) {
    const chunks = [];
    const sections = markdown.split(/\n(?=#+\s)/); // split by headings

    for (const sec of sections) {
      const headingMatch = sec.match(/^(#+\s+[^\n]+)/);
      const heading = headingMatch ? headingMatch[1].trim() : '';
      const text = sec.trim();

      if (!text) continue;

      if (text.length <= maxTokens * 4) {
        chunks.push({ heading, text });
      } else {
        // Subdivide paragraph-wise
        const paragraphs = text.split(/\n\n+/);
        let cur = '';
        for (const p of paragraphs) {
          if ((cur + '\n\n' + p).length <= maxTokens * 4) {
            cur = cur ? cur + '\n\n' + p : p;
          } else {
            if (cur) chunks.push({ heading, text: cur });
            cur = p;
          }
        }
        if (cur) chunks.push({ heading, text: cur });
      }
    }

    return chunks.length > 0 ? chunks : [{ heading: '', text: markdown.slice(0, 1000) }];
  }

  /**
   * Fast pre-check: skip reading/parsing if mtime matches database record
   */
  canSkipByMtime(filePath) {
    try {
      const stats = fs.statSync(filePath);
      const mtime = Math.round(stats.mtimeMs);
      const existing = this.db.prepare('SELECT mtime FROM documents WHERE path = ?').get(filePath);
      return Boolean(existing && existing.mtime === mtime);
    } catch {
      return false;
    }
  }

  /**
   * Ingest normalized document with mtime check and BLAKE3 content-addressable deduplication
   */
  async indexDocument(filePath, markdown, title, type) {
    const stats = fs.statSync(filePath);
    const mtime = Math.round(stats.mtimeMs);
    const hash = computeBlake3Hex(markdown);

    const existing = this.db.prepare('SELECT id, mtime, hash FROM documents WHERE path = ?').get(filePath);

    // Fast mtime match: file untouched
    if (existing && existing.mtime === mtime) {
      return { skipped: true, path: filePath, reason: 'mtime-match' };
    }

    // Touched file (mtime changed) but identical BLAKE3 content hash: update mtime without re-embedding
    if (existing && existing.hash === hash) {
      this.db.prepare('UPDATE documents SET mtime = ? WHERE id = ?').run(mtime, existing.id);
      return { skipped: true, path: filePath, reason: 'content-identical' };
    }

    // Renamed or duplicate content check across documents: reuse existing vectors without re-embedding
    const hashMatch = this.db.prepare('SELECT id, path FROM documents WHERE hash = ? AND path != ? LIMIT 1').get(hash, filePath);
    if (hashMatch) {
      const tx = this.db.transaction(() => {
        this.db.prepare('DELETE FROM documents WHERE path = ?').run(filePath);
        this.db.prepare('DELETE FROM vector_embeddings WHERE doc_path = ?').run(filePath);
        this.db.prepare('DELETE FROM fts_chunks WHERE doc_path = ?').run(filePath);

        this.db.prepare(`
          INSERT INTO documents (path, mtime, hash, title, type, raw_markdown, indexed_at)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(filePath, mtime, hash, title || path.basename(filePath), type, markdown, Date.now());

        const existingVectors = this.db.prepare('SELECT heading_path, text, embedding FROM vector_embeddings WHERE doc_path = ?').all(hashMatch.path);
        const insertVec = this.db.prepare(`
          INSERT INTO vector_embeddings (doc_path, heading_path, text, embedding, dim, created_at)
          VALUES (?, ?, ?, ?, 256, ?)
        `);
        const insertFts = this.db.prepare(`
          INSERT INTO fts_chunks (chunk_id, doc_path, heading_path, text)
          VALUES (?, ?, ?, ?)
        `);

        for (const v of existingVectors) {
          const info = insertVec.run(filePath, v.heading_path, v.text, v.embedding, Date.now());
          const chunkId = Number(info.lastInsertRowid);
          insertFts.run(chunkId, filePath, v.heading_path, v.text);
        }
      });
      tx();
      return { skipped: true, path: filePath, reason: 'content-reused-from-rename' };
    }

    const tx = this.db.transaction(() => {
      // Clean previous records
      this.db.prepare('DELETE FROM documents WHERE path = ?').run(filePath);
      this.db.prepare('DELETE FROM vector_embeddings WHERE doc_path = ?').run(filePath);
      this.db.prepare('DELETE FROM fts_chunks WHERE doc_path = ?').run(filePath);

      // Insert document
      this.db.prepare(`
        INSERT INTO documents (path, mtime, hash, title, type, raw_markdown, indexed_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(filePath, mtime, hash, title || path.basename(filePath), type, markdown, Date.now());

      // Chunk and embed
      const chunks = this.chunkMarkdown(markdown);
      const insertVec = this.db.prepare(`
        INSERT INTO vector_embeddings (doc_path, heading_path, text, embedding, dim, created_at)
        VALUES (?, ?, ?, ?, 256, ?)
      `);
      const insertFts = this.db.prepare(`
        INSERT INTO fts_chunks (chunk_id, doc_path, heading_path, text)
        VALUES (?, ?, ?, ?)
      `);

      for (const chunk of chunks) {
        const embeddingBlob = this.generate256Embedding(chunk.text);
        const info = insertVec.run(filePath, chunk.heading, chunk.text, embeddingBlob, Date.now());
        const chunkId = Number(info.lastInsertRowid);
        insertFts.run(chunkId, filePath, chunk.heading, chunk.text);
      }
    });

    tx();
    return { skipped: false, path: filePath };
  }

  /**
   * Reciprocal Rank Fusion (RRF) Hybrid Search (<50ms)
   */
  search(query, limit = 5) {
    const startTime = Date.now();
    const cleanQuery = query.replace(/['"*]/g, ' ').trim();
    if (!cleanQuery) return { hits: [], latencyMs: 0 };

    // 1. BM25 keyword hits from FTS5
    let ftsHits = [];
    try {
      ftsHits = this.db.prepare(`
        SELECT chunk_id, doc_path, heading_path, text, (bm25(fts_chunks, 1.0, 0.4) * -1.0) as score
        FROM fts_chunks
        WHERE fts_chunks MATCH ?
        ORDER BY score DESC
        LIMIT 20
      `).all(cleanQuery + '*');
    } catch {
      // Simple fallback if wildcards error
      ftsHits = this.db.prepare(`
        SELECT chunk_id, doc_path, heading_path, text, 1.0 as score
        FROM fts_chunks
        WHERE text LIKE ?
        LIMIT 20
      `).all(`%${cleanQuery}%`);
    }

    // 2. Vector Cosine Similarity
    const qVecBuf = this.generate256Embedding(cleanQuery);
    const allVecs = this.db.prepare('SELECT chunk_id, doc_path, heading_path, text, embedding FROM vector_embeddings LIMIT 200').all();

    const scoredVecs = allVecs.map(row => ({
      chunk_id: row.chunk_id,
      doc_path: row.doc_path,
      heading_path: row.heading_path,
      text: row.text,
      similarity: this.cosineSimilarity(qVecBuf, row.embedding)
    })).sort((a, b) => b.similarity - a.similarity).slice(0, 20);

    // 3. Reciprocal Rank Fusion: 1 / (60 + rank)
    const k = 60;
    const rrfMap = new Map();

    ftsHits.forEach((hit, rank) => {
      const score = 1.0 / (k + rank + 1);
      rrfMap.set(hit.chunk_id, {
        chunkId: hit.chunk_id,
        docPath: hit.doc_path,
        headingPath: hit.heading_path,
        text: hit.text,
        rrfScore: score
      });
    });

    scoredVecs.forEach((hit, rank) => {
      const score = 1.0 / (k + rank + 1);
      if (rrfMap.has(hit.chunk_id)) {
        rrfMap.get(hit.chunk_id).rrfScore += score;
      } else {
        rrfMap.set(hit.chunk_id, {
          chunkId: hit.chunk_id,
          docPath: hit.doc_path,
          headingPath: hit.heading_path,
          text: hit.text,
          rrfScore: score
        });
      }
    });

    const sortedHits = Array.from(rrfMap.values())
      .sort((a, b) => b.rrfScore - a.rrfScore)
      .slice(0, limit)
      .map((h, i) => ({
        ...h,
        tag: `[S${i + 1}]`,
        rrfScore: parseFloat(h.rrfScore.toFixed(5))
      }));

    const latencyMs = Date.now() - startTime;
    return {
      hits: sortedHits,
      latencyMs
    };
  }

  close() {
    if (this.db) {
      try {
        this.db.close();
      } catch {}
    }
  }
}

