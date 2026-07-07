// 성향 판정(본 질문 12개 + 동점 타이브레이커)과 돌 종류 확정 로직.
// 순수 데이터 + 계산만 담당하고, 저장은 호출부(main)에서 store로 처리한다.

// 돌 종류: 영문 key는 pet.stoneType/GIF 접두어, ko는 traitScores 키(dataschema.md).
const STONES = [
  { key: "granite", ko: "화강암" },
  { key: "basalt", ko: "현무암" },
  { key: "marble", ko: "대리석" },
  { key: "gneiss", ko: "편마암" },
];
const STONE_ORDER = STONES.map((s) => s.key);
const KO_BY_KEY = Object.fromEntries(STONES.map((s) => [s.key, s.ko]));

// 본 질문 12개. options 순서 = 화강암/현무암/대리석/편마암 (evolve.md 4.1)
const MAIN_QUESTIONS = [
  {
    id: "main_01",
    category: "가치관",
    text: "누군가와 갈등이 생겼을 때 나의 대처 방식은?",
    options: [
      { stone: "granite", label: "원칙과 규칙을 먼저 확인한다" },
      { stone: "basalt", label: "일단 부딪히고 그 자리에서 풀어본다" },
      { stone: "marble", label: "상대방의 마음을 먼저 헤아린다" },
      { stone: "gneiss", label: "갈등의 원인을 논리적으로 분석한다" },
    ],
  },
  {
    id: "main_02",
    category: "가치관",
    text: "어려운 목표 앞에서 나는 어떤 태도를 취하는가?",
    options: [
      { stone: "granite", label: "계획을 세우고 꾸준히 실행한다" },
      { stone: "basalt", label: "일단 시작하고 부딪히며 조정한다" },
      { stone: "marble", label: "목표가 나에게 어떤 의미인지 먼저 생각한다" },
      { stone: "gneiss", label: "목표를 여러 단계로 쪼개서 구조화한다" },
    ],
  },
  {
    id: "main_03",
    category: "가치관",
    text: "새로운 규칙이나 변화가 생겼을 때 나는?",
    options: [
      { stone: "granite", label: "이유를 이해하면 바로 따른다" },
      { stone: "basalt", label: "일단 해보고 나서 판단한다" },
      {
        stone: "marble",
        label: "이 변화가 사람들에게 어떤 영향을 줄지 생각한다",
      },
      { stone: "gneiss", label: "이 변화가 논리적으로 타당한지 검토한다" },
    ],
  },
  {
    id: "main_04",
    category: "일상/감정",
    text: "오늘 하루 나를 가장 기분 좋게 만든 순간은?",
    options: [
      { stone: "granite", label: "계획한 일을 예정대로 끝냈을 때" },
      { stone: "basalt", label: "예상 못한 재미있는 일이 생겼을 때" },
      { stone: "marble", label: "누군가와 마음이 통했다고 느꼈을 때" },
      { stone: "gneiss", label: "궁금했던 걸 이해하게 됐을 때" },
    ],
  },
  {
    id: "main_05",
    category: "일상/감정",
    text: "최근 나의 머릿속을 가장 많이 차지하고 있는 생각은?",
    options: [
      { stone: "granite", label: "해야 할 일과 일정" },
      { stone: "basalt", label: "요즘 꽂힌 새로운 관심사" },
      { stone: "marble", label: "사람들과의 관계와 감정" },
      { stone: "gneiss", label: "풀리지 않는 궁금증이나 문제" },
    ],
  },
  {
    id: "main_06",
    category: "일상/감정",
    text: "예정에 없던 일정이 갑자기 생기면 나는?",
    options: [
      { stone: "granite", label: "원래 계획을 최대한 지키려 한다" },
      { stone: "basalt", label: "오히려 반갑고 즉흥적으로 움직인다" },
      { stone: "marble", label: "그 일이 관계에 미칠 영향을 먼저 생각한다" },
      { stone: "gneiss", label: "새 일정과 기존 일정을 재구성해본다" },
    ],
  },
  {
    id: "main_07",
    category: "관계/선택",
    text: "친구가 고민을 털어놓을 때 나는 어떻게 반응하는가?",
    options: [
      { stone: "granite", label: "해결할 수 있는 구체적 방법을 제안한다" },
      { stone: "basalt", label: "같이 기분 전환할 걸 찾아본다" },
      { stone: "marble", label: "그냥 옆에서 감정을 들어준다" },
      { stone: "gneiss", label: "문제의 원인을 같이 짚어본다" },
    ],
  },
  {
    id: "main_08",
    category: "관계/선택",
    text: "여러 선택지 중 내가 결정을 내리는 기준은?",
    options: [
      { stone: "granite", label: "기존에 검증된 안전한 방법" },
      { stone: "basalt", label: "그 순간 가장 끌리는 것" },
      { stone: "marble", label: "마음이 편한 쪽" },
      { stone: "gneiss", label: "가장 합리적인 근거가 있는 것" },
    ],
  },
  {
    id: "main_09",
    category: "관계/선택",
    text: "모임에서 나의 역할은 대체로?",
    options: [
      { stone: "granite", label: "일정과 진행을 챙기는 사람" },
      { stone: "basalt", label: "분위기를 띄우고 즉흥적으로 이끄는 사람" },
      { stone: "marble", label: "사람들 감정을 살피는 사람" },
      { stone: "gneiss", label: "논의 내용을 정리하는 사람" },
    ],
  },
  {
    id: "main_10",
    category: "자기인식",
    text: "나는 스스로를 어떤 사람이라고 생각하는가?",
    options: [
      { stone: "granite", label: "책임감 있고 신뢰할 수 있는 사람" },
      { stone: "basalt", label: "유연하고 적응 잘하는 사람" },
      { stone: "marble", label: "공감 잘하고 따뜻한 사람" },
      { stone: "gneiss", label: "논리적이고 분석적인 사람" },
    ],
  },
  {
    id: "main_11",
    category: "자기인식",
    text: "남들이 나에 대해 자주 하는 말은?",
    options: [
      { stone: "granite", label: "꼼꼼하다, 성실하다" },
      { stone: "basalt", label: "재밌다, 에너지 넘친다" },
      { stone: "marble", label: "다정하다, 배려심 있다" },
      { stone: "gneiss", label: "똑똑하다, 냉철하다" },
    ],
  },
  {
    id: "main_12",
    category: "회복/스트레스",
    text: "지치면 나는 무엇으로 회복하는가?",
    options: [
      { stone: "granite", label: "정해진 루틴을 지키며 안정을 찾는다" },
      { stone: "basalt", label: "몸을 움직이거나 새로운 자극을 찾는다" },
      { stone: "marble", label: "마음을 나눌 사람과 대화한다" },
      { stone: "gneiss", label: "혼자 생각을 정리할 시간을 갖는다" },
    ],
  },
];

// 타이브레이커 6쌍 (2지선다). id/pair는 STONE_ORDER 순서로 정규화 (evolve.md 4.2)
const TIEBREAKERS = [
  {
    id: "tb_granite_basalt",
    text: "급하게 결정해야 하는 순간, 나는?",
    options: [
      { stone: "granite", label: "원칙대로 신중하게 판단한다" },
      { stone: "basalt", label: "일단 감으로 빠르게 움직인다" },
    ],
  },
  {
    id: "tb_granite_marble",
    text: "중요한 일을 앞두고 나는?",
    options: [
      { stone: "granite", label: "계획과 순서를 먼저 정리한다" },
      { stone: "marble", label: "내 마음이 편한지를 먼저 살핀다" },
    ],
  },
  {
    id: "tb_granite_gneiss",
    text: "문제가 생기면 나는?",
    options: [
      { stone: "granite", label: "정해진 절차와 원칙을 따른다" },
      { stone: "gneiss", label: "문제의 구조와 원인을 파고든다" },
    ],
  },
  {
    id: "tb_basalt_marble",
    text: "감정이 격해지는 순간, 나는?",
    options: [
      { stone: "basalt", label: "바로 표현하고 행동으로 옮긴다" },
      { stone: "marble", label: "마음속으로 삭이며 헤아려본다" },
    ],
  },
  {
    id: "tb_basalt_gneiss",
    text: "새로운 도전 앞에서 나는?",
    options: [
      { stone: "basalt", label: "일단 뛰어들고 본다" },
      { stone: "gneiss", label: "먼저 원리를 이해하고 시작한다" },
    ],
  },
  {
    id: "tb_marble_gneiss",
    text: "어려운 문제를 마주하면 나는?",
    options: [
      { stone: "marble", label: "관련된 사람들의 마음을 먼저 생각한다" },
      { stone: "gneiss", label: "감정을 배제하고 논리로 접근한다" },
    ],
  },
];

const TB_BY_ID = Object.fromEntries(TIEBREAKERS.map((t) => [t.id, t]));

// 답변 히스토리 복원용: id → 질문(본 질문 + 타이브레이커).
const QUESTION_BY_ID = Object.fromEntries(
  [...MAIN_QUESTIONS, ...TIEBREAKERS].map((q) => [q.id, q]),
);

// 돌 종류별 성향 요약 문구·태그 (evolve.md 2장 성향 특성).
const STONE_TRAIT = {
  granite: {
    blurb: "원칙과 안정을 중시하는 단단한 성향이에요",
    tags: ["원칙주의", "안정 지향", "책임감"],
  },
  basalt: {
    blurb: "즉흥적이고 행동이 앞서는 성향이에요",
    tags: ["즉흥적", "행동 지향", "현재 중심"],
  },
  marble: {
    blurb: "공감과 감성을 중시하는 따뜻한 성향이에요",
    tags: ["이상주의", "공감", "감성 중심"],
  },
  gneiss: {
    blurb: "논리와 구조로 파고드는 분석형이에요",
    tags: ["논리", "전략", "구조적 사고"],
  },
};

// 저장된 답변 기록을 트레이 히스토리용으로 복원 (최근 답변이 먼저).
function buildHistory(data) {
  return data.questions.answeredQuestions
    .map((a) => {
      const q = QUESTION_BY_ID[a.questionId];
      if (!q) return null;
      const opt = q.options.find((o) => o.stone === a.selectedOption);
      return {
        text: q.text,
        label: opt ? opt.label : "",
        answeredAt: a.answeredAt,
      };
    })
    .filter(Boolean)
    .reverse();
}

// ---------- 노출 주기 / 스킵 상수 (evolve.md 6장) ----------
// PET_FAST_EVO=1이면 "하루=5초"로 압축해 알림 흐름을 빠르게 검증할 수 있다.
const DAY_MS = process.env.PET_FAST_EVO === "1" ? 5000 : 24 * 60 * 60 * 1000;
const EARLY_COUNT = 4; // 초반 4문항은 하루 간격
const LATER_INTERVAL = 2 * DAY_MS; // 이후 본 질문은 2일 간격
const EI_INTERVAL = 3 * DAY_MS; // 2단계 보조 E/I 질문은 3일 간격 (해당 기능 구현 시 사용, plan.md 6.1)

// ---------- 1→2단계(완전 변성체) 전환 게이트 조건 (evolve.md 3.3) ----------
// 세 조건 AND: 확정일로부터 45일 경과 + 누적 답변 20개 이상 + 보조 E/I 질문 4개 응답.
// PET_FAST_EVO에서는 DAY_MS가 5초로 압축되므로 45일 게이트도 함께 빨라진다.
const STAGE2_MIN_DAYS = 45; // 확정일로부터 최소 경과 일수
const STAGE2_MIN_ANSWERS = 20; // 누적 답변(본 질문+타이브레이커+E/I) 하한
const EI_QUESTION_COUNT = 4; // 보조 E/I 질문 개수 (모두 응답해야 함)

// 답변 수에 따른 다음 노출 간격(ms). 초반 4문항은 하루, 이후 본 질문은 2일 (plan.md 6.1).
// 초반 4문항(하루) + 이후 8문항(2일) → 12문항 완료까지 자연히 4일 이상 소요.
function questionInterval(answeredCount) {
  if (answeredCount < EARLY_COUNT) return DAY_MS;
  return LATER_INTERVAL;
}

// 다음 질문 노출 예정 시각 갱신. immediate면 다음 게이트에서 바로 노출
// (타이브레이커는 정기 주기를 기다리지 않고 즉시 편입, evolve.md 6.6)
function scheduleNext(data, nowIso, immediate) {
  const ms = immediate
    ? Date.parse(nowIso)
    : Date.parse(nowIso) +
      questionInterval(data.questions.mainQuestionProgress);
  data.questions.nextQuestionDueAt = new Date(ms).toISOString();
}

// 답변/패스 후 다음 노출 시각을 다시 잡는다 (확정됐으면 잡지 않음)
function rescheduleAfter(data, nowIso, confirmed) {
  if (confirmed) return;
  const nq = nextQuestion(data);
  scheduleNext(data, nowIso, !!(nq && nq.id.startsWith("tb_")));
}

// 지금 노출할 질문이 시간 조건상 준비됐는지. 활성/시간대/앱 조건은 호출부(main)에서 판단.
function isQuestionDue(data, nowMs) {
  if (data.pet.stoneType) return false;
  if (!nextQuestion(data)) return false;
  const due = data.questions.nextQuestionDueAt;
  return !due || nowMs >= Date.parse(due);
}

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
function nextTiebreaker(data) {
  const tied = tiedStones(data);
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

// 지금 사용자에게 보여줄 다음 질문 (없으면 null → 확정 준비 완료)
function nextQuestion(data) {
  if (data.pet.stoneType) return null;
  const progress = data.questions.mainQuestionProgress;
  if (progress < MAIN_QUESTIONS.length) return MAIN_QUESTIONS[progress];
  return nextTiebreaker(data);
}

function serialize(q) {
  if (!q) return null;
  return {
    id: q.id,
    kind: q.id.startsWith("tb_") ? "tiebreaker" : "main",
    text: q.text,
    options: q.options.map((o) => ({ stone: o.stone, label: o.label })),
  };
}

function getState(data) {
  const q = nextQuestion(data);
  return {
    stage: data.pet.evolutionStage,
    stoneType: data.pet.stoneType,
    progress: data.questions.mainQuestionProgress,
    total: MAIN_QUESTIONS.length,
    question: serialize(q),
    hasBadge: data.notifications.hasUnreadBadge,
    // 이미 사용자에게 노출된(예고됐거나 한 번 이상 패스한) 질문이 있어 지금 바로 답할 수 있는 상태.
    // 트레이 "질문에 답하기" 노출 조건. 아직 안 뜬 다음 질문은 제외해 노출 주기를 유지한다.
    awaitingAnswer:
      !!q &&
      (data.notifications.hasUnreadBadge ||
        data.questions.pendingQuestionId === q.id ||
        (data.questions.skippedQuestions[q.id] || 0) > 0),
    userName: data.user.userName,
    petName: data.pet.petName,
    affinityPoints: data.affinity.affinityPoints,
    blurb: data.pet.stoneType ? STONE_TRAIT[data.pet.stoneType].blurb : null,
    tags: data.pet.stoneType ? STONE_TRAIT[data.pet.stoneType].tags : [],
    history: buildHistory(data),
  };
}

function incrementScore(data, stone) {
  const ko = KO_BY_KEY[stone];
  if (ko) data.traits.traitScores[ko] += 1;
}

// 본 질문 12개 + 필요한 타이브레이커까지 끝났으면 돌 종류를 확정한다.
// 확정되면 stoneType을 반환, 아직이면 null.
function tryConfirm(data, now) {
  if (data.pet.stoneType) return null;
  if (data.questions.mainQuestionProgress < MAIN_QUESTIONS.length) return null;
  if (nextTiebreaker(data)) return null; // 아직 풀어야 할 동점이 남음

  const tied = tiedStones(data);
  let winner;
  if (tied.length === 1) {
    winner = tied[0];
  } else {
    // 타이브레이커를 다 썼는데도 동점 → 가장 최근 답변 기준 (evolve.md 5)
    const answered = data.questions.answeredQuestions;
    winner = answered[answered.length - 1].selectedOption;
  }

  data.pet.stoneType = winner;
  data.pet.stoneConfirmedAt = now;
  data.pet.evolutionStage = 1; // 0(rockie) → 1(돌 확정)
  return winner;
}

// 1→2단계(완전 변성체) 전환 게이트 판정 (evolve.md 3.3).
// 순수 계산만 하고 실제 전환/저장은 하지 않는다. E/I 질문 노출과 2단계 자산이
// 준비되면 이 결과(ready)로 전환을 발사하도록 호출부에서 연결한다(현재는 예약 로직).
// 반환: { ready, daysLeft, answersLeft, eiLeft } — 각 남은 값(0이면 해당 조건 충족).
function canEvolveToStage2(data, nowMs) {
  const confirmedAt = data.pet.stoneConfirmedAt;
  const elapsed = confirmedAt ? nowMs - Date.parse(confirmedAt) : 0;
  const daysLeft = Math.max(
    0,
    Math.ceil((STAGE2_MIN_DAYS * DAY_MS - elapsed) / DAY_MS),
  );
  const answersLeft = Math.max(
    0,
    STAGE2_MIN_ANSWERS - data.questions.answeredQuestions.length,
  );
  const eiAnswered =
    data.traits.eiScores["외향"] + data.traits.eiScores["내향"];
  const eiLeft = Math.max(0, EI_QUESTION_COUNT - eiAnswered);

  const ready =
    data.pet.evolutionStage === 1 &&
    daysLeft === 0 &&
    answersLeft === 0 &&
    eiLeft === 0;
  return { ready, daysLeft, answersLeft, eiLeft };
}

// 답변 1건 처리 → 점수 반영 + 확정 시도. { confirmed, state } 반환.
function answer(data, { questionId, stone }) {
  if (data.pet.stoneType) return { confirmed: null, state: getState(data) };
  const now = new Date().toISOString();
  const isTb = questionId.startsWith("tb_");

  incrementScore(data, stone);
  data.questions.answeredQuestions.push({
    questionId,
    category: isTb
      ? "타이브레이커"
      : (MAIN_QUESTIONS[data.questions.mainQuestionProgress]?.category ?? null),
    selectedOption: stone,
    answeredAt: now,
  });

  if (isTb) {
    const key = questionId.slice(3);
    if (!data.traits.tiebreaker.pairsAsked.includes(key)) {
      data.traits.tiebreaker.pairsAsked.push(key);
    }
    data.traits.tiebreaker.used = true;
  } else {
    data.questions.mainQuestionProgress += 1;
  }
  delete data.questions.skippedQuestions[questionId]; // 답했으면 연속 패스 기록 초기화
  data.questions.pendingQuestionId = null; // 응답 완료 → 다음 질문 재노출 가능

  const confirmed = tryConfirm(data, now);
  rescheduleAfter(data, now, confirmed);
  return { confirmed, state: getState(data) };
}

// "지금은 패스" 처리. 사용자는 모든 질문에 답해야 하므로 풀에서 제외하지 않고,
// 다음 노출 기회로 미루기만 한다(패스 횟수는 기록). 타이브레이커도 동일.
function skip(data, questionId) {
  if (data.pet.stoneType) return { confirmed: null, state: getState(data) };
  const now = new Date().toISOString();
  const skipped = data.questions.skippedQuestions;
  skipped[questionId] = (skipped[questionId] || 0) + 1;
  data.questions.pendingQuestionId = null; // 다음 기회에 재노출 가능

  rescheduleAfter(data, now, false);
  return { confirmed: null, state: getState(data) };
}

module.exports = {
  getState,
  answer,
  skip,
  isQuestionDue,
  canEvolveToStage2,
  STONE_ORDER,
};
