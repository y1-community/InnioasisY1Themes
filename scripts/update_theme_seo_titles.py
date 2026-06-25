#!/usr/bin/env python3
"""Normalize theme SEO titles to: {name} for Innioasis Y1 by {author}."""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
ROOT_INDEX = REPO_ROOT / "index.html"
OLD_INLINE = " Theme for Innioasis Y1 by "
NEW_INLINE = " for Innioasis Y1 by "

sys.path.insert(0, str(REPO_ROOT / "scripts"))
from theme_display_name import strip_redundant_theme_word  # noqa: E402


def build_theme_seo_title(name: str, author: str = "", variant: str = "") -> str:
    display = strip_redundant_theme_word(str(name or "").strip()) or "Theme"
    v = str(variant or "").strip()
    if v:
        display = f"{display} ({v})"
    author_clean = str(author or "").strip()
    if author_clean:
        return f"{display} for Innioasis Y1 & Y2 by {author_clean}"
    return f"{display} for Innioasis Y1 & Y2"


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


def _parse_title_parts(title: str) -> tuple[str, str, str]:
    """Return (name, variant, author) from a theme SEO title."""
    clean = str(title or "").strip()
    author = ""
    m_author = re.search(r" for Innioasis Y1 by (.+)$", clean)
    if m_author:
        author = m_author.group(1).strip()
        clean = clean[: m_author.start()].strip()
    else:
        m_base = re.search(r" for Innioasis Y1$", clean)
        if not m_base:
            return "", "", ""
        clean = clean[: m_base.start()].strip()

    variant = ""
    m_variant = re.match(r"^(.*) \(([^)]+)\)$", clean)
    if m_variant:
        clean = m_variant.group(1).strip()
        variant = m_variant.group(2).strip()
    return clean, variant, author


def refresh_title_tag(text: str) -> tuple[str, bool]:
    m = re.search(r"<title>([^<]+)</title>", text)
    if not m:
        return text, False
    old_title = m.group(1).strip()
    name, variant, author = _parse_title_parts(old_title)
    if not name:
        return text, False
    new_title = build_theme_seo_title(name, author, variant)
    if new_title == old_title:
        return text, False
    updated = text[: m.start(1)] + new_title + text[m.end(1) :]
    return updated, True


def update_index_file(path: Path) -> bool:
    text = path.read_text(encoding="utf-8")
    changed = False
    if OLD_INLINE in text:
        text = text.replace(OLD_INLINE, NEW_INLINE)
        changed = True
    refreshed, title_changed = refresh_title_tag(text)
    if title_changed:
        text = refreshed
        changed = True
    if not changed:
        return False
    path.write_text(text, encoding="utf-8")
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
