#!/usr/bin/env python3
"""Bulk-remove trailing ' Theme' from themes.json and config theme_info titles."""

from __future__ import annotations

import json
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(REPO_ROOT / "scripts"))

from theme_display_name import sanitize_theme_title_input, strip_redundant_theme_word  # noqa: E402

THEMES_JSON = REPO_ROOT / "themes.json"


def _load_themes_doc() -> dict:
    return json.loads(THEMES_JSON.read_text(encoding="utf-8"))


def _write_themes_doc(doc: dict) -> None:
    THEMES_JSON.write_text(json.dumps(doc, indent=4, ensure_ascii=False) + "\n", encoding="utf-8")


def main() -> int:
    themes_changed = 0
    configs_changed = 0

    doc = _load_themes_doc()
    themes = doc.get("themes")
    if not isinstance(themes, list):
        print("themes.json has no themes array", file=sys.stderr)
        return 1

    for entry in themes:
        if not isinstance(entry, dict):
            continue
        name = str(entry.get("name") or "").strip()
        if not name:
            continue
        cleaned, changed = sanitize_theme_title_input(name)
        if changed:
            entry["name"] = cleaned
            themes_changed += 1

    if themes_changed:
        _write_themes_doc(doc)

    for cfg_path in sorted(REPO_ROOT.glob("*/config.json")):
        if cfg_path.parent.name.startswith("."):
            continue
        try:
            config = json.loads(cfg_path.read_text(encoding="utf-8"))
        except Exception:
            continue
        if not isinstance(config, dict):
            continue
        theme_info = config.get("theme_info")
        if not isinstance(theme_info, dict):
            continue
        title = str(theme_info.get("title") or "").strip()
        if not title:
            continue
        cleaned, changed = sanitize_theme_title_input(title)
        if not changed:
            continue
        theme_info["title"] = cleaned
        config["theme_info"] = theme_info
        cfg_path.write_text(json.dumps(config, indent=4, ensure_ascii=False) + "\n", encoding="utf-8")
        configs_changed += 1

    print(f"Updated {themes_changed} theme name(s) in themes.json.")
    print(f"Updated {configs_changed} config.json theme_info.title field(s).")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
