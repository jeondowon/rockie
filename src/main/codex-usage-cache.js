// Codex 사용량 조회 (트레이 SYSTEM 화면용).
// Codex는 평소 동작하면서 ~/.codex/sessions/**/*.jsonl에 세션 로그를 스스로 남긴다.
// 여기서는 그 로그를 읽기만 하며, 설치·설정은 필요 없다.
//
// 필요한 건 한도 스냅샷(퍼센트·플랜·리셋 시각) 하나뿐이라 **가장 최근에 쓰인 파일 하나만**
// 본다. 한도는 계정 단위라 어느 세션에서 기록됐든 마지막 값이 곧 최신이다.
const fs = require("fs");
const fsp = require("fs/promises");
const os = require("os");
const path = require("path");

const CODEX_DIR = path.join(os.homedir(), ".codex", "sessions");

// 보여줄 한도 스냅샷이 없는 상태(디렉터리·로그 없음, 읽기 실패)
function emptyCodexUsage() {
  return { limit: null };
}

async function exists(p) {
  try {
    await fsp.access(p);
    return true;
  } catch (_err) {
    return false;
  }
}

// 세션 로그 중 가장 최근에 쓰인 파일 하나 (없으면 null).
async function newestJsonl(dir) {
  let best = null;
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
          if (!best || st.mtimeMs > best.mtimeMs) {
            best = { path: p, size: st.size, mtimeMs: st.mtimeMs };
          }
        } catch (_err) {
          // 방금 지워진 파일은 무시
        }
      }
    }
  }
  await walk(dir);
  return best;
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

// token_count 이벤트 한 줄 → 한도 스냅샷 (한도 정보가 없는 줄이면 null)
function parseLimit(line) {
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
  if (!rl || !rl.primary) return null;
  return {
    usedPercent: rl.primary.used_percent,
    resetsAt: rl.primary.resets_at,
    planType: rl.plan_type || null,
  };
}

class CodexUsageCache {
  constructor(dir = CODEX_DIR) {
    this.dir = dir;
    this.snapshot = emptyCodexUsage();
    // 지금 따라가고 있는 파일 { path, size, mtimeMs, offset, limit }
    this.file = null;
    this.pending = null;
  }

  // 앱 시작 시 1회 예열. 미리 훑어두면 첫 트레이 오픈이 즉시 뜬다.
  async start() {
    await this.reload({ keepPreviousOnFailure: false });
  }

  get() {
    return this.snapshot;
  }

  async reload({ keepPreviousOnFailure = true } = {}) {
    if (this.pending) return this.pending;
    this.pending = this.readUsage()
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

  async readUsage() {
    if (!(await exists(this.dir))) return emptyCodexUsage();

    const newest = await newestJsonl(this.dir);
    if (!newest) {
      this.file = null;
      return emptyCodexUsage();
    }

    let f = this.file;
    if (!f || f.path !== newest.path || newest.size < f.size) {
      // 새 세션 파일이거나, 파일이 줄었으면(잘렸거나 교체됨) 처음부터 다시 읽는다
      f = { path: newest.path, size: 0, mtimeMs: 0, offset: 0, limit: null };
    } else if (f.size === newest.size && f.mtimeMs === newest.mtimeMs) {
      return { limit: f.limit }; // 그대로면 다시 읽을 것이 없다
    }

    const consumed = await readNewLines(newest.path, f.offset, (line) => {
      // 최신 스냅샷 1개만 남기고 이전 것은 그때그때 버린다.
      // 한도 정보가 없는 줄은 건너뛰므로, 마지막 줄에 없더라도 직전 값을 잃지 않는다.
      const limit = parseLimit(line);
      if (limit) f.limit = limit;
    });

    f.offset += consumed;
    f.size = newest.size;
    f.mtimeMs = newest.mtimeMs;
    this.file = f;
    return { limit: f.limit };
  }
}

const codexUsageCache = new CodexUsageCache();

// CodexUsageCache는 테스트가 임시 디렉터리로 인스턴스를 따로 만들 때 쓴다.
module.exports = { CodexUsageCache, codexUsageCache };
