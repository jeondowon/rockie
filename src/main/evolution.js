// 진화 판정 엔진 (update.md 기준 v2).
// - 0→1: 본 질문 12개 → 돌 종류 확정 (동점 시 타이브레이커)
// - 1→2: E/I 질문 12개 → 변성체 변형(extrovert/introvert) 확정 (동점 시 타이브레이커)
// - 2→3: 호감도 90 도달 → 보석 확정 (질문 없음, 호감도 트리거)
// 질문은 매일 오전 8시에 최대 2개를 뽑아 todaysQuestions에 채우고, 사용자가
// 트레이 버튼으로 능동적으로 답한다(정기 알림/강제 노출 없음).
// 순수 데이터 + 계산만 담당하고, 저장은 호출부(main)에서 store로 처리한다.

// ---------- 상수 (update.md 2장) ----------
const MAIN_QUESTION_COUNT = 12; // 0→1 본 질문 총 개수
const EI_QUESTION_COUNT = 12; // 1→2 E/I 질문 총 개수
const MAX_DAILY_QUESTIONS = 2; // 하루 최대 답변 가능 수
const AFFINITY_TARGET = 90; // 2→3 진화 필요 호감도
const CLEAN_POINTS = 2; // 닦아주기 획득 점수
const FEED_POINTS = 2; // 밥주기 획득 점수
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

// 본 질문 12개. options 순서 = 화강암/현무암/대리석/편마암 (update.md 5.1)
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

// 본 질문 타이브레이커 6쌍 (2지선다). id/pair는 STONE_ORDER 순서로 정규화 (update.md 5.1)
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

// E/I 질문 12개 (update.md 4.1~4.2). options 순서 = 외향/내향.
const EI_QUESTIONS = [
  {
    id: "ei_01",
    category: "힘든 하루",
    text: "힘든 하루를 보낸 날, 나는 주로?",
    options: [
      { axis: "외향", label: "친구를 만나거나 연락해서 푼다" },
      { axis: "내향", label: "혼자 조용히 시간을 보내며 정리한다" },
    ],
  },
  {
    id: "ei_02",
    category: "새로운 사람들",
    text: "새로운 사람들 사이에 있을 때 나는?",
    options: [
      { axis: "외향", label: "먼저 말을 걸고 분위기를 만든다" },
      { axis: "내향", label: "상황을 지켜보다 편해지면 다가간다" },
    ],
  },
  {
    id: "ei_03",
    category: "생각 정리",
    text: "생각이 많아질 때 나는?",
    options: [
      { axis: "외향", label: "누군가에게 이야기하며 정리한다" },
      { axis: "내향", label: "글로 쓰거나 혼자 되짚어본다" },
    ],
  },
  {
    id: "ei_04",
    category: "에너지 충전",
    text: "에너지가 채워지는 순간은?",
    options: [
      { axis: "외향", label: "사람들과 함께 있을 때" },
      { axis: "내향", label: "혼자만의 시간을 가질 때" },
    ],
  },
  {
    id: "ei_05",
    category: "휴일 계획",
    text: "오랜만에 아무 일정 없는 하루, 나는?",
    options: [
      { axis: "외향", label: "누군가에게 연락해서 약속을 잡는다" },
      { axis: "내향", label: "집에서 혼자만의 시간을 보낸다" },
    ],
  },
  {
    id: "ei_06",
    category: "정보 수집 방식",
    text: "관심 있는 주제를 알아볼 때 나는?",
    options: [
      { axis: "외향", label: "관련된 사람에게 물어보며 배운다" },
      { axis: "내향", label: "자료를 찾아 혼자 파고든다" },
    ],
  },
  {
    id: "ei_07",
    category: "감정 표현 방식",
    text: "좋은 일이 생겼을 때 나는?",
    options: [
      { axis: "외향", label: "바로 누군가에게 알리고 함께 기뻐한다" },
      { axis: "내향", label: "혼자 조용히 그 순간을 음미한다" },
    ],
  },
  {
    id: "ei_08",
    category: "회복 방식",
    text: "큰 실수나 실패를 겪은 후 나는?",
    options: [
      { axis: "외향", label: "가까운 사람과 이야기하며 털어낸다" },
      { axis: "내향", label: "조용한 곳에서 스스로 정리한다" },
    ],
  },
  {
    id: "ei_09",
    category: "작업 환경 선호",
    text: "집중해서 일해야 할 때 나는?",
    options: [
      { axis: "외향", label: "카페처럼 사람이 있는 곳이 편하다" },
      { axis: "내향", label: "조용하고 방해받지 않는 곳이 편하다" },
    ],
  },
  {
    id: "ei_10",
    category: "대화 스타일",
    text: "대화 중 자연스러운 나의 역할은?",
    options: [
      { axis: "외향", label: "말을 이어가며 화제를 넓힌다" },
      { axis: "내향", label: "상대의 이야기를 듣고 깊이 반응한다" },
    ],
  },
  {
    id: "ei_11",
    category: "낯선 상황 대응",
    text: "여행지에서 길을 잃었을 때 나는?",
    options: [
      { axis: "외향", label: "근처 사람에게 바로 물어본다" },
      { axis: "내향", label: "지도를 보며 직접 방향을 찾는다" },
    ],
  },
  {
    id: "ei_12",
    category: "주말 저녁",
    text: "금요일 밤이 되면 나는?",
    options: [
      { axis: "외향", label: "사람들과 함께 있는 자리가 그립다" },
      { axis: "내향", label: "혼자 편하게 쉬는 시간이 좋다" },
    ],
  },
];

// E/I 타이브레이커 (6:6 동점 시 1개만 노출, update.md 4.3)
const EI_TIEBREAKER = {
  id: "eitb_01",
  category: "타이브레이커",
  text: "하루가 끝나갈 무렵, 진짜 내가 원하는 마무리는?",
  options: [
    { axis: "외향", label: "좋아하는 사람과 시간을 보내는 것" },
    { axis: "내향", label: "혼자만의 시간을 갖는 것" },
  ],
};

// 답변 히스토리 복원용: id → 질문(모든 종류).
const QUESTION_BY_ID = Object.fromEntries(
  [...MAIN_QUESTIONS, ...TIEBREAKERS, ...EI_QUESTIONS, EI_TIEBREAKER].map(
    (q) => [q.id, q],
  ),
);

// 옵션이 담고 있는 판정 값(돌 종류 또는 E/I 축)을 반환. 저장·판정·복원에서 공통 사용.
function optValue(o) {
  return o.stone ?? o.axis;
}

// 돌 종류별 성향 요약 문구·태그.
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
  if (data.pet.evolutionStage >= 2) {
    data.questions.todaysQuestions = [];
  }
  const remaining = data.questions.todaysQuestions;
  const need = MAX_DAILY_QUESTIONS - remaining.length;
  if (need > 0) {
    data.questions.todaysQuestions = remaining.concat(
      pickNextQuestions(data, need),
    );
  }
  data.affinity.dailyCleanDone = false;
  data.affinity.dailyFeedDone = false;
  data.notifications.hasUnreadBadge =
    data.pet.evolutionStage < 2 && data.questions.todaysQuestions.length > 0;
  data.questions.dailyResetAt = nowIso;
  return { showBanner: data.questions.todaysQuestions.length > 0 };
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
    data.questions.todaysQuestions.push(...pickNextQuestions(data, n));
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
  return { completed: pending, state: getState(data) };
}

// ---------- 판정 시도 (update.md 8.3) ----------
function tryEvaluate(data, nowIso) {
  if (
    data.pet.evolutionStage === 0 &&
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

// 닦아주기/밥주기: 하루 1회 제한. 진화가 일어났으면 evolved에 새 단계 번호.
function cleanPet(data) {
  const before = data.pet.evolutionStage;
  if (!data.affinity.dailyCleanDone) {
    data.affinity.dailyCleanDone = true;
    awardAffinity(data, CLEAN_POINTS);
    tryAffinityEvaluate(data);
  }
  return {
    evolved:
      data.pet.evolutionStage !== before ? data.pet.evolutionStage : null,
    state: getState(data),
  };
}

function feedPet(data) {
  const before = data.pet.evolutionStage;
  if (!data.affinity.dailyFeedDone) {
    data.affinity.dailyFeedDone = true;
    awardAffinity(data, FEED_POINTS);
    tryAffinityEvaluate(data);
  }
  return {
    evolved:
      data.pet.evolutionStage !== before ? data.pet.evolutionStage : null,
    state: getState(data),
  };
}

// ---------- 답변 제출 (update.md 8.3) ----------
// { evolved, state } 반환. evolved는 이번 답변으로 올라간 단계 번호(없으면 null).
function answer(data, { questionId, value }) {
  const q = QUESTION_BY_ID[questionId];
  if (!q) return { evolved: null, state: getState(data) };
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
        : "main";
  return {
    id,
    kind,
    text: q.text,
    options: q.options.map((o) => ({ value: optValue(o), label: o.label })),
  };
}

// "새로운 질문에 답하기" 버튼 상태 (update.md 9.1)
function answerButtonState(data) {
  if (data.pet.evolutionStage >= 2) {
    return { enabled: false, note: "질문을 모두 마쳤어요." };
  }
  if (data.questions.todaysQuestions.length > 0) {
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
  // 진행도는 현재 트랙 기준: 0단계=본 질문, 1단계=E/I, 2단계 이상=완료
  let progress = MAIN_QUESTION_COUNT;
  let total = MAIN_QUESTION_COUNT;
  if (stage === 0) {
    progress = data.questions.mainQuestionProgress;
    total = MAIN_QUESTION_COUNT;
  } else if (stage === 1) {
    progress = data.questions.eiQuestionProgress;
    total = EI_QUESTION_COUNT;
  }
  return {
    stage,
    stoneType,
    variant: data.pet.evolutionVariant,
    progress,
    total,
    question: serialize(data.questions.todaysQuestions[0]),
    answerButton: answerButtonState(data),
    hasBadge: data.notifications.hasUnreadBadge,
    userName: data.user.userName,
    petName: data.pet.petName,
    affinityPoints: data.affinity.affinityPoints,
    dailyCleanDone: data.affinity.dailyCleanDone,
    dailyFeedDone: data.affinity.dailyFeedDone,
    pendingEvolution: data.pet.pendingEvolution,
    blurb: stoneType ? STONE_TRAIT[stoneType].blurb : null,
    tags: stoneType ? STONE_TRAIT[stoneType].tags : [],
    history: buildHistory(data),
  };
}

module.exports = {
  getState,
  answer,
  cleanPet,
  feedPet,
  completePendingEvolution,
  onDailyReset,
  STONE_ORDER,
};
