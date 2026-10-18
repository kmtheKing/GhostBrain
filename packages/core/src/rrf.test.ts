import { describe, it, expect } from 'vitest';
import { fuseRRF } from './rrf.js';
import { computeBlake3Hex } from './hash.js';

describe('Reciprocal Rank Fusion (RRF)', () => {
  it('correctly ranks items present in both lists higher', () => {
    const vec = [1, 2, 3];
    const fts = [3, 4, 1];
    const fused = fuseRRF(vec, fts, 60, 5);

    // Item 1 is rank 1 in vec and rank 3 in fts -> 1/61 + 1/63 = 0.01639 + 0.01587 = 0.03226
    // Item 3 is rank 3 in vec and rank 1 in fts -> 1/63 + 1/61 = 0.03226
    // Item 2 is rank 2 in vec -> 1/62 = 0.01612
    // Item 4 is rank 2 in fts -> 1/62 = 0.01612
    expect(fused.length).toBe(4);
    expect([fused[0].id, fused[1].id]).toContain(1);
    expect([fused[0].id, fused[1].id]).toContain(3);
    expect(fused[0].rrfScore).toBeCloseTo(1 / 61 + 1 / 63, 4);
  });
});

describe('BLAKE3 Hashing', () => {
  it('produces deterministic 64-char hex strings', () => {
    const h1 = computeBlake3Hex('GhostBrain deterministic chunk');
    const h2 = computeBlake3Hex('GhostBrain deterministic chunk');
    expect(h1).toHaveLength(64);
    expect(h1).toBe(h2);
  });
});
