// 트레이 팝업 · 온보딩 프롤로그 화면 (#onboarding-view)
// 문구·플로우 데이터(ONBOARDING_FLOW)는 tray-data.js에서 로드된다.
// 화면 전환(showScreen)은 tray.js, 완료 후 이동할 showPet은 tray-pet.js에 있다.

const onboardingScene = document.getElementById("onboarding-scene");
const onboardingMeteor = document.getElementById("onboarding-meteor");
const onboardingSpeaker = document.getElementById("onboarding-speaker");
const onboardingText = document.getElementById("onboarding-text");
const onboardingOptions = document.getElementById("onboarding-options");
const onboardingPerms = document.getElementById("onboarding-perms");
const onboardingNext = document.getElementById("onboarding-next");
const onboardingQuit = document.getElementById("onboarding-quit");
const onboardingLang = document.getElementById("onboarding-lang");
let onboardingState = null;
let onboardingLandHandler = null; // 운석 착지(animationend)에 맞춰 문구를 노출하는 1회성 리스너
let onboardingLandTimer = null; // animationend가 오지 않는 경우를 대비한 폴백
// 착지 연출을 이미 끝낸 단계를 다시 그리는 경우(언어 변경 등)를 구분하기 위한 상태.
// 같은 단계를 다시 그릴 때 또 기다리면, 애니메이션은 재생되지 않으므로 화면이 빈 채로 멈춘다.
let lastRenderedStep = null;
let landRevealDone = false;
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
  // 단계가 바뀌면 착지 연출을 처음부터 다시 본다(장면 클래스가 바뀌어 실제로 재생된다).
  if (stepIndex !== lastRenderedStep) {
    lastRenderedStep = stepIndex;
    landRevealDone = false;
  }
  setOnboardingScene(step.scene);
  onboardingSpeaker.textContent = step.speaker || "PROLOGUE";
  onboardingSpeaker.classList.remove("hidden");
  onboardingText.classList.remove("hidden");
  onboardingOptions.classList.add("hidden");
  onboardingOptions.replaceChildren();
  onboardingPerms.classList.add("hidden");
  onboardingNext.classList.remove("hidden");
  onboardingNext.disabled = false;
  onboardingNext.textContent = step.buttonKey
    ? t(step.buttonKey)
    : t("onboarding.next");

  // 마지막 단계: 권한을 모두 허용해야 시작할 수 있다.
  if (step.permissions) {
    onboardingText.textContent = t(step.textKey);
    onboardingPerms.classList.remove("hidden");
    renderPermissionRows(); // 먼저 뼈대를 그리고 (여기서 창 높이도 맞춘다)
    loadPermissionState(); // 조회가 끝나면 체크 표시와 버튼 상태를 갱신
    return;
  }

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
    resizeOnboarding(); // 선택지가 길면(특히 영어) 기본 높이를 넘는다
    return;
  }

  // 운석 낙하 애니메이션(meteor-fall)이 끝나는 착지 순간에 맞춰
  // 문구/화자칩/버튼을 노출한다. 고정 타이머 대신 실제 착지에 동기화한다.
  if (step.revealOnLand) {
    // 이미 착지를 본 단계를 다시 그리는 중이라면 기다리지 않는다. 같은 장면 클래스를
    // 다시 붙여도 CSS 애니메이션은 재생되지 않아 animationend가 오지 않기 때문이다.
    // (문구·화자칩·버튼은 이 함수 앞부분에서 이미 보이는 상태로 맞춰져 있다.)
    if (landRevealDone) {
      onboardingText.textContent = t(step.textKey);
      resizeOnboarding();
      return;
    }
    onboardingSpeaker.classList.add("hidden");
    onboardingText.classList.add("hidden");
    onboardingText.textContent = "";
    onboardingNext.classList.add("hidden");
    const reveal = () => {
      clearOnboardingLandWait();
      landRevealDone = true;
      onboardingSpeaker.classList.remove("hidden");
      onboardingText.classList.remove("hidden");
      onboardingText.textContent = t(step.textKey);
      onboardingNext.classList.remove("hidden");
      resizeOnboarding();
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

  onboardingText.textContent = t(step.textKey);
  resizeOnboarding();
}

// ---------- 마지막 단계: 권한 ----------
let permGranted = { screen: false, automation: false };
// 항목별로 "허용" 요청을 이미 한 번 보냈는지. 두 번째 클릭은 시스템 설정 열기로 바뀐다.
let permTried = { screen: false, automation: false };
// 화면 기록은 요청 팝업이 뜨지 않는 상태(이미 거부됨)면 설정에서 켜야 하는데,
// 그 변경은 앱을 재시작해야 읽힌다. 그때는 시작하기 대신 재시작 버튼을 준다.
let permRelaunchMode = false;

function syncStartButton() {
  // 선택 권한(자동화)은 시작을 막지 않는다.
  const allGranted = ONBOARDING_PERMISSIONS.filter((p) => !p.optional).every(
    (p) => permGranted[p.key],
  );
  permRelaunchMode = !allGranted && permRelaunchMode;
  if (allGranted) {
    onboardingNext.textContent = t("onboarding.start");
    onboardingNext.disabled = false;
  } else if (permRelaunchMode) {
    onboardingNext.textContent = t("onboarding.relaunchStart");
    onboardingNext.disabled = false;
  } else {
    onboardingNext.textContent = t("onboarding.start");
    onboardingNext.disabled = true;
  }
}

function renderPermissionRows() {
  onboardingPerms.replaceChildren(
    ...ONBOARDING_PERMISSIONS.map((perm) => {
      const granted = permGranted[perm.key];
      // 허용된 항목은 클릭할 게 없으니 div로, 미허용 항목은 행 전체를 버튼으로 둔다.
      const row = document.createElement(granted ? "div" : "button");
      row.className = granted ? "onboarding-perm granted" : "onboarding-perm";

      const mark = document.createElement("span");
      mark.className = "onboarding-perm-mark";
      mark.textContent = granted ? "✓" : "▶";

      const body = document.createElement("div");
      body.className = "onboarding-perm-body";
      const label = document.createElement("div");
      label.className = "onboarding-perm-label";
      label.textContent = t(perm.labelKey);
      const desc = document.createElement("div");
      desc.className = "onboarding-perm-desc";
      desc.textContent = t(perm.descKey);
      body.append(label, desc);

      row.append(mark, body);
      if (!granted) {
        const hint = document.createElement("span");
        hint.className = "onboarding-perm-hint";
        hint.textContent = permTried[perm.key]
          ? t("perm.openSettings")
          : t("perm.allow");
        row.append(hint);
        row.addEventListener("click", () => requestPermission(perm.key));
      }
      return row;
    }),
  );
  resizeOnboarding();
}

// 온보딩은 씬+안내문+선택지를 합치면 기본 팝업 높이(540px)를 넘을 수 있고, 이 화면은
// overflow:hidden이라 스크롤로 대응할 수 없다(넘치면 그냥 잘린다). 영어는 같은 문장도
// 길어져 줄이 늘기 때문에, 단계마다 실제 내용 높이를 재서 모자라면 창을 키운다.
//
// .onboarding-dialog는 flex:1이라 평소엔 "남은 공간"만큼의 높이로 측정된다. 그대로 재면
// 지금 창 높이가 그대로 나와 한 번 커진 창이 다시 줄지 않으므로, 재는 동안만 flex를 꺼서
// 내용 높이를 얻는다(중간에 페인트가 끼지 않아 깜빡임은 없다).
const TRAY_POPUP_BASE_HEIGHT = 540; // main.js의 TRAY_POPUP_HEIGHT와 같아야 한다

function resizeOnboarding() {
  const dialog = document.querySelector(".onboarding-dialog");
  const prevFlex = dialog.style.flex;
  dialog.style.flex = "none";
  const needed =
    document.querySelector(".titlebar").offsetHeight +
    onboardingScene.offsetHeight +
    dialog.offsetHeight +
    6 + // #popup 상하 테두리(3px×2)
    10; // 창 = #popup + 10px (하드 섀도우 여백)
  dialog.style.flex = prevFlex;
  // 0을 보내면 기본 높이로 돌아간다. 내용이 짧은 단계에서 이전 단계의 큰 창을 물려받지 않게.
  window.trayAPI.resizePopup(needed > TRAY_POPUP_BASE_HEIGHT ? needed : 0);
}

// dock 조회는 실제로 스크립트를 돌리는 것이라, 아직 허용 전이면 이 호출이
// 시스템 권한 창을 띄우는 역할까지 한다(권한 화면을 보고 있는 중이라 맥락이 맞다).
async function loadPermissionState() {
  // 자동화는 여기서 조회만 한다(requestDockAutomation이 아님). 조회는 권한 창을
  // 띄우지 않으므로, 화면을 여는 것만으로 창이 뜨는 일이 없다.
  const [screenStatus, automation] = await Promise.all([
    window.trayAPI.getScreenPermission(),
    window.trayAPI.getDockAutomation(),
  ]);
  permGranted = {
    screen: screenStatus === "granted",
    automation: automation === "granted",
  };
  renderPermissionRows();
  syncStartButton();
}

async function requestPermission(key) {
  // 한 번 요청했는데도 허용으로 안 읽히면 두 경우가 섞여 있고 앱은 구분할 수 없다.
  //  (1) 허용했지만 macOS가 재시작을 요구해 아직 반영이 안 됨 → 아래 재시작 버튼
  //  (2) 실제로 거부함 → 시스템 설정에서 직접 켜야 함
  // 그래서 추측해서 설정을 열지 않고, 두 번째 클릭에서만 설정을 연다.
  if (permTried[key]) {
    if (key === "automation") window.trayAPI.openDockAutomationSettings();
    else window.trayAPI.openScreenPermissionSettings();
    return;
  }
  permTried[key] = true;

  if (key === "automation") {
    // 이 호출이 곧 요청이다 — 첫 Apple Event에서 macOS가 권한 창을 띄운다.
    permGranted.automation =
      (await window.trayAPI.requestDockAutomation()) === "granted";
  } else {
    const after = await window.trayAPI.requestScreenPermission();
    permGranted.screen = after === "granted";
    if (!permGranted.screen) permRelaunchMode = true;
  }
  renderPermissionRows();
  syncStartButton();
}

async function advanceOnboarding() {
  const stepIndex = Math.min(
    onboardingState?.step || 0,
    ONBOARDING_FLOW.length - 1,
  );
  const step = ONBOARDING_FLOW[stepIndex];
  if (step.permissions && permRelaunchMode) {
    window.trayAPI.relaunchApp(); // 설정에서 허용한 값을 읽으려면 재시작해야 한다
    return;
  }
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
onboardingQuit.addEventListener("click", () =>
  window.trayAPI.sendAction("quit"),
);

// 프롤로그 중 언어 전환. 버튼에는 "지금 누르면 바뀔 언어"를 보여준다.
function syncOnboardingLangLabel() {
  onboardingLang.textContent = getLocale() === "ko" ? "EN" : "한국어";
}

onboardingLang.addEventListener("click", () => {
  window.trayAPI.setSetting("language", getLocale() === "ko" ? "en" : "ko");
});

// 언어가 바뀌면 버튼 라벨과 현재 단계 문구를 다시 그린다.
onLocaleChange(async () => {
  syncOnboardingLangLabel();
  if (!onboardingState) return;
  // 질문 문구·선택지 라벨은 메인이 pick()으로 미리 번역해 보낸 값이라(evolution.js의
  // serialize), 렌더러가 다시 그리는 것만으로는 안 바뀐다. 상태를 새로 받아야 한다.
  onboardingState = await window.trayAPI.getOnboardingState();
  renderOnboardingStep();
});

syncOnboardingLangLabel();
