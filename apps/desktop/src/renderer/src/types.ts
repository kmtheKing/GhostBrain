export type NetworkMode = 'cloud-relay' | 'airgap';

export interface WatchedDirectory {
  id: string;
  path: string;
  status: 'Sync' | 'Live' | 'Indexing' | 'Idle';
  chunks: number;
  engine: string;
}

export interface TelemetryState {
  cpuLoad: number;
  cpuCores: number;
  cpuModel?: string;
  hostRamMB: number;
  hostTotalRamMB?: number;
  hostUsedRamMB?: number;
  hostRamEngine: string;
  vramAllocatedGB: number;
  vramTotalGB: number;
  vramEngine: string;
  activeModel: string;
  modelQuant: string;
  backend: string;
  contextTokens: number;
  kvCacheMB: number;
  isModelOnline?: boolean;
  installedModels?: string[];
}

export interface PairedClient {
  id: string;
  name: string;
  ip: string;
  status: 'active' | 'syncing' | 'idle';
  type: string;
}

export interface SearchResultItem {
  id: string;
  filename: string;
  type: 'markdown' | 'sqlite' | 'code';
  score: number;
  scoreType: string;
  excerptLine?: string;
  excerptSnippet: string;
  highlightWords?: string[];
}

export interface QueryMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  citationDoc?: string;
  citationIndex?: number;
}
