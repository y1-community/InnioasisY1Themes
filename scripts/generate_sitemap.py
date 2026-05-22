#!/usr/bin/env python3
"""Generate sitemap.xml for themes.innioasis.app.

Includes each catalog theme folder and ``Theme/Variants/Name/_share/`` URLs when
``themes.json`` lists ``variantFolders``.
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


def _iso_now() -> str:
    return dt.datetime.now(dt.timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


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


def generate() -> str:
    now = _iso_now()
    static_urls: list[tuple[str, str]] = [
        (f"{SITE_BASE}/", "daily"),
        (f"{SITE_BASE}/index.html", "daily"),
        (f"{SITE_BASE}/upload.html", "weekly"),
        (f"{SITE_BASE}/report-theme.html", "weekly"),
        (f"{SITE_BASE}/theme.html", "weekly"),
    ]
    themes = _load_themes()
    theme_urls: set[str] = set()
    for item in themes:
        if str(item.get("sourceType") or "internal").strip().lower() == "external":
            continue
        if not theme_is_publicly_listed(item):
            continue
        folder = str(item.get("folder") or "").strip()
        if not folder:
            continue
        theme_urls.add(_url_for_folder(folder))
        vfs = item.get("variantFolders")
        if isinstance(vfs, list):
            for vn in vfs:
                v = str(vn or "").strip()
                if not v:
                    continue
                u = _url_for_theme_variant(folder, v)
                if u:
                    theme_urls.add(u)
    theme_urls_sorted = sorted(theme_urls)

    lines = ['<?xml version="1.0" encoding="UTF-8"?>']
    lines.append('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">')
    for url, changefreq in static_urls:
        lines.extend(
            [
                "  <url>",
                f"    <loc>{url}</loc>",
                f"    <lastmod>{now}</lastmod>",
                f"    <changefreq>{changefreq}</changefreq>",
                "    <priority>0.8</priority>",
                "  </url>",
            ]
        )
    for url in theme_urls_sorted:
        lines.extend(
            [
                "  <url>",
                f"    <loc>{url}</loc>",
                f"    <lastmod>{now}</lastmod>",
                "    <changefreq>weekly</changefreq>",
                "    <priority>0.7</priority>",
                "  </url>",
            ]
        )
    lines.append("</urlset>")
    return "\n".join(lines) + "\n"


def main() -> int:
    xml = generate()
    SITEMAP_PATH.write_text(xml, encoding="utf-8")
    print(f"Wrote sitemap: {SITEMAP_PATH}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
