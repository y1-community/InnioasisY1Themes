#!/usr/bin/env python3
"""Give every theme folder page the gallery's download button.

The gallery card builds the theme ZIP in the browser: config.json plus every
asset it references, mapped to device filenames by ``theme-packaging.js`` and
packed with JSZip. A reader who lands on a theme page from search had no way to
download at all; they had to find the theme again in the gallery.

This pass adds, to every shell page that sits beside a theme ``config.json``:

* a ``Download theme`` button next to ``Open preview`` (carrying the catalog
  folder, and the variant when the page is a variant shell),
* the two libraries the gallery uses, ``theme-packaging.js`` and
  ``theme-download.js``.

Idempotent. ``--check`` exits 1 for CI when a page is stale.

Usage:
    python scripts/theme_page_download.py [--check]
"""

from __future__ import annotations

import argparse
import html
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SHELL_MARK = 'class="theme-seo-shell-main"'
DOWNLOAD_MARK = "data-theme-download"
SCRIPTS = (
    '<script src="https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js"></script>\n'
    '<script src="/theme-packaging.js?v=20261111dl"></script>\n'
    '<script src="/theme-download.js?v=20261111dl"></script>'
)
SCRIPTS_RE = re.compile(
    r'<script src="(?:https://cdnjs\.cloudflare\.com/ajax/libs/jszip/[^"]+|/(?:theme-packaging|theme-download)\.js[^"]*)"></script>\n?'
)

ACTIONS_RE = re.compile(r'(<p class="theme-seo-shell-actions">)(.*?)(</p>)', re.S)
H1_RE = re.compile(r'<h1[^>]*>(.*?)</h1>', re.S)
BODY_END_RE = re.compile(r'</body>', re.I)


def _text(fragment: str) -> str:
    return html.unescape(re.sub(r"<[^>]+>", "", fragment)).strip()


def _target(page: Path) -> tuple[str, str] | None:
    """(catalog folder, variant) for a shell page, or None when it is not a theme page."""
    parts = page.relative_to(ROOT).parts
    if len(parts) < 2:
        return None
    folder = parts[0]
    variant = ""
    if len(parts) >= 4 and parts[1] == "Variants":
        variant = parts[2]
    if not (ROOT / folder / "config.json").is_file():
        return None
    return folder, variant


def update(page: Path, folder: str, variant: str) -> str:
    text = page.read_text(encoding="utf-8")
    h1 = H1_RE.search(text)
    name = re.sub(r"\s*\([^)]*\)\s*$", "", _text(h1.group(1))) if h1 else folder
    name = name or folder

    if DOWNLOAD_MARK not in text:
        attrs = (
            f' data-theme-download data-folder="{html.escape(folder, quote=True)}"'
            f' data-name="{html.escape(name, quote=True)}"'
        )
        if variant:
            attrs += f' data-variant="{html.escape(variant, quote=True)}"'
        button = f'<button type="button" class="btn"{attrs}>Download theme</button>'
        actions = ACTIONS_RE.search(text)
        if actions:
            text = text[: actions.start()] + actions.group(1) + actions.group(2) + button + actions.group(3) + text[actions.end():]

    text = SCRIPTS_RE.sub("", text)
    body = BODY_END_RE.search(text)
    if body:
        text = text[: body.start()] + SCRIPTS + "\n" + text[body.start():]
    return text


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--check", action="store_true", help="exit 1 when a theme page is out of date")
    args = parser.parse_args()

    changed: list[Path] = []
    seen = 0
    for page in ROOT.rglob("*.html"):
        if any(part in {".git", "node_modules", "dist", "scripts"} for part in page.parts):
            continue
        try:
            text = page.read_text(encoding="utf-8")
        except (OSError, UnicodeError):
            continue
        if SHELL_MARK not in text:
            continue
        target = _target(page)
        if target is None:
            continue
        seen += 1
        updated = update(page, *target)
        if updated != text:
            changed.append(page)
            if not args.check:
                page.write_text(updated, encoding="utf-8")

    if args.check:
        for page in changed:
            print(f"theme page download: {page.relative_to(ROOT)} is out of date")
        print(f"theme page download: {len(changed)} of {seen} theme pages out of date")
        return 1 if changed else 0

    print(f"theme page download: updated {len(changed)} of {seen} theme shell pages")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
