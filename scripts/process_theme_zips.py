#!/usr/bin/env python3
"""Extract valid theme folders from submitted zip files.

Scans the repository for .zip files, validates archive safety, then extracts
each theme folder (identified by folder-local config.json) into the repository
root (this script's REPO_ROOT). Root-level ``config.json`` themes may keep
images in subfolders that are not another theme's directory (same rule as
``validate_theme_pr.py``).
Dangerous file types are blocked. If an incoming zip identity matches an
existing catalog/config identity (author + title), extraction overwrites that
existing theme folder in place; otherwise new destination folders must still be
unique. Successfully processed zip files are removed.
"""

from __future__ import annotations

import io
import json
import os
import re
import shutil
from pathlib import Path, PurePosixPath
from typing import Any
import zipfile

import zip_theme_utils as ztu


_GIT_ROOT = Path(__file__).resolve().parents[1]
REPO_ROOT = _GIT_ROOT
ZIP_EXTENSION = ".zip"
EXCLUDED_SCAN_DIRS = {".git", ".github", "scripts", "assets", "functions", ".vscode", "themes"}
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


def _normalize_space(value: str) -> str:
    return " ".join(str(value or "").strip().split())


def _normalize_author(value: str) -> str:
    text = _normalize_space(value).lower()
    if text.startswith("u/"):
        text = text[2:].strip()
    return text


def _normalize_title(value: str) -> str:
    return _normalize_space(value).lower()


def _title_identity_candidates(value: str) -> set[str]:
    base = _normalize_title(value)
    if not base:
        return set()
    out = {base}
    if re.search(r"\s+theme$", base) and not base.startswith("theme "):
        out.add(re.sub(r"\s+theme$", "", base).strip())
    return {item for item in out if item}


def _read_json(path: Path) -> dict[str, Any] | None:
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return None
    return data if isinstance(data, dict) else None


def _extract_theme_identity_from_config(config: dict[str, Any] | None) -> tuple[str, set[str]]:
    if not isinstance(config, dict):
        return "", set()
    author = ""
    title = ""
    for key in ("theme_info", "source_info"):
        block = config.get(key)
        if not isinstance(block, dict):
            continue
        if not title:
            t = str(block.get("title") or "").strip()
            if t:
                title = t
        if not author:
            a = str(block.get("author") or "").strip()
            if a:
                author = a
    return _normalize_author(author), _title_identity_candidates(title)


def _read_folder_config_identity(folder_name: str) -> tuple[str, set[str]]:
    cfg = _read_json(REPO_ROOT / folder_name / "config.json")
    return _extract_theme_identity_from_config(cfg)


def _catalog_identity_rows() -> list[dict[str, Any]]:
    themes = _read_json(REPO_ROOT / "themes.json")
    rows: list[dict[str, Any]] = []
    if not isinstance(themes, dict):
        return rows
    items = themes.get("themes")
    if not isinstance(items, list):
        return rows
    for item in items:
        if not isinstance(item, dict):
            continue
        folder = str(item.get("folder") or "").strip()
        if not folder:
            continue
        listed_author = _normalize_author(str(item.get("author") or ""))
        listed_title_candidates = _title_identity_candidates(str(item.get("name") or ""))
        cfg_author, cfg_title_candidates = _read_folder_config_identity(folder)
        author = listed_author or cfg_author
        title_candidates = listed_title_candidates | cfg_title_candidates
        rows.append(
            {
                "folder": folder,
                "author": author,
                "title_candidates": title_candidates,
            }
        )
    return rows


def _resolve_destination_folder(
    *,
    suggested_folder: str,
    incoming_config: dict[str, Any] | None,
    catalog_rows: list[dict[str, Any]],
) -> tuple[str, bool, str]:
    incoming_author, incoming_titles = _extract_theme_identity_from_config(incoming_config)
    suggested = str(suggested_folder or "").strip()
    if not suggested:
        return suggested, False, "No suggested destination folder."

    if (REPO_ROOT / suggested).is_dir():
        existing_author, existing_titles = _read_folder_config_identity(suggested)
        if incoming_author and incoming_titles and existing_author and existing_titles:
            if incoming_author == existing_author and incoming_titles & existing_titles:
                return (
                    suggested,
                    True,
                    f"Overwriting existing folder {suggested}/ (identity matched by config author/title).",
                )

    if incoming_author and incoming_titles:
        matches = [
            row["folder"]
            for row in catalog_rows
            if row.get("author")
            and row.get("title_candidates")
            and incoming_author == row["author"]
            and bool(incoming_titles & set(row["title_candidates"]))
        ]
        if len(matches) == 1:
            target = str(matches[0]).strip()
            if target:
                return (
                    target,
                    (REPO_ROOT / target).is_dir(),
                    (
                        f"Resolved incoming theme identity to catalog folder {target}/ "
                        "(author + title match); applying as update."
                    ),
                )

    return suggested, (REPO_ROOT / suggested).is_dir(), ""


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
    return ztu.looks_like_image(path_or_value)


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


def _find_zip_paths() -> list[Path]:
    """Only repository-root zips (gallery upload artifacts), not nested archives."""
    out: list[Path] = []
    for path in sorted(REPO_ROOT.glob(f"*{ZIP_EXTENSION}"), key=lambda p: str(p).lower()):
        if not path.is_file():
            continue
        if path.parent != REPO_ROOT:
            continue
        out.append(path)
    return out


def _read_config(archive: zipfile.ZipFile, entry: str) -> dict[str, Any]:
    raw = archive.read(entry).decode("utf-8")
    parsed = json.loads(raw)
    if not isinstance(parsed, dict):
        raise ValueError(f"{entry} must be a JSON object")
    return parsed


def _extract_theme(
    archive: zipfile.ZipFile,
    member_names: list[str],
    theme_key: str,
    dest_name: str,
    *,
    keys: list[str],
) -> tuple[bool, str]:
    dest = REPO_ROOT / dest_name
    if dest_name in EXCLUDED_SCAN_DIRS or dest_name.startswith("."):
        return False, f"Skip {theme_key}: destination folder name {dest_name!r} is not allowed."

    if theme_key == ".":
        block = ztu.zip_other_theme_prefixes(keys, ".")
        selected = [
            name
            for name in member_names
            if not any(name.startswith(p) for p in block) and not ztu.is_noise_zip_entry(name)
        ]
    else:
        prefix = f"{theme_key}/"
        selected = [name for name in member_names if name.startswith(prefix)]
    if not selected:
        return False, f"Skip {theme_key}: no files found under theme folder."

    dest.mkdir(parents=True, exist_ok=False)
    for name in selected:
        if theme_key == ".":
            rel = PurePosixPath(name)
        else:
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

        names_t = ztu.filter_zip_names_for_theme_logic(names)
        keys = ztu.zip_theme_keys(names_t)
        if not keys:
            return False, logs + ["ERROR: Zip must contain at least one theme folder with config.json."]

        for err in ztu.zip_inner_folder_collision_errors(keys, path.stem, zip_label=path.name):
            return False, logs + [f"ERROR: {err}"]

        catalog_rows = _catalog_identity_rows()
        suggested_names = ztu.inner_folder_names_for_zip(keys, path.stem)
        extraction_plan: list[dict[str, Any]] = []
        resolved_names_seen: set[str] = set()

        for idx, key in enumerate(keys):
            config_entry = "config.json" if key == "." else f"{key}/config.json"
            try:
                cfg = _read_config(archive, config_entry)
            except Exception as exc:
                return False, logs + [f"ERROR: {config_entry} invalid: {exc}"]

            if not ztu.zip_has_image_file(names_t, key, theme_keys=keys):
                scope = "zip root" if key == "." else f"{key}/"
                return False, logs + [f"ERROR: {scope} must include at least one image file."]
            if not _config_has_image_refs(cfg):
                return False, logs + [f"ERROR: {config_entry} must reference at least one image asset."]

            suggested = suggested_names[idx]
            resolved_dest, overwrite_existing, reason = _resolve_destination_folder(
                suggested_folder=suggested,
                incoming_config=cfg,
                catalog_rows=catalog_rows,
            )
            if not resolved_dest or resolved_dest in EXCLUDED_SCAN_DIRS or resolved_dest.startswith("."):
                return False, logs + [f"ERROR: Destination folder name {resolved_dest!r} is not allowed."]
            resolved_key = resolved_dest.lower()
            if resolved_key in resolved_names_seen:
                return (
                    False,
                    logs
                    + [
                        f"ERROR: Multiple themes in {path.name} resolve to destination folder "
                        f"{resolved_dest!r}; archive retained to avoid mixed overwrite."
                    ],
                )
            resolved_names_seen.add(resolved_key)
            extraction_plan.append(
                {
                    "key": key,
                    "dest": resolved_dest,
                    "overwrite": overwrite_existing,
                    "reason": reason,
                }
            )

        extracted_any = False
        for planned in extraction_plan:
            key = planned["key"]
            dest_name = planned["dest"]
            dest_path = REPO_ROOT / dest_name
            if planned["overwrite"] and dest_path.exists():
                try:
                    if dest_path.is_dir():
                        shutil.rmtree(dest_path)
                    else:
                        dest_path.unlink()
                except Exception as exc:
                    return False, logs + [f"ERROR: Failed to overwrite {dest_name}/: {exc}"]
                logs.append(planned["reason"])
            elif dest_path.exists():
                return (
                    False,
                    logs
                    + [
                        f"ERROR: Destination folder {dest_name}/ already exists and incoming theme "
                        "did not match a catalog/config identity for safe overwrite."
                    ],
                )
            elif planned["reason"]:
                logs.append(planned["reason"])

            ok, msg = _extract_theme(archive, names, key, dest_name, keys=keys)
            logs.append(msg)
            if ok:
                extracted_any = True

        if extracted_any:
            path.unlink()
            logs.append("Removed processed zip.")
            meta = Path(str(path) + ".meta.json")
            if meta.is_file():
                meta.unlink()
                logs.append("Removed upload metadata sidecar.")
        else:
            logs.append("No new themes extracted; zip retained.")
        return True, logs


def _discard_zip(path: Path, logs: list[str], *, reason: str) -> list[str]:
    logs.append(f"Discarding rejected archive: {reason}")
    try:
        if path.is_file():
            path.unlink()
            logs.append("Removed rejected zip.")
    except Exception as exc:
        logs.append(f"WARNING: Failed to remove rejected zip: {exc}")
    meta = Path(str(path) + ".meta.json")
    try:
        if meta.is_file():
            meta.unlink()
            logs.append("Removed rejected upload metadata sidecar.")
    except Exception as exc:
        logs.append(f"WARNING: Failed to remove rejected sidecar: {exc}")
    return logs


def main() -> int:
    zip_paths = _find_zip_paths()
    if not zip_paths:
        print("No zip files found.")
        return 0

    strict = str(os.environ.get("PROCESS_THEME_ZIPS_STRICT", "")).strip().lower() in {
        "1",
        "true",
        "yes",
        "on",
    }
    failed = 0
    for path in zip_paths:
        ok, logs = _process_zip(path)
        if not ok:
            logs = _discard_zip(path, logs, reason="failed ingest validation/extraction")
        for line in logs:
            print(line)
        if not ok:
            failed += 1

    if failed:
        print(
            f"WARNING: {failed} zip archive(s) failed ingest validation/extraction. "
            "Valid archives (if any) were still processed."
        )
    if strict and failed:
        print("PROCESS_THEME_ZIPS_STRICT is enabled: failing due to ingest errors.")
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

