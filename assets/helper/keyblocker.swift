// keyblocker — 키보드 청소 모드용 전역 키 차단 헬퍼
//
// 키보드 HID 디바이스를 seize하고, 보조로 CGEventTap(.cghidEventTap)을 만들어
// 모든 키 이벤트(keyDown/keyUp/flagsChanged)를 삼킨다.
//
// 부모(Electron main)가 stop 파일을 만들거나 부모 프로세스가 사라지면 스스로 종료해
// 탭을 제거한다 → 키보드가 잠긴 채 남는 사고를 방지한다.
//
// 권한이 없거나 키보드 seize가 실패하면 구체적인 상태를 알리고 종료한다.
// 성공하면 "READY" 또는 "READY_HID_ONLY"를 알린다.
//
// 빌드: swiftc keyblocker.swift -o keyblocker  (npm run build:helper)

import Foundation
import CoreGraphics
import ApplicationServices
import Darwin
import IOKit.hid
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

func exitIfParentIsGone() {
    guard let parentPid else { return }
    if kill(parentPid, 0) == -1 && errno == ESRCH {
        exit(0)
    }
}

if !AXIsProcessTrusted() {
    writeStatus("NO_ACCESSIBILITY")
    exit(1)
}

if IOHIDCheckAccess(kIOHIDRequestTypeListenEvent) != kIOHIDAccessTypeGranted {
    writeStatus("NO_INPUT_MONITORING")
    exit(1)
}

let hotKeyModeToken = PushSymbolicHotKeyMode(UInt32(kHIHotKeyModeAllDisabled))

func keyboardMatching(_ usage: Int) -> CFDictionary {
    [
        kIOHIDDeviceUsagePageKey: kHIDPage_GenericDesktop,
        kIOHIDDeviceUsageKey: usage
    ] as CFDictionary
}

let hidManager = IOHIDManagerCreate(kCFAllocatorDefault, IOOptionBits(kIOHIDOptionsTypeNone))
IOHIDManagerSetDeviceMatchingMultiple(hidManager, [
    keyboardMatching(kHIDUsage_GD_Keyboard),
    keyboardMatching(kHIDUsage_GD_Keypad)
] as CFArray)

let managerOpenResult = IOHIDManagerOpen(hidManager, IOOptionBits(kIOHIDOptionsTypeNone))
if managerOpenResult != kIOReturnSuccess {
    writeStatus("NO_HID_MANAGER:\(managerOpenResult)")
    exit(1)
}
let devices = (IOHIDManagerCopyDevices(hidManager) as? Set<IOHIDDevice>) ?? []
var seizedDevices: [IOHIDDevice] = []
var seizeFailures: [String] = []
for device in devices {
    let result = IOHIDDeviceOpen(device, IOOptionBits(kIOHIDOptionsTypeSeizeDevice))
    if result == kIOReturnSuccess {
        seizedDevices.append(device)
    } else {
        seizeFailures.append(String(result))
    }
}
IOHIDManagerScheduleWithRunLoop(
    hidManager,
    CFRunLoopGetCurrent(),
    CFRunLoopMode.commonModes.rawValue
)

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
    // 모든 키 이벤트를 삼킨다(nil 반환 = 이벤트 소멸).
    return nil
}

func cleanupAndExit() -> Never {
    if let hotKeyModeToken {
        PopSymbolicHotKeyMode(hotKeyModeToken)
    }
    for device in seizedDevices {
        IOHIDDeviceClose(device, IOOptionBits(kIOHIDOptionsTypeNone))
    }
    IOHIDManagerClose(hidManager, IOOptionBits(kIOHIDOptionsTypeNone))
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

if seizedDevices.isEmpty && maybePort == nil {
    writeStatus("NO_HID_SEIZE:\(seizeFailures.joined(separator: ","))")
    exit(1)
}

if let port = maybePort {
    tapPort = port

    let runLoopSource = CFMachPortCreateRunLoopSource(kCFAllocatorDefault, port, 0)
    CFRunLoopAddSource(CFRunLoopGetCurrent(), runLoopSource, .commonModes)
    CGEvent.tapEnable(tap: port, enable: true)
}

// 준비 완료를 먼저 알린 뒤(경합 방지) 부모 감시 스레드를 띄운다.
if !seizedDevices.isEmpty && maybePort != nil {
    writeStatus("READY")
} else if !seizedDevices.isEmpty {
    writeStatus("READY_HID_ONLY")
} else {
    writeStatus("READY_TAP_ONLY")
}

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
