#!/usr/bin/env python3
"""Update site-wide gallery branding to Innioasis Y1 & Y2 Themes."""

from __future__ import annotations

from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
ROOT_INDEX = REPO_ROOT / "index.html"

# Longer patterns first. Per-theme SEO titles ("for Innioasis Y1 by …") are untouched.
REPLACEMENTS = [
    ("Innioasis Y1 Themes gallery hosted by Luci Ltd", "Innioasis Y1 & Y2 Themes gallery hosted by Luci Ltd"),
    ("Innioasis Y1 Themes gallery", "Innioasis Y1 & Y2 Themes gallery"),
    ("web hosting for Innioasis Y1 Themes", "web hosting for Innioasis Y1 & Y2 Themes"),
    ("content=\"Innioasis Y1 Themes\"", 'content="Innioasis Y1 & Y2 Themes"'),
    ("Innioasis Y1 Themes", "Innioasis Y1 & Y2 Themes"),
    (">Y1 Themes<", ">Y1 & Y2 Themes<"),
    ("[Y1 Themes ·", "[Y1 & Y2 Themes ·"),
    (", Y1 theme\"", ", Y1 & Y2 theme\""),
    ("Y1 themes gallery", "Y1 & Y2 themes gallery"),
]


def apply_replacements(text: str) -> tuple[str, int]:
    changed = 0
    for old, new in REPLACEMENTS:
        if old not in text:
            continue
        count = text.count(old)
        text = text.replace(old, new)
        changed += count
    return text, changed


def main() -> int:
    total_files = 0
    total_replacements = 0
    for path in REPO_ROOT.rglob("*.html"):
        if path.name != "index.html" and path.parent == REPO_ROOT:
            # Root-level pages are edited in source; still update shared strings.
            pass
        try:
            original = path.read_text(encoding="utf-8")
        except Exception:
            continue
        updated, count = apply_replacements(original)
        if count and updated != original:
            path.write_text(updated, encoding="utf-8")
            total_files += 1
            total_replacements += count
    print(f"Updated {total_files} HTML file(s), {total_replacements} replacement(s).")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
