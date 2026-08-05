// 애완돌 상태를 userData 하위 단일 JSON 파일로 영속화한다.
// dataschema.md의 루트 구조를 그대로 기본값으로 둔다. 이번 범위에서 실제로
// 읽고 쓰는 건 pet/traits/questions 일부지만, 나중 기능이 쓸 자리는 미리 채워
// 파일 구조 변경(마이그레이션)을 줄인다.
const { app } = require("electron");
const path = require("path");
const fs = require("fs");

const FILE = path.join(app.getPath("userData"), "petdata.json");
const TMP_FILE = `${FILE}.tmp`;

function defaultData() {
  const now = new Date().toISOString();
  return {
    user: {
      userName: null,
      userNameSetAt: null,
      installedAt: now,
      // 더블클릭 모드 안내를 보여준 시각. null이면 아직 안 봤다는 뜻이라
      // 예전부터 쓰던 사용자도 다음 실행 때 한 번 보게 된다.
      modeHintSeenAt: null,
    },
    onboarding: {
      completed: false,
      step: 0,
      completedAt: null,
    },
    pet: {
      petName: null,
      petNameSetAt: null,
      stoneType: null,
      stoneConfirmedAt: null,
      evolutionStage: 0,
      evolutionVariant: null,
      pendingEvolution: null,
      presentedEvolutionStages: [],
      activeSkinStage: null,
    },
    traits: {
      traitScores: { 화강암: 0, 현무암: 0, 대리석: 0, 편마암: 0 },
      eiScores: { 외향: 0, 내향: 0 },
      tiebreaker: { used: false, pairsAsked: [] },
    },
    questions: {
      mainQuestionProgress: 0,
      eiQuestionProgress: 0,
      todaysQuestions: [],
      dailyResetAt: null,
      answeredQuestions: [],
    },
    affinity: {
      affinityPoints: 0,
      dailyCleanDone: false,
      dailyPetDone: false,
      dailyChatCount: 0,
      dailyInteractionCount: 0,
      lastChatAt: null,
      lastInteractionAt: null,
      dailyCounterResetAt: now,
    },
    items: { unlockedItems: [], equippedItem: null },
    notifications: { hasUnreadBadge: false, notificationsEnabled: true },
    chat: {
      recentChatContext: [],
      chatSummary: null,
      turnsSinceLastSummary: 0,
    },
    settings: {
      autoLaunch: true,
      soundEnabled: true,
      hideFromCapture: false, // 스크린샷·화면 녹화·화면 공유에서 애완돌 제외
      petPlacement: "follow", // "follow" | "bottom-left" | "bottom-right"
      petSize: "medium", // "small" | "medium" | "large"
      focusMinutes: 25,
      napMinutes: 20,
    },
  };
}

let data = null;

function load() {
  try {
    data = JSON.parse(fs.readFileSync(FILE, "utf-8"));
    // 예전 파일 보강: 없던 최상위 섹션(예: settings)과 섹션 내 신규 필드를
    // 기본값으로 채운다(한 단계 깊이). 기존 값은 건드리지 않고, 스키마에서 빠진
    // 옛 필드(pendingQuestionId 등)는 그대로 두어도 무시되므로 굳이 지우지 않는다.
    const defaults = defaultData();
    for (const key of Object.keys(defaults)) {
      if (data[key] === undefined || data[key] === null) {
        data[key] = defaults[key];
      } else if (
        typeof defaults[key] === "object" &&
        !Array.isArray(defaults[key])
      ) {
        for (const field of Object.keys(defaults[key])) {
          if (data[key][field] === undefined)
            data[key][field] = defaults[key][field];
        }
      }
    }
    // 업데이트 전부터 이미 키우던 사용자는 온보딩 없이 기존 상태를 유지한다.
    // reset()으로 새로 시작한 데이터는 answeredQuestions/progress가 비어 있으므로
    // defaultData의 completed:false 상태로 온보딩을 보게 된다.
    if (
      !data.onboarding.completed &&
      (data.pet.evolutionStage > 0 ||
        data.questions.mainQuestionProgress > 0 ||
        data.questions.eiQuestionProgress > 0 ||
        data.questions.answeredQuestions.length > 0)
    ) {
      data.onboarding.completed = true;
      data.onboarding.step = Math.max(data.onboarding.step || 0, 999);
      data.onboarding.completedAt =
        data.onboarding.completedAt || new Date().toISOString();
    }
  } catch (err) {
    // 파일이 없으면(첫 실행) 그냥 기본값으로 시작한다.
    // 파일은 있는데 못 읽으면 = 깨진 것. 기본값으로 덮어쓰기 전에 원본을 옆에 남겨
    // 나중에 손으로라도 복구할 수 있게 한다(그동안 키운 상태가 통째로 사라지므로).
    if (err.code !== "ENOENT") preserveCorruptFile(err);
    data = defaultData();
    save();
  }
  return data;
}

// 깨진 저장 파일을 petdata.corrupt-<타임스탬프>.json으로 옮겨 보존한다.
function preserveCorruptFile(err) {
  const backup = path.join(
    app.getPath("userData"),
    `petdata.corrupt-${Date.now()}.json`,
  );
  try {
    fs.renameSync(FILE, backup);
    console.error(
      `[store] 저장 파일을 읽지 못했습니다(${err.message}). ` +
        `원본을 ${backup}에 보관하고 기본값으로 시작합니다.`,
    );
  } catch (_e) {
    console.error("[store] 저장 파일을 읽지도 보관하지도 못했습니다:", err.message);
  }
}

function get() {
  return data;
}

// 임시 파일에 먼저 쓰고 rename으로 바꿔치기한다(rename은 원자적).
// 원본을 직접 덮어쓰면 쓰는 도중 크래시·전원 차단 시 파일이 깨진 채 남는다.
function save() {
  fs.writeFileSync(TMP_FILE, JSON.stringify(data, null, 2));
  fs.renameSync(TMP_FILE, FILE);
}

// "처음부터 다시 키우기" — 전체 상태를 기본값으로 되돌리고 저장한다.
function reset() {
  data = defaultData();
  save();
  return data;
}

module.exports = { load, get, save, reset };
