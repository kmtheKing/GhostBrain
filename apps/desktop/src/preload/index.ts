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
  SystemTelemetry
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
  }
};

// Expose safe context bridge
try {
  contextBridge.exposeInMainWorld('ghostbrain', api);
} catch (error) {
  console.error('[Preload] Failed to expose ghostbrain API:', error);
}
