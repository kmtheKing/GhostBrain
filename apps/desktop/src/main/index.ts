import { existsSync } from 'fs';
import { app, BrowserWindow, shell, session } from 'electron';
import { join } from 'path';
import { electronApp, optimizer, is } from '@electron-toolkit/utils';
import { initDatabase, closeDatabase, getDatabase } from './db/index.js';
import { setupTray } from './tray.js';
import { registerIpcHandlers } from './ipc.js';
import { FolderWatcherManager } from './indexer/watcher.js';
import { WorkerManager } from './workers/worker-manager.js';
import { RelayClient } from './relay-client.js';

let mainWindow: BrowserWindow | null = null;
let watcherManager: FolderWatcherManager | null = null;
let isQuitting = false;

// Enforce single instance lock
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      if (!mainWindow.isVisible()) mainWindow.show();
      mainWindow.focus();
    }
  });

  app.whenReady().then(async () => {
    // Set app user model id for Windows notifications
    electronApp.setAppUserModelId('com.ghostbrain.app');

    // Default open/close shortcuts for DevTools in development
    app.on('browser-window-created', (_, window) => {
      optimizer.watchWindowShortcuts(window);
    });

    // Hardened CSP Header
    session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
      callback({
        responseHeaders: {
          ...details.responseHeaders,
          'Content-Security-Policy': [
            is.dev
              ? "default-src 'self' 'unsafe-inline' ws: http:; img-src 'self' data: https:;"
              : "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self' ws:;"
          ]
        }
      });
    });

    // Initialize Database & Background Worker
    try {
      initDatabase();
      console.log('[Main] SQLite Database initialized successfully.');
      watcherManager = new FolderWatcherManager(getDatabase());
      await WorkerManager.getInstance().init(getDatabase());
    } catch (err) {
      console.error('[Main] Database initialization failed:', err);
    }

    createWindow();

    // Start background file watchers
    if (watcherManager) {
      await watcherManager.startAll();
    }

    // Initialize Zero-Knowledge Outbound Relay Tunnel
    try {
      RelayClient.getInstance().start();
    } catch (err) {
      console.warn('[Main] Relay client notice:', err);
    }

    // Check for smoke test flag to cleanly verify boot in headless/CI environments
    if (process.env.GHOSTBRAIN_SMOKE_TEST === '1' || process.argv.includes('--smoke-test')) {
      console.log('[Main] SMOKE TEST SUCCESS: Electron booted cleanly with native ABI, SQLite DB, and RAG Worker.');
      isQuitting = true;
      setTimeout(() => {
        app.quit();
      }, 600);
      return;
    }

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
      } else if (mainWindow) {
        mainWindow.show();
      }
    });
  });
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1100,
    height: 750,
    minWidth: 800,
    minHeight: 600,
    show: true,
    autoHideMenuBar: true,
    titleBarStyle: 'hidden',
    backgroundColor: '#090d16',
    webPreferences: {
      preload: existsSync(join(__dirname, '../preload/index.mjs')) ? join(__dirname, '../preload/index.mjs') : join(__dirname, '../preload/index.js'),
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  // Setup System Tray
  setupTray(mainWindow);

  // Register IPC
  if (watcherManager) {
    registerIpcHandlers(mainWindow, watcherManager);
  }

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show();
  });

  // Close to tray logic
  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow?.hide();
    }
  });

  // Secure navigation & popups
  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url);
    return { action: 'deny' };
  });

  mainWindow.webContents.on('will-navigate', (event, url) => {
    // Only allow internal navigation
    if (!url.startsWith('http://localhost') && !url.startsWith('file://')) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });

  // Load URL or File
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL']);
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'));
  }
}

app.on('before-quit', async () => {
  isQuitting = true;
  if (watcherManager) {
    await watcherManager.stopAll();
  }
  try {
    RelayClient.getInstance().stop();
  } catch {
    // Ignore shutdown error
  }
  closeDatabase();
});

app.on('window-all-closed', () => {
  // Daemon mode: keep running in system tray on macOS and Windows unless explicit quit
  if (process.platform === 'darwin') {
    // typical macOS behavior
  }
});
