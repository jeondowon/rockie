// 자동 업데이트 (jeondowon.com/rockie/updates/의 latest-mac.yml을 읽는다).
//
// 다운로드는 조용히 백그라운드로 하고, 설치 시점만 사용자가 트레이에서 고른다.
// Rockie는 Dock 아이콘이 없어 "앱을 다시 켜세요" 같은 안내가 잘 닿지 않으므로,
// 받아둔 뒤 트레이 메뉴에 항목을 띄우는 편이 확실하다.
//
// macOS 자동 업데이트는 Squirrel.Mac이 담당하는데 zip만 받는다. dmg는 사람이
// 내려받는 용도라 업데이터는 쳐다보지 않는다(package.json의 mac.target에 둘 다 있는 이유).
const { app } = require("electron");
const { autoUpdater } = require("electron-updater");

// 켜자마자 확인하면 앱 시작이 느려지고 네트워크도 아직 안 붙어 있을 수 있다.
const FIRST_CHECK_DELAY_MS = 60 * 1000;
// 종일 켜두는 앱이라 시작 시 1회만 확인하면 재부팅 전까지 갱신을 못 본다.
const CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000;

let downloadedVersion = null;
let timers = [];

function status() {
  return { downloaded: !!downloadedVersion, version: downloadedVersion };
}

function check() {
  // 오프라인·서버 점검 중이면 그냥 실패한다. 다음 주기에 다시 하면 되므로 조용히 넘긴다.
  autoUpdater.checkForUpdates().catch(() => {});
}

// onDownloaded: 새 버전을 다 받았을 때 1회 호출된다(트레이 항목 표시 + 배너 알림).
function startUpdater({ onDownloaded } = {}) {
  // 개발 실행에는 서명도 업데이트 경로도 없어 electron-updater가 바로 던진다.
  if (!app.isPackaged) return;

  autoUpdater.on("update-downloaded", (info) => {
    downloadedVersion = info.version;
    onDownloaded?.(status());
  });
  autoUpdater.on("error", () => {}); // 네트워크 없음이 정상 상태 중 하나다

  timers.push(setTimeout(check, FIRST_CHECK_DELAY_MS));
  timers.push(setInterval(check, CHECK_INTERVAL_MS));
}

function stopUpdater() {
  timers.forEach(clearTimeout);
  timers.forEach(clearInterval);
  timers = [];
}

// 트레이 "업데이트 설치 후 재시작". 다 받아둔 게 없으면 아무 일도 없어야 한다
// (렌더러가 항목을 숨기지만, 여기서도 막아 두면 순서가 어긋나도 안전하다).
function installUpdate() {
  if (!downloadedVersion) return;
  autoUpdater.quitAndInstall();
}

module.exports = {
  startUpdater,
  stopUpdater,
  installUpdate,
  getUpdateStatus: status,
};
