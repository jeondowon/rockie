const test = require("node:test");
const assert = require("node:assert/strict");
const { createEconomy } = require("../src/main/economy");

function fixture(shards = 0) {
  const data = {
    economy: { shards, owned: [], decoration: null, theme: null },
  };
  let saves = 0;
  const store = {
    get: () => data,
    save: () => {
      saves++;
    },
  };
  return { economy: createEconomy(store), data, store, saves: () => saves };
}

test("250점 경계에서 즉시 지급하고 중복/역순 보고에는 다시 지급하지 않는다", () => {
  const { economy, saves } = fixture();
  const id = economy.startRound();
  assert.equal(economy.reportScore(id, 249).shards, 0);
  assert.equal(economy.reportScore(id, 250).shards, 1);
  assert.equal(economy.reportScore(id, 600).shards, 2);
  assert.equal(economy.reportScore(id, 600).shards, 2);
  assert.equal(economy.reportScore(id, 250).shards, 2);
  assert.equal(saves(), 2);
});

test("새 판에는 잔여 점수를 버리고 이전 판 요청을 거부한다", () => {
  const { economy } = fixture();
  const old = economy.startRound();
  economy.reportScore(old, 600);
  const next = economy.startRound();
  assert.equal(economy.reportScore(next, 150).shards, 2);
  assert.equal(economy.reportScore(next, 250).shards, 3);
  assert.throws(() => economy.reportScore(old, 1000), /invalid-score/);
});

test("잘못된 점수는 잔액에 반영하지 않는다", () => {
  const { economy } = fixture();
  const id = economy.startRound();
  for (const score of [
    -250,
    1.5,
    "500",
    NaN,
    Infinity,
    Number.MAX_SAFE_INTEGER + 1,
  ])
    assert.throws(() => economy.reportScore(id, score), /invalid-score/);
  assert.equal(economy.getState().shards, 0);
});

test("구매는 가격만큼 차감하며 연속 구매/잔액 부족/미등록 상품을 막는다", () => {
  const { economy, saves } = fixture(20);
  assert.equal(economy.buy("star-halo").state.shards, 8);
  assert.equal(economy.buy("star-halo").error, "owned");
  assert.equal(economy.buy("flower-ring").error, "insufficient");
  assert.equal(economy.buy("missing").error, "unknown-item");
  assert.equal(economy.buy("forest").state.shards, 0);
  assert.deepEqual(economy.getState().owned, ["star-halo", "forest"]);
  assert.equal(saves(), 2);
});

test("보유한 장식만 장착·해제할 수 있다", () => {
  const { economy } = fixture(20);
  assert.equal(economy.equip("decoration", "star-halo").error, "not-owned");
  economy.buy("star-halo");
  economy.buy("forest");
  assert.equal(
    economy.equip("decoration", "star-halo").state.decoration,
    "star-halo",
  );
  assert.equal(economy.equip("decoration", "forest").error, "not-owned");
  assert.equal(economy.equip("shards", null).error, "unknown-item");
  assert.equal(economy.equip("decoration", null).state.decoration, null);
});

test("테마는 보유해도 적용할 수 없으며 구매 기록을 보존한다", () => {
  const { economy, saves } = fixture(8);
  economy.buy("forest");
  assert.equal(economy.equip("theme", "forest").error, "unavailable");
  assert.equal(economy.getState().theme, null);
  assert.deepEqual(economy.getState().owned, ["forest"]);
  assert.equal(saves(), 1);
});

test("저장 실패 시 재화를 되돌리고 같은 보상/구매를 재시도할 수 있다", () => {
  const { economy, store } = fixture(12);
  const save = store.save;
  store.save = () => {
    throw new Error("disk-full");
  };
  const id = economy.startRound();
  assert.throws(() => economy.reportScore(id, 500), /disk-full/);
  assert.equal(economy.getState().shards, 12);
  assert.throws(() => economy.buy("star-halo"), /disk-full/);
  assert.deepEqual(economy.getState().owned, []);
  store.save = save;
  assert.equal(economy.reportScore(id, 500).shards, 14);
  assert.equal(economy.buy("star-halo").state.shards, 2);
});
