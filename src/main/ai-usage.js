// AI 사용량 조회 (트레이 SYSTEM 화면용).
// Claude 한도는 Claude Code statusLine이 미리 저장한 캐시만 읽는다.
// 트레이 표시 경로에서는 claude 프로세스, /usage, PTY를 실행하지 않는다.
const { claudeUsageCache } = require("./claude-usage-cache");
const { codexUsageCache } = require("./codex-usage-cache");

async function startAiUsage() {
  await Promise.all([claudeUsageCache.start(), codexUsageCache.start()]);
}

// 조회가 곧 갱신이다. 트레이가 물어볼 때만 디스크를 읽으므로,
// 팝업이 닫혀 있는 동안에는 감시자도 타이머도 돌지 않는다.
async function getAiUsage() {
  try {
    // 한쪽 읽기가 실패해도 다른 쪽은 보여준다(실패 시 직전 스냅샷 유지)
    await Promise.allSettled([
      claudeUsageCache.reload(),
      codexUsageCache.reload(),
    ]);
    return {
      claude: claudeUsageCache.get(),
      codex: codexUsageCache.get(),
    };
  } catch (_err) {
    return null;
  }
}

module.exports = {
  getAiUsage,
  startAiUsage,
};
