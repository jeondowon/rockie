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
      addEventListener() {}
    },
    performance: { now: () => 1000 },
    t: (key) => key,
    onLocaleChange() {},
  });
  vm.runInContext(source, context);
  return {
    canvas, ctx, calls, window,
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
