const test = require("node:test");
const assert = require("node:assert/strict");
const evolution = require("../src/main/evolution");

function makeData() {
  return {
    user: { userName: null, userNameSetAt: null, installedAt: "2026-07-09T00:00:00.000Z" },
    pet: {
      petName: null,
      petNameSetAt: null,
      stoneType: null,
      stoneConfirmedAt: null,
      evolutionStage: 0,
      evolutionVariant: null,
      pendingEvolution: null,
      presentedEvolutionStages: [],
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
      dailyFeedDone: false,
      dailyChatCount: 0,
      dailyInteractionCount: 0,
      lastChatAt: null,
      lastInteractionAt: null,
      dailyCounterResetAt: "2026-07-09T00:00:00.000Z",
    },
    items: { unlockedItems: [], equippedItem: null },
    notifications: { hasUnreadBadge: false, notificationsEnabled: true },
    chat: { recentChatContext: [], chatSummary: null, turnsSinceLastSummary: 0 },
    settings: {
      autoLaunch: false,
      soundEnabled: false,
      petPlacement: "follow",
      petSize: "medium",
    },
  };
}

function answerIds(data, ids, value) {
  let result = null;
  for (const id of ids) {
    data.questions.todaysQuestions = [id];
    result = evolution.answer(data, { questionId: id, value });
  }
  return result;
}

test("본 질문 12개 완료 후 원석 1단계로 확정된다", () => {
  const data = makeData();
  const ids = Array.from({ length: 12 }, (_, i) => `main_${String(i + 1).padStart(2, "0")}`);

  const result = answerIds(data, ids, "granite");

  assert.equal(result.evolved, 1);
  assert.equal(data.pet.evolutionStage, 1);
  assert.equal(data.pet.stoneType, "granite");
  assert.equal(data.questions.mainQuestionProgress, 12);
  assert.equal(data.pet.pendingEvolution.stage, 1);
  assert.deepEqual(data.pet.pendingEvolution.from, {
    stage: 0,
    stoneType: null,
    variant: null,
  });
});

test("pending 진화 연출을 완료하면 대기 상태를 해제하고 완료 단계를 기록한다", () => {
  const data = makeData();
  const ids = Array.from({ length: 12 }, (_, i) => `main_${String(i + 1).padStart(2, "0")}`);
  answerIds(data, ids, "granite");

  const result = evolution.completePendingEvolution(data);

  assert.equal(result.completed.stage, 1);
  assert.equal(data.pet.pendingEvolution, null);
  assert.deepEqual(data.pet.presentedEvolutionStages, [1]);
});

test("본 질문 2개 돌 동점이면 해당 타이브레이커를 우선 삽입하고 답변 후 확정한다", () => {
  const data = makeData();
  const ids = Array.from({ length: 12 }, (_, i) => `main_${String(i + 1).padStart(2, "0")}`);

  answerIds(data, ids.slice(0, 6), "granite");
  const resultAfterTie = answerIds(data, ids.slice(6), "basalt");

  assert.equal(resultAfterTie.evolved, null);
  assert.equal(data.pet.evolutionStage, 0);
  assert.equal(data.questions.todaysQuestions[0], "tb_granite_basalt");
  assert.equal(evolution.getState(data).question.kind, "tiebreaker");

  const result = evolution.answer(data, {
    questionId: "tb_granite_basalt",
    value: "basalt",
  });

  assert.equal(result.evolved, 1);
  assert.equal(data.pet.evolutionStage, 1);
  assert.equal(data.pet.stoneType, "basalt");
});

test("본 질문 3개 돌 동점이면 타이브레이커를 순차 삽입해 최종 확정한다", () => {
  const data = makeData();
  const ids = Array.from({ length: 12 }, (_, i) => `main_${String(i + 1).padStart(2, "0")}`);

  answerIds(data, ids.slice(0, 4), "granite");
  answerIds(data, ids.slice(4, 8), "basalt");
  const resultAfterTie = answerIds(data, ids.slice(8), "marble");

  assert.equal(resultAfterTie.evolved, null);
  assert.equal(data.pet.evolutionStage, 0);
  assert.equal(data.questions.todaysQuestions[0], "tb_granite_basalt");

  let result = evolution.answer(data, {
    questionId: "tb_granite_basalt",
    value: "basalt",
  });
  assert.equal(result.evolved, null);
  assert.equal(data.pet.evolutionStage, 0);
  assert.equal(data.questions.todaysQuestions[0], "tb_granite_marble");

  result = evolution.answer(data, {
    questionId: "tb_granite_marble",
    value: "marble",
  });
  assert.equal(result.evolved, null);
  assert.equal(data.pet.evolutionStage, 0);
  assert.equal(data.questions.todaysQuestions[0], "tb_basalt_marble");

  result = evolution.answer(data, {
    questionId: "tb_basalt_marble",
    value: "marble",
  });

  assert.equal(result.evolved, 1);
  assert.equal(data.pet.evolutionStage, 1);
  assert.equal(data.pet.stoneType, "marble");
});

test("1단계에서 E/I 질문 12개 완료 후 변성체 2단계로 확정된다", () => {
  const data = makeData();
  data.pet.evolutionStage = 1;
  data.pet.stoneType = "basalt";
  const ids = Array.from({ length: 12 }, (_, i) => `ei_${String(i + 1).padStart(2, "0")}`);

  const result = answerIds(data, ids, "외향");

  assert.equal(result.evolved, 2);
  assert.equal(data.pet.evolutionStage, 2);
  assert.equal(data.pet.evolutionVariant, "extrovert");
  assert.deepEqual(data.questions.todaysQuestions, []);
  assert.equal(data.notifications.hasUnreadBadge, false);
});

test("E/I 6:6 동점이면 타이브레이커를 우선 삽입하고 답변 후 확정한다", () => {
  const data = makeData();
  data.pet.evolutionStage = 1;
  data.pet.stoneType = "marble";
  const ids = Array.from({ length: 12 }, (_, i) => `ei_${String(i + 1).padStart(2, "0")}`);

  answerIds(data, ids.slice(0, 6), "외향");
  const resultAfterTie = answerIds(data, ids.slice(6), "내향");

  assert.equal(resultAfterTie.evolved, null);
  assert.equal(data.pet.evolutionStage, 1);
  assert.equal(data.questions.todaysQuestions[0], "eitb_01");
  assert.equal(evolution.getState(data).question.kind, "tiebreaker");

  const result = evolution.answer(data, {
    questionId: "eitb_01",
    value: "내향",
  });

  assert.equal(result.evolved, 2);
  assert.equal(data.pet.evolutionStage, 2);
  assert.equal(data.pet.evolutionVariant, "introvert");
});

test("2단계 진입 시 이미 호감도 90 이상이면 즉시 3단계로 오른다", () => {
  const data = makeData();
  data.pet.evolutionStage = 1;
  data.pet.stoneType = "gneiss";
  data.affinity.affinityPoints = 90;
  const ids = Array.from({ length: 12 }, (_, i) => `ei_${String(i + 1).padStart(2, "0")}`);

  const result = answerIds(data, ids, "내향");

  assert.equal(result.evolved, 3);
  assert.equal(data.pet.evolutionStage, 3);
  assert.equal(data.pet.evolutionVariant, "introvert");
});

test("2단계에서 닦기와 밥 주기로 호감도 90에 도달하면 3단계로 오른다", () => {
  const data = makeData();
  data.pet.evolutionStage = 2;
  data.pet.stoneType = "granite";
  data.pet.evolutionVariant = "extrovert";
  data.affinity.affinityPoints = 86;

  const cleanResult = evolution.cleanPet(data);
  assert.equal(cleanResult.evolved, null);
  assert.equal(data.affinity.affinityPoints, 88);

  const feedResult = evolution.feedPet(data);
  assert.equal(feedResult.evolved, 3);
  assert.equal(data.affinity.affinityPoints, 90);
  assert.equal(data.pet.evolutionStage, 3);
});

test("2단계 이상에서는 일일 갱신 후에도 질문 배지가 남지 않는다", () => {
  const data = makeData();
  data.pet.evolutionStage = 2;
  data.pet.stoneType = "granite";
  data.pet.evolutionVariant = "extrovert";
  data.questions.todaysQuestions = ["ei_12"];

  evolution.onDailyReset(data, "2026-07-09T08:00:00.000Z");

  assert.deepEqual(data.questions.todaysQuestions, []);
  assert.equal(data.notifications.hasUnreadBadge, false);
});
