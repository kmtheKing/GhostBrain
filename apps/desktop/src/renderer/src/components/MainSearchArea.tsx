import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, Search, FileText, Database, Terminal, FileSpreadsheet, X } from 'lucide-react';

interface RetrievedChunk {
  filename: string;
  type: string;
  score: number;
  scoreMetric: string;
  lineInfo?: string;
  snippet: string;
  highlightWords?: string[];
}

interface SheetTable {
  title?: string;
  headers: string[];
  rows: (string | number)[][];
  footer?: string;
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  sourceDocs?: string[];
  chunks?: RetrievedChunk[];
  sheetData?: SheetTable;
  inferenceTime?: string;
}

interface MainSearchAreaProps {
  onCitationClick?: (citation: string) => void;
}

export const MainSearchArea: React.FC<MainSearchAreaProps> = ({ onCitationClick }) => {
  const [promptInput, setPromptInput] = useState('Find my passport file');
  const [isRunning, setIsRunning] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showGuideBanner, setShowGuideBanner] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Full conversation stream
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'msg-1',
      sender: 'user',
      text: 'Find all receipts and organize files',
    },
    {
      id: 'msg-2',
      sender: 'assistant',
      text: 'Extracted receipt records and prepared an automated directory segregation manifest for your uploaded documents. 4 receipt records found and indexed; 1,546 files categorized for organization. [1]',
      inferenceTime: '136ms inference',
      sourceDocs: ['receipts_october_2026.md', 'vault_manifest.json'],
      sheetData: {
        title: 'Extracted Receipts & Expense Ledger Sheet',
        headers: ['Date', 'Vendor / Source', 'Category', 'Amount ($)', 'Source File'],
        rows: [
          ['2026-10-18', 'Cloudflare Workers Tunnel', 'Infrastructure', '$142.50', 'cf_oct_receipt.pdf'],
          ['2026-10-17', 'JetBrains All Products Pack', 'Dev Tools', '$289.00', 'jetbrains_inv_984.pdf'],
          ['2026-10-15', 'Office Depot Ergonomics', 'Hardware', '$64.20', 'depot_scan_1015.jpg'],
          ['2026-10-12', 'Local Datacenter UPS Battery', 'Facility', '$180.00', 'ups_battery_tax.pdf'],
        ],
        footer: 'Total Extracted: $675.70 across 4 validated receipts',
      },
      chunks: [
        {
          filename: 'receipts_october_2026.md',
          type: 'markdown',
          score: 0.96,
          scoreMetric: 'Cosine: 0.04',
          lineInfo: '// Section 2.1: Reimbursable Workstation Operating Ledger',
          snippet:
            '"...validated 4 digital receipts for October 2026 totaling $675.70. Vendor invoices parsed and embedded via sqlite-vec table..."',
          highlightWords: ['October 2026', '$675.70'],
        },
      ],
    },
  ]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isRunning]);

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  const handleClearHistory = () => {
    setMessages([]);
  };

  const handleRunPrompt = (queryText?: string) => {
    const textToSend = typeof queryText === 'string' ? queryText : promptInput;
    if (!textToSend.trim() || isRunning) return;

    const userMsgId = `user-${Date.now()}`;
    const newMessages: ChatMessage[] = [
      ...messages,
      {
        id: userMsgId,
        sender: 'user',
        text: textToSend.trim(),
      },
    ];

    setMessages(newMessages);
    setPromptInput('');
    setIsRunning(true);

    // Simulate local llama.cpp / Gemma-2-2B zero-latency response
    setTimeout(() => {
      let simulatedAnswer = '';
      let chunks: RetrievedChunk[] = [];
      let sheetData: SheetTable | undefined;
      const lower = textToSend.toLowerCase();

      if (lower.includes('passport')) {
        simulatedAnswer =
          'Located identity document in ~/Projects/Docs/passport_scan_verified.pdf (Score: 0.98 | Cosine: 0.02). Extracted metadata: Document Type: US Passport, Holder: Kamal Moayed, Document No: US-98421049, Expiration: 14-AUG-2029. Extracted and secured locally with SQLCipher. [1]';
        chunks = [
          {
            filename: 'passport_scan_verified.pdf',
            type: 'pdf',
            score: 0.98,
            scoreMetric: 'Cosine: 0.02',
            lineInfo: '// OCR Optical Layer & MRZ Hash',
            snippet:
              '"P<USAMOAYED<<KAMAL<<<<<<<<<<<<<<<<<<<<<<<<<<<\n98421049<4USA8804152M2908144<<<<<<<<<<<<<<02"',
            highlightWords: ['MOAYED', '98421049'],
          },
        ];
        sheetData = {
          title: 'Passport Extraction Record',
          headers: ['Field', 'Extracted Value', 'Verification', 'Storage Status'],
          rows: [
            ['Document Type', 'US Passport Book', 'Valid MRZ Checksum', 'SQLCipher Encrypted'],
            ['Full Legal Name', 'Kamal Moayed', 'Match Vault ID', 'Verified'],
            ['Passport Number', '98421049', 'Masked in Log', 'Indexed (Local Only)'],
            ['Expiry Date', '2029-08-14', 'Active (3+ years)', 'Calendar sync ready'],
          ],
        };
      } else if (
        lower.includes('organize') ||
        lower.includes('separate') ||
        lower.includes('images') ||
        lower.includes('documents')
      ) {
        simulatedAnswer =
          'Analyzed 1,546 files across your watched directories (~/Projects/Docs and ~/ObsidianVault). Prepared a directory segregation plan separating visual media assets from text documents and code schemas:';
        sheetData = {
          title: 'Automated Directory Segregation Manifest',
          headers: ['Target Folder', 'File Types Filtered', 'Item Count', 'Total Size', 'Action'],
          rows: [
            ['~/Vault/Documents/', 'PDF, Markdown, DOCX, TXT', '1,124 files', '142.8 MB', 'Ready to move'],
            ['~/Vault/Media_Images/', 'PNG, JPG, HEIC, WEBP, SVG', '382 files', '894.2 MB', 'Ready to move'],
            ['~/Vault/Data_Schemas/', 'SQL, JSON, SQLite DB', '40 files', '48.1 MB', 'Keep in place'],
          ],
          footer: 'Zero cloud upload. All reorganization executed directly on local file system.',
        };
        chunks = [
          {
            filename: 'vault_manifest.json',
            type: 'json',
            score: 0.95,
            scoreMetric: 'FTS5 Match',
            snippet:
              '{\n  "total_items": 1546,\n  "documents": 1124,\n  "images": 382,\n  "schemas": 40,\n  "status": "ready_for_batch_move"\n}',
          },
        ];
      } else if (lower.includes('receipt') || lower.includes('expense') || lower.includes('invoice')) {
        simulatedAnswer =
          'Extracted 4 receipt entries from indexed invoice scans and monthly expense documents. Computed subtotal and verified tax deductibility:';
        sheetData = {
          title: 'Extracted Receipts & Expense Ledger Sheet',
          headers: ['Date', 'Vendor / Source', 'Category', 'Amount ($)', 'Receipt File'],
          rows: [
            ['2026-10-18', 'Cloudflare Workers & Tunnel', 'Infrastructure', '$142.50', 'cf_oct_receipt.pdf'],
            ['2026-10-17', 'JetBrains All Products Pack', 'Dev Tools', '$289.00', 'jetbrains_inv_984.pdf'],
            ['2026-10-15', 'Office Depot Ergonomics', 'Hardware', '$64.20', 'depot_scan_1015.jpg'],
            ['2026-10-12', 'Local Datacenter UPS Battery', 'Facility', '$180.00', 'ups_battery_tax.pdf'],
          ],
          footer: 'Grand Total: $675.70 across 4 validated receipts',
        };
        chunks = [
          {
            filename: 'receipts_october_2026.md',
            type: 'markdown',
            score: 0.97,
            scoreMetric: 'Cosine: 0.03',
            lineInfo: '// Section 2.1: Reimbursable Workstation Operating Ledger',
            snippet:
              '"...validated 4 digital receipts for October 2026 totaling $675.70. Vendor invoices parsed and embedded via sqlite-vec table..."',
          },
        ];
      } else if (lower.includes('today') || lower.includes('new doc') || lower.includes('recent')) {
        simulatedAnswer =
          'Scanned watcher ledger for documents modified or created today (2026-10-18). 3 documents updated with 68 new chunks embedded into SQLite-vec:';
        sheetData = {
          title: "Today's Modified Documents Sheet (2026-10-18)",
          headers: ['Document Name', 'Folder', 'Modified', 'Chunks Added', 'Summary of Changes'],
          rows: [
            ['architecture_spec.md', '~/Projects/Docs', '14:10 PDT', '+42 chunks', 'Redis retry & dead-letter queue'],
            ['meeting_notes_offline.md', '~/ObsidianVault', '11:30 PDT', '+18 chunks', 'HIPAA LAN security audit notes'],
            ['schema_v2.sql', '~/Projects/Docs', '09:45 PDT', '+8 chunks', 'device_tokens DDL with SQLite WAL'],
          ],
          footer: 'All 3 documents indexed with zero latency into local vector embeddings.',
        };
        chunks = [
          {
            filename: 'architecture_spec.md',
            type: 'markdown',
            score: 0.94,
            scoreMetric: 'Cosine: 0.06',
            lineInfo: '// Line 42: Dispatcher queue worker initialization',
            snippet:
              '"...assigned port 6379 to the Redis broker queue. In case of timeout or connection drops, exponential backoff retries max 5 times before emitting a dead-letter payload..."',
          },
        ];
      } else if (lower.includes('sheet') || lower.includes('summary')) {
        simulatedAnswer =
          'Generated executive summary sheet across all 1,546 indexed documents and databases:';
        sheetData = {
          title: 'Workstation Knowledge Summary Sheet',
          headers: ['Domain', 'Primary Source', 'Key Entity Count', 'Integrity Status'],
          rows: [
            ['Architecture & Specs', 'architecture_spec.md', '42 subroutines', 'Verified'],
            ['Database & Schemas', 'schema_v2.sql', '8 virtual tables', 'SQLCipher Active'],
            ['Identity & Credentials', 'passport_scan_verified.pdf', '1 verified ID', 'Encrypted'],
            ['Financials & Receipts', 'receipts_october_2026.md', '4 receipts ($675.70)', 'Reconciled'],
          ],
          footer: '100% on-device local storage. No third-party API exposure.',
        };
      } else {
        simulatedAnswer = `Extracted 1 relevant knowledge chunk from SQLite-vec index for "${textToSend}". In offline workstation mode, all search, extraction, and file summarization run entirely on-device with zero network egress. [1]`;
        chunks = [
          {
            filename: 'architecture_spec.md',
            type: 'markdown',
            score: 0.92,
            scoreMetric: 'Cosine: 0.08',
            lineInfo: '// Section: Local Knowledge Hub',
            snippet: `"...vector search query embeddings generated via all-MiniLM-L6-v2 mapped directly into SQLite-vec memory table for instant offline extraction..."`,
          },
        ];
      }

      setMessages((prev) => [
        ...prev,
        {
          id: `assistant-${Date.now()}`,
          sender: 'assistant',
          text: simulatedAnswer,
          inferenceTime: '138ms inference',
          sourceDocs: chunks.map((c) => c.filename),
          chunks,
          sheetData,
        },
      ]);
      setIsRunning(false);
    }, 450);
  };

  const handleSuggestionClick = (suggestion: string) => {
    setPromptInput(suggestion);
    handleRunPrompt(suggestion);
  };

  return (
    <main
      className="flex-1 flex flex-col bg-white dark:bg-zinc-950/80 overflow-hidden transition-colors duration-200"
      data-purpose="ghostbrain-unified-chatbot"
    >
      {/* 1. Unified ChatBot Header */}
      <div
        className="px-4 py-3 border-b border-slate-200 dark:border-zinc-800 bg-white/70 dark:bg-zinc-900/40 backdrop-blur-md flex items-center justify-between shrink-0"
        data-purpose="chatbot-header"
      >
        <div className="flex items-center space-x-2 font-mono font-bold text-xs text-slate-800 dark:text-zinc-200">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>GhostBrain RAG Assistant</span>
        </div>

        {/* Clear chat affordance */}
        <button
          type="button"
          onClick={handleClearHistory}
          className="text-[10px] font-mono text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 px-2 py-1 rounded hover:bg-slate-100 dark:hover:bg-zinc-800 transition cursor-pointer"
          title="Clear conversation stream"
        >
          [Reset Chat]
        </button>
      </div>

      {/* 2. Unified Scrollable Conversation Stream */}
      <div
        className="flex-1 overflow-y-auto p-4 space-y-4"
        data-purpose="chatbot-message-feed"
      >
        {/* Client Workflow & Capabilities Guide Banner (inside conversation feed so it scrolls up and out of the way) */}
        {showGuideBanner && (
          <div className="p-3.5 rounded-xl bg-cyan-50/70 dark:bg-cyan-950/30 border border-cyan-200/80 dark:border-cyan-800/50 text-xs font-mono transition-all duration-200">
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-bold text-cyan-800 dark:text-cyan-300 flex items-center space-x-1.5 text-xs">
                <span className="w-2 h-2 rounded-full bg-cyan-500"></span>
                <span>Document Search, Extraction &amp; Sheet Generator</span>
              </span>
              <div className="flex items-center space-x-2">
                <span className="text-[10px] text-cyan-700 dark:text-cyan-400 bg-white dark:bg-zinc-900 px-2 py-0.5 rounded border border-cyan-200 dark:border-cyan-800 font-medium">
                  100% Offline Local RAG
                </span>
                <button
                  type="button"
                  onClick={() => setShowGuideBanner(false)}
                  className="w-5 h-5 flex items-center justify-center rounded hover:bg-cyan-100 dark:hover:bg-zinc-800 text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 transition cursor-pointer"
                  title="Dismiss guide"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
            <p className="text-[11px] text-slate-600 dark:text-zinc-300 leading-relaxed mb-2">
              Search across uploaded documents, extract specific information (e.g. passport numbers, receipt totals), organize directories (separate images from documents), and generate structured summary sheets.
            </p>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => handleSuggestionClick('Find my passport file')}
                className="px-2 py-1 rounded-md bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-[10px] text-slate-700 dark:text-zinc-300 hover:border-cyan-400 hover:text-cyan-600 dark:hover:text-cyan-400 transition cursor-pointer"
              >
                Find my passport file
              </button>
              <button
                type="button"
                onClick={() => handleSuggestionClick('Organize files: separate images & documents')}
                className="px-2 py-1 rounded-md bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-[10px] text-slate-700 dark:text-zinc-300 hover:border-cyan-400 hover:text-cyan-600 dark:hover:text-cyan-400 transition cursor-pointer"
              >
                Organize files: separate images &amp; docs
              </button>
              <button
                type="button"
                onClick={() => handleSuggestionClick('Find all receipts & invoices')}
                className="px-2 py-1 rounded-md bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-[10px] text-slate-700 dark:text-zinc-300 hover:border-cyan-400 hover:text-cyan-600 dark:hover:text-cyan-400 transition cursor-pointer"
              >
                Find information with receipts
              </button>
              <button
                type="button"
                onClick={() => handleSuggestionClick("What's today's new document?")}
                className="px-2 py-1 rounded-md bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-[10px] text-slate-700 dark:text-zinc-300 hover:border-cyan-400 hover:text-cyan-600 dark:hover:text-cyan-400 transition cursor-pointer"
              >
                What is today&apos;s new doc?
              </button>
              <button
                type="button"
                onClick={() => handleSuggestionClick('Generate summary sheet of expenses')}
                className="px-2 py-1 rounded-md bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-[10px] text-slate-700 dark:text-zinc-300 hover:border-cyan-400 hover:text-cyan-600 dark:hover:text-cyan-400 transition cursor-pointer"
              >
                Create summary sheet
              </button>
            </div>
          </div>
        )}
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400 dark:text-zinc-500 font-mono space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-zinc-800/60 border border-slate-200 dark:border-zinc-700 flex items-center justify-center text-slate-400">
              <MessageSquare className="w-6 h-6" />
            </div>
            <div className="font-bold text-sm text-slate-700 dark:text-zinc-300">
              GhostBrain Knowledge Assistant
            </div>
            <p className="text-xs max-w-sm text-slate-500 dark:text-zinc-400">
              Search, extract information, locate documents, organize directories, or generate structured summary sheets.
            </p>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col space-y-2 ${
                msg.sender === 'user' ? 'items-end' : 'items-start'
              }`}
            >
              {msg.sender === 'user' ? (
                /* User Message Bubble */
                <div className="max-w-[85%] rounded-2xl rounded-tr-sm bg-cyan-600 text-white p-3.5 shadow-sm font-mono text-xs md:text-sm">
                  <div className="text-[10px] text-cyan-200 font-bold uppercase tracking-wider mb-1 flex items-center space-x-1">
                    <span>Query:</span>
                  </div>
                  <div className="font-medium whitespace-pre-wrap">{msg.text}</div>
                </div>
              ) : (
                /* Assistant Message Box with Grounded Context & Sheets */
                <div className="w-full max-w-[95%] rounded-2xl rounded-tl-sm bg-slate-50 dark:bg-zinc-900/60 border border-slate-200 dark:border-zinc-800 p-4 shadow-sm font-mono text-xs md:text-sm space-y-3 transition">
                  {/* Header Row */}
                  <div className="flex items-center justify-between text-xs border-b border-slate-200/80 dark:border-zinc-800/80 pb-2">
                    <div className="flex items-center space-x-2">
                      <span className="text-purple-600 dark:text-purple-400 font-bold">GhostBrain:</span>
                      {msg.inferenceTime && (
                        <span className="text-[10px] text-slate-400 dark:text-zinc-500">
                          {msg.inferenceTime}
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopy(msg.id, msg.text)}
                      className="text-[10px] text-slate-400 hover:text-cyan-600 dark:hover:text-cyan-400 transition cursor-pointer"
                    >
                      {copiedId === msg.id ? 'Copied' : 'Copy'}
                    </button>
                  </div>

                  {/* Assistant Text Answer */}
                  <div className="text-slate-800 dark:text-zinc-200 leading-relaxed whitespace-pre-line">
                    {msg.text.includes('architecture_spec.md') ? (
                      <span>
                        In{' '}
                        <button
                          type="button"
                          onClick={() => onCitationClick?.('architecture_spec.md')}
                          className="text-cyan-700 dark:text-cyan-300 underline font-semibold cursor-pointer"
                        >
                          architecture_spec.md
                        </button>
                        , Redis handles deferred tasks with an exponential backoff retry mechanism (max 5 attempts). If connection exhaustion occurs on port 6379, unhandled payloads shift into a dead-letter state rather than terminating the worker pipeline.
                        <button
                          type="button"
                          onClick={() => onCitationClick?.('architecture_spec.md')}
                          className="inline-flex items-center px-1.5 py-0.5 ml-1 rounded bg-slate-100 dark:bg-zinc-800 text-[10px] text-cyan-700 dark:text-cyan-400 border border-slate-200 dark:border-zinc-700 cursor-pointer hover:bg-slate-200 dark:hover:bg-zinc-700 font-medium"
                          title="Source citation: architecture_spec.md"
                        >
                          [1]
                        </button>
                      </span>
                    ) : (
                      <span>{msg.text}</span>
                    )}
                  </div>

                  {/* Structured Sheet / Spreadsheet Table (if generated) */}
                  {msg.sheetData && (
                    <div className="pt-2">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400 mb-1.5 flex items-center space-x-1.5">
                        <FileSpreadsheet className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                        <span>{msg.sheetData.title || 'Summary Sheet'}</span>
                      </div>
                      <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-zinc-800 shadow-2xs">
                        <table className="w-full text-left text-xs font-mono">
                          <thead className="bg-slate-100/80 dark:bg-zinc-800/80 text-[10px] uppercase text-slate-600 dark:text-zinc-400 border-b border-slate-200 dark:border-zinc-800">
                            <tr>
                              {msg.sheetData.headers.map((h, hIdx) => (
                                <th key={hIdx} className="px-3 py-2 font-semibold">
                                  {h}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-zinc-800/60 bg-white dark:bg-zinc-950/40">
                            {msg.sheetData.rows.map((row, rIdx) => (
                              <tr key={rIdx} className="hover:bg-slate-50 dark:hover:bg-zinc-900/50 transition">
                                {row.map((cell, cIdx) => (
                                  <td
                                    key={cIdx}
                                    className="px-3 py-2 whitespace-nowrap text-slate-700 dark:text-zinc-300"
                                  >
                                    {cell}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                          {msg.sheetData.footer && (
                            <tfoot className="bg-slate-50 dark:bg-zinc-900/60 border-t border-slate-200 dark:border-zinc-800 text-[11px] font-semibold text-slate-700 dark:text-zinc-300">
                              <tr>
                                <td
                                  colSpan={msg.sheetData.headers.length}
                                  className="px-3 py-2 text-right text-cyan-700 dark:text-cyan-400"
                                >
                                  {msg.sheetData.footer}
                                </td>
                              </tr>
                            </tfoot>
                          )}
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Grounded Retrieval Chunk Cards (Retrieved Knowledge) */}
                  {msg.chunks && msg.chunks.length > 0 && (
                    <div className="space-y-2 pt-2 border-t border-slate-200/60 dark:border-zinc-800/60">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400 flex items-center space-x-1.5">
                        <Search className="w-3 h-3 text-cyan-600 dark:text-cyan-400" />
                        <span>Retrieved Knowledge Chunk ({msg.chunks.length})</span>
                      </div>

                      <div className="space-y-2">
                        {msg.chunks.map((chunk, cIdx) => (
                          <div
                            key={cIdx}
                            className="bg-white dark:bg-black/60 rounded-xl p-3 border border-slate-200 dark:border-zinc-800/80 shadow-xs"
                          >
                            <div className="flex items-center justify-between text-xs mb-1.5">
                              <div className="flex items-center space-x-2">
                                <span className="text-cyan-700 dark:text-cyan-400 font-bold flex items-center space-x-1.5">
                                  {chunk.type === 'sqlite' ? (
                                    <Database className="w-3.5 h-3.5 text-blue-500" />
                                  ) : (
                                    <FileText className="w-3.5 h-3.5 text-cyan-500" />
                                  )}
                                  <span>{chunk.filename}</span>
                                </span>
                                <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 border border-slate-200 dark:border-zinc-700 font-medium">
                                  {chunk.type}
                                </span>
                              </div>
                              <div className="flex items-center space-x-1 text-[10px] font-mono">
                                <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                                  Score: {chunk.score.toFixed(2)}
                                </span>
                                <span className="text-slate-300 dark:text-zinc-600">|</span>
                                <span className="text-slate-400 dark:text-zinc-400">{chunk.scoreMetric}</span>
                              </div>
                            </div>

                            {chunk.lineInfo && (
                              <p className="text-[11px] text-slate-400 dark:text-zinc-400 mb-1">
                                {chunk.lineInfo}
                              </p>
                            )}

                            <div className="text-xs text-slate-700 dark:text-zinc-300 leading-relaxed overflow-x-auto font-mono bg-slate-50/50 dark:bg-zinc-950/50 p-2 rounded-lg border border-slate-100 dark:border-zinc-800/60 whitespace-pre-wrap">
                              {chunk.snippet}
                            </div>
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

        {/* Streaming Thinking State */}
        {isRunning && (
          <div className="flex items-center space-x-2 text-xs font-mono text-slate-500 dark:text-zinc-400 bg-slate-50 dark:bg-zinc-900/60 p-3 rounded-xl border border-slate-200 dark:border-zinc-800 w-fit">
            <span className="w-2 h-2 rounded-full bg-cyan-500 animate-ping"></span>
            <span className="italic">Gemma-2-2B extracting context &amp; generating sheet...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* 3. Unified Bottom Chat Input Dock */}
      <div
        className="p-3.5 border-t border-slate-200 dark:border-zinc-800 bg-slate-50/70 dark:bg-zinc-950 shrink-0 space-y-2.5 transition-colors duration-200"
        data-purpose="chatbot-input-dock"
      >
        {/* Quick Suggestion Chips */}
        <div className="flex items-center space-x-1.5 overflow-x-auto text-[11px] font-mono no-scrollbar pb-0.5">
          <span className="text-slate-400 text-[10px] shrink-0 font-medium">Suggestions:</span>
          {[
            'Find my passport file',
            'Organize files: separate images & documents',
            'Find all receipts & invoices',
            "What's today's new doc?",
            'Generate summary sheet of expenses',
          ].map((prompt, pIdx) => (
            <button
              key={pIdx}
              type="button"
              onClick={() => handleSuggestionClick(prompt)}
              className="px-2.5 py-0.5 rounded-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-600 dark:text-zinc-400 hover:text-cyan-700 dark:hover:text-cyan-300 hover:border-cyan-400/60 transition cursor-pointer shrink-0 shadow-2xs"
            >
              {prompt}
            </button>
          ))}
        </div>

        {/* Input Form */}
        <form
          className="flex items-center space-x-2"
          onSubmit={(e) => {
            e.preventDefault();
            handleRunPrompt();
          }}
        >
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Terminal className="w-3.5 h-3.5" />
            </div>
            <input
              type="text"
              value={promptInput}
              onChange={(e) => setPromptInput(e.target.value)}
              placeholder="e.g. Find my passport, organize images & documents, find all receipts..."
              className="w-full bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 rounded-xl pl-9 pr-14 py-2.5 text-xs md:text-sm text-slate-900 dark:text-zinc-100 placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 font-mono shadow-inner transition"
            />
            <div className="absolute inset-y-0 right-0 pr-2.5 flex items-center pointer-events-none">
              <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded text-slate-400 dark:text-zinc-400">
                Enter
              </kbd>
            </div>
          </div>

          {/* Run / Send Button */}
          <button
            type="submit"
            disabled={isRunning || !promptInput.trim()}
            className="px-5 py-2.5 bg-cyan-600 hover:bg-cyan-500 active:bg-cyan-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-mono font-semibold rounded-xl text-xs md:text-sm flex items-center justify-center shadow-sm hover:shadow-md hover:shadow-cyan-500/20 active:scale-95 transition-all duration-150 cursor-pointer shrink-0 border border-cyan-500/40"
            data-purpose="execute-run-btn"
          >
            <span>{isRunning ? 'Running...' : 'Run'}</span>
          </button>
        </form>
      </div>
    </main>
  );
};
