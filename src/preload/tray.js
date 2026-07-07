const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('trayAPI', {
  sendAction: (action) => {
    ipcRenderer.send('tray-menu-action', action);
  },
  getScreenPermission: () => ipcRenderer.invoke('get-screen-permission'),
  requestScreenPermission: () => ipcRenderer.invoke('request-screen-permission'),
  onWillShow: (callback) => {
    ipcRenderer.on('tray-popup-will-show', () => callback());
  },
  resizePopup: (height) => ipcRenderer.send('tray-popup-resize', height),
  getEvolutionState: () => ipcRenderer.invoke('evolution:get-state'),
  getSettings: () => ipcRenderer.invoke('settings:get'),
  setSetting: (key, value) => ipcRenderer.send('settings:set', { key, value }),
  resetPet: () => ipcRenderer.invoke('settings:reset'),
});
