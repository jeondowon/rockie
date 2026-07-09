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

const VARIANT_NAMES = {
  granite: {
    introvert: "페그마타이트 (아쿠아마린 결정핵)",
    extrovert: "페그마타이트 (토파즈 결정군)",
  },
  basalt: {
    introvert: "에클로자이트 (심부 결정핵)",
    extrovert: "에클로자이트 (압력 결정맥)",
  },
  marble: {
    introvert: "코런덤 대리석 (루비핵)",
    extrovert: "코런덤 대리석 (색대 코런덤맥)",
  },
  gneiss: {
    introvert: "미그마타이트 (정렬된 장석맥)",
    extrovert: "미그마타이트 (소용돌이 장석맥)",
  },
};

// 3단계 보석 이름 (돌 종류 × 외향/내향, update.md 1.1)
const GEM_NAMES = {
  granite: { extrovert: "토파즈", introvert: "아쿠아마린" },
  basalt: {
    extrovert: "브릴리언트 컷 다이아몬드",
    introvert: "원석 다이아몬드",
  },
  marble: { extrovert: "파티 사파이어", introvert: "루비" },
  gneiss: { extrovert: "라브라도라이트", introvert: "문스톤" },
};

function lines(...parts) {
  return parts.join("\n");
}

const TRAIT_DESCRIPTIONS = {
  rockie: lines(
    "조약돌은 모든 Rockie 돌들의 기본 형태랍니다.",
    "잼재력을 발견하고 새로운 형태를 찾아보세요!",
  ),
  granite: {
    stage1: lines(
      "화강암은 오랜 시간에 걸쳐 천천히 다져진",
      "단단함을 가진 돌이에요. 흔들리지 않는 원칙과",
      "꾸준함을 지닌 성향과 잘 어울려요.",
    ),
    introvert: {
      stage2: lines(
        "아쿠아마린 결정핵은 조용히 안쪽에서 자라는 느낌이 강해요.",
        "자기만의 속도로 에너지를 쌓아가는 성향과 잘 어울려요.",
      ),
      stage3: lines(
        "아쿠아마린 보석은 맑고 차분한 인상이 중심이에요.",
        "과하게 드러내기보다, 깊고 안정적인 아름다움을 가진 최종 형태예요.",
      ),
    },
    extrovert: {
      stage2: lines(
        "토파즈 결정군은 여러 결정이 밖으로 드러나는 형태예요.",
        "밝고 적극적으로 표현하는 성향과 잘 맞아요.",
      ),
      stage3: lines(
        "토파즈 보석은 선명한 색과 뾰족한 실루엣이 눈에 들어와요.",
        "존재감이 또렷하고, 시선을 끄는 최종 형태예요.",
      ),
    },
  },
  basalt: {
    stage1: lines(
      "현무암은 표면에 활발한 흔적이 그대로 남아있는 돌이에요.",
      "순간의 감각을 놓치지 않고 곧바로 움직이는 성향과 잘 맞아요.",
    ),
    introvert: {
      stage2: lines(
        "심부 결정핵은 겉으로는 조용하지만, 안쪽에 단단한 가능성을",
        "품고 있어요. 깊이 생각하고 천천히 완성해가는",
        "성향과 잘 어울려요.",
      ),
      stage3: lines(
        "원석 다이아몬드는 깎이기 전의 순수한 결정성이 느껴져요.",
        "화려하게 꾸미기보다, 본질적인 단단함이 드러나는 최종 형태예요.",
      ),
    },
    extrovert: {
      stage2: lines(
        "압력 결정맥은 에너지가 한곳에 머물지 않고",
        "여러 방향으로 뻗어나가는 형태예요.",
        "주변과 활발히 연결되는 성향과 잘 맞아요.",
      ),
      stage3: lines(
        "브릴리언트 컷 다이아몬드는 빛을 여러 면으로 반사해요.",
        "밝고 선명하게 자신을 표현하는 최종 형태랍니다.",
      ),
    },
  },
  marble: {
    stage1: lines(
      "대리석은 부드럽고 매끄러운 결을 가진 돌이에요.",
      "주변의 감정을 섬세하게 받아들이고 자기 안에 담아두는 성향과 잘 어울려요.",
    ),
    introvert: {
      stage2: lines(
        "루비핵은 넓게 퍼지기보다 한 점에 깊게 응축된 형태예요.",
        "감정을 크게 드러내지 않지만, 안쪽에 선명한 중심을 가진 성향과 잘 어울려요.",
      ),
      stage3: lines(
        "루비는 붉은 에너지가 몸 전체로 완성된 형태예요.",
        "조용하지만 강한 존재감을 가진 최종 진화체예요.",
      ),
    },
    extrovert: {
      stage2: lines(
        "색대 코런덤맥은 파랑, 초록, 노랑의 색이",
        "암석 안에서 함께 드러나는 단계예요.",
        "다양한 표현을 자연스럽게 보여주는 성향과 잘 맞아요.",
      ),
      stage3: lines(
        "파티 사파이어는 여러 색이 한 몸 안에서 선명하게 어우러져요.",
        "다채롭고 생동감 있는 최종 진화체예요.",
      ),
    },
  },
  gneiss: {
    stage1: lines(
      "편마암은 여러 층의 무늬가 뚜렷하게 정리된 돌이에요.",
      "복잡한 정보를 자기만의 구조로 재배열해 이해하는",
      "성향과 잘 맞아요.",
    ),
    introvert: {
      stage2: lines(
        "정렬된 장석맥은 흐름이 차분하고 질서 있게 정리된 형태예요.",
        "자기만의 리듬을 지키며 안정적으로 움직이는 성향과 잘 어울려요.",
      ),
      stage3: lines(
        "문스톤은 강하게 빛나기보다 은은하게 빛을 품어요.",
        "조용하지만 오래 바라볼수록 매력이 드러나는 최종 형태예요.",
      ),
    },
    extrovert: {
      stage2: lines(
        "소용돌이 장석맥은 무늬가 한 방향에 머물지 않고",
        "움직이는 느낌을 줘요.",
        "변화와 표현이 풍부한 성향과 잘 맞아요.",
      ),
      stage3: lines(
        "라브라도라이트는 각도에 따라 다색 광채가 강하게 드러나요.",
        "활발하고 입체적인 매력을 보여주는 최종 진화체예요.",
      ),
    },
  },
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

// 진화 상태 → 표시할 hero GIF 경로 (하단 펫 상태를 아직 받지 못했을 때의 기본값)
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

function displaySpriteUrl(sprite) {
  if (!sprite || !sprite.level || !sprite.prefix || !sprite.pose) return null;
  return `../../../assets/gif/${sprite.level}/${sprite.prefix}_${sprite.pose}.gif`;
}

// 단계별 상태 라벨
function statusLabel(stage, stoneType, variant) {
  if (stage >= 3 && stoneType && variant) {
    return GEM_NAMES[stoneType][variant];
  }
  if (stage === 2 && stoneType && variant) {
    return VARIANT_NAMES[stoneType][variant];
  }
  if (stage >= 1 && stoneType) return STONE_NAMES[stoneType];
  return "조약돌";
}

function traitDescription(stage, stoneType, variant) {
  if (!stoneType) return TRAIT_DESCRIPTIONS.rockie;
  const desc = TRAIT_DESCRIPTIONS[stoneType];
  if (stage >= 3 && variant) return desc[variant].stage3;
  if (stage === 2 && variant) return desc[variant].stage2;
  return desc.stage1;
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
const heroMood = document.getElementById("hero-mood");
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
let currentPetDisplaySprite = null;

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
  // 시스템 모니터는 화면이 보이는 동안만 폴링한다.
  if (name === "system") startSystemMonitor();
  else stopSystemMonitor();
}

// ---------- 나의 애완돌 ----------
async function showPet() {
  showScreen("pet");
  // 배지는 오늘 답할 질문이 남아 있는 동안 유지되고, 실제로 답해야 사라진다(단순 열람은 영향 없음).
  renderPet(await window.trayAPI.getEvolutionState());
  refreshPetDisplaySprite();
}

function renderPet(state) {
  heroImg.src =
    displaySpriteUrl(currentPetDisplaySprite) ||
    heroSprite(state.stage, state.stoneType, state.variant);

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
  heroMood.textContent = traitDescription(
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

async function refreshPetDisplaySprite() {
  try {
    currentPetDisplaySprite = await window.trayAPI.getPetDisplaySprite();
    applyPetDisplaySprite();
  } catch (_err) {
    // 상태를 못 읽으면 renderPet의 기본 smile 포즈를 유지한다
  }
}

function applyPetDisplaySprite() {
  if (screens.pet.classList.contains("hidden")) return;
  const src = displaySpriteUrl(currentPetDisplaySprite);
  if (src) heroImg.src = src;
}

window.trayAPI.onPetDisplaySprite((sprite) => {
  currentPetDisplaySprite = sprite;
  applyPetDisplaySprite();
});

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
        showScreen("system"); // 폴링은 showScreen 훅에서 시작된다
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

// 팝업이 닫히면 시스템 모니터 폴링을 멈춘다 (숨은 창에서 계속 도는 것 방지)
window.trayAPI.onWillHide(() => stopSystemMonitor());

// ---------- 시스템 모니터 (SYSTEM 화면) ----------
const SYS_POLL_MS = 2000;
let sysTimer = null;

function startSystemMonitor() {
  if (sysTimer) return;
  tickSystem(); // 즉시 1회 갱신 후 주기 폴링
  sysTimer = setInterval(tickSystem, SYS_POLL_MS);
}

function stopSystemMonitor() {
  if (!sysTimer) return;
  clearInterval(sysTimer);
  sysTimer = null;
}

async function tickSystem() {
  const stats = await window.trayAPI.getSystemStats();
  if (stats) renderSystem(stats); // 조회 실패(null)면 이전 값 유지
}

const byId = (id) => document.getElementById(id);

function setText(id, text) {
  byId(id).textContent = text;
}

function setFill(id, pct) {
  byId(id).style.width = `${Math.max(0, Math.min(100, pct))}%`;
}

// 사용률 색상: 여유(초록) < 60 · 주의(노랑) < 85 · 높음(빨강)
function loadClass(pct) {
  return pct < 60 ? "green" : pct < 85 ? "gold" : "rust";
}

// 배터리는 반대로 잔량이 낮을수록 경고
function batteryClass(pct, charging) {
  if (charging) return "green";
  return pct > 40 ? "green" : pct > 15 ? "gold" : "rust";
}

// 글리프·값·게이지에 색상 클래스를 한 번에 적용
function paint(metric, cls) {
  byId(`sc-${metric}-glyph`).className = `sys-glyph ${cls}`;
  byId(`sc-${metric}-val`).className = `sys-val ${cls}`;
  byId(`sc-${metric}-fill`).className = `gauge-fill ${cls}`;
}

const gb = (n) => `${n.toFixed(1)} GB`;

// 초당 바이트 → 사람이 읽는 속도
function rate(bytesPerSec) {
  if (bytesPerSec >= 1024 * 1024)
    return `${(bytesPerSec / (1024 * 1024)).toFixed(1)} MB/s`;
  return `${(bytesPerSec / 1024).toFixed(1)} KB/s`;
}

function renderSystem(s) {
  // CPU
  setText("sc-cpu-val", `${Math.round(s.cpu.load)}%`);
  setFill("sc-cpu-fill", s.cpu.load);
  paint("cpu", loadClass(s.cpu.load));
  setText("sc-cpu-system", `${s.cpu.system.toFixed(1)}%`);
  setText("sc-cpu-user", `${s.cpu.user.toFixed(1)}%`);
  setText("sc-cpu-idle", `${s.cpu.idle.toFixed(1)}%`);

  // RAM
  setText("sc-ram-val", `${s.ram.pct}%`);
  setFill("sc-ram-fill", s.ram.pct);
  paint("ram", loadClass(s.ram.pct));
  setText("sc-ram-active", gb(s.ram.activeGB));
  setText("sc-ram-available", gb(s.ram.availableGB));
  setText("sc-ram-total", gb(s.ram.totalGB));
  setText("sc-ram-swap", gb(s.ram.swapGB));

  // 저장
  setText("sc-disk-val", `${s.disk.pct}%`);
  setFill("sc-disk-fill", s.disk.pct);
  paint("disk", loadClass(s.disk.pct));
  setText("sc-disk-used", gb(s.disk.usedGB));
  setText("sc-disk-free", gb(s.disk.freeGB));
  setText("sc-disk-total", gb(s.disk.totalGB));

  // 배터리
  if (s.battery.has) {
    const b = s.battery;
    const state = b.charging ? "충전 중" : b.ac ? "전원 연결" : "충전 안 함";
    setText("sc-bat-val", `${b.pct}%`);
    setFill("sc-bat-fill", b.pct);
    paint("bat", batteryClass(b.pct, b.charging));
    setText("sc-bat-sub", state);
    setText("sc-bat-power", state);
    setText("sc-bat-health", b.healthPct != null ? `${b.healthPct}%` : "—");
    setText("sc-bat-cycles", b.cycles != null ? `${b.cycles}회` : "—");
  } else {
    setText("sc-bat-val", "—");
    setFill("sc-bat-fill", 0);
    paint("bat", "green");
    setText("sc-bat-sub", "배터리 없음");
    setText("sc-bat-power", "—");
    setText("sc-bat-health", "—");
    setText("sc-bat-cycles", "—");
  }

  // 네트워크 (자연한 최대치가 없어 총 처리량을 100Mbps=꽉 참으로 근사)
  const mbps = ((s.network.rxSec + s.network.txSec) * 8) / 1e6;
  setText("sc-net-val", rate(s.network.rxSec + s.network.txSec));
  setFill("sc-net-fill", mbps);
  paint("net", loadClass(mbps));
  setText("sc-net-sub", s.network.label);
  setText("sc-net-ip", s.network.ip);
  setText("sc-net-up", `↑ ${rate(s.network.txSec)}`);
  setText("sc-net-down", `↓ ${rate(s.network.rxSec)}`);

  // 반응 카드: CPU 부하로 애완돌 기분 분기
  renderMood(s.cpu.load);
}

function renderMood(load) {
  let mood, desc;
  if (load < 25) {
    mood = "새근새근 · 여유";
    desc = "한가로워요. 돌이 느긋하게 쉬고 있어요.";
  } else if (load < 70) {
    mood = "꿈틀꿈틀 · 활동적";
    desc = "적당한 부하. 돌이 살짝 몸을 뒤척여요.";
  } else {
    mood = "부릉부릉 · 바쁨";
    desc = "부하가 높아요! 돌이 바쁘게 움직여요.";
  }
  setText("sys-mood", mood);
  setText("sys-mood-desc", desc);
}

// 항목 박스 클릭 → 세부 정보 드롭다운 토글
document.querySelectorAll(".sys-row").forEach((row) => {
  row.addEventListener("click", () => {
    const head = row.querySelector(".sys-row-head");
    const metric = head.dataset.metric;
    const open = byId(`sc-${metric}-detail`).classList.toggle("open");
    head.setAttribute("aria-expanded", open ? "true" : "false");
  });
});
