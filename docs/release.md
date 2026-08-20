# Rockie 배포 준비 체크리스트

이 문서는 Rockie를 포트폴리오 웹사이트에서 직접 다운로드 배포하기 전에 준비해야 할 항목을 정리한다.

기준 배포 방식 (2026-08-06 확정):

- macOS용 앱 파일을 포트폴리오 웹사이트에서 직접 제공
- **App Store 제출은 제외 확정** — 근거는 1.2 참고
- **Windows 버전은 보류** — macOS 배포를 끝낸 뒤 재검토. 근거는 6.3 참고
- 활성 앱/창 제목, idle time, 시스템 상태는 기기 안에서만 처리하는 것을 기본 원칙으로 둠

이 문서에서 Windows 관련 항목은 보류 상태로 남겨둔다. 삭제하지 않고 유지하되, 착수 전까지는 체크 대상이 아니다.

---

## 1. 배포 방식 결정

### 1.1 직접 배포

우선 배포 방식은 포트폴리오 웹사이트 직접 다운로드로 잡는다.

준비 항목:

- macOS용 앱 패키지 생성
- macOS 배포 파일 형식 결정: `.dmg` 권장, 단기 테스트용은 `.zip`도 가능
- 다운로드 페이지 작성
- 설치 안내 작성
- 업데이트 방식 결정
- (보류) Windows용 앱 패키지 생성
- (보류) Windows 배포 파일 형식 결정: 공개 배포는 `.exe` 설치파일, 단기 테스트용은 portable `.zip`도 가능

권장:

- Developer ID 서명과 notarization을 적용한다. 이 앱에서는 사실상 필수에 가깝다(6.2 참고).
- 미서명 앱은 macOS Gatekeeper 경고가 뜨므로 포트폴리오 배포 품질이 떨어진다.
- (보류) Windows는 가능하면 코드 서명 인증서를 적용한다.

### 1.2 App Store 배포 제외 (확정)

Mac App Store는 **App Sandbox가 필수**인데, Rockie의 핵심 기능 대부분이 샌드박스에서 동작하지 않는다.

| 기능 | 코드 | 샌드박스에서 막히는 이유 |
| --- | --- | --- |
| 활성 창 제목 읽기 | `src/main/main.js` (`active-win`) | 다른 앱의 창 정보 조회. 샌드박스 앱에 부여할 entitlement가 없다 |
| Dock 위치/크기 감지 | `src/main/dock-tracker.js` (`osascript` → `System Events`) | Apple Events + 접근성 권한. 샌드박스는 접근성 권한 자체를 금지한다 |
| Dock 설정 읽기 | `src/main/dock-tracker.js` (`defaults read com.apple.dock`) | 컨테이너 밖 preference 읽기 + 시스템 바이너리 실행 |
| 쪽잠 모드 키보드 차단 | `src/main/keyblocker.js` (`KeyBlocker.app` spawn) | 접근성 기반 별도 실행파일 spawn |

`systeminformation`도 내부적으로 셸 명령에 의존하는 항목이 있어 샌드박스에서는 값이 비게 된다.

즉 App Store로 가려면 커서 추종 Dock 회피 · 앱별 말풍선 · 쪽잠 모드 · 시스템 모니터를 전부 들어내야 한다. 남는 기능이 "화면에 GIF를 띄우는 앱" 수준이라 제출 가치가 없다.

**결론: App Store는 제외한다.** 직접 배포에서는 위 API를 그대로 써도 아무 문제가 없으므로, 샌드박스 호환을 위해 코드를 바꿀 필요는 없다.

만약 훗날 기능 축소판을 별도로 내야 할 이유가 생기면 다음 항목이 추가로 필요하다.

- Apple Developer Program 가입
- App Review Guidelines 검토
- App Store Connect 메타데이터 작성
- App Privacy 라벨 작성
- 심사 노트 작성
- 샌드박스/권한/결제 정책 재검토

### 1.3 비용 요약

| 항목 | 비용 | 비고 |
| --- | --- | --- |
| Apple Developer Program | **$99/년** | Developer ID 인증서 발급 조건. 직접 배포에도 필요하다 |
| Developer ID Application 인증서 | 무료 | 위 멤버십에 포함 |
| Notarization | 무료·무제한 | 제출 1건당 보통 5~15분 |
| 배포 호스팅 | 사실상 0원 | 포트폴리오 사이트 또는 GitHub Releases |
| (보류) Windows 코드 서명 | $120~290/년 | 6.3 참고 |

macOS만 서명 포함으로 배포하면 **연 $99**가 전부다.

---

## 2. 웹사이트에 필요한 페이지

포트폴리오 웹사이트에는 최소 다음 페이지나 섹션이 필요하다.

| 페이지 | 필요 내용 |
| --- | --- |
| 소개/다운로드 | 앱 설명, 주요 기능, 스크린샷/GIF, 다운로드 버튼 |
| 설치 안내 | macOS 설치 방법, 처음 실행 시 보안 경고 가능성, 권한 안내 |
| 개인정보처리방침 | 어떤 데이터를 어떤 목적으로 다루는지, 로컬 처리 여부 |
| 이용약관 | 무료 제공 범위, 책임 제한, 금지 행위, 변경/중단 가능성 |
| 오픈소스 라이선스 | Electron 및 npm 패키지, 폰트/이미지 자산 라이선스 |
| 문의 | 이메일 또는 GitHub Issues 등 지원 채널 |

---

## 3. 개인정보와 권한 고지

Rockie는 화면 위에서 사용자 상황에 반응하는 앱이라, 기능 자체는 가볍지만 개인정보 설명은 명확해야 한다.

### 3.1 현재 앱이 다루는 정보

| 정보 | 사용 목적 | 저장 여부 | 서버 전송 |
| --- | --- | --- | --- |
| 사용자 이름 | 메시지 개인화, 호감도 보상 | 로컬 저장 | 없음 |
| 애완돌 이름 | 트레이 UI 표시, 호감도 보상 | 로컬 저장 | 없음 |
| 성향 질문 답변 | 돌 종류/진화 판정 | 로컬 저장 | 없음 |
| 진화/호감도/스킨 상태 | 앱 상태 유지 | 로컬 저장 | 없음 |
| 활성 앱 이름/창 제목 | 앱별 말풍선 표시 | 저장 안 함 | 없음 |
| 현재 시간대 | 시간대별 반응 | 저장 안 함 | 없음 |
| idle time | 장시간 사용 반응 | 저장 안 함 | 없음 |
| CPU/RAM/디스크/배터리/네트워크 상태 | SYSTEM 화면 표시 | 저장 안 함 | 없음 |
| 화면 기록 권한 상태 | 활성 창 감지 가능 여부 안내 | 저장 안 함 | 없음 |
| 앱 버전 · IP 주소 | 자동 업데이트 확인 | 저장 안 함 | **GitHub에 전달됨** |

**2026-08-21 정정**: 위 표는 자동 업데이트 도입 전에 작성돼 "서버 전송 없음"이 전부였다. 지금은 `electron-updater`가 6시간마다 GitHub Releases에 요청을 보내므로, **GitHub 서버에 IP 주소·접속 시각·요청 파일 기록이 남는다.** 개발자가 접근할 수 있는 기록은 아니지만 개인정보처리방침에는 반드시 적어야 한다(작성 완료: `docs/privacy-policy.md` 5항).

### 3.2 개인정보처리방침에 반드시 적을 내용

- 데이터는 기본적으로 사용자의 기기 안에서 처리한다.
- 활성 앱 이름과 창 제목은 말풍선 표시를 위해 일시적으로 읽는다.
- 활성 앱 이름과 창 제목은 저장하지 않고 서버로 보내지 않는다.
- 화면 기록 권한은 macOS에서 활성 창 정보를 읽기 위해 필요하다.
- 권한을 허용하지 않아도 기본 펫 기능은 사용할 수 있다.
- 사용자는 앱 설정의 초기화 기능으로 로컬 데이터를 삭제할 수 있다.
- 현재 광고 SDK, 분석 SDK, 외부 추적 SDK를 사용하지 않는다.

권장 문구:

> Rockie는 활성 앱과 창 제목을 읽어 상황에 맞는 말풍선을 표시할 수 있습니다. 이 정보는 사용자의 기기 안에서만 처리되며 저장되거나 서버로 전송되지 않습니다. 화면 기록 권한을 허용하지 않아도 기본 펫 기능은 사용할 수 있습니다.

### 3.3 민감 영역 처리

현재 앱은 다음과 같은 영역에서 자동 말풍선을 표시하지 않도록 silent 규칙을 둔다.

- 메신저/메일
- 은행/카드/증권/코인
- 병원/정부/민원
- 비밀번호 관리자
- 인증 관련 화면

배포 전 확인:

- 민감 키워드가 충분한지 점검한다.
- 민감 화면에서 창 제목이 로그에 남지 않는지 확인한다.
- 디버그 로그에 활성 창 제목을 출력하지 않는다.

---

## 4. 이용약관 준비

포트폴리오 배포라도 최소한의 이용 조건은 필요하다.

포함할 항목:

- 앱 제공 주체와 연락처
- 앱은 무료/실험적 소프트웨어로 제공된다는 점
- 사용자는 본인 책임으로 앱을 설치하고 사용한다는 점
- 앱 기능이 예고 없이 변경/중단될 수 있다는 점
- 데이터 손실, 시스템 문제 등에 대한 책임 제한
- 앱, 캐릭터, 이미지, 문서의 지적재산권
- 리버스 엔지니어링, 재배포, 악용 금지
- 약관 변경 방식
- 준거법

주의:

- 유료 아이템, 후원, 구독이 들어가면 환불/결제/해지 조항을 별도로 추가해야 한다.
- App Store 배포로 전환하면 Apple 결제 정책도 다시 확인해야 한다.

**(2026-08-21 작성 완료: `docs/terms.md`)**

작성하면서 확정한 것들:

- **후원 조항이 필요했다.** 사이트에 CTEE 후원 링크가 이미 걸려 있어 위 주의 문구에 그대로 해당한다. 결제 조항까지는 아니고 "대가 없는 자발적 지원 · 특전 없음 · 환불은 플랫폼 정책" 세 가지를 11조에 넣었다.
- **저장소를 공개로 두기로 해서 지적재산권 조항이 갈라졌다.** 소스 코드는 MIT, 캐릭터·이미지·"Rockie" 명칭은 권리 유보다. 약관 6조와 `LICENSE`가 같은 내용을 두 번 적는 구조라, 해석이 갈리면 `LICENSE`가 우선한다고 6조 3항에 못박았다.
- **자동 업데이트 조항(7조)을 추가**했다. 예고 없이 기능이 바뀔 수 있다는 근거가 되고, 8조(변경·중단)와 짝을 이룬다.
- 쪽잠 알람은 9조 3항에서 명시적으로 "보조 수단"이라고 적었다. 알람을 믿고 잤다가 놓쳤다는 항의를 받을 수 있는 유일한 기능이다.

---

## 5. 오픈소스와 자산 라이선스

배포 전에 모든 의존성과 자산의 라이선스를 확인한다.

### 5.1 npm 패키지

현재 주요 의존성:

- Electron
- active-win
- systeminformation

**(2026-08-21 완료)** `scripts/gen-notices.js`가 고지 문서를 생성한다.

```bash
npm run notices   # → assets/licenses/THIRD-PARTY-NOTICES.md
```

`npm ls --omit=dev --all --json`으로 실제 배포되는 의존성 트리를 뽑고, 각 패키지 폴더의 LICENSE 파일 **전문을 그대로** 싣는다. 목록만으로는 MIT·BSD·ISC의 "저작권 고지 포함" 조건을 못 채우기 때문이다. Electron 본체(devDependency지만 앱에 통째로 들어간다)와 번들 폰트도 함께 넣는다.

생성 결과(1.0.1 기준): npm 패키지 123개 — MIT 65 · ISC 50 · BSD 3 · Apache-2.0 2 · BlueOak 2 · Python-2.0 1. **전부 허용형이고 카피레프트(GPL 계열)는 없다.** Apache-2.0 패키지에 NOTICE 파일이 없어 추가 의무도 없다. 라이선스 파일 자체를 안 넣고 배포하는 패키지 8개는 SPDX 식별자와 저장소 주소만 표기한다.

**의존성을 추가·갱신하면 다시 돌려야 한다.**

배포물에 싣는 방법은 `package.json`의 `extraResources`다. asar 안에 넣으면 사용자가 열어볼 수 없어 `Contents/Resources/` 바로 아래에 평문으로 둔다.

| 파일 | 크기 | 출처 |
| --- | --- | --- |
| `THIRD-PARTY-NOTICES.md` | 166KB | 생성물 |
| `LICENSES.chromium.html` | 19MB (압축 후 2MB) | `node_modules/electron/dist/` |

Chromium 고지는 electron-builder가 macOS 타깃에서 자동으로 넣어주지 않는다. 실제로 1.0.1 빌드의 `.app` 안에는 **라이선스 파일이 하나도 없었다.** 19MB가 부담스러워 보이지만 zip 압축 후 2MB로, 124MB 산출물 대비 1.6%다.

### 5.2 폰트/이미지/GIF

- `assets/fonts/Galmuri*.woff2` — **외부 자산.** Copyright (c) 2019–2025 Lee Minseo (quiple@quiple.dev), SIL Open Font License 1.1. OFL은 라이선스 사본 동봉을 요구하므로 원문을 `assets/fonts/OFL.txt`에 두고 고지 문서 2항에 실었다.
- `assets/gif/`, `assets/img/`, `assets/tray/`, `assets/icon.png`, `build/icon.icns` — 직접 제작 자산. `LICENSE` 2항에서 MIT 적용 대상에서 제외하고 모든 권리를 유보한다.
- `assets/helper/keyblocker.swift` — 직접 작성한 코드라 MIT 적용 대상이다.

효과음은 파일이 아니라 Web Audio 합성이므로(`src/renderer/shared/sound.js`) 라이선스 대상이 없다.

---

## 6. 기술 배포 준비

### 6.1 패키징

현재 `package.json`에는 실행 스크립트만 있고 배포 빌드 스크립트는 없다.

필요 작업:

- Electron 패키징 도구 선택
- 앱 이름, 아이콘, 번들 ID 설정
- macOS 배포 파일 생성
- 빌드 산출물을 Git에 커밋하지 않도록 정리
- (보류) Windows 배포 파일 생성

후보:

- electron-builder
- electron-forge

서명 여부와 무관하게 패키징 도구 도입은 선행되어야 한다. 서명은 여기에 설정을 얹는 작업이므로 나중에 붙여도 코드 변경은 생기지 않는다.

#### 6.1.1 Rockie는 메뉴바 상주 앱이다 (2026-08-06 확정)

Rockie는 **Dock 아이콘 없이 메뉴바에만 상주하는 앱**으로 배포한다. 진입점은 메뉴바 트레이 아이콘 하나다.

**이건 선택이 아니라 이미 그렇게 동작하고 있다.** 개발 실행 중 LaunchServices에 조회하면 액세서리 앱으로 등록되어 있다.

```
$ lsappinfo list
   bundleID="com.github.Electron"
   pid = 66731  type="UIElement"     ← Dock 아이콘 없음
```

원인은 아래 두 줄이다.

```
src/main/main.js:102   mainWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
src/main/main.js:365   trayPopup.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
```

`visibleOnFullScreen: true`를 주면 앱이 macOS Dock에서 사라지는 **Electron 버그**([electron#26350](https://github.com/electron/electron/issues/26350), Electron 10부터 발생, 미해결)다. `app.dock.show()`로도 복구되지 않는다.

**절대 하지 말 것**: Dock 아이콘을 되살리려고 `visibleOnFullScreen: true`를 제거하는 것. 그러면 **전체화면 앱 위에서 펫과 트레이 팝업이 보이지 않게 된다.** 데스크톱 펫으로서 치명적인 회귀이고, Dock 아이콘 하나와 바꿀 가치가 없다.

**패키징 설정에 반영할 것**:

- `mac.extendInfo.LSUIElement: 1` — 지금은 런타임 부작용으로 숨겨지므로 실행 직후 Dock 아이콘이 잠깐 나타났다 사라진다. Info.plist에 명시하면 처음부터 뜨지 않고, 무엇보다 **의도가 코드에 드러난다.**

**따라오는 성질** (문제가 아니라 알고 있어야 할 사실):

- `/Applications`에 설치하면 **Launchpad에는 표시된다.** LSUIElement 앱도 Launchpad에는 나온다(OneDrive·Spectacle로 실측 확인). Dock에는 고정할 수 없는 비대칭이 생기지만 감수한다.
- Cmd+Tab 목록에 잡히지 않는다.
- `app.on("activate")`는 Dock 클릭으로 발생하지 않는다. Dock 클릭 대응 코드를 넣어도 죽은 코드가 되므로 넣지 않는다.

#### 6.1.2 번들 식별자 (2026-08-06 확정, 이후 변경 금지)

도메인 `jeondowon.com`(Rockie 페이지는 `jeondowon.com/rockie`) 기준으로 확정한다.

| 대상 | 식별자 |
| --- | --- |
| 앱 본체 | `com.jeondowon.rockie` |
| KeyBlocker 헬퍼 | `com.jeondowon.rockie.keyblocker` |

**변경 금지 이유**: macOS는 화면 기록·손쉬운 사용 권한을 `번들 식별자 + 코드 서명` 조합으로 기억한다. 배포 후 이 값을 바꾸면 기존 사용자의 권한이 전부 초기화된다. 서명을 붙이는 목적(6.2.1)이 그대로 무너지므로 배포 전에 확정하고 이후 건드리지 않는다.

헬퍼 식별자가 앱 본체의 하위가 되도록 맞췄다. 반영된 위치는 두 곳뿐이다.

- `assets/helper/KeyBlocker.app/Contents/Info.plist` 의 `CFBundleIdentifier`
- `package.json` 의 `build:helper` 스크립트 `--identifier` 인자

두 값은 항상 같아야 한다. Info.plist만 고치면 서명이 깨지므로(`invalid Info.plist`) 반드시 재서명해야 한다.

`src/main/keyblocker.js`의 `deskpet-keyblocker-`는 임시 디렉터리 이름일 뿐 번들 식별자가 아니다. 바꿀 필요 없다.

**주의**: 식별자를 바꾸면 macOS가 헬퍼를 새 앱으로 인식하므로 **손쉬운 사용 권한을 다시 허용해야 한다.** 시스템 설정에 남은 예전 항목은 지우고 새로 추가한다.

#### 6.1.3 asarUnpack은 파일만 빼고 경로는 안 바꿔준다 (2026-08-06 실측 버그)

`asarUnpack`에 넣으면 파일이 `app.asar.unpacked/`로 빠지지만, **코드가 `__dirname`으로 계산하는 경로는 그대로 `app.asar/` 아래를 가리킨다.** 외부 명령에 그 경로를 넘기면 없는 파일이라 실패한다.

첫 패키징 빌드에서 `keyblocker.js`가 이 문제로 죽었다. `/usr/bin/open`으로 헬퍼를 띄우는데 asar 안쪽 경로를 넘겨서, 청소·쪽잠 모드가 "키보드 차단 준비 중"에서 멈췄다. `spawn` 자체는 성공하므로 `try/catch`에도 안 걸리고, 권한 없음 카드로 넘어가는 분기에도 도달하지 못한다.

해결(적용 완료):

```js
const KEYBLOCKER_APP_PATH = path
  .join(__dirname, "../../assets/helper/KeyBlocker.app")
  .replace(`app.asar${path.sep}`, `app.asar.unpacked${path.sep}`);
```

개발 실행에는 경로에 `app.asar`가 없어 아무 영향이 없다.

**`active-win`은 이 처리가 필요 없다.** `execFile`을 쓰는데, Electron이 asar 경로를 지원하는 유일한 child_process 메서드라 알아서 unpacked로 해결된다. `spawn`·`exec`는 지원되지 않는다.

**앞으로 네이티브 실행파일을 추가하면**: `asarUnpack`에 넣는 것만으로는 부족하다. 그 파일을 **어떤 방법으로 실행하는지** 확인하고, `spawn` 계열이면 위 `.replace()`를 반드시 붙인다.

### 6.2 macOS 서명과 notarization

#### 6.2.1 서명이 필요한 이유

기술적으로 미서명 배포도 가능하지만, 이 앱에서는 두 가지 이유로 사실상 필수다.

**(1) 화면 기록 권한이 업데이트마다 초기화된다 — 결정적**

macOS의 권한 저장소(TCC)는 앱의 코드 서명으로 앱을 식별한다. 미서명이나 ad-hoc 서명은 안정적인 designated requirement가 없어 빌드할 때마다 다른 앱으로 인식된다.

- 버전을 올릴 때마다 사용자가 화면 기록 권한을 다시 허용해야 한다.
- 이전 항목이 남아 권한 요청 창이 아예 뜨지 않는 경우도 있다. 사용자 입장에서는 앱별 말풍선이 고장난 것으로 보인다.
- Developer ID로 서명하면 서명이 고정되어 업데이트를 넘어 권한이 유지된다. 이 문제는 서명 외에 우회 방법이 없다.

**(2) macOS 15(Sequoia)부터 Gatekeeper 우회가 어려워졌다**

기존의 "우클릭 → 열기"가 제거되어, 미서명 앱은 사용자가 다음을 직접 해야 한다.

1. 앱 실행 → 차단 경고
2. 시스템 설정 → 개인정보 보호 및 보안 → 앱 찾기
3. "그래도 열기"
4. 관리자 비밀번호 입력

포트폴리오 방문자에게 요구하기에는 이탈률이 높은 흐름이다.

**선택지 정리**

| 선택 | 비용 | 결과 |
| --- | --- | --- |
| Developer ID 서명 + notarization | $99/년 | 경고 없음, 권한 유지. 정상 앱 |
| 서명만 하고 notarization 생략 | $99/년 | 의미 없음. 공증하지 않으면 동일하게 차단된다 |
| 미서명 / ad-hoc | 0원 | 위 (1)(2)를 모두 감수 |

무료 Apple ID로 발급되는 개발용 인증서는 배포에 사용할 수 없다. 중간 지대가 없다.

**절충안**: 미서명으로 먼저 공개해 반응을 보고, 실사용자가 생기면 그때 결제해도 된다. 전환 시 코드 변경은 없고 빌드 설정만 바뀌지만, 기존 사용자는 권한을 한 번 다시 허용해야 한다.

#### 6.2.2 준비 항목

- Apple Developer 계정 ($99/년)
- Developer ID Application 인증서
- electron-builder 설정: `mac.hardenedRuntime: true`, `mac.notarize: true`, `target: dmg`
- entitlements 파일
  - `com.apple.security.automation.apple-events` — dock-tracker의 `osascript` 호출용
  - Info.plist에 `NSAppleEventsUsageDescription` — 없으면 System Events 호출이 조용히 실패한다
  - Electron 표준 entitlement 세트
- notarization
- stapling (`xcrun stapler staple`) — 오프라인 사용자도 경고 없이 열 수 있다

#### 6.2.3 이 프로젝트 고유의 서명 함정

일반적인 Electron 앱과 달리 네이티브 실행파일이 두 군데 섞여 있어, 여기서 notarization이 실패하기 쉽다.

- **`node_modules/active-win/main`** — Mach-O universal 실행파일. `lib/binding/` 아래에 `.node` 바이너리도 arm64/x64 두 개가 있다. asar에 묶이면 실행되지 않으므로 `asarUnpack`으로 빼고 각각 개별 서명되어야 한다.
- **`assets/helper/KeyBlocker.app`** — `package.json`의 `build:helper` 스크립트는 서명 ID 기본값이 `-`(ad-hoc)이다. 이대로 패키징하면 notarization이 거부된다. 배포 빌드에서는 `KEYBLOCKER_CODESIGN_IDENTITY`에 실제 Developer ID를 넣고, 헬퍼도 Hardened Runtime(`--options runtime`)으로 서명해야 한다.
- **서명 순서** — 중첩 번들은 안쪽부터 서명해야 한다(KeyBlocker.app → Electron Framework → 최상위 `.app`). electron-builder가 대부분 처리하지만, `assets/` 안에 앱 번들이 들어 있는 구조는 비표준이라 수동 확인이 필요하다.

#### 6.2.4 미서명 빌드로 로컬 QA 할 때 (2026-08-06 실측)

`mac.identity: null`로 빌드하면 electron-builder가 **번들 서명을 통째로 건너뛴다.** arm64라서 링커가 붙인 최소 서명만 남는데, 상태가 이렇다.

```
Identifier=Electron            ← 번들 ID가 아님
Signature=adhoc, linker-signed
Info.plist=not bound
Sealed Resources=none
Internal requirements=none     ← 대조 기준 없음
```

`codesign --verify`도 실패한다. 이 상태로 실행하면 **권한 승인이 저장되지 않아 손쉬운 사용 권한 요청 창이 무한 반복된다**(`dock-tracker.js`가 `osascript`를 주기적으로 부르므로 그 주기마다 뜬다).

**`npm run dist`가 빌드 직후 ad-hoc 서명까지 자동으로 한다.**

```
"dist": "electron-builder --mac --dir && codesign --force --deep --sign - dist/mac-arm64/Rockie.app"
```

`--dir`은 dmg를 만들지 않고 `.app`만 빌드해 QA 반복을 빠르게 한다. dmg는 Developer ID 서명을 붙이는 시점에 만든다(그때는 electron-builder가 서명→dmg 순서를 알아서 처리하므로 위 `&& codesign`을 걷어낸다).

이 서명으로 식별자가 Info.plist의 `com.jeondowon.rockie`로 잡히고 Info.plist·리소스가 서명에 묶이면서 권한이 유지된다.

**ad-hoc의 한계**: 코드 해시가 빌드마다 바뀌므로 **재빌드할 때마다 권한을 다시 잡아야 하고, 로그인 항목에 중복 항목이 생긴다.** 실제로 재서명 한 번에 "Rockie" 로그인 항목이 2개가 됐다. 6.2.1에 적은 문제가 그대로 재현된 것이며, Developer ID 서명으로만 해결된다.

**로그인 항목 정리 순서**: `store.js`의 `autoLaunch` 기본값이 `true`라 실행할 때마다 자기를 등록한다. 트레이 설정에서 **자동 실행을 먼저 끄고** → 앱 종료 → 시스템 설정에서 항목 제거. 순서를 지키지 않으면 다시 등록된다.

#### 6.2.5 번들 식별자를 바꾼 뒤 TCC 고아 항목 지우기

식별자를 바꾸면 예전 ID로 남은 권한 기록이 **고아**가 된다. 디스크상의 어떤 앱도 그 ID를 주장하지 않으므로 시스템 설정의 `-` 버튼도, `tccutil`도 지우지 못한다(`-10814 No such bundle identifier`). `-`를 눌러도 삭제 대신 토글이 켜지는 증상이 나온다.

지우려면 **원래 경로에서** 예전 식별자를 잠깐 복원한다. 사본을 만들어 다른 경로에서 시도하면 실패한다.

```bash
H=assets/helper/KeyBlocker.app
LSR=/System/Library/Frameworks/CoreServices.framework/Frameworks/LaunchServices.framework/Support/lsregister

plutil -replace CFBundleIdentifier -string <예전ID> "$H/Contents/Info.plist"
codesign --force --deep --sign - --identifier <예전ID> "$H"
"$LSR" -f "$H"; sleep 2
tccutil reset Accessibility <예전ID>

plutil -replace CFBundleIdentifier -string <새ID> "$H/Contents/Info.plist"
codesign --force --deep --sign - --identifier <새ID> "$H"
"$LSR" -f "$H"
```

배포 후에는 식별자를 바꾸지 않으므로(6.1.2) 사용자 기기에서는 생기지 않는 문제다.

#### 6.2.6 검증

- 새 Mac 또는 깨끗한 사용자 계정에서 다운로드 후 실행 (개발 머신에는 인증서가 이미 있어 경고가 뜨지 않으므로 테스트가 무의미하다)
- `spctl -a -vvv -t install <앱경로>` 로 `accepted` / `Notarized Developer ID` 확인
- Gatekeeper 경고 수준 확인
- 화면 기록 권한 요청 흐름 확인
- 버전을 올려 재빌드한 뒤 화면 기록 권한이 유지되는지 확인

### 6.3 Windows 배포 준비 (보류)

macOS 배포를 완료한 뒤 재검토한다. 아래는 착수 시 참고할 조사 결과다.

Windows 직접 배포에서는 설치 파일 형식과 SmartScreen 경고 대응이 중요하다.

배포 파일 후보:

| 형식 | 장점 | 단점 |
| --- | --- | --- |
| portable `.zip` | 설치 없이 실행 가능, 초기 테스트가 쉬움 | 시작 프로그램 등록/삭제 경험이 약함 |
| NSIS `.exe` 설치파일 | 일반 사용자에게 익숙함, 설치/삭제 흐름 제공 | 빌드 설정과 코드 서명 고려 필요 |
| Microsoft Store | 신뢰도 높음 | 심사/정책/패키징 부담 증가 |

초기 권장:

- 테스트 배포: portable `.zip`
- 공개 배포: NSIS 기반 `.exe` 설치파일

준비 항목:

- Windows 앱 아이콘 확인
- 설치 경로와 사용자 데이터 저장 위치 확인
- 시작 프로그램 등록 방식 확인
- 삭제 시 앱 파일과 사용자 데이터 처리 정책 결정
- Windows Defender SmartScreen 경고 여부 확인
- 코드 서명 인증서 적용 여부 결정

코드 서명:

- 미서명 `.exe`는 SmartScreen에서 "알 수 없는 게시자" 경고가 뜰 수 있다.
- 공개 배포 품질을 높이려면 Windows 코드 서명 인증서를 적용한다.
- 인증서가 있어도 초기에는 평판이 낮아 경고가 남을 수 있으므로 실제 다운로드 테스트가 필요하다.
- 2023년 6월부터 개인키는 하드웨어 토큰 또는 클라우드 HSM에만 보관할 수 있다. 예전처럼 pfx 파일만 구매하는 방식은 불가능하다.
- 2026년 3월 1일부터 코드 서명 인증서 최대 유효기간이 458일로 제한된다. 갱신 주기가 1년 3개월이다.

| 방식 | 비용 | 비고 |
| --- | --- | --- |
| Azure Trusted Signing (현 Azure Artifact Signing) | $9.99/월 ≈ $120/년 | 개인 개발자 가입 가능. 클라우드 서명이라 토큰 관리가 없고 CI 연동이 쉽다. 한국 개인 신원 검증 통과 여부는 착수 시 확인 필요 |
| OV 인증서 (Sectigo/Certum 등) | $200~290/년 + 토큰 | 개인도 발급 가능하나 공증 서류와 물리 토큰 배송이 필요하다 |
| EV 인증서 | $250~690/년 | 지금은 구매할 이유가 없다. 2024년 3월 정책 변경으로 EV의 SmartScreen 즉시 통과 특권이 사라져 OV와 동일하게 다운로드 실적으로 평판이 쌓인다 |
| 서명 안 함 | 0원 | "알 수 없는 게시자" 경고 |

Windows 기능 차이 확인:

- 화면 기록 권한 같은 macOS 권한 흐름은 없다. 트레이의 권한 안내 UI를 플랫폼별로 숨기는 처리가 필요하다.
- 활성 창 감지는 Windows에서 별도 권한 없이 동작할 가능성이 높지만, 보안 프로그램/관리자 권한/가상 데스크톱 환경에서 다르게 동작할 수 있다.
- 투명 오버레이, 클릭 통과, 항상 위 표시, 트레이 아이콘은 Windows에서 별도 QA가 필요하다. 특히 DPI 스케일링에서 좌표가 틀어지는 문제가 잦다.

포팅이 아니라 재작성이 필요한 부분:

- `src/main/dock-tracker.js` — `defaults`, `osascript`가 Windows에 없다. 작업 표시줄 회피로 다시 만들어야 하지만, `screen.getPrimaryDisplay().workArea`로 상당 부분 대체 가능해 오히려 단순해질 여지가 있다.
- `src/main/keyblocker.js` — Swift 헬퍼와 `pkill`이 없다. Windows에서는 저수준 키보드 훅이 필요한데 백신이 키로거로 오탐할 소지가 크다. **Windows판에서는 쪽잠 모드의 키보드 차단을 제외하는 방향을 우선 검토한다.**

착수 순서 권장:

1. macOS 배포를 먼저 마치고 실사용 피드백을 받는다.
2. Windows는 미서명 portable `.zip`으로 내어 다운로드가 실제로 발생하는지 확인한다.
3. 수요가 확인되면 Azure Trusted Signing + NSIS 설치파일로 승격한다.

### 6.4 업데이트 방식 (2026-08-21 자동 업데이트 도입)

`electron-updater`로 자동 업데이트를 붙였다. 배포처는 **GitHub Releases**다.

```json
"mac": { "target": ["dmg", "zip"] },
"publish": { "provider": "github", "owner": "jeondowon", "repo": "rockie" }
```

#### 6.4.1 왜 jeondowon.com 직접 호스팅이 아닌가

처음에는 `generic` 프로바이더로 `jeondowon.com/rockie/updates/`에 두려 했으나 **파일 크기 때문에 바꿨다.**

산출물이 zip·dmg 각각 **약 124MB**인데, jeondowon.com은 Cloudflare 뒤의 정적 사이트다. 정적 호스팅은 대개 파일당 상한이 있고(Cloudflare Pages는 25MB) 대역폭 과금도 붙는다. GitHub Releases는 파일당 2GB에 대역폭 무료라 제약이 없다.

**사용자 경험은 거의 같다.** 다운로드 페이지는 jeondowon.com에 두고 버튼 링크만 GitHub Releases로 보내면 된다.

#### 6.4.2 dmg가 아니라 zip으로 갱신된다

macOS 자동 업데이트는 Squirrel.Mac이 담당하는데 **zip만 받는다.** 그래서 타깃이 두 개다.

| 파일 | 용도 |
| --- | --- |
| `Rockie-<ver>-arm64.dmg` | 사람이 내려받는 용도 |
| `Rockie-<ver>-arm64-mac.zip` | 업데이터 전용. 사람에게 노출하지 않는다 |
| `latest-mac.yml` | 버전·해시 목록. 앱이 이 파일을 읽어 새 버전을 판단한다 |

**세 개를 모두 릴리스에 올려야 한다.** 하나라도 빠지면 기존 사용자가 갱신을 못 받는다.

**dmg를 수동 재서명해도 자동 업데이트는 깨지지 않는다.** `latest-mac.yml`의 `files`에 dmg도 실려서 6.2.4의 재서명 때문에 해시가 어긋나지만, `MacUpdater.js`가 `findFile(files, "zip", ["pkg", "dmg"])`로 **zip만 고르고 dmg를 명시적으로 배제**한다(2026-08-21 코드 확인). zip은 재서명하지 않으므로 해시가 그대로다.

단 **zip은 절대 건드리지 말 것.** 손대면 `latest-mac.yml`을 다시 만들어야 한다.

#### 6.4.3 동작 방식

`src/main/updater.js`:

- 개발 실행에서는 아예 안 돈다(`app.isPackaged` 가드). 검증은 패키징된 앱에서만 가능하다.
- 시작 1분 뒤 + 이후 6시간마다 확인한다. 종일 켜두는 앱이라 시작 시 1회만으로는 재부팅 전까지 갱신을 못 본다.
- 다운로드는 백그라운드 자동. 다 받으면 배너 알림 1회 + 트레이 메뉴에 **"업데이트 설치 후 재시작"** 항목이 뜬다.
- 설치 시점은 사용자가 고른다. Dock 아이콘이 없는 앱이라(6.1.1) 트레이가 유일한 접점이기 때문이다.
- `autoInstallOnAppQuit`은 electron-updater 기본값 `true` 그대로다. 항목을 안 눌러도 앱을 껐다 켜면 적용된다.
- 오프라인·서버 점검은 정상 상태로 보고 조용히 넘긴다(다음 주기에 재시도).

#### 6.4.4 릴리스 절차

```bash
# 1. package.json의 version을 올리고 커밋·푸시
# 2. 아래 한 줄
./scripts/release.sh
```

`scripts/release.sh`가 하는 일:

1. **사전 점검** — 태그 중복, 커밋 안 된 변경, 푸시 안 된 커밋, 공증 프로파일을 먼저 막는다
2. **빌드** — `electron-builder --mac --publish never` (.app 서명·공증·스테이플 + dmg·zip 생성)
3. **dmg 서명·공증·스테이플** — 6.2.4의 3줄. zip은 건드리지 않는다
4. **검증** — `spctl`로 앱과 dmg 둘 다 `Notarized Developer ID` 확인
5. **업로드** — 확인 프롬프트 후 `gh release create`로 3개 파일 공개

빌드 중 업로드하지 않는 이유: `--publish always`는 빌드 직후 올려버려서 **공증 전 dmg가 올라간다.**

`gh` CLI 인증이 필요하다(`repo` 스코프). 공증 프로파일은 `APPLE_KEYCHAIN_PROFILE`로 바꿀 수 있고 기본값은 `rockie`다.

#### 6.4.5 검증

자동 업데이트는 **릴리스 두 번을 거쳐야 검증된다.** 설치된 1.0.0이 새로 올린 1.0.1을 집어오는지 보는 것 외에 방법이 없다.

- [ ] 1.0.0을 `/Applications`에 설치한 상태에서 1.0.1 릴리스
- [ ] 1분 뒤 배너 알림이 뜨는지
- [ ] 트레이 메뉴에 설치 항목이 뜨고 메뉴 창 높이가 맞는지
- [ ] 눌렀을 때 재시작되고 버전이 올라가는지
- [ ] 항목을 누르지 않고 앱을 껐다 켰을 때도 적용되는지

---

## 7. 앱 내부에 추가하면 좋은 항목

배포 전 앱 안에서도 다음 정보를 볼 수 있게 하는 것이 좋다.

- 현재 앱 버전
- 개인정보처리방침 링크
- 이용약관 링크
- 오픈소스 라이선스 링크
- 문의 링크
- 데이터 초기화 버튼
- 화면 기록 권한 설명
- 활성 앱별 말풍선 켜기/끄기 설정

**(2026-08-21 반영 완료)** 트레이 → 설정 맨 아래에 정책 링크 줄(개인정보처리방침 · 이용약관 · 오픈소스 라이선스 · 문의)을 넣고, 하드코딩돼 있던 `Rockie v1`을 `app.getVersion()` 값으로 바꿨다.

배선 메모:

- 주소는 `src/main/main.js`의 `EXTERNAL_LINKS` 한 곳에 모여 있다. 렌더러가 보내는 action 이름이 그대로 이 객체의 키다.
- **배포된 앱은 예전 주소를 계속 연다.** 사이트 경로를 바꾸려면 리다이렉트를 걸어야 한다.
- 버전은 `settings:get` 응답에 `appVersion`으로 얹어 보낸다. 채널을 새로 파지 않으려고 얹은 것이라 저장 데이터가 아니다.
- 버전 표시는 `data-i18n`이 없는 `<span id="app-version">`에 따로 넣는다. `applyStaticI18n`이 `data-i18n-html` 요소의 innerHTML을 통째로 덮어쓰기 때문에, 언어를 바꾸면 지워진다.

현재 이미 있는 항목:

- 화면 기록 권한 상태/설정 열기
- 데이터 초기화
- 앱 버전 표시
- 개인정보처리방침 · 이용약관 · 오픈소스 라이선스 · 문의 링크

추가 고려:

- 앱별 말풍선 비활성화 토글
- 장시간 사용 리액션 비활성화 토글
- 시스템 모니터 표시 비활성화 토글

---

## 8. QA 체크리스트

### 8.1 기능 확인

- 첫 실행 온보딩 완료
- 질문 답변/진화 흐름
- 트레이 메뉴 열기/닫기
- 펫 보이기/숨기기
- 커서 따라오기
- 좌하단/우하단 고정
- 롱프레스 드래그
- Dock 회피
- 시간대별 반응
- 장시간 사용 반응
- 활성 앱별 말풍선
- 민감 앱 silent 처리
- 화면 기록 권한 없음 상태 안내
- 화면 기록 권한 허용 후 앱별 말풍선 동작
- 데이터 초기화

### 8.2 환경 확인

- macOS 최신 버전
- 화면 기록 권한 미허용 상태
- 화면 기록 권한 허용 상태
- 버전 업데이트 후 화면 기록 권한 유지 여부
- 배터리 있는 MacBook
- 배터리 없는 데스크톱 환경
- 다크/라이트 메뉴바 아이콘
- 앱 재시작 후 저장 상태 복원

Windows (보류, 착수 시 확인):

- Windows 10
- Windows 11
- Windows 트레이 아이콘 표시
- Windows 투명 오버레이 클릭 통과
- Windows 항상 위 표시
- Windows 멀티 모니터
- Windows DPI 스케일링 125%, 150%
- Windows 시작 프로그램 등록
- Windows 설치/삭제 흐름
- Windows Defender SmartScreen 경고 여부

### 8.3 배포 파일 확인

- 다운로드 파일명과 버전 명확성
- 압축 해제/DMG 마운트
- 앱 실행 가능 여부
- 앱 아이콘 표시
- 웹사이트 다운로드 링크 정상 작동
- 개인정보처리방침/이용약관 링크 정상 작동
- (보류) Windows `.zip` 압축 해제 또는 `.exe` 설치

---

## 9. 출시 전 최소 완료 기준

포트폴리오 웹사이트에 공개하기 전 최소 기준 (2026-08-21 기준 상태):

| 항목 | 상태 |
| --- | --- |
| 개인정보처리방침 작성 | 완료 (`docs/privacy-policy.md`) |
| 개인정보처리방침 공개 URL | **미완** — `jeondowon.com/rockie/privacy`에 게시 필요 |
| 이용약관 작성 | 완료 (`docs/terms.md`) |
| 이용약관 공개 URL | **미완** — `jeondowon.com/rockie/terms`에 게시 필요 |
| 오픈소스 라이선스 고지 | 완료 (앱에 동봉). 웹 페이지 `…/rockie/licenses`는 미완 |
| 설치/권한 안내 | 부분 — 사이트에 기본 정보만 |
| 앱 패키징 · macOS 실행 파일 | 완료 |
| 화면 기록 권한 없이 기본 기능 동작 | 완료 |
| 민감 화면 말풍선 차단 | 완료 |
| `npm test` 통과 | 완료 |
| 빌드 파일 실행 테스트 | 완료 |

**1.0.1을 이미 배포한 뒤에 문서를 채우는 중이므로, 위 "미완" 세 줄이 실질적인 잔여 작업이다.** 앱 안의 링크는 이 세 주소를 가리키도록 이미 배선돼 있어, 페이지가 없으면 404가 뜬다.

미서명으로 공개할 경우 추가 필수:

- 설치 안내 페이지에 "시스템 설정 → 개인정보 보호 및 보안 → 그래도 열기" 4단계를 스크린샷과 함께 명시
- 업데이트 시 화면 기록 권한을 다시 허용해야 한다는 점을 안내

권장 완료 기준:

- macOS Developer ID 서명
- macOS notarization
- 앱 내부에 정책/문의 링크 추가
- 앱별 말풍선 토글 추가
- 릴리즈 노트 작성
- (보류) Windows 실행 파일 생성 및 코드 서명

---

## 10. 후속 문서로 분리할 항목

필요하면 다음 문서는 별도로 작성한다.

- ~~`privacy-policy.md`: 개인정보처리방침 초안~~ → `docs/privacy-policy.md` (2026-08-21 작성)
- ~~`terms.md`: 이용약관 초안~~ → `docs/terms.md` (2026-08-21 작성)
- ~~`third-party-notices.md`: 오픈소스 라이선스 고지~~ → `assets/licenses/THIRD-PARTY-NOTICES.md` (2026-08-21, `npm run notices`로 생성). `docs/`가 아닌 `assets/`에 두는 이유는 배포물에 실려 나가야 하기 때문이다.
- `install.md`: 사용자용 설치/권한 안내 — 미작성
- `release-notes.md`: 버전별 변경사항 — 미작성. 현재 GitHub 릴리스 본문이 `Full Changelog` 한 줄뿐이다.
