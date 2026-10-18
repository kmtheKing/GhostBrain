import React, { useState } from 'react';
import { Settings, X } from 'lucide-react';
import type { NetworkMode } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentMode: NetworkMode;
  currentModel: string;
  onSave: (mode: NetworkMode, model: string) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  currentMode,
  currentModel,
  onSave,
}) => {
  const [selectedMode, setSelectedMode] = useState<NetworkMode>(currentMode);
  const [selectedModel, setSelectedModel] = useState<string>(currentModel);
  const [vectorWeight, setVectorWeight] = useState<number>(70);
  const [sqlCipherActive, setSqlCipherActive] = useState<boolean>(true);

  if (!isOpen) return null;

  const handleApply = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(selectedMode, selectedModel);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs font-mono animate-in fade-in duration-150">
      <div
        className="w-full max-w-xl bg-slate-50 dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col text-slate-800 dark:text-zinc-200"
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-modal-title"
      >
        {/* Modal Header */}
        <div className="px-5 py-3.5 bg-white dark:bg-zinc-900/90 border-b border-slate-200 dark:border-zinc-800 flex items-center justify-between">
          <div className="flex items-center space-x-2 font-bold text-sm">
            <Settings className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
            <span id="settings-modal-title">GhostBrain Workstation Settings</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-slate-200 dark:hover:bg-zinc-800 text-slate-400 hover:text-slate-800 dark:hover:text-zinc-200 text-xs transition cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleApply} className="p-5 space-y-4 text-xs overflow-y-auto max-h-[75vh]">
          {/* Section: Network Paradigm Selection (Key User Request) */}
          <div className="space-y-2">
            <label className="block text-[11px] font-bold text-slate-700 dark:text-zinc-300 uppercase tracking-wide">
              Network Operating Paradigm
            </label>
            <p className="text-[11px] text-slate-500 dark:text-zinc-400">
              Select between encrypted remote mobile sync or strict offline hospital/clinical LAN mode.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 pt-1">
              {/* Option 1: Cloud Relay */}
              <div
                onClick={() => setSelectedMode('cloud-relay')}
                className={`p-3 rounded-xl border transition cursor-pointer ${
                  selectedMode === 'cloud-relay'
                    ? 'border-cyan-500 bg-cyan-50/60 dark:bg-cyan-950/40 ring-1 ring-cyan-500'
                    : 'border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-800/50 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-bold text-slate-900 dark:text-zinc-100 flex items-center space-x-1.5">
                    <span className="w-2 h-2 rounded-full bg-cyan-500"></span>
                    <span>Cloud Relay</span>
                  </span>
                  <span className="text-[9px] px-1.5 py-0.2 bg-cyan-100 dark:bg-cyan-900 text-cyan-800 dark:text-cyan-200 rounded">
                    Cloudflare WSS
                  </span>
                </div>
                <p className="text-[10px] text-slate-600 dark:text-zinc-400 leading-normal">
                  End-to-End encrypted WebSocket relay for remote paired mobile access (Mobile Safari sync enabled).
                </p>
              </div>

              {/* Option 2: AirGap Host */}
              <div
                onClick={() => setSelectedMode('airgap')}
                className={`p-3 rounded-xl border transition cursor-pointer ${
                  selectedMode === 'airgap'
                    ? 'border-emerald-500 bg-emerald-50/60 dark:bg-emerald-950/40 ring-1 ring-emerald-500'
                    : 'border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-800/50 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-bold text-slate-900 dark:text-zinc-100 flex items-center space-x-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    <span>TLS-1.3 AirGap</span>
                  </span>
                  <span className="text-[9px] px-1.5 py-0.2 bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200 rounded">
                    HIPAA Strict
                  </span>
                </div>
                <p className="text-[10px] text-slate-600 dark:text-zinc-400 leading-normal">
                  Physical isolated LAN mode. SQLCipher database encryption with RBAC; zero outbound internet egress.
                </p>
              </div>
            </div>
          </div>

          {/* Section: Local LLM Sidecar */}
          <div className="pt-2 border-t border-slate-200 dark:border-zinc-800 space-y-2">
            <label className="block text-[11px] font-bold text-slate-700 dark:text-zinc-300 uppercase tracking-wide">
              Active Local LLM Sidecar
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { name: 'Gemma-2-2B', quant: 'Q4_K_M', backend: 'llama.cpp' },
                { name: 'Llama-3.2-3B', quant: 'Q4_K_S', backend: 'Ollama' },
                { name: 'Mistral-7B', quant: 'Q4_K_M', backend: 'llama.cpp' },
                { name: 'DeepSeek-R1-7B', quant: 'Q4_K_M', backend: 'llama-server' },
              ].map((model) => (
                <button
                  type="button"
                  key={model.name}
                  onClick={() => setSelectedModel(model.name)}
                  className={`p-2 rounded-lg border text-left transition cursor-pointer ${
                    selectedModel === model.name
                      ? 'border-cyan-500 bg-white dark:bg-zinc-800 text-cyan-800 dark:text-cyan-300 font-bold'
                      : 'border-slate-200 dark:border-zinc-800 bg-slate-100/50 dark:bg-zinc-800/30 text-slate-700 dark:text-zinc-400'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs">
                    <span>{model.name}</span>
                    <span className="text-[9px] text-slate-400 dark:text-zinc-500">{model.backend}</span>
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">{model.quant}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Section: Hybrid Search Tuning */}
          <div className="pt-2 border-t border-slate-200 dark:border-zinc-800 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold text-slate-700 dark:text-zinc-300 uppercase tracking-wide">
                Hybrid Search Weighting
              </label>
              <span className="text-[10px] text-cyan-700 dark:text-cyan-400 font-semibold">
                {vectorWeight}% Vector / {100 - vectorWeight}% BM25
              </span>
            </div>
            <input
              type="range"
              min="20"
              max="90"
              value={vectorWeight}
              onChange={(e) => setVectorWeight(Number(e.target.value))}
              className="w-full accent-cyan-600 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-400 dark:text-zinc-500">
              <span>More Keyword Exact (FTS5)</span>
              <span>More Semantic Intent (sqlite-vec)</span>
            </div>
          </div>

          {/* Section: SQLCipher & Security Invariants */}
          <div className="pt-2 border-t border-slate-200 dark:border-zinc-800 flex items-center justify-between">
            <div>
              <div className="font-bold text-xs text-slate-800 dark:text-zinc-200">
                SQLCipher AES-256 Storage Encryption
              </div>
              <div className="text-[10px] text-slate-500 dark:text-zinc-400">
                Hardware-backed key derivation on local SQLite databases
              </div>
            </div>
            <input
              type="checkbox"
              checked={sqlCipherActive}
              onChange={(e) => setSqlCipherActive(e.target.checked)}
              className="w-4 h-4 rounded text-cyan-600 focus:ring-cyan-500 cursor-pointer accent-cyan-600"
            />
          </div>

          {/* Action Buttons */}
          <div className="pt-3 border-t border-slate-200 dark:border-zinc-800 flex items-center justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-lg border border-slate-300 dark:border-zinc-700 hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-600 dark:text-zinc-300 text-xs transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs shadow-sm transition cursor-pointer"
            >
              Save &amp; Apply Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
