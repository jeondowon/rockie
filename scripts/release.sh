#!/usr/bin/env bash
#
# Rockie 릴리스. 빌드 → dmg 서명·공증 → 검증 → GitHub Releases 업로드까지 한 번에 한다.
#
#   1. package.json의 version을 올리고 커밋·푸시한다
#   2. ./scripts/release.sh
#
# 자동 업데이트는 GitHub Releases에 올라간 latest-mac.yml과 zip을 읽는다.
# 셋 중 하나라도 빠지면 기존 사용자가 새 버전을 못 받는다.
set -euo pipefail
cd "$(dirname "$0")/.."

IDENTITY="Developer ID Application: DOWON JEON (6BZLQ5S936)"
PROFILE="${APPLE_KEYCHAIN_PROFILE:-rockie}"

VERSION=$(node -p "require('./package.json').version")
TAG="v$VERSION"
DMG="dist/Rockie-$VERSION-arm64.dmg"
ZIP="dist/Rockie-$VERSION-arm64-mac.zip"
YML="dist/latest-mac.yml"

step() { printf '\n\033[1m▶ %s\033[0m\n' "$1"; }

# ---------- 0. 사전 점검 (돌리기 전에 막을 수 있는 것들) ----------
step "사전 점검"

if gh release view "$TAG" >/dev/null 2>&1; then
  echo "✗ $TAG 릴리스가 이미 있습니다. package.json의 version을 올리세요."
  exit 1
fi

if [ -n "$(git status --porcelain)" ]; then
  echo "✗ 커밋되지 않은 변경이 있습니다. 릴리스는 커밋된 상태에서만 하세요."
  exit 1
fi

if ! git merge-base --is-ancestor HEAD "origin/$(git branch --show-current)" 2>/dev/null; then
  echo "✗ 현재 커밋이 원격에 없습니다. git push 먼저 하세요."
  exit 1
fi

# 의존성을 바꾸고 npm run notices를 잊으면 실제 배포물과 라이선스 고지가 어긋난다.
# 위에서 작업 트리가 깨끗한 것을 확인했으므로, 다시 만들어 달라지면 오래된 것이다.
npm run --silent notices >/dev/null
if [ -n "$(git status --porcelain assets/licenses/)" ]; then
  echo "✗ 오픈소스 라이선스 고지가 의존성과 어긋납니다. 방금 갱신했으니 커밋 후 다시 실행하세요."
  exit 1
fi

# 릴리스 본문은 docs/release-notes.md에서 이번 버전 절만 잘라 쓴다.
# 절이 없으면 본문이 빈 채로 공개되므로 여기서 막는다.
NOTES=$(mktemp)
trap 'rm -f "$NOTES"' EXIT
awk -v v="## $VERSION" '$0 == v {found=1; next} found && /^## / {exit} found' \
  docs/release-notes.md > "$NOTES"
if [ ! -s "$NOTES" ]; then
  echo "✗ docs/release-notes.md에 '## $VERSION' 절이 없습니다."
  exit 1
fi

xcrun notarytool history --keychain-profile "$PROFILE" >/dev/null
echo "✓ $TAG / 공증 프로파일 $PROFILE / 작업 트리 깨끗함 / 라이선스 고지 최신 / 릴리스 노트 있음"

# ---------- 1. 빌드 ----------
# electron-builder가 .app을 서명·공증·스테이플하고 dmg와 zip을 만든다.
# 업로드는 여기서 하지 않는다. dmg 공증이 아직 안 끝났기 때문이다.
step "빌드 (5~15분, 공증 대기 포함)"
APPLE_KEYCHAIN_PROFILE="$PROFILE" npx electron-builder --mac --publish never

# ---------- 2. dmg 서명·공증·스테이플 ----------
# electron-builder는 .app만 공증한다. dmg는 서명조차 안 붙는다.
# 서명을 건너뛰고 공증만 하면 stapler는 통과하는데 Gatekeeper가 거부하므로 순서를 지킨다.
# zip은 건드리지 않는다 — 손대면 latest-mac.yml의 해시가 어긋나 자동 업데이트가 깨진다.
step "dmg 서명·공증·스테이플 (5~15분)"
codesign --force --timestamp --sign "$IDENTITY" "$DMG"
xcrun notarytool submit "$DMG" --keychain-profile "$PROFILE" --wait
xcrun stapler staple "$DMG"

# ---------- 3. 검증 ----------
step "검증"
spctl -a -vvv -t install dist/mac-arm64/Rockie.app
spctl -a -vvv -t open --context context:primary-signature "$DMG"
for f in "$DMG" "$ZIP" "$YML"; do
  [ -f "$f" ] || { echo "✗ $f 가 없습니다"; exit 1; }
done
echo "✓ 앱·dmg 모두 Notarized Developer ID"

# ---------- 4. 업로드 ----------
# 여기서부터는 공개된다. 되돌리려면 GitHub에서 릴리스를 지워야 한다.
step "GitHub Releases 업로드"
echo "  $TAG 로 아래 3개를 공개 업로드합니다."
printf '    %s\n' "$DMG" "$ZIP" "$YML"
read -r -p "  진행할까요? [y/N] " reply
[ "$reply" = "y" ] || { echo "취소했습니다. 빌드 산출물은 dist/에 그대로 있습니다."; exit 0; }

gh release create "$TAG" \
  --title "Rockie $VERSION" \
  --target "$(git rev-parse HEAD)" \
  --notes-file "$NOTES" \
  "$DMG" "$ZIP" "$YML"

step "완료"
echo "기존 사용자는 앱 시작 1분 뒤 또는 6시간 주기 확인 때 $VERSION 을 받는다."
echo
echo "새로 받는 사람을 위해 PortFolioWeb의 다운로드 버튼 URL도 바꿔야 한다."
echo "  한국어: public/rockie/index.html    (DOWNLOAD 섹션의 macOS 버튼)"
echo "  영문:   public/rockie/en/index.html (같은 자리에 같은 링크가 하나 더 있다)"
echo "  새 URL: https://github.com/jeondowon/rockie/releases/download/$TAG/Rockie-$VERSION-arm64.dmg"
