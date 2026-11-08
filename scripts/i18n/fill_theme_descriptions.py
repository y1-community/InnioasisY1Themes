#!/usr/bin/env python3
"""Translate theme descriptions in batches and rebuild themes_i18n.json.

The per-string generator is correct but slow: one request per description per
language means 15k requests for the 29 published languages. This script sends
up to 12 descriptions in one request, masks brand names first, and falls back to
single requests only when the line count does not come back intact.

    python3 scripts/i18n/fill_theme_descriptions.py
    python3 scripts/i18n/fill_theme_descriptions.py --languages de,fr,ja

Descriptions belong to theme authors. They are translated, never rewritten.
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import time
from concurrent.futures import ThreadPoolExecutor, as_completed

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))
sys.path.insert(0, HERE)

from translate import GoogleWeb, Masker  # noqa: E402

TARGET_LANGS = [
    "de", "ja", "es", "fr", "it", "pt", "ru", "zh-CN", "zh-TW", "ko",
    "ar", "nl", "pl", "tr", "uk", "vi", "th", "id", "he", "hi",
    "cs", "el", "sv", "fa", "da", "fi", "hu", "no", "ro",
]
CACHE_PATH = os.path.join(HERE, ".themes_desc_cache.json")
OUT_PATH = os.path.join(ROOT, "themes_i18n.json")
BATCH_SIZE = 12


def load_json(path: str, default):
    if not os.path.exists(path):
        return default
    with open(path, "r", encoding="utf-8") as handle:
        return json.load(handle)


def save_json(path: str, data) -> None:
    temporary = path + ".tmp"
    with open(temporary, "w", encoding="utf-8", newline="\n") as handle:
        json.dump(data, handle, ensure_ascii=False, indent=2)
    os.replace(temporary, path)


def translate_batch(provider, masker, texts, language):
    masked = []
    masks = []
    for text in texts:
        value, found = masker.mask(text)
        masked.append(value)
        masks.append(found)

    output = provider.translate(masked, language)
    if len(output) == 1 and len(texts) > 1:
        parts = output[0].split("\n")
        if len(parts) == len(texts):
            output = parts

    if len(output) != len(texts):
        output = []
        for text in texts:
            result = provider.translate([text], language)
            output.append(result[0] if result else "")

    translated = {}
    for text, value, found in zip(texts, output, masks):
        value = (value or "").strip()
        if value and masker.survives(value, found):
            translated[text] = value
    return translated


def translate_language(provider, masker, descriptions, language, existing):
    missing = [text for text in descriptions if not existing.get(f"{language}:{text}")]
    if not missing:
        return {}
    print(f"{language}: {len(missing)} descriptions", flush=True)
    result = {}
    for start in range(0, len(missing), BATCH_SIZE):
        chunk = missing[start : start + BATCH_SIZE]
        try:
            result.update(translate_batch(provider, masker, chunk, language))
        except Exception as error:  # keep going; the next run retries what failed
            print(f"{language}: batch failed: {error}", flush=True)
        if (start // BATCH_SIZE) % 5 == 0:
            print(f"{language}: {start + len(chunk)}/{len(missing)}", flush=True)
        time.sleep(0.05)
    return result


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--languages", default=",".join(TARGET_LANGS))
    parser.add_argument("--workers", type=int, default=4)
    args = parser.parse_args()

    themes = load_json(os.path.join(ROOT, "themes.json"), {}).get("themes", [])
    descriptions = sorted({str(t.get("description", "")).strip() for t in themes if str(t.get("description", "")).strip()})
    cache = load_json(CACHE_PATH, {})
    languages = [code.strip() for code in args.languages.split(",") if code.strip()]

    config = load_json(os.path.join(ROOT, "i18n", "config.json"), {})
    provider = GoogleWeb(config.get("providers", {}).get("google-web", {}))
    masker = Masker(config.get("protectedTerms", []))

    print(f"{len(themes)} themes, {len(descriptions)} unique descriptions, {len(languages)} languages", flush=True)
    print(f"{len(cache)} cached translations", flush=True)

    with ThreadPoolExecutor(max_workers=max(1, args.workers)) as executor:
        futures = {
            executor.submit(translate_language, provider, masker, descriptions, language, cache): language
            for language in languages
        }
        for future in as_completed(futures):
            language = futures[future]
            translated = future.result()
            for text, value in translated.items():
                cache[f"{language}:{text}"] = value
            save_json(CACHE_PATH, cache)
            print(f"{language}: finished {len(translated)}", flush=True)

    output = {"version": 1, "updated": int(time.time()), "locales": {lang: {} for lang in TARGET_LANGS}}
    for theme in themes:
        folder = str(theme.get("folder", "")).strip()
        description = str(theme.get("description", "")).strip()
        if not folder or not description:
            continue
        for language in TARGET_LANGS:
            value = cache.get(f"{language}:{description}")
            if value:
                output["locales"][language][folder] = {"description": value}

    save_json(OUT_PATH, output)
    total = sum(len(entries) for entries in output["locales"].values())
    print(f"Wrote {OUT_PATH}: {total} theme translations across {len(TARGET_LANGS)} languages", flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
