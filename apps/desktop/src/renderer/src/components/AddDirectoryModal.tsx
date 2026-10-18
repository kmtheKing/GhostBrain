import React, { useState } from 'react';
import { Folder, X } from 'lucide-react';
import type { WatchedDirectory } from '../types';

interface AddDirectoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (dir: Omit<WatchedDirectory, 'id'>) => void;
}

export const AddDirectoryModal: React.FC<AddDirectoryModalProps> = ({ isOpen, onClose, onAdd }) => {
  const [path, setPath] = useState('~/Code/GhostBrain-Sidecar');
  const [engine, setEngine] = useState('FTS5 + Vec');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!path.trim()) return;

    onAdd({
      path: path.trim(),
      status: 'Sync',
      chunks: Math.floor(Math.random() * 800) + 120,
      engine,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs font-mono animate-in fade-in duration-150">
      <div
        className="w-full max-w-md bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col text-slate-800 dark:text-zinc-200"
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-dir-title"
      >
        <div className="px-5 py-3.5 bg-slate-50 dark:bg-zinc-900/90 border-b border-slate-200 dark:border-zinc-800 flex items-center justify-between">
          <div className="flex items-center space-x-2 font-bold text-sm">
            <Folder className="w-4 h-4 text-amber-500" />
            <span id="add-dir-title">Watch Local Directory</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-slate-200 dark:hover:bg-zinc-800 text-slate-400 hover:text-slate-800 dark:hover:text-zinc-200 text-xs transition cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          <div>
            <label className="block text-[11px] font-bold text-slate-700 dark:text-zinc-300 uppercase tracking-wide mb-1">
              Absolute Local Path
            </label>
            <input
              type="text"
              value={path}
              onChange={(e) => setPath(e.target.value)}
              placeholder="e.g. ~/Research/KnowledgeBase"
              className="w-full bg-slate-50 dark:bg-zinc-800 border border-slate-300 dark:border-zinc-700 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-zinc-100 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 dark:text-zinc-300 uppercase tracking-wide mb-1">
              Index Pipeline
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setEngine('FTS5 + Vec')}
                className={`p-2 rounded-lg border text-left cursor-pointer transition ${
                  engine === 'FTS5 + Vec'
                    ? 'border-cyan-500 bg-cyan-50 dark:bg-cyan-950/40 text-cyan-800 dark:text-cyan-300 font-bold'
                    : 'border-slate-200 dark:border-zinc-800 text-slate-600 dark:text-zinc-400'
                }`}
              >
                <div>FTS5 + Vec</div>
                <div className="text-[10px] text-slate-400 mt-0.5">Hybrid Semantic &amp; Keyword</div>
              </button>
              <button
                type="button"
                onClick={() => setEngine('Markdown Watch')}
                className={`p-2 rounded-lg border text-left cursor-pointer transition ${
                  engine === 'Markdown Watch'
                    ? 'border-cyan-500 bg-cyan-50 dark:bg-cyan-950/40 text-cyan-800 dark:text-cyan-300 font-bold'
                    : 'border-slate-200 dark:border-zinc-800 text-slate-600 dark:text-zinc-400'
                }`}
              >
                <div>Markdown Watch</div>
                <div className="text-[10px] text-slate-400 mt-0.5">Incremental File Watcher</div>
              </button>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-200 dark:border-zinc-800 flex justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-lg border border-slate-300 dark:border-zinc-700 hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-600 dark:text-zinc-300 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold shadow-sm transition cursor-pointer"
            >
              Start Watching
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
