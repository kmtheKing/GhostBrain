export interface RankedHit {
  id: number;
  score: number;
}

export interface FusedHit {
  id: number;
  rrfScore: number;
  vectorRank?: number;
  ftsRank?: number;
}

/**
 * Pure Reciprocal Rank Fusion (RRF) algorithm.
 * score(doc) = sum(1 / (k + rank_i))
 * Default k = 60.
 */
export function fuseRRF(
  vectorHits: number[], // ordered best to worst
  ftsHits: number[],    // ordered best to worst
  k: number = 60,
  topN: number = 8
): FusedHit[] {
  const scores = new Map<number, { rrf: number; vRank?: number; fRank?: number }>();

  vectorHits.forEach((id, index) => {
    const rank = index + 1;
    const current = scores.get(id) || { rrf: 0 };
    current.rrf += 1.0 / (k + rank);
    current.vRank = rank;
    scores.set(id, current);
  });

  ftsHits.forEach((id, index) => {
    const rank = index + 1;
    const current = scores.get(id) || { rrf: 0 };
    current.rrf += 1.0 / (k + rank);
    current.fRank = rank;
    scores.set(id, current);
  });

  const results: FusedHit[] = Array.from(scores.entries()).map(([id, val]) => ({
    id,
    rrfScore: val.rrf,
    vectorRank: val.vRank,
    ftsRank: val.fRank,
  }));

  results.sort((a, b) => b.rrfScore - a.rrfScore);

  return results.slice(0, topN);
}
