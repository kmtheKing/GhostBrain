import { describe, it, expect } from 'vitest';
import { chunkMarkdown, normalizeChunkText, estimateTokens } from './chunker.js';

describe('chunkMarkdown', () => {
  it('returns empty array for empty or blank input', () => {
    expect(chunkMarkdown('')).toEqual([]);
    expect(chunkMarkdown('   \n\n  ')).toEqual([]);
  });

  it('tracks heading paths accurately across nested sections', () => {
    const md = `
# Project Alpha

Introductory text about Alpha.

## Architecture

Architecture details.

### Storage

SQLite details.

## Deployment

Deploy instructions.
`;

    const chunks = chunkMarkdown(md, { targetTokens: 50 });
    expect(chunks.length).toBeGreaterThan(0);

    const intro = chunks.find((c) => c.text.includes('Introductory text'));
    expect(intro?.headingPath).toBe('Project Alpha');

    const storage = chunks.find((c) => c.text.includes('SQLite details'));
    expect(storage?.headingPath).toBe('Project Alpha > Architecture > Storage');

    const deploy = chunks.find((c) => c.text.includes('Deploy instructions'));
    expect(deploy?.headingPath).toBe('Project Alpha > Deployment');
  });

  it('preserves fenced code blocks without breaking mid-block', () => {
    const code = `
\`\`\`typescript
function calculateDistance(x1: number, y1: number, x2: number, y2: number): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  return Math.sqrt(dx * dx + dy * dy);
}
\`\`\`
`.trim();

    const md = `
# Math Library

Here is the helper function:

${code}

More text follows after code block.
`;

    const chunks = chunkMarkdown(md);
    const codeChunk = chunks.find((c) => c.text.includes('calculateDistance'));
    expect(codeChunk).toBeDefined();
    expect(codeChunk?.text).toContain(code);
  });

  it('generates consistent, deterministic BLAKE3 32-byte hashes', () => {
    const md = '# Title\n\nIdentical content for testing deterministic hashes.';
    const run1 = chunkMarkdown(md);
    const run2 = chunkMarkdown(md);

    expect(run1[0].chunkHashHex).toBe(run2[0].chunkHashHex);
    expect(run1[0].chunkHash.length).toBe(32);
    expect(run1[0].chunkHashHex.length).toBe(64);
  });

  it('normalizes chunk text per specification', () => {
    const dirty = 'Line 1   \r\n\r\n\r\n\r\nLine 2 \t \r\n';
    const normalized = normalizeChunkText(dirty);
    expect(normalized).toBe('Line 1\n\nLine 2');
  });

  it('estimates token counts reasonably', () => {
    const text = 'GhostBrain is a privacy-first commercial second brain.';
    const tokens = estimateTokens(text);
    expect(tokens).toBeGreaterThan(5);
    expect(tokens).toBeLessThan(20);
  });
});
