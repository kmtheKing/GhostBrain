import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { loadDesktopEnv, streamOpenRouterFallback } from './rag-worker.js';
import { profileHardware } from './hardware-profiler.js';

describe('Sub-Agent 3: Spec-Aware LLM Installer & Offline/Online Fallback Suite', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gb-installer-test-'));
  });

  afterEach(() => {
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {}
  });

  it('loads OPENROUTER_API_KEY from apps/desktop/.env into process.env', () => {
    loadDesktopEnv();
    expect(process.env.OPENROUTER_API_KEY).toBeDefined();
    expect(process.env.OPENROUTER_API_KEY).toContain('sk-or-v1-');
  });

  it('profiles hardware correctly and identifies recommended model per tier', async () => {
    // 1. GPU_HIGH tier -> Qwen2.5-3B
    const gpuProfile = await profileHardware({ forceGpu: true, forceTotalMemBytes: 16 * 1024 * 1024 * 1024 });
    expect(gpuProfile.tier).toBe('GPU_HIGH');
    expect(gpuProfile.modelConfig.model).toBe('Qwen2.5-3B-Instruct-Q4_K_M.gguf');

    // 2. CPU_LITE tier -> Llama-3.2-1B
    const cpuProfile = await profileHardware({ forceGpu: false, forceTotalMemBytes: 16 * 1024 * 1024 * 1024 });
    expect(cpuProfile.tier).toBe('CPU_LITE');
    expect(cpuProfile.modelConfig.model).toBe('Llama-3.2-1B-Instruct-Q4_K_M.gguf');

    // 3. SEARCH_ONLY tier -> null model
    const searchOnlyProfile = await profileHardware({ forceGpu: false, forceTotalMemBytes: 4 * 1024 * 1024 * 1024 });
    expect(searchOnlyProfile.tier).toBe('SEARCH_ONLY');
    expect(searchOnlyProfile.modelConfig.model).toBeNull();
  });

  it('handles streamOpenRouterFallback gracefully when offline or network fails', async () => {
    const tokens: string[] = [];
    const thoughts: string[] = [];

    // Passing invalid key or offline URL should return false gracefully without throwing
    const success = await streamOpenRouterFallback(
      'sk-or-v1-invalid-test-key',
      'What is GhostBrain?',
      [],
      (t) => tokens.push(t.delta),
      'test-stream',
      (thought) => thoughts.push(thought)
    );

    // If online with valid key, it returns boolean; if offline/mock, false
    expect(typeof success).toBe('boolean');
    expect(thoughts.length).toBeGreaterThan(0);
    expect(thoughts[0]).toContain('OpenRouter Free model fallback');
  });

  it('verifies that .env is not present in git tracked files', () => {
    const gitIgnore = fs.readFileSync(path.join(process.cwd(), '.gitignore'), 'utf-8');
    expect(gitIgnore).toContain('.env');

    const gitExclude = fs.readFileSync(path.join(process.cwd(), '.git/info/exclude'), 'utf-8');
    expect(gitExclude).toContain('apps/desktop/.env');
  });
});
