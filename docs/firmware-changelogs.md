# Innioasis Y1 & Y2 Stock Firmware Changelogs & Feature Matrix

> Reverse-engineered directly from all 11 stock firmware releases archived in [`y1-community/y1-stock-rom`](https://github.com/y1-community/y1-stock-rom) (`com.innioasis.y1` on Y1 and `com.innioasis.y2` / `MyLauncher.apk` on Y2), plus verified against on-device Innioasis Y2 3.2.8 screenshots.
>
> This reference is designed to be shared across Innioasis community projects (Themes Gallery, Theme Studio, Innioasis Updater / Updater CE, and firmware archives) so users know exactly what each firmware release adds and which firmware version supports each theme asset.

---

## Quick Feature Introduction Lookup

| Feature / Theme Capability | First Introduced | Platform | Binary / Resource Proof |
| :--- | :--- | :--- | :--- |
| **Custom Theme Engine (`config.json`)** | **2.1.9** | Y1 Type A | `ThemeConfig`, `setting_change_theme`, `assets/theme1`–`theme3` (`HoloBubble`, `Unseen`, `Melody Munchkin`) |
| **Video Player** | **2.1.9** | Y1 Type A | `main_video`, `video_list_all`, `VideoActivity` |
| **File Extensions toggle & Clear Cache** | **2.1.9** | Y1 Type A | `setting_file_extensions`, `add_req_clear_cache` |
| **E-Book Reader (EPUB / PDF / TXT / DOC)** | **2.8.2** *(user-facing highlight in 3.0.7)* | Y1 Type A | `com.innioasis.y1_eBook.ui.*`, `homePageConfig.ebook` |
| **Rockbox / Launcher Settings Row** | **2.8.2** | Y1 Type A | `setting_launcher`, `settingConfig.launcher` |
| **Calculator & Calendar (unshipped flag)** | **2.8.2** | Y1 Type A | `CalculatorActivity`, `CalendarActivity`, `homePageConfig.calculator` / `calendar` (hidden behind `isV4 && !isRockBox`) |
| **Shuffle Quick removed from Home** | **2.8.2** | Y1 Type A | Present in `1.7.6`–`2.1.9`; omitted from `MainActivity` from `2.8.2` onward (key retained in `HomePageConfig`) |
| **First-Boot Language Selection** | **3.0.2** | Y1 Type A | `SetLanguageActivity` |
| **Built-in `HoloFacet` theme** | **3.0.7** | Y1 Type A | `assets/theme4` |
| **AirPods Pro 2 / AirPods 3+ Bluetooth fixes** | **3.1.2** | Y1 Type A | `BLUtils.executeConnectClassicFlow` / A2DP retry flow |
| **Light `HoloPebble` Default Theme & Dark `Classic` Theme** | **3.1.7** | Y2 | Native light default (`y2_is_dark=0`, dark status bar text) + `assets/theme5` (`Classic`, dark Y1 default) |
| **File Manager App & Home Icon** | **3.1.7** | Y2 | `com.innioasis.filemanager.ui.*`, `homePageConfig.fileManager` |
| **Android 9-Patch Selection Bars (`.9.png`)** | **3.1.7** | Y2 | `ItemConfig.itemSelectedBackgroundIs9Patch` (`NinePatchDrawable` loader) |
| **Theme Font Scaling (`fontScale`)** | **3.1.7** | Y2 | `ThemeConfig.fontScale` (default `1.1`) |
| **Import / Export M3U Playlists** | **3.1.7** | Y2 | `ImportM3uActivity`, `MatchM3uActivity`, `ExportM3UActivity` |
| **Music Settings (`Song Name Display`, `Artist/Album View`)** | **3.1.7** | Y2 | `MusicSettingsActivity` |
| **Video Speed Playback (0.5x–2.0x), HW/SW Decode, Key Settings, Subtitles, Loop Mode** | **3.1.7** | Y2 | `VideoSettingsActivity`, `VideoKeySettingsActivity` |
| **Screen-Off Key Switch (Full Lock / Media Mode)** | **3.1.7** | Y2 | `ScreenOffKeySwitchActivity` |
| **Categorized Settings (6 Categories + Bluetooth in Settings)** | **3.2.0-fm** | Y2 | `SettingCategoryActivity`, `settingConfig.category*` (6 icons), Bluetooth moved from Home to Settings (reuses `homePageConfig.bluetooth`) |
| **Speaker On/Off Toggle** | **3.2.0-fm** | Y2 | `setting_speaker`, `speakerEnabled`, `settingConfig.speakerOn` / `speakerOff` |
| **Album Art Style Toggle (`Flat` vs `Perspective`)** | **3.2.0-fm** | Y2 | `music_setting_album_art_style`, `music_setting_album_art_flat`, `music_setting_album_art_perspective` |
| **Headphone Gain (Low / Standard / High / Maximum)** | **3.2.0-fm** | Y2 | `setting_headphone_gain`, `settingConfig.headphoneGainLow/Standard/High/Maximum` |
| **Click Wheel Sensitivity (Low / Standard / High)** | **3.2.0-fm** | Y2 | `setting_wheel_sensitivity`, `settingConfig.wheelSensitivityLow/Standard/High` |
| **Adjust Volume with Click Wheel (On / Off)** | **3.2.0-fm** | Y2 | `setting_wheel_volume`, `settingConfig.wheelVolumeOn` / `wheelVolumeOff` |
| **FM Radio on Y2** | **3.2.0-fm** | Y2 | `main_fm` enabled on FM-equipped Y2 hardware builds |
| **Theme `showNativeIcon` Fallback Toggle** | **3.2.0-fm** | Y2 | `ThemeConfig.showNativeIcon` (all 5 built-in themes set `true`; defaults `false` when omitted) |
| **Video Scan Path Modes (Auto / Specified / Entire TF Card)** | **3.2.0-fm** | Y2 | `VideoScanModeActivity` |
| **Continue Playing Prompts (Music & Video)** | **3.2.0-fm** | Y2 | `music_continue_playing`, `video_continue_playing` |
| **App Name Fixed (`收音机` → `Y2`) & `Unseen` `fileManager` Key Fix** | **3.2.8-fm** | Y2 | `app_name="Y2"`, `assets/theme2/config.json` adds `"fileManager": "transparent.png"` |

> **Key answer to common community questions:**
> - **Speaker On/Off toggle** was **not** introduced in `3.2.8-fm` — it shipped in **`3.2.0-fm`** alongside Categorized Settings, Headphone Gain, Click Wheel Sensitivity, and Click Wheel Volume, and remains present in `3.2.1`, `3.2.4-fm`, and `3.2.8-fm`.
> - **Album Art Style (`Flat` vs `Perspective`)** was also introduced in **`3.2.0-fm`** inside **Music → Settings → Album Art Style**, tilting the Now Playing album cover with a glossy reflection in `Perspective` mode or displaying a flat square cover with reflection in `Flat` mode.

---

## Innioasis Y1 Firmware Changelogs (Android 4.2.2, SDK 17)

### `type-b-1.7.6` — Y1 Type B Stock Firmware (`1.7.6`)
- **APK:** `com.innioasis.y1` v`1.7.6` (versionCode `77`), SHA-256 `9499b9f2fd496b56…`
- **Build Date:** `2023-04-07` (`ro.build.display.id=Y1_001`, SDK `17`)
- **Hardware Note:** Built for **Type B** Y1 scroll-wheel hardware; flashing Type A 2.0.0+ firmware onto Type B hardware disables the scroll wheel.
- **Home Menu (8 items):** Now playing, Music, Audiobook, Photos, FM radio, Bluetooth, Settings, **Shuffle quick**.
- **Settings (flat list):** Shutdown, Timed shutdown, Shuffle, Repeat, Equalizer, **Sort by**, **Sort order**, Key lock, Key tone, Key vibration, Wallpaper, Backlight, Brightness, Display battery, Date & Time, Language, Factory reset, About.
- **Theme Support:** **None** (`theme_count = 0`, no `ThemeConfig` classes or Theme picker).

---

### `ADB-2.1.9` — Y1 Type A Firmware (`2.1.9`)
- **APK:** `com.innioasis.y1` v`2.1.9` (versionCode `219`), SHA-256 `d617feeda015e9fc…`
- **Published:** `2025-07-18`
- **New Features:**
  - **Custom Theme Engine:** Introduces `ThemeConfig`, `/storage/sdcard0/Themes/`, `Theme` settings screen, native dark default **`HoloPebble`**, and 3 bundled themes: **`HoloBubble`** (`theme1`), **`Unseen`** (`theme2`), and **`Melody Munchkin`** (`theme3`).
  - **Video Player:** Adds `Videos` to the Home menu (`All video`, `Folders`, `Playlist`, `Search`, `Remove Video`).
  - **Settings & Library:** Adds `File extensions` toggle, `Clear cache`, Spanish language support, song/album/artist sorting & deletion options, FM radio favorite channel list, and lyrics label support.
- **Theme Schema:** `HomePageConfig` (9 keys: `nowPlaying`, `music`, `video`, `audiobooks`, `photos`, `fm`, `bluetooth`, `settings`, `shuffleQuick`), `SettingConfig` (49 keys including `settingMask`, no `launcher`), `ItemConfig` (5 keys), `DialogConfig` (6 keys), `MenuConfig` (5 keys), `FileConfig` (2 keys), `PlayerConfig` (2 keys), `StatusConfig` (13 keys).

---

### `2.8.2` — Y1 Type A Firmware (`EN_2.8.2`)
- **APK:** `com.innioasis.y1` v`EN_2.8.2` (versionCode `282`), SHA-256 `db9f097449d6f41b…`
- **Build Date:** `2025-07-31` · **Published:** `2025-10-28`
- **New Features:**
  - **E-Book Reader (engine added):** Adds `EpubActivity`, `PdfActivity`, `TextActivity`, `WordActivity`, `SearchActivity`, bookshelf library, reading progress, bookmarks, and font-size/theme reader controls.
  - **Calculator & Calendar (unshipped flag):** Adds `CalculatorActivity` and `CalendarActivity` plus `homePageConfig.calculator` and `homePageConfig.calendar` (hidden on stock retail builds unless the internal flag is enabled).
  - **Rockbox / Launcher Selector:** Adds `Launcher` to Settings (`setting_launcher`, `settingConfig.launcher`) to switch between stock launcher and installed alternate launchers (such as Rockbox).
  - **Home Menu Change:** Removes `Shuffle quick` from the active Home list (key remains parsed in `HomePageConfig` for older firmware compatibility).
  - **UI & Video Fixes:** Scrolling marquee for long filenames, video pause reliability fix, startup `IllegalStateException` fix, and cleaner video folder scanning.
- **Theme Schema:** `HomePageConfig` expands to **12 keys** (`+ebook`, `+calculator`, `+calendar`); `SettingConfig` expands to **50 keys** (`+launcher`).

---

### `3.0.2` — Y1 Type A Firmware (`3.0.2`)
- **APK:** `com.innioasis.y1` v`3.0.2` (versionCode `302`), SHA-256 `58fba95ef121d82b…`
- **Published:** `2025-12-12`
- **New Features:**
  - **First-Boot Language Setup:** Adds `SetLanguageActivity` so new/reset units prompt for language on initial startup.
  - Performance and stability updates.
- **Theme Schema:** Unchanged from `2.8.2` (3 bundled themes).

---

### `3.0.7` — Y1 Type A Firmware (`3.0.7`)
- **APK:** `com.innioasis.y1` v`3.0.7` (versionCode `307`), SHA-256 `ddaf183a21794c97…`
- **Build Date:** `2026-03-13` · **Published:** `2026-04-23`
- **New Features:**
  - **4th Built-in Theme (`HoloFacet`):** Adds `assets/theme4` (`HoloFacet`).
  - **E-Book Polish:** Publicly highlights E-Book reading feature and adds `Unread` / `(Empty)` bookmark strings.
- **Theme Schema:** Unchanged from `2.8.2` (4 bundled themes).

---

### `3.1.2` — Y1 Type A Latest Stock Firmware (`3.1.2`)
- **APK:** `com.innioasis.y1` v`3.1.2` (versionCode `312`), SHA-256 `09a6f804b05a37f17f5d1f299aa36abfe39e62761bd7d4b631b36efa6078deeb` (REA Evidence `ev_82131a08beeee3158809ac24c5339bd5d4867a98cdbd18bac2a0105a60419b6f`)
- **Published:** `2026-07-16`
- **New Features:**
  - **Bluetooth Classic / AirPods Compatibility:** Improved pairing & A2DP connection handling for AirPods Pro 2, AirPods 3, and newer headsets (`BLUtils.executeConnectClassicFlow`, scanning collision backoff).
- **Theme Schema:** Final Y1 schema — `ThemeConfig` (13 fields), `HomePageConfig` (12), `ItemConfig` (5), `SettingConfig` (50), `StatusConfig` (13), `DialogConfig` (6), `MenuConfig` (5), `FileConfig` (2), `PlayerConfig` (2). **No `NinePatchDrawable` support, no `showNativeIcon`, no `fontScale`, no `fileManager`.**

---

## Innioasis Y2 Firmware Changelogs (Android 4.4.4, SDK 19)

### `3.1.7` — Y2 Launch Firmware (`3.1.7`)
- **APK:** `com.innioasis.y2` (`MyLauncher.apk`) v`3.1.7` (versionCode `317`), SHA-256 `ad39091e24cb0542…`
- **Build Date:** `2026-06-01` · **Published:** `2026-06-22` (`ro.build.display.id=Y2-v1.0.0`, SDK `19`)
- **New Features:**
  - **New Light Default Theme (`HoloPebble`) & 5th Bundled Theme (`Classic`):** Y2's built-in `HoloPebble` default switches to a light pastel appearance with dark status bar ink (`y2_is_dark=0`, `AppCompatDelegate.MODE_NIGHT_NO`), while Y1's original dark default is packaged as **`Classic`** (`assets/theme5`).
  - **File Manager:** Full on-device File Manager (`FileManagerActivity`, `FileManagerCopyActivity`, `FileManagerListActivity`, `FileManagerSettingsActivity`) supporting Internal Storage & TF Card browsing, Copy/Cut/Delete/Rename/Properties, sorting, Show Hidden Files, Show File Extensions, and Format Internal Storage / TF Card.
  - **Theme Engine Upgrades:**
    - Adds `homePageConfig.fileManager` (13th Home icon slot).
    - Adds `ItemConfig.itemSelectedBackgroundIs9Patch` with Android `.9.png` nine-patch decoding (`NinePatchDrawable`), used by `Melody Munchkin` and `Classic`.
    - Adds `ThemeConfig.fontScale` (default `1.1`; `Melody Munchkin` sets `1.0`).
    - Adds theme rename length validation (`theme_name_too_long`) and pure-black / transparent wallpaper rejection guards.
  - **Music Player Upgrades:** New `MusicSettingsActivity` (Song Name Display, List Sort, Artist View, Album View) and **M3U Playlist Import / Matching / Export** (`ImportM3uActivity`, `MatchM3uActivity`, `ExportM3UActivity`).
  - **Video Player Upgrades:** New `VideoSettingsActivity` & `VideoKeySettingsActivity` adding **Speed Playback** (`0.5x`–`2.0x`), **Hardware / Software Decode**, **PREV/NEXT Short & Long Press** actions (Prev/Next, Seek ±10s/±30s/±60s, Continuous Seek), **Loop Mode**, **Auto-stop**, **Load Subtitles**, and **Custom Scan Paths**.
  - **Screen-Off Key Switch:** Adds `ScreenOffKeySwitchActivity` choosing between **Full Lock Mode** (only POWER active) and **Media Mode** (PLAY/STOP, PREV, NEXT active).
  - **Storage Reliability:** Adds `Storage Changed` rescan prompt on boot, TF Card damaged warning, and 10,000-item bulk selection cap.
- **Note:** `3.1.7` ships without FM Radio on Home, still uses flat Settings (no category icons yet), and does **not** yet include Speaker On/Off, Headphone Gain, Wheel Sensitivity/Volume, `Album Art Style`, or `showNativeIcon`.

---

### `3.2.0-fm` — Y2 Major Feature & FM Radio Update (`3.2.0`)
- **APK:** `com.innioasis.y2` (`MyLauncher.apk`) v`3.2.0` (versionCode `320`), SHA-256 `088b0d728d2eb422…`
- **Build Date:** `2026-08-13` · **Published:** `2026-09-13`
- **New Features:**
  - **FM Radio on Y2:** Restores `FM Radio` to the Home menu on FM-capable Y2 units.
  - **Categorized Settings Redesign (`SettingCategoryActivity`):** Reorganizes Settings into 6 categories — **Keys & Wheel**, **Audio**, **Display**, **Personalization**, **Files & Storage**, and **System** — alongside top-level **Bluetooth** (moved out of the Home screen into Settings), **About**, and **Factory reset**.
  - **Speaker On/Off Toggle (`Audio → Speaker`):** Enables/disables the built-in speaker (`speakerEnabled`, `setting_speaker`, `settingConfig.speakerOn` / `speakerOff`).
  - **Headphone Gain (`Audio → Headphone Gain`):** 4 output gain levels — **Low**, **Standard**, **High**, **Maximum** (`settingConfig.headphoneGainLow/Standard/High/Maximum`).
  - **Click Wheel Controls (`Keys & Wheel`):** Adds **Click Wheel Sensitivity** (`Low` / `Standard` / `High`) and **Adjust Volume with Click Wheel** (`On` / `Off`), plus updates Screen-off **Media Mode** to also permit `OK`.
  - **Album Art Style (`Music → Settings → Album Art Style`):** Adds toggle between **`Perspective`** (3D tilted album artwork with reflection) and **`Flat`** (flat square cover art with reflection).
  - **Theme Engine `showNativeIcon` & 17 New Setting Slots:**
    - Adds `ThemeConfig.showNativeIcon` (all 5 bundled themes set `true`; defaults to `false` when omitted in JSON).
    - Expands `SettingConfig` from 50 to **67 keys** (+6 category icons, +4 headphone gain icons, +2 speaker icons, +3 wheel sensitivity icons, +2 wheel volume icons).
    - **Important Bluetooth quirk:** `SettingConfig` does **not** define a separate `bluetooth` key; Y2 Settings explicitly reads `homePageConfig.bluetooth` for the Settings → Bluetooth icon.
  - **Video & Music Usability:** Replaces manual path deletion with `VideoScanModeActivity` (**Auto Scan Common Folders** / **Scan Specified Folders Only** / **Scan Entire TF Card**), adds **Continue playing** resume prompts for Music & Video, and adds File Manager `Internal` copy destination label.

---

### `3.2.1` — Y2 Maintenance Update (`3.2.1`)
- **APK:** `com.innioasis.y2` (`MyLauncher.apk`) v`3.2.1` (versionCode `321`), SHA-256 `1b3d81b98f629436…`
- **Build Date:** `2026-08-14` · **Published:** `2026-09-13`
- **Changes:** Performance and stability updates (identical strings, activities, bundled theme counts, and 67-key `SettingConfig` to `3.2.0-fm`).

---

### `3.2.4-fm` — Y2 Retail Shipping Firmware (`3.2.3` launcher / `3.2.4` ROM)
- **APK:** `com.innioasis.y2` (`MyLauncher.apk`) v`3.2.3` (versionCode `323`), SHA-256 `ff19eaa288d3a13a…`
- **Build Date:** `2026-08-19` · **Published:** `2026-11-13`
- **Changes:** About screen label shortened from `System Version:` to `Version:`; retail performance and stability fixes. Identical theme engine schema to `3.2.0-fm`.

---

### `3.2.8-fm` — Y2 Latest Stock Firmware (`3.2.9` launcher / `3.2.8` ROM)
- **APK:** `com.innioasis.y2` (`MyLauncher.apk`) v`3.2.9` (versionCode `329`), SHA-256 `9aae687ff2d71913dd1bb649f644a47365f7fb45fa63452b1db922a60b0dca49` (REA Evidence `ev_f0bbea5a17d3dc58f43b262c315112312ee94660bfcbb30c890d90816ececfa1`)
- **Published:** `2026-11-27`
- **Changes:**
  - Fixes Android launcher `app_name` string from `'收音机'` (accidentally left as Chinese for "Radio" in `3.1.7`–`3.2.4-fm`) to **`'Y2'`**.
  - Fixes bundled **`Unseen`** (`assets/theme2/config.json`) to explicitly declare `"fileManager": "transparent.png"` so Y2 keeps the File Manager slot blank instead of drawing the native icon when `showNativeIcon: true`.
  - General performance, bug, and stability fixes.
  - All 5 bundled themes (`HoloBubble`, `Unseen`, `Melody Munchkin`, `HoloFacet`, `Classic`) ship complete 66/67-key `SettingConfig` sets and are bit-identical between `MyLauncher.apk` `assets/theme1`–`theme5` and `/Themes/` on USB storage.
