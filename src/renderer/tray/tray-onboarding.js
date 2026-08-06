// 트레이 팝업 · 온보딩 프롤로그 화면 (#onboarding-view)
// 문구·플로우 데이터(ONBOARDING_FLOW)는 tray-data.js에서 로드된다.
// 화면 전환(showScreen)은 tray.js, 완료 후 이동할 showPet은 tray-pet.js에 있다.

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
