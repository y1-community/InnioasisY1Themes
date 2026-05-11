#!/usr/bin/env python3
"""Validate PR contents for automatic theme-folder merging.

Rules:
- Only added files are allowed.
- No root-level file changes are allowed.
- Changes must be inside newly added top-level folders only.
- Allowed files in those folders are:
  - config.json
  - image files (.png, .jpg, .jpeg, .gif, .webp, .svg)
- Each new folder must include config.json and at least one image file.
- config.json must contain at least one image asset reference outside
  theme_info/source_info sections.
"""

from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path
from typing import Any


IMAGE_EXTENSIONS = {".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg"}
DISALLOWED_TOP_LEVEL = {".github", "scripts", "assets"}


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


def _folder_exists_in_base(base_sha: str, folder: str) -> bool:
    result = _run("git", "cat-file", "-e", f"{base_sha}:{folder}", check=False)
    return result.returncode == 0


def _fail(errors: list[str]) -> int:
    for msg in errors:
        print(f"ERROR: {msg}")
    return 1


def main() -> int:
    if len(sys.argv) != 3:
        print("Usage: validate_theme_pr.py <base_sha> <pr_ref>")
        return 2

    base_sha = sys.argv[1]
    pr_ref = sys.argv[2]

    diff = _run("git", "diff", "--name-status", "--no-renames", f"{base_sha}...{pr_ref}")
    rows = [line for line in diff.stdout.splitlines() if line.strip()]
    if not rows:
        return _fail(["PR has no file changes."])

    folder_state: dict[str, dict[str, Any]] = {}
    errors: list[str] = []

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

        if "/" not in path:
            errors.append(f"Root-level file changes are not allowed: {path}.")
            continue

        folder, rel_path = path.split("/", 1)
        if folder.startswith(".") or folder in DISALLOWED_TOP_LEVEL:
            errors.append(f"Changes in {folder}/ are not allowed for auto-merge.")
            continue

        if _folder_exists_in_base(base_sha, folder):
            errors.append(f"Folder {folder}/ already exists in base; only new folders are auto-mergeable.")
            continue

        state = folder_state.setdefault(folder, {"has_config": False, "image_files": [], "paths": []})
        state["paths"].append(rel_path)
        name = Path(rel_path).name
        if name == "config.json":
            state["has_config"] = True
        elif _looks_like_image(name):
            state["image_files"].append(rel_path)
        else:
            errors.append(f"Disallowed file type in {folder}/: {rel_path}")

    if errors:
        return _fail(errors)

    for folder, state in folder_state.items():
        if not state["has_config"]:
            errors.append(f"{folder}/ is missing config.json.")
            continue
        if not state["image_files"]:
            errors.append(f"{folder}/ must include at least one image file.")
            continue

        try:
            config_raw = _git_blob_text(f"{pr_ref}:{folder}/config.json")
            config = json.loads(config_raw)
        except json.JSONDecodeError as exc:
            errors.append(f"{folder}/config.json is invalid JSON: {exc}")
            continue
        except subprocess.CalledProcessError:
            errors.append(f"Unable to read {folder}/config.json from PR ref.")
            continue

        if not isinstance(config, dict):
            errors.append(f"{folder}/config.json must be a JSON object.")
            continue

        if not _config_has_image_refs(config):
            errors.append(f"{folder}/config.json must reference at least one image asset.")

    if errors:
        return _fail(errors)

    print(f"Validation passed for {len(folder_state)} new theme folder(s).")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

