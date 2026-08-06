// 메뉴바(트레이) 아이콘 만들기.
// assets/tray의 PNG 한 장을 트레이용 nativeImage로 만든다.
// Retina(2x) 대응: 표시 크기는 TRAY_ICON_PT(pt)로 유지하되 1x/2x를 함께 담아 고밀도에서 안 흐리게.
// 맥: 템플릿 이미지는 다크/라이트 메뉴바에 맞춰 자동 반전(단색). 컬러 배지 아이콘은 비-템플릿이어야 한다.
const { nativeImage } = require("electron");
const path = require("path");

// 메뉴바에 표시될 논리 높이(pt). 이 크기로 보이되 Retina에선 2배 해상도로 렌더된다.
const TRAY_ICON_PT = 15;

// 이미지 주위의 투명 여백을 잘라내 실제 그림이 프레임에 꽉 차게 만든다.
// (template.png는 캔버스 중앙에 캐릭터만 있고 둘레가 투명이라, 그대로 축소하면
//  메뉴바에서 아주 작게 보인다)
function trimTransparent(image) {
  const { width, height } = image.getSize();
  const bmp = image.toBitmap(); // 픽셀당 4바이트, 알파는 마지막 바이트
  let minX = width,
    minY = height,
    maxX = -1,
    maxY = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const alpha = bmp[(y * width + x) * 4 + 3];
      if (alpha > 10) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < 0) return image; // 전부 투명하면 원본 그대로
  return image.crop({
    x: minX,
    y: minY,
    width: maxX - minX + 1,
    height: maxY - minY + 1,
  });
}

// 원본 PNG(320×320) 읽기 + 전 픽셀 알파 스캔 + 2회 리사이즈·PNG 인코딩은 꽤 무거운데,
// 결과는 파일마다 고정이다. 배지가 켜지고 꺼질 때마다 다시 만들지 않도록 캐시한다.
const trayIconCache = new Map();

function makeTrayIcon(fileName, isTemplate) {
  const cached = trayIconCache.get(fileName);
  if (cached) return cached;

  let src = nativeImage.createFromPath(
    path.join(__dirname, "../../assets/tray", fileName),
  );
  src = trimTransparent(src); // 투명 여백 제거 → 그림이 꽉 참
  const icon = nativeImage.createEmpty();
  icon.addRepresentation({
    scaleFactor: 1,
    buffer: src.resize({ height: TRAY_ICON_PT, quality: "best" }).toPNG(),
  });
  icon.addRepresentation({
    scaleFactor: 2,
    buffer: src.resize({ height: TRAY_ICON_PT * 2, quality: "best" }).toPNG(),
  });
  if (process.platform === "darwin") icon.setTemplateImage(isTemplate);
  trayIconCache.set(fileName, icon);
  return icon;
}

module.exports = { makeTrayIcon };
