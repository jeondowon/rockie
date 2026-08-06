// AI 사용량 조회 (트레이 SYSTEM 화면용).
// Codex만 지원한다 — Codex는 스스로 세션 로그에 rate_limits를 남기므로 읽기만 하면 된다.
// Claude Code는 한도를 로컬에도 API에도 내주지 않아(구독 한도는 API 개념이 아니다)
// 공식 경로가 생기기 전까지 지원하지 않는다. 트레이는 안내 문구만 둔다.
const { codexUsageCache } = require("./codex-usage-cache");

async function startAiUsage() {
  await codexUsageCache.start();
}

// 조회가 곧 갱신이다. 트레이가 물어볼 때만 디스크를 읽으므로,
// 팝업이 닫혀 있는 동안에는 감시자도 타이머도 돌지 않는다.
async function getAiUsage() {
  // reload()는 읽기에 실패하면 던진다. 트레이 조회가 통째로 실패해 화면이 안 그려지는
  // 일이 없도록 여기서 삼키고, 캐시가 들고 있는 직전 스냅샷을 그대로 보여준다.
  await codexUsageCache.reload().catch(() => {});
  return { codex: codexUsageCache.get() };
}

module.exports = {
  getAiUsage,
  startAiUsage,
};
