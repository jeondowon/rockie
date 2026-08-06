const test = require("node:test");
const assert = require("node:assert");
const fs = require("fs");
const fsp = require("fs/promises");
const os = require("os");
const path = require("path");

const { CodexUsageCache } = require("../src/main/codex-usage-cache");

const RESETS_AT = 1786453200;

// 한도 스냅샷이 실린 token_count 이벤트 한 줄.
// 2026-07-14 이후 형식: primary가 주간이고 secondary는 없다.
function limitLine(usedPercent, resetsAt = RESETS_AT) {
  return rateLimitLine({
    primary: {
      used_percent: usedPercent,
      window_minutes: 10080,
      resets_at: resetsAt,
    },
    secondary: null,
  });
}

function rateLimitLine(rateLimits) {
  return JSON.stringify({
    type: "event_msg",
    timestamp: new Date().toISOString(),
    payload: {
      type: "token_count",
      info: { last_token_usage: { input_tokens: 100, output_tokens: 20 } },
      rate_limits: rateLimits,
    },
  });
}

// 한도 정보가 없는 token_count 이벤트 (Codex는 이런 줄도 남긴다)
function plainLine() {
  return JSON.stringify({
    type: "event_msg",
    timestamp: new Date().toISOString(),
    payload: {
      type: "token_count",
      info: { last_token_usage: { input_tokens: 5, output_tokens: 1 } },
    },
  });
}

async function makeDir() {
  return fsp.mkdtemp(path.join(os.tmpdir(), "codex-usage-"));
}

test("가장 최근 세션 로그의 마지막 한도 스냅샷을 쓴다", async () => {
  const dir = await makeDir();
  const file = path.join(dir, "s", "a.jsonl");
  await fsp.mkdir(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, [limitLine(11), limitLine(12), ""].join("\n"));

  const cache = new CodexUsageCache(dir);
  const usage = await cache.reload({ keepPreviousOnFailure: false });

  assert.equal(usage.limit.weekly.usedPercent, 12); // 마지막 줄의 값
  assert.equal(usage.limit.weekly.resetsAt, RESETS_AT);
});

test("append된 줄만 증분으로 읽어도 전체 재독과 결과가 같다", async () => {
  const dir = await makeDir();
  const file = path.join(dir, "a.jsonl");
  fs.writeFileSync(file, limitLine(11) + "\n");

  const incremental = new CodexUsageCache(dir);
  await incremental.reload({ keepPreviousOnFailure: false });
  const offsetAfterFirst = incremental.file.offset;

  fs.appendFileSync(file, limitLine(13) + "\n");
  const usage = await incremental.reload();

  // 앞부분을 다시 읽지 않았는지: offset이 첫 스캔 지점부터 전진했을 뿐인지 확인
  assert.ok(offsetAfterFirst > 0);
  assert.equal(incremental.file.offset, fs.statSync(file).size);

  const fresh = new CodexUsageCache(dir);
  const full = await fresh.reload({ keepPreviousOnFailure: false });
  assert.deepEqual(usage, full);
  assert.equal(usage.limit.weekly.usedPercent, 13);
});

test("끊긴 마지막 줄은 다음 갱신까지 미룬다", async () => {
  const dir = await makeDir();
  const file = path.join(dir, "a.jsonl");
  const line = limitLine(11);
  fs.writeFileSync(file, line + "\n" + limitLine(13).slice(0, 30)); // 줄 중간에서 끊김

  const cache = new CodexUsageCache(dir);
  let usage = await cache.reload({ keepPreviousOnFailure: false });
  assert.equal(usage.limit.weekly.usedPercent, 11); // 깨진 줄은 아직 읽지 않는다

  fs.writeFileSync(file, line + "\n" + limitLine(13) + "\n"); // 나머지가 마저 쓰임
  usage = await cache.reload();
  assert.equal(usage.limit.weekly.usedPercent, 13);
});

test("파일이 잘리거나 교체되면 처음부터 다시 읽는다", async () => {
  const dir = await makeDir();
  const file = path.join(dir, "a.jsonl");
  fs.writeFileSync(file, [limitLine(11), limitLine(12), ""].join("\n"));

  const cache = new CodexUsageCache(dir);
  assert.equal(
    (await cache.reload({ keepPreviousOnFailure: false })).limit.weekly
      .usedPercent,
    12,
  );

  fs.writeFileSync(file, limitLine(9) + "\n"); // 더 작은 내용으로 교체
  const usage = await cache.reload();
  assert.equal(usage.limit.weekly.usedPercent, 9);
});

test("이벤트 원본을 메모리에 쌓아두지 않는다", async () => {
  const dir = await makeDir();
  const file = path.join(dir, "a.jsonl");
  const lines = [];
  for (let i = 0; i < 500; i++) lines.push(limitLine(20));
  fs.writeFileSync(file, lines.join("\n") + "\n");

  const cache = new CodexUsageCache(dir);
  const usage = await cache.reload({ keepPreviousOnFailure: false });
  assert.equal(usage.limit.weekly.usedPercent, 20);

  assert.equal(cache.file.events, undefined); // 이벤트 배열 자체가 없어야 한다
  assert.equal(cache.file.limit.weekly.usedPercent, 20); // 남는 건 최신 스냅샷 1개뿐
});

test("새 세션 파일이 생기면 그쪽 스냅샷으로 갈아탄다", async () => {
  const dir = await makeDir();
  const older = path.join(dir, "older.jsonl");
  const newer = path.join(dir, "newer.jsonl");
  fs.writeFileSync(older, limitLine(11) + "\n");

  const cache = new CodexUsageCache(dir);
  assert.equal(
    (await cache.reload({ keepPreviousOnFailure: false })).limit.weekly
      .usedPercent,
    11,
  );

  fs.writeFileSync(newer, limitLine(42) + "\n");
  const future = new Date(Date.now() + 60 * 1000); // 확실히 더 최신으로 표시
  fs.utimesSync(newer, future, future);

  const usage = await cache.reload();
  assert.equal(usage.limit.weekly.usedPercent, 42);
  assert.equal(cache.file.path, newer); // 추적 대상이 새 파일로 옮겨간다
});

test("한도 정보 없는 이벤트가 마지막이어도 직전 스냅샷을 유지한다", async () => {
  const dir = await makeDir();
  const file = path.join(dir, "a.jsonl");
  fs.writeFileSync(file, [limitLine(37), plainLine(), ""].join("\n"));

  const cache = new CodexUsageCache(dir);
  const usage = await cache.reload({ keepPreviousOnFailure: false });

  assert.equal(usage.limit.weekly.usedPercent, 37);
});

// 2026-07-13 이전 형식: primary가 5시간이고 secondary가 주간이었다.
// 자리로 판별하면 5시간 값을 주간으로 잘못 읽는다.
test("창은 자리가 아니라 window_minutes로 가른다", async () => {
  const dir = await makeDir();
  const file = path.join(dir, "a.jsonl");
  fs.writeFileSync(
    file,
    rateLimitLine({
      primary: { used_percent: 97, window_minutes: 300, resets_at: RESETS_AT },
      secondary: {
        used_percent: 15,
        window_minutes: 10080,
        resets_at: RESETS_AT + 1000,
      },
    }) + "\n",
  );

  const cache = new CodexUsageCache(dir);
  const { limit } = await cache.reload({ keepPreviousOnFailure: false });

  assert.equal(limit.fiveHour.usedPercent, 97);
  assert.equal(limit.fiveHour.resetsAt, RESETS_AT);
  assert.equal(limit.weekly.usedPercent, 15);
  assert.equal(limit.weekly.resetsAt, RESETS_AT + 1000);
});

test("주간만 실린 줄에서는 5시간이 null이다", async () => {
  const dir = await makeDir();
  const file = path.join(dir, "a.jsonl");
  fs.writeFileSync(file, limitLine(63) + "\n");

  const cache = new CodexUsageCache(dir);
  const { limit } = await cache.reload({ keepPreviousOnFailure: false });

  assert.equal(limit.fiveHour, null); // 없는 값을 지어내지 않는다
  assert.equal(limit.weekly.usedPercent, 63);
});

test("표시할 자리가 없는 창(월간)만 실린 줄은 한도로 치지 않는다", async () => {
  const dir = await makeDir();
  const file = path.join(dir, "a.jsonl");
  fs.writeFileSync(
    file,
    [
      limitLine(37),
      rateLimitLine({
        primary: {
          used_percent: 5,
          window_minutes: 43200,
          resets_at: RESETS_AT,
        },
      }),
      "",
    ].join("\n"),
  );

  const cache = new CodexUsageCache(dir);
  const { limit } = await cache.reload({ keepPreviousOnFailure: false });

  assert.equal(limit.weekly.usedPercent, 37); // 직전 주간 스냅샷이 살아 있다
});

test("세션 디렉터리가 없거나 로그가 없으면 limit:null", async () => {
  const missing = new CodexUsageCache(path.join(os.tmpdir(), "codex-none-xyz"));
  assert.equal(
    (await missing.reload({ keepPreviousOnFailure: false })).limit,
    null,
  );

  const empty = new CodexUsageCache(await makeDir()); // 디렉터리는 있고 로그만 없음
  assert.equal(
    (await empty.reload({ keepPreviousOnFailure: false })).limit,
    null,
  );
});
