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
    situation: {
      ko: "떨어진 운석에서 아직 연기가 조금 피어오르고, 주변은 조용합니다.",
      en: "Smoke still curls from the fallen meteorite, and everything around it is quiet.",
    },
    text: { ko: "가장 먼저 어떻게 할까요?", en: "What do you do first?" },
    options: [
      {
        stone: "granite",
        traitTag: "안전 확인형",
        label: {
          ko: "주변이 안전한지 확인하고 천천히 다가간다",
          en: "Check that it's safe, then approach slowly",
        },
      },
      {
        stone: "basalt",
        traitTag: "직접 탐색형",
        label: {
          ko: "일단 가까이 가서 직접 살펴본다",
          en: "Go right up and take a look for yourself",
        },
      },
      {
        stone: "marble",
        traitTag: "보호 본능형",
        label: {
          ko: "혹시 누군가 다친 건 아닌지 걱정된다",
          en: "Worry that someone might have been hurt",
        },
      },
      {
        stone: "gneiss",
        traitTag: "흔적 분석형",
        label: {
          ko: "떨어진 방향과 흔적을 보고 정체를 추측한다",
          en: "Read its trajectory and traces to guess what it is",
        },
      },
    ],
  },
  {
    id: "onboarding_02",
    category: "호기심",
    situation: {
      ko: "운석 안쪽에서 아주 작은 소리가 계속 들립니다.\n....달그락... 달그락...",
      en: "A tiny sound keeps coming from inside the meteorite.\n....clatter... clatter...",
    },
    text: { ko: "이 소리를 들은 나는?", en: "Hearing that sound, you..." },
    options: [
      {
        stone: "granite",
        traitTag: "신중 관찰형",
        label: {
          ko: "섣불리 건드리지 않고 상태를 더 지켜본다",
          en: "Don't touch it yet — watch a while longer",
        },
      },
      {
        stone: "basalt",
        traitTag: "즉시 확인형",
        label: {
          ko: "두근거려서 바로 확인해보고 싶다",
          en: "Feel your heart race and want to check right away",
        },
      },
      {
        stone: "marble",
        traitTag: "구출 지향형",
        label: {
          ko: "안에 갇힌 존재가 있다면 꺼내주고 싶다",
          en: "Want to free whatever might be trapped inside",
        },
      },
      {
        stone: "gneiss",
        traitTag: "패턴 추론형",
        label: {
          ko: "소리의 간격과 방향을 살펴 안쪽 구조를 상상한다",
          en: "Study the rhythm and direction to picture what's inside",
        },
      },
    ],
  },
  {
    id: "onboarding_03",
    category: "변화 대응",
    situation: {
      ko: "운석의 금이 점점 벌어지고, 안쪽에서 무언가 움직입니다.",
      en: "The cracks widen, and something stirs inside.",
    },
    text: { ko: "나는 무엇을 준비할까요?", en: "What do you get ready to do?" },
    options: [
      {
        stone: "granite",
        traitTag: "거리 확보형",
        label: {
          ko: "조각이 튈 수 있으니 안전한 거리를 확보한다",
          en: "Back off to a safe distance in case fragments fly",
        },
      },
      {
        stone: "basalt",
        traitTag: "순간 대응형",
        label: {
          ko: "바로 받아낼 수 있게 가까이에서 기다린다",
          en: "Wait up close, ready to catch it",
        },
      },
      {
        stone: "marble",
        traitTag: "안심 유도형",
        label: {
          ko: "놀라지 않도록 조용히 말을 걸어본다",
          en: "Speak softly so it won't be startled",
        },
      },
      {
        stone: "gneiss",
        traitTag: "균열 관찰형",
        label: {
          ko: "금이 퍼지는 모양을 보고 어느 쪽이 열릴지 본다",
          en: "Watch how the cracks spread to see which side will open",
        },
      },
    ],
  },
  {
    id: "onboarding_04",
    category: "첫 관계",
    situation: {
      ko: "조약돌이 나에게 말을 건네네요.\n“헉! 안녕하세요, 주인님!”",
      en: 'The pebble speaks to you.\n"Oh! Hello there, master!"',
    },
    text: { ko: "나는 어떻게 대답할까요?", en: "How do you answer?" },
    options: [
      {
        stone: "granite",
        traitTag: "보호 책임형",
        label: {
          ko: "괜찮아? 우선 안전한 곳으로 가자",
          en: "Are you okay? Let's get somewhere safe first",
        },
      },
      {
        stone: "basalt",
        traitTag: "활기 반응형",
        label: {
          ko: "우와, 너 진짜 살아있는 돌이야?",
          en: "Whoa, are you really a living rock?",
        },
      },
      {
        stone: "marble",
        traitTag: "따뜻한 환대형",
        label: {
          ko: "많이 무서웠지? 이제 괜찮아",
          en: "That must have been scary. You're okay now",
        },
      },
      {
        stone: "gneiss",
        traitTag: "정체 탐구형",
        label: {
          ko: "너는 어디서 왔고, 어떻게 말할 수 있어?",
          en: "Where did you come from, and how can you talk?",
        },
      },
    ],
  },
];

const MAIN_QUESTIONS = [
  {
    id: "main_01",
    category: "계획/실행",
    situation: {
      ko: "한 달 뒤 중요한 발표가 있어요. 자료 조사, 슬라이드 제작, 발표 연습까지 준비할 일이 꽤 많습니다.",
      en: "You have an important presentation in a month. Research, slides, rehearsal — there's a lot to prepare.",
    },
    text: {
      ko: "나는 준비를 어떻게 시작할까요?",
      en: "How do you start preparing?",
    },
    options: [
      {
        stone: "granite",
        traitTag: "계획 완수형",
        label: {
          ko: "마감일까지 할 일을 일정표로 먼저 나눈다",
          en: "Break the work into a schedule up to the deadline first",
        },
      },
      {
        stone: "basalt",
        traitTag: "시작 우선형",
        label: {
          ko: "일단 자료를 열고 손이 가는 것부터 시작한다",
          en: "Open your files and start with whatever draws you in",
        },
      },
      {
        stone: "marble",
        traitTag: "메시지 중심형",
        label: {
          ko: "듣는 사람에게 어떤 메시지가 닿을지 먼저 생각한다",
          en: "Think first about what message will land with the audience",
        },
      },
      {
        stone: "gneiss",
        traitTag: "전략 설계형",
        label: {
          ko: "핵심 주장과 근거 구조를 먼저 잡는다",
          en: "Lay out the core argument and its supporting structure first",
        },
      },
    ],
  },
  {
    id: "main_02",
    category: "관계/협업",
    situation: {
      ko: "친구가 고민을 털어놓고 있어요. 해결책을 원하는지, 그냥 들어주길 원하는지 바로 알기 어렵습니다.",
      en: "A friend is opening up about a worry. It's hard to tell whether they want solutions or just to be heard.",
    },
    text: { ko: "내가 먼저 보일 반응은?", en: "What's your first reaction?" },
    options: [
      {
        stone: "granite",
        traitTag: "실질 지원형",
        label: {
          ko: "필요하면 해결 방법을 같이 정리해보자고 말한다",
          en: "Offer to work through solutions together if they want",
        },
      },
      {
        stone: "basalt",
        traitTag: "활력 전환형",
        label: {
          ko: "기분이 조금 풀릴 만한 일을 함께 찾아본다",
          en: "Look for something together that might lift their mood",
        },
      },
      {
        stone: "marble",
        traitTag: "공감 경청형",
        label: {
          ko: "먼저 충분히 들어주고 감정을 받아준다",
          en: "Listen fully first and make room for how they feel",
        },
      },
      {
        stone: "gneiss",
        traitTag: "맥락 파악형",
        label: {
          ko: "상황의 원인과 선택지를 차분히 짚어본다",
          en: "Calmly walk through the causes and the options",
        },
      },
    ],
  },
  {
    id: "main_03",
    category: "가치관",
    situation: {
      ko: "새로운 규칙이 생겼는데, 효율은 좋아질 것 같지만 누군가에게는 꽤 불편할 수도 있어요.",
      en: "A new rule has been introduced. It should improve efficiency, but it may be quite inconvenient for some.",
    },
    text: {
      ko: "내가 먼저 따져보고 싶은 것은?",
      en: "What do you want to examine first?",
    },
    options: [
      {
        stone: "granite",
        traitTag: "기준 신뢰형",
        label: {
          ko: "규칙이 공정하고 일관되게 적용되는지",
          en: "Whether the rule is applied fairly and consistently",
        },
      },
      {
        stone: "basalt",
        traitTag: "현실 대응형",
        label: {
          ko: "현장에서 실제로 잘 굴러가는지",
          en: "Whether it actually works in practice",
        },
      },
      {
        stone: "marble",
        traitTag: "사람 우선형",
        label: {
          ko: "불편을 겪는 사람이 얼마나 되는지",
          en: "How many people it inconveniences",
        },
      },
      {
        stone: "gneiss",
        traitTag: "타당성 검증형",
        label: {
          ko: "규칙의 근거가 충분히 논리적인지",
          en: "Whether the reasoning behind it holds up",
        },
      },
    ],
  },
  {
    id: "main_04",
    category: "일상/감정",
    situation: {
      ko: "오랜만에 아무 일정이 없는 휴일이에요. 해야 하는 일도 조금 있지만, 마음은 쉬고 싶어 합니다.",
      en: "For once, a day off with nothing scheduled. There are a few chores, but your heart wants rest.",
    },
    text: {
      ko: "이럴 때 가장 편하게 느껴지는 선택은?",
      en: "What feels most comfortable?",
    },
    options: [
      {
        stone: "granite",
        traitTag: "안정 루틴형",
        label: {
          ko: "정리할 일을 끝내고 마음 편히 쉰다",
          en: "Finish the chores first, then rest with a clear mind",
        },
      },
      {
        stone: "basalt",
        traitTag: "즉흥 충전형",
        label: {
          ko: "그날 끌리는 곳이나 활동을 바로 따라간다",
          en: "Follow whatever place or activity calls to you that day",
        },
      },
      {
        stone: "marble",
        traitTag: "정서 충전형",
        label: {
          ko: "좋아하는 사람이나 콘텐츠로 마음을 채운다",
          en: "Fill up on the people or things you love",
        },
      },
      {
        stone: "gneiss",
        traitTag: "몰입 충전형",
        label: {
          ko: "혼자 깊이 몰입할 주제를 잡는다",
          en: "Pick a subject to dive deep into alone",
        },
      },
    ],
  },
  {
    id: "main_05",
    category: "문제해결",
    situation: {
      ko: "팀 프로젝트에서 자료가 너무 많이 모였어요. 좋은 내용도 많지만, 발표 시간은 짧습니다.",
      en: "Your team project has gathered far too much material. Much of it is good, but the talk is short.",
    },
    text: {
      ko: "나는 무엇부터 정하자고 말할까요?",
      en: "What do you suggest deciding first?",
    },
    options: [
      {
        stone: "granite",
        traitTag: "우선순위 정리형",
        label: {
          ko: "필수 내용과 선택 내용을 나누자",
          en: "Let's separate the must-haves from the optional",
        },
      },
      {
        stone: "basalt",
        traitTag: "핵심 체감형",
        label: {
          ko: "짧게 발표해보며 반응 좋은 내용을 고르자",
          en: "Let's do a quick run-through and keep what lands",
        },
      },
      {
        stone: "marble",
        traitTag: "청중 공감형",
        label: {
          ko: "듣는 사람이 따라오기 쉬운 흐름을 고르자",
          en: "Let's pick a flow the audience can follow easily",
        },
      },
      {
        stone: "gneiss",
        traitTag: "논증 구조형",
        label: {
          ko: "주장과 근거가 이어지는 구조를 만들자",
          en: "Let's build a structure where claims and evidence connect",
        },
      },
    ],
  },
  {
    id: "main_06",
    category: "계획/실행",
    situation: {
      ko: "친구들이 갑자기 여행을 가자고 해요. 날짜는 맞지만, 숙소와 예산은 아직 거의 정해지지 않았습니다.",
      en: "Friends suddenly suggest a trip. The dates work, but lodging and budget are barely settled.",
    },
    text: {
      ko: "내 마음에 가까운 반응은?",
      en: "Which reaction is closest to yours?",
    },
    options: [
      {
        stone: "granite",
        traitTag: "준비 안정형",
        label: {
          ko: "큰 항목은 정하고 가야 마음이 편하다",
          en: "You'd rather settle the big items before going",
        },
      },
      {
        stone: "basalt",
        traitTag: "즉흥 실행형",
        label: {
          ko: "이런 건 타이밍이니까 일단 가보고 싶다",
          en: "It's all about timing — you just want to go",
        },
      },
      {
        stone: "marble",
        traitTag: "동행 조율형",
        label: {
          ko: "같이 가는 사람들이 모두 편한지가 제일 중요하다",
          en: "What matters most is that everyone is comfortable",
        },
      },
      {
        stone: "gneiss",
        traitTag: "조건 비교형",
        label: {
          ko: "예산, 이동, 일정의 장단점을 비교해보고 싶다",
          en: "You want to weigh budget, travel, and schedule trade-offs",
        },
      },
    ],
  },
  {
    id: "main_07",
    category: "관계/협업",
    situation: {
      ko: "모임에서 의견이 둘로 갈렸고, 말수가 적은 사람들은 아직 자기 생각을 말하지 않았어요.",
      en: "The group is split in two, and the quieter members haven't shared their thoughts yet.",
    },
    text: {
      ko: "내가 맡게 될 가능성이 큰 역할은?",
      en: "Which role are you most likely to take?",
    },
    options: [
      {
        stone: "granite",
        traitTag: "진행 조율형",
        label: {
          ko: "결정해야 할 기준과 순서를 잡는다",
          en: "Set the criteria and the order for deciding",
        },
      },
      {
        stone: "basalt",
        traitTag: "대화 촉진형",
        label: {
          ko: "어색함을 깨고 사람들이 편하게 말하게 만든다",
          en: "Break the awkwardness so people speak freely",
        },
      },
      {
        stone: "marble",
        traitTag: "목소리 배려형",
        label: {
          ko: "말하지 못한 사람의 의견도 챙긴다",
          en: "Make sure the quiet ones are heard too",
        },
      },
      {
        stone: "gneiss",
        traitTag: "쟁점 정리형",
        label: {
          ko: "양쪽 의견의 핵심 차이를 정리한다",
          en: "Lay out the core difference between the two sides",
        },
      },
    ],
  },
  {
    id: "main_08",
    category: "가치관",
    situation: {
      ko: "누군가 빠르게 성과를 내는 모습을 봤어요. 멋져 보이지만, 그 과정이 조금 불안정해 보이기도 합니다.",
      en: "You watch someone rack up results fast. It looks impressive, though the process seems a little shaky.",
    },
    text: {
      ko: "나는 어떤 성공이 더 마음에 드나요?",
      en: "Which kind of success appeals to you more?",
    },
    options: [
      {
        stone: "granite",
        traitTag: "꾸준 성장형",
        label: {
          ko: "느려도 오래 갈 수 있는 안정적인 성공",
          en: "Steady success that lasts, even if it's slow",
        },
      },
      {
        stone: "basalt",
        traitTag: "기회 포착형",
        label: {
          ko: "좋은 기회를 잡아 크게 도약하는 성공",
          en: "Success from seizing a chance and leaping ahead",
        },
      },
      {
        stone: "marble",
        traitTag: "가치 실현형",
        label: {
          ko: "내가 중요하게 여기는 의미를 지키는 성공",
          en: "Success that protects what you find meaningful",
        },
      },
      {
        stone: "gneiss",
        traitTag: "체계 구축형",
        label: {
          ko: "원리와 시스템을 만들어내는 성공",
          en: "Success that builds principles and systems",
        },
      },
    ],
  },
  {
    id: "main_09",
    category: "일상/감정",
    situation: {
      ko: "하루 종일 여러 사람을 만나고 집에 돌아왔어요. 즐거웠지만 은근히 피곤함도 남아 있습니다.",
      en: "You're home after a full day of meeting people. It was fun, but a quiet tiredness lingers.",
    },
    text: {
      ko: "집에 도착한 뒤 가장 먼저 하고 싶은 것은?",
      en: "What do you want to do first once you're home?",
    },
    options: [
      {
        stone: "granite",
        traitTag: "생활 정돈형",
        label: {
          ko: "씻고 정리하며 원래 리듬으로 돌아온다",
          en: "Wash up and tidy to get back to your own rhythm",
        },
      },
      {
        stone: "basalt",
        traitTag: "여운 확장형",
        label: {
          ko: "오늘의 즐거웠던 장면을 다시 떠올린다",
          en: "Replay the fun moments of the day",
        },
      },
      {
        stone: "marble",
        traitTag: "감정 음미형",
        label: {
          ko: "좋았던 말과 마음을 천천히 곱씹는다",
          en: "Slowly savor the kind words and feelings",
        },
      },
      {
        stone: "gneiss",
        traitTag: "내면 정리형",
        label: {
          ko: "혼자 있으면서 생각을 차분히 정리한다",
          en: "Be alone and calmly sort through your thoughts",
        },
      },
    ],
  },
  {
    id: "main_10",
    category: "문제해결",
    situation: {
      ko: "처음 보는 장비를 써야 합니다. 설명서는 길고, 옆 사람은 몇 번 눌러보면 금방 익숙해진다고 해요.",
      en: "You have to use unfamiliar equipment. The manual is long, and someone says you'll pick it up after a few tries.",
    },
    text: {
      ko: "나는 어떻게 익히는 편인가요?",
      en: "How do you tend to learn?",
    },
    options: [
      {
        stone: "granite",
        traitTag: "매뉴얼 확인형",
        label: {
          ko: "기본 사용법을 먼저 읽고 따라 한다",
          en: "Read the basics first, then follow along",
        },
      },
      {
        stone: "basalt",
        traitTag: "체험 학습형",
        label: {
          ko: "직접 만져보며 감을 잡는다",
          en: "Get a feel for it by handling it yourself",
        },
      },
      {
        stone: "marble",
        traitTag: "사용자 관찰형",
        label: {
          ko: "다른 사람이 어디서 어려워하는지 보며 배운다",
          en: "Learn by watching where others get stuck",
        },
      },
      {
        stone: "gneiss",
        traitTag: "원리 이해형",
        label: {
          ko: "왜 그렇게 작동하는지 구조를 이해한다",
          en: "Understand the structure behind why it works",
        },
      },
    ],
  },
  {
    id: "main_11",
    category: "계획/실행",
    situation: {
      ko: "해야 할 일이 세 개나 겹쳤어요. 하나는 급하고, 하나는 중요하고, 하나는 하고 싶은 일입니다.",
      en: "Three tasks have piled up at once: one urgent, one important, one you actually want to do.",
    },
    text: {
      ko: "내가 먼저 고를 기준에 가까운 것은?",
      en: "Which is closest to how you'd choose?",
    },
    options: [
      {
        stone: "granite",
        traitTag: "책임 우선형",
        label: {
          ko: "마감과 책임이 분명한 일부터 한다",
          en: "Start with what has a clear deadline and duty",
        },
      },
      {
        stone: "basalt",
        traitTag: "에너지 우선형",
        label: {
          ko: "지금 가장 탄력 받을 수 있는 일부터 한다",
          en: "Start with whatever has the most momentum right now",
        },
      },
      {
        stone: "marble",
        traitTag: "마음 균형형",
        label: {
          ko: "내 마음이 무너지지 않을 순서를 고른다",
          en: "Choose the order that keeps you from burning out",
        },
      },
      {
        stone: "gneiss",
        traitTag: "효율 최적형",
        label: {
          ko: "전체 결과가 가장 좋아지는 순서를 따져본다",
          en: "Work out the order that yields the best overall result",
        },
      },
    ],
  },
  {
    id: "main_12",
    category: "자기인식",
    situation: {
      ko: "가까운 사람이 나의 장점을 한 문장으로 말해준다고 해요. 어떤 말을 들으면 가장 나답다고 느낄까요?",
      en: "Someone close is about to describe your strength in one sentence. Which would feel most like you?",
    },
    text: {
      ko: "내가 가장 고개를 끄덕일 말은?",
      en: "Which would you nod along to most?",
    },
    options: [
      {
        stone: "granite",
        traitTag: "신뢰형",
        label: {
          ko: "너는 맡은 일을 끝까지 해내는 사람이야",
          en: "You're someone who sees things through to the end",
        },
      },
      {
        stone: "basalt",
        traitTag: "상황 적응형",
        label: {
          ko: "너는 상황을 즐기고 빠르게 움직이는 사람이야",
          en: "You're someone who enjoys the moment and moves fast",
        },
      },
      {
        stone: "marble",
        traitTag: "마음 이해형",
        label: {
          ko: "너는 사람의 마음과 의미를 잘 보는 사람이야",
          en: "You're someone who reads people's hearts and meaning well",
        },
      },
      {
        stone: "gneiss",
        traitTag: "구조 파악형",
        label: {
          ko: "너는 흐름을 읽고 구조를 세우는 사람이야",
          en: "You're someone who reads the flow and builds structure",
        },
      },
    ],
  },
];

const TIEBREAKERS = [
  {
    id: "tb_granite_basalt",
    category: "타이브레이커",
    situation: {
      ko: "행사 시작 10분 전, 준비한 순서표와 현장 상황이 다르게 흘러가고 있어요. 바로 진행 방식을 정해야 합니다.",
      en: "Ten minutes to showtime, and the run sheet no longer matches what's happening on site. You must decide how to proceed right now.",
    },
    text: { ko: "나는 먼저 어떻게 움직일까요?", en: "How do you move first?" },
    options: [
      {
        stone: "granite",
        label: {
          ko: "순서표를 빠르게 다시 확인하고 최소한의 기준을 맞춘다",
          en: "Quickly recheck the run sheet and lock down a minimum standard",
        },
      },
      {
        stone: "basalt",
        label: {
          ko: "현장 분위기에 맞춰 바로 진행하며 중간에 조정한다",
          en: "Go with the room and adjust as you run",
        },
      },
    ],
  },
  {
    id: "tb_granite_marble",
    category: "타이브레이커",
    situation: {
      ko: "함께 준비하던 친구가 많이 지쳐 보여요. 계획대로라면 오늘 마무리해야 하지만, 친구는 잠깐 쉬고 싶어 합니다.",
      en: "The friend preparing with you looks worn out. The plan says finish today, but they want a short break.",
    },
    text: { ko: "나는 어떤 선택을 할까요?", en: "What do you choose?" },
    options: [
      {
        stone: "granite",
        label: {
          ko: "남은 일을 작게 나눠 꼭 필요한 부분부터 끝내자고 한다",
          en: "Suggest splitting what's left and finishing only the essentials",
        },
      },
      {
        stone: "marble",
        label: {
          ko: "친구의 상태를 먼저 살피고 쉬어갈 방법을 같이 찾는다",
          en: "Check on your friend first and find a way to rest together",
        },
      },
    ],
  },
  {
    id: "tb_granite_gneiss",
    category: "타이브레이커",
    situation: {
      ko: "반복해서 같은 실수가 생기는 작업이 있어요. 체크리스트도 있고, 왜 반복되는지 원인도 궁금합니다.",
      en: "A task keeps producing the same mistake. There's a checklist, and you're curious why it repeats.",
    },
    text: { ko: "나는 무엇부터 할까요?", en: "What do you do first?" },
    options: [
      {
        stone: "granite",
        label: {
          ko: "우선 체크리스트를 더 꼼꼼히 따라 빠진 단계를 막는다",
          en: "Follow the checklist more carefully to stop missed steps",
        },
      },
      {
        stone: "gneiss",
        label: {
          ko: "실수가 반복되는 지점을 찾아 작업 흐름 자체를 다시 본다",
          en: "Find where it recurs and rethink the workflow itself",
        },
      },
    ],
  },
  {
    id: "tb_basalt_marble",
    category: "타이브레이커",
    situation: {
      ko: "친구들이 갑자기 밤 산책을 가자고 해요. 재미있을 것 같지만, 한 친구는 조금 망설이고 있습니다.",
      en: "Friends suddenly suggest a night walk. It sounds fun, but one friend is hesitating.",
    },
    text: { ko: "나는 어떻게 반응할까요?", en: "How do you react?" },
    options: [
      {
        stone: "basalt",
        label: {
          ko: "분위기를 살려 일단 나가보자고 신나게 제안한다",
          en: "Keep the energy up and eagerly push to head out",
        },
      },
      {
        stone: "marble",
        label: {
          ko: "망설이는 친구가 불편하지 않은지 먼저 물어본다",
          en: "Ask the hesitant friend first if they're comfortable",
        },
      },
    ],
  },
  {
    id: "tb_basalt_gneiss",
    category: "타이브레이커",
    situation: {
      ko: "새 앱을 처음 써보게 됐어요. 화면에는 여러 버튼이 보이고, 옆에는 기능 설명 문서도 열려 있습니다.",
      en: "You're trying a new app for the first time. Buttons fill the screen, and the docs are open beside it.",
    },
    text: { ko: "나는 어떻게 시작할까요?", en: "How do you start?" },
    options: [
      {
        stone: "basalt",
        label: {
          ko: "버튼을 직접 눌러보며 어떤 기능인지 감을 잡는다",
          en: "Press the buttons yourself to get a feel for them",
        },
      },
      {
        stone: "gneiss",
        label: {
          ko: "기능 설명을 먼저 훑고 구조를 이해한 뒤 써본다",
          en: "Skim the docs to grasp the structure, then use it",
        },
      },
    ],
  },
  {
    id: "tb_marble_gneiss",
    category: "타이브레이커",
    situation: {
      ko: "팀원이 낸 아이디어가 회의에서 바로 반박당했어요. 분위기는 어색해졌고, 아이디어의 문제점도 정리해야 합니다.",
      en: "A teammate's idea was shot down on the spot. The room turned awkward, and the flaws still need sorting out.",
    },
    text: { ko: "나는 먼저 무엇을 할까요?", en: "What do you do first?" },
    options: [
      {
        stone: "marble",
        label: {
          ko: "아이디어를 낸 사람이 상처받지 않게 분위기를 먼저 풀어준다",
          en: "Ease the mood first so they don't feel hurt",
        },
      },
      {
        stone: "gneiss",
        label: {
          ko: "반박된 이유를 항목별로 정리해 개선점을 찾는다",
          en: "Sort the objections point by point and find fixes",
        },
      },
    ],
  },
];

const EI_QUESTIONS = [
  {
    id: "ei_01",
    category: "에너지",
    situation: {
      ko: "힘든 하루가 끝났어요. 몸은 피곤하지만 마음을 회복할 시간이 필요합니다.",
      en: "A hard day is over. Your body is tired, but your mind needs time to recover.",
    },
    text: {
      ko: "나는 어떤 방식으로 에너지를 되찾나요?",
      en: "How do you get your energy back?",
    },
    options: [
      {
        axis: "외향",
        traitTag: "사람 충전형",
        label: {
          ko: "좋아하는 사람과 이야기하며 기분을 풀어낸다",
          en: "Talk it out with someone you like",
        },
      },
      {
        axis: "내향",
        traitTag: "혼자 충전형",
        label: {
          ko: "혼자 조용히 시간을 보내며 정리한다",
          en: "Spend quiet time alone and sort yourself out",
        },
      },
    ],
  },
  {
    id: "ei_02",
    category: "관계 시작",
    situation: {
      ko: "처음 보는 사람들이 모인 자리입니다. 대화는 아직 시작되지 않았고 다들 분위기를 살피고 있어요.",
      en: "You're in a room of strangers. No one has started talking; everyone is reading the room.",
    },
    text: {
      ko: "나는 보통 어떻게 시작하나요?",
      en: "How do you usually start?",
    },
    options: [
      {
        axis: "외향",
        traitTag: "먼저 연결형",
        label: {
          ko: "먼저 말을 걸고 분위기를 만든다",
          en: "Speak up first and set the tone",
        },
      },
      {
        axis: "내향",
        traitTag: "관찰 진입형",
        label: {
          ko: "상황을 지켜보다 편해지면 다가간다",
          en: "Watch a while, then approach once you're at ease",
        },
      },
    ],
  },
  {
    id: "ei_03",
    category: "생각 정리",
    situation: {
      ko: "머릿속에 생각이 많아져서 정리가 필요합니다. 혼자 붙잡을 수도, 밖으로 꺼낼 수도 있어요.",
      en: "Your head is crowded and needs sorting. You could keep it in, or let it out.",
    },
    text: {
      ko: "내게 더 자연스러운 생각 정리 방식은?",
      en: "Which way of sorting thoughts feels more natural?",
    },
    options: [
      {
        axis: "외향",
        traitTag: "대화 정리형",
        label: {
          ko: "누군가에게 이야기하며 정리한다",
          en: "Talk it through with someone",
        },
      },
      {
        axis: "내향",
        traitTag: "내면 정리형",
        label: {
          ko: "글로 쓰거나 혼자 되짚어본다",
          en: "Write it down or retrace it alone",
        },
      },
    ],
  },
  {
    id: "ei_04",
    category: "작업 환경",
    situation: {
      ko: "집중해서 작업해야 합니다. 주변에 사람이 있는 공간과 완전히 조용한 공간 중 고를 수 있어요.",
      en: "You need to focus. You can choose a space with people around, or one that's completely quiet.",
    },
    text: {
      ko: "나는 어디서 더 집중이 잘 되나요?",
      en: "Where do you focus better?",
    },
    options: [
      {
        axis: "외향",
        traitTag: "활기 집중형",
        label: {
          ko: "카페처럼 적당한 활기가 있는 곳",
          en: "Somewhere with gentle buzz, like a café",
        },
      },
      {
        axis: "내향",
        traitTag: "고요 집중형",
        label: {
          ko: "방해받지 않는 조용한 곳",
          en: "Somewhere quiet and undisturbed",
        },
      },
    ],
  },
  {
    id: "ei_05",
    category: "표현 방식",
    situation: {
      ko: "좋은 일이 생겼어요. 아직 아무에게도 말하지 않았지만 기분이 꽤 좋습니다.",
      en: "Something good happened. You haven't told anyone yet, but you feel great.",
    },
    text: {
      ko: "나는 이 기쁨을 어떻게 나누나요?",
      en: "How do you share the joy?",
    },
    options: [
      {
        axis: "외향",
        traitTag: "표현 확장형",
        label: {
          ko: "바로 누군가에게 알리고 함께 기뻐한다",
          en: "Tell someone right away and celebrate together",
        },
      },
      {
        axis: "내향",
        traitTag: "감정 음미형",
        label: {
          ko: "혼자 조용히 그 순간을 음미한다",
          en: "Quietly savor the moment on your own",
        },
      },
    ],
  },
  {
    id: "ei_06",
    category: "낯선 상황",
    situation: {
      ko: "여행지에서 길을 잃었어요. 주변에 사람도 있고, 휴대폰 지도도 켤 수 있습니다.",
      en: "You're lost while traveling. There are people nearby, and you could open the map on your phone.",
    },
    text: { ko: "나는 먼저 무엇을 할까요?", en: "What do you do first?" },
    options: [
      {
        axis: "외향",
        traitTag: "외부 연결형",
        label: {
          ko: "근처 사람에게 바로 물어본다",
          en: "Ask someone nearby right away",
        },
      },
      {
        axis: "내향",
        traitTag: "자체 탐색형",
        label: {
          ko: "지도를 보며 직접 방향을 찾는다",
          en: "Find your way yourself with the map",
        },
      },
    ],
  },
];

const EI_TIEBREAKER = {
  id: "eitb_01",
  category: "타이브레이커",
  situation: {
    ko: "새로운 관심사가 생겼어요. 혼자 알아볼 수도 있고, 다른 사람들과 연결해볼 수도 있습니다.",
    en: "You've found a new interest. You could explore it alone, or connect with others.",
  },
  text: {
    ko: "나는 이 관심사를 어떻게 넓혀갈까요?",
    en: "How do you grow this interest?",
  },
  options: [
    {
      axis: "외향",
      label: {
        ko: "관심 있는 사람들과 이야기하며 넓혀간다",
        en: "Grow it by talking with people who share it",
      },
    },
    {
      axis: "내향",
      label: {
        ko: "자료를 찾아보며 혼자 깊이 파고든다",
        en: "Dig deep on your own through research",
      },
    },
  ],
};

module.exports = {
  ONBOARDING_QUESTIONS,
  MAIN_QUESTIONS,
  TIEBREAKERS,
  EI_QUESTIONS,
  EI_TIEBREAKER,
};
