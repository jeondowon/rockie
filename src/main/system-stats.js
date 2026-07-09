// 시스템 모니터 데이터 조회 (트레이 SYSTEM 화면용).
// 표시용 숫자만 추려서 반환하고, 서식/색상/기분 판정은 렌더러(tray.js)가 담당한다.
const si = require("systeminformation");

const GB = 1024 ** 3;

async function getSystemStats() {
  try {
    const def = await si.networkInterfaceDefault();
    const [load, mem, disks, batt, ifaces, netStat] = await Promise.all([
      si.currentLoad(),
      si.mem(),
      si.fsSize(),
      si.battery(),
      si.networkInterfaces(),
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
