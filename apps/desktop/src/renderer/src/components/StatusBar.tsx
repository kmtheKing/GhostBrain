import React from 'react';

interface StatusBarProps {
  totalChunks?: number;
  vectorModel?: string;
  latencyMs?: number;
  hardwareTier?: string;
  hostRamUsedMB?: number;
  hostRamTotalMB?: number;
}

export const StatusBar: React.FC<StatusBarProps> = ({
  totalChunks = 0,
  latencyMs = 0,
  hardwareTier = 'GPU_HIGH',
  hostRamUsedMB = 5800,
  hostRamTotalMB = 16384,
}) => {
  const ramUsedGB = (hostRamUsedMB / 1024).toFixed(1);
  const ramTotalGB = (hostRamTotalMB / 1024).toFixed(0);

  return (
    <footer
      className="w-full h-6 bg-white dark:bg-zinc-900/90 border-t border-slate-200 dark:border-zinc-800 flex items-center justify-between px-3 text-[10px] font-mono text-slate-500 dark:text-zinc-400 shrink-0 transition-colors duration-200 select-none"
      data-purpose="electron-statusbar"
    >
      <div className="flex items-center space-x-3">
        <span className="flex items-center space-x-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
          <span className="font-medium text-slate-700 dark:text-zinc-300">
            Vault Index: {totalChunks.toLocaleString()} Chunks
          </span>
        </span>
        <span className="text-slate-300 dark:text-zinc-700">|</span>
        <span>256-dim Matryoshka BLOB + FTS5</span>
        <span className="text-slate-300 dark:text-zinc-700">|</span>
        <span className="px-1.5 py-0.5 rounded bg-cyan-50 dark:bg-cyan-950/40 text-cyan-700 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800/50 font-bold">
          [{hardwareTier}]
        </span>
        <span className="text-slate-400 dark:text-zinc-500">RAM: {ramUsedGB}GB / {ramTotalGB}GB</span>
      </div>

      <div className="flex items-center space-x-2">
        <span className="text-slate-400 dark:text-zinc-500">Query Latency:</span>
        <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
          {latencyMs > 0 ? `${latencyMs}ms` : '<50ms'}
        </span>
        <span className="text-slate-300 dark:text-zinc-700">|</span>
        <span>AES-256 SQLCipher</span>
      </div>
    </footer>
  );
};
