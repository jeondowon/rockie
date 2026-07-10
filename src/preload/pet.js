const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("petAPI", {
  setIgnoreMouseEvents: (ignore, options) => {
    ipcRenderer.send("set-ignore-mouse-events", ignore, options);
  },
  onActiveWindowInfo: (callback) => {
    ipcRenderer.on("active-window-info", (_event, data) => callback(data));
  },
  onCursorPosition: (callback) => {
    ipcRenderer.on("cursor-position", (_event, data) => callback(data));
  },
  onDockState: (callback) => {
    ipcRenderer.on("dock-state", (_event, data) => callback(data));
  },
  onScreenPermissionMissing: (callback) => {
    ipcRenderer.on("screen-permission-missing", () => callback());
  },
  onEvolved: (callback) => {
    ipcRenderer.on("evolution:evolved", (_event, info) => callback(info));
  },
  onSkinChange: (callback) => {
    ipcRenderer.on("pet:skin-change", (_event, info) => callback(info));
  },
  onShowHeart: (callback) => {
    ipcRenderer.on("pet:show-heart", () => callback());
  },
  onShowSmile: (callback) => {
    ipcRenderer.on("pet:show-smile", () => callback());
  },
  setDisplaySprite: (sprite) => ipcRenderer.send("pet:display-sprite", sprite),
  getEvolutionState: () => ipcRenderer.invoke("evolution:get-state"),
  getIsDev: () => ipcRenderer.invoke("app:is-dev"),
  completePendingEvolution: () =>
    ipcRenderer.invoke("evolution:complete-pending"),
  answerQuestion: (payload) => ipcRenderer.invoke("evolution:answer", payload),
  onOpenQuestionCard: (callback) => {
    ipcRenderer.on("evolution:open-question-card", () => callback());
  },
  onOnboardingCompleted: (callback) => {
    ipcRenderer.on("onboarding:completed", () => callback());
  },
  getSettings: () => ipcRenderer.invoke("settings:get"),
  onPetSettings: (callback) => {
    ipcRenderer.on("pet-settings", (_event, data) => callback(data));
  },
});
