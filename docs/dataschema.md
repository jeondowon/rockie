# Rockie — 애완돌 데이터 스키마

`src/main/store.js`의 `defaultData()`가 이 스키마의 **정본**이다. 이 문서는 그 구조를
읽기 좋게 옮기고 각 필드의 용도를 설명한다. 코드와 어긋나면 코드가 맞다.

- 저장 위치: `~/Library/Application Support/Rockie/petdata.json` (단일 JSON 파일)
- 사용자 계정 개념이 없는 로컬 앱이라 전체를 하나의 루트 객체로 관리한다.
- 저장은 임시 파일에 쓴 뒤 `rename`으로 바꿔치기한다(원자적). 읽다가 실패하면 원본을
  `petdata.corrupt-<타임스탬프>.json`으로 옮겨 보존하고 기본값으로 시작한다.
- **기본값에는 실제로 읽고 쓰는 필드만 둔다.** `load()`가 저장 파일에 없는 섹션·필드를
  `defaultData()`에서 한 단계 깊이까지 백필하므로, 기능이 생길 때 여기 줄을 추가하기만
  하면 기존 사용자 파일에도 자동으로 채워진다. 미리 자리를 잡아둘 이유가 없다.
- 반대로 스키마에서 빠진 옛 필드(`pendingQuestionId` 등)는 파일에 남아 있어도 아무도
  읽지 않으므로 굳이 지우지 않는다.

## 1. 전체 구조 (JSON)

```json
{
  "user": {
    "userName": null,
    "userNameSetAt": null,
    "installedAt": "2026-07-06T00:00:00.000Z",
    "modeHintSeenAt": null
  },

  "onboarding": {
    "completed": false,
    "step": 0,
    "completedAt": null
  },

  "pet": {
    "petName": null,
    "petNameSetAt": null,
    "stoneType": null,
    "stoneConfirmedAt": null,
    "evolutionStage": 0,
    "evolutionVariant": null,
    "pendingEvolution": null,
    "presentedEvolutionStages": [],
    "activeSkinStage": null
  },

  "traits": {
    "traitScores": {
      "화강암": 0,
      "현무암": 0,
      "대리석": 0,
      "편마암": 0
    },
    "eiScores": {
      "외향": 0,
      "내향": 0
    },
    "tiebreaker": {
      "used": false,
      "pairsAsked": []
    }
  },

  "questions": {
    "mainQuestionProgress": 0,
    "eiQuestionProgress": 0,
    "todaysQuestions": [],
    "dailyResetAt": null,
    "answeredQuestions": [
      {
        "questionId": "main_01",
        "category": "계획/실행",
        "selectedOption": "granite",
        "answeredAt": "2026-07-07T09:12:00.000Z"
      }
    ]
  },

  "affinity": {
    "affinityPoints": 0,
    "dailyCleanDone": false,
    "dailyPetDone": false
  },

  "notifications": {
    "hasUnreadBadge": false,
    "notificationsEnabled": true
  },

  "settings": {
    "autoLaunch": true,
    "soundEnabled": true,
    "hideFromCapture": false,
    "petPlacement": "follow",
    "petSize": "medium",
    "focusMinutes": 25,
    "napMinutes": 20,
    "language": "ko"
  }
}
```

## 2. 섹션별 필드 설명

### 2.1 `user` — 사용자 기본 정보

| 필드            | 타입                 | 기본값    | 설명                                                                 |
| --------------- | -------------------- | --------- | -------------------------------------------------------------------- |
| `userName`      | string \| null       | `null`    | 설정에서 지정하는 사용자 이름. 미설정 시 기본 호칭("주인님") 사용     |
| `userNameSetAt` | ISO datetime \| null | `null`    | 최초 설정 시각. 호감도 중복 지급 방지 플래그로 사용                  |
| `installedAt`   | ISO datetime         | 설치 시각 | 첫 실행 시점 기록                                                    |
| `modeHintSeenAt` | ISO datetime \| null | `null`   | 더블클릭 모드 안내를 띄운 시각. null이면 첫 클릭 때 안내를 한 번 표시 |

### 2.2 `onboarding` — 첫 실행 프롤로그 진행 상태

| 필드          | 타입                 | 기본값  | 설명                                                                            |
| ------------- | -------------------- | ------- | -------------------------------------------------------------------------------- |
| `completed`   | boolean              | `false` | 온보딩 완료 여부. `false`면 트레이가 프롤로그 화면으로 열리고 펫 창은 잠긴다     |
| `step`        | int                  | `0`     | 프롤로그 진행 인덱스. **앞으로만 간다**(`setOnboardingStep`이 되돌리지 않는다)   |
| `completedAt` | ISO datetime \| null | `null`  | 완료 시각                                                                        |

`load()`에는 **기존 사용자 구제 로직**이 있다. 온보딩 도입 전부터 키우던 사용자
(`completed:false`인데 진화 단계나 답변 기록이 이미 있는 경우)는 온보딩을 완료 처리해
프롤로그를 다시 보지 않게 한다. 단 `step > 0`(온보딩 진행 중)이면 제외한다 — 권한 화면에서
앱이 재시작되는 경로가 있어 로드가 두 번 이상 일어나기 때문이다. `test/store.test.js`가 이
두 갈래를 고정하고 있다.

### 2.3 `pet` — 캐릭터 기본 상태

| 필드               | 타입                 | 기본값      | 설명                                                                                                                               |
| ------------------ | -------------------- | ----------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `petName`          | string \| null       | `null`      | 애완돌 지정 이름. 미설정 시 "애완돌" 등 일반 명사 사용                                                                             |
| `petNameSetAt`     | ISO datetime \| null | `null`      | 최초 설정 시각. 호감도 중복 지급 방지 플래그                                                                                       |
| `stoneType`        | enum \| null         | `null`      | `granite`(화강암) / `basalt`(현무암) / `marble`(대리석) / `gneiss`(편마암)                                                         |
| `stoneConfirmedAt` | ISO datetime \| null | `null`      | 돌 종류 확정 시각                                                                                                                  |
| `evolutionStage`   | int (0~3)            | `0`         | 현재 진화 단계. 역행하지 않는다                                                                                                    |
| `evolutionVariant` | enum \| null         | `null`      | `extrovert`(외향) / `introvert`(내향). 1→2 확정 시점에 값이 채워짐                                                                 |
| `pendingEvolution` | object \| null       | `null`      | 진화 판정은 끝났지만 카드 연출이 아직 안 끝난 상태. 아래 형태를 저장한다                                                           |
| `presentedEvolutionStages` | array        | `[]`        | 카드 연출까지 완료한 진화 단계 목록. pending 연출 중복 방지용 기록                                                                 |
| `activeSkinStage`  | int \| null          | `null`      | 스킨으로 표시 중인 과거 단계. `null`이면 실제 `evolutionStage`를 표시한다. **현재 단계보다 낮은 값만** 저장된다(`setActiveSkin`)    |

`pendingEvolution`의 형태:

```json
{
  "stage": 1,
  "from": { "stage": 0, "stoneType": null, "variant": null },
  "to":   { "stage": 1, "stoneType": "granite", "variant": null },
  "createdAt": "2026-07-07T09:12:00.000Z"
}
```

- `from`은 진화 **직전** 모습이다. 카드가 뜨기 전까지 펫 창과 트레이는 이 값을 그린다.
- 연속 진화(2→3이 곧바로 걸리는 경우) 시 `from`은 처음 값을 유지하고 `to`만 갱신된다.
- 진화가 걸리는 순간 `activeSkinStage`는 `null`로 초기화된다 — 스킨 단계가 남아 있으면
  카드가 공개할 모습과 어긋나기 때문이다.

### 2.4 `traits` — 성향 판정 데이터

| 필드                    | 타입    | 기본값  | 설명                                                                        |
| ----------------------- | ------- | ------- | --------------------------------------------------------------------------- |
| `traitScores`           | object  | 전부 0  | 온보딩·본 질문 답변 누적 점수. 4개 돌 종류별 카운트. **키는 한글 고정**이며 표시 언어와 무관하다 |
| `eiScores`              | object  | 전부 0  | E/I 질문(외향/내향) 누적 점수. 키는 `외향`/`내향` 고정                       |
| `tiebreaker.used`       | boolean | `false` | 타이브레이커 질문이 한 번이라도 사용됐는지                                  |
| `tiebreaker.pairsAsked` | array   | `[]`    | 이미 사용된 타이브레이커 쌍 기록 (예: `["granite_basalt"]`), 중복 질문 방지 |

### 2.5 `questions` — 질문 진행 상태

| 필드                   | 타입                 | 기본값 | 설명                                                                         |
| ---------------------- | -------------------- | ------ | ---------------------------------------------------------------------------- |
| `mainQuestionProgress` | int                  | `0`    | 본 질문 12개 중 완료한 개수. 12에 도달하면 0→1 원석 판정                     |
| `eiQuestionProgress`   | int                  | `0`    | E/I 질문 6개 중 완료한 개수. 6에 도달하면 1→2 변성체 판정                    |
| `todaysQuestions`      | array\<string>       | `[]`   | 오늘 답할 질문 ID 목록. 오전 8시 갱신 때 미답분을 유지하고 부족분만 채운다   |
| `dailyResetAt`         | ISO datetime \| null | `null` | 마지막 일일 갱신 시각. 오전 8시 경계를 넘었는지 판단하는 기준                |
| `answeredQuestions`    | array                | `[]`   | 응답 로그. 각 항목: `questionId`, `category`, `selectedOption`, `answeredAt` |

`answeredQuestions`는 트레이 PET 화면의 답변 히스토리와 성향 태그 계산에 함께 쓰인다.
온보딩 질문 답변도 여기에 쌓인다(단 `mainQuestionProgress`는 올리지 않는다).

### 2.6 `affinity` — 호감도(관계) 트랙

| 필드               | 타입    | 기본값  | 설명                                          |
| ------------------ | ------- | ------- | --------------------------------------------- |
| `affinityPoints`   | int     | `0`     | 누적 호감도 포인트 (**상한 100**). 레벨(낯가림~각별, 균등 20점 5구간)은 저장하지 않고 `tray-pet.js`에서 파생 |
| `dailyCleanDone`   | boolean | `false` | 오늘 닦아주기를 했는지 (하루 1회 제한). 오전 8시 갱신 때 리셋 |
| `dailyPetDone`     | boolean | `false` | 오늘 쓰다듬기를 했는지 (하루 1회 제한). 오전 8시 갱신 때 리셋 |

### 2.7 `notifications` — 알림/UI 상태

| 필드                   | 타입    | 기본값  | 설명                                      |
| ---------------------- | ------- | ------- | ----------------------------------------- |
| `hasUnreadBadge`       | boolean | `false` | 트레이 메뉴 "안 읽은 질문" 배지 표시 여부. 2단계 이상이면 질문이 끝나므로 항상 `false` |
| `notificationsEnabled` | boolean | `true`  | 새 질문 시 OS **배너 알림** on/off (트레이 배지 표시와 무관) |

### 2.8 `settings` — 앱 설정 (트레이 "설정" 화면)

| 필드              | 타입    | 기본값     | 설명                                                                          |
| ----------------- | ------- | ---------- | ----------------------------------------------------------------------------- |
| `autoLaunch`      | boolean | `true`     | 로그인 시 자동 실행. `app.setLoginItemSettings({openAtLogin})`와 동기화        |
| `soundEnabled`    | boolean | `true`     | 효과음 on/off. 펫 렌더러가 Web Audio로 클릭·돌보기·진화 시 8비트풍 효과음 재생. **쪽잠 알람은 이 설정과 무관하게 울린다** |
| `hideFromCapture` | boolean | `false`    | 켜면 펫 창을 `setContentProtection`으로 캡처 대상에서 제외 — 스크린샷·화면 녹화·화면 공유에 애완돌이 안 찍힌다(내 모니터에는 그대로 보임) |
| `petPlacement`    | enum    | `"follow"` | `follow`(커서 따라오기) / `bottom-left`(좌하단 고정) / `bottom-right`(우하단 고정) |
| `petSize`         | enum    | `"medium"` | `small` / `medium` / `large`                                                  |
| `focusMinutes`    | int     | `25`       | 집중 모드 길이(분). 설정 화면의 칩 4개(15/25/45/60)로 고른다                  |
| `napMinutes`      | int     | `20`       | 쪽잠 모드 길이(분). 설정 화면의 슬라이더로 고른다(10분 배수에 자석 스냅)      |
| `language`        | enum    | `"ko"`     | 표시 언어 `ko` / `en`. **저장 데이터의 키는 언어와 무관하게 유지된다**(`traitScores`가 한글 키인 이유) |

`settings:get` 응답에는 저장 필드가 아닌 `appVersion`(`app.getVersion()`)이 함께 실려 온다.
설정 화면 하단의 버전 표시용이며 파일에 저장되지 않는다.

## 3. 이름 설정 시 호감도 지급 로직 (의사코드)

```
function setUserName(newName):
    trimmed = newName.trim()
    if trimmed == "":
        return  // 공백은 미설정으로 처리, 저장하지 않음

    isFirstTime = (user.userNameSetAt == null)
    user.userName = trimmed

    if isFirstTime:
        user.userNameSetAt = now()
        affinity.affinityPoints = min(100, affinity.affinityPoints + NAME_SET_BONUS)

// petName도 동일한 구조로 별도 처리 (각각 1회씩 독립 지급)
// NAME_SET_BONUS = 5, 상한 100. 구현: main.js `evolution:set-name` + `awardAffinity()`
```

## 4. 채팅 기록 관리 방식 (최근 대화 유지 + 주기적 요약) — **보류 설계**

> 채팅 기능은 보류 상태이고, `chat` 섹션은 §1 스키마에서 제외돼 있습니다. 아래는 기능을 시작할 때
> 되살릴 설계안입니다. `store.load()`가 신규 섹션을 자동 백필하므로, 그때 `defaultData()`에
> `chat`을 다시 추가하기만 하면 기존 사용자 파일에도 채워집니다.

벡터 DB 없이도 충분한 규모라, 아래 두 가지를 조합해 채팅 기록을 관리합니다.

4.1 **최근 대화만 유지**: `recentChatContext`에 최근 6~10턴만 보관하고, 그 이전 메시지는 순차적으로 밀어냅니다. 모델 호출 시 이 배열만 컨텍스트로 전달합니다.

4.2 **주기적 요약 압축**: `turnsSinceLastSummary`가 임계값(예: 20턴)에 도달하면, 밀려날 예정인 오래된 메시지들을 로컬 모델에게 3줄 내외로 요약시켜 `chatSummary`에 이어붙이고, 원본 메시지는 버립니다. 이후 모델 호출 시 `chatSummary` + `recentChatContext`를 함께 전달해서, 오래된 맥락은 요약본으로만 가볍게 유지합니다.

의사코드:

```
function onNewChatTurn(message):
    recentChatContext.push(message)
    turnsSinceLastSummary += 1

    if recentChatContext.length > MAX_RECENT_TURNS:
        overflow = recentChatContext.splice(0, recentChatContext.length - MAX_RECENT_TURNS)
        # overflow는 아직 요약 대상 큐에 쌓아둠

    if turnsSinceLastSummary >= SUMMARY_THRESHOLD:
        newSummary = localModel.summarize(chatSummary, overflowQueue)
        chatSummary = newSummary
        overflowQueue.clear()
        turnsSinceLastSummary = 0

function buildModelContext():
    return [
        systemPrompt(stoneType 기반 말투 지침),
        chatSummary ? {role: "system", content: "이전 대화 요약: " + chatSummary} : null,
        ...recentChatContext
    ].filter(not null)
```

- `MAX_RECENT_TURNS`: 6~10 정도 권장
- `SUMMARY_THRESHOLD`: 20턴 정도 권장 (너무 잦으면 요약 호출 비용, 너무 뜸하면 컨텍스트 과다)
- 이 방식은 원본 대화를 그대로 쌓는 것보다 저장 용량이 실제로 줄어들고(요약본만 남음), 별도 임베딩 모델이나 벡터 인덱스 없이 구현 가능합니다.

## 5. 참고

- 외부 저장 라이브러리는 쓰지 않는다. `store.js`가 `fs`로 직접 읽고 쓰는 JSON 파일 하나뿐이다.
- `answeredQuestions`는 계속 늘어나는 유일한 배열이지만, 답할 수 있는 질문이 총 22개(+타이브레이커 7개)로 상한이 있어 용량 관리가 필요 없다. 채팅을 시작하면 `recentChatContext`는 사정이 다르므로 그때 상한을 둔다.
- "처음부터 다시 키우기"(`reset()`)는 파일을 지우지 않고 `defaultData()`로 덮어쓴 뒤 저장한다.
