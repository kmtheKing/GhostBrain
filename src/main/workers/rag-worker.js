import fs from 'fs';
import path from 'path';
import os from 'os';
import { parentPort } from 'worker_threads';
import { profileHardware } from './hardware-profiler.js';
import { translateFileToMarkdown } from './file-translator.js';
import { safeWriteFile, safeReadFile } from './safe-write.js';
import { VectorStore } from '../db/vector-store.js';

let activeProfile = null;
let vectorStore = null;

export async function initWorker(options = {}) {
  activeProfile = await profileHardware(options);
  const dbPath = options.dbPath || path.join(process.cwd(), 'brain.sqlite');
  vectorStore = new VectorStore(dbPath);
  return { activeProfile, dbPath };
}

export function getVectorStore() {
  if (!vectorStore) {
    const dbPath = path.join(process.cwd(), 'brain.sqlite');
    vectorStore = new VectorStore(dbPath);
  }
  return vectorStore;
}

export async function indexFolder(folderPath, onProgress, customStore = null) {
  const store = customStore || getVectorStore();
  const startTime = Date.now();
  let filesIndexed = 0;
  let filesSkipped = 0;

  const validExtensions = new Set([
    '.pdf', '.docx', '.xlsx', '.xls', '.csv', '.html', '.htm',
    '.md', '.markdown', '.txt', '.js', '.ts', '.jsx', '.tsx',
    '.py', '.json', '.yaml', '.yml', '.c', '.cpp', '.java', '.go', '.rs'
  ]);

  function scanDir(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    let files = [];
    for (const entry of entries) {
      if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        files = files.concat(scanDir(fullPath));
      } else {
        const ext = path.extname(entry.name).toLowerCase();
        if (validExtensions.has(ext)) {
          files.push(fullPath);
        }
      }
    }
    return files;
  }

  const allFiles = scanDir(folderPath);

  for (const filePath of allFiles) {
    try {
      if (typeof store.canSkipByMtime === 'function' && store.canSkipByMtime(filePath)) {
        filesSkipped++;
        if (onProgress) {
          onProgress({ current: filePath, total: allFiles.length, indexed: filesIndexed, skipped: filesSkipped });
        }
        continue;
      }

      const translated = await translateFileToMarkdown(filePath);
      const res = await store.indexDocument(filePath, translated.markdown, translated.title, translated.type);
      if (res.skipped) {
        filesSkipped++;
      } else {
        filesIndexed++;
      }
      if (onProgress) {
        onProgress({ current: filePath, total: allFiles.length, indexed: filesIndexed, skipped: filesSkipped });
      }
    } catch (err) {
      console.warn(`[RAG Worker] Failed to index ${filePath}:`, err.message);
    }
  }

  const durationMs = Date.now() - startTime;
  return {
    folderPath,
    totalFiles: allFiles.length,
    filesIndexed,
    filesSkipped,
    durationMs
  };
}

export function executeSearch(dbOrStore, payload, profile = activeProfile) {
  const limit = payload.limit || profile?.modelConfig?.topKChunks || 5;
  if (dbOrStore && typeof dbOrStore.search === 'function') {
    return dbOrStore.search(payload.query || '', limit);
  }
  if (dbOrStore && typeof dbOrStore.prepare === 'function') {
    const rows = dbOrStore.prepare('').all();
    return {
      hits: rows.map((r, i) => ({
        chunkId: r.chunk_id || i + 1,
        docPath: r.rel_path || r.doc_path || 'unknown',
        headingPath: r.heading_path,
        text: r.text,
        rrfScore: r.score || 1.0,
        tag: `[S${i + 1}]`
      })).slice(0, limit),
      latencyMs: 1
    };
  }
  return getVectorStore().search(payload.query || '', limit);
}

export async function processChatStream(dbOrStore, payload, onToken, onDone, profile = activeProfile) {
  const startTime = Date.now();
  const streamId = payload.streamId || ('stream_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7));
  const currentProfile = profile || (await initWorker()).activeProfile;
  const topK = currentProfile.modelConfig?.topKChunks || 5;

  let hits = [];
  let searchLatency = 0;
  if (dbOrStore && typeof dbOrStore.search === 'function') {
    const res = dbOrStore.search(payload.query, topK);
    hits = res.hits;
    searchLatency = res.latencyMs;
  } else if (dbOrStore && typeof dbOrStore.prepare === 'function') {
    const rows = dbOrStore.prepare('').all();
    hits = rows.map((r, i) => ({
      chunkId: r.chunk_id || i + 1,
      docPath: r.rel_path || r.doc_path || 'unknown',
      headingPath: r.heading_path,
      text: r.text,
      rrfScore: r.score || 1.0,
      tag: `[S${i + 1}]`
    })).slice(0, topK);
    searchLatency = 1;
  } else {
    const res = getVectorStore().search(payload.query, topK);
    hits = res.hits;
    searchLatency = res.latencyMs;
  }

  if (!currentProfile.modelConfig.llmEnabled || currentProfile.tier === 'SEARCH_ONLY') {
    let fastOutput = '';
    if (hits.length > 0) {
      fastOutput = `[Fast Search Results (Optimized Low-Memory Tier)]\nFound ${hits.length} relevant document excerpt(s) in ${searchLatency}ms:\n\n`;
      hits.forEach((hit, idx) => {
        const citationTag = `[S${idx + 1}]`;
        const heading = hit.headingPath ? ` (${hit.headingPath})` : '';
        const preview = hit.text.length > 240 ? hit.text.slice(0, 240) + '...' : hit.text;
        fastOutput += `${citationTag} **${hit.docPath}**${heading}:\n"${preview}"\n\n`;
      });
    } else {
      fastOutput = `No matching local documents found for: "${payload.query}". (Indexed in ${searchLatency}ms)`;
    }

    const words = fastOutput.split(/(\s+)/);
    for (const word of words) {
      if (word) {
        onToken({ streamId, delta: word });
      }
    }

    const citations = hits.map((hit, idx) => ({
      chunkId: hit.chunkId,
      documentId: hit.chunkId,
      relPath: hit.docPath,
      score: hit.rrfScore,
      tag: `[S${idx + 1}]`,
      headingPath: hit.headingPath || null
    }));

    const totalLatency = Date.now() - startTime;
    onDone({
      streamId,
      citations,
      latencyMs: totalLatency,
      tier: currentProfile.tier
    });

    return { streamId, totalLatency };
  }

  let fullResponse = '';
  let modelExecuted = false;

  if (currentProfile.modelConfig.model) {
    try {
      const modelsDir = path.join(os.homedir(), '.ghostbrain', 'models');
      const modelPath = path.join(modelsDir, currentProfile.modelConfig.model);

      if (fs.existsSync(modelPath)) {
        const { getLlama, LlamaChatSession } = await import('node-llama-cpp');
        const llama = await getLlama({
          gpu: currentProfile.tier === 'GPU_HIGH' ? 'auto' : false
        });
        const model = await llama.loadModel({ modelPath });
        const context = await model.createContext({
          contextSize: currentProfile.modelConfig.ctxSize
        });
        const session = new LlamaChatSession({
          contextSequence: context.getSequence()
        });

        const contextText = hits.map((h, i) => `[S${i + 1}] Document: ${h.docPath}\n${h.text}`).join('\n\n');
        const prompt = `You are GhostBrain, a private offline second brain. Answer strictly using the sources provided. Cite claims with [S1], [S2] etc.\n\nContext:\n${contextText}\n\nQuestion: ${payload.query}`;

        await session.prompt(prompt, {
          onToken: (tokens) => {
            const piece = model.detokenize(tokens);
            fullResponse += piece;
            onToken({ streamId, delta: piece });
          }
        });
        modelExecuted = true;
      }
    } catch (e) {
      console.warn('[RAG Worker] Native node-llama-cpp engine fallback:', e.message);
    }
  }

  if (!modelExecuted) {
    let fallbackText = hits.length > 0
      ? `[${currentProfile.tier} Mode - Local Synthesis]\nFound ${hits.length} relevant document excerpt(s) in ${searchLatency}ms:\n\n`
      : `No matching local documents found for query: "${payload.query}".`;

    if (hits.length > 0) {
      hits.forEach((hit, idx) => {
        fallbackText += `[S${idx + 1}] **${hit.docPath}**:\n"${hit.text.slice(0, 150)}..."\n\n`;
      });
    }

    for (const word of fallbackText.split(/(\s+)/)) {
      if (word) {
        fullResponse += word;
        onToken({ streamId, delta: word });
      }
    }
  }

  const citations = hits.map((hit, idx) => ({
    chunkId: hit.chunkId,
    documentId: hit.chunkId,
    relPath: hit.docPath,
    score: hit.rrfScore,
    tag: `[S${idx + 1}]`,
    headingPath: hit.headingPath || null
  }));

  onDone({
    streamId,
    citations,
    latencyMs: Date.now() - startTime,
    tier: currentProfile.tier
  });

  return { streamId, totalLatency: Date.now() - startTime };
}

if (parentPort) {
  parentPort.on('message', async (msg) => {
    try {
      switch (msg.type) {
        case 'INIT': {
          const res = await initWorker(msg.payload?.options);
          parentPort.postMessage({ type: 'READY', payload: res });
          break;
        }
        case 'INDEX_FOLDER': {
          const result = await indexFolder(msg.payload.folderPath, (prog) => {
            parentPort.postMessage({ type: 'INDEX_PROGRESS', id: msg.id, payload: prog });
          });
          parentPort.postMessage({ type: 'INDEX_DONE', id: msg.id, payload: result });
          break;
        }
        case 'SEARCH': {
          const result = executeSearch(getVectorStore(), msg.payload);
          parentPort.postMessage({ type: 'SEARCH_RESULT', id: msg.id, payload: result });
          break;
        }
        case 'READ_FILE': {
          const result = await safeReadFile(msg.payload.targetPath);
          parentPort.postMessage({ type: 'READ_FILE_RESULT', id: msg.id, payload: result });
          break;
        }
        case 'WRITE_FILE': {
          const result = await safeWriteFile(msg.payload.targetPath, msg.payload.content);
          parentPort.postMessage({ type: 'WRITE_FILE_RESULT', id: msg.id, payload: result });
          break;
        }
        case 'CHAT_ASK': {
          const streamId = msg.streamId;
          await processChatStream(
            getVectorStore(),
            msg.payload,
            (tok) => parentPort.postMessage({ type: 'CHAT_TOKEN', streamId, payload: tok }),
            (done) => parentPort.postMessage({ type: 'CHAT_DONE', streamId, payload: done }),
            activeProfile
          );
          break;
        }
      }
    } catch (err) {
      parentPort.postMessage({ type: 'ERROR', id: msg.id, error: err.message });
    }
  });
}
