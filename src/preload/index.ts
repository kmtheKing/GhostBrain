import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron';

const api = {
  // Folders
  listFolders: () => ipcRenderer.invoke('folders:list'),
  addFolder: (absPath?: string) => ipcRenderer.invoke('folders:add', absPath),
  removeFolder: (folderId: number) => ipcRenderer.invoke('folders:remove', folderId),

  // Search & Chat
  search: (payload: any) => ipcRenderer.invoke('search:query', payload),
  ask: (payload: any) => ipcRenderer.invoke('chat:ask', payload),
  onChatToken: (callback: (payload: any) => void) => {
    const handler = (_: IpcRendererEvent, payload: any): void => callback(payload);
    ipcRenderer.on('chat:token', handler);
    return () => ipcRenderer.removeListener('chat:token', handler);
  },
  onChatDone: (callback: (payload: any) => void) => {
    const handler = (_: IpcRendererEvent, payload: any): void => callback(payload);
    ipcRenderer.on('chat:done', handler);
    return () => ipcRenderer.removeListener('chat:done', handler);
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
  }
};

try {
  contextBridge.exposeInMainWorld('ghostbrain', api);
} catch (error) {
  console.error('[Preload] Failed to expose ghostbrain API:', error);
}
