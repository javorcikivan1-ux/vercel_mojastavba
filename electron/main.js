
import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import pkg from 'electron-updater';
const { autoUpdater } = pkg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Pre testovanie bez podpisu kódu (umožňuje update bez plateného certifikátu)
autoUpdater.verifyUpdateCodeSignature = false;
autoUpdater.autoDownload = false; // Chceme, aby užívateľ klikol na tlačidlo "Stiahnuť"
autoUpdater.logger = console;

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    // Používame logo.png z koreňového priečinka projektu
    icon: path.join(__dirname, '../logo.png'),
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false, // Umožňuje window.require('electron') vo frontende
    },
  });

  const isDev = !app.isPackaged;
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  // Poslať verziu aplikácie hneď po načítaní okna
  mainWindow.webContents.on('did-finish-load', () => {
    mainWindow.webContents.send('app-version', app.getVersion());
  });
}

app.whenReady().then(() => {
  createWindow();

  // Automatická kontrola updatov 3 sekundy po štarte
  if (app.isPackaged) {
    setTimeout(() => {
      autoUpdater.checkForUpdates();
    }, 3000);
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// --- KOMUNIKÁCIA S FRONTENDOM (IPC) ---

ipcMain.on('app-version', (event) => {
  event.sender.send('app-version', app.getVersion());
});

ipcMain.on('check-for-update', () => {
  if (app.isPackaged) {
    autoUpdater.checkForUpdates();
  } else {
    mainWindow.webContents.send('update-status', 'no-update');
  }
});

ipcMain.on('start-download', () => {
  autoUpdater.downloadUpdate();
});

ipcMain.on('install-update', () => {
  autoUpdater.quitAndInstall();
});

// --- EVENTY OD UPDATERU (Posielame na frontend) ---

autoUpdater.on('checking-for-update', () => {
  if (mainWindow) mainWindow.webContents.send('update-status', 'checking');
});

autoUpdater.on('update-available', (info) => {
  if (mainWindow) mainWindow.webContents.send('update-status', 'available', info.version);
});

autoUpdater.on('update-not-available', () => {
  if (mainWindow) mainWindow.webContents.send('update-status', 'no-update');
});

autoUpdater.on('error', (err) => {
  if (mainWindow) mainWindow.webContents.send('update-status', 'error', err.message);
});

autoUpdater.on('download-progress', (progressObj) => {
  if (mainWindow) mainWindow.webContents.send('download-progress', progressObj.percent);
});

autoUpdater.on('update-downloaded', () => {
  if (mainWindow) mainWindow.webContents.send('update-status', 'ready');
});
