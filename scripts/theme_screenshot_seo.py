#!/usr/bin/env python3
"""Show the rendered screen capture on every theme shell page.

Each theme folder root (``/iPod-ish/``) is an indexable page with a title and the
author's description, but the only picture on it was a 1x1 hosting mark. The
pre-rendered ``screenshot_preview.jpg`` was therefore invisible to readers and to
image search, even though it is the most representative picture of the theme.

This pass, run after ``Rewrite-ThemeIndexPages.ps1`` or the localized shell
generator, adds to every shell page that has a capture beside it (or in its theme
folder, for ``Variants/<name>/_share/`` pages):

* a visible ``<img>`` of the capture, with descriptive alt text,
* a second ``og:image`` pointing at it, with width/height,
* the capture added to the page's JSON-LD ``image`` list.

Idempotent: re-running rewrites only pages whose markup differs. ``--check``
exits 1 for CI when a page is stale.

Usage:
    python scripts/theme_screenshot_seo.py [--check]
"""

from __future__ import annotations

import argparse
import html
import json
import os
import re
from pathlib import Path
from urllib.parse import quote

ROOT = Path(__file__).resolve().parents[1]
SITE = "https://themes.innioasis.app"
SHOT = "screenshot_preview.jpg"
SHELL_MARK = 'class="theme-seo-shell-main"'

FIGURE_RE = re.compile(r'[ \t]*<figure class="theme-seo-shell-shot">.*?</figure>\n?', re.S)
AUTHOR_RE = re.compile(r'(<p class="theme-seo-shell-author">.*?</p>)', re.S)
H1_RE = re.compile(r'(<h1[^>]*>.*?</h1>)', re.S)
HEAD_END_RE = re.compile(r'</head>', re.I)
LD_RE = re.compile(r'(<script type="application/ld\+json">)(.*?)(</script>)', re.S)
OG_SHOT_RE = re.compile(r'<meta property="og:image" content="[^"]*screenshot_preview\.jpg"')


def _text(fragment: str) -> str:
    return html.unescape(re.sub(r"<[^>]+>", "", fragment)).strip()


def _capture_for(page: Path) -> Path | None:
    """The capture beside the page, else the nearest one above it (variant shells)."""
    directory = page.parent
    for _ in range(4):
        candidate = directory / SHOT
        if candidate.is_file():
            return candidate
        if directory == ROOT:
            break
        directory = directory.parent
    return None


def _capture_url(capture: Path) -> str:
    rel = capture.relative_to(ROOT).as_posix()
    return SITE + "/" + "/".join(quote(part, safe="") for part in rel.split("/"))


def _figure(page: Path, capture: Path, alt: str) -> str:
    rel = os.path.relpath(capture, page.parent).replace(os.sep, "/")
    if not rel.startswith("../"):
        rel = "./" + rel
    return (
        '<figure class="theme-seo-shell-shot">'
        f'<img src="{html.escape(rel, quote=True)}" alt="{html.escape(alt, quote=True)}" '
        'width="480" height="360" decoding="async" />'
        "</figure>"
    )


def _retag_json_ld(text: str, shot_url: str) -> str:
    def repl(match: re.Match[str]) -> str:
        try:
            data = json.loads(match.group(2))
        except ValueError:
            return match.group(0)
        if not isinstance(data, dict) or "image" not in data:
            return match.group(0)
        current = data["image"]
        images = current if isinstance(current, list) else [current]
        images = [item for item in images if isinstance(item, str) and item]
        if shot_url in images:
            return match.group(0)
        images.append(shot_url)
        data["image"] = images
        payload = json.dumps(data, ensure_ascii=False, separators=(",", ":"))
        return match.group(1) + payload.replace("</", "<\\/") + match.group(3)

    return LD_RE.sub(repl, text)


def update(page: Path, capture: Path) -> str:
    text = page.read_text(encoding="utf-8")
    shot_url = _capture_url(capture)
    h1 = H1_RE.search(text)
    author = AUTHOR_RE.search(text)
    name = _text(h1.group(1)) if h1 else page.parent.name
    name = re.sub(r"\s*\([^)]*\)\s*$", "", name) or page.parent.name
    who = _text(author.group(1)) if author else ""
    alt = f"{name} theme home screen on an Innioasis Y1 and Y2 player"
    if who:
        alt += f", by {who}"

    text = FIGURE_RE.sub("", text)
    figure = _figure(page, capture, alt)
    anchor = author or h1
    if anchor:
        end = anchor.end()
        text = text[:end] + "\n    " + figure + text[end:]

    if not OG_SHOT_RE.search(text):
        tags = (
            f'\n  <meta property="og:image" content="{html.escape(shot_url, quote=True)}" />'
            '\n  <meta property="og:image:width" content="480" />'
            '\n  <meta property="og:image:height" content="360" />'
            f'\n  <meta property="og:image:alt" content="{html.escape(alt, quote=True)}" />'
        )
        head = HEAD_END_RE.search(text)
        if head:
            text = text[: head.start()] + tags + "\n" + text[head.start():]

    text = _retag_json_ld(text, shot_url)
    return text


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--check", action="store_true", help="exit 1 when a shell page is out of date")
    args = parser.parse_args()

    changed: list[Path] = []
    seen = 0
    no_capture = 0
    for page in ROOT.rglob("*.html"):
        if any(part in {".git", "node_modules", "dist", "scripts"} for part in page.parts):
            continue
        try:
            text = page.read_text(encoding="utf-8")
        except (OSError, UnicodeError):
            continue
        if SHELL_MARK not in text:
            continue
        capture = _capture_for(page)
        if capture is None:
            no_capture += 1
            continue
        seen += 1
        updated = update(page, capture)
        if updated != text:
            changed.append(page)
            if not args.check:
                page.write_text(updated, encoding="utf-8")

    if args.check:
        for page in changed:
            print(f"theme screenshot seo: {page.relative_to(ROOT)} is out of date")
        print(f"theme screenshot seo: {len(changed)} page(s) out of date, {seen} with a capture, {no_capture} without")
        return 1 if changed else 0

    print(f"theme screenshot seo: updated {len(changed)} of {seen} shell pages ({no_capture} have no capture yet)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
