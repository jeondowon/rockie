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
const { screen } = require("electron");
const { execFile } = require("child_process");

// getWindow: 상태를 보낼 BrowserWindow를 돌려주는 함수 (없거나 파괴됐으면 전송 생략).
// 반환: { stop } — 내부 인터벌을 모두 정리한다.
function startDockTracker(getWindow) {
  if (process.platform !== "darwin") return { stop() {} };

  let orientation = "bottom"; // Dock 위치 (bottom이 아니면 캐릭터 동선과 안 겹치므로 무시)
  let autohide = false;
  let tileSize = 64; // Dock 아이콘 크기 (휴리스틱에서 Dock 높이 추정용)
  let scriptFailedAt = 0; // osascript 실패 시각 (10초 후 재시도)
  let scriptRunning = false;
  let lastScriptAt = 0; // 마지막 osascript 실행 시각 (호출 간격 제한용)
  let heuristicVisible = false;
  // osascript 호출 간격. 자동 숨김 Dock은 올라옴/내려감을 따라가야 해서 자주 읽고,
  // 상시 표시 Dock은 위치가 거의 안 바뀌므로 드물게 읽는다.
  const SCRIPT_INTERVAL_AUTOHIDE = 500;
  const SCRIPT_INTERVAL_STATIC = 3000;

  const DOCK_SCRIPT =
    'tell application "System Events" to tell process "Dock" to get {position, size} of list 1';

  // Dock 설정은 자주 바뀌지 않으므로 10초에 한 번만 갱신
  const readDockPrefs = () => {
    execFile(
      "defaults",
      ["read", "com.apple.dock", "orientation"],
      (err, out) => {
        orientation = err ? "bottom" : out.trim();
      },
    );
    execFile("defaults", ["read", "com.apple.dock", "autohide"], (err, out) => {
      autohide = !err && out.trim() === "1";
    });
    execFile("defaults", ["read", "com.apple.dock", "tilesize"], (err, out) => {
      const n = parseFloat(out);
      if (!err && !Number.isNaN(n)) tileSize = n;
    });
  };
  readDockPrefs();
  const prefsInterval = setInterval(readDockPrefs, 10000);

  const sendDockState = (state) => {
    const win = getWindow();
    if (!win || win.isDestroyed()) return;
    win.webContents.send("dock-state", state);
  };

  const HIDDEN = { visible: false, x: 0, width: 0, height: 0 };

  // 자동 숨김 Dock이 지금 올라와 있는지 커서 위치로 추정한다.
  // 화면 맨 아래에 닿으면 "올라옴", Dock 높이 위로 벗어나면 "내려감".
  const updateHeuristicVisible = (dockHeight) => {
    const { bounds } = screen.getPrimaryDisplay();
    const cursor = screen.getCursorScreenPoint();
    const screenBottom = bounds.y + bounds.height;
    if (cursor.y >= screenBottom - 2) heuristicVisible = true;
    else if (cursor.y < screenBottom - dockHeight - 8) heuristicVisible = false;
    return heuristicVisible;
  };

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
    const estHeight = Math.round(tileSize * 1.25); // 아이콘 크기 + 여백 근사치
    sendDockState({
      visible: updateHeuristicVisible(estHeight),
      x: 0,
      width: bounds.width,
      height: estHeight,
    });
  };

  // 마지막으로 osascript가 읽어낸 Dock 사각형(화면 절대 좌표). 스크립트를 건너뛰는
  // 틱에서는 이 값을 재사용해, 호출을 줄이면서도 가로 범위는 정확히 유지한다.
  let lastRect = null;

  // 상시 표시 Dock이 지금 화면을 차지하고 있는지 (전체화면 앱이 뜨면 작업 영역이 넓어진다)
  const dockOccupiesWorkArea = () => {
    const { bounds, workArea } = screen.getPrimaryDisplay();
    return bounds.y + bounds.height - (workArea.y + workArea.height) > 0;
  };

  const sendCachedDockState = () => {
    const win = getWindow();
    const winBounds =
      win && !win.isDestroyed() ? win.getBounds() : { x: 0, y: 0 };
    sendDockState({
      // 표시 여부는 매 틱 공짜로 알 수 있다(자동 숨김은 커서, 상시 표시는 작업 영역).
      // 캐시에서 재사용하는 건 osascript로만 알 수 있는 가로 범위·높이뿐이다.
      visible: autohide
        ? updateHeuristicVisible(lastRect.height)
        : dockOccupiesWorkArea(),
      x: lastRect.x - winBounds.x, // 창(=렌더러) 기준 좌표로 변환
      width: lastRect.width,
      height: lastRect.height,
    });
  };

  const tickInterval = setInterval(() => {
    // 좌·우 Dock은 캐릭터 동선과 겹치지 않는다. 스크립트를 돌릴 이유가 없다.
    if (orientation !== "bottom") return sendDockState(HIDDEN);

    // osascript 왕복은 한 번에 100ms를 넘긴다. 250ms마다 부르면 거의 상시 떠 있는 셈이라
    // 호출 간격을 벌리고, 그 사이는 마지막으로 읽은 사각형을 재사용한다.
    // 상시 표시 Dock은 위치가 거의 안 바뀌므로 훨씬 드물게 읽어도 된다.
    const scriptInterval = autohide
      ? SCRIPT_INTERVAL_AUTOHIDE
      : SCRIPT_INTERVAL_STATIC;
    const due = Date.now() - lastScriptAt >= scriptInterval;

    // 최근에 osascript가 실패했으면 10초간 휴리스틱으로 동작 후 재시도
    // (앱 실행 중에 권한을 허용해주면 자동으로 정확한 방식으로 복귀)
    if (scriptFailedAt && Date.now() - scriptFailedAt < 10000) {
      return heuristicTick();
    }
    if (!due) {
      // 아직 읽은 적이 없으면 휴리스틱으로 때운다(첫 틱은 곧바로 스크립트를 돈다)
      return lastRect ? sendCachedDockState() : heuristicTick();
    }
    if (scriptRunning) return; // 이전 호출이 아직 안 끝났으면 이번 틱은 건너뜀

    lastScriptAt = Date.now();
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
      // 숨은 상태의 y는 화면 밖이라 쓸모없지만 x·너비·높이는 그대로 유효하다
      lastRect = { x: dockX, width: dockW, height: dockH };
      heuristicVisible = visible;

      const win = getWindow();
      const winBounds =
        win && !win.isDestroyed() ? win.getBounds() : { x: 0, y: 0 };
      sendDockState({
        visible,
        x: dockX - winBounds.x, // 창(=렌더러) 기준 좌표로 변환
        width: dockW,
        height: dockH,
      });
    });
  }, 250);

  return {
    stop() {
      clearInterval(prefsInterval);
      clearInterval(tickInterval);
    },
  };
}

module.exports = { startDockTracker };
