// 시스템 모니터 데이터 조회 (트레이 SYSTEM 화면용).
// 표시용 숫자만 추려서 반환하고, 서식/색상/기분 판정은 렌더러(tray.js)가 담당한다.
const si = require("systeminformation");

const GB = 1024 ** 3;

// 값이 느리게 변하는 조회는 TTL 동안 직전 결과를 재사용한다.
// SYSTEM 화면은 2초마다 여기를 부르는데, fsSize는 df를, networkInterfaces·battery는
// 각각 별도의 시스템 명령을 띄운다(실측 합계 130~180ms). 초 단위로 변하지도 않는 값에
// 매 틱 그 비용을 낼 이유가 없다.
// 실패는 캐시하지 않으므로(예외가 그대로 전파된다) 다음 틱에 다시 시도한다.
function cached(fn, ttlMs) {
  let value = null;
  let at = 0;
  return async () => {
    if (value !== null && Date.now() - at < ttlMs) return value;
    value = await fn();
    at = Date.now();
    return value;
  };
}

const readDisks = cached(() => si.fsSize(), 60 * 1000);
const readBattery = cached(() => si.battery(), 15 * 1000);
// def(기본 인터페이스명)와 목록은 같은 시점의 값이어야 짝이 맞으므로 함께 캐시한다.
// 대가: Wi-Fi↔유선을 갈아타면 라벨·IP가 최대 30초 늦게 반영된다.
const readNet = cached(
  async () => ({
    def: await si.networkInterfaceDefault(),
    ifaces: await si.networkInterfaces(),
  }),
  30 * 1000,
);

async function getSystemStats() {
  try {
    const { def, ifaces } = await readNet();
    // networkStats는 캐시하지 않는다 — rx_sec/tx_sec가 "직전 호출 이후 델타"라서
    // 호출 간격이 곧 측정 구간이다. 재사용하면 속도 표시가 멈춘다.
    const [load, mem, disks, batt, netStat] = await Promise.all([
      si.currentLoad(),
      si.mem(),
      readDisks(),
      readBattery(),
      si.networkStats(def),
    ]);

    // macOS는 루트('/')가 읽기전용 스냅샷이라 사용률이 실제와 다르다 → 데이터 볼륨 우선
    const vol =
      disks.find((d) => d.mount === "/System/Volumes/Data") ||
      disks.find((d) => d.mount === "/") ||
      disks[0] ||
      {};
    const diskUsed = (vol.size || 0) - (vol.available || 0);

    const ni = (Array.isArray(ifaces) ? ifaces : [ifaces]).find(
      (n) => n.iface === def,
    );
    const netLabel =
      ni && ni.type === "wired"
        ? "유선"
        : ni && ni.type === "wireless"
          ? "Wi-Fi"
          : (ni && ni.ifaceName) || def || "네트워크";
    const st = (netStat && netStat[0]) || {};

    return {
      cpu: {
        load: load.currentLoad,
        system: load.currentLoadSystem,
        user: load.currentLoadUser,
        idle: load.currentLoadIdle,
      },
      ram: {
        pct: mem.total ? Math.round((mem.active / mem.total) * 100) : 0,
        activeGB: mem.active / GB,
        availableGB: mem.available / GB,
        totalGB: mem.total / GB,
        swapGB: (mem.swapused || 0) / GB,
      },
      disk: {
        pct: vol.size ? Math.round((diskUsed / vol.size) * 100) : 0,
        usedGB: diskUsed / GB,
        freeGB: (vol.available || 0) / GB,
        totalGB: (vol.size || 0) / GB,
      },
      battery: batt.hasBattery
        ? {
            has: true,
            pct: Math.round(batt.percent),
            charging: batt.isCharging,
            ac: batt.acConnected,
            healthPct: batt.designedCapacity
              ? Math.round((batt.maxCapacity / batt.designedCapacity) * 100)
              : null,
            cycles: batt.cycleCount ?? null,
          }
        : { has: false },
      network: {
        label: netLabel,
        ip: (ni && ni.ip4) || "-",
        rxSec: Math.max(0, st.rx_sec || 0),
        txSec: Math.max(0, st.tx_sec || 0),
      },
    };
  } catch (_err) {
    return null; // 조회 실패 시 렌더러는 이전 값을 유지한다
  }
}

module.exports = { getSystemStats };
