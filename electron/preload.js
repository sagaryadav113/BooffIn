// BooffIn Electron Preload Script
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('booffinDesktop', {
  isDesktop: true,
  platform: 'windows',
  version: '1.0.0',
});
