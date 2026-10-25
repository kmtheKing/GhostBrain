import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import Database from 'better-sqlite3';
import { SCHEMA_V1, SCHEMA_V2 } from './schema.js';

describe('Sub-Agent 1: Directory Ingestion & Continuous SQLite Timeline Suite', () => {
  let tempDir: string;
  let dbPath: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gb-chat-test-'));
    dbPath = path.join(tempDir, 'test-timeline.sqlite');
  });

  afterEach(() => {
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {}
  });

  function createTestDb(filePath: string) {
    const db = new Database(filePath);
    db.exec(SCHEMA_V1);
    db.exec(SCHEMA_V2);
    return db;
  }

  it('persists watched folders across database restarts', () => {
    // Session 1: Add watched folder
    const db1 = createTestDb(dbPath);
    const folderPath = path.join(tempDir, 'vault');
    fs.mkdirSync(folderPath, { recursive: true });

    const insert = db1.prepare(
      'INSERT INTO watched_folders (abs_path, label, is_enabled, created_at) VALUES (?, ?, 1, ?) ON CONFLICT(abs_path) DO UPDATE SET is_enabled = 1'
    );
    insert.run(folderPath, 'vault', Date.now());

    const folders1 = db1.prepare('SELECT abs_path, label, is_enabled FROM watched_folders').all() as any[];
    expect(folders1).toHaveLength(1);
    expect(folders1[0].abs_path).toBe(folderPath);
    db1.close();

    // Session 2: Reopen database and verify watched folders survived
    const db2 = createTestDb(dbPath);
    const folders2 = db2.prepare('SELECT abs_path, label, is_enabled FROM watched_folders').all() as any[];
    expect(folders2).toHaveLength(1);
    expect(folders2[0].abs_path).toBe(folderPath);
    expect(folders2[0].is_enabled).toBe(1);
    db2.close();
  });

  it('persists chat messages, thoughts, tool calls, and citations across database restarts', () => {
    // Session 1: Insert user and assistant messages
    const db1 = createTestDb(dbPath);
    const userMsgId = 'user-1700000000';
    const assistantMsgId = 'assistant-1700000001';

    const insertStmt = db1.prepare(`
      INSERT INTO chat_messages (id, conversation_id, role, content, thoughts, tool_calls, citations, is_archived, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?)
    `);

    insertStmt.run(
      userMsgId,
      'default',
      'user',
      'Can you explain the safe write protocol?',
      null,
      null,
      null,
      1700000000
    );

    insertStmt.run(
      assistantMsgId,
      'default',
      'assistant',
      'The Safe Write protocol produces .bak backups for code and .ghost.md for binary files.',
      JSON.stringify(['🔍 Scanning watched folders...', '📄 Reading safe-write.js...', '🧠 Synthesizing answer...']),
      JSON.stringify([{ tool: 'read_file', path: 'safe-write.js' }]),
      JSON.stringify([{ relPath: 'safe-write.js', score: 0.98 }]),
      1700000001
    );

    const history1 = db1.prepare('SELECT * FROM chat_messages WHERE conversation_id = ? AND is_archived = 0 ORDER BY created_at ASC').all('default') as any[];
    expect(history1).toHaveLength(2);
    expect(history1[0].role).toBe('user');
    expect(history1[1].role).toBe('assistant');
    db1.close();

    // Session 2: Reopen database and verify complete timeline hydration
    const db2 = createTestDb(dbPath);
    const history2 = db2.prepare('SELECT * FROM chat_messages WHERE conversation_id = ? AND is_archived = 0 ORDER BY created_at ASC').all('default') as any[];
    expect(history2).toHaveLength(2);
    expect(history2[0].content).toContain('safe write protocol');
    expect(history2[1].content).toContain('.ghost.md');

    const thoughts = JSON.parse(history2[1].thoughts);
    expect(thoughts).toContain('🔍 Scanning watched folders...');
    expect(thoughts).toContain('📄 Reading safe-write.js...');

    const citations = JSON.parse(history2[1].citations);
    expect(citations[0].relPath).toBe('safe-write.js');
    db2.close();
  });

  it('archives chat timeline cleanly on Clear Conversation without data loss', () => {
    const db = createTestDb(dbPath);
    const insertStmt = db.prepare(`
      INSERT INTO chat_messages (id, conversation_id, role, content, thoughts, tool_calls, citations, is_archived, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?)
    `);

    insertStmt.run('msg-1', 'default', 'user', 'Hello GhostBrain', null, null, null, Date.now());
    insertStmt.run('msg-2', 'default', 'assistant', 'Hello! How can I assist you?', null, null, null, Date.now() + 1);

    // Active messages before clear
    const activeBefore = db.prepare('SELECT COUNT(1) as count FROM chat_messages WHERE is_archived = 0').get() as any;
    expect(activeBefore.count).toBe(2);

    // Simulate clicking "Clear Conversation"
    db.prepare('UPDATE chat_messages SET is_archived = 1 WHERE conversation_id = ? AND is_archived = 0').run('default');

    // Active messages after clear should be 0
    const activeAfter = db.prepare('SELECT COUNT(1) as count FROM chat_messages WHERE is_archived = 0').get() as any;
    expect(activeAfter.count).toBe(0);

    // Archived messages still safely retained
    const totalRetained = db.prepare('SELECT COUNT(1) as count FROM chat_messages WHERE is_archived = 1').get() as any;
    expect(totalRetained.count).toBe(2);
    db.close();
  });
});
