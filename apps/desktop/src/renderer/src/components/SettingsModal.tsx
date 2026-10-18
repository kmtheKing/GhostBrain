import React, { useState, useEffect } from 'react';
import {
  Globe,
  Shield,
  Cpu,
  Search,
  Lock,
  ArrowLeft,
  Check,
  Zap,
  HardDrive,
  Activity,
  Sliders,
  Sparkles,
  Key
} from 'lucide-react';
import type { NetworkMode } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentMode: NetworkMode;
  currentModel: string;
  onSave: (mode: NetworkMode, model: string) => void;
}

type SettingsSection = 'network' | 'llm' | 'search' | 'security' | 'indexing';

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  currentMode,
  currentModel,
  onSave,
}) => {
  const [activeTab, setActiveTab] = useState<SettingsSection>('network');
  const [selectedMode, setSelectedMode] = useState<NetworkMode>(currentMode);
  const [selectedModel, setSelectedModel] = useState(currentModel);
  const [vectorWeight, setVectorWeight] = useState(60); // 60% vector / 40% BM25
  const [sqlCipherActive, setSqlCipherActive] = useState(true);
  const [debounceMs, setDebounceMs] = useState(500);
  const [lowPowerGamingMode, setLowPowerGamingMode] = useState(false);
  const [isSavedToast, setIsSavedToast] = useState(false);

  useEffect(() => {
    setSelectedMode(currentMode);
    setSelectedModel(currentModel);
  }, [currentMode, currentModel]);

  // Handle ESC key to close full-screen settings
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleApply = (e?: React.FormEvent) => {
    e?.preventDefault();
    onSave(selectedMode, selectedModel);
    if (window.ghostbrain?.setPowerMode) {
      window.ghostbrain.setPowerMode(lowPowerGamingMode ? 'low-power' : 'performance');
    }
    setIsSavedToast(true);
    setTimeout(() => {
      setIsSavedToast(false);
      onClose();
    }, 600);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-slate-100 dark:bg-zinc-950 text-slate-800 dark:text-zinc-200 font-mono animate-in fade-in duration-200 select-none overflow-hidden"
      role="dialog"
      aria-modal="true"
    >
      {/* Top Navigation & Action Header */}
      <header className="h-14 bg-white dark:bg-zinc-900 border-b border-slate-200 dark:border-zinc-800 flex items-center justify-between px-6 shrink-0 shadow-xs">
        <div className="flex items-center space-x-4">
          <button
            type="button"
            onClick={onClose}
            className="flex items-center space-x-2 text-xs font-bold text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-100 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-zinc-800 hover:bg-slate-100 dark:hover:bg-zinc-800 transition cursor-pointer"
            title="Return to Main Workstation (Esc)"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Workstation</span>
            <kbd className="text-[10px] bg-slate-200 dark:bg-zinc-800 px-1 py-0.2 rounded text-slate-500 dark:text-zinc-400">Esc</kbd>
          </button>

          <div className="h-5 w-[1px] bg-slate-200 dark:border-zinc-800" />

          <div>
            <h1 className="text-sm font-bold text-slate-900 dark:text-zinc-100 flex items-center space-x-2">
              <Sliders className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
              <span>GhostBrain System &amp; Engine Settings</span>
            </h1>
            <p className="text-[10px] text-slate-500 dark:text-zinc-400">
              Hardware allocation, SQLite storage encryption, hybrid RRF search &amp; network paradigms
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          {isSavedToast && (
            <span className="flex items-center space-x-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-bold animate-in fade-in">
              <Check className="w-4 h-4" />
              <span>Changes Saved!</span>
            </span>
          )}

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-slate-200 dark:border-zinc-800 text-xs font-semibold text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800 transition cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleApply}
            className="px-5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 active:bg-cyan-700 text-white font-bold text-xs shadow-md shadow-cyan-600/20 transition cursor-pointer flex items-center space-x-1.5"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Save &amp; Apply Changes</span>
          </button>
        </div>
      </header>

      {/* Main Full-Screen Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Section Navigation Sidebar */}
        <aside className="w-64 md:w-72 bg-white/70 dark:bg-zinc-900/60 border-r border-slate-200 dark:border-zinc-800 p-4 space-y-1.5 shrink-0 overflow-y-auto">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500 px-3 py-2">
            Configuration Domains
          </div>

          {[
            { id: 'network', label: 'Network & Cloud Relay', icon: Globe, desc: 'WSS tunnel vs AirGap LAN' },
            { id: 'llm', label: 'Local LLM & Hardware', icon: Cpu, desc: 'Model selection & VRAM mode' },
            { id: 'search', label: 'Hybrid RRF Search', icon: Search, desc: 'Vector vs BM25 weights' },
            { id: 'security', label: 'Security & SQLCipher', icon: Lock, desc: 'AES-256 database keys' },
            { id: 'indexing', label: 'File Ingestion & Watcher', icon: HardDrive, desc: 'BLAKE3 & debounce' },
          ].map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                type="button"
                key={item.id}
                onClick={() => setActiveTab(item.id as SettingsSection)}
                className={`w-full flex items-start space-x-3 p-3 rounded-xl text-left transition cursor-pointer ${
                  isActive
                    ? 'bg-cyan-50 dark:bg-cyan-950/40 text-cyan-800 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800/60 shadow-xs'
                    : 'text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800/60 hover:text-slate-900 dark:hover:text-zinc-200 border border-transparent'
                }`}
              >
                <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${isActive ? 'text-cyan-600 dark:text-cyan-400' : 'text-slate-400'}`} />
                <div>
                  <div className="text-xs font-bold leading-tight">{item.label}</div>
                  <div className="text-[10px] text-slate-400 dark:text-zinc-500 mt-0.5">{item.desc}</div>
                </div>
              </button>
            );
          })}

          <div className="pt-6 px-3">
            <div className="p-3 rounded-xl bg-slate-100 dark:bg-zinc-800/50 border border-slate-200 dark:border-zinc-800 text-[10px] space-y-1">
              <div className="font-bold text-slate-700 dark:text-zinc-300 flex items-center space-x-1">
                <Sparkles className="w-3 h-3 text-cyan-500" />
                <span>GhostBrain v0.0.1</span>
              </div>
              <p className="text-slate-500 dark:text-zinc-400 leading-normal">
                100% Offline-first local hybrid RAG engine. Zero telemetry.
              </p>
            </div>
          </div>
        </aside>

        {/* Right Settings Detail Workspace */}
        <main className="flex-1 p-6 md:p-10 overflow-y-auto bg-slate-50 dark:bg-zinc-950">
          <div className="max-w-3xl space-y-8">
            {/* 1. NETWORK & CLOUD RELAY */}
            {activeTab === 'network' && (
              <section className="space-y-6 animate-in fade-in">
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-zinc-100">
                    Network Operating Paradigm
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
                    Select between zero-knowledge remote mobile sync and strict air-gapped hospital/clinic LAN host mode.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Cloud Relay Option */}
                  <div
                    onClick={() => setSelectedMode('cloud-relay')}
                    className={`p-5 rounded-2xl border transition-all cursor-pointer ${
                      selectedMode === 'cloud-relay'
                        ? 'border-cyan-500 bg-white dark:bg-zinc-900 ring-2 ring-cyan-500/20 shadow-md'
                        : 'border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-cyan-500" />
                        <span className="font-bold text-sm text-slate-900 dark:text-zinc-100">Cloud Relay Mode</span>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-100 dark:bg-cyan-900/60 text-cyan-800 dark:text-cyan-300 font-semibold border border-cyan-200 dark:border-cyan-700">
                        Cloudflare WSS
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-zinc-400 leading-relaxed">
                      End-to-End encrypted tunnel using X25519 + HKDF-SHA256 + AES-256-GCM. Cloud servers only see encrypted ciphertext; your keys never leave this workstation.
                    </p>
                    <div className="mt-4 pt-3 border-t border-slate-100 dark:border-zinc-800/80 flex items-center justify-between text-[11px] text-slate-500">
                      <span>Paired Web Clients:</span>
                      <span className="text-cyan-600 dark:text-cyan-400 font-semibold">Mobile Safari (Active)</span>
                    </div>
                  </div>

                  {/* TLS-1.3 AirGap Option */}
                  <div
                    onClick={() => setSelectedMode('airgap')}
                    className={`p-5 rounded-2xl border transition-all cursor-pointer ${
                      selectedMode === 'airgap'
                        ? 'border-emerald-500 bg-white dark:bg-zinc-900 ring-2 ring-emerald-500/20 shadow-md'
                        : 'border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                        <span className="font-bold text-sm text-slate-900 dark:text-zinc-100">TLS-1.3 AirGap Host</span>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 font-semibold border border-emerald-200 dark:border-emerald-700">
                        HIPAA Strict
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-zinc-400 leading-relaxed">
                      Physically isolated local area network server. Strict role-based access control (RBAC), hash-chained immutable audit log, and zero outbound public internet egress.
                    </p>
                    <div className="mt-4 pt-3 border-t border-slate-100 dark:border-zinc-800/80 flex items-center justify-between text-[11px] text-slate-500">
                      <span>Local CA &amp; Port:</span>
                      <span className="text-emerald-600 dark:text-emerald-400 font-semibold">https://localhost:8443</span>
                    </div>
                  </div>
                </div>
              </section>
            )}

            {/* 2. LOCAL LLM & HARDWARE */}
            {activeTab === 'llm' && (
              <section className="space-y-6 animate-in fade-in">
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-zinc-100">
                    Active Local LLM Sidecar &amp; VRAM Modes
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
                    Select your hardware execution model and toggle gaming/low-power memory release.
                  </p>
                </div>

                {/* Model Selection Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {[
                    { name: 'Gemma-2-2B', quant: 'Q4_K_M', backend: 'llama.cpp', context: '8,192 tokens', desc: 'Fast, lightweight local extraction model.' },
                    { name: 'Llama-3.2-3B', quant: 'Q4_K_S', backend: 'Ollama', context: '8,192 tokens', desc: 'Superior reasoning and structured output.' },
                    { name: 'Mistral-7B', quant: 'Q4_K_M', backend: 'llama.cpp', context: '16,384 tokens', desc: 'High context window for long research papers.' },
                    { name: 'DeepSeek-R1-7B', quant: 'Q4_K_M', backend: 'llama-server', context: '16,384 tokens', desc: 'Chain-of-thought mathematical reasoning.' },
                  ].map((m) => {
                    const isSelected = selectedModel === m.name;
                    return (
                      <div
                        key={m.name}
                        onClick={() => setSelectedModel(m.name)}
                        className={`p-4 rounded-xl border transition cursor-pointer ${
                          isSelected
                            ? 'border-cyan-500 bg-white dark:bg-zinc-900 ring-1 ring-cyan-500 shadow-xs'
                            : 'border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold text-xs text-slate-900 dark:text-zinc-100">{m.name}</span>
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-zinc-400 border border-slate-200 dark:border-zinc-700">
                            {m.backend}
                          </span>
                        </div>
                        <div className="text-[10px] text-cyan-600 dark:text-cyan-400 font-semibold mb-1">
                          {m.quant} • {m.context}
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-zinc-400 leading-normal">
                          {m.desc}
                        </p>
                      </div>
                    );
                  })}
                </div>

                {/* Low-Power & Gaming Mode Toggle */}
                <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 flex items-center justify-between">
                  <div className="space-y-1 pr-6">
                    <div className="flex items-center space-x-2">
                      <Zap className="w-4 h-4 text-amber-500" />
                      <span className="font-bold text-xs text-slate-900 dark:text-zinc-100">
                        Low-Power &amp; Gaming VRAM Release (<span className="text-amber-500">&lt; 3s Release</span>)
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-zinc-400 leading-relaxed">
                      Automatically ejects local LLM weights from dedicated GPU VRAM into host RAM when launching games or entering battery-saver mode.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={lowPowerGamingMode}
                    onChange={(e) => setLowPowerGamingMode(e.target.checked)}
                    className="w-5 h-5 rounded text-cyan-600 accent-cyan-600 cursor-pointer shrink-0"
                  />
                </div>
              </section>
            )}

            {/* 3. HYBRID RRF SEARCH TUNING */}
            {activeTab === 'search' && (
              <section className="space-y-6 animate-in fade-in">
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-zinc-100">
                    Reciprocal Rank Fusion (RRF) Hybrid Search Weights
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
                    Balance semantic dense vector cosine distance with keyword-exact SQLite FTS5 BM25 scoring.
                  </p>
                </div>

                <div className="p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 space-y-6">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                      RRF Blending Balance:
                    </span>
                    <span className="text-xs font-bold text-cyan-600 dark:text-cyan-400 font-mono bg-cyan-50 dark:bg-cyan-950/60 px-3 py-1 rounded-lg border border-cyan-200 dark:border-cyan-800">
                      {vectorWeight}% Dense Vector (sqlite-vec) / {100 - vectorWeight}% BM25 (FTS5)
                    </span>
                  </div>

                  <input
                    type="range"
                    min="10"
                    max="90"
                    value={vectorWeight}
                    onChange={(e) => setVectorWeight(Number(e.target.value))}
                    className="w-full accent-cyan-600 cursor-pointer h-2 bg-slate-100 dark:bg-zinc-800 rounded-lg"
                  />

                  <div className="grid grid-cols-2 gap-4 text-xs pt-2">
                    <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-zinc-800/40 border border-slate-200 dark:border-zinc-800">
                      <div className="font-bold text-slate-800 dark:text-zinc-200 mb-1">SQLite FTS5 (BM25)</div>
                      <p className="text-[11px] text-slate-500 dark:text-zinc-400 leading-normal">
                        Dominates for precise serial numbers, SQL table names, code identifiers, and exact file names.
                      </p>
                    </div>

                    <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-zinc-800/40 border border-slate-200 dark:border-zinc-800">
                      <div className="font-bold text-slate-800 dark:text-zinc-200 mb-1">sqlite-vec (Cosine)</div>
                      <p className="text-[11px] text-slate-500 dark:text-zinc-400 leading-normal">
                        Dominates for conceptual meaning, semantic paraphrasing, and cross-lingual thematic queries.
                      </p>
                    </div>
                  </div>
                </div>
              </section>
            )}

            {/* 4. SECURITY & SQLCIPHER */}
            {activeTab === 'security' && (
              <section className="space-y-6 animate-in fade-in">
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-zinc-100">
                    Security, Encryption &amp; Cryptographic Keys
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
                    Manage hardware-backed key derivation and local database encryption.
                  </p>
                </div>

                <div className="p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-bold text-xs text-slate-900 dark:text-zinc-100">
                        SQLCipher AES-256-CBC Database Encryption
                      </div>
                      <div className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                        Encrypts local vector tables, chunk payloads, and document manifests using Argon2id key derivation.
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={sqlCipherActive}
                      onChange={(e) => setSqlCipherActive(e.target.checked)}
                      className="w-5 h-5 rounded text-cyan-600 accent-cyan-600 cursor-pointer"
                    />
                  </div>

                  <div className="pt-4 border-t border-slate-100 dark:border-zinc-800/80 flex items-center justify-between text-xs font-mono">
                    <span className="text-slate-500">Device Identity Key:</span>
                    <span className="text-cyan-600 dark:text-cyan-400 font-bold flex items-center space-x-1">
                      <Key className="w-3.5 h-3.5" />
                      <span>ed25519:7f84...2e91</span>
                    </span>
                  </div>
                </div>
              </section>
            )}

            {/* 5. INGESTION & WATCHER */}
            {activeTab === 'indexing' && (
              <section className="space-y-6 animate-in fade-in">
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-zinc-100">
                    File Ingestion Pipeline &amp; Debounce Engine
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
                    Control file watcher sensitivity and BLAKE3 incremental hashing parameters.
                  </p>
                </div>

                <div className="p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-bold text-xs text-slate-900 dark:text-zinc-100">
                        File Write Stability Debounce Timer
                      </div>
                      <div className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                        Prevents indexing partial writes during active editor saving.
                      </div>
                    </div>
                    <span className="text-xs font-bold text-cyan-600 dark:text-cyan-400 bg-slate-100 dark:bg-zinc-800 px-2 py-1 rounded">
                      {debounceMs} ms
                    </span>
                  </div>

                  <input
                    type="range"
                    min="200"
                    max="2000"
                    step="100"
                    value={debounceMs}
                    onChange={(e) => setDebounceMs(Number(e.target.value))}
                    className="w-full accent-cyan-600 cursor-pointer"
                  />
                </div>
              </section>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};
