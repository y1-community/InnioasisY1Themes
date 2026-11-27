# Theme Asset Support by Firmware

Which stock firmware draws which `config.json` asset, and how the Theme Studio
presents artwork a player no longer shows (or never shipped to users).

Every version below comes from the release-by-release evidence in
[`firmware-changelogs.md`](./firmware-changelogs.md), extracted from the stock
launchers (`com.innioasis.y1`, `com.innioasis.y2` / `MyLauncher.apk`) archived in
[`y1-community/y1-stock-rom`](https://github.com/y1-community/y1-stock-rom). A
blank cell means the behaviour is not established by that evidence — it is not a
claim that the firmware lacks the asset.

## Home screen items (`homePageConfig`)

| Key | First firmware that draws it | Still drawn in 3.1.2 (Y1) / 3.2.8 (Y2) | Notes |
| :--- | :--- | :--- | :--- |
| `nowPlaying` | 2.1.9 (theme engine) | Yes / Yes | Present in every themed release. |
| `music` | 2.1.9 | Yes / Yes | |
| `video` | 2.1.9 | Yes / Yes | The Videos menu itself arrived with 2.1.9. |
| `audiobooks` | 2.1.9 | Yes / Yes | |
| `photos` | 2.1.9 | Yes / Yes | |
| `fm` | 2.1.9 | Yes / Yes | FM on Y2 hardware from 3.2.0-fm. |
| `bluetooth` | 2.1.9 | Yes / Yes | Y2 3.2.0-fm moves Bluetooth into Settings, reusing the same `homePageConfig.bluetooth` art. |
| `settings` | 2.1.9 | Yes / Yes | |
| `shuffleQuick` | 2.1.9 | No / No | Dropped from the Home list in 2.8.2; the key is still parsed for older firmware compatibility. The Preview As release decides whether it appears. |
| `calendar` | 2.8.2 (hidden) | No / No | Declared and hidden behind an internal flag; never in a stock Home list. Only Y1 releases from 2.8.2 carry the trace, so only those previews ever list it. |
| `calculator` | 2.8.2 (hidden) | No / No | As above; `hiddenHome` in the firmware catalogue gates it. |
| `ebook` | 2.8.2 (engine), 3.0.7 (user-facing) | Yes / Yes | Reader activities land in 2.8.2; the release that advertises E-Book is 3.0.7. |
| `fileManager` | 3.1.7 (Y2 only) | No / Yes | Y2 file manager app and Home icon; Y1 has no reader for the key, so a Y1 package drops it. |

## Settings rows (`settingConfig`)

| Key | First introduced | Platform | Notes |
| :--- | :--- | :--- | :--- |
| `settingMask` | 2.1.9 | Y1 | Present in the 49-key `SettingConfig` from the first themed release. |
| `launcher` | 2.8.2 | Y1 | Rockbox / alternate-launcher selector row. |
| `category*` (six category icons) | 3.2.0-fm | Y2 | Categorised Settings replaced the flat list. |
| `speakerOn` / `speakerOff` | 3.2.0-fm | Y2 | Speaker toggle. |
| `headphoneGainLow/Standard/High/Maximum` | 3.2.0-fm | Y2 | |
| `wheelSensitivityLow/Standard/High` | 3.2.0-fm | Y2 | |
| `wheelVolumeOn` / `wheelVolumeOff` | 3.2.0-fm | Y2 | |
| Bluetooth (settings) | 3.2.0-fm | Y2 | Drawn from `homePageConfig.bluetooth`. |

## List, dialog, status and theme-wide keys

| Key | First introduced | Platform | Notes |
| :--- | :--- | :--- | :--- |
| `itemSelectedBackground` | 2.1.9 | Y1 | `ItemConfig` selection bar. |
| `itemSelectedBackgroundIs9Patch` | 3.1.7 | Y2 | Compiles a `.9.png` as a `NinePatchDrawable`; Y1 has no nine-patch reader, so a Y1 package crops the guides. |
| `itemRightArrow` | 2.1.9 | Y1 | |
| `dialogConfig.*` | 2.1.9 | Y1 | |
| `statusConfig.*` | 2.1.9 | Y1 | Colours are honoured by lists and dialogs; `statusTextColor` is ignored on custom themes, so every theme ships white (see below). |
| `fontScale` | 3.1.7 | Y2 | Default `1.1`. |
| `showNativeIcon` | 3.2.0-fm | Y2 | Fallback glyph for a Home item with no artwork; all five factory Y2 themes set `true`. |

## Status bar text

`statusConfig.statusTextColor` is present in the schema from 2.1.9, but the
launchers only honour it for the factory light theme (Y2 3.1.7+, which draws dark
status text natively). Every custom theme therefore ships white status text, and
the studio keeps that value fixed instead of offering a control that the player
would ignore. `Y2_Default`/`HoloPebble`'s factory light copy is the one exception.

## How the studio uses this

- Artwork a player still draws is always listed and editable.
- The selected firmware decides Home membership: `shuffleQuick` appears only
  on Y1 1.7.6–2.1.9, and Calendar/Calculator only on Y1 releases whose catalogue
  entry lists them under `hiddenHome` (2.8.2 onward). There are no toggles.
- **Rockbox** is a Settings row (`settingConfig.launcher`), not a Home item, so it
  is never hidden behind either toggle.
- A Y1 package removes `homePageConfig.fileManager` when the theme has no icon and
  crops 9-patch guides, so a theme that carries Y2-only art still loads on Y1.

## Evidence boundaries

The stock firmware in `y1-stock-rom` decides every claim above. Where a key is
absent from a version's `config.json` schema, that version cannot draw it; where
a key is declared but the activity is unreachable, the row is listed as hidden
rather than supported. Anything not covered by a release in that archive is left
blank rather than guessed.
