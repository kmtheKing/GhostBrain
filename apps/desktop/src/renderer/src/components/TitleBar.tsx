import React from 'react';
import { Sun, Moon, Settings, Minus, Square, Copy, X } from 'lucide-react';
import type { NetworkMode } from '../types';

interface TitleBarProps {
  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;
  networkMode: NetworkMode;
  isMaximized?: boolean;
  onOpenSettings: () => void;
  onMinimize?: () => void;
  onMaximize?: () => void;
  onClose?: () => void;
}

export const TitleBar: React.FC<TitleBarProps> = ({
  theme,
  setTheme,
  networkMode,
  isMaximized = false,
  onOpenSettings,
  onMinimize,
  onMaximize,
  onClose,
}) => {
  const noDragStyle = { WebkitAppRegion: 'no-drag' } as React.CSSProperties;

  return (
    <header
      className="app-drag-region w-full h-10 bg-white/95 dark:bg-zinc-900/90 border-b border-slate-200 dark:border-zinc-800 flex items-center justify-between px-3 shrink-0 backdrop-blur-md transition-colors duration-200 select-none"
      data-purpose="electron-titlebar"
    >
      {/* Left: Application Brand & Identity */}
      <div className="flex items-center space-x-2.5">
        <span className="w-2.5 h-2.5 rounded-full bg-cyan-600 dark:bg-cyan-400 animate-pulse shrink-0"></span>
        <span className="text-slate-900 dark:text-zinc-100 font-bold font-mono text-xs tracking-wider">
          GhostBrain
        </span>
        <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-zinc-400 font-mono border border-slate-200 dark:border-zinc-700">
          v0.0.1
        </span>
        <span className="hidden sm:inline-block text-[10px] text-slate-400 dark:text-zinc-500 font-mono">
          {networkMode === 'cloud-relay' ? '• Cloud Relay Mode' : '• AirGap LAN Mode'}
        </span>
      </div>

      {/* Right: Theme Switcher, Settings & Window Controls */}
      <div className="flex items-center space-x-2" style={noDragStyle}>
        {/* Functional Segmented Light/Dark Mode Switch */}
        <div
          className="flex items-center p-0.5 rounded-lg bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-[11px] font-sans"
          data-purpose="theme-toggle-dock"
          style={noDragStyle}
        >
          <button
            type="button"
            style={noDragStyle}
            className={`flex items-center space-x-1 px-2 py-0.5 rounded transition-all cursor-pointer ${
              theme === 'light'
                ? 'bg-white text-slate-800 font-semibold shadow-xs'
                : 'bg-transparent text-zinc-400 hover:text-zinc-100 font-medium'
            }`}
            onClick={() => setTheme('light')}
            title="Light Mode"
          >
            <Sun className="w-3 h-3" />
            <span className="hidden sm:inline text-[10px]">Light</span>
          </button>
          <button
            type="button"
            style={noDragStyle}
            className={`flex items-center space-x-1 px-2 py-0.5 rounded transition-all cursor-pointer ${
              theme === 'dark'
                ? 'bg-zinc-700 text-zinc-100 font-semibold shadow-xs'
                : 'text-slate-500 hover:text-slate-800 font-medium'
            }`}
            onClick={() => setTheme('dark')}
            title="Dark Mode"
          >
            <Moon className="w-3 h-3" />
            <span className="hidden sm:inline text-[10px]">Dark</span>
          </button>
        </div>

        {/* Settings Gear Button */}
        <button
          type="button"
          style={noDragStyle}
          onClick={onOpenSettings}
          className="flex items-center space-x-1 text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200 px-2 py-1 rounded hover:bg-slate-100 dark:hover:bg-zinc-800 text-xs font-mono transition-colors cursor-pointer"
          data-purpose="settings-trigger"
          title="Open Settings"
        >
          <Settings className="w-3.5 h-3.5" />
          <span className="hidden md:inline text-[11px]">Settings</span>
        </button>

        <div className="h-4 w-[1px] bg-slate-200 dark:bg-zinc-800 mx-0.5"></div>

        {/* Window Minimize, Maximize, Close Buttons */}
        <div className="flex items-center space-x-0.5" style={noDragStyle} data-purpose="window-controls">
          <button
            type="button"
            style={noDragStyle}
            onClick={onMinimize}
            className="w-7 h-7 flex items-center justify-center hover:bg-slate-200/80 dark:hover:bg-zinc-800 text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-100 rounded transition cursor-pointer"
            title="Minimize"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            style={noDragStyle}
            onClick={onMaximize}
            className="w-7 h-7 flex items-center justify-center hover:bg-slate-200/80 dark:hover:bg-zinc-800 text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-100 rounded transition cursor-pointer"
            title={isMaximized ? "Restore Window" : "Maximize Window"}
          >
            {isMaximized ? (
              <Copy className="w-3 h-3 rotate-180" />
            ) : (
              <Square className="w-3 h-3" />
            )}
          </button>

          <button
            type="button"
            style={noDragStyle}
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center hover:bg-rose-500 hover:text-white text-slate-600 dark:text-zinc-400 rounded transition cursor-pointer"
            title="Close Window"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </header>
  );
};
