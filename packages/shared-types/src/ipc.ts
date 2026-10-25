export type PowerMode = 'performance' | 'balanced' | 'low-power';

export interface WatchedFolder {
  id: number;
  absPath: string;
  label?: string;
  isEnabled: boolean;
  createdAt: number;
  chunkCount?: number;
}

export interface IndexStatus {
  pending: number;
  indexed: number;
  errors: number;
  etaSec: number;
  isPaused: boolean;
}

export interface SearchHit {
  chunkId: number;
  documentId: number;
  relPath: string;
  headingPath?: string;
  text: string;
  rrfScore: number;
}

export interface SearchQueryPayload {
  query: string;
  scope?: {
    allowedFolderIds?: number[];
  };
  limit?: number;
}

export interface ChatCitation {
  chunkId: number;
  documentId: number;
  relPath: string;
  score: number;
  tag?: string;
  headingPath?: string | null;
}

export interface ChatAskPayload {
  conversationId?: number;
  query: string;
}

export interface ChatAskResponse {
  streamId: string;
}

export interface ChatTokenPayload {
  streamId: string;
  delta: string;
}

export interface ChatDonePayload {
  streamId: string;
  citations: ChatCitation[];
  latencyMs: number;
}

export interface RelayStatus {
  connected: boolean;
  deviceId?: string;
  peersCount: number;
}

export interface LicenseStatus {
  tier: 'PERSONAL' | 'CLOUD+' | 'CLINIC';
  status: 'active' | 'grace' | 'degraded' | 'unlicensed';
  validUntil?: number;
  updatesUntil?: number;
  offlineGraceRemainingDays?: number;
}

export interface PairedDeviceRecord {
  id: string;
  name: string;
  kind: 'mobile' | 'tablet' | 'laptop';
  fingerprint: string;
  connectionType: string;
  ip?: string;
  permissions: string;
  status: 'active' | 'syncing' | 'idle' | 'revoked';
  lastPingAt?: number;
  createdAt: number;
}

export interface PairingSessionInfo {
  userCode: string;
  qrPayload: string;
  expiresInSec: number;
  fingerprint: string;
}

export interface SystemTelemetry {
  cpuLoad: number;
  cpuCores: number;
  cpuModel: string;
  totalRamMB: number;
  freeRamMB: number;
  usedRamMB: number;
  processHeapMB: number;
  processRssMB: number;
  platform: string;
  arch: string;
  hostname: string;
  uptimeSec: number;
  isModelOnline: boolean;
  installedModels: string[];
}

// IPC Channels Typed Interface
export interface GhostBrainApi {
  // Folders
  listFolders: () => Promise<WatchedFolder[]>;
  addFolder: (absPath?: string) => Promise<WatchedFolder | null>;
  removeFolder: (folderId: number) => Promise<boolean>;

  // Indexing
  getIndexStatus: () => Promise<IndexStatus>;
  onIndexStatus: (callback: (status: IndexStatus) => void) => () => void;
  pauseIndexing: (pause: boolean) => Promise<boolean>;

  // Search & Chat
  search: (payload: SearchQueryPayload) => Promise<SearchHit[]>;
  ask: (payload: ChatAskPayload) => Promise<ChatAskResponse>;
  onChatToken: (callback: (payload: ChatTokenPayload) => void) => () => void;
  onChatDone: (callback: (payload: ChatDonePayload) => void) => () => void;

  // Power Modes
  getPowerMode: () => Promise<PowerMode>;
  setPowerMode: (mode: PowerMode) => Promise<boolean>;

  // Relay
  getRelayStatus: () => Promise<RelayStatus>;
  onRelayStatus: (callback: (status: RelayStatus) => void) => () => void;

  // Licensing
  getLicenseStatus: () => Promise<LicenseStatus>;
  activateLicense: (key: string) => Promise<boolean>;

  // Device Pairing & Keychain
  generatePairingSession: () => Promise<PairingSessionInfo>;
  listPairedDevices: () => Promise<PairedDeviceRecord[]>;
  revokePairedDevice: (deviceId: string) => Promise<boolean>;

  // Tier-based LLM Setup & On-Demand Catalog Installer
  setupTier?: (tier: 'low' | 'balanced' | 'high') => Promise<{ success: boolean; model: string }>;
  onPullProgress?: (callback: (progress: any) => void) => () => void;
  installRecommendedModel?: () => Promise<{ success: boolean; modelName: string; tier: string }>;
  onModelInstallProgress?: (callback: (progress: { percent: number; downloadedMB: number; totalMB: number; modelName: string }) => void) => () => void;
  // System Telemetry & Native Dialogs
  getSystemTelemetry: () => Promise<SystemTelemetry>;
  selectModelFile: () => Promise<string | null>;

  // Master RAG Foundation Channels
  selectRagFolder?: () => Promise<string | null>;
  indexRagFolder?: (folderPath: string) => Promise<any>;
  ragSearch?: (query: string, limit?: number) => Promise<any>;
  searchRag?: (payload: { query: string; limit?: number }) => Promise<any>;
  readRagFile?: (filePath: string) => Promise<{ path: string; content: string; isBinary?: boolean; isCompanion?: boolean; previewMarkdown?: string }>;
  writeRagFile?: (filePath: string, content: string) => Promise<{ path: string; backupPath?: string; isCompanion: boolean }>;
  onRagIndexProgress?: (callback: (progress: any) => void) => () => void;


  // Continuous Chat Timeline Persistence
  getChatHistory?: (conversationId?: string) => Promise<PersistedChatMessage[]>;
  saveChatMessage?: (msg: PersistedChatMessage) => Promise<boolean>;
  clearChatHistory?: (conversationId?: string) => Promise<boolean>;
  onThoughtStep?: (callback: (step: string) => void) => () => void;

  // Window
  minimizeWindow: () => void;
  maximizeWindow: () => void;
  closeWindow: () => void;
  onMaximizeChange?: (callback: (isMaximized: boolean) => void) => () => void;
}

export interface PersistedChatMessage {
  id: string;
  conversationId?: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  thoughts?: any;
  toolCalls?: any;
  citations?: any;
  createdAt?: number;
}

