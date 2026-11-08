# Gallery i18n to-do and hand-off

Work list for `y1-community/InnioasisY1Themes` (themes.innioasis.app).
Read `I18N.md` first. Claim a line with your name before starting.

## Done

- [Buffy] Runtime mirrored from the Updater repo and loaded on the gallery pages
  (and on theme pages, so the dock and picker work everywhere).
- [Buffy] Language control added to the bottom dock (`data-locale-open`).
- [Buffy] GA4/GTM language events through the shared runtime.
- [Buffy] Extraction scope narrowed to gallery pages; theme folders excluded.
- [Buffy] `i18n/reviewed/core-ui.json` mirrored; `seed_catalogs.py` loader and
  `translate.py --top/--index-only` mirrored.
- [Buffy] Picker index rebuilt from the catalogs on disk.
- [Buffy] `update-translations.yml` rewritten to use the real pipeline (extract,
  seed, translate, index, coverage, pre-render).
- [Buffy] `sync-donors.yml` rewritten as pull-only from the canonical repo.
- [AG] Initial catalogs, runtime copy, locale registry, workflow drafts.

## Open

- [ ] Confirm the imported catalogs actually cover gallery copy. The source
  catalog is large; run `translate.py --check | tail -5` and schedule a
  `--locales all` pass until the core pages are complete.
- [ ] Decide whether static locale copies get deployed. Cloudflare Pages deploys
  from git, so `/de/...` needs either a build step or a committed build output.
  The workflow currently uploads `dist/` as an artifact only.
- [ ] Native-speaker review of the reviewed bundle (tone + safety copy).
- [ ] RTL pass on the gallery topbar, filters and dock.
- [ ] Decide on translating theme tags/categories (community taxonomy).
- [ ] Verify the workflow runs on GitHub; secrets cannot be exercised locally.

## Check

```bash
python3 scripts/i18n/extract_strings.py --tiers core
python3 scripts/i18n/seed_catalogs.py
python3 scripts/i18n/translate.py --index-only
python3 scripts/i18n/translate.py --check | tail -5
```

Then open `index.html?lang=de` and confirm the dock label, the picker, the
translated gallery copy and `dataLayer` entries.

## Status 2026-11-08

- [x] Runtime API fallback for anything a catalog lacks, mirrored from the
      Updater runtime: text nodes and accessible-name attributes, cached per
      language, capped per page, English kept on failure.
- [x] Language control opens on the first click, prefers a `/<locale>/` copy,
      and falls back to `?lang=`.
- [x] Gallery chrome, notices tray and theme-modal copy translated; submission
      folders stay untouched by design.
- [ ] Remaining: deepen catalogs beyond the gallery chrome.
