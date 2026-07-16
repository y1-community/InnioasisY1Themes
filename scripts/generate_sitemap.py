#!/usr/bin/env python3
"""Generate sitemap.xml for themes.innioasis.app.

Includes static site pages, each catalog theme folder URL, and
``Theme/Variants/Name/_share/`` URLs when variants exist on disk or in themes.json.
Uses per-theme config.json mtime for lastmod when available.
"""

from __future__ import annotations

import datetime as dt
import json
import sys
from pathlib import Path
from urllib.parse import quote


REPO_ROOT = Path(__file__).resolve().parents[1]
SCRIPTS_DIR = Path(__file__).resolve().parent
if str(SCRIPTS_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPTS_DIR))

THEMES_JSON_PATH = REPO_ROOT / "themes.json"
SITEMAP_PATH = REPO_ROOT / "sitemap.xml"
SITE_BASE = "https://themes.innioasis.app"

from author_submission_policy import theme_is_publicly_listed


def _iso_utc(ts: float | None = None) -> str:
    if ts is None:
        when = dt.datetime.now(dt.timezone.utc)
    else:
        when = dt.datetime.fromtimestamp(ts, tz=dt.timezone.utc)
    return when.replace(microsecond=0).isoformat().replace("+00:00", "Z")


def _load_themes() -> list[dict]:
    data = json.loads(THEMES_JSON_PATH.read_text(encoding="utf-8"))
    themes = data.get("themes", [])
    return themes if isinstance(themes, list) else []


def _url_for_folder(folder: str) -> str:
    clean = str(folder or "").strip().strip("/")
    encoded = "/".join(quote(seg, safe="") for seg in clean.split("/") if seg)
    return f"{SITE_BASE}/{encoded}/"


def _url_for_theme_variant(theme_folder: str, variant_name: str) -> str:
    """Per-variant SEO shell lives at ``ThemeFolder/Variants/VariantName/_share/``."""
    base = str(theme_folder or "").strip().strip("/")
    var = str(variant_name or "").strip().strip("/")
    if not base or not var:
        return ""
    parts = [base, "Variants", var, "_share"]
    encoded = "/".join(quote(seg, safe="") for seg in parts if seg)
    return f"{SITE_BASE}/{encoded}/"


def _lastmod_for_paths(paths: list[Path]) -> str:
    mtimes: list[float] = []
    for p in paths:
        try:
            if p.is_file():
                mtimes.append(p.stat().st_mtime)
        except OSError:
            continue
    return _iso_utc(max(mtimes) if mtimes else None)


def _variant_names_for_theme(folder: str, item: dict) -> list[str]:
    names: set[str] = set()
    vfs = item.get("variantFolders")
    if isinstance(vfs, list):
        for vn in vfs:
            v = str(vn or "").strip()
            if v:
                names.add(v)
    vp = REPO_ROOT / folder / "Variants"
    if vp.is_dir():
        for sub in vp.iterdir():
            if not sub.is_dir() or sub.name.startswith("."):
                continue
            if (sub / "config.json").is_file() or (sub / "_share" / "index.html").is_file():
                names.add(sub.name)
    return sorted(names, key=str.casefold)


def generate() -> str:
    now = _iso_utc()
    static_entries: list[tuple[str, str, str, str]] = [
        # loc, changefreq, priority, lastmod
        (f"{SITE_BASE}/", "daily", "1.0", now),
        (f"{SITE_BASE}/index.html", "daily", "0.9", now),
        (f"{SITE_BASE}/upload.html", "weekly", "0.8", now),
        (f"{SITE_BASE}/solar.html", "weekly", "0.8", now),
        (f"{SITE_BASE}/backfill.html", "monthly", "0.6", now),
        (f"{SITE_BASE}/gold-badge.html", "weekly", "0.7", now),
        (f"{SITE_BASE}/report-theme.html", "monthly", "0.5", now),
        (f"{SITE_BASE}/theme.html", "weekly", "0.5", now),
        (f"{SITE_BASE}/opted-out-blocked-users.html", "monthly", "0.3", now),
        (f"{SITE_BASE}/creators/", "monthly", "0.6", now),
    ]

    themes = _load_themes()
    # loc -> (lastmod, priority)
    theme_entries: dict[str, tuple[str, str]] = {}
    for item in themes:
        if str(item.get("sourceType") or "internal").strip().lower() == "external":
            continue
        if not theme_is_publicly_listed(item):
            continue
        folder = str(item.get("folder") or "").strip()
        if not folder:
            continue
        root_index = REPO_ROOT / folder / "index.html"
        root_cfg = REPO_ROOT / folder / "config.json"
        theme_entries[_url_for_folder(folder)] = (
            _lastmod_for_paths([root_index, root_cfg]),
            "0.8",
        )
        for v in _variant_names_for_theme(folder, item):
            u = _url_for_theme_variant(folder, v)
            if not u:
                continue
            share_index = REPO_ROOT / folder / "Variants" / v / "_share" / "index.html"
            var_cfg = REPO_ROOT / folder / "Variants" / v / "config.json"
            theme_entries[u] = (
                _lastmod_for_paths([share_index, var_cfg, root_cfg]),
                "0.7",
            )

    lines = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ]
    for url, changefreq, priority, lastmod in static_entries:
        lines.extend(
            [
                "  <url>",
                f"    <loc>{url}</loc>",
                f"    <lastmod>{lastmod}</lastmod>",
                f"    <changefreq>{changefreq}</changefreq>",
                f"    <priority>{priority}</priority>",
                "  </url>",
            ]
        )
    for url in sorted(theme_entries.keys()):
        lastmod, priority = theme_entries[url]
        lines.extend(
            [
                "  <url>",
                f"    <loc>{url}</loc>",
                f"    <lastmod>{lastmod}</lastmod>",
                "    <changefreq>weekly</changefreq>",
                f"    <priority>{priority}</priority>",
                "  </url>",
            ]
        )
    lines.append("</urlset>")
    return "\n".join(lines) + "\n"


def main() -> int:
    xml = generate()
    SITEMAP_PATH.write_text(xml, encoding="utf-8")
    loc_count = xml.count("<loc>")
    print(f"Wrote sitemap: {SITEMAP_PATH} ({loc_count} URLs)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
