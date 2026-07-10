// 성향 질문 데이터. 판정 로직은 evolution.js가 담당한다.
// - ONBOARDING_QUESTIONS: 첫 실행 프롤로그 질문 4개. 0→1 점수에 반영한다.
// - MAIN_QUESTIONS: 0→1 본 질문 12개. 온보딩 완료 후 일일 질문으로 보여준다.
// - TIEBREAKERS: 본 질문 동점 시 쌍별 타이브레이커.
// - EI_QUESTIONS: 1→2 E/I 질문. E/I만 과하게 길어지지 않도록 6개로 둔다.
// - EI_TIEBREAKER: E/I 동점 시 1개.

// options 순서 = 화강암/현무암/대리석/편마암.
// traitTag는 카테고리별 성향 요약 태그 산정에 사용한다.
const ONBOARDING_QUESTIONS = [
  {
    id: "onboarding_01",
    category: "첫 반응",
    situation:
      "쿵! 갑자기 눈앞에 정체불명의 운석이 떨어졌어요. 아직 연기가 조금 피어오르고, 주변은 조용합니다.",
    text: "가장 먼저 어떻게 할까요?",
    options: [
      { stone: "granite", traitTag: "안전 확인형", label: "주변이 안전한지 확인하고 천천히 다가간다" },
      { stone: "basalt", traitTag: "직접 탐색형", label: "일단 가까이 가서 직접 살펴본다" },
      { stone: "marble", traitTag: "보호 본능형", label: "혹시 안에 무언가 다친 건 아닌지 걱정된다" },
      { stone: "gneiss", traitTag: "흔적 분석형", label: "떨어진 방향과 흔적을 보고 정체를 추측한다" },
    ],
  },
  {
    id: "onboarding_02",
    category: "호기심",
    situation:
      "운석 안쪽에서 아주 작은 소리가 계속 들립니다. ....달그락... 달그락...",
    text: "이 소리를 들은 나는?",
    options: [
      { stone: "granite", traitTag: "신중 관찰형", label: "섣불리 건드리지 않고 상태를 더 지켜본다" },
      { stone: "basalt", traitTag: "즉시 확인형", label: "두근거려서 바로 확인해보고 싶다" },
      { stone: "marble", traitTag: "구출 지향형", label: "안에 갇힌 존재가 있다면 꺼내주고 싶다" },
      { stone: "gneiss", traitTag: "패턴 추론형", label: "소리의 간격과 방향을 살펴 안쪽 구조를 상상한다" },
    ],
  },
  {
    id: "onboarding_03",
    category: "변화 대응",
    situation:
      "쩌적... 쩌적... 운석 표면에 금이 가기 시작합니다. 곧 안쪽의 무언가가 밖으로 나올 것 같아요.",
    text: "나는 무엇을 준비할까요?",
    options: [
      { stone: "granite", traitTag: "거리 확보형", label: "조각이 튈 수 있으니 안전한 거리를 확보한다" },
      { stone: "basalt", traitTag: "순간 대응형", label: "바로 받아낼 수 있게 가까이에서 기다린다" },
      { stone: "marble", traitTag: "안심 유도형", label: "놀라지 않도록 조용히 말을 걸어본다" },
      { stone: "gneiss", traitTag: "균열 관찰형", label: "금이 퍼지는 모양을 보고 어느 쪽이 열릴지 본다" },
    ],
  },
  {
    id: "onboarding_04",
    category: "첫 관계",
    situation:
      "운석이 갈라지고, 그 안에서 작은 조약돌이 나타났어요. 조약돌이 조심스럽게 말합니다. “헉! 안녕하세요, 주인님!”",
    text: "나는 어떻게 대답할까요?",
    options: [
      { stone: "granite", traitTag: "보호 책임형", label: "괜찮아? 우선 안전한 곳으로 가자" },
      { stone: "basalt", traitTag: "활기 반응형", label: "우와, 너 진짜 살아있는 돌이야?" },
      { stone: "marble", traitTag: "따뜻한 환대형", label: "많이 무서웠지? 이제 괜찮아" },
      { stone: "gneiss", traitTag: "정체 탐구형", label: "너는 어디서 왔고, 어떻게 말할 수 있어?" },
    ],
  },
];

const MAIN_QUESTIONS = [
  {
    id: "main_01",
    category: "계획/실행",
    situation:
      "한 달 뒤 중요한 발표가 있어요. 자료 조사, 슬라이드, 연습까지 해야 해서 할 일이 꽤 많습니다.",
    text: "나는 준비를 어떻게 시작할까요?",
    options: [
      { stone: "granite", traitTag: "계획 완수형", label: "마감일까지의 일정을 먼저 쪼갠다" },
      { stone: "basalt", traitTag: "시작 우선형", label: "일단 자료를 열고 손이 가는 것부터 시작한다" },
      { stone: "marble", traitTag: "메시지 중심형", label: "듣는 사람에게 어떤 인상을 줄지 먼저 생각한다" },
      { stone: "gneiss", traitTag: "전략 설계형", label: "핵심 주장과 근거 구조를 먼저 잡는다" },
    ],
  },
  {
    id: "main_02",
    category: "관계/협업",
    situation:
      "친구가 고민을 털어놓고 있어요. 해결책을 원하는지, 그냥 들어주길 원하는지 바로 알기 어렵습니다.",
    text: "나는 어떻게 반응할까요?",
    options: [
      { stone: "granite", traitTag: "실질 지원형", label: "필요하면 같이 해결 방법을 정리해주겠다고 말한다" },
      { stone: "basalt", traitTag: "활력 전환형", label: "기분이 조금 풀릴 만한 일을 함께 찾아본다" },
      { stone: "marble", traitTag: "공감 경청형", label: "먼저 충분히 들어주고 감정을 받아준다" },
      { stone: "gneiss", traitTag: "맥락 파악형", label: "상황의 원인과 선택지를 차분히 짚어본다" },
    ],
  },
  {
    id: "main_03",
    category: "가치관",
    situation:
      "새로운 규칙이 생겼는데, 효율은 좋아질 것 같지만 누군가에게는 꽤 불편할 수도 있어요.",
    text: "내가 가장 먼저 확인하고 싶은 것은?",
    options: [
      { stone: "granite", traitTag: "기준 신뢰형", label: "규칙이 공정하고 일관되게 적용되는지" },
      { stone: "basalt", traitTag: "현실 대응형", label: "실제로 해봤을 때 잘 굴러가는지" },
      { stone: "marble", traitTag: "사람 우선형", label: "불편을 겪는 사람이 얼마나 되는지" },
      { stone: "gneiss", traitTag: "타당성 검증형", label: "규칙의 근거가 충분히 논리적인지" },
    ],
  },
  {
    id: "main_04",
    category: "일상/감정",
    situation:
      "오랜만에 아무 일정이 없는 휴일이에요. 해야 하는 일도 조금 있지만, 마음은 쉬고 싶어 합니다.",
    text: "가장 편하게 느껴지는 선택은?",
    options: [
      { stone: "granite", traitTag: "안정 루틴형", label: "정리할 일을 끝내고 마음 편히 쉰다" },
      { stone: "basalt", traitTag: "즉흥 충전형", label: "그날 끌리는 곳이나 활동을 따라간다" },
      { stone: "marble", traitTag: "정서 충전형", label: "좋아하는 사람이나 콘텐츠로 마음을 채운다" },
      { stone: "gneiss", traitTag: "몰입 충전형", label: "혼자 깊이 몰입할 주제를 잡는다" },
    ],
  },
  {
    id: "main_05",
    category: "문제해결",
    situation:
      "팀 프로젝트에서 자료가 너무 많이 모였어요. 좋은 내용도 많지만, 발표 시간은 짧습니다.",
    text: "나는 무엇부터 하자고 말할까요?",
    options: [
      { stone: "granite", traitTag: "우선순위 정리형", label: "필수 내용과 선택 내용을 나누자" },
      { stone: "basalt", traitTag: "핵심 체감형", label: "일단 말해보면서 반응 좋은 내용을 고르자" },
      { stone: "marble", traitTag: "청중 공감형", label: "듣는 사람이 이해하기 쉬운 흐름을 고르자" },
      { stone: "gneiss", traitTag: "논증 구조형", label: "주장과 근거가 이어지는 구조를 만들자" },
    ],
  },
  {
    id: "main_06",
    category: "계획/실행",
    situation:
      "친구들이 갑자기 여행을 가자고 해요. 날짜는 맞지만, 숙소나 예산은 아직 거의 정해지지 않았습니다.",
    text: "내 마음에 가까운 반응은?",
    options: [
      { stone: "granite", traitTag: "준비 안정형", label: "큰 항목은 정하고 가야 마음이 편하다" },
      { stone: "basalt", traitTag: "즉흥 실행형", label: "이런 건 타이밍이니까 일단 가보고 싶다" },
      { stone: "marble", traitTag: "동행 조율형", label: "같이 가는 사람들이 편한지가 제일 중요하다" },
      { stone: "gneiss", traitTag: "조건 비교형", label: "예산, 이동, 일정의 장단점을 비교해보고 싶다" },
    ],
  },
  {
    id: "main_07",
    category: "관계/협업",
    situation:
      "모임에서 의견이 둘로 갈렸고, 말수가 적은 사람들은 아직 자기 생각을 말하지 않았어요.",
    text: "나는 어떤 역할을 하게 될 가능성이 클까요?",
    options: [
      { stone: "granite", traitTag: "진행 조율형", label: "결정해야 할 기준과 순서를 잡는다" },
      { stone: "basalt", traitTag: "대화 촉진형", label: "어색함을 깨고 편하게 말하게 만든다" },
      { stone: "marble", traitTag: "목소리 배려형", label: "말하지 못한 사람의 의견도 챙긴다" },
      { stone: "gneiss", traitTag: "쟁점 정리형", label: "양쪽 의견의 핵심 차이를 정리한다" },
    ],
  },
  {
    id: "main_08",
    category: "가치관",
    situation:
      "누군가 빠르게 성공하는 모습을 봤어요. 멋져 보이지만, 그 과정이 조금 불안정해 보이기도 합니다.",
    text: "나는 어떤 성공이 더 마음에 드나요?",
    options: [
      { stone: "granite", traitTag: "꾸준 성장형", label: "느려도 오래 갈 수 있는 안정적인 성공" },
      { stone: "basalt", traitTag: "기회 포착형", label: "순간을 잡아 크게 도약하는 성공" },
      { stone: "marble", traitTag: "가치 실현형", label: "내가 중요하게 여기는 의미를 지키는 성공" },
      { stone: "gneiss", traitTag: "체계 구축형", label: "원리와 시스템을 만들어내는 성공" },
    ],
  },
  {
    id: "main_09",
    category: "일상/감정",
    situation:
      "하루 종일 여러 사람을 만나고 돌아왔어요. 즐거웠지만 은근히 피곤함도 남아 있습니다.",
    text: "집에 도착한 뒤 가장 먼저 하고 싶은 것은?",
    options: [
      { stone: "granite", traitTag: "생활 정돈형", label: "씻고 정리하며 원래 리듬으로 돌아온다" },
      { stone: "basalt", traitTag: "여운 확장형", label: "오늘 있었던 재미있는 일을 더 떠올린다" },
      { stone: "marble", traitTag: "감정 음미형", label: "좋았던 말과 마음을 천천히 곱씹는다" },
      { stone: "gneiss", traitTag: "내면 정리형", label: "혼자 있으면서 생각을 차분히 정리한다" },
    ],
  },
  {
    id: "main_10",
    category: "문제해결",
    situation:
      "처음 보는 장비를 써야 합니다. 설명서는 길고, 옆 사람은 그냥 눌러보면 된다고 해요.",
    text: "나는 어떻게 익히는 편인가요?",
    options: [
      { stone: "granite", traitTag: "매뉴얼 확인형", label: "기본 사용법을 먼저 읽고 따라 한다" },
      { stone: "basalt", traitTag: "체험 학습형", label: "직접 만져보며 감을 잡는다" },
      { stone: "marble", traitTag: "사용자 관찰형", label: "다른 사람이 어디서 어려워하는지 보며 배운다" },
      { stone: "gneiss", traitTag: "원리 이해형", label: "왜 그렇게 작동하는지 구조를 이해한다" },
    ],
  },
  {
    id: "main_11",
    category: "계획/실행",
    situation:
      "해야 할 일이 세 개나 겹쳤어요. 하나는 급하고, 하나는 중요하고, 하나는 하고 싶은 일입니다.",
    text: "내 선택 기준에 가장 가까운 것은?",
    options: [
      { stone: "granite", traitTag: "책임 우선형", label: "마감과 책임이 분명한 일부터 한다" },
      { stone: "basalt", traitTag: "에너지 우선형", label: "지금 가장 탄력 받을 수 있는 일부터 한다" },
      { stone: "marble", traitTag: "마음 균형형", label: "내 마음이 무너지지 않을 순서를 고른다" },
      { stone: "gneiss", traitTag: "효율 최적형", label: "전체 결과가 가장 좋아지는 순서를 계산한다" },
    ],
  },
  {
    id: "main_12",
    category: "자기인식",
    situation:
      "가까운 사람이 나의 장점을 한 문장으로 말해준다고 해요. 어떤 말을 들으면 가장 나답다고 느낄까요?",
    text: "내가 가장 고개를 끄덕일 말은?",
    options: [
      { stone: "granite", traitTag: "신뢰형", label: "너는 맡은 일을 끝까지 해내는 사람이야" },
      { stone: "basalt", traitTag: "SP 감각형", label: "너는 상황을 즐기고 빠르게 움직이는 사람이야" },
      { stone: "marble", traitTag: "NF 공감형", label: "너는 사람의 마음과 의미를 잘 보는 사람이야" },
      { stone: "gneiss", traitTag: "NJ 전략형", label: "너는 흐름을 읽고 구조를 세우는 사람이야" },
    ],
  },
];

const TIEBREAKERS = [
  {
    id: "tb_granite_basalt",
    category: "타이브레이커",
    situation: "결정 시간이 거의 남지 않았고, 둘 중 하나를 바로 골라야 합니다.",
    text: "나는 어느 쪽에 더 가까울까요?",
    options: [
      { stone: "granite", label: "원칙대로 신중하게 판단한다" },
      { stone: "basalt", label: "일단 감으로 빠르게 움직인다" },
    ],
  },
  {
    id: "tb_granite_marble",
    category: "타이브레이커",
    situation: "중요한 일을 앞두고 계획과 마음의 편안함이 서로 부딪히고 있어요.",
    text: "나는 무엇을 먼저 챙길까요?",
    options: [
      { stone: "granite", label: "계획과 순서를 먼저 정리한다" },
      { stone: "marble", label: "내 마음이 편한지를 먼저 살핀다" },
    ],
  },
  {
    id: "tb_granite_gneiss",
    category: "타이브레이커",
    situation: "문제가 생겼고, 기존 절차도 있지만 더 깊은 원인도 궁금합니다.",
    text: "내가 먼저 붙잡는 쪽은?",
    options: [
      { stone: "granite", label: "정해진 절차와 원칙을 따른다" },
      { stone: "gneiss", label: "문제의 구조와 원인을 파고든다" },
    ],
  },
  {
    id: "tb_basalt_marble",
    category: "타이브레이커",
    situation: "감정이 크게 움직이는 순간이에요. 바로 표현할 수도, 안쪽에서 살필 수도 있습니다.",
    text: "나는 어느 쪽에 더 가까울까요?",
    options: [
      { stone: "basalt", label: "바로 표현하고 행동으로 옮긴다" },
      { stone: "marble", label: "마음속으로 삭이며 헤아려본다" },
    ],
  },
  {
    id: "tb_basalt_gneiss",
    category: "타이브레이커",
    situation: "새로운 도전이 눈앞에 있어요. 해보며 배울 수도, 원리를 먼저 볼 수도 있습니다.",
    text: "나는 어떻게 시작할까요?",
    options: [
      { stone: "basalt", label: "일단 뛰어들고 본다" },
      { stone: "gneiss", label: "먼저 원리를 이해하고 시작한다" },
    ],
  },
  {
    id: "tb_marble_gneiss",
    category: "타이브레이커",
    situation: "어려운 문제에 사람들의 마음과 논리적인 판단이 함께 얽혀 있어요.",
    text: "나는 무엇을 더 먼저 볼까요?",
    options: [
      { stone: "marble", label: "관련된 사람들의 마음을 먼저 생각한다" },
      { stone: "gneiss", label: "감정을 배제하고 논리로 접근한다" },
    ],
  },
];

const EI_QUESTIONS = [
  {
    id: "ei_01",
    category: "에너지",
    situation:
      "힘든 하루가 끝났어요. 몸은 피곤하지만 마음을 회복할 방법은 필요합니다.",
    text: "나는 어떤 방식으로 에너지를 되찾나요?",
    options: [
      { axis: "외향", traitTag: "사람 충전형", label: "좋아하는 사람과 이야기하며 풀어낸다" },
      { axis: "내향", traitTag: "혼자 충전형", label: "혼자 조용히 시간을 보내며 정리한다" },
    ],
  },
  {
    id: "ei_02",
    category: "관계 시작",
    situation:
      "처음 보는 사람들이 모인 자리입니다. 대화는 아직 시작되지 않았고 다들 눈치를 보고 있어요.",
    text: "나는 보통 어떻게 움직이나요?",
    options: [
      { axis: "외향", traitTag: "먼저 연결형", label: "먼저 말을 걸고 분위기를 만든다" },
      { axis: "내향", traitTag: "관찰 진입형", label: "상황을 지켜보다 편해지면 다가간다" },
    ],
  },
  {
    id: "ei_03",
    category: "생각 정리",
    situation:
      "머릿속에 생각이 많아져서 정리가 필요합니다. 혼자 붙잡을 수도, 밖으로 꺼낼 수도 있어요.",
    text: "내게 더 자연스러운 정리 방식은?",
    options: [
      { axis: "외향", traitTag: "대화 정리형", label: "누군가에게 이야기하며 정리한다" },
      { axis: "내향", traitTag: "내면 정리형", label: "글로 쓰거나 혼자 되짚어본다" },
    ],
  },
  {
    id: "ei_04",
    category: "작업 환경",
    situation:
      "집중해서 작업해야 합니다. 주변에 사람이 있는 공간과 완전히 조용한 공간 중 고를 수 있어요.",
    text: "나는 어디서 더 집중이 잘 되나요?",
    options: [
      { axis: "외향", traitTag: "활기 집중형", label: "카페처럼 적당히 사람이 있는 곳" },
      { axis: "내향", traitTag: "고요 집중형", label: "방해받지 않는 조용한 곳" },
    ],
  },
  {
    id: "ei_05",
    category: "표현 방식",
    situation:
      "좋은 일이 생겼어요. 아직 아무에게도 말하지 않았지만 기분이 꽤 좋습니다.",
    text: "나는 이 기쁨을 어떻게 다루나요?",
    options: [
      { axis: "외향", traitTag: "표현 확장형", label: "바로 누군가에게 알리고 함께 기뻐한다" },
      { axis: "내향", traitTag: "감정 음미형", label: "혼자 조용히 그 순간을 음미한다" },
    ],
  },
  {
    id: "ei_06",
    category: "낯선 상황",
    situation:
      "여행지에서 길을 잃었어요. 주변에는 사람이 있고, 휴대폰 지도도 켤 수 있습니다.",
    text: "나는 먼저 무엇을 할까요?",
    options: [
      { axis: "외향", traitTag: "외부 연결형", label: "근처 사람에게 바로 물어본다" },
      { axis: "내향", traitTag: "자체 탐색형", label: "지도를 보며 직접 방향을 찾는다" },
    ],
  },
];

const EI_TIEBREAKER = {
  id: "eitb_01",
  category: "타이브레이커",
  situation:
    "하루가 거의 끝났습니다. 오늘의 마지막 시간을 어떻게 보낼지 고를 수 있어요.",
  text: "진짜 내가 원하는 마무리는?",
  options: [
    { axis: "외향", label: "좋아하는 사람과 시간을 보내는 것" },
    { axis: "내향", label: "혼자만의 시간을 갖는 것" },
  ],
};

module.exports = {
  ONBOARDING_QUESTIONS,
  MAIN_QUESTIONS,
  TIEBREAKERS,
  EI_QUESTIONS,
  EI_TIEBREAKER,
};
