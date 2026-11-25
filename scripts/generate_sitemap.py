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
# Theme shells gained rich unique metadata, specs, breadcrumbs, FAQ JSON-LD,
# and internal cross-links on this day so Google recrawls every theme page.
SHELLS_INDEXABLE_SINCE = "2026-11-25"

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
        # Check index stage 0 first (sees staged files including case-colliding blobs),
        # then fall back to HEAD, then disk.
        data: bytes | None = None
        for spec in (f":{name}", f"HEAD:{name}"):
            proc.stdin.write(f"{spec}\n".encode())
            proc.stdin.flush()
            header = proc.stdout.readline()
            if b" missing" in header:
                continue
            parts = header.split()
            if len(parts) >= 3 and parts[2].isdigit():
                size = int(parts[2])
                data = proc.stdout.read(size)
                proc.stdout.read(1)
                break
        if data is not None:
            found[name] = data[:limit].decode("utf-8", "ignore")
        else:
            disk = REPO_ROOT / name
            found[name] = disk.read_text(encoding="utf-8", errors="ignore")[:limit] if disk.is_file() else ""
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
        priority = (
            "1.0"
            if name == "index.html"
            else ("0.9" if (name.startswith("index") or name == "themes-directory.html") else "0.7")
        )
        freq = "daily" if name in {"index.html", "themes-directory.html"} else "weekly"
        entry = (loc, _lastmod(known, loc, bumped=(name == "themes-directory.html")), freq, priority)
        if LOCALE_FILE_RE.match(name):
            localized.append(entry)
        else:
            main.append(entry)
    return main, localized


def _tracked_repo_paths() -> set[str]:
    """All git-tracked paths (HEAD + staged index), so sparse worktrees still emit complete sitemaps."""
    paths: set[str] = set()
    try:
        raw = subprocess.check_output(["git", "ls-files", "-z"], cwd=REPO_ROOT, stderr=subprocess.DEVNULL)
        for p in raw.decode("utf-8", "surrogateescape").split("\0"):
            if p:
                paths.add(p)
    except Exception:
        pass
    return paths


def _text_is_noindex(text: str) -> bool:
    if not text:
        return True
    return bool(NOINDEX_RE.search(text)) or bool(REFRESH_RE.search(text))


def _theme_entries(known: dict[str, str]) -> tuple[list[tuple[str, str, str, str]], list[tuple[str, str, str, str]]]:
    hidden, _ = _listed_folders()
    entries: list[tuple[str, str, str, str]] = []
    localized: list[tuple[str, str, str, str]] = []
    tracked = _tracked_repo_paths()
    actual_disk_dirs = {
        folder.name
        for folder in REPO_ROOT.iterdir()
        if folder.is_dir() and not folder.name.startswith((".", "_")) and folder.name not in SKIP_DIRS
    }

    # Combine top-level directories from both git index and local disk
    folder_names: set[str] = set(actual_disk_dirs)
    for p in tracked:
        if "/" in p:
            top = p.split("/", 1)[0]
            if top and not top.startswith((".", "_")) and top not in SKIP_DIRS:
                folder_names.add(top)

    by_folder_files: dict[str, set[str]] = {}
    for p in tracked:
        if "/" not in p:
            continue
        top, rest = p.split("/", 1)
        by_folder_files.setdefault(top, set()).add(rest)

    # First collect all candidate paths (exact-case on disk to prevent macOS case-collision leaks)
    per_folder_rels: list[tuple[str, set[str]]] = []
    disk_texts: dict[str, str] = {}
    need_git_check: list[str] = []

    for folder_name in sorted(folder_names, key=str.casefold):
        if folder_name in hidden:
            continue
        rel_set = set(by_folder_files.get(folder_name, set()))
        on_disk_exact = folder_name in actual_disk_dirs
        if on_disk_exact:
            folder = REPO_ROOT / folder_name
            for child in folder.glob("index*.html"):
                rel_set.add(child.name)
            variants_root = folder / "Variants"
            if variants_root.is_dir():
                for variant in variants_root.iterdir():
                    if (variant / "_share" / "index.html").is_file():
                        rel_set.add(f"Variants/{variant.name}/_share/index.html")

        if "index.html" not in rel_set:
            continue
        per_folder_rels.append((folder_name, rel_set))

        candidates = ["index.html"]
        for rel in sorted(rel_set):
            if ("/" not in rel and LOCALE_FILE_RE.match(rel)) or (
                rel.startswith("Variants/") and rel.endswith("/_share/index.html") and len(rel.split("/")) == 4
            ):
                candidates.append(rel)

        for rel in candidates:
            full_rel = f"{folder_name}/{rel}"
            if on_disk_exact and (REPO_ROOT / full_rel).is_file():
                try:
                    disk_texts[full_rel] = (REPO_ROOT / full_rel).read_text(encoding="utf-8", errors="ignore")[:6000]
                except OSError:
                    disk_texts[full_rel] = ""
            else:
                need_git_check.append(full_rel)

    git_texts = _blob_prefixes(need_git_check)

    def is_noindex_rel(full_rel: str) -> bool:
        if full_rel in disk_texts:
            return _text_is_noindex(disk_texts[full_rel])
        return _text_is_noindex(git_texts.get(full_rel, ""))

    for folder_name, rel_set in per_folder_rels:
        if not is_noindex_rel(f"{folder_name}/index.html"):
            loc = _encode([folder_name])
            prio = "0.95" if folder_name == "studio-test" else "0.85"
            entries.append((loc, _lastmod(known, loc, bumped=True), "weekly", prio))

        for rel in sorted(rel_set):
            if "/" not in rel and LOCALE_FILE_RE.match(rel):
                if is_noindex_rel(f"{folder_name}/{rel}"):
                    continue
                loc = f"{SITE}/{quote(folder_name, safe='')}/{quote(rel, safe='')}"
                localized.append((loc, _lastmod(known, loc, bumped=False), "weekly", "0.6"))
            elif rel.startswith("Variants/") and rel.endswith("/_share/index.html"):
                parts = rel.split("/")
                if len(parts) == 4:
                    v_name = parts[1]
                    if not is_noindex_rel(f"{folder_name}/{rel}"):
                        loc = _encode([folder_name, "Variants", v_name, "_share"])
                        entries.append((loc, _lastmod(known, loc, bumped=True), "weekly", "0.75"))
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
    tracked = _tracked_repo_paths()
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
        if f"{folder}/index.html" not in tracked and not (directory / "index.html").is_file():
            continue
        image = _cover_url(directory, shots.get(folder, ""), tracked)
        has_capture = f"{folder}/screenshot_preview.jpg" in tracked or (directory / "screenshot_preview.jpg").is_file()
        if not image and not has_capture:
            continue
        title = names[folder].replace("&", "&amp;").replace("<", "&lt;")
        loc = _encode([folder])
        lines += ["  <url>", f"    <loc>{loc}</loc>"]
        if image:
            lines += [
                "    <image:image>",
                f"    <image:loc>{image}</image:loc>",
                f"    <image:title>{title} Theme for Innioasis Y1 &amp; Y2</image:title>",
                "    </image:image>",
            ]
        if has_capture:
            shot_url = SITE + "/" + "/".join(
                quote(part, safe="") for part in (folder, "screenshot_preview.jpg")
            )
            lines += [
                "    <image:image>",
                f"    <image:loc>{shot_url}</image:loc>",
                f"    <image:title>{title} Theme Home Screen for Innioasis Y1 &amp; Y2</image:title>",
                f"    <image:caption>{title} theme home screen preview on an Innioasis Y1 &amp; Y2 MP3 player</image:caption>",
                "    </image:image>",
            ]
        lines.append("  </url>")
    lines.append("</urlset>")
    return "\n".join(lines) + "\n"


def _cover_url(directory: pathlib.Path, screenshot: str, tracked: set[str] | None = None) -> str:
    candidates = []
    shot = screenshot.replace("\\", "/").split("?")[0]
    if shot:
        candidates.append(shot.lstrip("./"))
    for name in ("cover.jpg", "cover.png", "cover.webp", "cover-thumb.jpg"):
        candidates.append(f"{directory.name}/{name}")
    tracked_set = tracked or set()
    for rel in candidates:
        path = REPO_ROOT / rel
        if (rel in tracked_set or path.is_file()) and path.suffix.lower() in {".jpg", ".jpeg", ".png", ".gif", ".webp"}:
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
