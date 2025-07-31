const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Server controls
  startServer: (port) => ipcRenderer.invoke('start-server', port),
  stopServer: () => ipcRenderer.invoke('stop-server'),
  getServerStatus: () => ipcRenderer.invoke('get-server-status'),
  
  // File operations
  selectFiles: () => ipcRenderer.invoke('select-files'),
  selectFolder: () => ipcRenderer.invoke('select-folder'),
  showSaveDialog: (filename) => ipcRenderer.invoke('show-save-dialog', filename),
  
  // Server events
  onServerEvent: (callback) => {
    ipcRenderer.on('server-event', (event, data) => callback(data));
  },
  
  onFileProgress: (callback) => {
    ipcRenderer.on('file-progress', (event, data) => callback(data));
  },
  
  onClientConnected: (callback) => {
    ipcRenderer.on('client-connected', (event, data) => callback(data));
  },
  
  onClientDisconnected: (callback) => {
    ipcRenderer.on('client-disconnected', (event, data) => callback(data));
  }
});

// Expose system info
const os = require('os');
contextBridge.exposeInMainWorld('system', {
  hostname: os.hostname()
});