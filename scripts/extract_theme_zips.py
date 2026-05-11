#!/usr/bin/env python3
"""Extract uploaded ZIP archives into validated theme folders.

Behavior:
- Scan repository for .zip files (outside excluded directories).
- Safely inspect archive entries (no absolute paths, no traversal).
- Detect one or more theme folders by locating config.json files.
- Extract only validated theme folders that reference image assets.
- Block archives that contain dangerous executable/script-like files.
- Remove processed ZIP files after successful extraction.
"""

from __future__ import annotations

import json
import shutil
import zipfile
from pathlib import Path, PurePosixPath
from typing import Any


REPO_ROOT = Path(__file__).resolve().parents[1]
EXCLUDED_DIRS = {".git", ".github", ".vscode", "__pycache__", "assets", "scripts"}
IMAGE_EXTENSIONS = {".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg"}
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


def _looks_like_image(value: str) -> bool:
    clean = value.strip()
    if not clean:
        return False
    suffix = Path(clean.split("?", 1)[0].split("#", 1)[0]).suffix.lower()
    return suffix in IMAGE_EXTENSIONS


def _config_has_image_refs(config: dict[str, Any]) -> bool:
    for key, value in config.items():
        if key in {"theme_info", "source_info"}:
            continue
        for item in _iter_values(value):
            if isinstance(item, str) and _looks_like_image(item):
                return True
    return False


def _is_safe_member(member: zipfile.ZipInfo) -> bool:
    name = member.filename
    if not name or name.endswith("/"):
        return False
    if "\x00" in name:
        return False
    p = PurePosixPath(name)
    if p.is_absolute():
        return False
    if any(part in {"..", ""} for part in p.parts):
        return False
    return True


def _blocked_member(path: PurePosixPath) -> bool:
    return path.suffix.lower() in BLOCKED_EXTENSIONS


def _extract_theme_sets(entries: list[PurePosixPath]) -> dict[PurePosixPath, list[PurePosixPath]]:
    """Group archive entries by detected theme root (directory containing config.json)."""
    config_paths = [p for p in entries if p.name.lower() == "config.json"]
    groups: dict[PurePosixPath, list[PurePosixPath]] = {}

    for config_path in config_paths:
        root = config_path.parent
        grouped = [entry for entry in entries if entry == root or root in entry.parents]
        groups[root] = grouped
    return groups


def _destination_folder(zip_path: Path, theme_root: PurePosixPath) -> str:
    if str(theme_root) in {".", ""}:
        return zip_path.stem
    return theme_root.name


def _extract_zip(zip_path: Path) -> tuple[int, int]:
    extracted_count = 0
    skipped_count = 0

    with zipfile.ZipFile(zip_path, "r") as zf:
        safe_members = [member for member in zf.infolist() if _is_safe_member(member)]
        if not safe_members:
            print(f"Skipping {zip_path}: no safe file entries.")
            return 0, 1

        paths = [PurePosixPath(m.filename) for m in safe_members]
        if any(_blocked_member(path) for path in paths):
            print(f"Skipping {zip_path}: contains blocked file types.")
            return 0, 1

        theme_groups = _extract_theme_sets(paths)
        if not theme_groups:
            print(f"Skipping {zip_path}: no config.json found in archive.")
            return 0, 1

        any_extracted = False
        for theme_root, members in theme_groups.items():
            config_path = theme_root / "config.json"
            try:
                config_raw = zf.read(str(config_path).replace("\\", "/")).decode("utf-8")
                config = json.loads(config_raw)
            except Exception:
                print(f"Skipping theme set {theme_root} in {zip_path}: invalid config.json.")
                skipped_count += 1
                continue

            if not isinstance(config, dict) or not _config_has_image_refs(config):
                print(f"Skipping theme set {theme_root} in {zip_path}: config lacks image references.")
                skipped_count += 1
                continue

            folder_name = _destination_folder(zip_path, theme_root)
            if not folder_name or folder_name.startswith("."):
                print(f"Skipping theme set {theme_root} in {zip_path}: invalid destination folder.")
                skipped_count += 1
                continue

            destination = REPO_ROOT / folder_name
            if destination.exists():
                print(f"Skipping theme set {theme_root} in {zip_path}: destination {folder_name}/ already exists.")
                skipped_count += 1
                continue

            destination.mkdir(parents=True, exist_ok=False)
            for member_path in members:
                relative = member_path.relative_to(theme_root) if str(theme_root) not in {".", ""} else member_path
                target = destination / Path(str(relative))
                target.parent.mkdir(parents=True, exist_ok=True)
                with zf.open(str(member_path).replace("\\", "/")) as src, target.open("wb") as dst:
                    shutil.copyfileobj(src, dst)

            extracted_count += 1
            any_extracted = True
            print(f"Extracted theme {folder_name}/ from {zip_path}.")

        if any_extracted:
            zip_path.unlink(missing_ok=True)
            print(f"Removed processed archive: {zip_path}.")
        else:
            skipped_count += 1

    return extracted_count, skipped_count


def _discover_zips() -> list[Path]:
    out: list[Path] = []
    for path in REPO_ROOT.rglob("*.zip"):
        rel = path.relative_to(REPO_ROOT)
        if any(part in EXCLUDED_DIRS or part.startswith(".") for part in rel.parts):
            continue
        out.append(path)
    return sorted(out, key=lambda p: str(p).lower())


def main() -> int:
    zips = _discover_zips()
    if not zips:
        print("No ZIP archives found.")
        return 0

    extracted_total = 0
    skipped_total = 0
    for zip_path in zips:
        extracted, skipped = _extract_zip(zip_path)
        extracted_total += extracted
        skipped_total += skipped

    print(f"ZIP processing complete: extracted={extracted_total}, skipped={skipped_total}.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

