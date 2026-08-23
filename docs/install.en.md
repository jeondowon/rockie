# Installing Rockie

Last updated: 2026-08-23
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

Rockie uses three macOS permissions. **Your pet works normally whether or not you grant them.**

| Permission | When it is requested | Used for | If you decline |
| --- | --- | --- | --- |
| Screen Recording | During first-run setup | Reading the **title** of the window you are looking at | App names are still readable, so most bubbles keep appearing — only the ones that need the title drop out |
| Automation **(recommended)** | During first-run setup | Asking macOS where the Dock is | The pet may overlap the Dock |
| Accessibility **(recommended)** | During first-run setup · the first time you start nap or cleaning mode | Reading the Dock's position · locking the keyboard | The pet may overlap the Dock, and the keyboard is not locked in those modes (the alarm still rings) |

The Automation and Accessibility prompts appear **only when you tap those rows yourself during first-run setup** (Screen Recording is the one asked automatically, once). If you decline, macOS will not ask again — see "Changing permissions later" below if you change your mind.

They are marked **(recommended)** because the app runs fine without them, but the pet visibly overlaps the Dock, which looks off. The two work as a pair: granting only one has no effect.

### Why avoiding the Dock takes two permissions

Reading the Dock's position is a one-line command, but macOS splits it into two steps.

1. Rockie asks macOS's `System Events` to go look at where the Dock is → **Automation**
2. `System Events` actually reads the Dock's on-screen elements → **Accessibility**

At step 2 macOS checks the permission of **Rockie, the app that asked** — not of `System Events`, the app doing the errand. That is deliberate: it stops apps from using a shared tool as a shield. So granting only Automation clears step 1 and gets blocked at step 2.

Declining both is fine — your pet still works, it just becomes less precise at stepping around the Dock.

### If "Screen Recording" gives you pause

macOS bundles **reading other apps' window titles** and **capturing your screen** into the same permission. Rockie needs only the former, which is why it asks — it **does not capture or save your screen.**

Window titles are used solely to pick which speech bubble to show. They are never displayed and never recorded, and no bubble appears at all in messaging, financial, or authentication screens. See the [Privacy Policy](https://jeondowon.com/rockie/en/privacy) for details.

### If you granted a permission and nothing changed

**Quit the app completely and open it again.** macOS does not apply a newly granted permission to an already-running app. Use the menu bar icon → **Quit**, then launch Rockie again.

### Changing permissions later

Menu bar icon → **Settings → Permissions** shows the current state and can open System Settings for you. Tapping a row you have not granted yet shows the permission prompt once, then opens System Settings.

You can also change them directly in macOS **System Settings → Privacy & Security**.

Under Accessibility you will find **two** entries. They do different jobs, so macOS lists them separately.

- **`Rockie`** — reads the Dock's position. Turn it off and the pet may overlap the Dock.
- **`KeyBlocker`** — locks the keyboard in nap and cleaning modes. The keyboard-locking feature is split out into a separate small program.

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
| Bubbles that react to window titles never appear | Confirm you granted Screen Recording **and restarted the app** (bubbles that only look at the app name work without it) |
| No bubbles appear at all | Check the three switches under Settings → Speech bubbles |
| The pet overlaps the Dock | Grant **both** Automation and Accessibility (Settings → Permissions). Accessibility takes effect only after you restart the app |
| The keyboard is not locked in nap mode | Enable **`KeyBlocker`** under Accessibility, then restart the app |
| You cannot find the icon in the menu bar | With many items it can be pushed off screen — clear out other icons, or check with a tool like Bartender |

If none of this helps, reach out at [dowon.9102@gmail.com](mailto:dowon.9102@gmail.com) or on [GitHub Issues](https://github.com/jeondowon/rockie/issues).
