// 라인 아이콘 SVG (pet/tray 렌더러 공용).
// 각 렌더러 HTML에서 본 스크립트(pet.js/tray.js)보다 먼저 로드한다.
// 펫 옵션창 행 아이콘과 트레이 모드 배너 아이콘이 같은 그림을 쓰므로 여기서 한 번만 정의한다.

const ICON_KEYBOARD =
  '<rect x="2" y="5" width="20" height="14" rx="2" />' +
  '<path d="M6 9h.01M10 9h.01M14 9h.01M18 9h.01M6 13h.01M18 13h.01M9 13h6" />';
const ICON_TARGET =
  '<circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" />' +
  '<circle cx="12" cy="12" r="1" />';
const ICON_MOON = '<path d="M12 3a6.5 6.5 0 0 0 9 9 9 9 0 1 1-9-9z" />';
const ICON_EYE =
  '<path d="M2 12s3.5-6.5 10-6.5S22 12 22 12s-3.5 6.5-10 6.5S2 12 2 12z" />' +
  '<circle cx="12" cy="12" r="2.5" />';

// 아이콘 path들을 공통 스타일의 <svg>로 감싼다 (트레이 sys-glyph와 같은 라인 규칙).
function svgIcon(paths) {
  return (
    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" ` +
    `stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${paths}</svg>`
  );
}
