import React, { useState, useEffect } from 'react';
import {
  Globe,
  Shield,
  Cpu,
  Search,
  Lock,
  ArrowLeft,
  Check,
  Zap,
  HardDrive,
  Activity,
  Sliders,
  Sparkles,
  Key,
  QrCode,
  Smartphone,
  Tablet,
  Laptop,
  Copy,
  RefreshCw,
  Trash2,
  Wifi,
  ExternalLink,
  Radio,
  FileCheck2,
  ShieldAlert
} from 'lucide-react';
import type { NetworkMode } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentMode: NetworkMode;
  currentModel: string;
  onSave: (mode: NetworkMode, model: string) => void;
}

type SettingsSection = 'network' | 'llm' | 'search' | 'security' | 'indexing';

interface ConnectedDevice {
  id: string;
  name: string;
  type: 'mobile' | 'tablet' | 'laptop';
  ip: string;
  connectionType: 'Direct Wi-Fi P2P' | 'E2E Cloud Relay';
  fingerprint: string;
  status: 'active' | 'syncing' | 'idle';
  lastPing: string;
  permissions: 'Full Query + Clip' | 'Read-Only Query';
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  currentMode,
  currentModel,
  onSave,
}) => {
  const [activeTab, setActiveTab] = useState<SettingsSection>('network');
  const [selectedMode, setSelectedMode] = useState<NetworkMode>(currentMode);
  const [selectedModel, setSelectedModel] = useState(currentModel);
  const [vectorWeight, setVectorWeight] = useState(60);
  const [sqlCipherActive, setSqlCipherActive] = useState(true);
  const [debounceMs, setDebounceMs] = useState(500);
  const [lowPowerGamingMode, setLowPowerGamingMode] = useState(false);
  const [isSavedToast, setIsSavedToast] = useState(false);

  // Mobile Pairing State
  const [otpCode, setOtpCode] = useState('GB-8492-XQ71');
  const [countdownSec, setCountdownSec] = useState(294); // ~5 min countdown
  const [copiedOtp, setCopiedOtp] = useState(false);
  const [enableMdns, setEnableMdns] = useState(true);
  const [allowMobileClipper, setAllowMobileClipper] = useState(true);
  const [restrictFolderScope, setRestrictFolderScope] = useState(false);

  // Connected Devices List
  const [connectedDevices, setConnectedDevices] = useState<ConnectedDevice[]>([
    {
      id: 'dev-1',
      name: 'iPhone 16 Pro — Mobile Safari',
      type: 'mobile',
      ip: '192.168.1.42',
      connectionType: 'Direct Wi-Fi P2P',
      fingerprint: 'ed25519:7f84...2e91',
      status: 'active',
      lastPing: '2s ago',
      permissions: 'Full Query + Clip',
    },
    {
      id: 'dev-2',
      name: 'iPad Pro 12.9" — Safari PWA',
      type: 'tablet',
      ip: '192.168.1.45',
      connectionType: 'E2E Cloud Relay',
      fingerprint: 'ed25519:3b19...99a0',
      status: 'idle',
      lastPing: '18m ago',
      permissions: 'Read-Only Query',
    },
  ]);

  useEffect(() => {
    setSelectedMode(currentMode);
    setSelectedModel(currentModel);
  }, [currentMode, currentModel]);

  // Countdown timer for pairing OTP
  useEffect(() => {
    if (!isOpen || activeTab !== 'network') return;
    const interval = setInterval(() => {
      setCountdownSec((prev) => (prev > 1 ? prev - 1 : 300));
    }, 1000);
    return () => clearInterval(interval);
  }, [isOpen, activeTab]);

  // Handle ESC key to close full-screen settings
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleApply = (e?: React.FormEvent) => {
    e?.preventDefault();
    onSave(selectedMode, selectedModel);
    if (window.ghostbrain?.setPowerMode) {
      window.ghostbrain.setPowerMode(lowPowerGamingMode ? 'low-power' : 'performance');
    }
    setIsSavedToast(true);
    setTimeout(() => {
      setIsSavedToast(false);
      onClose();
    }, 600);
  };

  const handleRegenerateOtp = () => {
    const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    const nums = '23456789';
    const randPart1 = Array.from({ length: 4 }, () => nums[Math.floor(Math.random() * nums.length)]).join('');
    const randPart2 = Array.from({ length: 4 }, () => letters[Math.floor(Math.random() * letters.length)]).join('');
    setOtpCode(`GB-${randPart1}-${randPart2}`);
    setCountdownSec(300);
  };

  const handleCopyOtp = () => {
    navigator.clipboard?.writeText(otpCode);
    setCopiedOtp(true);
    setTimeout(() => setCopiedOtp(false), 2000);
  };

  const handleDisconnectDevice = (id: string) => {
    setConnectedDevices((prev) => prev.filter((d) => d.id !== id));
  };

  const formatCountdown = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-slate-100 dark:bg-zinc-950 text-slate-800 dark:text-zinc-200 font-mono animate-in fade-in duration-200 select-none overflow-hidden"
      role="dialog"
      aria-modal="true"
    >
      {/* Top Navigation & Action Header */}
      <header className="h-14 bg-white dark:bg-zinc-900 border-b border-slate-200 dark:border-zinc-800 flex items-center justify-between px-6 shrink-0 shadow-xs">
        <div className="flex items-center space-x-4">
          <button
            type="button"
            onClick={onClose}
            className="flex items-center space-x-2 text-xs font-bold text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-100 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-zinc-800 hover:bg-slate-100 dark:hover:bg-zinc-800 transition cursor-pointer"
            title="Return to Main Workstation (Esc)"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Workstation</span>
            <kbd className="text-[10px] bg-slate-200 dark:bg-zinc-800 px-1 py-0.2 rounded text-slate-500 dark:text-zinc-400">Esc</kbd>
          </button>

          <div className="h-5 w-[1px] bg-slate-200 dark:bg-zinc-800" />

          <div>
            <h1 className="text-sm font-bold text-slate-900 dark:text-zinc-100 flex items-center space-x-2">
              <Sliders className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
              <span>GhostBrain System &amp; Network Settings</span>
            </h1>
            <p className="text-[10px] text-slate-500 dark:text-zinc-400">
              Connections, mobile pairing, QR authentication, hardware allocation &amp; SQLite security
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          {isSavedToast && (
            <span className="flex items-center space-x-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-bold animate-in fade-in">
              <Check className="w-4 h-4" />
              <span>Changes Saved!</span>
            </span>
          )}

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-slate-200 dark:border-zinc-800 text-xs font-semibold text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800 transition cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleApply}
            className="px-5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 active:bg-cyan-700 text-white font-bold text-xs shadow-md shadow-cyan-600/20 transition cursor-pointer flex items-center space-x-1.5"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Save &amp; Apply Changes</span>
          </button>
        </div>
      </header>

      {/* Main Full-Screen Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Section Navigation Sidebar */}
        <aside className="w-64 md:w-72 bg-white/70 dark:bg-zinc-900/60 border-r border-slate-200 dark:border-zinc-800 p-4 space-y-1.5 shrink-0 overflow-y-auto">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500 px-3 py-2">
            Configuration Domains
          </div>

          {[
            { id: 'network', label: 'Connections & Network', icon: Globe, desc: 'Mobile pairing, QR code & relay' },
            { id: 'llm', label: 'Local LLM & Hardware', icon: Cpu, desc: 'Model selection & VRAM mode' },
            { id: 'search', label: 'Hybrid RRF Search', icon: Search, desc: 'Vector vs BM25 weights' },
            { id: 'security', label: 'Security & SQLCipher', icon: Lock, desc: 'AES-256 database keys' },
            { id: 'indexing', label: 'File Ingestion & Watcher', icon: HardDrive, desc: 'BLAKE3 & debounce' },
          ].map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                type="button"
                key={item.id}
                onClick={() => setActiveTab(item.id as SettingsSection)}
                className={`w-full flex items-start space-x-3 p-3 rounded-xl text-left transition cursor-pointer ${
                  isActive
                    ? 'bg-cyan-50 dark:bg-cyan-950/40 text-cyan-800 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800/60 shadow-xs'
                    : 'text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800/60 hover:text-slate-900 dark:hover:text-zinc-200 border border-transparent'
                }`}
              >
                <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${isActive ? 'text-cyan-600 dark:text-cyan-400' : 'text-slate-400'}`} />
                <div>
                  <div className="text-xs font-bold leading-tight">{item.label}</div>
                  <div className="text-[10px] text-slate-400 dark:text-zinc-500 mt-0.5">{item.desc}</div>
                </div>
              </button>
            );
          })}

          <div className="pt-6 px-3">
            <div className="p-3 rounded-xl bg-slate-100 dark:bg-zinc-800/50 border border-slate-200 dark:border-zinc-800 text-[10px] space-y-1">
              <div className="font-bold text-slate-700 dark:text-zinc-300 flex items-center space-x-1">
                <Sparkles className="w-3 h-3 text-cyan-500" />
                <span>GhostBrain v0.0.1</span>
              </div>
              <p className="text-slate-500 dark:text-zinc-400 leading-normal">
                Personal Edition: 1-device offline Wi-Fi mobile sync enabled.
              </p>
            </div>
          </div>
        </aside>

        {/* Right Settings Detail Workspace */}
        <main className="flex-1 p-6 md:p-10 overflow-y-auto bg-slate-50 dark:bg-zinc-950">
          <div className="max-w-4xl space-y-8">
            {/* 1. CONNECTIONS & NETWORK (PRIMARY TAB) */}
            {activeTab === 'network' && (
              <section className="space-y-8 animate-in fade-in">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-zinc-800">
                  <div>
                    <h2 className="text-base font-bold text-slate-900 dark:text-zinc-100 flex items-center space-x-2">
                      <Globe className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                      <span>Connections &amp; Mobile Interaction</span>
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
                      Pair phones, tablets and web clients to query your second brain with zero-knowledge encryption.
                    </p>
                  </div>

                  {/* Mode Badge Indicator */}
                  <div className="flex items-center space-x-2 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 px-3 py-1.5 rounded-xl text-xs font-mono shadow-xs">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-slate-700 dark:text-zinc-300 font-semibold">
                      {selectedMode === 'cloud-relay' ? 'Cloud Relay: Online' : 'AirGap LAN: Active'}
                    </span>
                    <span className="text-slate-400 dark:text-zinc-600">|</span>
                    <span className="text-[10px] text-slate-500 dark:text-zinc-400">192.168.1.40:8443</span>
                  </div>
                </div>

                {/* Operating Paradigm Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Option 1: Cloud Relay */}
                  <div
                    onClick={() => setSelectedMode('cloud-relay')}
                    className={`p-4 rounded-xl border transition-all cursor-pointer ${
                      selectedMode === 'cloud-relay'
                        ? 'border-cyan-500 bg-white dark:bg-zinc-900 ring-2 ring-cyan-500/20 shadow-md'
                        : 'border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center space-x-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-cyan-500" />
                        <span className="font-bold text-xs text-slate-900 dark:text-zinc-100">Cloud Relay Mode</span>
                      </div>
                      <span className="text-[9px] px-2 py-0.5 rounded-full bg-cyan-100 dark:bg-cyan-900/60 text-cyan-800 dark:text-cyan-300 font-semibold border border-cyan-200 dark:border-cyan-700">
                        Cloudflare WSS
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 dark:text-zinc-400 leading-normal">
                      End-to-End encrypted tunnel using X25519 + HKDF-SHA256 + AES-256-GCM. Cloud servers only see encrypted ciphertext; query from cellular data anywhere.
                    </p>
                  </div>

                  {/* Option 2: AirGap Host */}
                  <div
                    onClick={() => setSelectedMode('airgap')}
                    className={`p-4 rounded-xl border transition-all cursor-pointer ${
                      selectedMode === 'airgap'
                        ? 'border-emerald-500 bg-white dark:bg-zinc-900 ring-2 ring-emerald-500/20 shadow-md'
                        : 'border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center space-x-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                        <span className="font-bold text-xs text-slate-900 dark:text-zinc-100">TLS-1.3 AirGap Host</span>
                      </div>
                      <span className="text-[9px] px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 font-semibold border border-emerald-200 dark:border-emerald-700">
                        Local Wi-Fi Only
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 dark:text-zinc-400 leading-normal">
                      Physical isolated local area network server. Works strictly on your local router with zero public internet dependency and zero cloud egress.
                    </p>
                  </div>
                </div>

                {/* THE STAR FEATURE: MOBILE PAIRING & DYNAMIC QR CODE CARD */}
                <div className="p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 shadow-sm space-y-6">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-zinc-800/80">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-zinc-100 flex items-center space-x-2">
                        <Smartphone className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                        <span>Pair New Mobile Device</span>
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                        Scan the dynamic cryptographic QR code or enter the 8-digit OTP on your phone.
                      </p>
                    </div>

                    <div className="flex items-center space-x-2">
                      <button
                        type="button"
                        onClick={handleRegenerateOtp}
                        className="flex items-center space-x-1.5 text-xs text-slate-600 dark:text-zinc-400 hover:text-cyan-600 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-800 transition cursor-pointer"
                        title="Generate Fresh Code"
                      >
                        <RefreshCw className="w-3 h-3" />
                        <span>Regenerate Code</span>
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                    {/* Stylized QR Code Visual */}
                    <div className="md:col-span-4 flex flex-col items-center justify-center p-5 rounded-2xl bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 space-y-3">
                      <div className="p-3 bg-white rounded-xl shadow-xs border border-slate-200">
                        {/* High-Contrast Stylized Vector QR Code Matrix */}
                        <svg className="w-36 h-36" viewBox="0 0 100 100" fill="currentColor">
                          {/* Corner Finder Top-Left */}
                          <rect x="5" y="5" width="28" height="28" rx="4" fill="#0f172a" />
                          <rect x="9" y="9" width="20" height="20" rx="2" fill="#ffffff" />
                          <rect x="13" y="13" width="12" height="12" rx="2" fill="#0284c7" />

                          {/* Corner Finder Top-Right */}
                          <rect x="67" y="5" width="28" height="28" rx="4" fill="#0f172a" />
                          <rect x="71" y="9" width="20" height="20" rx="2" fill="#ffffff" />
                          <rect x="75" y="13" width="12" height="12" rx="2" fill="#0284c7" />

                          {/* Corner Finder Bottom-Left */}
                          <rect x="5" y="67" width="28" height="28" rx="4" fill="#0f172a" />
                          <rect x="9" y="71" width="20" height="20" rx="2" fill="#ffffff" />
                          <rect x="13" y="75" width="12" height="12" rx="2" fill="#0284c7" />

                          {/* Timing Tracks */}
                          <circle cx="39" cy="18" r="3" fill="#0f172a" />
                          <circle cx="47" cy="18" r="3" fill="#0f172a" />
                          <circle cx="55" cy="18" r="3" fill="#0f172a" />
                          <circle cx="18" cy="39" r="3" fill="#0f172a" />
                          <circle cx="18" cy="47" r="3" fill="#0f172a" />
                          <circle cx="18" cy="55" r="3" fill="#0f172a" />

                          {/* Data Matrix Dots */}
                          <rect x="36" y="36" width="6" height="6" rx="1" fill="#0284c7" />
                          <rect x="46" y="36" width="6" height="6" rx="1" fill="#0f172a" />
                          <rect x="56" y="36" width="6" height="6" rx="1" fill="#0284c7" />
                          <rect x="36" y="46" width="6" height="6" rx="1" fill="#0f172a" />
                          <rect x="46" y="46" width="8" height="8" rx="2" fill="#0284c7" />
                          <rect x="58" y="46" width="6" height="6" rx="1" fill="#0f172a" />
                          <rect x="36" y="58" width="6" height="6" rx="1" fill="#0284c7" />
                          <rect x="46" y="58" width="6" height="6" rx="1" fill="#0f172a" />
                          <rect x="56" y="58" width="6" height="6" rx="1" fill="#0284c7" />

                          {/* Outer Data Dots */}
                          <rect x="68" y="38" width="6" height="6" rx="1" fill="#0f172a" />
                          <rect x="78" y="38" width="6" height="6" rx="1" fill="#0284c7" />
                          <rect x="88" y="38" width="6" height="6" rx="1" fill="#0f172a" />
                          <rect x="68" y="48" width="6" height="6" rx="1" fill="#0284c7" />
                          <rect x="88" y="48" width="6" height="6" rx="1" fill="#0f172a" />
                          <rect x="78" y="58" width="6" height="6" rx="1" fill="#0284c7" />
                          <rect x="88" y="58" width="6" height="6" rx="1" fill="#0f172a" />

                          <rect x="38" y="68" width="6" height="6" rx="1" fill="#0284c7" />
                          <rect x="48" y="68" width="6" height="6" rx="1" fill="#0f172a" />
                          <rect x="58" y="68" width="6" height="6" rx="1" fill="#0284c7" />
                          <rect x="38" y="78" width="6" height="6" rx="1" fill="#0f172a" />
                          <rect x="48" y="78" width="6" height="6" rx="1" fill="#0284c7" />
                          <rect x="38" y="88" width="6" height="6" rx="1" fill="#0284c7" />
                          <rect x="48" y="88" width="6" height="6" rx="1" fill="#0f172a" />
                          <rect x="58" y="88" width="6" height="6" rx="1" fill="#0284c7" />

                          {/* Alignment Pattern */}
                          <rect x="72" y="72" width="18" height="18" rx="3" fill="#0f172a" />
                          <rect x="75" y="75" width="12" height="12" rx="2" fill="#ffffff" />
                          <rect x="78" y="78" width="6" height="6" rx="1" fill="#0284c7" />
                        </svg>
                      </div>

                      <div className="flex items-center space-x-1.5 text-[11px] text-slate-500 font-mono">
                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-ping" />
                        <span>Expires in: {formatCountdown(countdownSec)}</span>
                      </div>
                    </div>

                    {/* Pairing Details & 3-Step Walkthrough */}
                    <div className="md:col-span-8 space-y-4">
                      {/* One-Time Pairing Code */}
                      <div>
                        <label className="block text-[11px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wide mb-1">
                          Manual Pairing Code (OTP)
                        </label>
                        <div className="flex items-center space-x-2">
                          <div className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 text-lg md:text-xl font-bold font-mono tracking-widest text-cyan-700 dark:text-cyan-300 shadow-inner flex-1 select-text">
                            {otpCode}
                          </div>
                          <button
                            type="button"
                            onClick={handleCopyOtp}
                            className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 hover:bg-slate-100 dark:hover:bg-zinc-800 text-xs font-semibold text-slate-700 dark:text-zinc-300 transition cursor-pointer flex items-center space-x-1.5 shrink-0"
                          >
                            {copiedOtp ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                            <span>{copiedOtp ? 'Copied' : 'Copy'}</span>
                          </button>
                        </div>
                      </div>

                      {/* 3-Step Quick Guide */}
                      <div className="space-y-2 pt-2">
                        <div className="text-[11px] font-bold text-slate-700 dark:text-zinc-300 uppercase tracking-wide">
                          How To Connect in 3 Simple Steps:
                        </div>
                        <div className="space-y-2 text-xs text-slate-600 dark:text-zinc-400">
                          <div className="flex items-start space-x-2">
                            <span className="w-5 h-5 rounded-full bg-cyan-100 dark:bg-cyan-950 text-cyan-700 dark:text-cyan-300 text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                              1
                            </span>
                            <span>
                              Open your mobile phone camera or visit <strong className="text-slate-800 dark:text-zinc-200">https://192.168.1.40:8443</strong> on Mobile Safari or Chrome.
                            </span>
                          </div>

                          <div className="flex items-start space-x-2">
                            <span className="w-5 h-5 rounded-full bg-cyan-100 dark:bg-cyan-950 text-cyan-700 dark:text-cyan-300 text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                              2
                            </span>
                            <span>
                              Scan the QR code or enter the 8-digit OTP code shown above to establish a cryptographic hand-shake.
                            </span>
                          </div>

                          <div className="flex items-start space-x-2">
                            <span className="w-5 h-5 rounded-full bg-cyan-100 dark:bg-cyan-950 text-cyan-700 dark:text-cyan-300 text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                              3
                            </span>
                            <span>
                              Your phone and desktop exchange pinned X25519 identity keys. Query your vault and push web clippings instantly!
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* CONNECTED DEVICES MANAGER */}
                <div className="p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 shadow-sm space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-zinc-800/80">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-zinc-100 flex items-center space-x-2">
                        <Wifi className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        <span>Authorized Paired Devices ({connectedDevices.length})</span>
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                        Active mobile and tablet clients authorized to query or clip into this workstation.
                      </p>
                    </div>

                    <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold font-mono bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-1 rounded-lg border border-emerald-200 dark:border-emerald-800">
                      P2P Zero-Knowledge Active
                    </span>
                  </div>

                  {connectedDevices.length === 0 ? (
                    <div className="p-8 text-center text-xs text-slate-400 dark:text-zinc-500">
                      No devices currently connected. Scan the QR code above to pair your phone.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {connectedDevices.map((dev) => (
                        <div
                          key={dev.id}
                          className="p-4 rounded-xl bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800/90 flex flex-col md:flex-row md:items-center justify-between gap-3 transition hover:border-slate-300"
                        >
                          <div className="flex items-start space-x-3">
                            <div className="p-2 rounded-lg bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-zinc-300 mt-0.5">
                              {dev.type === 'mobile' ? <Smartphone className="w-4 h-4" /> : <Tablet className="w-4 h-4" />}
                            </div>

                            <div className="space-y-1">
                              <div className="flex items-center space-x-2">
                                <span className="font-bold text-xs text-slate-900 dark:text-zinc-100">{dev.name}</span>
                                {dev.status === 'active' ? (
                                  <span className="flex items-center space-x-1 text-[10px] text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/50 px-1.5 py-0.2 rounded font-medium">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                    <span>Syncing ({dev.lastPing})</span>
                                  </span>
                                ) : (
                                  <span className="text-[10px] text-slate-500 dark:text-zinc-400 bg-slate-100 dark:bg-zinc-800 px-1.5 py-0.2 rounded">
                                    Idle ({dev.lastPing})
                                  </span>
                                )}
                              </div>

                              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500 dark:text-zinc-400">
                                <span>IP: <strong className="text-slate-700 dark:text-zinc-300">{dev.ip}</strong></span>
                                <span>•</span>
                                <span>Channel: <strong className="text-slate-700 dark:text-zinc-300">{dev.connectionType}</strong></span>
                                <span>•</span>
                                <span>Key: <code className="text-cyan-700 dark:text-cyan-400">{dev.fingerprint}</code></span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center space-x-3 self-end md:self-center">
                            <span className="text-[10px] px-2 py-0.5 rounded bg-slate-200/60 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 font-medium border border-slate-300/60 dark:border-zinc-700">
                              {dev.permissions}
                            </span>

                            <button
                              type="button"
                              onClick={() => handleDisconnectDevice(dev.id)}
                              className="p-1.5 rounded-lg border border-slate-200 dark:border-zinc-800 hover:border-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 text-slate-400 hover:text-red-600 transition cursor-pointer"
                              title="Revoke Device Access"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* ADVANCED NETWORK & MOBILE OPTIONS */}
                <div className="p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 shadow-sm space-y-4">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-zinc-100 pb-2 border-b border-slate-100 dark:border-zinc-800/80">
                    Network Discovery &amp; Clipper Policies
                  </h3>

                  <div className="space-y-4 text-xs">
                    {/* mDNS / Bonjour Discovery */}
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <div className="font-bold text-slate-900 dark:text-zinc-100">
                          Local Wi-Fi Discovery (mDNS / Bonjour Broadcast)
                        </div>
                        <div className="text-slate-500 dark:text-zinc-400 text-[11px]">
                          Allows mobile apps on your local network to auto-discover this desktop without typing an IP.
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={enableMdns}
                        onChange={(e) => setEnableMdns(e.target.checked)}
                        className="w-4 h-4 rounded text-cyan-600 accent-cyan-600 cursor-pointer"
                      />
                    </div>

                    {/* Mobile Clipper Buffer */}
                    <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-zinc-800/60">
                      <div className="space-y-0.5">
                        <div className="font-bold text-slate-900 dark:text-zinc-100">
                          Accept Mobile Web Clippings (Sealed Buffer)
                        </div>
                        <div className="text-slate-500 dark:text-zinc-400 text-[11px]">
                          Permit paired mobile devices to send web articles and screenshots into your inbox vault.
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={allowMobileClipper}
                        onChange={(e) => setAllowMobileClipper(e.target.checked)}
                        className="w-4 h-4 rounded text-cyan-600 accent-cyan-600 cursor-pointer"
                      />
                    </div>

                    {/* Restrict Folder Scope */}
                    <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-zinc-800/60">
                      <div className="space-y-0.5">
                        <div className="font-bold text-slate-900 dark:text-zinc-100">
                          Restrict Mobile Search Scope
                        </div>
                        <div className="text-slate-500 dark:text-zinc-400 text-[11px]">
                          Limit mobile query responses strictly to designated shared folders (e.g. ~/Projects/Docs only).
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={restrictFolderScope}
                        onChange={(e) => setRestrictFolderScope(e.target.checked)}
                        className="w-4 h-4 rounded text-cyan-600 accent-cyan-600 cursor-pointer"
                      />
                    </div>
                  </div>
                </div>
              </section>
            )}

            {/* 2. LOCAL LLM & HARDWARE */}
            {activeTab === 'llm' && (
              <section className="space-y-6 animate-in fade-in">
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-zinc-100">
                    Active Local LLM Sidecar &amp; VRAM Modes
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
                    Select your hardware execution model and toggle gaming/low-power memory release.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {[
                    { name: 'Gemma-2-2B', quant: 'Q4_K_M', backend: 'llama.cpp', context: '8,192 tokens', desc: 'Fast, lightweight local extraction model.' },
                    { name: 'Llama-3.2-3B', quant: 'Q4_K_S', backend: 'Ollama', context: '8,192 tokens', desc: 'Superior reasoning and structured output.' },
                    { name: 'Mistral-7B', quant: 'Q4_K_M', backend: 'llama.cpp', context: '16,384 tokens', desc: 'High context window for long research papers.' },
                    { name: 'DeepSeek-R1-7B', quant: 'Q4_K_M', backend: 'llama-server', context: '16,384 tokens', desc: 'Chain-of-thought mathematical reasoning.' },
                  ].map((m) => {
                    const isSelected = selectedModel === m.name;
                    return (
                      <div
                        key={m.name}
                        onClick={() => setSelectedModel(m.name)}
                        className={`p-4 rounded-xl border transition cursor-pointer ${
                          isSelected
                            ? 'border-cyan-500 bg-white dark:bg-zinc-900 ring-1 ring-cyan-500 shadow-xs'
                            : 'border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold text-xs text-slate-900 dark:text-zinc-100">{m.name}</span>
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-zinc-400 border border-slate-200 dark:border-zinc-700">
                            {m.backend}
                          </span>
                        </div>
                        <div className="text-[10px] text-cyan-600 dark:text-cyan-400 font-semibold mb-1">
                          {m.quant} • {m.context}
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-zinc-400 leading-normal">
                          {m.desc}
                        </p>
                      </div>
                    );
                  })}
                </div>

                <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 flex items-center justify-between">
                  <div className="space-y-1 pr-6">
                    <div className="flex items-center space-x-2">
                      <Zap className="w-4 h-4 text-amber-500" />
                      <span className="font-bold text-xs text-slate-900 dark:text-zinc-100">
                        Low-Power &amp; Gaming VRAM Release (<span className="text-amber-500">&lt; 3s Release</span>)
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-zinc-400 leading-relaxed">
                      Automatically ejects local LLM weights from dedicated GPU VRAM into host RAM when launching games or entering battery-saver mode.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={lowPowerGamingMode}
                    onChange={(e) => setLowPowerGamingMode(e.target.checked)}
                    className="w-5 h-5 rounded text-cyan-600 accent-cyan-600 cursor-pointer shrink-0"
                  />
                </div>
              </section>
            )}

            {/* 3. HYBRID RRF SEARCH TUNING */}
            {activeTab === 'search' && (
              <section className="space-y-6 animate-in fade-in">
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-zinc-100">
                    Reciprocal Rank Fusion (RRF) Hybrid Search Weights
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
                    Balance semantic dense vector cosine distance with keyword-exact SQLite FTS5 BM25 scoring.
                  </p>
                </div>

                <div className="p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 space-y-6">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                      RRF Blending Balance:
                    </span>
                    <span className="text-xs font-bold text-cyan-600 dark:text-cyan-400 font-mono bg-cyan-50 dark:bg-cyan-950/60 px-3 py-1 rounded-lg border border-cyan-200 dark:border-cyan-800">
                      {vectorWeight}% Dense Vector (sqlite-vec) / {100 - vectorWeight}% BM25 (FTS5)
                    </span>
                  </div>

                  <input
                    type="range"
                    min="10"
                    max="90"
                    value={vectorWeight}
                    onChange={(e) => setVectorWeight(Number(e.target.value))}
                    className="w-full accent-cyan-600 cursor-pointer h-2 bg-slate-100 dark:bg-zinc-800 rounded-lg"
                  />

                  <div className="grid grid-cols-2 gap-4 text-xs pt-2">
                    <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-zinc-800/40 border border-slate-200 dark:border-zinc-800">
                      <div className="font-bold text-slate-800 dark:text-zinc-200 mb-1">SQLite FTS5 (BM25)</div>
                      <p className="text-[11px] text-slate-500 dark:text-zinc-400 leading-normal">
                        Dominates for precise serial numbers, SQL table names, code identifiers, and exact file names.
                      </p>
                    </div>

                    <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-zinc-800/40 border border-slate-200 dark:border-zinc-800">
                      <div className="font-bold text-slate-800 dark:text-zinc-200 mb-1">sqlite-vec (Cosine)</div>
                      <p className="text-[11px] text-slate-500 dark:text-zinc-400 leading-normal">
                        Dominates for conceptual meaning, semantic paraphrasing, and cross-lingual thematic queries.
                      </p>
                    </div>
                  </div>
                </div>
              </section>
            )}

            {/* 4. SECURITY & SQLCIPHER */}
            {activeTab === 'security' && (
              <section className="space-y-6 animate-in fade-in">
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-zinc-100">
                    Security, Encryption &amp; Cryptographic Keys
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
                    Manage hardware-backed key derivation and local database encryption.
                  </p>
                </div>

                <div className="p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-bold text-xs text-slate-900 dark:text-zinc-100">
                        SQLCipher AES-256-CBC Database Encryption
                      </div>
                      <div className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                        Encrypts local vector tables, chunk payloads, and document manifests using Argon2id key derivation.
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={sqlCipherActive}
                      onChange={(e) => setSqlCipherActive(e.target.checked)}
                      className="w-5 h-5 rounded text-cyan-600 accent-cyan-600 cursor-pointer"
                    />
                  </div>

                  <div className="pt-4 border-t border-slate-100 dark:border-zinc-800/80 flex items-center justify-between text-xs font-mono">
                    <span className="text-slate-500">Device Identity Key:</span>
                    <span className="text-cyan-600 dark:text-cyan-400 font-bold flex items-center space-x-1">
                      <Key className="w-3.5 h-3.5" />
                      <span>ed25519:7f84...2e91</span>
                    </span>
                  </div>
                </div>
              </section>
            )}

            {/* 5. INGESTION & WATCHER */}
            {activeTab === 'indexing' && (
              <section className="space-y-6 animate-in fade-in">
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-zinc-100">
                    File Ingestion Pipeline &amp; Debounce Engine
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
                    Control file watcher sensitivity and BLAKE3 incremental hashing parameters.
                  </p>
                </div>

                <div className="p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-bold text-xs text-slate-900 dark:text-zinc-100">
                        File Write Stability Debounce Timer
                      </div>
                      <div className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                        Prevents indexing partial writes during active editor saving.
                      </div>
                    </div>
                    <span className="text-xs font-bold text-cyan-600 dark:text-cyan-400 bg-slate-100 dark:bg-zinc-800 px-2 py-1 rounded">
                      {debounceMs} ms
                    </span>
                  </div>

                  <input
                    type="range"
                    min="200"
                    max="2000"
                    step="100"
                    value={debounceMs}
                    onChange={(e) => setDebounceMs(Number(e.target.value))}
                    className="w-full accent-cyan-600 cursor-pointer"
                  />
                </div>
              </section>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};
