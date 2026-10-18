import React, { useState, useEffect } from 'react';
import logo from './assets/logo.png';
import {
  FolderPlus,
  Trash2,
  HardDrive,
  Cpu,
  Search,
  ShieldCheck,
  Zap,
  Activity,
  Minus,
  Square,
  X,
  Database,
  Radio
} from 'lucide-react';
import type { WatchedFolder, IndexStatus, PowerMode, SearchHit } from '@ghostbrain/shared-types';

export function App(): React.JSX.Element {
  const [activeTab, setActiveTab] = useState<'overview' | 'folders' | 'search'>('overview');
  const [folders, setFolders] = useState<WatchedFolder[]>([]);
  const [indexStatus, setIndexStatus] = useState<IndexStatus>({
    indexed: 0,
    pending: 0,
    errors: 0,
    etaSec: 0,
    isPaused: false
  });
  const [powerMode, setPowerModeState] = useState<PowerMode>('performance');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchHit[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Load initial state via typed IPC bridge
  useEffect(() => {
    loadFolders();
    loadStatus();
    loadPowerMode();
  }, []);

  const loadFolders = async (): Promise<void> => {
    if (window.ghostbrain?.listFolders) {
      try {
        const list = await window.ghostbrain.listFolders();
        setFolders(list);
      } catch (e) {
        console.error(e);
      }
    }
  };

  const loadStatus = async (): Promise<void> => {
    if (window.ghostbrain?.getIndexStatus) {
      try {
        const status = await window.ghostbrain.getIndexStatus();
        setIndexStatus(status);
      } catch (e) {
        console.error(e);
      }
    }
  };

  const loadPowerMode = async (): Promise<void> => {
    if (window.ghostbrain?.getPowerMode) {
      try {
        const mode = await window.ghostbrain.getPowerMode();
        setPowerModeState(mode);
      } catch (e) {
        console.error(e);
      }
    }
  };

  const handleAddFolder = async (): Promise<void> => {
    if (window.ghostbrain?.addFolder) {
      const added = await window.ghostbrain.addFolder();
      if (added) {
        loadFolders();
        loadStatus();
      }
    }
  };

  const handleRemoveFolder = async (id: number): Promise<void> => {
    if (window.ghostbrain?.removeFolder) {
      await window.ghostbrain.removeFolder(id);
      loadFolders();
    }
  };

  const handleSetPowerMode = async (mode: PowerMode): Promise<void> => {
    setPowerModeState(mode);
    if (window.ghostbrain?.setPowerMode) {
      await window.ghostbrain.setPowerMode(mode);
    }
  };

  const handleSearch = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    if (!searchQuery.trim() || !window.ghostbrain?.search) return;

    setIsSearching(true);
    try {
      const hits = await window.ghostbrain.search({ query: searchQuery });
      setSearchResults(hits);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw' }}>
      {/* Draggable Custom Window Title Bar */}
      <header className="titlebar">
        <div className="titlebar-brand">
          <img src={logo} alt="GhostBrain" style={{ width: 18, height: 18, borderRadius: 3, objectFit: 'contain' }} />
          <span>GHOSTBRAIN CORE</span>
          <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 500 }}>v0.0.1</span>
        </div>
        <div className="titlebar-controls">
          <button
            id="btn-window-min"
            className="window-btn"
            onClick={() => window.ghostbrain?.minimizeWindow()}
            title="Minimize"
          >
            <Minus size={14} />
          </button>
          <button
            id="btn-window-max"
            className="window-btn"
            onClick={() => window.ghostbrain?.maximizeWindow()}
            title="Maximize"
          >
            <Square size={12} />
          </button>
          <button
            id="btn-window-close"
            className="window-btn close"
            onClick={() => window.ghostbrain?.closeWindow()}
            title="Close to Tray"
          >
            <X size={14} />
          </button>
        </div>
      </header>

      {/* Main Container */}
      <div className="app-container">
        {/* Sidebar Navigation */}
        <aside className="sidebar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '0 4px 14px', borderBottom: '1px solid var(--border-subtle)' }}>
            <img src={logo} alt="GhostBrain Logo" style={{ width: 32, height: 32, borderRadius: 6, objectFit: 'contain' }} />
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.92rem', letterSpacing: '0.02em', color: '#f8fafc' }}>GhostBrain</div>
              <div style={{ fontSize: '0.7rem', color: '#64748b' }}>AI Core Engine</div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '0 4px' }}>
            <span className="status-pill online">
              <span className="pulse-dot" />
              Daemon Active
            </span>
          </div>

          <nav className="sidebar-nav">
            <button
              id="nav-overview"
              className={`nav-item ${activeTab === 'overview' ? 'active' : ''}`}
              onClick={() => setActiveTab('overview')}
            >
              <Cpu size={18} />
              <span>Engine Status</span>
            </button>
            <button
              id="nav-folders"
              className={`nav-item ${activeTab === 'folders' ? 'active' : ''}`}
              onClick={() => setActiveTab('folders')}
            >
              <HardDrive size={18} />
              <span>Watched Folders</span>
              <span style={{ marginLeft: 'auto', fontSize: '0.75rem', opacity: 0.7 }}>
                {folders.length}
              </span>
            </button>
            <button
              id="nav-search"
              className={`nav-item ${activeTab === 'search' ? 'active' : ''}`}
              onClick={() => setActiveTab('search')}
            >
              <Search size={18} />
              <span>Hybrid Search Test</span>
            </button>
          </nav>

          {/* Licensing & Edition Footer */}
          <div style={{ padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: '10px', border: '1px solid var(--border-subtle)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: '#38bdf8', fontWeight: 600 }}>
              <ShieldCheck size={14} />
              <span>GhostBrain Personal</span>
            </div>
            <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '4px' }}>
              Perpetual Fallback Enabled
            </div>
          </div>
        </aside>

        {/* Viewport Content */}
        <main className="main-view">
          {activeTab === 'overview' && (
            <>
              <div className="view-header">
                <div>
                  <h1 className="view-title">GhostBrain Core Engine</h1>
                  <p className="view-subtitle">
                    Local Hybrid-RAG (Vector + FTS5) & Desktop Background Tray Daemon
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    id="btn-power-perf"
                    className={`btn-secondary ${powerMode === 'performance' ? 'active' : ''}`}
                    onClick={() => handleSetPowerMode('performance')}
                    style={powerMode === 'performance' ? { borderColor: '#38bdf8', color: '#38bdf8' } : {}}
                  >
                    <Zap size={14} /> Performance (GPU)
                  </button>
                  <button
                    id="btn-power-low"
                    className={`btn-secondary ${powerMode === 'low-power' ? 'active' : ''}`}
                    onClick={() => handleSetPowerMode('low-power')}
                    style={powerMode === 'low-power' ? { borderColor: '#a855f7', color: '#a855f7' } : {}}
                  >
                    <Cpu size={14} /> Low-Power (CPU / Gaming)
                  </button>
                </div>
              </div>

              {/* Status Metric Cards */}
              <div className="card-grid">
                <div className="card">
                  <div className="card-label">Indexed Documents</div>
                  <div className="card-value">
                    <Database size={24} color="#38bdf8" />
                    <span>{indexStatus.indexed}</span>
                  </div>
                  <p style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '6px' }}>
                    BLAKE3 content-hashed & deduplicated
                  </p>
                </div>

                <div className="card">
                  <div className="card-label">Indexing Queue</div>
                  <div className="card-value">
                    <Activity size={24} color={indexStatus.pending > 0 ? '#f59e0b' : '#10b981'} />
                    <span>{indexStatus.pending} pending</span>
                  </div>
                  <p style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '6px' }}>
                    {indexStatus.isPaused ? 'Indexing Paused' : 'Watching live filesystem'}
                  </p>
                </div>

                <div className="card">
                  <div className="card-label">Air-Gap & Privacy</div>
                  <div className="card-value">
                    <Radio size={24} color="#10b981" />
                    <span style={{ fontSize: '1rem', color: '#10b981' }}>100% Local / Zero Egress</span>
                  </div>
                  <p style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '6px' }}>
                    Documents never leave this device
                  </p>
                </div>
              </div>

              {/* Quick Folder Overview */}
              <div className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div className="card-label">Active Watched Directories</div>
                  <button id="btn-quick-add-folder" className="btn-primary" onClick={handleAddFolder}>
                    <FolderPlus size={16} />
                    <span>Add Watched Folder</span>
                  </button>
                </div>

                {folders.length === 0 ? (
                  <div style={{ padding: '32px', textAlign: 'center', color: '#64748b' }}>
                    No folders connected yet. Click "Add Watched Folder" to begin indexing your Markdown, text, and PDF notes.
                  </div>
                ) : (
                  <div className="folder-list">
                    {folders.map((f) => (
                      <div key={f.id} className="folder-item">
                        <div>
                          <div style={{ fontWeight: 600 }}>{f.label || f.absPath}</div>
                          <div className="folder-path">{f.absPath}</div>
                        </div>
                        <button
                          className="btn-secondary"
                          onClick={() => handleRemoveFolder(f.id)}
                          title="Remove folder from index"
                        >
                          <Trash2 size={14} color="#f43f5e" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          {activeTab === 'folders' && (
            <>
              <div className="view-header">
                <div>
                  <h1 className="view-title">Watched Directories</h1>
                  <p className="view-subtitle">
                    Directories watched by GhostBrain's background file daemon
                  </p>
                </div>
                <button id="btn-add-folder-view" className="btn-primary" onClick={handleAddFolder}>
                  <FolderPlus size={16} />
                  <span>Add Directory</span>
                </button>
              </div>

              <div className="card">
                {folders.length === 0 ? (
                  <div style={{ padding: '32px', textAlign: 'center', color: '#64748b' }}>
                    No directories connected yet.
                  </div>
                ) : (
                  <div className="folder-list">
                    {folders.map((f) => (
                      <div key={f.id} className="folder-item">
                        <div>
                          <div style={{ fontWeight: 600 }}>{f.label || f.absPath}</div>
                          <div className="folder-path">{f.absPath}</div>
                        </div>
                        <button
                          className="btn-secondary"
                          onClick={() => handleRemoveFolder(f.id)}
                          title="Remove folder"
                        >
                          <Trash2 size={14} color="#f43f5e" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          {activeTab === 'search' && (
            <>
              <div className="view-header">
                <div>
                  <h1 className="view-title">Hybrid Search & Citation Test</h1>
                  <p className="view-subtitle">
                    Live query execution across SQLite FTS5 and sqlite-vec
                  </p>
                </div>
              </div>

              <form onSubmit={handleSearch} className="search-bar-container">
                <Search size={18} color="#94a3b8" />
                <input
                  id="input-search-query"
                  className="search-input"
                  type="text"
                  placeholder="Type a query to search local indexed chunks..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <button id="btn-submit-search" type="submit" className="btn-primary">
                  {isSearching ? 'Searching...' : 'Search'}
                </button>
              </form>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {searchResults.length === 0 ? (
                  <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
                    {searchQuery ? 'No chunks matched this query.' : 'Enter a search term above to test SQLite retrieval.'}
                  </div>
                ) : (
                  searchResults.map((hit) => (
                    <div key={hit.chunkId} className="card">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.8rem', color: '#38bdf8', fontFamily: 'JetBrains Mono, monospace' }}>
                          [{hit.relPath}] {hit.headingPath ? `› ${hit.headingPath}` : ''}
                        </span>
                        <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                          Score: {hit.rrfScore.toFixed(3)}
                        </span>
                      </div>
                      <div style={{ marginTop: '8px', fontSize: '0.9rem', color: '#f8fafc', lineHeight: 1.5, userSelect: 'text' }}>
                        {hit.text}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
