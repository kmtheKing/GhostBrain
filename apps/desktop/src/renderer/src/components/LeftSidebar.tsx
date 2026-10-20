import React from 'react';
import { Folder, Activity, Link2, Plus, AlertCircle, CheckCircle2 } from 'lucide-react';
import type { WatchedDirectory, TelemetryState, PairedClient } from '../types';

interface LeftSidebarProps {
  directories: WatchedDirectory[];
  telemetry: TelemetryState;
  pairedClients: PairedClient[];
  onAddDirectoryClick: () => void;
  onDirectoryClick?: (directory: WatchedDirectory) => void;
  onOpenSettings?: () => void;
}

export const LeftSidebar: React.FC<LeftSidebarProps> = ({
  directories,
  telemetry,
  pairedClients,
  onAddDirectoryClick,
  onDirectoryClick,
  onOpenSettings,
}) => {
  const hostTotalGB = (telemetry.hostTotalRamMB ? telemetry.hostTotalRamMB / 1024 : 16.0);
  const hostUsedGB = (telemetry.hostUsedRamMB ? telemetry.hostUsedRamMB / 1024 : 5.8);
  const hostRamPercent = Math.min(100, Math.round((hostUsedGB / hostTotalGB) * 100));

  return (
    <aside
      className="w-full md:w-80 lg:w-84 flex flex-col bg-slate-50/90 dark:bg-zinc-950/70 overflow-y-auto transition-colors duration-200 border-r border-slate-200 dark:border-zinc-800 shrink-0 select-none"
      data-purpose="left-sidebar"
    >
      {/* Section 1: Watched Directories */}
      <section className="p-3.5 border-b border-slate-200 dark:border-zinc-800" data-purpose="watched-directories-section">
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center space-x-1.5 text-slate-800 dark:text-zinc-200 font-bold uppercase tracking-wider text-xs font-mono">
            <Folder className="w-3.5 h-3.5 text-amber-500" />
            <span>Watched Directories</span>
          </div>
          <span className="text-[10px] text-slate-500 dark:text-zinc-400 font-mono">
            {directories.length} {directories.length === 1 ? 'Folder' : 'Folders'}
          </span>
        </div>

        {/* Directory Cards or Empty State */}
        <div className="space-y-2 mb-2.5">
          {directories.length === 0 ? (
            <div className="p-3 rounded-xl border border-dashed border-slate-300 dark:border-zinc-800 bg-white/50 dark:bg-zinc-900/40 text-center">
              <p className="text-[11px] text-slate-500 dark:text-zinc-400 font-mono leading-relaxed">
                No directories indexed yet.
              </p>
              <p className="text-[10px] text-slate-400 dark:text-zinc-500 mt-1">
                Add local folders from your disk to enable hybrid search with citations.
              </p>
            </div>
          ) : (
            directories.map((dir) => (
              <div
                key={dir.id}
                onClick={() => onDirectoryClick?.(dir)}
                className="group p-2.5 rounded-lg border border-slate-200/90 dark:border-zinc-800 hover:border-cyan-500/60 bg-white dark:bg-zinc-900/60 shadow-xs hover:shadow-sm transition cursor-pointer relative"
                data-purpose={`vault-card-${dir.id}`}
                title={`Click to filter search to ${dir.path}`}
              >
                <div className="flex items-center justify-between font-mono font-semibold text-xs text-slate-800 dark:text-zinc-200">
                  <span className="truncate pr-2">{dir.path}</span>
                  {dir.status === 'Live' ? (
                    <span className="flex items-center space-x-1 text-[10px] text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/50 px-1.5 py-0.5 rounded font-medium shrink-0">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                      <span>Live</span>
                    </span>
                  ) : (
                    <span className="text-[10px] text-slate-600 dark:text-zinc-400 font-mono bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 px-1.5 py-0.5 rounded font-medium shrink-0">
                      {dir.status}
                    </span>
                  )}
                </div>
                <div className="mt-1 text-[11px] text-slate-500 dark:text-zinc-400 font-mono flex items-center justify-between">
                  <span>{dir.chunks.toLocaleString()} chunks indexed</span>
                  <span className="text-[10px] text-slate-400">{dir.engine}</span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Add Directory Action Button */}
        <button
          type="button"
          onClick={onAddDirectoryClick}
          className="w-full py-1.5 px-3 rounded-lg border border-dashed border-slate-300 dark:border-zinc-700 hover:border-cyan-500 hover:bg-white dark:hover:bg-zinc-900 text-slate-600 dark:text-zinc-400 hover:text-cyan-600 dark:hover:text-cyan-300 transition text-xs flex items-center justify-center space-x-1.5 font-mono bg-slate-100/50 dark:bg-transparent cursor-pointer"
          data-purpose="add-directory-button"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>[+ Add Directory]</span>
        </button>
      </section>

      {/* Section 2: Real System Telemetry */}
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
                style={{ width: `${Math.min(100, Math.max(3, telemetry.cpuLoad))}%` }}
              ></div>
            </div>
            <div className="text-[9px] text-slate-400 dark:text-zinc-500 truncate mt-1" title={telemetry.cpuModel}>
              {telemetry.cpuModel?.split(' ')[0] || 'Host CPU'}
            </div>
          </div>

          {/* Real Host RAM Gauge */}
          <div className="p-2.5 rounded-lg bg-white dark:bg-zinc-900/80 border border-slate-200 dark:border-zinc-800/90 shadow-xs">
            <div className="text-slate-500 dark:text-zinc-400 text-[10px] font-semibold">HOST RAM</div>
            <div className="text-sm font-bold text-slate-800 dark:text-zinc-200 flex items-baseline justify-between mt-0.5">
              <span>{hostUsedGB.toFixed(1)}GB</span>
              <span className="text-[9px] text-slate-400 dark:text-zinc-500 font-normal">/ {hostTotalGB.toFixed(0)}GB</span>
            </div>
            <div className="w-full bg-slate-100 dark:bg-zinc-800 h-1.5 rounded mt-1.5 overflow-hidden">
              <div
                className="bg-cyan-500 dark:bg-cyan-400 h-full rounded transition-all duration-500"
                style={{ width: `${hostRamPercent}%` }}
              ></div>
            </div>
            <div className="text-[9px] text-slate-400 dark:text-zinc-500 mt-1 flex justify-between">
              <span>App RSS:</span>
              <strong className="text-slate-600 dark:text-zinc-300">{telemetry.hostRamMB}MB</strong>
            </div>
          </div>

          {/* ACTIVE LOCAL LLM STATUS CARD (Real Active vs Offline State) */}
          <div
            onClick={onOpenSettings}
            className={`col-span-2 p-2.5 rounded-lg bg-white dark:bg-zinc-900/80 border transition-all ${
              telemetry.isModelOnline
                ? 'border-slate-200 dark:border-zinc-800/90 shadow-xs'
                : 'border-amber-200/80 dark:border-amber-900/40 hover:border-amber-400 dark:hover:border-amber-700 cursor-pointer shadow-xs hover:shadow-sm'
            }`}
          >
            <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wide">
              <span className="text-slate-500 dark:text-zinc-400 font-mono">ACTIVE LOCAL AI</span>
              {telemetry.isModelOnline ? (
                <span className="flex items-center space-x-1 text-emerald-600 dark:text-emerald-400 font-semibold bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-0.2 rounded border border-emerald-200 dark:border-emerald-800">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span>ONLINE</span>
                </span>
              ) : (
                <span className="flex items-center space-x-1 text-amber-600 dark:text-amber-400 font-semibold bg-amber-50 dark:bg-amber-950/60 px-1.5 py-0.2 rounded border border-amber-200 dark:border-amber-800">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                  <span>OFFLINE</span>
                </span>
              )}
            </div>

            {telemetry.isModelOnline ? (
              <div className="mt-1.5 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-cyan-700 dark:text-cyan-300 font-mono">
                    {telemetry.activeModel}
                  </span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 border border-slate-200 dark:border-zinc-700 font-mono">
                    {telemetry.backend}
                  </span>
                </div>
                <div className="text-[10px] text-slate-500 dark:text-zinc-400 flex items-center space-x-1.5">
                  <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                  <span>Ready for cited local streaming</span>
                </div>
              </div>
            ) : (
              <div className="mt-1.5 space-y-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-1.5 text-xs text-slate-700 dark:text-zinc-300 font-mono font-medium">
                    <AlertCircle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    <span>No Local Model Active</span>
                  </div>
                  <span className="text-[9px] text-amber-600 dark:text-amber-400 font-mono font-semibold underline">
                    Setup &rarr;
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 dark:text-zinc-500 leading-normal">
                  Click to select an integrated AI performance tier in Settings.
                </p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Section 3: Paired Web Clients */}
      <section className="p-3.5 bg-slate-50/70 dark:bg-zinc-950 transition-colors duration-200" data-purpose="paired-clients-section">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-1.5 text-slate-800 dark:text-zinc-200 font-bold uppercase tracking-wider text-xs font-mono">
            <Link2 className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
            <span>Paired Web Clients</span>
          </div>
          <span className="text-[10px] text-slate-500 dark:text-zinc-400 font-mono">P2P Relay</span>
        </div>

        <div className="space-y-1.5">
          {pairedClients.length === 0 ? (
            <div className="p-2.5 rounded-lg border border-slate-200/80 dark:border-zinc-800 bg-white/60 dark:bg-zinc-900/40 text-[11px] text-slate-400 dark:text-zinc-500">
              <span>No mobile clients paired.</span>
            </div>
          ) : (
            pairedClients.map((client) => (
              <div
                key={client.id}
                className="p-2 rounded-lg bg-white dark:bg-zinc-900/60 border border-slate-200 dark:border-zinc-800 flex items-center justify-between shadow-xs font-mono"
                data-purpose="client-item"
              >
                <div className="flex items-center space-x-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  <span className="text-xs text-slate-700 dark:text-zinc-300 font-medium">{client.name}</span>
                </div>
                <span className="text-[10px] text-slate-400 dark:text-zinc-500">{client.ip}</span>
              </div>
            ))
          )}
        </div>
      </section>
    </aside>
  );
};
