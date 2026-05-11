#!/usr/bin/env python3
"""Extract valid theme folders from submitted zip files.

Scans the repository for .zip files, validates archive safety, then extracts
each theme folder (identified by folder-local config.json) into the repo root.
Dangerous file types are blocked and existing destination folders are not
overwritten. Successfully processed zip files are removed.
"""

from __future__ import annotations

import io
import json
from pathlib import Path, PurePosixPath
from typing import Any
import zipfile


REPO_ROOT = Path(__file__).resolve().parents[1]
IMAGE_EXTENSIONS = {".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg"}
ZIP_EXTENSION = ".zip"
EXCLUDED_SCAN_DIRS = {".git", ".github", "scripts", "assets"}
BLOCKED_EXTENSIONS = {
    ".html",
    ".htm",
    ".exe",
    ".msi",
    ".dll",
    ".com",
    ".scr",
    ".bat",
    ".cmd",
    ".ps1",
    ".sh",
    ".bash",
    ".zsh",
    ".ksh",
    ".jar",
    ".js",
    ".ts",
    ".mjs",
    ".cjs",
    ".vbs",
    ".wsf",
    ".reg",
    ".py",
    ".php",
    ".pl",
    ".rb",
}


def _iter_values(value: Any) -> list[Any]:
    if isinstance(value, dict):
        out: list[Any] = []
        for nested in value.values():
            out.extend(_iter_values(nested))
        return out
    if isinstance(value, list):
        out: list[Any] = []
        for nested in value:
            out.extend(_iter_values(nested))
        return out
    return [value]


def _looks_like_image(path_or_value: str) -> bool:
    suffix = Path(path_or_value.split("?", 1)[0].split("#", 1)[0]).suffix.lower()
    return suffix in IMAGE_EXTENSIONS


def _is_blocked_file(path_value: str) -> bool:
    return Path(path_value).suffix.lower() in BLOCKED_EXTENSIONS


def _config_has_image_refs(config: dict[str, Any]) -> bool:
    for key, value in config.items():
        if key in {"theme_info", "source_info"}:
            continue
        for item in _iter_values(value):
            if isinstance(item, str) and _looks_like_image(item.strip()):
                return True
    return False


def _is_safe_member(name: str) -> bool:
    path = PurePosixPath(name)
    if path.is_absolute():
        return False
    for part in path.parts:
        if part in {"", ".", ".."}:
            return False
    return True


def _discover_theme_keys(member_names: list[str]) -> list[str]:
    keys: list[str] = []
    for name in member_names:
        path = PurePosixPath(name)
        if path.name != "config.json":
            continue
        parent = str(path.parent).strip(".")
        if parent:
            keys.append(parent)
    return keys


def _theme_has_image_file(member_names: list[str], theme_key: str) -> bool:
    prefix = f"{theme_key}/"
    for name in member_names:
        if name.startswith(prefix) and _looks_like_image(name[len(prefix) :]):
            return True
    return False


def _find_zip_paths() -> list[Path]:
    out: list[Path] = []
    for path in REPO_ROOT.rglob(f"*{ZIP_EXTENSION}"):
        rel_parts = path.relative_to(REPO_ROOT).parts
        if not rel_parts:
            continue
        if any(part in EXCLUDED_SCAN_DIRS for part in rel_parts):
            continue
        out.append(path)
    return sorted(out, key=lambda p: str(p).lower())


def _read_config(archive: zipfile.ZipFile, entry: str) -> dict[str, Any]:
    raw = archive.read(entry).decode("utf-8")
    parsed = json.loads(raw)
    if not isinstance(parsed, dict):
        raise ValueError(f"{entry} must be a JSON object")
    return parsed


def _extract_theme(archive: zipfile.ZipFile, member_names: list[str], theme_key: str) -> tuple[bool, str]:
    dest_name = PurePosixPath(theme_key).name
    dest = REPO_ROOT / dest_name
    if dest_name in EXCLUDED_SCAN_DIRS or dest_name.startswith("."):
        return False, f"Skip {theme_key}: destination folder name {dest_name!r} is not allowed."
    if dest.exists():
        return False, f"Skip {theme_key}: destination folder {dest_name}/ already exists."

    prefix = f"{theme_key}/"
    selected = [name for name in member_names if name.startswith(prefix)]
    if not selected:
        return False, f"Skip {theme_key}: no files found under theme folder."

    dest.mkdir(parents=True, exist_ok=False)
    for name in selected:
        rel = PurePosixPath(name[len(prefix) :])
        if not rel.parts:
            continue
        out_path = dest.joinpath(*rel.parts)
        out_path.parent.mkdir(parents=True, exist_ok=True)
        with archive.open(name, "r") as src, out_path.open("wb") as dst:
            dst.write(src.read())
    return True, f"Extracted {theme_key} -> {dest_name}/"


def _process_zip(path: Path) -> tuple[bool, list[str]]:
    logs: list[str] = [f"Processing {path.relative_to(REPO_ROOT)}"]
    try:
        blob = path.read_bytes()
    except Exception as exc:
        return False, logs + [f"ERROR: Could not read zip: {exc}"]

    try:
        archive = zipfile.ZipFile(io.BytesIO(blob))
    except zipfile.BadZipFile:
        return False, logs + ["ERROR: Invalid zip archive."]

    with archive:
        names = [n for n in archive.namelist() if n and not n.endswith("/")]
        if not names:
            return False, logs + ["ERROR: Zip contains no files."]

        for name in names:
            if not _is_safe_member(name):
                return False, logs + [f"ERROR: Unsafe zip entry path: {name}"]
            if _is_blocked_file(name):
                return False, logs + [f"ERROR: Blocked file type in zip: {name}"]

        keys = _discover_theme_keys(names)
        if not keys:
            return False, logs + ["ERROR: Zip must contain at least one theme folder with config.json."]

        base_names = [PurePosixPath(k).name for k in keys]
        if len(set(base_names)) != len(base_names):
            return False, logs + ["ERROR: Zip contains duplicate theme folder names."]

        extracted_any = False
        for key in keys:
            config_entry = f"{key}/config.json"
            try:
                cfg = _read_config(archive, config_entry)
            except Exception as exc:
                return False, logs + [f"ERROR: {config_entry} invalid: {exc}"]

            if not _theme_has_image_file(names, key):
                return False, logs + [f"ERROR: {key}/ must include at least one image file."]
            if not _config_has_image_refs(cfg):
                return False, logs + [f"ERROR: {config_entry} must reference at least one image asset."]

            ok, msg = _extract_theme(archive, names, key)
            logs.append(msg)
            if ok:
                extracted_any = True

        if extracted_any:
            path.unlink()
            logs.append("Removed processed zip.")
        else:
            logs.append("No new themes extracted; zip retained.")
        return True, logs


def main() -> int:
    zip_paths = _find_zip_paths()
    if not zip_paths:
        print("No zip files found.")
        return 0

    all_ok = True
    for path in zip_paths:
        ok, logs = _process_zip(path)
        for line in logs:
            print(line)
        if not ok:
            all_ok = False

    return 0 if all_ok else 1


if __name__ == "__main__":
    raise SystemExit(main())

