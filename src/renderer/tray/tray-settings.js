// 트레이 팝업 · 설정 화면 (#settings-view)
// 권한 행 세 개, 일반 토글, 펫 위치·크기, 집중/쪽잠 시간, 처음부터 다시 키우기.
// 화면 전환(showScreen)은 tray.js에 있다.

// 체크박스 한 칸. 꺼진 칸은 공백 하나라 켜진 칸(`[✓]`)보다 좁다 — 의도한 모양이다.
// 공백은 **U+00A0(NBSP)**로 둔다. 일반 공백은 개수가 늘면 HTML 렌더링에서 접혀
// tray.html의 초기 표시와 어긋나므로, 눈에 안 보이는 문자를 escape로 못 박는다.
// (tray.html의 `[&nbsp;]` 10곳과 반드시 같은 폭이어야 한다)
const BOX_OFF = "[\u00a0]";

function setBox(box, on) {
  box.classList.toggle("on", on);
  box.textContent = on ? "[✓]" : BOX_OFF;
}

// ---------- 설정 · 권한 행 세 개 ----------
// 화면 기록 · 자동화 · 손쉬운 사용. Dock 회피에는 자동화와 손쉬운 사용이 둘 다
// 필요한데(dock-tracker.js 머리말) 하나만 보여주면 나머지가 왜 필요한지 알 길이
// 없어서, 셋 다 상태와 무관하게 늘 보여준다.
//
// 누르면 하는 일이 셋 다 같은 3단계다.
//   1. 이미 허용됨 → 해제 경로를 안내하는 대신 그 설정 화면을 바로 연다.
//      macOS는 권한을 코드로 해제할 수 없다.
//   2. 아직 요청 전 → **요청부터 보낸다.** 이게 핵심이다. macOS는 앱이 그 권한을
//      실제로 요청한 적이 있어야 목록에 올려주므로, 요청 없이 설정만 열면 목록에
//      Rockie가 없어 켤 항목을 못 찾는다. 손쉬운 사용은 조회(prompt:false)로는
//      등록되지 않고 Dock 스크립트도 권한이 없으면 아예 안 돌아(dock-tracker.js)
//      저절로 올라갈 길이 없다.
//   3. 요청했는데도 안 켜짐 → 두 번째 클릭에서 설정 화면을 연다. 추측해서 먼저
//      열지 않는다 — "허용했지만 재시작 전"인지 "거부"인지 구분할 수 없다.
//
// 행마다 다른 것은 요청·열기 호출과 실패 안내 문구뿐이라 표로 둔다.
// 표는 키로 찾아 쓰므로 순서가 동작을 바꾸진 않지만, 읽기 좋게 tray.html에 세운
// 순서(손쉬운 사용 · 자동화 · 화면 기록)와 맞춰 둔다.
const PERM_ROWS = {
  accessibility: {
    row: document.getElementById("ax-perm-row"),
    box: document.getElementById("ax-perm-box"),
    hint: document.getElementById("ax-perm-hint"),
    descKey: "settings.accessibilityPermissionDesc",
    retryKey: "settings.permRestartNote",
    // prompt: true로 물어 권한 창을 띄운다. 허용해도 macOS가 실행 중인 프로세스에는
    // 바로 반영하지 않으므로, 여기서 참으로 바뀌는 일은 드물다.
    request: () => window.trayAPI.requestAccessibility(),
    openSettings: () => window.trayAPI.openAccessibilitySettings(),
  },
  automation: {
    row: document.getElementById("auto-perm-row"),
    box: document.getElementById("auto-perm-box"),
    hint: document.getElementById("auto-perm-hint"),
    descKey: "settings.automationPermissionDesc",
    // 자동화만 안내가 다르다. 켜는 즉시 반영되므로 재시작을 안내하지 않는다.
    retryKey: "settings.permAutoRetry",
    // 이 호출이 곧 요청이다 — 첫 Apple Event에서 macOS가 권한 창을 띄운다.
    // (이미 거부된 상태면 macOS가 다시 띄우지 않는다)
    request: async () =>
      (await window.trayAPI.requestDockAutomation()) === "granted",
    openSettings: () => window.trayAPI.openDockAutomationSettings(),
  },
  screen: {
    row: document.getElementById("perm-row"),
    box: document.getElementById("perm-box"),
    hint: document.getElementById("perm-hint"),
    descKey: "settings.screenPermissionDesc",
    // 화면 기록은 켠 뒤 재시작해야 반영된다.
    retryKey: "settings.permRestartNote",
    // 허용 여부는 조회만으로 알 수 있고 권한 창도 안 뜨므로 누를 때마다 새로 묻는다.
    // 나머지 둘은 이 조회가 없어(자동화는 상태 API 자체가 없고, 손쉬운 사용은
    // prompt:true라 창이 뜬다) 화면을 열 때 읽어 둔 칸 표시를 그대로 믿는다.
    isGranted: async () =>
      (await window.trayAPI.getScreenPermission()) === "granted",
    request: async () =>
      (await window.trayAPI.requestScreenPermission()) === "granted",
    openSettings: () => window.trayAPI.openScreenPermissionSettings(),
  },
};

// 이 설정 화면에서 각 권한 요청을 이미 한 번 보냈는지. 두 번째 클릭은 설정을 연다.
// (화면을 새로 열면 refreshPerms가 셋 다 다시 요청부터 시작하도록 되돌린다)
const permRequested = {};

for (const [key, perm] of Object.entries(PERM_ROWS)) {
  perm.row.addEventListener("click", async () => {
    // isGranted가 없는 행은 화면을 열 때 읽어 둔 칸 표시를 그대로 쓴다.
    const alreadyOn = perm.isGranted
      ? await perm.isGranted()
      : perm.box.classList.contains("on");
    if (alreadyOn) {
      perm.openSettings();
      perm.hint.textContent = t("settings.permRevokeHint");
      return;
    }
    // 첫 클릭에서 띄운 안내가 그대로 유효하니 문구는 두지 않고 설정 창만 연다.
    if (permRequested[key]) {
      perm.openSettings();
      return;
    }
    permRequested[key] = true;

    const granted = await perm.request();
    setBox(perm.box, granted);
    if (granted) return;
    perm.hint.textContent = t(perm.retryKey);
  });
}

// 세 칸의 현재 상태를 읽어 표시를 맞춘다. 셋 다 권한 창을 띄우지 않는 조회다
// (자동화는 캐시된 상태, 손쉬운 사용은 prompt:false).
async function refreshPerms() {
  for (const [key, perm] of Object.entries(PERM_ROWS)) {
    permRequested[key] = false; // 화면을 새로 열면 다시 요청부터 시작한다
    perm.hint.textContent = t(perm.descKey);
  }
  const [screenStatus, dockPerm] = await Promise.all([
    window.trayAPI.getScreenPermission(),
    window.trayAPI.getDockPermission(),
  ]);
  setBox(PERM_ROWS.screen.box, screenStatus === "granted");
  setBox(PERM_ROWS.automation.box, dockPerm.automation === "granted");
  setBox(PERM_ROWS.accessibility.box, dockPerm.accessibility);
}

async function showSettings() {
  showScreen("settings");
  refreshPerms();
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
  setBox(btn.querySelector(".set-box"), on);
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
