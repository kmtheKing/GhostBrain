import { describe, it, expect } from 'vitest';
import { buildRagPrompt, parseCitations } from './prompt.js';
import type { SearchHit } from '@ghostbrain/shared-types';

describe('buildRagPrompt & parseCitations', () => {
  const mockHits: SearchHit[] = [
    {
      chunkId: 101,
      documentId: 1,
      relPath: 'docs/architecture.md',
      headingPath: 'Core > RAG',
      text: 'GhostBrain uses SQLite-vec and FTS5 for hybrid search.',
      rrfScore: 0.033
    },
    {
      chunkId: 102,
      documentId: 2,
      relPath: 'docs/clinic.md',
      headingPath: 'LAN > Air-Gap',
      text: 'Clinical LAN edition operates in air-gap mode with HIPAA compliance.',
      rrfScore: 0.025
    }
  ];

  it('builds formatted prompt with [S1] and [S2] source markers', () => {
    const prompt = buildRagPrompt('How does search work?', mockHits);
    expect(prompt.userPrompt).toContain('[S1] Source: docs/architecture.md | Section: Core > RAG');
    expect(prompt.userPrompt).toContain('[S2] Source: docs/clinic.md | Section: LAN > Air-Gap');
    expect(prompt.userPrompt).toContain('Question: How does search work?');
  });

  it('handles empty hits gracefully', () => {
    const prompt = buildRagPrompt('test', []);
    expect(prompt.userPrompt).toContain('No relevant local documents found.');
  });

  it('extracts cited sources correctly', () => {
    const answer = 'GhostBrain uses hybrid search [S1] and supports air-gapped LAN [S2].';
    const citations = parseCitations(answer, mockHits);
    expect(citations).toHaveLength(2);
    expect(citations[0].relPath).toBe('docs/architecture.md');
    expect(citations[1].relPath).toBe('docs/clinic.md');
  });

  it('deduplicates multiple references to the same source', () => {
    const answer = 'Hybrid search is used [S1]. SQLite-vec powers it [S1].';
    const citations = parseCitations(answer, mockHits);
    expect(citations).toHaveLength(1);
    expect(citations[0].chunkId).toBe(101);
  });

  it('ignores citations out of range', () => {
    const answer = 'Invalid reference [S99].';
    const citations = parseCitations(answer, mockHits);
    expect(citations).toHaveLength(0);
  });
});
