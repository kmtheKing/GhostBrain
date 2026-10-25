export interface VectorHit {
  chunkId: number;
  docPath: string;
  headingPath?: string;
  text: string;
  rrfScore: number;
  tag: string;
}

export interface SearchResult {
  hits: VectorHit[];
  latencyMs: number;
}

export class VectorStore {
  db: any;
  constructor(dbPath?: string);
  initSchema(): void;
  canSkipByMtime(filePath: string): boolean;
  indexDocument(filePath: string, markdown: string, title?: string, type?: string): Promise<{ skipped: boolean; path: string; reason?: string }>;
  search(query: string, limit?: number): SearchResult;
  close(): void;
}
