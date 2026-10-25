import { profileHardware } from './hardware-profiler.js';
import { executeSearch, processChatStream, indexFolder, setVectorStore } from './rag-worker.js';
import { safeWriteFile, safeReadFile } from './safe-write.js';
import { VectorStore } from '../db/vector-store.js';
import type { Database } from 'better-sqlite3-multiple-ciphers';
import type { SearchHit, SearchQueryPayload, ChatAskPayload, ChatCitation } from '@ghostbrain/shared-types';

export interface HardwareProfile {
  tier: 'GPU_HIGH' | 'CPU_LITE' | 'SEARCH_ONLY';
  totalMemGB: number;
  cpus: number;
  gpu: {
    hasGpu: boolean;
    backend: string;
    devices: string[];
  };
  modelConfig: {
    model: string | null;
    gpuLayers: string | number;
    ctxSize: number;
    topKChunks: number;
    threads: number;
    embedBatchSize: number;
    llmEnabled: boolean;
  };
}

export class WorkerManager {
  private static instance: WorkerManager | null = null;
  private profile: HardwareProfile | null = null;
  private db: Database | null = null;
  private vectorStore: any = null;

  private constructor() {}

  public static getInstance(): WorkerManager {
    if (!WorkerManager.instance) {
      WorkerManager.instance = new WorkerManager();
    }
    return WorkerManager.instance;
  }

  public async init(db: Database, options?: any): Promise<HardwareProfile> {
    this.db = db;
    try {
      this.vectorStore = new VectorStore(db);
      setVectorStore(this.vectorStore);
    } catch (err) {
      console.warn('[WorkerManager] Failed to wrap db in VectorStore:', err);
    }
    this.profile = (await profileHardware(options)) as HardwareProfile;

    console.log(
      `[SilentHardwareSwitcher] Initialized tier: ${this.profile.tier} | Host RAM: ${this.profile.totalMemGB} GB | Threads: ${this.profile.modelConfig.threads} | Model: ${this.profile.modelConfig.model || 'None (Fast Search Only)'}`
    );

    return this.profile;
  }

  public getProfile(): HardwareProfile | null {
    return this.profile;
  }

  public async search(payload: SearchQueryPayload): Promise<SearchHit[]> {
    if (!this.db && !this.vectorStore) return [];
    const result = executeSearch(this.vectorStore || this.db, payload, this.profile);
    return result.hits as SearchHit[];
  }

  public async indexFolder(folderPath: string, onProgress?: (p: any) => void): Promise<any> {
    return await indexFolder(folderPath, onProgress, this.vectorStore);
  }

  public async readFile(targetPath: string): Promise<any> {
    return await safeReadFile(targetPath);
  }

  public async writeFile(targetPath: string, content: string): Promise<any> {
    return await safeWriteFile(targetPath, content);
  }

  public async streamChat(
    payload: ChatAskPayload,
    onToken: (token: { streamId: string; delta: string }) => void,
    onDone: (done: { streamId: string; citations: ChatCitation[]; latencyMs: number; tier?: string }) => void,
    onThought?: (step: string) => void
  ): Promise<{ streamId: string }> {
    if (!this.db && !this.vectorStore) throw new Error('Database not initialized');
    const result = await processChatStream(this.vectorStore || this.db, payload, onToken, onDone, this.profile, onThought);
    return { streamId: result.streamId };
  }
}
