---
title: "Theme backfill - Innioasis Y1 & Y2 Themes"
description: "How automatic icon backfill works on themes.innioasis.app - transparent placeholders for new firmware features, and optional backfill.png for a custom generic icon."
language: "en"
source: "https://innioasis.app/backfill.html"
---

# Theme backfill - Innioasis Y1 & Y2 Themes

[Innioasis Y1 & Y2 Themes](index.html)[Editor](https://y1-themes.vercel.app)[Upload](upload.html)

# Automatic theme backfill

 When a theme is uploaded to themes.innioasis.app, we fill in blank placeholders for newer Y1 and Y2 features the package did not include - so your player does not fall back to stock OS icons for those slots. 

## What happens on upload

 Firmware adds home and settings icons over time (for example eBook, calendar, calculator, File Manager, and the Rockbox launcher switch). Older themes often omit those keys. Without a placeholder, the device may show its own default artwork in that slot, which breaks the look of the theme. 

 After you submit a theme, ingest and housekeeping automatically add any missing keys and point them at a blank placeholder image. You do not have to change your package for this default behaviour - it is applied for you. 

## Optional: your own `backfill.png`

 By default we use a fully transparent `transparent.png` so the slot stays empty instead of showing a stock icon. If you prefer a single generic icon everywhere those auto-placeholders would go, add a file named `backfill.png` to the theme folder (and to each variant folder that has its own `config.json`). 
  - If `backfill.png` is present, new and transparent placeholders use that file instead.
  - Dedicated icons you already set in `config.json` are never overwritten.
  - Gold themes still need real, dedicated artwork for eBook, calendar, calculator, and the launcher - a shared backfill image does not count as Gold art.

## Share a theme

Upload as usual; backfill runs as part of the gallery pipeline.[ Upload theme](upload.html)[ Creators guide](creators/)[ About Gold](gold-badge.html)

## Community support

This page is part of the Innioasis Community Projects.

Support the development at https://www.ko-fi.com/teamslide

Help from the developers of the community projects and the stock firmware for the players is at https://ko-fi.com/teamslide and on the Innioasis Community Discord: https://discord.gg/zHrT2zrcek
