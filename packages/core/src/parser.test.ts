import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { promises as fs } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { computeFileBlake3, computeBlake3Hex } from './hash.js';
import { defaultParserRouter, NativeTextParser } from './parser.js';

describe('hash and parser', () => {
  const tempDir = join(tmpdir(), 'ghostbrain-test-' + Date.now());
  const testFile = join(tempDir, 'test-doc.md');
  const sampleContent = '# Test Heading\n\nSample content for streaming hash & parsing.';

  beforeAll(async () => {
    await fs.mkdir(tempDir, { recursive: true });
    await fs.writeFile(testFile, sampleContent, 'utf8');
  });

  afterAll(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('computes streaming file BLAKE3 hash identically to in-memory hash', async () => {
    const fileResult = await computeFileBlake3(testFile);
    const memHex = computeBlake3Hex(sampleContent);

    expect(fileResult.hex).toBe(memHex);
    expect(fileResult.sizeBytes).toBe(Buffer.byteLength(sampleContent, 'utf8'));
    expect(fileResult.mtimeMs).toBeGreaterThan(0);
  });

  it('parses markdown files into clean text and metadata', async () => {
    const parsed = await defaultParserRouter.parse(testFile);
    expect(parsed.parser).toBe('native-md');
    expect(parsed.mime).toBe('text/markdown');
    expect(parsed.text).toBe(sampleContent);
  });

  it('detects unsupported file extensions correctly', async () => {
    const unknownFile = join(tempDir, 'sample.xyz');
    expect(defaultParserRouter.findParser(unknownFile)).toBeUndefined();
    await expect(defaultParserRouter.parse(unknownFile)).rejects.toThrow('Unsupported document format');
  });
});
