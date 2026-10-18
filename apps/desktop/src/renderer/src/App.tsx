import React, { useState, useEffect, useRef } from 'react';
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
  Radio,
  Sun,
  Moon,
  Settings,
  CornerDownLeft,
  FileCode,
  FileText,
  Lock,
  Sparkles,
  Link2,
  BookOpen
} from 'lucide-react';
import type {
  WatchedFolder,
  IndexStatus,
  PowerMode,
  SearchHit,
  ChatCitation
} from '@ghostbrain/shared-types';

interface SearchResultItem {
  id: string;
  filename: string;
  filetype: string;
  score: string;
  metricLabel: string;
  previewHeading?: string;
  previewContent: string;
}

export function App(): React.JSX.Element {
  // Theme state: default to dark mode matching Obsidian Cyber-Lab
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [activeFilter, setActiveFilter] = useState<'all' | 'md' | 'sql' | 'code'>('all');

  // Backend state
  const [folders, setFolders] = useState<WatchedFolder[]>([]);
  const [indexStatus, setIndexStatus] = useState<IndexStatus>({
    indexed: 1546,
    pending: 0,
    errors: 0,
    etaSec: 0,
    isPaused: false
  });
  const [powerMode, setPowerModeState] = useState<PowerMode>('performance');

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [liveSearchResults, setLiveSearchResults] = useState<SearchHit[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Chat / Query state
  const [queryInput, setQueryInput] = useState('');
  const [lastQuery, setLastQuery] = useState('Explain our Redis queue error handling');
  const [answerText, setAnswerText] = useState(
    'In architecture_spec.md, Redis handles deferred tasks with an exponential backoff retry mechanism (max 5 attempts). If connection exhaustion occurs on port 6379, unhandled payloads shift into a dead-letter state rather than terminating the worker pipeline. [1]'
  );
  const [citations, setCitations] = useState<ChatCitation[]>([
    { chunkId: 42, documentId: 1, relPath: 'architecture_spec.md', score: 0.94, tag: '1', headingPath: 'Dispatcher Worker' }
  ]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [inferenceLatency, setInferenceLatency] = useState(142);
  const activeStreamIdRef = useRef<string | null>(null);

  // Load initial backend state
  useEffect(() => {
    loadFolders();
    loadStatus();
    loadPowerMode();

    if (window.ghostbrain?.onChatToken) {
      const unsubToken = window.ghostbrain.onChatToken(({ streamId, delta }) => {
        if (activeStreamIdRef.current === streamId) {
          setAnswerText((prev) => prev + delta);
        }
      });

      const unsubDone = window.ghostbrain.onChatDone?.(({ streamId, citations: returnedCitations, latencyMs }) => {
        if (activeStreamIdRef.current === streamId) {
          setCitations(returnedCitations);
          setInferenceLatency(latencyMs);
          setIsStreaming(false);
          activeStreamIdRef.current = null;
        }
      });

      const unsubStatus = window.ghostbrain.onIndexStatus?.((status) => {
        setIndexStatus(status);
      });

      return () => {
        unsubToken?.();
        unsubDone?.();
        unsubStatus?.();
      };
    }
    return undefined;
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

  const handleTogglePowerMode = async (): Promise<void> => {
    const nextMode: PowerMode = powerMode === 'performance' ? 'low-power' : 'performance';
    setPowerModeState(nextMode);
    if (window.ghostbrain?.setPowerMode) {
      await window.ghostbrain.setPowerMode(nextMode);
    }
  };

  const handleSearchSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    if (!searchQuery.trim() || !window.ghostbrain?.search) return;

    setIsSearching(true);
    try {
      const hits = await window.ghostbrain.search({ query: searchQuery });
      setLiveSearchResults(hits);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSearching(false);
    }
  };

  const handleRunQuery = async (e?: React.FormEvent): Promise<void> => {
    e?.preventDefault();
    const query = queryInput.trim() || searchQuery.trim();
    if (!query || isStreaming || !window.ghostbrain?.ask) return;

    setLastQuery(query);
    setAnswerText('');
    setIsStreaming(true);
    setQueryInput('');

    try {
      const res = await window.ghostbrain.ask({ query });
      activeStreamIdRef.current = res.streamId;
    } catch (err) {
      console.error('[Runner] Query error:', err);
      setAnswerText('Error contacting local inference engine: ' + String(err));
      setIsStreaming(false);
    }
  };

  // Sample fallback search hits matching the user's mockup if no custom search is active
  const defaultHits: SearchResultItem[] = [
    {
      id: 'hit-1',
      filename: 'architecture_spec.md',
      filetype: 'markdown',
      score: '0.94',
      metricLabel: 'Cosine: 0.86',
      previewHeading: '// Line 42: Dispatcher queue worker initialization',
      previewContent:
        '"...assigned port 6379 to the Redis broker queue. In case of timeout or connection drops, exponential backoff retries max 5 times before emitting a dead-letter payload..."'
    },
    {
      id: 'hit-2',
      filename: 'schema_v2.sql',
      filetype: 'sqlite',
      score: '0.88',
      metricLabel: 'BM25 Ranked',
      previewContent:
        'CREATE TABLE device_tokens (id TEXT PRIMARY KEY, relay_channel TEXT, retry_count INTEGER DEFAULT 0);'
    }
  ];

  return (
    <div className={`ghostbrain-root theme-${theme}`}>
      {/* Custom Window Title Bar */}
      <header className="gb-titlebar">
        <div className="gb-titlebar-left">
          <div className="gb-logo-brand">
            <span className="gb-logo-dot" />
            <span>GhostBrain</span>
          </div>
          <span className="gb-version-tag">v1.0.0.exe</span>
        </div>

        <div className="gb-titlebar-center">
          <div className="gb-pill-badge relay">
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#38bdf8' }} />
            <span>Cloud Relay: Connected</span>
          </div>
          <div className="gb-pill-badge airgap">
            <ShieldCheck size={12} />
            <span>TLS-1.3 AirGap</span>
          </div>
        </div>

        <div className="gb-titlebar-right">
          {/* Light / Dark Mode Toggle */}
          <div className="gb-theme-toggle">
            <button
              className={`gb-theme-btn ${theme === 'light' ? 'active' : ''}`}
              onClick={() => setTheme('light')}
            >
              <Sun size={12} />
              <span>Light</span>
            </button>
            <button
              className={`gb-theme-btn ${theme === 'dark' ? 'active' : ''}`}
              onClick={() => setTheme('dark')}
            >
              <Moon size={12} />
              <span>Dark</span>
            </button>
          </div>

          <button className="gb-btn-settings" title="Settings">
            <Settings size={14} />
            <span>Settings</span>
          </button>

          <div className="gb-window-controls">
            <button className="gb-win-btn" onClick={() => window.ghostbrain?.minimizeWindow()} title="Minimize">
              <Minus size={13} />
            </button>
            <button className="gb-win-btn" onClick={() => window.ghostbrain?.maximizeWindow()} title="Maximize">
              <Square size={11} />
            </button>
            <button className="gb-win-btn close" onClick={() => window.ghostbrain?.closeWindow()} title="Close">
              <X size={13} />
            </button>
          </div>
        </div>
      </header>

      {/* Main Workspace (Sidebar + Main Pane) */}
      <div className="gb-workspace">
        {/* Left Sidebar */}
        <aside className="gb-sidebar">
          {/* Section: Watched Directories */}
          <div>
            <div className="gb-section-header">
              <span>📁 Watched Directories</span>
              <span className="gb-section-subtext">Auto-Sync</span>
            </div>

            {/* Default mock cards + actual watched directories */}
            <div className="gb-folder-card">
              <div className="gb-folder-top">
                <span className="gb-folder-name">~/Projects/Docs</span>
                <span className="gb-pill-micro sync">● Sync</span>
              </div>
              <div className="gb-folder-meta">
                <span>342 chunks</span>
                <span>FTS5 + Vec</span>
              </div>
            </div>

            <div className="gb-folder-card">
              <div className="gb-folder-top">
                <span className="gb-folder-name">~/ObsidianVault</span>
                <span className="gb-pill-micro live">Live</span>
              </div>
              <div className="gb-folder-meta">
                <span>1,204 chunks</span>
                <span>Markdown Watch</span>
              </div>
            </div>

            {/* Custom User Connected Folders */}
            {folders.map((f) => (
              <div key={f.id} className="gb-folder-card">
                <div className="gb-folder-top">
                  <span className="gb-folder-name" title={f.absPath}>
                    {f.label || f.absPath.split(/[\\/]/).pop()}
                  </span>
                  <button
                    onClick={() => handleRemoveFolder(f.id)}
                    style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#f43f5e' }}
                    title="Remove folder"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
                <div className="gb-folder-meta">
                  <span style={{ fontSize: '0.66rem', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {f.absPath}
                  </span>
                  <span className="gb-pill-micro live">Active</span>
                </div>
              </div>
            ))}

            <button className="gb-btn-dashed" onClick={handleAddFolder}>
              <span>[+ Add Directory]</span>
            </button>
          </div>

          {/* Section: System Telemetry */}
          <div>
            <div className="gb-section-header">
              <span>⚙ System Telemetry</span>
            </div>

            <div className="gb-telemetry-grid">
              <div className="gb-telemetry-tile">
                <div className="gb-tile-label">
                  <span>CPU Load</span>
                  <span style={{ color: 'var(--text-muted)' }}>8 Cores</span>
                </div>
                <div className="gb-tile-val" style={{ color: 'var(--color-green)' }}>12%</div>
                <div className="gb-tile-bar-bg">
                  <div className="gb-tile-bar-fill" style={{ width: '12%', background: 'var(--color-green)' }} />
                </div>
              </div>

              <div className="gb-telemetry-tile">
                <div className="gb-tile-label">
                  <span>Host RAM</span>
                  <span style={{ color: 'var(--text-muted)' }}>Node</span>
                </div>
                <div className="gb-tile-val" style={{ color: 'var(--color-cyan)' }}>180MB</div>
                <div className="gb-tile-bar-bg">
                  <div className="gb-tile-bar-fill" style={{ width: '22%', background: 'var(--color-cyan)' }} />
                </div>
              </div>
            </div>

            <div className="gb-telemetry-block" onClick={handleTogglePowerMode} style={{ cursor: 'pointer' }} title="Click to toggle Power Mode">
              <div className="gb-tile-label">
                <span>VRAM Allocation</span>
                <span style={{ color: 'var(--color-green)', fontWeight: 600 }}>
                  {powerMode === 'performance' ? 'Metal / GPU Active' : 'CPU-Only Mode'}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', margin: '4px 0 6px' }}>
                <span className="gb-tile-val" style={{ margin: 0 }}>
                  {powerMode === 'performance' ? '2.1 GB' : '0.4 GB'}
                </span>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>/ 16.0 GB Unified</span>
              </div>
              <div className="gb-tile-bar-bg">
                <div
                  className="gb-tile-bar-fill"
                  style={{
                    width: powerMode === 'performance' ? '28%' : '6%',
                    background: powerMode === 'performance' ? 'var(--color-cyan)' : 'var(--color-purple)'
                  }}
                />
              </div>
            </div>

            <div className="gb-telemetry-block">
              <div className="gb-llm-title">
                <span>ACTIVE LOCAL LLM</span>
                <span className="gb-llm-badge">llama.cpp</span>
              </div>
              <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--color-cyan)', marginTop: '4px' }}>
                Gemma-2-2B (Q4)
              </div>
              <div className="gb-llm-meta">
                <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--color-green)' }} />
                <span>Context: 8,192 tokens • KV-Cache: 324MB</span>
              </div>
            </div>
          </div>

          {/* Section: Paired Web Clients */}
          <div style={{ marginTop: 'auto' }}>
            <div className="gb-section-header">
              <span>🔗 Paired Web Clients</span>
              <span className="gb-section-subtext">P2P Encrypted</span>
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.74rem', color: 'var(--text-muted)' }}>
              Mobile Safari (Sync)
            </div>
          </div>
        </aside>

        {/* Right Main Pane */}
        <main className="gb-main">
          {/* Header Bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '0.84rem', letterSpacing: '0.02em', textTransform: 'uppercase' }}>
              🧠 Active Knowledge Repository & Hybrid Search
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.73rem', color: 'var(--color-cyan)', fontWeight: 600 }}>
              Engine: SQLite-vec + FTS5
            </div>
          </div>

          {/* Search Bar Input */}
          <form onSubmit={handleSearchSubmit} className="gb-search-container">
            <Search size={16} color="var(--color-cyan)" />
            <input
              type="text"
              className="gb-search-input"
              placeholder="Search your vault (FTS5 + Vector)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span className="gb-kbd-badge">⌘K</span>
              <span className="gb-kbd-badge">↵</span>
            </div>
          </form>

          {/* Filter Pills */}
          <div className="gb-filter-row">
            <button
              className={`gb-filter-pill ${activeFilter === 'all' ? 'active' : ''}`}
              onClick={() => setActiveFilter('all')}
            >
              All Vault
            </button>
            <button
              className={`gb-filter-pill ${activeFilter === 'md' ? 'active' : ''}`}
              onClick={() => setActiveFilter('md')}
            >
              .md docs
            </button>
            <button
              className={`gb-filter-pill ${activeFilter === 'sql' ? 'active' : ''}`}
              onClick={() => setActiveFilter('sql')}
            >
              .sql schema
            </button>
            <button
              className={`gb-filter-pill ${activeFilter === 'code' ? 'active' : ''}`}
              onClick={() => setActiveFilter('code')}
            >
              code snippets
            </button>
          </div>

          {/* Search Hits List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {liveSearchResults.length > 0 ? (
              liveSearchResults.map((hit) => (
                <div key={hit.chunkId} className="gb-result-card">
                  <div className="gb-result-header">
                    <div className="gb-result-title">
                      <FileText size={15} color="var(--color-cyan)" />
                      <span>{hit.relPath}</span>
                      {hit.headingPath && <span className="gb-type-pill">{hit.headingPath}</span>}
                    </div>
                    <div className="gb-score-badge">
                      Score: {hit.rrfScore.toFixed(2)}
                    </div>
                  </div>
                  <div className="gb-code-preview">
                    {hit.text}
                  </div>
                </div>
              ))
            ) : (
              defaultHits.map((hit) => (
                <div key={hit.id} className="gb-result-card">
                  <div className="gb-result-header">
                    <div className="gb-result-title">
                      {hit.filetype === 'markdown' ? (
                        <FileText size={15} color="var(--color-cyan)" />
                      ) : (
                        <FileCode size={15} color="var(--color-purple)" />
                      )}
                      <span>{hit.filename}</span>
                      <span className="gb-type-pill">{hit.filetype}</span>
                    </div>
                    <div className="gb-score-badge">
                      Score: {hit.score} <span style={{ opacity: 0.65, fontSize: '0.68rem', color: 'var(--text-muted)' }}>| {hit.metricLabel}</span>
                    </div>
                  </div>
                  <div className="gb-code-preview">
                    {hit.previewHeading && (
                      <div style={{ color: 'var(--text-muted)', marginBottom: '4px' }}>
                        {hit.previewHeading}
                      </div>
                    )}
                    <div>{hit.previewContent}</div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Live Interactive Query Runner */}
          <div className="gb-query-panel">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '0.8rem', letterSpacing: '0.02em', textTransform: 'uppercase' }}>
                💬 Live Interactive Query Runner
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--color-green)', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--color-green)' }} />
                <span>Ready • {inferenceLatency}ms inference</span>
              </div>
            </div>

            {/* Conversation Box */}
            <div className="gb-query-stream-card">
              <div style={{ color: 'var(--color-cyan)', fontWeight: 700, marginBottom: '8px' }}>
                Query: {lastQuery}
              </div>
              <div style={{ color: 'var(--text-main)', lineHeight: 1.6 }}>
                <span style={{ color: 'var(--color-purple)', fontWeight: 700 }}>GhostBrain: </span>
                {answerText}
                {isStreaming && <span style={{ display: 'inline-block', width: 6, height: 12, background: 'var(--color-cyan)', marginLeft: 4 }} />}
              </div>
            </div>

            {/* Chat Input Bar */}
            <form onSubmit={handleRunQuery} className="gb-query-input-bar">
              <span style={{ color: 'var(--text-muted)', fontSize: '0.84rem' }}>✉</span>
              <input
                type="text"
                className="gb-chat-input"
                placeholder="How do we persist tokens upon reconnection?"
                value={queryInput}
                onChange={(e) => setQueryInput(e.target.value)}
              />
              <button
                type="submit"
                className="gb-btn-run"
                disabled={isStreaming}
              >
                <Zap size={13} />
                <span>{isStreaming ? 'Thinking...' : 'Run'}</span>
              </button>
            </form>
          </div>
        </main>
      </div>

      {/* Footer Status Bar */}
      <footer className="gb-statusbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--color-green)' }} />
          <span>Indexed: {indexStatus.indexed.toLocaleString()} Chunks</span>
          <span>•</span>
          <span>Vector Dim: 384 (all-MiniLM-L6-v2)</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ color: 'var(--color-green)' }}>Latency: 12ms</span>
          <span>|</span>
          <span>UTF-8</span>
        </div>
      </footer>
    </div>
  );
}
