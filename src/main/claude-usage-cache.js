const fsp = require("fs/promises");
const os = require("os");
const path = require("path");

const USAGE_CACHE_PATH = path.join(os.homedir(), ".claude", "usage-cache.json");

// 캐시가 비는 이유를 문구로 안내하지 않는다: statusLine은 자동 설치되지 않아서
// (`npm run install:claude-statusline` 수동 실행) "메시지를 보내세요" 류의 안내는
// 설치 안 한 사용자에게 틀린 말이 된다. 트레이는 값이 없으면 "확인 불가"만 보여준다.
function emptyUsage() {
  return {
    fiveHourPercentage: null,
    fiveHourResetsAt: null,
    sevenDayPercentage: null,
    sevenDayResetsAt: null,
    updatedAt: null,
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
  };
}

class ClaudeUsageCache {
  constructor(filePath = USAGE_CACHE_PATH) {
    this.filePath = filePath;
    this.snapshot = emptyUsage();
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
    } catch (_err) {
      // 한 번이라도 읽은 적이 있으면 직전 값을 그대로 두고(지금 못 읽었다고 화면을
      // 비울 이유가 없다), 아니면 빈 값으로 둔다.
      if (!(keepPreviousOnFailure && this.snapshot.updatedAt != null)) {
        this.snapshot = emptyUsage();
      }
      return this.get();
    }
  }
}

const claudeUsageCache = new ClaudeUsageCache();

module.exports = { claudeUsageCache };
