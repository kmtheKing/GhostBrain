import React, { useState } from 'react';
import { DioramaHero } from './components/3d/DioramaHero';
import { LandingPage } from './components/landing/LandingPage';
import { DemoSandbox } from './components/demo/DemoSandbox';
import { MobileRemote } from './components/remote/MobileRemote';
import { ConnectModal } from './components/landing/ConnectModal';
import { Shield, Zap, Smartphone, Sparkles, Globe, Download } from 'lucide-react';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'landing' | 'demo' | 'remote'>('landing');
  const [isConnectModalOpen, setIsConnectModalOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#060608] text-[#f0ebe1] relative overflow-x-hidden selection:bg-[#e5b364] selection:text-[#060608]">
      {/* 1. Ambient Background Noise Overlay */}
      <div className="noise-overlay" />

      {/* 2. Fixed 3D Diorama WebGL Canvas (Active across all tabs with variable camera depth) */}
      <DioramaHero />

      {/* 3. Sleek Luxury Navigation Header */}
      <header className="sticky top-0 z-40 w-full backdrop-blur-xl bg-[#060608]/70 border-b border-white/5 transition-all">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          {/* Brand Logo */}
          <div
            onClick={() => setActiveTab('landing')}
            className="flex items-center space-x-2.5 cursor-pointer group"
          >
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#e5b364] to-[#78541e] p-[1px] shadow-lg shadow-[#e5b364]/10 group-hover:shadow-[#e5b364]/30 transition">
              <div className="w-full h-full rounded-xl bg-[#0d0d12] flex items-center justify-center">
                <Shield className="w-4 h-4 text-[#e5b364]" />
              </div>
            </div>
            <div>
              <span className="font-serif font-bold text-base tracking-wider text-[#f0ebe1] group-hover:text-[#e5b364] transition">
                GHOSTBRAIN
              </span>
              <span className="text-[9px] font-mono text-[#8e887d] block -mt-1 tracking-widest uppercase">
                100% Sovereign AI
              </span>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="flex items-center p-1 rounded-xl bg-[#0d0d12] border border-white/10 text-xs font-mono">
            <button
              onClick={() => setActiveTab('landing')}
              className={`px-3 py-1.5 rounded-lg font-medium transition cursor-pointer flex items-center space-x-1.5 ${
                activeTab === 'landing'
                  ? 'bg-[#e5b364] text-[#060608] font-bold shadow-xs'
                  : 'text-[#8e887d] hover:text-[#f0ebe1]'
              }`}
            >
              <Globe className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">3D Overview</span>
            </button>

            <button
              onClick={() => setActiveTab('demo')}
              className={`px-3 py-1.5 rounded-lg font-medium transition cursor-pointer flex items-center space-x-1.5 ${
                activeTab === 'demo'
                  ? 'bg-[#e5b364] text-[#060608] font-bold shadow-xs'
                  : 'text-[#8e887d] hover:text-[#f0ebe1]'
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Speed Demo</span>
            </button>

            <button
              onClick={() => setActiveTab('remote')}
              className={`px-3 py-1.5 rounded-lg font-medium transition cursor-pointer flex items-center space-x-1.5 ${
                activeTab === 'remote'
                  ? 'bg-[#e5b364] text-[#060608] font-bold shadow-xs'
                  : 'text-[#8e887d] hover:text-[#f0ebe1]'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>Mobile Remote</span>
            </button>
          </nav>

          {/* Right Action CTA */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setIsConnectModalOpen(true)}
              className="px-3.5 py-1.5 rounded-xl bg-[#e5b364] hover:bg-[#d4a253] text-[#060608] text-xs font-mono font-bold transition shadow-md shadow-[#e5b364]/20 cursor-pointer hidden md:flex items-center space-x-1.5"
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>Pair Mobile</span>
            </button>
          </div>
        </div>
      </header>

      {/* 4. Active Main View */}
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

      {/* 5. Mobile Pairing Modal */}
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
