#!/usr/bin/env python3
"""Build the software gallery pages from the current index.html.

Better-Y, Koensayr and Solar pages are the gallery itself, with a title,
description and a short explainer swapped in. Rockbox is a separate page:
those themes are not this gallery. A few other pages cover the searches
owners actually type, each with its own copy.

Run this whenever index.html changes. Do not hand-copy the gallery.
"""

from __future__ import annotations

import html
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SITE = "https://themes.innioasis.app"
INDEX = ROOT / "index.html"
ROCKBOX_PACK = "https://github.com/rockbox-y1/themes/releases/tag/for_the_gays_and_the_theys"
FOLDER_START = "<!-- gallery-folder-index:start -->"
FOLDER_END = "<!-- gallery-folder-index:end -->"
EXPLAINER = "<!-- software-explainer -->"

sys.path.insert(0, str(ROOT / "scripts"))
from author_submission_policy import theme_is_publicly_listed  # noqa: E402


def esc(value: str) -> str:
    return html.escape(value, quote=True)


def load_themes() -> list[dict]:
    try:
        data = json.loads((ROOT / "themes.json").read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return []
    themes = data.get("themes") if isinstance(data, dict) else None
    return themes if isinstance(themes, list) else []


def folder_nav(themes: list[dict]) -> str:
    links = []
    for item in themes:
        if not isinstance(item, dict) or not theme_is_publicly_listed(item):
            continue
        if str(item.get("sourceType") or "internal").lower() == "external":
            continue
        folder = str(item.get("folder") or "").strip().strip("/")
        name = str(item.get("name") or folder).strip()
        if not folder or "/" in folder or ".." in folder:
            continue
        if not (ROOT / folder / "index.html").is_file():
            continue
        links.append((name.casefold(), f'<a href="{esc(folder)}/">{esc(name)}</a>'))
    links.sort()
    body = "\n        ".join(link for _, link in links)
    return (
        '<details class="gallery-folder-index">\n'
        "    <summary>Every theme page</summary>\n"
        '    <nav aria-label="Theme pages">\n'
        f"        {body}\n"
        "    </nav>\n"
        "</details>"
    )


def ensure_markers(text: str, nav: str) -> str:
    block = f"{FOLDER_START}\n{nav}\n{FOLDER_END}"
    if FOLDER_START in text and FOLDER_END in text:
        text = re.sub(
            re.escape(FOLDER_START) + r".*?" + re.escape(FOLDER_END),
            block,
            text,
            count=1,
            flags=re.S,
        )
    else:
        text = text.replace('<div id="footer-root">', block + '\n    <div id="footer-root">', 1)
    if EXPLAINER not in text:
        text = text.replace(FOLDER_START, EXPLAINER + "\n    " + FOLDER_START, 1)
    return text


def replace_tag(text: str, pattern: str, value: str) -> str:
    updated, count = re.subn(pattern, value, text, count=1, flags=re.S)
    return updated if count else text


def meta_content(text: str, name: str, value: str) -> str:
    pattern = rf'(<meta\s+name="{re.escape(name)}"\s+content=")[^"]*(")'
    return replace_tag(text, pattern, rf"\1{esc(value)}\2")


def og_content(text: str, prop: str, value: str) -> str:
    pattern = rf'(<meta\s+property="{re.escape(prop)}"\s+content=")[^"]*(")'
    return replace_tag(text, pattern, rf"\1{esc(value)}\2")


def apply_gallery_page(source: str, page: dict) -> str:
    text = source
    text = replace_tag(text, r"<title>.*?</title>", f"<title>{esc(page['title'])}</title>")
    text = meta_content(text, "description", page["description"])
    text = meta_content(text, "keywords", page["keywords"])
    text = replace_tag(
        text,
        r'<link rel="canonical" href="[^"]*">',
        f'<link rel="canonical" href="{page["url"]}">',
    )
    text = og_content(text, "og:title", page["title"])
    text = og_content(text, "og:description", page["description"])
    text = og_content(text, "og:url", page["url"])
    text = meta_content(text, "twitter:title", page["title"])
    text = meta_content(text, "twitter:description", page["description"])
    text = replace_tag(
        text,
        r'<h1 class="site-display">.*?</h1>',
        f'<h1 class="site-display">{esc(page["h1"])}</h1>',
    )
    text = replace_tag(
        text,
        r'<p class="site-lead gallery-home-lead">.*?</p>',
        f'<p class="site-lead gallery-home-lead">{esc(page["lead"])}</p>',
    )
    text = text.replace(EXPLAINER, page["explainer"], 1)
    ld = json.dumps(page["jsonld"], ensure_ascii=False)
    text = re.sub(
        r'<script type="application/ld\+json">\{"@context": "https://schema.org", "@type": "WebSite".*?</script>',
        f'<script type="application/ld+json">{ld}</script>',
        text,
        count=1,
        flags=re.S,
    )
    return text


def faq(pairs: list[tuple[str, str]]) -> str:
    blocks = []
    entities = []
    for question, answer in pairs:
        blocks.append(
            f"<details><summary>{esc(question)}</summary><p>{answer}</p></details>"
        )
        entities.append({
            "@type": "Question",
            "name": question,
            "acceptedAnswer": {"@type": "Answer", "text": re.sub(r"<[^>]+>", "", answer)},
        })
    return "\n".join(blocks), entities


def explainer(software: str, what: str, install_note: str, questions: list[tuple[str, str]]) -> tuple[str, list]:
    faq_html, entities = faq(questions)
    body = f"""<section class="software-explainer wrap" id="{esc(software.lower())}-themes-guide">
    <h2>What {esc(software)} is</h2>
    <p>{what}</p>
    <h2>{esc(software)} themes for the Innioasis Y1 and Y2</h2>
    <p>Every theme in this gallery works on {esc(software)}. The same files also work on the Original Software, Better-Y, Koensayr and Solar, on both the Innioasis Y1 and the Innioasis Y2. People look these up as {esc(software)} themes, {esc(software)} themes for the Innioasis Y1, {esc(software)} themes for the Innioasis Y2, Innioasis Y1 {esc(software)} themes and Innioasis Y2 {esc(software)} themes.</p>
    <h2>How to install a theme on {esc(software)}</h2>
    <p>{install_note}</p>
    <h2>Questions</h2>
    {faq_html}
</section>"""
    return body, entities


INSTALL = (
    'Open a theme below and download it, then copy its folder into the themes folder on the player. '
    'On a desktop browser that can choose a folder, use Direct Install via USB on the theme and pick the player\'s themes folder. '
    '<a href="install-themes.html">The install steps</a> cover the Y1 and the Y2.'
)

BETTER = explainer(
    "Better-Y",
    "Better-Y is the stock player, made better. Leska1337 built it on the official 3.1.2 software. It fixes tags, track numbers, caching and playback, and it keeps the wheel and the themes. Install it from <a href=\"https://innioasis.app/better-y-benefits.html\">Updater CE</a>.",
    INSTALL,
    [
        ("Do Better-Y themes work on the Y2?", "Yes. The themes in this gallery are the same files on the Innioasis Y1 and the Innioasis Y2."),
        ("Is there a separate Better-Y theme pack?", "This gallery is the theme collection for Better-Y, the Original Software, Koensayr and Solar."),
        ("Where do I get Better-Y?", 'In <a href="https://innioasis.app/guide.html">Updater CE</a>, choose the Y1 and Better-Y.'),
    ],
)
KOEN = explainer(
    "Koensayr",
    "Koensayr keeps the interface you know and fixes what annoys you. Music browses by artist, and Bluetooth shows track names and works with car controls. It is for the Innioasis Y1, and the themes here are the ones it uses. Install it from <a href=\"https://innioasis.app/koensayr-benefits.html\">Updater CE</a>.",
    INSTALL,
    [
        ("Do Koensayr themes work on the Y2?", "The theme files are the same Y1 and Y2 files. Koensayr itself is the Y1 system. A Y2 running the Original Software, Better-Y or Solar can use the same theme."),
        ("Do I need a Koensayr-only theme?", "No. A theme from this gallery runs on Koensayr, the Original Software, Better-Y and Solar."),
        ("Where do I get Koensayr?", 'In <a href="https://innioasis.app/guide.html">Updater CE</a>, choose the Y1 and Koensayr.'),
    ],
)
SOLAR = explainer(
    "Solar",
    "Solar switches on Wi-Fi. You can stream and download music on the player, including Deezer, Soulseek, podcasts and YouTube. It is available for the Innioasis Y1 and the Innioasis Y2, and it uses the themes in this gallery. Install it from <a href=\"https://innioasis.app/solar-benefits.html\">Updater CE</a>.",
    INSTALL,
    [
        ("Do Solar themes work on the Y1 and the Y2?", "Yes. Pick the theme here and install it on a Y1 or a Y2 that is running Solar."),
        ("Are Solar themes different files?", "They are the same gallery themes. Solar, Better-Y, Koensayr and the Original Software all read them."),
        ("Where do I get Solar?", 'In <a href="https://innioasis.app/guide.html">Updater CE</a>, choose the model and Solar.'),
    ],
)


def page_spec(filename: str, title: str, description: str, keywords: str, h1: str, lead: str, explainer_html: str, faq_entities: list) -> dict:
    url = f"{SITE}/{filename}"
    return {
        "filename": filename,
        "title": title,
        "description": description,
        "keywords": keywords,
        "h1": h1,
        "lead": lead,
        "explainer": explainer_html,
        "url": url,
        "jsonld": {
            "@context": "https://schema.org",
            "@type": "CollectionPage",
            "name": title,
            "description": description,
            "url": url,
            "isPartOf": {"@id": f"{SITE}/#website"},
            "mainEntity": {"@type": "FAQPage", "mainEntity": faq_entities},
        },
    }


GALLERY_PAGES = [
    page_spec(
        "better-y-themes.html",
        "Better-Y themes for the Innioasis Y1 and Y2",
        "Better-Y themes for the Innioasis Y1 and Better-Y themes for the Innioasis Y2. Every theme in the gallery works on Better-Y, the Original Software, Koensayr and Solar.",
        "Better-Y themes, Better-Y themes for Innioasis Y1, Better-Y themes for Innioasis Y2, Innioasis Y1 Better-Y themes, Innioasis Y2 Better-Y themes, Better-Y Y1 themes, Better-Y Y2 themes",
        "Better-Y themes for the Innioasis Y1 and Y2",
        "Better-Y themes for the Innioasis Y1 and the Innioasis Y2. Preview one, then install it on a player running Better-Y.",
        BETTER[0],
        BETTER[1],
    ),
    page_spec(
        "koensayr-themes.html",
        "Koensayr themes for the Innioasis Y1 and Y2",
        "Koensayr themes for the Innioasis Y1 and Koensayr themes for the Innioasis Y2. Every theme in the gallery works on Koensayr, the Original Software, Better-Y and Solar.",
        "Koensayr themes, Koensayr themes for Innioasis Y1, Koensayr themes for Innioasis Y2, Innioasis Y1 Koensayr themes, Innioasis Y2 Koensayr themes, Koensayr Y1 themes, Koensayr Y2 themes",
        "Koensayr themes for the Innioasis Y1 and Y2",
        "Koensayr themes for the Innioasis Y1 and the Innioasis Y2. Preview one, then install it on a player running Koensayr.",
        KOEN[0],
        KOEN[1],
    ),
    page_spec(
        "solar-themes.html",
        "Solar themes for the Innioasis Y1 and Y2",
        "Solar themes for the Innioasis Y1 and Solar themes for the Innioasis Y2. Every theme in the gallery works on Solar, the Original Software, Better-Y and Koensayr.",
        "Solar themes, Solar themes for Innioasis Y1, Solar themes for Innioasis Y2, Innioasis Y1 Solar themes, Innioasis Y2 Solar themes, Solar Y1 themes, Solar Y2 themes",
        "Solar themes for the Innioasis Y1 and Y2",
        "Solar themes for the Innioasis Y1 and the Innioasis Y2. Preview one, then install it on a player running Solar.",
        SOLAR[0],
        SOLAR[1],
    ),
]


def standalone(filename: str, title: str, description: str, keywords: str, body: str, kind: str = "WebPage") -> str:
    url = f"{SITE}/{filename}"
    ld = json.dumps({
        "@context": "https://schema.org",
        "@type": kind,
        "name": title,
        "description": description,
        "url": url,
        "isPartOf": {"@id": f"{SITE}/#website"},
    }, ensure_ascii=False)
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover" />
    <title>{esc(title)}</title>
    <meta name="description" content="{esc(description)}" />
    <meta name="keywords" content="{esc(keywords)}" />
    <link rel="canonical" href="{url}" />
    <meta property="og:type" content="website" />
    <meta property="og:title" content="{esc(title)}" />
    <meta property="og:description" content="{esc(description)}" />
    <meta property="og:url" content="{url}" />
    <meta name="twitter:card" content="summary" />
    <meta name="twitter:title" content="{esc(title)}" />
    <meta name="twitter:description" content="{esc(description)}" />
    <link rel="icon" href="y1_illustration.png" />
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
    <link rel="stylesheet" href="https://innioasis.app/styles.css" />
    <link rel="stylesheet" href="site-theme.css?v=20261110seo" />
    <link rel="stylesheet" href="lumen.css?v=20261110strip" />
    <link rel="stylesheet" href="site-toolbar.css?v=20261110accent2" />
    <link rel="stylesheet" href="site-pages.css?v=20261110seo" />
    <script src="site-init.js?v=20261110ink"></script>
    <script type="application/ld+json">{ld}</script>
</head>
<body class="site-themes-app site-dock-mode">
    <div id="nav-root"></div>
    <main class="wrap software-themes-page">
        {body}
    </main>
    <div id="footer-root"></div>
    <div id="support-toolbar-slot"></div>
    <script src="nav.js?v=20261110seo"></script>
    <script src="site-locale.js?v=20261109i18n" defer></script>
</body>
</html>
"""


def extra_pages() -> dict[str, str]:
    rockbox = standalone(
        "rockbox-themes.html",
        "Rockbox themes and Rockbox-Themes for the Innioasis Y1 and Y2",
        "Rockbox themes for the Innioasis Y1 and Y2 are a separate collection from this gallery. Open the Rockbox theme pack. This gallery hosts themes for the Original Software, Better-Y, Koensayr and Solar.",
        "Rockbox themes, Rockbox-Themes, Rockbox themes for Innioasis Y1, Rockbox themes for Innioasis Y2, Innioasis Y1 Rockbox themes, Innioasis Y2 Rockbox themes, Rockbox skins Y1, Rockbox skins Y2",
        f"""<h1 class="site-display">Rockbox themes for the Innioasis Y1 and Y2</h1>
        <p class="site-lead">Rockbox themes, including the spelling Rockbox-Themes, are a separate collection. This gallery hosts themes for the Original Software, Better-Y, Koensayr and Solar. A Rockbox theme will not install as one of those.</p>
        <h2>Rockbox themes for the Innioasis Y1</h2>
        <p>Innioasis Y1 Rockbox themes, also called Rockbox Y1 themes and Rockbox skins for the Y1, come from the Y1 Rockbox theme pack. The Rockbox button on the gallery opens that pack.</p>
        <p><a class="btn" href="{esc(ROCKBOX_PACK)}">Open the Y1 Rockbox theme pack</a></p>
        <h2>Rockbox themes for the Innioasis Y2</h2>
        <p>Innioasis Y2 Rockbox themes ship with the Y2 Rockbox install, not with the themes in this gallery. Install Rockbox from <a href="https://innioasis.app/rockbox-benefits.html">Updater CE</a>, then use the themes that release includes.</p>
        <h2>Themes for the other systems</h2>
        <p>If the player is running the Original Software, Better-Y, Koensayr or Solar, use <a href="index.html">this gallery</a>. <a href="https://themes.rockbox.org/">themes.rockbox.org</a> is the catalogue for other Rockbox players.</p>""",
    )
    skins = standalone(
        "y1-skins.html",
        "Innioasis Y1 skins and themes",
        "Y1 skins are the themes for the Innioasis Y1. They change the pictures and type on the Original Software, Better-Y, Koensayr and Solar. Rockbox skins are a separate pack.",
        "Innioasis Y1 skins, Y1 skins, Y1 themes, Innioasis Y1 themes, Y1 theme download",
        """<h1 class="site-display">Innioasis Y1 skins</h1>
        <p class="site-lead">On the Y1, a skin is a theme. It is the set of pictures and fonts that replace the ones that shipped with the player.</p>
        <h2>Which skins work</h2>
        <p>Skins from <a href="index.html">the gallery</a> work on the Original Software, Better-Y, Koensayr and Solar. Searchers also call them Y1 themes. Rockbox skins are a different format. Those are in the <a href="rockbox-themes.html">Rockbox theme pack</a>.</p>
        <h2>Install a Y1 skin</h2>
        <p>Download the theme and copy its folder into the themes folder on the Y1, or use Direct Install via USB from the theme page. <a href="install-themes.html">Install steps</a> are the same for a skin and a theme.</p>
        <p><a class="btn" href="index.html">Browse Y1 themes</a></p>""",
    )
    y2 = standalone(
        "y2-themes.html",
        "Innioasis Y2 themes",
        "Innioasis Y2 themes use the same files as the Y1 themes. They work on the Original Software, Better-Y, Koensayr and Solar. Y2 Rockbox themes are a separate pack.",
        "Innioasis Y2 themes, Y2 themes, Y2 skins, Innioasis Y2 skins, Y2 theme download",
        """<h1 class="site-display">Innioasis Y2 themes</h1>
        <p class="site-lead">The Y2 reads the same theme files as the Y1 when it is running the Original Software, Better-Y, Koensayr or Solar.</p>
        <h2>Y2 themes and Y2 skins</h2>
        <p>People search for both. A skin and a theme are the same download here. Open <a href="index.html">the gallery</a>, preview a theme, and install it on the Y2. The player is the compact model with buttons and a touchscreen.</p>
        <h2>Y2 Rockbox themes</h2>
        <p>Rockbox on the Y2 does not use these files. Those themes come with the Rockbox install. See <a href="rockbox-themes.html">Rockbox themes</a> and the <a href="https://innioasis.app/y2-firmware.html">Y2 firmware archive</a> for the system itself.</p>
        <p><a class="btn" href="install-themes.html">How to install a Y2 theme</a></p>""",
    )
    install = standalone(
        "install-themes.html",
        "How to install themes on the Innioasis Y1 and Y2",
        "Install a theme on the Innioasis Y1 or Y2. Download it from the gallery and copy it to the player, or use Direct Install via USB. Covers the Original Software, Better-Y, Koensayr and Solar.",
        "install Innioasis Y1 theme, install Y2 theme, Y1 theme download, how to install skins on Innioasis Y1",
        """<h1 class="site-display">How to install a theme on the Y1 or Y2</h1>
        <p class="site-lead">These steps are for the Original Software, Better-Y, Koensayr and Solar. Rockbox uses <a href="rockbox-themes.html">its own theme pack</a>.</p>
        <h2>On a computer</h2>
        <ol>
            <li>Open <a href="index.html">the gallery</a> and download the theme.</li>
            <li>Unzip it if the download is a zip. You want the theme folder, with its pictures and config inside.</li>
            <li>Connect the Y1 or Y2 and open its themes folder.</li>
            <li>Copy the theme folder in. Eject the player and pick the theme on the device.</li>
        </ol>
        <h2>Direct Install via USB</h2>
        <p>Chrome and Edge on a computer can hand the folder to the site. On the theme page, choose Direct Install via USB and select the player's themes folder. The link appears only when the browser supports that.</p>
        <h2>Y1 and Y2</h2>
        <p>Use the same theme folder on either player. A theme you installed on a Y1 is the one you copy to a Y2, as long as both are running one of the four systems above.</p>""",
        kind="HowTo",
    )
    others = standalone(
        "other-players.html",
        "Themes and firmware for Timmkoo and other Innioasis players",
        "Themes in this gallery are for the Innioasis Y1 and Y2. Timmkoo Q3, Q5, Q8 and the other Innioasis models use the firmware archive for system updates, not these theme files.",
        "Timmkoo themes, Timmkoo Q5 firmware, Timmkoo Q3 firmware, Innioasis G1 firmware, Innioasis A5 firmware, Innioasis Q5 update",
        """<h1 class="site-display">Timmkoo and other Innioasis players</h1>
        <p class="site-lead">The themes here are for the Innioasis Y1 and the Innioasis Y2. They do not apply to the Timmkoo players or the other Innioasis models.</p>
        <h2>What to use instead</h2>
        <p>System updates for those models are in the firmware archive, installed with Updater CE. The model printed on the player has to match the package.</p>
        <ul>
            <li><a href="https://innioasis.app/timmkoo-firmware.html">Timmkoo and other Innioasis firmware</a></li>
            <li><a href="https://innioasis.app/y1-firmware.html">Innioasis Y1 firmware</a></li>
            <li><a href="https://innioasis.app/y2-firmware.html">Innioasis Y2 firmware</a></li>
        </ul>
        <p>If you have a Y1 or Y2, the themes you want are in <a href="index.html">the gallery</a>.</p>""",
    )
    return {
        "rockbox-themes.html": rockbox,
        "y1-skins.html": skins,
        "y2-themes.html": y2,
        "install-themes.html": install,
        "other-players.html": others,
    }


def main() -> int:
    if not INDEX.is_file():
        print("index.html is missing", file=sys.stderr)
        return 1
    source = INDEX.read_text(encoding="utf-8")
    nav = folder_nav(load_themes())
    source = ensure_markers(source, nav)
    INDEX.write_text(source, encoding="utf-8")
    for page in GALLERY_PAGES:
        out = apply_gallery_page(source, page)
        (ROOT / page["filename"]).write_text(out, encoding="utf-8")
        print(f"Wrote {page['filename']}")
    for name, text in extra_pages().items():
        (ROOT / name).write_text(text, encoding="utf-8")
        print(f"Wrote {name}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
