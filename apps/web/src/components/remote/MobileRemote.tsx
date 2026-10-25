import React, { useState } from 'react';
import { 
  Laptop, 
  Cpu, 
  Send, 
  FileText, 
  LogOut, 
  Sparkles, 
  Lock,
  ChevronRight,
  Wifi,
  Brain
} from 'lucide-react';
import { useRelayClient } from '../../hooks/useRelayClient';

export const MobileRemote: React.FC<{ onOpenConnectModal: () => void }> = ({ onOpenConnectModal }) => {
  const [isPaired, setIsPaired] = useState<boolean>(() => {
    return !!localStorage.getItem('ghostbrain_paired_token');
  });

  const [hostAlias, setHostAlias] = useState<string>(() => {
    return localStorage.getItem('ghostbrain_host_alias') || 'Desktop Host';
  });

  const [inputQuery, setInputQuery] = useState('');
  const [isEcoMode, setIsEcoMode] = useState(false);

  const {
    status,
    error,
    isStreaming,
    streamedAnswer,
    streamedThoughts,
    citations,
    telemetry,
    timeline,
    sendQuery,
    disconnect
  } = useRelayClient({
    autoConnect: isPaired
  });

  const handleSend = async () => {
    if (!inputQuery.trim() || isStreaming) return;
    const q = inputQuery.trim();
    setInputQuery('');
    try {
      await sendQuery(q);
    } catch (err: any) {
      console.error('[MobileRemote] Send query failed:', err);
    }
  };

  const handleDisconnect = () => {
    disconnect();
    localStorage.removeItem('ghostbrain_paired_token');
    localStorage.removeItem('ghostbrain_pairing_code');
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

  const hostRamUsedGB = telemetry ? (telemetry.usedRamMB / 1024).toFixed(1) : '4.8';
  const hostRamTotalGB = telemetry ? (telemetry.totalRamMB / 1024).toFixed(1) : '16.0';
  const activeModelDisplay = telemetry?.activeModel || 'Qwen 2.5 / Gemma Local';

  return (
    <section className="relative z-10 w-full max-w-2xl mx-auto px-3 sm:px-4 py-8 space-y-4 animate-in fade-in select-none">
      {/* 1. Mirrored Host Telemetry Card */}
      <div className="p-4 rounded-2xl bg-[#0d0d12] border border-[#e5b364]/30 shadow-xl space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                status === 'connected'
                  ? 'bg-emerald-500 animate-pulse'
                  : status === 'connecting' || status === 'handshaking'
                  ? 'bg-amber-500 animate-pulse'
                  : 'bg-red-500'
              }`}
            ></span>
            <span className="text-xs font-mono font-bold text-[#f0ebe1] flex items-center space-x-1">
              <Laptop className="w-3.5 h-3.5 text-[#e5b364]" />
              <span>{hostAlias}</span>
            </span>
            <span className="text-[10px] font-mono text-[#8e887d] px-1.5 py-0.5 rounded bg-white/5 border border-white/5">
              {status === 'connected' ? 'E2E P2P Live' : status.toUpperCase()}
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
            <span className="text-[#e5b364] font-bold truncate block">{activeModelDisplay}</span>
          </div>
          <div className="p-2 rounded-lg bg-black/40 border border-white/5">
            <span className="text-[#8e887d] block text-[9px] uppercase">Host RAM</span>
            <span className="text-[#f0ebe1] font-bold block">{hostRamUsedGB} / {hostRamTotalGB} GB</span>
          </div>
          <div className="p-2 rounded-lg bg-black/40 border border-white/5">
            <span className="text-[#8e887d] block text-[9px] uppercase">Tunnel Status</span>
            <span className="text-emerald-400 font-bold block flex items-center space-x-1">
              <Wifi className="w-3 h-3 inline mr-1" />
              <span>{status === 'connected' ? 'Encrypted' : status}</span>
            </span>
          </div>
        </div>
      </div>

      {/* 2. Messages Stream View - Hydrated from SQLite Continuous Timeline */}
      <div className="p-4 rounded-2xl bg-[#0d0d12]/90 border border-white/10 min-h-[380px] max-h-[520px] overflow-y-auto space-y-4">
        {timeline.length === 0 && !isStreaming && (
          <div className="text-center py-12 space-y-2 text-[#8e887d]">
            <Brain className="w-8 h-8 mx-auto text-[#e5b364]/50" />
            <p className="text-xs font-mono">Continuous desktop chat timeline synced.</p>
            <p className="text-[11px]">Ask anything to search local files or converse with your offline LLM.</p>
          </div>
        )}

        {timeline.map((m) => (
          <div
            key={m.id}
            className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}
          >
            <div
              className={`max-w-[88%] p-3.5 rounded-2xl text-xs leading-relaxed ${
                m.role === 'user'
                  ? 'bg-[#e5b364] text-[#060608] font-medium rounded-br-none'
                  : 'bg-black/60 border border-white/10 text-[#f0ebe1] rounded-bl-none'
              }`}
            >
              {/* Thoughts accordion */}
              {m.thoughts && m.thoughts.length > 0 && (
                <div className="mb-2 p-2 rounded-lg bg-white/5 border border-white/5 text-[10px] font-mono text-zinc-400 space-y-1">
                  <div className="font-semibold text-[#e5b364] flex items-center space-x-1">
                    <Sparkles className="w-3 h-3" />
                    <span>Thought Process</span>
                  </div>
                  {m.thoughts.map((t, idx) => (
                    <div key={idx} className="text-zinc-300">
                      {t}
                    </div>
                  ))}
                </div>
              )}

              <div className="whitespace-pre-wrap">{m.content}</div>

              {/* Citations Snippets */}
              {m.citations && m.citations.length > 0 && (
                <div className="mt-3 pt-2 border-t border-white/10 space-y-1.5">
                  <div className="text-[10px] font-mono uppercase text-[#e5b364] font-bold flex items-center space-x-1">
                    <FileText className="w-3 h-3" />
                    <span>Cited Desktop Sources</span>
                  </div>
                  {m.citations.map((c, i) => (
                    <div
                      key={i}
                      className="text-[10px] font-mono p-1.5 rounded bg-white/5 text-[#8e887d] flex items-center justify-between"
                    >
                      <span className="text-[#e5b364] font-bold">[{c.label}]</span>
                      <span className="truncate max-w-[200px] text-[#f0ebe1]">{c.file}</span>
                      <span>{c.line ? `L${c.line}` : (c.headingPath || 'Section')}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <span className="text-[9px] font-mono text-[#8e887d] mt-1 px-1">
              {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        ))}

        {isStreaming && (
          <div className="flex flex-col items-start space-y-2 animate-in fade-in">
            {streamedThoughts.length > 0 && (
              <div className="p-2 rounded-lg bg-white/5 border border-white/5 text-[10px] font-mono text-zinc-400 space-y-0.5">
                <div className="font-semibold text-[#e5b364] flex items-center space-x-1">
                  <Sparkles className="w-3 h-3" />
                  <span>Thinking...</span>
                </div>
                {streamedThoughts.map((t, idx) => (
                  <div key={idx}>{t}</div>
                ))}
              </div>
            )}

            <div className="max-w-[88%] p-3.5 rounded-2xl text-xs leading-relaxed bg-black/60 border border-white/10 text-[#f0ebe1] rounded-bl-none">
              {streamedAnswer ? (
                <span className="whitespace-pre-wrap">{streamedAnswer}</span>
              ) : (
                <div className="flex items-center space-x-2 text-xs font-mono text-[#e5b364] animate-pulse">
                  <Sparkles className="w-4 h-4" />
                  <span>Streaming response from desktop host...</span>
                </div>
              )}
            </div>
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
          disabled={!inputQuery.trim() || isStreaming || status !== 'connected'}
          className="p-2.5 rounded-xl bg-[#e5b364] hover:bg-[#d4a253] text-[#060608] disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer"
          title={status !== 'connected' ? 'Waiting for tunnel connection...' : 'Send Query'}
        >
          <Send className="w-4 h-4" />
        </button>
      </div>

      {error && (
        <div className="text-center text-xs font-mono text-amber-400 bg-amber-950/40 p-2 rounded-xl border border-amber-800/40">
          {error}
        </div>
      )}
    </section>
  );
};
