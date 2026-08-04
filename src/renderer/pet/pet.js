const character = document.getElementById("character");
const heart = document.getElementById("heart");
const bubble = document.getElementById("bubble");
const qcard = document.getElementById("qcard");

// ---------- 1. 캐릭터 위치 및 마우스 추적 로직 ----------

let CHAR_SIZE = 128; // 실제 렌더링 크기(style.css의 .character width/height)와 일치시켜야 좌표 계산이 정확함. 설정 '크기'로 바뀔 수 있음
let posY = window.innerHeight - 100; // 캐릭터 세로 위치 (Dock 상태에 따라 위아래로 슬라이드)
let posX = window.innerWidth / 2;
let targetX = posX; // 따라갈 목표 X (매 프레임 마우스 위치에 따라 계산됨)
let mouseX = posX + CHAR_SIZE / 2; // 최신 마우스 X 좌표 (바라보는 방향 판단용)
let facing = "right"; // 현재 바라보는 방향 (표시할 gif 결정)
let moving = false; // 걷는 중인지 (밤에 sleepy 대신 방향 gif를 쓸지 판단)
let smiling = false; // 닦아주기 직후 웃는 얼굴(smile gif)을 잠깐 표시하는 동안 true
let spritePrefix = "rockie"; // 표시할 GIF 접두어 (단계·돌·변형에 따라 결정)
let spriteLevel = "level0"; // GIF가 담긴 레벨 폴더
let activeTimePeriod = getTimePeriod(); // 로컬 시각 기준 현재 시간대(아침/낮/저녁/밤)
let userName = null;

const EASE = 0.06; // 목표를 향해 이동하는 비율이 작을수록 천천히 따라감
const MAX_SPEED = 1; // 프레임당 최대 이동 픽셀 (너무 빠르지 않게 제한)
const MAX_SPEED_FIXED = 10; // 고정 위치로 이동할 때는 좀 더 빠르게 미끄러져 감
const FIXED_EDGE_GAP = 60; // 고정 모드에서 화면 끝과 펫 사이 여백(말풍선이 개행되며 펫을 가리지 않도록)
const FACE_DEADZONE = 6; // 마우스가 중심에서 이 픽셀 이내면 방향 유지 (gif 깜빡임 방지)
const MOVE_DEADZONE = 1; // 목표까지 이 픽셀 이내면 멈춘 것으로 본다 (EASE라 정확히 0이 되지 않음)
// gif(320px)를 128px로 줄여 표시하는데 캐릭터 그림 둘레에 투명 여백이 있다.
// 그래서 박스 경계를 마우스에 붙여도 "보이는 캐릭터"는 이 여백만큼 떨어져 보인다.
// 바라보는 쪽 여백만큼 더 파고들게 해서 실제 그림이 마우스에 닿도록 보정한다.
// (표시 크기 128px 기준 측정값 ≈ 36px, 0으로 두면 박스 경계 기준으로 돌아감. 크기에 비례해 조정)
let SPRITE_MARGIN = 36;

// 설정 '펫 위치'. "follow"=커서 추적, "bottom-left"/"bottom-right"=하단 모서리 고정
let placement = "follow";
let petSize = "medium"; // 설정 '크기'. 레벨 scale과 곱해 실제 CHAR_SIZE를 만든다

let paused = false;
let pauseTimer = null;
let cardOpen = false; // 질문 카드가 열려 있으면 걷기를 멈추고 카드를 펫 옆에 고정
let onboardingLocked = true;

// ---------- 모드 상태 (더블클릭 옵션창: 청소 / 집중 / 쪽잠) ----------
let activeMode = null; // null | "clean" | "focus" | "nap"
let modePanelOpen = false; // 옵션창이 열려 있는 동안 걷기를 멈추고 패널을 펫 옆에 고정
let dndActive = false; // 방해금지: showBubble·배너 알림을 억제
let focusMinutes = 25;
let napMinutes = 20;

// ---------- 드래그로 위치 옮기기 (모든 모드) ----------
// 캐릭터를 꾸욱 눌렀다가(롱프레스) 끌면 원하는 자리에 놓을 수 있다.
// 놓은 뒤 DROP_FREEZE_MS 동안 제자리에 있다가, follow 모드는 다시 커서를,
// 고정 모드는 지정된 하단 모서리로 되돌아간다.
let pinned = false; // 드래그 중이거나 놓은 직후 정지 중이면 true (가로/세로 추종 정지)
let dragging = false; // 실제로 끌고 있는 중
let justDragged = false; // 드래그 종료 직후 click 반응 억제용
let holdTimer = null; // 롱프레스 판정 타이머
let dropTimer = null; // 놓은 뒤 3초 정지 타이머
let dragOffsetX = 0; // 잡은 지점(커서)과 posX/posY의 간격 (놓을 때 튐 방지)
let dragOffsetY = 0;
let cursorX = 0; // 최신 커서 좌표(창 기준) — 드래그 위치 계산용
let cursorY = 0;
const HOLD_MS = 200; // 이 시간 이상 누르고 있어야 드래그로 인정
const DROP_FREEZE_MS = 3000; // 놓은 뒤 제자리에 머무는 시간

// ---------- Dock 회피 ----------
// 메인 프로세스가 알려주는 Dock 상태. Dock이 보이고 캐릭터(보이는 그림 기준)가
// Dock의 가로 범위와 겹치면 Dock 바로 위를, 아니면 화면 맨 아래를 목표로 잡고
// 매 프레임 부드럽게 슬라이드한다. (순간이동 없음)
let dockState = { visible: false, x: 0, width: 0, height: 0 };

const EASE_Y = 0.15; // 세로 이동 감속 비율 (목표에 가까울수록 느려짐)
const MAX_SPEED_Y = 5; // 프레임당 세로 최대 이동 픽셀

function groundY() {
  // 그림의 실제 발밑(박스 하단 - 하단 투명 여백)이 크기·단계와 무관하게 화면 하단에서
  // FOOT_LINE_GAP만큼 위에 오도록 top 기준선을 잡는다. 하단 여백 비율은 레벨/캐릭터별
  // (2·3단계는 그림이 320 캔버스 아래쪽까지 차서 여백이 작다).
  const bottomPad = CHAR_SIZE * spriteGeom().bottomRatio;
  return window.innerHeight - FOOT_LINE_GAP - CHAR_SIZE + bottomPad;
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

function clampY(y) {
  return Math.max(0, Math.min(window.innerHeight - CHAR_SIZE, y));
}

function placeCharacter() {
  character.style.left = posX + "px";
  character.style.top = posY + "px";
  // 하트는 캐릭터와 같은 320 캔버스라 같은 좌표에 두면 원하는 자리에 정확히 겹친다
  heart.style.left = posX + "px";
  heart.style.top = posY + "px";
}

function setFacing(dir) {
  if (dir === facing) return;
  facing = dir;
  applySprite();
}

function setMoving(next) {
  if (next === moving) return;
  moving = next;
  applySprite();
}

function spriteUrl(name) {
  return spriteGifUrl(spriteLevel, spritePrefix, name);
}

// 트레이가 같은 모습을 보여주도록 현재 스프라이트를 알린다.
// applySprite는 방향 전환·걷기 시작/정지마다 불리므로, 실제로 바뀐 경우에만 보낸다.
let lastNotifiedSprite = "";
function notifyDisplaySprite(pose) {
  const key = `${spriteLevel}/${spritePrefix}/${pose}`;
  if (key === lastNotifiedSprite) return;
  lastNotifiedSprite = key;
  window.petAPI.setDisplaySprite({
    level: spriteLevel,
    prefix: spritePrefix,
    pose,
  });
}

// 로컬 시스템 시간만 사용한다. 네트워크/위치 권한 없이 시간대별 반응을 결정한다.
function getTimePeriod(date = new Date()) {
  const hour = date.getHours();
  if (hour >= 5 && hour < 11) return "morning";
  if (hour >= 11 && hour < 17) return "day";
  if (hour >= 17 && hour < 22) return "evening";
  return "night";
}

function timeSprite() {
  // 밤엔 졸린 표정. 단 걷는 중에는 비워서 방향 gif가 보이게 한다(sleepy는 좌우 구분이 없다).
  return activeTimePeriod === "night" && !moving ? "sleepy" : null;
}

function updateTimePeriod() {
  const next = getTimePeriod();
  if (next === activeTimePeriod) return;
  activeTimePeriod = next;
  applySprite();
}

function initTimeWatcher() {
  updateTimePeriod();
  setInterval(updateTimePeriod, 60 * 1000);
}

const ACTIVE_IDLE_LIMIT_SEC = 5 * 60; // 이 이상 입력이 없으면 쉰 것으로 보고 누적 사용 시간을 초기화
const USAGE_CHECK_INTERVAL = 60 * 1000;
let continuousActiveMs = 0;
let lastUsageCheckAt = Date.now();

async function updateUsageContext() {
  const now = Date.now();
  const elapsed = now - lastUsageCheckAt;
  lastUsageCheckAt = now;

  try {
    const idleSec = await window.petAPI.getIdleTime();
    if (idleSec >= ACTIVE_IDLE_LIMIT_SEC) {
      continuousActiveMs = 0;
      return;
    }
    continuousActiveMs += elapsed;
  } catch (_err) {
    // idle time을 읽지 못하면 오래 사용 메시지만 조용히 끈다.
    continuousActiveMs = 0;
  }
}

function initUsageWatcher() {
  updateUsageContext();
  setInterval(updateUsageContext, USAGE_CHECK_INTERVAL);
}

// 지친 상태(배터리 부족)면 단계별 표정 gif, 아니면 바라보는 방향의 걷기 gif를 표시.
// 표시할 파일은 현재 진화 단계에 따른 spriteLevel/spritePrefix로 결정된다.
function applySprite() {
  if (onboardingLocked) return;
  const name = smiling
    ? "smile"
    : tiredSprite || timeSprite() || (facing === "left" ? "left" : "right");
  const src = spriteUrl(name);
  if (!character.src.endsWith(src)) character.src = src;
  notifyDisplaySprite(name);
}

function setOnboardingLocked(locked) {
  onboardingLocked = locked;
  document.body.classList.toggle("onboarding-locked", locked);
  if (locked) {
    hideQuestionCard();
    window.petAPI.setIgnoreMouseEvents(true, { forward: true });
  } else {
    placeCharacter();
    applySprite();
  }
}

// 애정 표현용 하트 오버레이. level2/3은 love gif가 없어 smile + 하트로 애정을 표현한다.
// 트레이 "돌보기"(닦기/밥) 직후 main이 보내는 pet:show-heart 신호로 발동된다.
function showHeart() {
  heart.classList.remove("hidden");
}

function hideHeart() {
  heart.classList.add("hidden");
}

function applyHeartOffset() {
  const o = HEART_OFFSET[spritePrefix] || { x: 0, y: 0 };
  const k = CHAR_SIZE / 320;
  const x = (HEART_BASE_OFFSET.x + o.x) * k;
  const y = (HEART_BASE_OFFSET.y + o.y) * k;
  heart.style.transform = `translate(${x}px, ${y}px)`;
}

// 하트를 잠깐 띄웠다가 자동으로 끈다 (애정 표현 피드백).
const HEART_DURATION = 3000;
let heartTimer = null;
function triggerHeart() {
  playSound("care");
  applyHeartOffset(); // 현재 스프라이트/크기에 맞춘 위치 보정
  showHeart();
  clearTimeout(heartTimer);
  heartTimer = setTimeout(hideHeart, HEART_DURATION);
}

window.petAPI.onShowHeart(triggerHeart);

// 닦아주기 직후 웃는 얼굴(smile gif)을 잠깐 보여줬다가 평소 스프라이트로 되돌린다.
const SMILE_DURATION = 3000;
let smileTimer = null;
function triggerSmile() {
  playSound("care");
  smiling = true;
  applySprite();
  clearTimeout(smileTimer);
  smileTimer = setTimeout(() => {
    smiling = false;
    applySprite();
  }, SMILE_DURATION);
}

window.petAPI.onShowSmile(triggerSmile);

// ── 개발용: 하트 위치 실시간 튜닝 ─────────────────────────────────────────
// PREVIEW를 {level, prefix}로 두면 실제 진화 없이 그 캐릭터로 시작해 하트를 계속 띄우고,
// 방향키로 하트를 밀며 캐릭터별 HEART_OFFSET을 눈으로 맞출 수 있다. null이면 정상 동작.
// `npm run dev`면 저장 즉시 반영. (키 입력을 받으려면 이 앱 창이 포커스여야 함:
//  방금 실행했거나 cmd-tab으로 이 앱을 앞으로 가져오면 됨)
//   ← → ↑ ↓ : 하트 밀기 (Shift와 함께면 10px씩)
//   [  ]     : 이전 / 다음 캐릭터
//   s        : 표시 크기 순환 (small→medium→large)
//   c        : 지금까지 맞춘 HEART_OFFSET을 콘솔에 출력 (붙여넣기용)
const PREVIEW = null; // { level: "level3", prefix: "moonstone" }; // {level, prefix}면 튜닝 켜기, null이면 정상 동작

let tuneIndex = 0;
let tuneTarget = "heart"; // 방향키가 조정할 대상: "heart" | "bubble" (t로 토글)

function applyPreview() {
  if (!PREVIEW) return;
  const cur = TUNE_CHARACTERS[tuneIndex];
  spriteLevel = cur.level;
  spritePrefix = cur.prefix;
  applySizing(); // 미리보기 캐릭터의 레벨 scale 반영
  applySprite();
  applyHeartOffset();
  applyTuneVisibility(); // 현재 대상(하트/말풍선)만 상시 표시
  positionBubble();
  updateTuneHud();
}

// 튜닝 표시: 대상이 하트면 하트만, 말풍선이면 말풍선만 띄운다.
// 다른 showBubble의 자동 숨김 타임아웃에 가려지지 않도록 followStep에서 매 프레임 다시 확정한다.
function applyTuneVisibility() {
  if (!PREVIEW) return;
  if (tuneTarget === "bubble") {
    hideHeart();
    clearTimeout(bubbleTimeout);
    bubble.textContent =
      "안녕하세요! 오늘도 열심히 작업 중이시네요. 잠깐 쉬어가도 좋아요!";
    bubble.classList.remove("hidden");
  } else {
    bubble.classList.add("hidden");
    showHeart();
  }
}

// 방향키 → 현재 캐릭터 HEART_OFFSET 조정 / 캐릭터·크기 전환 / 값 출력.
// e.key가 아니라 e.code(물리 키)로 판정한다: 한글 입력기가 켜져 있으면 s/c 등이
// e.key에서 한글 자모로 들어와 안 걸리기 때문(방향키는 IME 영향 없음).
const TUNE_SIZES = ["small", "medium", "large"];
function onTuneKey(e) {
  const cur = TUNE_CHARACTERS[tuneIndex];
  const step = e.shiftKey ? 10 : 1;
  switch (e.code) {
    case "ArrowLeft":
    case "ArrowRight":
    case "ArrowUp":
    case "ArrowDown": {
      const table = tuneTarget === "bubble" ? BUBBLE_OFFSET : HEART_OFFSET;
      const o = table[cur.prefix] || (table[cur.prefix] = { x: 0, y: 0 });
      if (e.code === "ArrowLeft") o.x -= step;
      else if (e.code === "ArrowRight") o.x += step;
      else if (e.code === "ArrowUp")
        o.y -= step; // -y = 위
      else o.y += step;
      if (tuneTarget === "bubble") positionBubble();
      else applyHeartOffset();
      updateTuneHud();
      break;
    }
    case "BracketLeft":
      tuneIndex =
        (tuneIndex - 1 + TUNE_CHARACTERS.length) % TUNE_CHARACTERS.length;
      applyPreview();
      break;
    case "BracketRight":
      tuneIndex = (tuneIndex + 1) % TUNE_CHARACTERS.length;
      applyPreview();
      break;
    case "KeyS": {
      const i = TUNE_SIZES.indexOf(petSize);
      applyPetSize(TUNE_SIZES[(i + 1) % TUNE_SIZES.length]); // → applyPreview로 HUD 갱신
      break;
    }
    case "KeyT":
      tuneTarget = tuneTarget === "heart" ? "bubble" : "heart";
      applyTuneVisibility();
      updateTuneHud();
      break;
    case "KeyC":
      dumpOffset();
      break;
    default:
      return; // 관심 없는 키는 그대로 흘려보냄
  }
  e.preventDefault();
}

// 0이 아닌 값만 붙여넣기 좋은 형태로 만들어 클립보드에 복사한다(그대로 해당 테이블에 붙이면 됨).
// 현재 대상(하트/말풍선)의 오프셋을 뽑는다. 콘솔에도 출력해 복사 실패 시 눈으로 확인 가능.
function dumpOffset() {
  const [name, table] =
    tuneTarget === "bubble"
      ? ["BUBBLE_OFFSET", BUBBLE_OFFSET]
      : ["HEART_OFFSET", HEART_OFFSET];
  const lines = Object.entries(table)
    .filter(([, o]) => o.x !== 0 || o.y !== 0)
    .map(([k, o]) => `  ${k}: { x: ${o.x}, y: ${o.y} },`);
  const text = `const ${name} = {\n` + lines.join("\n") + "\n};";
  console.log(text);
  navigator.clipboard
    .writeText(text)
    .then(() => updateTuneHud("복사됨!"))
    .catch(() => updateTuneHud("복사 실패(콘솔 확인)"));
}

// 화면 좌상단에 현재 캐릭터·오프셋·조작법을 보여주는 오버레이(개발용)
let tuneHud = null;
function updateTuneHud(note) {
  if (!tuneHud) return;
  const cur = TUNE_CHARACTERS[tuneIndex];
  const table = tuneTarget === "bubble" ? BUBBLE_OFFSET : HEART_OFFSET;
  const o = table[cur.prefix] || { x: 0, y: 0 };
  tuneHud.textContent =
    `[${tuneIndex + 1}/${TUNE_CHARACTERS.length}] ${cur.level} · ${cur.prefix}\n` +
    `▶ ${tuneTarget}  offset { x: ${o.x}, y: ${o.y} }   size: ${petSize}\n` +
    `← → ↑ ↓ 이동(Shift=10) · [ ] 캐릭터 · t 대상 · s 크기 · c 복사` +
    (note ? `\n${note}` : "");
}

// PREVIEW가 설정돼 있을 때만 튜닝을 켠다: 시작 캐릭터 지정 + HUD 생성 + 키 입력 연결
function initTuning() {
  if (!PREVIEW) return;
  const start = TUNE_CHARACTERS.findIndex((c) => c.prefix === PREVIEW.prefix);
  if (start >= 0) tuneIndex = start;
  tuneHud = document.createElement("div");
  tuneHud.style.cssText =
    "position:fixed;top:8px;left:8px;z-index:9999;background:rgba(0,0,0,.75);" +
    "color:#fff;font:12px/1.6 monospace;padding:8px 10px;border-radius:6px;" +
    "white-space:pre;pointer-events:none;";
  document.body.appendChild(tuneHud);
  applyPreview();
  window.addEventListener("keydown", onTuneKey);
}

function followStep() {
  let walking = false;
  // focusControlsOpen: 말풍선 버튼이 떠 있는 동안 걷지 않는다(버튼이 도망가지 않게)
  if (!paused && !cardOpen && !pinned && !modePanelOpen && !focusControlsOpen) {
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
        targetX =
          window.innerWidth - CHAR_SIZE + SPRITE_MARGIN - FIXED_EDGE_GAP;
        setFacing("left");
      }
    }

    let delta = (targetX - posX) * EASE;
    // 최대 속도 제한
    if (delta > cap) delta = cap;
    else if (delta < -cap) delta = -cap;

    // 고정 모드는 모서리에 딱 붙도록 클램프를 적용하지 않는다(여백만큼 밖으로 나감)
    posX = placement === "follow" ? clampX(posX + delta) : posX + delta;
    walking = Math.abs(targetX - posX) > MOVE_DEADZONE;
  }
  setMoving(walking);

  // 세로 이동(Dock 위로 올라가기/내려오기)은 걷기가 멈춰 있어도 계속 동작해야 한다.
  // 단 드래그 중·놓은 직후 정지 중(pinned)에는 놓인 자리에 그대로 둔다.
  if (!pinned) verticalStep();
  placeCharacter();
  if (PREVIEW) applyTuneVisibility(); // 튜닝 중 대상 표시를 매 프레임 재확정
  // 숨어 있을 때도 부르면 매 프레임 offsetWidth 읽기로 레이아웃을 강제하게 된다
  if (!bubble.classList.contains("hidden")) positionBubble();
  if (cardOpen) positionCard();
  if (modePanelOpen) positionModePanel();
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
// 드래그 중이면 커서(x,y)로 캐릭터 위치를 직접 끌고 온다.
window.petAPI.onCursorPosition(({ x, y }) => {
  mouseX = x;
  cursorX = x;
  cursorY = y;
  if (dragging) {
    posX = clampX(cursorX - dragOffsetX);
    posY = clampY(cursorY - dragOffsetY);
  }
});

// ---------- 2. 말풍선 ----------

let bubbleTimeout;

// 실제로 띄웠는지 돌려준다 — 자동 대사가 "말한 걸로 기록"되고 사라지지 않게 한다.
function showBubble(text, duration = 3500) {
  if (dndActive) return false; // 집중 모드 중엔 말풍선을 띄우지 않는다
  bubble.textContent = text;
  bubble.classList.remove("hidden");
  positionBubble();

  clearTimeout(bubbleTimeout);
  bubbleTimeout = setTimeout(() => {
    bubble.classList.add("hidden");
  }, duration);
  return true;
}

// 사용자가 부르지 않은 대사(앱 전환·배터리·권한 안내)는 이미 떠 있는 말풍선을 덮지
// 않는다. 읽고 있던 말이 중간에 갈아치워지지 않게 한다.
// 페이드아웃이 끝나면 hidden이 붙으므로, 사라진 뒤에는 정상적으로 다시 뜬다.
function showAutoBubble(text, duration) {
  if (!bubble.classList.contains("hidden")) return false;
  return showBubble(text, duration);
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

const BUBBLE_MARGIN = 4; // 몸통과 화면 좌우 끝 사이 최소 여백
const BUBBLE_TAIL_PAD = 12; // 꼬리가 몸통의 둥근 모서리에 걸치지 않도록 양 끝에서 띄우는 여백

// 말풍선 테두리 두께는 CSS 상수라 한 번만 읽어 캐시한다(매 프레임 getComputedStyle 방지)
let bubbleBorderLeft = null;
function bubbleBorderLeftWidth() {
  if (bubbleBorderLeft == null) {
    bubbleBorderLeft =
      parseFloat(getComputedStyle(bubble).borderLeftWidth) || 0;
  }
  return bubbleBorderLeft;
}

function positionBubble() {
  const o = BUBBLE_OFFSET[spritePrefix] || { x: 0, y: 0 };
  const k = CHAR_SIZE / 320;
  // 두 치수를 먼저 읽고 스타일은 나중에 쓴다. 읽기-쓰기-읽기 순서로 두면
  // 매 프레임 레이아웃이 두 번 강제된다(집중 모드처럼 말풍선이 상시 표시될 때 특히).
  const w = bubble.offsetWidth;
  const h = bubble.offsetHeight;

  // 꼬리(화살표)가 가리켜야 할 지점 = 펫 머리 중심 + 캐릭터 보정.
  const tailX = posX + CHAR_SIZE / 2 + o.x * k;

  // 몸통은 꼬리 위에 중심을 두되, 화면 밖으로 나가면 안쪽으로 밀어 넣는다(길어져도 화면 안).
  const left = Math.max(
    BUBBLE_MARGIN,
    Math.min(window.innerWidth - w - BUBBLE_MARGIN, tailX - w / 2),
  );
  bubble.style.left = left + "px";

  // 몸통이 밀려도 꼬리는 계속 펫 머리를 가리키도록, 꼬리의 몸통 내 x를 따로 잡는다.
  const tailInBody = Math.max(
    BUBBLE_TAIL_PAD,
    Math.min(w - BUBBLE_TAIL_PAD, tailX - left),
  );
  bubble.style.setProperty(
    "--tail-x",
    tailInBody - bubbleBorderLeftWidth() + "px",
  );

  // 세로는 박스 상단(posY)이 아니라 펫 '머리 상단'(posY + SPRITE_MARGIN) 기준으로 잡아
  // 크기가 커져 투명 여백이 늘어도 말풍선~펫 간격이 일정하게 유지되도록 한다.
  // (높이 + 꼬리 11px 만큼 위로 = 꼬리 끝이 머리 위에 닿음)
  bubble.style.top = posY + SPRITE_MARGIN - h - 11 + o.y * k + "px";
}

// ---------- 3. 클릭 반응 ----------

function currentLongUseReactions() {
  return LONG_USE_CLICK_REACTIONS.flatMap((tier) =>
    continuousActiveMs >= tier.after ? tier.messages : [],
  );
}

function currentClickReactions() {
  return clickReactions
    .concat(TIME_CLICK_REACTIONS[activeTimePeriod] || [])
    .concat(currentLongUseReactions());
}

function ownerDisplayName() {
  return userName ? `${userName}님` : "주인님";
}

function formatMessage(message) {
  return message.replaceAll("{owner}", ownerDisplayName());
}

// 더블클릭이 옵션창을 여는 동안 말풍선이 같이 뜨지 않도록, 클릭 반응은
// 두 번째 클릭을 기다렸다가(DOUBLE_CLICK_MS) 실행한다. dblclick이 오면 취소된다.
const DOUBLE_CLICK_MS = 250;
let clickReactionTimer = null;

// 더블클릭으로 모드를 열 수 있다는 안내. 첫 클릭 때 클릭 대사 대신 한 번만 띄우고,
// 띄운 시각을 메인에 기록해 다음 실행부터는 다시 나오지 않게 한다.
const MODE_HINT = " 저를 더블클릭하면 여러 모드를 사용할 수 있어요!";
let modeHintPending = false;

character.addEventListener("click", (e) => {
  // 집중 모드에선 클릭 반응 대신 말풍선의 일시정지/중지 버튼을 여닫는다
  if (activeMode === "focus" && !modePanelOpen) {
    if (e.detail > 1) return;
    if (justDragged) {
      justDragged = false;
      return;
    }
    setFocusControls(!focusControlsOpen);
    return;
  }
  if (activeMode || modePanelOpen) return; // 모드 진행 중엔 클릭 반응 없음
  if (e.detail > 1) return; // 더블클릭의 두 번째 클릭은 옵션창으로 넘긴다
  if (justDragged) {
    justDragged = false; // 드래그로 옮긴 직후의 클릭은 반응 없이 무시
    return;
  }
  if (pendingEvolution) {
    openEvolutionCard();
    return;
  }
  clearTimeout(clickReactionTimer);
  clickReactionTimer = setTimeout(() => {
    playSound("click");
    if (modeHintPending) {
      modeHintPending = false;
      window.petAPI.markModeHintShown();
      showBubble(MODE_HINT, 5000);
    } else {
      showBubble(formatMessage(pickRandom(currentClickReactions())));
    }
    pauseWalking(1500);
  }, DOUBLE_CLICK_MS);
});

// 마우스가 캐릭터 위에 있을 때만 클릭을 받고, 나머지 영역은 클릭 통과
let overCharacter = false; // 말풍선 컨트롤을 닫을 때 클릭 통과로 되돌릴지 판단용

character.addEventListener("mouseenter", () => {
  overCharacter = true;
  if (activeMode && activeMode !== "focus") return; // 청소/쪽잠 중엔 모드 UI가 마우스 상태를 관리한다
  window.petAPI.setIgnoreMouseEvents(false);
});

character.addEventListener("mouseleave", () => {
  overCharacter = false;
  // 청소 모드에선 오버레이가 캐릭터를 덮어 뒤늦게 mouseleave가 발동할 수 있는데,
  // 그때 클릭 통과로 되돌리면 마우스 차단이 풀린다. 모드 중엔 손대지 않는다.
  if (activeMode && activeMode !== "focus") return;
  // 드래그 중에는 커서가 잠깐 캐릭터를 벗어나도 클릭 통과로 돌리지 않는다
  // (돌리면 창이 커서 이벤트를 못 받아 드래그가 끊긴다).
  if (holdTimer || dragging) return;
  window.petAPI.setIgnoreMouseEvents(true, { forward: true });
});

// 더블클릭 → 모드 선택 옵션창
character.addEventListener("dblclick", () => {
  clearTimeout(clickReactionTimer); // 대기 중이던 단일 클릭 반응 취소
  if (activeMode || onboardingLocked || pendingEvolution || cardOpen) return;
  openModePanel();
});

// ---------- 꾸욱 눌러 드래그로 위치 옮기기 (모든 모드) ----------
character.addEventListener("mousedown", () => {
  justDragged = false; // 새 상호작용 시작 — 이전 드래그의 잔여 억제 플래그 해제
  // 모드 진행 중·진화 카드·질문 카드 중에는 드래그하지 않는다
  if (
    (activeMode && activeMode !== "focus") ||
    modePanelOpen ||
    pendingEvolution ||
    cardOpen ||
    onboardingLocked
  )
    return;
  // 놓은 뒤 3초 정지 중에 다시 잡으면, 남은 정지 타이머가 드래그 도중 발동하지 않게 취소
  if (dropTimer) {
    clearTimeout(dropTimer);
    dropTimer = null;
  }
  pinned = true; // 롱프레스 판정 동안 제자리에 얼려 둔다(놓으면 해제)
  if (holdTimer) clearTimeout(holdTimer);
  holdTimer = setTimeout(() => {
    holdTimer = null;
    dragging = true;
    // 잡은 지점(현재 커서)과 캐릭터 위치의 간격을 기억해 튐 없이 끌려오게 한다
    dragOffsetX = cursorX - posX;
    dragOffsetY = cursorY - posY;
    document.body.classList.add("dragging");
  }, HOLD_MS);
});

function endDrag() {
  if (holdTimer) {
    // 롱프레스 전에 뗀 경우 → 드래그 아님(클릭 반응은 click 핸들러가 처리)
    clearTimeout(holdTimer);
    holdTimer = null;
    pinned = false;
    return;
  }
  if (!dragging) return;
  dragging = false;
  justDragged = true;
  document.body.classList.remove("dragging");
  // 놓은 자리에 DROP_FREEZE_MS 동안 머물다가 다시 커서를 따라간다
  if (dropTimer) clearTimeout(dropTimer);
  dropTimer = setTimeout(() => {
    dropTimer = null;
    pinned = false;
  }, DROP_FREEZE_MS);
}

// 드래그 중 커서가 캐릭터를 벗어난 채로 떼질 수 있어 window에서도 받는다
window.addEventListener("mouseup", endDrag);

// ---------- 4. 활성 앱에 따른 메시지 ----------

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

// 남은 시간(ms) → "MM:SS" (집중 말풍선·쪽잠 타이머 공용)
function formatMMSS(ms) {
  const mm = String(Math.floor(ms / 60000)).padStart(2, "0");
  const ss = String(Math.floor((ms % 60000) / 1000)).padStart(2, "0");
  return `${mm}:${ss}`;
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
    // 말풍선이 이미 떠 있어 건너뛰었으면 기록하지 않는다 — 3초 뒤 폴링에서 다시 시도한다.
    if (stage && announcedStage !== stage.after) {
      if (showAutoBubble(pickRandom(stage.messages)))
        announcedStage = stage.after;
    }
    return;
  }

  // 일반 규칙: 카테고리에 새로 진입했을 때만 한 번 말한다
  // (quiet 규칙도 진입 멘트 한 번은 보여주고, 머무는 동안은 자연히 조용해진다)
  if (isNewRule) {
    showAutoBubble(pickRandom(rule.messages));
  }
});

// macOS 화면 기록 권한이 없으면 활성 창 감지 자체가 실패해서
// 위의 앱별 말풍선이 전부 동작하지 않는다. 사용자에게 해결 방법을 안내한다.
window.petAPI.onScreenPermissionMissing(() => {
  showAutoBubble(
    "어떤 앱을 보고 계신지 알 수 없어요. 메뉴바 펫 아이콘 → '화면 기록 권한 설정 열기'에서 허용해주세요!",
    8000,
  );
});

// ---------- 5. 배터리 상태 리액션 ----------

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
  // 건너뛰었으면 기록하지 않는다 — 다음 배터리 변화 때 다시 시도한다.
  if (announcedTier !== tier.level) {
    if (showAutoBubble(tier.message, 5000)) announcedTier = tier.level;
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

// ---------- 6. 진화 상태 (단계 전환 시 gif 교체) ----------
// STONE_NAMES/VARIANT_STONE/GEM/resolveSprite/spriteGifUrl은 공용 ../shared/sprites.js에서 로드된다.

function spriteUrlFor(info, name) {
  const { level, prefix } = resolveSprite(
    info.stage,
    info.stoneType,
    info.variant,
  );
  return spriteGifUrl(level, prefix, name);
}

function spriteLevelClass(info) {
  const { level } = resolveSprite(info.stage, info.stoneType, info.variant);
  return `evo-${level}`;
}

function setEvolutionCardImageLevel(img, info) {
  img.classList.remove("evo-level0", "evo-level1", "evo-level2", "evo-level3");
  img.classList.add(spriteLevelClass(info));
}

// 진화 정보에 맞춰 스프라이트를 갱신한다. 실제로 바뀌었으면 true.
function applyEvolution({ stage, stoneType, variant }) {
  if (PREVIEW) return false; // 미리보기 중엔 실제 상태로 스프라이트를 덮어쓰지 않는다
  const { level, prefix } = resolveSprite(stage, stoneType, variant);
  if (level === spriteLevel && prefix === spritePrefix) return false;
  const oldCenter = posX + CHAR_SIZE / 2;
  const oldBottomPad = CHAR_SIZE * spriteGeom().bottomRatio;
  const oldFootY = posY + CHAR_SIZE - oldBottomPad;
  const oldSize = CHAR_SIZE;
  spriteLevel = level;
  spritePrefix = prefix;
  applySizing(); // 레벨 scale이 바뀌므로 표시 크기·여백 재계산
  if (CHAR_SIZE !== oldSize) {
    posX = clampX(oldCenter - CHAR_SIZE / 2);
    const newBottomPad = CHAR_SIZE * spriteGeom().bottomRatio;
    posY = oldFootY - CHAR_SIZE + newBottomPad;
    targetX = posX;
    placeCharacter();
  }
  applySprite();
  return true;
}

function setUserName(name) {
  userName = name || null;
}

function evolveMessage({ stage, stoneType }) {
  if (stage === 1) return `저, ${STONE_NAMES[stoneType]}이 됐어요!`;
  if (stage === 2) return "저, 변성체가 됐어요!";
  if (stage === 3) return "반짝… 드디어 보석이 됐어요! ✨";
  return "";
}

const EVOLVE_FADE_OUT_MS = 2000;
const EVOLVE_BLINK_OUT_MS = 220;
const EVOLVE_BLINK_IN_MS = 220;
const EVOLVE_FADE_IN_MS = 3000;
let pendingEvolution = null;
let completedEvolution = null;
let evolutionCardAnimating = false;
let evolutionCardStep = 0;

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function preloadImage(src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = resolve;
    img.onerror = resolve;
    img.src = src;
  });
}

function setPendingEvolution(pending) {
  pendingEvolution = pending;
  if (!pendingEvolution) return;
  applyEvolution(pendingEvolution.from);
  showBubble(`${ownerDisplayName()}, 제 몸이 변하는 것 같아요...!`, 3000);
}

function previewEvolution(to) {
  const fromByStage = {
    1: { stage: 0, stoneType: null, variant: null },
    2: { stage: 1, stoneType: to.stoneType, variant: null },
    3: { stage: 2, stoneType: to.stoneType, variant: to.variant },
  };
  setPendingEvolution({
    stage: to.stage,
    from: fromByStage[to.stage],
    to,
    createdAt: new Date().toISOString(),
    preview: true,
  });
}

// 단계가 올라가면 바로 gif를 바꾸지 않고, 펫 클릭으로 여는 진화 카드 상태로 둔다.
window.petAPI.onEvolved((info) => {
  setPendingEvolution(info.pendingEvolution);
});

async function initEvolutionPreviewKeys() {
  if (!(await window.petAPI.getIsDev())) return;
  window.addEventListener("keydown", (e) => {
    if (e.repeat) return;
    if (e.code === "Digit1") {
      previewEvolution({ stage: 1, stoneType: "granite", variant: null });
    } else if (e.code === "Digit2") {
      previewEvolution({
        stage: 2,
        stoneType: "granite",
        variant: "extrovert",
      });
    } else if (e.code === "Digit3") {
      previewEvolution({
        stage: 3,
        stoneType: "granite",
        variant: "extrovert",
      });
    } else {
      return;
    }
    e.preventDefault();
  });
}

// 앱 시작 시 저장된 단계에 맞는 모습으로 복원
async function initEvolution() {
  try {
    const state = await window.petAPI.getEvolutionState();
    setUserName(state.userName);
    if (!state.onboarding?.completed) {
      setOnboardingLocked(true);
      return;
    }
    setOnboardingLocked(false);
    if (state.pendingEvolution) {
      setPendingEvolution(state.pendingEvolution);
      return;
    }
    applyEvolution({
      // 스킨을 착용 중이면 그 단계 형태로 표시(돌 종류·변형은 그대로 유지)
      stage:
        state.activeSkinStage != null ? state.activeSkinStage : state.stage,
      stoneType: state.stoneType,
      variant: state.variant,
    });
  } catch (_err) {
    // 상태를 못 읽으면 기본(rockie) 유지
  }
}

window.petAPI.onOnboardingCompleted(async () => {
  setOnboardingLocked(false);
  await initEvolution();
});

// 트레이에서 스킨을 착용/해제하면 main이 표시할 형태를 보내온다
window.petAPI.onSkinChange((info) => applyEvolution(info));

window.petAPI.onUserNameChange(setUserName);

// ---------- 8. 성향 질문 카드 (트레이 "새로운 질문에 답하기"로만 열림) ----------

// 트레이 버튼 요청이 오면 질문 카드를 연다 (능동 접근만, 예고/강제 노출 없음)
window.petAPI.onOpenQuestionCard(() => {
  if (qcard.classList.contains("hidden")) openQuestionCard();
});

// 오버레이(질문 카드·옵션 패널)를 펫 머리 위에 붙인다.
// 가로는 펫 위치 모드에 맞춰 화면 안쪽으로 펼치고(overlayLeft), 세로는 말풍선과 같은
// 기준(머리 상단 = posY + SPRITE_MARGIN)을 써서 펫에 가깝게 내린다.
// 위쪽 공간이 부족할 때: fallbackBelow면 발밑으로 옮기고, 아니면 화면 상단에 붙인다.
function positionAbovePet(el, fallbackBelow) {
  const w = el.offsetWidth;
  const h = el.offsetHeight;
  let top = posY + SPRITE_MARGIN - h - 12;
  if (top < 8) top = fallbackBelow ? posY + CHAR_SIZE - SPRITE_MARGIN + 12 : 8;
  el.style.left = overlayLeft(w, 8) + "px";
  el.style.top = top + "px";
}

function positionCard() {
  positionAbovePet(qcard, false);
}

function hideQuestionCard() {
  cardOpen = false;
  qcard.classList.add("hidden");
  qcard.classList.remove("evolution-card");
  qcard.onclick = null;
  qcard.innerHTML = "";
  evolutionCardAnimating = false;
  evolutionCardStep = 0;
  // 카드가 커서 밑에서 숨겨지면 mouseleave가 안 fires → 클릭 통과가 꺼진 채 고정돼
  // 전체 화면이 클릭을 먹는다. 숨길 때 통과를 직접 복구한다.
  window.petAPI.setIgnoreMouseEvents(true, { forward: true });
}

async function openQuestionCard() {
  if (pendingEvolution) {
    openEvolutionCard();
    return;
  }
  let state;
  try {
    state = await window.petAPI.getEvolutionState();
  } catch (_err) {
    return;
  }
  if (!state.question) return; // 지금 답할 질문이 없으면 열지 않음
  renderCard(state);
  cardOpen = true;
  qcard.classList.remove("hidden");
  positionCard();
}

function openEvolutionCard() {
  if (!pendingEvolution || evolutionCardAnimating) return;
  qcard.innerHTML = "";
  qcard.classList.add("evolution-card");

  const close = cardEl("button", "q-close", "✕");
  close.addEventListener("click", (e) => {
    e.stopPropagation();
    closeEvolutionCard();
  });

  const img = document.createElement("img");
  img.className = "evo-img";
  img.src = spriteUrlFor(pendingEvolution.from, "smile");
  setEvolutionCardImageLevel(img, pendingEvolution.from);
  img.alt = "진화 중인 애완돌";
  img.draggable = false;

  const hint = cardEl("p", "evo-hint", "클릭해서 진화를 도와주세요!");

  qcard.append(close, img, hint);
  qcard.onclick = () => advanceEvolutionCard(img, hint);
  evolutionCardStep = 0;
  cardOpen = true;
  qcard.classList.remove("hidden");
  positionCard();
  pauseWalking(1500);
}

function closeEvolutionCard() {
  const completed = completedEvolution;
  completedEvolution = null;
  hideQuestionCard();
  if (completed) {
    const msg = evolveMessage(completed.to);
    if (msg) showBubble(msg, 6000);
  }
}

async function advanceEvolutionCard(img, hint) {
  if (!pendingEvolution || evolutionCardAnimating) return;
  evolutionCardAnimating = true;
  const current = pendingEvolution;

  if (evolutionCardStep < 2) {
    // 앞의 두 번은 깜빡임이 같고 안내 문구를 바꾸는 시점만 다르다
    // (첫 번째는 깜빡이기 전에, 두 번째는 깜빡인 뒤에).
    if (evolutionCardStep === 0)
      hint.textContent = "좋아요, 힘이 모이고 있어요...";
    img.classList.add("blink-out");
    await wait(EVOLVE_BLINK_OUT_MS);
    img.classList.remove("blink-out");
    await wait(EVOLVE_BLINK_IN_MS);
    if (evolutionCardStep === 1) {
      hint.textContent = "마지막으로 한 번 더 눌러\n힘을 모아주세요!";
    }
    evolutionCardStep += 1;
  } else if (evolutionCardStep === 2) {
    const nextSrc = spriteUrlFor(current.to, "smile");
    hint.textContent = "(달그락..달그락...)";
    await preloadImage(nextSrc);
    img.classList.add("fade-out");
    await wait(EVOLVE_FADE_OUT_MS);
    img.src = nextSrc;
    setEvolutionCardImageLevel(img, current.to);
    applyEvolution(current.to);
    applyHeartOffset();
    img.offsetHeight; // 이미지 교체 후 opacity 0 상태를 먼저 확정시킨다
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        img.classList.remove("fade-out");
        img.classList.add("reveal-in");
        playSound("evolve"); // 새 모습이 드러나는 순간에 축하음
      });
    });
    await wait(EVOLVE_FADE_IN_MS);
    img.classList.remove("reveal-in");
    hint.textContent = "축하합니다, 애완돌이 진화했어요!";
    if (!current.preview) {
      await window.petAPI.completePendingEvolution();
    }
    pendingEvolution = null;
    completedEvolution = current;
    evolutionCardStep = 3;
  }

  evolutionCardAnimating = false;
}

function cardEl(tag, cls, text) {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text != null) node.textContent = text;
  return node;
}

function renderCard(state) {
  qcard.innerHTML = "";
  qcard.onclick = null;
  const q = state.question;

  // 답하지 않고 닫기 (상태 변화 없음 — 질문은 오늘 목록에 그대로 남아 다시 열 수 있다)
  const close = cardEl("button", "q-close", "✕");
  close.addEventListener("click", () => hideQuestionCard());
  qcard.appendChild(close);

  if (q.situation) {
    if (q.kind === "tiebreaker") {
      qcard.appendChild(cardEl("p", "q-hint", "마지막 확인"));
    } else {
      qcard.appendChild(
        cardEl("p", "q-hint", `상황 ${state.progress + 1} / ${state.total}`),
      );
    }
    qcard.appendChild(cardEl("p", "q-situation", q.situation));

    const next = cardEl("button", "q-continue", "클릭하여 진행");
    next.addEventListener("click", () => {
      renderQuestionContent(state, q);
      positionCard();
    });
    qcard.appendChild(next);
    return;
  }

  renderQuestionContent(state, q);
}

function renderQuestionContent(state, q) {
  qcard.innerHTML = "";
  qcard.onclick = null;

  const close = cardEl("button", "q-close", "✕");
  close.addEventListener("click", () => hideQuestionCard());
  qcard.appendChild(close);

  if (q.kind === "tiebreaker") {
    qcard.appendChild(
      cardEl("p", "q-hint", "마지막으로 하나만 더 골라주세요!"),
    );
  } else {
    // progress는 "답 완료 개수"라, 지금 답하는 질문은 그 다음 순번(+1)
    qcard.appendChild(
      cardEl("p", "q-hint", `질문 ${state.progress + 1} / ${state.total}`),
    );
  }
  qcard.appendChild(cardEl("p", "q-text", q.text));

  const options = cardEl("div", "q-options");
  q.options.forEach((opt) => {
    const btn = cardEl("button", "q-opt", opt.label);
    btn.addEventListener("click", () => answerQuestion(q.id, opt.value));
    options.appendChild(btn);
  });
  qcard.appendChild(options);
}

async function answerQuestion(questionId, value) {
  const result = await window.petAPI.answerQuestion({ questionId, value });
  // 오늘 답할 질문이 더 남아 있으면 "답변 완료" 안내 카드로 전환(다음/나중에 선택).
  if (result.state.question) {
    renderConfirm(result.state);
    positionCard();
    return;
  }
  // 남은 질문이 없으면(둘 다 답함·2단계 도달 등) 안내 없이 바로 닫는다.
  hideQuestionCard();
  // 진화하면 onEvolved가 축하 말풍선을 띄우므로 여기선 조용히 둔다
  if (!result.evolved) showBubble("고마워요! 잘 기억해둘게요.", 3000);
}

// 한 문항을 답한 뒤, 남은 질문이 있을 때 보여주는 확인 카드.
function renderConfirm(state) {
  qcard.innerHTML = "";
  qcard.appendChild(cardEl("p", "q-hint", "답변 완료"));
  qcard.appendChild(
    cardEl("p", "q-text", "잘 기억해둘게요! 다음 질문에도 답해줄래요?"),
  );

  const actions = cardEl("div", "q-options");
  const nextBtn = cardEl("button", "q-opt", "다음 질문 답하기");
  nextBtn.addEventListener("click", () => {
    renderCard(state);
    positionCard();
  });
  const laterBtn = cardEl("button", "q-opt", "나중에 답하기");
  laterBtn.addEventListener("click", () => hideQuestionCard());
  actions.append(nextBtn, laterBtn);
  qcard.appendChild(actions);
}

// 카드 위에 마우스가 있을 때만 클릭을 받도록(캐릭터와 동일 패턴)
qcard.addEventListener("mouseenter", () => {
  window.petAPI.setIgnoreMouseEvents(false);
});
qcard.addEventListener("mouseleave", () => {
  window.petAPI.setIgnoreMouseEvents(true, { forward: true });
});

// ---------- 9. 설정 (위치 · 크기) ----------

// 현재 표시 중인 스프라이트(레벨·캐릭터)의 기하 보정값
function spriteGeom() {
  if (spriteLevel === "level3") {
    return LEVEL3_GEOM[spritePrefix] || SPRITE_GEOM.level2;
  }
  return SPRITE_GEOM[spriteLevel] || SPRITE_GEOM.level0;
}

// 표시 크기·여백을 현재 '크기' 설정과 레벨 scale에 맞춰 다시 계산한다.
// (크기 설정이 바뀌거나 단계가 바뀔 때 호출)
function applySizing() {
  const base = SIZE_PX[petSize] || SIZE_PX.medium;
  const px = Math.round(base * spriteGeom().scale);
  CHAR_SIZE = px;
  SPRITE_MARGIN = Math.round((px * 36) / 128);
  character.style.width = px + "px";
  character.style.height = px + "px";
  heart.style.width = px + "px";
  heart.style.height = px + "px";
}

function applyPetSize(size) {
  petSize = size;
  applySizing();
  if (PREVIEW) applyPreview(); // 미리보기 중이면 새 크기에 맞춰 하트 위치 재계산
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
    setSoundEnabled(s.soundEnabled);
    focusMinutes = Number(s.focusMinutes) || 25;
    napMinutes = Number(s.napMinutes) || 20;
    modeHintPending = !s.modeHintSeen;
  } catch (_err) {
    // 설정을 못 읽으면 기본값(따라오기 · 보통)을 유지
  } finally {
    // 위치·크기가 정해진 뒤에야 시작 위치로 스냅하고 캐릭터를 보인다.
    // (설정 로드 전 화면 중앙에서 잠깐 나타나 움직이는 깜빡임을 없앤다)
    posX = startX();
    posY = groundY();
    placeCharacter();
    applySprite();
    character.style.visibility = "visible";
  }
}

// 트레이 설정에서 위치/크기를 바꾸면 즉시 반영
window.petAPI.onPetSettings(
  ({ placement: p, size, sound, focusMinutes: fm, napMinutes: nm }) => {
    if (p) {
      // 위치 모드가 바뀌면 드래그/정지 상태를 취소해 얼어붙지 않게 한다
      if (holdTimer) clearTimeout(holdTimer);
      if (dropTimer) clearTimeout(dropTimer);
      holdTimer = dropTimer = null;
      dragging = pinned = false;
      document.body.classList.remove("dragging");
      placement = p;
    }
    if (size) applyPetSize(size);
    if (sound !== undefined) setSoundEnabled(sound);
    if (fm) focusMinutes = Number(fm) || 25;
    if (nm) napMinutes = Number(nm) || 20;
  },
);

// ---------- 7. 모드 (더블클릭 옵션창: 청소 / 집중 / 쪽잠) ----------
// 모든 모드 UI는 펫 창 안에서 자족적으로 처리한다(별도 창·트레이 배선 없음).
// - 청소 모드: 화면 전체를 덮는 오버레이가 모든 클릭을 가로채고, 창 포커스를 잡아
//   마우스 클릭으로만 해제할 수 있게 한다. 키보드 입력은 네이티브 헬퍼가 차단한다.
// - 쪽잠 모드: 청소 모드와 같은 잠금에 타이머·알람(끄기/5분 후 다시)을 얹는다.
// - 집중 모드: 방해금지(말풍선·배너 알림 억제). 상단 pill의 "종료"로 나간다.
const modePanel = document.getElementById("mode-panel");
const cleanOverlay = document.getElementById("clean-overlay");

function iconEl(paths) {
  const span = cardEl("span", "mode-ic", null);
  span.innerHTML = svgIcon(paths);
  return span;
}

// 방해금지 on/off: 렌더러(말풍선)와 메인(배너 알림) 양쪽을 함께 제어한다.
function setDnd(on) {
  dndActive = on;
  window.petAPI.setDnd(on);
}

// 집중 모드의 상태 표시는 화면이 아니라 메뉴바 트레이 팝업에서 한다.
// 진입/해제 시 활성 모드(+집중 종료 시각)를 메인으로 보내 트레이에 미러링한다.
function setModeStatus(status) {
  window.petAPI.setModeStatus(status);
}

// 오버레이가 아닌 작은 요소(패널·pill)는 마우스가 올라온 동안만 클릭을 받는다.
// (평소 펫 창은 클릭 통과라, 안 그러면 버튼을 못 누른다 — 질문 카드와 같은 방식)
function captureOnHover(el) {
  el.addEventListener("mouseenter", () => {
    window.petAPI.setIgnoreMouseEvents(false);
  });
  el.addEventListener("mouseleave", () => {
    // 옵션창에서 모드를 고르면 패널이 사라진 뒤에 mouseleave가 뒤늦게 오는데,
    // 그때 클릭 통과로 되돌리면 청소·쪽잠 오버레이가 클릭을 못 받는다.
    if (activeMode && activeMode !== "focus") return;
    window.petAPI.setIgnoreMouseEvents(true, { forward: true });
  });
}
captureOnHover(modePanel);
captureOnHover(bubble); // 집중 모드 컨트롤이 떠 있을 때만 hover가 잡힌다(평소엔 클릭 통과)

// ── 옵션 패널 ─────────────────────────────────────────────
function openModePanel() {
  if (activeMode || modePanelOpen) return;
  modePanelOpen = true;
  modePanel.innerHTML = "";
  modePanel.appendChild(cardEl("div", "mode-title", "모드 선택"));

  for (const m of MODES) {
    const row = cardEl("button", "mode-row", null);
    row.appendChild(iconEl(m.icon));
    const txt = cardEl("span", "mode-txt", null);
    txt.appendChild(cardEl("span", "mode-name", m.label));
    txt.appendChild(cardEl("span", "mode-desc", m.desc));
    row.appendChild(txt);
    row.addEventListener("click", () => {
      closeModePanel();
      enterMode(m.id);
    });
    modePanel.appendChild(row);
  }

  // 트레이 메뉴의 "애완돌 숨기기/보이기"를 옵션창에도 둔다.
  const toggle = cardEl("button", "mode-row", null);
  toggle.appendChild(iconEl(ICON_EYE));
  const toggleTxt = cardEl("span", "mode-txt", null);
  toggleTxt.appendChild(cardEl("span", "mode-name", "애완돌 숨기기 / 보이기"));
  toggleTxt.appendChild(
    cardEl("span", "mode-desc", "잠깐 안 보이게 · 트레이에서 다시 켜기"),
  );
  toggle.appendChild(toggleTxt);
  toggle.addEventListener("click", () => {
    closeModePanel();
    window.petAPI.togglePet();
  });
  modePanel.appendChild(toggle);

  const close = cardEl("button", "mode-close-row", "닫기");
  close.addEventListener("click", closeModePanel);
  modePanel.appendChild(close);

  modePanel.classList.remove("hidden");
  positionModePanel();
  playSound("click");
}

function closeModePanel() {
  modePanelOpen = false;
  modePanel.classList.add("hidden");
  modePanel.innerHTML = "";
  window.petAPI.setIgnoreMouseEvents(true, { forward: true });
}

// 펫 머리 위에 붙이되, 공간이 부족하면 발밑으로 옮긴다(카드와 달리 화면 상단에 붙지 않음).
function positionModePanel() {
  positionAbovePet(modePanel, true);
}

// ── 모드 진입/해제 ─────────────────────────────────────────
function enterMode(mode) {
  activeMode = mode;
  if (mode === "clean") enterCleanMode();
  else if (mode === "focus") enterFocusMode();
  else if (mode === "nap") enterNapMode();
}

function exitMode() {
  const mode = activeMode;
  activeMode = null;
  if (mode === "clean") exitCleanMode();
  else if (mode === "focus") exitFocusMode();
  else if (mode === "nap") exitNapMode();
}

// 트레이 배너의 "종료"가 눌리면 메인이 이 신호를 보낸다(집중 모드만 해당).
window.petAPI.onModeExitRequest(() => {
  if (activeMode === "focus") exitMode();
});

// 트레이 배너의 "일시정지 / 계속하기"(집중 모드 전용)
window.petAPI.onModePauseRequest(() => {
  if (activeMode === "focus") toggleFocusPause();
});

// ── 키보드 청소 모드 ───────────────────────────────────────
// 잠금은 사용자가 "닫기"를 누를 때까지 유지된다(시간 제한 없음).
// 다만 앱이 멈추면 키보드가 영영 잠긴 채 남으므로, 메인의 자동 해제 상한을
// 하트비트로 계속 밀어준다. 렌더러가 살아 있는 동안은 상한에 닿지 않고,
// 멈추면 하트비트가 끊겨 CLEAN_LOCK_TTL_MS 안에 잠금이 풀린다.
const CLEAN_HEARTBEAT_MS = 10 * 1000;
const CLEAN_LOCK_TTL_MS = 30 * 1000; // 하트비트 간격의 3배 — 한두 번 밀려도 안 풀린다
let cleanStatusEl = null; // 오버레이의 차단 상태 표시 줄
let cleanGestureEl = null; // 비상 해제 안내 / 연타 진행 표시 줄
let cleanPermsEl = null; // 부족한 권한의 설정창을 여는 버튼 줄
let cleanHeartbeat = null;

// 필요한 권한은 '손쉬운 사용' 하나뿐이라, 문구도 버튼도 그 항목을 직접 가리킨다.
// 이때 오버레이는 화면을 덮지 않는 작은 카드로 줄인다. 권한이 없으면 어차피 키보드가
// 잠기지 않았고, 화면을 덮으면 뒤에 열리는 시스템 설정을 보며 조작할 수 없다.
function renderPermissionNotice() {
  if (!cleanPermsEl) return;
  // 쪽잠은 청소와 달리 하트비트로 재시도하지 않는다. 권한을 켜도 저절로 잠기지 않으니
  // 다시 시작해야 한다는 것과, 잠금과 무관하게 알람은 울린다는 것을 함께 알린다.
  const napNote =
    activeMode === "nap"
      ? "\n\n키보드를 잠그지 않아도 알람은 그대로 울려요.\n잠금은 권한 부여 후 앱을 재시작하면 적용됩니다."
      : "";
  cleanStatusEl.textContent = `⚠️ 모든 키와 단축키를 잠그려면\n'개인정보 보호 및 보안' → '손쉬운 사용'에서\n'KeyBlocker'를 켜주세요.${napNote}`;
  cleanStatusEl.classList.add("warn");

  // 잠금 재시도(하트비트)로 같은 안내가 다시 와도 버튼을 새로 만들지 않는다.
  // 다시 만들면 카드 위에 있던 마우스의 클릭 캡처가 풀려 버튼을 누를 수 없다.
  if (cleanPermsEl.childElementCount) return;

  const box = cleanPermsEl.parentElement;
  box.parentElement.classList.add("perms");
  // 카드 위에서만 클릭을 받는다 → 카드 밖(시스템 설정 창)은 그대로 조작할 수 있다.
  window.petAPI.setIgnoreMouseEvents(true, { forward: true });
  box.onmouseenter = () => window.petAPI.setIgnoreMouseEvents(false);
  box.onmouseleave = () =>
    window.petAPI.setIgnoreMouseEvents(true, { forward: true });

  const btn = cardEl("button", "clean-perm", "손쉬운 사용 열기");
  btn.tabIndex = -1; // 닫기 버튼과 같은 이유: 키보드로 눌리지 않게
  btn.addEventListener("click", (e) => {
    if (e.detail === 0) return;
    e.stopPropagation();
    window.petAPI.openPermissionSettings();
  });
  cleanPermsEl.appendChild(btn);
}

// 권한 안내를 걷고 원래의 전체화면 잠금 오버레이로 되돌린다.
function clearPermissionNotice() {
  if (!cleanPermsEl) return;
  cleanPermsEl.innerHTML = "";
  const box = cleanPermsEl.parentElement;
  if (!box || !box.parentElement) return; // 오버레이가 이미 닫힌 뒤
  if (!box.parentElement.classList.contains("perms")) return;
  box.parentElement.classList.remove("perms");
  box.onmouseenter = null;
  box.onmouseleave = null;
  window.petAPI.setIgnoreMouseEvents(false); // 잠금 중엔 화면 전체가 클릭을 삼킨다
}

// 메인(네이티브 헬퍼)이 알려주는 차단 상태를 오버레이에 반영한다.
window.petAPI.onCleanStatus((status) => {
  // 비상 해제 제스처(스페이스 10연타) — 마우스를 못 쓸 때의 탈출구.
  // 자는 동안 눌릴 일이 없는 쪽잠 모드는 대상이 아니다(알람까지 꺼지면 곤란하다).
  if (status === "unlock-request") {
    if (activeMode === "clean") exitMode();
    return;
  }
  // 연타 진행 상황 — 입력이 잡히고 있는지 눈으로 확인할 수 있게 한다
  if (status.startsWith("space-tap:")) {
    renderGestureProgress(Number(status.slice("space-tap:".length)) || 0);
    return;
  }
  if (!cleanStatusEl) return;
  if (status.startsWith("no-perms:")) {
    renderPermissionNotice();
    return;
  }
  clearPermissionNotice(); // 권한이 해결됐다 → 다시 화면을 덮는 잠금 오버레이로
  if (status === "time-limit") {
    // 상한 도달로 메인이 잠금을 이미 풀었다(쪽잠을 오래 방치했거나, 청소 중
    // 하트비트가 끊길 만큼 렌더러가 멈췄던 경우).
    cleanStatusEl.textContent = "⏱️ 키보드 잠금이 자동으로 풀렸어요.";
    cleanStatusEl.classList.remove("warn");
  } else if (status === "blocked") {
    cleanStatusEl.textContent = "🔒 키보드가 잠겼어요";
    cleanStatusEl.classList.remove("warn");
  } else if (status === "event-tap-failed") {
    cleanStatusEl.textContent =
      "⚠️ 시스템 키 이벤트 차단을 시작하지 못했어요. \n권한을 다시 확인한 뒤 앱을 재시작해주세요.";
    cleanStatusEl.classList.add("warn");
  } else {
    cleanStatusEl.textContent = "⚠️ 키보드 차단을 시작하지 못했어요.";
    cleanStatusEl.classList.add("warn");
  }
});

function enterCleanMode() {
  buildCleanOverlay();
  cleanOverlay.classList.remove("hidden");
  // 전체 창이 클릭을 받도록(뒤 앱으로 통과 X). 키보드는 메인이 네이티브 헬퍼(CGEventTap)로 삼킨다.
  window.petAPI.setIgnoreMouseEvents(false);
  window.petAPI.cleanEnter(CLEAN_LOCK_TTL_MS);
  // 닫을 때까지 잠금을 유지하기 위해 상한을 주기적으로 뒤로 민다
  cleanHeartbeat = setInterval(
    () => window.petAPI.cleanEnter(CLEAN_LOCK_TTL_MS),
    CLEAN_HEARTBEAT_MS,
  );
}

// 스페이스 연타 진행도를 점으로 보여준다(0이면 안내 문구로 되돌린다).
const UNLOCK_TAP_COUNT = 10;
function renderGestureProgress(count) {
  if (!cleanGestureEl) return;
  cleanGestureEl.textContent = count
    ? "●".repeat(count) + "○".repeat(Math.max(0, UNLOCK_TAP_COUNT - count))
    : "마우스를 못 쓰면 스페이스바를 10번 연속 눌러 주세요.";
  cleanGestureEl.classList.toggle("counting", count > 0);
}

function exitCleanMode() {
  if (cleanHeartbeat) {
    clearInterval(cleanHeartbeat);
    cleanHeartbeat = null;
  }
  cleanOverlay.classList.add("hidden");
  cleanOverlay.innerHTML = "";
  clearCleanStatusRefs();
  window.petAPI.setIgnoreMouseEvents(true, { forward: true });
  window.petAPI.cleanExit(); // 키보드 원복
}

// 오버레이를 비운 뒤에도 참조가 남으면, 뒤늦게 도착한 clean:status가 화면에서 떨어져 나간
// 노드를 건드린다(권한 안내 경로는 부모가 없어 예외까지 난다). 참조를 끊어 무해한 no-op으로 만든다.
function clearCleanStatusRefs() {
  cleanStatusEl = null;
  cleanGestureEl = null;
  cleanPermsEl = null;
}

function buildCleanOverlay() {
  cleanOverlay.innerHTML = "";
  cleanOverlay.classList.remove("perms"); // 지난 진입의 권한 안내 상태를 끌고 오지 않는다
  const box = cardEl("div", "clean-box", null);
  const icon = cardEl("img", "clean-icon", null);
  icon.src = "../../../assets/icon.png";
  icon.alt = "";
  box.appendChild(icon);
  box.appendChild(cardEl("div", "clean-title", "키보드 청소 모드"));
  box.appendChild(cardEl("div", "clean-desc", "키보드를 마음껏 닦으세요!"));

  // 비상 해제 안내 겸 연타 진행 표시
  cleanGestureEl = cardEl(
    "div",
    "clean-gesture",
    "스페이스바 10번 연속 누르기/닫기 버튼 클릭으로 해제할 수 있어요",
  );
  box.appendChild(cleanGestureEl);

  // 차단 상태 줄. 메인의 clean:status로 갱신된다(준비 중 → 잠김 / 권한 필요).
  cleanStatusEl = cardEl("div", "clean-status", "키보드 차단 준비 중…");
  box.appendChild(cleanStatusEl);

  // 권한이 부족할 때만 채워지는 설정창 열기 버튼 줄
  cleanPermsEl = cardEl("div", "clean-perms", null);
  box.appendChild(cleanPermsEl);

  const btn = cardEl("button", "clean-unlock", "닫기");
  btn.tabIndex = -1; // 키보드 포커스 대상에서 제외(Space/Enter로 눌리는 것 방지)
  btn.addEventListener("click", (e) => {
    // 키보드로 활성화된 클릭(detail===0)은 무시하고 실제 마우스 클릭만 센다.
    if (e.detail === 0) return;
    e.stopPropagation();
    exitMode();
  });
  box.appendChild(btn);
  cleanOverlay.appendChild(box);
}

// ── 집중 모드 (설정 시간 + 방해금지) ────────────────────────
// 남은 시간 카운트다운은 트레이 팝업이 focusEndAt으로 직접 표시한다.
// 일시정지 중에는 focusEndAt 대신 남은 시간(focusPausedMs)이 기준이 된다.
let focusTimeout = null;
let focusBubbleTimer = null;
let focusEndAt = null;
let focusPausedMs = null; // null이면 진행 중, 숫자면 일시정지된 잔여 ms
let focusControlsOpen = false; // 말풍선에 일시정지/중지 버튼이 떠 있는지
let focusTextEl = null;
let focusControlsEl = null;
let focusPauseBtn = null;

function focusDurationMs() {
  return Math.max(1, Number(focusMinutes) || 25) * 60 * 1000;
}

function focusRemainMs() {
  if (focusPausedMs != null) return focusPausedMs;
  return focusEndAt ? Math.max(0, focusEndAt - Date.now()) : 0;
}

// 말풍선 안에 "집중 중 MM:SS" 줄과 (숨겨진) 컨트롤 버튼 줄을 만든다.
// 카운트다운은 텍스트 줄만 갈아끼워, 버튼이 매초 새로 생기지 않게 한다.
function buildFocusBubble() {
  // 직전 클릭 반응 말풍선의 자동 숨김 타이머가 살아 있으면 타이머 말풍선을 숨겨버린다
  clearTimeout(bubbleTimeout);
  bubble.innerHTML = "";
  focusTextEl = cardEl("div", "focus-line", "");
  bubble.appendChild(focusTextEl);

  focusControlsEl = cardEl("div", "focus-ctrl hidden", null);
  const row = cardEl("div", "focus-ctrl-row", null);
  focusPauseBtn = cardEl("button", "focus-btn", "일시정지");
  focusPauseBtn.addEventListener("click", toggleFocusPause);
  row.appendChild(focusPauseBtn);
  const stop = cardEl("button", "focus-btn", "중지");
  stop.addEventListener("click", () => exitMode());
  row.appendChild(stop);
  focusControlsEl.appendChild(row);
  // 집중은 그대로 두고 펫만 감춘다. 다시 켜는 건 트레이 메뉴에서.
  const hide = cardEl("button", "focus-btn focus-btn-wide", "애완돌 숨기기");
  hide.addEventListener("click", () => {
    setFocusControls(false); // 다시 보일 때 버튼이 열린 채 남지 않게
    window.petAPI.togglePet();
  });
  focusControlsEl.appendChild(hide);
  bubble.appendChild(focusControlsEl);
}

// 평소 말풍선은 클릭 통과(pointer-events: none)라, 버튼이 떠 있는 동안만 클릭을 받는다.
function setFocusControls(open) {
  focusControlsOpen = open;
  focusControlsEl.classList.toggle("hidden", !open);
  bubble.classList.toggle("interactive", open);
  // 커서가 펫 위에 있으면 클릭 통과로 되돌리지 않는다(되돌리면 펫이 클릭을 못 받는다).
  if (!open && !overCharacter) {
    window.petAPI.setIgnoreMouseEvents(true, { forward: true });
  }
  renderFocusBubble(); // 높이가 바뀌므로 위치 재계산
}

function renderFocusBubble() {
  if (activeMode !== "focus") return;
  const label = focusPausedMs != null ? "일시정지" : "집중 중";
  focusTextEl.textContent = `${label} ${formatMMSS(focusRemainMs())}`;
  bubble.classList.remove("hidden");
  positionBubble();
}

function stopFocusBubble() {
  if (focusBubbleTimer) {
    clearInterval(focusBubbleTimer);
    focusBubbleTimer = null;
  }
  focusEndAt = null;
  focusPausedMs = null;
  setFocusControls(false); // interactive 해제 — 안 하면 말풍선이 계속 클릭을 먹는다
  bubble.classList.add("hidden");
}

function toggleFocusPause() {
  if (focusPausedMs != null) resumeFocus();
  else pauseFocus();
}

// 방해금지는 그대로 둔다 — 멈춘 건 타이머지 집중 모드가 아니다.
function pauseFocus() {
  if (activeMode !== "focus" || focusPausedMs != null) return;
  focusPausedMs = Math.max(0, focusEndAt - Date.now());
  clearTimeout(focusTimeout);
  focusTimeout = null;
  clearInterval(focusBubbleTimer);
  focusBubbleTimer = null;
  focusPauseBtn.textContent = "계속하기";
  setModeStatus({
    mode: "focus",
    focusEndAt: null,
    paused: true,
    remainMs: focusPausedMs,
  });
  renderFocusBubble();
}

function resumeFocus() {
  if (activeMode !== "focus" || focusPausedMs == null) return;
  const remain = focusPausedMs;
  focusPausedMs = null;
  focusEndAt = Date.now() + remain;
  focusTimeout = setTimeout(finishFocus, remain);
  focusBubbleTimer = setInterval(renderFocusBubble, 1000);
  focusPauseBtn.textContent = "일시정지";
  setModeStatus({ mode: "focus", focusEndAt, paused: false });
  renderFocusBubble();
}

function enterFocusMode() {
  setDnd(true);
  focusEndAt = Date.now() + focusDurationMs();
  focusPausedMs = null;
  buildFocusBubble();
  setModeStatus({ mode: "focus", focusEndAt, paused: false });
  renderFocusBubble();
  focusBubbleTimer = setInterval(renderFocusBubble, 1000);
  focusTimeout = setTimeout(finishFocus, focusDurationMs());
}

function exitFocusMode() {
  if (focusTimeout) {
    clearTimeout(focusTimeout);
    focusTimeout = null;
  }
  setModeStatus(null);
  stopFocusBubble();
  setDnd(false);
}

function finishFocus() {
  exitMode(); // activeMode 해제 + 타이머/방해금지 정리
  showBubble("집중 시간이 끝났어요! 잠깐 쉬어가요 ☕", 6000);
}

// ── 쪽잠 모드 (화면·키보드 잠금 + 타이머 + 알람) ─────────────
// 청소 모드와 같은 전체화면 오버레이로 화면을 덮고, 같은 네이티브 헬퍼로 키보드를 잠근다.
// 권한이 없어 키보드가 안 잠기더라도 안내 문구만 뜰 뿐 타이머·알람은 그대로 동작한다.
const napOverlay = document.getElementById("nap-overlay");
const NAP_SNOOZE_MS = 5 * 60 * 1000;
// 키보드 잠금 상한에 얹는 여유. 알람이 울린 뒤 일어나서 버튼을 누를 때까지를 감안한다.
const NAP_LOCK_GUARD_MS = 10 * 60 * 1000;
const NAP_ALARM_REPEAT_MS = 2000; // 알람은 끌 때까지 이 간격으로 반복해서 운다
// 자리를 비웠을 때 하루 종일 울지 않도록 반복에 상한을 둔다.
// 소리만 멈추고 오버레이·버튼은 남겨, 돌아왔을 때 상황을 알 수 있게 한다.
const NAP_ALARM_MAX_MS = 5 * 60 * 1000;

let napEndAt = null;
let napPausedMs = null; // null이면 진행 중, 숫자면 일시정지된 잔여 ms
let napTimeout = null;
let napTick = null;
let napAlarmTimer = null;
let napAlarmStopTimer = null;
let napTitleEl = null;
let napTimeEl = null;
let napDescEl = null;
let napPauseBtn = null;
let napActionsEl = null;
let napAlarmActionsEl = null;

function napDurationMs() {
  return Math.max(1, Number(napMinutes) || 20) * 60 * 1000;
}

function renderNapTime() {
  const remain =
    napPausedMs != null
      ? napPausedMs
      : napEndAt
        ? Math.max(0, napEndAt - Date.now())
        : 0;
  napTimeEl.textContent = formatMMSS(remain);
}

// 잠결에 Space/Enter로 눌리지 않도록 키보드 활성화(detail===0)는 무시하고,
// 포커스 대상에서도 뺀다(키보드 차단 권한이 없을 때를 대비).
function napButton(label, cls, onClick) {
  const btn = cardEl("button", cls, label);
  btn.tabIndex = -1;
  btn.addEventListener("click", (e) => {
    if (e.detail === 0) return;
    onClick();
  });
  return btn;
}

function buildNapOverlay() {
  napOverlay.innerHTML = "";
  napOverlay.classList.remove("perms");
  const box = cardEl("div", "nap-box", null);
  napTitleEl = cardEl("div", "nap-title", "쪽잠 모드");
  napTimeEl = cardEl("div", "nap-time", "00:00");
  napDescEl = cardEl("div", "nap-desc", "끝나면 알람이 울려요");
  box.appendChild(napTitleEl);
  box.appendChild(napTimeEl);
  box.appendChild(napDescEl);

  napActionsEl = cardEl("div", "nap-actions", null);
  napPauseBtn = napButton("일시정지", "nap-btn", toggleNapPause);
  napActionsEl.appendChild(napPauseBtn);
  napActionsEl.appendChild(napButton("중지", "nap-btn", () => exitMode()));
  box.appendChild(napActionsEl);

  // 알람이 울릴 때만 보이는 줄
  napAlarmActionsEl = cardEl("div", "nap-actions hidden", null);
  napAlarmActionsEl.appendChild(
    napButton("알람 끄기", "nap-btn primary", () => exitMode()),
  );
  napAlarmActionsEl.appendChild(
    napButton("5분 후 다시 알림", "nap-btn", snoozeNap),
  );
  box.appendChild(napAlarmActionsEl);

  // 키보드 차단 상태(권한 안내)는 청소 모드와 같은 줄·같은 메시지를 쓴다.
  cleanStatusEl = cardEl("div", "clean-status", "키보드 차단 준비 중…");
  box.appendChild(cleanStatusEl);
  cleanPermsEl = cardEl("div", "clean-perms", null);
  box.appendChild(cleanPermsEl);

  napOverlay.appendChild(box);
}

function startNapTimer(ms) {
  napPausedMs = null;
  napEndAt = Date.now() + ms;
  clearTimeout(napTimeout);
  napTimeout = setTimeout(ringNapAlarm, ms);
  // 잠금 시작 + 상한 갱신. 스누즈·재개로 시간이 늘어나도 그만큼 잠금이 따라간다.
  window.petAPI.cleanEnter(ms + NAP_LOCK_GUARD_MS);
  if (!napTick) napTick = setInterval(renderNapTime, 1000);
  renderNapTime();
}

function toggleNapPause() {
  if (napPausedMs != null) resumeNap();
  else pauseNap();
}

function pauseNap() {
  if (napPausedMs != null) return;
  napPausedMs = Math.max(0, napEndAt - Date.now());
  clearTimeout(napTimeout);
  napTimeout = null;
  clearInterval(napTick);
  napTick = null;
  napPauseBtn.textContent = "계속하기";
  napDescEl.textContent = "일시정지됨";
  renderNapTime();
}

function resumeNap() {
  if (napPausedMs == null) return;
  napPauseBtn.textContent = "일시정지";
  napDescEl.textContent = "끝나면 알람이 울려요";
  startNapTimer(napPausedMs);
}

function ringNapAlarm() {
  napTimeout = null;
  napEndAt = null;
  clearInterval(napTick);
  napTick = null;
  napTimeEl.textContent = "00:00";
  napTitleEl.textContent = "일어날 시간이에요!";
  napDescEl.textContent = "푹 쉬셨나요?";
  napActionsEl.classList.add("hidden");
  napAlarmActionsEl.classList.remove("hidden");
  napOverlay.classList.add("ringing");
  playAlarm();
  napAlarmTimer = setInterval(playAlarm, NAP_ALARM_REPEAT_MS);
  napAlarmStopTimer = setTimeout(() => {
    stopNapAlarm();
    napDescEl.textContent = "알람을 멈췄어요. '알람 끄기'를 눌러 주세요.";
  }, NAP_ALARM_MAX_MS);
}

function stopNapAlarm() {
  if (napAlarmTimer) {
    clearInterval(napAlarmTimer);
    napAlarmTimer = null;
  }
  if (napAlarmStopTimer) {
    clearTimeout(napAlarmStopTimer);
    napAlarmStopTimer = null;
  }
  napOverlay.classList.remove("ringing");
}

function snoozeNap() {
  stopNapAlarm();
  napTitleEl.textContent = "쪽잠 모드";
  napDescEl.textContent = "5분 뒤에 다시 울려요";
  napPauseBtn.textContent = "일시정지";
  napAlarmActionsEl.classList.add("hidden");
  napActionsEl.classList.remove("hidden");
  startNapTimer(NAP_SNOOZE_MS);
}

function enterNapMode() {
  buildNapOverlay();
  napOverlay.classList.remove("hidden");
  // 전체 창이 클릭을 받도록(뒤 앱으로 통과 X). 키보드는 메인이 네이티브 헬퍼로 삼킨다.
  window.petAPI.setIgnoreMouseEvents(false);
  setDnd(true); // 자는 동안 앱 배너 알림 억제
  primeAudio(); // 알람이 울릴 땐 클릭이 없으므로 지금(클릭 직후) 오디오를 깨워 둔다
  startNapTimer(napDurationMs()); // 키보드 잠금(cleanEnter)도 여기서 함께 시작한다
}

function exitNapMode() {
  stopNapAlarm();
  clearTimeout(napTimeout);
  napTimeout = null;
  clearInterval(napTick);
  napTick = null;
  napEndAt = null;
  napPausedMs = null;
  napOverlay.classList.add("hidden");
  napOverlay.innerHTML = "";
  clearCleanStatusRefs(); // 쪽잠 오버레이도 같은 차단 상태 줄을 쓴다
  window.petAPI.setIgnoreMouseEvents(true, { forward: true });
  window.petAPI.cleanExit(); // 키보드 원복
  setDnd(false);
}

// ---------- 8. 초기화 ----------

// 시작 위치(설정에 맞는 코너)가 정해질 때까지 숨겨 둔다. initSettings에서 표시.
character.style.visibility = "hidden";
placeCharacter();
requestAnimationFrame(followStep);
initTimeWatcher();
initUsageWatcher();
initBatteryWatcher();
initEvolution();
initEvolutionPreviewKeys();
initSettings();
initTuning();
