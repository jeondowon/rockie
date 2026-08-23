// 트레이 팝업 · 설정 화면 (#settings-view)
// 화면 기록 권한, 일반 토글, 펫 위치·크기, 집중/쪽잠 시간, 처음부터 다시 키우기.
// 화면 전환(showScreen)은 tray.js에 있다.

// 설정 · 화면 기록 권한
const permRow = document.getElementById("perm-row");
const permBox = document.getElementById("perm-box");
const permHint = document.getElementById("perm-hint");
// 문구는 언어에 따라 달라지므로 상수로 굳히지 않고 그릴 때 t()로 읽는다.
// 이 설정 화면에서 권한 요청을 이미 한 번 보냈는지. 두 번째 클릭은 시스템 설정을 연다.
let permRequested = false;

// 권한 행 세 개(화면 기록·자동화·손쉬운 사용)가 함께 쓴다.
function setPermBox(box, granted) {
  box.classList.toggle("on", granted);
  box.textContent = granted ? "[✓]" : "[  ]";
}

async function refreshPermToggle() {
  const status = await window.trayAPI.getScreenPermission();
  setPermBox(permBox, status === "granted");
}

// 설정 · Dock 회피 권한(자동화 + 손쉬운 사용). 둘 다 있어야 Dock을 정확히 피하고
// 하나만 켜면 효과가 없어서(dock-tracker.js 머리말) 늘 둘 다 보여준다.
//
// 자동화는 상태를 조회하는 API가 없어 첫 Apple Event 전에는 "unknown"이다. 게다가
// 손쉬운 사용이 꺼져 있으면 Dock 스크립트도 안 돌아 영영 unknown으로 남는다.
// 그때는 미허용과 같은 빈 칸으로 둔다 — 눌러 보면 그 자리에서 판정된다.
const autoPermRow = document.getElementById("auto-perm-row");
const autoPermBox = document.getElementById("auto-perm-box");
const autoPermHint = document.getElementById("auto-perm-hint");
const axPermRow = document.getElementById("ax-perm-row");
const axPermBox = document.getElementById("ax-perm-box");
const axPermHint = document.getElementById("ax-perm-hint");
// 이 설정 화면에서 각각 요청을 이미 한 번 보냈는지(permRequested와 같은 역할).
let autoPermRequested = false;
let axPermRequested = false;

async function refreshDockPerm() {
  const { automation, accessibility } =
    await window.trayAPI.getDockPermission();
  setPermBox(autoPermBox, automation === "granted");
  setPermBox(axPermBox, accessibility);
}

// 두 행 모두 화면 기록 행과 같은 3단계다: 허용됨이면 해제 경로를 안내하고,
// 아니면 첫 클릭에 요청을 보내고, 그래도 안 켜졌으면 두 번째 클릭에서 설정을 연다.
//
// 첫 클릭이 "요청"인 것이 중요하다. macOS는 앱이 그 권한을 실제로 요청한 적이
// 있어야 목록에 올려주므로, 요청 없이 설정만 열면 목록에 Rockie가 없어 켤 항목을
// 못 찾는다. 손쉬운 사용은 조회(prompt:false)로는 등록되지 않고 Dock 스크립트도
// 권한이 없으면 아예 안 돌아서(dock-tracker.js), 저절로 올라갈 길이 없다.
autoPermRow.addEventListener("click", async () => {
  // macOS는 권한을 코드로 해제할 수 없다. 경로를 안내하는 대신 그 화면을 바로 연다.
  if (autoPermBox.classList.contains("on")) {
    window.trayAPI.openDockAutomationSettings();
    autoPermHint.textContent = t("settings.permRevokeHint");
    return;
  }
  // 첫 클릭에서 띄운 안내가 그대로 유효하니 문구는 두지 않고 설정 창만 연다.
  if (autoPermRequested) {
    window.trayAPI.openDockAutomationSettings();
    return;
  }
  autoPermRequested = true;

  // 이 호출이 곧 요청이다 — 첫 Apple Event에서 macOS가 권한 창을 띄운다.
  // (이미 거부된 상태면 macOS가 다시 띄우지 않는다)
  const status = await window.trayAPI.requestDockAutomation();
  setPermBox(autoPermBox, status === "granted");
  if (status === "granted") return;
  // 자동화는 손쉬운 사용과 달리 켜는 즉시 반영된다. 재시작을 안내하지 않는다.
  autoPermHint.textContent = t("settings.permAutoRetry");
});

axPermRow.addEventListener("click", async () => {
  if (axPermBox.classList.contains("on")) {
    window.trayAPI.openAccessibilitySettings();
    axPermHint.textContent = t("settings.permRevokeHint");
    return;
  }
  // 첫 클릭에서 띄운 안내가 그대로 유효하니 문구는 두지 않고 설정 창만 연다.
  if (axPermRequested) {
    window.trayAPI.openAccessibilitySettings();
    return;
  }
  axPermRequested = true;

  // prompt: true로 물어 권한 창을 띄운다. 허용해도 macOS가 실행 중인 프로세스에는
  // 바로 반영하지 않으므로, 여기서 참으로 바뀌는 일은 드물다.
  const granted = await window.trayAPI.requestAccessibility();
  setPermBox(axPermBox, granted);
  if (granted) return;
  axPermHint.textContent = t("settings.permRestartNote");
});

async function showSettings() {
  showScreen("settings");
  permHint.textContent = t("settings.screenPermissionDesc");
  autoPermHint.textContent = t("settings.automationPermissionDesc");
  axPermHint.textContent = t("settings.accessibilityPermissionDesc");
  // 화면을 새로 열면 세 행 모두 다시 요청부터 시작한다
  permRequested = false;
  autoPermRequested = false;
  axPermRequested = false;
  refreshPermToggle();
  refreshDockPerm();
  refreshSettings();
  refreshDisplays();
}

// ---------- 설정 · 일반 토글 / 위치 / 크기 ----------
const settingToggles = document.querySelectorAll(".set-row[data-setting]");
const placeChips = document.querySelectorAll(".chip[data-place]");
const sizeChips = document.querySelectorAll(".chip[data-size]");
const languageChips = document.querySelectorAll(".chip[data-language]");
const focusRange = document.getElementById("focus-minutes-range");
const focusValueEl = document.getElementById("focus-minutes-value");
const napRange = document.getElementById("nap-minutes-range");
const napValueEl = document.getElementById("nap-minutes-value");
const appVersionEl = document.getElementById("app-version");
const resetBtn = document.getElementById("reset-btn");
const confirmOverlay = document.getElementById("confirm-overlay");
const confirmTitle = document.getElementById("confirm-title");
const confirmDesc = document.getElementById("confirm-desc");
const confirmCancel = document.getElementById("confirm-cancel");
const confirmOk = document.getElementById("confirm-ok");

function setToggleBox(btn, on) {
  const box = btn.querySelector(".set-box");
  box.classList.toggle("on", on);
  box.textContent = on ? "[✓]" : "[  ]";
}

// 저장된 설정값을 읽어 토글/칩의 표시 상태를 맞춘다.
async function refreshSettings() {
  let s;
  try {
    s = await window.trayAPI.getSettings();
  } catch (_err) {
    return;
  }
  settingToggles.forEach((btn) => setToggleBox(btn, !!s[btn.dataset.setting]));
  placeChips.forEach((chip) =>
    chip.classList.toggle("on", chip.dataset.place === s.petPlacement),
  );
  sizeChips.forEach((chip) =>
    chip.classList.toggle("on", chip.dataset.size === s.petSize),
  );
  languageChips.forEach((chip) =>
    chip.classList.toggle("on", chip.dataset.language === getLocale()),
  );
  focusRange.value = String(Number(s.focusMinutes) || 25);
  focusValueEl.textContent = focusRange.value; // 슬라이더가 값을 범위 안으로 다듬은 뒤 읽는다
  napRange.value = String(Number(s.napMinutes) || 20);
  napValueEl.textContent = napRange.value;
  // 언어를 바꿔도 지워지지 않도록 data-i18n이 없는 자리에 따로 넣는다.
  appVersionEl.textContent = s.appVersion || "?";
}

// ---------- 설정 · 표시할 모니터 ----------
// 칩과 달리 HTML에 못 박을 수 없다(모니터 개수·이름은 실행 중에만 알 수 있다).
const displayPanel = document.getElementById("display-panel");
const displayList = document.getElementById("display-list");

function makeDisplayRow(id, title, desc, selected) {
  const btn = document.createElement("button");
  btn.className = "set-row";
  const box = document.createElement("span");
  box.className = "set-box";
  const text = document.createElement("div");
  text.className = "set-text";
  const titleEl = document.createElement("div");
  titleEl.className = "set-title";
  titleEl.textContent = title; // 모니터 이름은 OS가 준 값이라 그대로 넣지 않는다
  const descEl = document.createElement("div");
  descEl.className = "set-desc";
  descEl.textContent = desc;
  text.append(titleEl, descEl);
  btn.append(box, text);
  setToggleBox(btn, id === selected);
  btn.addEventListener("click", () => {
    window.trayAPI.setSetting("petDisplayId", id);
    refreshDisplays(); // 선택 표시를 즉시 갱신
  });
  return btn;
}

async function refreshDisplays() {
  let info;
  try {
    info = await window.trayAPI.getDisplays();
  } catch (_err) {
    return;
  }
  displayPanel.classList.toggle("hidden", info.displays.length < 2);
  if (info.displays.length < 2) return;
  displayList.replaceChildren(
    makeDisplayRow(
      null,
      t("settings.displayAuto"),
      t("settings.displayAutoDesc"),
      info.selected,
    ),
    ...info.displays.map((d, i) =>
      makeDisplayRow(
        d.id,
        d.label || t("settings.displayFallback", { n: i + 1 }),
        `${d.width} × ${d.height}`,
        info.selected,
      ),
    ),
  );
}

settingToggles.forEach((btn) => {
  btn.addEventListener("click", () => {
    const on = !btn.querySelector(".set-box").classList.contains("on");
    setToggleBox(btn, on);
    window.trayAPI.setSetting(btn.dataset.setting, on);
  });
});

placeChips.forEach((chip) => {
  chip.addEventListener("click", () => {
    placeChips.forEach((c) => c.classList.toggle("on", c === chip));
    window.trayAPI.setSetting("petPlacement", chip.dataset.place);
  });
});

sizeChips.forEach((chip) => {
  chip.addEventListener("click", () => {
    sizeChips.forEach((c) => c.classList.toggle("on", c === chip));
    window.trayAPI.setSetting("petSize", chip.dataset.size);
  });
});

languageChips.forEach((chip) => {
  chip.addEventListener("click", () => {
    languageChips.forEach((c) => c.classList.toggle("on", c === chip));
    window.trayAPI.setSetting("language", chip.dataset.language);
  });
});

// 10분 배수 근처(±2분)에 오면 끌어당기는 자석 효과.
// 끌 때만 걸어서, 방향키로는 1분 단위 미세 조정이 그대로 되게 둔다.
const SNAP_STEP = 10;
const SNAP_PULL = 2;
let sliderDragging = false;

function snapMinutes(range, v) {
  const nearest = Math.round(v / SNAP_STEP) * SNAP_STEP;
  // 배수가 범위 밖이면(예: 1~4분의 0) 끌어당기지 않는다
  if (nearest < Number(range.min) || nearest > Number(range.max)) return v;
  return Math.abs(v - nearest) <= SNAP_PULL ? nearest : v;
}

// 슬라이더 밖에서 손을 떼도 풀리도록 window에 건다
window.addEventListener("pointerup", () => {
  sliderDragging = false;
});

// 집중·쪽잠 슬라이더는 저장하는 설정 이름만 다르고 동작이 같다.
function bindMinutesSlider(range, valueEl, key) {
  range.addEventListener("pointerdown", () => {
    sliderDragging = true;
  });
  // 끄는 동안엔 숫자만 따라 움직이고, 손을 뗄 때(change) 한 번만 저장한다.
  range.addEventListener("input", () => {
    if (sliderDragging) {
      range.value = String(snapMinutes(range, Number(range.value)));
    }
    valueEl.textContent = range.value;
  });
  range.addEventListener("change", () => {
    window.trayAPI.setSetting(key, Number(range.value));
  });
}

bindMinutesSlider(focusRange, focusValueEl, "focusMinutes");
bindMinutesSlider(napRange, napValueEl, "napMinutes");

// 되돌릴 수 없는 동작은 기본 macOS 알림창 대신 이 인앱 확인창을 거친다.
// 초기화와 앱 종료가 함께 쓰므로 문구와 확인 후 동작을 띄울 때 받는다.
// tray.js보다 먼저 로드되므로 그쪽 종료 버튼도 이 함수를 그대로 부른다.
let confirmAction = null;

function showConfirm({ title, desc, okLabel, onOk }) {
  confirmTitle.textContent = title;
  confirmDesc.textContent = desc;
  confirmOk.textContent = okLabel;
  confirmAction = onOk;
  confirmOverlay.classList.remove("hidden");
}

function hideConfirm() {
  confirmOverlay.classList.add("hidden");
  confirmAction = null;
}

resetBtn.addEventListener("click", () => {
  showConfirm({
    title: t("confirm.resetTitle"),
    desc: t("confirm.resetDesc"),
    okLabel: t("confirm.reset"),
    onOk: async () => {
      const done = await window.trayAPI.resetPet();
      if (done) refreshSettings(); // 기본값으로 되돌아간 상태를 다시 반영
      window.trayAPI.sendAction("close-popup"); // 초기화 확정 후 트레이 창을 닫는다
    },
  });
});

// 설정 하단 홈페이지 링크
document.getElementById("homepage-btn").addEventListener("click", () => {
  window.trayAPI.sendAction("homepage");
});

// 설정 하단 정책 링크 줄. data-link 값이 그대로 메인의 action 이름이 된다.
document.getElementById("policy-links").addEventListener("click", (e) => {
  const link = e.target.closest("[data-link]");
  if (link) window.trayAPI.sendAction(link.dataset.link);
});
confirmCancel.addEventListener("click", hideConfirm);
confirmOk.addEventListener("click", () => {
  // 확인창을 먼저 닫는다 — onOk가 앱을 끄거나 팝업을 닫으므로 뒤에 두면 안 돌 수 있다.
  const run = confirmAction;
  hideConfirm();
  if (run) run();
});

permRow.addEventListener("click", async () => {
  const status = await window.trayAPI.getScreenPermission();

  if (status === "granted") {
    // macOS는 권한을 코드로 해제할 수 없다. 경로를 안내하는 대신 그 화면을 바로 연다.
    window.trayAPI.openScreenPermissionSettings();
    permHint.textContent = t("settings.permRevokeHint");
    return;
  }

  // 요청했는데도 허용으로 안 읽히면 "허용했지만 재시작 전"인지 "거부"인지 알 수 없다.
  // 추측해서 설정을 열지 않고, 한 번 더 눌렀을 때만 연다.
  if (permRequested) {
    window.trayAPI.openScreenPermissionSettings();
    return;
  }
  permRequested = true;

  // 시스템 권한 팝업 유도 (이미 거부된 상태면 macOS가 다시 띄우지 않음)
  const after = await window.trayAPI.requestScreenPermission();
  setPermBox(permBox, after === "granted");
  if (after === "granted") return;
  permHint.textContent = t("settings.permRestartNote");
});
