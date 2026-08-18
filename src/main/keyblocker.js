// 키보드 완전 차단 (CGEventTap 헬퍼) — 청소·쪽잠 모드가 쓴다.
// 네이티브 Swift 헬퍼(KeyBlocker.app)가 CGEventTap으로 모든 키 이벤트를
// 삼킨다. WindowServer가 단축키를 처리하기 전 단계라 Cmd+Space(Spotlight)·Cmd+Tab까지
// 막힌다(hidutil·globalShortcut로는 불가). 마우스는 살아 있어 해제 버튼을 누를 수 있다.
// 헬퍼는 stop 파일 또는 부모 프로세스 종료를 감지하면 스스로 탭을 풀고 종료한다.
// 손쉬운 사용 권한만 있으면 된다(이벤트를 소멸시키는 액티브 탭이라 '제어' 관할).
// 없으면 헬퍼가 보고하고, 오버레이가 설정창을 여는 버튼을 띄운다.
const { app, shell } = require("electron");
const path = require("path");
const fs = require("fs");
const { spawn } = require("child_process");

let cleanHelper = null;
let cleanAutoStopTimer = null;
const CLEAN_START_TIMEOUT_MS = 3000;
// 패키징하면 __dirname이 asar 안이라 이 경로도 app.asar 아래로 잡힌다. 헬퍼는
// asarUnpack으로 app.asar.unpacked에 실제 파일로 빠져 있고, 실행에 쓰는 /usr/bin/open은
// 외부 명령이라 asar를 못 읽으므로 경로를 unpacked 쪽으로 돌려준다.
// 개발 실행에는 경로에 app.asar가 없어 아무 일도 일어나지 않는다.
const KEYBLOCKER_APP_PATH = path
  .join(__dirname, "../../assets/helper/KeyBlocker.app")
  .replace(`app.asar${path.sep}`, `app.asar.unpacked${path.sep}`);
const KEYBLOCKER_EXEC_PATH = path.join(
  KEYBLOCKER_APP_PATH,
  "Contents/MacOS/keyblocker",
);

// 헬퍼의 원시 상태 문자열을 렌더러가 그리는 상태로 번역해 onStatus로 넘긴다.
// 헬퍼 프로토콜을 아는 건 이 모듈뿐이므로, 바깥은 번역된 값만 받는다.
function handleKeyBlockerStatus(helper, status) {
  if (!status || status === helper.status) return;
  helper.status = status;
  console.error("[clean] keyblocker:", status);
  const report = helper.onStatus;
  if (status.startsWith("SPACE_TAP:")) {
    // 비상 해제 제스처 진행 상황(0이면 초기화됨). 오버레이에 그대로 보여준다.
    report(`space-tap:${status.slice("SPACE_TAP:".length)}`);
  } else if (status === "UNLOCK_REQUEST") {
    // 헬퍼가 비상 해제 제스처(스페이스 10연타)를 감지했다. 잠금은 렌더러가 모드를
    // 닫으면서 clean:exit로 푼다(여기서 바로 풀면 오버레이만 남는다).
    report("unlock-request");
  } else if (status === "READY") {
    report("blocked");
  } else if (status.startsWith("NO_PERMS:")) {
    // 부족한 권한 목록을 그대로 넘긴다 — 렌더러가 어떤 항목을 켜야 하는지 안내 문구에
    // 쓴다. 설정창은 렌더러 버튼으로 사용자가 직접 연다.
    report(`no-perms:${status.slice("NO_PERMS:".length)}`);
  } else if (status === "NO_EVENT_TAP") {
    report("event-tap-failed");
  } else {
    report("error");
  }
}

// 앱이 멈춰도 키보드가 영영 잠기지 않도록 두는 최후 안전장치.
// 상한은 모드가 정한다(청소는 하트비트로 계속 밀고, 쪽잠은 설정한 수면 시간만큼).
function armCleanAutoStop(maxMs, onStatus) {
  if (cleanAutoStopTimer) clearTimeout(cleanAutoStopTimer);
  cleanAutoStopTimer = setTimeout(() => {
    console.error("[clean] 자동 해제: 최대 잠금 시간을 초과했습니다.");
    stopKeyBlocker();
    // 실패가 아니라 시간이 다 된 것 — 렌더러가 "잠금 실패"로 오해하지 않도록 구분해서 알린다.
    onStatus("time-limit");
  }, maxMs);
}

// 잠금 시작. 이미 잠금 중이면(쪽잠의 스누즈·청소의 하트비트) 헬퍼는 그대로 두고
// 자동 해제 상한만 뒤로 민다. 권한 판단은 헬퍼가 실제 CGEventTap 생성 결과로 한다.
function startKeyBlocker(maxMs, onStatus) {
  if (process.platform !== "darwin") return; // 헬퍼는 macOS 전용
  if (cleanHelper) {
    armCleanAutoStop(maxMs, onStatus);
    return;
  }
  armCleanAutoStop(maxMs, onStatus);

  const sessionDir = fs.mkdtempSync(
    path.join(app.getPath("temp"), "deskpet-keyblocker-"),
  );
  const statusPath = path.join(sessionDir, "status");
  const stopPath = path.join(sessionDir, "stop");

  let child;
  try {
    child = spawn(
      "/usr/bin/open",
      [
        "-n",
        "-W",
        KEYBLOCKER_APP_PATH,
        "--args",
        statusPath,
        stopPath,
        String(process.pid),
      ],
      { stdio: "ignore" },
    );
    cleanHelper = {
      child,
      sessionDir,
      statusPath,
      stopPath,
      status: null,
      statusTimer: null,
      startTimer: null,
      onStatus,
    };
  } catch (err) {
    console.error("[clean] keyblocker 실행 실패:", err.message);
    onStatus("error");
    return;
  }

  cleanHelper.statusTimer = setInterval(() => {
    if (!cleanHelper || cleanHelper.statusPath !== statusPath) return;
    try {
      handleKeyBlockerStatus(
        cleanHelper,
        fs.readFileSync(statusPath, "utf8").trim(),
      );
    } catch (_err) {}
  }, 100);

  cleanHelper.startTimer = setTimeout(() => {
    if (
      !cleanHelper ||
      cleanHelper.statusPath !== statusPath ||
      cleanHelper.status
    ) {
      return;
    }
    console.error("[clean] keyblocker 시작 시간 초과");
    stopKeyBlocker();
    onStatus("error");
  }, CLEAN_START_TIMEOUT_MS);

  cleanHelper.child.on("error", (err) => {
    console.error("[clean] keyblocker 오류:", err.message);
    stopKeyBlocker();
    onStatus("error");
  });
  cleanHelper.child.on("exit", (code, signal) => {
    const helper =
      cleanHelper && cleanHelper.child === child ? cleanHelper : null;
    if (helper) {
      try {
        handleKeyBlockerStatus(
          helper,
          fs.readFileSync(statusPath, "utf8").trim(),
        );
      } catch (_err) {}
    }
    if (code !== 0) {
      console.error("[clean] keyblocker 종료:", { code, signal });
    }
    if (helper) {
      clearInterval(helper.statusTimer);
      clearTimeout(helper.startTimer);
      if (cleanAutoStopTimer) {
        clearTimeout(cleanAutoStopTimer);
        cleanAutoStopTimer = null;
      }
      cleanHelper = null;
    }
  });
}

function stopKeyBlocker() {
  if (cleanAutoStopTimer) {
    clearTimeout(cleanAutoStopTimer);
    cleanAutoStopTimer = null;
  }
  if (!cleanHelper) return;
  const helper = cleanHelper;
  cleanHelper = null;
  clearInterval(helper.statusTimer);
  clearTimeout(helper.startTimer);
  try {
    fs.writeFileSync(helper.stopPath, "stop");
    helper.child.kill();
    spawn("/usr/bin/pkill", ["-f", KEYBLOCKER_EXEC_PATH], { stdio: "ignore" });
  } catch (_e) {
    // 이미 죽었으면 무시
  }
}

// 필요한 권한이 '손쉬운 사용' 하나뿐이라 그 페이지를 바로 연다.
// 목록 등록은 따로 하지 않는다 — 모드 진입 때 실행된 헬퍼의 AXIsProcessTrusted가
// 이미 KeyBlocker를 이 목록에 올려 놓으므로, 창이 열리면 토글만 켜면 된다.
function openPermissionSettings() {
  shell.openExternal(
    "x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility",
  );
}

module.exports = { startKeyBlocker, stopKeyBlocker, openPermissionSettings };
