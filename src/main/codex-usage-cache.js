const fs = require("fs");
const fsp = require("fs/promises");
const os = require("os");
const path = require("path");

const CODEX_DIR = path.join(os.homedir(), ".codex", "sessions");

function emptyCodexUsage() {
  return { available: false };
}

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

async function exists(p) {
  try {
    await fsp.access(p);
    return true;
  } catch (_err) {
    return false;
  }
}

async function listJsonl(dir) {
  const out = [];
  async function walk(d) {
    let items;
    try {
      items = await fsp.readdir(d, { withFileTypes: true });
    } catch (_err) {
      return;
    }
    for (const it of items) {
      const p = path.join(d, it.name);
      if (it.isDirectory()) await walk(p);
      else if (it.name.endsWith(".jsonl")) {
        try {
          const st = await fsp.stat(p);
          out.push({ path: p, size: st.size, mtimeMs: st.mtimeMs });
        } catch (_err) {
          // 방금 지워진 파일은 무시
        }
      }
    }
  }
  await walk(dir);
  return out;
}

// offset 바이트 이후에 새로 붙은 줄만 한 줄씩 흘려보낸다.
// 세션 로그는 append-only라 이미 읽은 앞부분을 다시 읽을 이유가 없고,
// 파일 전체를 문자열로 들고 있지 않으므로 6MB짜리 세션도 메모리를 먹지 않는다.
// 반환값은 "완전한 줄까지 소비한 바이트 수"(끊긴 마지막 줄은 다음 호출로 미룬다).
async function readNewLines(filePath, offset, onLine) {
  let consumed = 0;
  let pending = "";
  try {
    const stream = fs.createReadStream(filePath, {
      encoding: "utf8",
      start: offset,
    });
    for await (const chunk of stream) {
      pending += chunk;
      let nl;
      while ((nl = pending.indexOf("\n")) !== -1) {
        const line = pending.slice(0, nl);
        pending = pending.slice(nl + 1);
        consumed += Buffer.byteLength(line) + 1;
        onLine(line);
      }
    }
  } catch (_err) {
    // 읽는 도중 사라진 파일은 여기까지 소비한 만큼만 반영한다
  }
  return consumed;
}

// token_count 이벤트 한 줄 → { at, usage, limit } (필요 없는 원본은 버린다)
function parseTokenLine(line) {
  if (!line || !line.includes("token_count")) return null;
  let d;
  try {
    d = JSON.parse(line);
  } catch (_err) {
    return null;
  }
  if (d.type !== "event_msg" || !d.payload) return null;
  if (d.payload.type !== "token_count") return null;

  const rl = d.payload.rate_limits;
  const primary = rl && rl.primary;
  const at = Date.parse(d.timestamp);
  return {
    at,
    usage: d.payload.info && d.payload.info.last_token_usage,
    limit: primary
      ? {
          usedPercent: primary.used_percent,
          windowMinutes: primary.window_minutes,
          resetsAt: primary.resets_at,
          planType: rl.plan_type || null,
          measuredAt: at,
        }
      : null,
  };
}

class CodexUsageCache {
  constructor(dir = CODEX_DIR) {
    this.dir = dir;
    this.snapshot = emptyCodexUsage();
    this.fileCache = new Map();
    this.dayStart = null;
    this.pending = null;
  }

  // 앱 시작 시 1회 예열. 오늘치 로그를 미리 훑어두면 첫 트레이 오픈이 즉시 뜬다.
  async start() {
    await this.reload({ keepPreviousOnFailure: false });
  }

  get() {
    return this.snapshot;
  }

  async reload({ keepPreviousOnFailure = true } = {}) {
    if (this.pending) return this.pending;
    this.pending = this.readUsage(startOfToday())
      .then((usage) => {
        this.snapshot = usage;
        return this.snapshot;
      })
      .catch((err) => {
        if (!keepPreviousOnFailure) this.snapshot = emptyCodexUsage();
        throw err;
      })
      .finally(() => {
        this.pending = null;
      });
    return this.pending;
  }

  // 파일 하나를 훑어 누계만 갱신한다. 이벤트 원본은 보관하지 않는다.
  async scanFile(file, dayStart) {
    let entry = this.fileCache.get(file.path);
    if (entry && entry.size === file.size && entry.mtimeMs === file.mtimeMs) {
      return entry;
    }
    // 파일이 줄었으면 잘렸거나 교체된 것 → 처음부터 다시 읽는다
    if (!entry || file.size < entry.size) {
      entry = { size: 0, mtimeMs: 0, offset: 0, input: 0, output: 0, last: null };
    }

    const consumed = await readNewLines(file.path, entry.offset, (line) => {
      const ev = parseTokenLine(line);
      if (!ev) return;
      entry.last = ev; // 최신 스냅샷 1개만 남기고 이전 것은 그때그때 버린다
      if (!(ev.at >= dayStart) || !ev.usage) return;
      entry.input += ev.usage.input_tokens || 0;
      entry.output += ev.usage.output_tokens || 0;
    });

    entry.offset += consumed;
    entry.size = file.size;
    entry.mtimeMs = file.mtimeMs;
    this.fileCache.set(file.path, entry);
    return entry;
  }

  async readUsage(dayStart) {
    // 날짜가 바뀌면 어제 누계가 섞이지 않도록 전부 버리고 다시 센다
    if (this.dayStart !== dayStart) {
      this.fileCache.clear();
      this.dayStart = dayStart;
    }

    if (!(await exists(this.dir))) return emptyCodexUsage();

    const files = await listJsonl(this.dir);
    if (!files.length) {
      this.fileCache.clear();
      return { available: true, input: 0, output: 0, limit: null };
    }

    const newest = files.reduce((a, b) => (b.mtimeMs > a.mtimeMs ? b : a));
    const total = { input: 0, output: 0 };
    const keep = new Set();
    for (const f of files) {
      // 오늘 합계에 기여하지 않는 파일은 읽지도, 캐시에 남기지도 않는다
      if (f.mtimeMs < dayStart && f.path !== newest.path) continue;
      const entry = await this.scanFile(f, dayStart);
      total.input += entry.input;
      total.output += entry.output;
      keep.add(f.path);
    }

    for (const p of this.fileCache.keys()) {
      if (!keep.has(p)) this.fileCache.delete(p);
    }

    const last = this.fileCache.get(newest.path);
    return {
      available: true,
      ...total,
      limit: (last && last.last && last.last.limit) || null,
    };
  }

}

const codexUsageCache = new CodexUsageCache();

module.exports = {
  CODEX_DIR,
  CodexUsageCache,
  codexUsageCache,
};
