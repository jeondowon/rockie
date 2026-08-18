// 표시 언어 (트레이·펫 렌더러 공용). 로드 순서 계약상 가장 먼저 로드된다.
//
// 원칙: 번역은 "보여주는 문자열"에만 적용한다. 저장 파일의 키(traitScores의
// 화강암/현무암…, eiScores의 외향/내향, answeredQuestions의 category)는 언어와
// 무관한 식별자이므로 절대 번역 대상에 넣지 않는다. 넣으면 기존 사용자의
// 진화 진행도가 초기화된다.
//
// 문자열은 화면에 그릴 때 t()로 해석한다(모듈 로드 시점에 상수로 굳히지 않는다).
// 그래야 언어를 바꿨을 때 다시 그리기만으로 즉시 반영된다.

const I18N_STRINGS = {
  ko: {
    // ---- 공용 ----
    "common.backToMenu": "메뉴로",
    "common.cancel": "취소",
    "common.quit": "종료",
    "common.refresh": "새로고침",
    "common.save": "저장",
    // ---- 모드 배너 ----
    "mode.focus": "집중 모드",
    "mode.pause": "일시정지",
    // ---- 메뉴 ----
    "menu.myPet": "나의 애완돌",
    "menu.settings": "설정",
    "menu.systemMonitor": "시스템 모니터",
    "menu.togglePet": "애완돌 숨기기 / 보이기",
    // ---- 펫 창 · 모드 ----
    "pet.ownerSuffix": "{name}님",
    "pet.ownerDefault": "주인님",
    "pet.modeHint": " 저를 더블클릭하면 여러 모드를 사용할 수 있어요!",
    "pet.noScreenPerm":
      "어떤 앱을 보고 계신지 알 수 없어요. 메뉴바 펫 아이콘 → '화면 기록 권한 설정 열기'에서 허용해주세요!",
    "pet.evolvedStone": "저, {stone}이 됐어요!",
    "pet.evolvedVariant": "저, 변성체가 됐어요!",
    "pet.evolvedGem": "반짝… 드디어 보석이 됐어요! ✨",
    "pet.evolveStarting": "{owner}, 제 몸이 변하는 것 같아요...!",
    "pet.evolvingTitle": "진화 중인 애완돌",
    "pet.evolveHelp": "클릭해서 진화를 도와주세요!",
    "pet.evolveGathering": "좋아요, 힘이 모이고 있어요...",
    "pet.evolveOnceMore": "마지막으로 한 번 더 눌러\n힘을 모아주세요!",
    "pet.evolveRattle": "(달그락..달그락...)",
    "pet.evolveDone": "축하합니다, 애완돌이 진화했어요!",
    "pet.finalCheck": "마지막 확인",
    "pet.situationCount": "상황 {n} / {total}",
    "pet.questionCount": "질문 {n} / {total}",
    "pet.lastOneMore": "마지막으로 하나만 더 골라주세요!",
    "pet.thanksRemember": "고마워요! 잘 기억해둘게요.",
    "pet.answerDone": "답변 완료",
    "pet.answerMore": "잘 기억해둘게요! 다음 질문에도 답해줄래요?",
    "pet.nextQuestion": "다음 질문 답하기",
    "pet.answerLater": "나중에 답하기",
    "pet.modeSelect": "모드 선택",
    "pet.hideToggle": "애완돌 숨기기 / 보이기",
    "pet.hideToggleDesc": "잠깐 안 보이게 · 트레이에서 다시 켜기",
    "common.close": "닫기",
    "mode.napNote":
      "\n\n키보드를 잠그지 않아도 알람은 그대로 울려요.\n잠금은 권한 부여 후 앱을 재시작하면 적용됩니다.",
    "mode.keyPermNeeded":
      "⚠️ 모든 키와 단축키를 잠그려면\n'개인정보 보호 및 보안' → '손쉬운 사용'에서\n'KeyBlocker'를 켜주세요.{note}",
    "mode.openAccessibility": "손쉬운 사용 열기",
    "mode.keyUnlocked": "⏱️ 키보드 잠금이 자동으로 풀렸어요.",
    "mode.keyLocked": "🔒 키보드가 잠겼어요",
    "mode.keyBlockFailedPerm":
      "⚠️ 시스템 키 이벤트 차단을 시작하지 못했어요. \n권한을 다시 확인한 뒤 앱을 재시작해주세요.",
    "mode.keyBlockFailed": "⚠️ 키보드 차단을 시작하지 못했어요.",
    "mode.spacebarHint": "마우스를 못 쓰면 스페이스바를 10번 연속 눌러 주세요.",
    "mode.cleanTitle": "키보드 청소 모드",
    "mode.cleanBody": "키보드를 마음껏 닦으세요!",
    "mode.cleanExit":
      "스페이스바 10번 연속 누르기/닫기 버튼 클릭으로 해제할 수 있어요",
    "mode.keyBlockPreparing": "키보드 차단 준비 중…",
    "mode.pauseLabel": "일시정지",
    "mode.stop": "중지",
    "mode.hidePet": "애완돌 숨기기",
    "mode.focusing": "집중 중",
    "mode.focusEnded": "집중 시간이 끝났어요! 잠깐 쉬어가요 ☕",
    "mode.napTitle": "쪽잠 모드",
    "mode.napAlarmNote": "끝나면 알람이 울려요",
    "mode.stopAlarm": "알람 끄기",
    "mode.snooze": "5분 후 다시 알림",
    "mode.paused": "일시정지됨",
    "mode.wakeUp": "일어날 시간이에요!",
    "mode.restedWell": "푹 쉬셨나요?",
    "mode.alarmStopped": "알람을 멈췄어요. '알람 끄기'를 눌러 주세요.",
    "mode.snoozeSet": "5분 뒤에 다시 울려요",
    "dev.copied": "복사됨!",
    "dev.copyFailed": "복사 실패(콘솔 확인)",
    // ---- 나의 애완돌 ----
    "pet.defaultName": "애완돌",
    "pet.pebble": "조약돌",
    "mode.resume": "계속하기",
    "pet.evoHint3": "🜨 마지막 단계예요. 반짝이는 보석이 됐어요.",
    "pet.evoHint2": "🜨 호감도가 90에 닿으면 보석으로 피어나요.",
    "pet.evoHint1": "🜨 이제 E/I 질문에 답하면 변성체로 나아가요.",
    "pet.evoHint0": "🜨 질문에 답할수록 어떤 돌이 될지 뚜렷해져요.",
    "pet.stillLearningProgress": "아직 알아가는 중이에요 ({done}/{total})",
    "pet.questionDone": "질문 완료",
    "pet.historyEmpty": "아직 답한 질문이 없어요.",
    "pet.nameEdit": "✎ 이름 수정",
    "pet.cleanDone": "깨끗해졌어요!",
    "pet.petDone": "행복해요!",
    "pet.affinity": "호감도",
    "pet.answerBesidePet": "애완돌 옆에서 답해 주세요 ▶",
    "pet.answerHistory": "답변 히스토리",
    "pet.answerNewQuestion": "새로운 질문에 답하기",
    "pet.care": "돌보기",
    "pet.careNote": "· 하루 한 번, 호감도 +3",
    "pet.clean": "닦아주기",
    "pet.equipped": "착용중",
    "pet.likeRockie": "Rockie가 마음에 드시나요?",
    "pet.locked": "잠김",
    "pet.name": "이름",
    "pet.nameReward": "✎ 이름을 지어주면 애완돌이 기뻐해요 (호감도 +)",
    "pet.personalitySummary": "성향 요약",
    "pet.pet": "쓰다듬기",
    "pet.petName": "애완돌 이름",
    "pet.questionProgress": "질문 진행도",
    "pet.skin": "스킨",
    "pet.skinHint": "진화 단계마다 새 스킨이 열려요.",
    "pet.skinNote": "· 눌러서 장착/해제",
    "pet.stage1": "1단계",
    "pet.stage2": "2단계",
    "pet.stage3": "3단계",
    "pet.stageBase": "기본",
    "pet.supportDev": "홈페이지 방문하고 개발자 응원하기 ▶",
    "pet.userName": "사용자 이름",
    "pet.worn": "착용",
    // ---- 아이템 ----
    "item.crown": "왕관",
    "item.hornGlasses": "뿔테안경",
    "item.ribbon": "리본",
    "item.sunHat": "차양모자",
    // ---- 시스템 모니터 ----
    "system.charging": "충전 중",
    "system.acConnected": "전원 연결",
    "system.notCharging": "충전 안 함",
    "system.noBattery": "배터리 없음",
    "system.cyclesValue": "{n}회",
    "system.moodIdle": "새근새근 · 여유",
    "system.moodIdleDesc": "한가로워요. 돌이 느긋하게 쉬고 있어요.",
    "system.moodActive2": "달그락 달그락 · 활동적",
    "system.moodBusy": "데굴데굴 · 바쁨",
    "system.moodBusyDesc": "부하가 높아요! 돌이 바쁘게 움직여요.",
    "system.unknown": "확인 불가",
    "system.justNow": "방금 전",
    "system.minutesAgo": "{n}분 전",
    "system.hoursAgo": "{n}시간 전",
    "system.daysAgo": "{n}일 전",
    "system.needsRefresh": "갱신 필요",
    "system.inHoursMinutes": "{h}시간 {m}분 후",
    "system.inHours": "{h}시간 후",
    "system.inMinutes": "{m}분 후",
    "system.fiveHourSession": "5시간 세션",
    "system.weeklySessionShort": "주간 세션",
    "system.noRecord": "기록 없음",
    "system.fiveHourUsage": "5시간 세션 사용",
    "system.checking": "확인 중…",
    "system.available": "사용 가능",
    "system.awaitingIntegration": "공식 연동 대기 중",
    "system.battery": "배터리",
    "system.claudeLegendHtml":
      "Claude 사용량은 아직 표시할 수 없어요.<br />Anthropic의 공식 연동이 열리기를 기다리는 중이에요.",
    "system.cpu": "프로세서",
    "system.cycles": "사이클",
    "system.disk": "디스크",
    "system.download": "다운로드",
    "system.free": "여유",
    "system.idle": "대기",
    "system.introHtml":
      "애완돌의 활동량은 컴퓨터 상태에 연결돼요.<br />부하가 높을수록 애완돌이 바쁘게 움직여요.",
    "system.lastChecked": "마지막 확인",
    "system.localIp": "로컬 IP",
    "system.maxCapacity": "최대 용량",
    "system.memory": "메모리",
    "system.moodDesc": "적당한 부하. 돌이 살짝 몸을 뒤척여요.",
    "system.network": "네트워크",
    "system.power": "전원",
    "system.reset5h": "5시간 초기화",
    "system.resetWeekly": "주간 초기화",
    "system.swap": "스왑",
    "system.systemLoad": "시스템",
    "system.total": "전체",
    "system.upload": "업로드",
    "system.used": "사용",
    "system.userLoad": "사용자",
    "system.weeklySession": "주간 세션 사용",
    // ---- 설정 ----
    "settings.permRevokeHint":
      "해제하려면 열린 설정 창에서 체크를 해제해 주세요.",
    "settings.permAllowThenRestart":
      "열린 설정 창에서 Rockie를 허용한 뒤 앱을 재시작해 주세요.",
    "settings.permRestartNote":
      "허용하셨다면 앱을 재시작해야 적용됩니다. 아직이라면 한 번 더 눌러 설정을 여세요.",
    "settings.appInfoHtml": "Rockie v1 · 나의 애완돌<br />© 2026 · jeondowon",
    "settings.autoLaunch": "로그인 시 자동 실행",
    "settings.autoLaunchDesc": "컴퓨터를 켜면 애완돌이 함께 깨어나요",
    "settings.bottomLeft": "좌하단",
    "settings.bottomRight": "우하단",
    "settings.dragNote":
      "드래그로 애완돌을 잠시동안 원하는 위치에 둘 수 있어요.",
    "settings.focusDuration": "집중 모드 시간",
    "settings.follow": "따라오기",
    "settings.general": "일반",
    "settings.hideFromCapture": "화면 캡처에서 숨기기",
    "settings.hideFromCaptureDesc":
      "스크린샷·녹화·화면 공유 시 애완돌이 찍히지 않아요",
    "settings.homepage": "홈페이지 방문하기",
    "settings.language": "언어",
    "settings.min15": "15분",
    "settings.min25": "25분",
    "settings.min45": "45분",
    "settings.min60": "60분",
    "settings.napDuration": "쪽잠 모드 시간",
    "settings.notifications": "질문 알림",
    "settings.notificationsDesc": "새 질문이 오면 배너 알림 표시",
    "settings.permissions": "권한",
    "settings.petPlacement": "애완돌 위치",
    "settings.petSize": "애완돌 크기",
    "settings.resetBtn": "↻ 처음부터 다시 키우기",
    "settings.screenPermission": "화면 기록 권한",
    "settings.screenPermissionDesc": "활성 앱 감지(말풍선)에 필요합니다.",
    "settings.sizeLarge": "크게",
    "settings.sizeMedium": "보통",
    "settings.sizeSmall": "작게",
    "settings.sound": "효과음",
    "settings.soundDesc": "상호작용 시 작은 소리 재생",
    // ---- 초기화 확인창 ----
    "confirm.reset": "초기화",
    "confirm.resetDesc":
      "모든 진행도·성향·호감도·설정이 지워지고 조약돌로 돌아갑니다. 되돌릴 수 없어요.",
    "confirm.resetTitle": "처음부터 다시 키우기",
    // ---- 온보딩 ----
    "onboarding.tagline": "화면 위에 사는 나만의 작은 애완돌",
    "onboarding.step1": "어느 날, 하늘에서 작은 별똥별이 떨어졌습니다.",
    "onboarding.step2": "쿵! 갑자기 눈앞에 정체불명의 운석이 떨어졌어요!",
    "onboarding.step3": "어..? 운석에서 무슨 소리가 들리는 것 같아요.",
    "onboarding.step4": "....달그락... 달그락...",
    "onboarding.step5": "쩌적... 쩌적...",
    "onboarding.step6": "운석 표면에 금이 가기 시작합니다.",
    "onboarding.step7": "운석이 갈라지고, 그 안에서 작은 조약돌이 나타났어요.",
    "onboarding.step8": "조약돌이 당신을 바라봅니다.",
    "onboarding.step9": "왠지 이 돌을 그냥 두고 갈 수는 없을 것 같아요.",
    "onboarding.step10":
      "작은 조약돌이 당신의 곁에 자리를 잡았습니다.\n이제부터 ROCKIE와 함께 지내보세요.",
    "onboarding.step11": "함께 지내려면 두 가지 허락이 필요해요.",
    "onboarding.start": "시작하기",
    "onboarding.next": "클릭하여 진행",
    "onboarding.relaunchStart": "재시작하고 시작하기",
    "perm.screen": "화면 기록",
    "perm.screenDesc": "지금 보고 있는 앱을 알아채고 말을 걸어요.",
    "perm.dock": "손쉬운 사용",
    "perm.dockDesc": "Dock 위치를 읽어서 가리지 않게 피해 다녀요.",
    "perm.allow": "허용",
    "perm.openSettings": "설정 열기",
  },
  en: {
    // ---- 공용 ----
    "common.backToMenu": "Menu",
    "common.cancel": "Cancel",
    "common.quit": "Quit",
    "common.refresh": "Refresh",
    "common.save": "Save",
    // ---- 모드 배너 ----
    "mode.focus": "Focus Mode",
    "mode.pause": "Pause",
    // ---- 메뉴 ----
    "menu.myPet": "My Pet",
    "menu.settings": "Settings",
    "menu.systemMonitor": "System Monitor",
    "menu.togglePet": "Show / Hide Pet",
    // ---- 펫 창 · 모드 ----
    "pet.ownerSuffix": "{name}",
    "pet.ownerDefault": "master",
    "pet.modeHint": " Double-click me to open the modes!",
    "pet.noScreenPerm":
      "I can't tell which app you're using. Allow it from the menu bar pet icon → 'Open Screen Recording settings'!",
    "pet.evolvedStone": "I became {stone}!",
    "pet.evolvedVariant": "I turned into a metamorphic form!",
    "pet.evolvedGem": "Sparkle… I'm finally a gem! ✨",
    "pet.evolveStarting": "{owner}, I think my body is changing...!",
    "pet.evolvingTitle": "Evolving pet",
    "pet.evolveHelp": "Click to help it evolve!",
    "pet.evolveGathering": "Good, the energy is gathering...",
    "pet.evolveOnceMore": "One more press\nto gather the last of it!",
    "pet.evolveRattle": "(clatter..clatter...)",
    "pet.evolveDone": "Congratulations, your pet evolved!",
    "pet.finalCheck": "Final check",
    "pet.situationCount": "Situation {n} / {total}",
    "pet.questionCount": "Question {n} / {total}",
    "pet.lastOneMore": "Just one more to choose!",
    "pet.thanksRemember": "Thank you! I'll remember that.",
    "pet.answerDone": "Answered",
    "pet.answerMore": "I'll remember it! Want to answer the next one too?",
    "pet.nextQuestion": "Answer the next question",
    "pet.answerLater": "Answer later",
    "pet.modeSelect": "Choose a mode",
    "pet.hideToggle": "Show / Hide pet",
    "pet.hideToggleDesc": "Hide for now · turn back on from the tray",
    "common.close": "Close",
    "mode.napNote":
      "\n\nThe alarm still rings even without locking the keyboard.\nLocking applies after you grant permission and restart the app.",
    "mode.keyPermNeeded":
      "⚠️ To lock every key and shortcut, enable\n'KeyBlocker' under Privacy & Security →\nAccessibility.{note}",
    "mode.openAccessibility": "Open Accessibility",
    "mode.keyUnlocked": "⏱️ The keyboard lock was released automatically.",
    "mode.keyLocked": "🔒 Keyboard is locked",
    "mode.keyBlockFailedPerm":
      "⚠️ Couldn't start blocking system key events. \nCheck the permission again and restart the app.",
    "mode.keyBlockFailed": "⚠️ Couldn't start the keyboard block.",
    "mode.spacebarHint":
      "If the mouse won't work, press the spacebar 10 times in a row.",
    "mode.cleanTitle": "Keyboard Cleaning Mode",
    "mode.cleanBody": "Wipe your keyboard to your heart's content!",
    "mode.cleanExit":
      "Press the spacebar 10 times in a row, or click Close, to exit",
    "mode.keyBlockPreparing": "Preparing keyboard block…",
    "mode.pauseLabel": "Pause",
    "mode.stop": "Stop",
    "mode.hidePet": "Hide pet",
    "mode.focusing": "Focusing",
    "mode.focusEnded": "Focus time is over! Take a little break ☕",
    "mode.napTitle": "Nap Mode",
    "mode.napAlarmNote": "An alarm rings when it ends",
    "mode.stopAlarm": "Stop alarm",
    "mode.snooze": "Remind me in 5 min",
    "mode.paused": "Paused",
    "mode.wakeUp": "Time to wake up!",
    "mode.restedWell": "Did you rest well?",
    "mode.alarmStopped": "The alarm stopped. Please press 'Stop alarm'.",
    "mode.snoozeSet": "It'll ring again in 5 minutes",
    "dev.copied": "Copied!",
    "dev.copyFailed": "Copy failed (see console)",
    // ---- 나의 애완돌 ----
    "pet.defaultName": "Rockie",
    "pet.pebble": "Pebble",
    "mode.resume": "Resume",
    "pet.evoHint3": "🜨 The final stage. It has become a shining gem.",
    "pet.evoHint2": "🜨 At 90 affinity, it will bloom into a gem.",
    "pet.evoHint1":
      "🜨 Answer the E/I questions to move on to a metamorphic form.",
    "pet.evoHint0":
      "🜨 The more you answer, the clearer it becomes which stone it will be.",
    "pet.stillLearningProgress": "Still getting to know you ({done}/{total})",
    "pet.questionDone": "All questions answered",
    "pet.historyEmpty": "No questions answered yet.",
    "pet.nameEdit": "✎ Edit name",
    "pet.cleanDone": "All clean!",
    "pet.petDone": "So happy!",
    "pet.affinity": "Affinity",
    "pet.answerBesidePet": "Answer beside your pet ▶",
    "pet.answerHistory": "Answer history",
    "pet.answerNewQuestion": "Answer a new question",
    "pet.care": "Care",
    "pet.careNote": "· Once a day, affinity +3",
    "pet.clean": "Polish",
    "pet.equipped": "Equipped",
    "pet.likeRockie": "Enjoying Rockie?",
    "pet.locked": "Locked",
    "pet.name": "Name",
    "pet.nameReward": "✎ Naming your pet makes it happy (affinity +)",
    "pet.personalitySummary": "Personality",
    "pet.pet": "Pet",
    "pet.petName": "Pet name",
    "pet.questionProgress": "Question progress",
    "pet.skin": "Skins",
    "pet.skinHint": "A new skin unlocks at each evolution stage.",
    "pet.skinNote": "· Tap to equip / unequip",
    "pet.stage1": "Stage 1",
    "pet.stage2": "Stage 2",
    "pet.stage3": "Stage 3",
    "pet.stageBase": "Base",
    "pet.supportDev": "Visit the site and support the developer ▶",
    "pet.userName": "Your name",
    "pet.worn": "Worn",
    // ---- 아이템 ----
    "item.crown": "Crown",
    "item.hornGlasses": "Horn Glasses",
    "item.ribbon": "Ribbon",
    "item.sunHat": "Sun Hat",
    // ---- 시스템 모니터 ----
    "system.charging": "Charging",
    "system.acConnected": "Plugged in",
    "system.notCharging": "Not charging",
    "system.noBattery": "No battery",
    "system.cyclesValue": "{n}",
    "system.moodIdle": "Snoozing · Relaxed",
    "system.moodIdleDesc": "All quiet. Your pet is resting easy.",
    "system.moodActive2": "Clattering · Active",
    "system.moodBusy": "Rolling · Busy",
    "system.moodBusyDesc": "Heavy load! Your pet is scrambling around.",
    "system.unknown": "Unknown",
    "system.justNow": "Just now",
    "system.minutesAgo": "{n} min ago",
    "system.hoursAgo": "{n} hr ago",
    "system.daysAgo": "{n} d ago",
    "system.needsRefresh": "Needs refresh",
    "system.inHoursMinutes": "in {h} hr {m} min",
    "system.inHours": "in {h} hr",
    "system.inMinutes": "in {m} min",
    "system.fiveHourSession": "5-hour session",
    "system.weeklySessionShort": "Weekly session",
    "system.noRecord": "No records",
    "system.fiveHourUsage": "5-hour session usage",
    "system.checking": "Checking…",
    "system.available": "Available",
    "system.awaitingIntegration": "Awaiting official integration",
    "system.battery": "Battery",
    "system.claudeLegendHtml":
      "Claude usage can't be shown yet.<br />Waiting for Anthropic to open an official integration.",
    "system.cpu": "Processor",
    "system.cycles": "Cycles",
    "system.disk": "Disk",
    "system.download": "Download",
    "system.free": "Free",
    "system.idle": "Idle",
    "system.introHtml":
      "Your pet's energy follows your computer's load.<br />The busier the machine, the busier your pet.",
    "system.lastChecked": "Last checked",
    "system.localIp": "Local IP",
    "system.maxCapacity": "Max capacity",
    "system.memory": "Memory",
    "system.moodDesc": "A moderate load. Your pet shifts around a little.",
    "system.network": "Network",
    "system.power": "Power",
    "system.reset5h": "5-hour reset",
    "system.resetWeekly": "Weekly reset",
    "system.swap": "Swap",
    "system.systemLoad": "System",
    "system.total": "Total",
    "system.upload": "Upload",
    "system.used": "Used",
    "system.userLoad": "User",
    "system.weeklySession": "Weekly session usage",
    // ---- 설정 ----
    "settings.permRevokeHint":
      "To revoke it, uncheck Rockie in the Settings window that just opened.",
    "settings.permAllowThenRestart":
      "Allow Rockie in the Settings window that just opened, then restart the app.",
    "settings.permRestartNote":
      "If you allowed it, restart the app to apply. If not, tap again to open Settings.",
    "settings.appInfoHtml": "Rockie v1 · My Pet Rock<br />© 2026 · jeondowon",
    "settings.autoLaunch": "Launch at login",
    "settings.autoLaunchDesc": "Your pet wakes up when your computer does",
    "settings.bottomLeft": "Bottom left",
    "settings.bottomRight": "Bottom right",
    "settings.dragNote": "Drag your pet to park it somewhere for a while.",
    "settings.focusDuration": "Focus session length",
    "settings.follow": "Follow",
    "settings.general": "General",
    "settings.hideFromCapture": "Hide from screen capture",
    "settings.hideFromCaptureDesc":
      "Your pet won't appear in screenshots, recordings, or shared screens",
    "settings.homepage": "Visit the homepage",
    "settings.language": "Language",
    "settings.min15": "15 min",
    "settings.min25": "25 min",
    "settings.min45": "45 min",
    "settings.min60": "60 min",
    "settings.napDuration": "Nap length",
    "settings.notifications": "Question alerts",
    "settings.notificationsDesc": "Show a banner when a new question arrives",
    "settings.permissions": "Permissions",
    "settings.petPlacement": "Pet position",
    "settings.petSize": "Pet size",
    "settings.resetBtn": "↻ Start over from scratch",
    "settings.screenPermission": "Screen Recording",
    "settings.screenPermissionDesc":
      "Needed to detect the active app (speech bubbles).",
    "settings.sizeLarge": "Large",
    "settings.sizeMedium": "Medium",
    "settings.sizeSmall": "Small",
    "settings.sound": "Sound effects",
    "settings.soundDesc": "Play a small sound on interaction",
    // ---- 초기화 확인창 ----
    "confirm.reset": "Reset",
    "confirm.resetDesc":
      "All progress, personality, affinity, and settings will be erased and your pet returns to a pebble. This can't be undone.",
    "confirm.resetTitle": "Start over from scratch",
    // ---- 온보딩 ----
    "onboarding.tagline": "Your own little pet rock, living on your screen",
    "onboarding.step1": "One day, a small shooting star fell from the sky.",
    "onboarding.step2":
      "Thud! A mysterious meteorite just crashed down in front of you!",
    "onboarding.step3":
      "Huh..? Something seems to be rattling inside the meteorite.",
    "onboarding.step4": "....clatter... clatter...",
    "onboarding.step5": "Crrrack... crrrack...",
    "onboarding.step6":
      "Cracks begin to spread across the meteorite's surface.",
    "onboarding.step7":
      "The meteorite splits open, and a little pebble appears inside.",
    "onboarding.step8": "The pebble looks up at you.",
    "onboarding.step9":
      "Somehow, it doesn't feel right to just walk away and leave it here.",
    "onboarding.step10":
      "The little pebble has settled in by your side.\nFrom now on, live alongside ROCKIE.",
    "onboarding.step11": "To live together, it needs two permissions.",
    "onboarding.start": "Start",
    "onboarding.next": "Click to continue",
    "onboarding.relaunchStart": "Restart and start",
    "perm.screen": "Screen Recording",
    "perm.screenDesc":
      "Lets your pet notice the app you're using and say something.",
    "perm.dock": "Accessibility",
    "perm.dockDesc": "Reads the Dock's position so your pet doesn't cover it.",
    "perm.allow": "Allow",
    "perm.openSettings": "Open Settings",
  },
};

// 앱 시작 시 메인에서 동기로 받아 온다(첫 페인트 전에 필요).
let currentLocale =
  (window.trayAPI || window.petAPI)?.getLocale?.() === "en" ? "en" : "ko";

const localeListeners = new Set();

// key에 해당하는 문자열. 없으면 한국어로, 그것도 없으면 key 자체를 돌려준다
// (번역 누락이 화면에서 바로 눈에 띄도록).
function t(key, vars) {
  let s = I18N_STRINGS[currentLocale]?.[key] ?? I18N_STRINGS.ko?.[key] ?? key;
  if (vars) {
    for (const [name, value] of Object.entries(vars)) {
      s = s.replaceAll(`{${name}}`, value);
    }
  }
  return s;
}

function getLocale() {
  return currentLocale;
}

// 서사 데이터용. 돌 이름·성향 설명처럼 항목마다 { ko, en }을 들고 있는 값에서
// 현재 언어를 고른다(UI 문구의 키 방식과 달리, 내용이 데이터 파일에 표로 모여 있어
// 각 항목에 번역을 붙이는 편이 읽기 쉽다). 번역이 없으면 한국어로 떨어진다.
function pickText(bilingual) {
  if (bilingual == null || typeof bilingual === "string") return bilingual;
  return bilingual[currentLocale] ?? bilingual.ko;
}

// 언어 변경 시 다시 그릴 화면을 등록한다.
function onLocaleChange(callback) {
  localeListeners.add(callback);
}

function setLocale(locale) {
  const next = locale === "en" ? "en" : "ko";
  if (next === currentLocale) return;
  currentLocale = next;
  applyStaticI18n();
  for (const cb of localeListeners) cb(next);
}

// HTML에 직접 박힌 정적 문구를 현재 언어로 채운다.
// data-i18n: 텍스트만. data-i18n-html: <br> 같은 태그가 섞인 문구(사전 값만 들어간다).
function applyStaticI18n(root = document) {
  for (const el of root.querySelectorAll("[data-i18n]")) {
    el.textContent = t(el.dataset.i18n);
  }
  for (const el of root.querySelectorAll("[data-i18n-html]")) {
    el.innerHTML = t(el.dataset.i18nHtml);
  }
}

// 메인이 알려주는 언어 변경(설정에서 바꾼 경우)을 받아 즉시 반영한다.
(window.trayAPI || window.petAPI)?.onLocaleChanged?.(setLocale);
