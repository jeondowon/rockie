# Installing Rockie

Last updated: 2026-08-22
Requires: macOS 12 (Monterey) or later · Apple Silicon (M1 or newer)

---

## 1. Installing

1. Download `Rockie-x.x.x-arm64.dmg` from the [download page](https://jeondowon.com/rockie).
2. Double-click the downloaded file.
3. In the window that appears, **drag Rockie into your `Applications` folder.**
4. Open Rockie from `Applications`.

Rockie is signed and notarized with a registered Apple Developer ID, so macOS will not show a security warning when you open it.

> **Intel Macs are not supported yet.** The current build is Apple Silicon only.

---

## 2. There is no Dock icon

Rockie **lives only in the menu bar at the top of your screen.** No icon appears in the Dock, and it does not show up in `Cmd+Tab`. This is intentional, not a bug.

- Everything is reached through the **Rockie icon in the menu bar** at the top of your screen. If your menu bar is crowded, the icon may be pushed left or hidden.
- The pet itself floats on your screen; double-click it to open the mode picker.
- Rockie does appear in Launchpad, so you can launch it from there.

The reason is that the pet needs to stay visible **on top of full-screen apps.** macOS does not let an app do both, so the Dock icon was the thing to give up.

---

## 3. Permissions

Rockie uses three macOS permissions. **Your pet works normally whether or not you grant them** — each one is tied to a single feature.

| Permission | When it is requested | Used for | If you decline |
| --- | --- | --- | --- |
| Screen Recording | During first-run setup | Noticing which app you are using, so the pet can react to it | Only the app-aware speech bubbles stop appearing |
| Automation | During first-run setup (optional) | Reading the Dock's position so the pet steps around it | The pet may overlap the Dock |
| Accessibility | The first time you start nap or cleaning mode | Locking the keyboard | The keyboard is not locked in those modes (the alarm still rings) |

### If "Screen Recording" gives you pause

macOS bundles **reading other apps' window titles** and **capturing your screen** into the same permission. Rockie needs only the former, which is why it asks — it **does not capture or save your screen.**

Window titles are used solely to pick which speech bubble to show. They are never displayed and never recorded, and no bubble appears at all in messaging, financial, or authentication screens. See the [Privacy Policy](https://jeondowon.com/rockie/en/privacy) for details.

### If you granted a permission and nothing changed

**Quit the app completely and open it again.** macOS does not apply a newly granted permission to an already-running app. Use the menu bar icon → **Quit**, then launch Rockie again.

### Changing permissions later

Menu bar icon → **Settings → Permissions** shows the current state and can open System Settings for you.

You can also change them directly in macOS **System Settings → Privacy & Security**. Under Accessibility, the entry appears as **`KeyBlocker`**, not `Rockie` — the keyboard-locking feature is a separate small program.

---

## 4. Updates

Rockie **checks for and downloads new versions automatically.** When a download finishes, you get one notification and an **"Install update and restart"** item appears in the menu bar menu.

- Choosing that item swaps in the new version and reopens the app immediately.
- If you ignore it, the update applies the next time you quit and reopen the app.
- With no internet connection, the check fails quietly and is retried later.

Your current version is shown at the bottom of the Settings screen.

---

## 5. Uninstalling

1. Menu bar icon → **Quit**.
2. Move Rockie from `Applications` to the Trash.

To remove your saved pet data as well, delete this folder:

```
~/Library/Application Support/Rockie/
```

In Finder, press `Shift+Cmd+G` and paste the path to go straight there.

For a clean removal, also delete the `Rockie` and `KeyBlocker` entries in System Settings → Privacy & Security.

> If you want to **start over** without uninstalling, use "↻ Start over" on the Settings screen.

---

## 6. Troubleshooting

| Symptom | What to check |
| --- | --- |
| The pet is not visible | The menu bar's "Hide / show pet" may be set to hidden |
| App-aware bubbles never appear | Confirm you granted Screen Recording **and restarted the app** |
| The pet overlaps the Dock | Grant Automation permission (Settings → Permissions) |
| The keyboard is not locked in nap mode | Enable **`KeyBlocker`** under Accessibility, then restart the app |
| You cannot find the icon in the menu bar | With many items it can be pushed off screen — clear out other icons, or check with a tool like Bartender |

If none of this helps, reach out at [dowon.9102@gmail.com](mailto:dowon.9102@gmail.com) or on [GitHub Issues](https://github.com/jeondowon/rockie/issues).
