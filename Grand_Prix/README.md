# Grand Prix — F1 theme for the Innioasis Y1

Formula 1 inspired theme for the Y1 stock firmware. Carbon-fibre and racing-suit nomex
backgrounds, race-flag home buttons, a timing-tower settings set, and colour-coded pit-wall
status icons. No team logos or series trademarks — safe to redistribute.

## Install

1. Connect the Y1 over USB in storage mode.
2. Copy this whole `GrandPrix` folder into the `Themes` folder on the device
   (`/storage/sdcard0/Themes/GrandPrix/`). Keep it flat.
3. Eject, then on the player: **Settings → Change Theme → Grand Prix**.

## Contents

93 PNG assets + `config.json`.

| Group | Count | Size |
|---|---:|---|
| Home menu buttons | 13 | 166×166 |
| Settings icons | 49 | 146×146 |
| Status bar icons | 18 | 22×15 – 30×16 |
| Wallpapers + masks | 4 | 320×240 |
| List rows | 2 | 640×91 |
| Dialog plates | 2 | 88×46 |
| File browser icons | 2 | 64×64 |
| Chevron | 1 | 28×28 |
| Cover | 1 | 320×320 |

`ASSET_MANIFEST.csv` maps every `config.json` key to its asset file, pixel size, and the stock
interface element it paints.

## Palette

`#E10600` racing red · `#15181C` carbon · `#C9D0D8` silver · `#FFD400` flag yellow ·
`#00D26A` flag green · `#1E6FE8` flag blue

## Customising

No font is bundled. To add one, drop a licensed `.ttf` in this folder and set
`"fontFamily": "YourFont.ttf"` in `config.json`.

Set any `homePageConfig` key to `"transparent.png"` to blank a tile, or to `""` to fall back to
the stock icon.

Before publishing, update `theme_info.author` and `theme_info.authorUrl` to your own details.

See `GRAND_PRIX_Y1_GUIDE.md` for the full config schema and editor workflow.
