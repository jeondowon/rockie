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

// 2단계 변성체 이름 (update.md 1)
const VARIANT_NAMES = {
  granite: "페그마타이트",
  basalt: "에클로자이트",
  marble: "루비 대리석",
  gneiss: "미그마타이트",
};

// 3단계 보석 이름 (돌 종류 × 외향/내향, update.md 1.1)
const GEM_NAMES = {
  granite: { extrovert: "토파즈", introvert: "아쿠아마린" },
  basalt: {
    extrovert: "다이아몬드 브릴리언트컷",
    introvert: "다이아몬드 원석",
  },
  marble: { extrovert: "파티사파이어", introvert: "루비" },
  gneiss: { extrovert: "라브라도라이트", introvert: "문스톤" },
};

// GIF 접두어 매핑 (pet.js와 동일 규칙)
const VARIANT_STONE = {
  granite: "pegmatite",
  basalt: "eclogite",
  marble: "corundumMarble",
  gneiss: "migmatite",
};
const GEM = {
  granite: { extrovert: "topaz", introvert: "aquamarine" },
  basalt: { extrovert: "diamond_cut", introvert: "diamond_rough" },
  marble: { extrovert: "partiSapphire", introvert: "ruby" },
  gneiss: { extrovert: "labradorite", introvert: "moonstone" },
};

// 진화 상태 → 표시할 hero GIF 경로 (smile 포즈)
function heroSprite(stage, stoneType, variant) {
  let level = "level0";
  let prefix = "rockie";
  if (stage >= 3 && stoneType && variant) {
    level = "level3";
    prefix = GEM[stoneType][variant];
  } else if (stage === 2 && stoneType && variant) {
    level = "level2";
    prefix = `${VARIANT_STONE[stoneType]}_${variant === "extrovert" ? "e" : "i"}`;
  } else if (stage >= 1 && stoneType) {
    level = "level1";
    prefix = stoneType;
  }
  return `../../../assets/gif/${level}/${prefix}_smile.gif`;
}

// 단계별 상태 라벨
function statusLabel(stage, stoneType, variant) {
  if (stage >= 3 && stoneType && variant) {
    return `${GEM_NAMES[stoneType][variant]} · 보석`;
  }
  if (stage === 2 && stoneType && variant) {
    return `${VARIANT_NAMES[stoneType]} · 변성체`;
  }
  if (stage >= 1 && stoneType) return `${STONE_NAMES[stoneType]} · 원석`;
  return "조약돌 · 무던함";
}

// 단계별 진화 안내 문구
function evoHint(stage) {
  if (stage >= 3) return "🜨 마지막 단계예요. 반짝이는 보석이 됐어요.";
  if (stage === 2) return "🜨 호감도가 90에 닿으면 보석으로 피어나요.";
  if (stage === 1) return "🜨 이제 E/I 질문에 답하면 변성체로 나아가요.";
  return "🜨 질문에 답할수록 어떤 돌이 될지 뚜렷해져요.";
}

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
const calloutTitle = document.getElementById("callout-title");
const calloutSub = document.getElementById("callout-sub");
const petEvoHint = document.getElementById("pet-evo-hint");
const petHistory = document.getElementById("pet-history");
const petNameTitle = document.getElementById("pet-name");
const userNameInput = document.getElementById("user-name-input");
const petNameInput = document.getElementById("pet-name-input");
const userNameValue = document.getElementById("user-name-value");
const petNameValue = document.getElementById("pet-name-value");
const nameEditBtn = document.getElementById("name-edit-btn");
const affValue = document.getElementById("aff-value");
const affFill = document.getElementById("aff-fill");
const affHearts = document.getElementById("aff-hearts");
const affLevel = document.getElementById("aff-level");
const affPips = document.getElementById("aff-pips");
const cleanBtn = document.getElementById("clean-btn");
const feedBtn = document.getElementById("feed-btn");
let editingName = false;

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
  // 배지는 오늘 답할 질문이 남아 있는 동안 유지되고, 실제로 답해야 사라진다(단순 열람은 영향 없음).
  renderPet(await window.trayAPI.getEvolutionState());
}

function renderPet(state) {
  heroImg.src = heroSprite(state.stage, state.stoneType, state.variant);

  // 이름 (표시/입력/타이틀바) — 화면을 다시 그릴 땐 편집 모드를 닫는다
  applyNames(state.userName, state.petName);
  exitNameEdit();

  // 진행도
  const total = state.total || 0;
  const progress = state.progress || 0;
  petProgressLabel.textContent = `${progress} / ${total}`;
  petProgressFill.style.width = total
    ? `${Math.round((progress / total) * 100)}%`
    : "0%";

  // 상태 라벨 + 성향 요약. 돌 종류가 확정된(1단계 이상) 뒤엔 성향 요약 + 태그.
  petStatusLabel.textContent = statusLabel(
    state.stage,
    state.stoneType,
    state.variant,
  );
  petEvoHint.textContent = evoHint(state.stage);
  if (state.stoneType) {
    petPersonality.textContent =
      state.blurb || `${STONE_NAMES[state.stoneType]}(으)로 진화했어요!`;
    renderTags(state.tags || []);
    petPersonalityTags.classList.remove("hidden");
  } else {
    petPersonality.textContent = `아직 알아가는 중이에요 (${progress}/${total})`;
    petPersonalityTags.classList.add("hidden");
  }

  renderAffinity(state.affinityPoints);
  renderCareButtons(state.dailyCleanDone, state.dailyFeedDone);

  renderHistory(state.history || []);

  // "새로운 질문에 답하기" 버튼 상태 (update.md 9.1)
  renderAnswerButton(state.answerButton);
}

// 답변 버튼 활성/비활성 + 안내 문구를 반영한다.
function renderAnswerButton(ab) {
  petCallout.disabled = !ab.enabled;
  if (ab.enabled) {
    calloutTitle.textContent = "새로운 질문에 답하기";
    calloutSub.textContent = "애완돌 옆에서 답해 주세요 ▶";
  } else {
    calloutTitle.textContent = "질문 완료";
    calloutSub.textContent = ab.note || "";
  }
}

// 성향 태그 칩을 다시 그린다.
function renderTags(tags) {
  petPersonalityTags.replaceChildren(
    ...tags.map((t) => {
      const el = document.createElement("span");
      el.className = "tag";
      el.textContent = t;
      return el;
    }),
  );
}

// ISO 시각 → "MM.DD"
function formatWhen(iso) {
  const d = new Date(iso);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${mm}.${dd}`;
}

// 답변 히스토리를 실제 기록으로 그린다 (없으면 안내 문구).
function renderHistory(list) {
  if (!list.length) {
    const empty = document.createElement("div");
    empty.className = "history-empty";
    empty.textContent = "아직 답한 질문이 없어요.";
    petHistory.replaceChildren(empty);
    return;
  }
  petHistory.replaceChildren(
    ...list.map((h) => {
      const item = document.createElement("div");
      item.className = "history-item";

      const head = document.createElement("div");
      head.className = "history-head";
      const q = document.createElement("span");
      q.className = "history-q";
      q.textContent = `Q. ${h.text}`;
      const when = document.createElement("span");
      when.className = "history-when";
      when.textContent = formatWhen(h.answeredAt);
      head.append(q, when);

      const a = document.createElement("div");
      a.className = "history-a";
      a.textContent = `→ ${h.label}`;

      item.append(head, a);
      return item;
    }),
  );
}

// 이름 값을 표시 스팬·입력창·타이틀바에 반영 (미지정 시 기본값 노출)
function applyNames(userName, petName) {
  userNameValue.textContent = userName || "—";
  petNameValue.textContent = petName || "애완돌";
  userNameInput.value = userName || "";
  petNameInput.value = petName || "";
  petNameTitle.textContent = petName || "애완돌";
}

// 편집 모드 진입: 값 숨기고 입력창 노출, 버튼을 "저장"으로
function enterNameEdit() {
  editingName = true;
  userNameValue.classList.add("hidden");
  petNameValue.classList.add("hidden");
  userNameInput.classList.remove("hidden");
  petNameInput.classList.remove("hidden");
  nameEditBtn.textContent = "저장";
  userNameInput.focus();
}

// 표시 모드로 복귀
function exitNameEdit() {
  editingName = false;
  userNameValue.classList.remove("hidden");
  petNameValue.classList.remove("hidden");
  userNameInput.classList.add("hidden");
  petNameInput.classList.add("hidden");
  nameEditBtn.textContent = "✎ 이름 수정";
}

// 호감도 5단계 구간(균등 20점). 점수 → 레벨(1~5)·명칭. 표시 전용이며,
// 2→3 진화 판정은 이와 무관하게 raw 90점을 쓴다(evolution.js).
const AFFINITY_LEVELS = [
  { min: 0, name: "낯가림" },
  { min: 20, name: "서먹" },
  { min: 40, name: "친근" },
  { min: 60, name: "살가움" },
  { min: 80, name: "각별" },
];
function affinityLevel(points) {
  let idx = 0;
  for (let i = 0; i < AFFINITY_LEVELS.length; i++) {
    if (points >= AFFINITY_LEVELS[i].min) idx = i;
  }
  return { index: idx + 1, name: AFFINITY_LEVELS[idx].name };
}

// 호감도 게이지·수치·하트·레벨명·타이틀바 pip을 실제 포인트(0~100)로 반영
function renderAffinity(points) {
  const p = Math.max(0, Math.min(100, points || 0));
  affValue.textContent = String(p);
  affFill.style.width = `${p}%`;
  const filled = Math.round(p / 20); // 하트 5칸 = 100점
  affHearts
    .querySelectorAll(".heart")
    .forEach((h, i) => h.classList.toggle("on", i < filled));
  const { index, name } = affinityLevel(p);
  affLevel.textContent = name;
  affPips
    .querySelectorAll(".pip")
    .forEach((el, i) => el.classList.toggle("on", i < index)); // pip = 레벨(1~5)
}

// 닦아주기/밥 주기 버튼 상태 (update.md 9.4). 오늘 완료했으면 비활성 + 완료 문구.
function renderCareButtons(cleanDone, feedDone) {
  cleanBtn.disabled = !!cleanDone;
  cleanBtn.textContent = cleanDone ? "깨끗해졌어요!" : "닦아주기";
  feedBtn.disabled = !!feedDone;
  feedBtn.textContent = feedDone ? "맛있었어요!" : "밥 주기";
}

// "이름 수정" ↔ "저장" 토글. 저장 시에만 store에 반영한다.
nameEditBtn.addEventListener("click", async () => {
  if (!editingName) {
    enterNameEdit();
    return;
  }
  await window.trayAPI.setName("user", userNameInput.value);
  const result = await window.trayAPI.setName("pet", petNameInput.value);
  applyNames(result.userName, result.petName);
  renderAffinity(result.affinityPoints); // 최초 지정 보상이 게이지에 바로 반영
  exitNameEdit();
});

// "질문에 답하기" → 펫 창의 질문 카드를 연다 (팝업은 메인에서 닫음)
petCallout.addEventListener("click", () => {
  window.trayAPI.sendAction("answer-question");
});

// 닦아주기/밥 주기 → 호감도 +2 (하루 1회). 게이지·버튼을 즉시 갱신한다.
// 90 도달로 진화하면 펫 창이 축하 연출을 띄운다(메인의 notifyEvolved).
cleanBtn.addEventListener("click", async () => {
  const { state } = await window.trayAPI.cleanPet();
  renderAffinity(state.affinityPoints);
  renderCareButtons(state.dailyCleanDone, state.dailyFeedDone);
});
feedBtn.addEventListener("click", async () => {
  const { state } = await window.trayAPI.feedPet();
  renderAffinity(state.affinityPoints);
  renderCareButtons(state.dailyCleanDone, state.dailyFeedDone);
});

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

// 초기화는 되돌릴 수 없으므로 인앱 확인창을 먼저 띄운다 (기본 macOS 알림창 대신)
function showResetConfirm() {
  confirmOverlay.classList.remove("hidden");
}
function hideResetConfirm() {
  confirmOverlay.classList.add("hidden");
}

resetBtn.addEventListener("click", showResetConfirm);
confirmCancel.addEventListener("click", hideResetConfirm);
confirmOk.addEventListener("click", async () => {
  hideResetConfirm();
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

// 오늘 답할 질문이 남아 있으면 "나의 애완돌" 항목에 배지를 표시 (update.md 9.2)
async function refreshBadge() {
  try {
    const state = await window.trayAPI.getEvolutionState();
    statusItem.classList.toggle("has-badge", !!state.hasBadge);
    petNameTitle.textContent = state.petName || "애완돌"; // 메뉴 화면 타이틀바에도 반영
    renderAffinity(state.affinityPoints); // 타이틀바 호감도 pip(레벨)은 항상 보이므로 여기서도 갱신
  } catch (_err) {
    // 상태를 못 읽으면 배지 없이 둔다
  }
}

// 팝업이 열릴 때마다 메뉴로 초기화하고 권한 상태·배지를 갱신
window.trayAPI.onWillShow(() => {
  hideResetConfirm(); // 이전에 열려 있던 확인창이 남지 않도록
  showScreen("menu");
  refreshPermToggle();
  refreshBadge();
});
