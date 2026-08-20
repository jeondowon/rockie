// tray.js에서 사용하는 데이터성 문구·플로우 정의.
// 트레이 HTML에서 tray.js보다 먼저 로드한다. (pet.js ↔ pet-data.js와 같은 관례)

// 2단계 변성체 이름 (돌 종류 × 외향/내향)
const VARIANT_NAMES = {
  granite: {
    introvert: {
      ko: "페그마타이트 (아쿠아마린 결정핵)",
      en: "Pegmatite (Aquamarine Core)",
    },
    extrovert: {
      ko: "페그마타이트 (토파즈 결정군)",
      en: "Pegmatite (Topaz Cluster)",
    },
  },
  basalt: {
    introvert: {
      ko: "에클로자이트 (심부 결정핵)",
      en: "Eclogite (Deep Crystal Core)",
    },
    extrovert: {
      ko: "에클로자이트 (압력 결정맥)",
      en: "Eclogite (Pressure Vein)",
    },
  },
  marble: {
    introvert: {
      ko: "코런덤 대리석 (루비핵)",
      en: "Corundum Marble (Ruby Core)",
    },
    extrovert: {
      ko: "코런덤 대리석 (색대 코런덤맥)",
      en: "Corundum Marble (Banded Vein)",
    },
  },
  gneiss: {
    introvert: {
      ko: "미그마타이트 (정렬된 장석맥)",
      en: "Migmatite (Aligned Feldspar Vein)",
    },
    extrovert: {
      ko: "미그마타이트 (소용돌이 장석맥)",
      en: "Migmatite (Swirled Feldspar Vein)",
    },
  },
};

// 3단계 보석 이름 (돌 종류 × 외향/내향)
const GEM_NAMES = {
  granite: {
    extrovert: { ko: "토파즈", en: "Topaz" },
    introvert: { ko: "아쿠아마린", en: "Aquamarine" },
  },
  basalt: {
    extrovert: {
      ko: "브릴리언트 컷 다이아몬드",
      en: "Brilliant-Cut Diamond",
    },
    introvert: { ko: "원석 다이아몬드", en: "Rough Diamond" },
  },
  marble: {
    extrovert: { ko: "파티 사파이어", en: "Parti Sapphire" },
    introvert: { ko: "루비", en: "Ruby" },
  },
  gneiss: {
    extrovert: { ko: "라브라도라이트", en: "Labradorite" },
    introvert: { ko: "문스톤", en: "Moonstone" },
  },
};

const TRAIT_DESCRIPTIONS = {
  rockie: {
    ko: "조약돌은 모든 Rockie 돌들의 기본 형태입니다.\n잠재력을 발견하고 새로운 형태를 찾아보세요!",
    en: "The pebble is the base form of every Rockie.\nDiscover its potential and find a new shape!",
  },
  granite: {
    stage1: {
      ko: "화강암은 오랜 시간에 걸쳐 천천히 다져진\n단단함을 가진 돌이에요. 흔들리지 않는 원칙과\n꾸준함을 지닌 성향과 잘 어울려요.",
      en: "Granite is a stone compacted slowly over a long\ntime. It suits a nature with unshakable principles\nand steady persistence.",
    },
    introvert: {
      stage2: {
        ko: "아쿠아마린 결정핵은 조용히 안쪽에서 자라는 느낌이 강해요. 자기만의 속도로 에너지를 쌓아가는 성향과 잘 어울려요.",
        en: "An aquamarine core grows quietly from within. It suits a nature that builds energy at its own pace.",
      },
      stage3: {
        ko: "아쿠아마린 보석은 맑고 차분한 인상이 중심이에요. 과하게 드러내기보다 안쪽으로\n깊이를 쌓아가는 성향과 잘 어울려요.",
        en: "Aquamarine is defined by a clear, composed impression. It suits a nature that builds depth inward\nrather than showing off.",
      },
    },
    extrovert: {
      stage2: {
        ko: "토파즈 결정군은 여러 결정이 밖으로 드러나는 형태예요. 밝고 적극적으로 표현하는 성향과 잘 맞아요.",
        en: "A topaz cluster is a form where many crystals face outward. It fits a bright, outspoken nature.",
      },
      stage3: {
        ko: "토파즈 보석은 선명한 색과 뾰족한 실루엣이 눈에 들어와요. 또렷한 존재감으로 시선을 끌며 자신을 드러내는 성향과 잘 맞아요.",
        en: "Topaz catches the eye with vivid color and a sharp silhouette. It fits a nature that draws attention and shows itself clearly.",
      },
    },
  },
  basalt: {
    stage1: {
      ko: "현무암은 표면에 활발한 흔적이 그대로 남아있는 돌이에요. 순간의 감각을 놓치지 않고 곧바로 움직이는 성향과 잘 맞아요.",
      en: "Basalt keeps the lively traces of its making right on the surface. It fits a nature that catches the moment and moves at once.",
    },
    introvert: {
      stage2: {
        ko: "심부 결정핵은 겉으로는 조용하지만, 안쪽에 단단한 가능성을 품고 있어요. 깊이 생각하고 천천히 완성해가는 성향과 잘 어울려요.",
        en: "A deep crystal core looks quiet outside but holds firm possibility within. It suits a nature that thinks deeply and finishes slowly.",
      },
      stage3: {
        ko: "원석 다이아몬드는 깎이기 전의 순수한 결정성이 느껴져요. 화려하게 꾸미기보다 본질적인 단단함을 지키는 성향과 잘 어울려요.",
        en: "A rough diamond carries the pure crystallinity it had before cutting. It suits a nature that guards essential strength over ornament.",
      },
    },
    extrovert: {
      stage2: {
        ko: "압력 결정맥은 에너지가 한곳에 머물지 않고 여러 방향으로 뻗어나가는 형태예요. 주변과 활발히 연결되는 성향과 잘 맞아요.",
        en: "A pressure vein is a form where energy spreads in many directions rather than settling. It fits a nature that connects actively with others.",
      },
      stage3: {
        ko: "브릴리언트 컷 다이아몬드는 빛을 여러 면으로 반사해요. 밝고 선명하게 자신을 표현하는 성향과 잘 맞아요.",
        en: "A brilliant-cut diamond reflects light from every facet. It fits a nature that expresses itself brightly and clearly.",
      },
    },
  },
  marble: {
    stage1: {
      ko: "대리석은 부드럽고 매끄러운 결을 가진 돌이에요. 주변의 감정을 섬세하게 받아들이고 자기 안에 담아두는 성향과 잘 어울려요.",
      en: "Marble is a stone with a soft, smooth grain. It suits a nature that takes in the feelings around it and holds them within.",
    },
    introvert: {
      stage2: {
        ko: "루비핵은 넓게 퍼지기보다 한 점에 깊게 응축된 형태예요. 감정을 크게 드러내지 않지만, 안쪽에 선명한 중심을 가진 성향과 잘 어울려요.",
        en: "A ruby core condenses deeply into a single point rather than spreading wide. It suits a nature that keeps a vivid center without showing much.",
      },
      stage3: {
        ko: "루비는 붉은 에너지가 몸 전체로 완성된 형태예요. 조용하지만 안쪽에 강한 존재감을 품은 성향과 잘 어울려요.",
        en: "Ruby is red energy brought to completion throughout the body. It suits a nature that is quiet yet holds a strong presence inside.",
      },
    },
    extrovert: {
      stage2: {
        ko: "색대 코런덤맥은 파랑, 초록, 노랑의 색이 암석 안에서 함께 드러나는 단계예요. 다양한 표현을 자연스럽게 보여주는 성향과 잘 맞아요.",
        en: "A banded corundum vein is the stage where blue, green, and yellow emerge together within the rock. It fits a nature that shows varied expression with ease.",
      },
      stage3: {
        ko: "파티 사파이어는 여러 색이 한 몸 안에서\n선명하게 어우러져요. 다채로운 감정을 생동감 있게 드러내는 성향과 잘 맞아요.",
        en: "A parti sapphire blends several colors vividly\nwithin one body. It fits a nature that shows a rich range of feeling with life.",
      },
    },
  },
  gneiss: {
    stage1: {
      ko: "편마암은 여러 층의 무늬가 뚜렷하게 정리된 돌이에요. 복잡한 정보를 자기만의 구조로 재배열해 이해하는 성향과 잘 맞아요.",
      en: "Gneiss is a stone whose many layers are distinctly ordered. It fits a nature that rearranges complex information into a structure of its own.",
    },
    introvert: {
      stage2: {
        ko: "정렬된 장석맥은 흐름이 차분하고 질서 있게 정리된 형태예요. 자기만의 리듬을 지키며 안정적으로 움직이는 성향과 잘 어울려요.",
        en: "An aligned feldspar vein is calm and orderly in its flow. It suits a nature that keeps its own rhythm and moves steadily.",
      },
      stage3: {
        ko: "문스톤은 강하게 빛나기보다 은은하게 빛을 품어요. 조용하지만 자기만의 리듬으로 은은한 매력을 쌓아가는 성향과 잘 어울려요.",
        en: "Moonstone holds light gently rather than blazing. It suits a nature that quietly builds a subtle charm at its own rhythm.",
      },
    },
    extrovert: {
      stage2: {
        ko: "소용돌이 장석맥은 무늬가 한 방향에 머물지 않고 움직이는 느낌을 줘요. 변화와 표현이 풍부한 성향과 잘 맞아요.",
        en: "A swirled feldspar vein gives a sense of motion rather than staying in one direction. It fits a nature rich in change and expression.",
      },
      stage3: {
        ko: "라브라도라이트는 각도에 따라 다색 광채가 강하게 드러나요. 활발하고 입체적으로 자신을 표현하는 성향과 잘 맞아요.",
        en: "Labradorite flashes strong, multicolored light depending on the angle. It fits a nature that expresses itself vividly and in full dimension.",
      },
    },
  },
};

// 진화를 끝낸 사용자가 (스킨으로) 조약돌 모습을 다시 착용했을 때의 문구.
// 실제 0단계의 발견 안내와 달리, 진화 근거 칸은 회상 톤(BLURB),
// 성향 설명 칸은 정체성 톤(TRAIT)으로 서로 다르게 표시한다.
const ROCKIE_SKIN_BLURB = {
  ko: "처음 만났던 조약돌 시절의 모습이에요.\n튜닝의 끝은 순정이라고들 하죠.",
  en: "This is how it looked back when you first met.\nThey say the end of tuning is going stock.",
};
const ROCKIE_SKIN_TRAIT = {
  ko: "겉모습은 처음으로 돌아갔지만,\n그동안 쌓아온 성향은 그대로예요.",
  en: "The outside is back to how it started,\nbut everything it has grown into remains.",
};

// 단계별 진화 근거 (docs/evolution.md의 "진화 근거"와 문구 동기화)
// 1단계는 계열별, 2·3단계는 계열×성향별로 다르다. 0단계는 조약돌 안내(rockie)를 재사용.
const EVOLVE_RATIONALE = {
  granite: {
    stage1: {
      ko: "마음속에 품고 있던 규칙과 책임감의 결이 서서히 자리 잡으면서,\n지하 깊은 곳에서 천천히 식어가는 마그마처럼\n단단한 화강암의 형태로 다져졌어요.",
      en: "As the grain of rules and responsibility you carried settled into place,\nit compacted into hard granite — like magma cooling\nslowly, far underground.",
    },
    introvert: {
      stage2: {
        ko: "화강암 속에 스며든 뜨거운 광물 용액이 천천히 식으면서,\n페그마타이트의 큰 결정 틈에 작은 아쿠아마린 결정핵이\n조용히 맺히기 시작했어요.",
        en: "As the hot mineral solution seeping through the granite cooled slowly,\na small aquamarine core began to form quietly in the gaps\nbetween pegmatite's large crystals.",
      },
      stage3: {
        ko: "작게 자리 잡은 아쿠아마린 결정핵이 페그마타이트 안에서\n더 크게 성장해, 하나의 완성된 보석 몸체가 되었어요.",
        en: "The small aquamarine core grew larger inside the pegmatite\nuntil it became one complete gem body.",
      },
    },
    extrovert: {
      stage2: {
        ko: "화강암을 지나온 광물 용액이 페그마타이트로 거칠게 자라나면서,\n여러 갈래로 뻗은 토파즈 결정군이 밖으로 돋아나기 시작했어요.",
        en: "As the mineral solution passing through the granite grew coarsely into pegmatite,\na topaz cluster branching in many directions began to push outward.",
      },
      stage3: {
        ko: "여러 토파즈 결정이 성장하면서\n하나의 크고 화려한 토파즈 보석이 되었어요.",
        en: "As the many topaz crystals grew,\nthey became one large, brilliant topaz gem.",
      },
    },
  },
  basalt: {
    stage1: {
      ko: "즉흥적으로 반응하고 부딪히며 만들어낸 에너지가\n지표로 솟아올라 빠르게 굳어버린 용암처럼\n다공질의 현무암 형태로 굳어졌어요.",
      en: "The energy you made by reacting and colliding on impulse\nrose to the surface and hardened fast, like lava,\nsetting into porous basalt.",
    },
    introvert: {
      stage2: {
        ko: "현무암이 지각 깊은 곳으로 가라앉아 높은 압력을 받으며\n에클로자이트로 변성되고, 그 안쪽에 단단한 심부 결정핵이\n조용히 자리 잡았어요.",
        en: "As the basalt sank deep into the crust under high pressure,\nit metamorphosed into eclogite, and a firm deep core\nsettled quietly within.",
      },
      stage3: {
        ko: "에클로자이트의 고압 환경 속에서 투명 결정의 전조가 응축되고,\n그 핵이 원석 다이아몬드로 완성되었어요.",
        en: "In the high-pressure world of eclogite, the beginnings of a clear crystal condensed,\nand that core completed itself as a rough diamond.",
      },
    },
    extrovert: {
      stage2: {
        ko: "현무암이 깊은 곳의 강한 압력을 받아 에클로자이트로 다져지면서,\n여러 방향으로 뻗어나가는 압력 결정맥이 또렷하게 생겨났어요.",
        en: "As the basalt was compacted into eclogite under deep, powerful pressure,\npressure veins branching in many directions emerged sharply.",
      },
      stage3: {
        ko: "압력으로 생긴 투명한 결정맥이 확장되고 정렬되면서,\n빛을 강하게 반사하는 컷팅 다이아몬드가 되었어요.",
        en: "As the clear veins born of pressure expanded and aligned,\nthey became a cut diamond that reflects light powerfully.",
      },
    },
  },
  marble: {
    stage1: {
      ko: "사람들의 마음과 감정을 오래도록 자신 속에 품어온 시간이\n열과 압력이 되어, 원래의 결이 새롭게 정돈된\n대리석으로 변성되었어요.",
      en: "The long stretch of time you spent holding others' hearts and feelings\nbecame heat and pressure, metamorphosing you into marble\nwith its grain newly ordered.",
    },
    introvert: {
      stage2: {
        ko: "대리석에 열과 미량의 성분이 더해져 코런덤 대리석으로 변하면서,\n한 점에 깊게 응축된 작은 루비핵이 안쪽에 맺혔어요.",
        en: "As heat and trace elements turned the marble into corundum marble,\na small ruby core, condensed deeply into a single point, formed within.",
      },
      stage3: {
        ko: "대리석 안에 생긴 작은 루비핵이 점점 커지고,\n최종적으로 몸 전체가 루비 결정으로 바뀌었어요.",
        en: "The small ruby core inside the marble grew and grew\nuntil the whole body turned to ruby crystal.",
      },
    },
    extrovert: {
      stage2: {
        ko: "대리석이 코런덤 대리석으로 변성되며, 파랑·초록·노랑의 색이\n함께 어우러진 색대 코런덤맥이 암석 안에 번지기 시작했어요.",
        en: "As the marble metamorphosed into corundum marble, a banded vein\nof blue, green, and yellow began to spread through the rock.",
      },
      stage3: {
        ko: "2단계의 색대 코런덤맥이 더 뚜렷해지고 넓어지면서,\n파랑·초록·노랑 3색의 파티 사파이어로 완성되었어요.",
        en: "As the banded corundum vein of stage 2 grew sharper and wider,\nit completed itself as a parti sapphire in blue, green, and yellow.",
      },
    },
  },
  gneiss: {
    stage1: {
      ko: "세상의 여러 조각을 논리적으로 분석하고 정리해온 흐름이\n압력이 되어, 광물들이 결마다 다시 정렬된\n편마암의 줄무늬로 새겨졌어요.",
      en: "The current of analyzing and ordering the world's many pieces\nbecame pressure, etching itself as the banding of gneiss\nwith minerals realigned along every grain.",
    },
    introvert: {
      stage2: {
        ko: "편마암이 부분적으로 녹아 미그마타이트로 변하면서,\n흐름이 차분하게 정돈된 정렬된 장석맥이 결을 따라\n자리 잡았어요.",
        en: "As the gneiss partially melted into migmatite,\nan aligned feldspar vein, calm and orderly in its flow,\nsettled along the grain.",
      },
      stage3: {
        ko: "정렬된 장석맥이 더 맑고 균일하게 재결정되면서, 은은한 월장석 광채를 가진 문스톤으로 완성되었어요.",
        en: "As the aligned feldspar vein recrystallized clearer and more evenly, it completed itself as moonstone with a soft adularescent glow.",
      },
    },
    extrovert: {
      stage2: {
        ko: "편마암이 부분적으로 녹아 미그마타이트로 변하면서,\n한곳에 머물지 않고 굽이치는 소용돌이 장석맥이\n뚜렷하게 새겨졌어요.",
        en: "As the gneiss partially melted into migmatite,\na swirling feldspar vein that never stays in one place\nwas etched sharply through it.",
      },
      stage3: {
        ko: "소용돌이 장석맥의 흐름이 더 강한 광학 효과로 발전하면서,\n청록·금색 계열의 다색 광채를 가진\n라브라도라이트로 완성되었어요.",
        en: "As the flow of the swirled feldspar vein developed into a stronger optical effect,\nit completed itself as labradorite with multicolored\nteal and gold flashes.",
      },
    },
  },
};

// 온보딩 프롤로그 진행 순서. question이 있으면 그 인덱스의 온보딩 질문을 보여준다.
const ONBOARDING_FLOW = [
  {
    scene: "scene-intro",
    speaker: "ROCKIE",
    textKey: "onboarding.step1",
    buttonKey: "onboarding.start",
  },
  {
    scene: "scene-fall",
    speaker: "PROLOGUE",
    textKey: "onboarding.step2",
    // 운석 낙하 애니메이션이 끝나는(착지) 순간에 맞춰 문구를 노출한다
    revealOnLand: true,
  },
  { question: 0, scene: "scene-landed", speaker: "QUESTION" },
  {
    scene: "scene-sound",
    speaker: "PROLOGUE",
    textKey: "onboarding.step3",
  },
  {
    scene: "scene-sound",
    speaker: "PROLOGUE",
    textKey: "onboarding.step4",
  },
  { question: 1, scene: "scene-sound", speaker: "QUESTION" },
  {
    scene: "scene-crack",
    speaker: "PROLOGUE",
    textKey: "onboarding.step5",
  },
  {
    scene: "scene-crack",
    speaker: "PROLOGUE",
    textKey: "onboarding.step6",
  },
  { question: 2, scene: "scene-crack", speaker: "QUESTION" },
  {
    scene: "scene-pebble",
    speaker: "PROLOGUE",
    textKey: "onboarding.step7",
  },
  {
    scene: "scene-pebble",
    speaker: "PROLOGUE",
    textKey: "onboarding.step8",
  },
  { question: 3, scene: "scene-pebble", speaker: "QUESTION" },
  {
    scene: "scene-pebble",
    speaker: "PROLOGUE",
    textKey: "onboarding.step9",
  },
  {
    scene: "scene-pebble",
    speaker: "PROLOGUE",
    textKey: "onboarding.step10",
  },
  {
    scene: "scene-pebble",
    speaker: "PROLOGUE",
    textKey: "onboarding.step11",
    permissions: true,
    buttonKey: "onboarding.start",
    complete: true,
  },
];

// 온보딩 마지막 권한 화면에 표시할 항목.
// screen = 화면 기록, dock = 손쉬운 사용 + 자동화(둘 다 Dock 좌표 읽기에만 쓰인다).
const ONBOARDING_PERMISSIONS = [
  {
    key: "screen",
    labelKey: "perm.screen",
    descKey: "perm.screenDesc",
  },
  {
    key: "automation",
    labelKey: "perm.automation",
    descKey: "perm.automationDesc",
    // 없어도 Dock 회피가 근사치로 동작한다. 거부해도 온보딩을 끝낼 수 있어야 한다 —
    // macOS는 자동화를 한 번 거부하면 다시 묻지 않으므로 필수로 두면 갇힌다.
    optional: true,
  },
];

// 호감도 5단계 구간(균등 20점). 표시 전용이며,
// 2→3 진화 판정은 이와 무관하게 raw 90점을 쓴다(evolution.js).
const AFFINITY_LEVELS = [
  { min: 0, name: { ko: "낯가림", en: "Shy" } },
  { min: 20, name: { ko: "서먹", en: "Awkward" } },
  { min: 40, name: { ko: "친근", en: "Friendly" } },
  { min: 60, name: { ko: "살가움", en: "Warm" } },
  { min: 80, name: { ko: "각별", en: "Devoted" } },
];
