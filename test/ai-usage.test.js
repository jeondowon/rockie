// 트레이의 "수동 새로고침"이 실제로 파일을 다시 읽어 값을 바꾸는지 확인한다.
// 버튼이 부르는 경로(getAiUsage)를 그대로 태운다.
const test = require("node:test");
const assert = require("node:assert");
const fs = require("fs");
const os = require("os");
const path = require("path");

const { claudeUsageCache } = require("../src/main/claude-usage-cache");
const { codexUsageCache } = require("../src/main/codex-usage-cache");

// 홈 디렉터리 대신 임시 파일을 보도록 싱글턴 경로만 바꿔 끼운다
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "ai-usage-"));
const claudeFile = path.join(tmp, "usage-cache.json");
const codexDir = path.join(tmp, "sessions");
fs.mkdirSync(codexDir);
claudeUsageCache.filePath = claudeFile;
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
        plan_type: "pro",
        primary: {
          used_percent: usedPercent,
          window_minutes: 10080,
          resets_at: 1,
        },
      },
    },
  });

const claudeJson = (fiveHour, sevenDay) =>
  JSON.stringify({
    updatedAt: Date.now(),
    fiveHour: { usedPercentage: fiveHour, resetsAt: 1 },
    sevenDay: { usedPercentage: sevenDay, resetsAt: 2 },
  });

test("조회할 때마다 두 도구의 파일을 다시 읽어 퍼센트를 갱신한다", async () => {
  const codexFile = path.join(codexDir, "a.jsonl");
  fs.writeFileSync(claudeFile, claudeJson(10, 20));
  fs.writeFileSync(codexFile, codexLine(30, 100) + "\n");

  let usage = await getAiUsage();
  assert.equal(usage.claude.fiveHourPercentage, 10);
  assert.equal(usage.claude.sevenDayPercentage, 20);
  assert.equal(usage.codex.limit.usedPercent, 30);

  // 두 도구가 각자 파일을 갱신한 상황(Claude=statusLine, Codex=새 token_count 이벤트)
  fs.writeFileSync(claudeFile, claudeJson(55, 66));
  fs.appendFileSync(codexFile, codexLine(77, 400) + "\n");

  usage = await getAiUsage();
  assert.equal(usage.claude.fiveHourPercentage, 55);
  assert.equal(usage.claude.sevenDayPercentage, 66);
  assert.equal(usage.codex.limit.usedPercent, 77);

  // 파일이 그대로면 값도 그대로여야 한다(중복 집계 없음)
  const again = await getAiUsage();
  assert.deepEqual(again, usage);
});

test("한쪽 파일을 읽지 못해도 다른 쪽은 계속 보여준다", async () => {
  fs.writeFileSync(claudeFile, claudeJson(41, 42));
  await getAiUsage();

  fs.rmSync(claudeFile); // Claude 캐시만 사라진 상황
  const usage = await getAiUsage();

  assert.equal(usage.codex.limit.usedPercent, 77); // Codex는 정상
  // 읽기 실패로 화면을 비우지 않는다 — 마지막으로 읽은 값을 그대로 유지한다
  assert.equal(usage.claude.fiveHourPercentage, 41);
  assert.equal(usage.claude.sevenDayPercentage, 42);
});
