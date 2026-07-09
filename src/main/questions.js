// 성향 질문 데이터 (update.md 4~5장). 판정 로직은 evolution.js가 담당한다.
// - MAIN_QUESTIONS: 0→1 본 질문 12개 (4지선다, 돌 종류 점수)
// - TIEBREAKERS: 본 질문 동점 시 쌍별 타이브레이커 6개 (2지선다)
// - EI_QUESTIONS: 1→2 E/I 질문 12개 (2지선다, 외향/내향 점수)
// - EI_TIEBREAKER: E/I 6:6 동점 시 1개

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

module.exports = {
  MAIN_QUESTIONS,
  TIEBREAKERS,
  EI_QUESTIONS,
  EI_TIEBREAKER,
};
