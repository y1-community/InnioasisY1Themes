#!/usr/bin/env python3
"""
Generate themes_i18n.json for Innioasis Themes Gallery.
Pre-translates theme descriptions into major world languages using the
free multi-provider translation cascade.
Caches translations incrementally so it can be resumed or updated safely.
"""

import json
import os
import sys
import time
from concurrent.futures import ThreadPoolExecutor, as_completed

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
THEMES_REPO = os.path.abspath(os.path.join(SCRIPT_DIR, "../.."))
UPDATER_REPO = os.path.abspath(os.path.join(THEMES_REPO, "../Innioasis-Updater"))

# Import multi_provider_translate from Innioasis-Updater
sys.path.insert(0, os.path.join(UPDATER_REPO, "scripts/i18n"))
try:
    from multi_provider_translate import translate_single
except ImportError:
    sys.path.insert(0, os.path.join(THEMES_REPO, "scripts/i18n"))
    from multi_provider_translate import translate_single

TARGET_LANGS = [
    "de", "ja", "es", "fr", "it", "pt", "ru", "zh-CN", "zh-TW", "ko",
    "ar", "nl", "pl", "tr", "uk", "vi", "th", "id", "he", "hi",
    "cs", "el", "sv", "fa", "da", "fi", "hu", "no", "ro",
]

GALLERY_UI_STRINGS = [
    "views",
    "downloads",
    "downloaded",
    "Page views (gallery + theme page + preview)",
    "ZIP downloads and direct installs",
    "Change Details",
    "Edit details",
    "Report issue",
    "Report issue with this theme",
    "Request removal",
    "Share theme link",
    "Copy theme link",
    "Copied!",
    "Link copied to clipboard",
    "Download",
    "Download ZIP",
    "Direct Install",
    "Install",
    "Already on your Y1",
    "Variant",
    "Default",
    "Selected look",
    "Default look",
    "No description available.",
    "Gold",
    "Gold Badge",
    "Learn about the Gold Badge",
    "What Gold Badge means - fully compatible with the latest OS",
    "Search themes...",
    "All authors",
    "Choose folder",
    "Update all on device",
    "Filter on device",
    "Only show themes on device",
    "Thank you to our Supporters"
]

def load_cache(cache_path):
    if os.path.isfile(cache_path):
        try:
            with open(cache_path, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            pass
    return {}

def save_cache(cache_path, data):
    tmp = cache_path + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    os.replace(tmp, cache_path)

def translate_task(text, lang, cache):
    key = f"{lang}:{text}"
    if key in cache:
        return text, lang, cache[key]
    tr = translate_single(text, lang)
    if tr:
        return text, lang, tr
    # Do not cache the English source as if it were a translation; a later run
    # must retry the string instead of publishing an untranslated description.
    return text, lang, ""

def update_ui_catalogs():
    """Add gallery UI strings to all catalogs in both repositories."""
    ui_translations = {}
    print("Pre-translating gallery UI strings with concurrency...")
    ui_tasks = []
    for text in GALLERY_UI_STRINGS:
        for lang in TARGET_LANGS:
            ui_tasks.append((text, lang))

    with ThreadPoolExecutor(max_workers=12) as executor:
        future_to_task = {
            executor.submit(translate_single, text, lang): (text, lang)
            for text, lang in ui_tasks
        }
        for future in as_completed(future_to_task):
            text, lang = future_to_task[future]
            try:
                tr = future.result()
                if tr:
                    ui_translations[f"{lang}:{text}"] = tr
            except Exception:
                pass

    # Hand-tuned overrides for top terminology
    overrides = {
        "es:views": "vistas",
        "es:downloads": "descargas",
        "es:downloaded": "descargado",
        "es:Change Details": "Cambiar detalles",
        "es:Direct Install": "Instalación directa",
        "es:Already on your Y1": "Ya en tu Y1",
        "es:Thank you to our Supporters": "Gracias a nuestros donantes",

        "fr:views": "vues",
        "fr:downloads": "téléchargements",
        "fr:downloaded": "téléchargé",
        "fr:Change Details": "Modifier les détails",
        "fr:Direct Install": "Installation directe",
        "fr:Already on your Y1": "Déjà sur votre Y1",
        "fr:Thank you to our Supporters": "Merci à nos donateurs",

        "de:views": "Aufrufe",
        "de:downloads": "Downloads",
        "de:downloaded": "heruntergeladen",
        "de:Change Details": "Details ändern",
        "de:Direct Install": "Direktinstallation",
        "de:Already on your Y1": "Bereits auf Ihrem Y1",
        "de:Thank you to our Supporters": "Vielen Dank an unsere Unterstützer",

        "zh-CN:views": "次浏览",
        "zh-CN:downloads": "次下载",
        "zh-CN:downloaded": "已下载",
        "zh-CN:Change Details": "修改详情",
        "zh-CN:Direct Install": "直接安装",
        "zh-CN:Already on your Y1": "已在您的 Y1 上",
        "zh-CN:Thank you to our Supporters": "感谢我们的支持者",

        "ja:views": "回表示",
        "ja:downloads": "ダウンロード",
        "ja:downloaded": "ダウンロード済み",
        "ja:Change Details": "詳細を変更",
        "ja:Direct Install": "直接インストール",
        "ja:Already on your Y1": "Y1にインストール済み",
        "ja:Thank you to our Supporters": "サポーターの皆様に感謝",

        "pt:views": "visualizações",
        "pt:downloads": "downloads",
        "pt:downloaded": "baixado",
        "pt:Change Details": "Alterar detalhes",
        "pt:Direct Install": "Instalação direta",
        "pt:Already on your Y1": "Já no seu Y1",
        "pt:Thank you to our Supporters": "Obrigado aos nossos apoiadores",

        "it:views": "visualizzazioni",
        "it:downloads": "download",
        "it:downloaded": "scaricato",
        "it:Change Details": "Modifica dettagli",
        "it:Direct Install": "Installazione diretta",
        "it:Already on your Y1": "Già sul tuo Y1",
        "it:Thank you to our Supporters": "Grazie ai nostri sostenitori",

        "ru:views": "просмотров",
        "ru:downloads": "загрузок",
        "ru:downloaded": "загружено",
        "ru:Change Details": "Изменить сведения",
        "ru:Direct Install": "Прямая установка",
        "ru:Already on your Y1": "Уже на вашем Y1",
        "ru:Thank you to our Supporters": "Спасибо нашим спонсорам"
    }
    ui_translations.update(overrides)

    for repo_path in [THEMES_REPO, UPDATER_REPO]:
        catalogs_dir = os.path.join(repo_path, "i18n/catalogs")
        if not os.path.isdir(catalogs_dir):
            continue
        for lang in TARGET_LANGS:
            cat_file = os.path.join(catalogs_dir, f"{lang}.json")
            if not os.path.isfile(cat_file):
                continue
            try:
                with open(cat_file, "r", encoding="utf-8") as f:
                    cat = json.load(f)
                strings = cat.setdefault("strings", {})
                for text in GALLERY_UI_STRINGS:
                    k = f"{lang}:{text}"
                    if k in ui_translations:
                        strings[text] = ui_translations[k]
                cat["count"] = len(strings)
                with open(cat_file, "w", encoding="utf-8") as f:
                    json.dump(cat, f, ensure_ascii=False, indent=2)
            except Exception as e:
                print(f"Error updating {cat_file}: {e}")
    print("Catalogs updated with gallery UI strings.")

def main():
    themes_file = os.path.join(THEMES_REPO, "themes.json")
    if not os.path.isfile(themes_file):
        print("themes.json not found:", themes_file)
        sys.exit(1)

    with open(themes_file, "r", encoding="utf-8") as f:
        themes_data = json.load(f)

    themes = themes_data.get("themes", [])
    print(f"Loaded {len(themes)} themes from themes.json")

    cache_file = os.path.join(THEMES_REPO, "scripts/i18n/.themes_desc_cache.json")
    cache = load_cache(cache_file)
    print(f"Loaded {len(cache)} existing cached translations")

    # Gallery UI strings are owned by extract/translate + i18n/reviewed. Do not
    # overwrite reviewed copy with a second machine pass here.

    # Collect unique descriptions
    unique_desc = set()
    for t in themes:
        d = t.get("description", "").strip()
        if d:
            unique_desc.add(d)

    print(f"Found {len(unique_desc)} unique descriptions to translate into {len(TARGET_LANGS)} languages")

    tasks = []
    for d in unique_desc:
        for lang in TARGET_LANGS:
            k = f"{lang}:{d}"
            if k not in cache:
                tasks.append((d, lang))

    print(f"{len(tasks)} translation requests needed ({len(cache)} cached).")

    if tasks:
        done_count = 0
        total_tasks = len(tasks)
        with ThreadPoolExecutor(max_workers=8) as executor:
            future_to_task = {
                executor.submit(translate_task, d, lang, cache): (d, lang)
                for d, lang in tasks
            }
            for future in as_completed(future_to_task):
                try:
                    text, lang, trans = future.result()
                    if trans:
                        cache[f"{lang}:{text}"] = trans
                except Exception as e:
                    pass
                done_count += 1
                if done_count % 50 == 0 or done_count == total_tasks:
                    print(f"Progress: {done_count}/{total_tasks} ({done_count * 100 // total_tasks}%)")
                    save_cache(cache_file, cache)

        save_cache(cache_file, cache)

    # Build output themes_i18n.json
    output = {
        "version": 1,
        "updated": int(time.time()),
        "locales": {}
    }

    for lang in TARGET_LANGS:
        output["locales"][lang] = {}

    for t in themes:
        folder = t.get("folder", "").strip()
        if not folder:
            continue
        d = t.get("description", "").strip()
        name = t.get("name", "").strip()

        for lang in TARGET_LANGS:
            trans_entry = {}
            if d:
                k = f"{lang}:{d}"
                if k in cache and cache[k]:
                    trans_entry["description"] = cache[k]
            # If entry has translations, record it
            if trans_entry:
                output["locales"][lang][folder] = trans_entry

    out_file = os.path.join(THEMES_REPO, "themes_i18n.json")
    with open(out_file, "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, indent=2)

    print(f"Successfully generated {out_file} with {sum(len(v) for v in output['locales'].values())} theme translations across {len(TARGET_LANGS)} languages.")

if __name__ == "__main__":
    main()
