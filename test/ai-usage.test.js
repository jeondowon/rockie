// 트레이의 "수동 새로고침"이 실제로 파일을 다시 읽어 값을 바꾸는지 확인한다.
// 버튼이 부르는 경로(getAiUsage)를 그대로 태운다.
const test = require("node:test");
const assert = require("node:assert");
const fs = require("fs");
const os = require("os");
const path = require("path");

const { codexUsageCache } = require("../src/main/codex-usage-cache");

// 홈 디렉터리 대신 임시 파일을 보도록 싱글턴 경로만 바꿔 끼운다
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "ai-usage-"));
const codexDir = path.join(tmp, "sessions");
fs.mkdirSync(codexDir);
codexUsageCache.dir = codexDir;

const { getAiUsage } = require("../src/main/ai-usage");

const now = Date.now();
const codexLine = (usedPercent, inputTokens) =>
  JSON.stringify({
    type: "event_msg",
    timestamp: new Date(now).toISOString(),
    payload: {
      type: "token_count",
      info: {
        last_token_usage: { input_tokens: inputTokens, output_tokens: 0 },
      },
      rate_limits: {
        primary: {
          used_percent: usedPercent,
          window_minutes: 10080,
          resets_at: 1,
        },
      },
    },
  });

test("조회할 때마다 로그를 다시 읽어 퍼센트를 갱신한다", async () => {
  const codexFile = path.join(codexDir, "a.jsonl");
  fs.writeFileSync(codexFile, codexLine(30, 100) + "\n");

  let usage = await getAiUsage();
  assert.equal(usage.codex.limit.weekly.usedPercent, 30);

  // Codex가 새 token_count 이벤트를 남긴 상황
  fs.appendFileSync(codexFile, codexLine(77, 400) + "\n");

  usage = await getAiUsage();
  assert.equal(usage.codex.limit.weekly.usedPercent, 77);

  // 파일이 그대로면 값도 그대로여야 한다(중복 집계 없음)
  const again = await getAiUsage();
  assert.deepEqual(again, usage);
});

// codex-usage-cache는 읽기 실패를 대부분 내부에서 삼키지만, reload()가 던질 여지는
// 남아 있다. 그때 조회 전체가 무너지면 트레이가 아예 안 그려지므로 그 방어를 고정한다.
test("갱신이 실패해도 조회가 던지지 않고 직전 값을 유지한다", async () => {
  const original = codexUsageCache.reload;
  codexUsageCache.reload = () => Promise.reject(new Error("읽기 실패"));

  try {
    const usage = await getAiUsage();
    assert.equal(usage.codex.limit.weekly.usedPercent, 77);
  } finally {
    codexUsageCache.reload = original;
  }
});
