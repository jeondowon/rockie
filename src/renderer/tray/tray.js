const backBar = document.getElementById("back-bar");
const screenTitle = document.getElementById("screen-title");

const screens = {
  menu: document.getElementById("menu-view"),
  pet: document.getElementById("pet-view"),
  system: document.getElementById("system-view"),
  settings: document.getElementById("settings-view"),
};

const SCREEN_TITLES = {
  pet: "나의 애완돌",
  system: "시스템 모니터",
  settings: "설정",
};

const STONE_NAMES = {
  granite: "화강암",
  basalt: "현무암",
  marble: "대리석",
  gneiss: "편마암",
};

// 설정 · 화면 기록 권한
const permRow = document.getElementById("perm-row");
const permBox = document.getElementById("perm-box");
const permHint = document.getElementById("perm-hint");
const DEFAULT_HINT = "활성 앱 감지(말풍선)에 필요합니다.";

// 메뉴 · "나의 애완돌" 항목 (배지 표시용)
const statusItem = document.querySelector('.mrow[data-action="status"]');

// 나의 애완돌 화면의 동적 요소
const heroImg = document.getElementById("hero-img");
const petStatusLabel = document.getElementById("pet-status-label");
const petPersonality = document.getElementById("pet-personality");
const petPersonalityTags = document.getElementById("pet-personality-tags");
const petProgressLabel = document.getElementById("pet-progress-label");
const petProgressFill = document.getElementById("pet-progress-fill");
const petCallout = document.getElementById("pet-callout");

function stoneGif(stoneType) {
  return `../../../assets/gif/${stoneType || "rockie"}_smile.gif`;
}

// 메뉴 화면에 딱 맞는 창 높이(px) 계산. 항목 수/높이가 바뀌어도 자동으로 맞춰진다.
function menuWindowHeight() {
  return (
    document.querySelector(".titlebar").offsetHeight +
    document.querySelector(".menu-head").offsetHeight +
    document.querySelector(".menu-list").offsetHeight +
    6 + // #popup 상하 테두리(3px×2)
    10 // 창 = #popup + 10px (하드 섀도우 여백)
  );
}

// ---------- 화면 전환 ----------
function showScreen(name) {
  for (const [key, node] of Object.entries(screens)) {
    node.classList.toggle("hidden", key !== name);
  }
  if (name === "menu") {
    backBar.classList.add("hidden");
  } else {
    backBar.classList.remove("hidden");
    screenTitle.textContent = SCREEN_TITLES[name] || "";
  }
  // 메뉴는 항목 높이에 맞춰 짧게, 하위 화면은 기존 높이(0 = full)로 창 리사이즈
  window.trayAPI.resizePopup(name === "menu" ? menuWindowHeight() : 0);
}

// ---------- 나의 애완돌 ----------
async function showPet() {
  showScreen("pet");
  // 여기선 진행 상태만 보여줄 뿐 질문에 답하는 게 아니므로 "읽음"으로 처리하지 않는다.
  // (배지는 캐릭터 옆 카드를 실제로 열었을 때만 해제된다)
  renderPet(await window.trayAPI.getEvolutionState());
}

function renderPet(state) {
  heroImg.src = stoneGif(state.stoneType);

  // 진행도
  const total = state.total || 0;
  const progress = state.progress || 0;
  petProgressLabel.textContent = `${progress} / ${total}`;
  petProgressFill.style.width = total ? `${Math.round((progress / total) * 100)}%` : "0%";

  // 돌 종류가 확정됐으면 결과 + 태그, 아니면 진행 중 안내
  if (state.stoneType) {
    petStatusLabel.textContent = `${STONE_NAMES[state.stoneType]} · 변성 진행형`;
    petPersonality.textContent = `${STONE_NAMES[state.stoneType]}(으)로 진화했어요!`;
    petPersonalityTags.classList.remove("hidden");
  } else {
    petStatusLabel.textContent = "조약돌 · 무던함";
    petPersonality.textContent = "아직 알아가는 중이에요";
    petPersonalityTags.classList.add("hidden");
  }

  // 안 읽은 질문이 있으면 콜아웃 노출
  petCallout.classList.toggle("hidden", !state.hasBadge);
}

// ---------- 설정 · 화면 기록 권한 ----------
function setPermBox(granted) {
  permBox.classList.toggle("on", granted);
  permBox.textContent = granted ? "[✓]" : "[  ]";
}

async function refreshPermToggle() {
  const status = await window.trayAPI.getScreenPermission();
  setPermBox(status === "granted");
}

async function showSettings() {
  showScreen("settings");
  permHint.textContent = DEFAULT_HINT;
  refreshPermToggle();
  refreshSettings();
}

// ---------- 설정 · 일반 토글 / 위치 / 크기 ----------
const settingToggles = document.querySelectorAll(".set-row[data-setting]");
const placeChips = document.querySelectorAll(".chip[data-place]");
const sizeChips = document.querySelectorAll(".chip[data-size]");
const resetBtn = document.getElementById("reset-btn");

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
    chip.classList.toggle("on", chip.dataset.place === s.petPlacement)
  );
  sizeChips.forEach((chip) =>
    chip.classList.toggle("on", chip.dataset.size === s.petSize)
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

resetBtn.addEventListener("click", async () => {
  const done = await window.trayAPI.resetPet();
  if (done) refreshSettings(); // 기본값으로 되돌아간 상태를 다시 반영
});

permRow.addEventListener("click", async () => {
  const status = await window.trayAPI.getScreenPermission();

  if (status === "granted") {
    // macOS는 권한을 코드로 해제할 수 없다
    permHint.textContent =
      "해제는 시스템 설정 > 개인정보 보호 및 보안 > 화면 기록에서만 가능합니다.";
    return;
  }

  // 시스템 권한 팝업 유도 (이미 거부된 상태면 macOS가 다시 띄우지 않음)
  const after = await window.trayAPI.requestScreenPermission();
  setPermBox(after === "granted");
  if (after !== "granted") {
    permHint.textContent =
      "권한 요청이 거부된 상태입니다. 시스템 설정 > 화면 기록에서 직접 허용해 주세요.";
  }
});

// ---------- 메뉴 항목 클릭 ----------
document.querySelectorAll(".mrow").forEach((item) => {
  item.addEventListener("click", () => {
    const action = item.dataset.action;
    switch (action) {
      case "status":
        showPet(); // 뷰만 전환 (메인에 보낼 동작 없음)
        break;
      case "system":
        showScreen("system"); // 스타일만, 동작은 추후 구현
        break;
      case "settings":
        window.trayAPI.sendAction(action);
        showSettings();
        break;
      case "toggle-pet":
      case "quit":
        window.trayAPI.sendAction(action);
        break;
    }
  });
});

backBar.addEventListener("click", () => showScreen("menu"));

// 안 읽은 질문이 있으면 "나의 애완돌" 항목에 배지를 표시
async function refreshBadge() {
  try {
    const state = await window.trayAPI.getEvolutionState();
    statusItem.classList.toggle("has-badge", !!state.hasBadge);
  } catch (_err) {
    // 상태를 못 읽으면 배지 없이 둔다
  }
}

// 팝업이 열릴 때마다 메뉴로 초기화하고 권한 상태·배지를 갱신
window.trayAPI.onWillShow(() => {
  showScreen("menu");
  refreshPermToggle();
  refreshBadge();
});
