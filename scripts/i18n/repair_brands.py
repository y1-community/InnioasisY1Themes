#!/usr/bin/env python3
"""Keep brand and model names exactly as written in every catalog.

Two rules:

1. A source string that is only brand names ("Discord", "Y1", "Timmkoo",
   "Innioasis") is never translated. Machine translation turns "Discord"
   into the German word for strife and "Y1" into "J1" or "Υ1", so those
   catalog values are reset to the source.
2. A source string that mentions a brand must still contain it in the
   translation. Those entries are reported; the translator masks brands
   before a request, so the next run rewrites them correctly.

    python scripts/i18n/repair_brands.py --check
    python scripts/i18n/repair_brands.py --write
    python scripts/i18n/repair_brands.py --write --locales de,fr,ja
"""

from __future__ import annotations

import argparse
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))
sys.path.insert(0, HERE)

from translate import Masker  # noqa: E402

CONFIG = os.path.join(ROOT, "i18n", "config.json")
CATALOGS = os.path.join(ROOT, "i18n", "catalogs")


def load(path: str) -> dict:
    with open(path, "r", encoding="utf-8") as handle:
        return json.load(handle)


def save(path: str, data: dict) -> None:
    temporary = path + ".tmp"
    with open(temporary, "w", encoding="utf-8", newline="\n") as handle:
        json.dump(data, handle, ensure_ascii=False, indent=1, sort_keys=True)
        handle.write("\n")
    os.replace(temporary, path)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--write", action="store_true", help="write the repairs")
    parser.add_argument("--check", action="store_true", help="report only (the default)")
    parser.add_argument("--forget", action="store_true", help="drop entries that lost a brand so the next translate run retries them")
    parser.add_argument("--locales", default="all", help="'all' or de,fr,ja")
    parser.add_argument("--quiet", action="store_true")
    args = parser.parse_args()

    terms = load(CONFIG).get("protectedTerms") or []
    masker = Masker(terms)

    names = sorted(name for name in os.listdir(CATALOGS) if name.endswith(".json"))
    if args.locales != "all":
        wanted = {part.strip() for part in args.locales.split(",") if part.strip()}
        names = [name for name in names if name[:-5] in wanted]

    fixed_total = 0
    lost_total = 0
    for name in names:
        path = os.path.join(CATALOGS, name)
        data = load(path)
        strings = data.get("strings") or {}
        fixed = 0
        lost = 0
        forgotten: list[str] = []
        for source, value in list(strings.items()):
            if masker.is_brand_only(source):
                if value != source:
                    strings[source] = source
                    fixed += 1
                continue
            brands = [term for term in masker.terms if term in source]
            if brands and any(term not in value for term in brands):
                lost += 1
                if args.forget:
                    del strings[source]
                    forgotten.append(source)
        if fixed or forgotten:
            fixed_total += fixed
            if args.write or args.forget:
                data["strings"] = strings
                save(path, data)
            if forgotten:
                cache_path = os.path.join(ROOT, "i18n", "cache", name)
                if os.path.exists(cache_path):
                    try:
                        cache = load(cache_path)
                        for key in forgotten:
                            cache.pop(key, None)
                        save(cache_path, cache)
                    except (ValueError, OSError):
                        pass
        lost_total += lost
        if (fixed or lost) and not args.quiet:
            print(f"{name[:-5]:<9} brand-only fixed {fixed:>4}   lost a brand {lost:>4}")

    verb = "fixed" if args.write else "would fix"
    print(
        f"\n{verb} {fixed_total} brand-only entries across {len(names)} catalogs; "
        f"{lost_total} entries lose a brand and are retried by the translator."
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
