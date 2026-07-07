const character = document.getElementById("character");
const bubble = document.getElementById("bubble");
const qcard = document.getElementById("qcard");

// ---------- 1. 캐릭터 위치 및 마우스 추적 로직 ----------

let CHAR_SIZE = 128; // 실제 렌더링 크기(style.css의 .character width/height)와 일치시켜야 좌표 계산이 정확함. 설정 '크기'로 바뀔 수 있음
let posY = window.innerHeight - 100; // 캐릭터 세로 위치 (Dock 상태에 따라 위아래로 슬라이드)
let posX = window.innerWidth / 2;
let targetX = posX; // 따라갈 목표 X (매 프레임 마우스 위치에 따라 계산됨)
let mouseX = posX + CHAR_SIZE / 2; // 최신 마우스 X 좌표 (바라보는 방향 판단용)
let facing = "right"; // 현재 바라보는 방향 (표시할 gif 결정)
let stonePrefix = "rockie"; // 표시할 돌 종류 gif 접두어. 확정 전엔 기본 캐릭터(rockie)

const EASE = 0.06; // 목표를 향해 이동하는 비율이 작을수록 천천히 따라감
const MAX_SPEED = 1; // 프레임당 최대 이동 픽셀 (너무 빠르지 않게 제한)
const MAX_SPEED_FIXED = 10; // 고정 위치로 이동할 때는 좀 더 빠르게 미끄러져 감
const FIXED_EDGE_GAP = 60; // 고정 모드에서 화면 끝과 펫 사이 여백(말풍선이 개행되며 펫을 가리지 않도록)
const BASE_CHAR_SIZE = 128; // 크기 '보통' 기준값. 이 값 대비 커/작아져도 발밑 높이는 고정
const BASE_SPRITE_MARGIN = 36; // 보통 크기(128)일 때의 SPRITE_MARGIN. 발밑 보정 기준값
const FACE_DEADZONE = 6; // 마우스가 중심에서 이 픽셀 이내면 방향 유지 (gif 깜빡임 방지)
// gif(320px)를 128px로 줄여 표시하는데 캐릭터 그림 둘레에 투명 여백이 있다.
// 그래서 박스 경계를 마우스에 붙여도 "보이는 캐릭터"는 이 여백만큼 떨어져 보인다.
// 바라보는 쪽 여백만큼 더 파고들게 해서 실제 그림이 마우스에 닿도록 보정한다.
// (표시 크기 128px 기준 측정값 ≈ 36px, 0으로 두면 박스 경계 기준으로 돌아감. 크기에 비례해 조정)
let SPRITE_MARGIN = 36;

// 설정 '펫 위치'. "follow"=커서 추적, "bottom-left"/"bottom-right"=하단 모서리 고정
let placement = "follow";

let paused = false;
let pauseTimer = null;
let cardOpen = false; // 질문 카드가 열려 있으면 걷기를 멈추고 카드를 펫 옆에 고정

// ---------- Dock 회피 ----------
// 메인 프로세스가 알려주는 Dock 상태. Dock이 보이고 캐릭터(보이는 그림 기준)가
// Dock의 가로 범위와 겹치면 Dock 바로 위를, 아니면 화면 맨 아래를 목표로 잡고
// 매 프레임 부드럽게 슬라이드한다. (순간이동 없음)
let dockState = { visible: false, x: 0, width: 0, height: 0 };

const EASE_Y = 0.15; // 세로 이동 감속 비율 (목표에 가까울수록 느려짐)
const MAX_SPEED_Y = 5; // 프레임당 세로 최대 이동 픽셀

function groundY() {
  // 펫의 '발밑'(그림 하단 = 박스 하단 - 투명 여백 SPRITE_MARGIN)이 크기와 무관하게
  // 같은 높이에 오도록 top 기준선을 잡는다. 보통(128) 기준선은 innerHeight - 100.
  // 크기가 바뀌면 박스 크기(CHAR_SIZE)와 투명 여백(SPRITE_MARGIN) 변화량을 함께 보정해
  // 발밑 높이를 유지하고, 커진 만큼은 위쪽으로만 자라게 한다.
  return (
    window.innerHeight -
    100 -
    (CHAR_SIZE - BASE_CHAR_SIZE) +
    (SPRITE_MARGIN - BASE_SPRITE_MARGIN)
  );
}

// 현재 위치에서 Dock 위로 올라가야 하는 높이 (안 올라가도 되면 0)
function dockLift() {
  if (!dockState.visible || dockState.height <= 0) return 0;
  const left = posX + SPRITE_MARGIN; // 투명 여백을 뺀 실제 그림의 좌우 경계
  const right = posX + CHAR_SIZE - SPRITE_MARGIN;
  const overlaps = right > dockState.x && left < dockState.x + dockState.width;
  return overlaps ? dockState.height : 0;
}

function verticalStep() {
  const targetY = groundY() - dockLift();
  const remaining = targetY - posY;
  if (Math.abs(remaining) < 0.5) {
    posY = targetY;
    return;
  }
  let delta = remaining * EASE_Y;
  if (delta > MAX_SPEED_Y) delta = MAX_SPEED_Y;
  else if (delta < -MAX_SPEED_Y) delta = -MAX_SPEED_Y;
  posY += delta;
}

window.petAPI.onDockState((state) => {
  dockState = state;
});

function clampX(x) {
  return Math.max(0, Math.min(window.innerWidth - CHAR_SIZE, x));
}

function placeCharacter() {
  character.style.left = posX + "px";
  character.style.top = posY + "px";
}

function setFacing(dir) {
  if (dir === facing) return;
  facing = dir;
  applySprite();
}

function spriteUrl(name) {
  return `../../../assets/gif/${stonePrefix}_${name}.gif`;
}

// 지친 상태(배터리 부족)면 단계별 표정 gif, 아니면 바라보는 방향의 걷기 gif를 표시.
// 표시할 파일은 현재 stonePrefix(rockie 또는 확정된 돌)에 따라 결정된다.
function applySprite() {
  const name = tiredSprite || (facing === "left" ? "left" : "right");
  const src = spriteUrl(name);
  if (!character.src.endsWith(src)) character.src = src;
}

function followStep() {
  if (!paused && !cardOpen) {
    let cap = MAX_SPEED;

    if (placement === "follow") {
      // 마우스가 캐릭터 중심의 어느 쪽에 있는지에 따라 "설 위치"(목표)를 정한다.
      // 캐릭터는 마우스 반대편에 서서 경계가 마우스에 붙도록 한다.
      const center = posX + CHAR_SIZE / 2;
      if (mouseX >= center) {
        // 마우스가 오른쪽 → 캐릭터는 왼쪽에 서고, 오른쪽 "그림 가장자리"를 마우스에 붙임
        targetX = clampX(mouseX - CHAR_SIZE + SPRITE_MARGIN);
      } else {
        // 마우스가 왼쪽 → 캐릭터는 오른쪽에 서고, 왼쪽 "그림 가장자리"를 마우스에 붙임
        targetX = clampX(mouseX - SPRITE_MARGIN);
      }

      // 마우스가 캐릭터 중심의 어느 쪽에 있는지로 바라보는 방향 결정
      // (자리를 잡고 멈춰도 마우스를 계속 바라보게 함)
      if (mouseX < center - FACE_DEADZONE) {
        setFacing("left");
      } else if (mouseX > center + FACE_DEADZONE) {
        setFacing("right");
      }
    } else {
      // 고정 모드: 선택한 하단 모서리로 미끄러져 가서 화면 안쪽을 바라본다.
      // 투명 여백(SPRITE_MARGIN)을 상쇄하고 화면 끝에서 FIXED_EDGE_GAP만큼 안쪽으로
      // 들여놓아, 말풍선/카드가 펼쳐질 여유 공간을 둔다.
      cap = MAX_SPEED_FIXED;
      if (placement === "bottom-left") {
        targetX = -SPRITE_MARGIN + FIXED_EDGE_GAP;
        setFacing("right");
      } else {
        targetX = window.innerWidth - CHAR_SIZE + SPRITE_MARGIN - FIXED_EDGE_GAP;
        setFacing("left");
      }
    }

    let delta = (targetX - posX) * EASE;
    // 최대 속도 제한
    if (delta > cap) delta = cap;
    else if (delta < -cap) delta = -cap;

    // 고정 모드는 모서리에 딱 붙도록 클램프를 적용하지 않는다(여백만큼 밖으로 나감)
    posX = placement === "follow" ? clampX(posX + delta) : posX + delta;
  }

  // 세로 이동(Dock 위로 올라가기/내려오기)은 걷기가 멈춰 있어도 계속 동작해야 한다
  verticalStep();
  placeCharacter();
  positionBubble();
  if (cardOpen) positionCard();
  requestAnimationFrame(followStep);
}

function pauseWalking(ms) {
  paused = true;
  if (pauseTimer) clearTimeout(pauseTimer);
  pauseTimer = setTimeout(() => {
    paused = false;
  }, ms);
}

// 마우스 X 좌표를 받아 캐릭터가 따라갈 목표 위치로 설정 (세로는 무시)
window.petAPI.onCursorPosition(({ x }) => {
  mouseX = x;
});

// ---------- 2. 말풍선 ----------

let bubbleTimeout;

function showBubble(text, duration = 3500) {
  bubble.textContent = text;
  bubble.classList.remove("hidden");
  positionBubble();

  clearTimeout(bubbleTimeout);
  bubbleTimeout = setTimeout(() => {
    bubble.classList.add("hidden");
  }, duration);
}

// 말풍선/질문 카드의 가로 위치를 펫 위치 모드에 맞춰 정한다.
// - 따라오기: 펫 중심 정렬 (기존 동작)
// - 고정 좌하단: 펫 왼쪽 가장자리에 맞춰 오른쪽(화면 안쪽)으로 펼침
// - 고정 우하단: 펫 오른쪽 가장자리에 맞춰 왼쪽(화면 안쪽)으로 펼침
// 항상 화면 안(margin 여백)으로 클램프해서 펫을 가리지 않게 한다.
function overlayLeft(width, margin) {
  let left;
  if (placement === "bottom-left") {
    left = posX + SPRITE_MARGIN; // 펫 그림 왼쪽 가장자리
  } else if (placement === "bottom-right") {
    left = posX + CHAR_SIZE - SPRITE_MARGIN - width; // 펫 그림 오른쪽 가장자리 - 폭
  } else {
    left = posX + CHAR_SIZE / 2 - width / 2; // 중심 정렬
  }
  return Math.max(margin, Math.min(window.innerWidth - width - margin, left));
}

function positionBubble() {
  bubble.style.left = overlayLeft(bubble.offsetWidth, 0) + "px";
  bubble.style.top = posY - 15 + "px";
}

// ---------- 3. 클릭 반응 ----------

const clickReactions = [
  "왜 부르셨어요?",
  "오늘도 화이팅입니다!",
  "잠깐 쉬었다 가도 좋아요.",
  "심심하신가요?",
  "무슨 작업 중이세요?",
];

character.addEventListener("click", () => {
  // 물어볼 질문이 예고된 상태면 클릭 시 질문 카드를 연다 (evolve.md 6.4 2단계)
  if (hasPendingQuestion && qcard.classList.contains("hidden")) {
    openQuestionCard();
    return;
  }
  const msg = clickReactions[Math.floor(Math.random() * clickReactions.length)];
  showBubble(msg);
  pauseWalking(1500);
});

// 마우스가 캐릭터 위에 있을 때만 클릭을 받고, 나머지 영역은 클릭 통과
character.addEventListener("mouseenter", () => {
  window.petAPI.setIgnoreMouseEvents(false);
});

character.addEventListener("mouseleave", () => {
  window.petAPI.setIgnoreMouseEvents(true, { forward: true });
});

// ---------- 4. 활성 앱에 따른 메시지 ----------

// 규칙은 위에서부터 순서대로 검사하므로 "구체적인 것 → 일반적인 것" 순으로 둔다.
// (예: Shorts는 YouTube보다, PR 페이지는 일반 브라우저보다 먼저)
//
// - messages: 그 카테고리에서 랜덤으로 하나를 골라 보여줄 멘트 목록
// - silent: 매칭은 하되 아무 말도 안 함 (사생활 영역 - 뒤의 일반 규칙에 걸리는 것 방지)
// - quiet: 진입 멘트 한 번만 보여주고, 머무는 동안 추가 말풍선을 억제 (회의 등)
// - stages: 체류 시간(ms)에 따라 톤이 바뀌는 카테고리 (SNS 잔소리 등).
//           배터리 티어처럼 "현재 속한 구간"을 찾는 구조라, 같은 패턴을 재사용할 수 있다.
const WINDOW_RULES = [
  // --- 커뮤니케이션 (사생활 영역 먼저 걸러냄) ---
  { id: "private", pattern: /kakaotalk|카카오톡|mail|메일/, silent: true },
  {
    id: "meeting",
    pattern: /zoom|google meet|meet\.google|webex/,
    messages: ["회의 중엔 저도 조용히 할게요."],
    quiet: true,
  },
  {
    id: "chat",
    pattern: /slack|discord|teams/,
    messages: ["누가 불렀나 봐요.", "대화 중이시군요, 방해하지 않을게요."],
  },

  // --- 개발/코딩 ---
  {
    id: "github-pr",
    pattern: /pull request/,
    messages: ["머지 승인 기다리는 중?", "리뷰 코멘트 잘 달아주세요~"],
  },
  {
    id: "ide",
    pattern:
      /\bcode\b|vscode|intellij|webstorm|pycharm|android studio|xcode|sublime|cursor/,
    messages: ["집중모드 ON!", "버그는 도망 못 가요.", "오늘도 멋진 코드 기대할게요!"],
  },
  {
    id: "terminal",
    pattern: /terminal|iterm|powershell|cmd\.exe/,
    messages: ["명령어 조심히 치세요..", "rm -rf는 안돼요!", "명령어, 하나도 안 틀리고 잘 치고 계세요."],
  },

  // --- 엔터테인먼트/휴식 ---
  {
    id: "shorts",
    pattern: /shorts/,
    messages: ["숏츠 늪 조심하세요...", "숏츠는 한 개만 보는 게 불가능하대요."],
  },
  {
    id: "youtube",
    pattern: /youtube|유튜브/,
    messages: ["즐감하세요~", "재밌는 거 보시나요?"],
  },
  {
    id: "ott",
    pattern: /netflix|넷플릭스|watcha|왓챠|wavve|웨이브|disney\+|디즈니|tving|티빙/,
    messages: ["팝콘 챙기셨나요?", "편하게 보세요, 저는 조용히 있을게요."],
  },
  {
    id: "music",
    pattern: /spotify|youtube music|music|melon/,
    messages: ["좋은 노래네요.", "좋은 음악 듣고 계시네요."],
  },

  // --- SNS/쇼핑 (체류 시간에 따라 톤이 세짐) ---
  {
    id: "sns",
    pattern: /instagram|인스타그램|twitter|트위터|x\.com/,
    stages: [
      { after: 0, messages: ["잠깐 쉬시는 중?"] },
      { after: 5 * 60 * 1000, messages: ["슬슬... 하던 일이 부르고 있지 않나요?"] },
      { after: 15 * 60 * 1000, messages: ["이제 진짜 그만!! 할 일 하셔야죠!!"] },
    ],
  },
  {
    id: "shopping",
    pattern: /coupang|쿠팡|musinsa|무신사|11번가|gmarket|지마켓|aliexpress/,
    messages: ["장바구니만 채우고 계신가요?", "지갑은 안녕하신가요..?"],
  },

  // --- 생산성/문서 ---
  {
    id: "notes",
    pattern: /notion|obsidian/,
    messages: ["정리의 신!", "오늘도 깔끔하게 정리 중이시네요."],
  },
  {
    id: "docs",
    pattern: /word|docs\.google|google docs|한글|hwp/,
    messages: ["글쓰기 화이팅!", "좋은 문장 나오길 바랄게요."],
  },
  {
    id: "design",
    pattern: /figma|photoshop|illustrator/,
    messages: ["디자인 감각 좋으시네요.", "오늘 작업물도 기대돼요!"],
  },

  // --- 일반 브라우저 (가장 마지막 폴백) ---
  {
    id: "browser",
    pattern: /chrome|safari|edge|firefox|whale/,
    messages: ["무엇을 찾아보고 계신가요?"],
  },
];

function matchWindowRule(appName, title) {
  const context = `${appName} ${title}`.toLowerCase();
  for (const rule of WINDOW_RULES) {
    if (rule.pattern.test(context)) return rule;
  }
  return null;
}

function pickRandom(list) {
  return list[Math.floor(Math.random() * list.length)];
}

// 체류 시간에 해당하는 가장 높은 단계를 찾는다 (stages는 after 오름차순)
function getStage(stages, elapsed) {
  let current = null;
  for (const stage of stages) {
    if (elapsed >= stage.after) current = stage;
  }
  return current;
}

let currentRuleId = null; // 지금 머물고 있는 카테고리
let ruleEnteredAt = 0; // 그 카테고리에 진입한 시각 (체류 시간 계산용)
let announcedStage = null; // stages 규칙에서 마지막으로 말한 단계 (반복 방지)

window.petAPI.onActiveWindowInfo(({ appName, title }) => {
  const rule = matchWindowRule(appName, title);

  if (!rule) {
    currentRuleId = null;
    return;
  }

  const isNewRule = rule.id !== currentRuleId;
  if (isNewRule) {
    currentRuleId = rule.id;
    ruleEnteredAt = Date.now();
    announcedStage = null;
  }

  if (rule.silent) return;

  // 체류 시간 단계형 규칙: 같은 창에 머물러도 단계가 오르면 새 멘트를 띄운다
  if (rule.stages) {
    const stage = getStage(rule.stages, Date.now() - ruleEnteredAt);
    if (stage && announcedStage !== stage.after) {
      announcedStage = stage.after;
      showBubble(pickRandom(stage.messages));
    }
    return;
  }

  // 일반 규칙: 카테고리에 새로 진입했을 때만 한 번 말한다
  // (quiet 규칙도 진입 멘트 한 번은 보여주고, 머무는 동안은 자연히 조용해진다)
  if (isNewRule) {
    showBubble(pickRandom(rule.messages));
  }
});

// macOS 화면 기록 권한이 없으면 활성 창 감지 자체가 실패해서
// 위의 앱별 말풍선이 전부 동작하지 않는다. 사용자에게 해결 방법을 안내한다.
window.petAPI.onScreenPermissionMissing(() => {
  showBubble(
    "어떤 앱을 보고 계신지 알 수 없어요. 메뉴바 펫 아이콘 → '화면 기록 권한 설정 열기'에서 허용해주세요!",
    8000
  );
});

// ---------- 5. 배터리 상태 리액션 ----------

// 배터리가 부족하면(충전 중 제외) sleepy.gif로 바꾸고 단계별 메시지를 보여준다.
// 낮은 단계부터 순서대로 두어 getBatteryTier가 "현재 속한 가장 낮은 구간"을 찾는다.
// 예) 22% → 30 단계, 8% → 10 단계, 1% → 1 단계
const BATTERY_TIERS = [
  { level: 1, sprite: "sad", message: "이제 한계예요, 충전해주세요ㅠㅠ" },
  { level: 5, sprite: "sad", message: "저 곧 쓰러질 것 같아요... 충전 서둘러주세요!!" },
  { level: 10, sprite: "sleepy", message: "이제 정말 졸려요.. 얼마 못 버틸 것 같아요." },
  { level: 15, sprite: "sleepy", message: "눈이 슬슬 감겨요... 충전이 필요해요." },
  { level: 20, sprite: "sleepy", message: "점점 힘이 빠져요... 충전기 챙겨주시면 안 될까요?" },
  { level: 30, sprite: "sleepy", message: "저..슬슬 피곤한데, 충전 부탁드려요..." },
];

let tiredSprite = null; // 지친 상태 표정 이름("sad"/"sleepy"). null이면 평소 걷기 gif (applySprite에서 참조)
let announcedTier = null; // 마지막으로 메시지를 보여준 단계 (같은 단계 반복 방지)

function getBatteryTier(pct) {
  for (const tier of BATTERY_TIERS) {
    if (pct <= tier.level) return tier;
  }
  return null;
}

function setTiredSprite(sprite) {
  if (tiredSprite === sprite) return;
  tiredSprite = sprite;
  applySprite();
}

function updateBatteryState(battery) {
  const pct = Math.round(battery.level * 100);
  const tier = battery.charging ? null : getBatteryTier(pct);

  if (!tier) {
    // 충전 중이거나 30% 초과 → 평소 모습으로 복귀.
    // 단계 기록도 초기화해서 다음에 다시 방전되면 새로 안내한다.
    setTiredSprite(null);
    announcedTier = null;
    return;
  }

  setTiredSprite(tier.sprite);
  if (announcedTier !== tier.level) {
    announcedTier = tier.level;
    showBubble(tier.message, 5000);
  }
}

async function initBatteryWatcher() {
  // 배터리가 없는 데스크톱 등 미지원 환경에서는 기능을 조용히 끈다
  if (!navigator.getBattery) return;
  try {
    const battery = await navigator.getBattery();
    const update = () => updateBatteryState(battery);
    battery.addEventListener("levelchange", update);
    battery.addEventListener("chargingchange", update);
    update();
  } catch (err) {
    // 배터리 정보를 읽지 못하면 무시하고 계속 진행
  }
}

// ---------- 6. 진화 상태 (돌 종류 확정 시 gif 전환) ----------

const STONE_NAMES = {
  granite: "화강암",
  basalt: "현무암",
  marble: "대리석",
  gneiss: "편마암",
};

function setStone(stoneType) {
  if (!stoneType || stonePrefix === stoneType) return;
  stonePrefix = stoneType;
  applySprite();
}

// 트레이에서 성향 판정이 끝나 돌 종류가 확정되면 즉시 해당 돌 gif로 진화
window.petAPI.onStoneConfirmed((stoneType) => {
  setStone(stoneType);
  showBubble(`저, ${STONE_NAMES[stoneType]}이 됐어요!`, 6000);
});

// 앱 시작 시 이미 확정돼 있으면 해당 돌 모습으로 복원
async function initStone() {
  try {
    setStone(await window.petAPI.getStone());
  } catch (_err) {
    // 상태를 못 읽으면 기본(rockie) 유지
  }
}

// ---------- 8. 성향 질문 알림 (예고 말풍선 → 클릭 시 카드) ----------

let hasPendingQuestion = false;
let currentQuestion = null;

// 게이트가 "물어볼 질문이 준비됨"을 알리면 예고 말풍선만 띄운다 (강제 팝업 없음)
window.petAPI.onQuestionAvailable(() => {
  hasPendingQuestion = true;
  showBubble("물어보고 싶은 게 있어요. 저를 눌러주세요!", 6000);
});

// 앱을 껐다 켠 뒤에도 아직 답하지 않은 예고된 질문이 있으면 다시 클릭으로 열 수 있게 한다.
// (트레이에서 답하던 경로가 사라졌으므로, 이 복원이 없으면 예고된 질문이 갇힌다)
async function initPendingQuestion() {
  try {
    const state = await window.petAPI.getEvolutionState();
    if (state.hasBadge && state.question) {
      hasPendingQuestion = true;
      showBubble("물어보고 싶은 게 있어요. 저를 눌러주세요!", 6000);
    }
  } catch (_err) {
    // 상태를 못 읽으면 조용히 넘어간다
  }
}

function positionCard() {
  // 카드를 펫 위쪽에 띄우되, 가로 위치는 펫 위치 모드에 맞춰 화면 안쪽으로 펼친다.
  const w = qcard.offsetWidth;
  const h = qcard.offsetHeight;
  let top = posY - h - 12;
  if (top < 8) top = 8;
  qcard.style.left = overlayLeft(w, 8) + "px";
  qcard.style.top = top + "px";
}

function hideQuestionCard() {
  cardOpen = false;
  qcard.classList.add("hidden");
  qcard.innerHTML = "";
}

async function openQuestionCard() {
  let state;
  try {
    state = await window.petAPI.getEvolutionState();
  } catch (_err) {
    return;
  }
  // 이미 확정됐거나 지금 물을 게 없으면 예고 상태만 정리
  if (!state.question) {
    hasPendingQuestion = false;
    return;
  }
  currentQuestion = state.question;
  window.petAPI.markQuestionRead(); // 열었으면 "읽음" → 트레이 배지 해제
  renderCard(state);
  cardOpen = true;
  qcard.classList.remove("hidden");
  positionCard();
}

function cardEl(tag, cls, text) {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text != null) node.textContent = text;
  return node;
}

function renderCard(state) {
  qcard.innerHTML = "";
  const q = state.question;

  if (q.kind === "tiebreaker") {
    qcard.appendChild(cardEl("p", "q-hint", "마지막으로 하나만 더 골라주세요!"));
  } else {
    qcard.appendChild(cardEl("p", "q-hint", `질문 ${state.progress} / ${state.total}`));
  }
  qcard.appendChild(cardEl("p", "q-text", q.text));

  const options = cardEl("div", "q-options");
  q.options.forEach((opt) => {
    const btn = cardEl("button", "q-opt", opt.label);
    btn.addEventListener("click", () => answerQuestion(q.id, opt.stone));
    options.appendChild(btn);
  });
  qcard.appendChild(options);

  const pass = cardEl("button", "q-pass", "지금은 패스");
  pass.addEventListener("click", () => passQuestion(q.id));
  qcard.appendChild(pass);
}

async function answerQuestion(questionId, stone) {
  const result = await window.petAPI.answerQuestion({ questionId, stone });
  hideQuestionCard();
  hasPendingQuestion = false;
  // 확정되면 onStoneConfirmed가 진화 말풍선을 띄우므로 여기선 조용히 둔다
  if (!result.confirmed) showBubble("고마워요! 잘 기억해둘게요.", 3000);
}

async function passQuestion(questionId) {
  await window.petAPI.skipQuestion({ questionId });
  hideQuestionCard();
  hasPendingQuestion = false;
  showBubble("알겠어요, 다음에 또 물어볼게요.", 3000);
}

// 카드 위에 마우스가 있을 때만 클릭을 받도록(캐릭터와 동일 패턴)
qcard.addEventListener("mouseenter", () => {
  window.petAPI.setIgnoreMouseEvents(false);
});
qcard.addEventListener("mouseleave", () => {
  window.petAPI.setIgnoreMouseEvents(true, { forward: true });
});

// ---------- 9. 설정 (위치 · 크기) ----------

const SIZE_PX = { small: 96, medium: 128, large: 176 };

// 캐릭터 표시 크기를 바꾸면 좌표 계산 상수(CHAR_SIZE)와 여백(SPRITE_MARGIN)도
// 함께 맞춰야 따라오기/모서리 정렬이 정확하다. 여백은 128px 기준 36px에 비례.
function applyPetSize(size) {
  const px = SIZE_PX[size] || SIZE_PX.medium;
  CHAR_SIZE = px;
  SPRITE_MARGIN = Math.round((px * 36) / 128);
  character.style.width = px + "px";
  character.style.height = px + "px";
}

// 앱을 처음 켰을 때 펫이 등장할 시작 X 좌표.
// 좌하단 설정이면 좌하단에서, 우하단·따라오기 설정이면 우하단에서 시작한다.
// (고정 모드의 targetX와 동일 계산이라 스냅 후 튐이 없다)
function startX() {
  if (placement === "bottom-left") return -SPRITE_MARGIN + FIXED_EDGE_GAP;
  return window.innerWidth - CHAR_SIZE + SPRITE_MARGIN - FIXED_EDGE_GAP;
}

async function initSettings() {
  try {
    const s = await window.petAPI.getSettings();
    placement = s.petPlacement || "follow";
    applyPetSize(s.petSize || "medium");
  } catch (_err) {
    // 설정을 못 읽으면 기본값(따라오기 · 보통)을 유지
  } finally {
    // 위치·크기가 정해진 뒤에야 시작 위치로 스냅하고 캐릭터를 보인다.
    // (설정 로드 전 화면 중앙에서 잠깐 나타나 움직이는 깜빡임을 없앤다)
    posX = startX();
    posY = groundY();
    placeCharacter();
    character.style.visibility = "visible";
  }
}

// 트레이 설정에서 위치/크기를 바꾸면 즉시 반영
window.petAPI.onPetSettings(({ placement: p, size }) => {
  if (p) placement = p;
  if (size) applyPetSize(size);
});

// ---------- 7. 초기화 ----------

// 시작 위치(설정에 맞는 코너)가 정해질 때까지 숨겨 둔다. initSettings에서 표시.
character.style.visibility = "hidden";
placeCharacter();
requestAnimationFrame(followStep);
initBatteryWatcher();
initStone();
initPendingQuestion();
initSettings();
