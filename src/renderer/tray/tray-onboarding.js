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
  onboardingPerms.classList.add("hidden");
  onboardingNext.classList.remove("hidden");
  onboardingNext.disabled = false;
  onboardingNext.textContent = step.button || "클릭하여 진행";

  // 마지막 단계: 권한을 모두 허용해야 시작할 수 있다.
  if (step.permissions) {
    onboardingText.textContent = step.text;
    onboardingPerms.classList.remove("hidden");
    renderPermissionRows(); // 먼저 뼈대를 그리고
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

// ---------- 마지막 단계: 권한 ----------
let permGranted = { screen: false, dock: false };
// 항목별로 "허용" 요청을 이미 한 번 보냈는지. 두 번째 클릭은 시스템 설정 열기로 바뀐다.
let permTried = { screen: false, dock: false };
// 화면 기록은 요청 팝업이 뜨지 않는 상태(이미 거부됨)면 설정에서 켜야 하는데,
// 그 변경은 앱을 재시작해야 읽힌다. 그때는 시작하기 대신 재시작 버튼을 준다.
let permRelaunchMode = false;

function syncStartButton() {
  const allGranted = ONBOARDING_PERMISSIONS.every((p) => permGranted[p.key]);
  permRelaunchMode = !allGranted && permRelaunchMode;
  if (allGranted) {
    onboardingNext.textContent = "시작하기";
    onboardingNext.disabled = false;
  } else if (permRelaunchMode) {
    onboardingNext.textContent = "재시작하고 시작하기";
    onboardingNext.disabled = false;
  } else {
    onboardingNext.textContent = "시작하기";
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
      label.textContent = perm.label;
      const desc = document.createElement("div");
      desc.className = "onboarding-perm-desc";
      desc.textContent = perm.desc;
      body.append(label, desc);

      row.append(mark, body);
      if (!granted) {
        const hint = document.createElement("span");
        hint.className = "onboarding-perm-hint";
        hint.textContent = permTried[perm.key] ? "설정 열기" : "허용";
        row.append(hint);
        row.addEventListener("click", () => requestPermission(perm.key));
      }
      return row;
    }),
  );
  resizeOnboardingPerms();
}

// 권한 단계는 씬+안내문+권한 목록을 합치면 기본 팝업 높이(540px)를 넘을 수 있고,
// 온보딩 화면은 overflow:hidden이라 스크롤로 대응할 수 없다. 메뉴 화면처럼 실제
// 렌더링된 높이를 측정해 이 스텝에서만 창을 그만큼 키운다(허용 상태가 바뀌어
// 행이 줄어들면 다시 줄어든다).
function resizeOnboardingPerms() {
  if (onboardingPerms.classList.contains("hidden")) return;
  window.trayAPI.resizePopup(
    document.querySelector(".titlebar").offsetHeight +
      onboardingScene.offsetHeight +
      document.querySelector(".onboarding-dialog").offsetHeight +
      6 + // #popup 상하 테두리(3px×2)
      10, // 창 = #popup + 10px (하드 섀도우 여백)
  );
}

// dock 조회는 실제로 스크립트를 돌리는 것이라, 아직 허용 전이면 이 호출이
// 시스템 권한 창을 띄우는 역할까지 한다(권한 화면을 보고 있는 중이라 맥락이 맞다).
async function loadPermissionState() {
  const [screenStatus, dock] = await Promise.all([
    window.trayAPI.getScreenPermission(),
    window.trayAPI.checkDockPermission(),
  ]);
  permGranted = { screen: screenStatus === "granted", dock };
  renderPermissionRows();
  syncStartButton();
}

async function requestPermission(key) {
  // 한 번 요청했는데도 허용으로 안 읽히면 두 경우가 섞여 있고 앱은 구분할 수 없다.
  //  (1) 허용했지만 macOS가 재시작을 요구해 아직 반영이 안 됨 → 아래 재시작 버튼
  //  (2) 실제로 거부함 → 시스템 설정에서 직접 켜야 함
  // 그래서 추측해서 설정을 열지 않고, 두 번째 클릭에서만 설정을 연다.
  if (permTried[key]) {
    if (key === "dock") window.trayAPI.openDockPermissionSettings();
    else window.trayAPI.openScreenPermissionSettings();
    return;
  }
  permTried[key] = true;

  if (key === "dock") {
    permGranted.dock = await window.trayAPI.checkDockPermission();
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
