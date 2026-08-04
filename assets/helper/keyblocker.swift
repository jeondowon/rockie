// keyblocker — 키보드 청소 모드용 전역 키 차단 헬퍼
//
// CGEventTap(.cghidEventTap)으로 모든 키 이벤트(keyDown/keyUp/flagsChanged)를 삼킨다.
// 이벤트를 소멸시키는 액티브 탭이라 '손쉬운 사용' 권한만 있으면 동작한다.
//
// 예전에는 키보드 HID 디바이스를 seize하는 경로도 있었으나 전부 제거했다.
// seize는 Apple 전용 entitlement가 필요해 일반 앱에서는 한 번도 성공하지 못했고
// (항상 READY_TAP_ONLY), 그 경로 때문에 '입력 모니터링' 권한만 불필요하게 요구했다.
//
// 부모(Electron main)가 stop 파일을 만들거나 부모 프로세스가 사라지면 스스로 종료해
// 탭을 제거한다 → 키보드가 잠긴 채 남는 사고를 방지한다.
//
// 빌드: swiftc keyblocker.swift -o keyblocker  (npm run build:helper)

import Foundation
import CoreGraphics
import ApplicationServices
import Darwin
import Carbon.HIToolbox

let args = CommandLine.arguments
let statusPath = args.count > 1 ? args[1] : nil
let stopPath = args.count > 2 ? args[2] : nil
let parentPid = args.count > 3 ? pid_t(args[3]) : nil

func writeStatus(_ status: String) {
    let data = "\(status)\n".data(using: .utf8)!
    FileHandle.standardOutput.write(data)
    if let statusPath {
        try? data.write(to: URL(fileURLWithPath: statusPath), options: .atomic)
    }
}

// ---------- 비상 해제 제스처 ----------
// 키를 전부 삼키는 동안에도 "스페이스바 10연타"만은 세어 부모에게 알린다.
// 마우스를 못 쓰는 상황의 탈출구다. 키보드를 닦을 때는 온갖 키가 뒤섞여 눌리므로,
// 스페이스 외의 키가 하나라도 섞이면 카운트를 버려서 오작동을 막는다.
// (탭 콜백은 메인 런루프에서만 불려 카운터 경합은 없다)
let UNLOCK_TAP_COUNT = 10
// 연타로 인정하는 최대 간격. 너무 짧으면(0.4초) 또박또박 누를 때 카운트가 계속 끊긴다.
let UNLOCK_MAX_GAP: TimeInterval = 0.8
let SPACE_KEY_CODE: Int64 = 49 // CGEvent 기준 스페이스바
var spaceTapCount = 0
var lastSpaceTapAt: TimeInterval = 0
var unlockRequested = false

// isSpace=false면(다른 키가 눌렸으면) 카운트를 초기화한다.
func noteKeyDown(isSpace: Bool) {
    if unlockRequested { return }
    if !isSpace {
        // 다른 키가 섞였다 = 닦는 중이다. 세던 걸 버린다.
        if spaceTapCount > 0 {
            spaceTapCount = 0
            writeStatus("SPACE_TAP:0")
        }
        return
    }
    let now = Date().timeIntervalSince1970
    if now - lastSpaceTapAt > UNLOCK_MAX_GAP { spaceTapCount = 0 }
    lastSpaceTapAt = now
    spaceTapCount += 1
    if spaceTapCount >= UNLOCK_TAP_COUNT {
        unlockRequested = true
        // 해제는 부모가 결정한다(여기서 탭을 풀면 앱 화면이 잠긴 채 남는다)
        writeStatus("UNLOCK_REQUEST")
    } else {
        // 진행 상황을 화면에 보여줘, 입력이 잡히고 있는지 사용자가 바로 알 수 있게 한다
        writeStatus("SPACE_TAP:\(spaceTapCount)")
    }
}

func exitIfParentIsGone() {
    guard let parentPid else { return }
    if kill(parentPid, 0) == -1 && errno == ESRCH {
        exit(0)
    }
}

// 권한이 없으면 부족한 목록을 알리고 물러난다. 잠금은 사용자가 권한을 켜고
// 다시 시도할 때 걸린다.
var missingPermissions: [String] = []
// 조회(AXIsProcessTrusted)만으로도 시스템 설정 '손쉬운 사용' 목록에 KeyBlocker가
// 자동으로 올라간다. 시스템 대화창은 일부러 띄우지 않는다 — 안내 카드의 버튼으로
// 설정창을 열면 항목이 이미 올라와 있어서, 대화창까지 뜨면 창만 늘어난다.
if !AXIsProcessTrusted() { missingPermissions.append("ax") }

if !missingPermissions.isEmpty {
    writeStatus("NO_PERMS:\(missingPermissions.joined(separator: ","))")
    exit(1)
}

let hotKeyModeToken = PushSymbolicHotKeyMode(UInt32(kHIHotKeyModeAllDisabled))

// 탭 참조(콜백에서 타임아웃 시 재활성화하려고 전역으로 둔다)
var tapPort: CFMachPort?

let eventMask: CGEventMask =
    (1 << CGEventType.keyDown.rawValue) |
    (1 << CGEventType.keyUp.rawValue) |
    (1 << CGEventType.flagsChanged.rawValue)

func eventCallback(
    proxy: CGEventTapProxy,
    type: CGEventType,
    event: CGEvent,
    userInfo: UnsafeMutableRawPointer?
) -> Unmanaged<CGEvent>? {
    // 시스템이 탭을 비활성화하면(과부하/사용자 입력) 다시 켠다.
    if type == .tapDisabledByTimeout || type == .tapDisabledByUserInput {
        if let port = tapPort {
            CGEvent.tapEnable(tap: port, enable: true)
        }
        return nil
    }
    // 삼키기 전에 비상 해제 제스처만 센다. 꾹 눌러 생기는 자동 반복은 연타가 아니므로 뺀다.
    if type == .keyDown, event.getIntegerValueField(.keyboardEventAutorepeat) == 0 {
        noteKeyDown(
            isSpace: event.getIntegerValueField(.keyboardEventKeycode) == SPACE_KEY_CODE
        )
    } else if type == .flagsChanged {
        noteKeyDown(isSpace: false) // 수식키가 눌렸다 = 스페이스 연타가 아니다
    }
    // 모든 키 이벤트를 삼킨다(nil 반환 = 이벤트 소멸).
    return nil
}

func cleanupAndExit() -> Never {
    if let hotKeyModeToken {
        PopSymbolicHotKeyMode(hotKeyModeToken)
    }
    exit(0)
}

let maybePort = CGEvent.tapCreate(
    tap: .cghidEventTap,           // HID 레벨(가장 낮은 단계): 윈도우 서버가 시스템 단축키를
                                   // 처리하기 전에 가로채므로 Cmd+Space(Spotlight)·Cmd+Tab까지 확실히 삼킨다.
    place: .headInsertEventTap,
    options: .defaultTap,          // active tap: 이벤트를 수정·소멸시킬 수 있음
    eventsOfInterest: eventMask,
    callback: eventCallback,
    userInfo: nil
)

guard let port = maybePort else {
    writeStatus("NO_EVENT_TAP")
    exit(1)
}
tapPort = port

let runLoopSource = CFMachPortCreateRunLoopSource(kCFAllocatorDefault, port, 0)
CFRunLoopAddSource(CFRunLoopGetCurrent(), runLoopSource, .commonModes)
CGEvent.tapEnable(tap: port, enable: true)

// 준비 완료를 먼저 알린 뒤(경합 방지) 부모 감시 스레드를 띄운다.
writeStatus("READY")

// 부모가 죽거나 메인이 stop 파일을 만들면 종료(탭 제거). 별도 스레드에서 감시.
Thread.detachNewThread {
    while true {
        if let stopPath, FileManager.default.fileExists(atPath: stopPath) {
            cleanupAndExit()
        }
        exitIfParentIsGone()
        Thread.sleep(forTimeInterval: 0.1)
    }
}

CFRunLoopRun()
