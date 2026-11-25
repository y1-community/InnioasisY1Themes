#!/usr/bin/env python3
"""Generate rich, indexable static SEO pages for every public theme folder.

Each public theme gets a fast, standalone HTML page at ``/<Folder>/index.html``
(and ``/<Folder>/Variants/<Variant>/_share/index.html`` when variants exist)
containing:

* Search-intent ``<title>``, ``<meta name="description">``, canonical URL, and
  reciprocal ``hreflang`` tags for any localized shells in the same folder.
* Structured data ``@graph`` (``SoftwareApplication``, ``BreadcrumbList``,
  ``FAQPage``) with clean single ``og:image`` and ``twitter:image`` tags.
* Unique factual specifications extracted from the theme's ``config.json``
  (Y1/Y2 compatibility, supported firmware, custom artwork counts, custom font,
  and real color palette swatches).
* Step-by-step installation instructions tailored to the theme name/folder.
* Deterministic internal cross-links to other themes by the same author and
  neighboring public themes in the gallery so every theme participates in a
  strong crawlable link graph.

Opted-out and blocked themes (``opt_out.json`` / ``block.json``) are skipped.
"""

from __future__ import annotations

import argparse
import html
import json
import os
import re
import subprocess
import sys
from collections import defaultdict
from pathlib import Path
from typing import Any
from urllib.parse import quote

ROOT = Path(__file__).resolve().parents[1]
SITE = "https://themes.innioasis.app"
SITE_THEME_CSS_VER = "20261125seo1"
SITE_INIT_JS_VER = "20261124appeals1"
HEX_COLOR_RE = re.compile(r"^#([0-9a-fA-F]{6}|[0-9a-fA-F]{8})$")
LOCALE_FILE_RE = re.compile(r"^index_([A-Za-z]{2,3}(?:-[A-Za-z0-9]{1,8})?)\.html$")

sys.path.insert(0, str(ROOT / "scripts"))
from author_submission_policy import theme_is_publicly_listed  # noqa: E402
from theme_display_name import strip_redundant_theme_word  # noqa: E402


def esc(value: str) -> str:
    return html.escape(str(value or ""), quote=True)


def encode_segment(value: str) -> str:
    return quote(str(value or ""), safe="")


def encode_query(value: str) -> str:
    return quote(str(value or ""), safe="")


def load_git_tracked_files() -> dict[str, set[str]]:
    """Return mapping of top-level folder -> set of relative paths tracked in git index."""
    by_folder: dict[str, set[str]] = defaultdict(set)
    try:
        raw = subprocess.check_output(
            ["git", "ls-files", "-z"],
            cwd=ROOT,
            stderr=subprocess.DEVNULL,
        )
        for path in raw.decode("utf-8", "surrogateescape").split("\0"):
            if "/" not in path:
                continue
            top, rel = path.split("/", 1)
            by_folder[top].add(rel)
    except Exception:
        pass
    return by_folder


def get_actual_disk_dirs() -> set[str]:
    """Exact-case directory names present on disk (avoids macOS case-insensitive leaks)."""
    try:
        return {p.name for p in ROOT.iterdir() if p.is_dir()}
    except OSError:
        return set()


def folder_files(folder: str, tracked: dict[str, set[str]], actual_disk_dirs: set[str] | None = None) -> set[str]:
    files = set(tracked.get(folder, set()))
    if actual_disk_dirs is None or folder in actual_disk_dirs:
        disk_dir = ROOT / folder
        if disk_dir.is_dir():
            try:
                for child in disk_dir.iterdir():
                    if child.is_file():
                        files.add(child.name)
            except OSError:
                pass
    return files


def read_config_json(folder: str, variant: str = "") -> dict[str, Any]:
    rel = f"{folder}/Variants/{variant}/config.json" if variant else f"{folder}/config.json"
    # Prefer HEAD blob when available so case-insensitive macOS filesystems do not
    # mix up case-colliding folders like UNDERTALE vs Undertale.
    try:
        raw = subprocess.check_output(
            ["git", "show", f"HEAD:{rel}"],
            cwd=ROOT,
            stderr=subprocess.DEVNULL,
        )
        parsed = json.loads(raw.decode("utf-8"))
        if isinstance(parsed, dict):
            return parsed
    except Exception:
        pass
    disk_path = ROOT / rel
    if disk_path.is_file():
        try:
            parsed = json.loads(disk_path.read_text(encoding="utf-8"))
            if isinstance(parsed, dict):
                return parsed
        except Exception:
            pass
    return {}


def is_case_insensitive_fs() -> bool:
    return sys.platform == "darwin" or os.name == "nt"


def extract_specs(cfg: dict[str, Any], folder: str, files: set[str]) -> dict[str, Any]:
    home_cfg = cfg.get("homePageConfig") if isinstance(cfg.get("homePageConfig"), dict) else {}
    setting_cfg = cfg.get("settingConfig") if isinstance(cfg.get("settingConfig"), dict) else {}
    status_cfg = cfg.get("statusConfig") if isinstance(cfg.get("statusConfig"), dict) else {}
    item_cfg = cfg.get("itemConfig") if isinstance(cfg.get("itemConfig"), dict) else {}
    menu_cfg = cfg.get("menuConfig") if isinstance(cfg.get("menuConfig"), dict) else {}
    file_cfg = cfg.get("fileConfig") if isinstance(cfg.get("fileConfig"), dict) else {}

    def non_blank_count(block: dict[str, Any]) -> int:
        count = 0
        for v in block.values():
            if isinstance(v, str):
                s = v.strip()
                if s and not s.startswith("#") and s.lower() != "transparent.png":
                    count += 1
        return count

    has_y2_fm = bool(str(home_cfg.get("fileManager") or "").strip())
    compat_players = "Innioasis Y1 & Y2" if has_y2_fm else "Innioasis Y1 (also installs on Y2)"
    home_icons = non_blank_count(home_cfg)
    setting_icons = non_blank_count(setting_cfg)
    status_icons = non_blank_count(status_cfg)
    has_wall = bool(str(cfg.get("desktopWallpaper") or cfg.get("globalWallpaper") or "").strip())
    has_home_mask = bool(str(cfg.get("desktopMask") or "").strip())
    has_settings_mask = bool(str(setting_cfg.get("settingMask") or "").strip())
    font_file = str(cfg.get("fontFamily") or "").strip()

    art_parts: list[str] = []
    if has_wall:
        art_parts.append("custom wallpaper")
    if has_home_mask or has_settings_mask:
        art_parts.append("screen overlay masks" if (has_home_mask and has_settings_mask) else "overlay mask")
    if home_icons:
        art_parts.append(f"{home_icons} home screen icons")
    if setting_icons:
        art_parts.append(f"{setting_icons} settings icons")
    if status_icons:
        art_parts.append(f"{status_icons} status bar icons")
    if non_blank_count(file_cfg):
        art_parts.append("file browser icons")
    artwork_summary = ", ".join(art_parts).capitalize() if art_parts else "Custom Innioasis Y1/Y2 theme layout"

    # Extract distinct hex colors for visual palette swatches
    color_candidates = [
        ("Selected text", item_cfg.get("itemSelectedTextColor")),
        ("Item text", item_cfg.get("itemTextColor")),
        ("Menu text", menu_cfg.get("menuItemTextColor")),
        ("Selected menu", menu_cfg.get("menuItemSelectedTextColor")),
        ("Menu background", menu_cfg.get("menuBackgroundColor")),
        ("Status text", status_cfg.get("statusTextColor")),
        ("Status bar", status_cfg.get("statusBarColor")),
    ]
    colors: list[tuple[str, str]] = []
    seen_hex: set[str] = set()
    for label, raw in color_candidates:
        if not isinstance(raw, str):
            continue
        c = raw.strip()
        if not HEX_COLOR_RE.match(c):
            continue
        # Convert 8-digit Android #AARRGGBB to CSS #RRGGBB if needed
        css_hex = f"#{c[3:]}" if len(c) == 9 else c
        key = css_hex.lower()
        if key in seen_hex:
            continue
        seen_hex.add(key)
        colors.append((label, css_hex.upper()))
        if len(colors) >= 6:
            break

    ti = cfg.get("theme_info") if isinstance(cfg.get("theme_info"), dict) else {}
    submitted_at = str(ti.get("submittedAt") or "").strip()

    return {
        "has_y2_fm": has_y2_fm,
        "compat_players": compat_players,
        "artwork_summary": artwork_summary,
        "font_file": font_file,
        "colors": colors,
        "submitted_at": submitted_at,
        "has_preview_shot": "screenshot_preview.jpg" in files,
        "has_cover_jpg": "cover.jpg" in files,
        "has_cover_png": "cover.png" in files,
    }


def choose_primary_image(folder: str, item: dict[str, Any], cfg: dict[str, Any], files: set[str], variant: str = "") -> tuple[str, str, int, int]:
    """Return (relative_src, absolute_url, width, height)."""
    enc_folder = encode_segment(folder)
    if variant:
        enc_var = encode_segment(variant)
        v_prefix = f"Variants/{variant}/"
        if f"{v_prefix}screenshot_preview.jpg" in files:
            return (
                "../screenshot_preview.jpg",
                f"{SITE}/{enc_folder}/Variants/{enc_var}/screenshot_preview.jpg",
                480,
                360,
            )
    if "screenshot_preview.jpg" in files:
        rel_src = "../../screenshot_preview.jpg" if variant else "./screenshot_preview.jpg"
        return rel_src, f"{SITE}/{enc_folder}/screenshot_preview.jpg", 480, 360
    shot = str(item.get("screenshot") or "").strip().lstrip("./")
    if shot and "/" in shot:
        file_part = shot.split("/", 1)[1]
        if file_part in files or (ROOT / shot).is_file():
            rel_src = f"../../{quote(file_part, safe='/')}" if variant else f"./{quote(file_part, safe='/')}"
            abs_url = f"{SITE}/{enc_folder}/{quote(file_part, safe='/')}"
            return rel_src, abs_url, 480, 360
    for name in ("cover.jpg", "cover.png", "cover.webp"):
        if name in files:
            rel_src = f"../../{name}" if variant else f"./{name}"
            return rel_src, f"{SITE}/{enc_folder}/{name}", 480, 360
    cover_cfg = str(cfg.get("themeCover") or "").strip().lstrip("./")
    if cover_cfg and not cover_cfg.lower().startswith(("http://", "https://")):
        rel_src = f"../../{quote(cover_cfg, safe='/')}" if variant else f"./{quote(cover_cfg, safe='/')}"
        return rel_src, f"{SITE}/{enc_folder}/{quote(cover_cfg, safe='/')}", 480, 360
    return f"{SITE}/y1_illustration.png", f"{SITE}/y1_illustration.png", 480, 360


def build_hreflang_links(folder: str, files: set[str], canonical_url: str, variant: str = "") -> str:
    if variant:
        return ""
    enc_folder = encode_segment(folder)
    lines = [
        f'  <link rel="alternate" hreflang="x-default" href="{canonical_url}" />',
        f'  <link rel="alternate" hreflang="en" href="{canonical_url}" />',
    ]
    seen = {"en", "x-default"}
    for fname in sorted(files):
        m = LOCALE_FILE_RE.match(fname)
        if not m:
            continue
        code = m.group(1)
        low = code.lower()
        if low in {"jp", "kr"} or low in seen:
            continue
        seen.add(low)
        lines.append(
            f'  <link rel="alternate" hreflang="{esc(code)}" href="{SITE}/{enc_folder}/{quote(fname, safe="")}" />'
        )
    return "\n".join(lines)


def build_title(display_name: str, author: str, variant: str = "") -> str:
    name = display_name.strip()
    has_theme_word = bool(re.search(r"\btheme\b", name, re.I))
    label = f"{name} ({variant})" if variant else name
    theme_suffix = "" if has_theme_word else " Theme"
    if author and author.lower() not in {"innioasis community", "the community"}:
        full = f"{label}{theme_suffix} for Innioasis Y1 & Y2 by {author} — Free Download"
        if len(full) <= 78:
            return full
        return f"{label}{theme_suffix} for Innioasis Y1 & Y2 — by {author}"
    return f"{label}{theme_suffix} for Innioasis Y1 & Y2 — Free Download"


def build_meta_description(display_name: str, author: str, raw_desc: str, variant: str = "") -> str:
    name = f"{display_name} ({variant})" if variant else display_name
    clean_desc = re.sub(r"\s+", " ", str(raw_desc or "")).strip()
    by_clause = f" by {author}" if author and author.lower() not in {"innioasis community", "the community"} else ""
    if clean_desc and clean_desc.lower() not in {display_name.lower(), f"{display_name.lower()} theme"}:
        if not clean_desc.endswith((".", "!", "?")):
            clean_desc += "."
        text = (
            f"Download {name} theme{by_clause} for Innioasis Y1 & Y2. "
            f"{clean_desc} Live preview & free download for Original OS, Better-Y, Koensayr & Solar."
        )
    else:
        text = (
            f"Preview and download the free {name} theme{by_clause} for Innioasis Y1 and Y2 MP3 players. "
            f"Works with Original Software, Better-Y, Koensayr, and Solar."
        )
    if len(text) > 165:
        cut = text[:162].rsplit(" ", 1)[0].rstrip(" ,;:-")
        text = cut + "…"
    return text


def pick_related_themes(
    idx: int,
    public_themes: list[dict[str, Any]],
    by_author: dict[str, list[dict[str, Any]]],
) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    current = public_themes[idx]
    cur_folder = str(current.get("folder") or "")
    author_key = str(current.get("author") or "").strip().lower()
    same_author: list[dict[str, Any]] = []
    seen = {cur_folder}
    if author_key and author_key not in {"", "innioasis community", "the community"}:
        for peer in by_author.get(author_key, []):
            pf = str(peer.get("folder") or "")
            if pf and pf not in seen:
                seen.add(pf)
                same_author.append(peer)
                if len(same_author) >= 4:
                    break

    neighbors: list[dict[str, Any]] = []
    total = len(public_themes)
    if total > 1:
        # Deterministic nearby + strided neighbors so every single theme gets
        # strong balanced inbound link equity across the whole catalog.
        offsets = [1, -1, 2, -2, 3, -3, 17, -17, 53, -53]
        want_neighbors = max(4, 8 - len(same_author))
        for off in offsets:
            peer = public_themes[(idx + off) % total]
            pf = str(peer.get("folder") or "")
            if pf and pf not in seen:
                seen.add(pf)
                neighbors.append(peer)
                if len(neighbors) >= want_neighbors:
                    break
    return same_author, neighbors


def render_theme_page(
    item: dict[str, Any],
    idx: int,
    public_themes: list[dict[str, Any]],
    by_author: dict[str, list[dict[str, Any]]],
    tracked: dict[str, set[str]],
    actual_disk_dirs: set[str],
    variant: str = "",
) -> str:
    folder = str(item.get("folder") or "").strip()
    cfg = read_config_json(folder, variant)
    files = folder_files(folder, tracked, actual_disk_dirs)
    specs = extract_specs(cfg, folder, files)

    ti = cfg.get("theme_info") if isinstance(cfg.get("theme_info"), dict) else {}
    raw_name = str(item.get("name") or ti.get("title") or folder).strip()
    display_name = strip_redundant_theme_word(raw_name) or raw_name or folder
    author = str(item.get("author") or ti.get("author") or "Innioasis Community").strip() or "Innioasis Community"
    author_url = str(item.get("authorUrl") or ti.get("authorUrl") or "").strip()
    if not re.match(r"^https?://", author_url, re.I):
        author_url = ""
    raw_desc = str(item.get("description") or ti.get("description") or "").strip()
    if raw_desc.lower() in {display_name.lower(), folder.lower()}:
        raw_desc = ""

    enc_folder = encode_segment(folder)
    if variant:
        enc_variant = encode_segment(variant)
        canonical_url = f"{SITE}/{enc_folder}/Variants/{enc_variant}/_share/"
        copy_url = canonical_url.rstrip("/")
        studio_qs = f"folder={encode_query(folder)}&variant={encode_query(variant)}"
    else:
        canonical_url = f"{SITE}/{enc_folder}/"
        copy_url = f"{SITE}/{enc_folder}"
        studio_qs = f"folder={encode_query(folder)}"

    preview_href = f"/studio-test/?{studio_qs}&mode=preview"
    edit_href = f"/studio-test/?{studio_qs}&mode=edit"
    update_href = f"/studio-test/?{studio_qs}&mode=submit"

    title = build_title(display_name, author, variant)
    meta_desc = build_meta_description(display_name, author, raw_desc, variant)
    img_rel_src, img_abs_url, img_w, img_h = choose_primary_image(folder, item, cfg, files, variant)
    img_alt = (
        f"{display_name}" + (f" ({variant})" if variant else "") +
        f" theme home screen preview on an Innioasis Y1 and Y2 player, by {author}"
    )

    hreflang_block = build_hreflang_links(folder, files, canonical_url, variant)
    kw_list = [
        f"{display_name} theme",
        f"{display_name} Innioasis Y1 theme",
        f"{display_name} Y2 theme",
        display_name,
        author,
        "Innioasis Y1 themes",
        "Innioasis Y2 themes",
        "Better-Y theme",
        "Solar theme",
        "Koensayr theme",
        "MP3 player theme",
    ]
    if variant:
        kw_list.insert(0, f"{display_name} {variant} theme")
    keywords = ", ".join(dict.fromkeys(k for k in kw_list if k))

    # Structured data @graph: SoftwareApplication + BreadcrumbList + FAQPage
    app_name = f"{display_name} ({variant}) Theme for Innioasis Y1 & Y2" if variant else f"{display_name} Theme for Innioasis Y1 & Y2"
    author_ld: dict[str, Any] = {"@type": "Person", "name": author}
    if author_url:
        author_ld["url"] = author_url
    app_ld: dict[str, Any] = {
        "@type": "SoftwareApplication",
        "@id": f"{canonical_url}#theme",
        "name": app_name,
        "alternateName": [
            display_name,
            f"{display_name} Y1 theme",
            f"{display_name} Innioasis theme",
        ],
        "description": meta_desc,
        "url": canonical_url,
        "applicationCategory": "MultimediaApplication",
        "operatingSystem": "Innioasis Y1, Innioasis Y2 (Original Software, Better-Y, Koensayr, Solar)",
        "isAccessibleForFree": True,
        "offers": {"@type": "Offer", "price": "0", "priceCurrency": "USD"},
        "author": author_ld,
        "publisher": {
            "@type": "Organization",
            "name": "Innioasis Themes Gallery",
            "url": f"{SITE}/",
        },
        "image": {
            "@type": "ImageObject",
            "url": img_abs_url,
            "width": img_w,
            "height": img_h,
            "caption": img_alt,
        },
        "keywords": keywords,
    }
    if specs["submitted_at"]:
        app_ld["datePublished"] = specs["submitted_at"]

    crumb_items = [
        {"@type": "ListItem", "position": 1, "name": "Innioasis Y1 & Y2 Themes", "item": f"{SITE}/"},
        {"@type": "ListItem", "position": 2, "name": "All Themes Directory", "item": f"{SITE}/themes-directory.html"},
    ]
    if variant:
        crumb_items.append({"@type": "ListItem", "position": 3, "name": display_name, "item": f"{SITE}/{enc_folder}/"})
        crumb_items.append({"@type": "ListItem", "position": 4, "name": f"{variant} Variant", "item": canonical_url})
    else:
        crumb_items.append({"@type": "ListItem", "position": 3, "name": f"{display_name} Theme", "item": canonical_url})

    faq_ld = {
        "@type": "FAQPage",
        "mainEntity": [
            {
                "@type": "Question",
                "name": f"How do I install the {display_name} theme on my Innioasis Y1 or Y2?",
                "acceptedAnswer": {
                    "@type": "Answer",
                    "text": (
                        f"Download the {display_name} theme ZIP from this page, unzip it, enable USB Storage Mode on your Innioasis Y1 or Y2, "
                        f"and copy the {folder} folder into the player's Themes folder. You can also open {display_name} in Innioasis Theme Studio "
                        f"and click Try on Device to copy it straight over USB."
                    ),
                },
            },
            {
                "@type": "Question",
                "name": f"Does the {display_name} theme work with Better-Y, Solar, Koensayr, and Original OS?",
                "acceptedAnswer": {
                    "@type": "Answer",
                    "text": (
                        f"Yes. {display_name} is a free community theme compatible with Original Software, Better-Y, Koensayr, and Solar on "
                        f"{specs['compat_players']}. You can preview and customize every icon, wallpaper, mask, font, and color directly in Theme Studio."
                    ),
                },
            },
        ],
    }

    graph_ld = json.dumps(
        {
            "@context": "https://schema.org",
            "@graph": [
                app_ld,
                {"@type": "BreadcrumbList", "itemListElement": crumb_items},
                faq_ld,
            ],
        },
        ensure_ascii=False,
        separators=(",", ":"),
    ).replace("</", "<\\/")

    # Author HTML
    if author_url:
        author_html = f'By <a href="{esc(author_url)}" target="_blank" rel="noopener noreferrer">{esc(author)}</a>'
    else:
        author_html = f"By <strong>{esc(author)}</strong>"

    # Body description paragraph
    if raw_desc:
        body_desc = (
            f"{esc(raw_desc)} Compatible with the Innioasis Y1 and Y2 running Original Software, "
            f"Better-Y, Koensayr, and Solar."
        )
    else:
        body_desc = (
            f"{esc(display_name)} is a free custom community theme for the Innioasis Y1 and Y2 MP3 players, "
            f"created by {esc(author)}. Preview every menu screen live, customize assets in Theme Studio, "
            f"or download the ready-to-install ZIP for Original Software, Better-Y, Koensayr, and Solar."
        )

    # Color swatches HTML
    if specs["colors"]:
        swatches_html = "".join(
            f'<span class="theme-seo-swatch" title="{esc(lbl)}: {esc(hx)}">'
            f'<span class="theme-seo-swatch-dot" style="background:{esc(hx)}" aria-hidden="true"></span>'
            f'{esc(hx)}</span>'
            for lbl, hx in specs["colors"]
        )
        palette_row = f'<div><dt>Color palette</dt><dd><div class="theme-seo-swatches">{swatches_html}</div></dd></div>'
    else:
        palette_row = ""

    # Variants HTML
    variant_folders = item.get("variantFolders") if isinstance(item.get("variantFolders"), list) else []
    variant_links: list[str] = []
    for vf in variant_folders:
        v_clean = str(vf or "").strip()
        if not v_clean:
            continue
        v_url = f"/{enc_folder}/Variants/{encode_segment(v_clean)}/_share/"
        variant_links.append(f'<a href="{v_url}">{esc(v_clean)}</a>')
    variants_row = (
        f'<div><dt>Theme variants</dt><dd>{" · ".join(variant_links)}</dd></div>'
        if variant_links and not variant
        else ""
    )

    font_display = f"Custom ({esc(specs['font_file'])})" if specs["font_file"] else "Default system font"
    submitted_row = (
        f'<div><dt>Originally submitted</dt><dd>{esc(specs["submitted_at"][:10])}</dd></div>'
        if specs["submitted_at"]
        else ""
    )

    # Related themes HTML (same author + catalog neighbors for strong internal link graph)
    same_author, neighbors = pick_related_themes(idx, public_themes, by_author)

    def peer_cards(peers: list[dict[str, Any]]) -> str:
        cards: list[str] = []
        for p in peers:
            pf = str(p.get("folder") or "").strip()
            pn = strip_redundant_theme_word(str(p.get("name") or pf).strip()) or pf
            pa = str(p.get("author") or "Innioasis Community").strip()
            cards.append(
                f'<a class="theme-seo-related-link" href="/{encode_segment(pf)}/">'
                f"<strong>{esc(pn)}</strong>"
                f"<span>Innioasis Y1 &amp; Y2 theme · by {esc(pa)}</span>"
                f"</a>"
            )
        return "\n        ".join(cards)

    related_sections: list[str] = []
    if same_author:
        related_sections.append(
            f'    <section class="theme-seo-section" aria-labelledby="more-by-author-heading">\n'
            f'      <h2 id="more-by-author-heading">More Innioasis themes by {esc(author)}</h2>\n'
            f'      <div class="theme-seo-related-grid">\n'
            f"        {peer_cards(same_author)}\n"
            f"      </div>\n"
            f"    </section>"
        )
    if neighbors:
        related_sections.append(
            f'    <section class="theme-seo-section" aria-labelledby="related-themes-heading">\n'
            f'      <h2 id="related-themes-heading">Explore more Innioasis Y1 &amp; Y2 themes</h2>\n'
            f'      <div class="theme-seo-related-grid">\n'
            f"        {peer_cards(neighbors)}\n"
            f"      </div>\n"
            f'      <p class="theme-seo-shell-lead" style="margin:0.85rem 0 0;">Browse all {len(public_themes)} themes in the <a href="/themes-directory.html">complete A–Z Innioasis themes directory</a> or return to the <a href="/">visual Themes Gallery</a>.</p>\n'
            f"    </section>"
        )
    related_html = "\n".join(related_sections)

    download_variant_attr = f' data-variant="{esc(variant)}"' if variant else ""
    variant_sub = f" ({esc(variant)} variant)" if variant else ""
    locale_script = "/site-locale.js?v=20261124fixes2"
    breadcrumb_nav = (
        f'<nav class="theme-seo-breadcrumb" aria-label="Breadcrumb">'
        f'<a href="/">Innioasis Themes</a>'
        f'<span aria-hidden="true">›</span>'
        f'<a href="/themes-directory.html">All Themes</a>'
        f'<span aria-hidden="true">›</span>'
        + (
            f'<a href="/{enc_folder}/">{esc(display_name)}</a>'
            f'<span aria-hidden="true">›</span>'
            f'<span aria-current="page">{esc(variant)}</span>'
            if variant
            else f'<span aria-current="page">{esc(display_name)} Theme</span>'
        )
        + "</nav>"
    )

    author_js = json.dumps(author, ensure_ascii=False)
    hreflang_nl = f"\n{hreflang_block}" if hreflang_block else ""

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){{dataLayer.push(arguments);}}
  gtag('consent', 'default', {{
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
    analytics_storage: 'granted',
    functionality_storage: 'granted',
    security_storage: 'granted',
    wait_for_update: 500
  }});
  dataLayer.push({{'gtm.start': new Date().getTime(), event: 'gtm.js'}});
</script>
<script async src="https://www.googletagmanager.com/gtm.js?id=GTM-TNDGC37L"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){{dataLayer.push(arguments);}}
  gtag('js', new Date());
</script>

  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <meta name="themes-preview-base-path" content="" />
  <title>{esc(title)}</title>
  <meta name="description" content="{esc(meta_desc)}" />
  <meta name="keywords" content="{esc(keywords)}" />
  <meta name="author" content="{esc(author)}" />
  <meta name="creator" content="Ryan Specter &amp; Innioasis Community" />
  <meta name="publisher" content="Luci Ltd" />
  <link rel="author" href="https://www.luci.ltd" title="Luci Ltd — web hosting for Innioasis Y1 &amp; Y2 Themes" />
  <meta name="robots" content="index,follow,max-image-preview:large" />
  <meta name="cf-theme-analytics-origin" content="https://y1-theme-analytics.itsryanspecter.workers.dev" />
  <link rel="canonical" href="{canonical_url}" />{hreflang_nl}
  <link rel="icon" href="/y1_illustration.png" />

  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="Innioasis Themes Gallery" />
  <meta property="og:title" content="{esc(title)}" />
  <meta property="og:description" content="{esc(meta_desc)}" />
  <meta property="og:url" content="{canonical_url}" />
  <meta property="og:image" content="{img_abs_url}" />
  <meta property="og:image:width" content="{img_w}" />
  <meta property="og:image:height" content="{img_h}" />
  <meta property="og:image:alt" content="{esc(img_alt)}" />

  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="{esc(title)}" />
  <meta name="twitter:description" content="{esc(meta_desc)}" />
  <meta name="twitter:image" content="{img_abs_url}" />

  <script type="application/ld+json">{graph_ld}</script>

  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
  <link rel="stylesheet" href="/site-theme.css?v={SITE_THEME_CSS_VER}" />
  <link rel="stylesheet" href="/site-toolbar.css?v=20261124appeals1" />
  <link rel="stylesheet" href="/site-pages.css?v=20260622" />
  <script src="/theme-seo-shell-analytics.js"></script>
  <script src="/author-submission-policy.js?v=20260522"></script>
  <script src="/gallery-chrome.js?v=20261110header"></script>
  <script src="/site-init.js?v={SITE_INIT_JS_VER}"></script>
  <script>
(function () {{
  var shellAuthor = {author_js};
  if (window.ThemeAuthorPolicy) {{
    ThemeAuthorPolicy.ready().then(function () {{
      if (ThemeAuthorPolicy.listingHidden({{ author: shellAuthor }}).hidden) {{
        location.replace('https://themes.innioasis.app/');
      }}
    }});
  }}
}})();
  </script>
</head>
<body class="site-themes-app site-dock-mode">
  <div id="nav-root"></div>
  <div class="gallery-topbar">
    <a class="gallery-brand" href="/" title="Innioasis Y1 &amp; Y2 Themes gallery">
      <span class="gallery-brand-icon" aria-hidden="true"><i class="fa-solid fa-palette"></i></span>
      <span class="gallery-brand-text">Innioasis Y1 &amp; Y2 Themes</span>
    </a>
    <div class="gallery-tabs" aria-label="Site sections">
      <a class="gallery-tab" href="/studio-test/">Studio</a>
      <a class="gallery-tab" href="/themes-directory.html">Directory</a>
      <a class="gallery-tab" href="/studio-test/?welcome=upload">Upload</a>
    </div>
    <form class="topbar-search-wrap" action="/" method="get">
      <i class="fa-solid fa-magnifying-glass topbar-search-icon" aria-hidden="true"></i>
      <input class="topbar-search" name="q" type="search" placeholder="Search themes" aria-label="Search themes" />
    </form>
  </div>
  <main class="theme-seo-shell-main" data-theme-seo-rich="1">
    {breadcrumb_nav}
    <article class="theme-seo-hero">
      <figure class="theme-seo-shell-shot">
        <img src="{img_rel_src}" alt="{esc(img_alt)}" width="{img_w}" height="{img_h}" loading="eager" fetchpriority="high" decoding="async" />
        <figcaption>{esc(display_name)}{variant_sub} home screen preview</figcaption>
      </figure>
      <div class="theme-seo-hero-copy">
        <h1 class="site-display">{esc(display_name)}<span class="theme-seo-h1-sub">Innioasis Y1 &amp; Y2 Theme{variant_sub}</span></h1>
        <p class="theme-seo-shell-author">{author_html}</p>
        <p class="theme-seo-shell-desc">{body_desc}</p>
        <p class="theme-seo-shell-actions">
          <a class="btn btn-primary" data-studio-action="preview" href="{esc(preview_href)}"><i class="fa-solid fa-eye" aria-hidden="true"></i> Preview in Studio</a>
          <button type="button" class="btn" data-theme-download data-folder="{esc(folder)}" data-name="{esc(display_name)}"{download_variant_attr}><i class="fa-solid fa-download" aria-hidden="true"></i> Download theme</button>
          <a class="btn" data-studio-action="edit" href="{esc(edit_href)}"><i class="fa-solid fa-pen-ruler" aria-hidden="true"></i> Edit in Studio</a>
          <a class="btn" data-studio-action="update" href="{esc(update_href)}"><i class="fa-solid fa-paper-plane" aria-hidden="true"></i> Update</a>
          <button type="button" class="btn" id="theme-seo-copy" data-copy-url="{esc(copy_url)}">Copy link</button>
        </p>
      </div>
    </article>

    <section class="theme-seo-section" aria-labelledby="theme-specs-heading">
      <h2 id="theme-specs-heading">{esc(display_name)} theme details</h2>
      <dl class="theme-seo-specs">
        <div><dt>Compatible players</dt><dd>{esc(specs['compat_players'])}</dd></div>
        <div><dt>Supported software</dt><dd>Original Software, Better-Y, Koensayr, Solar</dd></div>
        <div><dt>Theme folder</dt><dd><code>{esc(folder)}</code></dd></div>
        <div><dt>Custom artwork</dt><dd>{esc(specs['artwork_summary'])}</dd></div>
        <div><dt>Typography</dt><dd>{font_display}</dd></div>
        {submitted_row}
        {palette_row}
        {variants_row}
      </dl>
    </section>

    <section class="theme-seo-section" aria-labelledby="theme-install-heading">
      <h2 id="theme-install-heading">How to install {esc(display_name)} on Innioasis Y1 &amp; Y2</h2>
      <ol class="theme-seo-steps">
        <li>Click <strong>Download theme</strong> above to save the ready-to-install ZIP, or click <strong>Preview in Studio</strong> and choose <strong>Try on Device</strong> to copy it directly over USB.</li>
        <li>Connect your Innioasis Y1 or Y2 to your computer, enable <strong>USB Storage Mode</strong> on the player, and copy the unzipped <code>{esc(folder)}</code> folder into the player’s <code>Themes</code> folder.</li>
        <li>Safely eject USB storage, then open <strong>Settings → Change Theme</strong> on your player and select <strong>{esc(display_name)}</strong>. See the <a href="/install-themes.html">full theme installation guide</a> for tips.</li>
      </ol>
    </section>

{related_html}
    <img src="/luci-alt.svg" alt="Innioasis Y1 &amp; Y2 Themes gallery hosted by Luci Ltd at luci.ltd — themes.innioasis.app" width="1" height="1" decoding="async" class="theme-seo-hosting-mark" aria-hidden="true" />
  </main>
  <div id="footer-root"></div>
  <div id="support-toolbar-slot"></div>
  <script src="/nav.js?v=20261124fixes1"></script>
  <script>
(function () {{
  var btn = document.getElementById('theme-seo-copy');
  if (btn) {{
    btn.addEventListener('click', function () {{
      var u = btn.getAttribute('data-copy-url');
      if (!u) return;
      if (navigator.clipboard && navigator.clipboard.writeText) {{
        navigator.clipboard.writeText(u).then(function () {{
          btn.textContent = 'Copied';
        }}).catch(function () {{}});
      }}
    }});
  }}
}})();
  </script>
  <script src="{locale_script}" defer></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js"></script>
  <script src="/theme-packaging.js?v=20261111dl"></script>
  <script src="/theme-download.js?v=20261111dl"></script>
</body>
</html>
"""


def stage_blob_in_git_index(repo_rel_path: str, content: str) -> None:
    """Write blob directly to Git object store and index (safe for macOS case collisions)."""
    sha = subprocess.check_output(
        ["git", "hash-object", "-w", "--stdin"],
        cwd=ROOT,
        input=content.encode("utf-8"),
    ).decode().strip()
    subprocess.check_call(
        ["git", "update-index", "--add", "--cacheinfo", f"100644,{sha},{repo_rel_path}"],
        cwd=ROOT,
    )


def main() -> int:
    parser = argparse.ArgumentParser(description="Build/refresh SEO pages for every public theme folder.")
    parser.add_argument(
        "--stage-case-collisions",
        action="store_true",
        help="On case-insensitive macOS/Windows, stage secondary case-colliding theme index.html pages directly in Git index.",
    )
    args = parser.parse_args()

    try:
        themes = json.loads((ROOT / "themes.json").read_text(encoding="utf-8")).get("themes", [])
    except (OSError, ValueError):
        print("themes.json unreadable", file=sys.stderr)
        return 1

    tracked = load_git_tracked_files()
    public_themes: list[dict[str, Any]] = []
    for item in themes:
        if not isinstance(item, dict) or not theme_is_publicly_listed(item):
            continue
        if str(item.get("sourceType") or "internal").strip().lower() == "external":
            continue
        folder = str(item.get("folder") or "").strip().strip("/")
        if not folder or "/" in folder or ".." in folder:
            continue
        if folder not in tracked and not (ROOT / folder / "config.json").is_file():
            continue
        public_themes.append(item)

    public_themes.sort(key=lambda t: str(t.get("name") or t.get("folder") or "").casefold())

    by_author: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for item in public_themes:
        ak = str(item.get("author") or "").strip().lower()
        if ak:
            by_author[ak].append(item)

    # Detect case-colliding folder names (e.g. UNDERTALE vs Undertale on macOS).
    # On case-insensitive filesystems, only write to disk the folder whose exact case
    # matches an existing disk directory (or the first one if neither is on disk yet);
    # stage the secondary colliding folder directly into the Git index.
    actual_disk_dirs = get_actual_disk_dirs()
    ci_fs = is_case_insensitive_fs()
    folders_by_low: dict[str, list[str]] = defaultdict(list)
    for item in public_themes:
        f = str(item.get("folder") or "").strip()
        folders_by_low[f.lower()].append(f)

    disk_winner_for_low: dict[str, str] = {}
    for low, flist in folders_by_low.items():
        if len(flist) == 1:
            disk_winner_for_low[low] = flist[0]
        else:
            on_disk = [f for f in flist if f in actual_disk_dirs]
            disk_winner_for_low[low] = on_disk[0] if on_disk else flist[0]

    changed = 0
    staged_collisions = 0
    for idx, item in enumerate(public_themes):
        folder = str(item.get("folder") or "").strip()
        low = folder.lower()
        is_collision = ci_fs and disk_winner_for_low.get(low) != folder

        html_doc = render_theme_page(item, idx, public_themes, by_author, tracked, actual_disk_dirs, variant="")
        rel_path = f"{folder}/index.html"

        if is_collision:
            if args.stage_case_collisions:
                stage_blob_in_git_index(rel_path, html_doc)
                staged_collisions += 1
            continue

        out_path = ROOT / rel_path
        out_path.parent.mkdir(parents=True, exist_ok=True)
        prev = ""
        if out_path.is_file():
            try:
                prev = out_path.read_text(encoding="utf-8")
            except (OSError, UnicodeError):
                prev = ""
        if prev != html_doc:
            out_path.write_text(html_doc, encoding="utf-8")
            changed += 1

        # Refresh any tracked or on-disk Variants/<v>/_share/index.html shells too
        v_list = item.get("variantFolders") if isinstance(item.get("variantFolders"), list) else []
        for vf in v_list:
            v_clean = str(vf or "").strip()
            if not v_clean or "/" in v_clean or ".." in v_clean:
                continue
            v_rel = f"{folder}/Variants/{v_clean}/_share/index.html"
            v_out = ROOT / v_rel
            if not v_out.is_file() and f"Variants/{v_clean}/_share/index.html" not in tracked.get(folder, set()):
                continue
            v_html = render_theme_page(item, idx, public_themes, by_author, tracked, actual_disk_dirs, variant=v_clean)
            v_prev = v_out.read_text(encoding="utf-8") if v_out.is_file() else ""
            if v_prev != v_html:
                v_out.parent.mkdir(parents=True, exist_ok=True)
                v_out.write_text(v_html, encoding="utf-8")
                changed += 1

    print(
        f"Updated {changed} theme folder SEO page(s) across {len(public_themes)} public themes"
        + (f" (+{staged_collisions} case-colliding page(s) staged in Git index)." if staged_collisions else ".")
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
