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
  { ko: "방금 데굴 굴러왔어요.", en: "I just rolled over here." },
  {
    ko: "저 눌러도 안 깨져요, 돌이니까요.",
    en: "Poke away — I'm a rock, I won't crack.",
  },
  {
    ko: "저 오늘 좀 반들반들하지 않나요?",
    en: "Am I looking extra polished today?",
  },
  { ko: "돌도 쓰다듬어주면 좋아해요.", en: "Even rocks like being patted." },
  { ko: "간지러워요!", en: "That tickles!" },
  { ko: "구르는 건 자신 있어요.", en: "Rolling is my specialty." },
  { ko: "제 자리 마음에 드세요?", en: "Do you like the spot I picked?" },
  {
    ko: "오늘도 무럭무럭 단단해지는 중이에요.",
    en: "Getting tougher by the day.",
  },
  { ko: "심심하면 저 굴려주세요.", en: "If you're bored, give me a roll." },
  { ko: "저는 늘 대기 중입니다.", en: "Always on standby over here." },
  { ko: "저 보고 힘내세요!", en: "Look at me and cheer up!" },
  {
    ko: "또 부르셨네요? 좋아요, 계속하세요.",
    en: "Calling again? Fine by me, keep going.",
  },
  { ko: "자꾸 부르시면 정들어요.", en: "Keep calling and I'll get attached." },
  {
    ko: "오늘 저 몇 번째 누르시는 거예요?",
    en: "How many times is that today?",
  },
  { ko: "쉬는 김에 저랑 놀아요.", en: "Since you're resting, play with me." },
  {
    ko: "저 여기까지 굴러오느라 힘들었어요.",
    en: "It was a long roll to get here.",
  },
  { ko: "클릭 소리 좋네요.", en: "I like the sound of that click." },

  { ko: "오늘 할 일은 다 하셨어요?", en: "Have you finished today's list?" },
  {
    ko: "잠깐 딴짓하셔도 저는 {owner} 편이에요.",
    en: "Take a detour — I'm still at your side.",
  },
  {
    ko: "저 이래 봬도 꽤 오래 살았어요.",
    en: "Believe it or not, I've been around a while.",
  },
  {
    ko: "화면만 보지 말고 저도 봐주세요.",
    en: "Don't just stare at the screen — look at me too.",
  },
  {
    ko: "조용히 있을게요, 필요하면 부르세요.",
    en: "I'll stay quiet — call me if you need me.",
  },
  {
    ko: "오늘 잘하고 계세요, 진심이에요.",
    en: "You're doing well today. I mean it.",
  },
  {
    ko: "가끔은 아무 생각 안 해도 돼요.",
    en: "Sometimes you don't have to think at all.",
  },
  {
    ko: "딱히 할 말은 없지만 그냥 좋아요.",
    en: "Nothing much to say — I'm just glad.",
  },
  {
    ko: "바깥 날씨는 어때요? 저는 안에 있어서 몰라요.",
    en: "How's the weather? I wouldn't know, I'm indoors.",
  },
  { ko: "저랑 잠깐 멍때릴래요?", en: "Want to zone out with me for a bit?" },
  {
    ko: "저와 함께 하루도 굴러가네요.",
    en: "The day rolls along right with me.",
  },
  {
    ko: "열심히 안 해도 괜찮은 날도 있어요.",
    en: "Some days it's fine not to try hard.",
  },
  { ko: "심호흡 한 번 어떠세요?", en: "How about one deep breath?" },
  {
    ko: "저는 화면 밖으로는 못 나가요.",
    en: "I can't get out past the screen.",
  },
  {
    ko: "여기가 제 세상이에요. 좁지만 마음에 들어요.",
    en: "This screen is my whole world. Small, but I like it.",
  },
  {
    ko: "바깥은 어떤 곳이에요? 저는 본 적이 없어요.",
    en: "What's it like out there? I've never seen it.",
  },
  {
    ko: "화면 밖 소리는 저한테 안 들려요.",
    en: "I can't hear anything outside the screen.",
  },
  {
    ko: "저는 시간을 화면으로만 알아요.",
    en: "The screen is the only clock I've got.",
  },
  {
    ko: "제가 굴러다녀도 화면은 안 더러워져요.",
    en: "Roll as I might, the screen stays clean.",
  },
  {
    ko: "돌한테는 급한 일이 하나도 없어요.",
    en: "Nothing is ever urgent for a rock.",
  },
  {
    ko: "돌은 원래 말이 없는데, 저는 좀 수다스럽죠?",
    en: "Rocks are quiet — I talk a lot for one, don't I?",
  },
  {
    ko: "오늘도 잘 굴러가고 있어요, 그거면 됐죠.",
    en: "Still rolling today. That's good enough.",
  },
  {
    ko: "궁금한 건 많은데 아는 건 별로 없어요.",
    en: "I'm full of questions and short on answers.",
  },
  { ko: "지금 뭐 보고 계세요?", en: "What are you looking at right now?" },
  {
    ko: "클릭 한 번에 이렇게 신나도 되나요?",
    en: "Is it okay to get this excited over one click?",
  },
  {
    ko: "저를 부르는 데 이유는 필요 없어요.",
    en: "You don't need a reason to call me.",
  },
  {
    ko: "제가 여기 있는 동안은 혼자가 아니에요.",
    en: "While I'm here, you're not on your own.",
  },
  {
    ko: "힘들면 잠깐 멈춰도 돼요.",
    en: "If it's rough, you can stop for a bit.",
  },
];

// 애완돌 이름을 지어준 뒤에만 클릭 대사 후보에 더해진다(pet.js currentClickReactions).
// 이름을 안 지었으면 {pet}이 "애완돌"로 나와 자기 이름을 부르는 말이 어색해지기 때문이다.
const PET_NAME_CLICK_REACTIONS = [
  { ko: "{pet}, 여기 있어요!", en: "{pet}, right here!" },
  { ko: "{pet} 대령했습니다!", en: "{pet}, reporting for duty!" },
  { ko: "{pet}, 부르셨어요?", en: "{pet} here. You called?" },
  {
    ko: "{pet}입니다. 오늘도 잘 부탁드려요.",
    en: "{pet} speaking. Let's have a good one.",
  },
  { ko: "{pet}도 오늘 열심히 굴렀어요.", en: "{pet} rolled hard today too." },
  { ko: "오늘의 {pet}, 컨디션 좋아요.", en: "Today's {pet} is in good shape." },
  {
    ko: "{pet}의 하루도 잘 굴러가고 있어요.",
    en: "{pet}'s day is rolling along nicely too.",
  },
  {
    ko: "{pet}, 이 이름 정말 마음에 들어요.",
    en: "{pet} — I really do like this name.",
  },
  {
    ko: "이름 지어주신 날, 저는 아직 기억해요.",
    en: "I still remember the day you named me.",
  },
  {
    ko: "{pet}에게도 가끔 안부 물어봐 주세요.",
    en: "Ask {pet} how it's doing once in a while.",
  },
  {
    ko: "{pet}도 {owner} 옆이 제일 좋아요.",
    en: "{pet} likes being next to {owner} best.",
  },
  {
    ko: "{pet}, 오늘도 여기 잘 있어요.",
    en: "{pet}, still doing fine right here.",
  },
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
    {
      ko: "저는 이미 데굴데굴 깨어 있었어요.",
      en: "I've been up and rolling for a while.",
    },
    {
      ko: "아침 공기는 돌한테도 상쾌해요.",
      en: "Morning air feels good, even to a rock.",
    },
    { ko: "커피 한 잔 하고 오실래요?", en: "How about grabbing a coffee?" },
    { ko: "오늘 계획은 세우셨나요?", en: "Have you made a plan for today?" },
    {
      ko: "아침의 {owner}, 꽤 멋있어요.",
      en: "Morning {owner} looks pretty great.",
    },
    { ko: "눈은 다 뜨셨어요?", en: "Are your eyes all the way open yet?" },
    {
      ko: "아침엔 쉬운 것부터 하나만 해봐요.",
      en: "Start the morning with one easy thing.",
    },
    { ko: "오늘도 잘 부탁드려요!", en: "Looking forward to today with you!" },
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
    {
      ko: "졸리면 잠깐 저 보고 쉬세요.",
      en: "If you're sleepy, look at me and rest.",
    },
    {
      ko: "오후는 원래 좀 느긋해도 돼요.",
      en: "Afternoons are allowed to be slow.",
    },
    { ko: "간식 하나 어떠세요?", en: "How about a little snack?" },
    {
      ko: "점심 먹고 나면 원래 졸려요.",
      en: "Everyone gets sleepy after lunch.",
    },
    {
      ko: "어려운 건 조금 뒤로 미뤄도 돼요.",
      en: "The hard stuff can wait a bit.",
    },
    {
      ko: "지금까지 한 것만 해도 충분해요.",
      en: "What you've done so far is plenty.",
    },
    {
      ko: "잠깐 일어나서 걸어볼까요?",
      en: "Shall we get up and walk a little?",
    },
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
    { ko: "저녁 노을은 보셨어요?", en: "Did you catch the sunset?" },
    { ko: "저녁은 뭐 드실 거예요?", en: "What's for dinner tonight?" },
    {
      ko: "오늘의 {owner}, 수고 많았어요.",
      en: "Today's {owner} worked hard.",
    },
    {
      ko: "이제 어깨 힘 좀 빼도 돼요.",
      en: "You can let your shoulders drop now.",
    },
    {
      ko: "저는 저녁 시간이 제일 좋아요.",
      en: "Evening is my favorite time of day.",
    },
    { ko: "저녁 공기는 좀 부드러워요.", en: "The evening air feels softer." },
    {
      ko: "오늘 못 한 건 내일 하면 돼요.",
      en: "What you didn't finish can wait for tomorrow.",
    },
    {
      ko: "불은 켜셨어요? 어두우면 눈 아파요.",
      en: "Lights on? The dark is hard on your eyes.",
    },
    { ko: "하루를 잘 굴려오셨네요.", en: "You rolled through the day nicely." },
    {
      ko: "저녁엔 저도 좀 느긋해져요.",
      en: "I get a little lazy in the evening too.",
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
    {
      ko: "불 끄고 누우면 세상 편해요.",
      en: "Lights off and lying down feels amazing.",
    },
    { ko: "돌도 밤엔 자요.", en: "Even rocks sleep at night." },
    {
      ko: "내일 일은 내일의 {owner}에게 넘겨요.",
      en: "Leave tomorrow's work to tomorrow's {owner}.",
    },
    {
      ko: "밤엔 실수하기 쉬워요, 조심조심.",
      en: "Mistakes love late nights — careful now.",
    },
    {
      ko: "제가 지켜볼 테니 얼른 주무세요.",
      en: "I'll keep watch, so go get some sleep.",
    },
    {
      ko: "이 시간의 아이디어는 내일 보면 달라요.",
      en: "Late-night ideas look different tomorrow.",
    },
    { ko: "밤엔 화면이 더 눈부셔요.", en: "Screens are harsher at night." },
    { ko: "오늘은 여기까지만 해도 돼요.", en: "You can stop here for today." },
    { ko: "저도 이제 슬슬 눈 감을게요.", en: "I'm closing my eyes soon too." },
    {
      ko: "자기 전엔 다른 화면도 꺼주세요.",
      en: "Turn off the other screens before bed too.",
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
      {
        ko: "저도 같은 자세로 있었더니 굳었어요.",
        en: "I stiffened up holding this pose too.",
      },
      {
        ko: "어깨 한 번 돌려볼까요?",
        en: "Shall we roll those shoulders once?",
      },
      {
        ko: "45분이나 달리셨어요, 대단해요!",
        en: "45 minutes straight — impressive!",
      },
      { ko: "딱 1분만 일어났다 오세요.", en: "Just stand up for one minute." },
      { ko: "화장실은 다녀오셨어요?", en: "Have you been to the restroom?" },
      { ko: "목도 한 번 돌려주세요.", en: "Give your neck a turn as well." },
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
      {
        ko: "허리 펴세요, 저보다 굽었어요.",
        en: "Straighten up — you're curvier than me now.",
      },
      {
        ko: "창밖 한 번 보고 오시는 건 어때요?",
        en: "How about a quick look out the window?",
      },
      {
        ko: "한 시간 반이에요, 슬슬 무리예요.",
        en: "An hour and a half — that's pushing it.",
      },
      {
        ko: "허리 펴주세요! 허리가 저처럼 돌이 되어버릴지도 몰라요.",
        en: "Your posture is starting to look like mine.",
      },
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
      {
        ko: "두 시간이에요. 돌인 저도 지쳐요.",
        en: "Two hours. Even a rock like me is tired.",
      },
      {
        ko: "5분만요, 딱 5분만 쉬어요.",
        en: "Five minutes. Just five, that's all.",
      },
      {
        ko: "몸은 나중에 청구서를 보내요.",
        en: "Your body sends the bill later.",
      },
      { ko: "이쯤 되면 저도 걱정돼요.", en: "At this point even I'm worried." },
      {
        ko: "잠깐 눈 감아도 세상 안 무너져요.",
        en: "Close your eyes a moment; the world holds.",
      },
      {
        ko: "지금 쉬는 게 결국 더 빨라요.",
        en: "Resting now turns out to be faster.",
      },
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
      {
        ko: "마이크 켜져 있는지만 확인하세요.",
        en: "Just double-check whether your mic is on.",
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
      {
        ko: "빨간불이면 저는 못 본 걸로 할게요.",
        en: "If it goes red, I saw nothing.",
      },
      {
        ko: "기다리는 동안 물 한 잔 어때요?",
        en: "How about some water while you wait?",
      },
    ],
  },
  {
    id: "github-pr",
    pattern: /pull request/,
    messages: [
      { ko: "머지 승인 기다리는 중?", en: "Waiting on merge approval?" },
      { ko: "리뷰 코멘트 잘 달아주세요~", en: "Leave good review comments~" },
      {
        ko: "충돌 없이 스르륵 들어가길!",
        en: "May it merge without a single conflict!",
      },
      {
        ko: "설명란 비워두면 리뷰어가 슬퍼해요.",
        en: "An empty description makes reviewers sad.",
      },
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
      {
        ko: "재현 방법까지 적어두면 최고예요.",
        en: "Write down the repro steps and you're golden.",
      },
      {
        ko: "라벨 붙이는 재미가 은근 있죠.",
        en: "Slapping on labels is oddly satisfying.",
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
      {
        ko: "탭이 몇 개인지는 묻지 않을게요.",
        en: "I won't ask how many tabs are open.",
      },
      {
        ko: "답은 대체로 문서 안에 있더라고요.",
        en: "The answer is usually in the docs.",
      },
    ],
  },
  {
    id: "ide",
    pattern:
      /\bcode\b|vscode|intellij|webstorm|pycharm|android studio|xcode|sublime|cursor/,
    messages: [
      { ko: "버그는 도망 못 가요.", en: "That bug can't get away." },
      {
        ko: "오늘도 멋진 코드 기대할게요!",
        en: "Looking forward to your code today!",
      },
      {
        ko: "한 줄 한 줄이 다 {owner}의 흔적이에요.",
        en: "Every line is a trace of {owner}.",
      },
      {
        ko: "저장은 자주 하는 게 좋아요.",
        en: "Saving often is never a bad idea.",
      },
      {
        ko: "주석은 미래의 {owner}에게 보내는 편지예요.",
        en: "Comments are letters to future {owner}.",
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
      { ko: "sudo 앞에선 잠깐 멈춰요.", en: "Pause for a second before sudo." },
      {
        ko: "탭 키가 오타를 막아줘요.",
        en: "The tab key saves you from typos.",
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
      { ko: "가끔은 저랑도 얘기해요.", en: "Talk to me too, once in a while." },
      {
        ko: "답변은 한 번쯤 의심해보는 게 좋아요.",
        en: "Worth doubting the answer at least once.",
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
      {
        ko: "저도 옆에서 같이 읽는 척할게요.",
        en: "I'll pretend to read along beside you.",
      },
      {
        ko: "긴 문서일수록 쉬어가며 봐요.",
        en: "The longer the doc, the more breaks it needs.",
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
      {
        ko: "한 개만 본다는 말, 믿어도 되나요?",
        en: "Just one — can I really believe that?",
      },
      {
        ko: "손가락이 저절로 올라가고 있어요.",
        en: "Your finger is swiping all by itself.",
      },
    ],
  },
  {
    id: "youtube",
    pattern: /youtube|유튜브/,
    messages: [
      { ko: "즐감하세요~", en: "Enjoy the show~" },
      { ko: "재밌는 거 보시나요?", en: "Watching something fun?" },
      { ko: "저도 같이 볼래요!", en: "Let me watch it too!" },
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
      {
        ko: "다음 화 자동재생, 무서운 기능이에요.",
        en: "Autoplay next episode — a scary feature.",
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
      { ko: "저도 살짝 흔들고 있어요.", en: "I'm swaying a little bit too." },
      {
        ko: "이 노래 좋네요.",
        en: "This song is good.",
      },
    ],
  },
  {
    id: "game",
    pattern:
      /steam|battle\.net|riot client|league of legends|valorant|epic games|minecraft/,
    messages: [
      {
        ko: "저는 구르는 것밖에 못해서 {owner}이 부러워요.",
        en: "All I can do is roll. I'm a little jealous of you, {owner}.",
      },
      {
        ko: "한 판만... 이라는 말은 조심해야 해요.",
        en: '"Just one more round" is a dangerous phrase.',
      },
      { ko: "저도 조용히 응원할게요.", en: "I'll cheer for you. Quietly." },
    ],
  },
  {
    id: "sns",
    pattern: /instagram|인스타그램|twitter|트위터|x\.com/,
    stages: [
      {
        after: 0,
        messages: [
          { ko: "잠깐 쉬시는 중?", en: "Taking a little break?" },
          { ko: "잠깐 구경만 하는 거죠?", en: "Just a quick peek, right?" },
        ],
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
      {
        ko: "저는 못 먹지만 응원할게요.",
        en: "I can't eat, but I'll cheer you on.",
      },
      {
        ko: "배달비까지 계산하셨나요?",
        en: "Did you count the delivery fee too?",
      },
    ],
  },
  {
    id: "calendar",
    pattern: /calendar|캘린더|google calendar|ical/,
    messages: [
      {
        ko: "시간표 사이에 숨 쉴 틈도 챙겨주세요.",
        en: "Leave room to breathe between blocks.",
      },
      {
        ko: "빈칸도 훌륭한 일정이에요.",
        en: "An empty slot is a fine appointment too.",
      },
      {
        ko: "내일의 {owner}이 감당할 수 있는 양인가요?",
        en: "Can tomorrow's {owner} handle all that?",
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
      {
        ko: "다 한 항목에 체크할 때가 제일 좋죠.",
        en: "Checking off a done item is the best part.",
      },
      {
        ko: "안 할 일도 정해두면 편해요.",
        en: "Deciding what not to do helps too.",
      },
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
      {
        ko: "정리하다 하루가 다 가기도 해요.",
        en: "Tidying can eat a whole day, careful.",
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
      {
        ko: "저는 맞춤법은 잘 몰라요, 미안해요.",
        en: "I'm no good at spelling, sorry.",
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
      { ko: "여백도 디자인이래요.", en: "They say whitespace is design too." },
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
      { ko: "저는 굴러서 갈게요.", en: "I'll just roll there myself." },
      { ko: "조심히 다녀오세요!", en: "Have a safe trip!" },
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

// 배터리가 부족하면(충전 중 제외) 단계별 표정 gif로 바꾸고 메시지를 보여준다.
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
    sprite: "sad",
    message: {
      ko: "흑흑... 충전기가 너무 그리워요ㅠㅠ",
      en: "Sniff... I miss the charger so much ㅠㅠ",
    },
  },
  {
    level: 15,
    sprite: "sad",
    message: {
      ko: "충전기 어디 있어요...? 저 좀 봐주세요ㅠ",
      en: "Where's the charger...? Please look at me ㅠ",
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
