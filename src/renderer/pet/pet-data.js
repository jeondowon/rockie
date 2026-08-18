// pet.js에서 사용하는 데이터성 설정값.
// 각 렌더러 HTML에서 pet.js보다 먼저 로드한다.

// 하트 기본 위치: 캐릭터 대각선 우측 상단 (320 캔버스 기준 px, +x=오른쪽·-y=위).
// heart.gif엔 하트가 정면 위쪽에 그려져 있어 여기서 우측·위로 밀어 대각선에 앉힌다.
const HEART_BASE_OFFSET = { x: 65, y: -70 };

// 캐릭터별 미세조정(기본 위치에 더해짐). 단계·돌마다 그림 크기·모양이 달라 하트 자리가
// 조금씩 다르므로 스프라이트 접두어별로 보정한다(없으면 0). 표시 크기(96/128/176)에는
// CHAR_SIZE/320 배율로 자동 스케일된다. GUI로 보며 어긋나는 캐릭터만 값을 채우면 된다.
const HEART_OFFSET = {
  // 예) topaz: { x: 4, y: -10 },
  pegmatite_e: { x: 10, y: -30 },
  pegmatite_i: { x: 10, y: -30 },
  eclogite_e: { x: 10, y: -30 },
  eclogite_i: { x: 10, y: -30 },
  corundumMarble_e: { x: 10, y: -30 },
  corundumMarble_i: { x: 10, y: -30 },
  migmatite_e: { x: 10, y: -30 },
  migmatite_i: { x: 10, y: -30 },
  topaz: { x: 0, y: -30 },
  aquamarine: { x: 0, y: -30 },
  diamond_cut: { x: 10, y: -30 },
  diamond_rough: { x: 10, y: -30 },
  partiSapphire: { x: 10, y: -30 },
  ruby: { x: 10, y: -30 },
  labradorite: { x: 0, y: -40 },
  moonstone: { x: 0, y: -40 },
};

// 넘기기 순서(21종). PREVIEW.prefix로 시작 위치를 잡는다.
const TUNE_CHARACTERS = [
  { level: "level0", prefix: "rockie" },
  { level: "level1", prefix: "granite" },
  { level: "level1", prefix: "basalt" },
  { level: "level1", prefix: "marble" },
  { level: "level1", prefix: "gneiss" },
  { level: "level2", prefix: "pegmatite_e" },
  { level: "level2", prefix: "pegmatite_i" },
  { level: "level2", prefix: "eclogite_e" },
  { level: "level2", prefix: "eclogite_i" },
  { level: "level2", prefix: "corundumMarble_e" },
  { level: "level2", prefix: "corundumMarble_i" },
  { level: "level2", prefix: "migmatite_e" },
  { level: "level2", prefix: "migmatite_i" },
  { level: "level3", prefix: "topaz" },
  { level: "level3", prefix: "aquamarine" },
  { level: "level3", prefix: "diamond_cut" },
  { level: "level3", prefix: "diamond_rough" },
  { level: "level3", prefix: "partiSapphire" },
  { level: "level3", prefix: "ruby" },
  { level: "level3", prefix: "labradorite" },
  { level: "level3", prefix: "moonstone" },
];

// 캐릭터별 말풍선 미세조정(중심 정렬 기준에 더해짐). 단계·돌마다 머리 위치가 320 캔버스
// 중앙에서 조금씩 벗어나 있어 말풍선(과 꼬리)이 머리와 어긋나므로 스프라이트 접두어별로
// 보정한다(없으면 0). +x=오른쪽·-y=위. 표시 크기에는 CHAR_SIZE/320 배율로 자동 스케일된다.
// 좌하단·우하단·따라오기 모두 positionBubble을 거치므로 세 모드에 동일하게 적용된다.
// PREVIEW 튜너에서 t로 대상을 말풍선으로 바꾼 뒤 방향키로 맞추고 c로 값을 뽑을 수 있다.
const BUBBLE_OFFSET = {
  moonstone: { x: -10, y: -40 },
  labradorite: { x: -10, y: -40 },
  ruby: { x: -10, y: -20 },
  partiSapphire: { x: 0, y: -20 },
  diamond_rough: { x: -10, y: -30 },
  diamond_cut: { x: -10, y: -30 },
  aquamarine: { x: 0, y: -30 },
  topaz: { x: 0, y: -30 },
  migmatite_i: { x: -10, y: -20 },
  migmatite_e: { x: -10, y: -20 },
  corundumMarble_i: { x: -10, y: -20 },
  corundumMarble_e: { x: -10, y: -20 },
  eclogite_i: { x: -10, y: -20 },
  eclogite_e: { x: -10, y: -20 },
  pegmatite_i: { x: -10, y: -20 },
  pegmatite_e: { x: -10, y: -20 },
  gneiss: { x: -10, y: 0 },
  marble: { x: -10, y: 0 },
  basalt: { x: -10, y: 0 },
  granite: { x: -10, y: 0 },
  rockie: { x: -10, y: 0 },
};

const clickReactions = [
  { ko: "네, 여기 있어요.", en: "Yes, I'm right here." },
  { ko: "왜 부르셨어요?", en: "You called?" },
  { ko: "부르셨어요?", en: "Did you need me?" },
  { ko: "저 보고 싶으셨어요?", en: "Did you miss me?" },
  { ko: "같이 있어드릴게요.", en: "I'll keep you company." },
  { ko: "오늘도 화이팅입니다!", en: "You've got this today!" },
  { ko: "심심하신가요?", en: "Feeling bored?" },
  { ko: "무슨 일인가요?", en: "What's up?" },
  { ko: "무슨 작업 중이세요?", en: "What are you working on?" },
  { ko: "저는 잘 굴러가고 있어요.", en: "I'm rolling along just fine." },
  { ko: "오늘 기분은 어떠세요?", en: "How are you feeling today?" },
  { ko: "작업은 잘 되고 있나요?", en: "Is the work going well?" },
  { ko: "저도 옆에서 지켜보고 있어요.", en: "I'm watching from right here." },
  { ko: "필요하면 또 불러주세요.", en: "Call me again whenever you need." },
];

const TIME_CLICK_REACTIONS = {
  morning: [
    { ko: "좋은 아침이에요!", en: "Good morning!" },
    { ko: "오늘도 천천히 시작해봐요.", en: "Let's ease into today." },
    { ko: "기지개 켜셨나요?", en: "Did you stretch yet?" },
    { ko: "오늘 첫 할 일은 뭐예요?", en: "What's first on the list today?" },
    {
      ko: "아침엔 너무 서두르지 않아도 돼요.",
      en: "No need to rush in the morning.",
    },
  ],
  day: [
    { ko: "점심은 챙기셨나요?", en: "Did you have lunch?" },
    {
      ko: "낮에도 집중 잘하고 계시네요.",
      en: "You're focusing well this afternoon.",
    },
    {
      ko: "오후까지 에너지 아껴가요.",
      en: "Save some energy for the afternoon.",
    },
    {
      ko: "햇빛 한 번 보고 오셨나요?",
      en: "Have you stepped into the sun today?",
    },
    { ko: "오늘 흐름 괜찮으신가요?", en: "Is today flowing okay?" },
  ],
  evening: [
    { ko: "오늘 하루도 거의 다 왔어요.", en: "You're nearly through the day." },
    {
      ko: "저녁엔 조금 쉬어도 좋아요.",
      en: "It's fine to rest a little tonight.",
    },
    { ko: "슬슬 정리 모드인가요?", en: "Winding down now?" },
    {
      ko: "오늘 한 일, 꽤 많았을 것 같아요.",
      en: "You got quite a lot done today.",
    },
    {
      ko: "남은 일은 작게 쪼개서 해봐요.",
      en: "Break what's left into smaller pieces.",
    },
  ],
  night: [
    {
      ko: "늦은 시간이네요... 무리하지 마세요.",
      en: "It's getting late... don't push too hard.",
    },
    { ko: "저도 슬슬 졸려요.", en: "I'm getting sleepy too." },
    {
      ko: "이 시간엔 저장부터 해두세요.",
      en: "At this hour, save your work first.",
    },
    {
      ko: "눈이 무거워지는 시간이네요.",
      en: "It's the hour when eyes get heavy.",
    },
    {
      ko: "내일의 {owner}도 생각해주세요.",
      en: "Think of tomorrow's {owner} too.",
    },
  ],
};

const LONG_USE_CLICK_REACTIONS = [
  {
    after: 45 * 60 * 1000,
    messages: [
      {
        ko: "꽤 오래 앉아 있었어요. 잠깐 일어나볼까요?",
        en: "You've been sitting a while. Shall we stand up?",
      },
      {
        ko: "눈이 피곤할 시간이에요. 멀리 한 번 봐주세요.",
        en: "Your eyes must be tired. Look into the distance.",
      },
      {
        ko: "물 한 잔 마시고 와도 좋아요.",
        en: "A glass of water would be good.",
      },
    ],
  },
  {
    after: 90 * 60 * 1000,
    messages: [
      {
        ko: "잠깐 스트레칭하면 제가 기다리고 있을게요.",
        en: "Go stretch — I'll wait right here.",
      },
      {
        ko: "쉬는 것도 작업의 일부예요.",
        en: "Resting is part of the work too.",
      },
      { ko: "손목 한 번 풀어주세요.", en: "Give your wrists a shake." },
    ],
  },
  {
    after: 120 * 60 * 1000,
    messages: [
      {
        ko: "너무 오래 버티고 있는 건 아닌가요?",
        en: "Aren't you pushing a bit too long?",
      },
      {
        ko: "한 번 숨 돌리고 다시 해봐요.",
        en: "Take a breath, then get back to it.",
      },
      { ko: "잠깐 쉬었다 가도 좋아요.", en: "It's okay to pause for a bit." },
    ],
  },
];

// 규칙은 위에서부터 순서대로 검사하므로 "구체적인 것 → 일반적인 것" 순으로 둔다.
// (예: Shorts는 YouTube보다, PR 페이지는 일반 브라우저보다 먼저)
//
// - messages: 그 카테고리에서 랜덤으로 하나를 골라 보여줄 멘트 목록
// - silent: 매칭은 하되 아무 말도 안 함 (사생활 영역 - 뒤의 일반 규칙에 걸리는 것 방지)
// - quiet: 진입 멘트 한 번만 보여주고, 머무는 동안 추가 말풍선을 억제 (회의 등)
// - stages: 체류 시간(ms)에 따라 톤이 바뀌는 카테고리 (SNS 잔소리 등).
//           배터리 티어처럼 "현재 속한 구간"을 찾는 구조라, 같은 패턴을 재사용할 수 있다.
const WINDOW_RULES = [
  { id: "private", pattern: /kakaotalk|카카오톡|mail|메일/, silent: true },
  {
    id: "sensitive",
    pattern:
      /bank|은행|card|카드|증권|stock|주식|crypto|coinbase|upbit|bithumb|병원|hospital|정부|gov\.kr|민원|password|1password|bitwarden|keychain|authenticator|인증/,
    silent: true,
  },
  {
    id: "meeting",
    pattern: /zoom|google meet|meet\.google|webex/,
    messages: [
      {
        ko: "회의 중엔 저도 조용히 할게요.",
        en: "I'll stay quiet during your meeting.",
      },
    ],
    quiet: true,
  },
  {
    id: "chat",
    pattern: /slack|discord|teams/,
    messages: [
      { ko: "누가 불렀나 봐요.", en: "Someone's pinging you." },
      {
        ko: "대화 중이시군요, 방해하지 않을게요.",
        en: "You're chatting — I won't interrupt.",
      },
    ],
  },
  {
    id: "github-actions",
    pattern: /github.*actions|actions.*github|workflow runs|checks/,
    messages: [
      {
        ko: "초록 체크 기다리는 시간이네요.",
        en: "Waiting on that green check.",
      },
      {
        ko: "빌드가 얌전히 통과하길 빌게요.",
        en: "Hoping the build passes quietly.",
      },
    ],
  },
  {
    id: "github-pr",
    pattern: /pull request/,
    messages: [
      { ko: "머지 승인 기다리는 중?", en: "Waiting on merge approval?" },
      { ko: "리뷰 코멘트 잘 달아주세요~", en: "Leave good review comments~" },
    ],
  },
  {
    id: "github-issue",
    pattern: /github.*issues|issues.*github|new issue/,
    messages: [
      {
        ko: "이슈를 하나씩 굴려볼까요?",
        en: "Shall we roll through the issues one by one?",
      },
      {
        ko: "문제의 모양을 정리하는 중이군요.",
        en: "Shaping up the problem, I see.",
      },
    ],
  },
  {
    id: "dev-docs",
    pattern:
      /developer\.mozilla|mdn|stackoverflow|stack overflow|npmjs|npm |node\.js|react|vue|svelte|electron|typescript|chrome devtools/,
    messages: [
      {
        ko: "문서 보는 개발자, 믿음직해요.",
        en: "A dev who reads the docs — reliable.",
      },
      {
        ko: "해답의 조각을 찾는 중이군요.",
        en: "Hunting for the missing piece.",
      },
    ],
  },
  {
    id: "ide",
    pattern:
      /\bcode\b|vscode|intellij|webstorm|pycharm|android studio|xcode|sublime|cursor/,
    messages: [
      { ko: "집중모드 ON!", en: "Focus mode ON!" },
      { ko: "버그는 도망 못 가요.", en: "That bug can't get away." },
      {
        ko: "오늘도 멋진 코드 기대할게요!",
        en: "Looking forward to your code today!",
      },
    ],
  },
  {
    id: "terminal",
    pattern: /terminal|iterm|powershell|cmd\.exe/,
    messages: [
      { ko: "명령어 조심히 치세요..", en: "Type those commands carefully.." },
      { ko: "rm -rf는 안돼요!", en: "No rm -rf, please!" },
      {
        ko: "명령어, 하나도 안 틀리고 잘 치고 계세요.",
        en: "Not a single typo in those commands. Nice.",
      },
    ],
  },
  {
    id: "ai-assistant",
    pattern: /chatgpt|claude|perplexity|gemini|copilot/,
    messages: [
      {
        ko: "생각을 정리하는 중이시군요.",
        en: "Sorting out your thoughts, I see.",
      },
      {
        ko: "질문을 잘게 쪼개면 더 잘 굴러가요.",
        en: "Smaller questions roll along better.",
      },
    ],
  },
  {
    id: "research",
    pattern:
      /google search|naver|네이버|wikipedia|위키백과|arxiv|scholar|pubmed|medium/,
    messages: [
      { ko: "지식 산책 중이네요.", en: "Out for a walk through knowledge." },
      {
        ko: "자료 찾는 눈빛이 진지해요.",
        en: "That's a serious research face.",
      },
    ],
  },
  {
    id: "pdf",
    pattern: /preview|acrobat|pdf/,
    messages: [
      {
        ko: "문서 깊숙이 들어가셨네요.",
        en: "You've gone deep into the docs.",
      },
      {
        ko: "중요한 부분은 표시해두면 좋아요.",
        en: "Worth marking the important parts.",
      },
    ],
  },
  {
    id: "shorts",
    pattern: /shorts/,
    messages: [
      {
        ko: "숏츠 늪 조심하세요...",
        en: "Careful, that's the shorts swamp...",
      },
      {
        ko: "숏츠는 한 개만 보는 게 불가능하대요.",
        en: "They say watching just one short is impossible.",
      },
    ],
  },
  {
    id: "youtube",
    pattern: /youtube|유튜브/,
    messages: [
      { ko: "즐감하세요~", en: "Enjoy the show~" },
      { ko: "재밌는 거 보시나요?", en: "Watching something fun?" },
    ],
  },
  {
    id: "ott",
    pattern:
      /netflix|넷플릭스|watcha|왓챠|wavve|웨이브|disney\+|디즈니|tving|티빙/,
    messages: [
      { ko: "팝콘 챙기셨나요?", en: "Got your popcorn?" },
      {
        ko: "편하게 보세요, 저는 조용히 있을게요.",
        en: "Enjoy it — I'll stay quiet.",
      },
    ],
  },
  {
    id: "music",
    pattern: /spotify|youtube music|music|melon/,
    messages: [
      { ko: "좋은 노래네요.", en: "That's a good song." },
      {
        ko: "좋은 음악 듣고 계시네요.",
        en: "You're listening to something good.",
      },
    ],
  },
  {
    id: "game",
    pattern:
      /steam|battle\.net|riot client|league of legends|valorant|epic games|minecraft/,
    messages: [
      { ko: "잠깐 쉬는 시간인가요?", en: "Taking a little break?" },
      {
        ko: "한 판만... 이라는 말은 조심해야 해요.",
        en: '"Just one more round" is a dangerous phrase.',
      },
    ],
  },
  {
    id: "sns",
    pattern: /instagram|인스타그램|twitter|트위터|x\.com/,
    stages: [
      {
        after: 0,
        messages: [{ ko: "잠깐 쉬시는 중?", en: "Taking a little break?" }],
      },
      {
        after: 5 * 60 * 1000,
        messages: [
          {
            ko: "슬슬... 하던 일이 부르고 있지 않나요?",
            en: "Isn't that work starting to call you back?",
          },
        ],
      },
      {
        after: 15 * 60 * 1000,
        messages: [
          {
            ko: "이제 진짜 그만!! 할 일 하셔야죠!!",
            en: "Okay, that's enough!! Back to work!!",
          },
        ],
      },
    ],
  },
  {
    id: "shopping",
    pattern:
      /coupang|쿠팡|musinsa|무신사|11번가|gmarket|지마켓|aliexpress|amazon|apple store|steam store/,
    messages: [
      { ko: "장바구니만 채우고 계신가요?", en: "Just filling the cart again?" },
      { ko: "지갑은 안녕하신가요..?", en: "Is your wallet holding up..?" },
    ],
  },
  {
    id: "food",
    pattern: /baemin|배달의민족|yogiyo|요기요|coupang eats|쿠팡이츠/,
    messages: [
      { ko: "맛있는 고민 중이시네요.", en: "A delicious dilemma." },
      {
        ko: "오늘 메뉴는 신중한 문제죠.",
        en: "Today's menu is a serious matter.",
      },
    ],
  },
  {
    id: "calendar",
    pattern: /calendar|캘린더|google calendar|ical/,
    messages: [
      { ko: "일정이 꽤 촘촘하네요.", en: "That's a tightly packed schedule." },
      {
        ko: "시간표 사이에 숨 쉴 틈도 챙겨주세요.",
        en: "Leave room to breathe between blocks.",
      },
    ],
  },
  {
    id: "task",
    pattern: /jira|linear|trello|asana|todoist|reminders|미리 알림/,
    messages: [
      {
        ko: "할 일을 하나씩 굴려볼까요?",
        en: "Shall we roll through the tasks one by one?",
      },
      { ko: "작게 쪼개면 덜 무거워져요.", en: "Smaller pieces feel lighter." },
    ],
  },
  {
    id: "notes",
    pattern: /notion|obsidian/,
    messages: [
      { ko: "정리의 신!", en: "Master of tidiness!" },
      {
        ko: "오늘도 깔끔하게 정리 중이시네요.",
        en: "Keeping things neat again today.",
      },
    ],
  },
  {
    id: "docs",
    pattern: /word|docs\.google|google docs|한글|hwp/,
    messages: [
      { ko: "글쓰기 화이팅!", en: "Happy writing!" },
      {
        ko: "좋은 문장 나오길 바랄게요.",
        en: "Hope the sentences come easily.",
      },
    ],
  },
  {
    id: "design",
    pattern: /figma|photoshop|illustrator|canva|pinterest|dribbble|behance/,
    messages: [
      {
        ko: "디자인 감각 좋으시네요.",
        en: "You've got a good eye for design.",
      },
      { ko: "오늘 작업물도 기대돼요!", en: "Excited to see today's work!" },
    ],
  },
  {
    id: "maps",
    pattern: /google maps|naver map|카카오맵|maps/,
    messages: [
      {
        ko: "어디론가 가실 준비인가요?",
        en: "Getting ready to head somewhere?",
      },
      {
        ko: "길 찾기는 미리 해두면 마음이 편해요.",
        en: "Planning the route ahead puts the mind at ease.",
      },
    ],
  },
  {
    id: "browser",
    pattern: /chrome|safari|edge|firefox|whale/,
    messages: [
      { ko: "무엇을 찾아보고 계신가요?", en: "What are you looking up?" },
    ],
  },
];

// 배터리가 부족하면(충전 중 제외) sleepy.gif로 바꾸고 단계별 메시지를 보여준다.
// 낮은 단계부터 순서대로 두어 getBatteryTier가 "현재 속한 가장 낮은 구간"을 찾는다.
// 예) 22% → 30 단계, 8% → 10 단계, 1% → 1 단계
const BATTERY_TIERS = [
  {
    level: 1,
    sprite: "sad",
    message: {
      ko: "이제 한계예요, 충전해주세요ㅠㅠ",
      en: "That's my limit — please charge me ㅠㅠ",
    },
  },
  {
    level: 5,
    sprite: "sad",
    message: {
      ko: "저 곧 쓰러질 것 같아요... 충전 서둘러주세요!!",
      en: "I'm about to collapse... hurry and charge me!!",
    },
  },
  {
    level: 10,
    sprite: "sleepy",
    message: {
      ko: "이제 정말 졸려요.. 얼마 못 버틸 것 같아요.",
      en: "I'm really drowsy now.. I can't hold on much longer.",
    },
  },
  {
    level: 15,
    sprite: "sleepy",
    message: {
      ko: "눈이 슬슬 감겨요... 충전이 필요해요.",
      en: "My eyes are closing... I need a charge.",
    },
  },
  {
    level: 20,
    sprite: "sleepy",
    message: {
      ko: "점점 힘이 빠져요... 충전기 챙겨주시면 안 될까요?",
      en: "I'm running low... could you grab the charger?",
    },
  },
  {
    level: 30,
    sprite: "sleepy",
    message: {
      ko: "저..슬슬 피곤한데, 충전 부탁드려요...",
      en: "Um.. I'm getting tired. Charge me, please...",
    },
  },
];

const SIZE_PX = { small: 96, medium: 128, large: 176 };

// 레벨별 스프라이트 기하 (assets/gif 실측). 2·3단계는 그림이 320 캔버스에서 0·1단계보다
// 크게·아래쪽까지 그려져 있어, 표시 배율(scale)과 발밑 여백(bottomRatio)을 레벨별로 보정한다.
//  scale       : 표시 크기 배율. 0/1단계=1, 2/3단계는 겉보기를 0/1단계에 맞춰 축소.
//  bottomRatio : 그림 하단 투명 여백 / 320. 발밑을 화면 하단에서 일정 간격에 앉히는 기준.
const SPRITE_GEOM = {
  level0: { scale: 1.0, bottomRatio: 0.3125 },
  level1: { scale: 1.0, bottomRatio: 0.3125 },
  level2: { scale: 0.75, bottomRatio: 0.25 },
};

// 3단계는 보석마다 크기·모양 편차가 커서 캐릭터(접두어)별로 따로 잡는다.
// 우선 전부 2단계와 동일값으로 두고, GUI(PREVIEW)로 보며 캐릭터별로 미세조정한다.
const LEVEL3_GEOM = {
  topaz: { scale: 0.75, bottomRatio: 0.25 },
  aquamarine: { scale: 0.75, bottomRatio: 0.25 },
  diamond_cut: { scale: 0.75, bottomRatio: 0.25 },
  diamond_rough: { scale: 0.75, bottomRatio: 0.25 },
  partiSapphire: { scale: 0.75, bottomRatio: 0.25 },
  ruby: { scale: 0.75, bottomRatio: 0.25 },
  labradorite: { scale: 0.75, bottomRatio: 0.23 },
  moonstone: { scale: 0.75, bottomRatio: 0.23 },
};

const FOOT_LINE_GAP = 12; // 발밑과 화면 하단 사이 간격(px). 0/1단계 현재 값 유지.

// 옵션창 행 아이콘(ICON_*)은 트레이와 공용이라 ../shared/icons.js에 있다.
const MODES = [
  {
    id: "clean",
    icon: ICON_KEYBOARD,
    label: { ko: "키보드 청소 모드", en: "Keyboard Cleaning" },
    desc: {
      ko: "키보드·클릭 잠금 · 닦을 때",
      en: "Locks keys & clicks · for wiping down",
    },
  },
  {
    id: "focus",
    icon: ICON_TARGET,
    label: { ko: "집중 모드", en: "Focus Mode" },
    desc: {
      ko: "설정 시간 · 말풍선 없이 조용히",
      en: "Set duration · quiet, no bubbles",
    },
  },
  {
    id: "nap",
    icon: ICON_MOON,
    label: { ko: "쪽잠 모드", en: "Nap Mode" },
    desc: {
      ko: "화면·키보드 잠금 · 끝나면 알람",
      en: "Locks screen & keys · alarm at the end",
    },
  },
];
