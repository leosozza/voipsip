import path from 'node:path';
import { app, BrowserWindow, Menu, Tray, nativeImage, session, shell } from 'electron';

/**
 * Desktop shell: runs the local connector server in-process, shows its UI in a
 * window and keeps running in the tray so click-to-call and MicroSIP hooks work
 * with the window closed.
 */

const isDev = !app.isPackaged;

// Must be set before the server modules load (they read these at import time).
process.env.VOIPSIP_DATA_DIR ||= app.getPath('userData');
process.env.VOIPSIP_STATIC_DIR ||= isDev ? path.resolve(__dirname, '..', 'dist') : path.join(process.resourcesPath, 'ui');

const PORT = Number(process.env.VOIPSIP_PORT || 5180);
const APP_URL = `http://localhost:${PORT}/`;
const iconPath = isDev ? path.resolve(__dirname, '..', 'build', 'icon.png') : path.join(process.resourcesPath, 'icon.png');

let win: BrowserWindow | null = null;
let tray: Tray | null = null;
let quitting = false;

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => showWindow());
  app.whenReady().then(start);
}

async function start() {
  const { startServer } = await import('../server/index');
  startServer();

  // The softphone needs the microphone; only our own local UI may ask for it.
  session.defaultSession.setPermissionRequestHandler((wc, permission, callback) => {
    callback(permission === 'media' && wc.getURL().startsWith(APP_URL));
  });

  createTray();
  // Started by the OS at login: stay in the tray.
  if (!app.getLoginItemSettings().wasOpenedAtLogin) showWindow();
}

function isLocal(url: string) {
  return url.startsWith(APP_URL) || url.startsWith(`http://127.0.0.1:${PORT}/`);
}

function showWindow() {
  if (win) {
    if (win.isMinimized()) win.restore();
    win.show();
    win.focus();
    return;
  }
  win = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    title: 'VoipSip Connector',
    icon: iconPath,
    autoHideMenuBar: true,
    webPreferences: { contextIsolation: true, sandbox: true, nodeIntegration: false },
  });

  // Bitrix24 login/authorization happens in the user's browser, where they are already
  // signed in. The OAuth redirect lands on this same local server, so it works from any browser.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (!isLocal(url)) void shell.openExternal(url);
    return { action: 'deny' };
  });
  win.webContents.on('will-navigate', (event, url) => {
    if (!isLocal(url)) {
      event.preventDefault();
      void shell.openExternal(url);
    }
  });

  win.on('close', (event) => {
    if (!quitting) {
      event.preventDefault();
      win?.hide();
    }
  });
  win.on('closed', () => {
    win = null;
  });

  void win.loadURL(APP_URL);
}

function createTray() {
  const icon = nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 });
  tray = new Tray(icon);
  tray.setToolTip('VoipSip Connector');
  const rebuild = () =>
    tray?.setContextMenu(
      Menu.buildFromTemplate([
        { label: 'Abrir VoipSip Connector', click: showWindow },
        {
          label: 'Iniciar com o sistema',
          type: 'checkbox',
          checked: app.getLoginItemSettings().openAtLogin,
          click: (item) => {
            app.setLoginItemSettings({ openAtLogin: item.checked });
            rebuild();
          },
        },
        { type: 'separator' },
        {
          label: 'Sair',
          click: () => {
            quitting = true;
            app.quit();
          },
        },
      ]),
    );
  rebuild();
  tray.on('click', showWindow);
}

app.on('before-quit', () => {
  quitting = true;
});

// Keep running in the tray when all windows are closed.
app.on('window-all-closed', () => {});
