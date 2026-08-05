const fsp = require("fs/promises");
const os = require("os");
const path = require("path");

const CLAUDE_DIR = path.join(os.homedir(), ".claude");
const USAGE_CACHE_PATH = path.join(CLAUDE_DIR, "usage-cache.json");

function emptyUsage(error = null) {
  return {
    fiveHourPercentage: null,
    fiveHourResetsAt: null,
    sevenDayPercentage: null,
    sevenDayResetsAt: null,
    updatedAt: null,
    error,
  };
}

function numberOrNull(value) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function parseUsageCache(raw) {
  const data = JSON.parse(raw);
  return {
    fiveHourPercentage: numberOrNull(data.fiveHour?.usedPercentage),
    fiveHourResetsAt: numberOrNull(data.fiveHour?.resetsAt),
    sevenDayPercentage: numberOrNull(data.sevenDay?.usedPercentage),
    sevenDayResetsAt: numberOrNull(data.sevenDay?.resetsAt),
    updatedAt: numberOrNull(data.updatedAt),
    error: null,
  };
}

class ClaudeUsageCache {
  constructor(filePath = USAGE_CACHE_PATH) {
    this.filePath = filePath;
    this.snapshot = emptyUsage("Claude Code에서 메시지를 한 번 보낸 후 확인해 주세요.");
  }

  // 앱 시작 시 1회 예열. 이후 갱신은 트레이가 사용량을 물어볼 때만 일어난다.
  async start() {
    await this.reload({ keepPreviousOnFailure: false });
  }

  get() {
    return { ...this.snapshot };
  }

  async reload({ keepPreviousOnFailure = true } = {}) {
    try {
      const raw = await fsp.readFile(this.filePath, "utf8");
      this.snapshot = parseUsageCache(raw);
      return this.get();
    } catch (err) {
      const message =
        err && err.code === "ENOENT"
          ? "Claude Code에서 메시지를 한 번 보낸 후 확인해 주세요."
          : "Claude 사용량 캐시를 읽을 수 없습니다.";
      if (keepPreviousOnFailure && this.snapshot.updatedAt != null) {
        this.snapshot = { ...this.snapshot, error: message };
      } else {
        this.snapshot = emptyUsage(message);
      }
      return this.get();
    }
  }

}

const claudeUsageCache = new ClaudeUsageCache();

module.exports = {
  CLAUDE_DIR,
  USAGE_CACHE_PATH,
  ClaudeUsageCache,
  claudeUsageCache,
  emptyUsage,
  parseUsageCache,
};
