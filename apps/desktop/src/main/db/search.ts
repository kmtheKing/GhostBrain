/**
 * @deprecated Legacy search implementation.
 * Unified search now operates off-main-thread via `apps/desktop/src/main/db/vector-store.js`
 * and `apps/desktop/src/main/workers/rag-worker.js`.
 */
import type { Database as DatabaseInstance } from 'better-sqlite3-multiple-ciphers';
import type { SearchHit, SearchQueryPayload } from '@ghostbrain/shared-types';
import { sanitizeFtsQuery } from '@ghostbrain/core';

export interface SearchOptions {
  qvec?: Float32Array | Buffer;
  limit?: number;
  rrfK?: number;
}

export function hybridSearch(
  db: DatabaseInstance,
  payload: SearchQueryPayload,
  options: SearchOptions = {}
): SearchHit[] {
  const rawQuery = (payload.query || '').trim();
  if (!rawQuery) return [];

  const ftsQuery = sanitizeFtsQuery(rawQuery);
  const limit = options.limit || payload.limit || 8;
  const rrfK = options.rrfK || 60;
  const allowedFolderIds = payload.scope?.allowedFolderIds;

  let folderFilter = '';
  const params: Record<string, unknown> = {
    fts_query: ftsQuery,
    limit: limit,
    rrf_k: rrfK,
    k_fts: Math.max(limit * 5, 40)
  };

  if (allowedFolderIds && allowedFolderIds.length > 0) {
    const placeholders = allowedFolderIds.map((_, i) => ':f' + i).join(',');
    folderFilter = ' AND d.folder_id IN (' + placeholders + ')';
    allowedFolderIds.forEach((id, i) => {
      params['f' + i] = id;
    });
  }

  if (options.qvec) {
    params.qvec = options.qvec;
    params.k_vec = Math.max(limit * 5, 40);

    const sql = [
      'WITH',
      'vec_hits AS (',
      '  SELECT chunk_id, row_number() OVER (ORDER BY distance) AS rnk',
      '  FROM vec_chunks',
      '  WHERE embedding MATCH :qvec AND k = :k_vec',
      '),',
      'fts_hits AS (',
      '  SELECT chunk_id, row_number() OVER (ORDER BY score) AS rnk',
      '  FROM (',
      '    SELECT rowid AS chunk_id, bm25(fts_chunks, 1.0, 0.4) AS score',
      '    FROM fts_chunks',
      '    WHERE fts_chunks MATCH :fts_query',
      '    ORDER BY score',
      '    LIMIT :k_fts',
      '  )',
      '),',
      'fused AS (',
      '  SELECT chunk_id, SUM(1.0 / (:rrf_k + rnk)) AS rrf',
      '  FROM (SELECT * FROM vec_hits UNION ALL SELECT * FROM fts_hits)',
      '  GROUP BY chunk_id',
      ')',
      'SELECT c.id AS chunkId, c.document_id AS documentId, d.rel_path AS relPath,',
      '       c.heading_path AS headingPath, c.text AS text, f.rrf AS rrfScore',
      'FROM fused f',
      'JOIN chunks c ON c.id = f.chunk_id',
      'JOIN documents d ON d.id = c.document_id',
      'WHERE d.status = \'indexed\'' + folderFilter,
      'ORDER BY f.rrf DESC',
      'LIMIT :limit;'
    ].join('\n');

    try {
      const rows = db.prepare(sql).all(params) as SearchHit[];
      return rows;
    } catch (err) {
      console.warn('[Search] Hybrid RRF failed, falling back to pure FTS5:', err);
    }
  }

  const fallbackSql = [
    'SELECT c.id AS chunkId, c.document_id AS documentId, d.rel_path AS relPath,',
    '       c.heading_path AS headingPath, c.text AS text,',
    '       (1.0 / (:rrf_k + row_number() OVER (ORDER BY bm25(fts_chunks, 1.0, 0.4)))) AS rrfScore',
    'FROM fts_chunks',
    'JOIN chunks c ON c.id = fts_chunks.rowid',
    'JOIN documents d ON d.id = c.document_id',
    'WHERE fts_chunks MATCH :fts_query AND d.status = \'indexed\'' + folderFilter,
    'ORDER BY rrfScore DESC',
    'LIMIT :limit;'
  ].join('\n');

  try {
    const rows = db.prepare(fallbackSql).all(params) as SearchHit[];
    return rows;
  } catch (err) {
    console.error('[Search] FTS5 query execution error:', err);
    return [];
  }
}
