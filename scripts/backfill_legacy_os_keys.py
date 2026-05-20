#!/usr/bin/env python3
"""Additive legacy OS backfill: missing eBook/Calendar/Calculator/Launcher keys → transparent.png.

Only adds absent keys in homePageConfig and settingConfig. Copies repo-root transparent.png
only into folders where keys were added and transparent.png is missing. Never overwrites files.
"""

from __future__ import annotations

import argparse
import json
import re
import shutil
import sys
from pathlib import Path
from typing import Any

_GIT_ROOT = Path(__file__).resolve().parents[1]
REPO_ROOT = _GIT_ROOT
REFERENCE_CONFIG_PATH = Path(__file__).resolve().parent / "legacy_os_config_reference.json"
TRANSPARENT_FILENAME = "transparent.png"
TRANSPARENT_CANONICAL = REPO_ROOT / TRANSPARENT_FILENAME
TRANSPARENT_VALUE = TRANSPARENT_FILENAME
EXCLUDED_DIRS = {
    ".git",
    ".github",
    ".vscode",
    "__pycache__",
    "assets",
    "scripts",
    "functions",
}


def _load_json(path: Path) -> dict[str, Any] | None:
    if not path.is_file():
        return None
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return None
    return data if isinstance(data, dict) else None


def _detect_json_indent_chars(original_text: str) -> str:
    for line in original_text.splitlines():
        match = re.match(r"^(\s+)\S", line)
        if match:
            return match.group(1)
    return "    "


def _write_json_preserve_indent(path: Path, payload: dict[str, Any], original_text: str) -> None:
    indent_chars = _detect_json_indent_chars(original_text)
    if indent_chars == "\t":
        serialized = json.dumps(payload, indent="\t", ensure_ascii=False)
    else:
        space_count = len(indent_chars.expandtabs(4))
        serialized = json.dumps(payload, indent=space_count, ensure_ascii=False)
    path.write_text(serialized + "\n", encoding="utf-8")


def add_legacy_os_keys(
    theme_config: dict[str, Any], reference: dict[str, Any]
) -> bool:
    """Add only missing legacy OS keys. Never modify existing keys or values."""
    changed = False
    for section, keys_obj in reference.items():
        if not isinstance(keys_obj, dict):
            continue
        if section not in theme_config:
            new_section: dict[str, Any] = {}
            for key in keys_obj:
                new_section[key] = TRANSPARENT_VALUE
            theme_config[section] = new_section
            changed = True
            continue
        section_obj = theme_config[section]
        if not isinstance(section_obj, dict):
            continue
        for key in keys_obj:
            if key not in section_obj:
                section_obj[key] = TRANSPARENT_VALUE
                changed = True
    return changed


def ensure_canonical_transparent_source() -> Path:
    if not TRANSPARENT_CANONICAL.is_file():
        raise SystemExit(
            f"ERROR: Missing canonical {TRANSPARENT_FILENAME} at repo root: {TRANSPARENT_CANONICAL}"
        )
    return TRANSPARENT_CANONICAL


def ensure_transparent_png(theme_dir: Path, source: Path) -> bool:
    """Copy canonical transparent.png only when the file does not exist."""
    dest = theme_dir / TRANSPARENT_FILENAME
    if dest.is_file():
        return False
    theme_dir.mkdir(parents=True, exist_ok=True)
    shutil.copy2(source, dest)
    return True


def iter_config_paths(theme_dir: Path) -> list[Path]:
    paths: list[Path] = []
    root_cfg = theme_dir / "config.json"
    if root_cfg.is_file():
        paths.append(root_cfg)
    variants_root = theme_dir / "Variants"
    if variants_root.is_dir():
        for child in sorted(variants_root.iterdir(), key=lambda p: str(p.name).casefold()):
            if not child.is_dir() or child.name.startswith("."):
                continue
            cfg = child / "config.json"
            if cfg.is_file():
                paths.append(cfg)
    return paths


def backfill_config_file(
    cfg_path: Path,
    reference: dict[str, Any],
    *,
    transparent_source: Path,
) -> tuple[bool, bool]:
    original_text = cfg_path.read_text(encoding="utf-8")
    try:
        config = json.loads(original_text)
    except json.JSONDecodeError as exc:
        print(f"WARNING: Skipping invalid JSON {cfg_path}: {exc}", file=sys.stderr)
        return False, False
    if not isinstance(config, dict):
        return False, False
    before = json.dumps(config, sort_keys=True)
    if not add_legacy_os_keys(config, reference):
        return False, False
    after = json.dumps(config, sort_keys=True)
    if before == after:
        return False, False
    _write_json_preserve_indent(cfg_path, config, original_text)
    transparent_copied = ensure_transparent_png(cfg_path.parent, transparent_source)
    return True, transparent_copied


def fill_theme_folder(theme_dir: Path, reference: dict[str, Any] | None = None) -> bool:
    ref = reference if reference is not None else _load_reference_config()
    if not ref:
        return False
    source = ensure_canonical_transparent_source()
    any_change = False
    for cfg_path in iter_config_paths(theme_dir):
        cfg_changed, transparent_copied = backfill_config_file(
            cfg_path, ref, transparent_source=source
        )
        if cfg_changed or transparent_copied:
            any_change = True
    return any_change


def _load_reference_config() -> dict[str, Any] | None:
    return _load_json(REFERENCE_CONFIG_PATH)


def discover_catalog_theme_dirs(root: Path | None = None) -> list[Path]:
    base = root or REPO_ROOT
    out: list[Path] = []
    for child in sorted(base.iterdir(), key=lambda p: str(p.name).casefold()):
        if not child.is_dir() or child.name in EXCLUDED_DIRS or child.name.startswith("."):
            continue
        if (child / "config.json").is_file():
            out.append(child)
    return out


def _folder_would_change(theme_dir: Path, ref: dict[str, Any]) -> bool:
    for cfg_path in iter_config_paths(theme_dir):
        config = _load_json(cfg_path)
        if not config:
            continue
        clone = json.loads(json.dumps(config))
        if add_legacy_os_keys(clone, ref):
            return True
    return False


def check_all_theme_folders() -> list[str]:
    ref = _load_reference_config()
    if not ref:
        raise SystemExit(f"ERROR: Reference config missing: {REFERENCE_CONFIG_PATH}")
    would_change: list[str] = []
    for theme_dir in discover_catalog_theme_dirs():
        if _folder_would_change(theme_dir, ref):
            would_change.append(str(theme_dir.name))
    return sorted(set(would_change), key=str.lower)


def fill_all_theme_folders(root: Path | None = None) -> tuple[int, int, int]:
    ref = _load_reference_config()
    if not ref:
        raise SystemExit(f"ERROR: Reference config missing: {REFERENCE_CONFIG_PATH}")
    source = ensure_canonical_transparent_source()
    folders_touched = 0
    configs_updated = 0
    transparencies_added = 0
    for theme_dir in discover_catalog_theme_dirs(root):
        folder_changed = False
        for cfg_path in iter_config_paths(theme_dir):
            cfg_changed, transparent_copied = backfill_config_file(
                cfg_path, ref, transparent_source=source
            )
            if cfg_changed:
                configs_updated += 1
                folder_changed = True
            if transparent_copied:
                transparencies_added += 1
                folder_changed = True
        if folder_changed:
            folders_touched += 1
    return folders_touched, configs_updated, transparencies_added


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--check",
        action="store_true",
        help="List theme folders that would change; do not write files.",
    )
    args = parser.parse_args(argv)

    if args.check:
        pending = check_all_theme_folders()
        if not pending:
            print("OK: No theme folders need legacy OS config backfill.")
            return 0
        print("Theme folders that would receive backfill:")
        for name in pending:
            print(f"  - {name}")
        return 0

    folders, configs, trans_added = fill_all_theme_folders()
    print(
        f"OK: Legacy OS backfill in {folders} theme folder(s) "
        f"({configs} config.json updated, {trans_added} transparent.png copied where missing)."
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
