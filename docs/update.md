# Rockie 진화 시스템 v2 — 3단계 확장 · 질문 노출 방식 개편

## 문서 목적

기존 `evolve.md`(v1)의 진화·질문·판정 로직에 아래 변경사항을 반영한다.
이 문서만으로 관련 코드를 한 번에 수정·구현할 수 있도록 모든 결정값·필드·의사코드를 명시한다.

## 0. 변경 요약

1. **진화 단계**: 2단계 → 3단계 확장
2. **E/I 결정 시점 이동**: 기존 2단계 세부 변형이었으나, 이제 **1→2 단계 전환 조건**으로 상승
3. **질문 노출 방식 전면 개편**: 정기 알림형 → 사용자 능동 접근형 (하루 최대 2개)
4. **스킵 옵션 제거**
5. **3단계 진입 조건**: 질문 없음. 호감도 90점 달성 시 진입
6. **E/I 질문 확장**: 4개 → 12개 (신규 8개 추가) + 타이브레이커 1개
7. **호감도 시스템 규격 확정**: 닦아주기 +2점, 밥주기 +2점, 각각 하루 1회

---

## 1. 진화 단계 정의

| 단계 | 명칭 | 진입 조건 | 시각 자산 |
| --- | --- | --- | --- |
| 0단계 | Rockie (디폴트) | 앱 설치 직후 | 무채색 원형 캐릭터 (기존) |
| 1단계 | 원석 (4종) | 본 질문 12개 완료 + 판정 확정 | 화강암 / 현무암 / 대리석 / 편마암 |
| 2단계 | 변성체 (4종) | E/I 질문 12개 완료 + 판정 확정 | 페그마타이트 (아쿠아마린 결정핵 / 토파즈 결정군) / 에클로자이트(심부 결정핵 / 압력 결정맥) / 코런덤 대리석 (루비핵 / 색대 코런덤맥)/ 미그마타이트 (정렬된 장석맥 / 소용돌이 장석맥)|
| 3단계 | 보석 (8종) | 호감도 90 이상 도달 | 아래 3.1 매핑 참고 |

- 단계는 역행하지 않는다.
- 각 전환은 조건 충족 즉시 판정한다 (지연 없음).

### 1.1 3단계 매핑 (E/I 갈래)

E/I는 1→2 전환 시점에 이미 확정되어 있으므로, 3단계 진입 시 별도 판정 없이 그 값에 따라 자동 매핑된다.

| 1단계(원석) | 2단계(변성체) | 3단계 외향(E) | 3단계 내향(I) |
| --- | --- | --- | --- |
| 화강암 | 페그마타이트 | 토파즈 | 아쿠아마린 |
| 현무암 | 에클로자이트 | 다이아몬드 브릴리언트컷 | 다이아몬드 원석 |
| 대리석 | 루비 대리석 | 파티사파이어 | 루비 |
| 편마암 | 미그마타이트 | 라브라도라이트 | 문스톤 |


---

## 2. 상수 정의

```
MAIN_QUESTION_COUNT = 12          // 0→1 단계 본 질문 총 개수
EI_QUESTION_COUNT = 12            // 1→2 단계 E/I 질문 총 개수
MAX_DAILY_QUESTIONS = 2           // 하루 최대 답변 가능 수
AFFINITY_TARGET = 90              // 2→3 진화 필요 호감도
CLEAN_POINTS = 2                  // 닦아주기 획득 점수
FEED_POINTS = 2                   // 밥주기 획득 점수
DAILY_RESET_HOUR = 8              // 매일 오전 8시 갱신
```

---

## 3. 질문 노출 시스템

### 3.1 노출 방식

- 사용자가 트레이 → "나의 애완돌" → **"새로운 질문에 답하기"** 버튼을 눌러 능동적으로 접근한다.
- 정기 팝업 알림·강제 노출·예고 말풍선 로직은 모두 제거된다.
- 매일 **오전 8시**에 그날의 질문 후보를 갱신한다.

### 3.2 하루 답변 한도

- 하루 최대 `MAX_DAILY_QUESTIONS`(2개)까지 답변 가능.
- 하나만 답변한 상태면 버튼은 계속 활성 상태로 유지된다.
- 두 개 모두 답변하면 그날은 버튼 비활성화, 다음 문구 표시:
  > "오늘의 질문을 모두 마쳤어요. 내일 오전 8시에 새 질문을 준비해둘게요."

### 3.3 이월 로직

- 오전 8시 갱신 시점에 어제 답하지 않은 질문이 남아있다면 그대로 유지한다.
- 부족한 개수만큼(2 - 남은 개수) 새 질문 풀에서 순서대로 뽑아 채운다.
- 예시:
  - 어제 2개 준비, 1개 답변, 1개 미답변 → 오늘: [어제 남은 1개, 새 질문 1개]
  - 어제 2개 준비, 0개 답변 → 오늘: [어제 남은 2개] (새로 뽑지 않음)
  - 어제 2개 준비, 2개 답변 → 오늘: [새 질문 2개]

### 3.4 배너 알림 · 배지

- **배너 알림**: 매일 오전 8시 갱신 직후, `todaysQuestions`가 비어있지 않으면 시스템 배너 알림 1회 표시.
- **트레이 배지**: 답할 질문이 하나라도 남아있는 동안(`todaysQuestions.length > 0`) 트레이 아이콘에 표시.

---

## 4. E/I 질문 세트 (신규 확장)

### 4.1 기존 4개 (유지)

| # | 상황 | 질문 | 외향(+1) | 내향(+1) |
| --- | --- | --- | --- | --- |
| 1 | 힘든 하루 | 힘든 하루를 보낸 날, 나는 주로? | 친구를 만나거나 연락해서 푼다 | 혼자 조용히 시간을 보내며 정리한다 |
| 2 | 새로운 사람들 | 새로운 사람들 사이에 있을 때 나는? | 먼저 말을 걸고 분위기를 만든다 | 상황을 지켜보다 편해지면 다가간다 |
| 3 | 생각 정리 | 생각이 많아질 때 나는? | 누군가에게 이야기하며 정리한다 | 글로 쓰거나 혼자 되짚어본다 |
| 4 | 에너지 충전 | 에너지가 채워지는 순간은? | 사람들과 함께 있을 때 | 혼자만의 시간을 가질 때 |

### 4.2 신규 8개 (5~12번, 새로운 상황 카테고리)

| # | 상황 | 질문 | 외향(+1) | 내향(+1) |
| --- | --- | --- | --- | --- |
| 5 | 휴일 계획 | 오랜만에 아무 일정 없는 하루, 나는? | 누군가에게 연락해서 약속을 잡는다 | 집에서 혼자만의 시간을 보낸다 |
| 6 | 정보 수집 방식 | 관심 있는 주제를 알아볼 때 나는? | 관련된 사람에게 물어보며 배운다 | 자료를 찾아 혼자 파고든다 |
| 7 | 감정 표현 방식 | 좋은 일이 생겼을 때 나는? | 바로 누군가에게 알리고 함께 기뻐한다 | 혼자 조용히 그 순간을 음미한다 |
| 8 | 회복 방식 | 큰 실수나 실패를 겪은 후 나는? | 가까운 사람과 이야기하며 털어낸다 | 조용한 곳에서 스스로 정리한다 |
| 9 | 작업 환경 선호 | 집중해서 일해야 할 때 나는? | 카페처럼 사람이 있는 곳이 편하다 | 조용하고 방해받지 않는 곳이 편하다 |
| 10 | 대화 스타일 | 대화 중 자연스러운 나의 역할은? | 말을 이어가며 화제를 넓힌다 | 상대의 이야기를 듣고 깊이 반응한다 |
| 11 | 낯선 상황 대응 | 여행지에서 길을 잃었을 때 나는? | 근처 사람에게 바로 물어본다 | 지도를 보며 직접 방향을 찾는다 |
| 12 | 주말 저녁 | 금요일 밤이 되면 나는? | 사람들과 함께 있는 자리가 그립다 | 혼자 편하게 쉬는 시간이 좋다 |

### 4.3 E/I 타이브레이커 (동점 시 1개만 노출)

| 질문 | 외향(+1) | 내향(+1) |
| --- | --- | --- |
| 하루가 끝나갈 무렵, 진짜 내가 원하는 마무리는? | 좋아하는 사람과 시간을 보내는 것 | 혼자만의 시간을 갖는 것 |

---

## 5. 판정 로직

### 5.1 0→1 전환 (기존 유지)

- 조건: `mainQuestionProgress >= 12`
- 12개 답변 완료 즉시 `traitScores`(4종 돌)를 집계한다.
- 판정 흐름:

```
maxScore = max(traitScores.values)
tied = maxScore와 같은 점수를 가진 돌들의 목록

if tied.length == 1:
    확정(tied[0])
else if tied.length == 2:
    타이브레이커 질문 = 본질문타이브레이커[tied[0], tied[1]]
    → 이 질문을 다음 todaysQuestions 맨 앞에 삽입
    → 사용자가 답변하는 시점에 판정 완료
else if tied.length >= 3:
    tied 그룹 내 모든 쌍의 타이브레이커를 순차 삽입
    최종적으로 최고점 돌로 확정
    (여전히 동점 시: 마지막 답변 기준)
```

### 5.2 1→2 전환 (신규 규칙)

- 조건: `eiQuestionProgress >= 12`
- 12개 답변 완료 즉시 `eiScores`(외향/내향)를 집계한다.
- 판정 흐름:

```
if eiScores.외향 > eiScores.내향:
    evolutionVariant = 'extrovert'
else if eiScores.외향 < eiScores.내향:
    evolutionVariant = 'introvert'
else:  // 6:6 동점
    E/I 타이브레이커 질문을 다음 todaysQuestions 맨 앞에 삽입
    → 사용자가 답변하는 시점에 결과에 따라 확정
```

### 5.3 2→3 전환 (신규 규칙)

- 조건: `evolutionStage == 2 && affinityPoints >= 90`
- 트리거 시점: 호감도가 증가하는 순간(닦아주기 또는 밥주기 실행 직후)에만 체크
- 판정:

```
if evolutionStage == 2 and affinityPoints >= 90:
    evolutionStage = 3
    // evolutionVariant는 이미 1→2 시점에 확정된 값 사용
    // 3단계 시각 자산은 stoneType + evolutionVariant 조합으로 매핑 테이블에서 조회
```

### 5.4 확정 직후 남은 질문 처리

| 시나리오 | 처리 |
| --- | --- |
| 오늘 1개째 답변으로 0→1 확정, `todaysQuestions`에 1개 남음 | 진화 후에도 답변할 수 있도록 남은 질문 노출 유지 |
| 오늘 2개째 답변으로 0→1 확정, `todaysQuestions` 비어있음 | 그대로 종료. 내일 8시부터 E/I 질문 노출 |
| 오늘 1개째 답변으로 1→2 확정, `todaysQuestions`에 1개 남음 | `todaysQuestions`를 빈 배열로 만듦 (2단계는 질문 없음) |
| 오늘 2개째 답변으로 1→2 확정, `todaysQuestions` 비어있음 | 그대로 종료. 이후 질문 노출 없음 |

---

## 6. 호감도 시스템

### 6.1 획득 방식

| 행동 | 획득 점수 | 하루 제한 | 리셋 시각 |
| --- | --- | --- | --- |
| 애완돌 닦아주기 | +2 | 1회 | 매일 08:00 |
| 애완돌 밥 주기 | +2 | 1회 | 매일 08:00 |

- 하루 최대 획득 가능: 4점
- 90점 도달 최소 소요일: 23일 (매일 두 행동 모두 수행 기준)
- ※ 상호작용 UI 자체는 별도 구현 (현재 문서 범위 밖)

### 6.2 호감도는 진화 단계와 무관하게 상시 누적

- 0단계, 1단계에서도 호감도는 계속 쌓인다.
- 다만 2→3 진화는 `evolutionStage == 2`가 전제 조건이므로, 2단계 이전에 90점을 넘어도 즉시 진화하지 않는다.
- 2단계 진입 시점에 이미 호감도가 90 이상이면 그 순간 즉시 3단계 진화 판정을 수행한다.

---

## 7. 데이터 스키마 변경사항

### 7.1 제거할 필드

| 위치 | 필드 | 사유 |
| --- | --- | --- |
| `questions` | `pendingQuestionId` | `todaysQuestions` 배열로 대체 |
| `questions` | `skippedQuestions` | 스킵 옵션 제거 |
| `questions` | `nextQuestionDueAt` | 정기 알림 방식 제거 |
| `questions` | `postConfirmQuestionCount` | `eiQuestionProgress`로 대체 |

### 7.2 신규 필드

| 위치 | 필드 | 타입 | 기본값 | 설명 |
| --- | --- | --- | --- | --- |
| `questions` | `todaysQuestions` | array of string | `[]` | 오늘 답변 가능한 질문 ID 배열 (최대 2개) |
| `questions` | `dailyResetAt` | ISO datetime \| null | `null` | 마지막 오전 8시 리셋 시각 |
| `questions` | `eiQuestionProgress` | int | `0` | 1→2 단계 E/I 질문 진행 수 (0~12) |
| `affinity` | `dailyCleanDone` | boolean | `false` | 오늘 닦아주기 완료 여부 |
| `affinity` | `dailyFeedDone` | boolean | `false` | 오늘 밥주기 완료 여부 |

### 7.3 기존 유지 필드 (재확인)

| 위치 | 필드 | 비고 |
| --- | --- | --- |
| `pet.evolutionStage` | int (0~3) | 값 범위 확장: 0/1/2/3 |
| `pet.evolutionVariant` | `'extrovert'` \| `'introvert'` \| null | 1→2 확정 시점에 값 채워짐 (기존은 2→3 시점이었음) |
| `traits.traitScores` | 4개 돌 종류 점수 | 0→1 판정용 |
| `traits.eiScores` | { 외향, 내향 } | 1→2 판정용, 이제 별도 트랙으로 명확히 분리 |
| `questions.mainQuestionProgress` | int (0~12) | 0→1 단계 진행 수 |
| `notifications.hasUnreadBadge` | boolean | 유지 (`todaysQuestions.length > 0`일 때 true) |
| `affinity.affinityPoints` | int | 2→3 판정용, 90 도달 시 진화 |
| `traits.tiebreaker.pairsAsked` | array | E/I 타이브레이커 사용 여부도 이 배열에 포함 (예: `"ei"` 태그) |

---

## 8. 핵심 로직 의사코드

### 8.1 매일 오전 8시 갱신

```
onDailyReset():  // 매일 08:00 실행 (트리거: 앱 실행 시 마지막 dailyResetAt 확인 후 필요 시 실행)
    now = getCurrentTime()
    
    // 1. 어제 이월분 확인
    남은질문 = questions.todaysQuestions  // 어제 안 답한 것들
    
    // 2. 부족분만 새로 뽑기
    필요개수 = MAX_DAILY_QUESTIONS - 남은질문.length
    if 필요개수 > 0:
        새질문들 = pickNextQuestions(필요개수)
        questions.todaysQuestions = 남은질문 + 새질문들
    // (필요개수 == 0이면 그대로 유지)
    
    // 3. 호감도 일일 카운터 리셋
    affinity.dailyCleanDone = false
    affinity.dailyFeedDone = false
    
    // 4. 배지 · 배너 상태 갱신
    notifications.hasUnreadBadge = (questions.todaysQuestions.length > 0)
    if questions.todaysQuestions.length > 0:
        showBannerNotification("오늘도 나에 대해 알려주세요")
    
    // 5. 리셋 시각 기록
    questions.dailyResetAt = now
```

### 8.2 다음 질문 뽑기

```
pickNextQuestions(count):
    if pet.evolutionStage == 0:
        // 0단계: 본 질문 풀에서 순차적으로
        return getUnansweredMainQuestions(count)
    else if pet.evolutionStage == 1:
        // 1단계: E/I 질문 풀에서 순차적으로
        return getUnansweredEiQuestions(count)
    else:
        // 2단계 이상: 질문 없음
        return []
```

### 8.3 답변 제출

```
onAnswerSubmit(questionId, selectedOption):
    // 1. 답변 기록
    questions.answeredQuestions.push({
        questionId, category, selectedOption, answeredAt: now()
    })
    questions.todaysQuestions.remove(questionId)  // 오늘 목록에서 제거
    
    // 2. 점수 반영
    if pet.evolutionStage == 0:
        traits.traitScores[선택된돌] += 1
        questions.mainQuestionProgress += 1
    else if pet.evolutionStage == 1:
        // 타이브레이커라면 별도 처리
        if isTiebreaker(questionId):
            traits.traitScores[선택된돌] += 1  // 본 질문 타이브레이커
            // 또는 traits.eiScores[선택된축] += 1  // E/I 타이브레이커
        else:
            traits.eiScores[선택된축] += 1
            questions.eiQuestionProgress += 1
    
    // 3. 판정 시도
    tryEvaluate()
    
    // 4. 배지 갱신
    notifications.hasUnreadBadge = (questions.todaysQuestions.length > 0)

tryEvaluate():
    // 0→1 판정
    if pet.evolutionStage == 0 and questions.mainQuestionProgress >= 12:
        result = judgeStoneType()
        if result.needsTiebreaker:
            insertTiebreakerToToday(result.tiebreakerId)
        else:
            confirmStage1(result.stoneType)
    
    // 1→2 판정
    else if pet.evolutionStage == 1 and questions.eiQuestionProgress >= 12:
        result = judgeEiVariant()
        if result.needsTiebreaker:
            insertTiebreakerToToday(result.tiebreakerId)
        else:
            confirmStage2(result.variant)
```

### 8.4 단계 확정 처리

```
confirmStage1(stoneType):
    pet.stoneType = stoneType
    pet.stoneConfirmedAt = now()
    pet.evolutionStage = 1
    // 확정 직후 오늘 남은 질문이 있으면 E/I 질문으로 교체
    if questions.todaysQuestions.length > 0:
        questions.todaysQuestions = pickNextQuestions(questions.todaysQuestions.length)

confirmStage2(variant):
    pet.evolutionVariant = variant
    pet.evolutionStage = 2
    // 2단계는 질문 없음: 남은 오늘 질문 있으면 비운다
    questions.todaysQuestions = []
    notifications.hasUnreadBadge = false
    // 2단계 진입 시점에 이미 호감도 90 이상이면 즉시 3단계 판정
    if affinity.affinityPoints >= AFFINITY_TARGET:
        confirmStage3()

confirmStage3():
    pet.evolutionStage = 3
    // 3단계 시각 자산은 (stoneType, evolutionVariant) 조합으로 매핑 테이블에서 조회
```

### 8.5 호감도 획득

```
onCleanPet():
    if affinity.dailyCleanDone:
        return  // 오늘 이미 완료
    affinity.dailyCleanDone = true
    affinity.affinityPoints += CLEAN_POINTS
    tryAffinityEvaluate()

onFeedPet():
    if affinity.dailyFeedDone:
        return  // 오늘 이미 완료
    affinity.dailyFeedDone = true
    affinity.affinityPoints += FEED_POINTS
    tryAffinityEvaluate()

tryAffinityEvaluate():
    if pet.evolutionStage == 2 and affinity.affinityPoints >= AFFINITY_TARGET:
        confirmStage3()
```

---

## 9. UI 상태 규칙

### 9.1 "새로운 질문에 답하기" 버튼 상태

| 조건 | 버튼 상태 | 안내 문구 |
| --- | --- | --- |
| `todaysQuestions.length > 0` && `evolutionStage < 2` | 활성 | (없음) |
| `todaysQuestions.length == 0` && `evolutionStage < 2` | 비활성 | "오늘의 질문을 모두 마쳤어요. 내일 오전 8시에 새 질문을 준비해둘게요." |
| `evolutionStage >= 2` | 비활성 | "질문을 모두 마쳤어요." |

### 9.2 트레이 배지

- `notifications.hasUnreadBadge == true`일 때만 표시.
- 조건: `todaysQuestions.length > 0` && `evolutionStage < 2`

### 9.3 배너 알림

- 매일 오전 8시 갱신 직후 `todaysQuestions.length > 0`일 때 1회 표시.
- 표시 문구: `"오늘도 나에 대해 알려주세요"`

### 9.4 닦아주기 · 밥주기 버튼

| 조건 | 버튼 상태 |
| --- | --- |
| `dailyCleanDone == false` | 닦아주기 활성 |
| `dailyCleanDone == true` | 닦아주기 비활성 ("깨끗해졌어요!") |
| `dailyFeedDone == false` | 밥주기 활성 |
| `dailyFeedDone == true` | 밥주기 비활성 ("맛있었어요!") |

---

## 10. 구현 체크리스트

- [ ] `evolutionStage` 값 범위를 0~3으로 확장
- [ ] `evolutionVariant`를 1→2 확정 시점에 저장하도록 변경
- [ ] `questions.pendingQuestionId`, `skippedQuestions`, `nextQuestionDueAt`, `postConfirmQuestionCount` 필드 제거
- [ ] `questions.todaysQuestions`, `dailyResetAt`, `eiQuestionProgress` 필드 추가
- [ ] `affinity.dailyCleanDone`, `dailyFeedDone` 필드 추가
- [ ] 상수 정의(섹션 2) 반영
- [ ] 오전 8시 갱신 로직 구현 (앱 실행 시 `dailyResetAt` 확인 후 필요 시 실행)
- [ ] "새로운 질문에 답하기" 버튼 및 상태 규칙 구현
- [ ] 스킵 옵션 제거
- [ ] 정기 알림·예고 말풍선 로직 제거
- [ ] E/I 질문 12개 + 타이브레이커 1개 데이터 등록
- [ ] 0→1, 1→2 판정 로직 구현 (타이브레이커 삽입 방식)
- [ ] 2→3 판정 로직 구현 (호감도 트리거)
- [ ] 3단계 시각 자산 매핑 테이블(섹션 1.1) 등록
- [ ] 확정 직후 오늘 남은 질문 처리(섹션 5.4) 구현
- [ ] 닦아주기·밥주기 버튼 하루 1회 제한 구현
- [ ] 2단계 진입 시 호감도 90 이상이면 즉시 3단계 판정