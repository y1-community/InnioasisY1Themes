#!/usr/bin/env python3
"""Additive legacy OS backfill: missing eBook/Calendar/Calculator/File Manager/Launcher keys.

Missing keys (and transparent.png placeholders) resolve to backfill.png when that file exists
in the content folder, otherwise transparent.png. Copies repo-root transparent.png into each
theme root and Variants/<look>/ folder that has config.json when the transparent fallback is
needed, replacing any existing transparent.png so bad assets from earlier backfills cannot linger.
Never overwrites a creator-supplied backfill.png.
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
BACKFILL_FILENAME = "backfill.png"
TRANSPARENT_CANONICAL = REPO_ROOT / TRANSPARENT_FILENAME
TRANSPARENT_VALUE = TRANSPARENT_FILENAME
BACKFILL_VALUE = BACKFILL_FILENAME
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


def resolve_placeholder_value(content_dir: Path) -> str:
    """Prefer theme-local backfill.png when present; else transparent.png."""
    if (content_dir / BACKFILL_FILENAME).is_file():
        return BACKFILL_VALUE
    return TRANSPARENT_VALUE


def _is_transparent_placeholder_value(value: Any) -> bool:
    if not isinstance(value, str):
        return False
    name = value.strip().replace("\\", "/").split("/")[-1]
    return name.lower() == TRANSPARENT_FILENAME.lower()


def add_legacy_os_keys(
    theme_config: dict[str, Any],
    reference: dict[str, Any],
    *,
    placeholder_value: str = TRANSPARENT_VALUE,
) -> bool:
    """Add missing legacy OS keys; upgrade transparent.png placeholders when preferring backfill."""
    changed = False
    upgrade_transparent = placeholder_value == BACKFILL_VALUE
    for section, keys_obj in reference.items():
        if not isinstance(keys_obj, dict):
            continue
        if section not in theme_config:
            new_section: dict[str, Any] = {}
            for key in keys_obj:
                new_section[key] = placeholder_value
            theme_config[section] = new_section
            changed = True
            continue
        section_obj = theme_config[section]
        if not isinstance(section_obj, dict):
            continue
        for key in keys_obj:
            if key not in section_obj:
                section_obj[key] = placeholder_value
                changed = True
            elif upgrade_transparent and _is_transparent_placeholder_value(section_obj[key]):
                section_obj[key] = placeholder_value
                changed = True
    return changed


def ensure_canonical_transparent_source() -> Path:
    if not TRANSPARENT_CANONICAL.is_file():
        raise SystemExit(
            f"ERROR: Missing canonical {TRANSPARENT_FILENAME} at repo root: {TRANSPARENT_CANONICAL}"
        )
    return TRANSPARENT_CANONICAL


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


def iter_content_dirs(theme_dir: Path) -> list[Path]:
    """Theme root and each Variants/<look>/ dir that has config.json."""
    seen: set[str] = set()
    out: list[Path] = []
    for cfg_path in iter_config_paths(theme_dir):
        parent = cfg_path.parent
        key = str(parent.resolve())
        if key in seen:
            continue
        seen.add(key)
        out.append(parent)
    return out


def sync_transparent_png(content_dir: Path, source: Path) -> bool:
    """Copy repo-root canonical transparent.png, replacing any existing file."""
    dest = content_dir / TRANSPARENT_FILENAME
    content_dir.mkdir(parents=True, exist_ok=True)
    source_bytes = source.read_bytes()
    if dest.is_file() and dest.read_bytes() == source_bytes:
        return False
    shutil.copy2(source, dest)
    return True


def content_dir_needs_transparent_asset(content_dir: Path, config: dict[str, Any] | None) -> bool:
    """True when configs still reference transparent.png or backfill.png is absent."""
    if not (content_dir / BACKFILL_FILENAME).is_file():
        return True
    if not config:
        return False
    ref = _load_reference_config() or {}
    for section, keys_obj in ref.items():
        if not isinstance(keys_obj, dict):
            continue
        section_obj = config.get(section)
        if not isinstance(section_obj, dict):
            continue
        for key in keys_obj:
            if _is_transparent_placeholder_value(section_obj.get(key)):
                return True
    return False


def sync_transparent_in_theme_folder(theme_dir: Path, source: Path) -> int:
    """Place canonical transparent.png where the transparent fallback is still needed."""
    updated = 0
    for content_dir in iter_content_dirs(theme_dir):
        cfg = _load_json(content_dir / "config.json")
        if not content_dir_needs_transparent_asset(content_dir, cfg):
            continue
        if sync_transparent_png(content_dir, source):
            updated += 1
    return updated


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
    content_dir = cfg_path.parent
    placeholder = resolve_placeholder_value(content_dir)
    before = json.dumps(config, sort_keys=True)
    add_legacy_os_keys(config, reference, placeholder_value=placeholder)
    after = json.dumps(config, sort_keys=True)
    cfg_changed = before != after
    if cfg_changed:
        _write_json_preserve_indent(cfg_path, config, original_text)
    transparent_synced = False
    if content_dir_needs_transparent_asset(content_dir, config):
        transparent_synced = sync_transparent_png(content_dir, transparent_source)
    return cfg_changed, transparent_synced


def fill_theme_folder(theme_dir: Path, reference: dict[str, Any] | None = None) -> bool:
    ref = reference if reference is not None else _load_reference_config()
    if not ref:
        return False
    source = ensure_canonical_transparent_source()
    any_change = False
    for cfg_path in iter_config_paths(theme_dir):
        cfg_changed, transparent_synced = backfill_config_file(
            cfg_path, ref, transparent_source=source
        )
        if cfg_changed or transparent_synced:
            any_change = True
    synced = sync_transparent_in_theme_folder(theme_dir, source)
    if synced:
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
        if (child / "config.json").is_file() or (child / "Variants").is_dir():
            out.append(child)
    return out


def _folder_would_change(theme_dir: Path, ref: dict[str, Any], source: Path) -> bool:
    for cfg_path in iter_config_paths(theme_dir):
        config = _load_json(cfg_path)
        if not config:
            continue
        clone = json.loads(json.dumps(config))
        placeholder = resolve_placeholder_value(cfg_path.parent)
        if add_legacy_os_keys(clone, ref, placeholder_value=placeholder):
            return True
        if content_dir_needs_transparent_asset(cfg_path.parent, clone):
            dest = cfg_path.parent / TRANSPARENT_FILENAME
            if not dest.is_file() or dest.read_bytes() != source.read_bytes():
                return True
    for content_dir in iter_content_dirs(theme_dir):
        cfg = _load_json(content_dir / "config.json")
        if not content_dir_needs_transparent_asset(content_dir, cfg):
            continue
        dest = content_dir / TRANSPARENT_FILENAME
        if not dest.is_file() or dest.read_bytes() != source.read_bytes():
            return True
    return False


def check_all_theme_folders() -> list[str]:
    ref = _load_reference_config()
    if not ref:
        raise SystemExit(f"ERROR: Reference config missing: {REFERENCE_CONFIG_PATH}")
    source = ensure_canonical_transparent_source()
    would_change: list[str] = []
    for theme_dir in discover_catalog_theme_dirs():
        if _folder_would_change(theme_dir, ref, source):
            would_change.append(str(theme_dir.name))
    return sorted(set(would_change), key=str.lower)


def fill_all_theme_folders(root: Path | None = None) -> tuple[int, int, int]:
    ref = _load_reference_config()
    if not ref:
        raise SystemExit(f"ERROR: Reference config missing: {REFERENCE_CONFIG_PATH}")
    source = ensure_canonical_transparent_source()
    folders_touched = 0
    configs_updated = 0
    transparencies_synced = 0
    for theme_dir in discover_catalog_theme_dirs(root):
        folder_changed = False
        for cfg_path in iter_config_paths(theme_dir):
            cfg_changed, transparent_synced = backfill_config_file(
                cfg_path, ref, transparent_source=source
            )
            if cfg_changed:
                configs_updated += 1
                folder_changed = True
            if transparent_synced:
                transparencies_synced += 1
                folder_changed = True
        synced = sync_transparent_in_theme_folder(theme_dir, source)
        if synced:
            transparencies_synced += synced
            folder_changed = True
        if folder_changed:
            folders_touched += 1
    return folders_touched, configs_updated, transparencies_synced


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
            print("OK: No theme folders need legacy OS config or transparent.png sync.")
            return 0
        print("Theme folders that would receive backfill or transparent sync:")
        for name in pending:
            print(f"  - {name}")
        return 0

    folders, configs, trans_synced = fill_all_theme_folders()
    print(
        f"OK: Legacy OS backfill in {folders} theme folder(s) "
        f"({configs} config.json updated, {trans_synced} transparent.png synced from repo root)."
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
