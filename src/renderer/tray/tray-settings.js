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

function setPermBox(granted) {
  permBox.classList.toggle("on", granted);
  permBox.textContent = granted ? "[✓]" : "[  ]";
}

async function refreshPermToggle() {
  const status = await window.trayAPI.getScreenPermission();
  setPermBox(status === "granted");
}

// 설정 · 자동화 권한 (Dock 좌표 읽기). 손쉬운 사용과 별개 권한이라 따로 안내한다.
// 거부됐을 때만 보여준다 — 허용 상태면 사용자가 할 일이 없고, 앱이 아직 Dock을
// 한 번도 안 읽었으면(unknown) 판단할 근거가 없다.
const autoPermRow = document.getElementById("auto-perm-row");

async function refreshAutomationPerm() {
  const status = await window.trayAPI.getDockAutomation();
  autoPermRow.classList.toggle("hidden", status !== "denied");
}

autoPermRow.addEventListener("click", () => {
  window.trayAPI.openDockAutomationSettings();
});

async function showSettings() {
  showScreen("settings");
  permHint.textContent = t("settings.screenPermissionDesc");
  permRequested = false; // 화면을 새로 열면 다시 요청부터 시작한다
  refreshPermToggle();
  refreshAutomationPerm();
  refreshSettings();
}

// ---------- 설정 · 일반 토글 / 위치 / 크기 ----------
const settingToggles = document.querySelectorAll(".set-row[data-setting]");
const placeChips = document.querySelectorAll(".chip[data-place]");
const sizeChips = document.querySelectorAll(".chip[data-size]");
const focusMinuteChips = document.querySelectorAll(".chip[data-focus-minutes]");
const languageChips = document.querySelectorAll(".chip[data-language]");
const napRange = document.getElementById("nap-minutes-range");
const napValueEl = document.getElementById("nap-minutes-value");
const resetBtn = document.getElementById("reset-btn");
const confirmOverlay = document.getElementById("confirm-overlay");
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
  focusMinuteChips.forEach((chip) =>
    chip.classList.toggle(
      "on",
      Number(chip.dataset.focusMinutes) === Number(s.focusMinutes || 25),
    ),
  );
  languageChips.forEach((chip) =>
    chip.classList.toggle("on", chip.dataset.language === getLocale()),
  );
  napRange.value = String(Number(s.napMinutes) || 20);
  napValueEl.textContent = napRange.value; // 슬라이더가 값을 범위 안으로 다듬은 뒤 읽는다
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

focusMinuteChips.forEach((chip) => {
  chip.addEventListener("click", () => {
    focusMinuteChips.forEach((c) => c.classList.toggle("on", c === chip));
    window.trayAPI.setSetting(
      "focusMinutes",
      Number(chip.dataset.focusMinutes),
    );
  });
});

// 10분 배수 근처(±2분)에 오면 끌어당기는 자석 효과.
// 끌 때만 걸어서, 방향키로는 1분 단위 미세 조정이 그대로 되게 둔다.
const NAP_SNAP_STEP = 10;
const NAP_SNAP_PULL = 2;
let napDragging = false;

function snapNapMinutes(v) {
  const nearest = Math.round(v / NAP_SNAP_STEP) * NAP_SNAP_STEP;
  // 배수가 범위 밖이면(예: 1~4분의 0) 끌어당기지 않는다
  if (nearest < Number(napRange.min) || nearest > Number(napRange.max))
    return v;
  return Math.abs(v - nearest) <= NAP_SNAP_PULL ? nearest : v;
}

napRange.addEventListener("pointerdown", () => {
  napDragging = true;
});
// 슬라이더 밖에서 손을 떼도 풀리도록 window에 건다
window.addEventListener("pointerup", () => {
  napDragging = false;
});

// 끄는 동안엔 숫자만 따라 움직이고, 손을 뗄 때(change) 한 번만 저장한다.
napRange.addEventListener("input", () => {
  if (napDragging) {
    napRange.value = String(snapNapMinutes(Number(napRange.value)));
  }
  napValueEl.textContent = napRange.value;
});

napRange.addEventListener("change", () => {
  window.trayAPI.setSetting("napMinutes", Number(napRange.value));
});

// 초기화는 되돌릴 수 없으므로 인앱 확인창을 먼저 띄운다 (기본 macOS 알림창 대신)
function showResetConfirm() {
  confirmOverlay.classList.remove("hidden");
}
function hideResetConfirm() {
  confirmOverlay.classList.add("hidden");
}

resetBtn.addEventListener("click", showResetConfirm);

// 설정 하단 홈페이지 링크
document.getElementById("homepage-btn").addEventListener("click", () => {
  window.trayAPI.sendAction("homepage");
});
confirmCancel.addEventListener("click", hideResetConfirm);
confirmOk.addEventListener("click", async () => {
  hideResetConfirm();
  const done = await window.trayAPI.resetPet();
  if (done) refreshSettings(); // 기본값으로 되돌아간 상태를 다시 반영
  window.trayAPI.sendAction("close-popup"); // 초기화 확정 후 트레이 창을 닫는다
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
    permHint.textContent = t("settings.permAllowThenRestart");
    return;
  }
  permRequested = true;

  // 시스템 권한 팝업 유도 (이미 거부된 상태면 macOS가 다시 띄우지 않음)
  const after = await window.trayAPI.requestScreenPermission();
  setPermBox(after === "granted");
  if (after === "granted") return;
  permHint.textContent = t("settings.permRestartNote");
});
