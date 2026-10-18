import React from 'react';

interface StatusBarProps {
  totalChunks?: number;
  vectorModel?: string;
  latencyMs?: number;
}

export const StatusBar: React.FC<StatusBarProps> = ({
  totalChunks = 1546,
  vectorModel = 'all-MiniLM-L6-v2',
  latencyMs = 12,
}) => {
  return (
    <footer
      className="h-6 bg-white dark:bg-zinc-900/90 border-t border-slate-200 dark:border-zinc-800 flex items-center justify-between px-3 text-[10px] font-mono text-slate-500 dark:text-zinc-400 shrink-0 transition-colors duration-200"
      data-purpose="electron-statusbar"
    >
      <div className="flex items-center space-x-3">
        <span className="flex items-center space-x-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400"></span>
          <span className="font-medium text-slate-700 dark:text-zinc-300">
            Indexed: {totalChunks.toLocaleString()} Chunks
          </span>
        </span>
        <span>|</span>
        <span>Vector Dim: 384 ({vectorModel})</span>
      </div>

      <div className="flex items-center space-x-2">
        <span className="text-slate-400 dark:text-zinc-500">Latency:</span>
        <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{latencyMs}ms</span>
        <span className="text-slate-300 dark:text-zinc-600">|</span>
        <span>UTF-8</span>
      </div>
    </footer>
  );
};
