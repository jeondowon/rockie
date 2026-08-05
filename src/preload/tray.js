const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("trayAPI", {
  sendAction: (action) => {
    ipcRenderer.send("tray-menu-action", action);
  },
  getScreenPermission: () => ipcRenderer.invoke("get-screen-permission"),
  requestScreenPermission: () =>
    ipcRenderer.invoke("request-screen-permission"),
  onWillShow: (callback) => {
    ipcRenderer.on("tray-popup-will-show", () => callback());
  },
  onWillHide: (callback) => {
    ipcRenderer.on("tray-popup-will-hide", () => callback());
  },
  getSystemStats: () => ipcRenderer.invoke("system:get-stats"),
  getAiUsage: () => ipcRenderer.invoke("system:get-ai-usage"),
  resizePopup: (height) => ipcRenderer.send("tray-popup-resize", height),
  getPetDisplaySprite: () => ipcRenderer.invoke("pet:get-display-sprite"),
  onPetDisplaySprite: (callback) => {
    ipcRenderer.on("pet:display-sprite", (_event, data) => callback(data));
  },
  getEvolutionState: () => ipcRenderer.invoke("evolution:get-state"),
  getOnboardingState: () => ipcRenderer.invoke("onboarding:get-state"),
  setOnboardingStep: (step) => ipcRenderer.invoke("onboarding:set-step", step),
  answerOnboarding: (payload) =>
    ipcRenderer.invoke("onboarding:answer", payload),
  completeOnboarding: () => ipcRenderer.invoke("onboarding:complete"),
  setName: (target, value) =>
    ipcRenderer.invoke("evolution:set-name", { target, value }),
  cleanPet: () => ipcRenderer.invoke("evolution:clean"),
  petPet: () => ipcRenderer.invoke("evolution:pet"),
  setActiveSkin: (stage) => ipcRenderer.invoke("evolution:set-skin", stage),
  getSettings: () => ipcRenderer.invoke("settings:get"),
  setSetting: (key, value) => ipcRenderer.send("settings:set", { key, value }),
  resetPet: () => ipcRenderer.invoke("settings:reset"),
  // 집중 모드 상태(트레이 배너 표시용)
  getModeStatus: () => ipcRenderer.invoke("mode:get-status"),
  onModeStatus: (callback) => {
    ipcRenderer.on("mode:status", (_event, status) => callback(status));
  },
});
