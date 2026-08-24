# Grand Prix — Formula 1 Asset Pack for the Innioasis Y1

A complete, install-ready theme for the Innioasis Y1 stock firmware, plus the config schema
reference and the editor workflow needed to remap any asset onto the player's stock interface.

Everything in this pack is generated vector art — carbon-fibre weave, race-flag motifs, nomex
racing-suit twill, and a timing-tower settings set. No team logos, sponsor marks or series
trademarks are used, so it is safe to redistribute or submit to the community gallery.

---

## 1. What's in the pack

| Group | Count | Size | Description |
|---|---:|---|---|
| Home menu buttons | 13 | 166×166 | Carbon plates with race-flag bands (chequered, green, yellow, blue, yellow/red striped) |
| Settings icons | 49 | 146×146 | Circular carbon dials with red arc rings, ON/OFF pit-board badges, timing-tower numerals |
| Status bar icons | 18 | 22×15 – 30×16 | Transport, Bluetooth, headset, and 8 colour-coded battery states |
| Wallpapers | 2 | 320×240 | Racing-suit nomex desktop + flatter carbon global background |
| Overlay masks | 2 | 320×240 | Status-bar scrim, red rule, chequer strip, corner vignette |
| List row plates | 2 | 640×91 | Red pit-lane highlight with a chequered flag cap, plus a neutral row |
| Dialog plates | 2 | 88×46 | Selected / unselected pop-up option buttons |
| File browser icons | 2 | 64×64 | Pit-garage folder, tyre-disc audio file |
| Chevron | 1 | 28×28 | Drill-down arrow |
| Theme cover | 1 | 320×320 | Tile shown in the theme picker |
| **Total** | **93 PNG** | ~1.8 MB | Plus `config.json` and `ASSET_MANIFEST.csv` |

### Palette

| Role | Hex | Used for |
|---|---|---|
| Racing red | `#E10600` | Selection, accents, seek bar, ring arcs |
| Carbon base | `#15181C` / `#0A0C0E` | Plates, weave texture |
| Carbon lift | `#22272C` | Weave highlight |
| Silver | `#C9D0D8` | Glyph strokes, secondary text |
| Ink | `#05070A` | Chequer squares, outlines |
| Flag yellow | `#FFD400` | Caution motifs, brightness, backlight |
| Flag green | `#00D26A` | ON states, healthy battery |
| Flag blue | `#1E6FE8` | Bluetooth, language |

The two wallpapers are deliberately dark and low-contrast. The Y1's list text colour is only
partly themeable, and several users report white-on-white readability problems with light
wallpapers ([r/innioasis theme megathread](https://www.reddit.com/r/innioasis/comments/1jwetyl/innioasis_y1_theme_megathread/)),
so a dark base keeps every screen legible regardless of firmware quirks.

---

## 2. Directory structure

Themes live in one flat folder on the device — no subdirectories. The theme root is
`/storage/sdcard0/Themes/<YourThemeName>/`, which appears as `Themes\GrandPrix\` when the Y1 is
mounted over USB ([Innioasis theme creation guide](https://themes.innioasis.app/creators/)).

```text
/storage/sdcard0/Themes/GrandPrix/
├── config.json                  ← the only required logic file
├── cover.png                    ← 320×320 theme picker tile (required)
├── ASSET_MANIFEST.csv           ← key → file → size → UI element (documentation only)
│
├── desk.png                     ← 320×240 desktop wallpaper
├── global.png                   ← 320×240 wallpaper for all other screens
├── mask.png                     ← 320×240 desktop overlay
├── setting_mask.png             ← 320×240 settings overlay
├── transparent.png              ← 166×166 blank, for tiles you want hidden
│
├── Desk-Now Playing.png         ← 13 × 166×166 home menu buttons
├── Desk-Music.png
├── Desk-Videos.png
├── Desk-Audiobooks.png
├── Desk-Photos.png
├── Desk-FM Radio.png
├── Desk-Bluetooth.png
├── Desk-Settings.png
├── Desk-Shuffle Quick.png
├── Desk-Calendar.png
├── Desk-Calculator.png
├── Desk-Ebook.png
├── Desk-Files.png
│
├── set-shutdown.png             ← 49 × 146×146 settings icons
├── set-timer-off.png
├── set-timer-10.png … set-timer-120.png
├── set-shuffle-on.png / set-shuffle-off.png
├── set-repeat-all.png / set-repeat-one.png / set-repeat-off.png
├── set-eq-normal.png … set-eq-rock.png          (10 presets)
├── set-keylock-on/off.png
├── set-keytone-on/off.png
├── set-vibrate-on/off.png
├── set-livery.png               ← wallpaper picker
├── set-backlight-10.png … set-backlight-300.png, set-backlight-always.png
├── set-brightness.png
├── set-battery-on/off.png
├── set-racetime.png, set-language.png, set-launcher.png
├── set-reset.png, set-cache.png, set-theme.png
├── set-fileext-on/off.png
│
├── row_selected.png             ← 640×91 list highlight
├── row_normal.png               ← 640×91 unselected row
├── arrow_right.png              ← 28×28 chevron
├── dialog_selected.png          ← 88×46
├── dialog_no_selected.png       ← 88×46
├── folder.png                   ← 64×64
├── music_file.png               ← 64×64
│
├── playing.png, pause.png, stop.png             ← 22×15 transport
├── audiobook_playing.png, fm_playing.png        ← 22×15
├── bl1.png, bl2.png, bl3.png                    ← 22×16 Bluetooth states
├── headset1.png, headset2.png                   ← 22×17
├── bt1.png … bt4.png                            ← 30×16 battery
└── btc1.png … btc4.png                          ← 30×16 battery charging
```

**Filenames are yours to choose.** The firmware never looks for a fixed filename — it reads
whatever string sits on the right-hand side of a `config.json` key. That is why this pack uses
readable prefixes (`Desk-`, `set-`, `row_`) instead of the numbered `1.png … 18.png` convention
some older themes use.

---

## 3. `config.json` structure

### Top level

```json
{
  "theme_info": { "title": "...", "author": "...", "authorUrl": "...",
                  "description": "...", "externalDownloadUrl": "" },
  "author": "...",
  "authorUrl": "...",
  "themeCover":       "cover.png",
  "desktopWallpaper": "desk.png",
  "globalWallpaper":  "global.png",
  "desktopMask":      "mask.png",
  "fontFamily":       "",
  "itemConfig":     { },
  "dialogConfig":   { },
  "menuConfig":     { },
  "homePageConfig": { },
  "fileConfig":     { },
  "settingConfig":  { },
  "statusConfig":   { },
  "playerConfig":   { }
}
```

`theme_info` carries the gallery metadata; `author` and `authorUrl` are duplicated at the root
because some firmware builds read them from there. Only `config.json` and the cover image are
strictly required — every other key falls back to the built-in stock asset if it is absent or set
to `""` ([creator guide](https://themes.innioasis.app/creators/)).

### Section map

| Section | Paints | Asset sizes in this pack |
|---|---|---|
| root file keys | Cover tile, both wallpapers, desktop mask, font | 320×320, 320×240 |
| `itemConfig` | List rows everywhere: music library, file browser, playlists | 640×91 plates, 28×28 arrow |
| `dialogConfig` | Pop-up confirmations and option pickers | 88×46 plates |
| `menuConfig` | Main menu backdrop and menu row states | 640×91 plates |
| `homePageConfig` | The 13 home screen tiles | 166×166 |
| `fileConfig` | Folder and audio-file glyphs in the browser | 64×64 |
| `settingConfig` | Every settings row icon plus the settings overlay | 146×146, 320×240 mask |
| `statusConfig` | Status bar transport, Bluetooth, headset, battery arrays | 22×15 – 30×16 |
| `playerConfig` | Now Playing seek bar and time text (colours only) | n/a |

### Full key reference

Every key below exists in this pack's `config.json`. `ASSET_MANIFEST.csv` ships the same
information as a spreadsheet, with the measured pixel size of each file.

#### `itemConfig` — list rows

| Key | Value in this pack | Element |
|---|---|---|
| `itemTextColor` | `#D8DEE5` | Row label, unselected |
| `itemSelectedTextColor` | `#FFFFFF` | Row label, selected |
| `itemBackground` | `row_normal.png` | Row plate, unselected |
| `itemSelectedBackground` | `row_selected.png` | The moving red highlight bar |
| `itemRightArrow` | `arrow_right.png` | Drill-down chevron |

#### `dialogConfig` — pop-ups

| Key | Value | Element |
|---|---|---|
| `dialogOptionBackground` | `dialog_no_selected.png` | Option button, unselected |
| `dialogOptionTextColor` | `#D8DEE5` | Option label, unselected |
| `dialogOptionSelectedBackground` | `dialog_selected.png` | Option button, selected |
| `dialogOptionSelectedTextColor` | `#FFFFFF` | Option label, selected |
| `dialogBackgroundColor` | `#E6101317` | Panel fill, ARGB (90 % opaque) |
| `dialogTextColor` | `#FFFFFF` | Panel title and body |

#### `menuConfig` — main menu

`menuBackgroundColor` `#0F1216` · `menuItemBackground` `row_normal.png` ·
`menuItemTextColor` `#D8DEE5` · `menuItemSelectedBackground` `row_selected.png` ·
`menuItemSelectedTextColor` `#FFFFFF`

#### `homePageConfig` — 166×166 home tiles

| Key | Asset | Flag motif |
|---|---|---|
| `nowPlaying` | `Desk-Now Playing.png` | Chequered flag — race finish |
| `music` | `Desk-Music.png` | Slick tyre, red band |
| `video` | `Desk-Videos.png` | Onboard camera feed, green flag band |
| `audiobooks` | `Desk-Audiobooks.png` | Pit radio headset, black/orange band |
| `photos` | `Desk-Photos.png` | Photo-finish camera, chequered band |
| `fm` | `Desk-FM Radio.png` | Pit-wall antenna, yellow/red striped band |
| `bluetooth` | `Desk-Bluetooth.png` | Blue flag band |
| `settings` | `Desk-Settings.png` | Wheel nut and gear, silver band |
| `shuffleQuick` | `Desk-Shuffle Quick.png` | Crossed arrows, yellow/red striped band |
| `calendar` | `Desk-Calendar.png` | Race calendar, red band |
| `calculator` | `Desk-Calculator.png` | Lap-delta timing screen, green band |
| `ebook` | `Desk-Ebook.png` | Sporting regulations, chequered band |
| `fileManager` | `Desk-Files.png` | Pit garage, chequered band |

Set any of these to `"transparent.png"` to blank a tile you never use.

#### `settingConfig` — 146×146, 49 icons

`settingMask` is the 320×240 settings overlay; the remaining 48 keys are one-to-one with a
settings row:

- **Power** — `shutdown`, `timedShutdown_off`, `timedShutdown_10/20/30/60/90/120`
- **Playback** — `shuffleOn`, `shuffleOff`, `repeatOff`, `repeatAll`, `repeatOne`
- **Equaliser** — `equalizer_normal`, `_classical`, `_dance`, `_flat`, `_folk`, `_heavymetal`,
  `_hiphop`, `_jazz`, `_pop`, `_rock`
- **Keys** — `keyLockOn/Off`, `keyToneOn/Off`, `keyVibrationOn/Off`
- **Display** — `wallpaper`, `backlight_10/15/30/45/60/120/300`, `backlight_always`,
  `brightness`, `displayBatteryOn/Off`
- **System** — `dateTime`, `language`, `launcher`, `factoryReset`, `clearCache`, `theme`,
  `fileExtensionOn/Off`

The design system encodes state so a row is readable at a glance: green ring plus a green **ON**
pit board for enabled states, grey ring plus a red **OFF** board for disabled, and a red-arc dial
with a large numeral for anything with a numeric step (timers in `MIN`, backlight in `SEC`).

#### `statusConfig` — status bar

| Key | Asset | Note |
|---|---|---|
| `playing` / `pause` / `stop` | `playing.png` / `pause.png` / `stop.png` | 22×15 solid silhouettes |
| `audiobookPlaying` | `audiobook_playing.png` | Open-book mark |
| `fmPlaying` | `fm_playing.png` | Antenna with signal arcs |
| `blDisconnected` / `blConnected` / `blConnecting` | `bl1.png` / `bl2.png` / `bl3.png` | Dimmed rune / green dot / amber dot |
| `headsetWithoutMic` / `headsetWithMic` | `headset1.png` / `headset2.png` | Red boom mic marks the mic variant |
| `statusBarColor` | `#00000000` | Fully transparent, so `mask.png`'s scrim shows through |
| `battery` | `bt1–bt4.png` | 0–25 red, 26–50 orange, 51–75 yellow, 76–100 green |
| `batteryCharging` | `btc1–btc4.png` | Green cells plus a haloed white bolt |

`battery` and `batteryCharging` are **ordered arrays of exactly four filenames**, low to high.
Any other length is the single most common cause of a status bar that renders blank.

#### `playerConfig` — Now Playing

`progressTextColor` `#FFFFFF` · `progressColor` `#E10600` · `progressBackgroundColor`
`#33FFFFFF` (20 % white track, so it reads on either wallpaper).

### Colour format rules

- `#RRGGBB` or `#AARRGGBB` — alpha comes **first**, not last.
- `#33FFFFFF` is 20 % white; `#00000000` is fully transparent.
- Always quote the string, including hex values.
- Use `""` to fall back to the stock asset. Do **not** use `null`, and never leave a trailing
  comma — the theme silently fails to appear in the picker if the JSON does not parse.

---

## 4. Installing the theme

Three routes. Pick one.

### Route A — USB mass storage (works on every firmware)

1. Connect the Y1 by USB and put it into USB storage mode so it mounts as a drive.
2. Open the `Themes` folder at the root of the device storage.
3. Copy the whole `GrandPrix` folder in. Keep it flat — do not nest it inside another folder.
4. Eject safely and disconnect.
5. On the Y1: **Settings → Change Theme → Grand Prix → confirm**.

### Route B — Innioasis Updater toolkit

The Innioasis Updater (community fork of the original updater) has a **Y1 Themes + Tools** entry
that handles the copy for you, and a Remote Control tool that can capture screenshots of the Y1
screen for documenting a theme ([Innioasis Updater release notes](https://newreleases.io/project/github/y1-community/Innioasis-Updater/release/1.9.3.6)).
Screenshotting is not enabled out of the box on units that shipped with firmware 2.1.9 or
earlier — you have to run the updater once first ([creator guide](https://themes.innioasis.app/creators/)).

### Route C — community gallery direct install

[themes.innioasis.app](https://themes.innioasis.app/) hosts the community theme gallery with an
interactive preview and a one-click **Direct Install** that copies all theme files to a connected
device ([theme gallery](https://themes.innioasis.app/theme.html)). Useful for testing other
people's themes and for publishing this one once you've customised it.

### Verifying it took

The app validates a theme by checking that the folder exists under `Themes/`, that `config.json`
is present and parses, and that referenced image files exist ([creator guide](https://themes.innioasis.app/creators/)).
If **Grand Prix** does not show up in the picker, work down that list in order — a JSON syntax
error is by far the most common cause, followed by a filename case mismatch.

---

## 5. Using the theme editor to remap assets

There is no WYSIWYG theme editor on the Y1. The community workflow — and what "theme editor"
means in practice — is a three-part loop: edit `config.json`, replace PNGs, re-apply on device.
The gallery's interactive preview acts as the visual editor, letting you check a folder before it
touches hardware.

### The core loop

1. **Duplicate, never edit in place.** Copy `GrandPrix/` to `GrandPrix-Work/` on your computer
   and rename the folder. Two themes with the same folder name collide in the picker.
2. **Open `config.json` in a real editor.** VS Code, or any online JSON editor. Double-clicking
   usually opens it in a browser, which is read-only.
3. **Change the value, not the key.** Keys are fixed by the firmware. The value is a plain
   relative filename — never an absolute path, never a subfolder.
4. **Copy the folder back to `Themes/` and re-select the theme.** Some builds cache the previous
   theme, so switch to another theme and back to force a reload.
5. **Walk every screen.** Home grid, a long track list, each settings page, a pop-up dialog, and
   Now Playing with a track actually playing. Selected and unselected states both need checking.

### Remapping recipes

**Swap one home tile.** Drop your 166×166 PNG into the folder and point the key at it:

```json
"homePageConfig": { "music": "my-helmet-icon.png" }
```

**Hide a tile you never use.**

```json
"homePageConfig": { "ebook": "transparent.png" }
```

**Change the team colour across the whole theme.** Replace `#E10600` everywhere in
`config.json`, then recolour the four assets that carry red pixels: `row_selected.png`,
`dialog_selected.png`, `arrow_right.png`, and the accent bar on each `Desk-*.png`.

**Reuse the pack's plates with different glyphs.** The generator scripts in `build/` are
parameterised. `gp_lib.home_plate(glyph, accent, 166, band)` produces a home tile and
`gp_lib.round_plate(glyph, 146, ring, label, badge)` produces a settings icon, so a new icon
needs only a new glyph in a 100×100 coordinate box.

**Swap in a custom font.** Put a licensed `.ttf` in the theme root and set
`"fontFamily": "YourFont.ttf"`. It is loaded with `Typeface.createFromFile()` and applied to
every text view in the app ([creator guide](https://themes.innioasis.app/creators/)). This pack
ships `""` so it uses the system font — no font is bundled, to avoid redistributing one.

**Go back to a stock element.** Set the key to `""` or delete it. Both fall back to the built-in
asset, which is the fastest way to isolate a broken image.

### Gotchas that cost the most time

| Symptom | Cause |
|---|---|
| Theme missing from the picker | `config.json` does not parse — trailing comma, smart quotes, unquoted hex |
| One icon stays stock | Filename case mismatch. `Music.png` and `music.png` are different files |
| Status bar renders blank | `battery` or `batteryCharging` array does not contain exactly four entries |
| Icons look soft or wrong-sized | Source PNG was not at the spec size; the firmware scales rather than crops |
| List text unreadable | Wallpaper too light. Y1 list text colour is only partly themeable, so keep backgrounds dark |
| Cover image does not update | Known flaky behaviour on some builds — reboot the player after switching theme |

---

## 6. Publishing

To submit to the community gallery, `theme_info` must carry `title`, `author`, `authorUrl` and
`description`, and the gallery accepts a zipped theme folder with optional `screenshot.png` /
`screenshot.gif` previews — an animated GIF shows first in theme listings
([creator guide](https://themes.innioasis.app/creators/)). Themes are collected in the
[y1-community/InnioasisY1Themes](https://github.com/y1-community/InnioasisY1Themes) repository
under the MIT license.

Update `theme_info.author` and `theme_info.authorUrl` in `config.json` to your own details
before publishing.

---

## Sources

- Innioasis theme creation guide — https://themes.innioasis.app/creators/
- Community theme gallery — https://themes.innioasis.app/
- Theme repository (MIT) — https://github.com/y1-community/InnioasisY1Themes
- Reference `config.json` files inspected for real key names —
  https://raw.githubusercontent.com/y1-community/InnioasisY1Themes/main/MelodyMuncher/config.json
- Innioasis Updater / Y1 Themes + Tools — https://newreleases.io/project/github/y1-community/Innioasis-Updater/release/1.9.3.6
- r/innioasis theme megathread — https://www.reddit.com/r/innioasis/comments/1jwetyl/innioasis_y1_theme_megathread/
- r/innioasis how to create Y1 themes — https://www.reddit.com/r/innioasis/comments/1kqkcqq/how_to_create_y1_themes/
- Y1 Helper — https://github.com/team-slide/Y1-helper

Asset dimensions in this pack were verified against the stock `MelodyMuncher` theme rather than
taken from documentation alone: cover 320×320, wallpapers and masks 320×240, home icons 166×166,
settings icons 146×146, list plates 640×91, dialog plates 88×46, battery 30×16, transport
22×15.
