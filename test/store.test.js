const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("path");
const fs = require("fs");
const os = require("os");
const Module = require("module");

// store.js는 electron의 app.getPath("userData")로 저장 경로를 정한다.
// 테스트에서는 임시 디렉터리를 쓰도록 electron 모듈을 가로챈다.
const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), "rockie-store-test-"));
const originalResolve = Module._resolveFilename;
Module._resolveFilename = function (request, ...rest) {
  if (request === "electron") return "electron-stub";
  return originalResolve.call(this, request, ...rest);
};
require.cache["electron-stub"] = {
  id: "electron-stub",
  filename: "electron-stub",
  loaded: true,
  exports: { app: { getPath: () => userDataDir } },
};

const store = require("../src/main/store");
const FILE = path.join(userDataDir, "petdata.json");

function writeSaved(onboarding) {
  fs.writeFileSync(
    FILE,
    JSON.stringify({
      onboarding,
      questions: {
        answeredQuestions: [
          {
            questionId: "onboarding_1",
            category: null,
            selectedOption: "a",
            answeredAt: "2026-08-07T00:00:00.000Z",
          },
        ],
      },
    }),
  );
}

// 온보딩 마지막 권한 화면에서 앱이 스스로 재시작하는 경로가 생기면서 load()가
// 두 번 이상 돌게 됐다. 온보딩 질문 답변도 answeredQuestions에 쌓이므로,
// 기존 사용자 마이그레이션 가드가 진행 중인 온보딩을 완료 처리해 버리면
// 재시작 후 권한 화면 대신 메뉴로 튄다.
test("진행 중인 온보딩은 재시작해도 완료 처리되지 않는다", () => {
  writeSaved({ completed: false, step: 13, completedAt: null });
  store.load();
  assert.equal(store.get().onboarding.completed, false);
  assert.equal(store.get().onboarding.step, 13);
});

// 온보딩이 생기기 전부터 키우던 사용자는 step이 0이다. 이 경우는 기존대로
// 완료 처리해서 온보딩을 건너뛰어야 한다.
test("온보딩을 시작한 적 없는 기존 사용자는 완료 처리된다", () => {
  writeSaved({ completed: false, step: 0, completedAt: null });
  store.load();
  assert.equal(store.get().onboarding.completed, true);
});

// 자동 실행 설정은 시작할 때 OS 상태를 읽어 저장값을 맞춘다(사용자가 시스템 설정이나
// Dock 우클릭에서 끈 걸 되돌리지 않도록). 단 저장값이 방금 만들어진 기본값이면
// 그때는 저장값을 OS에 써야 하므로, 그 구분이 isFreshData()로 드러나야 한다.
test("저장 파일이 없으면 isFreshData가 참이다", () => {
  fs.rmSync(FILE, { force: true });
  store.load();
  assert.equal(store.isFreshData(), true);
});

test("기존 저장 파일을 읽으면 isFreshData가 거짓이다", () => {
  writeSaved({ completed: true, step: 999, completedAt: null });
  store.load();
  assert.equal(store.isFreshData(), false);
});

test("초기화하면 isFreshData가 다시 참이 된다", () => {
  writeSaved({ completed: true, step: 999, completedAt: null });
  store.load();
  store.reset();
  assert.equal(store.isFreshData(), true);
});
