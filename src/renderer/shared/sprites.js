// 진화 상태 ↔ 스프라이트 매핑 (pet/tray 렌더러 공용, update.md 1.1)
// 각 렌더러 HTML에서 본 스크립트(pet.js/tray.js)보다 먼저 로드한다.

const STONE_NAMES = {
  granite: "화강암",
  basalt: "현무암",
  marble: "대리석",
  gneiss: "편마암",
};

// 1단계 돌 → 2단계 변성체 접두어 (파일명은 접두어_e/i_포즈)
const VARIANT_STONE = {
  granite: "pegmatite",
  basalt: "eclogite",
  marble: "corundumMarble",
  gneiss: "migmatite",
};

// (돌 종류, 변형) → 3단계 보석 접두어
const GEM = {
  granite: { extrovert: "topaz", introvert: "aquamarine" },
  basalt: { extrovert: "diamond_cut", introvert: "diamond_rough" },
  marble: { extrovert: "partiSapphire", introvert: "ruby" },
  gneiss: { extrovert: "labradorite", introvert: "moonstone" },
};

// 진화 상태 → 표시할 GIF의 레벨 폴더와 접두어
function resolveSprite(stage, stoneType, variant) {
  if (stage >= 3 && stoneType && variant) {
    return { level: "level3", prefix: GEM[stoneType][variant] };
  }
  if (stage === 2 && stoneType && variant) {
    const suffix = variant === "extrovert" ? "e" : "i";
    return { level: "level2", prefix: `${VARIANT_STONE[stoneType]}_${suffix}` };
  }
  if (stage >= 1 && stoneType) {
    return { level: "level1", prefix: stoneType };
  }
  return { level: "level0", prefix: "rockie" };
}

// GIF 파일 경로 조립 (pet/tray 렌더러가 assets에서 같은 깊이라 상대 경로 동일)
function spriteGifUrl(level, prefix, pose) {
  return `../../../assets/gif/${level}/${prefix}_${pose}.gif`;
}
