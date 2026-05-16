#!/usr/bin/env python3
"""Shared ZIP theme discovery and noise filtering for validate_theme_pr and process_theme_zips.

Ignored entries are skipped for theme detection, image presence, and inner-folder collision
checks. They are still subject to path-safety checks in the caller before filtering.
Allowed ``index.html`` locations inside a theme folder are the theme root and
``Variants/<look>/index.html`` (any depth shell under ``Variants/`` ending in ``index.html``).
"""

from __future__ import annotations

import re
from pathlib import Path, PurePosixPath

IMAGE_EXTENSIONS = {".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg"}

# Leading path segments treated as non-theme archive noise (case-sensitive paths in zips).
_NOISE_PREFIXES = (
    "__MACOSX/",
    ".git/",
)

_NOISE_BASENAMES_LOWER = frozenset(
    {
        ".ds_store",
        "thumbs.db",
        "desktop.ini",
        "._.ds_store",
    }
)

_TIMESTAMP_PREFIX_RE = re.compile(r"^\d{6,}[-_ ]+")


def looks_like_image(path_or_value: str) -> bool:
    suffix = Path(path_or_value.split("?", 1)[0].split("#", 1)[0]).suffix.lower()
    return suffix in IMAGE_EXTENSIONS


def is_noise_zip_entry(name: str) -> bool:
    """True if this member is OS / tooling noise and should be ignored for theme logic."""
    if not name or name.endswith("/"):
        return True
    low = name.lower()
    for pfx in _NOISE_PREFIXES:
        if low.startswith(pfx.lower()):
            return True
    base = PurePosixPath(name).name.lower()
    if base in _NOISE_BASENAMES_LOWER:
        return True
    return False


def filter_zip_names_for_theme_logic(names: list[str]) -> list[str]:
    return [n for n in names if not is_noise_zip_entry(n)]


def zip_theme_keys(entry_names: list[str]) -> list[str]:
    """Return theme key for each config.json: '.' = zip root, else parent path as stored."""
    keys: list[str] = []
    for name in entry_names:
        path = PurePosixPath(name)
        if path.name != "config.json":
            continue
        parent = str(path.parent)
        keys.append("." if parent in {"", "."} else parent)
    return keys


def collapse_redundant_root_theme_key(
    entry_names: list[str], theme_keys: list[str], zip_stem: str
) -> list[str]:
    """Drop a spurious zip-root ``.`` theme when it duplicates the only subfolder theme.

    Upload tooling can produce ``Musica_Metro.zip`` containing both ``config.json`` (root) and
    ``Musica_Metro/config.json``. That is one catalog theme (the folder); the root config is
    redundant. Without collapsing, :func:`zip_inner_folder_collision_errors` rejects the archive
    because the root theme would extract to the same folder name as the subfolder key.

    Archives may also include ``Musica_Metro/Variants/.../config.json`` under that same folder.
    Those paths are allowed here: every key must be ``.``, the lone stem-matching folder, or a
    strict descendant ``lone/...`` (so ``Musica_Metro_evil`` does not match ``Musica_Metro/``).

    Root-level files besides ``config.json`` (e.g. stray PNGs) no longer block this collapse:
    the subfolder matching the archive stem is treated as the single source of truth.
    """
    keys = list(theme_keys)
    if "." not in keys:
        return keys
    stem = _TIMESTAMP_PREFIX_RE.sub("", str(zip_stem or "").strip(), count=1).strip() or str(zip_stem or "").strip()
    if not stem:
        return keys
    stem_l = stem.lower()
    matching = [k for k in keys if k != "." and PurePosixPath(k).name.lower() == stem_l]
    if len(matching) != 1:
        return keys
    lone = matching[0]
    lone_prefix = lone + "/"

    def _under_lone_tree(k: str) -> bool:
        if k in (".", lone):
            return True
        return k.startswith(lone_prefix)

    if any(not _under_lone_tree(k) for k in keys):
        return keys
    root_level = [n for n in entry_names if "/" not in n and n.strip()]
    root_basenames = {PurePosixPath(n).name.lower() for n in root_level}
    if "config.json" not in root_basenames:
        return keys
    # Do not require the root to contain *only* config.json — real uploads often add loose
    # files at the zip root (extra PNGs, notes). The subfolder ``lone/`` is the canonical tree.
    return [k for k in keys if k != "."]


def drop_variant_keys_under_parent_theme(theme_keys: list[str]) -> list[str]:
    """Remove ``Root/Variants/...`` keys when ``Root`` is already a single-segment theme key.

    Variant ``config.json`` files live under the main catalog folder; they must not be treated
    as separate top-level extract targets (which would map only the last path segment).
    """
    roots = {k for k in theme_keys if k != "." and "/" not in k}
    out: list[str] = []
    for k in theme_keys:
        if "/" in k and any(k.startswith(r + "/Variants/") for r in roots):
            continue
        out.append(k)
    return out


def zip_other_theme_prefixes(theme_keys: list[str], theme_key: str) -> list[str]:
    return [f"{k}/" for k in theme_keys if k != theme_key]


def zip_has_image_file(
    entry_names: list[str], theme_key: str, *, theme_keys: list[str]
) -> bool:
    if theme_key == ".":
        block = zip_other_theme_prefixes(theme_keys, ".")
        for name in entry_names:
            if any(name.startswith(p) for p in block):
                continue
            if looks_like_image(name):
                return True
        return False

    prefix = f"{theme_key}/"
    for name in entry_names:
        if not name.startswith(prefix):
            continue
        rel = name[len(prefix) :]
        if not rel:
            continue
        if looks_like_image(rel):
            return True
    return False


def inner_folder_names_for_zip(theme_keys: list[str], zip_stem: str) -> list[str]:
    """Repo folder names after extraction (zip root theme uses cleaned zip_stem)."""
    stem = _TIMESTAMP_PREFIX_RE.sub("", str(zip_stem or "").strip(), count=1).strip()
    if not stem:
        stem = str(zip_stem or "").strip()
    out: list[str] = []
    for k in theme_keys:
        if k == ".":
            out.append(stem)
        else:
            out.append(PurePosixPath(k).name)
    return out


def zip_inner_folder_collision_errors(
    theme_keys: list[str], zip_stem: str, *, zip_label: str
) -> list[str]:
    """Errors when root theme destination collides with a subfolder theme name."""
    errors: list[str] = []
    stem = _TIMESTAMP_PREFIX_RE.sub("", str(zip_stem or "").strip(), count=1).strip()
    if not stem:
        stem = str(zip_stem or "").strip()
    if not stem:
        return errors
    stem_l = stem.lower()
    # A lone subfolder theme ``MyTheme/config.json`` inside ``MyTheme.zip`` is normal; the zip
    # stem matches the folder name but there is no zip-root (``.``) theme competing for the same
    # destination. Only flag stem == subfolder basename when a root ``config.json`` theme exists.
    if "." in theme_keys:
        for k in theme_keys:
            if k == ".":
                continue
            base = PurePosixPath(k).name
            if base.lower() == stem_l:
                errors.append(
                    f"{zip_label}: zip root theme would extract to folder {stem!r}, which "
                    f"collides with subfolder theme {k!r}. Rename the archive or the inner folder."
                )
    targets = inner_folder_names_for_zip(theme_keys, zip_stem)
    if len(targets) != len(set(t.lower() for t in targets)):
        errors.append(
            f"{zip_label}: multiple themes map to the same destination folder name "
            f"(after normalizing case). Each theme must extract to a unique folder."
        )
    return errors


def root_theme_bundle_zip_entries(entry_names: list[str]) -> list[str] | None:
    """Return sorted member paths if the archive is a *zip-only bundle* (ingest / uploader batch).

    Every noise-filtered entry must be a normal file whose path ends in ``.zip``. Members may
    sit at the archive root (``a.zip``) or under folders (``export/MyTheme.zip``); this matches
    nested batch layouts from OS “compress folder” flows and tolerates extra directory depth
    without breaking identification (still not a theme tree until inner zips are opened).

    ``entry_names`` must already be noise-filtered.
    """
    if not entry_names:
        return None
    inner: list[str] = []
    for name in entry_names:
        path = PurePosixPath(name)
        if name.endswith("/"):
            return None
        if path.suffix.lower() != ".zip":
            return None
        inner.append(name)
    return sorted(inner, key=lambda s: s.lower())


def allowed_theme_index_html_relpath(rel: PurePosixPath) -> bool:
    """Whether ``rel`` is an allowed ``index.html`` path inside a single theme folder.

    Allowed:
    - ``index.html`` at the theme root.
    - ``Variants/<look>/index.html`` or deeper (``Variants/<look>/<subfolder>/.../index.html``).
    """
    if rel.name.lower() != "index.html":
        return False
    parts = rel.parts
    if len(parts) == 1:
        return True
    if parts[0].lower() != "variants":
        return False
    # Variants/<look>/index.html (3 parts minimum) — not bare ``Variants/index.html``.
    return len(parts) >= 3


def is_allowed_theme_index_html_zip_member(name: str, theme_keys: list[str]) -> bool:
    """True when ``name`` is an allowed ``index.html`` under one of ``theme_keys``."""
    norm = (name or "").strip().replace("\\", "/")
    if not norm:
        return False
    pl = PurePosixPath(norm)
    if pl.name.lower() != "index.html":
        return False
    low = norm.lower()
    for key in theme_keys:
        if key == ".":
            if allowed_theme_index_html_relpath(pl):
                return True
        else:
            pref = (key + "/").lower()
            if not low.startswith(pref):
                continue
            suffix = norm[len(key) + 1 :].lstrip("/")
            if not suffix:
                continue
            if allowed_theme_index_html_relpath(PurePosixPath(suffix)):
                return True
    return False


def disallowed_theme_markup_zip_members(names: list[str], theme_keys: list[str]) -> list[str]:
    """``.htm`` / stray ``.html`` entries that are not an allowed theme ``index.html`` shell path."""
    out: list[str] = []
    for name in names:
        suf = PurePosixPath(name).suffix.lower()
        if suf not in {".html", ".htm"}:
            continue
        if is_allowed_theme_index_html_zip_member(name, theme_keys):
            continue
        out.append(name)
    return out


def theme_index_shell_rel_parts_ok(rel: PurePosixPath) -> bool:
    """Whether ``rel`` (path inside a theme folder) is an allowed ``index.html`` location."""
    return allowed_theme_index_html_relpath(rel)


def theme_html_zip_member_should_skip_extract(rel: str) -> bool:
    """Skip ``.htm`` and any ``.html`` that is not an allowed theme ``index.html`` path."""
    p = PurePosixPath((rel or "").strip().replace("\\", "/"))
    suf = p.suffix.lower()
    if suf not in {".html", ".htm"}:
        return False
    if suf == ".htm":
        return True
    return not theme_index_shell_rel_parts_ok(p)
