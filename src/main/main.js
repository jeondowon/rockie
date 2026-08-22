const {
  app,
  BrowserWindow,
  ipcMain,
  screen,
  Tray,
  systemPreferences,
  desktopCapturer,
  Notification,
  powerMonitor,
  shell,
} = require("electron");
const path = require("path");
const fs = require("fs");
const store = require("./store");
const evolution = require("./evolution");
const {
  startDockTracker,
  probeAutomationPermission,
  getAutomationStatus,
} = require("./dock-tracker");
const { pick, setLocale } = require("./i18n");
const { getSystemStats } = require("./system-stats");
const { getAiUsage, startAiUsage } = require("./ai-usage");
const { makeTrayIcon } = require("./tray-icon");
const {
  startUpdater,
  stopUpdater,
  installUpdate,
  getUpdateStatus,
} = require("./updater");
const {
  startKeyBlocker,
  stopKeyBlocker,
  openPermissionSettings,
} = require("./keyblocker");

// 개발 모드 여부: `npm run dev`(DEV_RELOAD=1)로 실행하면 파일 저장 시 자동 새로고침
const isDev = !app.isPackaged && process.env.DEV_RELOAD === "1";

// 트레이 설정 하단의 링크. 키는 렌더러가 보내는 action 이름과 같아야 한다.
// 주소를 바꾸면 배포된 앱은 그대로 예전 주소를 열므로, 웹사이트 쪽에서 리다이렉트를 걸어야 한다.
// 영문 페이지는 /rockie/en/ 아래에 따로 있다. 라이선스 고지는 본문이 영문
// 라이선스 전문이고 머리말만 이중 언어라 한 페이지를 양쪽이 함께 쓴다.
const EXTERNAL_LINKS = {
  homepage: "https://jeondowon.com/rockie/",
  privacy: { ko: "/rockie/privacy", en: "/rockie/en/privacy" },
  terms: { ko: "/rockie/terms", en: "/rockie/en/terms" },
  licenses: "https://jeondowon.com/rockie/licenses",
  contact: "mailto:dowon.9102@gmail.com",
};

// { ko, en } 형태면 현재 표시 언어에 맞는 주소를 고른다.
function externalLink(action) {
  const target = EXTERNAL_LINKS[action];
  return typeof target === "string"
    ? target
    : `https://jeondowon.com${pick(target)}`;
}

let mainWindow;
let tray; // GC로 사라지지 않도록 전역 참조 유지
let trayPopup; // 트레이 클릭 시 뜨는 커스텀 팝업 창
let watcherInterval;
let cursorInterval;
let dockTracker;

// 온보딩 완료 시점과 앱 시작 시점 양쪽에서 부르므로 중복 시작을 막는다.
function startDockTracker0() {
  if (dockTracker) return;
  dockTracker = startDockTracker(() => mainWindow, getPetDisplay);
}
let dailyResetInterval;
let petDisplaySprite = {
  level: "level0",
  prefix: "rockie",
  pose: "right",
};

// 창이 살아 있을 때만 렌더러로 보낸다. 전송 지점마다 같은 가드를 반복하면
// 언젠가 한 곳을 빠뜨리고, 파괴된 창에 send하면 예외가 난다.
function sendToPet(channel, ...args) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send(channel, ...args);
  }
}

function sendToTray(channel, ...args) {
  if (trayPopup && !trayPopup.isDestroyed()) {
    trayPopup.webContents.send(channel, ...args);
  }
}

function trayPopupVisible() {
  return !!trayPopup && !trayPopup.isDestroyed() && trayPopup.isVisible();
}

function hideTrayPopup() {
  if (trayPopup && !trayPopup.isDestroyed()) trayPopup.hide();
}

// 창을 주 디스플레이 전체에 맞추고, '화면 바닥'을 창 기준 좌표로 렌더러에 알린다.
// macOS는 창이 메뉴바(노치 포함) 영역을 침범하면 아래로 밀어내는 경우가 있어,
// 요청한 위치와 실제 위치가 다를 수 있다. 그러면 창 바닥이 화면 밖으로 나가서
// window.innerHeight를 바닥으로 믿는 렌더러는 펫을 화면 아래로 내려 잘리게 만든다.
// 커서 좌표(startCursorTracker)와 똑같이, 세로도 실제 창 좌표로 보정해서 넘긴다.
// 애완돌을 띄울 디스플레이. 설정에서 고른 모니터가 사라졌으면(뽑힘) 주 모니터로 돌아간다.
function getPetDisplay() {
  const id = store.get().settings.petDisplayId;
  if (id === null || id === undefined) return screen.getPrimaryDisplay();
  return (
    screen.getAllDisplays().find((d) => d.id === id) ||
    screen.getPrimaryDisplay()
  );
}

function syncWindowToDisplay() {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  const { bounds } = getPetDisplay();
  mainWindow.setBounds(bounds);
  const win = mainWindow.getBounds();
  mainWindow.webContents.send("screen-geometry", {
    bottomY: bounds.y + bounds.height - win.y,
  });
}

function createWindow() {
  // 작업 영역(workArea)이 아닌 화면 전체를 덮는다.
  // Dock이 상시 표시일 때도 캐릭터가 Dock 옆 빈 공간에서는 화면 맨 아래까지
  // 내려가야 하므로, 창이 Dock 영역까지 포함해야 한다.
  // 보조 모니터는 x·y가 0이 아니므로 좌표도 함께 가져와야 한다.
  const { x, y, width, height } = getPetDisplay().bounds;

  mainWindow = new BrowserWindow({
    width,
    height,
    x,
    y,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    resizable: false,
    movable: false,
    skipTaskbar: true,
    hasShadow: false,
    focusable: true,
    webPreferences: {
      preload: path.join(__dirname, "../preload/pet.js"),
      contextIsolation: true,
      nodeIntegration: false,
      // 효과음(Web Audio)이 트레이 '돌보기'처럼 펫 창 밖에서 트리거될 때도 재생되도록
      // 자동재생에 사용자 제스처를 요구하지 않는다.
      autoplayPolicy: "no-user-gesture-required",
      // 창을 숨겨도(애완돌 숨기기) 집중·쪽잠 타이머가 제때 울려야 한다.
      // 기본값(true)이면 숨은 창의 setTimeout이 최대 1분까지 밀린다.
      backgroundThrottling: false,
    },
  });

  // 기본값: 클릭이 뒤쪽 앱으로 그대로 통과되도록 설정
  mainWindow.setIgnoreMouseEvents(true, { forward: true });
  mainWindow.setAlwaysOnTop(true, "screen-saver");
  mainWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  // 창 레벨이 메뉴바보다 높아진 뒤에 다시 맞춘다 — 생성 시점에는 macOS가 메뉴바를
  // 침범하는 창을 아래로 밀어낼 수 있다. (밀려도 아래 screen-geometry로 보정된다)
  syncWindowToDisplay();
  // 창을 새로 만드는 경로(activate)에서도 캡처 제외 설정이 유지되도록 여기서 적용한다.
  applyCaptureProtection(!!store.get().settings.hideFromCapture);

  // 펫 렌더러가 다시 로드되면 모드 상태(오버레이·activeMode)가 초기화되므로,
  // 메인이 들고 있는 잠금·억제 상태도 함께 푼다. 안 그러면 설정 초기화나 개발용
  // 자동 새로고침 뒤에 키보드가 잠긴 채·알림이 막힌 채 남는다.
  mainWindow.webContents.on("did-start-loading", () => {
    releaseModeLocks();
    // 렌더러의 mouseX도 기본값으로 되돌아간다. 그때 커서가 멈춰 있으면 "좌표가 같아서
    // 생략" 판정에 걸려 새 값이 영영 안 가므로, 캐시를 비워 다음 틱에 한 번은 보내게 한다.
    lastCursorX = null;
    lastCursorY = null;
  });

  // 렌더러는 로드될 때마다 바닥선을 잊는다(설정 초기화·dev 자동 새로고침·크래시 복구).
  mainWindow.webContents.on("did-finish-load", syncWindowToDisplay);

  mainWindow.loadFile(path.join(__dirname, "../renderer/pet/index.html"));

  startActiveWindowWatcher();
  startCursorTracker();
  // 온보딩 중에는 시작하지 않는다 — 첫 틱의 osascript가 프롤로그 도중에
  // 자동화 권한 창을 띄운다. 권한 화면에서 직접 요청하고, 완료 시 시작한다.
  if (store.get().onboarding.completed) startDockTracker0();
  startDailyResetTimer();

  if (isDev) startDevReload();
}

// 렌더러 관련 파일을 감시해서 저장 시 창을 자동 새로고침 (개발 전용)
// 파일 그룹별로 대상 창만 새로고침해 다른 창의 상태가 초기화되지 않게 한다.
function startDevReload() {
  const watchGroups = [
    {
      label: "pet",
      getWindow: () => mainWindow,
      files: [
        "../renderer/pet/index.html",
        "../renderer/pet/pet-data.js",
        "../renderer/pet/pet.js",
        "../renderer/pet/style.css",
        "../renderer/shared/i18n.js",
        "../renderer/shared/sound.js",
        "../renderer/shared/sprites.js",
        "../renderer/shared/icons.js",
      ],
    },
    {
      label: "tray",
      getWindow: () => trayPopup,
      files: [
        "../renderer/tray/tray.html",
        "../renderer/tray/tray-data.js",
        "../renderer/tray/tray-onboarding.js",
        "../renderer/tray/tray-pet.js",
        "../renderer/tray/tray-system.js",
        "../renderer/tray/tray-settings.js",
        "../renderer/tray/tray.js",
        "../renderer/tray/tray.css",
        "../renderer/shared/i18n.js",
        "../renderer/shared/sprites.js",
        "../renderer/shared/icons.js",
      ],
    },
  ];

  for (const group of watchGroups) {
    let reloadTimer = null;

    const triggerReload = () => {
      // 여러 이벤트가 몰려 들어오므로 디바운스
      clearTimeout(reloadTimer);
      reloadTimer = setTimeout(() => {
        const win = group.getWindow();
        if (win && !win.isDestroyed()) {
          win.webContents.reloadIgnoringCache();
          console.log(`[dev-reload] ${group.label} 렌더러 새로고침됨`);
        }
      }, 100);
    };

    for (const file of group.files) {
      try {
        fs.watch(path.join(__dirname, file), triggerReload);
      } catch (err) {
        // 파일이 없으면 무시
      }
    }
  }
}

// 마지막으로 보낸 커서 좌표(화면 기준). 창은 movable:false로 (0,0)에 고정돼 있어
// bounds가 변하지 않으므로 화면 좌표만 비교해도 충분하다.
let lastCursorX = null;
let lastCursorY = null;

// 전역 커서 위치를 주기적으로 렌더러에 전달 (창이 클릭 통과 상태라
// 렌더러에서는 마우스 이동 이벤트를 직접 받을 수 없기 때문)
function startCursorTracker() {
  cursorInterval = setInterval(() => {
    if (!mainWindow || mainWindow.isDestroyed()) return;
    if (!mainWindow.isVisible()) return; // 숨겨둔 동안엔 60Hz로 보낼 이유가 없다
    const point = screen.getCursorScreenPoint();
    // 커서가 멈춰 있으면 보낼 게 없다. 렌더러는 마지막 값을 그대로 들고 있으므로
    // 동작은 같고, 마우스를 안 움직이는 동안의 초당 60회 IPC만 사라진다.
    if (point.x === lastCursorX && point.y === lastCursorY) return;
    lastCursorX = point.x;
    lastCursorY = point.y;
    const bounds = mainWindow.getBounds();
    // 창 기준 좌표로 변환해서 전달
    mainWindow.webContents.send("cursor-position", {
      x: point.x - bounds.x,
      y: point.y - bounds.y,
    });
  }, 16);
}

// 캐릭터 위에 마우스가 있을 때만 클릭을 받도록 전환하는 IPC 핸들러
ipcMain.on("set-ignore-mouse-events", (_event, ignore, options) => {
  if (!mainWindow) return;
  mainWindow.setIgnoreMouseEvents(ignore, options);
});

// 방해금지 모드(집중) 동안 배너 알림을 억제하기 위한 플래그. 렌더러가 켜고 끈다.
let dndActive = false;
ipcMain.on("pet:set-dnd", (_event, on) => {
  dndActive = !!on;
});

// ---------- 키보드 청소 모드: 키보드 완전 차단 ----------
// 네이티브 헬퍼 제어는 keyblocker.js가 맡고, 여기서는 IPC 배선과 상태 전달만 한다.
const CLEAN_MAX_DURATION_MS = 60 * 1000;

// 렌더러 오버레이가 차단 상태를 표시하도록 알린다.
function sendCleanStatus(status) {
  sendToPet("clean:status", status);
}

ipcMain.on("clean:enter", (_event, maxMs) => {
  const limit = Number(maxMs) > 0 ? Number(maxMs) : CLEAN_MAX_DURATION_MS;
  // 이미 잠금 중이면(쪽잠의 스누즈·청소의 하트비트) 헬퍼는 그대로 두고 상한만 늘린다.
  startKeyBlocker(limit, sendCleanStatus);
});

ipcMain.on("clean:exit", () => {
  stopKeyBlocker();
});

// 권한 안내 오버레이의 "손쉬운 사용 열기" 버튼.
ipcMain.on("clean:open-permission", () => {
  openPermissionSettings();
});

// 종료 경로에서 헬퍼를 정리(헬퍼는 stdin EOF로도 자멸하지만 이중 안전).
app.on("will-quit", stopKeyBlocker);
process.on("exit", stopKeyBlocker);
process.on("uncaughtException", (err) => {
  stopKeyBlocker();
  console.error("[fatal] uncaughtException:", err);
  app.quit();
});

// 펫 렌더러 없이 남으면 안 되는 상태(키보드 잠금·방해금지·모드 배너)를 모두 되돌린다.
function releaseModeLocks() {
  stopKeyBlocker();
  dndActive = false;
  if (currentModeStatus) {
    currentModeStatus = null;
    sendToTray("mode:status", null);
  }
}

// 옵션창의 "애완돌 숨기기/보이기" (트레이 메뉴와 동일 동작)
ipcMain.on("pet:toggle-visibility", () => togglePet());

// 집중 모드가 끝나면 숨겨둔 펫을 되돌린다 (이미 보이면 그대로 둔다)
ipcMain.on("pet:show", () => {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  if (!mainWindow.isVisible()) mainWindow.showInactive();
});

// 집중 모드 상태를 트레이 팝업에 미러링한다.
// 펫 렌더러가 진입/해제 시 보내고(null=없음), 트레이는 이 값으로 배너를 그린다.
let currentModeStatus = null;
ipcMain.on("mode:set-status", (_event, status) => {
  currentModeStatus = status || null;
  sendToTray("mode:status", currentModeStatus);
});
ipcMain.handle("mode:get-status", () => currentModeStatus);

// 트레이가 열릴 때마다 물어본다. 받아둔 업데이트가 있으면 메뉴에 설치 항목이 뜬다.
ipcMain.handle("update:get-status", () => getUpdateStatus());

ipcMain.on("pet:display-sprite", (_event, sprite) => {
  if (!sprite || !sprite.level || !sprite.prefix || !sprite.pose) return;
  petDisplaySprite = {
    level: sprite.level,
    prefix: sprite.prefix,
    pose: sprite.pose,
  };
  // 팝업이 숨어 있으면 보낼 필요가 없다 — 열려서 펫/시스템 화면으로 들어갈 때
  // getPetDisplaySprite로 최신 값을 직접 당겨 간다.
  if (trayPopupVisible()) sendToTray("pet:display-sprite", petDisplaySprite);
});

ipcMain.handle("pet:get-display-sprite", () => petDisplaySprite);

// 캐릭터 창 표시/숨김 토글
function togglePet() {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  // showInactive: 펫을 띄울 때 포커스를 뺏지 않아야 트레이 팝업이 blur로 닫히지 않는다
  mainWindow.isVisible() ? mainWindow.hide() : mainWindow.showInactive();
}

// 맥 메뉴바 / 윈도우 시스템 트레이에 아이콘을 띄운다 (Tray API는 양쪽 공용).
// 아이콘 이미지 생성·캐시는 tray-icon.js가 맡는다.
// 오늘 답할 질문이 남아 있으면(hasBadge) 배지 붙은 아이콘, 없으면 기본 아이콘.
// 둘 다 템플릿이라 macOS가 실제 메뉴바 밝기에 맞춰 알아서 반전시킨다.
function refreshTrayIcon() {
  if (!tray || tray.isDestroyed()) return;
  const awaiting = evolution.getState(store.get()).hasBadge;
  tray.setImage(makeTrayIcon(awaiting ? "new.png" : "template.png", true));
}

function createTray() {
  tray = new Tray(makeTrayIcon("template.png", true));
  tray.setToolTip(`Rockie ${app.getVersion()}`);

  createTrayPopup();
  tray.on("click", toggleTrayPopup);

  refreshTrayIcon(); // 저장된 상태에 맞춰 초기 배지 반영
}

// ---------- 트레이 팝업 (커스텀 픽셀아트 메뉴) ----------
const TRAY_POPUP_WIDTH = 360;
const TRAY_POPUP_HEIGHT = 540; // 하위 화면(나의 애완돌/시스템/설정)용 높이. 본문은 내부 스크롤

let trayPopupHiddenAt = 0; // blur로 닫힌 시각 (트레이 재클릭 토글 판정용)
// 메뉴 화면 창 높이. 메뉴는 항목 높이에 딱 맞춰 짧게 연다.
// 렌더러가 실제 측정값을 보고하면 갱신되며, 첫 표시 전 기본값으로 아래 값을 쓴다.
let lastMenuHeight = 324;

function createTrayPopup() {
  trayPopup = new BrowserWindow({
    width: TRAY_POPUP_WIDTH,
    height: TRAY_POPUP_HEIGHT,
    show: false,
    frame: false,
    transparent: true,
    resizable: false,
    movable: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    hasShadow: false, // CSS 하드 섀도우를 쓰므로 시스템 그림자는 끔
    fullscreenable: false,
    webPreferences: {
      preload: path.join(__dirname, "../preload/tray.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  trayPopup.setAlwaysOnTop(true, "pop-up-menu");
  trayPopup.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  trayPopup.loadFile(path.join(__dirname, "../renderer/tray/tray.html"));

  // 팝업 바깥 클릭 등으로 포커스를 잃으면 자동으로 닫는다
  trayPopup.on("blur", () => {
    trayPopupHiddenAt = Date.now();
    trayPopup.webContents.send("tray-popup-will-hide"); // 렌더러가 시스템 모니터 폴링 중단
    trayPopup.hide();
  });
}

function toggleTrayPopup() {
  if (!trayPopup || trayPopup.isDestroyed()) return;
  if (trayPopup.isVisible()) {
    trayPopup.webContents.send("tray-popup-will-hide"); // 렌더러가 시스템 모니터 폴링 중단
    trayPopup.hide();
    return;
  }
  // 팝업이 열린 상태에서 트레이 아이콘을 클릭하면 click 이벤트보다 blur가
  // 먼저 와서 이미 닫혀 있다. 방금 닫힌 직후의 클릭은 "닫기"로 간주해
  // 다시 열지 않는다 (안 그러면 토글이 아니라 항상 열림이 됨).
  if (Date.now() - trayPopupHiddenAt < 300) return;

  positionTrayPopup();
  trayPopup.webContents.send("tray-popup-will-show"); // 렌더러 뷰/상태 초기화
  trayPopup.show();
}

// 트레이 아이콘 바로 아래 중앙 정렬. 화면 경계를 벗어나면 안쪽으로 보정.
function positionTrayPopup() {
  const trayBounds = tray.getBounds();
  const { workArea } = screen.getDisplayNearestPoint({
    x: trayBounds.x,
    y: trayBounds.y,
  });

  let x = Math.round(
    trayBounds.x + trayBounds.width / 2 - TRAY_POPUP_WIDTH / 2,
  );
  x = Math.min(x, workArea.x + workArea.width - TRAY_POPUP_WIDTH - 8);
  x = Math.max(x, workArea.x + 8);
  const y = Math.round(trayBounds.y + trayBounds.height + 4);

  // 팝업은 항상 메뉴 화면으로 열리므로 메뉴 높이로 맞춰 연다 (짧게)
  trayPopup.setBounds(
    { x, y, width: TRAY_POPUP_WIDTH, height: lastMenuHeight },
    false,
  );
}

// 화면에 따라 팝업 창 높이 조절. 메뉴는 항목 높이만큼 짧게(측정값), 하위 화면은 기존 높이(height=0)
ipcMain.on("tray-popup-resize", (_event, height) => {
  if (!trayPopup || trayPopup.isDestroyed()) return;
  if (height > 0) lastMenuHeight = height;
  const h = height > 0 ? height : TRAY_POPUP_HEIGHT;
  const [x, y] = trayPopup.getPosition(); // 좌상단 고정 → 아래로만 늘고 준다
  trayPopup.setBounds({ x, y, width: TRAY_POPUP_WIDTH, height: h }, false);
});

// 팝업 메뉴 항목 클릭 처리
ipcMain.on("tray-menu-action", (_event, action) => {
  switch (action) {
    case "toggle-pet":
      togglePet(); // 팝업은 닫지 않고 열어 둔다 (연속 토글 가능)
      break;
    case "answer-question":
      // 트레이 "질문에 답하기" → 펫 창을 띄우고 기존 질문 카드를 애완돌 옆에 연다
      if (mainWindow && !mainWindow.isDestroyed() && !mainWindow.isVisible()) {
        mainWindow.show();
      }
      sendToPet("evolution:open-question-card");
      hideTrayPopup();
      break;
    case "close-popup":
      hideTrayPopup();
      break;
    case "homepage":
    case "privacy":
    case "terms":
    case "licenses":
    case "contact":
      // 트레이 설정 하단 링크 → 기본 브라우저(문의는 메일 앱)로 열고 팝업은 닫는다
      shell.openExternal(externalLink(action));
      hideTrayPopup();
      break;
    case "exit-mode":
      // 트레이 배너의 "종료" → 펫 렌더러가 현재 모드를 해제한다(팝업은 열어 둠).
      sendToPet("mode:exit-request");
      break;
    case "pause-mode":
      // 트레이 배너의 "일시정지 / 계속하기" → 펫 렌더러가 집중 타이머를 멈추거나 재개한다.
      sendToPet("mode:pause-request");
      break;
    case "install-update":
      // 받아둔 새 버전으로 교체하고 다시 켠다. 여기서 앱이 종료되므로 뒤 코드는 없다.
      installUpdate();
      break;
    case "quit":
      app.quit();
      break;
  }
});

// ---------- 매일 오전 8시 질문 갱신 ----------
// 앱 실행 시 + 주기적으로 마지막 갱신 시각을 확인해, 가장 최근 오전 8시 경계를
// 아직 안 지났으면 갱신을 실행한다. 최초 실행(dailyResetAt=null)도 여기서 부트스트랩된다.
const DAILY_RESET_HOUR = 8;

// nowMs 기준으로 이미 지나온 가장 최근 오전 8시(ms). 8시 이전이면 어제 8시.
function lastResetBoundary(nowMs) {
  const eight = new Date(nowMs);
  eight.setHours(DAILY_RESET_HOUR, 0, 0, 0);
  if (nowMs < eight.getTime()) eight.setDate(eight.getDate() - 1);
  return eight.getTime();
}

// 질문 배너 알림. 실제 알림(매일 오전 8시)은 클릭하면 펫 창을 띄우고,
// 설정에서 '질문 알림'을 켠 순간 보여주는 미리보기는 문구만 다르다.
// 알림은 메인이 직접 띄우므로 표시 언어도 여기서 고른다.
const QUESTION_BANNER = {
  title: { ko: "오늘도 나에 대해 알려주세요", en: "Tell me about you today" },
  preview: { ko: "이렇게 표시됩니다", en: "This is how it will look" },
  body: {
    ko: "새 질문을 준비해뒀어요. 메뉴바에서 답해 주세요!",
    en: "A new question is ready. Answer it from the menu bar!",
  },
};

function showQuestionBanner({ preview = false } = {}) {
  if (!Notification.isSupported()) return;
  if (dndActive) return; // 집중 모드 중엔 알림을 띄우지 않는다
  const banner = new Notification({
    title: pick(QUESTION_BANNER.title),
    body: preview ? pick(QUESTION_BANNER.preview) : pick(QUESTION_BANNER.body),
  });
  if (!preview) {
    banner.on("click", () => {
      if (mainWindow && !mainWindow.isDestroyed()) mainWindow.show();
    });
  }
  banner.show();
}

// 새 버전을 다 받았을 때 한 번. 놓쳐도 트레이 메뉴에 항목이 남으므로,
// 질문 알림과 같은 규칙으로 집중 모드 중에는 띄우지 않는다.
const UPDATE_BANNER = {
  title: { ko: "새 버전이 준비됐어요", en: "A new version is ready" },
  body: {
    ko: "메뉴바에서 '업데이트 설치 후 재시작'을 눌러주세요!",
    en: "Choose 'Install update and restart' from the menu bar!",
  },
};

function showUpdateBanner() {
  if (!Notification.isSupported()) return;
  if (dndActive) return;
  new Notification({
    title: pick(UPDATE_BANNER.title),
    body: pick(UPDATE_BANNER.body),
  }).show();
}

function runDailyResetIfNeeded() {
  const data = store.get();
  const now = Date.now();
  const last = data.questions.dailyResetAt
    ? Date.parse(data.questions.dailyResetAt)
    : 0;
  if (last >= lastResetBoundary(now)) return; // 이번 오전 8시 이후로 이미 갱신함
  const { showBanner } = evolution.onDailyReset(
    data,
    new Date(now).toISOString(),
  );
  store.save();
  refreshTrayIcon(); // 트레이 배지 갱신
  if (showBanner && data.notifications.notificationsEnabled)
    showQuestionBanner();
}

function startDailyResetTimer() {
  runDailyResetIfNeeded(); // 실행 즉시 한 번 확인 (첫 실행 부트스트랩 포함)
  dailyResetInterval = setInterval(runDailyResetIfNeeded, 60 * 1000);
}

// ---------- 애완돌 성향 판정 / 진화 ----------
ipcMain.handle("evolution:get-state", () => evolution.getState(store.get()));
ipcMain.handle("app:is-dev", () => isDev);

ipcMain.handle("onboarding:get-state", () =>
  evolution.getOnboardingState(store.get()),
);
ipcMain.handle("onboarding:set-step", (_event, step) => {
  const data = store.get();
  const state = evolution.setOnboardingStep(data, step);
  store.save();
  return state;
});
ipcMain.handle("onboarding:answer", (_event, payload) => {
  const data = store.get();
  const state = evolution.answerOnboarding(data, payload);
  store.save();
  refreshTrayIcon();
  return state;
});
ipcMain.handle("onboarding:complete", () => {
  const data = store.get();
  const before = data.onboarding.completed;
  const state = evolution.completeOnboarding(data);
  store.save();
  refreshTrayIcon();
  if (!before && data.onboarding.completed) {
    if (
      data.questions.todaysQuestions.length > 0 &&
      data.notifications.notificationsEnabled
    ) {
      showQuestionBanner();
    }
    sendToPet("onboarding:completed");
  }
  startDockTracker0(); // 권한 화면을 지난 뒤부터 Dock을 추적한다
  return state;
});

// 단계가 올랐을 때 펫 오버레이가 해당 GIF로 전환하도록 진화 정보를 보낸다.
function notifyEvolved(data) {
  sendToPet("evolution:evolved", {
    stage: data.pet.evolutionStage,
    stoneType: data.pet.stoneType,
    variant: data.pet.evolutionVariant,
    pendingEvolution: data.pet.pendingEvolution,
  });
}

ipcMain.handle("evolution:answer", (_event, payload) => {
  const data = store.get();
  const result = evolution.answer(data, payload);
  store.save();
  refreshTrayIcon(); // 남은 질문 여부에 맞춰 메뉴바 배지 갱신
  if (result.evolved) notifyEvolved(data);
  return result;
});

// 호감도 획득. 트레이 "돌보기" 버튼(닦아주기/쓰다듬기)에서 호출된다.
// 애정을 준 직후 펫 창이 애정 표현을 잠깐 띄운다 — 쓰다듬기는 하트,
// 닦아주기는 웃는 얼굴(smile gif)로 구분한다.
ipcMain.handle("evolution:clean", () => {
  const data = store.get();
  const result = evolution.cleanPet(data);
  store.save();
  sendToPet("pet:show-smile");
  if (result.evolved) notifyEvolved(data);
  return result;
});
ipcMain.handle("evolution:pet", () => {
  const data = store.get();
  const result = evolution.petPet(data);
  store.save();
  sendToPet("pet:show-heart");
  if (result.evolved) notifyEvolved(data);
  return result;
});
// 스킨 착용/해제. 펫 창이 표시 형태를 바꾸도록 해석된 단계 정보를 보낸다.
ipcMain.handle("evolution:set-skin", (_event, stage) => {
  const data = store.get();
  const state = evolution.setActiveSkin(data, stage);
  store.save();
  // 진화 카드 대기 중이면 setActiveSkin이 요청을 무시한다 — 펫에 알릴 변화도 없다
  if (!state.pendingEvolution) {
    sendToPet("pet:skin-change", {
      stage: state.activeSkinStage ?? state.stage,
      stoneType: state.stoneType,
      variant: state.variant,
    });
  }
  return state;
});
ipcMain.handle("evolution:complete-pending", () => {
  const data = store.get();
  const result = evolution.completePendingEvolution(data);
  store.save();
  return result;
});
// 이름 저장 (사용자/애완돌). 최초 지정 보상·진화 판정은 evolution.setName이 담당한다.
ipcMain.handle("evolution:set-name", (_event, { target, value }) => {
  const data = store.get();
  const result = evolution.setName(data, target, value);
  if (!result) return null; // 알 수 없는 target
  store.save();
  // 이름 변경을 먼저 알려야, 이어지는 진화 축하 문구가 새 이름으로 나온다.
  if (target === "user") sendToPet("pet:user-name-change", result.userName);
  if (target === "pet") sendToPet("pet:pet-name-change", result.petName);
  if (result.evolved) notifyEvolved(data);
  return result;
});

// ---------- 설정 (트레이 "설정" 화면) ----------
// 펫 렌더러에 위치/크기 변경을 알린다.
function sendPetSettings() {
  const s = store.get().settings;
  sendToPet("pet-settings", {
    placement: s.petPlacement,
    size: s.petSize,
    sound: s.soundEnabled,
    focusMinutes: s.focusMinutes,
    napMinutes: s.napMinutes,
  });
}

// 표시 언어. 렌더러는 첫 페인트 전에 알아야 하므로 동기 조회를 열어 둔다.
ipcMain.on("i18n:get-locale-sync", (event) => {
  event.returnValue = store.get().settings.language || "ko";
});

// 언어가 바뀌면 열려 있는 모든 창이 즉시 다시 그리도록 알린다.
function broadcastLanguage(locale) {
  for (const win of BrowserWindow.getAllWindows()) {
    if (!win.isDestroyed()) win.webContents.send("i18n:locale-changed", locale);
  }
}

// 앱 시작 시 저장된 설정을 실제 OS 상태에 반영한다.
// (창의 '항상 맨 위'는 설정이 아니라 항상 켜진 기본 동작이라 여기서 다루지 않음)
function applyStartupSettings() {
  const s = store.get().settings;
  setLocale(s.language); // 알림·질문 문구를 저장된 언어로 낸다
  // 자동 실행만은 OS 쪽이 정답이다 — 사용자가 시스템 설정이나 Dock 우클릭의
  // "로그인 시 열기"로 직접 끌 수 있는데, 시작할 때마다 저장값을 OS에 덮어쓰면
  // 그 조작이 다음 실행 때 조용히 되돌아간다(기본값이 켬이라 더 그렇다).
  // 저장값이 방금 만들어진 기본값일 때(첫 실행·초기화)만 OS에 쓰고,
  // 그 밖에는 OS를 읽어 저장값(=트레이 토글 표시)을 맞춘다.
  if (store.isFreshData()) {
    app.setLoginItemSettings({ openAtLogin: !!s.autoLaunch });
  } else {
    const openAtLogin = !!app.getLoginItemSettings().openAtLogin;
    if (openAtLogin !== s.autoLaunch) {
      s.autoLaunch = openAtLogin;
      store.save();
    }
  }
  applyCaptureProtection(!!s.hideFromCapture);
}

// 켜면 애완돌 창이 화면 캡처(스크린샷·녹화·화면 공유) 대상에서 빠진다.
// 내 모니터에는 그대로 보이므로 "숨기기"라기보다 "캡처에만 안 찍히기"에 가깝다.
function applyCaptureProtection(enabled) {
  if (mainWindow && !mainWindow.isDestroyed())
    mainWindow.setContentProtection(enabled);
}

// 토글/칩 초기 상태 표시용. 질문 알림은 notifications 섹션에 있으므로 합쳐서 반환.
ipcMain.handle("settings:get", () => {
  const data = store.get();
  return {
    ...data.settings,
    notifications: data.notifications.notificationsEnabled,
    // 펫 렌더러가 첫 클릭 때 모드 안내를 띄울지 판단하는 값
    modeHintSeen: !!data.user.modeHintSeenAt,
    // 설정 화면 하단에 표시할 앱 버전. 저장값이 아니라 package.json에서 온다.
    appVersion: app.getVersion(),
  };
});

// 설정의 "표시할 모니터" 목록. 개수·이름이 실행 중에만 정해지므로 렌더러가 물어본다.
ipcMain.handle("settings:get-displays", () => ({
  selected: store.get().settings.petDisplayId,
  displays: screen.getAllDisplays().map((d) => ({
    id: d.id,
    label: d.label, // macOS는 "Built-in Retina Display" 같은 이름을 준다(빈 값일 수도 있다)
    width: d.bounds.width,
    height: d.bounds.height,
  })),
}));

// 모드 안내를 실제로 띄웠을 때 기록한다(다시 띄우지 않도록).
ipcMain.on("pet:mode-hint-shown", () => {
  const data = store.get();
  if (data.user.modeHintSeenAt) return;
  data.user.modeHintSeenAt = new Date().toISOString();
  store.save();
});

// 설정 변경 → 즉시 부수효과 적용 + 저장.
ipcMain.on("settings:set", (_event, { key, value }) => {
  const data = store.get();
  switch (key) {
    case "autoLaunch":
      data.settings.autoLaunch = value;
      app.setLoginItemSettings({ openAtLogin: value });
      break;
    case "notifications":
      data.notifications.notificationsEnabled = value; // 새 질문 배너 알림 on/off
      if (value) showQuestionBanner({ preview: true }); // 켠 순간 실제 배너 모습을 표시
      break;
    case "petDisplayId":
      // null = 주 모니터 자동 추종. 그 외에는 Display id(숫자).
      data.settings.petDisplayId = value === null ? null : Number(value);
      syncWindowToDisplay(); // 창을 그 모니터로 옮기고 바닥선을 다시 알린다
      break;
    case "hideFromCapture":
      data.settings.hideFromCapture = value;
      applyCaptureProtection(value);
      break;
    case "soundEnabled":
      data.settings.soundEnabled = value;
      sendPetSettings(); // 펫 렌더러의 효과음 on/off 즉시 반영
      break;
    case "petPlacement":
      data.settings.petPlacement = value;
      sendPetSettings();
      break;
    case "petSize":
      data.settings.petSize = value;
      sendPetSettings();
      break;
    case "focusMinutes":
      data.settings.focusMinutes = Math.max(1, Number(value) || 25);
      sendPetSettings();
      break;
    case "napMinutes":
      // 슬라이더 범위(1~120분) 밖의 값이 들어와도 저장 단계에서 잘라낸다
      data.settings.napMinutes = Math.min(
        120,
        Math.max(1, Number(value) || 20),
      );
      sendPetSettings();
      break;
    case "language":
      // 표시 언어만 바꾼다. 저장된 성향 점수·답변 기록의 키는 한글 그대로 유지된다.
      data.settings.language = value === "en" ? "en" : "ko";
      setLocale(data.settings.language); // 메인이 만드는 문구(알림·질문)도 함께 전환
      broadcastLanguage(data.settings.language);
      break;
    default:
      return; // 모르는 키는 무시 (저장 안 함)
  }
  store.save();
});

// "처음부터 다시 키우기" — 전체 상태 리셋 + 펫 렌더러 재초기화.
// (확인 절차는 트레이 팝업 안의 인앱 확인창에서 처리하므로 여기선 바로 실행한다)
ipcMain.handle("settings:reset", () => {
  store.reset();
  applyStartupSettings(); // 자동 실행/맨 위를 기본값으로 되돌림
  runDailyResetIfNeeded(); // 초기화 직후 오늘의 질문을 다시 채우고 배지 갱신
  if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.reload(); // 조약돌로 복원
  return true;
});

// 시스템 모니터: 트레이 SYSTEM 화면이 열려 있는 동안 렌더러가 주기적으로 호출한다.
ipcMain.handle("system:get-stats", () => getSystemStats());

// AI 사용량: 호출될 때마다 Codex 로컬 로그를 다시 읽는다.
// 트레이를 열 때와 수동 새로고침을 누를 때만 호출된다.
ipcMain.handle("system:get-ai-usage", () => getAiUsage());

ipcMain.handle("app:get-idle-time", () => powerMonitor.getSystemIdleTime());

ipcMain.handle("get-screen-permission", () => {
  if (process.platform !== "darwin") return "granted";
  return systemPreferences.getMediaAccessStatus("screen");
});

// macOS에는 화면 기록 권한을 직접 요청하는 API가 없어서, 화면 캡처를
// 한 번 시도해 시스템 권한 팝업을 유도한다. (이미 거부된 상태면 macOS가
// 팝업을 다시 띄우지 않으므로 렌더러에서 안내 문구를 보여준다)
ipcMain.handle("request-screen-permission", async () => {
  if (process.platform !== "darwin") return "granted";
  try {
    await desktopCapturer.getSources({ types: ["screen"] });
  } catch (_err) {
    // 권한 없음 등으로 실패해도 아래에서 현재 상태만 반환하면 된다
  }
  return systemPreferences.getMediaAccessStatus("screen");
});

// 한 번 거부된 뒤에는 시스템 팝업이 다시 뜨지 않으므로, 안내 문구만 띄우는 대신
// 화면 기록 설정 화면을 직접 열어준다. (청소 모드 권한 안내와 같은 방식)
ipcMain.on("open-screen-permission-settings", () => {
  shell.openExternal(
    "x-apple.systempreferences:com.apple.preference.security?Privacy_ScreenCapture",
  );
});

// Dock 위치 읽기(손쉬운 사용 + 자동화). 확인과 요청이 같은 동작이라 핸들러도 하나다.
// 자동화 권한은 손쉬운 사용과 별개다. 거부돼 있으면 Dock 좌표를 못 읽어 펫이
// 자동 숨김 Dock을 엉뚱한 높이로 피한다. 요청 API가 없어 설정 창만 열어 준다.
ipcMain.handle("get-dock-automation", () => getAutomationStatus());

ipcMain.handle("request-dock-automation", () => probeAutomationPermission());

ipcMain.on("open-dock-automation-settings", () => {
  shell.openExternal(
    "x-apple.systempreferences:com.apple.preference.security?Privacy_Automation",
  );
});

// 화면 기록 권한은 허용해도 앱을 재시작해야 반영된다. 온보딩에서 사용자를 가두지
// 않으려면 앱이 스스로 재시작해야 한다. 온보딩 진행 상태는 저장돼 있어 그대로 이어진다.
ipcMain.on("app:relaunch", () => {
  // 잠금을 쥔 채로 나가면 뒤이어 뜨는 새 인스턴스가 스스로 물러나 앱이 그냥 죽는다.
  app.releaseSingleInstanceLock();
  app.relaunch();
  app.exit(0);
});

// macOS에서 활성 창의 "제목"을 읽으려면 화면 기록(Screen Recording) 권한이 필요하다.
// 아직 물어본 적 없으면(not-determined) 화면 캡처를 한 번 시도해 시스템 팝업을 띄운다.
// 그래도 허용이 아니면 false를 돌려 감시 자체를 시작하지 않게 한다 — 거부된 뒤에는
// macOS가 팝업을 다시 띄우지 않고, 설정에서 허용해도 앱을 재시작해야 반영되므로,
// 3초마다 재시도해봤자 실패만 반복하며 헬퍼 프로세스만 띄운다.
async function ensureScreenRecordingPermission() {
  if (process.platform !== "darwin") return true;

  let status = systemPreferences.getMediaAccessStatus("screen");
  if (status === "not-determined") {
    try {
      await desktopCapturer.getSources({ types: ["screen"] });
    } catch (_err) {
      // 권한 없음 등으로 실패해도 아래에서 현재 상태만 다시 읽으면 된다
    }
    status = systemPreferences.getMediaAccessStatus("screen");
  }
  if (status === "granted") return true;

  console.warn(
    `[active-window] 화면 기록 권한 없음(상태: ${status}). 활성 앱 감지를 시작하지 않습니다. ` +
      "메뉴바 > 설정 > 화면 기록 권한에서 허용한 뒤 앱을 재시작하면 동작합니다.",
  );
  mainWindow.webContents.once("did-finish-load", () => {
    sendToPet("screen-permission-missing");
  });
  return false;
}

// active-win은 ESM이라 동적 import로만 불러올 수 있다. 3초마다 부르므로 한 번만 로드한다.
// 실패한 프라미스를 그대로 들고 있으면 영영 재시도하지 않으므로, 실패 시엔 비워 둔다.
let activeWinPromise = null;
function loadActiveWin() {
  if (!activeWinPromise) {
    activeWinPromise = import("active-win").then(
      (m) => m.default,
      (err) => {
        activeWinPromise = null;
        throw err;
      },
    );
  }
  return activeWinPromise;
}

async function startActiveWindowWatcher() {
  if (!(await ensureScreenRecordingPermission())) return;

  let loggedError = false; // 같은 에러를 3초마다 반복 출력하지 않도록 1회만 로그

  watcherInterval = setInterval(async () => {
    try {
      const activeWin = await loadActiveWin();
      // accessibilityPermission의 기본값이 true라 호출할 때마다 손쉬운 사용 권한 창을
      // 띄운다(호출마다 새 프로세스를 띄우는 구조라 3초마다 다시 뜬다). 그 권한은
      // 브라우저 주소창을 읽는 url 속성에만 쓰이는데 우리는 appName과 title만 쓴다.
      // screenRecordingPermission은 title에 필요하므로 켠 채로 둔다.
      const result = await activeWin({ accessibilityPermission: false });
      loggedError = false; // 성공하면(권한 허용 후) 다음 실패를 다시 로그할 수 있게 초기화
      if (result) {
        sendToPet("active-window-info", {
          appName: result.owner ? result.owner.name : "",
          title: result.title || "",
        });
      }
    } catch (err) {
      // macOS에서 화면 기록 권한이 없으면 여기로 떨어진다.
      if (!loggedError) {
        loggedError = true;
        console.warn("[active-window] 활성 창 조회 실패:", err.message);
      }
    }
  }, 3000);
}

// 같은 번들을 두 번 실행하는 건 macOS가 막아주지만, 개발 실행(npm start)과 설치본은
// 서로 다른 번들이라 동시에 뜬다. 그러면 펫이 두 마리 뜨고 같은 petdata.json을 번갈아
// 덮어써서 호감도·진화 상태가 꼬인다. 나중에 실행된 쪽이 조용히 물러난다.
if (!app.requestSingleInstanceLock()) {
  app.quit();
}

app.on("second-instance", () => {
  // 다시 실행하려 했다는 건 펫을 보고 싶다는 뜻이다(숨겨둔 상태일 수 있다).
  if (mainWindow && !mainWindow.isDestroyed() && !mainWindow.isVisible())
    mainWindow.showInactive();
});

app.whenReady().then(() => {
  store.load();
  startAiUsage().catch((err) => {
    console.warn("[ai-usage] 초기화 실패:", err.message);
  });
  createWindow();
  createTray();
  applyStartupSettings();
  // 해상도 변경·모니터 연결/해제로 화면 크기가 달라져도 창이 따라가게 한다.
  // 로그인 항목으로 자동 실행될 때 모니터 인식이 늦어 창이 잘못 잡히는 경우도 여기서 복구된다.
  screen.on("display-metrics-changed", syncWindowToDisplay);
  screen.on("display-added", syncWindowToDisplay);
  screen.on("display-removed", syncWindowToDisplay);
  startUpdater({
    onDownloaded: (status) => {
      sendToTray("update:status", status); // 팝업이 열려 있으면 즉시 항목이 뜬다
      showUpdateBanner();
    },
  });
});

app.on("window-all-closed", () => {
  if (watcherInterval) clearInterval(watcherInterval);
  if (cursorInterval) clearInterval(cursorInterval);
  if (dockTracker) dockTracker.stop();
  if (dailyResetInterval) clearInterval(dailyResetInterval);
  stopUpdater();
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
