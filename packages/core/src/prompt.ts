import type { SearchHit, ChatCitation } from '@ghostbrain/shared-types';

export interface RagPrompt {
  systemPrompt: string;
  userPrompt: string;
  sources: SearchHit[];
}

export function buildRagPrompt(query: string, hits: SearchHit[]): RagPrompt {
  const systemPrompt = 'You are GhostBrain, a secure local AI assistant. Answer the user' + '\'s question accurately based ONLY on the provided context sources.\n' +
    'For every claim or factual assertion, cite the source using the tag format [S1], [S2], etc.\n' +
    'If the context does not contain enough information to answer the question, clearly state that you do not know based on the provided documents.\n' +
    'Do not hallucinate sources. Use inline citations [Sx] directly after the relevant sentence.';

  let sourcesContext = '';
  if (hits.length === 0) {
    sourcesContext = 'No relevant local documents found.';
  } else {
    sourcesContext = hits
      .map((hit, index) => {
        const sourceId = '[S' + (index + 1) + ']';
        const heading = hit.headingPath ? ' | Section: ' + hit.headingPath : '';
        return sourceId + ' Source: ' + hit.relPath + heading + '\n' + hit.text.trim();
      })
      .join('\n\n---\n\n');
  }

  const userPrompt = 'Context Sources:\n' + sourcesContext + '\n\nQuestion: ' + query.trim() + '\n\nAnswer:';

  return {
    systemPrompt,
    userPrompt,
    sources: hits
  };
}

export function parseCitations(response: string, sources: SearchHit[]): ChatCitation[] {
  if (!response || sources.length === 0) return [];

  const citationPattern = /\[S(\d+)\]/g;
  const citedIndices = new Set<number>();
  let match: RegExpExecArray | null;

  while ((match = citationPattern.exec(response)) !== null) {
    const sourceNum = parseInt(match[1], 10);
    if (!isNaN(sourceNum) && sourceNum >= 1 && sourceNum <= sources.length) {
      citedIndices.add(sourceNum - 1);
    }
  }

  const result: ChatCitation[] = [];
  for (const idx of citedIndices) {
    const hit = sources[idx];
    result.push({
      chunkId: hit.chunkId,
      documentId: hit.documentId,
      relPath: hit.relPath,
      score: hit.rrfScore,
      tag: 'S' + (idx + 1),
      headingPath: hit.headingPath
    });
  }

  return result;
}
