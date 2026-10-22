import React, { useState, useEffect } from 'react';
import { 
  Laptop, 
  Cpu, 
  HardDrive, 
  Activity, 
  Send, 
  FileText, 
  CheckCircle2, 
  ShieldCheck, 
  History, 
  SlidersHorizontal, 
  RefreshCw, 
  LogOut, 
  Folder, 
  Sparkles, 
  Lock,
  ChevronRight
} from 'lucide-react';

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  citations?: Array<{ label: string; file: string; line: number }>;
}

export const MobileRemote: React.FC<{ onOpenConnectModal: () => void }> = ({ onOpenConnectModal }) => {
  const [isPaired, setIsPaired] = useState<boolean>(() => {
    return !!localStorage.getItem('ghostbrain_paired_token');
  });

  const [hostAlias, setHostAlias] = useState<string>(() => {
    return localStorage.getItem('ghostbrain_host_alias') || 'Primary Workstation';
  });

  const [inputQuery, setInputQuery] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [isEcoMode, setIsEcoMode] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'm1',
      sender: 'assistant',
      text: 'GhostBrain Desktop Host connected via encrypted P2P tunnel. All computations, search indexing, and LLM inferences run directly on your home PC.',
      timestamp: 'Just now'
    }
  ]);

  const handleSend = () => {
    if (!inputQuery.trim() || isStreaming) return;
    const q = inputQuery.trim();
    setInputQuery('');

    const userMsg: ChatMessage = {
      id: 'usr_' + Date.now(),
      sender: 'user',
      text: q,
      timestamp: 'Now'
    };
    setMessages((prev) => [...prev, userMsg]);
    setIsStreaming(true);

    // Simulate remote streaming response from desktop's local LLM
    setTimeout(() => {
      const assistantMsg: ChatMessage = {
        id: 'ast_' + Date.now(),
        sender: 'assistant',
        text: `Based on your indexed desktop files, Section 14.2 of the Master Service Agreement specifies that indemnification covers third-party intellectual property claims provided written notice is delivered within 30 days. No cloud servers were contacted.`,
        timestamp: 'Just now',
        citations: [
          { label: 'S1', file: 'Contracts/2026/TechCorp_Apex_MSA_v3.pdf', line: 184 },
          { label: 'S2', file: 'Corporate/Governance/Exec_NDA_Covenant.docx', line: 62 }
        ]
      };
      setMessages((prev) => [...prev, assistantMsg]);
      setIsStreaming(false);
    }, 1100);
  };

  const handleDisconnect = () => {
    localStorage.removeItem('ghostbrain_paired_token');
    localStorage.removeItem('ghostbrain_host_alias');
    setIsPaired(false);
  };

  if (!isPaired) {
    return (
      <section className="relative z-10 w-full max-w-lg mx-auto px-4 py-20 animate-in fade-in select-none text-center space-y-6">
        <div className="p-8 rounded-3xl bg-[#0d0d12] border border-[#e5b364]/30 shadow-2xl space-y-5">
          <div className="w-16 h-16 rounded-2xl bg-[#e5b364]/10 border border-[#e5b364]/30 flex items-center justify-center mx-auto text-[#e5b364]">
            <Laptop className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <h3 className="text-2xl font-serif font-bold text-[#f0ebe1]">
              Pair Your Mobile Remote
            </h3>
            <p className="text-xs text-[#8e887d] leading-relaxed">
              Command your home desktop from any mobile browser. Your computer executes all searches and AI inferences with zero cloud leaks.
            </p>
          </div>

          <button
            onClick={onOpenConnectModal}
            className="w-full py-3.5 rounded-xl bg-[#e5b364] hover:bg-[#d4a253] text-[#060608] font-mono text-xs font-bold transition shadow-lg shadow-[#e5b364]/20 cursor-pointer flex items-center justify-center space-x-2"
          >
            <span>Scan Desktop QR or Enter OTP Code</span>
            <ChevronRight className="w-4 h-4" />
          </button>

          <div className="pt-2 border-t border-white/5 text-[11px] font-mono text-[#8e887d] flex items-center justify-center space-x-1.5">
            <Lock className="w-3.5 h-3.5 text-[#e5b364]" />
            <span>End-to-End Encrypted Handshake</span>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="relative z-10 w-full max-w-2xl mx-auto px-3 sm:px-4 py-8 space-y-4 animate-in fade-in select-none">
      {/* 1. Mirrored Host Telemetry Card */}
      <div className="p-4 rounded-2xl bg-[#0d0d12] border border-[#e5b364]/30 shadow-xl space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-xs font-mono font-bold text-[#f0ebe1] flex items-center space-x-1">
              <Laptop className="w-3.5 h-3.5 text-[#e5b364]" />
              <span>{hostAlias}</span>
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setIsEcoMode(!isEcoMode)}
              className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold transition cursor-pointer flex items-center space-x-1 ${
                isEcoMode
                  ? 'bg-amber-950/80 text-amber-300 border border-amber-800'
                  : 'bg-white/5 text-[#8e887d] border border-white/10 hover:text-[#f0ebe1]'
              }`}
              title="Toggle Low-Capacity / Eco Silent Mode"
            >
              <Cpu className="w-3 h-3" />
              <span>{isEcoMode ? 'Eco Mode ON' : 'Eco Mode OFF'}</span>
            </button>

            <button
              onClick={handleDisconnect}
              className="p-1 rounded-lg text-[#8e887d] hover:text-red-400 hover:bg-white/5 transition cursor-pointer"
              title="Disconnect Remote"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Telemetry Metrics */}
        <div className="grid grid-cols-3 gap-2 text-[10px] font-mono text-[#8e887d] pt-1 border-t border-white/5">
          <div className="p-2 rounded-lg bg-black/40 border border-white/5">
            <span className="text-[#8e887d] block text-[9px] uppercase">Engine</span>
            <span className="text-[#e5b364] font-bold">Llama 3.2 3B</span>
          </div>
          <div className="p-2 rounded-lg bg-black/40 border border-white/5">
            <span className="text-[#8e887d] block text-[9px] uppercase">Host RAM</span>
            <span className="text-[#f0ebe1] font-bold">4.8 GB In Use</span>
          </div>
          <div className="p-2 rounded-lg bg-black/40 border border-white/5">
            <span className="text-[#8e887d] block text-[9px] uppercase">Ping Latency</span>
            <span className="text-emerald-400 font-bold">18 ms (Relay)</span>
          </div>
        </div>
      </div>

      {/* 2. Messages Stream View */}
      <div className="p-4 rounded-2xl bg-[#0d0d12]/90 border border-white/10 min-h-[380px] max-h-[520px] overflow-y-auto space-y-4">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex flex-col ${m.sender === 'user' ? 'items-end' : 'items-start'}`}
          >
            <div
              className={`max-w-[88%] p-3.5 rounded-2xl text-xs leading-relaxed ${
                m.sender === 'user'
                  ? 'bg-[#e5b364] text-[#060608] font-medium rounded-br-none'
                  : 'bg-black/60 border border-white/10 text-[#f0ebe1] rounded-bl-none'
              }`}
            >
              {m.text}

              {/* Citations Snippets */}
              {m.citations && (
                <div className="mt-3 pt-2 border-t border-white/10 space-y-1.5">
                  <div className="text-[10px] font-mono uppercase text-[#e5b364] font-bold flex items-center space-x-1">
                    <FileText className="w-3 h-3" />
                    <span>Cited Desktop Sources</span>
                  </div>
                  {m.citations.map((c) => (
                    <div
                      key={c.label}
                      className="text-[10px] font-mono p-1.5 rounded bg-white/5 text-[#8e887d] flex items-center justify-between"
                    >
                      <span className="text-[#e5b364] font-bold">[{c.label}]</span>
                      <span className="truncate max-w-[180px] text-[#f0ebe1]">{c.file}</span>
                      <span>L{c.line}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <span className="text-[9px] font-mono text-[#8e887d] mt-1 px-1">{m.timestamp}</span>
          </div>
        ))}

        {isStreaming && (
          <div className="flex items-center space-x-2 text-xs font-mono text-[#e5b364] animate-pulse">
            <Sparkles className="w-4 h-4" />
            <span>Streaming answer from desktop local LLM...</span>
          </div>
        )}
      </div>

      {/* 3. Input Query Bar */}
      <div className="p-2 rounded-2xl bg-[#0d0d12] border border-[#e5b364]/30 flex items-center space-x-2 shadow-lg">
        <input
          type="text"
          value={inputQuery}
          onChange={(e) => setInputQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Ask your home desktop anything..."
          className="flex-1 bg-transparent px-3 py-2 text-xs font-mono text-[#f0ebe1] placeholder-[#8e887d] focus:outline-none"
        />
        <button
          onClick={handleSend}
          disabled={!inputQuery.trim() || isStreaming}
          className="p-2.5 rounded-xl bg-[#e5b364] hover:bg-[#d4a253] text-[#060608] disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </section>
  );
};
