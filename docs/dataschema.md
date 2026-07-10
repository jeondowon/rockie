# deskPet — 애완돌 데이터 스키마

로컬 파일(JSON 또는 electron-store) 기준으로 설계한 저장 스키마입니다.
사용자 계정 개념이 없는 로컬 앱이므로, 전체를 하나의 루트 객체로 관리합니다.

## 1. 전체 구조 (JSON)

```json
{
  "user": {
    "userName": null,
    "userNameSetAt": null,
    "installedAt": "2026-07-06T00:00:00.000Z"
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
    "equippedSkin": "default"
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
    "postConfirmQuestionCount": 0,
    "pendingQuestionId": null,
    "nextQuestionDueAt": null,
    "answeredQuestions": [
      {
        "questionId": "main_01",
        "category": "가치관",
        "selectedOption": "granite",
        "answeredAt": "2026-07-07T09:12:00.000Z"
      }
    ],
    "skippedQuestions": {
      "main_03": 1
    }
  },

  "affinity": {
    "affinityPoints": 0,
    "dailyChatCount": 0,
    "dailyInteractionCount": 0,
    "lastChatAt": null,
    "lastInteractionAt": null,
    "dailyCounterResetAt": "2026-07-06T00:00:00.000Z"
  },

  "items": {
    "unlockedItems": [],
    "equippedItem": null
  },

  "notifications": {
    "hasUnreadBadge": false,
    "notificationsEnabled": true
  },

  "chat": {
    "recentChatContext": [],
    "chatSummary": null,
    "turnsSinceLastSummary": 0
  },

  "settings": {
    "autoLaunch": false,
    "soundEnabled": false,
    "petPlacement": "follow",
    "petSize": "medium"
  }
}
```

## 2. 섹션별 필드 설명

### 2.1 `user` — 사용자 기본 정보

| 필드            | 타입                 | 기본값    | 설명                                                                 |
| --------------- | -------------------- | --------- | -------------------------------------------------------------------- |
| `userName`      | string \| null       | `null`    | 설정에서 지정하는 사용자 이름. 미설정 시 기본 호칭("대장님" 등) 사용 |
| `userNameSetAt` | ISO datetime \| null | `null`    | 최초 설정 시각. 호감도 중복 지급 방지 플래그로 사용                  |
| `installedAt`   | ISO datetime         | 설치 시각 | 초반 하루 간격 질문 타이밍 계산 기준                                 |

### 2.2 `pet` — 캐릭터 기본 상태

| 필드               | 타입                 | 기본값      | 설명                                                                                                                               |
| ------------------ | -------------------- | ----------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `petName`          | string \| null       | `null`      | 애완돌 지정 이름. 미설정 시 "애완돌" 등 일반 명사 사용                                                                             |
| `petNameSetAt`     | ISO datetime \| null | `null`      | 최초 설정 시각. 호감도 중복 지급 방지 플래그                                                                                       |
| `stoneType`        | enum \| null         | `null`      | `granite`(화강암) / `basalt`(현무암) / `marble`(대리석) / `gneiss`(편마암)                                                         |
| `stoneConfirmedAt` | ISO datetime \| null | `null`      | 돌 종류 확정 시각. 이후 단계 전환의 시간 조건 기준                                                                                 |
| `evolutionStage`   | int (0~3)            | `0`         | 현재 진화 단계                                                                                                                     |
| `evolutionVariant` | enum \| null         | `null`      | `extrovert`(외향) / `introvert`(내향). 1→2 확정 시점에 값이 채워짐                                                               |
| `pendingEvolution` | object \| null       | `null`      | 진화 판정은 끝났지만 카드 연출이 아직 완료되지 않은 상태. `from`/`to` 스냅샷과 대상 `stage`를 저장                                 |
| `presentedEvolutionStages` | array      | `[]`        | 카드 연출까지 완료한 진화 단계 목록. pending 연출 중복 방지용 기록                                                               |
| `equippedSkin`     | string               | `"default"` | 사용자가 "나의 애완돌" 메뉴에서 선택한 표시용 스킨 ID. `evolutionStage`와 독립적으로 관리되며, 도달한 단계 범위 내에서만 선택 가능 |

### 2.3 `traits` — 성향 판정 데이터

| 필드                    | 타입    | 기본값  | 설명                                                                        |
| ----------------------- | ------- | ------- | --------------------------------------------------------------------------- |
| `traitScores`           | object  | 전부 0  | 본 질문 답변 누적 점수. 4개 돌 종류별 카운트                                |
| `eiScores`              | object  | 전부 0  | 보조 질문(외향/내향) 누적 점수                                              |
| `tiebreaker.used`       | boolean | `false` | 타이브레이커 질문이 한 번이라도 사용됐는지                                  |
| `tiebreaker.pairsAsked` | array   | `[]`    | 이미 사용된 타이브레이커 쌍 기록 (예: `["granite_basalt"]`), 중복 질문 방지 |

### 2.4 `questions` — 질문 진행 상태

| 필드                       | 타입                 | 기본값 | 설명                                                                         |
| -------------------------- | -------------------- | ------ | ---------------------------------------------------------------------------- |
| `mainQuestionProgress`     | int                  | `0`    | 본 질문 12개 중 완료한 개수                                                  |
| `postConfirmQuestionCount` | int                  | `0`    | 확정 이후 누적된 추가 답변 수 (1→2, 2→3단계 조건)                            |
| `pendingQuestionId`        | string \| null       | `null` | 현재 응답 대기 중인 질문 ID                                                  |
| `nextQuestionDueAt`        | ISO datetime \| null | `null` | 다음 질문 노출 예정 시각                                                     |
| `answeredQuestions`        | array                | `[]`   | 응답 로그. 각 항목: `questionId`, `category`, `selectedOption`, `answeredAt` |
| `skippedQuestions`         | object               | `{}`   | `{questionId: 연속 패스 횟수}`. 기록용 — 풀에서 제외하지 않음(모든 질문 응답 필수) |

### 2.5 `affinity` — 호감도(관계) 트랙

| 필드                    | 타입                 | 기본값    | 설명                                          |
| ----------------------- | -------------------- | --------- | --------------------------------------------- |
| `affinityPoints`        | int                  | `0`       | 누적 호감도 포인트 (**상한 100**). 레벨(낯가림~각별, 균등 20점 5구간)은 저장하지 않고 `tray.js`에서 파생 |
| `dailyChatCount`        | int                  | `0`       | 오늘 채팅 횟수. 자정에 리셋, 일일 상한 계산용 |
| `dailyInteractionCount` | int                  | `0`       | 오늘 상호작용(닦아주기 등) 횟수. 자정에 리셋  |
| `lastChatAt`            | ISO datetime \| null | `null`    | 마지막 채팅 시각                              |
| `lastInteractionAt`     | ISO datetime \| null | `null`    | 마지막 상호작용 시각 (쿨다운 계산용)          |
| `dailyCounterResetAt`   | ISO datetime         | 설치 시각 | 일일 카운터 마지막 리셋 시각                  |

### 2.6 `items` — 아이템/외형

| 필드            | 타입           | 기본값 | 설명                     |
| --------------- | -------------- | ------ | ------------------------ |
| `unlockedItems` | array          | `[]`   | 언락된 아이템 ID 목록    |
| `equippedItem`  | string \| null | `null` | 현재 착용 중인 아이템 ID |

### 2.7 `notifications` — 알림/UI 상태

| 필드                   | 타입    | 기본값  | 설명                                      |
| ---------------------- | ------- | ------- | ----------------------------------------- |
| `hasUnreadBadge`       | boolean | `false` | 트레이 메뉴 "안 읽은 질문" 배지 표시 여부 (배지는 항상 표시가 기본) |
| `notificationsEnabled` | boolean | `true`  | 새 질문 시 OS **배너 알림** on/off (트레이 배지 표시와 무관) |

### 2.8 `chat` — 채팅 컨텍스트 (선택적)

| 필드                    | 타입           | 기본값 | 설명                                                                                     |
| ----------------------- | -------------- | ------ | ---------------------------------------------------------------------------------------- |
| `recentChatContext`     | array          | `[]`   | 최근 6~10개 메시지만 유지 (role/content 형태). 전체 히스토리 무제한 저장은 지양          |
| `chatSummary`           | string \| null | `null` | 오래된 대화를 로컬 모델이 3줄 내외로 요약한 결과. 원본 메시지 대신 이 요약본만 장기 보관 |
| `turnsSinceLastSummary` | int            | `0`    | 마지막 요약 이후 누적된 대화 턴 수. 임계값 도달 시 요약 트리거                           |

### 2.9 `settings` — 앱 설정 (트레이 "설정" 화면)

| 필드            | 타입    | 기본값     | 설명                                                                          |
| --------------- | ------- | ---------- | ----------------------------------------------------------------------------- |
| `autoLaunch`    | boolean | `false`    | 로그인 시 자동 실행. `app.setLoginItemSettings({openAtLogin})`와 동기화        |
| `soundEnabled`  | boolean | `false`    | 효과음 on/off. 펫 렌더러가 Web Audio로 클릭·돌보기·진화 시 8비트풍 효과음 재생 |
| `petPlacement`  | enum    | `"follow"` | `follow`(커서 따라오기) / `bottom-left`(좌하단 고정) / `bottom-right`(우하단 고정) |
| `petSize`       | enum    | `"medium"` | `small`(96px) / `medium`(128px, 현재 기본) / `large`(176px)                   |

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

## 4. 채팅 기록 관리 방식 (최근 대화 유지 + 주기적 요약)

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

- 위 스키마는 하나의 로컬 파일(예: `electron-store`의 기본 JSON)로 관리 가능한 규모입니다.
- `answeredQuestions`와 `recentChatContext`처럼 계속 늘어나는 배열은 추후 용량 관리를 위해 상한(예: 채팅은 최근 10개, 답변 로그는 전체 유지하되 UI에서는 최근 N개만 표시)을 두는 걸 권장합니다.
