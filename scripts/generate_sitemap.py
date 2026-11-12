#!/usr/bin/env python3
"""Build sitemap.xml for themes.innioasis.app from what is on disk.

The previous generator only listed themes that had an entry in ``themes.json``
*and* passed the public-listing policy. 133 theme folders that exist, render and
are linked from the gallery were therefore absent from the sitemap, which is a
large part of why theme pages were not being indexed: a crawler had no list of
them, and the gallery's own grid is drawn client-side.

The generator now walks the repository:

* every top-level ``*.html`` page (skipping fragments, 404 and the JS preview shell),
* every theme folder with an ``index.html`` (the indexable theme page),
* every ``Variants/<name>/_share/index.html`` SEO shell,
* every localized ``index_<locale>.html`` and root ``*_<locale>.html`` page,

dropping pages that carry ``noindex`` and any page the opt-out/block lists hide.
Output is deduplicated and, like the main site, splits at 45,000 URLs with a
``sitemap-index.xml`` that robots.txt points at. ``--check`` is for CI.

Usage:
    python scripts/generate_sitemap.py [--check]
"""

from __future__ import annotations

import argparse
import datetime as dt
import json
import pathlib
import re
import subprocess
import sys
from pathlib import Path
from urllib.parse import quote

REPO_ROOT = pathlib.Path(__file__).resolve().parents[1]
SITE = "https://themes.innioasis.app"
MAX_URLS = 45000
SKIP_DIRS = {
    "assets", "scripts", "functions", "node_modules", ".git", ".github",
    "dist", "_headers", "_worker", "docs",
}
SKIP_FILES = {
    "404.html", "support_toolbar.html", "backfill.html",
    "fabform-email-templates.html", "leaving.html", "donate.html",
    "theme.html",
}
LOCALE_FILE_RE = re.compile(
    r"^(?P<stem>.+)_(?P<code>[A-Za-z]{2,3}(?:-[A-Za-z0-9]{1,8})?)\.html$"
)
NOINDEX_RE = re.compile(
    r"<meta[^>]+name=[\"']robots[\"'][^>]+content=[\"'][^\"']*noindex", re.I
)
REFRESH_RE = re.compile(r"<meta[^>]+http-equiv=[\"']refresh", re.I)
LAST_RE = re.compile(r"<loc>([^<]+)</loc>\s*<lastmod>([^<]+)</lastmod>")
# Theme shells stopped redirecting to theme.html on this day. Older lastmod
# values would tell Google nothing had changed.
SHELLS_INDEXABLE_SINCE = "2026-11-10"

try:  # The policy file is optional; a plain checkout can still build a sitemap.
    sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
    from author_submission_policy import theme_is_publicly_listed
except Exception:  # pragma: no cover - only on a partial checkout
    theme_is_publicly_listed = lambda item: True  # type: ignore[assignment]


def _encode(parts: list[str]) -> str:
    return SITE + "/" + "/".join(quote(part, safe="") for part in parts) + "/"


def _noindex(path: pathlib.Path) -> bool:
    try:
        text = path.read_text(encoding="utf-8", errors="ignore")[:6000]
    except OSError:
        return True
    return bool(NOINDEX_RE.search(text)) or bool(REFRESH_RE.search(text))


def _listed_folders() -> tuple[set[str], set[str]]:
    """Folders that must be excluded, and folders whose pages are opt-outs."""
    hidden: set[str] = set()
    try:
        themes = json.loads((REPO_ROOT / "themes.json").read_text(encoding="utf-8")).get("themes", [])
    except (OSError, ValueError):
        return hidden, hidden
    for item in themes:
        folder = str(item.get("folder") or "").strip()
        if not folder:
            continue
        if not theme_is_publicly_listed(item):
            hidden.add(folder)
    return hidden, set()


def _existing_lastmod() -> dict[str, str]:
    found: dict[str, str] = {}
    for path in sorted(REPO_ROOT.glob("sitemap*.xml")):
        try:
            text = path.read_text(encoding="utf-8")
        except OSError:
            continue
        for loc, lastmod in LAST_RE.findall(text):
            found.setdefault(loc, lastmod.strip())
    return found


def _today() -> str:
    return dt.datetime.now(dt.timezone.utc).date().isoformat()


def _lastmod(known: dict[str, str], loc: str, *, bumped: bool) -> str:
    prev = known.get(loc, "")
    if not prev:
        return _today()
    if bumped and prev[:10] < SHELLS_INDEXABLE_SINCE:
        return SHELLS_INDEXABLE_SINCE
    return prev


def _tracked_root_html() -> list[str]:
    """Root HTML paths from git, so ``page_pt-BR.html`` and ``page_pt-br.html`` both count.

    A glob on a case-insensitive disk returns only one of that pair, and the
    sitemap then omits a URL the site actually serves.
    """
    raw = subprocess.check_output(["git", "ls-files", "-z"], cwd=REPO_ROOT)
    names = {
        path for path in raw.decode("utf-8", "surrogateescape").split("\0")
        if path.endswith(".html") and "/" not in path
    }
    # New pages are worth listing before they are committed, so a local
    # refresh and the GitHub Action both see the file on disk.
    for path in REPO_ROOT.glob("*.html"):
        if path.is_file():
            names.add(path.name)
    return sorted(names, key=str.casefold)


def _blob_prefixes(names: list[str], limit: int = 6000) -> dict[str, str]:
    if not names:
        return {}
    proc = subprocess.Popen(
        ["git", "cat-file", "--batch"],
        cwd=REPO_ROOT,
        stdin=subprocess.PIPE,
        stdout=subprocess.PIPE,
    )
    assert proc.stdin is not None and proc.stdout is not None
    found: dict[str, str] = {}
    for name in names:
        proc.stdin.write(f"HEAD:{name}\n".encode())
        proc.stdin.flush()
        header = proc.stdout.readline()
        if b" missing" in header:
            disk = REPO_ROOT / name
            found[name] = disk.read_text(encoding="utf-8", errors="ignore")[:limit] if disk.is_file() else ""
            continue
        size = int(header.split()[-1])
        data = proc.stdout.read(size)
        proc.stdout.read(1)
        found[name] = data[:limit].decode("utf-8", "ignore")
    proc.stdin.close()
    proc.wait()
    return found


def _static_entries(known: dict[str, str]) -> tuple[list[tuple[str, str, str, str]], list[tuple[str, str, str, str]]]:
    main: list[tuple[str, str, str, str]] = []
    localized: list[tuple[str, str, str, str]] = []
    names = _tracked_root_html()
    prefixes = _blob_prefixes(names)
    for name in names:
        if name in SKIP_FILES or name.startswith("404") or "(" in name or name.startswith("."):
            continue
        if name.startswith("theme_") or name.startswith("theme."):
            continue
        text = prefixes.get(name, "")
        if NOINDEX_RE.search(text) or REFRESH_RE.search(text):
            continue
        loc = f"{SITE}/" if name == "index.html" else f"{SITE}/{name}"
        priority = "1.0" if name == "index.html" else ("0.9" if name.startswith("index") else "0.7")
        freq = "daily" if name == "index.html" else "weekly"
        entry = (loc, _lastmod(known, loc, bumped=False), freq, priority)
        if LOCALE_FILE_RE.match(name):
            localized.append(entry)
        else:
            main.append(entry)
    return main, localized


def _theme_entries(known: dict[str, str]) -> tuple[list[tuple[str, str, str, str]], list[tuple[str, str, str, str]]]:
    hidden, _ = _listed_folders()
    entries: list[tuple[str, str, str, str]] = []
    localized: list[tuple[str, str, str, str]] = []
    for folder in sorted(REPO_ROOT.iterdir(), key=lambda item: item.name.casefold()):
        if not folder.is_dir() or folder.name.startswith((".", "_")) or folder.name in SKIP_DIRS:
            continue
        if folder.name in hidden:
            continue
        index = folder / "index.html"
        if not index.is_file():
            continue
        if not _noindex(index):
            loc = _encode([folder.name])
            entries.append((loc, _lastmod(known, loc, bumped=True), "weekly", "0.8"))
        for translated in sorted(folder.glob("index_*.html")):
            if not LOCALE_FILE_RE.match(translated.name) or _noindex(translated):
                continue
            loc = f"{SITE}/{quote(folder.name, safe='')}/{quote(translated.name, safe='')}"
            localized.append((loc, _lastmod(known, loc, bumped=True), "weekly", "0.6"))
        variants_root = folder / "Variants"
        if variants_root.is_dir():
            for variant in sorted(variants_root.iterdir(), key=lambda item: item.name.casefold()):
                share = variant / "_share" / "index.html"
                if not share.is_file() or _noindex(share):
                    continue
                loc = _encode([folder.name, "Variants", variant.name, "_share"])
                entries.append((loc, _lastmod(known, loc, bumped=True), "weekly", "0.7"))
    return entries, localized


def _dedupe(entries: list[tuple[str, str, str, str]]) -> list[tuple[str, str, str, str]]:
    seen: dict[str, tuple[str, str, str, str]] = {}
    for entry in entries:
        seen.setdefault(entry[0], entry)
    return [seen[loc] for loc in sorted(seen)]


def _render(entries: list[tuple[str, str, str, str]]) -> str:
    lines = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ]
    for loc, lastmod, freq, priority in entries:
        lines += [
            "  <url>",
            f"    <loc>{loc}</loc>",
            f"    <lastmod>{lastmod}</lastmod>",
            f"    <changefreq>{freq}</changefreq>",
            f"    <priority>{priority}</priority>",
            "  </url>",
        ]
    lines.append("</urlset>")
    return "\n".join(lines) + "\n"


def _render_index(children: list[tuple[str, str]]) -> str:
    lines = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ]
    for loc, lastmod in children:
        lines += ["  <sitemap>", f"    <loc>{loc}</loc>"]
        if lastmod:
            lines.append(f"    <lastmod>{lastmod}</lastmod>")
        lines.append("  </sitemap>")
    lines.append("</sitemapindex>")
    return "\n".join(lines) + "\n"


def build() -> dict[pathlib.Path, str]:
    known = _existing_lastmod()
    main, localized = _static_entries(known)
    theme_main, theme_localized = _theme_entries(known)
    main = _dedupe(main + theme_main)
    localized = _dedupe(localized + theme_localized)

    outputs = {REPO_ROOT / "sitemap.xml": _render(main)}
    chunks = [localized[i:i + MAX_URLS] for i in range(0, len(localized), MAX_URLS)] or [[]]
    children: list[tuple[str, str]] = []
    for index, chunk in enumerate(chunks, 1):
        name = "sitemap-i18n.xml" if len(chunks) == 1 else f"sitemap-i18n-{index}.xml"
        outputs[REPO_ROOT / name] = _render(chunk)
        children.append((f"{SITE}/{name}", max((e[1] for e in chunk), default="")))
    if len(chunks) > 1:
        outputs[REPO_ROOT / "sitemap-i18n.xml"] = _render_index(children)
    images = _image_sitemap()
    outputs[REPO_ROOT / "sitemap-images.xml"] = images
    outputs[REPO_ROOT / "sitemap-index.xml"] = _render_index(
        [(f"{SITE}/sitemap.xml", max((e[1] for e in main), default="")),
         (f"{SITE}/sitemap-i18n.xml", max((item[1] for item in children), default="")),
         (f"{SITE}/sitemap-images.xml", _today())]
    )
    return outputs


def _image_sitemap() -> str:
    hidden, _ = _listed_folders()
    try:
        catalog = json.loads((REPO_ROOT / "themes.json").read_text(encoding="utf-8")).get("themes", [])
    except (OSError, ValueError):
        catalog = []
    names = {}
    shots = {}
    for item in catalog:
        folder = str(item.get("folder") or "").strip().strip("/")
        if folder:
            names[folder] = str(item.get("name") or folder)
            shots[folder] = str(item.get("screenshot") or "")
    lines = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">',
    ]
    for folder in sorted(names, key=str.casefold):
        if folder in hidden or "/" in folder or folder.startswith("."):
            continue
        directory = REPO_ROOT / folder
        if not (directory / "index.html").is_file():
            continue
        image = _cover_url(directory, shots.get(folder, ""))
        capture = directory / "screenshot_preview.jpg"
        if not image and not capture.is_file():
            continue
        title = names[folder].replace("&", "&amp;").replace("<", "&lt;")
        loc = _encode([folder])
        lines += ["  <url>", f"    <loc>{loc}</loc>"]
        if image:
            lines += [
                "    <image:image>",
                f"    <image:loc>{image}</image:loc>",
                f"    <image:title>{title}</image:title>",
                "    </image:image>",
            ]
        if capture.is_file():
            # The rendered screen is what people search for ("Y1 theme home
            # screen"); the cover is often just a wallpaper crop.
            shot_url = SITE + "/" + "/".join(
                quote(part, safe="") for part in (folder, "screenshot_preview.jpg")
            )
            lines += [
                "    <image:image>",
                f"    <image:loc>{shot_url}</image:loc>",
                f"    <image:title>{title} home screen</image:title>",
                f"    <image:caption>{title} on an Innioasis Y1 &amp; Y2 player</image:caption>",
                "    </image:image>",
            ]
        lines.append("  </url>")
    lines.append("</urlset>")
    return "\n".join(lines) + "\n"


def _cover_url(directory: pathlib.Path, screenshot: str) -> str:
    candidates = []
    shot = screenshot.replace("\\", "/").split("?")[0]
    if shot:
        candidates.append(shot.lstrip("./"))
    for name in ("cover.jpg", "cover.png", "cover.webp", "cover-thumb.jpg"):
        candidates.append(f"{directory.name}/{name}")
    for rel in candidates:
        path = REPO_ROOT / rel
        if path.is_file() and path.suffix.lower() in {".jpg", ".jpeg", ".png", ".gif", ".webp"}:
            parts = [quote(part, safe="") for part in Path(rel).parts]
            return SITE + "/" + "/".join(parts)
    return ""


def main() -> int:
    parser = argparse.ArgumentParser(description="Build sitemap.xml for themes.innioasis.app")
    parser.add_argument("--check", action="store_true", help="exit 1 when a sitemap is stale")
    args = parser.parse_args()

    outputs = build()
    stale = [path for path, text in outputs.items()
             if (path.read_text(encoding="utf-8") if path.exists() else "") != text]
    stale += [path for path in REPO_ROOT.glob("sitemap*.xml") if path not in outputs]
    if not stale:
        print(f"sitemap: up to date ({outputs[REPO_ROOT / 'sitemap.xml'].count('<url>')} URLs)")
        return 0
    if args.check:
        for path in stale:
            print(f"sitemap: {path.name} is out of date", file=sys.stderr)
        return 1
    for path in stale:
        if path not in outputs:
            path.unlink()
            print(f"Removed stale {path.name}")
            continue
        path.write_text(outputs[path], encoding="utf-8")
        print(f"Wrote {path.name} ({outputs[path].count('<loc>')} URLs)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
