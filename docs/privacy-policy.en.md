# Rockie Privacy Policy

Last updated: 2026-08-22
Applies to: Rockie 1.0.1 and later

Rockie ("the app") is a free macOS desktop app made by an individual developer, jeondowon. This policy explains what information the app handles and where that information stays.

---

## 1. Summary

- **The app does not collect personal information, and there is no server holding your data.**
- Everything the app handles is processed and stored on your own Mac.
- No advertising SDKs, no analytics SDKs, no usage tracking of any kind.
- The only outbound connection is the **automatic update check**, described in section 5.

---

## 2. What is stored on your Mac

The information below is stored in exactly one file on your Mac:

```
~/Library/Application Support/Rockie/petdata.json
```

| Item | Purpose |
| --- | --- |
| The name you entered | Personalizing speech bubbles |
| Your pet's name | Display, affection rewards |
| Answers to personality questions | Determining your stone type and evolution stage |
| Evolution stage, affection, skin state | Keeping your progress |
| App settings (launch at login, sound, pet position and size, focus/nap durations, language) | Keeping your preferences |
| First install time, onboarding completion | Deciding whether to show first-run guidance |

This file is an ordinary file inside your own user folder. The app never sends it anywhere.

---

## 3. What is read in the moment but never stored

The information below is read only while the app is running, so it can react on screen. **It is never written to a file and never transmitted.** It disappears when you quit the app.

| Item | Purpose |
| --- | --- |
| Name and window title of the frontmost app | Choosing a speech bubble that fits what you are doing |
| Time since your last input (idle time) | Reacting when you step away |
| Current time of day | Time-of-day reactions |
| CPU, memory, disk, battery, and network usage | The system monitor screen |
| Position and size of the Dock | Keeping your pet from covering the Dock |
| Whether screen recording permission is granted | Telling you which features are available |

**About window titles**

A window title can contain private details, such as a document name or a web page title. Here is how the app treats them.

**Window titles are never displayed.** The app matches the title against a fixed set of built-in conditions to decide which speech bubble to show. Every line your pet says is written into the app in advance; there is no path by which a window title you have open appears on screen.

**In the following areas, no speech bubble is shown at all.**

- KakaoTalk and mail apps
- Banks, credit cards, brokerages, cryptocurrency exchanges
- Hospitals, government and civil service sites
- Password managers, authenticator apps, sign-in and verification screens

In work chat tools such as Slack, Discord, and Microsoft Teams, a generic bubble along the lines of "Someone's pinging you" may appear. Even then, no message content and no window title is shown.

---

## 4. System permissions

The app can use three macOS permissions. **The core features work whether or not you grant any of them.**

| Permission | Used for | If you decline |
| --- | --- | --- |
| Screen Recording | Reading the name and title of the frontmost window | Only the app-aware speech bubbles stop appearing |
| Automation (System Events) | Reading the Dock's position and size | Your pet may overlap the Dock |
| Accessibility | Locking the keyboard in nap and cleaning modes | The keyboard is not locked in those modes |

Despite its name, macOS "Screen Recording" permission is **not used here to capture or record your screen.** macOS requires it in order to read other apps' window titles, which is why the app asks for it. The app does not capture your screen.

---

## 5. The one outbound connection: automatic updates

The app connects to **GitHub Releases** (github.com) to check whether a new version exists.

- When: one minute after the app starts, then every six hours.
- What is sent: an ordinary web request for a file describing the latest version. The app does not include your name, your pet's data, your usage history, or any other personal information in this request.
- However, as with any internet connection, **GitHub's servers may record your IP address, the time of the request, and which file was requested.** That data is handled under GitHub's own privacy statement, and the developer has no access to it.
  - GitHub Privacy Statement: https://docs.github.com/site-policy/privacy-policies/github-privacy-statement

If you would rather this connection did not happen, you can block the app's outbound access in the macOS firewall. Only the update check will fail; everything else keeps working.

Separately, pressing a link button in the app's settings opens that page in your default browser. This happens only when you press it yourself.

---

## 6. Sharing with third parties

The app does not share or sell your information to anyone. No information reaches the developer in the first place.

---

## 7. Keeping and deleting your data

Because everything the app stores lives only on your Mac, deleting it is entirely under your control.

**Clearing it from inside the app**
Menu bar icon → Settings → "Start over" erases your saved progress, personality, affection, and settings, returning the app to its initial state.

**Removing everything**
Delete the app, then delete the folder below and nothing will remain.

```
~/Library/Application Support/Rockie/
```

You can also revoke the permissions you granted to Rockie in System Settings → Privacy & Security.

---

## 8. Children's privacy

The app does not collect personal information from anyone, so it does not verify age and does not knowingly collect information from children.

---

## 9. Changes to this policy

If a new feature changes what information the app handles, this policy will be updated and the date at the top revised. Significant changes will also be noted in the app's release notes.

---

## 10. Contact

For questions about the app or how it handles information:

- Email: dowon.9102@gmail.com
- GitHub Issues: https://github.com/jeondowon/rockie/issues

---

*This document is an English translation provided for convenience. In the event of any discrepancy, the [Korean version](https://jeondowon.com/rockie/privacy) prevails.*
