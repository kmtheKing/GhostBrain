import type { HardwareProfile } from './hardware-profiler.js';

export function initWorker(options?: any): Promise<{ activeProfile: HardwareProfile; dbPath: string }>;

export function getVectorStore(): any;

export function indexFolder(
  folderPath: string,
  onProgress?: (progress: { current: string; total: number; indexed: number; skipped: number }) => void
): Promise<{
  folderPath: string;
  totalFiles: number;
  filesIndexed: number;
  filesSkipped: number;
  durationMs: number;
}>;

export function executeSearch(
  dbOrStore: any,
  payload: { query: string; limit?: number },
  profile?: HardwareProfile | null
): {
  hits: any[];
  latencyMs: number;
  error?: string;
};

export function processChatStream(
  dbOrStore: any,
  payload: { query: string; streamId?: string; conversationId?: number },
  onToken: (token: { streamId: string; delta: string }) => void,
  onDone: (done: { streamId: string; citations: any[]; latencyMs: number; tier?: string }) => void,
  profile?: HardwareProfile | null
): Promise<{ streamId: string; totalLatency?: number }>;
