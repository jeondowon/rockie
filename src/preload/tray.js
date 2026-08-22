const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("trayAPI", {
  sendAction: (action) => {
    ipcRenderer.send("tray-menu-action", action);
  },
  getScreenPermission: () => ipcRenderer.invoke("get-screen-permission"),
  requestScreenPermission: () =>
    ipcRenderer.invoke("request-screen-permission"),
  openScreenPermissionSettings: () =>
    ipcRenderer.send("open-screen-permission-settings"),
  getDockAutomation: () => ipcRenderer.invoke("get-dock-automation"),
  requestDockAutomation: () => ipcRenderer.invoke("request-dock-automation"),
  openDockAutomationSettings: () =>
    ipcRenderer.send("open-dock-automation-settings"),
  relaunchApp: () => ipcRenderer.send("app:relaunch"),
  getDisplays: () => ipcRenderer.invoke("settings:get-displays"),
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
  // 표시 언어. 첫 페인트 전에 필요해 동기 조회한다(앱 시작 시 1회).
  getLocale: () => ipcRenderer.sendSync("i18n:get-locale-sync"),
  onLocaleChanged: (callback) => {
    ipcRenderer.on("i18n:locale-changed", (_event, locale) => callback(locale));
  },
  getSettings: () => ipcRenderer.invoke("settings:get"),
  setSetting: (key, value) => ipcRenderer.send("settings:set", { key, value }),
  resetPet: () => ipcRenderer.invoke("settings:reset"),
  // 자동 업데이트 상태(메뉴의 설치 항목 표시용)
  getUpdateStatus: () => ipcRenderer.invoke("update:get-status"),
  onUpdateStatus: (callback) => {
    ipcRenderer.on("update:status", (_event, status) => callback(status));
  },
  // 집중 모드 상태(트레이 배너 표시용)
  getModeStatus: () => ipcRenderer.invoke("mode:get-status"),
  onModeStatus: (callback) => {
    ipcRenderer.on("mode:status", (_event, status) => callback(status));
  },
});
