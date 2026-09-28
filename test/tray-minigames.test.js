const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { createEconomy } = require("../src/main/economy");

function fixture() {
  const elements = new Map();
  const spriteListeners = [];
  function element(id) {
    if (!elements.has(id)) {
      const classes = new Set();
      elements.set(id, {
        style: {}, listeners: {}, children: [], attrs: {},
        classList: {
          contains: (name) => classes.has(name),
          add: (name) => classes.add(name),
          toggle(name, force) { if (force) classes.add(name); else classes.delete(name); },
        },
        addEventListener(name, callback) { this.listeners[name] = callback; },
        setAttribute(name, value) { this.attrs[name] = value; },
        replaceChildren() { this.children = []; },
        append(...children) { this.children.push(...children); },
        hasPointerCapture: () => false,
        clientWidth: 320, clientHeight: 360, clientLeft: 3, clientTop: 3,
        getBoundingClientRect: () => ({ left: 10, top: 20 }),
        getContext: () => new Proxy({}, { get: (target, key) => target[key] || (() => {}) }),
      });
    }
    return elements.get(id);
  }
  const data = { economy: { shards: 0, owned: [], decoration: null, theme: null } };
  let failSave = false;
  const economy = createEconomy({ get: () => data, save() { if (failSave) throw Error("disk-full"); } });
  const frames = new Map();
  let frameId = 0;
  let reports = 0;
  const context = vm.createContext({
    document: { getElementById: element, createElement: () => element(Symbol()) },
    window: {
      devicePixelRatio: 2, addEventListener() {},
      trayAPI: {
        onPetDisplaySprite(callback) { spriteListeners.push(callback); },
        startGame: async (game) => economy.startRound(game),
        reportGameScore: async (id, score) => { reports++; return economy.reportScore(id, score); },
      },
    },
    Image: class {
      complete = false;
      addEventListener() {}
      getAttribute(name) { return this[name]; }
    },
    shopSprite: { level: "level0", prefix: "rockie" },
    t: (key) => key,
    onLocaleChange() {}, renderEconomy() {}, showConfirm() {},
    popupVisible: true,
    requestAnimationFrame(callback) { frames.set(++frameId, callback); return frameId; },
    cancelAnimationFrame(id) { frames.delete(id); },
  });
  for (const file of ["../shared/sprites.js", "minigame-rules.js", "tray-dungeon.js", "tray-slingshot.js"]) {
    vm.runInContext(fs.readFileSync(path.join(__dirname, "../src/renderer/tray", file), "utf8"), context);
  }
  return {
    element, frames, economy, reports: () => reports,
    emitSprite: (sprite) => spriteListeners.forEach((callback) => callback(sprite)),
    failSave: (value) => { failSave = value; },
    run: (source) => vm.runInContext(source, context),
  };
}

test("슬링샷은 모든 진화 스킨에 실제 존재하는 캐릭터 이미지를 사용한다", () => {
  const f = fixture();
  const sprites = f.run(`[
    resolveSprite(0),
    ...Object.keys(STONE_NAMES).map((stone) => resolveSprite(1, stone)),
    ...[2, 3].flatMap((stage) => Object.keys(STONE_NAMES).flatMap((stone) =>
      ["introvert", "extrovert"].map((variant) => resolveSprite(stage, stone, variant)))),
  ]`);
  for (const sprite of sprites) {
    f.run(`shopSprite = ${JSON.stringify(sprite)}; updateSlingPet()`);
    const src = f.run("slingPet.src");
    assert.ok(fs.existsSync(path.resolve(__dirname, "../src/renderer/tray", src)),
      `${sprite.prefix}: missing ${src}`);
    assert.ok(src.includes(sprite.prefix));
  }
  assert.equal(sprites.length, 21);
});

test("펫 스킨 변경 이벤트의 캐릭터를 슬링샷에 즉시 반영한다", () => {
  const f = fixture();
  for (const sprite of [
    { level: "level2", prefix: "pegmatite_i" },
    { level: "level3", prefix: "moonstone" },
    { level: "level0", prefix: "rockie" },
  ]) {
    f.emitSprite(sprite);
    assert.equal(f.run("slingPetPrefix"), sprite.prefix);
    assert.equal(f.run("slingPet.src"), `../../../assets/gif/${sprite.level}/${sprite.prefix}_smile.gif`);
  }
});

test("던전은 연속 클릭으로 층을 건너뛰지 않고 귀환 때 한 번만 지급한다", async () => {
  const f = fixture();
  f.run(`dungeonState.cards = [{ type: "monster", damage: 1, loot: 210, heal: 0 }]; selectDungeonCard(0); selectDungeonCard(0);`);
  assert.equal(f.run("dungeonState.floor"), 2);
  assert.equal(f.run("dungeonState.health"), 9);
  assert.equal(f.economy.getState().shards, 0);
  f.run("MiniGameRules.retreatDungeon(dungeonState)");
  await f.run("saveDungeonReward()");
  await f.run("saveDungeonReward()");
  assert.equal(f.economy.getState().shards, 2);
  assert.equal(f.reports(), 1);
});

test("던전 저장 실패는 판을 보존하고 재시도 뒤에만 새 탐험을 허용한다", async () => {
  const f = fixture();
  f.failSave(true);
  f.run("dungeonState.treasure = 230; MiniGameRules.retreatDungeon(dungeonState)");
  await f.run("saveDungeonReward()");
  f.run("restartDungeon()");
  assert.equal(f.run("dungeonState.treasure"), 230);
  assert.equal(f.economy.getState().shards, 0);
  assert.equal(f.run("dungeonSaveError"), true);
  f.failSave(false);
  await f.run("saveDungeonReward()");
  assert.equal(f.economy.getState().shards, 2);
  f.run("restartDungeon()");
  assert.equal(f.run("dungeonState.treasure"), 0);
});

test("슬링샷은 코스 재도전에 중복 지급하지 않고 다음 코스 보상을 누적한다", async () => {
  const f = fixture();
  f.run("slingCompleted.set(0, 3)");
  await f.run("saveSlingReward()");
  f.run("loadSlingCourse(0); slingCompleted.set(0, 3)");
  await f.run("saveSlingReward()");
  assert.equal(f.economy.getState().shards, 1);
  assert.equal(f.reports(), 1);
  f.run("slingCompleted.set(1, 2)");
  await f.run("saveSlingReward()");
  assert.equal(f.economy.getState().shards, 2);
});

test("슬링샷은 8코스 이후에도 진행하고 12코스 보상을 저장한 뒤 새 판을 시작한다", async () => {
  const f = fixture();
  const total = f.run("MiniGameRules.SLING_COURSES.length");
  for (let index = 0; index < total; index++) {
    assert.equal(f.run("slingBall.index"), index);
    f.run("slingBall.holed = true; slingCompleted.set(slingBall.index, 3)");
    await f.run("saveSlingReward()");
    assert.equal(f.economy.getState().shards, index + 1);
    assert.equal(f.element("sling-next").textContent, index === total - 1 ? "sling.finish" : "sling.next");
    f.element("sling-next").listeners.click();
  }
  assert.equal(f.run("slingBall.index"), 0);
  assert.equal(f.run("slingCompleted.size"), 0);
  assert.equal(f.run("slingPaid"), 0);
  assert.equal(f.run("slingRoundId"), null);
  f.run("slingBall.holed = true; slingCompleted.set(0, 3)");
  await f.run("saveSlingReward()");
  assert.equal(f.economy.getState().shards, total + 1);
});

test("슬링샷 보상 저장 실패 후 재시도해도 조각은 한 번만 지급된다", async () => {
  const f = fixture();
  f.failSave(true);
  f.run("slingCompleted.set(0, 3)");
  await f.run("saveSlingReward()");
  assert.equal(f.run("slingSaveError"), true);
  assert.equal(f.element("sling-next").disabled, true);
  f.failSave(false);
  await f.run("saveSlingReward()");
  await f.run("saveSlingReward()");
  assert.equal(f.economy.getState().shards, 1);
  assert.equal(f.element("sling-next").disabled, false);
});

test("슬링샷 숨김은 루프와 조준을 취소하며 재개 때 위치와 수동 일시정지를 유지한다", () => {
  const f = fixture();
  f.run("resumeSlingshot(); slingBall.x = 90; slingAim = { x: 70, y: 250 }; pauseSlingshot()");
  assert.equal(f.frames.size, 0);
  assert.equal(f.run("slingAim"), null);
  f.run("popupVisible = false; resumeSlingshot()");
  assert.equal(f.frames.size, 0);
  f.run("popupVisible = true; resumeSlingshot(); resumeSlingshot()");
  assert.equal(f.frames.size, 1);
  assert.equal(f.run("slingBall.x"), 90);
  f.run("setSlingPaused(true); resumeSlingshot()");
  assert.equal(f.frames.size, 0);
  assert.equal(f.run("slingManualPause"), true);
});

test("슬링샷 좌표는 테두리와 배율을 제외한 게임판 좌표이며 키보드로도 발사된다", () => {
  const f = fixture();
  const point = f.run("slingPoint({ clientX: 173, clientY: 223 })");
  assert.equal(point.x, 160);
  assert.equal(point.y, 200);
  f.element("sling-board").listeners.keydown({ key: " ", preventDefault() {} });
  assert.equal(f.run("slingBall.shots"), 1);
  assert.ok(f.run("slingBall.vy") < 0);
  f.run("drawSlingshot()");
  assert.equal(f.element("sling-board").width, 640);
  assert.equal(f.element("sling-board").height, 720);
});
