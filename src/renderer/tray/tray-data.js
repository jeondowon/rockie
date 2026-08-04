// tray.js에서 사용하는 데이터성 문구·플로우 정의.
// 트레이 HTML에서 tray.js보다 먼저 로드한다. (pet.js ↔ pet-data.js와 같은 관례)

function lines(...parts) {
  return parts.join("\n");
}

// 2단계 변성체 이름 (돌 종류 × 외향/내향)
const VARIANT_NAMES = {
  granite: {
    introvert: "페그마타이트 (아쿠아마린 결정핵)",
    extrovert: "페그마타이트 (토파즈 결정군)",
  },
  basalt: {
    introvert: "에클로자이트 (심부 결정핵)",
    extrovert: "에클로자이트 (압력 결정맥)",
  },
  marble: {
    introvert: "코런덤 대리석 (루비핵)",
    extrovert: "코런덤 대리석 (색대 코런덤맥)",
  },
  gneiss: {
    introvert: "미그마타이트 (정렬된 장석맥)",
    extrovert: "미그마타이트 (소용돌이 장석맥)",
  },
};

// 3단계 보석 이름 (돌 종류 × 외향/내향)
const GEM_NAMES = {
  granite: { extrovert: "토파즈", introvert: "아쿠아마린" },
  basalt: {
    extrovert: "브릴리언트 컷 다이아몬드",
    introvert: "원석 다이아몬드",
  },
  marble: { extrovert: "파티 사파이어", introvert: "루비" },
  gneiss: { extrovert: "라브라도라이트", introvert: "문스톤" },
};

const TRAIT_DESCRIPTIONS = {
  rockie: lines(
    "조약돌은 모든 Rockie 돌들의 기본 형태입니다.",
    "잠재력을 발견하고 새로운 형태를 찾아보세요!",
  ),
  granite: {
    stage1: lines(
      "화강암은 오랜 시간에 걸쳐 천천히 다져진",
      "단단함을 가진 돌이에요. 흔들리지 않는 원칙과",
      "꾸준함을 지닌 성향과 잘 어울려요.",
    ),
    introvert: {
      stage2: lines(
        "아쿠아마린 결정핵은 조용히 안쪽에서 자라는 느낌이 강해요. 자기만의 속도로 에너지를 쌓아가는 성향과 잘 어울려요.",
      ),
      stage3: lines(
        "아쿠아마린 보석은 맑고 차분한 인상이 중심이에요. 과하게 드러내기보다 안쪽으로",
        "깊이를 쌓아가는 성향과 잘 어울려요.",
      ),
    },
    extrovert: {
      stage2: lines(
        "토파즈 결정군은 여러 결정이 밖으로 드러나는 형태예요. 밝고 적극적으로 표현하는 성향과 잘 맞아요.",
      ),
      stage3: lines(
        "토파즈 보석은 선명한 색과 뾰족한 실루엣이 눈에 들어와요. 또렷한 존재감으로 시선을 끌며 자신을 드러내는 성향과 잘 맞아요.",
      ),
    },
  },
  basalt: {
    stage1: lines(
      "현무암은 표면에 활발한 흔적이 그대로 남아있는 돌이에요. 순간의 감각을 놓치지 않고 곧바로 움직이는 성향과 잘 맞아요.",
    ),
    introvert: {
      stage2: lines(
        "심부 결정핵은 겉으로는 조용하지만, 안쪽에 단단한 가능성을 품고 있어요. 깊이 생각하고 천천히 완성해가는 성향과 잘 어울려요.",
      ),
      stage3: lines(
        "원석 다이아몬드는 깎이기 전의 순수한 결정성이 느껴져요. 화려하게 꾸미기보다 본질적인 단단함을 지키는 성향과 잘 어울려요.",
      ),
    },
    extrovert: {
      stage2: lines(
        "압력 결정맥은 에너지가 한곳에 머물지 않고 여러 방향으로 뻗어나가는 형태예요. 주변과 활발히 연결되는 성향과 잘 맞아요.",
      ),
      stage3: lines(
        "브릴리언트 컷 다이아몬드는 빛을 여러 면으로 반사해요. 밝고 선명하게 자신을 표현하는 성향과 잘 맞아요.",
      ),
    },
  },
  marble: {
    stage1: lines(
      "대리석은 부드럽고 매끄러운 결을 가진 돌이에요. 주변의 감정을 섬세하게 받아들이고 자기 안에 담아두는 성향과 잘 어울려요.",
    ),
    introvert: {
      stage2: lines(
        "루비핵은 넓게 퍼지기보다 한 점에 깊게 응축된 형태예요. 감정을 크게 드러내지 않지만, 안쪽에 선명한 중심을 가진 성향과 잘 어울려요.",
      ),
      stage3: lines(
        "루비는 붉은 에너지가 몸 전체로 완성된 형태예요. 조용하지만 안쪽에 강한 존재감을 품은 성향과 잘 어울려요.",
      ),
    },
    extrovert: {
      stage2: lines(
        "색대 코런덤맥은 파랑, 초록, 노랑의 색이 암석 안에서 함께 드러나는 단계예요. 다양한 표현을 자연스럽게 보여주는 성향과 잘 맞아요.",
      ),
      stage3: lines(
        "파티 사파이어는 여러 색이 한 몸 안에서",
        "선명하게 어우러져요. 다채로운 감정을 생동감 있게 드러내는 성향과 잘 맞아요.",
      ),
    },
  },
  gneiss: {
    stage1: lines(
      "편마암은 여러 층의 무늬가 뚜렷하게 정리된 돌이에요. 복잡한 정보를 자기만의 구조로 재배열해 이해하는 성향과 잘 맞아요.",
    ),
    introvert: {
      stage2: lines(
        "정렬된 장석맥은 흐름이 차분하고 질서 있게 정리된 형태예요. 자기만의 리듬을 지키며 안정적으로 움직이는 성향과 잘 어울려요.",
      ),
      stage3: lines(
        "문스톤은 강하게 빛나기보다 은은하게 빛을 품어요. 조용하지만 자기만의 리듬으로 은은한 매력을 쌓아가는 성향과 잘 어울려요.",
      ),
    },
    extrovert: {
      stage2: lines(
        "소용돌이 장석맥은 무늬가 한 방향에 머물지 않고 움직이는 느낌을 줘요. 변화와 표현이 풍부한 성향과 잘 맞아요.",
      ),
      stage3: lines(
        "라브라도라이트는 각도에 따라 다색 광채가 강하게 드러나요. 활발하고 입체적으로 자신을 표현하는 성향과 잘 맞아요.",
      ),
    },
  },
};

// 진화를 끝낸 사용자가 (스킨으로) 조약돌 모습을 다시 착용했을 때의 문구.
// 실제 0단계의 발견 안내와 달리, 진화 근거 칸은 회상 톤(BLURB),
// 성향 설명 칸은 정체성 톤(TRAIT)으로 서로 다르게 표시한다.
const ROCKIE_SKIN_BLURB = lines(
  "처음 만났던 조약돌 시절의 모습이에요.",
  "튜닝의 끝은 순정이라고들 하죠.",
);
const ROCKIE_SKIN_TRAIT = lines(
  "겉모습은 처음으로 돌아갔지만,",
  "그동안 쌓아온 성향은 그대로예요.",
);

// 단계별 진화 근거 (docs/evolution.md의 "진화 근거"와 문구 동기화)
// 1단계는 계열별, 2·3단계는 계열×성향별로 다르다. 0단계는 조약돌 안내(rockie)를 재사용.
const EVOLVE_RATIONALE = {
  granite: {
    stage1:
      "마음속에 품고 있던 규칙과 책임감의 결이 서서히 자리 잡으면서,\n지하 깊은 곳에서 천천히 식어가는 마그마처럼\n단단한 화강암의 형태로 다져졌어요.",
    introvert: {
      stage2:
        "화강암 속에 스며든 뜨거운 광물 용액이 천천히 식으면서,\n페그마타이트의 큰 결정 틈에 작은 아쿠아마린 결정핵이\n조용히 맺히기 시작했어요.",
      stage3:
        "작게 자리 잡은 아쿠아마린 결정핵이 페그마타이트 안에서\n더 크게 성장해, 하나의 완성된 보석 몸체가 되었어요.",
    },
    extrovert: {
      stage2:
        "화강암을 지나온 광물 용액이 페그마타이트로 거칠게 자라나면서,\n여러 갈래로 뻗은 토파즈 결정군이 밖으로 돋아나기 시작했어요.",
      stage3:
        "여러 토파즈 결정이 성장하면서\n하나의 크고 화려한 토파즈 보석이 되었어요.",
    },
  },
  basalt: {
    stage1:
      "즉흥적으로 반응하고 부딪히며 만들어낸 에너지가\n지표로 솟아올라 빠르게 굳어버린 용암처럼\n다공질의 현무암 형태로 굳어졌어요.",
    introvert: {
      stage2:
        "현무암이 지각 깊은 곳으로 가라앉아 높은 압력을 받으며\n에클로자이트로 변성되고, 그 안쪽에 단단한 심부 결정핵이\n조용히 자리 잡았어요.",
      stage3:
        "에클로자이트의 고압 환경 속에서 투명 결정의 전조가 응축되고,\n그 핵이 원석 다이아몬드로 완성되었어요.",
    },
    extrovert: {
      stage2:
        "현무암이 깊은 곳의 강한 압력을 받아 에클로자이트로 다져지면서,\n여러 방향으로 뻗어나가는 압력 결정맥이 또렷하게 생겨났어요.",
      stage3:
        "압력으로 생긴 투명한 결정맥이 확장되고 정렬되면서,\n빛을 강하게 반사하는 컷팅 다이아몬드가 되었어요.",
    },
  },
  marble: {
    stage1:
      "사람들의 마음과 감정을 오래도록 자신 속에 품어온 시간이\n열과 압력이 되어, 원래의 결이 새롭게 정돈된\n대리석으로 변성되었어요.",
    introvert: {
      stage2:
        "대리석에 열과 미량의 성분이 더해져 코런덤 대리석으로 변하면서,\n한 점에 깊게 응축된 작은 루비핵이 안쪽에 맺혔어요.",
      stage3:
        "대리석 안에 생긴 작은 루비핵이 점점 커지고,\n최종적으로 몸 전체가 루비 결정으로 바뀌었어요.",
    },
    extrovert: {
      stage2:
        "대리석이 코런덤 대리석으로 변성되며, 파랑·초록·노랑의 색이\n함께 어우러진 색대 코런덤맥이 암석 안에 번지기 시작했어요.",
      stage3:
        "2단계의 색대 코런덤맥이 더 뚜렷해지고 넓어지면서,\n파랑·초록·노랑 3색의 파티 사파이어로 완성되었어요.",
    },
  },
  gneiss: {
    stage1:
      "세상의 여러 조각을 논리적으로 분석하고 정리해온 흐름이\n압력이 되어, 광물들이 결마다 다시 정렬된\n편마암의 줄무늬로 새겨졌어요.",
    introvert: {
      stage2:
        "편마암이 부분적으로 녹아 미그마타이트로 변하면서,\n흐름이 차분하게 정돈된 정렬된 장석맥이 결을 따라\n자리 잡았어요.",
      stage3:
        "정렬된 장석맥이 더 맑고 균일하게 재결정되면서, 은은한 월장석 광채를 가진 문스톤으로 완성되었어요.",
    },
    extrovert: {
      stage2:
        "편마암이 부분적으로 녹아 미그마타이트로 변하면서,\n한곳에 머물지 않고 굽이치는 소용돌이 장석맥이\n뚜렷하게 새겨졌어요.",
      stage3:
        "소용돌이 장석맥의 흐름이 더 강한 광학 효과로 발전하면서,\n청록·금색 계열의 다색 광채를 가진\n라브라도라이트로 완성되었어요.",
    },
  },
};

// 온보딩 프롤로그 진행 순서. question이 있으면 그 인덱스의 온보딩 질문을 보여준다.
const ONBOARDING_FLOW = [
  {
    scene: "scene-intro",
    speaker: "ROCKIE",
    text: "어느 날, 하늘에서 작은 별똥별이 떨어졌습니다.",
    button: "시작하기",
  },
  {
    scene: "scene-fall",
    speaker: "PROLOGUE",
    text: "쿵! 갑자기 눈앞에 정체불명의 운석이 떨어졌어요!",
    // 운석 낙하 애니메이션이 끝나는(착지) 순간에 맞춰 문구를 노출한다
    revealOnLand: true,
  },
  { question: 0, scene: "scene-landed", speaker: "QUESTION" },
  {
    scene: "scene-sound",
    speaker: "PROLOGUE",
    text: "어..? 운석에서 무슨 소리가 들리는 것 같아요.",
  },
  {
    scene: "scene-sound",
    speaker: "PROLOGUE",
    text: "....달그락... 달그락...",
  },
  { question: 1, scene: "scene-sound", speaker: "QUESTION" },
  {
    scene: "scene-crack",
    speaker: "PROLOGUE",
    text: "쩌적... 쩌적...",
  },
  {
    scene: "scene-crack",
    speaker: "PROLOGUE",
    text: "운석 표면에 금이 가기 시작합니다.",
  },
  { question: 2, scene: "scene-crack", speaker: "QUESTION" },
  {
    scene: "scene-pebble",
    speaker: "PROLOGUE",
    text: "운석이 갈라지고, 그 안에서 작은 조약돌이 나타났어요.",
  },
  {
    scene: "scene-pebble",
    speaker: "PROLOGUE",
    text: "조약돌이 당신을 바라봅니다.",
  },
  { question: 3, scene: "scene-pebble", speaker: "QUESTION" },
  {
    scene: "scene-pebble",
    speaker: "PROLOGUE",
    text: "왠지 이 돌을 그냥 두고 갈 수는 없을 것 같아요.",
  },
  {
    scene: "scene-pebble",
    speaker: "PROLOGUE",
    text: "작은 조약돌이 당신의 곁에 자리를 잡았습니다.",
  },
  {
    scene: "scene-pebble",
    speaker: "ROCKIE",
    text: "이제부터 ROCKIE와 함께 지내보세요.",
    button: "시작하기",
    complete: true,
  },
];

// 호감도 5단계 구간(균등 20점). 표시 전용이며,
// 2→3 진화 판정은 이와 무관하게 raw 90점을 쓴다(evolution.js).
const AFFINITY_LEVELS = [
  { min: 0, name: "낯가림" },
  { min: 20, name: "서먹" },
  { min: 40, name: "친근" },
  { min: 60, name: "살가움" },
  { min: 80, name: "각별" },
];
