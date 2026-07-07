// 애완돌 상태를 userData 하위 단일 JSON 파일로 영속화한다.
// dataschema.md의 루트 구조를 그대로 기본값으로 둔다. 이번 범위에서 실제로
// 읽고 쓰는 건 pet/traits/questions 일부지만, 나중 기능이 쓸 자리는 미리 채워
// 파일 구조 변경(마이그레이션)을 줄인다.
const { app } = require("electron");
const path = require("path");
const fs = require("fs");

const FILE = path.join(app.getPath("userData"), "petdata.json");

function defaultData() {
  const now = new Date().toISOString();
  return {
    user: { userName: null, userNameSetAt: null, installedAt: now },
    pet: {
      petName: null,
      petNameSetAt: null,
      stoneType: null,
      stoneConfirmedAt: null,
      evolutionStage: 0,
      evolutionVariant: null,
    },
    traits: {
      traitScores: { 화강암: 0, 현무암: 0, 대리석: 0, 편마암: 0 },
      eiScores: { 외향: 0, 내향: 0 },
      tiebreaker: { used: false, pairsAsked: [] },
    },
    questions: {
      mainQuestionProgress: 0,
      postConfirmQuestionCount: 0,
      pendingQuestionId: null,
      nextQuestionDueAt: null,
      answeredQuestions: [],
      skippedQuestions: {},
    },
    affinity: {
      affinityPoints: 0,
      affinityLevel: 1,
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
      autoLaunch: false,
      soundEnabled: false,
      petPlacement: "follow", // "follow" | "bottom-left" | "bottom-right"
      petSize: "medium", // "small" | "medium" | "large"
    },
  };
}

let data = null;

function load() {
  try {
    data = JSON.parse(fs.readFileSync(FILE, "utf-8"));
    // 예전 파일에 없던 최상위 섹션(예: settings)은 기본값으로 보강한다.
    const defaults = defaultData();
    for (const key of Object.keys(defaults)) {
      if (data[key] === undefined) data[key] = defaults[key];
    }
  } catch (_err) {
    // 파일이 없거나 깨졌으면 기본값으로 새로 만든다
    data = defaultData();
    save();
  }
  return data;
}

function get() {
  return data;
}

function save() {
  fs.writeFileSync(FILE, JSON.stringify(data, null, 2));
}

// "처음부터 다시 키우기" — 전체 상태를 기본값으로 되돌리고 저장한다.
function reset() {
  data = defaultData();
  save();
  return data;
}

module.exports = { load, get, save, reset, FILE };
