import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { assertSafePath, safeWriteFile, safeReadFile, createFolderOrFile } from './safe-write.js';
import { processChatStream, listWatchedFiles, summarizeFile } from './rag-worker.js';

describe('Sub-Agent 2: Personal Assistant Brain & Workspace Tools Suite', () => {
  let tempDir: string;
  let vaultDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gb-assistant-test-'));
    vaultDir = path.join(tempDir, 'vault');
    fs.mkdirSync(vaultDir, { recursive: true });
  });

  afterEach(() => {
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {}
  });

  describe('Safe-Write Path-Traversal & Jail Audit', () => {
    it('blocks directory traversal attempts containing ".."', () => {
      expect(() => {
        assertSafePath('../outside.txt', [vaultDir]);
      }).toThrow(/Path traversal blocked/);

      expect(() => {
        assertSafePath('nested/../../etc/passwd', [vaultDir]);
      }).toThrow(/Path traversal blocked/);
    });

    it('blocks paths attempting to escape authorized workspace roots', () => {
      const outsidePath = path.join(tempDir, 'unauthorized.txt');
      expect(() => {
        assertSafePath(outsidePath, [vaultDir]);
      }).toThrow(/Access denied/);
    });

    it('allows valid paths inside authorized workspace roots', () => {
      const insidePath = path.join(vaultDir, 'notes.md');
      const resolved = assertSafePath(insidePath, [vaultDir]);
      expect(resolved).toBe(path.resolve(insidePath));
    });

    it('creates .bak backup when updating existing text/code files', async () => {
      const codeFile = path.join(vaultDir, 'index.ts');
      fs.writeFileSync(codeFile, 'export const version = "1.0";', 'utf-8');

      const result = await safeWriteFile(codeFile, 'export const version = "2.0";', [vaultDir]);
      expect(result.success).toBe(true);
      expect(result.backupPath).toBe(`${codeFile}.bak`);
      expect(fs.existsSync(`${codeFile}.bak`)).toBe(true);
      expect(fs.readFileSync(`${codeFile}.bak`, 'utf-8')).toBe('export const version = "1.0";');
      expect(fs.readFileSync(codeFile, 'utf-8')).toBe('export const version = "2.0";');
    });

    it('creates .ghost.md companion when writing to binary file extensions', async () => {
      const pdfFile = path.join(vaultDir, 'contract.pdf');
      fs.writeFileSync(pdfFile, 'FAKE_PDF_BINARY_DATA');

      const result = await safeWriteFile(pdfFile, '# Contract Addendum Notes', [vaultDir]);
      expect(result.success).toBe(true);
      expect(result.isCompanion).toBe(true);
      expect(result.path.endsWith('.pdf.ghost.md')).toBe(true);
      expect(fs.existsSync(result.path)).toBe(true);
      // Original binary is untouched
      expect(fs.readFileSync(pdfFile, 'utf-8')).toBe('FAKE_PDF_BINARY_DATA');
    });

    it('creates directories and files safely via createFolderOrFile', async () => {
      const subDir = path.join(vaultDir, 'subfolder');
      const folderRes = await createFolderOrFile(subDir, true, '', [vaultDir]);
      expect(folderRes.success).toBe(true);
      expect(fs.existsSync(subDir)).toBe(true);

      const newFile = path.join(subDir, 'new_note.md');
      const fileRes = await createFolderOrFile(newFile, false, '# My New Note', [vaultDir]);
      expect(fileRes.success).toBe(true);
      expect(fs.existsSync(newFile)).toBe(true);
    });
  });

  describe('Personal Assistant Conversational & Tool Execution', () => {
    it('responds naturally to greetings ("hello") and emits thought steps', async () => {
      const thoughts: string[] = [];
      const tokens: string[] = [];
      let donePayload: any = null;

      await processChatStream(
        null,
        { query: 'hello there!' },
        (tok) => tokens.push(tok.delta),
        (done) => { donePayload = done; },
        { tier: 'CPU_LITE', modelConfig: { llmEnabled: false, topKChunks: 2 } } as any,
        (thought: string) => thoughts.push(thought)
      );

      expect(thoughts.length).toBeGreaterThan(0);
      expect(thoughts).toContain('🔍 Scanning watched folders and workspace files...');
      expect(thoughts).toContain('🧠 Formulating response as continuous personal assistant...');

      const fullText = tokens.join('');
      expect(fullText).toContain('GhostBrain');
      expect(fullText).toContain('Personal Assistant');
      expect(donePayload).toBeDefined();
    });

    it('converses on general topics even when 0 local documents match (no dead-end)', async () => {
      const thoughts: string[] = [];
      const tokens: string[] = [];

      await processChatStream(
        null,
        { query: 'Explain the principles of clean code architecture' },
        (tok) => tokens.push(tok.delta),
        () => {},
        { tier: 'SEARCH_ONLY', modelConfig: { llmEnabled: false, topKChunks: 2 } } as any,
        (thought: string) => thoughts.push(thought)
      );

      const fullText = tokens.join('');
      expect(fullText).not.toContain('No matching local documents found for: "Explain');
      expect(fullText).toContain('As your personal assistant');
    });

    it('summarizes local files and returns executive summary', async () => {
      const testDoc = path.join(vaultDir, 'architecture.md');
      fs.writeFileSync(
        testDoc,
        '# GhostBrain Architecture\n## 1. Offline Core\nZero cloud dependence.\n## 2. SQLite Vectors\nFast 256-dim BLOB search.',
        'utf-8'
      );

      const summary = await summarizeFile(testDoc, [vaultDir]);
      expect(summary.path).toBe(testDoc);
      expect(summary.headings).toContain('# GhostBrain Architecture');
      expect(summary.headings).toContain('## 1. Offline Core');
      expect(summary.summary).toContain('Executive Summary');
    });

    it('lists watched files inventory cleanly', () => {
      fs.writeFileSync(path.join(vaultDir, 'doc1.md'), 'Content 1');
      fs.writeFileSync(path.join(vaultDir, 'doc2.ts'), 'Content 2');

      const files = listWatchedFiles([vaultDir]);
      expect(files.length).toBeGreaterThanOrEqual(2);
      expect(files.some((f: any) => f.relPath.includes('doc1.md'))).toBe(true);
      expect(files.some((f: any) => f.relPath.includes('doc2.ts'))).toBe(true);
    });
  });
});
