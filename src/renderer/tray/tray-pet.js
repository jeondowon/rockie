// 트레이 팝업 · "나의 애완돌" 화면 (#pet-view)
// 히어로 이미지·형태 설명·진행도·호감도·돌보기·스킨·답변 히스토리·이름 편집.
// STONE_NAMES/resolveSprite/spriteGifUrl은 공용 ../shared/sprites.js,
// VARIANT_NAMES/GEM_NAMES/TRAIT_DESCRIPTIONS 등 문구는 tray-data.js에서 로드된다.
// 화면 전환(showScreen)은 tray.js에 있다.

// 진화 상태 → 표시할 hero GIF 경로 (하단 펫 상태를 아직 받지 못했을 때의 기본값)
function heroSprite(stage, stoneType, variant) {
  const { level, prefix } = resolveSprite(stage, stoneType, variant);
  return spriteGifUrl(level, prefix, "smile");
}

function displaySpriteUrl(sprite) {
  if (!sprite || !sprite.level || !sprite.prefix || !sprite.pose) return null;
  return spriteGifUrl(sprite.level, sprite.prefix, sprite.pose);
}

// 지금 보여줄 형태의 단계. 스킨을 착용 중이면 그 단계, 아니면 실제 단계.
function wornStage(state) {
  return state.activeSkinStage != null ? state.activeSkinStage : state.stage;
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
  if (!stoneType) return TRAIT_DESCRIPTIONS.rockie; // 실제 0단계: 발견 안내
  if (stage < 1) return ROCKIE_SKIN_TRAIT; // 진화 후 조약돌 스킨 착용: 정체성 톤
  const desc = TRAIT_DESCRIPTIONS[stoneType];
  if (stage >= 3 && variant) return desc[variant].stage3;
  if (stage === 2 && variant) return desc[variant].stage2;
  return desc.stage1;
}

function evolveRationale(stage, stoneType, variant) {
  if (!stoneType) return TRAIT_DESCRIPTIONS.rockie; // 실제 0단계: 발견 안내
  if (stage < 1) return ROCKIE_SKIN_BLURB; // 진화 후 조약돌 스킨 착용: 회상 톤
  const r = EVOLVE_RATIONALE[stoneType];
  if (stage >= 3 && variant) return r[variant].stage3;
  if (stage === 2 && variant) return r[variant].stage2;
  return r.stage1;
}

// 단계별 진화 안내 문구
function evoHint(stage) {
  if (stage >= 3) return "🜨 마지막 단계예요. 반짝이는 보석이 됐어요.";
  if (stage === 2) return "🜨 호감도가 90에 닿으면 보석으로 피어나요.";
  if (stage === 1) return "🜨 이제 E/I 질문에 답하면 변성체로 나아가요.";
  return "🜨 질문에 답할수록 어떤 돌이 될지 뚜렷해져요.";
}

// 나의 애완돌 화면의 동적 요소
const heroImg = document.getElementById("hero-img");
const heroMood = document.getElementById("hero-mood");
const sysPet = document.querySelector(".sys-pet");
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
const nameActions = nameEditBtn.parentElement;
const nameCancelBtn = document.getElementById("name-cancel-btn");
const nameRewardNote = document.getElementById("name-reward-note");
const affValue = document.getElementById("aff-value");
const affFill = document.getElementById("aff-fill");
const affLevel = document.getElementById("aff-level");
const cleanBtn = document.getElementById("clean-btn");
const petBtn = document.getElementById("pet-btn");
let editingName = false;
let currentUserName = "";
let currentPetName = "";
let currentPetDisplaySprite = null;

async function showPet() {
  showScreen("pet");
  // 배지는 오늘 답할 질문이 남아 있는 동안 유지되고, 실제로 답해야 사라진다(단순 열람은 영향 없음).
  renderPet(await window.trayAPI.getEvolutionState());
  refreshPetDisplaySprite();
}

// 히어로 아래 형태 설명(상태 라벨·진화 근거·성향 설명)은 표시 단계 = 스킨 착용 시 그 단계
// (activeSkinStage), 없으면 실제 단계를 따른다. 진행도 힌트·성향 태그는 실제 상태 기준.
// 스킨 변경 시에도 재호출해 히어로 이미지와 설명의 단계를 일치시킨다.
function renderHeroText(state) {
  const displayStage = wornStage(state);
  petStatusLabel.textContent = statusLabel(
    displayStage,
    state.stoneType,
    state.variant,
  );
  heroMood.textContent = evolveRationale(
    displayStage,
    state.stoneType,
    state.variant,
  );
  petEvoHint.textContent = evoHint(state.stage);
  if (state.stoneType) {
    petPersonality.textContent = traitDescription(
      displayStage,
      state.stoneType,
      state.variant,
    );
    renderTags(state.tags || []);
    petPersonalityTags.classList.remove("hidden");
  } else {
    petPersonality.textContent = `아직 알아가는 중이에요 (${state.progress || 0}/${state.total || 0})`;
    petPersonalityTags.classList.add("hidden");
  }
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

  // 상태 라벨·진화 근거·성향 설명은 "지금 보이는 형태" 기준(스킨 착용 시 그 단계),
  // 진행도 힌트·성향 태그는 실제 상태 기준. renderHeroText가 이 구분을 담당한다.
  renderHeroText(state);

  renderAffinity(state.affinityPoints);
  renderCareButtons(state.dailyCleanDone, state.dailyPetDone);

  renderHistory(state.history || []);

  renderSkins(state);

  // "새로운 질문에 답하기" 버튼 상태
  renderAnswerButton(state.answerButton);
}

// 스킨 그리드: 내 계열(조약돌→돌→변성체→보석) 4칸을 현재 단계 기준으로 렌더.
// state.stage >= 칸 단계면 해금(이미지·이름 표시), 아니면 불투명 커버로 가린다.
let lastPetState = null;

function renderSkins(state) {
  lastPetState = state;
  // 착용 중인 스킨이 있으면 그 단계가 "착용중", 없으면 현재 실제 단계가 "착용중"
  const worn = wornStage(state);
  document.querySelectorAll(".skin-cell").forEach((cell) => {
    const s = Number(cell.dataset.stage);
    const unlocked = state.stage >= s;
    const isCurrent = worn === s;
    const box = cell.querySelector(".skin-box");
    const img = cell.querySelector(".skin-img");
    const nameEl = cell.querySelector(".skin-name");
    const badge = cell.querySelector(".skin-current");

    box.classList.toggle("locked", !unlocked);
    box.classList.toggle("current", isCurrent);
    badge.classList.toggle("hidden", !isCurrent);

    if (unlocked) {
      img.src = heroSprite(s, state.stoneType, state.variant);
      // 스킨 칸은 이름만 짧게: 2단계 변성체의 "(…)" 부연 설명은 떼어낸다
      nameEl.textContent = statusLabel(
        s,
        state.stoneType,
        state.variant,
      ).replace(/\s*\(.*\)$/, "");
    } else {
      img.removeAttribute("src");
      nameEl.textContent = "???";
    }
  });
}

// 스킨 칸 클릭 → 착용. 해금된(현재 단계 이하) 칸만 반응한다.
// 이미 착용 중인 칸을 다시 누르면 무반응. 실제 단계 칸을 누르면 원래 모습으로 복귀.
document.querySelector(".skin-grid").addEventListener("click", async (e) => {
  const cell = e.target.closest(".skin-cell");
  if (!cell || !lastPetState) return;
  const s = Number(cell.dataset.stage);
  if (lastPetState.stage < s) return; // 잠긴 스킨
  if (wornStage(lastPetState) === s) return; // 이미 착용 중이면 무반응
  const state = await window.trayAPI.setActiveSkin(s);
  renderSkins(state); // 배지 즉시 갱신 (히어로 이미지는 펫 브로드캐스트로 반영)
  renderHeroText(state); // 형태 설명(라벨·근거·성향)을 착용 단계에 맞춰 갱신
});

async function refreshPetDisplaySprite() {
  try {
    currentPetDisplaySprite = await window.trayAPI.getPetDisplaySprite();
    applyPetDisplaySprite();
  } catch (_err) {
    // 상태를 못 읽으면 renderPet의 기본 smile 포즈를 유지한다
  }
}

function applyPetDisplaySprite() {
  const src = displaySpriteUrl(currentPetDisplaySprite);
  if (!src) return;
  if (!screens.pet.classList.contains("hidden")) heroImg.src = src;
  sysPet.src = src;
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
  currentUserName = userName || "";
  currentPetName = petName || "";
  userNameValue.textContent = userName || "—";
  petNameValue.textContent = petName || "애완돌";
  userNameInput.value = userName || "";
  petNameInput.value = petName || "";
  petNameTitle.textContent = petName || "애완돌";
  nameRewardNote.classList.toggle("hidden", !!userName && !!petName);
}

// 편집 모드 진입: 값 숨기고 입력창 노출, 버튼을 "저장"으로
function enterNameEdit() {
  editingName = true;
  userNameValue.classList.add("hidden");
  petNameValue.classList.add("hidden");
  userNameInput.classList.remove("hidden");
  petNameInput.classList.remove("hidden");
  nameEditBtn.textContent = "저장";
  nameActions.classList.add("editing");
  nameEditBtn.classList.add("name-save-btn");
  nameCancelBtn.classList.add("name-cancel-btn");
  nameCancelBtn.classList.remove("hidden");
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
  nameActions.classList.remove("editing");
  nameEditBtn.classList.remove("name-save-btn");
  nameCancelBtn.classList.remove("name-cancel-btn");
  nameCancelBtn.classList.add("hidden");
}

function cancelNameEdit() {
  userNameInput.value = currentUserName;
  petNameInput.value = currentPetName;
  exitNameEdit();
}

// 점수가 속한 가장 높은 구간의 명칭 (AFFINITY_LEVELS는 min 오름차순)
function affinityLevelName(points) {
  return AFFINITY_LEVELS.findLast((lv) => points >= lv.min).name;
}

// 호감도 게이지·수치·레벨명을 실제 포인트(0~100)로 반영
function renderAffinity(points) {
  const p = Math.max(0, Math.min(100, points || 0));
  affValue.textContent = String(p);
  affFill.style.width = `${p}%`;
  affLevel.textContent = affinityLevelName(p);
}

// 닦아주기/쓰다듬기 버튼 상태. 오늘 완료했으면 비활성 + 완료 문구.
function renderCareButtons(cleanDone, petDone) {
  cleanBtn.disabled = !!cleanDone;
  cleanBtn.textContent = cleanDone ? "깨끗해졌어요!" : "닦아주기";
  petBtn.disabled = !!petDone;
  petBtn.textContent = petDone ? "행복해요!" : "쓰다듬기";
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

nameCancelBtn.addEventListener("click", cancelNameEdit);

// "질문에 답하기" → 펫 창의 질문 카드를 연다 (팝업은 메인에서 닫음)
petCallout.addEventListener("click", () => {
  window.trayAPI.sendAction("answer-question");
});

// 닦아주기/쓰다듬기 → 호감도 +3 (하루 1회). 게이지·버튼을 즉시 갱신한다.
// 90 도달로 진화하면 펫 창이 축하 연출을 띄운다(메인의 notifyEvolved).
cleanBtn.addEventListener("click", async () => {
  const { state } = await window.trayAPI.cleanPet();
  renderAffinity(state.affinityPoints);
  renderCareButtons(state.dailyCleanDone, state.dailyPetDone);
});
petBtn.addEventListener("click", async () => {
  const { state } = await window.trayAPI.petPet();
  renderAffinity(state.affinityPoints);
  renderCareButtons(state.dailyCleanDone, state.dailyPetDone);
});

// 펫 화면 후원 카드 → 홈페이지
document.getElementById("support-btn").addEventListener("click", () => {
  window.trayAPI.sendAction("homepage");
});
