const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('petAPI', {
  setIgnoreMouseEvents: (ignore, options) => {
    ipcRenderer.send('set-ignore-mouse-events', ignore, options);
  },
  onActiveWindowInfo: (callback) => {
    ipcRenderer.on('active-window-info', (_event, data) => callback(data));
  },
  onCursorPosition: (callback) => {
    ipcRenderer.on('cursor-position', (_event, data) => callback(data));
  },
  onDockState: (callback) => {
    ipcRenderer.on('dock-state', (_event, data) => callback(data));
  },
  onScreenPermissionMissing: (callback) => {
    ipcRenderer.on('screen-permission-missing', () => callback());
  },
  getStone: () => ipcRenderer.invoke('evolution:get-stone'),
  onStoneConfirmed: (callback) => {
    ipcRenderer.on('evolution:stone-confirmed', (_event, stoneType) => callback(stoneType));
  },
});
