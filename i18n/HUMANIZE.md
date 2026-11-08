# Humanizing site copy

The gallery, the firmware archive and Updater CE share one voice. It should read
like a person who uses these players wrote it: direct, specific, and a little
dry. No launch language, no motivational framing, no "not just X, but Y".

This file is the project rule for English source copy and for translations.
The patterns come from the `humanizer`, `humanizer-zh`, `finnish-humanizer` and
`korean-humanizer` skills.

## What is in scope

- English HTML pages and the shared shell strings in `nav.js`,
  `gallery-chrome.js`, `support_toolbar.html`, `site-init.js` and
  `theme-analytics.js`.
- UI translations in `i18n/catalogs/`, `i18n/reviewed/` and `themes_i18n.json`.
- Privacy policy text, donation copy, empty states, errors and page titles.

## What is out of scope

Theme names and descriptions written by their authors. Those are the creator's
words. Translate them with `scripts/i18n/fill_theme_descriptions.py`; do not
rewrite them to fit this style guide.

## The rules that matter most

1. **State the thing.** Cut the run-up ("Let's dive in", "Here's what you need
   to know") and the closer that repeats the point ("That's the real win").
2. **No fake contrast.** "Not just a theme, but a new way to listen" says
   nothing. Write what the theme does.
3. **No inflated significance.** A theme gallery is a theme gallery. It does not
   mark a new chapter, set the stage, or stand as a testament.
4. **No sales language.** Skip seamless, effortless, unlock, empower, elevate,
   cutting-edge, game-changing, nestled, breathtaking. Tech specs are allowed
   to be plain.
5. **Use real verbs.** "The gallery has" beats "the gallery features"; "is"
   beats "serves as".
6. **Vary the rhythm.** A row of three short claims usually means one claim and
   two echoes. Keep the specific one.
7. **No em dashes in prose.** Use a period, comma, colon or brackets. This is
   enforced in English source pages.
8. **No chatbot residue.** No greetings, offers to help, or "I hope this
   helps".

## Language notes

**Chinese (zh-CN, zh-TW).** Avoid 不仅……而是, 深入探讨, 赋能, 助力, 无缝,
闭环, 至关重要, 值得注意的是, 总而言之, 让我们一起, 敬请期待, 彰显, 见证,
开启新篇章. Use full-width Chinese punctuation. Two short clauses beat one long
attributive chain. Keep 的 chains under control.

**Finnish.** Write short sentences and let a statement stand without a
softener. Keep particles such as -han/-hän, kyllä and vaan where they sound
natural. Avoid on tärkeää huomata, merkittävässä roolissa, saumaton,
kokonaisvaltainen and other translation-shaped phrasing. Repetition is fine;
synonym rotation sounds fake.

**Korean.** Avoid 또한 at the start of every sentence, 매우, 핵심적인, 필수적,
다양한, 제공합니다, 결론적으로, 시사합니다 and 알아보겠습니다. Prefer active
verbs and let the subject be a person or the site, not an abstract system.
Avoid over-nominalization and stacked 피동.

## Workflow

Audit first:

```bash
python3 scripts/i18n/humanize_audit.py
python3 scripts/i18n/humanize_audit.py --check        # fails on English tells
python3 scripts/i18n/humanize_audit.py --fix-dashes   # mechanical dash cleanup
```

Rewrite English source in the HTML or JS. Do not patch a flagged word with a
synonym; rewrite the sentence.

Translations that need a hand-written fix go in
`i18n/reviewed/humanized-copy.json` (shell, hero, metadata, donation copy,
filters, empty states, legal). `seed_catalogs.py` merges that file into the
catalogs. Do not hand-edit `i18n/catalogs/` or `i18n/cache/`.

After editing English:

```bash
python3 scripts/i18n/harvest_ui_strings.py
python3 scripts/i18n/extract_strings.py --tiers core
python3 scripts/i18n/seed_catalogs.py
python3 scripts/i18n/translate.py --locales de,ja,es,fr,it,pt-BR,ru,zh-CN,zh-TW,ko,ar,nl,pl,tr,uk,vi,th,id,he,hi,cs,el,sv,fa,da,fi,hu,no,ro
python3 scripts/i18n/translate.py --index-only
python3 scripts/i18n/generate_multilingual_static_pages.py
```

Never run `translate.py` and `seed_catalogs.py` at the same time. The translator
reads and rewrites the same catalogs.

## Review checklist

- Does every sentence add a fact, a condition or a decision?
- Did the rewrite keep numbers, limits, warnings and uncertainty?
- Is there a contrast, triad or closer that exists only for rhythm?
- Would a person say this out loud without laughing?
- For translations: does it read like the target language, not like English
  with local words?

Theme descriptions are exempt from the style rules but not from the translation
quality check.
