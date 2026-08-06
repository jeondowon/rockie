// 트레이 팝업 · 시스템 모니터 화면 (#system-view)
// CPU/RAM/저장/배터리/네트워크 + AI(Codex) 사용량.
// 폴링은 화면이 보이는 동안만 돈다 — 시작/중지는 tray.js의 showScreen이 호출한다.

const SYS_POLL_MS = 2000;
let sysTimer = null;
let aiTicking = false;
let aiCheckedAt = null; // 사용량 파일을 마지막으로 읽어본 시각

function startSystemMonitor() {
  if (sysTimer) return;
  tickSystem(); // 즉시 1회 갱신 후 주기 폴링
  // AI 사용량은 로그를 읽어 집계하므로 폴링하지 않는다.
  // 이 창을 열 때 1회, 그리고 수동 새로고침을 누를 때만 확인한다.
  tickAiUsage();
  sysTimer = setInterval(tickSystem, SYS_POLL_MS);
}

function stopSystemMonitor() {
  if (!sysTimer) return;
  clearInterval(sysTimer);
  sysTimer = null;
}

async function tickSystem() {
  renderCheckedAt(); // "n분 전"이 흐르도록 텍스트만 갱신(파일을 읽지 않는다)
  const stats = await window.trayAPI.getSystemStats();
  if (stats) renderSystem(stats); // 조회 실패(null)면 이전 값 유지
}

// 사용량 파일을 마지막으로 읽어본 시각. 값이 그대로여도 이 표시로 확인 여부를 안다.
function renderCheckedAt() {
  const text = aiCheckedAt == null ? "—" : relativeTime(aiCheckedAt);
  setText("sc-codex-checked", text);
}

async function tickAiUsage() {
  if (aiTicking) return;
  aiTicking = true;
  try {
    const usage = await window.trayAPI.getAiUsage(); // 호출 시점에 파일을 다시 읽는다
    if (usage) {
      aiCheckedAt = Date.now();
      renderAiUsage(usage);
    }
  } finally {
    aiTicking = false;
  }
}

const byId = (id) => document.getElementById(id);

function setText(id, text) {
  byId(id).textContent = text;
}

function setFill(id, pct) {
  byId(id).style.width = `${Math.max(0, Math.min(100, pct))}%`;
}

// 사용률 색상: 여유(초록) < 60 · 주의(노랑) < 85 · 높음(빨강)
function loadClass(pct) {
  return pct < 60 ? "green" : pct < 85 ? "gold" : "rust";
}

// 배터리는 반대로 잔량이 낮을수록 경고
function batteryClass(pct, charging) {
  if (charging) return "green";
  return pct > 40 ? "green" : pct > 15 ? "gold" : "rust";
}

// 글리프·값·게이지에 색상 클래스를 한 번에 적용
function paint(metric, cls) {
  byId(`sc-${metric}-glyph`).className = `sys-glyph ${cls}`;
  byId(`sc-${metric}-val`).className = `sys-val ${cls}`;
  byId(`sc-${metric}-fill`).className = `gauge-fill ${cls}`;
}

const gb = (n) => `${n.toFixed(1)} GB`;

// 초당 바이트 → 사람이 읽는 속도
function rate(bytesPerSec) {
  if (bytesPerSec >= 1024 * 1024)
    return `${(bytesPerSec / (1024 * 1024)).toFixed(1)} MB/s`;
  return `${(bytesPerSec / 1024).toFixed(1)} KB/s`;
}

function renderSystem(s) {
  renderPetMotion(s.cpu.load);

  // CPU
  setText("sc-cpu-val", `${Math.round(s.cpu.load)}%`);
  setFill("sc-cpu-fill", s.cpu.load);
  paint("cpu", loadClass(s.cpu.load));
  setText("sc-cpu-system", `${s.cpu.system.toFixed(1)}%`);
  setText("sc-cpu-user", `${s.cpu.user.toFixed(1)}%`);
  setText("sc-cpu-idle", `${s.cpu.idle.toFixed(1)}%`);

  // RAM
  setText("sc-ram-val", `${s.ram.pct}%`);
  setFill("sc-ram-fill", s.ram.pct);
  paint("ram", loadClass(s.ram.pct));
  setText("sc-ram-active", gb(s.ram.activeGB));
  setText("sc-ram-available", gb(s.ram.availableGB));
  setText("sc-ram-total", gb(s.ram.totalGB));
  setText("sc-ram-swap", gb(s.ram.swapGB));

  // 저장
  setText("sc-disk-val", `${s.disk.pct}%`);
  setFill("sc-disk-fill", s.disk.pct);
  paint("disk", loadClass(s.disk.pct));
  setText("sc-disk-used", gb(s.disk.usedGB));
  setText("sc-disk-free", gb(s.disk.freeGB));
  setText("sc-disk-total", gb(s.disk.totalGB));

  // 배터리
  if (s.battery.has) {
    const b = s.battery;
    const state = b.charging ? "충전 중" : b.ac ? "전원 연결" : "충전 안 함";
    setText("sc-bat-val", `${b.pct}%`);
    setFill("sc-bat-fill", b.pct);
    paint("bat", batteryClass(b.pct, b.charging));
    setText("sc-bat-sub", state);
    setText("sc-bat-power", state);
    setText("sc-bat-health", b.healthPct != null ? `${b.healthPct}%` : "—");
    setText("sc-bat-cycles", b.cycles != null ? `${b.cycles}회` : "—");
  } else {
    setText("sc-bat-val", "—");
    setFill("sc-bat-fill", 0);
    paint("bat", "green");
    setText("sc-bat-sub", "배터리 없음");
    setText("sc-bat-power", "—");
    setText("sc-bat-health", "—");
    setText("sc-bat-cycles", "—");
  }

  // 네트워크 (속도는 높을수록 좋으므로 경고색 없이 항상 초록,
  // 게이지는 0.1Mbps~1Gbps를 로그로 펼쳐 저속에서도 눈에 보이게)
  const mbps = ((s.network.rxSec + s.network.txSec) * 8) / 1e6;
  setText("sc-net-val", rate(s.network.rxSec + s.network.txSec));
  setFill("sc-net-fill", mbps <= 0.1 ? 0 : (Math.log10(mbps * 10) / 4) * 100);
  paint("net", "green");
  setText("sc-net-sub", s.network.label);
  setText("sc-net-ip", s.network.ip);
  setText("sc-net-up", `↑ ${rate(s.network.txSec)}`);
  setText("sc-net-down", `↓ ${rate(s.network.rxSec)}`);

  // 반응 카드: CPU 부하로 애완돌 기분 분기
  renderMood(s.cpu.load);
}

function renderPetMotion(load) {
  const pct = Math.max(0, Math.min(100, load || 0));
  let duration = 3.2; // 활동적: 현재 체감 유지
  if (pct < 25) duration = 12;
  else if (pct >= 70) duration = 0.35;
  document.documentElement.style.setProperty(
    "--sys-pet-rotate-duration",
    `${duration}s`,
  );
}

function renderMood(load) {
  let mood, desc;
  if (load < 25) {
    mood = "새근새근 · 여유";
    desc = "한가로워요. 돌이 느긋하게 쉬고 있어요.";
  } else if (load < 70) {
    mood = "달그락 달그락 · 활동적";
    desc = "적당한 부하. 돌이 살짝 몸을 뒤척여요.";
  } else {
    mood = "데굴데굴 · 바쁨";
    desc = "부하가 높아요! 돌이 바쁘게 움직여요.";
  }
  setText("sys-mood", mood);
  setText("sys-mood-desc", desc);
}

function relativeTime(ms) {
  if (typeof ms !== "number" || !Number.isFinite(ms)) return "확인 불가";
  const diff = Math.max(0, Date.now() - ms);
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "방금 전";
  if (minutes < 60) return `${minutes}분 전`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}시간 전`;
  return `${Math.floor(hours / 24)}일 전`;
}

// 못 읽었으면 null — 부르는 쪽이 그 줄을 숨긴다
function resetTime(epochSeconds) {
  if (typeof epochSeconds !== "number" || !Number.isFinite(epochSeconds)) {
    return null;
  }
  const diff = epochSeconds * 1000 - Date.now();
  if (diff <= 0) return "갱신 필요";
  if (diff < 24 * 60 * 60 * 1000) {
    const totalMinutes = Math.max(1, Math.floor(diff / 60000));
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    if (hours > 0 && minutes > 0) return `${hours}시간 ${minutes}분 후`;
    if (hours > 0) return `${hours}시간 후`;
    return `${minutes}분 후`;
  }
  return new Date(epochSeconds * 1000).toLocaleString("ko-KR", {
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function renderAiUsage(u) {
  renderCheckedAt();

  // Codex: 로컬 세션 로그에 남은 rate_limits 스냅샷을 표시한다.
  // 스냅샷은 "마지막으로 Codex를 쓴 시점"의 값이다. 그 뒤로 한도 창이 리셋됐다면
  // (resetsAt 경과) 로그의 퍼센트는 더 이상 사실이 아니다 — 새 값은 Codex를 한 번
  // 써야 로그에 남으므로, 만료된 수치를 그대로 보여주는 대신 모른다고 말한다.
  const lim = u.codex.limit;
  const fiveHour = freshWindow(lim && lim.fiveHour);
  const weekly = freshWindow(lim && lim.weekly);
  // 헤더에는 5시간 창을 올린다. 다만 Codex가 5시간 창을 로그에 남기지 않는
  // 시기가 있어(주간만 기록됨) 그럴 땐 주간을 대신 올리고 sub로 어느 쪽인지 밝힌다.
  const head = fiveHour || weekly;
  const headIsFiveHour = head !== null && head === fiveHour;
  if (head) {
    setText("sc-codex-val", `${Math.round(head.usedPercent)}%`);
    setFill("sc-codex-fill", head.usedPercent);
    paint("codex", loadClass(head.usedPercent));
    setText("sc-codex-sub", headIsFiveHour ? "5시간 세션" : "주간 세션");
  } else {
    setText("sc-codex-val", "—");
    setFill("sc-codex-fill", 0);
    paint("codex", "green");
    setText("sc-codex-sub", lim ? "갱신 필요" : "기록 없음");
  }
  // 상세 첫 줄은 헤더에 올리지 않은 쪽을 보여준다. 주간이 헤더로 올라간 상황에서
  // 주간을 또 적으면 같은 값이 두 번 나온다.
  const other = headIsFiveHour ? weekly : fiveHour;
  setText(
    "sc-codex-other-k",
    headIsFiveHour ? "주간 세션 사용" : "5시간 세션 사용",
  );
  detailRow(
    "sc-codex-other-row",
    "sc-codex-other",
    other ? `${Math.round(other.usedPercent)}%` : null,
  );
  detailRow(
    "sc-codex-5h-reset-row",
    "sc-codex-5h-reset",
    resetTime(lim && lim.fiveHour && lim.fiveHour.resetsAt),
  );
  detailRow(
    "sc-codex-7d-reset-row",
    "sc-codex-7d-reset",
    resetTime(lim && lim.weekly && lim.weekly.resetsAt),
  );
}

// 값을 못 읽은 줄은 "확인 불가"라고 적는 대신 줄째로 숨긴다
function detailRow(rowId, valueId, value) {
  byId(rowId).classList.toggle("hidden", value === null);
  if (value !== null) setText(valueId, value);
}

// 한도 창이 이미 리셋됐으면 로그에 남은 퍼센트는 더 이상 사실이 아니다
function freshWindow(w) {
  return w && w.resetsAt * 1000 > Date.now() ? w : null;
}

// 항목 박스 클릭 → 세부 정보 드롭다운 토글
document.querySelectorAll(".sys-row").forEach((row) => {
  row.addEventListener("click", () => {
    const head = row.querySelector(".sys-row-head");
    const metric = head.dataset.metric;
    const open = byId(`sc-${metric}-detail`).classList.toggle("open");
    head.setAttribute("aria-expanded", open ? "true" : "false");
  });
});

// 수동 새로고침: 값이 그대로일 수도 있으므로 버튼 자체로 진행 상황을 알린다
document.querySelectorAll(".sys-refresh-btn").forEach((btn) => {
  btn.addEventListener("click", async (event) => {
    event.stopPropagation(); // 상세 드롭다운이 닫히지 않도록
    if (btn.disabled) return;
    btn.disabled = true;
    btn.textContent = "확인 중…";
    try {
      await tickAiUsage();
      btn.textContent = "✓";
      btn.classList.add("done");
    } finally {
      setTimeout(() => {
        btn.disabled = false;
        btn.classList.remove("done");
        btn.textContent = "새로고침";
      }, 1200);
    }
  });
});
