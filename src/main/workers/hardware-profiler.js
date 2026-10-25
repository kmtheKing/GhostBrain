import os from 'os';

export async function detectGpuCapabilities(options = {}) {
  if (options.forceGpu !== undefined) {
    return {
      hasGpu: Boolean(options.forceGpu),
      backend: options.forceGpu ? (options.forceGpuBackend || 'cuda') : 'cpu',
      devices: options.forceGpu ? ['Simulated High-Performance Accelerator'] : []
    };
  }

  try {
    const llamaModule = await import('node-llama-cpp');
    if (llamaModule && typeof llamaModule.getLlama === 'function') {
      for (const gpuType of ['cuda', 'vulkan', 'metal']) {
        try {
          const llama = await llamaModule.getLlama({ gpu: gpuType });
          if (llama && llama.gpu && llama.gpu !== false && llama.gpu !== 'cpu') {
            const devices = typeof llamaModule.getGpuDeviceNames === 'function'
              ? await llamaModule.getGpuDeviceNames()
              : [gpuType.toUpperCase() + ' Accelerator'];
            return {
              hasGpu: true,
              backend: gpuType,
              devices
            };
          }
        } catch {
          // Probe next candidate
        }
      }
    }
  } catch {
    // node-llama-cpp not present
  }

  if (process.env.CUDA_VISIBLE_DEVICES && process.env.CUDA_VISIBLE_DEVICES !== '-1') {
    return {
      hasGpu: true,
      backend: 'cuda',
      devices: ['CUDA Device (' + process.env.CUDA_VISIBLE_DEVICES + ')']
    };
  }

  if (process.env.GHOSTBRAIN_FORCE_GPU === 'true') {
    return {
      hasGpu: true,
      backend: 'cuda',
      devices: ['Environment Force GPU']
    };
  }

  return {
    hasGpu: false,
    backend: 'cpu',
    devices: []
  };
}

export async function profileHardware(options = {}) {
  const totalMemBytes = options.forceTotalMemBytes ?? os.totalmem();
  const totalMemGB = totalMemBytes / (1024 ** 3);
  const cpus = options.forceCpus ?? (os.cpus()?.length || 4);

  const gpuInfo = await detectGpuCapabilities(options);

  if (gpuInfo.hasGpu) {
    return {
      tier: 'GPU_HIGH',
      totalMemGB: parseFloat(totalMemGB.toFixed(2)),
      cpus,
      gpu: gpuInfo,
      modelConfig: {
        model: 'Qwen2.5-3B-Instruct-Q4_K_M.gguf',
        gpuLayers: 'auto',
        ctxSize: 4096,
        topKChunks: 5,
        threads: Math.min(8, Math.max(2, cpus - 1)),
        embedBatchSize: 32,
        llmEnabled: true
      }
    };
  }

  if (totalMemGB >= 8.0) {
    return {
      tier: 'CPU_LITE',
      totalMemGB: parseFloat(totalMemGB.toFixed(2)),
      cpus,
      gpu: gpuInfo,
      modelConfig: {
        model: 'Llama-3.2-1B-Instruct-Q4_K_M.gguf',
        gpuLayers: 0,
        ctxSize: 2048,
        topKChunks: 2,
        threads: Math.max(2, cpus - 2),
        embedBatchSize: 16,
        llmEnabled: true
      }
    };
  }

  return {
    tier: 'SEARCH_ONLY',
    totalMemGB: parseFloat(totalMemGB.toFixed(2)),
    cpus,
    gpu: gpuInfo,
    modelConfig: {
      model: null,
      gpuLayers: 0,
      ctxSize: 0,
      topKChunks: 3,
      threads: Math.max(1, Math.floor(cpus / 2)),
      embedBatchSize: 8,
      llmEnabled: false
    }
  };
}
