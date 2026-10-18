import { Tray, Menu, nativeImage, app, BrowserWindow } from 'electron';
import type { PowerMode } from '@ghostbrain/shared-types';

let tray: Tray | null = null;
let currentPowerMode: PowerMode = 'performance';
let isIndexingPaused = false;

export function setupTray(mainWindow: BrowserWindow): Tray {
  if (tray) {
    return tray;
  }

  // Generate a minimal clean 16x16 tray icon programmatically (or load from assets)
  // Transparent base with cyan dot
  const icon = nativeImage.createFromBuffer(
    Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAAXNSR0IArs4c6QAAAFNJREFUOE9jZKAQMFKon2H4f+p/hkGG4f+p/3Ez8P///4ehgYGBgRGfAkb8CjAaBqNgMIIgP4M0/h+H/2cYkF1g+H8a3o0wZlC26WCEhMGggYEBABFqJc6EaL86AAAAAElFTkSuQmCC',
      'base64'
    )
  );

  tray = new Tray(icon);
  tray.setToolTip('GhostBrain Daemon — Active');

  const updateMenu = (): void => {
    const contextMenu = Menu.buildFromTemplate([
      {
        label: 'Open GhostBrain',
        click: (): void => {
          mainWindow.show();
          mainWindow.focus();
        }
      },
      { type: 'separator' },
      {
        label: `Indexing: ${isIndexingPaused ? 'Paused' : 'Active'}`,
        click: (): void => {
          isIndexingPaused = !isIndexingPaused;
          updateMenu();
        }
      },
      {
        label: 'Power Mode',
        submenu: [
          {
            label: 'Performance (GPU)',
            type: 'radio',
            checked: currentPowerMode === 'performance',
            click: (): void => {
              currentPowerMode = 'performance';
              updateMenu();
            }
          },
          {
            label: 'Balanced',
            type: 'radio',
            checked: currentPowerMode === 'balanced',
            click: (): void => {
              currentPowerMode = 'balanced';
              updateMenu();
            }
          },
          {
            label: 'Low-Power (CPU-Only / Gaming)',
            type: 'radio',
            checked: currentPowerMode === 'low-power',
            click: (): void => {
              currentPowerMode = 'low-power';
              updateMenu();
            }
          }
        ]
      },
      { type: 'separator' },
      {
        label: 'Quit GhostBrain',
        click: (): void => {
          (app as any).isQuitting = true;
          app.quit();
        }
      }
    ]);

    tray?.setContextMenu(contextMenu);
  };

  tray.on('double-click', () => {
    if (mainWindow.isVisible()) {
      mainWindow.hide();
    } else {
      mainWindow.show();
      mainWindow.focus();
    }
  });

  updateMenu();
  return tray;
}

export function getPowerMode(): PowerMode {
  return currentPowerMode;
}

export function setPowerMode(mode: PowerMode): void {
  currentPowerMode = mode;
}

export function isIndexingCurrentlyPaused(): boolean {
  return isIndexingPaused;
}
