#!/usr/bin/env python3
"""Give each public theme folder a title and description of its own.

The title carries the theme name and the author. The description keeps the
author's text and adds the players and systems the file works on.
"""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
COMPAT = (
    " Works on the Innioasis Y1 and Y2 with the Original Software, Better-Y, Koensayr and Solar."
)

sys.path.insert(0, str(ROOT / "scripts"))
from author_submission_policy import theme_is_publicly_listed  # noqa: E402


def esc(value: str) -> str:
    return (
        value.replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
    )


def rewrite_tag(text: str, pattern: str, tag: str) -> str:
    """Replace one head tag outright, through to the end of its line.

    Splicing a value between capture groups drops the closing delimiter unless
    every pattern is written for exactly that many groups. That is how the title
    lost its ``</title>`` and each ``content="`` its closing quote, which swallows
    the rest of the head and with it the page's stylesheets. Rewriting the whole
    line keeps the tag well formed and repairs a page that was damaged that way.
    """
    updated, count = re.subn(pattern, lambda _m: tag, text, count=1)
    return updated if count else text


def refresh(path: Path, title: str, description: str) -> bool:
    try:
        text = path.read_text(encoding="utf-8")
    except (OSError, UnicodeError):
        return False
    if "noindex" in text[:2500].lower() or 'http-equiv="refresh"' in text[:2500]:
        return False
    if "This theme has moved" in text[:2500]:
        return False
    title_e = esc(title)
    desc_e = esc(description)
    original = text
    text = rewrite_tag(text, r"<title>[^\n]*", f"<title>{title_e}</title>")
    text = rewrite_tag(text, r'<meta name="description" content="[^\n]*', f'<meta name="description" content="{desc_e}" />')
    text = rewrite_tag(text, r'<meta property="og:title" content="[^\n]*', f'<meta property="og:title" content="{title_e}" />')
    text = rewrite_tag(text, r'<meta property="og:description" content="[^\n]*', f'<meta property="og:description" content="{desc_e}" />')
    text = rewrite_tag(text, r'<meta name="twitter:title" content="[^\n]*', f'<meta name="twitter:title" content="{title_e}" />')
    text = rewrite_tag(text, r'<meta name="twitter:description" content="[^\n]*', f'<meta name="twitter:description" content="{desc_e}" />')
    if text == original:
        return False
    path.write_text(text, encoding="utf-8")
    return True


def main() -> int:
    try:
        themes = json.loads((ROOT / "themes.json").read_text(encoding="utf-8")).get("themes", [])
    except (OSError, ValueError):
        print("themes.json unreadable", file=sys.stderr)
        return 1
    changed = 0
    for item in themes:
        if not isinstance(item, dict) or not theme_is_publicly_listed(item):
            continue
        folder = str(item.get("folder") or "").strip().strip("/")
        if not folder or "/" in folder or ".." in folder:
            continue
        index = ROOT / folder / "index.html"
        if not index.is_file():
            continue
        name = str(item.get("name") or folder).strip()
        author = str(item.get("author") or "the community").strip() or "the community"
        blurb = str(item.get("description") or "").strip()
        if COMPAT.strip() not in blurb:
            blurb = (blurb + COMPAT).strip()
        title = f"{name} by {author} for Innioasis Y1 and Y2"
        if refresh(index, title, blurb):
            changed += 1
    print(f"Updated {changed} theme folder pages.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
