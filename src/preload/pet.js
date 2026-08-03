const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("petAPI", {
  setIgnoreMouseEvents: (ignore, options) => {
    ipcRenderer.send("set-ignore-mouse-events", ignore, options);
  },
  // 모드용: 방해금지(배너 알림 억제)
  setDnd: (on) => ipcRenderer.send("pet:set-dnd", on),
  setSystemDnd: (on) => ipcRenderer.send("focus:set-system-dnd", on),
  // 청소 모드: 네이티브 헬퍼로 키보드 전역 차단 진입/해제 + 상태 수신
  cleanEnter: () => ipcRenderer.send("clean:enter"),
  cleanExit: () => ipcRenderer.send("clean:exit"),
  onCleanStatus: (callback) => {
    ipcRenderer.on("clean:status", (_event, status) => callback(status));
  },
  // 집중/발표 모드 상태를 트레이에 미러링 + 트레이 "종료" 신호 수신 + 펫 표시 토글
  setModeStatus: (status) => ipcRenderer.send("mode:set-status", status),
  togglePet: () => ipcRenderer.send("pet:toggle-visibility"),
  onModeExitRequest: (callback) => {
    ipcRenderer.on("mode:exit-request", () => callback());
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
  onUserNameChange: (callback) => {
    ipcRenderer.on("pet:user-name-change", (_event, userName) =>
      callback(userName),
    );
  },
  setDisplaySprite: (sprite) => ipcRenderer.send("pet:display-sprite", sprite),
  getEvolutionState: () => ipcRenderer.invoke("evolution:get-state"),
  getIdleTime: () => ipcRenderer.invoke("app:get-idle-time"),
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
