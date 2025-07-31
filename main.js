const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const { startServer, stopServer, getServerStatus } = require('./tcp_server');
const { getLocalIP } = require('./utils/ipUtils');

let mainWindow;
let serverInstance = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    icon: path.join(__dirname, 'assets', 'icon.png'),
    titleBarStyle: 'default',
    show: false
  });

  mainWindow.loadFile('ui/index.html');

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
    if (serverInstance) {
      stopServer();
    }
  });

  // Open external links in default browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    if (serverInstance) {
      stopServer();
    }
    app.quit();
  }
});

// IPC handlers
ipcMain.handle('start-server', async (event, port = 3000) => {
  try {
    const localIP = getLocalIP();
    if (!localIP) {
      throw new Error('Could not determine local IP address');
    }
    
    serverInstance = await startServer(port, localIP);
    return {
      success: true,
      ip: localIP,
      port: port,
      url: `http://${localIP}:${port}`
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
});

ipcMain.handle('stop-server', async () => {
  try {
    if (serverInstance) {
      await stopServer();
      serverInstance = null;
    }
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('get-server-status', () => {
  return getServerStatus();
});

ipcMain.handle('select-files', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile', 'multiSelections'],
    filters: [
      { name: 'All Files', extensions: ['*'] }
    ]
  });
  
  return result;
});

ipcMain.handle('select-folder', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory']
  });
  
  return result;
});

ipcMain.handle('show-save-dialog', async (event, filename) => {
  const result = await dialog.showSaveDialog(mainWindow, {
    defaultPath: filename,
    filters: [
      { name: 'All Files', extensions: ['*'] }
    ]
  });
  
  return result;
});

// Handle app protocol for future mobile integration
if (process.defaultApp) {
  if (process.argv.length >= 2) {
    app.setAsDefaultProtocolClient('thunderbolt', process.execPath, [path.resolve(process.argv[1])]);
  }
} else {
  app.setAsDefaultProtocolClient('thunderbolt');
}