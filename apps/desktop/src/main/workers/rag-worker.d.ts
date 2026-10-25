import type { HardwareProfile } from './hardware-profiler.js';

export function initWorker(options?: any): Promise<{ activeProfile: HardwareProfile; dbPath: string }>;

export function getVectorStore(): any;

export function getWatchedFolders(dbOrStore: any): string[];

export function listWatchedFiles(folders?: string[]): Array<{
  path: string;
  relPath: string;
  size: number;
  ext: string;
}>;

export function summarizeFile(filePath: string, allowedRoots?: string[]): Promise<{
  path: string;
  type: string;
  lineCount: number;
  charCount: number;
  headings: string[];
  summary: string;
}>;

export function indexFolder(
  folderPath: string,
  onProgress?: (progress: { current: string; total: number; indexed: number; skipped: number }) => void,
  customStore?: any
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
  profile?: HardwareProfile | null,
  onThought?: ((step: string) => void) | null
): Promise<{ streamId: string; totalLatency?: number }>;

export function safeReadFile(filePath: string, allowedRoots?: string[]): Promise<{
  path: string;
  content: string;
  isBinary?: boolean;
  previewMarkdown?: string;
}>;

export function safeWriteFile(filePath: string, content: string, allowedRoots?: string[]): Promise<{
  path: string;
  backupPath?: string;
  isCompanion: boolean;
}>;
