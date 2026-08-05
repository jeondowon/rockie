const fs = require("fs/promises");
const os = require("os");
const path = require("path");

const STATUSLINE_SCRIPT = `#!/usr/bin/env node
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const claudeDir = path.join(os.homedir(), ".claude");
const cachePath = path.join(claudeDir, "usage-cache.json");
const tmpPath = path.join(claudeDir, \`.usage-cache.\${process.pid}.\${Date.now()}.tmp\`);

function readStdin() {
  return new Promise((resolve) => {
    let input = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (chunk) => {
      input += chunk;
    });
    process.stdin.on("end", () => resolve(input));
    process.stdin.on("error", () => resolve(""));
  });
}

function numberOrNull(value) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function percent(value) {
  return numberOrNull(value) == null ? null : \`\${Math.round(value)}%\`;
}

function modelName(data) {
  return data?.model?.display_name || data?.model?.id || "Claude";
}

function buildCache(data) {
  const rateLimits = data?.rate_limits;
  if (!rateLimits) return null;
  const fiveHour = rateLimits.five_hour;
  const sevenDay = rateLimits.seven_day;
  if (!fiveHour && !sevenDay) return null;

  const now = Date.now();
  const cache = {
    updatedAt: now,
    updatedAtIso: new Date(now).toISOString(),
    fiveHour: {
      usedPercentage: numberOrNull(fiveHour?.used_percentage),
      resetsAt: numberOrNull(fiveHour?.resets_at),
    },
    sevenDay: {
      usedPercentage: numberOrNull(sevenDay?.used_percentage),
      resetsAt: numberOrNull(sevenDay?.resets_at),
    },
    claudeVersion: typeof data?.version === "string" ? data.version : null,
  };

  if (process.env.CLAUDE_USAGE_CACHE_INCLUDE_SESSION_ID === "1") {
    cache.sessionId = typeof data?.session_id === "string" ? data.session_id : null;
  }

  return cache;
}

async function saveCache(cache) {
  await fs.mkdir(claudeDir, { recursive: true, mode: 0o700 });
  await fs.writeFile(tmpPath, JSON.stringify(cache, null, 2), {
    mode: 0o600,
  });
  await fs.chmod(tmpPath, 0o600).catch(() => {});
  await fs.rename(tmpPath, cachePath);
  await fs.chmod(cachePath, 0o600).catch(() => {});
}

let data = null;
try {
  const input = await readStdin();
  data = JSON.parse(input);
  const cache = buildCache(data);
  if (cache) await saveCache(cache);
} catch (_err) {
  // statusLine 실패가 Claude Code 자체 동작을 방해하지 않게 조용히 무시한다.
}

const model = modelName(data);
const five = percent(data?.rate_limits?.five_hour?.used_percentage);
const seven = percent(data?.rate_limits?.seven_day?.used_percentage);
const limits = [five ? \`5h \${five}\` : null, seven ? \`7d \${seven}\` : null]
  .filter(Boolean)
  .join(" · ");

process.stdout.write(limits ? \`[\${model}] \${limits}\\n\` : \`[\${model}]\\n\`);
`;

function claudeDir() {
  return path.join(os.homedir(), ".claude");
}

function statuslineScriptPath() {
  return path.join(claudeDir(), "save-usage-statusline.mjs");
}

function settingsPath() {
  return path.join(claudeDir(), "settings.json");
}

function statusLineCommand() {
  return `"${process.execPath}" "${statuslineScriptPath()}"`;
}

async function readSettings(filePath) {
  try {
    return JSON.parse(await fs.readFile(filePath, "utf8"));
  } catch (err) {
    if (err && err.code === "ENOENT") return {};
    if (err instanceof SyntaxError) {
      throw new Error(`${filePath} 파일의 JSON이 손상되어 자동 수정하지 않았습니다.`);
    }
    throw err;
  }
}

async function installClaudeStatusLine() {
  const dir = claudeDir();
  const scriptPath = statuslineScriptPath();
  const configPath = settingsPath();

  await fs.mkdir(dir, { recursive: true, mode: 0o700 });
  await fs.writeFile(scriptPath, STATUSLINE_SCRIPT, { mode: 0o700 });
  await fs.chmod(scriptPath, 0o700).catch(() => {});

  const settings = await readSettings(configPath);
  settings.statusLine = {
    ...(settings.statusLine || {}),
    type: "command",
    command: statusLineCommand(),
  };

  await fs.writeFile(configPath, `${JSON.stringify(settings, null, 2)}\n`, {
    mode: 0o600,
  });
  await fs.chmod(configPath, 0o600).catch(() => {});

  return {
    scriptPath,
    settingsPath: configPath,
    command: settings.statusLine.command,
  };
}

module.exports = {
  STATUSLINE_SCRIPT,
  installClaudeStatusLine,
  statusLineCommand,
  statuslineScriptPath,
  settingsPath,
};
