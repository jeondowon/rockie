const { randomUUID } = require("crypto");

const POINTS_PER_SHARD = 250;
const CATALOG = [
  { id: "star-halo", kind: "decoration", price: 12 },
  { id: "flower-ring", kind: "decoration", price: 16 },
  { id: "leaf-sprout", kind: "decoration", price: 10 },
  { id: "red-ribbon", kind: "decoration", price: 14 },
  { id: "tiny-crown", kind: "decoration", price: 24 },
  { id: "wizard-hat", kind: "decoration", price: 28 },
  { id: "bunny-ears", kind: "decoration", price: 22 },
  { id: "bear-ears", kind: "decoration", price: 20 },
  { id: "party-hat", kind: "decoration", price: 18 },
  { id: "straw-hat", kind: "decoration", price: 20 },
  { id: "heart-pin", kind: "decoration", price: 14 },
  { id: "lucky-clover", kind: "decoration", price: 18 },
  { id: "forest", kind: "theme", price: 8 },
  { id: "sunset", kind: "theme", price: 8 },
];

// 게임 판은 메모리에만 둔다. 새 판/앱 재실행에는 잔여 점수가 이월되지 않는다.
function createEconomy(store) {
  let round = null;

  function getState() {
    return {
      ...store.get().economy,
      catalog: CATALOG,
      pointsPerShard: POINTS_PER_SHARD,
    };
  }

  function commit(next) {
    const previous = store.get().economy;
    store.get().economy = next;
    try {
      store.save();
    } catch (error) {
      store.get().economy = previous;
      throw error;
    }
    return getState();
  }

  function startRound() {
    round = { id: randomUUID(), paid: 0 };
    return round.id;
  }

  function reportScore(id, score) {
    if (!round || round.id !== id || !Number.isSafeInteger(score) || score < 0)
      throw new Error("invalid-score");
    const earned = Math.floor(score / POINTS_PER_SHARD);
    const delta = earned - round.paid;
    if (delta <= 0) return getState();
    const current = store.get().economy;
    if (!Number.isSafeInteger(current.shards + delta))
      throw new Error("invalid-score");
    const state = commit({ ...current, shards: current.shards + delta });
    round.paid = earned;
    return state;
  }

  function buy(id) {
    const item = CATALOG.find((entry) => entry.id === id);
    const current = store.get().economy;
    if (!item) return { error: "unknown-item" };
    if (current.owned.includes(id)) return { error: "owned" };
    if (current.shards < item.price) return { error: "insufficient" };
    return {
      state: commit({
        ...current,
        shards: current.shards - item.price,
        owned: [...current.owned, id],
      }),
    };
  }

  function equip(kind, id) {
    const current = store.get().economy;
    if (kind === "theme") return { error: "unavailable" };
    if (kind !== "decoration") return { error: "unknown-item" };
    if (
      id !== null &&
      (!current.owned.includes(id) ||
        !CATALOG.some((item) => item.id === id && item.kind === kind))
    )
      return { error: "not-owned" };
    return { state: commit({ ...current, [kind]: id }) };
  }

  return { getState, startRound, reportScore, buy, equip };
}

module.exports = { createEconomy, CATALOG, POINTS_PER_SHARD };
