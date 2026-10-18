import React from 'react';
import { Folder, Activity, Link2 } from 'lucide-react';
import type { WatchedDirectory, TelemetryState, PairedClient } from '../types';

interface LeftSidebarProps {
  directories: WatchedDirectory[];
  telemetry: TelemetryState;
  pairedClients: PairedClient[];
  onAddDirectoryClick: () => void;
  onDirectoryClick?: (directory: WatchedDirectory) => void;
}

export const LeftSidebar: React.FC<LeftSidebarProps> = ({
  directories,
  telemetry,
  pairedClients,
  onAddDirectoryClick,
  onDirectoryClick,
}) => {
  const vramPercent = Math.min(100, Math.round((telemetry.vramAllocatedGB / telemetry.vramTotalGB) * 100));

  return (
    <aside
      className="w-full md:w-80 lg:w-88 flex flex-col bg-slate-50/80 dark:bg-zinc-950/60 overflow-y-auto transition-colors duration-200 border-r border-slate-200 dark:border-zinc-800 shrink-0"
      data-purpose="left-sidebar"
    >
      {/* Section 1: Watched Directories */}
      <section className="p-3.5 border-b border-slate-200 dark:border-zinc-800" data-purpose="watched-directories-section">
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center space-x-1.5 text-slate-800 dark:text-zinc-200 font-bold uppercase tracking-wider text-xs font-mono">
            <Folder className="w-3.5 h-3.5 text-amber-500" />
            <span>Watched Directories</span>
          </div>
          <span className="text-[10px] text-slate-500 dark:text-zinc-400 font-mono">Auto-Sync</span>
        </div>

        {/* Directory Cards */}
        <div className="space-y-2 mb-2.5">
          {directories.map((dir) => (
            <div
              key={dir.id}
              onClick={() => onDirectoryClick?.(dir)}
              className="group p-2.5 rounded-lg border border-slate-200/90 dark:border-zinc-800 hover:border-cyan-500/60 bg-white dark:bg-zinc-900/60 shadow-xs hover:shadow-sm transition cursor-pointer relative"
              data-purpose={`vault-card-${dir.id}`}
              title={`Click to inspect ${dir.path}`}
            >
              <div className="flex items-center justify-between font-mono font-semibold text-xs text-slate-800 dark:text-zinc-200">
                <span className="truncate pr-2">{dir.path}</span>
                {dir.status === 'Sync' ? (
                  <span className="flex items-center space-x-1 text-[10px] text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/50 px-1.5 py-0.5 rounded font-medium shrink-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse"></span>
                    <span>Sync</span>
                  </span>
                ) : dir.status === 'Live' ? (
                  <span className="text-[10px] text-cyan-700 dark:text-cyan-400 font-mono bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-200 dark:border-cyan-800/50 px-1.5 py-0.5 rounded font-medium shrink-0">
                    Live
                  </span>
                ) : (
                  <span className="text-[10px] text-slate-600 dark:text-zinc-400 font-mono bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 px-1.5 py-0.5 rounded font-medium shrink-0">
                    {dir.status}
                  </span>
                )}
              </div>
              <div className="mt-1 text-[11px] text-slate-500 dark:text-zinc-400 font-mono">
                <span>{dir.chunks.toLocaleString()} chunks</span>
              </div>
            </div>
          ))}
        </div>

        {/* Add Directory Action Button */}
        <button
          type="button"
          onClick={onAddDirectoryClick}
          className="w-full py-1.5 px-3 rounded-lg border border-dashed border-slate-300 dark:border-zinc-700 hover:border-cyan-500 hover:bg-white dark:hover:bg-zinc-900 text-slate-600 dark:text-zinc-400 hover:text-cyan-600 dark:hover:text-cyan-300 transition text-xs flex items-center justify-center space-x-1 font-mono bg-slate-100/50 dark:bg-transparent cursor-pointer"
          data-purpose="add-directory-button"
        >
          <span>[+ Add Directory]</span>
        </button>
      </section>

      {/* Section 2: System Telemetry */}
      <section className="p-3.5 border-b border-slate-200 dark:border-zinc-800 flex-1" data-purpose="system-telemetry-section">
        <div className="flex items-center space-x-1.5 text-slate-800 dark:text-zinc-200 font-bold uppercase tracking-wider text-xs mb-3 font-mono">
          <Activity className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
          <span>System Telemetry</span>
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs font-mono">
          {/* CPU Gauge */}
          <div className="p-2.5 rounded-lg bg-white dark:bg-zinc-900/80 border border-slate-200 dark:border-zinc-800/90 shadow-xs">
            <div className="text-slate-500 dark:text-zinc-400 text-[10px] font-semibold">CPU LOAD</div>
            <div className="text-sm font-bold text-emerald-600 dark:text-emerald-400 flex items-baseline justify-between mt-0.5">
              <span>{telemetry.cpuLoad}%</span>
              <span className="text-[9px] text-slate-400 dark:text-zinc-500 font-normal">{telemetry.cpuCores} Cores</span>
            </div>
            <div className="w-full bg-slate-100 dark:bg-zinc-800 h-1.5 rounded mt-1.5 overflow-hidden">
              <div
                className="bg-emerald-500 dark:bg-emerald-400 h-full rounded transition-all duration-500"
                style={{ width: `${Math.min(100, telemetry.cpuLoad)}%` }}
              ></div>
            </div>
          </div>

          {/* RAM Gauge */}
          <div className="p-2.5 rounded-lg bg-white dark:bg-zinc-900/80 border border-slate-200 dark:border-zinc-800/90 shadow-xs">
            <div className="text-slate-500 dark:text-zinc-400 text-[10px] font-semibold">HOST RAM</div>
            <div className="text-sm font-bold text-slate-800 dark:text-zinc-200 flex items-baseline justify-between mt-0.5">
              <span>{telemetry.hostRamMB}MB</span>
              <span className="text-[9px] text-slate-400 dark:text-zinc-500 font-normal">{telemetry.hostRamEngine}</span>
            </div>
            <div className="w-full bg-slate-100 dark:bg-zinc-800 h-1.5 rounded mt-1.5 overflow-hidden">
              <div
                className="bg-cyan-500 dark:bg-cyan-400 h-full rounded transition-all duration-500"
                style={{ width: `${Math.min(100, Math.round((telemetry.hostRamMB / 1024) * 100))}%` }}
              ></div>
            </div>
          </div>

          {/* VRAM Gauge */}
          <div className="col-span-2 p-2.5 rounded-lg bg-white dark:bg-zinc-900/80 border border-slate-200 dark:border-zinc-800/90 shadow-xs">
            <div className="flex justify-between items-center text-[10px] text-slate-500 dark:text-zinc-400 font-semibold">
              <span>VRAM ALLOCATION</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-medium">{telemetry.vramEngine}</span>
            </div>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-sm font-bold text-slate-900 dark:text-zinc-100">{telemetry.vramAllocatedGB} GB</span>
              <span className="text-[10px] text-slate-400 dark:text-zinc-400 font-medium">
                / {telemetry.vramTotalGB.toFixed(1)} GB Unified
              </span>
            </div>
            <div className="w-full bg-slate-100 dark:bg-zinc-800 h-1.5 rounded mt-1.5 overflow-hidden">
              <div
                className="bg-cyan-600 dark:bg-cyan-500 h-full rounded transition-all duration-500"
                style={{ width: `${vramPercent}%` }}
              ></div>
            </div>
          </div>

          {/* Local LLM Spec */}
          <div className="col-span-2 p-2.5 rounded-lg bg-white dark:bg-zinc-900/80 border border-slate-200 dark:border-zinc-800/90 shadow-xs">
            <div className="text-[10px] text-slate-500 dark:text-zinc-400 font-bold uppercase tracking-wide">
              ACTIVE LOCAL LLM
            </div>
            <div className="mt-1 flex items-center justify-between">
              <span className="text-xs font-bold text-cyan-700 dark:text-cyan-300 font-mono">
                {telemetry.activeModel} ({telemetry.modelQuant})
              </span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 border border-slate-200 dark:border-zinc-700">
                {telemetry.backend}
              </span>
            </div>
            <div className="mt-1.5 text-[10px] text-slate-500 dark:text-zinc-400 flex items-center space-x-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400"></span>
              <span>
                Context: {telemetry.contextTokens.toLocaleString()} tokens | KV-Cache: {telemetry.kvCacheMB}MB
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Section 3: Paired Web Clients */}
      <section className="p-3.5 bg-slate-50 dark:bg-zinc-950 transition-colors duration-200" data-purpose="paired-clients-section">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-1.5 text-slate-800 dark:text-zinc-200 font-bold uppercase tracking-wider text-xs font-mono">
            <Link2 className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
            <span>Paired Web Clients</span>
          </div>
          <span className="text-[10px] text-slate-500 dark:text-zinc-400 font-mono">P2P Encrypted</span>
        </div>

        <div className="space-y-1.5">
          {pairedClients.map((client) => (
            <div
              key={client.id}
              className="p-2 rounded-lg bg-white dark:bg-zinc-900/60 border border-slate-200 dark:border-zinc-800 flex items-center justify-between shadow-xs font-mono"
              data-purpose="client-item"
            >
              <div className="flex items-center space-x-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span className="text-xs text-slate-700 dark:text-zinc-300 font-medium">{client.name}</span>
              </div>
              <span className="text-[10px] text-slate-400 dark:text-zinc-500">IP: {client.ip}</span>
            </div>
          ))}
        </div>
      </section>
    </aside>
  );
};
