#!/usr/bin/env python3
"""Bulk-update site copy to Innioasis Y1 & Y2 themes wording."""

from __future__ import annotations

from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
ROOT_INDEX = REPO_ROOT / "index.html"

REPLACEMENTS = [
    ("for Innioasis Y1 by", "for Innioasis Y1 & Y2 by"),
    ("theme for Innioasis Y1 by", "theme for Innioasis Y1 & Y2 by"),
    ("theme for Innioasis Y1 and", "theme for Innioasis Y1 & Y2 and"),
    (" for Innioasis Y1</title>", " for Innioasis Y1 & Y2</title>"),
    ("Customize your Innioasis Y1 with", "Customize your Innioasis Y1 or Y2 with"),
    ('"operatingSystem":"Innioasis Y1"', '"operatingSystem":"Innioasis Y1 & Y2"'),
    ('operatingSystem = \'Innioasis Y1\'', "operatingSystem = 'Innioasis Y1 & Y2'"),
    (
        '<span class="gallery-brand-text">Y1 & Y2 Themes</span>',
        '<span class="gallery-brand-text">Innioasis Y1 & Y2 Themes</span>',
    ),
    ("theme for Innioasis Y1.", "theme for Innioasis Y1 & Y2."),
    (
        "UI theme for the Innioasis Y1 media player",
        "UI theme for the Innioasis Y1 & Y2 media players",
    ),
    ("innioasis Y1 theme", "Innioasis Y1 & Y2 theme"),
    ("Innioasis Y1 theme!", "Innioasis Y1 & Y2 theme!"),
]


def apply_replacements(text: str) -> tuple[str, int]:
    changed = 0
    for old, new in REPLACEMENTS:
        if old not in text:
            continue
        if new in text:
            continue
        text = text.replace(old, new)
        changed += 1
    return text, changed


def main() -> int:
    total_files = 0
    for path in REPO_ROOT.rglob("index.html"):
        if path.resolve() == ROOT_INDEX.resolve():
            continue
        try:
            original = path.read_text(encoding="utf-8")
        except Exception:
            continue
        updated, hits = apply_replacements(original)
        if hits and updated != original:
            path.write_text(updated, encoding="utf-8")
            total_files += 1
    print(f"Updated {total_files} theme index.html file(s).")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
