import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, Search, FileText, Terminal, X, Sparkles, Database, Check, Copy, ArrowRight, Cpu } from 'lucide-react';
import type { SearchHit, ChatTokenPayload, ChatDonePayload } from '@ghostbrain/shared-types';

interface RetrievedChunk {
  filename: string;
  type: string;
  score: number;
  scoreMetric: string;
  lineInfo?: string;
  snippet: string;
  highlightWords?: string[];
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  thoughts?: string[];
  toolCalls?: any[];
  sourceDocs?: string[];
  chunks?: RetrievedChunk[];
  inferenceTime?: string;
}

interface MainSearchAreaProps {
  onCitationClick?: (citation: string) => void;
}

const ThinkingAccordion: React.FC<{ thoughts: string[] }> = ({ thoughts }) => {
  const [isOpen, setIsOpen] = useState(false);
  const latestThought = thoughts[thoughts.length - 1];

  return (
    <div className="rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-100/60 dark:bg-zinc-950/40 overflow-hidden text-xs font-mono">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-3 py-2 flex items-center justify-between text-left hover:bg-slate-200/50 dark:hover:bg-zinc-900/50 transition cursor-pointer"
      >
        <div className="flex items-center space-x-2 truncate">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-pulse"></span>
          <span className="font-bold text-[11px] text-slate-700 dark:text-zinc-300">
            Thinking &amp; Actions ({thoughts.length})
          </span>
          <span className="text-[10px] text-slate-400 dark:text-zinc-500 truncate max-w-[280px]">
            {latestThought}
          </span>
        </div>
        <span className="text-[10px] text-slate-400 font-bold ml-2">
          {isOpen ? '▲ Hide' : '▼ Show'}
        </span>
      </button>

      {isOpen && (
        <div className="p-3 border-t border-slate-200 dark:border-zinc-800 space-y-1 bg-white/40 dark:bg-zinc-950/80 text-[11px] text-slate-600 dark:text-zinc-400">
          {thoughts.map((step, idx) => (
            <div key={idx} className="flex items-start space-x-2">
              <span className="text-cyan-500 font-bold">•</span>
              <span className="leading-relaxed">{step}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export const MainSearchArea: React.FC<MainSearchAreaProps> = ({ onCitationClick }) => {
  const [promptInput, setPromptInput] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Full continuous conversation stream loaded from SQLite
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const activeThoughtsRef = useRef<string[]>([]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isRunning]);

  // Auto-load continuous chat timeline on app boot
  useEffect(() => {
    if (window.ghostbrain?.getChatHistory) {
      window.ghostbrain.getChatHistory().then((history: any[]) => {
        if (Array.isArray(history) && history.length > 0) {
          setMessages(
            history.map((h) => ({
              id: h.id,
              sender: h.role === 'user' ? 'user' : 'assistant',
              text: h.content,
              thoughts: h.thoughts,
              toolCalls: h.toolCalls,
              sourceDocs: h.citations?.map((c: any) => c.relPath || c.docPath),
              chunks: h.citations?.map((c: any) => ({
                filename: (c.relPath || c.docPath || 'document').split(/[/\\]/).pop(),
                type: 'document',
                score: Number((c.score || 0).toFixed(3)),
                scoreMetric: `Score: ${(c.score || 0).toFixed(3)}`,
                snippet: c.text || ''
              }))
            }))
          );
        }
      }).catch(console.error);
    }
  }, []);

  // Listen to real-time thought step events
  useEffect(() => {
    if (window.ghostbrain?.onThoughtStep) {
      const unsub = window.ghostbrain.onThoughtStep((step: string) => {
        activeThoughtsRef.current = [...activeThoughtsRef.current, step];
        setMessages((prev) => {
          const lastIdx = prev.map((m) => m.sender).lastIndexOf('assistant');
          if (lastIdx === -1) return prev;
          const updated = [...prev];
          const target = updated[lastIdx];
          const currentThoughts = target.thoughts || [];
          if (!currentThoughts.includes(step)) {
            updated[lastIdx] = {
              ...target,
              thoughts: [...currentThoughts, step]
            };
          }
          return updated;
        });
      });
      return () => unsub?.();
    }
  }, []);

  // Listen to incoming remote messages from web remote
  useEffect(() => {
    if (window.ghostbrain?.onRemoteMessage) {
      const unsub = window.ghostbrain.onRemoteMessage((remoteMsg: any) => {
        if (!remoteMsg || !remoteMsg.id) return;
        setMessages((prev) => {
          if (prev.some((m) => m.id === remoteMsg.id)) return prev;
          return [
            ...prev,
            {
              id: remoteMsg.id,
              sender: remoteMsg.role === 'user' ? 'user' : 'assistant',
              text: remoteMsg.content,
              thoughts: remoteMsg.thoughts,
              sourceDocs: remoteMsg.citations?.map((c: any) => c.relPath || c.docPath),
              chunks: remoteMsg.citations?.map((c: any) => ({
                filename: (c.relPath || c.docPath || 'document').split(/[/\\]/).pop(),
                type: 'document',
                score: Number((c.score || 0).toFixed(3)),
                scoreMetric: `Score: ${(c.score || 0).toFixed(3)}`,
                snippet: c.text || ''
              }))
            }
          ];
        });
      });
      return () => unsub?.();
    }
  }, []);

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  const handleClearHistory = () => {
    if (window.ghostbrain?.clearChatHistory) {
      window.ghostbrain.clearChatHistory().catch(console.error);
    }
    setMessages([]);
  };

  const handleRunPrompt = async (queryText?: string) => {
    const textToSend = typeof queryText === 'string' ? queryText : promptInput;
    if (!textToSend.trim() || isRunning) return;

    const userMsgId = `user-${Date.now()}`;
    const assistantMsgId = `assistant-${Date.now()}`;
    activeThoughtsRef.current = [];

    // Save user message to SQLite immediately
    if (window.ghostbrain?.saveChatMessage) {
      window.ghostbrain.saveChatMessage({
        id: userMsgId,
        role: 'user',
        content: textToSend.trim(),
        createdAt: Date.now()
      }).catch(console.error);
    }

    setMessages((prev) => [
      ...prev,
      {
        id: userMsgId,
        sender: 'user',
        text: textToSend.trim()
      },
      {
        id: assistantMsgId,
        sender: 'assistant',
        text: '',
        thoughts: [],
        chunks: []
      }
    ]);
    setPromptInput('');
    setIsRunning(true);

    const startTime = Date.now();

    // 1. Fetch real hybrid search hits from SQLite FTS5 / 256-dim BLOB Vector Store
    let retrievedChunks: RetrievedChunk[] = [];
    if (window.ghostbrain?.ragSearch || window.ghostbrain?.search) {
      try {
        const rawHits = window.ghostbrain.ragSearch
          ? await window.ghostbrain.ragSearch(textToSend.trim(), 4)
          : await window.ghostbrain.search({ query: textToSend.trim(), limit: 4 });
        const hits = Array.isArray(rawHits) ? rawHits : (rawHits as any)?.hits || [];
        if (hits && hits.length > 0) {
          retrievedChunks = hits.map((h: any) => ({
            filename: (h.docPath || h.relPath || 'document').split(/[/\\]/).pop(),
            type: (h.docPath || h.relPath || '').endsWith('.md') ? 'markdown' : (h.docPath || h.relPath || '').endsWith('.ts') ? 'code' : 'document',
            score: Number((h.rrfScore || 0).toFixed(3)),
            scoreMetric: `RRF Score: ${(h.rrfScore || 0).toFixed(3)}`,
            lineInfo: h.headingPath ? `// Heading: ${h.headingPath}` : `// Document: ${h.docPath || h.relPath}`,
            snippet: (h.text || '').slice(0, 260) + ((h.text || '').length > 260 ? '...' : ''),
            highlightWords: textToSend.trim().split(/\s+/).filter((w: string) => w.length > 2)
          }));

          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === assistantMsgId ? { ...msg, chunks: retrievedChunks, sourceDocs: hits.map((h: any) => h.docPath || h.relPath) } : msg
            )
          );
        }
      } catch (err) {
        console.error('Hybrid search query error:', err);
      }
    }

    // 2. Stream AI response via WorkerManager off-main-thread RAG Worker
    if (window.ghostbrain?.ask) {
      let accumulatedText = '';

      const unsubToken = window.ghostbrain.onChatToken((payload: ChatTokenPayload) => {
        accumulatedText += payload.delta;
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMsgId ? { ...msg, text: accumulatedText } : msg
          )
        );
      });

      const unsubDone = window.ghostbrain.onChatDone((payload: ChatDonePayload) => {
        const elapsed = Date.now() - startTime;
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMsgId
              ? {
                  ...msg,
                  inferenceTime: `${payload.latencyMs || elapsed}ms inference`,
                  sourceDocs: payload.citations?.map((c: any) => c.relPath || c.docPath) || msg.sourceDocs
                }
              : msg
          )
        );
        setIsRunning(false);

        // Persist completed assistant message to SQLite
        if (window.ghostbrain?.saveChatMessage) {
          window.ghostbrain.saveChatMessage({
            id: assistantMsgId,
            role: 'assistant',
            content: accumulatedText,
            thoughts: activeThoughtsRef.current,
            citations: payload.citations,
            createdAt: Date.now()
          }).catch(console.error);
        }

        unsubToken();
        unsubDone();
      });

      try {
        await window.ghostbrain.ask({ query: textToSend.trim() });
      } catch (err: any) {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMsgId
              ? {
                  ...msg,
                  text: accumulatedText || `Engine response: ${err.message || 'Worker processing completed.'}`
                }
              : msg
          )
        );
        setIsRunning(false);
        unsubToken();
        unsubDone();
      }
    } else {
      // Offline fallback when running outside Electron
      setTimeout(() => {
        const fallbackText = retrievedChunks.length > 0
          ? `GhostBrain unified RAG found ${retrievedChunks.length} relevant document context chunk(s) across your watched directories [S1].`
          : `No matching indexed documents were found for "${textToSend.trim()}". Add local folders in the sidebar to enable search with citations.`;

        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMsgId
              ? {
                  ...msg,
                  text: fallbackText,
                  inferenceTime: `${Date.now() - startTime}ms`
                }
              : msg
          )
        );
        setIsRunning(false);
      }, 350);
    }
  };

  return (
    <main
      className="flex-1 flex flex-col bg-white dark:bg-zinc-900/60 overflow-hidden relative transition-colors duration-200 select-none"
      data-purpose="main-chat-viewport"
    >
      {/* Top Context Breadcrumb Bar */}
      <div className="h-9 px-4 border-b border-slate-200 dark:border-zinc-800 flex items-center justify-between text-[11px] font-mono text-slate-500 dark:text-zinc-400 bg-slate-50/50 dark:bg-zinc-950/40 shrink-0">
        <div className="flex items-center space-x-2">
          <Database className="w-3.5 h-3.5 text-cyan-500" />
          <span className="font-semibold text-slate-700 dark:text-zinc-300">Local Hybrid Search &amp; RAG Chat</span>
          <span>•</span>
          <span className="text-[10px]">sqlite-vec + SQLite FTS5 BM25 Fusion</span>
        </div>

        {messages.length > 0 && (
          <button
            type="button"
            onClick={handleClearHistory}
            className="text-[10px] text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 transition cursor-pointer"
          >
            Clear Conversation
          </button>
        )}
      </div>

      {/* Conversation Scrollable Body */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6" data-purpose="conversation-stream">
        {messages.length === 0 ? (
          /* Zero-Data Initial Welcome Slate */
          <div className="h-full min-h-[380px] flex flex-col items-center justify-center text-center max-w-lg mx-auto space-y-4 animate-in fade-in">
            <div className="w-12 h-12 rounded-2xl bg-cyan-50 dark:bg-cyan-950/60 border border-cyan-200 dark:border-cyan-800 flex items-center justify-center text-cyan-600 dark:text-cyan-400 shadow-sm">
              <Sparkles className="w-6 h-6" />
            </div>

            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-zinc-100 font-mono">
                GhostBrain Local Intelligence Ready
              </h2>
              <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1 leading-relaxed">
                Search your local files, retrieve code references, or ask questions with citations. Everything runs 100% on your device with zero cloud telemetry.
              </p>
            </div>

            {/* On-Demand Catalog Onboarding Notice */}
            <div className="w-full p-3.5 rounded-xl border border-cyan-500/40 bg-cyan-950/25 text-left font-mono text-xs space-y-2 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-cyan-300 flex items-center space-x-1.5">
                  <Cpu className="w-3.5 h-3.5 text-cyan-400" />
                  <span>On-Demand Local Model Catalog</span>
                </span>
                <span className="text-[10px] text-cyan-400 bg-cyan-950/80 border border-cyan-800/80 px-1.5 py-0.5 rounded font-semibold">
                  OpenRouter Free Fallback Active
                </span>
              </div>
              <p className="text-[11px] text-slate-300 dark:text-zinc-400 leading-relaxed">
                Zero bloated weights are bundled by default. Fast hybrid SQLite vector search &amp; OpenRouter free recovery are ready. To install the optimal local offline model for your hardware:
              </p>
              <div className="pt-1 flex items-center justify-between text-[10px] text-slate-400 font-bold border-t border-cyan-500/20">
                <span>Navigate to: Settings &rarr; Local LLM &amp; Hardware</span>
                <span className="text-cyan-400 font-semibold">[Install Recommended Model]</span>
              </div>
            </div>

            {/* Quick Starter Chips */}
            <div className="flex flex-col sm:flex-row gap-2 pt-2 w-full">
              {[
                'Search for keyword or code identifier',
                'Summarize my indexed documents',
                'Find recent files in watched folder'
              ].map((starter) => (
                <button
                  key={starter}
                  type="button"
                  onClick={() => handleRunPrompt(starter)}
                  className="flex-1 p-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white/70 dark:bg-zinc-900/50 hover:border-cyan-500 text-[11px] font-mono text-slate-600 dark:text-zinc-300 hover:text-cyan-600 dark:hover:text-cyan-400 transition cursor-pointer text-left shadow-xs flex items-center justify-between group"
                >
                  <span className="truncate pr-1">{starter}</span>
                  <ArrowRight className="w-3 h-3 text-slate-400 group-hover:text-cyan-500 shrink-0" />
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`space-y-3 ${msg.sender === 'user' ? 'text-right' : 'text-left'}`}
              data-purpose={`message-bubble-${msg.id}`}
            >
              {msg.sender === 'user' ? (
                <div className="inline-block bg-cyan-600 text-white px-4 py-2.5 rounded-2xl text-xs font-mono max-w-xl text-left shadow-xs">
                  {msg.text}
                </div>
              ) : (
                <div className="space-y-4 max-w-3xl">
                  {/* Assistant Response Card */}
                  <div className="p-4 rounded-2xl bg-slate-50/80 dark:bg-zinc-900/80 border border-slate-200 dark:border-zinc-800 space-y-3 shadow-xs">
                    <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 dark:text-zinc-500 pb-2 border-b border-slate-100 dark:border-zinc-800/80">
                      <div className="flex items-center space-x-2">
                        <span className="w-2 h-2 rounded-full bg-cyan-500"></span>
                        <span className="font-bold text-slate-700 dark:text-zinc-300">GhostBrain Engine</span>
                        {msg.inferenceTime && <span>• {msg.inferenceTime}</span>}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCopy(msg.id, msg.text)}
                        className="hover:text-slate-700 dark:hover:text-zinc-200 transition cursor-pointer flex items-center space-x-1"
                      >
                        {copiedId === msg.id ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedId === msg.id ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>

                    {/* Collapsible Thinking & Actions Accordion */}
                    {msg.thoughts && msg.thoughts.length > 0 && (
                      <ThinkingAccordion thoughts={msg.thoughts} />
                    )}

                    {/* Text Body */}
                    <div className="text-xs text-slate-800 dark:text-zinc-200 font-mono leading-relaxed whitespace-pre-wrap select-text">
                      {msg.text || (
                        <div className="flex items-center space-x-2 text-slate-400 dark:text-zinc-500 py-1">
                          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping"></span>
                          <span>Streaming local answer...</span>
                        </div>
                      )}
                    </div>

                    {/* Citations / Source Docs Badges */}
                    {msg.sourceDocs && msg.sourceDocs.length > 0 && (
                      <div className="pt-2 border-t border-slate-100 dark:border-zinc-800/80 flex flex-wrap items-center gap-1.5 text-[10px] font-mono">
                        <span className="text-slate-400">Sources:</span>
                        {msg.sourceDocs.map((doc, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => onCitationClick?.(doc)}
                            className="px-2 py-0.5 rounded bg-slate-100 dark:bg-zinc-800 text-cyan-600 dark:text-cyan-400 border border-slate-200 dark:border-zinc-700 hover:border-cyan-500 transition cursor-pointer"
                          >
                            [S{idx + 1}] {doc.split(/[/\\]/).pop()}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Retrieved Chunks Detail Cards */}
                  {msg.chunks && msg.chunks.length > 0 && (
                    <div className="space-y-2 pt-1">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500 font-mono">
                        Retrieved Context Chunks ({msg.chunks.length})
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {msg.chunks.map((chunk, cIdx) => (
                          <div
                            key={cIdx}
                            className="p-3 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 space-y-1.5 shadow-xs"
                          >
                            <div className="flex items-center justify-between text-[10px] font-mono">
                              <span className="font-bold text-slate-800 dark:text-zinc-200 truncate">
                                {chunk.filename}
                              </span>
                              <span className="text-cyan-600 dark:text-cyan-400 font-semibold">
                                {chunk.scoreMetric}
                              </span>
                            </div>
                            {chunk.lineInfo && (
                              <div className="text-[9px] text-slate-400 dark:text-zinc-500 font-mono truncate">
                                {chunk.lineInfo}
                              </div>
                            )}
                            <p className="text-[11px] text-slate-600 dark:text-zinc-400 font-mono leading-relaxed line-clamp-3 select-text">
                              {chunk.snippet}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Bottom Query Bar */}
      <div className="p-3.5 border-t border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/90 shrink-0">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleRunPrompt();
          }}
          className="flex items-center space-x-2"
        >
          <div className="flex-1 relative flex items-center">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
            <input
              type="text"
              value={promptInput}
              onChange={(e) => setPromptInput(e.target.value)}
              placeholder="Ask a question or search indexed files (e.g. 'find api tokens' or 'summarize thesis')..."
              className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-xs text-slate-900 dark:text-zinc-100 font-mono focus:outline-hidden focus:ring-2 focus:ring-cyan-500 placeholder-slate-400 dark:placeholder-zinc-500"
            />
          </div>

          <button
            type="submit"
            disabled={!promptInput.trim() || isRunning}
            className={`px-4 py-2.5 rounded-xl font-bold font-mono text-xs flex items-center space-x-1.5 transition cursor-pointer shrink-0 ${
              !promptInput.trim() || isRunning
                ? 'bg-slate-200 dark:bg-zinc-800 text-slate-400 dark:text-zinc-600 cursor-not-allowed'
                : 'bg-cyan-600 hover:bg-cyan-500 active:bg-cyan-700 text-white shadow-xs'
            }`}
          >
            {isRunning ? (
              <span>Running...</span>
            ) : (
              <>
                <Terminal className="w-3.5 h-3.5" />
                <span>Run</span>
              </>
            )}
          </button>
        </form>
      </div>
    </main>
  );
};
