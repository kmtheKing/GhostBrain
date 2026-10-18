import React, { useState, useEffect, useRef } from 'react';
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
  Radio,
  MessageSquare,
  Send,
  Sparkles,
  BookOpen,
  Clock,
  CheckCircle2
} from 'lucide-react';
import type {
  WatchedFolder,
  IndexStatus,
  PowerMode,
  SearchHit,
  ChatCitation
} from '@ghostbrain/shared-types';

interface Message {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  citations?: ChatCitation[];
  latencyMs?: number;
  isStreaming?: boolean;
}

export function App(): React.JSX.Element {
  const [activeTab, setActiveTab] = useState<'overview' | 'folders' | 'search' | 'chat'>('overview');
  const [folders, setFolders] = useState<WatchedFolder[]>([]);
  const [indexStatus, setIndexStatus] = useState<IndexStatus>({
    indexed: 0,
    pending: 0,
    errors: 0,
    etaSec: 0,
    isPaused: false
  });
  const [powerMode, setPowerModeState] = useState<PowerMode>('performance');

  // Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchHit[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Chat State
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      sender: 'assistant',
      text: 'Hello! I am GhostBrain, your offline-first private second brain. I index your documents with BLAKE3 hashing, heading-aware Markdown chunking, and retrieve answers using SQLite-vec and FTS5 hybrid search. How can I assist you with your notes today?'
    }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const activeStreamIdRef = useRef<string | null>(null);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Load initial state via typed IPC bridge
  useEffect(() => {
    loadFolders();
    loadStatus();
    loadPowerMode();

    if (window.ghostbrain?.onChatToken) {
      const unsubToken = window.ghostbrain.onChatToken(({ streamId, delta }) => {
        if (activeStreamIdRef.current === streamId) {
          setMessages((prev) => {
            const last = prev[prev.length - 1];
            if (last && last.sender === 'assistant' && last.isStreaming) {
              const updated = [...prev];
              updated[updated.length - 1] = {
                ...last,
                text: last.text + delta
              };
              return updated;
            }
            return prev;
          });
        }
      });

      const unsubDone = window.ghostbrain.onChatDone?.(({ streamId, citations, latencyMs }) => {
        if (activeStreamIdRef.current === streamId) {
          setMessages((prev) => {
            const last = prev[prev.length - 1];
            if (last && last.sender === 'assistant') {
              const updated = [...prev];
              updated[updated.length - 1] = {
                ...last,
                citations,
                latencyMs,
                isStreaming: false
              };
              return updated;
            }
            return prev;
          });
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

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isStreaming]);

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

  const handleSendMessage = async (e?: React.FormEvent): Promise<void> => {
    e?.preventDefault();
    const query = chatInput.trim();
    if (!query || isStreaming || !window.ghostbrain?.ask) return;

    const userMsgId = 'user_' + Date.now();
    const assistantMsgId = 'assistant_' + (Date.now() + 1);

    setMessages((prev) => [
      ...prev,
      { id: userMsgId, sender: 'user', text: query },
      { id: assistantMsgId, sender: 'assistant', text: '', isStreaming: true }
    ]);
    setChatInput('');
    setIsStreaming(true);

    try {
      const res = await window.ghostbrain.ask({ query });
      activeStreamIdRef.current = res.streamId;
    } catch (err) {
      console.error('[Chat] Failed to send query:', err);
      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          id: assistantMsgId,
          sender: 'assistant',
          text: 'An error occurred while contacting the local engine: ' + String(err),
          isStreaming: false
        };
        return updated;
      });
      setIsStreaming(false);
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
              id="nav-chat"
              className={`nav-item ${activeTab === 'chat' ? 'active' : ''}`}
              onClick={() => setActiveTab('chat')}
            >
              <MessageSquare size={18} />
              <span>Local AI Chat</span>
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

          {activeTab === 'chat' && (
            <div className="chat-container">
              <div className="view-header">
                <div>
                  <h1 className="view-title">Local AI Assistant</h1>
                  <p className="view-subtitle">
                    Streaming RAG reasoning with citation verification across your indexed notes
                  </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className="status-pill online">
                    <Sparkles size={12} />
                    Ollama / Fallback RAG
                  </span>
                </div>
              </div>

              {/* Chat Message Stream */}
              <div className="chat-history">
                {messages.map((m) => (
                  <div key={m.id} className={`chat-message ${m.sender}`}>
                    <div className={`chat-bubble ${m.sender}`}>
                      <div style={{ whiteSpace: 'pre-wrap' }}>{m.text}</div>
                      {m.isStreaming && <span className="streaming-dot" />}

                      {/* Citation verification chips */}
                      {m.citations && m.citations.length > 0 && (
                        <div className="citation-list">
                          <div style={{ width: '100%', fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>
                            VERIFIED SOURCES ({m.citations.length}):
                          </div>
                          {m.citations.map((c) => (
                            <div key={c.tag} className="citation-chip" title={c.relPath}>
                              <BookOpen size={11} />
                              <span>{c.tag}: {c.relPath.split(/[\\/]/).pop()}</span>
                              {c.headingPath && (
                                <span style={{ opacity: 0.65 }}>({c.headingPath})</span>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Metadata & Latency */}
                    {m.latencyMs !== undefined && (
                      <div className="chat-meta">
                        <Clock size={12} />
                        <span>Latency: {m.latencyMs}ms</span>
                        <span>•</span>
                        <CheckCircle2 size={12} color="#10b981" />
                        <span>Offline Validated</span>
                      </div>
                    )}
                  </div>
                ))}
                <div ref={chatBottomRef} />
              </div>

              {/* Chat Input Bar */}
              <form onSubmit={handleSendMessage} className="chat-input-wrapper">
                <textarea
                  id="chat-textarea-input"
                  className="chat-textarea"
                  placeholder="Ask a question about your indexed documents (Enter to send, Shift+Enter for newline)..."
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  rows={1}
                />
                <button
                  id="btn-chat-send"
                  type="submit"
                  className="btn-primary"
                  disabled={isStreaming || !chatInput.trim()}
                  style={isStreaming || !chatInput.trim() ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
                >
                  <Send size={15} />
                  <span>{isStreaming ? 'Thinking...' : 'Send'}</span>
                </button>
              </form>
            </div>
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
                          [{hit.relPath}] {hit.headingPath ? `• ${hit.headingPath}` : ''}
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
