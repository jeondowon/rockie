const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const source = fs.readFileSync(
  path.join(__dirname, "../src/renderer/tray/tray-game.js"), "utf8",
);

function fixture(dpr) {
  const calls = [];
  const ctx = Object.fromEntries([
    "setTransform", "clearRect", "setLineDash", "beginPath", "moveTo",
    "lineTo", "stroke", "save", "translate", "rotate", "drawImage", "restore",
  ].map((name) => [name, (...args) => calls.push([name, ...args])]));
  const elements = new Map();
  function element(id) {
    if (!elements.has(id)) elements.set(id, {
      style: {},
      listeners: {},
      classList: { contains: () => false, add() {}, toggle() {} },
      addEventListener(name, fn) { this.listeners[name] = fn; },
      setAttribute() {},
    });
    return elements.get(id);
  }
  const canvas = Object.assign(element("game-board"), {
    width: 320, height: 460, clientWidth: 320, clientLeft: 3,
    getContext: () => ctx,
    getBoundingClientRect: () => ({ left: 20 }),
  });
  const window = {
    devicePixelRatio: dpr,
    listeners: {},
    addEventListener(name, fn) { this.listeners[name] = fn; },
  };
  const context = vm.createContext({
    window,
    document: { getElementById: element, createElement: () => canvas },
    Image: class {
      complete = true;
      naturalWidth = 320;
      naturalHeight = 320;
      addEventListener() {}
    },
    performance: { now: () => 1000 },
    t: (key) => key,
    onLocaleChange() {},
    popupVisible: true,
    requestAnimationFrame: () => 1,
    cancelAnimationFrame() {},
  });
  vm.runInContext(source, context);
  return {
    canvas, ctx, calls, window, element,
    run: (code) => vm.runInContext(code, context),
  };
}

test("화면 배율에 맞는 해상도로 그리면서 게임판 표시 크기는 유지한다", () => {
  for (const dpr of [2, 1, 1.25]) {
    const f = fixture(dpr);
    f.run("drawGame()");
    assert.equal(f.canvas.width, 320 * dpr);
    assert.equal(f.canvas.height, 460 * dpr);
    assert.equal(f.canvas.style.width, "320px");
    assert.equal(f.canvas.style.height, "460px");
    assert.equal(f.ctx.imageSmoothingEnabled, false);
    assert.deepEqual(f.calls.find(([name]) => name === "setTransform"),
      ["setTransform", dpr, 0, 0, dpr, 0, 0]);
    assert.ok(f.calls.some((call) => JSON.stringify(call) === '["lineTo",320,48]'));
  }
});

test("화면 배율이 달라도 마우스 낙하 위치와 벽·바닥 충돌 위치가 같다", () => {
  for (const dpr of [1, 2]) {
    const f = fixture(dpr);
    f.run("drawGame(); gameCurrentTier = 0;");
    f.canvas.listeners.mousemove({ clientX: 20 + 3 + 160 });
    assert.equal(f.run("gameMouseX"), 160);
    f.run("tryGameDrop()");
    assert.ok(Math.abs(f.run("gameBalls[0].x") - 160) <= 1);
    f.run("gameBalls[0].x = 1000; gameBalls[0].y = 1000; gamePhysicsSubstep(0)");
    assert.equal(f.run("gameBalls[0].x"), 306);
    assert.equal(f.run("gameBalls[0].y"), 446);
    f.run("gameBalls[0].x = -100; gamePhysicsSubstep(0)");
    assert.equal(f.run("gameBalls[0].x"), 14);
  }
});

test("일시정지 중 화면 배율이 바뀌어도 상태를 유지하며 다시 그린다", () => {
  const f = fixture(1);
  f.run("gameManuallyPaused = true; spawnGameBall(0, 100, 200); drawGame()");
  const before = f.run("JSON.stringify(gameBalls)");
  for (const dpr of [2, 1]) {
    f.window.devicePixelRatio = dpr;
    f.window.listeners.resize();
    assert.equal(f.canvas.width, 320 * dpr);
    assert.equal(f.canvas.height, 460 * dpr);
    assert.equal(f.run("JSON.stringify(gameBalls)"), before);
    assert.equal(f.run("gameManuallyPaused"), true);
    assert.equal(f.ctx.imageSmoothingEnabled, false);
  }
});

test("점수 옆 조각 수는 250점마다 늘고 새 판에서 초기화된다", async () => {
  const f = fixture(1);
  const reports = [];
  f.window.trayAPI = {
    startGame: async () => "round-1",
    reportGameScore: async (round, score) => { reports.push([round, score]); },
  };
  f.run("renderEconomy = () => {}");
  for (const [score, shards] of [[0, 0], [249, 0], [250, 1], [499, 1], [500, 2]]) {
    f.run(`gameScore = ${score}; updateGameHud()`);
    await f.run("gameRewardQueue");
    assert.equal(f.element("game-score").textContent, String(score));
    assert.equal(f.element("game-shard-count").textContent, String(shards));
  }
  assert.deepEqual(reports, [["round-1", 250], ["round-1", 500]]);
  await f.run("resetGame()");
  assert.equal(f.element("game-score").textContent, "0");
  assert.equal(f.element("game-shard-count").textContent, "0");
});

test("NEXT 미리보기는 투명 여백을 제외한 캐릭터를 비율 그대로 중앙에 표시한다", () => {
  const f = fixture(2);
  f.run(`
    gameNextTier = 0;
    gameSpriteCrops[0] = { x: 90, y: 100, w: 130, h: 120 };
    updateGameHud();
  `);
  const preview = f.element("game-next-img");
  const scale = parseFloat(preview.style.width) / 320;
  assert.equal(130 * scale, 26);
  assert.equal(120 * scale, 24);
  assert.equal(parseFloat(preview.style.height) / 320, scale);
  assert.equal(parseFloat(preview.style.left) + (90 + 130 / 2) * scale, 17);
  assert.equal(parseFloat(preview.style.top) + (100 + 120 / 2) * scale, 17);
  f.run("gameNextTier = 1; updateGameHud()");
  assert.equal(preview.src, "../../../assets/img/basalt.png");
  assert.equal(preview.style.width, "34px");
  assert.equal(preview.style.left, "0px");
  for (const [tier, name] of ["rockie", "basalt", "gneiss", "granite"].entries()) {
    f.run(`gameNextTier = ${tier}; updateGameHud()`);
    assert.equal(preview.src, `../../../assets/img/${name}.png`);
    assert.ok(fs.existsSync(path.resolve(__dirname, "../src/renderer/tray", preview.src)));
  }
});
