const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('sadokDesktop', {
  platform: process.platform,
  getConfig: () => ipcRenderer.invoke('sadok:get-config'),
  setConfig: (config) => ipcRenderer.invoke('sadok:set-config', config),
  discoverServers: () => ipcRenderer.invoke('sadok:discover-servers'),
});
