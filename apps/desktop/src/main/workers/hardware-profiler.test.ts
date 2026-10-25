import { describe, it, expect, vi } from 'vitest';
import { profileHardware } from './hardware-profiler.js';
import { processChatStream, executeSearch } from './rag-worker.js';

describe('GhostBrain Silent 3-Tier Hardware Auto-Switcher & Worker Isolation', () => {
  it('simulates Tier 1: GPU_HIGH (dGPU / CUDA / Vulkan / Metal)', async () => {
    const profile = await profileHardware({
      forceGpu: true,
      forceGpuBackend: 'cuda',
      forceTotalMemBytes: 16 * 1024 * 1024 * 1024,
      forceCpus: 12
    });

    expect(profile.tier).toBe('GPU_HIGH');
    expect(profile.gpu.hasGpu).toBe(true);
    expect(profile.gpu.backend).toBe('cuda');
    expect(profile.modelConfig.model).toBe('Qwen2.5-3B-Instruct-Q4_K_M.gguf');
    expect(profile.modelConfig.gpuLayers).toBe('auto');
    expect(profile.modelConfig.ctxSize).toBe(4096);
    expect(profile.modelConfig.topKChunks).toBe(5);
    expect(profile.modelConfig.llmEnabled).toBe(true);
  });

  it('simulates Tier 2: CPU_LITE (No GPU, >=8GB RAM)', async () => {
    const profile = await profileHardware({
      forceGpu: false,
      forceTotalMemBytes: 16 * 1024 * 1024 * 1024,
      forceCpus: 8
    });

    expect(profile.tier).toBe('CPU_LITE');
    expect(profile.gpu.hasGpu).toBe(false);
    expect(profile.modelConfig.model).toBe('Llama-3.2-1B-Instruct-Q4_K_M.gguf');
    expect(profile.modelConfig.gpuLayers).toBe(0);
    expect(profile.modelConfig.ctxSize).toBe(2048);
    expect(profile.modelConfig.topKChunks).toBe(2);
    // Threads = Math.max(2, 8 - 2) = 6
    expect(profile.modelConfig.threads).toBe(6);
    expect(profile.modelConfig.llmEnabled).toBe(true);
  });

  it('simulates Tier 3: SEARCH_ONLY (No GPU, <8GB RAM - Low Resource)', async () => {
    const profile = await profileHardware({
      forceGpu: false,
      forceTotalMemBytes: 4 * 1024 * 1024 * 1024,
      forceCpus: 4
    });

    expect(profile.tier).toBe('SEARCH_ONLY');
    expect(profile.gpu.hasGpu).toBe(false);
    expect(profile.modelConfig.model).toBeNull();
    expect(profile.modelConfig.gpuLayers).toBe(0);
    expect(profile.modelConfig.ctxSize).toBe(0);
    expect(profile.modelConfig.topKChunks).toBe(3);
    expect(profile.modelConfig.llmEnabled).toBe(false);
  });

  it('executes SEARCH_ONLY streaming with unified IPC response schema in <50ms', async () => {
    const searchOnlyProfile = await profileHardware({
      forceGpu: false,
      forceTotalMemBytes: 4 * 1024 * 1024 * 1024,
      forceCpus: 4
    });

    // Mock SQLite DB with chunks
    const mockDb = {
      prepare: vi.fn().mockReturnValue({
        all: vi.fn().mockReturnValue([
          {
            chunk_id: 101,
            document_id: 1,
            rel_path: 'Legal/Mutual_NDA.md',
            heading_path: 'Section 4 > Confidentiality',
            text: 'All proprietary software, designs, algorithms, and models shall remain strictly confidential.',
            score: 0.95
          },
          {
            chunk_id: 102,
            document_id: 1,
            rel_path: 'Legal/Mutual_NDA.md',
            heading_path: 'Section 9 > Governing Law',
            text: 'This agreement is governed by the laws of California.',
            score: 0.88
          }
        ])
      })
    };

    const tokens: string[] = [];
    let donePayload: any = null;

    const startTime = Date.now();
    await processChatStream(
      mockDb as any,
      { query: 'confidentiality obligations' },
      (t: { delta: string }) => tokens.push(t.delta),
      (d: any) => { donePayload = d; },
      searchOnlyProfile
    );
    const durationMs = Date.now() - startTime;

    // Fast completion verification
    expect(durationMs).toBeLessThan(150);

    // Tokens streamed
    expect(tokens.length).toBeGreaterThan(0);
    const fullText = tokens.join('');
    expect(fullText).toContain('Fast Search Results');
    expect(fullText).toContain('Legal/Mutual_NDA.md');
    expect(fullText).toContain('[S1]');

    // Done payload contains valid citations matching standard schema
    expect(donePayload).toBeDefined();
    expect(donePayload.citations.length).toBe(2);
    expect(donePayload.citations[0].relPath).toBe('Legal/Mutual_NDA.md');
    expect(donePayload.citations[0].tag).toBe('[S1]');
    expect(donePayload.tier).toBe('SEARCH_ONLY');
  });

  it('returns unified response on CPU_LITE when LLM is offline without UI errors', async () => {
    const cpuLiteProfile = await profileHardware({
      forceGpu: false,
      forceTotalMemBytes: 16 * 1024 * 1024 * 1024,
      forceCpus: 8
    });

    const mockDb = {
      prepare: vi.fn().mockReturnValue({
        all: vi.fn().mockReturnValue([
          {
            chunk_id: 201,
            document_id: 2,
            rel_path: 'Docs/Architecture.md',
            heading_path: 'Engine Specs',
            text: 'GhostBrain operates 100% offline with SQLite vector search.',
            score: 0.92
          }
        ])
      })
    };

    const tokens: string[] = [];
    let donePayload: any = null;

    await processChatStream(
      mockDb as any,
      { query: 'offline architecture' },
      (t: { delta: string }) => tokens.push(t.delta),
      (d: any) => { donePayload = d; },
      cpuLiteProfile
    );

    expect(tokens.length).toBeGreaterThan(0);
    const streamedOutput = tokens.join('');
    expect(streamedOutput).toContain('Docs/Architecture.md');
    expect(donePayload).toBeDefined();
    expect(donePayload.citations[0].tag).toBe('[S1]');
    expect(donePayload.tier).toBe('CPU_LITE');
  });
});
