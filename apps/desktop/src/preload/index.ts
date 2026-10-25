import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron';
import type {
  GhostBrainApi,
  PowerMode,
  SearchQueryPayload,
  ChatAskPayload,
  IndexStatus,
  ChatTokenPayload,
  ChatDonePayload,
  RelayStatus,
  SystemTelemetry,
  PairedDeviceRecord,
  PairingSessionInfo
} from '@ghostbrain/shared-types';

const api: GhostBrainApi = {
  // Folders
  listFolders: () => ipcRenderer.invoke('folders:list'),
  addFolder: (absPath?: string) => ipcRenderer.invoke('folders:add', absPath),
  removeFolder: (folderId: number) => ipcRenderer.invoke('folders:remove', folderId),

  // Indexing
  getIndexStatus: () => ipcRenderer.invoke('index:status'),
  onIndexStatus: (callback: (status: IndexStatus) => void) => {
    const handler = (_: IpcRendererEvent, status: IndexStatus): void => callback(status);
    ipcRenderer.on('index:status', handler);
    return () => ipcRenderer.removeListener('index:status', handler);
  },
  pauseIndexing: (pause: boolean) => ipcRenderer.invoke('index:pause', pause),

  // Search & Chat
  search: (payload: SearchQueryPayload) => ipcRenderer.invoke('search:query', payload),
  ask: (payload: ChatAskPayload) => ipcRenderer.invoke('chat:ask', payload),
  onChatToken: (callback: (payload: ChatTokenPayload) => void) => {
    const handler = (_: IpcRendererEvent, payload: ChatTokenPayload): void => callback(payload);
    ipcRenderer.on('chat:token', handler);
    return () => ipcRenderer.removeListener('chat:token', handler);
  },
  onChatDone: (callback: (payload: ChatDonePayload) => void) => {
    const handler = (_: IpcRendererEvent, payload: ChatDonePayload): void => callback(payload);
    ipcRenderer.on('chat:done', handler);
    return () => ipcRenderer.removeListener('chat:done', handler);
  },

  // Power Modes
  getPowerMode: () => ipcRenderer.invoke('power:get'),
  setPowerMode: (mode: PowerMode) => ipcRenderer.invoke('power:set', mode),

  // Relay
  getRelayStatus: () => ipcRenderer.invoke('relay:status'),
  onRelayStatus: (callback: (status: RelayStatus) => void) => {
    const handler = (_: IpcRendererEvent, status: RelayStatus): void => callback(status);
    ipcRenderer.on('relay:status', handler);
    return () => ipcRenderer.removeListener('relay:status', handler);
  },

  // Licensing
  getLicenseStatus: () => ipcRenderer.invoke('license:status'),
  activateLicense: (key: string) => ipcRenderer.invoke('license:activate', key),

  // Device Pairing & Keychain
  generatePairingSession: (): Promise<PairingSessionInfo> => ipcRenderer.invoke('devices:generatePairing'),
  listPairedDevices: (): Promise<PairedDeviceRecord[]> => ipcRenderer.invoke('devices:list'),
  revokePairedDevice: (deviceId: string): Promise<boolean> => ipcRenderer.invoke('devices:revoke', deviceId),

  // Tier-based LLM Setup
  setupTier: (tier: 'low' | 'balanced' | 'high') => ipcRenderer.invoke('llm:setupTier', tier),
  onPullProgress: (callback: (progress: any) => void) => {
    const handler = (_: IpcRendererEvent, p: any) => callback(p);
    ipcRenderer.on('llm:pull-progress', handler);
    return () => ipcRenderer.removeListener('llm:pull-progress', handler);
  },
  installRecommendedModel: () => ipcRenderer.invoke('llm:install-recommended-model'),
  onModelInstallProgress: (callback: (progress: any) => void) => {
    const handler = (_: IpcRendererEvent, p: any) => callback(p);
    ipcRenderer.on('llm:download-progress', handler);
    return () => ipcRenderer.removeListener('llm:download-progress', handler);
  },
  // System Telemetry & Native Dialogs
  getSystemTelemetry: (): Promise<SystemTelemetry> => ipcRenderer.invoke('system:telemetry'),
  selectModelFile: (): Promise<string | null> => ipcRenderer.invoke('dialog:selectModelFile'),

  // Window Controls
  minimizeWindow: () => ipcRenderer.send('window:minimize'),
  maximizeWindow: () => ipcRenderer.send('window:maximize'),
  closeWindow: () => ipcRenderer.send('window:close'),
  onMaximizeChange: (callback: (isMaximized: boolean) => void) => {
    const handler = (_: IpcRendererEvent, isMax: boolean): void => callback(isMax);
    ipcRenderer.on('window:maximize-change', handler);
    return () => ipcRenderer.removeListener('window:maximize-change', handler);
  },

  // Master RAG Operations (Universal Ingestion & Safe Write)
  selectRagFolder: () => ipcRenderer.invoke('rag:select-folder'),
  indexRagFolder: (folderPath: string) => ipcRenderer.invoke('rag:index-folder', folderPath),
  ragSearch: (query: string, limit?: number) => ipcRenderer.invoke('rag:search', { query, limit }),
  readRagFile: (targetPath: string) => ipcRenderer.invoke('rag:read-file', targetPath),
  writeRagFile: (targetPath: string, content: string) => ipcRenderer.invoke('rag:write-file', targetPath, content),
  onRagIndexProgress: (callback: (progress: any) => void) => {
    const handler = (_: IpcRendererEvent, p: any): void => callback(p);
    ipcRenderer.on('rag:index-progress', handler);
    return () => ipcRenderer.removeListener('rag:index-progress', handler);
  },

  // Continuous Chat Timeline Persistence
  getChatHistory: (conversationId?: string) => ipcRenderer.invoke('chat:get-history', conversationId),
  saveChatMessage: (msg: any) => ipcRenderer.invoke('chat:save-message', msg),
  clearChatHistory: (conversationId?: string) => ipcRenderer.invoke('chat:clear-history', conversationId),
  onThoughtStep: (callback: (step: string) => void) => {
    const handler = (_: IpcRendererEvent, step: string): void => callback(step);
    ipcRenderer.on('rag:thought-step', handler);
    return () => ipcRenderer.removeListener('rag:thought-step', handler);
  },
  onDevicesUpdated: (callback: (devices: any[]) => void) => {
    const handler = (_: IpcRendererEvent, devices: any[]): void => callback(devices);
    ipcRenderer.on('devices:updated', handler);
    return () => ipcRenderer.removeListener('devices:updated', handler);
  },
  onRemoteMessage: (callback: (msg: any) => void) => {
    const handler = (_: IpcRendererEvent, msg: any): void => callback(msg);
    ipcRenderer.on('chat:remote-message', handler);
    return () => ipcRenderer.removeListener('chat:remote-message', handler);
  }
};

// Expose safe context bridge
try {
  contextBridge.exposeInMainWorld('ghostbrain', api);
} catch (error) {
  console.error('[Preload] Failed to expose ghostbrain API:', error);
}
