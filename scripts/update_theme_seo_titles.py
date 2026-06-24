#!/usr/bin/env python3
"""Normalize theme SEO titles to: {name} for Innioasis Y1 by {author}."""

from __future__ import annotations

import json
import re
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
ROOT_INDEX = REPO_ROOT / "index.html"
OLD_INLINE = " Theme for Innioasis Y1 by "
NEW_INLINE = " for Innioasis Y1 by "


def build_theme_seo_title(name: str, author: str = "", variant: str = "") -> str:
    display = str(name or "").strip() or "Theme"
    v = str(variant or "").strip()
    if v:
        display = f"{display} ({v})"
    author_clean = str(author or "").strip()
    if author_clean:
        return f"{display} for Innioasis Y1 by {author_clean}"
    return f"{display} for Innioasis Y1"


def _read_author_from_index(text: str) -> str:
    m = re.search(r'for Innioasis Y1 by ([^"<]+)', text)
    return m.group(1).strip() if m else ""


def _read_name_from_title(text: str) -> str:
    for pattern in (
        r"<title>([^<]+) for Innioasis Y1 by ",
        r"<title>([^<]+) Theme for Innioasis Y1 by ",
    ):
        m = re.search(pattern, text)
        if m:
            return m.group(1).strip()
    return ""


def update_index_file(path: Path) -> bool:
    text = path.read_text(encoding="utf-8")
    if OLD_INLINE not in text and NEW_INLINE in text:
        return False
    updated = text.replace(OLD_INLINE, NEW_INLINE)
    if updated == text:
        return False
    path.write_text(updated, encoding="utf-8")
    return True


def main() -> int:
    changed = 0
    for index_path in REPO_ROOT.rglob("index.html"):
        if index_path.resolve() == ROOT_INDEX.resolve():
            continue
        if update_index_file(index_path):
            changed += 1
    print(f"Updated SEO titles in {changed} theme index.html file(s).")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
