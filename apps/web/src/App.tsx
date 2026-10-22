import React, { useState } from 'react';
import { LandingPage } from './components/landing/LandingPage';
import { DemoSandbox } from './components/demo/DemoSandbox';
import { MobileRemote } from './components/remote/MobileRemote';
import { ConnectModal } from './components/landing/ConnectModal';
import { Shield, Zap, Smartphone, Download, Terminal, ChevronRight } from 'lucide-react';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'landing' | 'demo' | 'remote'>('landing');
  const [isConnectModalOpen, setIsConnectModalOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#08080a] text-[#f4f4f6] relative overflow-x-hidden selection:bg-[#e5b364] selection:text-[#08080a] font-sans">
      
      {/* Subtle Ambient Background Gradient */}
      <div className="fixed inset-0 pointer-events-none z-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(229,179,100,0.08),rgba(255,255,255,0))]" />

      {/* Top Navigation Bar - Linear / Raycast style */}
      <header className="sticky top-0 z-40 w-full backdrop-blur-xl bg-[#08080a]/80 border-b border-white/[0.08] transition-all">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          
          {/* Brand Logo */}
          <div
            onClick={() => setActiveTab('landing')}
            className="flex items-center space-x-2.5 cursor-pointer group"
          >
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#e5b364] to-[#78541e] p-[1px] shadow-sm">
              <div className="w-full h-full rounded-lg bg-[#0d0d12] flex items-center justify-center">
                <Shield className="w-3.5 h-3.5 text-[#e5b364]" />
              </div>
            </div>
            <div className="flex items-baseline space-x-2">
              <span className="font-bold text-sm tracking-tight text-[#f4f4f6] group-hover:text-[#e5b364] transition">
                GhostBrain
              </span>
              <span className="text-[10px] font-mono text-zinc-500 hidden sm:inline px-1.5 py-0.5 rounded bg-white/5 border border-white/5">
                v0.0.1
              </span>
            </div>
          </div>

          {/* Navigation Segmented Controls */}
          <nav className="flex items-center p-1 rounded-xl bg-zinc-900/80 border border-white/10 text-xs font-mono">
            <button
              onClick={() => setActiveTab('landing')}
              className={`px-3 py-1.5 rounded-lg font-medium transition cursor-pointer flex items-center space-x-1.5 ${
                activeTab === 'landing'
                  ? 'bg-white/10 text-white shadow-xs font-semibold'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <span>Product</span>
            </button>

            <button
              onClick={() => setActiveTab('demo')}
              className={`px-3 py-1.5 rounded-lg font-medium transition cursor-pointer flex items-center space-x-1.5 ${
                activeTab === 'demo'
                  ? 'bg-white/10 text-white shadow-xs font-semibold'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Zap className="w-3 h-3 text-[#e5b364]" />
              <span>Speed Test</span>
            </button>

            <button
              onClick={() => setActiveTab('remote')}
              className={`px-3 py-1.5 rounded-lg font-medium transition cursor-pointer flex items-center space-x-1.5 ${
                activeTab === 'remote'
                  ? 'bg-white/10 text-white shadow-xs font-semibold'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Smartphone className="w-3 h-3 text-[#e5b364]" />
              <span>Mobile Remote</span>
            </button>
          </nav>

          {/* Right Action CTA */}
          <div className="flex items-center space-x-2.5">
            <button
              onClick={() => setIsConnectModalOpen(true)}
              className="px-3 py-1.5 rounded-lg border border-white/10 hover:border-[#e5b364]/40 bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white text-xs font-mono transition cursor-pointer hidden sm:flex items-center space-x-1.5"
            >
              <Smartphone className="w-3 h-3 text-[#e5b364]" />
              <span>Pair Mobile</span>
            </button>

            <a
              href="#download"
              className="px-3.5 py-1.5 rounded-lg bg-[#e5b364] hover:bg-[#d4a253] text-[#08080a] text-xs font-mono font-bold transition shadow-sm cursor-pointer flex items-center space-x-1"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download</span>
            </a>
          </div>
        </div>
      </header>

      {/* Main View Router */}
      <main className="relative z-10">
        {activeTab === 'landing' && (
          <LandingPage
            onOpenDemo={() => setActiveTab('demo')}
            onOpenRemote={() => setActiveTab('remote')}
            onOpenConnectModal={() => setIsConnectModalOpen(true)}
          />
        )}

        {activeTab === 'demo' && <DemoSandbox />}

        {activeTab === 'remote' && (
          <MobileRemote onOpenConnectModal={() => setIsConnectModalOpen(true)} />
        )}
      </main>

      {/* Pairing Modal */}
      <ConnectModal
        isOpen={isConnectModalOpen}
        onClose={() => setIsConnectModalOpen(false)}
        onSuccessfulPair={() => {
          setIsConnectModalOpen(false);
          setActiveTab('remote');
        }}
      />
    </div>
  );
};

export default App;
