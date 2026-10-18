import React from 'react';
import { Sun, Moon, Settings, Minus, Square, X } from 'lucide-react';
import type { NetworkMode } from '../types';

interface TitleBarProps {
  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;
  networkMode: NetworkMode;
  onOpenSettings: () => void;
  onMinimize?: () => void;
  onMaximize?: () => void;
  onClose?: () => void;
}

export const TitleBar: React.FC<TitleBarProps> = ({
  theme,
  setTheme,
  networkMode,
  onOpenSettings,
  onMinimize,
  onMaximize,
  onClose,
}) => {
  return (
    <header
      className="app-drag-region h-11 bg-white/95 dark:bg-zinc-900/90 border-b border-slate-200 dark:border-zinc-800 flex items-center justify-between px-3.5 shrink-0 backdrop-blur-md transition-colors duration-200"
      data-purpose="electron-titlebar"
    >
      {/* Left: Application Brand & Identity */}
      <div className="flex items-center space-x-3">
        <div className="flex items-center space-x-2 font-semibold text-slate-800 dark:text-zinc-100 tracking-wider">
          <span className="w-2.5 h-2.5 rounded-full bg-cyan-600 dark:bg-cyan-400 animate-pulse"></span>
          <span className="text-slate-900 dark:text-zinc-100 font-bold font-mono">GhostBrain</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 font-mono border border-slate-200 dark:border-zinc-700 font-medium">
            v1.0.0.exe
          </span>
        </div>
      </div>



      {/* Right: Theme Switcher, Settings & Window Controls */}
      <div className="no-drag flex items-center space-x-2">
        {/* Functional Segmented Light/Dark Mode Switch */}
        <div
          className="flex items-center p-0.5 rounded-lg bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-[11px] font-sans"
          data-purpose="theme-toggle-dock"
        >
          <button
            type="button"
            className={`flex items-center space-x-1.5 px-2 py-0.5 rounded-md transition-all cursor-pointer ${
              theme === 'light'
                ? 'bg-white text-slate-800 font-semibold shadow-xs'
                : 'bg-transparent text-zinc-400 hover:text-zinc-100 font-medium'
            }`}
            onClick={() => setTheme('light')}
            title="Nordic Frost Light Mode"
          >
            <Sun className="w-3 h-3" />
            <span className="hidden sm:inline text-[11px]">Light</span>
          </button>
          <button
            type="button"
            className={`flex items-center space-x-1.5 px-2 py-0.5 rounded-md transition-all cursor-pointer ${
              theme === 'dark'
                ? 'bg-zinc-700 text-zinc-100 font-semibold shadow-xs'
                : 'text-slate-500 hover:text-slate-800 font-medium'
            }`}
            onClick={() => setTheme('dark')}
            title="Cyber Dark Mode"
          >
            <Moon className="w-3 h-3" />
            <span className="hidden sm:inline text-[11px]">Dark</span>
          </button>
        </div>

        {/* Settings Gear Button */}
        <button
          type="button"
          onClick={onOpenSettings}
          className="flex items-center space-x-1.5 text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200 px-2 py-1 rounded hover:bg-slate-100 dark:hover:bg-zinc-800 text-xs font-mono transition-colors cursor-pointer"
          data-purpose="settings-trigger"
          title="Open Workstation & Network Settings"
        >
          <Settings className="w-3.5 h-3.5" />
          <span className="hidden md:inline text-[11px]">Settings</span>
        </button>

        <div className="h-4 w-[1px] bg-slate-200 dark:bg-zinc-800 mx-0.5"></div>

        {/* Window Minimize, Maximize, Close Buttons */}
        <div className="flex items-center space-x-1" data-purpose="window-controls">
          <button
            type="button"
            onClick={onMinimize}
            className="w-6 h-6 flex items-center justify-center hover:bg-slate-200/70 dark:hover:bg-zinc-800 text-slate-500 hover:text-slate-800 dark:hover:text-zinc-200 rounded transition cursor-pointer"
            title="Minimize"
          >
            <Minus className="w-3 h-3" />
          </button>
          <button
            type="button"
            onClick={onMaximize}
            className="w-6 h-6 flex items-center justify-center hover:bg-slate-200/70 dark:hover:bg-zinc-800 text-slate-500 hover:text-slate-800 dark:hover:text-zinc-200 rounded transition cursor-pointer"
            title="Maximize / Restore"
          >
            <Square className="w-2.5 h-2.5" />
          </button>
          <button
            type="button"
            onClick={onClose}
            className="w-6 h-6 flex items-center justify-center hover:bg-red-500 text-slate-500 hover:text-white rounded transition cursor-pointer"
            title="Close"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      </div>
    </header>
  );
};
