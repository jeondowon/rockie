// 펫 슬링샷: 화면을 떠나면 시간과 조준을 멈추고 코스 상태는 유지한다.
const slingCanvas = document.getElementById("sling-board");
const slingCtx = slingCanvas.getContext("2d");
const slingPet = new Image();
let slingPetPrefix = "rockie";
let slingBall = MiniGameRules.newSlingCourse(0);
let slingAim = null;
let slingKeyboardAngle = -Math.PI / 2;
let slingKeyboardPower = 30;
let slingFrame = null;
let slingLastTime = null;
let slingManualPause = false;
let slingImpact = 0;
let slingRoundId = null;
let slingCompleted = new Map();
let slingPaid = 0;
let slingSaving = false;
let slingSaveError = false;

function updateSlingPet(sprite = shopSprite) {
  slingPetPrefix = sprite.prefix;
  const src = spriteGifUrl(sprite.level, sprite.prefix, "smile");
  if (slingPet.getAttribute("src") !== src) slingPet.src = src;
}
slingPet.addEventListener("load", drawSlingshot);
window.trayAPI.onPetDisplaySprite(updateSlingPet);

function renderSlingshot() {
  const course = MiniGameRules.SLING_COURSES[slingBall.index];
  const pending = slingPaid < slingCompleted.size;
  document.getElementById("sling-course").textContent = t("sling.course", {
    count: slingBall.index + 1, total: MiniGameRules.SLING_COURSES.length,
  });
  document.getElementById("sling-shots").textContent = t("sling.shots", { count: slingBall.shots, par: course.par });
  document.getElementById("sling-shard-count").textContent = String(slingPaid);
  document.getElementById("sling-earned").setAttribute("aria-label", t("game.shards", { count: slingPaid }));
  document.getElementById("sling-earned").setAttribute("title", t("game.shards", { count: slingPaid }));
  document.getElementById("sling-result").classList.toggle("hidden", !slingBall.holed);
  const stars = MiniGameRules.slingStars(slingBall);
  document.getElementById("sling-stars").textContent = "★".repeat(stars) + "☆".repeat(3 - stars);
  document.getElementById("sling-result-detail").textContent = slingSaving ? t("arcade.saving")
    : pending ? t("arcade.saveError") : t("sling.cleared", { count: slingBall.shots });
  const next = document.getElementById("sling-next");
  next.textContent = t(slingBall.index === MiniGameRules.SLING_COURSES.length - 1 ? "sling.finish" : "sling.next");
  next.disabled = slingSaving || pending;
  document.getElementById("sling-retry").disabled = slingSaving || pending;
  document.getElementById("sling-pause").disabled = slingBall.holed;
  document.getElementById("sling-pause").textContent = t(slingManualPause ? "game.resume" : "game.pause");
  document.getElementById("sling-paused").classList.toggle("hidden", !slingManualPause || slingBall.holed);
  document.getElementById("sling-error").textContent = slingSaveError ? t("arcade.saveError") : "";
  document.getElementById("sling-retry-save").classList.toggle("hidden", !slingSaveError);
  document.getElementById("sling-help").textContent = t("sling.help");
  slingCanvas.setAttribute("aria-label", t("arcade.slingshot"));
  if (typeof miniGameWindowHeight === "function" &&
    !document.getElementById("slingshot-view").classList.contains("hidden"))
    window.trayAPI.resizePopup(miniGameWindowHeight("slingshot"));
}

function drawSlingshot() {
  const width = MiniGameRules.SLING_WIDTH;
  const height = MiniGameRules.SLING_HEIGHT;
  const dpr = window.devicePixelRatio || 1;
  if (slingCanvas.width !== Math.round(width * dpr) || slingCanvas.height !== Math.round(height * dpr)) {
    slingCanvas.width = Math.round(width * dpr);
    slingCanvas.height = Math.round(height * dpr);
  }
  slingCtx.setTransform(slingCanvas.width / width, 0, 0, slingCanvas.height / height, 0, 0);
  slingCtx.imageSmoothingEnabled = false;
  slingCtx.fillStyle = "#dfe5cd";
  slingCtx.fillRect(0, 0, width, height);
  slingCtx.fillStyle = "#cbd5ba";
  for (let y = 18; y < height; y += 24)
    for (let x = 18; x < width; x += 24) slingCtx.fillRect(x, y, 2, 2);
  slingCtx.strokeStyle = "#67785d";
  slingCtx.lineWidth = 10;
  slingCtx.strokeRect(5, 5, width - 10, height - 10);

  const course = MiniGameRules.SLING_COURSES[slingBall.index];
  const [hx, hy] = course.hole;
  slingCtx.fillStyle = "#b7c29f";
  slingCtx.beginPath();
  slingCtx.arc(hx, hy, 22, 0, Math.PI * 2);
  slingCtx.fill();
  slingCtx.fillStyle = "#303b2c";
  slingCtx.beginPath();
  slingCtx.arc(hx, hy, 15, 0, Math.PI * 2);
  slingCtx.fill();
  slingCtx.fillRect(hx + 17, hy - 28, 2, 29);
  slingCtx.fillStyle = "#cb785b";
  slingCtx.fillRect(hx + 19, hy - 28, 15, 10);

  for (const wall of MiniGameRules.slingWalls(slingBall)) {
    slingCtx.fillStyle = "#a9b597";
    slingCtx.fillRect(wall.x + 3, wall.y + 4, wall.w, wall.h);
    slingCtx.fillStyle = wall.axis ? "#be8c55" : "#718165";
    slingCtx.fillRect(wall.x, wall.y, wall.w, wall.h);
    slingCtx.fillStyle = wall.axis ? "#dfb784" : "#97a68a";
    slingCtx.fillRect(wall.x + 2, wall.y + 2, wall.w - 4, 3);
  }

  for (const bumper of course.bumpers || []) {
    slingCtx.fillStyle = "#a9b597";
    slingCtx.beginPath();
    slingCtx.arc(bumper.x + 3, bumper.y + 4, bumper.radius, 0, Math.PI * 2);
    slingCtx.fill();
    slingCtx.fillStyle = "#cb785b";
    slingCtx.strokeStyle = "#804f3e";
    slingCtx.lineWidth = 3;
    slingCtx.beginPath();
    slingCtx.arc(bumper.x, bumper.y, bumper.radius, 0, Math.PI * 2);
    slingCtx.fill();
    slingCtx.stroke();
    slingCtx.strokeStyle = "#f2d6a2";
    slingCtx.beginPath();
    slingCtx.arc(bumper.x, bumper.y, bumper.radius - 6, 0, Math.PI * 2);
    slingCtx.stroke();
  }

  if (slingAim && !slingBall.holed) {
    const dx = slingBall.x - slingAim.x;
    const dy = slingBall.y - slingAim.y;
    const distance = Math.hypot(dx, dy);
    const power = Math.min(1, distance / MiniGameRules.SLING_MAX_PULL);
    const scale = Math.min(1, MiniGameRules.SLING_MAX_PULL / Math.max(1, distance));
    const angle = Math.atan2(dy, dx);
    const arrowLength = Math.max(MiniGameRules.BALL_RADIUS + 16, distance * scale);
    const tipX = slingBall.x + Math.cos(angle) * arrowLength;
    const tipY = slingBall.y + Math.sin(angle) * arrowLength;
    slingCtx.strokeStyle = "#5d6650";
    slingCtx.lineWidth = 2;
    slingCtx.setLineDash([4, 5]);
    slingCtx.beginPath();
    slingCtx.moveTo(slingBall.x - dx * scale, slingBall.y - dy * scale);
    slingCtx.lineTo(distance >= 5 ? tipX : slingBall.x, distance >= 5 ? tipY : slingBall.y);
    slingCtx.stroke();
    slingCtx.setLineDash([]);
    if (distance >= 5) {
      slingCtx.save();
      slingCtx.translate(tipX, tipY);
      slingCtx.rotate(angle);
      slingCtx.fillStyle = "#5d6650";
      slingCtx.beginPath();
      slingCtx.moveTo(0, 0);
      slingCtx.lineTo(-10, -5);
      slingCtx.lineTo(-10, 5);
      slingCtx.closePath();
      slingCtx.fill();
      slingCtx.restore();
    }
    slingCtx.fillStyle = "#f2ede1";
    slingCtx.fillRect(105, height - 22, 110, 7);
    slingCtx.fillStyle = "#bf7755";
    slingCtx.fillRect(105, height - 22, power ** 1.5 * 110, 7);
  }

  if (!slingBall.holed) {
    slingCtx.save();
    slingCtx.translate(slingBall.x, slingBall.y);
    slingCtx.rotate(slingBall.angle);
    const squash = slingAim ? 0.12 : slingImpact;
    slingCtx.scale(1 + squash, 1 - squash);
    if (slingPet.complete && slingPet.naturalWidth) {
      const body = (CHARACTER_ATTACHMENTS[slingPetPrefix] || CHARACTER_ATTACHMENTS.rockie).body;
      const scale = 26 / body.width;
      slingCtx.drawImage(slingPet, -body.x * scale, -body.y * scale, 320 * scale, 320 * scale);
    } else {
      slingCtx.fillStyle = "#81776a";
      slingCtx.beginPath();
      slingCtx.arc(0, 0, MiniGameRules.BALL_RADIUS, 0, Math.PI * 2);
      slingCtx.fill();
    }
    slingCtx.restore();
  }
}

async function saveSlingReward() {
  if (slingSaving || slingPaid >= slingCompleted.size) return;
  slingSaving = true;
  slingSaveError = false;
  renderSlingshot();
  try {
    if (!slingRoundId) slingRoundId = await window.trayAPI.startGame("slingshot");
    renderEconomy(await window.trayAPI.reportGameScore(slingRoundId, slingCompleted.size * 250));
    slingPaid = slingCompleted.size;
  } catch {
    slingSaveError = true;
  } finally {
    slingSaving = false;
    renderSlingshot();
  }
}

function slingLoop(time) {
  const dt = slingLastTime === null ? 0 : Math.min((time - slingLastTime) / 1000, 0.032);
  slingLastTime = time;
  const { vx, vy } = slingBall;
  MiniGameRules.stepSling(slingBall, dt);
  if (vx * slingBall.vx + vy * slingBall.vy < 0) slingImpact = 0.2;
  slingImpact = Math.max(0, slingImpact - dt * 1.4);
  // 움직이는 벽이 조준 중인 펫을 밀었으면 기존 조준은 취소한다.
  if (slingAim && Math.hypot(slingBall.x - slingAim.originX, slingBall.y - slingAim.originY) > 1)
    cancelSlingAim();
  drawSlingshot();
  if (slingBall.holed) {
    slingFrame = null;
    slingCompleted.set(slingBall.index, Math.max(slingCompleted.get(slingBall.index) || 0, MiniGameRules.slingStars(slingBall)));
    renderSlingshot();
    saveSlingReward();
    return;
  }
  slingFrame = requestAnimationFrame(slingLoop);
}

function resumeSlingshot() {
  updateSlingPet();
  renderSlingshot();
  drawSlingshot();
  if (!popupVisible || document.getElementById("slingshot-view").classList.contains("hidden") ||
    slingFrame !== null || slingManualPause || slingBall.holed) return;
  slingLastTime = null;
  slingFrame = requestAnimationFrame(slingLoop);
}

function cancelSlingAim() {
  const pointerId = slingAim?.pointerId;
  slingAim = null;
  if (pointerId !== undefined && slingCanvas.hasPointerCapture(pointerId)) slingCanvas.releasePointerCapture(pointerId);
}

function pauseSlingshot() {
  if (slingFrame !== null) cancelAnimationFrame(slingFrame);
  slingFrame = null;
  slingLastTime = null;
  cancelSlingAim();
  drawSlingshot();
}

function slingCanShoot() {
  return popupVisible && !document.getElementById("slingshot-view").classList.contains("hidden") &&
    !slingManualPause && !slingBall.holed && !MiniGameRules.slingMoving(slingBall);
}

function slingPoint(event) {
  const rect = slingCanvas.getBoundingClientRect();
  return {
    x: (event.clientX - rect.left - slingCanvas.clientLeft) * 320 / slingCanvas.clientWidth,
    y: (event.clientY - rect.top - slingCanvas.clientTop) * 360 / slingCanvas.clientHeight,
  };
}

slingCanvas.addEventListener("pointerdown", (event) => {
  if (event.button !== 0 || !slingCanShoot()) return;
  const point = slingPoint(event);
  if (Math.hypot(point.x - slingBall.x, point.y - slingBall.y) > 30) return;
  event.preventDefault();
  slingCanvas.focus();
  slingAim = { ...point, originX: slingBall.x, originY: slingBall.y, pointerId: event.pointerId };
  slingCanvas.setPointerCapture(event.pointerId);
});
slingCanvas.addEventListener("pointermove", (event) => {
  if (slingAim?.pointerId === event.pointerId) Object.assign(slingAim, slingPoint(event));
});
slingCanvas.addEventListener("pointerup", (event) => {
  if (!slingAim || slingAim.pointerId !== event.pointerId) return;
  const point = slingPoint(event);
  if (slingCanShoot()) MiniGameRules.shootSling(slingBall, slingBall.x - point.x, slingBall.y - point.y);
  cancelSlingAim();
  renderSlingshot();
});
slingCanvas.addEventListener("pointercancel", cancelSlingAim);
slingCanvas.addEventListener("lostpointercapture", cancelSlingAim);
slingCanvas.addEventListener("keydown", (event) => {
  if (!slingCanShoot() || !["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", " ", "Escape"].includes(event.key)) return;
  event.preventDefault();
  if (event.key === "Escape") { cancelSlingAim(); return; }
  if (event.key === "ArrowLeft") slingKeyboardAngle -= Math.PI / 24;
  if (event.key === "ArrowRight") slingKeyboardAngle += Math.PI / 24;
  if (event.key === "ArrowUp") slingKeyboardPower = Math.min(MiniGameRules.SLING_MAX_PULL, slingKeyboardPower + 3);
  if (event.key === "ArrowDown") slingKeyboardPower = Math.max(6, slingKeyboardPower - 3);
  const dx = Math.cos(slingKeyboardAngle) * slingKeyboardPower;
  const dy = Math.sin(slingKeyboardAngle) * slingKeyboardPower;
  slingAim = { x: slingBall.x - dx, y: slingBall.y - dy, originX: slingBall.x, originY: slingBall.y };
  if (event.key === " ") {
    MiniGameRules.shootSling(slingBall, dx, dy);
    cancelSlingAim();
    renderSlingshot();
  }
});

function setSlingPaused(paused) {
  slingManualPause = paused;
  if (paused) pauseSlingshot();
  else resumeSlingshot();
  renderSlingshot();
}

function loadSlingCourse(index) {
  pauseSlingshot();
  slingBall = MiniGameRules.newSlingCourse(index);
  slingManualPause = false;
  slingImpact = 0;
  slingKeyboardAngle = -Math.PI / 2;
  slingKeyboardPower = 30;
  resumeSlingshot();
}

document.getElementById("sling-pause").addEventListener("click", () => setSlingPaused(!slingManualPause));
document.getElementById("sling-resume").addEventListener("click", () => setSlingPaused(false));
document.getElementById("sling-retry").addEventListener("click", () => {
  if (!slingSaving && slingPaid === slingCompleted.size) loadSlingCourse(slingBall.index);
});
document.getElementById("sling-next").addEventListener("click", () => {
  if (!slingBall.holed || slingSaving || slingPaid < slingCompleted.size) return;
  if (slingBall.index === MiniGameRules.SLING_COURSES.length - 1) {
    slingCompleted = new Map();
    slingPaid = 0;
    slingRoundId = null;
    loadSlingCourse(0);
  } else loadSlingCourse(slingBall.index + 1);
});
document.getElementById("sling-retry-save").addEventListener("click", saveSlingReward);
window.addEventListener("resize", drawSlingshot);
onLocaleChange(renderSlingshot);
updateSlingPet();
renderSlingshot();
