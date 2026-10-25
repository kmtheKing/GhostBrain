import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { translateFileToMarkdown } from './file-translator.js';
import { safeWriteFile, safeReadFile } from './safe-write.js';
import { VectorStore } from '../db/vector-store.js';
import { profileHardware } from './hardware-profiler.js';
import { indexFolder, executeSearch } from './rag-worker.js';

describe('GhostBrain Master RAG Foundation End-to-End Suite', () => {
  let tempDir: string;
  let tempDbPath: string;
  let vectorStore: VectorStore;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ghostbrain-test-'));
    tempDbPath = path.join(tempDir, 'test-brain.sqlite');
    vectorStore = new VectorStore(tempDbPath);
  });

  afterEach(() => {
    try {
      if (vectorStore) {
        vectorStore.close();
      }
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {}
  });

  it('verifies SQLite schema initialization (documents, fts_chunks, vector_embeddings)', () => {
    const tables = vectorStore.db.prepare(`
      SELECT name FROM sqlite_master WHERE type IN ('table', 'shadow') AND name IN ('documents', 'fts_chunks', 'vector_embeddings')
    `).all().map((r: any) => r.name);

    expect(tables).toContain('documents');
    expect(tables).toContain('vector_embeddings');
    expect(tables).toContain('fts_chunks');
  });

  it('translates heterogeneous documents to canonical Markdown with metadata comments', async () => {
    // 1. Markdown file
    const mdFile = path.join(tempDir, 'spec.md');
    fs.writeFileSync(mdFile, '# GhostBrain Specs\n\nOffline RAG desktop daemon with zero cloud data leakage.');
    const mdResult = await translateFileToMarkdown(mdFile);
    expect(mdResult.markdown).toContain(`<!-- FILE: ${mdFile} | TYPE: md | PAGE: 1 -->`);
    expect(mdResult.markdown).toContain('# GhostBrain Specs');

    // 2. Source code file
    const jsFile = path.join(tempDir, 'engine.js');
    fs.writeFileSync(jsFile, 'function bootEngine() { return "100% offline"; }');
    const jsResult = await translateFileToMarkdown(jsFile);
    expect(jsResult.markdown).toContain(`<!-- FILE: ${jsFile} | TYPE: code | PAGE: 1 -->`);
    expect(jsResult.markdown).toContain('```js');

    // 3. CSV file
    const csvFile = path.join(tempDir, 'telemetry.csv');
    fs.writeFileSync(csvFile, 'Metric,Value,Target\nLatency,1.8ms,<50ms\nRAM,3.5GB,<4GB');
    const csvResult = await translateFileToMarkdown(csvFile);
    expect(csvResult.markdown).toContain(`<!-- FILE: ${csvFile} | TYPE: csv | PAGE: 1 -->`);
    expect(csvResult.markdown).toContain('| Metric | Value | Target |');

    // 4. HTML file
    const htmlFile = path.join(tempDir, 'page.html');
    fs.writeFileSync(htmlFile, '<html><body><h2>Private Second Brain</h2><p>Zero community plugins.</p></body></html>');
    const htmlResult = await translateFileToMarkdown(htmlFile);
    expect(htmlResult.markdown).toContain(`<!-- FILE: ${htmlFile} | TYPE: html | PAGE: 1 -->`);
    expect(htmlResult.markdown).toContain('## Private Second Brain');
  });

  it('indexes mixed files in a directory and executes hybrid search in <50ms', async () => {
    // Populate mixed test directory
    const doc1 = path.join(tempDir, 'Architecture.md');
    fs.writeFileSync(doc1, '# Storage Architecture\n\nGhostBrain utilizes SQLite BLOB vectors combined with FTS5 BM25 search via Reciprocal Rank Fusion.');

    const doc2 = path.join(tempDir, 'Security.js');
    fs.writeFileSync(doc2, '// Cryptographic Identity\nconst deviceFingerprint = "BLAKE3-X25519-ED25519";\nexport function verifyIdentity() { return true; }');

    const doc3 = path.join(tempDir, 'Benchmarks.csv');
    fs.writeFileSync(doc3, 'Component,Latency,Status\nVectorSearch,1.4ms,Passed\nFTSSearch,0.8ms,Passed');

    // Index folder using isolated test vectorStore
    const indexResult = await indexFolder(tempDir, undefined, vectorStore);
    expect(indexResult.filesIndexed).toBeGreaterThanOrEqual(3);

    // Re-indexing unchanged files should skip (mtime check)
    const reindex = await indexFolder(tempDir, undefined, vectorStore);
    expect(reindex.filesSkipped).toBeGreaterThanOrEqual(3);

    // Execute Hybrid Search
    const searchStart = Date.now();
    const result = vectorStore.search('Reciprocal Rank Fusion', 3);
    const searchDuration = Date.now() - searchStart;

    // Strict sub-50ms performance assertion
    expect(searchDuration).toBeLessThan(50);
    expect(result.hits.length).toBeGreaterThan(0);
    expect(result.hits[0].docPath).toContain('Architecture.md');
    expect(result.hits[0].text).toContain('SQLite BLOB vectors');
    expect(result.hits[0].tag).toBe('[S1]');
    expect(result.hits[0].rrfScore).toBeGreaterThan(0);
  });

  it('enforces Safe Write Rule (.bak backup for text/code, .ghost.md for binary documents)', async () => {
    // 1. Text/Code modification creates .bak
    const codePath = path.join(tempDir, 'script.ts');
    fs.writeFileSync(codePath, 'const originalCode = 1;');

    const writeResult1 = await safeWriteFile(codePath, 'const updatedCode = 2;');
    expect(writeResult1.isCompanion).toBe(false);
    expect(writeResult1.backupPath).toBe(`${codePath}.bak`);
    expect(fs.existsSync(`${codePath}.bak`)).toBe(true);
    expect(fs.readFileSync(`${codePath}.bak`, 'utf-8')).toBe('const originalCode = 1;');
    expect(fs.readFileSync(codePath, 'utf-8')).toBe('const updatedCode = 2;');

    // 2. Binary document modification creates .ghost.md companion
    const pdfPath = path.join(tempDir, 'Financial_Report.pdf');
    fs.writeFileSync(pdfPath, Buffer.from('%PDF-1.4 Mock Binary Content'));

    const writeResult2 = await safeWriteFile(pdfPath, '# Annotated Financial Summary\n\nRevenue grew by 42%.');
    expect(writeResult2.isCompanion).toBe(true);
    const expectedGhostPath = path.join(tempDir, 'Financial_Report.pdf.ghost.md');
    expect(fs.existsSync(expectedGhostPath)).toBe(true);

    // Reading binary document returns companion markdown content
    const readResult = await safeReadFile(pdfPath);
    expect(readResult.isCompanion).toBe(true);
    expect(readResult.content).toContain('Revenue grew by 42%');
  });

  it('verifies 3-tier hardware auto-switcher assignments', async () => {
    // GPU_HIGH: Qwen2.5-3B-Instruct-Q4_K_M.gguf
    const gpuHigh = await profileHardware({ forceGpu: true });
    expect(gpuHigh.tier).toBe('GPU_HIGH');
    expect(gpuHigh.modelConfig.model).toBe('Qwen2.5-3B-Instruct-Q4_K_M.gguf');
    expect(gpuHigh.modelConfig.gpuLayers).toBe('auto');
    expect(gpuHigh.modelConfig.ctxSize).toBe(4096);
    expect(gpuHigh.modelConfig.topKChunks).toBe(5);

    // CPU_LITE: Llama-3.2-1B-Instruct-Q4_K_M.gguf
    const cpuLite = await profileHardware({ forceGpu: false, forceTotalMemBytes: 16 * 1024 ** 3, forceCpus: 8 });
    expect(cpuLite.tier).toBe('CPU_LITE');
    expect(cpuLite.modelConfig.model).toBe('Llama-3.2-1B-Instruct-Q4_K_M.gguf');
    expect(cpuLite.modelConfig.gpuLayers).toBe(0);
    expect(cpuLite.modelConfig.ctxSize).toBe(2048);
    expect(cpuLite.modelConfig.topKChunks).toBe(2);

    // SEARCH_ONLY: 0-LLM Fallback when <8GB RAM
    const searchOnly = await profileHardware({ forceGpu: false, forceTotalMemBytes: 4 * 1024 ** 3 });
    expect(searchOnly.tier).toBe('SEARCH_ONLY');
    expect(searchOnly.modelConfig.model).toBeNull();
    expect(searchOnly.modelConfig.llmEnabled).toBe(false);
  });
});
