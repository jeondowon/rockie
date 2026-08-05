const test = require("node:test");
const assert = require("node:assert");
const fs = require("fs");
const fsp = require("fs/promises");
const os = require("os");
const path = require("path");

const { CodexUsageCache } = require("../src/main/codex-usage-cache");

function tokenLine(at, input, output, usedPercent = null) {
  const payload = {
    type: "token_count",
    info: { last_token_usage: { input_tokens: input, output_tokens: output } },
  };
  if (usedPercent != null) {
    payload.rate_limits = {
      plan_type: "pro",
      primary: {
        used_percent: usedPercent,
        window_minutes: 10080,
        resets_at: 1786453200,
      },
    };
  }
  return JSON.stringify({
    type: "event_msg",
    timestamp: new Date(at).toISOString(),
    payload,
  });
}

async function makeDir() {
  const dir = await fsp.mkdtemp(path.join(os.tmpdir(), "codex-usage-"));
  return dir;
}

const now = Date.now();

test("오늘 토큰만 합산하고 최신 rate_limit 스냅샷을 쓴다", async () => {
  const dir = await makeDir();
  const file = path.join(dir, "s", "a.jsonl");
  await fsp.mkdir(path.dirname(file), { recursive: true });
  const yesterday = now - 26 * 60 * 60 * 1000;
  fs.writeFileSync(
    file,
    [
      tokenLine(yesterday, 999, 999, 5), // 어제 것 → 합계 제외
      tokenLine(now, 100, 20, 11),
      tokenLine(now, 50, 5, 12), // 마지막 이벤트의 스냅샷이 쓰여야 한다
      "",
    ].join("\n"),
  );

  const cache = new CodexUsageCache(dir);
  const usage = await cache.reload({ keepPreviousOnFailure: false });

  assert.equal(usage.input, 150);
  assert.equal(usage.output, 25);
  assert.equal(usage.limit.usedPercent, 12);
  assert.equal(usage.limit.planType, "pro");
});

test("append된 줄만 증분으로 읽어도 전체 재독과 결과가 같다", async () => {
  const dir = await makeDir();
  const file = path.join(dir, "a.jsonl");
  fs.writeFileSync(file, tokenLine(now, 100, 20, 11) + "\n");

  const incremental = new CodexUsageCache(dir);
  await incremental.reload({ keepPreviousOnFailure: false });
  const offsetAfterFirst = incremental.fileCache.get(file).offset;

  fs.appendFileSync(file, tokenLine(now, 7, 3, 13) + "\n");
  const usage = await incremental.reload();

  // 앞부분을 다시 읽지 않았는지: offset이 첫 스캔 지점부터 전진했을 뿐인지 확인
  assert.ok(offsetAfterFirst > 0);
  assert.equal(incremental.fileCache.get(file).offset, fs.statSync(file).size);

  const fresh = new CodexUsageCache(dir);
  const full = await fresh.reload({ keepPreviousOnFailure: false });
  assert.deepEqual(usage, full);
  assert.equal(usage.input, 107);
  assert.equal(usage.limit.usedPercent, 13);
});

test("끊긴 마지막 줄은 다음 갱신까지 미룬다", async () => {
  const dir = await makeDir();
  const file = path.join(dir, "a.jsonl");
  const line = tokenLine(now, 100, 20, 11);
  fs.writeFileSync(file, line + "\n" + line.slice(0, 30)); // 줄 중간에서 끊김

  const cache = new CodexUsageCache(dir);
  let usage = await cache.reload({ keepPreviousOnFailure: false });
  assert.equal(usage.input, 100); // 깨진 줄은 아직 세지 않는다

  fs.writeFileSync(file, line + "\n" + line + "\n"); // 나머지가 마저 쓰임
  usage = await cache.reload();
  assert.equal(usage.input, 200); // 중복 없이 정확히 한 번만 더 세진다
});

test("파일이 잘리거나 교체되면 처음부터 다시 읽는다", async () => {
  const dir = await makeDir();
  const file = path.join(dir, "a.jsonl");
  fs.writeFileSync(
    file,
    [tokenLine(now, 100, 20, 11), tokenLine(now, 100, 20, 11), ""].join("\n"),
  );

  const cache = new CodexUsageCache(dir);
  assert.equal((await cache.reload({ keepPreviousOnFailure: false })).input, 200);

  fs.writeFileSync(file, tokenLine(now, 5, 1, 9) + "\n"); // 더 작은 내용으로 교체
  const usage = await cache.reload();
  assert.equal(usage.input, 5);
  assert.equal(usage.limit.usedPercent, 9);
});

test("이벤트 원본을 메모리에 쌓아두지 않는다", async () => {
  const dir = await makeDir();
  const file = path.join(dir, "a.jsonl");
  const lines = [];
  for (let i = 0; i < 500; i++) lines.push(tokenLine(now, 1, 1, 20));
  fs.writeFileSync(file, lines.join("\n") + "\n");

  const cache = new CodexUsageCache(dir);
  const usage = await cache.reload({ keepPreviousOnFailure: false });
  assert.equal(usage.input, 500);

  const entry = cache.fileCache.get(file);
  assert.equal(entry.events, undefined); // 이벤트 배열 자체가 없어야 한다
  assert.equal(entry.last.limit.usedPercent, 20); // 남는 건 최신 스냅샷 1개뿐
});

test("오늘 쓰지 않은 파일은 캐시에 남기지 않는다", async () => {
  const dir = await makeDir();
  const old = path.join(dir, "old.jsonl");
  const today = path.join(dir, "today.jsonl");
  fs.writeFileSync(old, tokenLine(now - 26 * 60 * 60 * 1000, 999, 999, 5) + "\n");
  fs.writeFileSync(today, tokenLine(now, 10, 2, 15) + "\n");
  const oldTime = new Date(now - 26 * 60 * 60 * 1000);
  fs.utimesSync(old, oldTime, oldTime);

  const cache = new CodexUsageCache(dir);
  const usage = await cache.reload({ keepPreviousOnFailure: false });

  assert.equal(usage.input, 10);
  assert.ok(!cache.fileCache.has(old));
  assert.ok(cache.fileCache.has(today));
});

test("날짜가 바뀌면 어제 누계를 버린다", async () => {
  const dir = await makeDir();
  const file = path.join(dir, "a.jsonl");
  fs.writeFileSync(file, tokenLine(now, 100, 20, 11) + "\n");

  const cache = new CodexUsageCache(dir);
  await cache.reload({ keepPreviousOnFailure: false });
  assert.equal(cache.snapshot.input, 100);

  // 다음 날이 된 상황: 같은 파일이지만 오늘 이벤트가 아니게 된다
  const usage = await cache.readUsage(now + 60 * 60 * 1000);
  assert.equal(usage.input, 0);
  assert.equal(usage.limit.usedPercent, 11); // 한도 스냅샷은 계속 보여준다
});
