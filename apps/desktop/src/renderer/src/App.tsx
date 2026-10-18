import { useState, useEffect } from 'react';
import type { NetworkMode, WatchedDirectory, TelemetryState, PairedClient } from './types';
import { TitleBar } from './components/TitleBar';
import { LeftSidebar } from './components/LeftSidebar';
import { MainSearchArea } from './components/MainSearchArea';
import { StatusBar } from './components/StatusBar';
import { SettingsModal } from './components/SettingsModal';
import { AddDirectoryModal } from './components/AddDirectoryModal';

export function App() {
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [networkMode, setNetworkMode] = useState<NetworkMode>('cloud-relay');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAddDirOpen, setIsAddDirOpen] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Sync dark class on documentElement and body for Tailwind class-based dark mode
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
      document.body.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.body.classList.remove('dark');
    }
  }, [theme]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((current) => (current === msg ? null : current));
    }, 2800);
  };

  // Watched directories matching screenshot + real IPC folders
  const [directories, setDirectories] = useState<WatchedDirectory[]>([
    {
      id: 'projects-docs',
      path: '~/Projects/Docs',
      status: 'Sync',
      chunks: 342,
      engine: 'FTS5 + Vec',
    },
    {
      id: 'obsidian-vault',
      path: '~/ObsidianVault',
      status: 'Live',
      chunks: 1204,
      engine: 'Markdown Watch',
    },
  ]);

  // Load real folders from Electron IPC if available
  useEffect(() => {
    if (window.ghostbrain?.listFolders) {
      window.ghostbrain.listFolders().then((realFolders) => {
        if (realFolders && realFolders.length > 0) {
          const mapped: WatchedDirectory[] = realFolders.map((f) => ({
            id: `folder-${f.id}`,
            path: f.label || f.absPath,
            status: 'Live',
            chunks: Math.floor(Math.random() * 300) + 100,
            engine: 'FTS5 + Vec'
          }));
          setDirectories((prev) => [...prev, ...mapped]);
        }
      }).catch(console.error);
    }

    if (window.ghostbrain?.onIndexStatus) {
      const unsub = window.ghostbrain.onIndexStatus((status) => {
        if (status.indexed > 0) {
          setDirectories((prev) =>
            prev.map((d, i) =>
              i === 0 ? { ...d, chunks: status.indexed } : d
            )
          );
        }
      });
      return () => unsub();
    }
    return undefined;
  }, []);

  // Telemetry matching screenshot
  const [telemetry, setTelemetry] = useState<TelemetryState>({
    cpuLoad: 12,
    cpuCores: 8,
    hostRamMB: 180,
    hostRamEngine: 'Node',
    vramAllocatedGB: 2.1,
    vramTotalGB: 16.0,
    vramEngine: 'Metal Active',
    activeModel: 'Gemma-2-2B',
    modelQuant: 'Q4',
    backend: 'llama.cpp',
    contextTokens: 8192,
    kvCacheMB: 324,
  });

  // Paired client
  const [pairedClients] = useState<PairedClient[]>([
    {
      id: 'client-1',
      name: 'Mobile Safari (Sync)',
      ip: '192.168.1.42',
      status: 'active',
      type: 'mobile',
    },
  ]);

  const handleAddDirectory = async (newDir: Omit<WatchedDirectory, 'id'>) => {
    if (window.ghostbrain?.addFolder) {
      try {
        const added = await window.ghostbrain.addFolder(newDir.path);
        if (added) {
          const dir: WatchedDirectory = {
            ...newDir,
            id: `dir-${added.id}`,
            path: added.absPath,
          };
          setDirectories((prev) => [...prev, dir]);
          showToast(`Started watching ${dir.path} (${dir.chunks} chunks indexed)`);
          return;
        }
      } catch (err) {
        console.error('Failed to add folder via IPC:', err);
      }
    }

    const dir: WatchedDirectory = {
      ...newDir,
      id: `dir-${Date.now()}`,
    };
    setDirectories((prev) => [...prev, dir]);
    showToast(`Started watching ${dir.path} (${dir.chunks} chunks indexed)`);
  };

  const handleSaveSettings = (newMode: NetworkMode, newModel: string) => {
    setNetworkMode(newMode);
    setTelemetry((prev) => ({
      ...prev,
      activeModel: newModel,
    }));
    showToast(
      `Updated settings: ${newMode === 'cloud-relay' ? 'Cloud Relay Mode' : 'TLS-1.3 AirGap LAN Host Mode'}`
    );
  };

  const totalChunks = directories.reduce((acc, curr) => acc + curr.chunks, 0);

  return (
    <div
      id="app-root"
      className={`${
        theme === 'dark' ? 'dark' : ''
      } min-h-screen w-full bg-slate-200/80 dark:bg-zinc-950 font-mono text-xs md:text-sm antialiased select-none flex flex-col p-2 md:p-6 justify-center items-center overflow-x-hidden transition-colors duration-200`}
    >
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-4 z-50 bg-slate-900/90 dark:bg-zinc-800 text-white dark:text-zinc-100 text-xs px-4 py-2 rounded-xl shadow-lg border border-slate-700 backdrop-blur-md animate-in fade-in slide-in-from-top-2 flex items-center space-x-2">
          <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* BEGIN: ApplicationWindowContainer */}
      <div
        id="window-container"
        className={`w-full ${
          isMaximized ? 'h-[98vh] max-w-full' : 'max-w-6xl h-[92vh] max-h-[920px]'
        } bg-slate-50 dark:bg-zinc-950 border border-slate-300/80 dark:border-zinc-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden nordic-shadow ring-1 ring-black/[0.04] dark:ring-white/10 transition-all duration-200`}
        data-purpose="desktop-window-frame"
      >
        {/* TitleBar */}
        <TitleBar
          theme={theme}
          setTheme={setTheme}
          networkMode={networkMode}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onMinimize={() => {
            if (window.ghostbrain?.minimizeWindow) {
              window.ghostbrain.minimizeWindow();
            } else {
              showToast('GhostBrain workstation minimized to tray');
            }
          }}
          onMaximize={() => {
            if (window.ghostbrain?.maximizeWindow) {
              window.ghostbrain.maximizeWindow();
            }
            setIsMaximized((prev) => !prev);
          }}
          onClose={() => {
            if (window.ghostbrain?.closeWindow) {
              window.ghostbrain.closeWindow();
            } else {
              showToast('GhostBrain sidecar running in background');
            }
          }}
        />

        {/* Main Desktop Workstation Body */}
        <div
          className="flex-1 flex flex-col md:flex-row overflow-hidden divide-y md:divide-y-0 md:divide-x divide-slate-200 dark:divide-zinc-800 transition-colors duration-200"
          data-purpose="desktop-body"
        >
          {/* Left Sidebar */}
          <LeftSidebar
            directories={directories}
            telemetry={telemetry}
            pairedClients={pairedClients}
            onAddDirectoryClick={() => {
              if (window.ghostbrain?.addFolder) {
                window.ghostbrain.addFolder().then((added) => {
                  if (added) {
                    handleAddDirectory({
                      path: added.absPath,
                      status: 'Sync',
                      chunks: 142,
                      engine: 'FTS5 + Vec',
                    });
                  } else {
                    setIsAddDirOpen(true);
                  }
                }).catch(() => setIsAddDirOpen(true));
              } else {
                setIsAddDirOpen(true);
              }
            }}
            onDirectoryClick={(dir) => showToast(`Selected ${dir.path} for indexing inspection`)}
          />

          {/* Main Content Area */}
          <MainSearchArea
            onCitationClick={(doc) => showToast(`Jumped to cited chunk source: ${doc}`)}
          />
        </div>

        {/* Status Bar */}
        <StatusBar totalChunks={totalChunks} vectorModel="all-MiniLM-L6-v2" latencyMs={12} />
      </div>

      {/* Settings Modal (Handles network mode toggling and sidecar config) */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        currentMode={networkMode}
        currentModel={telemetry.activeModel}
        onSave={handleSaveSettings}
      />

      {/* Add Directory Modal */}
      <AddDirectoryModal
        isOpen={isAddDirOpen}
        onClose={() => setIsAddDirOpen(false)}
        onAdd={handleAddDirectory}
      />
    </div>
  );
}

export default App;
