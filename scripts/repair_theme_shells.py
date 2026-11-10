#!/usr/bin/env python3
"""Finish making theme shells pages Google can index.

An earlier pass removed the instant redirect to theme.html, and also left
``<html lang="en"">`` behind. This pass:

* closes that tag,
* points "this theme has moved" stubs at the destination folder, not theme.html,
* teaches theme.html and theme_<locale>.html to canonicalise a ?theme= query
  at the shell,
* makes every upload page emit the shell URL as the canonical.

It does not rewrite titles, descriptions, or the preview link.
"""

from __future__ import annotations

import re
from pathlib import Path
from urllib.parse import quote, unquote, urlparse, parse_qs

ROOT = Path(__file__).resolve().parents[1]
SITE = "https://themes.innioasis.app"

BROKEN_HTML_RE = re.compile(r"(<html\b[^>\n]*)\"+>")
THEME_FILE_RE = re.compile(r"^theme(?:_[A-Za-z0-9-]+)?\.html$")
CANONICAL_LINK_RE = re.compile(
    r'<link rel="canonical"(?: id="theme-canonical")? href="https://themes\.innioasis\.app/theme(?:_[^"]+)?\.html">'
)
MOVED_TARGET_RE = re.compile(
    r"https://themes\.innioasis\.app/theme(?:_[A-Za-z0-9-]+)?\.html\?theme=([^\"'& <]+)"
)

CANONICAL_SCRIPT = """<link rel="canonical" id="theme-canonical" href="{href}">
    <script>
      (function () {{
        var params;
        try {{ params = new URLSearchParams(location.search); }} catch (e) {{ return; }}
        var theme = params.get("theme") || "";
        var variant = params.get("variant") || "";
        if (!theme || /[\\\\/]/.test(theme) || theme.indexOf("..") !== -1) return;
        if (variant && (/[\\\\/]/.test(variant) || variant.indexOf("..") !== -1)) variant = "";
        var file = (location.pathname.split("/").pop() || "theme.html");
        var localeMatch = file.match(/^theme_([A-Za-z0-9-]+)\\.html$/);
        var href = "https://themes.innioasis.app/" + encodeURIComponent(theme) + "/";
        if (variant) href += "Variants/" + encodeURIComponent(variant) + "/_share/";
        else if (localeMatch) href += "index_" + localeMatch[1] + ".html";
        var link = document.getElementById("theme-canonical");
        if (link) link.setAttribute("href", href);
        var og = document.querySelector('meta[property="og:url"]');
        if (og) og.setAttribute("content", href);
      }})();
    </script>"""


def folder_url(theme: str, variant: str = "") -> str:
    parts = [quote(unquote(theme), safe="")]
    if variant:
        parts.extend(["Variants", quote(unquote(variant), safe=""), "_share"])
    return SITE + "/" + "/".join(parts) + "/"


def fix_html_tag(text: str) -> str:
    return BROKEN_HTML_RE.sub(r'\1">', text)


def retarget_moved(text: str) -> str:
    if "This theme has moved" not in text and "location.replace" not in text:
        return text
    match = MOVED_TARGET_RE.search(text)
    if not match:
        return text
    target = folder_url(match.group(1))
    text = MOVED_TARGET_RE.sub(target, text)
    text = re.sub(
        r'(<link rel="canonical" href=")[^"]*(")',
        rf"\1{target}\2",
        text,
        count=1,
    )
    return text


def install_preview_canonical(path: Path, text: str) -> str:
    if "id=\"theme-canonical\"" in text and "localeMatch" in text:
        return text
    href = f"{SITE}/{path.name}"
    block = CANONICAL_SCRIPT.format(href=href)
    if CANONICAL_LINK_RE.search(text):
        return CANONICAL_LINK_RE.sub(block, text, count=1)
    return text


def patch_upload(text: str) -> str:
    text = text.replace("__Y1_CANONICAL__: v.previewE", "__Y1_CANONICAL__: v.shareE")
    text = text.replace("url: previewUrl,", "url: sharePageUrl,")
    text = text.replace(
        'join("/")}`;',
        'join("/")}/`;',
    )
    text = text.replace(
        "Opening the live preview...",
        "Preview and download this theme.",
    )
    return text


def main() -> int:
    tags = moved = previews = uploads = 0
    for path in ROOT.rglob("*.html"):
        if any(part in {".git", "node_modules", "dist", "scripts"} or part.startswith(".") for part in path.parts):
            continue
        try:
            text = path.read_text(encoding="utf-8")
        except (OSError, UnicodeError):
            continue
        updated = fix_html_tag(text)
        if path.parent == ROOT and THEME_FILE_RE.match(path.name):
            updated = install_preview_canonical(path, updated)
        if path.parent == ROOT and path.name.startswith("upload") and path.suffix == ".html":
            updated = patch_upload(updated)
        if "This theme has moved" in updated:
            updated = retarget_moved(updated)
        if updated != text:
            path.write_text(updated, encoding="utf-8")
            if updated.count('lang="') != text.count('lang="') or '"">' in text:
                tags += 1
            if "This theme has moved" in text:
                moved += 1
            if path.parent == ROOT and THEME_FILE_RE.match(path.name):
                previews += 1
            if path.name.startswith("upload"):
                uploads += 1
    print(f"repaired tags~{tags} moved~{moved} previews~{previews} uploads~{uploads}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
