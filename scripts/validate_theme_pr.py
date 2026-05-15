#!/usr/bin/env python3
"""Validate PR contents for automatic theme-folder merging.

Rules:
- **Additive PRs (gallery ZIP uploader):** only added files (no modifications, deletions, renames).
- **Metadata-only PRs:** only modified files; may change ``themes.json`` listing fields
  (``name``, ``author``, ``authorUrl``, ``description``, ``externalDownloadUrl``,
  ``sortName``, ``searchText``) and/or one or more existing ``ThemeName/config.json``
  files (see ``THEMES_METADATA_AUTO_MERGE_MAX_FOLDERS``). Mixed add+modify PRs are rejected.
- All changes must be at the repository root (static site + zips live there).
- Zip uploads must be <name>.zip at repo root (no path segments), except optional
  gallery upload sidecar ``<same-path>.meta.json`` (i.e. ``*.zip.meta.json``) added
  alongside the same PR's ``*.zip`` (see theme-upload-handler).
- Other **new** single-segment root files (e.g. OS junk next to a zip) are ignored for
  this validator unless they use a blocked extension or are a stray ``config.json``.
  (Root ``.html`` / ``.htm`` files are ignored like other stray single-segment files.)
- Non-zip **theme** additions must be under ``<ThemeFolder>/...`` at repo root (brand-new
  folder for automatic merge; **additive files under a folder that already exists on base**
  still validate but require maintainer merge).
- Dangerous/disallowed files are blocked (executables, scripts, etc.). ``.html`` / ``.htm``
  inside zips do not fail validation; ingest skips writing them into theme folders.
- New direct theme folders must include config.json + at least one image file.
- Added zip files are allowed and validated:
  - path-safe entries only (no path traversal/absolute paths)
  - dangerous file types blocked inside zips (except ``.html`` / ``.htm``, which are ignored)
  - zip must contain one or more theme folders, each with a unique folder name
  - each theme folder in zip must include config.json and image assets
  - root ``config.json`` theme may use images in subfolders that are not another
    theme's tree (non-theme zip noise is otherwise ignored)
  - config.json must reference at least one image asset
- Identity / duplicate policy:
  - Theme folders are compared by a logical slug: path name case-folded.
  - If a zip on the default branch is still waiting to be extracted and claims the
    same logical name, validation **fails** (avoid duplicate listings before extraction).
  - If the submission targets an existing catalog theme (same logical folder / identity)
    with the **same author** (or both authors unknown), it is an **update, replacement,
    or variant pack** — validation **passes** but the script prints
    ``THEME_PR_AUTO_MERGE_ALLOWED=0`` so the auto-merge workflow opens a normal PR
    for maintainers (correct placement in the existing folder, ``themes.json``, etc.).
  - If authors differ, the incoming folder must end with ``-<slug>`` where slug
    comes from upload metadata or theme author; otherwise validation **fails**.
  - **Only brand-new** theme identities (no matching catalog row, folder not on base)
    print ``THEME_PR_AUTO_MERGE_ALLOWED=1`` for automatic squash-merge.
- Catalog display title (theme_info.title) collisions still block validation (fail).
"""

from __future__ import annotations

import json
import os
import re
import io
import subprocess
import sys
from pathlib import Path
from pathlib import PurePosixPath
from typing import Any
import zipfile

import zip_theme_utils as ztu


# Site root = repository root. Diff paths are repo-relative.
THEMES_PREFIX = ""
# First path segment for folder additions — block infra / tooling dirs.
RESERVED_ROOT_SEGMENTS = {"scripts", "functions", "assets"}
ZIP_EXTENSION = ".zip"
BLOCKED_EXTENSIONS = {
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
    return ztu.looks_like_image(path_or_value)


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
    """True if any JSON string value looks like an image path (incl. theme_info / source_info)."""
    for item in _iter_values(config):
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


def _theme_folder_has_config_on_base(base_sha: str, folder: str) -> bool:
    f = folder.strip()
    if not f or f.startswith(".") or f in RESERVED_ROOT_SEGMENTS:
        return False
    return (
        _run("git", "cat-file", "-e", f"{base_sha}:{f}/config.json", check=False).returncode == 0
    )


_SLUGIFY_NOISE_RE = re.compile(r"[^a-zA-Z0-9._-]+")


def logical_theme_slug(folder: str) -> str:
    """Normalize folder name for identity (case-insensitive)."""
    return re.sub(r"_dark[_-]?mode$", "", folder.strip(), flags=re.I).lower()


def _norm_author(value: str | None) -> str:
    if not value or not str(value).strip():
        return ""
    s = " ".join(str(value).strip().lower().split())
    if s.startswith("u/"):
        s = s[2:].strip()
    return s


def _authors_equivalent(existing_norm: str, incoming_raw: str) -> bool:
    inc = _norm_author(incoming_raw)
    if not existing_norm and not inc:
        return True
    if not existing_norm or not inc:
        return False
    return existing_norm == inc


def _slug_token(value: str) -> str:
    """Match theme-upload-handler.js uploaderSlug normalization (hyphenated, <=40)."""
    s = (value or "").strip()
    s = re.sub(r"^u/", "", s, flags=re.I)
    s = _SLUGIFY_NOISE_RE.sub("_", s).strip("_")[:120]
    s = s.replace("_", "-").lower()
    s = re.sub(r"[^a-z0-9-]+", "-", s)
    s = re.sub(r"-+", "-", s).strip("-")
    return s[:40]


def _collect_slug_candidates(meta: dict[str, Any], config: dict[str, Any] | None) -> list[str]:
    candidates: list[str] = []
    uslug = meta.get("uploaderSlug")
    if isinstance(uslug, str) and uslug.strip():
        candidates.append(uslug.strip().lower())
    uname = meta.get("uploaderName")
    if isinstance(uname, str) and uname.strip():
        t = _slug_token(uname.strip())
        if t:
            candidates.append(t)
    if config:
        for key in ("theme_info", "source_info"):
            block = config.get(key)
            if isinstance(block, dict):
                auth = block.get("author")
                if isinstance(auth, str) and auth.strip():
                    t = _slug_token(auth.strip())
                    if t:
                        candidates.append(t)
                        break
    out: list[str] = []
    seen: set[str] = set()
    for c in candidates:
        if c and c not in seen:
            seen.add(c)
            out.append(c)
    return out


def _folder_has_disambiguator(inner_folder: str, slug_candidates: list[str]) -> bool:
    low = inner_folder.lower()
    for s in slug_candidates:
        s2 = (s or "").strip().lower()
        if s2 and re.search(rf"[_-]{re.escape(s2)}(_dark-mode)?$", low):
            return True
    return False


def _read_upload_meta_pr(pr_ref: str, zip_path: str) -> dict[str, Any]:
    meta_path = f"{zip_path}.meta.json"
    try:
        raw = _git_blob_text(f"{pr_ref}:{meta_path}")
        data = json.loads(raw)
        return data if isinstance(data, dict) else {}
    except (subprocess.CalledProcessError, json.JSONDecodeError):
        return {}


def _read_upload_meta_base(base_sha: str, zip_path: str) -> dict[str, Any]:
    """Sidecar next to a root zip on the default branch (same shape as PR meta)."""
    meta_path = f"{zip_path}.meta.json"
    try:
        raw = _git_blob_text(f"{base_sha}:{meta_path}")
        data = json.loads(raw)
        return data if isinstance(data, dict) else {}
    except (subprocess.CalledProcessError, json.JSONDecodeError):
        return {}


def _pending_root_zip_same_steward_for_logical(
    base_sha: str,
    logical: str,
    catalog_rows: list[dict[str, Any]],
) -> bool:
    """True if some root zip on base already claims ``logical`` and matches that listing's author."""
    catalog_norm = ""
    for r in catalog_rows:
        if r["logical"] == logical:
            catalog_norm = str(r.get("author_norm") or "")
            break
    if not catalog_norm:
        return False
    for name in _git_ls_root_filenames(base_sha):
        if "/" in name or not name.lower().endswith(ZIP_EXTENSION):
            continue
        try:
            blob = _git_blob_bytes(f"{base_sha}:{name}")
        except subprocess.CalledProcessError:
            continue
        stem = PurePosixPath(name).stem
        meta = _read_upload_meta_base(base_sha, name)
        for item in _inner_themes_from_zip_blob(blob, zip_stem=stem):
            if item["logical"] != logical:
                continue
            cfg = item.get("config")
            pa = ""
            if isinstance(cfg, dict):
                for key in ("theme_info", "source_info"):
                    block = cfg.get(key)
                    if isinstance(block, dict):
                        auth = block.get("author")
                        if isinstance(auth, str) and auth.strip():
                            pa = auth.strip()
                            break
            if not pa.strip():
                un = meta.get("uploaderName")
                if isinstance(un, str) and un.strip():
                    pa = un.strip()
            if _authors_equivalent(catalog_norm, pa):
                return True
    return False


def _read_config_author_base(base_sha: str, folder: str) -> str:
    fp = f"{folder.strip()}/config.json"
    try:
        raw = _git_blob_text(f"{base_sha}:{fp}")
        cfg = json.loads(raw)
        if not isinstance(cfg, dict):
            return ""
        for key in ("theme_info", "source_info"):
            block = cfg.get(key)
            if isinstance(block, dict):
                auth = block.get("author")
                if isinstance(auth, str) and auth.strip():
                    return auth.strip()
    except (subprocess.CalledProcessError, json.JSONDecodeError):
        return ""
    return ""


def _load_catalog_identity_rows(base_sha: str) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    try:
        raw = _git_blob_text(f"{base_sha}:themes.json")
        data = json.loads(raw)
    except (subprocess.CalledProcessError, json.JSONDecodeError):
        return rows
    for entry in data.get("themes") or []:
        if not isinstance(entry, dict):
            continue
        folder = entry.get("folder")
        if not isinstance(folder, str) or not folder.strip():
            continue
        folder = folder.strip()
        ath = entry.get("author")
        author_s = ath.strip() if isinstance(ath, str) else ""
        if not author_s:
            author_s = _read_config_author_base(base_sha, folder)
        rows.append(
            {
                "folder": folder,
                "logical": logical_theme_slug(folder),
                "author_norm": _norm_author(author_s),
            }
        )
    return rows


def _git_ls_root_filenames(base_sha: str) -> list[str]:
    result = _run("git", "ls-tree", "--name-only", base_sha, check=False)
    if result.returncode != 0:
        return []
    return [ln.strip() for ln in result.stdout.splitlines() if ln.strip()]


def _inner_themes_from_zip_blob(blob: bytes, *, zip_stem: str) -> list[dict[str, Any]]:
    out: list[dict[str, Any]] = []
    try:
        archive = zipfile.ZipFile(io.BytesIO(blob))
    except zipfile.BadZipFile:
        return out
    with archive:
        names = [n for n in archive.namelist() if n and not n.endswith("/")]
        names_t = ztu.filter_zip_names_for_theme_logic(names)
        bundle = ztu.root_theme_bundle_zip_entries(names_t)
        if bundle is not None:
            for inner in bundle:
                try:
                    ib = archive.read(inner)
                except KeyError:
                    continue
                inner_stem = PurePosixPath(inner).stem
                out.extend(_inner_themes_from_zip_blob(ib, zip_stem=inner_stem))
            return out
        theme_keys = ztu.zip_theme_keys(names_t)
        theme_keys = ztu.collapse_redundant_root_theme_key(names_t, theme_keys, zip_stem)
        theme_keys = ztu.drop_variant_keys_under_parent_theme(theme_keys)
        if not theme_keys:
            return out
        dest_names = ztu.inner_folder_names_for_zip(theme_keys, zip_stem)
        seen_folder: set[str] = set()
        for idx, key in enumerate(theme_keys):
            inner = dest_names[idx]
            if inner in seen_folder:
                continue
            seen_folder.add(inner)
            config_entry = "config.json" if key == "." else f"{key}/config.json"
            config: dict[str, Any] | None = None
            try:
                raw_c = archive.read(config_entry).decode("utf-8")
                parsed = json.loads(raw_c)
                if isinstance(parsed, dict):
                    config = parsed
            except (KeyError, json.JSONDecodeError, UnicodeDecodeError):
                pass
            out.append({"folder": inner, "logical": logical_theme_slug(inner), "config": config})
    return out


def _pending_logical_slugs_from_root_zips(base_sha: str) -> set[str]:
    slugs: set[str] = set()
    for name in _git_ls_root_filenames(base_sha):
        if "/" in name:
            continue
        if not name.lower().endswith(ZIP_EXTENSION):
            continue
        try:
            blob = _git_blob_bytes(f"{base_sha}:{name}")
        except subprocess.CalledProcessError:
            continue
        stem = PurePosixPath(name).stem
        for item in _inner_themes_from_zip_blob(blob, zip_stem=stem):
            slugs.add(item["logical"])
    return slugs


def _identity_policy_assess(
    *,
    base_sha: str,
    inner_folder: str,
    config: dict[str, Any] | None,
    meta: dict[str, Any],
    catalog_rows: list[dict[str, Any]],
    pending_logical_slugs: set[str],
    context: str,
) -> tuple[list[str], list[str]]:
    """Return (hard_errors, manual_review_reasons).

    manual_review_reasons are non-fatal: validation passes but auto-merge must be skipped.
    """
    errors: list[str] = []
    manual: list[str] = []
    logical = logical_theme_slug(inner_folder)
    incoming_auth = ""
    if config:
        for key in ("theme_info", "source_info"):
            block = config.get(key)
            if isinstance(block, dict):
                auth = block.get("author")
                if isinstance(auth, str) and auth.strip():
                    incoming_auth = auth.strip()
                    break
    if not incoming_auth.strip():
        un = meta.get("uploaderName")
        if isinstance(un, str) and un.strip():
            incoming_auth = un.strip()

    if _theme_folder_has_config_on_base(base_sha, inner_folder):
        matches_existing = [r for r in catalog_rows if r["logical"] == logical]
        if matches_existing:
            exist_author_norm = str(matches_existing[0].get("author_norm") or "")
            if _authors_equivalent(exist_author_norm, incoming_auth):
                manual.append(
                    f"{context}: Update or variant pack for existing theme folder {inner_folder!r} "
                    "(catalog author matches submission). Maintainer review is required before merge."
                )
            else:
                errors.append(
                    f"{context}: Theme folder {inner_folder!r} already exists on the default branch "
                    f"and matches gallery identity in themes.json, but the credited author differs from "
                    f"this submission. Use a suffixed folder name for your remix or coordinate with the "
                    f"listed author."
                )
        else:
            manual.append(
                f"{context}: Theme folder {inner_folder!r} already exists on the default branch with "
                "config.json but has no matching themes.json entry (unusual). Maintainer review is required."
            )
        return errors, manual

    if logical in pending_logical_slugs:
        errors.append(
            f"{context}: Another ZIP on the default branch already claims theme folder identity matching {inner_folder!r} "
            "(after case-insensitive normalization). Wait for extraction or remove/rename that archive — "
            "validation failed to avoid duplicate listings."
        )
        return errors, manual

    matches = [r for r in catalog_rows if r["logical"] == logical]
    if not matches:
        return errors, manual

    exist_author_norm = matches[0].get("author_norm") or ""

    if _authors_equivalent(exist_author_norm, incoming_auth):
        manual.append(
            f"{context}: Theme folder {inner_folder!r} matches an existing gallery entry (same identity after "
            "case-insensitive normalization) and authors match or both are unknown — treated as an update, "
            "replacement, or duplicate ZIP path. Maintainer review is required before merge."
        )
        return errors, manual

    slug_cands = _collect_slug_candidates(meta, config)
    if _folder_has_disambiguator(inner_folder, slug_cands):
        return errors, manual

    hint = slug_cands[0] if slug_cands else "your-handle"
    sample_base = re.sub(r"_dark[_-]?mode$", "", inner_folder, flags=re.I)
    sample = f"{sample_base}_{hint}"
    if re.search(r"_dark[_-]?mode$", inner_folder, flags=re.I):
        sample = f"{sample}_dark-mode"
    errors.append(
        f"{context}: Folder {inner_folder!r} matches an existing theme credited to a different author. "
        f"Rename the theme root folder to include your suffix, e.g. {sample}, "
        "then re-upload — validation failed."
    )
    return errors, manual


def _load_catalog_title_rows(base_sha: str) -> list[dict[str, Any]]:
    """Catalog rows for title-vs-author impersonation checks."""
    rows: list[dict[str, Any]] = []
    try:
        raw = _git_blob_text(f"{base_sha}:themes.json")
        data = json.loads(raw)
    except (subprocess.CalledProcessError, json.JSONDecodeError):
        return rows
    for entry in data.get("themes") or []:
        if not isinstance(entry, dict):
            continue
        folder = entry.get("folder")
        if not isinstance(folder, str) or not folder.strip():
            continue
        folder = folder.strip()
        name = entry.get("name")
        name_s = name.strip() if isinstance(name, str) else ""
        name_norm = _norm_catalog_name(name_s) if name_s else ""
        ath = entry.get("author")
        author_s = ath.strip() if isinstance(ath, str) else ""
        if not author_s:
            author_s = _read_config_author_base(base_sha, folder)
        rows.append(
            {
                "folder": folder,
                "logical": logical_theme_slug(folder),
                "name_norm": name_norm,
                "author_norm": _norm_author(author_s),
            }
        )
    return rows


def _title_impersonation_errors(
    *,
    inner_folder: str,
    config: dict[str, Any] | None,
    meta: dict[str, Any],
    catalog_title_rows: list[dict[str, Any]],
    context: str,
) -> list[str]:
    """Block auto-merge when a config title matches another theme's catalog name but author/suffix suggest impersonation."""
    if not config:
        return []
    tnorm = _config_title_norm(config)
    if not tnorm:
        return []
    incoming_auth = ""
    for key in ("theme_info", "source_info"):
        block = config.get(key)
        if isinstance(block, dict):
            auth = block.get("author")
            if isinstance(auth, str) and auth.strip():
                incoming_auth = auth.strip()
                break
    if not incoming_auth.strip():
        un = meta.get("uploaderName")
        if isinstance(un, str) and un.strip():
            incoming_auth = un.strip()
    slug_cands = _collect_slug_candidates(meta, config)
    inner_log = logical_theme_slug(inner_folder)

    for row in catalog_title_rows:
        if not row.get("name_norm") or row["name_norm"] != tnorm:
            continue
        if row["logical"] == inner_log:
            continue
        if _authors_equivalent(row["author_norm"], incoming_auth):
            continue
        if _folder_has_disambiguator(inner_folder, slug_cands):
            continue
        return [
            f"{context}: Theme title matches catalog name '{tnorm}' for folder {row['folder']!r}, "
            "but author does not match that listing and the folder name is not suffixed to show a remix/variation. "
            "Auto-merge disabled for manual review (possible impersonation or mistaken reuse)."
        ]
    return []


def _zip_title_impersonation_scan(
    blob: bytes,
    meta: dict[str, Any],
    catalog_title_rows: list[dict[str, Any]],
    zip_repo_path: str,
) -> list[str]:
    errors: list[str] = []
    try:
        archive = zipfile.ZipFile(io.BytesIO(blob))
    except zipfile.BadZipFile:
        return errors
    with archive:
        names = [n for n in archive.namelist() if n and not n.endswith("/")]
        names_t = ztu.filter_zip_names_for_theme_logic(names)
        bundle = ztu.root_theme_bundle_zip_entries(names_t)
        if bundle is not None:
            for inner in bundle:
                try:
                    ib = archive.read(inner)
                except KeyError:
                    continue
                errors.extend(
                    _zip_title_impersonation_scan(ib, meta, catalog_title_rows, PurePosixPath(inner).name)
                )
            return errors
        theme_keys = ztu.zip_theme_keys(names_t)
        theme_keys = ztu.collapse_redundant_root_theme_key(
            names_t, theme_keys, PurePosixPath(zip_repo_path).stem
        )
        theme_keys = ztu.drop_variant_keys_under_parent_theme(theme_keys)
        dest_names = ztu.inner_folder_names_for_zip(theme_keys, PurePosixPath(zip_repo_path).stem)
        seen: set[str] = set()
        for idx, key in enumerate(theme_keys):
            folder = dest_names[idx]
            fn = folder.strip()
            if not fn or fn in seen:
                continue
            seen.add(fn)
            config_entry = "config.json" if key == "." else f"{key}/config.json"
            config: dict[str, Any] | None = None
            try:
                raw = archive.read(config_entry).decode("utf-8")
                parsed = json.loads(raw)
                if isinstance(parsed, dict):
                    config = parsed
            except (KeyError, json.JSONDecodeError, UnicodeDecodeError):
                pass
            errors.extend(
                _title_impersonation_errors(
                    inner_folder=fn,
                    config=config,
                    meta=meta,
                    catalog_title_rows=catalog_title_rows,
                    context=f"ZIP {zip_repo_path}",
                )
            )
    return errors


def _norm_catalog_name(value: str) -> str:
    """Lowercase and collapse whitespace for stable theme title comparison."""
    return " ".join(value.strip().lower().split())


def _load_themes_catalog(base_sha: str) -> tuple[set[str], set[str]]:
    """Load themes.json at base_sha: (folder names lowercased, normalized display names)."""
    folders: set[str] = set()
    names: set[str] = set()
    try:
        raw = _git_blob_text(f"{base_sha}:themes.json")
        data = json.loads(raw)
    except subprocess.CalledProcessError:
        return folders, names
    except json.JSONDecodeError:
        return folders, names

    for entry in data.get("themes") or []:
        if not isinstance(entry, dict):
            continue
        folder = entry.get("folder")
        if isinstance(folder, str) and folder.strip():
            folders.add(folder.strip().lower())
        disp = entry.get("name")
        if isinstance(disp, str) and disp.strip():
            names.add(_norm_catalog_name(disp))
    return folders, names


def _config_title_norm(config: dict[str, Any]) -> str | None:
    for key in ("theme_info", "source_info"):
        block = config.get(key)
        if isinstance(block, dict):
            title = block.get("title")
            if isinstance(title, str) and title.strip():
                return _norm_catalog_name(title)
    return None


def _catalog_collisions(
    base_folders: set[str],
    *,
    folder: str,
    config: dict[str, Any] | None,
) -> list[str]:
    """Return errors if folder string is already listed in themes.json (exact path collision)."""
    errors: list[str] = []
    fn = folder.strip()
    if fn and fn.lower() in base_folders:
        errors.append(
            f"Folder name '{fn}' is already listed in themes.json on the default branch. "
            "Auto-merge is disabled — use a new folder name or close as duplicate."
        )
    return errors


def _fail(errors: list[str]) -> int:
    for msg in errors:
        print(f"ERROR: {msg}")
    return 1


def _dedupe_strs(seq: list[str]) -> list[str]:
    seen: set[str] = set()
    out: list[str] = []
    for x in seq:
        if not x or x in seen:
            continue
        seen.add(x)
        out.append(x)
    return out


def _is_safe_zip_member(member_name: str) -> bool:
    path = PurePosixPath(member_name)
    if path.is_absolute():
        return False
    for part in path.parts:
        if part in {"", ".", ".."}:
            return False
    return True


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

        names_t = ztu.filter_zip_names_for_theme_logic(names)
        bundle_inner = ztu.root_theme_bundle_zip_entries(names_t)
        if bundle_inner is not None:
            errs: list[str] = []
            for inner in bundle_inner:
                try:
                    ib = archive.read(inner)
                except KeyError:
                    errs.append(f"{path} missing inner member {inner!r}.")
                    continue
                errs.extend(_validate_zip_blob(PurePosixPath(inner).name, ib))
            return errs

        theme_keys = ztu.zip_theme_keys(names_t)
        zip_stem = PurePosixPath(path).stem
        theme_keys = ztu.collapse_redundant_root_theme_key(names_t, theme_keys, zip_stem)
        theme_keys = ztu.drop_variant_keys_under_parent_theme(theme_keys)
        if not theme_keys:
            return [
                f"{path} must contain at least one config.json (at zip root or under a theme subfolder)."
            ]

        errors.extend(ztu.zip_inner_folder_collision_errors(theme_keys, zip_stem, zip_label=path))
        if errors:
            return errors

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

            if not ztu.zip_has_image_file(names_t, key, theme_keys=theme_keys):
                scope = "zip root" if key == "." else f"{key}/"
                errors.append(f"{path} {scope} must include at least one image file.")
            if not _config_has_image_refs(config):
                errors.append(f"{path} {config_entry} must reference at least one image asset.")

    return errors


METADATA_LISTING_KEYS = frozenset(
    {"name", "author", "authorUrl", "description", "externalDownloadUrl", "sortName", "searchText"}
)


def _load_themes_json_themes(rev: str) -> list[Any]:
    try:
        raw = _git_blob_text(f"{rev}:themes.json")
        data = json.loads(raw)
    except (subprocess.CalledProcessError, json.JSONDecodeError):
        return []
    themes = data.get("themes") if isinstance(data, dict) else None
    return themes if isinstance(themes, list) else []


def _theme_rows_by_folder(themes: list[Any]) -> dict[str, dict[str, Any]]:
    out: dict[str, dict[str, Any]] = {}
    for e in themes:
        if not isinstance(e, dict):
            continue
        f = e.get("folder")
        if isinstance(f, str) and f.strip():
            out[f.strip()] = dict(e)
    return out


def _themes_json_metadata_allowed(
    base_map: dict[str, dict[str, Any]],
    pr_map: dict[str, dict[str, Any]],
) -> tuple[bool, str]:
    if set(base_map) != set(pr_map):
        return False, "themes.json folder keys must not change for metadata-only PRs."
    for folder, be in base_map.items():
        pe = pr_map[folder]
        for k, pv in pe.items():
            if k not in be or be[k] != pv:
                if k not in METADATA_LISTING_KEYS:
                    return False, (
                        f"themes.json entry {folder!r} may only change keys "
                        f"{sorted(METADATA_LISTING_KEYS)} on metadata-only PRs."
                    )
    return True, ""


def _validate_metadata_only_pr(
    base_sha: str,
    pr_ref: str,
    parsed: list[tuple[str, str]],
    *,
    catalog_title_rows: list[dict[str, Any]],
) -> list[str]:
    errors: list[str] = []
    paths = [p for _, p in parsed]
    theme_config_paths: list[str] = []
    for p in paths:
        if p == "themes.json":
            continue
        parts = p.split("/")
        if len(parts) != 2 or parts[1].lower() != "config.json":
            errors.append(
                "Metadata-only auto-merge only supports themes.json and paths of the form "
                f"ThemeName/config.json (got {p!r})."
            )
            return errors
        folder = parts[0]
        composite = f"{THEMES_PREFIX}{folder}" if THEMES_PREFIX else folder
        if folder.startswith(".") or folder in RESERVED_ROOT_SEGMENTS:
            errors.append(f"Metadata path not allowed: {p!r}")
            return errors
        if not _folder_exists_in_base(base_sha, composite):
            errors.append(f"`{p}` is not an existing theme folder on the base branch.")
            return errors
        theme_config_paths.append(p)

    if not theme_config_paths and "themes.json" not in paths:
        errors.append("Metadata-only PR must include themes.json and/or one ThemeName/config.json.")
        return errors

    folders = {p.split("/")[0] for p in theme_config_paths}
    max_folders = int(os.environ.get("THEMES_METADATA_AUTO_MERGE_MAX_FOLDERS", "20"))
    if max_folders > 0 and len(folders) > max_folders:
        errors.append(
            f"Metadata-only auto-merge allows at most {max_folders} theme folder(s) per PR "
            f"(got {len(folders)}). Split the change or raise THEMES_METADATA_AUTO_MERGE_MAX_FOLDERS."
        )
        return errors

    if "themes.json" in paths:
        base_map = _theme_rows_by_folder(_load_themes_json_themes(base_sha))
        pr_map = _theme_rows_by_folder(_load_themes_json_themes(pr_ref))
        ok, msg = _themes_json_metadata_allowed(base_map, pr_map)
        if not ok:
            errors.append(msg)

    for p in theme_config_paths:
        folder = p.split("/")[0]
        try:
            raw = _git_blob_text(f"{pr_ref}:{p}")
            config = json.loads(raw)
        except json.JSONDecodeError as exc:
            errors.append(f"{p} is invalid JSON: {exc}")
            continue
        except subprocess.CalledProcessError:
            errors.append(f"Unable to read {p} from PR head.")
            continue
        if not isinstance(config, dict):
            errors.append(f"{p} must be a JSON object.")
            continue
        if not _config_has_image_refs(config):
            errors.append(f"{p} must reference at least one image asset after edits.")
            continue
        errors.extend(
            _title_impersonation_errors(
                inner_folder=folder,
                config=config,
                meta={},
                catalog_title_rows=catalog_title_rows,
                context=f"Metadata PR {p}",
            )
        )

    return errors


def main() -> int:
    if len(sys.argv) != 3:
        print("Usage: validate_theme_pr.py <base_sha> <pr_ref>")
        return 2

    base_sha = sys.argv[1]
    pr_ref = sys.argv[2]

    base_catalog_folders, _base_catalog_names = _load_themes_catalog(base_sha)
    catalog_identity_rows = _load_catalog_identity_rows(base_sha)
    catalog_title_rows = _load_catalog_title_rows(base_sha)
    pending_logical_slugs = _pending_logical_slugs_from_root_zips(base_sha)

    # Compare PR head against the current base tree directly (2-dot),
    # which avoids stale-branch false positives for changes already on base.
    diff = _run("git", "diff", "--name-status", "--no-renames", f"{base_sha}", f"{pr_ref}")
    rows = [line for line in diff.stdout.splitlines() if line.strip()]
    if not rows:
        return _fail(["PR has no file changes."])

    errors: list[str] = []
    manual_review_notes: list[str] = []
    parsed: list[tuple[str, str]] = []
    for row in rows:
        parts = row.split("\t", 1)
        if len(parts) != 2:
            errors.append(f"Malformed diff row: {row}")
            continue
        parsed.append((parts[0].strip(), parts[1].strip()))

    if errors:
        return _fail(errors)

    if parsed and all(s == "M" for s, _ in parsed):
        meta_errs = _validate_metadata_only_pr(
            base_sha, pr_ref, parsed, catalog_title_rows=catalog_title_rows
        )
        if meta_errs:
            return _fail(meta_errs)
        print(
            "Metadata-only validation passed for "
            f"{sum(1 for _, p in parsed if p.endswith('/config.json'))} config.json update(s) "
            f"and themes.json={'yes' if any(p == 'themes.json' for _, p in parsed) else 'no'}."
        )
        print("THEME_PR_AUTO_MERGE_ALLOWED=1")
        return 0

    if any(s != "A" for s, _ in parsed):
        return _fail(
            [
                "Auto-merge supports only (a) all-new files from the gallery ZIP uploader, "
                "or (b) metadata-only PRs where every change is `M` (modified) on themes.json "
                "and/or exactly one ThemeName/config.json — no mixed add/edit/delete."
            ]
        )

    root_added_zips: set[str] = set()
    for status, path in parsed:
        if status != "A":
            continue
        if THEMES_PREFIX and not path.startswith(THEMES_PREFIX):
            continue
        rel = path[len(THEMES_PREFIX) :] if THEMES_PREFIX else path
        if _is_zip_file(path) and "/" not in rel:
            root_added_zips.add(path)

    folder_state: dict[str, dict[str, Any]] = {}
    zip_paths: list[str] = []
    existing_folder_blocked: set[str] = set()
    for row in parsed:
        status, path = row

        if status != "A":
            errors.append(f"Only added files are allowed. Found {status} on {path}.")
            continue

        if THEMES_PREFIX:
            if not path.startswith(THEMES_PREFIX):
                errors.append(f"Changes must be under {THEMES_PREFIX}: {path}")
                continue

        if _is_zip_file(path):
            rel_zip = path[len(THEMES_PREFIX) :] if THEMES_PREFIX else path
            if "/" in rel_zip:
                errors.append(
                    f"Zip submissions must be at repository root (single path segment): {path}"
                )
                continue
            zip_paths.append(path)
            continue

        rest = path[len(THEMES_PREFIX) :] if THEMES_PREFIX else path
        if "/" not in rest:
            lower = rest.lower()
            if lower.endswith(".zip.meta.json"):
                zip_peer = path[: -len(".meta.json")]
                if zip_peer in root_added_zips:
                    continue
                errors.append(
                    f"Upload metadata sidecar {path!r} must accompany the same PR's zip "
                    f"(expected paired zip {zip_peer!r})."
                )
                continue
            if lower == "config.json":
                errors.append(
                    "Root-level config.json is not a valid theme submission. "
                    "Use ThemeName/config.json inside a new folder, or submit a .zip from the gallery uploader."
                )
                continue
            if _is_blocked_file(rest):
                errors.append(f"Blocked file type at repository root: {path!r}")
                continue
            # Ignore other stray single-segment additions (e.g. OS metadata next to a root zip).
            continue

        theme_name, rel_path = rest.split("/", 1)
        if theme_name.startswith(".") or theme_name in RESERVED_ROOT_SEGMENTS:
            errors.append(f"Changes under {theme_name}/ are not allowed for auto-merge.")
            continue

        composite = f"{THEMES_PREFIX}{theme_name}" if THEMES_PREFIX else theme_name
        if _folder_exists_in_base(base_sha, composite):
            if composite not in existing_folder_blocked:
                manual_review_notes.append(
                    f"Additive files under existing folder {composite}/ require maintainer merge "
                    "(theme update, variant assets, or edit — automatic merge is only for brand-new theme folders)."
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

    seen_pr_logical: set[str] = set()
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
            continue

        errors.extend(
            _catalog_collisions(
                base_catalog_folders,
                folder=composite,
                config=config,
            )
        )
        errors.extend(
            _title_impersonation_errors(
                inner_folder=composite,
                config=config,
                meta={},
                catalog_title_rows=catalog_title_rows,
                context=f"Added folder {composite}",
            )
        )
        id_errs, id_manual = _identity_policy_assess(
            base_sha=base_sha,
            inner_folder=composite,
            config=config,
            meta={},
            catalog_rows=catalog_identity_rows,
            pending_logical_slugs=pending_logical_slugs,
            context=f"Added folder {composite}",
        )
        errors.extend(id_errs)
        manual_review_notes.extend(id_manual)
        logical = logical_theme_slug(composite)
        if logical in seen_pr_logical:
            errors.append(
                f"PR defines multiple added theme folders with the same logical identity: {composite!r}. "
                "Use a unique folder name (or author suffix) per theme."
            )
        else:
            seen_pr_logical.add(logical)

    seen_pr_zip_logical: set[str] = set()
    seen_pr_zip_dest: set[str] = set()
    for path in zip_paths:
        try:
            blob = _git_blob_bytes(f"{pr_ref}:{path}")
        except subprocess.CalledProcessError:
            errors.append(f"Unable to read zip {path} from PR ref.")
            continue
        zip_errs = _validate_zip_blob(path, blob)
        errors.extend(zip_errs)
        if not zip_errs:
            meta = _read_upload_meta_pr(pr_ref, path)
            stem = PurePosixPath(path).stem
            for inner in _inner_themes_from_zip_blob(blob, zip_stem=stem):
                logical = inner["logical"]
                folder_low = str(inner["folder"]).strip().lower()
                if logical in seen_pr_zip_logical:
                    errors.append(
                        f"ZIP {path}: duplicate logical theme identity in this PR ({inner['folder']!r}). "
                        "Only one ZIP theme per logical name can auto-merge at a time."
                    )
                else:
                    seen_pr_zip_logical.add(logical)
                if folder_low in seen_pr_zip_dest:
                    errors.append(
                        f"ZIP {path}: duplicate extracted folder destination in this PR ({inner['folder']!r}). "
                        "Ensure each ZIP theme extracts to a unique folder."
                    )
                else:
                    seen_pr_zip_dest.add(folder_low)
                if logical in seen_pr_logical:
                    errors.append(
                        f"ZIP {path}: theme {inner['folder']!r} conflicts with another added theme in this PR "
                        "(same logical identity after normalization)."
                    )
                else:
                    seen_pr_logical.add(logical)
                id_errs, id_manual = _identity_policy_assess(
                    base_sha=base_sha,
                    inner_folder=inner["folder"],
                    config=inner["config"],
                    meta=meta,
                    catalog_rows=catalog_identity_rows,
                    pending_logical_slugs=pending_logical_slugs,
                    context=f"ZIP {path}",
                )
                errors.extend(id_errs)
                manual_review_notes.extend(id_manual)
            errors.extend(
                _zip_title_impersonation_scan(
                    blob,
                    meta,
                    catalog_title_rows,
                    path,
                )
            )

    if errors:
        return _fail(errors)

    manual_review_notes = _dedupe_strs(manual_review_notes)
    auto_merge_ok = len(manual_review_notes) == 0
    print(f"THEME_PR_AUTO_MERGE_ALLOWED={'1' if auto_merge_ok else '0'}")
    for note in manual_review_notes:
        print(f"THEME_PR_MANUAL_REVIEW: {note}")

    print(
        f"Validation passed for {len(folder_state)} new theme folder(s)"
        f" and {len(zip_paths)} zip submission(s)."
        + (" Automatic merge is allowed." if auto_merge_ok else " Maintainer review is required before merge.")
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

