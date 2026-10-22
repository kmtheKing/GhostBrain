import React, { useState } from 'react';
import { 
  Shield, 
  Zap, 
  Lock, 
  Cpu, 
  HardDrive, 
  Sliders, 
  ArrowRight, 
  CheckCircle2, 
  XCircle, 
  Download, 
  Smartphone, 
  Laptop, 
  Scale, 
  Stethoscope, 
  Code2, 
  DollarSign, 
  Check, 
  ChevronRight,
  Terminal,
  Search,
  Sparkles,
  Command,
  FileText,
  Clock,
  Layers,
  Activity
} from 'lucide-react';

interface LandingPageProps {
  onOpenDemo: () => void;
  onOpenRemote: () => void;
  onOpenConnectModal: () => void;
}

interface SimulatedResult {
  query: string;
  source: string;
  line: number;
  snippet: string;
  answer: string;
  timeMs: number;
}

const SAMPLE_QUERIES: Record<string, SimulatedResult> = {
  'indemnification': {
    query: 'Find indemnification & IP liability terms',
    source: 'Contracts/2026/TechCorp_Apex_MSA_v3.pdf',
    line: 184,
    snippet: 'Section 14.2: Provider shall defend, indemnify, and hold harmless Client against third-party claims arising from IP infringement...',
    answer: 'Provider indemnifies client for IP infringement and gross negligence with 30-day written notice requirement.',
    timeMs: 1.8
  },
  'mri': {
    query: 'Patient MRI lumbar spine impression',
    source: 'Clinical_Records/Patients/2026-PT-4091_Neuro.pdf',
    line: 47,
    snippet: 'Impression: Mild L4-L5 disc protrusion without significant thecal sac effacement. Patient reports bilateral radicular pain...',
    answer: 'Mild L4-L5 protrusion detected. Recommended 6 weeks conservative physical therapy before surgical consultation.',
    timeMs: 2.1
  },
  'rrf': {
    query: 'Reciprocal Rank Fusion equation & parameters',
    source: 'Architecture/RFC_04_Hybrid_RRF_Ranking.md',
    line: 95,
    snippet: 'RRF_Score(d) = sum(1 / (k + rank_bm25(d))) + sum(1 / (k + rank_vec(d))) where k = 60...',
    answer: 'RRF merges BM25 lexical hits and dense vector similarity scores using constant k=60 to eliminate score normalization skew.',
    timeMs: 1.6
  },
  'depreciation': {
    query: 'MACRS server hardware deduction schedule',
    source: 'Finance/Audits/2026_Q3_Tax_Depreciation.xlsx',
    line: 214,
    snippet: 'Line 214: Modified Accelerated Cost Recovery System (MACRS) 5-year hardware property deduction totaling $184,500...',
    answer: '5-year MACRS schedule applied to computer hardware property with half-year convention under Section 179 limits.',
    timeMs: 1.9
  }
};

export const LandingPage: React.FC<LandingPageProps> = ({
  onOpenDemo,
  onOpenRemote,
  onOpenConnectModal
}) => {
  const [activeQueryKey, setActiveQueryKey] = useState<string>('indemnification');
  const [ramSliderGB, setRamSliderGB] = useState<number>(3.5);
  const [ecoModeActive, setEcoModeActive] = useState<boolean>(false);

  const currentResult = SAMPLE_QUERIES[activeQueryKey];

  return (
    <div className="relative z-10 w-full max-w-6xl mx-auto px-4 sm:px-6 py-12 sm:py-20 space-y-32 select-none">
      
      {/* 1. HERO SECTION (Linear / Raycast Style with Interactive Working Simulator) */}
      <section className="text-center space-y-7 pt-4 sm:pt-10">
        
        {/* Release Pill */}
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-white/[0.05] border border-white/[0.08] text-xs font-mono text-zinc-300">
          <span className="w-1.5 h-1.5 rounded-full bg-[#e5b364] animate-pulse" />
          <span className="font-semibold text-white">GhostBrain Desktop v0.0.1</span>
          <span className="text-zinc-600">/</span>
          <span className="text-[#e5b364]">100% Sovereign AI Second Brain</span>
        </div>

        {/* High-Confidence Headline */}
        <h1 className="text-4xl sm:text-6xl md:text-7xl font-sans font-bold tracking-tight text-white max-w-4xl mx-auto leading-[1.08]">
          Your Private AI Second Brain. <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#e5b364] via-[#f7d59b] to-[#e5b364]">
            100% Local. Zero Cloud Leaks.
          </span>
        </h1>

        {/* Crisp Value Subtitle */}
        <p className="text-base sm:text-lg text-zinc-400 max-w-2xl mx-auto leading-relaxed">
          Index thousands of confidential documents in seconds. Query open-weights local models (Gemma, Llama, Qwen) with mathematical line citations, and mirror your workstation securely from your phone.
        </p>

        {/* Primary CTAs */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <a
            href="#download"
            className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-[#e5b364] hover:bg-[#d4a253] text-[#08080a] font-mono text-xs font-bold transition shadow-lg shadow-[#e5b364]/20 flex items-center justify-center space-x-2 cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Download for Windows (.exe)</span>
          </a>

          <button
            onClick={onOpenConnectModal}
            className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.12] text-white font-mono text-xs font-semibold transition flex items-center justify-center space-x-2 cursor-pointer hover:border-[#e5b364]/40"
          >
            <Smartphone className="w-4 h-4 text-[#e5b364]" />
            <span>Link Mobile Remote</span>
          </button>
        </div>

        {/* Trust Points */}
        <div className="pt-2 flex flex-wrap items-center justify-center gap-6 text-xs font-mono text-zinc-500">
          <span className="flex items-center space-x-1.5">
            <Check className="w-3.5 h-3.5 text-[#e5b364]" />
            <span>100% Air-Gap Capable</span>
          </span>
          <span className="flex items-center space-x-1.5">
            <Check className="w-3.5 h-3.5 text-[#e5b364]" />
            <span>Zero Subscription Per-Token Tolls</span>
          </span>
          <span className="flex items-center space-x-1.5">
            <Check className="w-3.5 h-3.5 text-[#e5b364]" />
            <span>Strict Line Citations [S1], [S2]</span>
          </span>
        </div>

        {/* 2. THE HERO INTERACTIVE COMMAND-K SIMULATOR (Raycast / Cursor Style) */}
        <div className="pt-8 max-w-3xl mx-auto text-left">
          <div className="rounded-2xl bg-[#0d0d12] border border-white/[0.12] shadow-2xl shadow-black/80 overflow-hidden space-y-0">
            
            {/* Command Input Bar */}
            <div className="p-4 bg-zinc-900/60 border-b border-white/[0.08] flex items-center space-x-3">
              <Command className="w-4 h-4 text-[#e5b364] shrink-0" />
              <input
                type="text"
                readOnly
                value={currentResult.query}
                className="w-full bg-transparent text-sm font-mono text-white placeholder-zinc-500 focus:outline-none"
              />
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-400 border border-emerald-800/80 shrink-0">
                {currentResult.timeMs} ms LATENCY
              </span>
            </div>

            {/* Suggested Query Chips */}
            <div className="px-4 py-2.5 bg-zinc-950/40 border-b border-white/[0.06] flex flex-wrap items-center gap-2 text-xs font-mono">
              <span className="text-zinc-500">Try real query:</span>
              {[
                { key: 'indemnification', label: 'Legal Contract' },
                { key: 'mri', label: 'Clinical Health' },
                { key: 'rrf', label: 'Engine Spec' },
                { key: 'depreciation', label: 'Finance MACRS' }
              ].map((item) => (
                <button
                  key={item.key}
                  onClick={() => setActiveQueryKey(item.key)}
                  className={`px-2.5 py-1 rounded-lg text-xs transition cursor-pointer ${
                    activeQueryKey === item.key
                      ? 'bg-[#e5b364] text-[#08080a] font-bold shadow-xs'
                      : 'bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            {/* Live Search & Citation Result Box */}
            <div className="p-5 space-y-4 bg-black/40 text-xs font-mono">
              
              {/* Cited Answer */}
              <div className="space-y-1.5">
                <div className="flex items-center space-x-1.5 text-[#e5b364] text-[11px] font-bold uppercase tracking-wider">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Synthesized Local Answer (Zero Cloud Call)</span>
                </div>
                <p className="text-zinc-200 text-sm leading-relaxed">
                  {currentResult.answer}
                </p>
              </div>

              {/* Exact Source Line Citation */}
              <div className="p-3 rounded-xl bg-zinc-900/70 border border-white/[0.08] space-y-1.5">
                <div className="flex items-center justify-between text-[11px] text-zinc-400">
                  <span className="text-zinc-300 font-bold flex items-center space-x-1">
                    <FileText className="w-3.5 h-3.5 text-[#e5b364]" />
                    <span>{currentResult.source}</span>
                  </span>
                  <span className="text-[#e5b364] font-bold">Line {currentResult.line}</span>
                </div>
                <p className="text-zinc-400 text-[11px] leading-relaxed italic border-l-2 border-[#e5b364] pl-2.5 py-0.5">
                  "{currentResult.snippet}"
                </p>
              </div>

              {/* Bottom Verification Status */}
              <div className="pt-2 flex items-center justify-between text-[10px] text-zinc-500 border-t border-white/[0.06]">
                <span className="flex items-center space-x-1 text-emerald-400 font-semibold">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>Verified 100% Grounded in Local Documents</span>
                </span>
                <span>Hybrid RRF Rank: 1.000</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. THE PROBLEM VS THE SOLUTION (Linear-Style High Contrast) */}
      <section className="space-y-8">
        <div className="text-center space-y-2">
          <span className="text-xs font-mono uppercase tracking-widest text-[#e5b364]">The Paradigm Shift</span>
          <h2 className="text-3xl sm:text-4xl font-sans font-bold text-white tracking-tight">
            Why Teams Are Quitting Cloud AI
          </h2>
          <p className="text-sm text-zinc-400 max-w-xl mx-auto">
            Traditional SaaS AI forces you to upload your trade secrets to third-party data centers. GhostBrain keeps 100% of the intelligence on your hardware.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Cloud AI Box */}
          <div className="p-6 rounded-2xl bg-[#0d0d12]/60 border border-red-500/20 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
              <span className="text-xs font-mono font-bold text-red-400 uppercase tracking-wider">
                SaaS Cloud AI Traps
              </span>
              <XCircle className="w-4 h-4 text-red-400" />
            </div>

            <ul className="space-y-3 text-xs text-zinc-400">
              <li className="flex items-start space-x-2.5">
                <XCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <span><strong>Data Harvesting:</strong> Files sent across the web are exposed to sub-processors, scraping, and data breaches.</span>
              </li>
              <li className="flex items-start space-x-2.5">
                <XCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <span><strong>Per-Seat Token Subscriptions:</strong> Paying $20–$50 per person every month forever to search internal notes.</span>
              </li>
              <li className="flex items-start space-x-2.5">
                <XCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <span><strong>Unchecked Hallucinations:</strong> Plausible-sounding answers generated without exact document line citations.</span>
              </li>
              <li className="flex items-start space-x-2.5">
                <XCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <span><strong>Cloud Outages:</strong> Your workflow halts whenever third-party APIs experience downtime or throttle bandwidth.</span>
              </li>
            </ul>
          </div>

          {/* GhostBrain Box */}
          <div className="p-6 rounded-2xl bg-[#0d0d12] border border-[#e5b364]/40 shadow-xl shadow-black space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
              <span className="text-xs font-mono font-bold text-[#e5b364] uppercase tracking-wider">
                The GhostBrain Sovereign Engine
              </span>
              <CheckCircle2 className="w-4 h-4 text-[#e5b364]" />
            </div>

            <ul className="space-y-3 text-xs text-zinc-200">
              <li className="flex items-start space-x-2.5">
                <CheckCircle2 className="w-4 h-4 text-[#e5b364] shrink-0 mt-0.5" />
                <span><strong>100% Zero-Cloud Storage:</strong> All documents, vectors, and weights stay strictly on your local SSD in encrypted SQLite.</span>
              </li>
              <li className="flex items-start space-x-2.5">
                <CheckCircle2 className="w-4 h-4 text-[#e5b364] shrink-0 mt-0.5" />
                <span><strong>Zero Token Costs:</strong> Powered by your own CPU &amp; GPU. Run unlimited queries without paying a single cent in tokens.</span>
              </li>
              <li className="flex items-start space-x-2.5">
                <CheckCircle2 className="w-4 h-4 text-[#e5b364] shrink-0 mt-0.5" />
                <span><strong>Mathematical Line Citations:</strong> Clickable [S1], [S2] badges cite the exact line and file for every single assertion.</span>
              </li>
              <li className="flex items-start space-x-2.5">
                <CheckCircle2 className="w-4 h-4 text-[#e5b364] shrink-0 mt-0.5" />
                <span><strong>Air-Gapped Autonomy:</strong> Fully operational on airplanes, submarines, clinical hospitals, and secure facilities.</span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* 4. ASYMMETRICAL BENTO GRID (Linear Architecture Style) */}
      <section className="space-y-8">
        <div className="text-center space-y-2">
          <span className="text-xs font-mono uppercase tracking-widest text-[#e5b364]">System Capabilities</span>
          <h2 className="text-3xl sm:text-4xl font-sans font-bold text-white tracking-tight">
            Engineered for Raw Speed &amp; Privacy
          </h2>
          <p className="text-sm text-zinc-400 max-w-xl mx-auto">
            A modular local-first architecture combining native C++ indexers, open-weights neural engines, and hardware safety locks.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          
          {/* Bento 1: Hybrid RRF Search (2 Columns Wide) */}
          <div className="md:col-span-2 p-6 rounded-2xl bg-[#0d0d12] border border-white/[0.1] flex flex-col justify-between space-y-5">
            <div className="space-y-2">
              <div className="inline-flex items-center space-x-1.5 text-xs font-mono text-[#e5b364] uppercase font-bold">
                <Zap className="w-3.5 h-3.5" />
                <span>Sub-3ms Hybrid Search</span>
              </div>
              <h3 className="text-2xl font-sans font-bold text-white">
                Reciprocal Rank Fusion (RRF)
              </h3>
              <p className="text-xs text-zinc-400 max-w-lg leading-relaxed">
                Combines full-text BM25 token frequencies with dense vector semantic embeddings. While traditional Windows Search crawls for 45+ seconds with high CPU spikes, GhostBrain ranks exact clauses in under 3 milliseconds.
              </p>
            </div>

            {/* Stopwatch Visual Comparison */}
            <div className="grid grid-cols-2 gap-3 pt-2 font-mono text-xs">
              <div className="p-3.5 rounded-xl bg-zinc-900/60 border border-[#e5b364]/30 space-y-1">
                <span className="text-zinc-400 text-[10px] block">GhostBrain Hybrid Index</span>
                <span className="text-lg font-bold text-emerald-400">1.8 ms</span>
                <span className="text-zinc-500 text-[10px] block">Deterministic line match</span>
              </div>
              <div className="p-3.5 rounded-xl bg-zinc-900/30 border border-white/[0.06] space-y-1 opacity-70">
                <span className="text-zinc-500 text-[10px] block">Default Windows Search</span>
                <span className="text-lg font-bold text-red-400">54.2 s</span>
                <span className="text-zinc-500 text-[10px] block">Misses non-indexed formats</span>
              </div>
            </div>
          </div>

          {/* Bento 2: 1-Click Local LLMs */}
          <div className="p-6 rounded-2xl bg-[#0d0d12] border border-white/[0.1] flex flex-col justify-between space-y-5">
            <div className="space-y-2">
              <div className="inline-flex items-center space-x-1.5 text-xs font-mono text-[#e5b364] uppercase font-bold">
                <Sliders className="w-3.5 h-3.5" />
                <span>Pre-Flight Safety</span>
              </div>
              <h3 className="text-xl font-sans font-bold text-white">
                1-Click Local LLMs
              </h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Choose between <strong>Low (Gemma 2B @ 2.0GB)</strong>, <strong>Balanced (Llama 3.2 3B @ 3.5GB)</strong>, and <strong>Full Power (Qwen 2.5 7B @ 5.5GB)</strong>. GhostBrain automatically validates your live RAM before downloading.
              </p>
            </div>

            {/* Interactive RAM Slider Simulator */}
            <div className="space-y-2 font-mono text-xs pt-2 border-t border-white/[0.06]">
              <div className="flex justify-between text-[11px]">
                <span className="text-zinc-400">Budget Slider:</span>
                <span className="text-[#e5b364] font-bold">{ramSliderGB.toFixed(1)} GB</span>
              </div>
              <input
                type="range"
                min="1.0"
                max="8.0"
                step="0.5"
                value={ramSliderGB}
                onChange={(e) => setRamSliderGB(Number(e.target.value))}
                className="w-full accent-[#e5b364] cursor-pointer h-1.5 bg-zinc-800 rounded-lg"
              />
              <span className="text-[10px] text-emerald-400 block">
                {ramSliderGB >= 3.5 ? '✓ Balanced tier supported' : '⚠️ Insufficient for 3B model'}
              </span>
            </div>
          </div>

          {/* Bento 3: Silent Eco Mode */}
          <div className="p-6 rounded-2xl bg-[#0d0d12] border border-white/[0.1] flex flex-col justify-between space-y-5">
            <div className="space-y-2">
              <div className="inline-flex items-center space-x-1.5 text-xs font-mono text-[#e5b364] uppercase font-bold">
                <Cpu className="w-3.5 h-3.5" />
                <span>Zero VRAM Impact</span>
              </div>
              <h3 className="text-xl font-sans font-bold text-white">
                Eco / Low-Capacity Mode
              </h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Free your graphics card instantly for heavy 3D rendering, video export, or gaming. 1 click evacuates VRAM and shifts AI queries to silent background CPU threads.
              </p>
            </div>

            <button
              onClick={() => setEcoModeActive(!ecoModeActive)}
              className={`w-full py-2.5 rounded-xl font-mono text-xs font-bold transition cursor-pointer flex items-center justify-center space-x-2 ${
                ecoModeActive
                  ? 'bg-amber-950/80 text-amber-300 border border-amber-800'
                  : 'bg-white/5 border border-white/10 text-zinc-300 hover:text-white'
              }`}
            >
              <Cpu className="w-3.5 h-3.5" />
              <span>{ecoModeActive ? 'Eco Mode: ACTIVE (0 MB VRAM)' : 'Toggle Eco Mode (CPU Only)'}</span>
            </button>
          </div>

          {/* Bento 4: Mobile Remote Relay (2 Columns Wide) */}
          <div className="md:col-span-2 p-6 rounded-2xl bg-[#0d0d12] border border-white/[0.1] flex flex-col justify-between space-y-5">
            <div className="space-y-2">
              <div className="inline-flex items-center space-x-1.5 text-xs font-mono text-[#e5b364] uppercase font-bold">
                <Smartphone className="w-3.5 h-3.5" />
                <span>Wireless Remote</span>
              </div>
              <h3 className="text-2xl font-sans font-bold text-white">
                Encrypted Mobile Remote Control
              </h3>
              <p className="text-xs text-zinc-400 max-w-lg leading-relaxed">
                Command your desktop from any phone or browser worldwide without opening router ports or static IPs. All AI computations and file searches run on your home hardware; only encrypted text travels over the tunnel.
              </p>
            </div>

            <div className="pt-2 flex flex-wrap items-center gap-3">
              <button
                onClick={onOpenConnectModal}
                className="px-4 py-2.5 rounded-xl bg-[#e5b364] hover:bg-[#d4a253] text-[#08080a] font-mono text-xs font-bold transition flex items-center space-x-1.5 cursor-pointer shadow-sm"
              >
                <span>Pair Your Phone in 1 Click</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
              <span className="text-xs font-mono text-zinc-500">
                Uses instant Camera QR or 8-digit OTP (GB-XXXX-XXXX)
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* 5. COMMERCIAL PRICING (Linear / Raycast Transparent Tiers) */}
      <section className="space-y-8" id="pricing">
        <div className="text-center space-y-2">
          <span className="text-xs font-mono uppercase tracking-widest text-[#e5b364]">Fair Economics</span>
          <h2 className="text-3xl sm:text-4xl font-sans font-bold text-white tracking-tight">
            Transparent, Predictable Ownership
          </h2>
          <p className="text-sm text-zinc-400 max-w-xl mx-auto">
            No per-token metering. No price surges. Keep your data on your hardware forever.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Plan 1: Personal */}
          <div className="p-6 rounded-2xl bg-[#0d0d12] border border-white/[0.1] flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <div className="space-y-1">
                <span className="text-xs font-mono text-zinc-400 uppercase font-bold">Personal Edition</span>
                <h3 className="text-xl font-sans font-bold text-white">Individual Pro</h3>
              </div>

              <div className="flex items-baseline space-x-1 font-mono">
                <span className="text-3xl font-bold text-white">$49</span>
                <span className="text-xs text-zinc-500">/ year fallback</span>
              </div>

              <p className="text-xs text-zinc-400">
                For independent researchers, engineers, and lawyers running on a single primary workstation.
              </p>

              <ul className="space-y-2.5 text-xs font-mono text-zinc-300 pt-3 border-t border-white/[0.06]">
                <li className="flex items-center space-x-2">
                  <Check className="w-3.5 h-3.5 text-[#e5b364]" />
                  <span>Unlimited local document indexing</span>
                </li>
                <li className="flex items-center space-x-2">
                  <Check className="w-3.5 h-3.5 text-[#e5b364]" />
                  <span>1-Click Local LLMs (Gemma, Llama, Qwen)</span>
                </li>
                <li className="flex items-center space-x-2">
                  <Check className="w-3.5 h-3.5 text-[#e5b364]" />
                  <span>1 Local Wi-Fi Paired Phone</span>
                </li>
                <li className="flex items-center space-x-2">
                  <Check className="w-3.5 h-3.5 text-[#e5b364]" />
                  <span>Perpetual offline license fallback</span>
                </li>
              </ul>
            </div>

            <button
              onClick={onOpenConnectModal}
              className="w-full py-3 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.12] text-xs font-mono font-bold text-white transition cursor-pointer"
            >
              Get Personal Edition
            </button>
          </div>

          {/* Plan 2: Cloud+ Remote (Featured) */}
          <div className="p-6 rounded-2xl bg-[#0d0d12] border-2 border-[#e5b364] shadow-xl shadow-[#e5b364]/10 flex flex-col justify-between space-y-6 relative">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-[#e5b364] text-[#08080a] font-mono text-[10px] font-bold uppercase tracking-wider">
              Most Popular
            </div>

            <div className="space-y-4">
              <div className="space-y-1">
                <span className="text-xs font-mono text-[#e5b364] uppercase font-bold">Cloud+ Remote</span>
                <h3 className="text-xl font-sans font-bold text-white">Sovereign Remote</h3>
              </div>

              <div className="flex items-baseline space-x-1 font-mono">
                <span className="text-3xl font-bold text-[#e5b364]">$39</span>
                <span className="text-xs text-zinc-500">/ year (or $4/mo)</span>
              </div>

              <p className="text-xs text-zinc-400">
                Command your home or office PC from any mobile browser worldwide with zero port forwarding.
              </p>

              <ul className="space-y-2.5 text-xs font-mono text-white pt-3 border-t border-white/[0.06]">
                <li className="flex items-center space-x-2">
                  <Check className="w-3.5 h-3.5 text-[#e5b364]" />
                  <span><strong>Everything in Personal Edition</strong></span>
                </li>
                <li className="flex items-center space-x-2">
                  <Check className="w-3.5 h-3.5 text-[#e5b364]" />
                  <span><strong>Remote Relay for up to 5 mobile/web devices</strong></span>
                </li>
                <li className="flex items-center space-x-2">
                  <Check className="w-3.5 h-3.5 text-[#e5b364]" />
                  <span>Worldwide encrypted access without static IPs</span>
                </li>
                <li className="flex items-center space-x-2">
                  <Check className="w-3.5 h-3.5 text-[#e5b364]" />
                  <span>Instant mobile camera QR pairing</span>
                </li>
              </ul>
            </div>

            <button
              onClick={onOpenConnectModal}
              className="w-full py-3 rounded-xl bg-[#e5b364] hover:bg-[#d4a253] text-[#08080a] text-xs font-mono font-bold transition shadow-lg shadow-[#e5b364]/20 cursor-pointer"
            >
              Get Cloud+ Remote
            </button>
          </div>

          {/* Plan 3: Clinic & Enterprise */}
          <div className="p-6 rounded-2xl bg-[#0d0d12] border border-white/[0.1] flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <div className="space-y-1">
                <span className="text-xs font-mono text-zinc-400 uppercase font-bold">Enterprise</span>
                <h3 className="text-xl font-sans font-bold text-white">Clinic &amp; Firm</h3>
              </div>

              <div className="flex items-baseline space-x-1 font-mono">
                <span className="text-3xl font-bold text-white">$199</span>
                <span className="text-xs text-zinc-500">/ year</span>
              </div>

              <p className="text-xs text-zinc-400">
                For clinics, legal practices, and multi-seat workstations requiring air-gapped network compliance.
              </p>

              <ul className="space-y-2.5 text-xs font-mono text-zinc-300 pt-3 border-t border-white/[0.06]">
                <li className="flex items-center space-x-2 text-white">
                  <Check className="w-3.5 h-3.5 text-[#e5b364]" />
                  <span>Air-gapped local LAN server mode</span>
                </li>
                <li className="flex items-center space-x-2 text-white">
                  <Check className="w-3.5 h-3.5 text-[#e5b364]" />
                  <span>Multi-workstation audit logging</span>
                </li>
                <li className="flex items-center space-x-2 text-white">
                  <Check className="w-3.5 h-3.5 text-[#e5b364]" />
                  <span>HIPAA &amp; GDPR compliance validation</span>
                </li>
                <li className="flex items-center space-x-2 text-white">
                  <Check className="w-3.5 h-3.5 text-[#e5b364]" />
                  <span>Priority engineering support</span>
                </li>
              </ul>
            </div>

            <button
              onClick={onOpenConnectModal}
              className="w-full py-3 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.12] text-xs font-mono font-bold text-white transition cursor-pointer"
            >
              Contact Enterprise Sales
            </button>
          </div>
        </div>
      </section>

      {/* 6. DOWNLOAD CTA */}
      <section className="p-8 sm:p-12 rounded-3xl bg-[#0d0d12] border border-white/[0.12] text-center space-y-6 shadow-2xl" id="download">
        <h2 className="text-3xl sm:text-5xl font-sans font-bold text-white max-w-2xl mx-auto tracking-tight">
          Take Back Your Cognitive Sovereignty.
        </h2>
        <p className="text-sm text-zinc-400 max-w-xl mx-auto leading-relaxed">
          Download the GhostBrain desktop application. Index your private folders in minutes and experience zero-cloud intelligence.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <button
            onClick={() => alert("Downloading GhostBrain v0.0.1 for Windows (x64 Installer)...")}
            className="px-6 py-3.5 rounded-xl bg-[#e5b364] hover:bg-[#d4a253] text-[#08080a] font-mono text-xs font-bold transition shadow-lg shadow-[#e5b364]/20 cursor-pointer flex items-center space-x-2"
          >
            <Download className="w-4 h-4" />
            <span>Download for Windows (.exe)</span>
          </button>
          <button
            onClick={() => alert("GhostBrain macOS Apple Silicon build coming shortly.")}
            className="px-5 py-3.5 rounded-xl bg-white/[0.05] border border-white/[0.12] hover:border-[#e5b364]/40 text-zinc-400 hover:text-white font-mono text-xs font-semibold transition cursor-pointer"
          >
            macOS (Apple Silicon)
          </button>
          <button
            onClick={() => alert("GhostBrain Linux AppImage build coming shortly.")}
            className="px-5 py-3.5 rounded-xl bg-white/[0.05] border border-white/[0.12] hover:border-[#e5b364]/40 text-zinc-400 hover:text-white font-mono text-xs font-semibold transition cursor-pointer"
          >
            Linux (.AppImage)
          </button>
        </div>
      </section>

      {/* 7. MINIMALIST LINEAR FOOTER */}
      <footer className="pt-10 border-t border-white/[0.06] flex flex-col sm:flex-row items-center justify-between text-xs font-mono text-zinc-500 gap-4">
        <div className="flex items-center space-x-2">
          <Shield className="w-3.5 h-3.5 text-[#e5b364]" />
          <span className="text-zinc-300 font-bold">GhostBrain</span>
          <span>v0.0.1</span>
        </div>
        <div>
          <span>Zero Telemetry • Zero Cloud Storage • Local-First Architecture</span>
        </div>
      </footer>
    </div>
  );
};
