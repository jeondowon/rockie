const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

// 앱·권한 요청·사용자 저장 파일을 열지 않고 실제 IPC 핸들러를 실행한다.
function fixture() {
  const handlers = new Map();
  const events = [];
  const data = {
    settings: {},
    affinity: { affinityPoints: 87, dailyCleanDone: false, dailyPetDone: false },
    pet: { evolutionStage: 2, stoneType: "granite", evolutionVariant: "extrovert" },
    user: {},
    onboarding: { completed: true },
    questions: { answeredQuestions: [], todaysQuestions: [] },
  };
  const store = {
    get: () => data,
    save: () => events.push(["save"]),
  };
  const window = {
    isDestroyed: () => false,
    webContents: { send: (...args) => events.push(args) },
  };
  const context = vm.createContext({
    __dirname: path.join(__dirname, "../src/main"),
    console,
    process: { env: {}, on() {} },
    require(name) {
      if (name === "electron") {
        return {
          app: {
            on() {},
            whenReady: () => ({ then() {} }),
            requestSingleInstanceLock: () => true,
          },
          ipcMain: {
            handle: (channel, handler) => handlers.set(channel, handler),
            on: (channel, handler) => handlers.set(channel, handler),
          },
        };
      }
      if (name === "./store") return store;
      if ([
        "./dock-tracker", "./system-stats", "./ai-usage",
        "./tray-icon", "./updater", "./keyblocker",
      ].includes(name)) return {};
      return name.startsWith("./")
        ? require(`../src/main/${name.slice(2)}`)
        : require(name);
    },
    testWindow: window,
  });
  vm.runInContext(
    fs.readFileSync(path.join(__dirname, "../src/main/main.js"), "utf8"),
    context,
  );
  vm.runInContext("mainWindow = testWindow", context);
  return {
    data, events, store,
    call: (channel, ...args) => handlers.get(channel)({}, ...args),
  };
}

test("돌보기 IPC는 저장 후 해당 반응과 진화를 알리고 하루 보상을 중복 지급하지 않는다", () => {
  for (const [channel, reaction, flag] of [
    ["evolution:clean", "pet:show-smile", "dailyCleanDone"],
    ["evolution:pet", "pet:show-heart", "dailyPetDone"],
  ]) {
    const f = fixture();
    const result = f.call(channel);
    assert.equal(result.evolved, 3);
    assert.equal(result.state.affinityPoints, 90);
    assert.equal(f.data.affinity[flag], true);
    assert.deepEqual(f.events.map(([name]) => name), [
      "save", reaction, "evolution:evolved",
    ]);
    assert.equal(f.events[2][1].pendingEvolution.to.stage, 3);

    f.events.length = 0;
    assert.equal(f.call(channel).evolved, null);
    assert.equal(f.data.affinity.affinityPoints, 90);
    assert.deepEqual(f.events.map(([name]) => name), ["save", reaction]);
  }
});

test("돌보기 저장 실패 시 반응과 진화 알림을 보내지 않는다", () => {
  for (const channel of ["evolution:clean", "evolution:pet"]) {
    const f = fixture();
    f.store.save = () => {
      throw new Error("disk-full");
    };
    assert.throws(() => f.call(channel), /disk-full/);
    assert.deepEqual(f.events, []);
  }
});

test("펫 설정 IPC는 기존 값 변환 규칙과 전달·저장 순서를 유지한다", () => {
  for (const [key, input, expected, sentKey] of [
    ["soundEnabled", false, false, "sound"],
    ["petPlacement", "bottom-left", "bottom-left", "placement"],
    ["petSize", "large", "large", "size"],
    ["bubbleApp", 0, false, "bubbleApp"],
    ["bubbleAuto", 1, true, "bubbleAuto"],
    ["bubbleClick", false, false, "bubbleClick"],
    ["focusMinutes", 0, 25, "focusMinutes"],
    ["napMinutes", "bad", 20, "napMinutes"],
    ["focusMinutes", 200, 120, "focusMinutes"],
    ["napMinutes", -5, 1, "napMinutes"],
  ]) {
    const f = fixture();
    f.call("settings:set", { key, value: input });
    assert.equal(f.data.settings[key], expected);
    assert.equal(f.events[0][1][sentKey], expected);
    assert.deepEqual(f.events.map(([name]) => name), ["pet-settings", "save"]);
  }
  const f = fixture();
  f.call("settings:set", { key: "unknown", value: true });
  assert.deepEqual(f.data.settings, {});
  assert.deepEqual(f.events, []);
});
