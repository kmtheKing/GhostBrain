import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
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
  Flame,
  Radio,
  Play,
  Pause,
  Maximize2,
  Sparkles
} from 'lucide-react';

interface LandingPageProps {
  onOpenDemo: () => void;
  onOpenRemote: () => void;
  onOpenConnectModal: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onOpenDemo,
  onOpenRemote,
  onOpenConnectModal
}) => {
  const [showcaseTab, setShowcaseTab] = useState<'search' | 'llm' | 'eco'>('search');
  const [videoMode, setVideoMode] = useState<'core' | 'workstation'>('core');
  const [isPlaying, setIsPlaying] = useState(true);

  return (
    <div className="relative z-10 w-full max-w-6xl mx-auto px-4 py-8 sm:py-16 space-y-24 select-none">
      
      {/* 1. HERO SECTION */}
      <section className="text-center space-y-6 pt-4 sm:pt-8">
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-[#e5b364]/10 border border-[#e5b364]/30 text-[#e5b364] text-xs font-mono tracking-widest uppercase">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>The Sovereign Local Intelligence Suite</span>
        </div>

        <h1 className="text-4xl sm:text-6xl md:text-7xl font-serif text-[#f0ebe1] font-bold tracking-tight max-w-4xl mx-auto leading-[1.08]">
          Your Private AI Second Brain. <br />
          <span className="text-[#e5b364] italic">100% Local. Zero Cloud Leaks.</span>
        </h1>

        <p className="text-sm sm:text-base text-[#8e887d] max-w-2xl mx-auto leading-relaxed">
          Search confidential enterprise documents in under 3 milliseconds. Run open-weights local AI (Gemma, Llama, Qwen) with strict source citations and mirror your desktop wirelessly anywhere in the world.
        </p>

        {/* Hero Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-3">
          <button
            onClick={onOpenConnectModal}
            className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-[#e5b364] hover:bg-[#d4a253] text-[#060608] font-mono text-xs font-bold transition shadow-xl shadow-[#e5b364]/20 cursor-pointer flex items-center justify-center space-x-2"
          >
            <Smartphone className="w-4 h-4" />
            <span>Link Mobile Remote</span>
            <ChevronRight className="w-4 h-4" />
          </button>

          <button
            onClick={onOpenDemo}
            className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/15 text-[#f0ebe1] font-mono text-xs font-semibold transition cursor-pointer flex items-center justify-center space-x-2 hover:border-[#e5b364]/40"
          >
            <Zap className="w-4 h-4 text-[#e5b364]" />
            <span>Test Search Speed Demo</span>
          </button>

          <a
            href="#download"
            className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/15 text-[#8e887d] hover:text-[#f0ebe1] font-mono text-xs font-semibold transition flex items-center justify-center space-x-2"
          >
            <Download className="w-4 h-4" />
            <span>Download Desktop (Win/Mac/Linux)</span>
          </a>
        </div>

        {/* Trust Badges */}
        <div className="pt-6 flex flex-wrap items-center justify-center gap-6 text-[11px] font-mono text-[#8e887d]">
          <span className="flex items-center space-x-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#e5b364]" />
            <span>100% Offline &amp; Air-Gap Capable</span>
          </span>
          <span className="flex items-center space-x-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#e5b364]" />
            <span>Zero Per-Query Subscription Fees</span>
          </span>
          <span className="flex items-center space-x-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#e5b364]" />
            <span>End-to-End Encrypted Remote Sync</span>
          </span>
        </div>
      </section>

      {/* 2. CINEMATIC ANIMATED LOOP VIDEO SHOWCASE */}
      <section className="relative rounded-3xl overflow-hidden border border-[#e5b364]/30 bg-[#0d0d12]/90 shadow-2xl shadow-[#e5b364]/10 backdrop-blur-2xl p-4 sm:p-6 space-y-4">
        {/* Top Control Bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-white/10">
          <div className="flex items-center space-x-2.5">
            <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-mono text-xs uppercase font-bold text-[#f0ebe1] tracking-wider">
              {videoMode === 'core' ? 'Holographic Neural Engine (Live Render)' : 'Desktop Workstation Dashboard (Active Session)'}
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setVideoMode('core')}
              className={`px-3 py-1 rounded-lg text-xs font-mono font-medium transition cursor-pointer ${
                videoMode === 'core'
                  ? 'bg-[#e5b364] text-[#060608] font-bold'
                  : 'bg-white/5 text-[#8e887d] hover:text-[#f0ebe1]'
              }`}
            >
              Neural Core
            </button>
            <button
              onClick={() => setVideoMode('workstation')}
              className={`px-3 py-1 rounded-lg text-xs font-mono font-medium transition cursor-pointer ${
                videoMode === 'workstation'
                  ? 'bg-[#e5b364] text-[#060608] font-bold'
                  : 'bg-white/5 text-[#8e887d] hover:text-[#f0ebe1]'
              }`}
            >
              Desktop Workstation
            </button>
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="p-1.5 rounded-lg bg-white/5 text-[#8e887d] hover:text-[#f0ebe1] transition cursor-pointer"
              title={isPlaying ? 'Pause Loop' : 'Play Loop'}
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Video / Visual Container */}
        <div className="relative aspect-video w-full rounded-2xl overflow-hidden bg-black/80 border border-white/10 group">
          <img
            src={videoMode === 'core' ? '/assets/hero_neural_core.jpg' : '/assets/workstation_demo.jpg'}
            alt="GhostBrain Cinematic Showcase"
            className={`w-full h-full object-cover transition-transform duration-1000 ${
              isPlaying ? 'scale-105 filter brightness-105' : 'scale-100'
            }`}
          />

          {/* Holographic Scanline Overlay */}
          <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-transparent via-[#e5b364]/5 to-transparent bg-[length:100%_4px] opacity-40 animate-pulse" />

          {/* Floating HUD Telemetry Overlay */}
          <div className="absolute bottom-4 left-4 right-4 flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl bg-[#060608]/85 backdrop-blur-md border border-white/10 text-[11px] font-mono text-[#8e887d]">
            <div className="flex items-center space-x-3">
              <span className="flex items-center space-x-1 text-[#e5b364] font-bold">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Zero-Cloud Compute</span>
              </span>
              <span>Host CPU: 38°C</span>
              <span>VRAM: 0 MB (Offline Isolation)</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-emerald-400 font-bold">● Mathematical Proof: Ed25519 Verified</span>
            </div>
          </div>
        </div>
      </section>

      {/* 3. THE PROBLEM VS THE SOLUTION */}
      <section className="space-y-8">
        <div className="text-center space-y-2">
          <span className="text-xs font-mono uppercase tracking-widest text-[#e5b364]">The Paradigm Shift</span>
          <h2 className="text-3xl sm:text-4xl font-serif text-[#f0ebe1] font-bold">
            Why Privacy-Conscious Teams Choose GhostBrain
          </h2>
          <p className="text-xs sm:text-sm text-[#8e887d] max-w-xl mx-auto">
            Traditional cloud AI exposes your confidential files to third-party data centers. GhostBrain restores total sovereignty to your local hardware.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Cloud AI Trap Card */}
          <div className="p-6 rounded-3xl bg-[#0d0d12]/90 backdrop-blur-xl border border-red-500/25 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-white/5">
              <span className="text-xs font-mono font-bold text-red-400 uppercase tracking-wider">
                The SaaS Cloud AI Trap
              </span>
              <XCircle className="w-5 h-5 text-red-400" />
            </div>

            <ul className="space-y-3.5 text-xs text-[#8e887d]">
              <li className="flex items-start space-x-2.5">
                <XCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <span><strong>Data Surveillance:</strong> Files uploaded to external clouds are vulnerable to harvesting, sub-processors, and subpoenas.</span>
              </li>
              <li className="flex items-start space-x-2.5">
                <XCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <span><strong>Per-Seat Token Tolls:</strong> Paying $20–$50 per user each month forever just to query your own internal documents.</span>
              </li>
              <li className="flex items-start space-x-2.5">
                <XCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <span><strong>Unchecked Hallucinations:</strong> Outputting fabricated sentences without direct mathematical citations to local source lines.</span>
              </li>
              <li className="flex items-start space-x-2.5">
                <XCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <span><strong>Cloud Outages:</strong> Work freezes completely when internet connections drop or cloud provider APIs throttle requests.</span>
              </li>
            </ul>
          </div>

          {/* GhostBrain Sovereign Card */}
          <div className="p-6 rounded-3xl bg-[#0d0d12]/95 backdrop-blur-xl border border-[#e5b364]/40 shadow-xl shadow-[#e5b364]/5 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-white/5">
              <span className="text-xs font-mono font-bold text-[#e5b364] uppercase tracking-wider">
                The GhostBrain Sovereign Engine
              </span>
              <CheckCircle2 className="w-5 h-5 text-[#e5b364]" />
            </div>

            <ul className="space-y-3.5 text-xs text-[#f0ebe1]">
              <li className="flex items-start space-x-2.5">
                <CheckCircle2 className="w-4 h-4 text-[#e5b364] shrink-0 mt-0.5" />
                <span><strong>100% Zero-Cloud Storage:</strong> All files, embeddings, and indices live strictly on your hard drive in encrypted SQLite.</span>
              </li>
              <li className="flex items-start space-x-2.5">
                <CheckCircle2 className="w-4 h-4 text-[#e5b364] shrink-0 mt-0.5" />
                <span><strong>Zero Token Costs:</strong> Leverage your device's native CPU &amp; GPU power. Run millions of queries completely free.</span>
              </li>
              <li className="flex items-start space-x-2.5">
                <CheckCircle2 className="w-4 h-4 text-[#e5b364] shrink-0 mt-0.5" />
                <span><strong>Pinpoint Source Citations:</strong> Every assertion includes clickable [S1], [S2] badges pointing to exact document line numbers.</span>
              </li>
              <li className="flex items-start space-x-2.5">
                <CheckCircle2 className="w-4 h-4 text-[#e5b364] shrink-0 mt-0.5" />
                <span><strong>Total Air-Gapped Autonomy:</strong> Fully operational on airplanes, submarines, secure facilities, and offline clinics.</span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* 4. PRODUCT SHOWCASE TABS */}
      <section className="space-y-8">
        <div className="text-center space-y-2">
          <span className="text-xs font-mono uppercase tracking-widest text-[#e5b364]">Product Architecture</span>
          <h2 className="text-3xl sm:text-4xl font-serif text-[#f0ebe1] font-bold">
            Engineered for Everyday Hardware
          </h2>
          <p className="text-xs sm:text-sm text-[#8e887d] max-w-xl mx-auto">
            Explore how GhostBrain balances lightning-fast hybrid ranking, local open weights, and hardware throttling.
          </p>
        </div>

        {/* Tab Buttons */}
        <div className="flex justify-center">
          <div className="p-1 rounded-2xl bg-[#0d0d12]/90 border border-white/10 flex flex-wrap gap-1 text-xs font-mono">
            <button
              onClick={() => setShowcaseTab('search')}
              className={`px-4 py-2.5 rounded-xl font-medium transition cursor-pointer flex items-center space-x-2 ${
                showcaseTab === 'search'
                  ? 'bg-[#e5b364] text-[#060608] shadow-sm font-bold'
                  : 'text-[#8e887d] hover:text-[#f0ebe1]'
              }`}
            >
              <Zap className="w-4 h-4" />
              <span>Hybrid RRF Search</span>
            </button>
            <button
              onClick={() => setShowcaseTab('llm')}
              className={`px-4 py-2.5 rounded-xl font-medium transition cursor-pointer flex items-center space-x-2 ${
                showcaseTab === 'llm'
                  ? 'bg-[#e5b364] text-[#060608] shadow-sm font-bold'
                  : 'text-[#8e887d] hover:text-[#f0ebe1]'
              }`}
            >
              <Sliders className="w-4 h-4" />
              <span>1-Click Local LLMs</span>
            </button>
            <button
              onClick={() => setShowcaseTab('eco')}
              className={`px-4 py-2.5 rounded-xl font-medium transition cursor-pointer flex items-center space-x-2 ${
                showcaseTab === 'eco'
                  ? 'bg-[#e5b364] text-[#060608] shadow-sm font-bold'
                  : 'text-[#8e887d] hover:text-[#f0ebe1]'
              }`}
            >
              <Cpu className="w-4 h-4" />
              <span>Eco / Low-Capacity Mode</span>
            </button>
          </div>
        </div>

        {/* Tab Content Cards */}
        <div className="p-8 rounded-3xl bg-[#0d0d12]/95 backdrop-blur-2xl border border-[#e5b364]/25 shadow-2xl space-y-6">
          {showcaseTab === 'search' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
              <div className="space-y-4">
                <div className="inline-flex items-center space-x-1.5 text-xs font-mono text-[#e5b364] uppercase font-bold">
                  <Zap className="w-4 h-4" />
                  <span>Sub-3ms Hybrid Indexing</span>
                </div>
                <h3 className="text-2xl font-serif font-bold text-[#f0ebe1]">
                  Reciprocal Rank Fusion (RRF)
                </h3>
                <p className="text-xs text-[#8e887d] leading-relaxed">
                  Unlike simple keyword search or ungrounded vector search, GhostBrain merges mathematical BM25 token frequencies with dense vector embeddings. It pinpoints clauses across hundreds of thousands of files without latency.
                </p>
                <div className="pt-2">
                  <button
                    onClick={onOpenDemo}
                    className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 hover:border-[#e5b364]/40 text-xs font-mono text-[#e5b364] transition cursor-pointer flex items-center space-x-1.5"
                  >
                    <span>Try the In-Browser Speed Benchmark</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Visual Mockup Box */}
              <div className="p-4 rounded-2xl bg-black/60 border border-white/10 space-y-3 font-mono text-xs">
                <div className="flex items-center justify-between text-[#8e887d] text-[10px] pb-2 border-b border-white/5">
                  <span>Query: "indemnification gross negligence"</span>
                  <span className="text-emerald-400">2.1 ms</span>
                </div>
                <div className="p-3 rounded-xl bg-white/5 border border-[#e5b364]/30 space-y-1">
                  <div className="text-[10px] text-[#e5b364] font-bold">Contracts/MSA_Apex_2026.pdf [Line 184]</div>
                  <p className="text-[#f0ebe1] text-[11px] leading-relaxed">
                    "...indemnify, and hold harmless Client against any claims arising from gross negligence..."
                  </p>
                </div>
              </div>
            </div>
          )}

          {showcaseTab === 'llm' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
              <div className="space-y-4">
                <div className="inline-flex items-center space-x-1.5 text-xs font-mono text-[#e5b364] uppercase font-bold">
                  <Sliders className="w-4 h-4" />
                  <span>Hardware-Guarded AI Engines</span>
                </div>
                <h3 className="text-2xl font-serif font-bold text-[#f0ebe1]">
                  Pre-Flight Hardware Safety
                </h3>
                <p className="text-xs text-[#8e887d] leading-relaxed">
                  Select your engine level based on your PC specifications. GhostBrain inspects live free RAM before downloading, ensuring your computer never freezes or runs out of memory:
                </p>
                <ul className="space-y-2 text-xs font-mono text-[#8e887d]">
                  <li>• <strong className="text-[#f0ebe1]">Eco Tier (Gemma 2B)</strong>: Min 2.0 GB RAM for laptops.</li>
                  <li>• <strong className="text-[#f0ebe1]">Balanced Tier (Llama 3.2 3B)</strong>: Min 3.5 GB RAM for standard PCs.</li>
                  <li>• <strong className="text-[#f0ebe1]">Full Power (Qwen 2.5 7B)</strong>: Min 5.5 GB RAM for workstations.</li>
                </ul>
              </div>

              {/* Slider Mockup */}
              <div className="p-5 rounded-2xl bg-black/60 border border-white/10 space-y-4 font-mono text-xs">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-[#8e887d]">Allocated RAM Budget:</span>
                  <span className="text-[#e5b364] font-bold">4.0 GB of 11.2 GB Free</span>
                </div>
                <div className="w-full bg-white/10 h-2 rounded-full overflow-hidden">
                  <div className="bg-[#e5b364] h-full w-[45%]" />
                </div>
                <div className="p-2.5 rounded-xl bg-emerald-950/40 border border-emerald-800/60 text-emerald-400 text-[10px] flex items-center space-x-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  <span>Specifications validated! Balanced tier unlocked.</span>
                </div>
              </div>
            </div>
          )}

          {showcaseTab === 'eco' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
              <div className="space-y-4">
                <div className="inline-flex items-center space-x-1.5 text-xs font-mono text-[#e5b364] uppercase font-bold">
                  <Cpu className="w-4 h-4" />
                  <span>Silent CPU Fallback</span>
                </div>
                <h3 className="text-2xl font-serif font-bold text-[#f0ebe1]">
                  Eco / Low-Capacity Workstation Mode
                </h3>
                <p className="text-xs text-[#8e887d] leading-relaxed">
                  Need to free your graphics card for heavy 3D rendering, video editing, or high-FPS gaming? Toggle Eco Mode in 1 click. GhostBrain automatically evacuates VRAM and routes AI inferences strictly through low-priority CPU threads.
                </p>
                <div className="text-xs font-mono text-[#e5b364] flex items-center space-x-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Zero VRAM footprint when graphics demand spikes</span>
                </div>
              </div>

              {/* Status Indicator Box */}
              <div className="p-5 rounded-2xl bg-black/60 border border-white/10 space-y-3 font-mono text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[#8e887d]">Workstation Status:</span>
                  <span className="text-amber-400 font-bold px-2 py-0.5 rounded bg-amber-950/60 border border-amber-800">
                    Eco Mode Active
                  </span>
                </div>
                <div className="text-[11px] text-[#8e887d] space-y-1">
                  <div>GPU Offload: <span className="text-[#f0ebe1]">0 Layers (100% Free VRAM)</span></div>
                  <div>CPU Priority: <span className="text-[#f0ebe1]">Background Silent</span></div>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* 5. COMMERCIAL PRICING MATRIX */}
      <section className="space-y-8" id="pricing">
        <div className="text-center space-y-2">
          <span className="text-xs font-mono uppercase tracking-widest text-[#e5b364]">Transparent Economics</span>
          <h2 className="text-3xl sm:text-4xl font-serif text-[#f0ebe1] font-bold">
            Simple, Transparent Ownership
          </h2>
          <p className="text-xs sm:text-sm text-[#8e887d] max-w-xl mx-auto">
            No per-token bills. No surprise cloud surges. Keep your data on your hardware forever.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Plan 1: Personal */}
          <div className="p-6 rounded-3xl bg-[#0d0d12]/90 backdrop-blur-xl border border-white/10 flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <div className="space-y-1">
                <span className="text-xs font-mono text-[#8e887d] uppercase font-bold">Personal Edition</span>
                <h3 className="text-2xl font-serif font-bold text-[#f0ebe1]">Individual Pro</h3>
              </div>

              <div className="flex items-baseline space-x-1 font-mono">
                <span className="text-3xl font-bold text-[#f0ebe1]">$49</span>
                <span className="text-xs text-[#8e887d]">/ year fallback</span>
              </div>

              <p className="text-xs text-[#8e887d]">
                For independent researchers, lawyers, and developers working on a single PC.
              </p>

              <ul className="space-y-2.5 text-xs font-mono text-[#8e887d] pt-2 border-t border-white/5">
                <li className="flex items-center space-x-2 text-[#f0ebe1]">
                  <Check className="w-3.5 h-3.5 text-[#e5b364]" />
                  <span>Unlimited local document indexing</span>
                </li>
                <li className="flex items-center space-x-2 text-[#f0ebe1]">
                  <Check className="w-3.5 h-3.5 text-[#e5b364]" />
                  <span>1-Click Local LLMs (Gemma, Llama, Qwen)</span>
                </li>
                <li className="flex items-center space-x-2 text-[#f0ebe1]">
                  <Check className="w-3.5 h-3.5 text-[#e5b364]" />
                  <span>1 Local Wi-Fi Paired Phone</span>
                </li>
                <li className="flex items-center space-x-2 text-[#f0ebe1]">
                  <Check className="w-3.5 h-3.5 text-[#e5b364]" />
                  <span>Perpetual offline license fallback</span>
                </li>
              </ul>
            </div>

            <button
              onClick={onOpenConnectModal}
              className="w-full py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/15 text-xs font-mono font-bold text-[#f0ebe1] transition cursor-pointer"
            >
              Get Personal Edition
            </button>
          </div>

          {/* Plan 2: Cloud+ Remote (Featured) */}
          <div className="p-6 rounded-3xl bg-[#0d0d12]/95 backdrop-blur-xl border-2 border-[#e5b364] shadow-2xl shadow-[#e5b364]/10 flex flex-col justify-between space-y-6 relative">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-[#e5b364] text-[#060608] font-mono text-[10px] font-bold uppercase tracking-wider">
              Most Popular
            </div>

            <div className="space-y-4">
              <div className="space-y-1">
                <span className="text-xs font-mono text-[#e5b364] uppercase font-bold">Cloud+ Remote</span>
                <h3 className="text-2xl font-serif font-bold text-[#f0ebe1]">Sovereign Remote</h3>
              </div>

              <div className="flex items-baseline space-x-1 font-mono">
                <span className="text-3xl font-bold text-[#e5b364]">$39</span>
                <span className="text-xs text-[#8e887d]">/ year (or $4/mo)</span>
              </div>

              <p className="text-xs text-[#8e887d]">
                Access your home or office desktop from any mobile device worldwide with zero port forwarding.
              </p>

              <ul className="space-y-2.5 text-xs font-mono text-[#f0ebe1] pt-2 border-t border-white/5">
                <li className="flex items-center space-x-2">
                  <Check className="w-3.5 h-3.5 text-[#e5b364]" />
                  <span><strong>Everything in Personal Edition</strong></span>
                </li>
                <li className="flex items-center space-x-2">
                  <Check className="w-3.5 h-3.5 text-[#e5b364]" />
                  <span><strong>Remote Relay for up to 5 mobile/web clients</strong></span>
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
              className="w-full py-3 rounded-xl bg-[#e5b364] hover:bg-[#d4a253] text-[#060608] text-xs font-mono font-bold transition shadow-lg shadow-[#e5b364]/20 cursor-pointer"
            >
              Get Cloud+ Remote
            </button>
          </div>

          {/* Plan 3: Clinic & Enterprise */}
          <div className="p-6 rounded-3xl bg-[#0d0d12]/90 backdrop-blur-xl border border-white/10 flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <div className="space-y-1">
                <span className="text-xs font-mono text-[#8e887d] uppercase font-bold">Enterprise</span>
                <h3 className="text-2xl font-serif font-bold text-[#f0ebe1]">Clinic &amp; Firm</h3>
              </div>

              <div className="flex items-baseline space-x-1 font-mono">
                <span className="text-3xl font-bold text-[#f0ebe1]">$199</span>
                <span className="text-xs text-[#8e887d]">/ year</span>
              </div>

              <p className="text-xs text-[#8e887d]">
                For medical clinics, law firms, and multi-seat workstations requiring air-gapped network compliance.
              </p>

              <ul className="space-y-2.5 text-xs font-mono text-[#8e887d] pt-2 border-t border-white/5">
                <li className="flex items-center space-x-2 text-[#f0ebe1]">
                  <Check className="w-3.5 h-3.5 text-[#e5b364]" />
                  <span>Air-gapped local LAN server mode</span>
                </li>
                <li className="flex items-center space-x-2 text-[#f0ebe1]">
                  <Check className="w-3.5 h-3.5 text-[#e5b364]" />
                  <span>Multi-workstation audit logging</span>
                </li>
                <li className="flex items-center space-x-2 text-[#f0ebe1]">
                  <Check className="w-3.5 h-3.5 text-[#e5b364]" />
                  <span>HIPAA &amp; GDPR compliance validation</span>
                </li>
                <li className="flex items-center space-x-2 text-[#f0ebe1]">
                  <Check className="w-3.5 h-3.5 text-[#e5b364]" />
                  <span>Dedicated priority engineer support</span>
                </li>
              </ul>
            </div>

            <button
              onClick={onOpenConnectModal}
              className="w-full py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/15 text-xs font-mono font-bold text-[#f0ebe1] transition cursor-pointer"
            >
              Contact Enterprise Sales
            </button>
          </div>
        </div>
      </section>

      {/* 6. DOWNLOAD / FINAL CTA */}
      <section className="p-8 sm:p-12 rounded-3xl bg-[#0d0d12]/95 backdrop-blur-2xl border border-[#e5b364]/30 text-center space-y-6 shadow-2xl shadow-[#e5b364]/10" id="download">
        <h2 className="text-3xl sm:text-5xl font-serif font-bold text-[#f0ebe1] max-w-2xl mx-auto">
          Take Back Your Cognitive Sovereignty Today.
        </h2>
        <p className="text-xs sm:text-sm text-[#8e887d] max-w-xl mx-auto">
          Download the GhostBrain desktop application. Index your folders in minutes and experience zero-cloud intelligence.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <button
            onClick={() => alert("Downloading GhostBrain v0.0.1 for Windows (x64 Installer)...")}
            className="px-6 py-3.5 rounded-xl bg-[#e5b364] hover:bg-[#d4a253] text-[#060608] font-mono text-xs font-bold transition shadow-lg shadow-[#e5b364]/20 cursor-pointer flex items-center space-x-2"
          >
            <Download className="w-4 h-4" />
            <span>Download for Windows (.exe)</span>
          </button>
          <button
            onClick={() => alert("GhostBrain macOS Apple Silicon build coming shortly.")}
            className="px-5 py-3.5 rounded-xl bg-white/5 border border-white/15 hover:border-[#e5b364]/40 text-[#8e887d] hover:text-[#f0ebe1] font-mono text-xs font-semibold transition cursor-pointer"
          >
            macOS (Apple Silicon)
          </button>
          <button
            onClick={() => alert("GhostBrain Linux AppImage build coming shortly.")}
            className="px-5 py-3.5 rounded-xl bg-white/5 border border-white/15 hover:border-[#e5b364]/40 text-[#8e887d] hover:text-[#f0ebe1] font-mono text-xs font-semibold transition cursor-pointer"
          >
            Linux (.AppImage)
          </button>
        </div>
      </section>

      {/* 7. MINIMALIST LUXURY FOOTER */}
      <footer className="pt-12 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between text-xs font-mono text-[#8e887d] gap-4">
        <div className="flex items-center space-x-2">
          <ShieldCheck className="w-4 h-4 text-[#e5b364]" />
          <span className="text-[#f0ebe1] font-bold">GhostBrain Commercial AI Suite</span>
          <span>v0.0.1</span>
        </div>
        <div>
          <span>Zero Telemetry • Zero Third-Party Cloud • Mathematical Privacy</span>
        </div>
      </footer>
    </div>
  );
};
