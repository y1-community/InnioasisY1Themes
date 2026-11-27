# Innioasis Y1 & Y2 Theme Cross-Compatibility Architecture

> Grounded in static DEX bytecode and resource analysis of `com.innioasis.y1` v`3.1.2` (REA Evidence `ev_82131a08beeee3158809ac24c5339bd5d4867a98cdbd18bac2a0105a60419b6f`) and `com.innioasis.y2` v`3.2.9` from firmware `3.2.8-fm` (REA Evidence `ev_f0bbea5a17d3dc58f43b262c315112312ee94660bfcbb30c890d90816ececfa1`).

---

## 1. Why Almost Every Theme Works Across Both Y1 and Y2

Both launchers parse `config.json` with Gson into Kotlin data classes (`ThemeConfig` and its 8 sub-configs). Unknown JSON fields are silently ignored by Gson on older firmware.

| Config Class | Y1 `3.1.2` Fields | Y2 `3.2.8-fm` Fields | Additive / Clash? |
| :--- | :---: | :---: | :--- |
| `ThemeConfig` | 13 | **15** (`+fontScale`, `+showNativeIcon`) | **100% additive** |
| `HomePageConfig` | 12 | **13** (`+fileManager`) | **100% additive** *(except `bluetooth` semantic reuse below)* |
| `ItemConfig` | 5 | **6** (`+itemSelectedBackgroundIs9Patch`) | **Clash on `.9.png` bitmaps** |
| `SettingConfig` | 50 | **67** (`+6 category*`, `+4 headphoneGain*`, `+2 speaker*`, `+3 wheelSensitivity*`, `+2 wheelVolume*`) | **100% additive** |
| `DialogConfig` | 6 | 6 | **Identical** |
| `MenuConfig` | 5 | 5 | **Identical** |
| `FileConfig` | 2 | 2 | **Identical** |
| `PlayerConfig` | 2 | 2 | **Identical** |
| `StatusConfig` | 13 | 13 | **Identical** *(neither reads `statusTextColor`)* |

---

## 2. The Only Two Real Binary Clashes (and How the Gallery & Studio Solve Them Automatically)

### Clash A — Bluetooth Icon Reuse (`homePageConfig.bluetooth`)
- **Binary proof:** In Y2 `3.2.8-fm`, `LK0/n;->f` maps `R.drawable.icon_setting_bluetooth` directly to `HomePageConfig.getBluetooth()`. `SettingConfig` has **no** `bluetooth` field.
- **Visual impact:** On Y1, `homePageConfig.bluetooth` renders as a large Home screen icon (`166×166`). On Y2 `3.2.0+`, Bluetooth moved inside **Settings**, so Innioasis replaced `Bluetooth.png` / `Desk-Bluetooth.png` in `HoloBubble`, `HoloFacet`, and `Melody Munchkin` with Settings-styled icons (e.g., `Melody Munchkin`'s yellow-mouth Home character became a green-outline Settings character).
- **Zero-duplication solution:**
  1. Themes can keep a single cross-compatible repository folder while optionally declaring **`settingConfig.bluetooth`** for their **Y2 Settings Bluetooth icon** alongside **`homePageConfig.bluetooth`** for their **Y1 Home Bluetooth icon** (Gson on both Y1 and Y2 safely ignores `settingConfig.bluetooth`).
  2. When a user downloads a ZIP or Direct-Installs to USB:
     - For **Y2**, the packager automatically substitutes `settingConfig.bluetooth` into `homePageConfig.bluetooth` (and strips the extra key so the device receives clean stock JSON).
     - For **Y1**, the packager keeps `homePageConfig.bluetooth` (the Y1 Home icon) untouched.

### Clash B — Android `.9.png` Selection Bars (`itemSelectedBackgroundIs9Patch`)
- **Binary proof:** Y2 (`LK0/n;->s` + `LL0/f;->a`) parses 1px black stretch guides on `.9.png` files into a `NinePatchDrawable` when `itemSelectedBackgroundIs9Patch: true`. Y1 `3.1.2` (`ThemeManager.itemSetBackground`) has **zero** `NinePatchDrawable` code and renders `.9.png` files as plain bitmaps — drawing the 1px black guide border literally on screen.
- **Zero-duplication solution:**
  - When packaging or installing for **Y2**, keep the `.9.png` file and `itemSelectedBackgroundIs9Patch: true`.
  - When packaging or installing for **Y1**, automatically strip the 1px 9-patch guide border (cropping `(1, 1, w-2, h-2)` into a clean plain `.png` filename, or using an explicit Y1 fallback asset if provided) and omit `itemSelectedBackgroundIs9Patch`.

---

## 3. Model-Specific Theme Versions (Independent of Style `Variants/`)

Some themes — notably Innioasis's own **`HoloPebble`** (dark on Y1, light pastel with dark status bar text on Y2) — have fundamentally different visual designs between Y1 and Y2.

- **Style variations** live under `<Theme>/Variants/<StyleName>/` (`gallery.variantFolders`, `gallery.defaultVariantLabel`).
- **Model variations** live independently under `<Theme>/Models/Y1/` or `<Theme>/Models/Y2/` (and optionally inside `<Theme>/Variants/<StyleName>/Models/Y1|Y2/`), declared in `gallery.modelFolders` (`{ "y1": "Models/Y1", "y2": "Models/Y2" }`).
- Every theme AND every style variant independently computes its **Y2 readiness** (`y2Supported`), distinguishing real `homePageConfig.fileManager` artwork from `transparent.png` backfill:
  - A real non-transparent `fileManager` icon → **Y2-ready (`true`)**.
  - A `transparent.png` / blank `fileManager` icon → **Y2-ready ONLY if other core Home icons (`music`, `video`, `audiobooks`, `photos`, `settings`, `ebook`, etc.) are also intentionally transparent/blank** (like `Unseen`). If other Home icons have real artwork while `fileManager` is `transparent.png`, it is treated as backfill (**Y1-only**).

---

## 4. Android `#AARRGGBB` Color Encoding & Status Bar Text Rule

- **Color format:** Both Y1 and Y2 parse colors with Android `Color.parseColor()`, where 8-digit hex strings are **`#AARRGGBB`** (alpha first — e.g., `#FF00F5FF` is opaque cyan `rgb(0, 245, 255)`), **not** CSS `#RRGGBBAA` (which would misinterpret `#FF00F5FF` as magenta). The live simulator and Studio convert 8-digit Android hex to CSS `rgba()` accurately.
- **Status bar text color:** On both Y1 and Y2, `StatusConfig` has no `statusTextColor` field. `LK0/n;->e()` sets `AppCompatDelegate.MODE_NIGHT_NO` / `y2_is_dark=0` **only** when `themeName == ""` (the factory built-in light **`HoloPebble`** theme on Y2), and forces dark mode (`y2_is_dark=1`, white status bar text) for every custom theme. Accordingly, `HoloPebble` (Y2) is the sole exception rendered with dark status bar text/icons; all custom themes default to white (`#ffffff`).

---

## 5. What the Live Site Implements Today

### Gallery catalogue (`themes.json`)

`scripts/sync_theme_metadata.py` reads `gallery.modelFolders` / `gallery.modelLabels` / `gallery.defaultModel` from a theme's `config.json` and mirrors any `Models/Y1` / `Models/Y2` folder on disk, so each catalogue entry carries `modelFolders`, `modelLabels` and `defaultModel` next to `variantFolders`. `HoloPebble` is the first listing that uses this: `Y2 (Light Default)` is the theme root and `Y1 (Dark)` lives in `Models/Y1`. The retired `Y2_Default` folder stays only as a redirect stub so old links still land on `/HoloPebble/`.

### Theme Studio → Save

`exportModelChoice()` in `studio-test/studio.js` inspects the open theme and asks **only when a choice changes the output** — that is, when `settingConfig.bluetooth` differs from `homePageConfig.bluetooth`, when the theme declares `gallery.modelFolders`, or when the Home Bluetooth icon already carries a `_Y1` / `_Y2` suffix. Themes without a model clash save exactly as before, with no prompt.

`normalizeConfigForCrossCompat(config, devicePaths, { targetModel })` then folds the pair back into the single slot the chosen player reads, and the device receives stock JSON (no helper key):

| Export | `homePageConfig.bluetooth` | `settingConfig.bluetooth` | `itemSelectedBackgroundIs9Patch` | `.9.png` files |
| :--- | :--- | :--- | :--- | :--- |
| **Y1** | `_Y1` sibling when shipped, else the authored icon | removed | removed | guide border cropped to `(1,1,w-2,h-2)` |
| **Y2** | `settingConfig.bluetooth` (Settings icon) | removed | kept when the file is a real `.9.png` | untouched |

Verified on `Melody Munchkin` (`Desk-Bluetooth_Y1.png` / `Desk-Bluetooth.png`, `item_selected_no_arrow.9.png` 482×44): the Y1 ZIP ships `Desk-Bluetooth_Y1.png`, omits the 9-patch flag and contains a 480×42 cropped bar; the Y2 ZIP ships `Desk-Bluetooth.png`, keeps `itemSelectedBackgroundIs9Patch: true` and keeps `homePageConfig.fileManager`. Both ZIPs contain one `config.json`, so a single theme folder still serves both players.

### Theme Studio → Preview toolbars

Clicking a left-hand menu row opens the floating strip with **two** asset groups — that row's selection bar *and* its artwork — while clicking the right-hand artwork directly opens only that icon's actions. Placement still prefers the stage margin outside the emulated player.
