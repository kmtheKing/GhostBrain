import { contextBridge, ipcRenderer } from 'electron';
import type { GhostBrainApi, PowerMode, SearchQueryPayload, ChatAskPayload } from '@ghostbrain/shared-types';

const api: GhostBrainApi = {
  // Folders
  listFolders: () => ipcRenderer.invoke('folders:list'),
  addFolder: (absPath?: string) => ipcRenderer.invoke('folders:add', absPath),
  removeFolder: (folderId: number) => ipcRenderer.invoke('folders:remove', folderId),

  // Indexing
  getIndexStatus: () => ipcRenderer.invoke('index:status'),
  onIndexStatus: (callback) => {
    const handler = (_: any, status: any) => callback(status);
    ipcRenderer.on('index:status', handler);
    return () => ipcRenderer.removeListener('index:status', handler);
  },
  pauseIndexing: (pause: boolean) => ipcRenderer.invoke('index:pause', pause),

  // Search & Chat
  search: (payload: SearchQueryPayload) => ipcRenderer.invoke('search:query', payload),
  ask: (payload: ChatAskPayload) => ipcRenderer.invoke('chat:ask', payload),
  onChatToken: (callback) => {
    const handler = (_: any, payload: any) => callback(payload);
    ipcRenderer.on('chat:token', handler);
    return () => ipcRenderer.removeListener('chat:token', handler);
  },
  onChatDone: (callback) => {
    const handler = (_: any, payload: any) => callback(payload);
    ipcRenderer.on('chat:done', handler);
    return () => ipcRenderer.removeListener('chat:done', handler);
  },

  // Power Modes
  getPowerMode: () => ipcRenderer.invoke('power:get'),
  setPowerMode: (mode: PowerMode) => ipcRenderer.invoke('power:set', mode),

  // Relay
  getRelayStatus: () => ipcRenderer.invoke('relay:status'),
  onRelayStatus: (callback) => {
    const handler = (_: any, status: any) => callback(status);
    ipcRenderer.on('relay:status', handler);
    return () => ipcRenderer.removeListener('relay:status', handler);
  },

  // Licensing
  getLicenseStatus: () => ipcRenderer.invoke('license:status'),
  activateLicense: (key: string) => ipcRenderer.invoke('license:activate', key),

  // Window Controls
  minimizeWindow: () => ipcRenderer.send('window:minimize'),
  maximizeWindow: () => ipcRenderer.send('window:maximize'),
  closeWindow: () => ipcRenderer.send('window:close')
};

// Expose safe context bridge
try {
  contextBridge.exposeInMainWorld('ghostbrain', api);
} catch (error) {
  console.error('[Preload] Failed to expose ghostbrain API:', error);
}
