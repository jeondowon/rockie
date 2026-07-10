// 진화 판정 엔진 (update.md 기준 v2).
// - 0→1: 본 질문 → 돌 종류 확정 (동점 시 타이브레이커)
// - 1→2: E/I 질문 → 변성체 변형(extrovert/introvert) 확정 (동점 시 타이브레이커)
// - 2→3: 호감도 90 도달 → 보석 확정 (질문 없음, 호감도 트리거)
// 질문은 매일 오전 8시에 최대 2개를 뽑아 todaysQuestions에 채우고, 사용자가
// 트레이 버튼으로 능동적으로 답한다(정기 알림/강제 노출 없음).
// 순수 데이터 + 계산만 담당하고, 저장은 호출부(main)에서 store로 처리한다.

const {
  ONBOARDING_QUESTIONS,
  MAIN_QUESTIONS,
  TIEBREAKERS,
  EI_QUESTIONS,
  EI_TIEBREAKER,
} = require("./questions");

// ---------- 상수 (update.md 2장) ----------
const MAIN_QUESTION_COUNT = MAIN_QUESTIONS.length; // 0→1 본 질문 총 개수
const EI_QUESTION_COUNT = EI_QUESTIONS.length; // 1→2 E/I 질문 총 개수
const STAGE1_DISPLAY_COUNT = ONBOARDING_QUESTIONS.length + MAIN_QUESTION_COUNT;
const QUESTION_DISPLAY_TOTAL = STAGE1_DISPLAY_COUNT + EI_QUESTION_COUNT;
const AFFINITY_TARGET = 90; // 2→3 진화 필요 호감도
const CLEAN_POINTS = 3; // 닦아주기 획득 점수
const FEED_POINTS = 3; // 밥주기 획득 점수
const AFFINITY_MAX = 100; // 호감도 상한

// 돌 종류: 영문 key는 pet.stoneType/GIF 접두어, ko는 traitScores 키.
const STONES = [
  { key: "granite", ko: "화강암" },
  { key: "basalt", ko: "현무암" },
  { key: "marble", ko: "대리석" },
  { key: "gneiss", ko: "편마암" },
];
const STONE_ORDER = STONES.map((s) => s.key);
const KO_BY_KEY = Object.fromEntries(STONES.map((s) => [s.key, s.ko]));

const TB_BY_ID = Object.fromEntries(TIEBREAKERS.map((t) => [t.id, t]));

// 답변 히스토리 복원용: id → 질문(모든 종류).
const QUESTION_BY_ID = Object.fromEntries(
  [
    ...ONBOARDING_QUESTIONS,
    ...MAIN_QUESTIONS,
    ...TIEBREAKERS,
    ...EI_QUESTIONS,
    EI_TIEBREAKER,
  ].map((q) => [q.id, q]),
);

// 옵션이 담고 있는 판정 값(돌 종류 또는 E/I 축)을 반환. 저장·판정·복원에서 공통 사용.
function optValue(o) {
  return o.stone ?? o.axis;
}

const TAG_CATEGORY_ORDER = [
  ...new Set(
    [...ONBOARDING_QUESTIONS, ...MAIN_QUESTIONS, ...EI_QUESTIONS].map(
      (q) => q.category,
    ),
  ),
];

// 저장된 답변 기록을 트레이 히스토리용으로 복원 (최근 답변이 먼저).
function buildHistory(data) {
  return data.questions.answeredQuestions
    .map((a) => {
      const q = QUESTION_BY_ID[a.questionId];
      if (!q) return null;
      const opt = q.options.find((o) => optValue(o) === a.selectedOption);
      return {
        text: q.text,
        label: opt ? opt.label : "",
        answeredAt: a.answeredAt,
      };
    })
    .filter(Boolean)
    .reverse();
}

function categoryTraitTags(data) {
  const scoresByCategory = new Map();
  for (const answer of data.questions.answeredQuestions) {
    const q = QUESTION_BY_ID[answer.questionId];
    if (!q || !q.category || q.category === "타이브레이커") continue;
    const opt = q.options.find((o) => optValue(o) === answer.selectedOption);
    if (!opt?.traitTag) continue;

    if (!scoresByCategory.has(q.category)) scoresByCategory.set(q.category, {});
    const scores = scoresByCategory.get(q.category);
    scores[opt.traitTag] = (scores[opt.traitTag] || 0) + 1;
  }

  return TAG_CATEGORY_ORDER.map((category) => {
    const scores = scoresByCategory.get(category);
    if (!scores) return null;
    const [tag] = Object.entries(scores).sort(
      (a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "ko"),
    )[0];
    return tag;
  }).filter(Boolean);
}

// ---------- 질문 종류 판별 (id 접두어 기준) ----------
function isMainTiebreaker(id) {
  return id.startsWith("tb_");
}
function isEiTiebreaker(id) {
  return id.startsWith("eitb_");
}
function isEiQuestion(id) {
  return id.startsWith("ei_");
}
function isOnboardingQuestion(id) {
  return id.startsWith("onboarding_");
}

function onboardingCompleted(data) {
  return !!data.onboarding?.completed;
}

function maxDailyQuestions(stage) {
  if (stage === 0) return 3;
  if (stage === 1) return 2;
  return 0;
}

// ---------- 질문 풀에서 다음 질문 뽑기 (update.md 8.2) ----------
// 아직 답하지 않았고 오늘 목록에도 없는 질문을 풀 순서대로 count개 선택.
function pickUnanswered(data, pool, count) {
  const answered = new Set(
    data.questions.answeredQuestions.map((a) => a.questionId),
  );
  const inToday = new Set(data.questions.todaysQuestions);
  const picked = [];
  for (const q of pool) {
    if (picked.length >= count) break;
    if (answered.has(q.id) || inToday.has(q.id)) continue;
    picked.push(q.id);
  }
  return picked;
}

function validTodayQuestions(data) {
  if (!onboardingCompleted(data)) return [];
  return data.questions.todaysQuestions.filter((id) => QUESTION_BY_ID[id]);
}

function pickNextQuestions(data, count) {
  if (count <= 0) return [];
  if (data.pet.evolutionStage === 0)
    return pickUnanswered(data, MAIN_QUESTIONS, count);
  if (data.pet.evolutionStage === 1)
    return pickUnanswered(data, EI_QUESTIONS, count);
  return []; // 2단계 이상: 질문 없음
}

// ---------- 매일 오전 8시 갱신 (update.md 8.1) ----------
// 어제 안 답한 질문은 유지하고, 부족분(2 - 남은 개수)만 새로 채운다.
// 반환: { showBanner } — 갱신 후 답할 질문이 있으면 배너 알림 대상.
function onDailyReset(data, nowIso) {
  if (!onboardingCompleted(data)) {
    data.questions.todaysQuestions = [];
    data.affinity.dailyCleanDone = false;
    data.affinity.dailyFeedDone = false;
    data.notifications.hasUnreadBadge = false;
    data.questions.dailyResetAt = nowIso;
    return { showBanner: false };
  }
  if (data.pet.evolutionStage >= 2) {
    data.questions.todaysQuestions = [];
  } else {
    data.questions.todaysQuestions = validTodayQuestions(data);
  }
  const remaining = data.questions.todaysQuestions;
  const need = maxDailyQuestions(data.pet.evolutionStage) - remaining.length;
  if (need > 0) {
    data.questions.todaysQuestions = remaining.concat(
      pickNextQuestions(data, need),
    );
  }
  data.affinity.dailyCleanDone = false;
  data.affinity.dailyFeedDone = false;
  data.notifications.hasUnreadBadge =
    data.pet.evolutionStage < 2 && validTodayQuestions(data).length > 0;
  data.questions.dailyResetAt = nowIso;
  return { showBanner: validTodayQuestions(data).length > 0 };
}

// ---------- 판정 보조 (본 질문 동점 처리) ----------
// 두 돌의 타이브레이커 쌍 키 (STONE_ORDER 순서로 정규화)
function pairKey(a, b) {
  return [a, b]
    .sort((x, y) => STONE_ORDER.indexOf(x) - STONE_ORDER.indexOf(y))
    .join("_");
}

// 현재 최고점과 동점인 돌들 (STONE_ORDER 순서)
function tiedStones(data) {
  const scores = data.traits.traitScores;
  const max = Math.max(...STONES.map((s) => scores[s.ko]));
  return STONE_ORDER.filter((key) => scores[KO_BY_KEY[key]] === max);
}

// 아직 안 물어본 동점 쌍의 타이브레이커 하나 (없으면 null)
function nextMainTiebreaker(data) {
  let tied = tiedStones(data);
  if (tied.length < 2 && data.traits.tiebreaker.used) {
    const scores = data.traits.traitScores;
    const max = Math.max(...STONES.map((s) => scores[s.ko]));
    tied = STONE_ORDER.filter((key) => scores[KO_BY_KEY[key]] >= max - 1);
  }
  if (tied.length < 2) return null;
  const asked = data.traits.tiebreaker.pairsAsked;
  for (let i = 0; i < tied.length; i++) {
    for (let j = i + 1; j < tied.length; j++) {
      const key = pairKey(tied[i], tied[j]);
      if (!asked.includes(key)) return TB_BY_ID[`tb_${key}`];
    }
  }
  return null;
}

// 타이브레이커까지 다 쓴 뒤 최종 승자 돌 (여전히 동점이면 가장 최근 답변 기준)
function winnerStone(data) {
  const tied = tiedStones(data);
  if (tied.length === 1) return tied[0];
  const answered = data.questions.answeredQuestions;
  return answered[answered.length - 1].selectedOption;
}

// 타이브레이커를 오늘 목록 맨 앞에 삽입 → 다음에 바로 답할 수 있게 한다 (update.md 5.1/5.2)
function insertTiebreakerToday(data, id) {
  if (!data.questions.todaysQuestions.includes(id)) {
    data.questions.todaysQuestions.unshift(id);
  }
  data.notifications.hasUnreadBadge = true;
}

// ---------- 단계 확정 (update.md 8.4) ----------
function evolutionSnapshot(data) {
  return {
    stage: data.pet.evolutionStage,
    stoneType: data.pet.stoneType,
    variant: data.pet.evolutionVariant,
  };
}

function queuePendingEvolution(data, from) {
  const existingFrom = data.pet.pendingEvolution?.from;
  const to = evolutionSnapshot(data);
  data.pet.pendingEvolution = {
    stage: to.stage,
    from: existingFrom || from,
    to,
    createdAt: new Date().toISOString(),
  };
}

function confirmStage1(data, nowIso, stone) {
  const from = evolutionSnapshot(data);
  data.pet.stoneType = stone;
  data.pet.stoneConfirmedAt = nowIso;
  data.pet.evolutionStage = 1;
  queuePendingEvolution(data, from);
  // 확정 직후 오늘 남은 슬롯이 있으면 같은 개수만큼 E/I 질문으로 교체
  const n = data.questions.todaysQuestions.length;
  if (n > 0) {
    data.questions.todaysQuestions = [];
    data.questions.todaysQuestions.push(
      ...pickNextQuestions(data, Math.min(n, maxDailyQuestions(1))),
    );
  }
}

function confirmStage2(data, variant) {
  const from = evolutionSnapshot(data);
  data.pet.evolutionVariant = variant;
  data.pet.evolutionStage = 2;
  queuePendingEvolution(data, from);
  // 2단계는 질문 없음: 오늘 남은 질문 비운다
  data.questions.todaysQuestions = [];
  data.notifications.hasUnreadBadge = false;
  // 진입 시점에 이미 호감도 90 이상이면 즉시 3단계 판정 (update.md 6.2)
  if (data.affinity.affinityPoints >= AFFINITY_TARGET) confirmStage3(data);
}

function confirmStage3(data) {
  const from = evolutionSnapshot(data);
  data.pet.evolutionStage = 3;
  queuePendingEvolution(data, from);
  // 3단계 시각 자산은 (stoneType, evolutionVariant) 조합으로 렌더러 매핑에서 조회
}

function completePendingEvolution(data) {
  const pending = data.pet.pendingEvolution;
  if (!pending) return { completed: null, state: getState(data) };
  if (!data.pet.presentedEvolutionStages.includes(pending.stage)) {
    data.pet.presentedEvolutionStages.push(pending.stage);
  }
  data.pet.pendingEvolution = null;
  // 새 단계로 진화하면 착용 중이던 이전 스킨을 벗고 새 형태를 보여준다
  data.pet.activeSkinStage = null;
  return { completed: pending, state: getState(data) };
}

// ---------- 판정 시도 (update.md 8.3) ----------
function tryEvaluate(data, nowIso) {
  if (
    data.pet.evolutionStage === 0 &&
    onboardingCompleted(data) &&
    data.questions.mainQuestionProgress >= MAIN_QUESTION_COUNT
  ) {
    const tb = nextMainTiebreaker(data);
    if (tb) insertTiebreakerToday(data, tb.id);
    else confirmStage1(data, nowIso, winnerStone(data));
  } else if (
    data.pet.evolutionStage === 1 &&
    data.questions.eiQuestionProgress >= EI_QUESTION_COUNT
  ) {
    const e = data.traits.eiScores["외향"];
    const i = data.traits.eiScores["내향"];
    if (e > i) confirmStage2(data, "extrovert");
    else if (i > e) confirmStage2(data, "introvert");
    else if (!data.traits.tiebreaker.pairsAsked.includes("ei")) {
      insertTiebreakerToday(data, EI_TIEBREAKER.id);
    }
  }
}

// ---------- 호감도 획득 (update.md 8.5) ----------
function tryAffinityEvaluate(data) {
  if (
    data.pet.evolutionStage === 2 &&
    data.affinity.affinityPoints >= AFFINITY_TARGET
  ) {
    confirmStage3(data);
  }
}

function awardAffinity(data, amount) {
  data.affinity.affinityPoints = Math.min(
    AFFINITY_MAX,
    data.affinity.affinityPoints + amount,
  );
}

// 닦아주기/밥주기 공통: 하루 1회 제한. 진화가 일어났으면 evolved에 새 단계 번호.
function carePet(data, doneFlag, points) {
  const before = data.pet.evolutionStage;
  if (!data.affinity[doneFlag]) {
    data.affinity[doneFlag] = true;
    awardAffinity(data, points);
    tryAffinityEvaluate(data);
  }
  return {
    evolved:
      data.pet.evolutionStage !== before ? data.pet.evolutionStage : null,
    state: getState(data),
  };
}

function cleanPet(data) {
  return carePet(data, "dailyCleanDone", CLEAN_POINTS);
}

function feedPet(data) {
  return carePet(data, "dailyFeedDone", FEED_POINTS);
}

// ---------- 답변 제출 (update.md 8.3) ----------
// { evolved, state } 반환. evolved는 이번 답변으로 올라간 단계 번호(없으면 null).
function answer(data, { questionId, value }) {
  const q = QUESTION_BY_ID[questionId];
  if (!q || isOnboardingQuestion(questionId))
    return { evolved: null, state: getState(data) };
  const now = new Date().toISOString();

  // 1. 점수 반영 + 진행 수 증가 (종류별 트랙 분리)
  if (isMainTiebreaker(questionId)) {
    data.traits.traitScores[KO_BY_KEY[value]] += 1;
    const key = questionId.slice(3);
    if (!data.traits.tiebreaker.pairsAsked.includes(key)) {
      data.traits.tiebreaker.pairsAsked.push(key);
    }
    data.traits.tiebreaker.used = true;
  } else if (isEiTiebreaker(questionId)) {
    data.traits.eiScores[value] += 1;
    if (!data.traits.tiebreaker.pairsAsked.includes("ei")) {
      data.traits.tiebreaker.pairsAsked.push("ei");
    }
    data.traits.tiebreaker.used = true;
  } else if (isEiQuestion(questionId)) {
    data.traits.eiScores[value] += 1;
    data.questions.eiQuestionProgress += 1;
  } else {
    data.traits.traitScores[KO_BY_KEY[value]] += 1;
    data.questions.mainQuestionProgress += 1;
  }

  // 2. 답변 기록 + 오늘 목록에서 제거
  data.questions.answeredQuestions.push({
    questionId,
    category: q.category ?? null,
    selectedOption: value,
    answeredAt: now,
  });
  data.questions.todaysQuestions = data.questions.todaysQuestions.filter(
    (id) => id !== questionId,
  );

  // 3. 판정 시도 (단계 상승 감지)
  const before = data.pet.evolutionStage;
  tryEvaluate(data, now);
  const evolved =
    data.pet.evolutionStage !== before ? data.pet.evolutionStage : null;

  // 4. 배지 갱신 (답할 질문이 남아있는 동안 표시)
  data.notifications.hasUnreadBadge =
    data.pet.evolutionStage < 2 && data.questions.todaysQuestions.length > 0;

  return { evolved, state: getState(data) };
}

function fillTodayAfterOnboarding(data) {
  const remaining = validTodayQuestions(data);
  const need = maxDailyQuestions(data.pet.evolutionStage) - remaining.length;
  if (need > 0) {
    data.questions.todaysQuestions = remaining.concat(
      pickNextQuestions(data, need),
    );
  }
  data.notifications.hasUnreadBadge = validTodayQuestions(data).length > 0;
}

function getOnboardingState(data) {
  return {
    completed: onboardingCompleted(data),
    step: data.onboarding?.step || 0,
    questions: ONBOARDING_QUESTIONS.map((q) => serialize(q.id)),
  };
}

function setOnboardingStep(data, step) {
  if (!onboardingCompleted(data)) {
    data.onboarding.step = Math.max(data.onboarding.step || 0, step);
  }
  return getOnboardingState(data);
}

function answerOnboarding(data, { questionId, value, nextStep }) {
  const q = QUESTION_BY_ID[questionId];
  if (!q || !isOnboardingQuestion(questionId) || onboardingCompleted(data)) {
    return getOnboardingState(data);
  }

  const alreadyAnswered = data.questions.answeredQuestions.some(
    (a) => a.questionId === questionId,
  );
  if (!alreadyAnswered) {
    const now = new Date().toISOString();
    data.traits.traitScores[KO_BY_KEY[value]] += 1;
    data.questions.answeredQuestions.push({
      questionId,
      category: q.category ?? null,
      selectedOption: value,
      answeredAt: now,
    });
  }

  const answeredCount = ONBOARDING_QUESTIONS.filter((oq) =>
    data.questions.answeredQuestions.some((a) => a.questionId === oq.id),
  ).length;
  data.onboarding.step =
    nextStep != null
      ? nextStep
      : Math.max(data.onboarding.step || 0, answeredCount);

  return getOnboardingState(data);
}

function completeOnboarding(data) {
  if (onboardingCompleted(data)) return getOnboardingState(data);
  const answeredCount = ONBOARDING_QUESTIONS.filter((oq) =>
    data.questions.answeredQuestions.some((a) => a.questionId === oq.id),
  ).length;
  if (answeredCount < ONBOARDING_QUESTIONS.length) {
    return getOnboardingState(data);
  }
  data.onboarding.completed = true;
  data.onboarding.step = 999;
  data.onboarding.completedAt = new Date().toISOString();
  fillTodayAfterOnboarding(data);
  return getOnboardingState(data);
}

function onboardingAnswerCount(data) {
  if (onboardingCompleted(data)) return ONBOARDING_QUESTIONS.length;
  return ONBOARDING_QUESTIONS.filter((oq) =>
    data.questions.answeredQuestions.some((a) => a.questionId === oq.id),
  ).length;
}

// ---------- 상태 직렬화 ----------
function serialize(id) {
  if (!id) return null;
  const q = QUESTION_BY_ID[id];
  if (!q) return null;
  const kind =
    isMainTiebreaker(id) || isEiTiebreaker(id)
      ? "tiebreaker"
      : isEiQuestion(id)
        ? "ei"
        : isOnboardingQuestion(id)
          ? "onboarding"
          : "main";
  return {
    id,
    kind,
    category: q.category ?? null,
    situation: q.situation ?? null,
    text: q.text,
    options: q.options.map((o) => ({ value: optValue(o), label: o.label })),
  };
}

// "새로운 질문에 답하기" 버튼 상태 (update.md 9.1)
function answerButtonState(data) {
  if (!onboardingCompleted(data)) {
    return { enabled: false, note: "프롤로그를 먼저 완료해 주세요." };
  }
  if (data.pet.evolutionStage >= 2) {
    return { enabled: false, note: "질문을 모두 마쳤어요." };
  }
  if (validTodayQuestions(data).length > 0) {
    return { enabled: true, note: null };
  }
  return {
    enabled: false,
    note: "오늘의 질문을 모두 마쳤어요. 내일 오전 8시에 새 질문을 준비해둘게요.",
  };
}

function getState(data) {
  const stage = data.pet.evolutionStage;
  const stoneType = data.pet.stoneType;
  // 표시용 진행도: 온보딩+0→1 질문 16개, 1→2 질문 6개를 한 막대로 보여준다.
  let progress = QUESTION_DISPLAY_TOTAL;
  if (stage === 0) {
    progress =
      onboardingAnswerCount(data) + data.questions.mainQuestionProgress;
  } else if (stage === 1) {
    progress = STAGE1_DISPLAY_COUNT + data.questions.eiQuestionProgress;
  }
  return {
    stage,
    stoneType,
    variant: data.pet.evolutionVariant,
    progress,
    total: QUESTION_DISPLAY_TOTAL,
    question: serialize(validTodayQuestions(data)[0]),
    answerButton: answerButtonState(data),
    hasBadge:
      data.pet.evolutionStage < 2 && validTodayQuestions(data).length > 0,
    userName: data.user.userName,
    petName: data.pet.petName,
    affinityPoints: data.affinity.affinityPoints,
    dailyCleanDone: data.affinity.dailyCleanDone,
    dailyFeedDone: data.affinity.dailyFeedDone,
    pendingEvolution: data.pet.pendingEvolution,
    activeSkinStage: data.pet.activeSkinStage ?? null,
    onboarding: getOnboardingState(data),
    tags: categoryTraitTags(data),
    history: buildHistory(data),
  };
}

// 스킨 착용/해제: 현재 단계 이하의 해금된 단계만 표시 형태로 지정할 수 있다.
// stage가 null이거나 현재 단계와 같으면 해제(실제 단계 표시)로 취급한다.
function setActiveSkin(data, stage) {
  const current = data.pet.evolutionStage;
  data.pet.activeSkinStage =
    stage != null && stage >= 0 && stage < current ? stage : null;
  return getState(data);
}

module.exports = {
  getState,
  getOnboardingState,
  setOnboardingStep,
  answerOnboarding,
  completeOnboarding,
  setActiveSkin,
  answer,
  cleanPet,
  feedPet,
  completePendingEvolution,
  onDailyReset,
};
