#!/usr/bin/env python3
"""
Generate localized static theme SEO shells (<theme_folder>/index_<locale>.html)
for search engines, RAG systems, and international visitors.

Each static shell:
- Contains pre-translated descriptions from themes_i18n.json
- Is the indexable address for that theme. The live preview stays a link, not a redirect
- Includes bidirectional hreflang links, OpenGraph, Twitter cards, and Schema.org JSON-LD
"""

from __future__ import annotations

import argparse
import html
import json
import os
import sys
import urllib.parse
from typing import Dict, List, Optional

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
CANONICAL_HOST = "https://themes.innioasis.app"

SHELL_STRINGS = {
    "site_title": {
        "en": "Innioasis Y1 and Y2 Themes Gallery",
        "de": "Innioasis Y1 & Y2 Theme-Galerie",
        "fr": "Galerie de thèmes Innioasis Y1 & Y2",
        "es": "Galería de temas Innioasis Y1 y Y2",
        "it": "Galleria di temi Innioasis Y1 e Y2",
        "ja": "Innioasis Y1 & Y2 テーマギャラリー",
        "jp": "Innioasis Y1 & Y2 テーマギャラリー",
        "ru": "Галерея тем Innioasis Y1 и Y2",
        "zh-CN": "Innioasis Y1 & Y2 主题库",
        "zh": "Innioasis Y1 & Y2 主题库",
        "pt-BR": "Galeria de temas Innioasis Y1 e Y2",
        "pt": "Galeria de temas Innioasis Y1 e Y2",
    },
    "opening_preview": {
        "en": "Opening the live preview…",
        "de": "Live-Vorschau wird geladen…",
        "fr": "Ouverture de l'aperçu en direct…",
        "es": "Abriendo la vista previa en vivo…",
        "it": "Apertura dell'anteprima in tempo reale…",
        "ja": "ライブプレビューを開いています…",
        "jp": "ライブプレビューを開いています…",
        "ru": "Открытие интерактивного просмотра…",
        "zh-CN": "正在打开实时预览…",
        "zh": "正在打开实时预览…",
        "pt-BR": "Abrindo a prévia ao vivo…",
        "pt": "Abrindo a prévia ao vivo…",
    },
    "copy_link": {
        "en": "Copy page link",
        "de": "Seiten-Link kopieren",
        "fr": "Copier le lien",
        "es": "Copiar enlace",
        "it": "Copia link",
        "ja": "リンクをコピー",
        "jp": "リンクをコピー",
        "ru": "Скопировать ссылку",
        "zh-CN": "复制链接",
        "zh": "复制链接",
        "pt-BR": "Copiar link",
        "pt": "Copiar link",
    },
    "open_preview": {
        "en": "Open preview",
        "de": "Vorschau öffnen",
        "fr": "Ouvrir l'aperçu",
        "es": "Abrir vista previa",
        "it": "Apri anteprima",
        "ja": "プレビューを開く",
        "jp": "プレビューを開く",
        "ru": "Открыть просмотр",
        "zh-CN": "打开预览",
        "zh": "打开预览",
        "pt-BR": "Abrir prévia",
        "pt": "Abrir prévia",
    },
}

DEFAULT_LOCALES = ["de", "fr", "es", "it", "ja", "jp", "ru", "zh-CN", "pt-BR"]


def load_json(path: str) -> dict:
    if not os.path.isfile(path):
        return {}
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def get_theme_folders() -> List[str]:
    folders = []
    for item in os.listdir(ROOT):
        full = os.path.join(ROOT, item)
        if os.path.isdir(full) and not item.startswith((".", "_")) and item not in ("node_modules", "scripts", "i18n", "dist"):
            if os.path.isfile(os.path.join(full, "config.json")):
                folders.append(item)
    return sorted(folders)


def build_hreflang_tags(folder: str, target_locales: List[str]) -> str:
    folder_url = f"{CANONICAL_HOST}/{urllib.parse.quote(folder)}/"
    lines = [
        f'  <link rel="alternate" hreflang="x-default" href="{folder_url}" />',
        f'  <link rel="alternate" hreflang="en" href="{folder_url}" />',
    ]
    seen = {"en", "x-default"}
    for loc in target_locales:
        key = loc.lower()
        # jp and kr are not language codes. Case variants of a code already
        # listed (zh-cn beside zh-CN) make Google drop the whole cluster.
        if key in {"jp", "kr"} or key in seen:
            continue
        seen.add(key)
        lines.append(f'  <link rel="alternate" hreflang="{loc}" href="{CANONICAL_HOST}/{urllib.parse.quote(folder)}/index_{loc}.html" />')
    return "\n".join(lines)


def generate_localized_shell(
    folder: str,
    locale: str,
    cfg: dict,
    translations: dict,
    target_locales: List[str]
) -> str:
    info = cfg.get("theme_info") or cfg.get("source_info") or {}
    title = str(info.get("title") or folder.replace("_", " ")).strip()
    author = str(info.get("author") or "Innioasis Community").strip()
    cover = str(cfg.get("themeCover") or "cover.jpg").strip().replace("./", "")

    # Localized description lookup
    loc_key = locale
    if loc_key == "jp":
        loc_key = "ja"
    elif loc_key == "pt-BR":
        loc_key = "pt"
    elif loc_key == "zh":
        loc_key = "zh-CN"

    loc_dict = translations.get("locales", {}).get(loc_key, {})
    folder_i18n = loc_dict.get(folder, {})
    desc = folder_i18n.get("description") or info.get("description") or f"Preview and download {title} for Innioasis Y1 and Y2."
    desc = str(desc).strip()

    site_title = SHELL_STRINGS["site_title"].get(locale, SHELL_STRINGS["site_title"]["en"])
    copy_text = SHELL_STRINGS["copy_link"].get(locale, SHELL_STRINGS["copy_link"]["en"])
    open_btn = SHELL_STRINGS["open_preview"].get(locale, SHELL_STRINGS["open_preview"]["en"])

    escaped_title = html.escape(title)
    escaped_site_title = html.escape(site_title)
    escaped_desc = html.escape(desc)
    escaped_author = html.escape(author)

    folder_encoded = urllib.parse.quote(folder)
    target_theme_page = f"{CANONICAL_HOST}/theme_{locale}.html?theme={folder_encoded}"
    cover_url = f"{CANONICAL_HOST}/{folder_encoded}/{urllib.parse.quote(cover)}"
    shell_page_url = f"{CANONICAL_HOST}/{folder_encoded}/index_{locale}.html"

    hreflang_tags = build_hreflang_tags(folder, target_locales)

    json_ld = json.dumps({
        "@context": "https://schema.org",
        "@type": "SoftwareApplication",
        "name": f"{title} for Innioasis Y1 & Y2 by {author}",
        "url": shell_page_url,
        "description": desc,
        "image": cover_url,
        "author": {"@type": "Person", "name": author},
        "operatingSystem": "Innioasis Y1 & Y2",
        "applicationCategory": "MultimediaApplication",
        "offers": {"@type": "Offer", "price": "0", "priceCurrency": "USD"}
    }, ensure_ascii=False)

    return f"""<!DOCTYPE html>
<html lang="{locale}">
<head>
<script async src="https://www.googletagmanager.com/gtm.js?id=GTM-TNDGC37L"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){{dataLayer.push(arguments);}}
  gtag('js', new Date());
</script>

  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>{escaped_title} - {escaped_site_title}</title>
  <meta name="description" content="{escaped_desc}" />
  <meta name="author" content="{escaped_author}" />
  <meta name="creator" content="Ryan Specter &amp; Innioasis Community" />
  <meta name="publisher" content="Luci Ltd" />
  <link rel="author" href="https://www.luci.ltd" title="Luci Ltd — web hosting for Innioasis Y1 &amp; Y2 Themes" />
  <meta name="robots" content="index,follow" />
  <link rel="canonical" href="{shell_page_url}" />
{hreflang_tags}

  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
  <link rel="stylesheet" href="/site-theme.css?v=20261102header" />
  <link rel="stylesheet" href="/site-toolbar.css?v=20261105dockclose" />
  <link rel="stylesheet" href="/site-pages.css?v=20260622" />
  <script src="/theme-seo-shell-analytics.js"></script>
  <script src="/author-submission-policy.js?v=20260522"></script>
  <script src="/gallery-chrome.js?v=20261102header"></script>
  <script src="/site-init.js?v=20260522privacy"></script>
  <script>
(function () {{
  var shellAuthor = {json.dumps(author)};
  if (window.ThemeAuthorPolicy) {{
    ThemeAuthorPolicy.ready().then(function () {{
      if (ThemeAuthorPolicy.listingHidden({{ author: shellAuthor }}).hidden) {{
        location.replace('https://themes.innioasis.app/index_{locale}.html');
      }}
    }});
  }}
}})();
  </script>
  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="{escaped_site_title}" />
  <meta property="og:title" content="{escaped_title} - {escaped_site_title}" />
  <meta property="og:description" content="{escaped_desc}" />
  <meta property="og:url" content="{shell_page_url}" />
  <meta property="og:image" content="{cover_url}" />

  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="{escaped_title} - {escaped_site_title}" />
  <meta name="twitter:description" content="{escaped_desc}" />
  <meta name="twitter:image" content="{cover_url}" />

  <script type="application/ld+json">{json_ld}</script>
</head>
<body class="site-themes-app site-dock-mode">
  <div id="nav-root"></div>
  <div class="gallery-topbar">
    <a class="gallery-brand" href="https://themes.innioasis.app/index_{locale}.html" title="{escaped_site_title}">
      <span class="gallery-brand-icon" aria-hidden="true"><i class="fa-solid fa-palette"></i></span>
      <span class="gallery-brand-text">{escaped_site_title}</span>
    </a>
    <div class="gallery-tabs" aria-label="Site sections">
      <a class="gallery-tab" href="https://y1-themes.vercel.app">Editor</a>
      <a class="gallery-tab" href="https://themes.innioasis.app/upload_{locale}.html">Upload</a>
    </div>
    <form class="topbar-search-wrap" action="https://themes.innioasis.app/index_{locale}.html" method="get">
      <i class="fa-solid fa-magnifying-glass topbar-search-icon" aria-hidden="true"></i>
      <input class="topbar-search" name="q" type="search" placeholder="Search" aria-label="Search themes">
    </form>
  </div>
  <main class="theme-seo-shell-main">
    <button type="button" class="btn" id="theme-seo-copy" data-copy-url="{shell_page_url}">{html.escape(copy_text)}</button>
    <h1 class="site-display">{escaped_title}</h1>
    <p class="theme-seo-shell-author">{escaped_author}</p>
    <p class="theme-seo-shell-desc">{escaped_desc}</p>
    <p class="theme-seo-shell-actions"><a class="btn btn-primary" href="{target_theme_page}">{html.escape(open_btn)}</a></p>
    <img src="/luci-alt.svg" alt="Innioasis Y1 &amp; Y2 Themes gallery hosted by Luci Ltd at luci.ltd — themes.innioasis.app" width="1" height="1" decoding="async" class="theme-seo-hosting-mark" aria-hidden="true" />
  </main>
  <div id="footer-root"></div>
  <div id="support-toolbar-slot"></div>
  <script src="/nav.js"></script>
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
<script src="../site-locale.js?v=20261108d" defer></script>
</body>
</html>
"""


def main():
    parser = argparse.ArgumentParser(description="Generate localized theme SEO shells.")
    parser.add_argument("--locales", type=str, default=",".join(DEFAULT_LOCALES), help="Comma-separated locale codes")
    parser.add_argument("--missing-only", action="store_true", help="Only generate if index_<locale>.html does not exist")
    args = parser.parse_args()

    locales = [c.strip() for c in args.locales.split(",") if c.strip()]
    i18n_path = os.path.join(ROOT, "themes_i18n.json")
    translations = load_json(i18n_path)

    folders = get_theme_folders()
    print(f"Found {len(folders)} theme folders. Generating shells for {len(locales)} locales ({', '.join(locales)})...")

    created = 0
    skipped = 0

    for folder in folders:
        folder_path = os.path.join(ROOT, folder)
        cfg_path = os.path.join(folder_path, "config.json")
        cfg = load_json(cfg_path)

        for loc in locales:
            out_file = os.path.join(folder_path, f"index_{loc}.html")
            if args.missing_only and os.path.isfile(out_file):
                skipped += 1
                continue

            content = generate_localized_shell(folder, loc, cfg, translations, locales)
            with open(out_file, "w", encoding="utf-8") as f:
                f.write(content)
            created += 1

    print(f"Completed! Generated {created} localized theme shells (skipped {skipped}).")


if __name__ == "__main__":
    main()
