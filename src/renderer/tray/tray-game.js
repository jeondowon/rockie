// 트레이 팝업 · 게임 화면 (#game-view) — 돌 합치기(수박게임 스타일 병합 게임)
// 물리 라이브러리 없이 원형 충돌만 직접 계산한다 (프로젝트가 외부 의존성/CDN을 쓰지 않는 원칙과 일치).
// 루프는 화면이 보이는 동안만 돈다(일시정지) — 시작/멈춤은 tray.js의 showScreen이 호출하고,
// 진행 상태(점수·보드)는 화면을 나가도 초기화하지 않고 그대로 들고 있는다.

const GAME_TIERS = [
  { id: "rockie", img: "../../../assets/gif/level0/rockie_smile.gif", r: 14 },
  { id: "basalt", img: "../../../assets/gif/level1/basalt_smile.gif", r: 21 },
  { id: "gneiss", img: "../../../assets/gif/level1/gneiss_smile.gif", r: 28 },
  { id: "granite", img: "../../../assets/gif/level1/granite_smile.gif", r: 35 },
  { id: "marble", img: "../../../assets/gif/level1/marble_smile.gif", r: 42 },
  {
    id: "eclogite_i",
    img: "../../../assets/gif/level2/eclogite_i_smile.gif",
    r: 49,
  },
  {
    id: "corundumMarble_e",
    img: "../../../assets/gif/level2/corundumMarble_e_smile.gif",
    r: 56,
  },
  {
    id: "pegmatite_i",
    img: "../../../assets/gif/level2/pegmatite_i_smile.gif",
    r: 63,
  },
  {
    id: "labradorite",
    img: "../../../assets/gif/level3/labradorite_smile.gif",
    r: 70,
  },
  {
    id: "partiSapphire",
    img: "../../../assets/gif/level3/partiSapphire_smile.gif",
    r: 77,
  },
  {
    id: "diamond_cut",
    img: "../../../assets/gif/level3/diamond_cut_smile.gif",
    r: 84,
  },
];

const GAME_DROP_POOL = [0, 0, 0, 0, 1, 1, 1, 2, 2, 3]; // 초반 낮은 단계 위주로 등장
const GAME_GRAVITY = 1800;
const GAME_WALL_RESTITUTION = 0.25;
const GAME_FLOOR_RESTITUTION = 0.2;
const GAME_BALL_RESTITUTION = 0.15;
const GAME_FLOOR_FRICTION = 0.999; // 바닥 마찰. 1에 가까울수록 컬링처럼 오래 미끄러진다
const GAME_SPRITE_SCALE = 1.02; // 여백을 잘라낸 뒤에도 살짝 여유 있게 그리는 배율
const GAME_DROP_COOLDOWN_MS = 350;
const GAME_SPAWN_Y = 36;
const GAME_DANGER_LINE_Y = 48;
const GAME_DANGER_HOLD_MS = 1000;
const GAME_SETTLE_AGE_MS = 600;

const gameCanvas = document.getElementById("game-board");
const gameCtx = gameCanvas.getContext("2d");
// 게임 좌표는 CSS 픽셀로 유지하고, 캔버스 내부 해상도만 화면 배율에 맞춘다.
const GAME_WIDTH = gameCanvas.width;
const GAME_HEIGHT = gameCanvas.height;
gameCanvas.style.width = `${GAME_WIDTH}px`;
gameCanvas.style.height = `${GAME_HEIGHT}px`;

function syncGameCanvasResolution() {
  const dpr = window.devicePixelRatio || 1;
  const width = Math.round(GAME_WIDTH * dpr);
  const height = Math.round(GAME_HEIGHT * dpr);
  if (gameCanvas.width !== width || gameCanvas.height !== height) {
    gameCanvas.width = width;
    gameCanvas.height = height;
  }
  gameCtx.setTransform(width / GAME_WIDTH, 0, 0, height / GAME_HEIGHT, 0, 0);
  gameCtx.imageSmoothingEnabled = false;
}
const gameScoreEl = document.getElementById("game-score");
const gameNextImgEl = document.getElementById("game-next-img");
const gameOverEl = document.getElementById("game-over");
const gameOverScoreEl = document.getElementById("game-over-score");
const gameRestartBtn = document.getElementById("game-restart");
const gamePauseBtn = document.getElementById("game-pause-btn");
const gameRestartHudBtn = document.getElementById("game-restart-btn");
const gamePausedEl = document.getElementById("game-paused");
const gameResumeBtn = document.getElementById("game-resume");

const gameSprites = GAME_TIERS.map((tier) => {
  const img = new Image();
  img.src = tier.img;
  return img;
});

// 원본 스프라이트는 여백이 많아서(캐릭터가 320x320 캔버스의 절반 정도만 차지)
// 그대로 그리면 공(충돌 반지름)과 실제 그림 사이에 빈 원형 공백이 생긴다.
// 로드 시 투명하지 않은 픽셀의 실제 범위를 찾아 그 부분만 잘라서 그린다.
const gameSpriteCrops = new Array(gameSprites.length).fill(null);
const gameCropScratch = document.createElement("canvas");
const gameCropCtx = gameCropScratch.getContext("2d");

function computeGameOpaqueBounds(img) {
  gameCropScratch.width = img.naturalWidth;
  gameCropScratch.height = img.naturalHeight;
  gameCropCtx.clearRect(0, 0, gameCropScratch.width, gameCropScratch.height);
  gameCropCtx.drawImage(img, 0, 0);
  let data;
  try {
    data = gameCropCtx.getImageData(
      0,
      0,
      gameCropScratch.width,
      gameCropScratch.height,
    ).data;
  } catch {
    return null; // file:// 환경에서 픽셀 읽기가 막히면 원본 이미지를 그대로 사용
  }
  let minX = gameCropScratch.width,
    minY = gameCropScratch.height,
    maxX = 0,
    maxY = 0;
  for (let y = 0; y < gameCropScratch.height; y++) {
    for (let x = 0; x < gameCropScratch.width; x++) {
      if (data[(y * gameCropScratch.width + x) * 4 + 3] > 10) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX <= minX || maxY <= minY) return null;
  const w = maxX - minX + 1;
  const h = maxY - minY + 1;
  const cx = minX + w / 2;
  const cy = minY + h / 2;

  // 캐릭터를 빈틈없이 감싸는 최소 원의 반지름(중심에서 가장 먼 불투명 픽셀까지 거리).
  // 물리 충돌은 이 원을 기준으로 하고, 위 bbox(w,h)는 그림을 그리는 용도로만 쓴다.
  let maxDistSq = 0;
  for (let y = 0; y < gameCropScratch.height; y++) {
    for (let x = 0; x < gameCropScratch.width; x++) {
      if (data[(y * gameCropScratch.width + x) * 4 + 3] > 10) {
        const dx = x + 0.5 - cx;
        const dy = y + 0.5 - cy;
        const d = dx * dx + dy * dy;
        if (d > maxDistSq) maxDistSq = d;
      }
    }
  }

  return { x: minX, y: minY, w, h, boundRadius: Math.sqrt(maxDistSq) };
}

gameSprites.forEach((img, i) => {
  img.addEventListener("load", () => {
    gameSpriteCrops[i] = computeGameOpaqueBounds(img);
  });
});

// 물리(충돌/벽) 판정에 쓰는 실제 반지름. 그림은 crop을 r*2*GAME_SPRITE_SCALE 정사각형에
// 늘려서 그리는데, 캐릭터가 원이 아니라서 그 정사각형 구석까지 그림이 차 있을 수 있다.
// crop이 로드되기 전까지는 디자인 반지름(tier.r)을 그대로 쓴다.
function getGameCollisionR(tierIndex) {
  const tier = GAME_TIERS[tierIndex];
  const crop = gameSpriteCrops[tierIndex];
  if (!crop) return tier.r;
  const drawSize = tier.r * 2 * GAME_SPRITE_SCALE;
  const scale = drawSize / Math.min(crop.w, crop.h);
  return crop.boundRadius * scale;
}

let gameBalls = [];
let gameNextId = 1;
let gameScore = 0;
let gameMouseX = GAME_WIDTH / 2;
let gameDropCooldownUntil = 0;
let gameDangerTimerMs = 0;
let gameOver = false;
let gameCurrentTier = pickGameDropTier();
let gameNextTier = pickGameDropTier();
let gameLastTs = null;
let gameRafId = null; // null이면 루프가 멈춰 있다(일시정지)
let gameManuallyPaused = false; // 사용자가 일시정지 버튼으로 멈춘 상태(화면 전환과 별개)

// 요청을 순서대로 처리한다. 메인은 판 ID와 이미 지급한 수량으로 중복을 막는다.
let gameRoundId = null;
let gameRewardQueue = Promise.resolve();
let gameRewardRequested = 0;
let gameResetting = false;

function syncGameReward() {
  const score = gameScore;
  if (score < 250) return gameRewardQueue;
  gameRewardRequested = Math.floor(score / 250);
  gameRewardQueue = gameRewardQueue
    .catch(() => {})
    .then(async () => {
      if (!gameRoundId) gameRoundId = await window.trayAPI.startGame();
      renderEconomy(await window.trayAPI.reportGameScore(gameRoundId, score));
      document.getElementById("game-reward-error").textContent = "";
    })
    .catch((error) => {
      gameRewardRequested = 0;
      document.getElementById("game-reward-error").textContent =
        t("game.rewardError");
      gameManuallyPaused = true;
      gamePausedEl.classList.toggle("hidden", gameOver);
      pauseGame();
      updateGameActionLabels();
      throw error;
    });
  return gameRewardQueue;
}

function pickGameDropTier() {
  return GAME_DROP_POOL[Math.floor(Math.random() * GAME_DROP_POOL.length)];
}

function spawnGameBall(tierIndex, x, y, vy = 0) {
  const tier = GAME_TIERS[tierIndex];
  gameBalls.push({
    id: gameNextId++,
    tier: tierIndex,
    x,
    y,
    vx: 0,
    vy,
    angle: 0,
    r: tier.r,
    createdAt: performance.now(),
  });
}

async function resetGame() {
  if (gameResetting) return;
  gameResetting = true;
  pauseGame();
  try {
    await syncGameReward();
  } catch {
    gameResetting = false;
    return;
  }
  gameRoundId = null;
  gameRewardRequested = 0;
  gameDropCooldownUntil = 0;
  gameResetting = false;
  gameBalls = [];
  gameScore = 0;
  gameDangerTimerMs = 0;
  gameOver = false;
  gameCurrentTier = pickGameDropTier();
  gameNextTier = pickGameDropTier();
  gameOverEl.classList.add("hidden");
  setGamePaused(false);
  updateGameHud();
}

// 일시정지 버튼 · 오버레이의 "이어하기" 버튼이 공유하는 토글.
function setGamePaused(paused) {
  if (gameResetting) return;
  if (gameOver) return; // 게임오버 화면에서는 의미가 없다
  gameManuallyPaused = paused;
  gamePausedEl.classList.toggle("hidden", !paused);
  if (paused) pauseGame();
  else resumeGame();
  updateGameActionLabels();
}

function updateGameHud() {
  gameScoreEl.textContent = String(gameScore);
  gameNextImgEl.src = GAME_TIERS[gameNextTier].img;
  document.getElementById("game-reward-progress").textContent = t(
    "game.rewardProgress",
    {
      count: Math.floor(gameScore / 250),
      remaining: 250 - (gameScore % 250),
    },
  );
  gameOverScoreEl.textContent = t("game.score", { score: gameScore });
  if (Math.floor(gameScore / 250) > gameRewardRequested)
    syncGameReward().catch(() => {});
}

function tryGameDrop() {
  if (gameOver || gameManuallyPaused || gameResetting) return;
  const now = performance.now();
  if (now < gameDropCooldownUntil) return;
  const cr = getGameCollisionR(gameCurrentTier);
  // 같은 자리를 계속 클릭하면 x가 매번 완전히 똑같아져서 충돌 법선이 계속
  // 수직(0,1)이 되고, 대칭이 절대 안 깨져서 돌이 일자 기둥으로 쌓인다.
  // 아주 작은 랜덤 지터로 그 대칭을 미리 깨뜨린다.
  const jitter = (Math.random() - 0.5) * 2;
  const x = Math.max(cr, Math.min(GAME_WIDTH - cr, gameMouseX + jitter));
  spawnGameBall(gameCurrentTier, x, GAME_SPAWN_Y);
  gameCurrentTier = gameNextTier;
  gameNextTier = pickGameDropTier();
  gameDropCooldownUntil = now + GAME_DROP_COOLDOWN_MS;
  updateGameHud();
}

gameCanvas.addEventListener("mousemove", (e) => {
  const rect = gameCanvas.getBoundingClientRect();
  gameMouseX = (e.clientX - rect.left - gameCanvas.clientLeft) *
    GAME_WIDTH / gameCanvas.clientWidth;
});
gameCanvas.addEventListener("click", tryGameDrop);
gameRestartBtn.addEventListener("click", resetGame);

gamePauseBtn.addEventListener("click", () =>
  setGamePaused(!gameManuallyPaused),
);
gameResumeBtn.addEventListener("click", () => setGamePaused(false));

gameRestartHudBtn.addEventListener("click", () => {
  showConfirm({
    title: t("confirm.gameRestartTitle"),
    desc: t("confirm.gameRestartDesc"),
    okLabel: t("game.restart"),
    onOk: resetGame,
  });
});

function updateGameActionLabels() {
  gamePauseBtn.setAttribute(
    "aria-label",
    t(gameManuallyPaused ? "game.resume" : "game.pause"),
  );
  gameRestartHudBtn.setAttribute("aria-label", t("game.restart"));
}
updateGameActionLabels();
onLocaleChange(() => {
  updateGameActionLabels();
  updateGameHud();
  if (document.getElementById("game-reward-error").textContent)
    document.getElementById("game-reward-error").textContent =
      t("game.rewardError");
});

// 한 프레임(dt)을 여러 번의 작은 substep으로 나눠서 처리한다.
// 돌이 많이 쌓였을 때 substep 없이 한 번에(중력 적용 1번 + 보정 8회) 풀면,
// 매 프레임 새로 쌓이는 무게/속도를 8회 보정이 못 따라잡아서 겹침이 사라지지 않고
// 프레임이 지날수록 오히려 더 깊이 파고드는 현상이 있었다(실측 확인됨).
// substep마다 중력을 조금씩 나눠 적용 + 보정 횟수를 늘리면 수렴한다.
const GAME_PHYSICS_SUBSTEPS = 8;
const GAME_POSITION_ITERATIONS = 60;

function gameStep(dt) {
  const subDt = dt / GAME_PHYSICS_SUBSTEPS;
  let merged = false;
  for (let s = 0; s < GAME_PHYSICS_SUBSTEPS; s++) {
    if (gamePhysicsSubstep(subDt)) merged = true;
  }
  if (merged) updateGameHud();

  // 남아있는 미세한 떨림을 완전히 죽인다(멈춘 것으로 취급할 속도 임계값).
  // substep마다가 아니라 프레임당 한 번만 해야 한다 — substep당 중력 속도 증가분
  // (GAME_GRAVITY*subDt)이 이 임계값보다 작으면 매 substep마다 중력 자체가 0으로 눌려서
  // 돌이 거의 안 떨어지는 버그가 생긴다(실제로 겪음).
  for (const b of gameBalls) {
    if (Math.abs(b.vx) < 4) b.vx = 0;
    if (Math.abs(b.vy) < 4) b.vy = 0;
  }

  // 위험선을 넘는 돌이 있으면 게임 오버 타이머를 쌓는다. 막 떨어뜨린 돌은
  // 스폰 지점 자체가 위험선보다 위라서 GAME_SETTLE_AGE_MS 동안은 봐준다 — 그 시간이
  // 지나도 여전히 위에 있다면 쌓인 돌에 막혀서 못 내려간 것이므로 진짜 위험 상태다.
  const now = performance.now();
  const overLine = gameBalls.some(
    (b) =>
      now - b.createdAt > GAME_SETTLE_AGE_MS && b.y - b.r < GAME_DANGER_LINE_Y,
  );
  gameDangerTimerMs = overLine ? gameDangerTimerMs + dt * 1000 : 0;
  if (gameDangerTimerMs > GAME_DANGER_HOLD_MS) {
    gameOver = true;
    gameOverScoreEl.textContent = t("game.score", { score: gameScore });
    gameOverEl.classList.remove("hidden");
  }
}

// 겹침 없는 상태로 수렴했는지 여부와 무관하게, 병합이 하나라도 있었으면 true를 반환한다.
function gamePhysicsSubstep(dt) {
  // 그림(design) 반지름과 실제 충돌 반지름을 분리한다 — 캐릭터가 원이 아니라서
  // 충돌은 캐릭터를 빈틈없이 감싸는 더 큰 원(cr) 기준으로 해야 그림이 겹치지 않는다.
  for (const b of gameBalls) {
    b.cr = getGameCollisionR(b.tier);
  }

  for (const b of gameBalls) {
    b.vy += GAME_GRAVITY * dt;
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    // 미끄러지지 않고 구르는 것처럼: 수평 이동만큼 반지름 기준으로 회전시킨다.
    b.angle += (b.vx / b.cr) * dt;

    if (b.x < b.cr) {
      b.x = b.cr;
      b.vx = -b.vx * GAME_WALL_RESTITUTION;
    } else if (b.x > GAME_WIDTH - b.cr) {
      b.x = GAME_WIDTH - b.cr;
      b.vx = -b.vx * GAME_WALL_RESTITUTION;
    }
    if (b.y > GAME_HEIGHT - b.cr) {
      b.y = GAME_HEIGHT - b.cr;
      b.vy = -b.vy * GAME_FLOOR_RESTITUTION;
      b.vx *= GAME_FLOOR_FRICTION;
    }
  }

  const merges = [];
  const consumed = new Set();

  // 위치 보정(겹침 해소)은 여러 번 반복해야 여러 개가 쌓였을 때 안정적으로 수렴한다.
  // 반면 속도 임펄스(반발력)는 substep당 한 번만 넣어야 한다 — 반복마다 다시 넣으면
  // 힘이 중복 누적되어 쌓인 돌들이 계속 미세하게 튕기는 진동이 생긴다.
  //
  // 쌍을 처리하는 순서도 수렴 속도에 큰 영향을 준다: y가 큰(아래) 돌부터 처리하도록
  // 한 번만 정렬하면 중력 방향과 맞아떨어져 훨씬 빨리 수렴한다.
  const order = gameBalls
    .map((_, idx) => idx)
    .sort((i1, i2) => gameBalls[i2].y - gameBalls[i1].y);
  // order는 y가 큰(아래) 것부터 정렬돼 있으므로, a보다 위에 있는 b들의 y는 oj가 커질수록
  // 단조 감소한다 — a.y - b.y가 "어떤 공끼리도 닿을 수 없는 최대 거리"를 넘어서면 그 뒤의
  // b는 전부 더 멀리 있으므로 안전하게 break 할 수 있다. n^2 거리 계산을 크게 줄여준다.
  let maxCr = 0;
  for (const b of gameBalls) if (b.cr > maxCr) maxCr = b.cr;
  for (let iter = 0; iter < GAME_POSITION_ITERATIONS; iter++) {
    for (let oi = 0; oi < order.length; oi++) {
      const a = gameBalls[order[oi]];
      if (consumed.has(a.id)) continue;
      const maxReach = a.cr + maxCr;
      for (let oj = oi + 1; oj < order.length; oj++) {
        const b = gameBalls[order[oj]];
        if (a.y - b.y > maxReach) break;
        if (consumed.has(b.id)) continue;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const rawDist = Math.hypot(dx, dy);
        const minDist = a.cr + b.cr;
        if (rawDist >= minDist) continue;

        if (a.tier === b.tier) {
          if (iter === 0) {
            consumed.add(a.id);
            consumed.add(b.id);
            merges.push({ a, b });
          }
          continue;
        }

        // 두 중심이 거의 같은 좌표에 겹친 경우 dx=dy=0에 가까워 분리 방향(nx,ny)이
        // (0,0)이 되어버린다 — 그러면 밀어내는 힘이 전혀 안 생겨서 영원히 완전히
        // 겹친 채 고정된다(일자로 정렬된 기둥에서 병합된 돌이 바로 옆 돌과 좌표가
        // 같아지면 이 상태에 빠진다). 이런 경우 임의의 방향(아래)으로 밀어내기 시작한다.
        const dist = rawDist < 0.5 ? 0.5 : rawDist;
        const nx = rawDist < 0.5 ? 0 : dx / dist;
        const ny = rawDist < 0.5 ? 1 : dy / dist;
        const overlap = minDist - dist;
        const invA = 1 / (a.cr * a.cr);
        const invB = 1 / (b.cr * b.cr);
        const total = invA + invB;
        a.x -= nx * overlap * (invA / total);
        a.y -= ny * overlap * (invA / total);
        b.x += nx * overlap * (invB / total);
        b.y += ny * overlap * (invB / total);

        if (iter === 0) {
          const relVelN = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
          if (relVelN < 0) {
            // 거의 멈춘 상태로 맞닿은 경우(안착 중)는 반발을 주지 않는다.
            // 그렇지 않으면 중력이 계속 다시 밀어넣고 반발이 계속 튕겨내는
            // 상태가 반복되어 쌓인 돌들이 끝없이 떨게 된다.
            const rest = Math.abs(relVelN) < 40 ? 0 : GAME_BALL_RESTITUTION;
            const j2 = (-(1 + rest) * relVelN) / (invA + invB);
            const ix = j2 * nx;
            const iy = j2 * ny;
            a.vx -= ix * invA;
            a.vy -= iy * invA;
            b.vx += ix * invB;
            b.vy += iy * invB;
          }
        }
      }
    }

    // 겹침 해소가 돌을 벽/바닥 밖으로 밀어낼 수 있으므로, 반복마다 위치만
    // 다시 경계 안으로 눌러준다(속도 반사는 위 진입 시점에 이미 처리했으므로 여기선 안 함).
    for (const b of gameBalls) {
      if (consumed.has(b.id)) continue;
      if (b.x < b.cr) b.x = b.cr;
      else if (b.x > GAME_WIDTH - b.cr) b.x = GAME_WIDTH - b.cr;
      if (b.y > GAME_HEIGHT - b.cr) b.y = GAME_HEIGHT - b.cr;
    }
  }

  if (merges.length) {
    gameBalls = gameBalls.filter((b) => !consumed.has(b.id));
    for (const { a, b } of merges) {
      const midX = (a.x + b.x) / 2;
      const midY = (a.y + b.y) / 2;
      gameScore += (a.tier + 1) * 10;
      if (a.tier < GAME_TIERS.length - 1) {
        spawnGameBall(a.tier + 1, midX, midY, Math.min(a.vy, b.vy));
      } else {
        gameScore += 200; // 최종 단계끼리 합치면 사라지며 보너스
      }
    }
  }

  return merges.length > 0;
}

function drawGame() {
  syncGameCanvasResolution();
  gameCtx.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

  gameCtx.strokeStyle = "rgba(255,120,120,0.5)";
  gameCtx.setLineDash([6, 6]);
  gameCtx.beginPath();
  gameCtx.moveTo(0, GAME_DANGER_LINE_Y);
  gameCtx.lineTo(GAME_WIDTH, GAME_DANGER_LINE_Y);
  gameCtx.stroke();
  gameCtx.setLineDash([]);

  for (const b of gameBalls) {
    drawGameBall(b.x, b.y, b.r, b.tier, b.angle);
  }

  if (!gameOver) {
    const r = GAME_TIERS[gameCurrentTier].r;
    const cr = getGameCollisionR(gameCurrentTier);
    const x = Math.max(cr, Math.min(GAME_WIDTH - cr, gameMouseX));
    gameCtx.strokeStyle = "rgba(27,27,22,0.3)";
    gameCtx.setLineDash([4, 6]);
    gameCtx.beginPath();
    gameCtx.moveTo(x, GAME_SPAWN_Y + r);
    gameCtx.lineTo(x, GAME_HEIGHT);
    gameCtx.stroke();
    gameCtx.setLineDash([]);
    drawGameBall(x, GAME_SPAWN_Y, r, gameCurrentTier);
  }
}

function drawGameBall(x, y, r, tierIndex, angle = 0) {
  const img = gameSprites[tierIndex];
  const crop = gameSpriteCrops[tierIndex];
  const drawSize = r * 2 * GAME_SPRITE_SCALE;
  if (!img.complete || img.naturalWidth === 0) {
    gameCtx.beginPath();
    gameCtx.arc(x, y, r, 0, Math.PI * 2);
    gameCtx.fillStyle = "#8a7a6a";
    gameCtx.fill();
    return;
  }
  gameCtx.save();
  gameCtx.translate(x, y);
  gameCtx.rotate(angle);
  if (crop) {
    // 투명 여백을 잘라내고 실제 캐릭터 부분만 공 크기에 맞춰 그린다.
    gameCtx.drawImage(
      img,
      crop.x,
      crop.y,
      crop.w,
      crop.h,
      -drawSize / 2,
      -drawSize / 2,
      drawSize,
      drawSize,
    );
  } else {
    gameCtx.drawImage(img, -drawSize / 2, -drawSize / 2, drawSize, drawSize);
  }
  gameCtx.restore();
}

function gameLoop(ts) {
  if (gameLastTs === null) gameLastTs = ts;
  const dt = Math.min(0.032, (ts - gameLastTs) / 1000);
  gameLastTs = ts;
  if (!gameOver) gameStep(dt);
  drawGame();
  if (!gameManuallyPaused) gameRafId = requestAnimationFrame(gameLoop);
}

// tray.js의 showScreen이 화면 전환 때마다 부른다: 게임 화면에 들어오면 이어서
// 재생하고, 벗어나면 상태는 그대로 둔 채 루프만 멈춘다(초기화하지 않음).
function resumeGame() {
  if (
    gameResetting ||
    !popupVisible ||
    document.getElementById("game-view").classList.contains("hidden")
  )
    return;
  if (gameRafId !== null) return;
  if (gameManuallyPaused) return; // 화면 재진입만으로 수동 일시정지를 풀지 않는다
  if (Math.floor(gameScore / 250) > gameRewardRequested)
    syncGameReward().catch(() => {});
  gameLastTs = null; // 멈춰 있던 동안의 시간 간격이 dt에 그대로 들어가지 않도록
  gameRafId = requestAnimationFrame(gameLoop);
}

function pauseGame() {
  if (gameRafId === null) return;
  cancelAnimationFrame(gameRafId);
  gameRafId = null;
}

// 게임 화면에 딱 맞는 창 높이(px) 계산. 기본 팝업 높이(540px)보다 보드가 커서
// 그대로 두면 세로 스크롤이 생기므로, tray.js의 showScreen이 이 값으로 창을 키운다.
function gameWindowHeight() {
  return (
    document.querySelector(".titlebar").offsetHeight +
    document.querySelector(".back-bar").offsetHeight +
    document.querySelector(".game-wrap").offsetHeight +
    6 + // #popup 상하 테두리(3px×2)
    10 // 창 = #popup + 10px (하드 섀도우 여백)
  );
}

window.addEventListener("resize", drawGame);
updateGameHud();
