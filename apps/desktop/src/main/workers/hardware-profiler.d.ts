export interface GpuCapabilities {
  hasGpu: boolean;
  backend: string;
  devices: string[];
}

export interface ModelConfig {
  model: string | null;
  gpuLayers: string | number;
  ctxSize: number;
  topKChunks: number;
  threads: number;
  embedBatchSize: number;
  llmEnabled: boolean;
}

export interface HardwareProfile {
  tier: 'GPU_HIGH' | 'CPU_LITE' | 'SEARCH_ONLY';
  totalMemGB: number;
  cpus: number;
  gpu: GpuCapabilities;
  modelConfig: ModelConfig;
}

export interface ProfileOptions {
  forceGpu?: boolean;
  forceGpuBackend?: string;
  forceTotalMemBytes?: number;
  forceCpus?: number;
}

export function detectGpuCapabilities(options?: ProfileOptions): Promise<GpuCapabilities>;
export function profileHardware(options?: ProfileOptions): Promise<HardwareProfile>;
