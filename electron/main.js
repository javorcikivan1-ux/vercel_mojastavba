import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import pkg from 'electron-updater';
const { autoUpdater } = pkg;


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Pre testovanie bez podpisu (remove in production if you buy a certificate)
autoUpdater.verifyUpdateCodeSignature = false;

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false, // Allows window.require in React
      enableRemoteModule: true
    },
    // ZMENA: Tu používame tvoje logo.png z hlavného priečinka
    icon: path.join(__dirname, '../logo.png')
  });

  mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  
  // Poslať verziu aplikácie do UI po načítaní
  mainWindow.webContents.on('did-finish-load', () => {
    mainWindow.webContents.send('app-version', app.getVersion());
  });
}

app.whenReady().then(() => {
  createWindow();

  // Check for updates immediately on start (optional)
  // autoUpdater.checkForUpdatesAndNotify();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// --- UPDATE EVENTS ---

// 1. UI požiada o kontrolu
ipcMain.on('check-for-update', () => {
  if (!app.isPackaged) {
    // V dev móde sa neaktualizuje
    mainWindow.webContents.send('update-not-available', 'V vývojárskom režime aktualizácie nefungujú.');
    return;
  }
  autoUpdater.checkForUpdates();
});

// 2. Je dostupná aktualizácia
autoUpdater.on('update-available', (info) => {
  mainWindow.webContents.send('update-available', info);
});

// 3. Nie je dostupná
autoUpdater.on('update-not-available', () => {
  mainWindow.webContents.send('update-not-available');
});

// 4. Chyba
autoUpdater.on('error', (err) => {
  mainWindow.webContents.send('update-error', err.message);
});

// 5. Sťahovanie
autoUpdater.on('download-progress', (progressObj) => {
  mainWindow.webContents.send('download-progress', progressObj.percent);
});

// 6. Stiahnuté - pripravené na inštaláciu
autoUpdater.on('update-downloaded', () => {
  mainWindow.webContents.send('update-downloaded');
});

// 7. UI požiada o inštaláciu
ipcMain.on('install-update', () => {
  autoUpdater.quitAndInstall();
});