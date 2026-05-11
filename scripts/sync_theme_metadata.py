#!/usr/bin/env python3
"""Synchronize theme folders, themes.json, and theme_info metadata.

Behavior:
- Detect theme folders (root directories containing config.json).
- Ensure every detected folder has an entry in themes.json.
- Ensure each theme config.json contains theme_info (backfilled from themes.json/folder).
"""

from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Any


REPO_ROOT = Path(__file__).resolve().parents[1]
THEMES_JSON_PATH = REPO_ROOT / "themes.json"
EXCLUDED_DIRS = {
    ".git",
    ".github",
    ".vscode",
    "__pycache__",
    "assets",
    "scripts",
}


def _extract_theme_objects_lenient(raw_text: str) -> list[dict[str, Any]]:
    """Best-effort parse for malformed themes.json files."""
    try:
        parsed = json.loads(raw_text)
        themes = parsed.get("themes", [])
        return themes if isinstance(themes, list) else []
    except Exception:
        pass

    themes_key = raw_text.find('"themes"')
    if themes_key == -1:
        return []
    array_start = raw_text.find("[", themes_key)
    if array_start == -1:
        return []

    depth = 0
    in_string = False
    escaping = False
    array_end = -1
    for idx in range(array_start, len(raw_text)):
        ch = raw_text[idx]
        if in_string:
            if escaping:
                escaping = False
            elif ch == "\\":
                escaping = True
            elif ch == '"':
                in_string = False
            continue
        if ch == '"':
            in_string = True
            continue
        if ch == "[":
            depth += 1
        elif ch == "]":
            depth -= 1
            if depth == 0:
                array_end = idx
                break
    if array_end == -1:
        return []

    payload = raw_text[array_start + 1 : array_end]
    objects: list[dict[str, Any]] = []

    depth = 0
    start = None
    in_string = False
    escaping = False
    for idx, ch in enumerate(payload):
        if in_string:
            if escaping:
                escaping = False
            elif ch == "\\":
                escaping = True
            elif ch == '"':
                in_string = False
            continue
        if ch == '"':
            in_string = True
            continue
        if ch == "{":
            if depth == 0:
                start = idx
            depth += 1
        elif ch == "}":
            depth -= 1
            if depth == 0 and start is not None:
                obj_text = payload[start : idx + 1]
                fixed = obj_text
                for _ in range(3):
                    # Insert missing commas before keys in malformed objects.
                    fixed = re.sub(r'(["\}\]0-9])\s*("[-A-Za-z0-9 _&./\u00C0-\u017F]+"\s*:)', r"\1,\2", fixed)
                try:
                    parsed_obj = json.loads(fixed)
                    if isinstance(parsed_obj, dict):
                        objects.append(parsed_obj)
                except Exception:
                    continue
    return objects


def _load_themes_json(path: Path) -> list[dict[str, Any]]:
    raw = path.read_text(encoding="utf-8")
    return _extract_theme_objects_lenient(raw)


def _is_theme_dir(path: Path) -> bool:
    if not path.is_dir():
        return False
    if path.name in EXCLUDED_DIRS or path.name.startswith("."):
        return False
    return (path / "config.json").is_file()


def _discover_theme_folders(root: Path) -> list[str]:
    folders = [p.name for p in root.iterdir() if _is_theme_dir(p)]
    return sorted(folders, key=lambda s: s.lower())


def _load_json_file(path: Path) -> dict[str, Any] | None:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return None


def _extract_folder_key(item: dict[str, Any]) -> str:
    return str(item.get("folder") or item.get("Folder") or "").strip()


def _extract_theme_info_from_config(config: dict[str, Any]) -> dict[str, str]:
    theme_info = config.get("theme_info")
    if not isinstance(theme_info, dict):
        return {}
    extracted: dict[str, str] = {}
    for key in ("title", "author", "authorUrl", "description"):
        value = str(theme_info.get(key) or "").strip()
        if value:
            extracted[key] = value
    return extracted


def _has_valid_theme_info(config: dict[str, Any]) -> bool:
    info = _extract_theme_info_from_config(config)
    return bool(info.get("title") and info.get("author") and info.get("description"))


def _default_description(name: str) -> str:
    return f"{name} theme for Innioasis Y1."


def _sync_theme_info(config: dict[str, Any], theme_entry: dict[str, Any]) -> bool:
    fallback_name = str(theme_entry.get("name") or theme_entry.get("folder") or "Theme").strip()
    existing_theme_info = config.get("theme_info")
    theme_info = dict(existing_theme_info) if isinstance(existing_theme_info, dict) else {}
    desired = {
        "title": fallback_name,
        "author": str(theme_entry.get("author") or config.get("author") or fallback_name).strip(),
        "authorUrl": str(theme_entry.get("authorUrl") or config.get("authorUrl") or "").strip(),
        "description": str(theme_entry.get("description") or config.get("description") or _default_description(fallback_name)).strip(),
    }

    changed = not isinstance(existing_theme_info, dict)
    for key, value in desired.items():
        if not theme_info.get(key):
            theme_info[key] = value
            changed = True

    ordered_theme_info = {key: theme_info.get(key, "") for key in ("title", "author", "authorUrl", "description")}
    for key, value in theme_info.items():
        if key not in ordered_theme_info:
            ordered_theme_info[key] = value

    reordered_config = {"theme_info": ordered_theme_info}
    for key, value in config.items():
        if key != "theme_info":
            reordered_config[key] = value

    if list(config.items()) != list(reordered_config.items()):
        config.clear()
        config.update(reordered_config)
        changed = True

    return changed


def _write_json(path: Path, payload: dict[str, Any]) -> None:
    path.write_text(json.dumps(payload, indent=4, ensure_ascii=False) + "\n", encoding="utf-8")


def main() -> int:
    if not THEMES_JSON_PATH.exists():
        raise SystemExit("themes.json not found.")

    themes = _load_themes_json(THEMES_JSON_PATH)
    by_folder: dict[str, dict[str, Any]] = {}
    for item in themes:
        folder = _extract_folder_key(item)
        if not folder:
            continue
        normalized = dict(item)
        normalized["folder"] = folder
        if "Folder" in normalized:
            normalized.pop("Folder", None)
        by_folder[folder] = normalized

    theme_folders = _discover_theme_folders(REPO_ROOT)
    for folder in theme_folders:
        if folder in by_folder:
            continue
        cfg_path = REPO_ROOT / folder / "config.json"
        config = _load_json_file(cfg_path)
        theme_info = _extract_theme_info_from_config(config) if isinstance(config, dict) else {}
        entry: dict[str, Any] = {
            "name": theme_info.get("title") or folder,
            "folder": folder,
        }
        if theme_info.get("author"):
            entry["author"] = theme_info["author"]
        if theme_info.get("authorUrl"):
            entry["authorUrl"] = theme_info["authorUrl"]
        if theme_info.get("description"):
            entry["description"] = theme_info["description"]
        by_folder[folder] = entry

    ordered_themes = [by_folder[folder] for folder in sorted(by_folder.keys(), key=lambda s: s.lower())]
    _write_json(THEMES_JSON_PATH, {"themes": ordered_themes})

    for item in ordered_themes:
        folder = _extract_folder_key(item)
        if not folder:
            continue
        cfg_path = REPO_ROOT / folder / "config.json"
        config = _load_json_file(cfg_path)
        if not isinstance(config, dict):
            continue
        if _sync_theme_info(config, item):
            _write_json(cfg_path, config)

    return 0


if __name__ == "__main__":
    raise SystemExit(main())

