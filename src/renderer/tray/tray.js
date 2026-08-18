// 트레이 팝업 · 셸 (진입점)
// 화면 전환, 창 높이 계산, 진행 중 모드 배너, 메뉴 항목, 팝업 표시/숨김 수명주기.
// 각 화면의 렌더링은 tray-onboarding.js / tray-pet.js / tray-system.js /
// tray-settings.js가 맡는다 (로드 순서는 tray.html의 script 태그 순서).

const backBar = document.getElementById("back-bar");
const screenTitle = document.getElementById("screen-title");

const screens = {
  onboarding: document.getElementById("onboarding-view"),
  menu: document.getElementById("menu-view"),
  pet: document.getElementById("pet-view"),
  system: document.getElementById("system-view"),
  settings: document.getElementById("settings-view"),
};

const SCREEN_TITLE_KEYS = {
  pet: "menu.myPet",
  system: "menu.systemMonitor",
  settings: "menu.settings",
};

// 진행 중 모드 배너 (집중)
const modeBanner = document.getElementById("mode-banner");
const modeBannerIc = document.getElementById("mode-banner-ic");
const modeBannerLabel = document.getElementById("mode-banner-label");
const modeBannerTime = document.getElementById("mode-banner-time");
const modeBannerExit = document.getElementById("mode-banner-exit");
const modeBannerPause = document.getElementById("mode-banner-pause");

// 메뉴 · "나의 애완돌" 항목 (배지 표시용)
const statusItem = document.querySelector('.mrow[data-action="status"]');

// 메뉴 화면에 딱 맞는 창 높이(px) 계산. 항목 수/높이가 바뀌어도 자동으로 맞춰진다.
function menuWindowHeight() {
  return (
    document.querySelector(".titlebar").offsetHeight +
    modeBanner.offsetHeight + // 모드 배너(숨김 시 0)
    document.querySelector(".menu-head").offsetHeight +
    document.querySelector(".menu-list").offsetHeight +
    6 + // #popup 상하 테두리(3px×2)
    10 // 창 = #popup + 10px (하드 섀도우 여백)
  );
}

// ---------- 진행 중 모드 배너 (집중) ----------
// 상태는 메인이 관리하고(펫 렌더러가 갱신), 여기선 표시만 한다.
// 집중 모드는 focusEndAt으로 남은 시간을 초당 갱신한다.
let modeCountdown = null;
let popupVisible = false;

function stopModeCountdown() {
  if (modeCountdown) {
    clearInterval(modeCountdown);
    modeCountdown = null;
  }
}

function renderModeRemain(remain) {
  const mm = String(Math.floor(remain / 60000)).padStart(2, "0");
  const ss = String(Math.floor((remain % 60000) / 1000)).padStart(2, "0");
  modeBannerTime.textContent = `${mm}:${ss}`;
}

function tickModeCountdown(focusEndAt) {
  renderModeRemain(Math.max(0, focusEndAt - Date.now()));
}

function renderModeBanner(status) {
  stopModeCountdown();
  if (!status) {
    modeBanner.classList.add("hidden");
    resizeMenuIfActive();
    return;
  }
  modeBannerIc.innerHTML = svgIcon(ICON_TARGET);
  modeBannerLabel.textContent = t("mode.focus");
  modeBannerPause.textContent = status.paused
    ? t("mode.resume")
    : t("mode.pause");
  modeBanner.classList.remove("hidden");
  if (status.paused) {
    // 일시정지 중엔 남은 시간을 멈춘 채로 표시한다(초당 갱신 없음)
    renderModeRemain(Math.max(0, status.remainMs || 0));
  } else if (status.focusEndAt) {
    tickModeCountdown(status.focusEndAt);
    // 팝업이 보이는 동안만 초당 갱신한다(숨은 창에서 돌지 않게)
    if (popupVisible) {
      modeCountdown = setInterval(
        () => tickModeCountdown(status.focusEndAt),
        1000,
      );
    }
  }
  resizeMenuIfActive();
}

// 메뉴 화면이 떠 있을 때만 배너 높이 변화에 맞춰 창을 다시 맞춘다.
function resizeMenuIfActive() {
  if (!screens.menu.classList.contains("hidden")) {
    window.trayAPI.resizePopup(menuWindowHeight());
  }
}

modeBannerExit.addEventListener("click", () => {
  window.trayAPI.sendAction("exit-mode");
});

modeBannerPause.addEventListener("click", () => {
  window.trayAPI.sendAction("pause-mode");
});

// 모드가 바뀌면(진입/해제/만료) 메인이 push → 팝업이 열려 있으면 즉시 반영
window.trayAPI.onModeStatus((status) => {
  if (popupVisible) renderModeBanner(status);
});

// ---------- 화면 전환 ----------
function showScreen(name) {
  for (const [key, node] of Object.entries(screens)) {
    node.classList.toggle("hidden", key !== name);
  }
  if (name === "menu" || name === "onboarding") {
    backBar.classList.add("hidden");
  } else {
    backBar.classList.remove("hidden");
    screenTitle.textContent = SCREEN_TITLE_KEYS[name]
      ? t(SCREEN_TITLE_KEYS[name])
      : "";
  }
  // 메뉴는 항목 높이에 맞춰 짧게, 하위 화면은 기존 높이(0 = full)로 창 리사이즈
  window.trayAPI.resizePopup(name === "menu" ? menuWindowHeight() : 0);
  // 시스템 모니터는 화면이 보이는 동안만 폴링한다.
  if (name === "system") {
    refreshPetDisplaySprite();
    startSystemMonitor();
  } else stopSystemMonitor();
}

// ---------- 메뉴 항목 클릭 ----------
document.querySelectorAll(".mrow").forEach((item) => {
  item.addEventListener("click", () => {
    const action = item.dataset.action;
    switch (action) {
      case "status":
        showPet(); // 뷰만 전환 (메인에 보낼 동작 없음)
        break;
      case "system":
        showScreen("system"); // 폴링은 showScreen 훅에서 시작된다
        break;
      case "settings":
        showSettings(); // 뷰만 전환 (메인에 보낼 동작 없음)
        break;
      case "toggle-pet":
      case "quit":
        window.trayAPI.sendAction(action);
        break;
    }
  });
});

backBar.addEventListener("click", () => showScreen("menu"));

// 오늘 답할 질문이 남아 있으면 "나의 애완돌" 항목에 배지를 표시
async function refreshBadge() {
  try {
    const state = await window.trayAPI.getEvolutionState();
    statusItem.classList.toggle("has-badge", !!state.hasBadge);
    petNameTitle.textContent = state.petName || t("pet.defaultName"); // 메뉴 화면 타이틀바에도 반영
    renderAffinity(state.affinityPoints); // 타이틀바 호감도 pip(레벨)은 항상 보이므로 여기서도 갱신
  } catch (_err) {
    // 상태를 못 읽으면 배지 없이 둔다
  }
}

// 팝업이 열릴 때마다 메뉴로 초기화하고 권한 상태·배지를 갱신
window.trayAPI.onWillShow(async () => {
  popupVisible = true;
  hideResetConfirm(); // 이전에 열려 있던 확인창이 남지 않도록
  const onboarding = await window.trayAPI.getOnboardingState();
  if (!onboarding.completed) {
    showOnboarding();
    return;
  }
  showScreen("menu");
  refreshPermToggle();
  refreshBadge();
  renderModeBanner(await window.trayAPI.getModeStatus()); // 진행 중 모드 배너
});

// 팝업이 닫히면 시스템 모니터 폴링·모드 카운트다운을 멈춘다 (숨은 창에서 계속 도는 것 방지)
window.trayAPI.onWillHide(() => {
  popupVisible = false;
  stopSystemMonitor();
  stopModeCountdown();
});

// ---------- 표시 언어 ----------
// HTML에 박힌 정적 문구를 현재 언어로 채운다(첫 페인트 직후 1회).
applyStaticI18n();

// 언어가 바뀌면 정적 문구는 i18n이 알아서 갈아끼우고, JS로 그린 부분만 여기서 되살린다.
onLocaleChange(() => {
  if (!screens.menu.classList.contains("hidden")) resizeMenuIfActive();
  if (!screens.settings.classList.contains("hidden")) showSettings();
  if (!screens.pet.classList.contains("hidden")) showPet();
});
