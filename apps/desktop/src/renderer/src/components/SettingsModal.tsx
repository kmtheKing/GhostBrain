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
  ShieldAlert,
  Plus,
  FolderOpen,
  SlidersHorizontal,
  Gauge,
  Layers,
  AlertCircle,
  CheckCircle2,
  Server
} from 'lucide-react';
import type { NetworkMode } from '../types';

import type { TelemetryState } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentMode: NetworkMode;
  currentModel: string;
  onSave: (mode: NetworkMode, model: string) => void;
  telemetry?: TelemetryState;
}

type SettingsSection = 'network' | 'llm' | 'search' | 'security' | 'indexing';

interface CustomModel {
  id: string;
  name: string;
  backend: string;
  quant: string;
  context: string;
  desc: string;
  pathOrEndpoint: string;
  ramEstimate: string;
  isCustom: true;
}

interface DefaultModel {
  name: string;
  backend: string;
  quant: string;
  context: string;
  desc: string;
  ramEstimate: string;
  family: string;
}

const DEFAULT_MODELS: DefaultModel[] = [
  {
    name: 'Gemma 4 (2B Instruction)',
    backend: 'llama.cpp / Ollama',
    quant: 'Q4_K_M',
    context: '8,192 tokens',
    desc: 'Google DeepMind lightweight model. Ultra-fast file extraction & document summarization with low battery consumption.',
    ramEstimate: '2.4 GB',
    family: 'Google DeepMind'
  },
  {
    name: 'Qwen 2.5 (7B Coder & Reasoning)',
    backend: 'llama.cpp / Ollama',
    quant: 'Q4_K_M',
    context: '32,768 tokens',
    desc: 'Alibaba Cloud premier reasoning & code engine. High-capacity 32K context with structured JSON and tool calling.',
    ramEstimate: '5.4 GB',
    family: 'Alibaba Cloud'
  },
  {
    name: 'DeepSeek-R1-7B',
    backend: 'llama-server',
    quant: 'Q4_K_M',
    context: '16,384 tokens',
    desc: 'Chain-of-thought mathematical reasoning and rigorous step-by-step logic solver.',
    ramEstimate: '5.2 GB',
    family: 'DeepSeek'
  },
  {
    name: 'Mistral-7B-Instruct',
    backend: 'llama.cpp',
    quant: 'Q4_K_M',
    context: '16,384 tokens',
    desc: 'High context window ideal for deep document synthesis and cross-file research.',
    ramEstimate: '4.8 GB',
    family: 'Mistral AI'
  },
  {
    name: 'Llama-3.2-3B',
    backend: 'Ollama',
    quant: 'Q4_K_S',
    context: '8,192 tokens',
    desc: 'Balanced reasoning and instruction-following for general desktop assistance.',
    ramEstimate: '3.1 GB',
    family: 'Meta / Llama'
  }
];

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
  telemetry,
}) => {
  const [activeTab, setActiveTab] = useState<SettingsSection>('network');
  const [selectedMode, setSelectedMode] = useState<NetworkMode>(currentMode);
  const [selectedModel, setSelectedModel] = useState(currentModel);
  const [vectorWeight, setVectorWeight] = useState(60);
  const [sqlCipherActive, setSqlCipherActive] = useState(true);
  const [debounceMs, setDebounceMs] = useState(500);
  const [lowPowerGamingMode, setLowPowerGamingMode] = useState(false);
  const [isSavedToast, setIsSavedToast] = useState(false);

  // User-Centric Local LLM Performance Tier State
  const [selectedTier, setSelectedTier] = useState<'low' | 'balanced' | 'high'>(() => {
    return (localStorage.getItem('ghostbrain_active_tier') as any) || 'balanced';
  });
  const [isSettingUpTier, setIsSettingUpTier] = useState(false);
  const [tierProgress, setTierProgress] = useState(0);

  // Local LLM Model Management State
  const [modelFilter, setModelFilter] = useState<'all' | 'default' | 'custom'>('all');
  const [isAddingModel, setIsAddingModel] = useState(false);
  const [customModels, setCustomModels] = useState<CustomModel[]>(() => {
    try {
      const saved = localStorage.getItem('ghostbrain_custom_models');
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });

  // Custom Model Form Inputs
  const [newModelName, setNewModelName] = useState('');
  const [newModelPath, setNewModelPath] = useState('');
  const [newModelBackend, setNewModelBackend] = useState('llama.cpp');
  const [newModelQuant, setNewModelQuant] = useState('Q4_K_M');
  const [newModelContext, setNewModelContext] = useState('16,384 tokens');
  const [newModelDesc, setNewModelDesc] = useState('');
  const [modelFormError, setModelFormError] = useState('');
  const [installingModel, setInstallingModel] = useState<string | null>(null);
  const [installedModels, setInstalledModels] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('ghostbrain_installed_models');
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });

  const handleInstallAndConnectModel = (modelName: string) => {
    setInstallingModel(modelName);
    setTimeout(() => {
      setInstallingModel(null);
      setSelectedModel(modelName);
      if (!installedModels.includes(modelName)) {
        const next = [...installedModels, modelName];
        setInstalledModels(next);
        try {
          localStorage.setItem('ghostbrain_installed_models', JSON.stringify(next));
        } catch {}
      }
    }, 900);
  };

  // Live System RAM Allocation State
  const hostTotalRamGB = 16.0;
  const osReservedRamGB = 4.0;
  const [ramBudgetGB, setRamBudgetGB] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('ghostbrain_ram_budget_gb');
      if (saved) return Number(saved);
    } catch {}
    return 6.0;
  });

  // Hardware Specifications State
  const [gpuOffloadLayers, setGpuOffloadLayers] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('ghostbrain_gpu_layers');
      if (saved) return Number(saved);
    } catch {}
    return 28;
  });
  const [gpuBackend, setGpuBackend] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('ghostbrain_gpu_backend');
      if (saved) return saved;
    } catch {}
    return 'auto';
  });
  const [cpuThreads, setCpuThreads] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('ghostbrain_cpu_threads');
      if (saved) return Number(saved);
    } catch {}
    return 6;
  });
  const [kvCacheSizeMB, setKvCacheSizeMB] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('ghostbrain_kv_cache_size');
      if (saved) return Number(saved);
    } catch {}
    return 1024;
  });
  const [kvCacheType, setKvCacheType] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('ghostbrain_kv_cache_type');
      if (saved) return saved;
    } catch {}
    return 'q8_0';
  });
  const [flashAttention, setFlashAttention] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('ghostbrain_flash_attention');
      if (saved !== null) return saved === 'true';
    } catch {}
    return true;
  });
  const [mmapEnabled, setMmapEnabled] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('ghostbrain_mmap');
      if (saved !== null) return saved === 'true';
    } catch {}
    return true;
  });

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

  const loadPairingAndDevices = async () => {
    if (window.ghostbrain?.generatePairingSession) {
      try {
        const session = await window.ghostbrain.generatePairingSession();
        if (session) {
          setOtpCode(session.userCode);
          setCountdownSec(session.expiresInSec || 300);
        }
      } catch (err) {
        console.error('Failed to generate pairing session:', err);
      }
    }
    if (window.ghostbrain?.listPairedDevices) {
      try {
        const devices = await window.ghostbrain.listPairedDevices();
        if (devices && devices.length > 0) {
          setConnectedDevices(devices as any);
        }
      } catch (err) {
        console.error('Failed to load paired devices:', err);
      }
    }
  };

  // Countdown timer and live pairing session load
  useEffect(() => {
    if (!isOpen || activeTab !== 'network') return;
    loadPairingAndDevices();

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
    try {
      localStorage.setItem('ghostbrain_ram_budget_gb', String(ramBudgetGB));
      localStorage.setItem('ghostbrain_gpu_layers', String(gpuOffloadLayers));
      localStorage.setItem('ghostbrain_gpu_backend', gpuBackend);
      localStorage.setItem('ghostbrain_cpu_threads', String(cpuThreads));
      localStorage.setItem('ghostbrain_kv_cache_size', String(kvCacheSizeMB));
      localStorage.setItem('ghostbrain_kv_cache_type', kvCacheType);
      localStorage.setItem('ghostbrain_flash_attention', String(flashAttention));
      localStorage.setItem('ghostbrain_mmap', String(mmapEnabled));
      localStorage.setItem('ghostbrain_custom_models', JSON.stringify(customModels));
    } catch {}
    setIsSavedToast(true);
    setTimeout(() => {
      setIsSavedToast(false);
      onClose();
    }, 600);
  };

  const handleAddCustomModel = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newModelName.trim()) {
      setModelFormError('Please provide a descriptive model name.');
      return;
    }
    if (!newModelPath.trim()) {
      setModelFormError('Please specify the local .gguf file path or server endpoint URL.');
      return;
    }
    const modelId = `custom-${Date.now()}`;
    const newModel: CustomModel = {
      id: modelId,
      name: newModelName.trim(),
      pathOrEndpoint: newModelPath.trim(),
      backend: newModelBackend,
      quant: newModelQuant,
      context: newModelContext,
      desc: newModelDesc.trim() || 'User-registered custom local inference model.',
      ramEstimate: `${(ramBudgetGB * 0.75).toFixed(1)} GB`,
      isCustom: true
    };
    const updated = [newModel, ...customModels];
    setCustomModels(updated);
    setSelectedModel(newModel.name);
    try {
      localStorage.setItem('ghostbrain_custom_models', JSON.stringify(updated));
    } catch {}
    setNewModelName('');
    setNewModelPath('');
    setNewModelDesc('');
    setModelFormError('');
    setIsAddingModel(false);
  };

  const handleDeleteCustomModel = (id: string, name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = customModels.filter((m) => m.id !== id);
    setCustomModels(updated);
    try {
      localStorage.setItem('ghostbrain_custom_models', JSON.stringify(updated));
    } catch {}
    if (selectedModel === name) {
      setSelectedModel('Gemma-2-2B');
    }
  };

  const handleRegenerateOtp = async () => {
    if (window.ghostbrain?.generatePairingSession) {
      try {
        const session = await window.ghostbrain.generatePairingSession();
        if (session) {
          setOtpCode(session.userCode);
          setCountdownSec(300);
          return;
        }
      } catch {}
    }
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

  const handleDisconnectDevice = async (id: string) => {
    if (window.ghostbrain?.revokePairedDevice) {
      try {
        await window.ghostbrain.revokePairedDevice(id);
      } catch (err) {
        console.error('Failed to revoke device via IPC:', err);
      }
    }
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
        <aside className="w-64 md:w-72 bg-white/70 dark:bg-zinc-900/60 border-r border-slate-200 dark:border-zinc-800 p-4 flex flex-col shrink-0 overflow-y-auto">
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

          {/* Bottom Left: Package Tier & Engine Version Card */}
          <div className="mt-auto pt-6">
            <div className="p-3.5 rounded-xl bg-slate-100/90 dark:bg-zinc-900/90 border border-slate-200 dark:border-zinc-800/90 text-[11px] space-y-2 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-800 dark:text-zinc-100 flex items-center space-x-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-cyan-500" />
                  <span>GhostBrain Desktop</span>
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded font-mono font-bold bg-cyan-100 dark:bg-cyan-950 text-cyan-700 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800">
                  v0.0.1
                </span>
              </div>

              <div className="space-y-1 text-[10px] text-slate-500 dark:text-zinc-400 font-mono">
                <div className="flex justify-between items-center">
                  <span>Package Tier:</span>
                  <strong className="text-slate-700 dark:text-zinc-200 font-semibold">Personal Edition ($49/yr)</strong>
                </div>
                <div className="flex justify-between items-center">
                  <span>Core Library:</span>
                  <span className="text-slate-600 dark:text-zinc-400">@ghostbrain/core v0.0.1</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Channel:</span>
                  <span className="text-slate-600 dark:text-zinc-400">Stable Release</span>
                </div>
                <div className="flex justify-between items-center pt-1 border-t border-slate-200/60 dark:border-zinc-800/60">
                  <span>License:</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center space-x-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    <span>Perpetual Fallback Active</span>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </aside>

        {/* Right Settings Detail Workspace */}
        <main className="flex-1 p-6 md:p-10 overflow-y-auto bg-slate-50 dark:bg-zinc-950">
          <div className="max-w-4xl space-y-8">
            {/* 1. CONNECTIONS & NETWORK (PRIMARY TAB) */}
            {activeTab === 'network' && (
              <section className="space-y-6 animate-in fade-in">
                {/* Header */}
                <div className="pb-4 border-b border-slate-200 dark:border-zinc-800">
                  <h2 className="text-base font-bold text-slate-900 dark:text-zinc-100 flex items-center space-x-2">
                    <Globe className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                    <span>Connections &amp; Mobile Interaction</span>
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
                    Pair phones, tablets and web clients to query your second brain with zero-knowledge encryption.
                  </p>
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
            {activeTab === 'llm' && (() => {
              const freeHostRamMB = Math.max(1024, (telemetry?.hostTotalRamMB || 16384) - (telemetry?.hostUsedRamMB || 6144));
              const freeHostRamGB = Number((freeHostRamMB / 1024).toFixed(1));
              const maxSliderGB = Math.max(2.0, Math.min(32.0, freeHostRamGB));

              const TIERS = [
                {
                  id: 'low',
                  name: 'Low Performance',
                  badge: 'Eco / Lightweight',
                  minRam: 2.0,
                  tag: 'gemma2:2b',
                  desc: 'Fast document search, basic summaries, minimal battery drain. Optimized for 4GB–8GB laptops without dedicated GPU.',
                  fit: 'Low-Spec Laptops & PCs'
                },
                {
                  id: 'balanced',
                  name: 'Balanced Performance',
                  badge: 'Standard (Recommended)',
                  minRam: 3.5,
                  tag: 'llama3.2:3b',
                  desc: 'High-accuracy reasoning, cross-document analysis, structured data insights. Recommended for general daily workflows.',
                  fit: 'Standard 8GB–16GB Desktops'
                },
                {
                  id: 'high',
                  name: 'Full Power',
                  badge: 'Deep Intelligence',
                  minRam: 5.5,
                  tag: 'qwen2.5:7b',
                  desc: 'Complex code synthesis, deep multi-step logic, long research papers. For high-spec multi-core PCs.',
                  fit: 'High-Spec Workstations'
                }
              ];

              const currentTierObj = TIERS.find(t => t.id === selectedTier) || TIERS[1];
              const isBudgetSufficient = ramBudgetGB >= currentTierObj.minRam;

              return (
              <section className="space-y-6 animate-in fade-in pb-12 select-none">
                {/* Header */}
                <div className="pb-4 border-b border-slate-200 dark:border-zinc-800">
                  <h2 className="text-base font-bold text-slate-900 dark:text-zinc-100 flex items-center space-x-2">
                    <Cpu className="w-5 h-5 text-cyan-500" />
                    <span>Local AI Model &amp; System Memory Allocation</span>
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
                    Configure your local AI engine by performance level. The app automatically ensures your hardware specifications satisfy the selected tier before downloading.
                  </p>
                </div>

                {/* Section 1: Simplified Live Memory Overview */}
                <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 space-y-4 shadow-xs">
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-zinc-100 flex items-center space-x-2">
                    <HardDrive className="w-4 h-4 text-cyan-500" />
                    <span>Real-Time Host Memory Overview</span>
                  </div>

                  {/* 2 Clear Metric Boxes */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Box 1: App Memory in Use */}
                    <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-zinc-800/50 border border-slate-200 dark:border-zinc-800 flex items-center justify-between">
                      <div>
                        <div className="text-[10px] text-slate-400 dark:text-zinc-500 uppercase font-bold">
                          GhostBrain App Memory In Use
                        </div>
                        <div className="text-lg font-bold text-slate-800 dark:text-zinc-100 mt-0.5 font-mono">
                          {telemetry?.hostRamMB || 180} MB
                        </div>
                        <div className="text-[10px] text-slate-400 dark:text-zinc-500">
                          Live daemon footprint
                        </div>
                      </div>
                      <Activity className="w-5 h-5 text-cyan-500 shrink-0" />
                    </div>

                    {/* Box 2: Available Free Host RAM */}
                    <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-zinc-800/50 border border-slate-200 dark:border-zinc-800 flex items-center justify-between">
                      <div>
                        <div className="text-[10px] text-slate-400 dark:text-zinc-500 uppercase font-bold">
                          Available Free Host RAM
                        </div>
                        <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400 mt-0.5 font-mono">
                          {freeHostRamGB} GB Free
                        </div>
                        <div className="text-[10px] text-slate-400 dark:text-zinc-500">
                          Ready for local AI allocation
                        </div>
                      </div>
                      <HardDrive className="w-5 h-5 text-emerald-500 shrink-0" />
                    </div>
                  </div>

                  {/* Memory Allocation Slider */}
                  <div className="pt-2 space-y-2">
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="font-bold text-slate-700 dark:text-zinc-300">
                        Permitted GhostBrain RAM Budget:
                      </span>
                      <span className="font-bold text-cyan-600 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-950/60 px-3 py-1 rounded-lg border border-cyan-200 dark:border-cyan-800">
                        {ramBudgetGB.toFixed(1)} GB of {freeHostRamGB} GB Free
                      </span>
                    </div>

                    <input
                      type="range"
                      min="1.0"
                      max={maxSliderGB}
                      step="0.5"
                      value={ramBudgetGB}
                      onChange={(e) => setRamBudgetGB(Number(e.target.value))}
                      className="w-full accent-cyan-600 cursor-pointer h-2.5 bg-slate-100 dark:bg-zinc-800 rounded-lg transition"
                    />

                    <div className="flex justify-between text-[10px] text-slate-400 dark:text-zinc-500 font-mono">
                      <span>1.0 GB (Minimum)</span>
                      <span>2.5 GB</span>
                      <span>4.0 GB</span>
                      <span>{maxSliderGB.toFixed(1)} GB (Safe Free Limit)</span>
                    </div>
                  </div>
                </div>

                {/* Section 2: Integrated Model Choices (3 Clean Performance Tiers) */}
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-zinc-100 font-mono">
                        GhostBrain Integrated AI Engines ({TIERS.length} Performance Levels)
                      </h3>
                      <span className="text-[10px] text-cyan-600 dark:text-cyan-400 font-mono bg-cyan-50 dark:bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-200 dark:border-cyan-800">
                        1-Click Ready
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5">
                      Choose the performance level tailored to your computer. No technical model names or token counts required.
                    </p>
                  </div>

                  {/* 3 Tier Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {TIERS.map((tier) => {
                      const isSelected = selectedTier === tier.id;
                      const satisfiesBudget = ramBudgetGB >= tier.minRam;

                      return (
                        <div
                          key={tier.id}
                          onClick={() => setSelectedTier(tier.id as any)}
                          className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                            isSelected
                              ? 'border-cyan-500 bg-white dark:bg-zinc-900 ring-2 ring-cyan-500/70 shadow-sm'
                              : 'border-slate-200 dark:border-zinc-800 bg-white/70 dark:bg-zinc-900/40 hover:border-slate-300 dark:hover:border-zinc-700'
                          }`}
                        >
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-slate-900 dark:text-zinc-100">
                                {tier.name}
                              </span>
                              <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${
                                satisfiesBudget
                                  ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                                  : 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800'
                              }`}>
                                Min {tier.minRam} GB RAM
                              </span>
                            </div>

                            <div className="text-[10px] text-cyan-600 dark:text-cyan-400 font-mono font-semibold">
                              {tier.badge} • {tier.fit}
                            </div>

                            <p className="text-[11px] text-slate-500 dark:text-zinc-400 leading-relaxed">
                              {tier.desc}
                            </p>
                          </div>

                          <div className="pt-3 mt-3 border-t border-slate-100 dark:border-zinc-800/80 flex items-center justify-between text-[10px] font-mono">
                            {satisfiesBudget ? (
                              <span className="flex items-center space-x-1 text-emerald-600 dark:text-emerald-400 font-semibold">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Hardware Supported</span>
                              </span>
                            ) : (
                              <span className="flex items-center space-x-1 text-amber-600 dark:text-amber-400 font-semibold">
                                <AlertCircle className="w-3.5 h-3.5" />
                                <span>Requires {tier.minRam} GB Budget</span>
                              </span>
                            )}

                            {isSelected && (
                              <span className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse"></span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Section 3: Smart Hardware Guardrail & 1-Click Action */}
                  <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 space-y-3 shadow-xs">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div>
                        <div className="text-xs font-bold text-slate-900 dark:text-zinc-100 flex items-center space-x-2">
                          <span>Selected Tier:</span>
                          <strong className="text-cyan-600 dark:text-cyan-400 font-mono">{currentTierObj.name}</strong>
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5">
                          {isBudgetSufficient ? (
                            <span className="text-emerald-600 dark:text-emerald-400 flex items-center space-x-1 font-medium">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Specifications validated! Your {ramBudgetGB.toFixed(1)} GB allocation satisfies the {currentTierObj.minRam} GB requirement.</span>
                            </span>
                          ) : (
                            <span className="text-amber-600 dark:text-amber-400 flex items-center space-x-1 font-medium">
                              <AlertCircle className="w-3.5 h-3.5" />
                              <span>Insufficient RAM budget. Move the slider up to at least {currentTierObj.minRam} GB to unlock this tier.</span>
                            </span>
                          )}
                        </div>
                      </div>

                      {/* 1-Click Action Button */}
                      <button
                        type="button"
                        disabled={!isBudgetSufficient || isSettingUpTier}
                        onClick={async () => {
                          if (!isBudgetSufficient) return;
                          setIsSettingUpTier(true);
                          setTierProgress(25);
                          try {
                            if (window.ghostbrain?.setupTier) {
                              await window.ghostbrain.setupTier(selectedTier);
                            }
                            setTierProgress(100);
                            setSelectedModel(`${currentTierObj.name} Engine`);
                            localStorage.setItem('ghostbrain_active_tier', selectedTier);
                          } catch (err) {
                            console.error('Setup tier error:', err);
                          } finally {
                            setTimeout(() => {
                              setIsSettingUpTier(false);
                              setTierProgress(0);
                            }, 800);
                          }
                        }}
                        className={`px-5 py-2.5 rounded-xl font-bold font-mono text-xs transition cursor-pointer flex items-center justify-center space-x-2 shrink-0 ${
                          !isBudgetSufficient
                            ? 'bg-slate-100 dark:bg-zinc-800 text-slate-400 dark:text-zinc-600 cursor-not-allowed border border-slate-200 dark:border-zinc-700'
                            : isSettingUpTier
                            ? 'bg-cyan-600 text-white shadow-xs'
                            : selectedModel.includes(currentTierObj.name)
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-md shadow-cyan-600/20'
                        }`}
                      >
                        {isSettingUpTier ? (
                          <span>Installing Engine ({tierProgress}%)...</span>
                        ) : selectedModel.includes(currentTierObj.name) ? (
                          <>
                            <CheckCircle2 className="w-4 h-4" />
                            <span>Active Engine Connected</span>
                          </>
                        ) : isBudgetSufficient ? (
                          <>
                            <Check className="w-4 h-4" />
                            <span>Download &amp; Setup ({currentTierObj.name})</span>
                          </>
                        ) : (
                          <>
                            <AlertCircle className="w-4 h-4" />
                            <span>Requires {currentTierObj.minRam} GB Budget</span>
                          </>
                        )}
                      </button>
                    </div>

                    {isSettingUpTier && (
                      <div className="space-y-1 pt-1">
                        <div className="w-full bg-slate-100 dark:bg-zinc-800 h-2 rounded-full overflow-hidden">
                          <div
                            className="bg-cyan-500 h-full rounded-full transition-all duration-300"
                            style={{ width: `${tierProgress}%` }}
                          />
                        </div>
                        <div className="text-[10px] text-slate-400 dark:text-zinc-500 font-mono text-right">
                          Configuring local sidecar... {tierProgress}%
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Section 4: Power User Custom Model File Loader */}
                <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 space-y-2.5 shadow-xs">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-slate-800 dark:text-zinc-200 font-mono">
                        Have Your Own Model on Disk?
                      </span>
                      <p className="text-[11px] text-slate-500 dark:text-zinc-400">
                        Power users can load any custom `.gguf` file directly from local storage.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={async () => {
                        if (window.ghostbrain?.selectModelFile) {
                          try {
                            const selected = await window.ghostbrain.selectModelFile();
                            if (selected) {
                              const base = selected.split(/[/\\]/).pop()?.replace(/\.[^/.]+$/, '') || 'Custom Model';
                              setSelectedModel(`Custom: ${base}`);
                              localStorage.setItem('ghostbrain_custom_path', selected);
                            }
                          } catch (err) {
                            console.error('File select error:', err);
                          }
                        }
                      }}
                      className="px-3.5 py-1.5 rounded-xl border border-slate-300 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 text-xs font-mono font-semibold hover:border-cyan-500 transition flex items-center space-x-1.5 cursor-pointer shrink-0"
                    >
                      <FolderOpen className="w-3.5 h-3.5 text-cyan-500" />
                      <span>Browse .gguf File...</span>
                    </button>
                  </div>
                </div>
              </section>
            );
            })()}

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
