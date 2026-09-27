const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { CATALOG } = require("../src/main/economy");

const root = path.join(__dirname, "..");
function fixture() {
  const context = vm.createContext({});
  vm.runInContext(
    fs.readFileSync(path.join(root, "src/renderer/shared/attachments.js"), "utf8"),
    context,
  );
  return vm.runInContext(
    "({ characters: CHARACTER_ATTACHMENTS, items: ITEM_ATTACHMENTS, overrides: CHARACTER_ITEM_ATTACHMENTS, attachmentAnchor, attachmentLayout })",
    context,
  );
}

function close(actual, expected) {
  assert.ok(Math.abs(actual - expected) < 1e-9, `${actual} ≠ ${expected}`);
}

test("모든 캐릭터와 판매 장식에 기준점이 있고 실제 SVG가 연결된다", () => {
  const { characters, items } = fixture();
  const sprites = fs.readdirSync(path.join(root, "assets/gif"))
    .filter((level) => level.startsWith("level"))
    .flatMap((level) => fs.readdirSync(path.join(root, "assets/gif", level)))
    .filter((name) => name.endsWith("_smile.gif"))
    .map((name) => name.slice(0, -10));
  assert.deepEqual(Object.keys(characters).sort(), sprites.sort());
  assert.deepEqual(Object.keys(items).sort(), CATALOG
    .filter((item) => item.kind === "decoration").map((item) => item.id).sort());
  for (const [id, item] of Object.entries(items)) {
    assert.ok(fs.existsSync(path.join(root, "assets/decorations", `${id}.svg`)));
    assert.ok(item.width > 0 && item.scale > 0);
    for (const character of Object.values(characters)) {
      const anchor = character[item.slot];
      assert.ok(anchor && Number.isFinite(anchor.x) && Number.isFinite(anchor.y));
      assert.ok(anchor.width > 0);
    }
  }
});

test("어떤 캐릭터·장식·표시 크기에서도 붙는 지점과 상대 너비가 유지된다", () => {
  const { characters, items, attachmentAnchor, attachmentLayout } = fixture();
  for (const prefix of Object.keys(characters)) {
    for (const [id, item] of Object.entries(items)) {
      for (const size of [80, 96, 128, 176]) {
        const result = attachmentLayout(prefix, id, size);
        const anchor = attachmentAnchor(prefix, id);
        close(result.left + item.x / 320 * result.size, anchor.x / 320 * size);
        close(result.top + item.y / 320 * result.size, anchor.y / 320 * size);
        close(item.width / 320 * result.size, anchor.width * item.scale / 320 * size);
      }
    }
  }
});

test("같은 모자는 이미지 캔버스 크기가 같아도 넓은 머리에서 더 커진다", () => {
  const { characters, attachmentLayout } = fixture();
  characters.topaz.head.width = 100;
  characters.ruby.head.width = 160;
  const narrow = attachmentLayout("topaz", "tiny-crown", 128);
  const wide = attachmentLayout("ruby", "tiny-crown", 128);
  close(wide.size / narrow.size, 160 / 100);
});

test("머리 너비 튜닝은 머리 장식을 함께 조정하고 옆 장식에는 영향을 주지 않는다", () => {
  const { characters, attachmentLayout } = fixture();
  const crown = attachmentLayout("rockie", "tiny-crown", 128);
  const hat = attachmentLayout("rockie", "straw-hat", 128);
  const pin = attachmentLayout("rockie", "heart-pin", 128);
  characters.rockie.head.width *= 1.5;
  close(attachmentLayout("rockie", "tiny-crown", 128).size, crown.size * 1.5);
  close(attachmentLayout("rockie", "straw-hat", 128).size, hat.size * 1.5);
  assert.deepEqual(attachmentLayout("rockie", "heart-pin", 128), pin);
});

test("조약돌 새싹의 위치 조정은 다른 캐릭터·아이템과 크기에 영향을 주지 않는다", () => {
  const { characters, items, overrides, attachmentAnchor, attachmentLayout } = fixture();
  const before = [];
  for (const prefix of Object.keys(characters)) {
    for (const id of Object.keys(items)) {
      for (const size of [96, 128, 176]) {
        before.push({ prefix, id, size, layout: attachmentLayout(prefix, id, size) });
      }
    }
  }
  const head = { ...characters.rockie.head };
  const sprout = attachmentAnchor("rockie", "leaf-sprout");
  assert.equal(sprout, overrides.rockie["leaf-sprout"]);
  sprout.x += 7;
  sprout.y -= 12;
  for (const { prefix, id, size, layout } of before) {
    const actual = attachmentLayout(prefix, id, size);
    if (prefix === "rockie" && id === "leaf-sprout") {
      close(actual.left, layout.left + 7 * size / 320);
      close(actual.top, layout.top - 12 * size / 320);
      close(actual.size, layout.size);
    } else {
      assert.deepEqual(actual, layout);
    }
  }
  assert.deepEqual({ ...characters.rockie.head }, head);
});

test("알 수 없는 캐릭터는 기본 기준점을 사용하고 장식이 아니면 배치하지 않는다", () => {
  const { attachmentLayout } = fixture();
  assert.deepEqual(attachmentLayout("unknown", "tiny-crown", 128),
    attachmentLayout("rockie", "tiny-crown", 128));
  assert.equal(attachmentLayout("rockie", "forest", 128), null);
  assert.equal(attachmentLayout("rockie", null, 128), null);
});
