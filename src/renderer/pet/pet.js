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
let spritePrefix = "rockie"; // 표시할 GIF 접두어 (단계·돌·변형에 따라 결정)
let spriteLevel = "level0"; // GIF가 담긴 레벨 폴더

const EASE = 0.06; // 목표를 향해 이동하는 비율이 작을수록 천천히 따라감
const MAX_SPEED = 1; // 프레임당 최대 이동 픽셀 (너무 빠르지 않게 제한)
const MAX_SPEED_FIXED = 10; // 고정 위치로 이동할 때는 좀 더 빠르게 미끄러져 감
const FIXED_EDGE_GAP = 60; // 고정 모드에서 화면 끝과 펫 사이 여백(말풍선이 개행되며 펫을 가리지 않도록)
const FACE_DEADZONE = 6; // 마우스가 중심에서 이 픽셀 이내면 방향 유지 (gif 깜빡임 방지)
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

function spriteUrl(name) {
  return `../../../assets/gif/${spriteLevel}/${spritePrefix}_${name}.gif`;
}

// 지친 상태(배터리 부족)면 단계별 표정 gif, 아니면 바라보는 방향의 걷기 gif를 표시.
// 표시할 파일은 현재 진화 단계에 따른 spriteLevel/spritePrefix로 결정된다.
function applySprite() {
  const name = tiredSprite || (facing === "left" ? "left" : "right");
  const src = spriteUrl(name);
  if (!character.src.endsWith(src)) character.src = src;
}

// 애정 표현용 하트 오버레이. level2/3은 love gif가 없어 smile + 하트로 애정을 표현한다.
// 트레이 "돌보기"(닦기/밥) 직후 main이 보내는 pet:show-heart 신호로 발동된다.
function showHeart() {
  heart.classList.remove("hidden");
}

function hideHeart() {
  heart.classList.add("hidden");
}

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
  applyHeartOffset(); // 현재 스프라이트/크기에 맞춘 위치 보정
  showHeart();
  clearTimeout(heartTimer);
  heartTimer = setTimeout(hideHeart, HEART_DURATION);
}

window.petAPI.onShowHeart(triggerHeart);

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
  }

  // 세로 이동(Dock 위로 올라가기/내려오기)은 걷기가 멈춰 있어도 계속 동작해야 한다
  verticalStep();
  placeCharacter();
  if (PREVIEW) applyTuneVisibility(); // 튜닝 중 대상 표시를 매 프레임 재확정
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

const BUBBLE_MARGIN = 4; // 몸통과 화면 좌우 끝 사이 최소 여백
const BUBBLE_TAIL_PAD = 12; // 꼬리가 몸통의 둥근 모서리에 걸치지 않도록 양 끝에서 띄우는 여백

function positionBubble() {
  const o = BUBBLE_OFFSET[spritePrefix] || { x: 0, y: 0 };
  const k = CHAR_SIZE / 320;
  const w = bubble.offsetWidth;

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
  bubble.style.setProperty("--tail-x", tailInBody + "px");

  // 세로는 박스 상단(posY)이 아니라 펫 '머리 상단'(posY + SPRITE_MARGIN) 기준으로 잡아
  // 크기가 커져 투명 여백이 늘어도 말풍선~펫 간격이 일정하게 유지되도록 한다.
  // (offsetHeight + 꼬리 5px + 여유 6px 만큼 위로 = 꼬리 끝이 머리 위 약 6px)
  bubble.style.top =
    posY + SPRITE_MARGIN - bubble.offsetHeight - 11 + o.y * k + "px";
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
  if (pendingEvolution) {
    openEvolutionCard();
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
    messages: [
      "집중모드 ON!",
      "버그는 도망 못 가요.",
      "오늘도 멋진 코드 기대할게요!",
    ],
  },
  {
    id: "terminal",
    pattern: /terminal|iterm|powershell|cmd\.exe/,
    messages: [
      "명령어 조심히 치세요..",
      "rm -rf는 안돼요!",
      "명령어, 하나도 안 틀리고 잘 치고 계세요.",
    ],
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
    pattern:
      /netflix|넷플릭스|watcha|왓챠|wavve|웨이브|disney\+|디즈니|tving|티빙/,
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
      {
        after: 5 * 60 * 1000,
        messages: ["슬슬... 하던 일이 부르고 있지 않나요?"],
      },
      {
        after: 15 * 60 * 1000,
        messages: ["이제 진짜 그만!! 할 일 하셔야죠!!"],
      },
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
    8000,
  );
});

// ---------- 5. 배터리 상태 리액션 ----------

// 배터리가 부족하면(충전 중 제외) sleepy.gif로 바꾸고 단계별 메시지를 보여준다.
// 낮은 단계부터 순서대로 두어 getBatteryTier가 "현재 속한 가장 낮은 구간"을 찾는다.
// 예) 22% → 30 단계, 8% → 10 단계, 1% → 1 단계
const BATTERY_TIERS = [
  { level: 1, sprite: "sad", message: "이제 한계예요, 충전해주세요ㅠㅠ" },
  {
    level: 5,
    sprite: "sad",
    message: "저 곧 쓰러질 것 같아요... 충전 서둘러주세요!!",
  },
  {
    level: 10,
    sprite: "sleepy",
    message: "이제 정말 졸려요.. 얼마 못 버틸 것 같아요.",
  },
  {
    level: 15,
    sprite: "sleepy",
    message: "눈이 슬슬 감겨요... 충전이 필요해요.",
  },
  {
    level: 20,
    sprite: "sleepy",
    message: "점점 힘이 빠져요... 충전기 챙겨주시면 안 될까요?",
  },
  {
    level: 30,
    sprite: "sleepy",
    message: "저..슬슬 피곤한데, 충전 부탁드려요...",
  },
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

// ---------- 6. 진화 상태 (단계 전환 시 gif 교체) ----------

const STONE_NAMES = {
  granite: "화강암",
  basalt: "현무암",
  marble: "대리석",
  gneiss: "편마암",
};

// 1단계 돌 → 2단계 변성체 접두어 (파일명은 접두어_e/i_포즈, update.md 1.1)
const VARIANT_STONE = {
  granite: "pegmatite",
  basalt: "eclogite",
  marble: "corundumMarble",
  gneiss: "migmatite",
};

// (돌 종류, 변형) → 3단계 보석 접두어 (update.md 1.1)
const GEM = {
  granite: { extrovert: "topaz", introvert: "aquamarine" },
  basalt: { extrovert: "diamond_cut", introvert: "diamond_rough" },
  marble: { extrovert: "partiSapphire", introvert: "ruby" },
  gneiss: { extrovert: "labradorite", introvert: "moonstone" },
};

// 진화 상태 → 표시할 GIF의 레벨 폴더와 접두어
function resolveSprite(stage, stoneType, variant) {
  if (stage >= 3 && stoneType && variant) {
    return { level: "level3", prefix: GEM[stoneType][variant] };
  }
  if (stage === 2 && stoneType && variant) {
    const suffix = variant === "extrovert" ? "e" : "i";
    return { level: "level2", prefix: `${VARIANT_STONE[stoneType]}_${suffix}` };
  }
  if (stage >= 1 && stoneType) {
    return { level: "level1", prefix: stoneType };
  }
  return { level: "level0", prefix: "rockie" };
}

function spriteUrlFor(info, name) {
  const { level, prefix } = resolveSprite(
    info.stage,
    info.stoneType,
    info.variant,
  );
  return `../../../assets/gif/${level}/${prefix}_${name}.gif`;
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

function evolvePreludeMessage(userName) {
  return `${userName || "대장님"}님, 제 몸이 변하는 것 같아요...!`;
}

function evolveMessage({ stage, stoneType }) {
  if (stage === 1) return `저, ${STONE_NAMES[stoneType]}이 됐어요!`;
  if (stage === 2) return "몸이 변하고 있어요… 변성체가 됐어요!";
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

function setPendingEvolution(pending, userName) {
  pendingEvolution = pending;
  if (!pendingEvolution) return;
  applyEvolution(pendingEvolution.from);
  showBubble(evolvePreludeMessage(userName), 3000);
}

function previewEvolution(to) {
  const fromByStage = {
    1: { stage: 0, stoneType: null, variant: null },
    2: { stage: 1, stoneType: to.stoneType, variant: null },
    3: { stage: 2, stoneType: to.stoneType, variant: to.variant },
  };
  setPendingEvolution(
    {
      stage: to.stage,
      from: fromByStage[to.stage],
      to,
      createdAt: new Date().toISOString(),
      preview: true,
    },
    null,
  );
}

// 단계가 올라가면 바로 gif를 바꾸지 않고, 펫 클릭으로 여는 진화 카드 상태로 둔다.
window.petAPI.onEvolved((info) => {
  setPendingEvolution(info.pendingEvolution, info.userName);
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
    if (state.pendingEvolution) {
      setPendingEvolution(state.pendingEvolution, state.userName);
      return;
    }
    applyEvolution({
      stage: state.stage,
      stoneType: state.stoneType,
      variant: state.variant,
    });
  } catch (_err) {
    // 상태를 못 읽으면 기본(rockie) 유지
  }
}

// ---------- 8. 성향 질문 카드 (트레이 "새로운 질문에 답하기"로만 열림) ----------

// 트레이 버튼 요청이 오면 질문 카드를 연다 (능동 접근만, 예고/강제 노출 없음)
window.petAPI.onOpenQuestionCard(() => {
  if (qcard.classList.contains("hidden")) openQuestionCard();
});

function positionCard() {
  // 카드를 펫 위쪽에 띄우되, 가로 위치는 펫 위치 모드에 맞춰 화면 안쪽으로 펼친다.
  const w = qcard.offsetWidth;
  const h = qcard.offsetHeight;
  // 말풍선과 같은 기준(머리 상단 = posY + SPRITE_MARGIN)으로 잡아 카드를 펫에 더 가깝게 내린다.
  let top = posY + SPRITE_MARGIN - h - 12;
  if (top < 8) top = 8;
  qcard.style.left = overlayLeft(w, 8) + "px";
  qcard.style.top = top + "px";
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

  if (evolutionCardStep === 0) {
    hint.textContent = "좋아요, 힘이 모이고 있어요...";
    img.classList.add("blink-out");
    await wait(EVOLVE_BLINK_OUT_MS);
    img.classList.remove("blink-out");
    await wait(EVOLVE_BLINK_IN_MS);
    evolutionCardStep = 1;
  } else if (evolutionCardStep === 1) {
    img.classList.add("blink-out");
    await wait(EVOLVE_BLINK_OUT_MS);
    img.classList.remove("blink-out");
    await wait(EVOLVE_BLINK_IN_MS);
    hint.textContent = "마지막으로 한 번 더 눌러\n힘을 모아주세요!";
    evolutionCardStep = 2;
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
  const q = state.question;

  // 답하지 않고 닫기 (상태 변화 없음 — 질문은 오늘 목록에 그대로 남아 다시 열 수 있다)
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
initEvolution();
initEvolutionPreviewKeys();
initSettings();
initTuning();
