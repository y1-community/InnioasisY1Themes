#!/usr/bin/env python3
"""Validate PR contents for automatic theme-folder merging.

Rules:
- Only added files are allowed (no modifications, deletions, renames).
- All changes must be under themes/ (site + zips live in that directory).
- Zip uploads must be themes/<name>.zip (not nested paths).
- Non-zip file changes must be under themes/<newThemeFolder>/... only.
- Dangerous/disallowed files are blocked.
- New direct theme folders must include config.json + at least one image file.
- Added zip files are allowed and validated:
  - path-safe entries only (no path traversal/absolute paths)
  - dangerous file types blocked inside zips
  - zip must contain one or more theme folders, each with a unique folder name
  - each theme folder in zip must include config.json and image assets
  - config.json must reference at least one image asset
"""

from __future__ import annotations

import json
import io
import subprocess
import sys
from pathlib import Path
from pathlib import PurePosixPath
from typing import Any
import zipfile


IMAGE_EXTENSIONS = {".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg"}
THEMES_PREFIX = "themes/"
# First path segment after themes/ — block infra / tooling dirs, not theme folders.
RESERVED_UNDER_THEMES = {"scripts", "functions", "assets", ".github"}
ZIP_EXTENSION = ".zip"
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


def _run(*args: str, check: bool = True) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        list(args),
        check=check,
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
    )


def _looks_like_image(path_or_value: str) -> bool:
    suffix = Path(path_or_value.split("?", 1)[0].split("#", 1)[0]).suffix.lower()
    return suffix in IMAGE_EXTENSIONS


def _is_blocked_file(path_value: str) -> bool:
    suffix = Path(path_value).suffix.lower()
    return suffix in BLOCKED_EXTENSIONS


def _is_zip_file(path_value: str) -> bool:
    return Path(path_value).suffix.lower() == ZIP_EXTENSION


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


def _config_has_image_refs(config: dict[str, Any]) -> bool:
    for key, value in config.items():
        if key in {"theme_info", "source_info"}:
            continue
        for item in _iter_values(value):
            if isinstance(item, str) and _looks_like_image(item.strip()):
                return True
    return False


def _git_blob_text(rev_path: str) -> str:
    result = _run("git", "show", rev_path)
    return result.stdout


def _git_blob_bytes(rev_path: str) -> bytes:
    result = subprocess.run(
        ["git", "show", rev_path],
        check=True,
        capture_output=True,
    )
    return result.stdout


def _folder_exists_in_base(base_sha: str, folder: str) -> bool:
    result = _run("git", "cat-file", "-e", f"{base_sha}:{folder}", check=False)
    return result.returncode == 0


def _fail(errors: list[str]) -> int:
    for msg in errors:
        print(f"ERROR: {msg}")
    return 1


def _is_safe_zip_member(member_name: str) -> bool:
    path = PurePosixPath(member_name)
    if path.is_absolute():
        return False
    for part in path.parts:
        if part in {"", ".", ".."}:
            return False
    return True


def _zip_theme_keys(entry_names: list[str]) -> list[str]:
    keys: list[str] = []
    for name in entry_names:
        path = PurePosixPath(name)
        if path.name != "config.json":
            continue
        parent = str(path.parent)
        keys.append("." if parent in {"", "."} else parent)
    return keys


def _zip_has_image_file(entry_names: list[str], theme_key: str) -> bool:
    if theme_key == ".":
        for name in entry_names:
            if "/" in name:
                continue
            if _looks_like_image(name):
                return True
        return False

    prefix = f"{theme_key}/"
    for name in entry_names:
        if not name.startswith(prefix):
            continue
        rel = name[len(prefix) :]
        if not rel:
            continue
        if _looks_like_image(rel):
            return True
    return False


def _validate_zip_blob(path: str, blob: bytes) -> list[str]:
    errors: list[str] = []
    try:
        archive = zipfile.ZipFile(io.BytesIO(blob))
    except zipfile.BadZipFile:
        return [f"{path} is not a valid zip archive."]

    with archive:
        names = [n for n in archive.namelist() if n and not n.endswith("/")]
        if not names:
            return [f"{path} contains no files."]

        for name in names:
            if not _is_safe_zip_member(name):
                errors.append(f"{path} contains unsafe entry path: {name}")
                continue
            if _is_blocked_file(name):
                errors.append(f"{path} contains blocked file type: {name}")

        if errors:
            return errors

        theme_keys = _zip_theme_keys(names)
        if not theme_keys:
            return [f"{path} must contain at least one theme folder with config.json."]

        base_names = [("__ZIP_ROOT__" if k == "." else PurePosixPath(k).name) for k in theme_keys]
        if len(set(base_names)) != len(base_names):
            return [f"{path} contains duplicate theme folder names; each theme folder must be unique."]

        for key in theme_keys:
            config_entry = "config.json" if key == "." else f"{key}/config.json"
            try:
                config_raw = archive.read(config_entry).decode("utf-8")
                config = json.loads(config_raw)
            except KeyError:
                errors.append(f"{path} missing {config_entry}.")
                continue
            except json.JSONDecodeError as exc:
                errors.append(f"{path} has invalid JSON in {config_entry}: {exc}")
                continue
            except UnicodeDecodeError:
                errors.append(f"{path} has non-utf8 config in {config_entry}.")
                continue

            if not isinstance(config, dict):
                errors.append(f"{path} {config_entry} must be a JSON object.")
                continue

            if not _zip_has_image_file(names, key):
                scope = "zip root" if key == "." else f"{key}/"
                errors.append(f"{path} {scope} must include at least one image file.")
            if not _config_has_image_refs(config):
                errors.append(f"{path} {config_entry} must reference at least one image asset.")

    return errors


def main() -> int:
    if len(sys.argv) != 3:
        print("Usage: validate_theme_pr.py <base_sha> <pr_ref>")
        return 2

    base_sha = sys.argv[1]
    pr_ref = sys.argv[2]

    # Compare PR head against the current base tree directly (2-dot),
    # which avoids stale-branch false positives for changes already on base.
    diff = _run("git", "diff", "--name-status", "--no-renames", f"{base_sha}", f"{pr_ref}")
    rows = [line for line in diff.stdout.splitlines() if line.strip()]
    if not rows:
        return _fail(["PR has no file changes."])

    folder_state: dict[str, dict[str, Any]] = {}
    zip_paths: list[str] = []
    errors: list[str] = []

    existing_folder_blocked: set[str] = set()
    for row in rows:
        parts = row.split("\t", 1)
        if len(parts) != 2:
            errors.append(f"Malformed diff row: {row}")
            continue

        status, path = parts
        path = path.strip()

        if status != "A":
            errors.append(f"Only added files are allowed. Found {status} on {path}.")
            continue

        if not path.startswith(THEMES_PREFIX):
            errors.append(f"Changes must be under {THEMES_PREFIX}: {path}")
            continue

        if _is_zip_file(path):
            rel_zip = path[len(THEMES_PREFIX) :]
            if "/" in rel_zip:
                errors.append(f"Zip submissions must be directly under {THEMES_PREFIX}: {path}")
                continue
            zip_paths.append(path)
            continue

        rest = path[len(THEMES_PREFIX) :]
        if "/" not in rest:
            errors.append(f"Non-zip files cannot sit directly under {THEMES_PREFIX}: {path}")
            continue

        theme_name, rel_path = rest.split("/", 1)
        if theme_name.startswith(".") or theme_name in RESERVED_UNDER_THEMES:
            errors.append(f"Changes under {THEMES_PREFIX}{theme_name}/ are not allowed for auto-merge.")
            continue

        composite = f"{THEMES_PREFIX}{theme_name}"
        if _folder_exists_in_base(base_sha, composite):
            if composite not in existing_folder_blocked:
                errors.append(
                    f"Folder {composite}/ already exists in base; only new folders are auto-mergeable."
                )
                existing_folder_blocked.add(composite)
            continue

        state = folder_state.setdefault(composite, {"has_config": False, "image_files": [], "paths": []})
        state["paths"].append(rel_path)
        name = Path(rel_path).name
        if name == "config.json":
            state["has_config"] = True
        elif _is_blocked_file(name):
            errors.append(f"Blocked file type in {composite}/: {rel_path}")
        elif _looks_like_image(name):
            state["image_files"].append(rel_path)

    if errors:
        return _fail(errors)

    if not folder_state and not zip_paths:
        return _fail(["PR must include new theme folders and/or zip submissions."])

    for composite, state in folder_state.items():
        if not state["has_config"]:
            errors.append(f"{composite}/ is missing config.json.")
            continue
        if not state["image_files"]:
            errors.append(f"{composite}/ must include at least one image file.")
            continue

        try:
            config_raw = _git_blob_text(f"{pr_ref}:{composite}/config.json")
            config = json.loads(config_raw)
        except json.JSONDecodeError as exc:
            errors.append(f"{composite}/config.json is invalid JSON: {exc}")
            continue
        except subprocess.CalledProcessError:
            errors.append(f"Unable to read {composite}/config.json from PR ref.")
            continue

        if not isinstance(config, dict):
            errors.append(f"{composite}/config.json must be a JSON object.")
            continue

        if not _config_has_image_refs(config):
            errors.append(f"{composite}/config.json must reference at least one image asset.")

    for path in zip_paths:
        try:
            blob = _git_blob_bytes(f"{pr_ref}:{path}")
        except subprocess.CalledProcessError:
            errors.append(f"Unable to read zip {path} from PR ref.")
            continue
        errors.extend(_validate_zip_blob(path, blob))

    if errors:
        return _fail(errors)

    print(
        f"Validation passed for {len(folder_state)} new theme folder(s)"
        f" and {len(zip_paths)} zip submission(s)."
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

