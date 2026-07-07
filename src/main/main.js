const {
  app,
  BrowserWindow,
  ipcMain,
  screen,
  Tray,
  nativeImage,
  systemPreferences,
  desktopCapturer,
  dialog,
  Notification,
} = require("electron");
const path = require("path");
const fs = require("fs");
const { execFile } = require("child_process");
const store = require("./store");
const evolution = require("./evolution");

// 개발 모드 여부: `npm run dev`(DEV_RELOAD=1)로 실행하면 파일 저장 시 자동 새로고침
const isDev = !app.isPackaged && process.env.DEV_RELOAD === "1";

let mainWindow;
let tray; // GC로 사라지지 않도록 전역 참조 유지
let trayPopup; // 트레이 클릭 시 뜨는 커스텀 팝업 창
let watcherInterval;
let cursorInterval;
let dockInterval;
let dockPrefsInterval;
let questionGateInterval;

// 질문 알림 게이트용 상태 (evolve.md 6장)
let lastCursorPoint = null;
let lastCursorMoveAt = 0;
let lastActiveWin = null; // { appName, title, bounds }

function createWindow() {
  const primaryDisplay = screen.getPrimaryDisplay();
  // 작업 영역(workArea)이 아닌 화면 전체를 덮는다.
  // Dock이 상시 표시일 때도 캐릭터가 Dock 옆 빈 공간에서는 화면 맨 아래까지
  // 내려가야 하므로, 창이 Dock 영역까지 포함해야 한다.
  const { width, height } = primaryDisplay.bounds;

  mainWindow = new BrowserWindow({
    width,
    height,
    x: 0,
    y: 0,
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
    },
  });

  // 기본값: 클릭이 뒤쪽 앱으로 그대로 통과되도록 설정
  mainWindow.setIgnoreMouseEvents(true, { forward: true });
  mainWindow.setAlwaysOnTop(true, "screen-saver");
  mainWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });

  mainWindow.loadFile(path.join(__dirname, "../renderer/pet/index.html"));

  startActiveWindowWatcher();
  startCursorTracker();
  startDockTracker();
  startQuestionGate();

  if (isDev) startDevReload();
}

// 렌더러 관련 파일을 감시해서 저장 시 창을 자동 새로고침 (개발 전용)
function startDevReload() {
  const watchFiles = [
    "../renderer/pet/index.html",
    "../renderer/pet/pet.js",
    "../renderer/pet/style.css",
  ];
  let reloadTimer = null;

  const triggerReload = () => {
    if (!mainWindow || mainWindow.isDestroyed()) return;
    // 여러 이벤트가 몰려 들어오므로 디바운스
    clearTimeout(reloadTimer);
    reloadTimer = setTimeout(() => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.reloadIgnoringCache();
        console.log("[dev-reload] 렌더러 새로고침됨");
      }
    }, 100);
  };

  for (const file of watchFiles) {
    try {
      fs.watch(path.join(__dirname, file), triggerReload);
    } catch (err) {
      // 파일이 없으면 무시
    }
  }
}

// 전역 커서 위치를 주기적으로 렌더러에 전달 (창이 클릭 통과 상태라
// 렌더러에서는 마우스 이동 이벤트를 직접 받을 수 없기 때문)
function startCursorTracker() {
  cursorInterval = setInterval(() => {
    if (!mainWindow || mainWindow.isDestroyed()) return;
    const point = screen.getCursorScreenPoint();
    // 커서가 실제로 움직였으면 활성 시각을 갱신 (질문 알림 게이트에서 사용)
    if (!lastCursorPoint || point.x !== lastCursorPoint.x || point.y !== lastCursorPoint.y) {
      lastCursorMoveAt = Date.now();
      lastCursorPoint = point;
    }
    const bounds = mainWindow.getBounds();
    // 창 기준 좌표로 변환해서 전달
    mainWindow.webContents.send("cursor-position", {
      x: point.x - bounds.x,
      y: point.y - bounds.y,
    });
  }, 16);
}

// ---------- Dock 상태 추적 (macOS 전용) ----------
// Dock이 화면에 보이는지(자동 숨김 Dock이 올라왔는지 포함)와 위치/크기를 주기적으로
// 읽어 렌더러에 전달한다. 렌더러는 이 정보로 캐릭터를 Dock 위로 올리거나 내린다.
//
// 1순위: AppleScript(System Events)로 Dock의 실제 좌표를 읽는다.
//   - 자동 숨김 Dock이 지금 올라와 있는지까지 정확히 알 수 있다.
//   - 단, 손쉬운 사용(Accessibility)/자동화 권한이 필요하다.
// 2순위(권한 없을 때): Electron API + 커서 위치 휴리스틱으로 근사한다.
//   - 상시 표시 Dock: 화면 크기 - 작업 영역 차이로 높이 계산 (가로 범위는 전체로 간주)
//   - 자동 숨김 Dock: 커서가 화면 맨 아래에 닿으면 "올라옴", Dock 높이 위로 벗어나면 "내려감"
function startDockTracker() {
  if (process.platform !== "darwin") return;

  let orientation = "bottom"; // Dock 위치 (bottom이 아니면 캐릭터 동선과 안 겹치므로 무시)
  let autohide = false;
  let tileSize = 64; // Dock 아이콘 크기 (휴리스틱에서 Dock 높이 추정용)
  let scriptFailedAt = 0; // osascript 실패 시각 (10초 후 재시도)
  let scriptRunning = false;
  let heuristicVisible = false;

  const DOCK_SCRIPT =
    'tell application "System Events" to tell process "Dock" to get {position, size} of list 1';

  // Dock 설정은 자주 바뀌지 않으므로 10초에 한 번만 갱신
  const readDockPrefs = () => {
    execFile("defaults", ["read", "com.apple.dock", "orientation"], (err, out) => {
      orientation = err ? "bottom" : out.trim();
    });
    execFile("defaults", ["read", "com.apple.dock", "autohide"], (err, out) => {
      autohide = !err && out.trim() === "1";
    });
    execFile("defaults", ["read", "com.apple.dock", "tilesize"], (err, out) => {
      const n = parseFloat(out);
      if (!err && !Number.isNaN(n)) tileSize = n;
    });
  };
  readDockPrefs();
  dockPrefsInterval = setInterval(readDockPrefs, 10000);

  const sendDockState = (state) => {
    if (!mainWindow || mainWindow.isDestroyed()) return;
    mainWindow.webContents.send("dock-state", state);
  };

  const HIDDEN = { visible: false, x: 0, width: 0, height: 0 };

  const heuristicTick = () => {
    const { bounds, workArea } = screen.getPrimaryDisplay();
    if (orientation !== "bottom") return sendDockState(HIDDEN);

    if (!autohide) {
      // 상시 표시 Dock: 작업 영역이 Dock만큼 줄어 있으므로 그 차이가 Dock 높이
      const height = bounds.y + bounds.height - (workArea.y + workArea.height);
      sendDockState({ visible: height > 0, x: 0, width: bounds.width, height });
      return;
    }

    // 자동 숨김 Dock: 커서 위치로 표시 여부를 추정
    const cursor = screen.getCursorScreenPoint();
    const screenBottom = bounds.y + bounds.height;
    const estHeight = Math.round(tileSize * 1.25); // 아이콘 크기 + 여백 근사치
    if (cursor.y >= screenBottom - 2) heuristicVisible = true;
    else if (cursor.y < screenBottom - estHeight - 8) heuristicVisible = false;
    sendDockState({
      visible: heuristicVisible,
      x: 0,
      width: bounds.width,
      height: estHeight,
    });
  };

  dockInterval = setInterval(() => {
    // 최근에 osascript가 실패했으면 10초간 휴리스틱으로 동작 후 재시도
    // (앱 실행 중에 권한을 허용해주면 자동으로 정확한 방식으로 복귀)
    if (scriptFailedAt && Date.now() - scriptFailedAt < 10000) {
      return heuristicTick();
    }
    if (scriptRunning) return; // 이전 호출이 아직 안 끝났으면 이번 틱은 건너뜀

    scriptRunning = true;
    execFile("osascript", ["-e", DOCK_SCRIPT], (err, out) => {
      scriptRunning = false;
      if (err) {
        scriptFailedAt = Date.now();
        return heuristicTick();
      }
      scriptFailedAt = 0;

      const nums = out.trim().split(",").map(Number);
      if (nums.length !== 4 || nums.some(Number.isNaN)) return heuristicTick();
      const [dockX, dockY, dockW, dockH] = nums;

      if (orientation !== "bottom") return sendDockState(HIDDEN);

      const { bounds } = screen.getPrimaryDisplay();
      // 숨어 있으면 Dock이 화면 밖(y ≈ 화면 높이)에 위치한다.
      // 아래쪽 끝이 화면 안에 들어와 있어야 "보이는 상태"
      const visible = dockY + dockH <= bounds.y + bounds.height + 2;

      const winBounds = mainWindow && !mainWindow.isDestroyed()
        ? mainWindow.getBounds()
        : { x: 0, y: 0 };
      sendDockState({
        visible,
        x: dockX - winBounds.x, // 창(=렌더러) 기준 좌표로 변환
        width: dockW,
        height: dockH,
      });
    });
  }, 250);
}

// 캐릭터 위에 마우스가 있을 때만 클릭을 받도록 전환하는 IPC 핸들러
ipcMain.on("set-ignore-mouse-events", (_event, ignore, options) => {
  if (!mainWindow) return;
  mainWindow.setIgnoreMouseEvents(ignore, options);
});

// 캐릭터 창 표시/숨김 토글
function togglePet() {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  mainWindow.isVisible() ? mainWindow.hide() : mainWindow.show();
}

// 이미지 주위의 투명 여백을 잘라내 실제 그림이 프레임에 꽉 차게 만든다.
// (template.png는 캔버스 중앙에 캐릭터만 있고 둘레가 투명이라, 그대로 축소하면
//  메뉴바에서 아주 작게 보인다)
function trimTransparent(image) {
  const { width, height } = image.getSize();
  const bmp = image.getBitmap(); // 픽셀당 4바이트, 알파는 마지막 바이트
  let minX = width,
    minY = height,
    maxX = -1,
    maxY = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const alpha = bmp[(y * width + x) * 4 + 3];
      if (alpha > 10) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < 0) return image; // 전부 투명하면 원본 그대로
  return image.crop({
    x: minX,
    y: minY,
    width: maxX - minX + 1,
    height: maxY - minY + 1,
  });
}

// 메뉴바에 표시될 논리 높이(pt). 이 크기로 보이되 Retina에선 2배 해상도로 렌더된다.
const TRAY_ICON_PT = 15;

// 맥 메뉴바 / 윈도우 시스템 트레이에 아이콘을 띄운다 (Tray API는 양쪽 공용)
function createTray() {
  let src = nativeImage.createFromPath(path.join(__dirname, "../../assets/template.png"));
  src = trimTransparent(src); // 투명 여백 제거 → 그림이 꽉 참

  // Retina(2x) 대응: 표시 크기는 TRAY_ICON_PT(pt)로 유지하되,
  // 1x/2x 두 해상도를 함께 담아 고밀도 화면에서 흐려지지 않게 한다.
  const icon = nativeImage.createEmpty();
  icon.addRepresentation({
    scaleFactor: 1,
    buffer: src.resize({ height: TRAY_ICON_PT, quality: "best" }).toPNG(),
  });
  icon.addRepresentation({
    scaleFactor: 2,
    buffer: src.resize({ height: TRAY_ICON_PT * 2, quality: "best" }).toPNG(),
  });

  // 맥: 템플릿 이미지로 지정하면 다크/라이트 메뉴바에 맞춰 자동 반전(단색 실루엣).
  // 컬러 아이콘을 그대로 쓰고 싶으면 아래 줄을 주석 처리.
  if (process.platform === "darwin") icon.setTemplateImage(true);

  tray = new Tray(icon);
  tray.setToolTip("Desktop Pet");

  createTrayPopup();
  tray.on("click", toggleTrayPopup);
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
    trayPopup.hide();
  });
}

function toggleTrayPopup() {
  if (!trayPopup || trayPopup.isDestroyed()) return;
  if (trayPopup.isVisible()) {
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

  let x = Math.round(trayBounds.x + trayBounds.width / 2 - TRAY_POPUP_WIDTH / 2);
  x = Math.min(x, workArea.x + workArea.width - TRAY_POPUP_WIDTH - 8);
  x = Math.max(x, workArea.x + 8);
  const y = Math.round(trayBounds.y + trayBounds.height + 4);

  // 팝업은 항상 메뉴 화면으로 열리므로 메뉴 높이로 맞춰 연다 (짧게)
  trayPopup.setBounds({ x, y, width: TRAY_POPUP_WIDTH, height: lastMenuHeight }, false);
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
    case "status":
      // "나의 애완돌" 뷰 전환은 렌더러(tray.js)에서 처리하므로 여기선 안 닫는다
      break;
    case "toggle-pet":
      togglePet();
      if (trayPopup && !trayPopup.isDestroyed()) trayPopup.hide();
      break;
    case "settings":
      // 뷰 전환은 렌더러(tray.js)에서 처리
      console.log("[tray-menu] 설정 열림");
      break;
    case "quit":
      app.quit();
      break;
  }
});

// ---------- 애완돌 질문 알림 게이트 (evolve.md 6장) ----------
// 시간 조건(다음 노출 예정 시각)이 충족되고, 사용자가 활성 상태이며, 심야가 아니고,
// 회의/전체화면 앱이 아닐 때만 예고 말풍선을 띄운다. 조건이 안 맞으면 다음 틱에 재시도(큐잉).
const GATE_INTERVAL = process.env.PET_FAST_EVO === "1" ? 2000 : 30000;
const ACTIVE_WINDOW_MS = 60 * 1000; // 최근 커서 움직임을 "활성"으로 인정하는 범위

function isUserActive() {
  return Date.now() - lastCursorMoveAt < ACTIVE_WINDOW_MS;
}

function isDaytime() {
  const h = new Date().getHours();
  return h >= 8 && h < 23; // 심야(23~08시) 제외
}

// 회의(Zoom/Meet/Webex) 중이거나 전체화면 앱 실행 중이면 보류
function isBlockingApp() {
  if (!lastActiveWin) return false;
  const ctx = `${lastActiveWin.appName} ${lastActiveWin.title}`.toLowerCase();
  if (/zoom|google meet|meet\.google|webex/.test(ctx)) return true;
  const b = lastActiveWin.bounds;
  if (b) {
    const { bounds } = screen.getPrimaryDisplay();
    // 활성 창이 화면을 거의 꽉 채우면 전체화면으로 간주
    if (b.width >= bounds.width - 4 && b.height >= bounds.height - 4) return true;
  }
  return false;
}

// 새 질문 예고 시 OS 배너 알림을 띄운다 (설정 '질문 알림'이 켜져 있을 때만).
// 트레이 배지/예고 말풍선과 별개의, 앱 밖에서도 보이는 알림 경로.
function showQuestionBanner() {
  if (!Notification.isSupported()) return;
  const petName = store.get().pet.petName || "애완돌";
  const banner = new Notification({
    title: "물어보고 싶은 게 있어요",
    body: `${petName}이(가) 새 질문을 준비했어요. 눌러서 답해 주세요!`,
  });
  banner.on("click", () => {
    // 숨겨져 있으면 다시 보여줘 사용자가 펫을 눌러 답할 수 있게 한다 (강제 카드 열기는 안 함)
    if (mainWindow && !mainWindow.isDestroyed()) mainWindow.show();
  });
  banner.show();
}

// 설정에서 '질문 알림'을 켠 순간, 실제 배너가 어떻게 보이는지 미리보기로 한 번 띄운다.
function showBannerPreview() {
  if (!Notification.isSupported()) return;
  new Notification({
    title: "물어보고 싶은 게 있어요",
    body: "이렇게 표시됩니다",
  }).show();
}

function startQuestionGate() {
  questionGateInterval = setInterval(() => {
    if (!mainWindow || mainWindow.isDestroyed()) return;
    const data = store.get();
    if (data.pet.stoneType) return; // 이미 종류 확정됨
    if (!evolution.isQuestionDue(data, Date.now())) return; // 시간 조건 미충족
    if (!isDaytime() || isBlockingApp() || !isUserActive()) return; // 큐잉 후 다음 활성 시점 재시도

    const q = evolution.getState(data).question;
    if (!q) return;
    if (data.questions.pendingQuestionId === q.id) return; // 이미 예고함 → 반복 알림 없음(3단계)

    data.questions.pendingQuestionId = q.id; // 예고 기록
    data.notifications.hasUnreadBadge = true; // 트레이 배지는 항상 표시(기본 동작)
    store.save();
    mainWindow.webContents.send("evolution:question-available"); // 예고 말풍선
    if (data.notifications.notificationsEnabled) showQuestionBanner(); // 배너는 설정에 따라
  }, GATE_INTERVAL);
}

// ---------- 애완돌 성향 판정 / 진화 ----------
ipcMain.handle("evolution:get-state", () => evolution.getState(store.get()));
ipcMain.handle("evolution:get-stone", () => store.get().pet.stoneType);
ipcMain.handle("evolution:answer", (_event, payload) => {
  const result = evolution.answer(store.get(), payload);
  store.get().notifications.hasUnreadBadge = false; // 응답했으면 배지 해제
  store.save();
  // 확정되면 오버레이 캐릭터를 해당 돌 GIF로 전환하도록 알린다
  if (result.confirmed && mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send("evolution:stone-confirmed", result.confirmed);
  }
  return result;
});
ipcMain.handle("evolution:skip", (_event, payload) => {
  const result = evolution.skip(store.get(), payload.questionId);
  store.get().notifications.hasUnreadBadge = false; // 패스도 상호작용이므로 배지 해제
  store.save();
  if (result.confirmed && mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send("evolution:stone-confirmed", result.confirmed);
  }
  return result;
});
// 질문 카드를 열어 "읽음" 처리 → 트레이 배지 해제
ipcMain.on("evolution:mark-read", () => {
  const data = store.get();
  if (data.notifications.hasUnreadBadge) {
    data.notifications.hasUnreadBadge = false;
    store.save();
  }
});

// ---------- 설정 (트레이 "설정" 화면) ----------
// 펫 렌더러에 위치/크기 변경을 알린다.
function sendPetSettings() {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  const s = store.get().settings;
  mainWindow.webContents.send("pet-settings", {
    placement: s.petPlacement,
    size: s.petSize,
  });
}

// 앱 시작 시 저장된 설정을 실제 OS 상태에 반영한다.
// (창의 '항상 맨 위'는 설정이 아니라 항상 켜진 기본 동작이라 여기서 다루지 않음)
function applyStartupSettings() {
  const s = store.get().settings;
  app.setLoginItemSettings({ openAtLogin: !!s.autoLaunch });
}

// 토글/칩 초기 상태 표시용. 질문 알림은 notifications 섹션에 있으므로 합쳐서 반환.
ipcMain.handle("settings:get", () => {
  const data = store.get();
  return { ...data.settings, notifications: data.notifications.notificationsEnabled };
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
      if (value) showBannerPreview(); // 켠 순간 실제 배너 모습을 미리보기로 표시
      break;
    case "soundEnabled":
      data.settings.soundEnabled = value; // 사운드 시스템 도입 전이라 값만 보관
      break;
    case "petPlacement":
      data.settings.petPlacement = value;
      sendPetSettings();
      break;
    case "petSize":
      data.settings.petSize = value;
      sendPetSettings();
      break;
    default:
      return; // 모르는 키는 무시 (저장 안 함)
  }
  store.save();
});

// "처음부터 다시 키우기" — 확인 후 전체 상태 리셋 + 펫 렌더러 재초기화.
ipcMain.handle("settings:reset", async () => {
  // 부모 창(트레이 팝업)은 포커스를 잃으면 blur 핸들러로 숨겨지므로,
  // 부모 없이 앱 모달로 띄운다.
  const { response } = await dialog.showMessageBox({
    type: "warning",
    buttons: ["취소", "초기화"],
    defaultId: 0,
    cancelId: 0,
    message: "처음부터 다시 키우기",
    detail: "모든 진행도·성향·호감도·설정이 지워지고 조약돌로 돌아갑니다. 되돌릴 수 없어요.",
  });
  if (response !== 1) return false;

  store.reset();
  applyStartupSettings(); // 자동 실행/맨 위를 기본값으로 되돌림
  if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.reload(); // 조약돌로 복원
  return true;
});

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

// macOS에서 활성 창의 "제목"을 읽으려면 화면 기록(Screen Recording) 권한이 필요하다.
// 권한이 없으면 active-win이 매번 예외를 던져 앱 감지 기능 전체가 동작하지 않으므로,
// 시작 시 권한 상태를 확인해 렌더러에 알리고(말풍선 안내) 로그도 남긴다.
function checkScreenRecordingPermission() {
  if (process.platform !== "darwin") return true;
  const status = systemPreferences.getMediaAccessStatus("screen");
  if (status === "granted") return true;

  console.warn(
    `[active-window] 화면 기록 권한 없음(상태: ${status}). ` +
      "시스템 설정 > 개인정보 보호 및 보안 > 화면 기록에서 이 앱을 허용해야 " +
      "활성 앱 감지(유튜브 등 말풍선)가 동작합니다."
  );
  mainWindow.webContents.once("did-finish-load", () => {
    mainWindow.webContents.send("screen-permission-missing");
  });
  return false;
}

function startActiveWindowWatcher() {
  checkScreenRecordingPermission();

  let loggedError = false; // 같은 에러를 3초마다 반복 출력하지 않도록 1회만 로그

  watcherInterval = setInterval(async () => {
    try {
      const activeWinModule = await import("active-win");
      const activeWin = activeWinModule.default;
      const result = await activeWin();
      loggedError = false; // 성공하면(권한 허용 후) 다음 실패를 다시 로그할 수 있게 초기화
      if (result) {
        // 게이트(회의/전체화면 보류 판정)에서 참조하도록 최신 활성 창 정보를 보관
        lastActiveWin = {
          appName: result.owner ? result.owner.name : "",
          title: result.title || "",
          bounds: result.bounds || null,
        };
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send("active-window-info", {
            appName: lastActiveWin.appName,
            title: lastActiveWin.title,
          });
        }
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

app.whenReady().then(() => {
  store.load();
  createWindow();
  createTray();
  applyStartupSettings();
});

app.on("window-all-closed", () => {
  if (watcherInterval) clearInterval(watcherInterval);
  if (cursorInterval) clearInterval(cursorInterval);
  if (dockInterval) clearInterval(dockInterval);
  if (dockPrefsInterval) clearInterval(dockPrefsInterval);
  if (questionGateInterval) clearInterval(questionGateInterval);
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
