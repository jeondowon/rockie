const backBar = document.getElementById("back-bar");
const screenTitle = document.getElementById("screen-title");

const screens = {
  onboarding: document.getElementById("onboarding-view"),
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

// 진행 중 모드 배너 (집중)
const modeBanner = document.getElementById("mode-banner");
const modeBannerIc = document.getElementById("mode-banner-ic");
const modeBannerLabel = document.getElementById("mode-banner-label");
const modeBannerTime = document.getElementById("mode-banner-time");
const modeBannerExit = document.getElementById("mode-banner-exit");
const modeBannerPause = document.getElementById("mode-banner-pause");

// STONE_NAMES/resolveSprite/spriteGifUrl은 공용 ../shared/sprites.js,
// ICON_*/svgIcon은 ../shared/icons.js, 문구·플로우 데이터는 tray-data.js에서 로드된다.

// 진화 상태 → 표시할 hero GIF 경로 (하단 펫 상태를 아직 받지 못했을 때의 기본값)
function heroSprite(stage, stoneType, variant) {
  const { level, prefix } = resolveSprite(stage, stoneType, variant);
  return spriteGifUrl(level, prefix, "smile");
}

function displaySpriteUrl(sprite) {
  if (!sprite || !sprite.level || !sprite.prefix || !sprite.pose) return null;
  return spriteGifUrl(sprite.level, sprite.prefix, sprite.pose);
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
  modeBannerLabel.textContent = "집중 모드";
  modeBannerPause.textContent = status.paused ? "계속하기" : "일시정지";
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

// ---------- 온보딩 프롤로그 ----------
const onboardingScene = document.getElementById("onboarding-scene");
const onboardingMeteor = document.getElementById("onboarding-meteor");
const onboardingSpeaker = document.getElementById("onboarding-speaker");
const onboardingText = document.getElementById("onboarding-text");
const onboardingOptions = document.getElementById("onboarding-options");
const onboardingNext = document.getElementById("onboarding-next");
let onboardingState = null;
let onboardingLandHandler = null; // 운석 착지(animationend)에 맞춰 문구를 노출하는 1회성 리스너
let onboardingLandTimer = null; // animationend가 오지 않는 경우를 대비한 폴백
const ONBOARDING_LAND_FALLBACK_MS = 4000; // 낙하 연출(지연 2.5s + 낙하 0.8s)보다 넉넉히

function setOnboardingScene(scene) {
  onboardingScene.classList.remove(
    "scene-intro",
    "scene-fall",
    "scene-landed",
    "scene-sound",
    "scene-crack",
    "scene-pebble",
  );
  if (scene) onboardingScene.classList.add(scene);
}

// 착지 대기(리스너 + 폴백 타이머)를 해제한다
function clearOnboardingLandWait() {
  if (onboardingLandHandler) {
    onboardingMeteor.removeEventListener("animationend", onboardingLandHandler);
    onboardingLandHandler = null;
  }
  clearTimeout(onboardingLandTimer);
  onboardingLandTimer = null;
}

function renderOnboardingStep() {
  clearOnboardingLandWait(); // 이전 스텝의 착지 대기 정리
  const stepIndex = Math.min(
    onboardingState?.step || 0,
    ONBOARDING_FLOW.length - 1,
  );
  const step = ONBOARDING_FLOW[stepIndex];
  setOnboardingScene(step.scene);
  onboardingSpeaker.textContent = step.speaker || "PROLOGUE";
  onboardingSpeaker.classList.remove("hidden");
  onboardingText.classList.remove("hidden");
  onboardingOptions.classList.add("hidden");
  onboardingOptions.replaceChildren();
  onboardingNext.classList.remove("hidden");
  onboardingNext.textContent = step.button || "클릭하여 진행";

  if (step.question != null) {
    const q = onboardingState.questions[step.question];
    onboardingText.textContent = `${q.situation}\n\n${q.text}`;
    onboardingNext.classList.add("hidden");
    onboardingOptions.classList.remove("hidden");
    onboardingOptions.replaceChildren(
      ...q.options.map((opt) => {
        const btn = document.createElement("button");
        btn.className = "onboarding-option";
        btn.textContent = opt.label;
        btn.addEventListener("click", async () => {
          onboardingState = await window.trayAPI.answerOnboarding({
            questionId: q.id,
            value: opt.value,
            nextStep: stepIndex + 1,
          });
          renderOnboardingStep();
        });
        return btn;
      }),
    );
    return;
  }

  // 운석 낙하 애니메이션(meteor-fall)이 끝나는 착지 순간에 맞춰
  // 문구/화자칩/버튼을 노출한다. 고정 타이머 대신 실제 착지에 동기화한다.
  if (step.revealOnLand) {
    onboardingSpeaker.classList.add("hidden");
    onboardingText.classList.add("hidden");
    onboardingText.textContent = "";
    onboardingNext.classList.add("hidden");
    const reveal = () => {
      clearOnboardingLandWait();
      onboardingSpeaker.classList.remove("hidden");
      onboardingText.classList.remove("hidden");
      onboardingText.textContent = step.text;
      onboardingNext.classList.remove("hidden");
    };
    onboardingLandHandler = (e) => {
      if (e.animationName !== "meteor-fall") return; // 꼬리 등 다른 애니메이션 무시
      reveal();
    };
    onboardingMeteor.addEventListener("animationend", onboardingLandHandler);
    // 애니메이션이 재생되지 않아도 진행이 막히지 않도록 하는 폴백
    onboardingLandTimer = setTimeout(reveal, ONBOARDING_LAND_FALLBACK_MS);
    return;
  }

  onboardingText.textContent = step.text;
}

async function advanceOnboarding() {
  const stepIndex = Math.min(
    onboardingState?.step || 0,
    ONBOARDING_FLOW.length - 1,
  );
  const step = ONBOARDING_FLOW[stepIndex];
  if (step.complete) {
    onboardingState = await window.trayAPI.completeOnboarding();
    if (onboardingState.completed) {
      await showPet();
      return;
    }
  } else {
    onboardingState = await window.trayAPI.setOnboardingStep(stepIndex + 1);
  }
  renderOnboardingStep();
}

async function showOnboarding() {
  onboardingState = await window.trayAPI.getOnboardingState();
  if (onboardingState.completed) {
    showScreen("menu");
    return;
  }
  // 낙하 연출 스텝은 화면이 다시 그려져도 애니메이션이 재생되지 않아 진행이 막힌다.
  // 아직 "클릭하여 진행"을 누르지 않은 단계이므로 첫 화면(시작하기)부터 다시 보여준다.
  // 저장된 step은 되돌리지 않는다(setOnboardingStep은 앞으로만 간다). 시작하기를 누르면
  // 같은 step으로 다시 설정되고, 장면 클래스가 실제로 바뀌므로 낙하 연출이 재생된다.
  if (ONBOARDING_FLOW[onboardingState.step]?.revealOnLand) {
    onboardingState = { ...onboardingState, step: 0 };
  }
  showScreen("onboarding");
  renderOnboardingStep();
}

onboardingNext.addEventListener("click", advanceOnboarding);

// ---------- 화면 전환 ----------
function showScreen(name) {
  for (const [key, node] of Object.entries(screens)) {
    node.classList.toggle("hidden", key !== name);
  }
  if (name === "menu" || name === "onboarding") {
    backBar.classList.add("hidden");
  } else {
    backBar.classList.remove("hidden");
    screenTitle.textContent = SCREEN_TITLES[name] || "";
  }
  // 메뉴는 항목 높이에 맞춰 짧게, 하위 화면은 기존 높이(0 = full)로 창 리사이즈
  window.trayAPI.resizePopup(name === "menu" ? menuWindowHeight() : 0);
  // 시스템 모니터는 화면이 보이는 동안만 폴링한다.
  if (name === "system") {
    refreshPetDisplaySprite();
    startSystemMonitor();
  } else stopSystemMonitor();
}

// ---------- 나의 애완돌 ----------
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
  const displayStage =
    state.activeSkinStage != null ? state.activeSkinStage : state.stage;
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
  const wornStage =
    state.activeSkinStage != null ? state.activeSkinStage : state.stage;
  document.querySelectorAll(".skin-cell").forEach((cell) => {
    const s = Number(cell.dataset.stage);
    const unlocked = state.stage >= s;
    const isCurrent = wornStage === s;
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
  const wornStage =
    lastPetState.activeSkinStage != null
      ? lastPetState.activeSkinStage
      : lastPetState.stage;
  if (wornStage === s) return; // 이미 착용 중이면 무반응
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
const focusMinuteChips = document.querySelectorAll(".chip[data-focus-minutes]");
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

// ---------- 홈페이지 방문 (펫 화면 후원 카드 · 설정 하단 링크) ----------
document.getElementById("support-btn").addEventListener("click", () => {
  window.trayAPI.sendAction("homepage");
});
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
    petNameTitle.textContent = state.petName || "애완돌"; // 메뉴 화면 타이틀바에도 반영
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

// ---------- 시스템 모니터 (SYSTEM 화면) ----------
const SYS_POLL_MS = 2000;
let sysTimer = null;
let aiTicking = false;
let aiCheckedAt = null; // 사용량 파일을 마지막으로 읽어본 시각

function startSystemMonitor() {
  if (sysTimer) return;
  tickSystem(); // 즉시 1회 갱신 후 주기 폴링
  // AI 사용량은 로그를 읽어 집계하므로 폴링하지 않는다.
  // 이 창을 열 때 1회, 그리고 수동 새로고침을 누를 때만 확인한다.
  tickAiUsage();
  sysTimer = setInterval(tickSystem, SYS_POLL_MS);
}

function stopSystemMonitor() {
  if (!sysTimer) return;
  clearInterval(sysTimer);
  sysTimer = null;
}

async function tickSystem() {
  renderCheckedAt(); // "n분 전"이 흐르도록 텍스트만 갱신(파일을 읽지 않는다)
  const stats = await window.trayAPI.getSystemStats();
  if (stats) renderSystem(stats); // 조회 실패(null)면 이전 값 유지
}

// 사용량 파일을 마지막으로 읽어본 시각. 값이 그대로여도 이 표시로 확인 여부를 안다.
function renderCheckedAt() {
  const text = aiCheckedAt == null ? "—" : relativeTime(aiCheckedAt);
  setText("sc-claude-checked", text);
  setText("sc-codex-checked", text);
}

async function tickAiUsage() {
  if (aiTicking) return;
  aiTicking = true;
  try {
    const usage = await window.trayAPI.getAiUsage(); // 호출 시점에 파일을 다시 읽는다
    if (usage) {
      aiCheckedAt = Date.now();
      renderAiUsage(usage);
    }
  } finally {
    aiTicking = false;
  }
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
  renderPetMotion(s.cpu.load);

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

function renderPetMotion(load) {
  const pct = Math.max(0, Math.min(100, load || 0));
  let duration = 3.2; // 활동적: 현재 체감 유지
  if (pct < 25) duration = 12;
  else if (pct >= 70) duration = 0.35;
  document.documentElement.style.setProperty(
    "--sys-pet-rotate-duration",
    `${duration}s`,
  );
}

function renderMood(load) {
  let mood, desc;
  if (load < 25) {
    mood = "새근새근 · 여유";
    desc = "한가로워요. 돌이 느긋하게 쉬고 있어요.";
  } else if (load < 70) {
    mood = "달그락 달그락 · 활동적";
    desc = "적당한 부하. 돌이 살짝 몸을 뒤척여요.";
  } else {
    mood = "데굴데굴 · 바쁨";
    desc = "부하가 높아요! 돌이 바쁘게 움직여요.";
  }
  setText("sys-mood", mood);
  setText("sys-mood-desc", desc);
}

// 토큰 수는 자릿수가 커서 K/M으로 줄여 보여준다
function tokens(n) {
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return `${n}`;
}

function clock(ms) {
  const d = new Date(ms);
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${d.getMonth() + 1}/${d.getDate()} ${hh}:${mm}`;
}

function usagePercent(value) {
  return typeof value === "number" && Number.isFinite(value)
    ? `${Math.round(value)}%`
    : "확인 불가";
}

function relativeTime(ms) {
  if (typeof ms !== "number" || !Number.isFinite(ms)) return "확인 불가";
  const diff = Math.max(0, Date.now() - ms);
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "방금 전";
  if (minutes < 60) return `${minutes}분 전`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}시간 전`;
  return `${Math.floor(hours / 24)}일 전`;
}

function resetTime(epochSeconds) {
  if (typeof epochSeconds !== "number" || !Number.isFinite(epochSeconds)) {
    return "확인 불가";
  }
  const diff = epochSeconds * 1000 - Date.now();
  if (diff <= 0) return "갱신 필요";
  if (diff < 24 * 60 * 60 * 1000) {
    const totalMinutes = Math.max(1, Math.floor(diff / 60000));
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    if (hours > 0 && minutes > 0) return `${hours}시간 ${minutes}분 후`;
    if (hours > 0) return `${hours}시간 후`;
    return `${minutes}분 후`;
  }
  return new Date(epochSeconds * 1000).toLocaleString("ko-KR", {
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function renderAiUsage(u) {
  renderCheckedAt();

  // Claude: statusLine이 저장한 캐시를 그때그때 읽어 표시한다.
  const c = u.claude;
  if (!c || c.updatedAt == null) {
    setText("sc-claude-val", "—");
    setText("sc-claude-sub", "확인 불가");
    setFill("sc-claude-fill", 0);
    paint("claude", "green");
    setText("sc-claude-output", "확인 불가");
    setText("sc-claude-input", "확인 불가");
    setText("sc-claude-cache", "확인 불가");
    setText("sc-claude-sessions", "확인 불가");
  } else {
    const fiveHour = c.fiveHourPercentage;
    const pct = typeof fiveHour === "number" ? fiveHour : 0;
    setText("sc-claude-val", usagePercent(fiveHour));
    setText("sc-claude-sub", "현재 세션");
    setFill("sc-claude-fill", pct);
    paint("claude", loadClass(pct));
    setText("sc-claude-output", usagePercent(c.fiveHourPercentage));
    setText("sc-claude-input", usagePercent(c.sevenDayPercentage));
    setText("sc-claude-cache", resetTime(c.fiveHourResetsAt));
    setText("sc-claude-sessions", resetTime(c.sevenDayResetsAt));
  }

  // Codex: 로컬 세션 로그에 남은 rate_limits 스냅샷을 표시한다.
  const x = u.codex;
  const lim = x.available ? x.limit : null;
  if (lim) {
    const used = lim.usedPercent;
    setText("sc-codex-val", `${Math.round(used)}%`);
    setFill("sc-codex-fill", lim.usedPercent);
    paint("codex", loadClass(used));
    setText("sc-codex-sub", "주간");
    setText("sc-codex-plan", lim.planType || "—");
    setText(
      "sc-codex-reset",
      lim.resetsText || (lim.resetsAt ? clock(lim.resetsAt * 1000) : "—"),
    );
  } else {
    setText("sc-codex-val", "—");
    setFill("sc-codex-fill", 0);
    paint("codex", "green");
    setText("sc-codex-sub", "기록 없음");
    setText("sc-codex-plan", "—");
    setText("sc-codex-reset", "—");
  }
  setText("sc-codex-today", x.available ? tokens(x.input + x.output) : "—");
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

// 수동 새로고침: 값이 그대로일 수도 있으므로 버튼 자체로 진행 상황을 알린다
document.querySelectorAll(".sys-refresh-btn").forEach((btn) => {
  btn.addEventListener("click", async (event) => {
    event.stopPropagation(); // 상세 드롭다운이 닫히지 않도록
    if (btn.disabled) return;
    btn.disabled = true;
    btn.textContent = "확인 중…";
    try {
      await tickAiUsage();
      btn.textContent = "확인 완료";
    } finally {
      setTimeout(() => {
        btn.disabled = false;
        btn.textContent = "새로고침";
      }, 1200);
    }
  });
});
