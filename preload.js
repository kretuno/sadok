const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('sadokDesktop', {
  platform: process.platform,
  getConfig: () => ipcRenderer.invoke('sadok:get-config'),
  setConfig: (config) => ipcRenderer.invoke('sadok:set-config', config),
  discoverServers: () => ipcRenderer.invoke('sadok:discover-servers'),
  
  // Автооновлення
  checkForUpdates: () => ipcRenderer.invoke('sadok:check-for-updates'),
  downloadUpdate: () => ipcRenderer.invoke('sadok:download-update'),
  installUpdate: () => ipcRenderer.invoke('sadok:install-update'),
  
  onUpdateAvailable: (callback) => {
    const listener = (_event, info) => callback(info);
    ipcRenderer.on('sadok:update-available', listener);
    return () => ipcRenderer.removeListener('sadok:update-available', listener);
  },
  onUpdateNotAvailable: (callback) => {
    const listener = () => callback();
    ipcRenderer.on('sadok:update-not-available', listener);
    return () => ipcRenderer.removeListener('sadok:update-not-available', listener);
  },
  onDownloadProgress: (callback) => {
    const listener = (_event, progress) => callback(progress);
    ipcRenderer.on('sadok:download-progress', listener);
    return () => ipcRenderer.removeListener('sadok:download-progress', listener);
  },
  onUpdateDownloaded: (callback) => {
    const listener = () => callback();
    ipcRenderer.on('sadok:update-downloaded', listener);
    return () => ipcRenderer.removeListener('sadok:update-downloaded', listener);
  },
  onUpdateError: (callback) => {
    const listener = (_event, err) => callback(err);
    ipcRenderer.on('sadok:update-error', listener);
    return () => ipcRenderer.removeListener('sadok:update-error', listener);
  }
});

