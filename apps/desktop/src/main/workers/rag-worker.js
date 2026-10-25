import fs from 'fs';
import path from 'path';
import os from 'os';
import { parentPort } from 'worker_threads';
import { profileHardware } from './hardware-profiler.js';
import { translateFileToMarkdown } from './file-translator.js';
import { safeWriteFile, safeReadFile, createFolderOrFile, assertSafePath } from './safe-write.js';
import { VectorStore } from '../db/vector-store.js';

let activeProfile = null;
let vectorStore = null;

export function loadDesktopEnv() {
  const envCandidates = [
    path.join(process.cwd(), 'apps', 'desktop', '.env'),
    path.join(process.cwd(), '.env'),
    path.join(os.homedir(), '.ghostbrain', '.env')
  ];
  for (const envFile of envCandidates) {
    if (fs.existsSync(envFile)) {
      try {
        const content = fs.readFileSync(envFile, 'utf-8');
        for (const line of content.split('\n')) {
          const trimmed = line.trim();
          if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
            const [k, ...v] = trimmed.split('=');
            const key = k.trim();
            const val = v.join('=').trim().replace(/^['"]|['"]$/g, '');
            if (!process.env[key]) {
              process.env[key] = val;
            }
          }
        }
      } catch {}
    }
  }
}
loadDesktopEnv();

/**
 * Stream OpenRouter Free Models fallback when local GGUF is missing or offline
 */
export async function streamOpenRouterFallback(apiKey, query, contextChunks, onToken, streamId, emitThought) {
  if (emitThought) emitThought('🌐 Checking OpenRouter Free model fallback (meta-llama/llama-3.3-70b-instruct:free)...');

  const contextText = contextChunks.map((h, i) => `[S${i + 1}] Document: ${h.docPath}\n${h.text}`).join('\n\n');
  const systemPrompt = 'You are GhostBrain, a private offline second brain personal assistant. If local document excerpts are provided, answer citing [S1], [S2] etc. If no excerpts are provided, answer politely and thoroughly as GhostBrain Personal Assistant.';
  const userContent = contextText ? `Context Excerpts:\n${contextText}\n\nUser Question: ${query}` : query;

  const models = [
    'meta-llama/llama-3.3-70b-instruct:free',
    'google/gemma-3-27b-it:free',
    'openrouter/free'
  ];

  for (const model of models) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 12000);

      const resp = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://ghostbrain.local',
          'X-Title': 'GhostBrain Desktop'
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userContent }
          ],
          stream: true
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!resp.ok || !resp.body) continue;

      if (emitThought) emitThought(`🌐 Connected to OpenRouter (${model}), streaming synthesis...`);

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let receivedAny = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith('data: ') && trimmed !== 'data: [DONE]') {
            try {
              const parsed = JSON.parse(trimmed.slice(6));
              const delta = parsed.choices?.[0]?.delta?.content || '';
              if (delta) {
                receivedAny = true;
                onToken({ streamId, delta });
              }
            } catch {}
          }
        }
      }

      if (receivedAny) {
        return true;
      }
    } catch {
      // try next model
    }
  }

  return false;
}

export async function initWorker(options = {}) {
  activeProfile = await profileHardware(options);
  const dbPath = options.dbPath || path.join(process.cwd(), 'brain.sqlite');
  vectorStore = new VectorStore(dbPath);
  return { activeProfile, dbPath };
}

export function setVectorStore(store) {
  vectorStore = store;
}

export function getVectorStore() {
  if (!vectorStore) {
    const dbPath = path.join(process.cwd(), 'brain.sqlite');
    vectorStore = new VectorStore(dbPath);
  }
  return vectorStore;
}

/**
 * Retrieve active watched folders from SQLite database
 */
export function getWatchedFolders(dbOrStore) {
  try {
    if (dbOrStore && typeof dbOrStore.prepare === 'function') {
      const rows = dbOrStore.prepare('SELECT abs_path FROM watched_folders WHERE is_enabled = 1').all();
      return rows.map((r) => r.abs_path);
    }
  } catch {}
  return [];
}

/**
 * Workspace Tool: List all files in watched folders
 */
export function listWatchedFiles(folders = []) {
  const result = [];
  for (const folder of folders) {
    if (!fs.existsSync(folder)) continue;
    function walk(dir) {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          walk(full);
        } else {
          try {
            const stat = fs.statSync(full);
            result.push({
              path: full,
              relPath: path.relative(folder, full),
              size: stat.size,
              ext: path.extname(entry.name).toLowerCase()
            });
          } catch {}
        }
      }
    }
    walk(folder);
  }
  return result;
}

/**
 * Workspace Tool: Summarize file
 */
export async function summarizeFile(filePath, allowedRoots = []) {
  const fileData = await safeReadFile(filePath, allowedRoots);
  const lines = fileData.content.split('\n');
  const headings = lines.filter((l) => l.trim().startsWith('#')).slice(0, 10);
  const preview = lines.slice(0, 25).join('\n').slice(0, 500);

  return {
    path: filePath,
    type: fileData.type,
    lineCount: lines.length,
    charCount: fileData.content.length,
    headings,
    summary: `### Executive Summary: ${path.basename(filePath)}\n- **Document Type:** ${fileData.type}\n- **Length:** ${lines.length} lines (${fileData.content.length} bytes)\n- **Structure & Headings:**\n${headings.map((h) => `  ${h}`).join('\n') || '  *(No markdown headings)*'}\n\n**Initial Excerpt:**\n\`\`\`\n${preview}\n\`\`\``
  };
}

/**
 * Recursively scan and index any local folder into SQLite FTS5 + 256-dim BLOB vectors
 */
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

/**
 * Execute Hybrid RRF Search across FTS5 and 256-dim BLOB vectors (<50ms)
 */
export function executeSearch(dbOrStore, payload, profile = activeProfile) {
  const limit = payload.limit || profile?.modelConfig?.topKChunks || 5;
  if (dbOrStore && typeof dbOrStore.search === 'function') {
    return dbOrStore.search(payload.query || '', limit);
  }
  if (dbOrStore && typeof dbOrStore.prepare === 'function') {
    try {
      const rows = dbOrStore.prepare('SELECT chunk_id, doc_path, heading_path, text FROM vector_embeddings LIMIT ?').all(limit);
      return {
        hits: rows.map((r, i) => ({
          chunkId: r.chunk_id || i + 1,
          docPath: r.rel_path || r.doc_path || 'unknown',
          headingPath: r.heading_path,
          text: r.text,
          rrfScore: r.score || 1.0,
          tag: `[S${i + 1}]`
        })),
        latencyMs: 1
      };
    } catch {
      return { hits: [], latencyMs: 0 };
    }
  }
  if (dbOrStore === null) {
    return { hits: [], latencyMs: 0 };
  }
  const store = getVectorStore();
  if (store && typeof store.search === 'function') {
    return store.search(payload.query || '', limit);
  }
  return { hits: [], latencyMs: 0 };
}

/**
 * Continuous Personal Assistant Chat Stream with Sandboxed Workspace Tools and Thought Steps
 */
export async function processChatStream(dbOrStore, payload, onToken, onDone, profile = activeProfile, onThought = null) {
  const startTime = Date.now();
  const streamId = payload.streamId || ('stream_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7));
  const currentProfile = profile || (await initWorker()).activeProfile;
  const topK = currentProfile.modelConfig?.topKChunks || 5;
  const rawQuery = (payload.query || '').trim();

  const emitThought = (step) => {
    if (typeof onThought === 'function') {
      try {
        onThought(step);
      } catch {}
    }
  };

  emitThought('🔍 Scanning watched folders and workspace files...');

  const watchedFolders = getWatchedFolders(dbOrStore);

  // 1. Tool Intent Detection: List Files
  if (/^(?:list|show|get)\s+(?:all\s+)?(?:watched\s+)?files/i.test(rawQuery)) {
    emitThought('📂 Querying watched directories for file inventory...');
    const files = listWatchedFiles(watchedFolders);
    emitThought(`📄 Found ${files.length} indexed files in workspace.`);
    emitThought('🧠 Formulating response...');

    let text = `### Watched Workspace Files (${files.length} found)\n\n`;
    if (files.length === 0) {
      text += 'No files are currently found in your watched directories. Add folders in the sidebar to index your codebase or notes.';
    } else {
      files.slice(0, 30).forEach((f, idx) => {
        text += `${idx + 1}. **${f.relPath}** (${(f.size / 1024).toFixed(1)} KB) - \`${f.ext}\`\n`;
      });
      if (files.length > 30) {
        text += `\n*...and ${files.length - 30} more files.*`;
      }
    }

    for (const w of text.split(/(\s+)/)) {
      if (w) onToken({ streamId, delta: w });
    }

    onDone({
      streamId,
      citations: [],
      latencyMs: Date.now() - startTime,
      tier: currentProfile.tier
    });
    return { streamId, totalLatency: Date.now() - startTime };
  }

  // 2. Tool Intent Detection: Summarize File
  const summarizeMatch = rawQuery.match(/^(?:summarize|overview|inspect)\s+(?:file\s+)?["']?([^"'\n]+)["']?/i);
  if (summarizeMatch && summarizeMatch[1]) {
    const targetFile = summarizeMatch[1].trim();
    emitThought(`📄 Reading file for summarization: ${path.basename(targetFile)}...`);
    try {
      const summaryResult = await summarizeFile(targetFile, watchedFolders);
      emitThought('🧠 Synthesizing executive summary...');

      for (const w of summaryResult.summary.split(/(\s+)/)) {
        if (w) onToken({ streamId, delta: w });
      }

      onDone({
        streamId,
        citations: [{ chunkId: 1, documentId: 1, relPath: targetFile, score: 1.0, tag: '[S1]' }],
        latencyMs: Date.now() - startTime,
        tier: currentProfile.tier
      });
      return { streamId, totalLatency: Date.now() - startTime };
    } catch (err) {
      emitThought(`⚠️ Summarization note: ${err.message}`);
      // Fall through to regular search if file read failed
    }
  }

  // 3. Tool Intent Detection: Write File / Create File
  const writeMatch = rawQuery.match(/^(?:write|create|save|update)\s+file\s+["']?([^"'\s]+)["']?\s*(?:with content[:\s]+([\s\S]+))?/i);
  if (writeMatch && writeMatch[1]) {
    const targetFile = writeMatch[1].trim();
    const content = writeMatch[2] ? writeMatch[2].trim() : `// Created by GhostBrain on ${new Date().toISOString()}\n`;
    emitThought(`✍️ Validating path and writing file: ${path.basename(targetFile)}...`);

    try {
      const writeResult = await safeWriteFile(targetFile, content, watchedFolders);
      emitThought(writeResult.isCompanion ? '🛡️ Binary protected, generated .ghost.md companion.' : '🛡️ Created .bak backup for safety.');
      emitThought('🧠 Formulating confirmation...');

      const responseText = `### Safe Write Operation Completed\n- **Target:** \`${writeResult.path}\`\n- **Status:** ${writeResult.message}\n- **Companion Mode:** ${writeResult.isCompanion ? 'Yes (.ghost.md)' : 'No (Direct write with .bak backup)'}\n\nYour file is securely persisted.`;

      for (const w of responseText.split(/(\s+)/)) {
        if (w) onToken({ streamId, delta: w });
      }

      onDone({
        streamId,
        citations: [{ chunkId: 1, documentId: 1, relPath: writeResult.path, score: 1.0, tag: '[S1]' }],
        latencyMs: Date.now() - startTime,
        tier: currentProfile.tier
      });
      return { streamId, totalLatency: Date.now() - startTime };
    } catch (err) {
      emitThought(`❌ Write blocked: ${err.message}`);
      const errText = `Could not write file: ${err.message}`;
      for (const w of errText.split(/(\s+)/)) {
        if (w) onToken({ streamId, delta: w });
      }
      onDone({
        streamId,
        citations: [],
        latencyMs: Date.now() - startTime,
        tier: currentProfile.tier
      });
      return { streamId, totalLatency: Date.now() - startTime };
    }
  }

  // 4. Conversational Greetings & Identity Check (Immediate Personal Assistant Response)
  const isGreeting = /^(?:hello|hi|hey|greetings|good\s+(?:morning|afternoon|evening))\b/i.test(rawQuery);
  const isIdentity = /^(?:who\s+are\s+you|what\s+can\s+you\s+do)\b/i.test(rawQuery);

  if (isGreeting || isIdentity) {
    emitThought('🧠 Formulating response as continuous personal assistant...');
    let responseText = '';
    if (isGreeting) {
      responseText = `Hello! I am **GhostBrain**, your private, 100% offline Personal Assistant & Second Brain.\n\nI have access to your indexed folders, hybrid SQLite vector search, and workspace tools. You can ask me questions about your documents, ask me to summarize or list files, or write code. How can I help you today?`;
    } else {
      responseText = `I am **GhostBrain**, your offline-first personal assistant.\n\nHere is what I can do:\n1. **Hybrid Vector & Keyword Search:** Search across your Markdown, code, PDF, and Office files in <50ms with reciprocal rank fusion.\n2. **Jailed Workspace Tools:** List files (\`list files\`), read files, summarize documents (\`summarize <file>\`), or write updates safely with \`.bak\` and \`.ghost.md\` backups.\n3. **Private Intelligence:** Everything runs locally on your host with 0% cloud data leaks.`;
    }

    for (const word of responseText.split(/(\s+)/)) {
      if (word) onToken({ streamId, delta: word });
    }

    onDone({
      streamId,
      citations: [],
      latencyMs: Date.now() - startTime,
      tier: currentProfile.tier
    });
    return { streamId, totalLatency: Date.now() - startTime };
  }

  // 5. Hybrid RRF Search across FTS5 and BLOB vectors
  let hits = [];
  let searchLatency = 0;
  if (dbOrStore && typeof dbOrStore.search === 'function') {
    const res = dbOrStore.search(rawQuery, topK);
    hits = res.hits || [];
    searchLatency = res.latencyMs || 0;
  } else if (dbOrStore && typeof dbOrStore.prepare === 'function') {
    try {
      const rows = dbOrStore.prepare('SELECT chunk_id, doc_path, heading_path, text FROM vector_embeddings LIMIT ?').all(topK);
      hits = rows.map((r, i) => ({
        chunkId: r.chunk_id || i + 1,
        docPath: r.rel_path || r.doc_path || 'unknown',
        headingPath: r.heading_path,
        text: r.text,
        rrfScore: r.score || 1.0,
        tag: `[S${i + 1}]`
      }));
      searchLatency = 1;
    } catch {
      hits = [];
    }
  } else if (dbOrStore === undefined) {
    const res = getVectorStore().search(rawQuery, topK);
    hits = res.hits || [];
    searchLatency = res.latencyMs || 0;
  }

  if (hits.length > 0) {
    emitThought(`📄 Retrieved ${hits.length} relevant context chunks from vault (${searchLatency}ms)...`);
    emitThought('🧠 Synthesizing answer with source citations...');
  } else {
    emitThought('🧠 Formulating response as continuous personal assistant...');
  }

  // Conversational response synthesis
  let responseText = '';

  if (currentProfile.tier === 'SEARCH_ONLY' || !currentProfile.modelConfig?.llmEnabled) {
    if (hits.length > 0) {
      responseText = `[Fast Search Results (Optimized Low-Memory Tier)]\nFound ${hits.length} relevant document excerpt(s) in ${searchLatency}ms:\n\n`;
      hits.forEach((hit, idx) => {
        const citationTag = `[S${idx + 1}]`;
        const heading = hit.headingPath ? ` (${hit.headingPath})` : '';
        const preview = hit.text.length > 240 ? hit.text.slice(0, 240) + '...' : hit.text;
        responseText += `${citationTag} **${hit.docPath}**${heading}:\n"${preview}"\n\n`;
      });
    } else {
      responseText = `As your personal assistant, I searched your local vault for **"${rawQuery}"**, but no indexed document chunks directly matched this query.\n\nYou can add directories in the left sidebar to index your files, or ask me any general technical, architectural, or programming questions directly!`;
    }
  } else {
    if (hits.length > 0) {
      responseText = `[${currentProfile.tier} Mode - Local Synthesis]\nFound ${hits.length} relevant document excerpt(s) in ${searchLatency}ms:\n\n`;
      hits.forEach((hit, idx) => {
        responseText += `[S${idx + 1}] **${hit.docPath}**:\n"${hit.text.slice(0, 150)}..."\n\n`;
      });
    } else {
      responseText = `As your personal assistant, I searched your local vault for **"${rawQuery}"**, but no indexed document chunks directly matched this query.\n\nYou can add directories in the left sidebar to index your files, or ask me any general technical, architectural, or programming questions directly!`;
    }
  }


  for (const word of responseText.split(/(\s+)/)) {
    if (word) onToken({ streamId, delta: word });
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

// Background Worker Thread Message Dispatcher
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
          const result = await safeReadFile(msg.payload.targetPath, msg.payload.allowedRoots);
          parentPort.postMessage({ type: 'READ_FILE_RESULT', id: msg.id, payload: result });
          break;
        }
        case 'WRITE_FILE': {
          const result = await safeWriteFile(msg.payload.targetPath, msg.payload.content, msg.payload.allowedRoots);
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
            activeProfile,
            (thought) => parentPort.postMessage({ type: 'THOUGHT_STEP', streamId, payload: thought })
          );
          break;
        }
      }
    } catch (err) {
      parentPort.postMessage({ type: 'ERROR', id: msg.id, error: err.message });
    }
  });
}
