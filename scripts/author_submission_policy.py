#!/usr/bin/env python3
"""Load opt_out.json / block.json and decide public gallery visibility."""

from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Any

REPO_ROOT = Path(__file__).resolve().parents[1]
OPT_OUT_PATH = REPO_ROOT / "opt_out.json"
BLOCK_PATH = REPO_ROOT / "block.json"

DEFAULT_BLOCK_REASON = "abuse or repeated low-quality submissions"

_opt_out_cache: dict[str, Any] | None = None
_block_cache: dict[str, Any] | None = None


def _load_json(path: Path) -> dict[str, Any]:
    if not path.is_file():
        return {}
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
        return data if isinstance(data, dict) else {}
    except (OSError, json.JSONDecodeError):
        return {}


def _opt_out() -> dict[str, Any]:
    global _opt_out_cache
    if _opt_out_cache is None:
        _opt_out_cache = _load_json(OPT_OUT_PATH)
    return _opt_out_cache


def _block() -> dict[str, Any]:
    global _block_cache
    if _block_cache is None:
        _block_cache = _load_json(BLOCK_PATH)
    return _block_cache


def norm_author(value: str | None) -> str:
    if not value or not str(value).strip():
        return ""
    s = " ".join(str(value).strip().lower().split())
    if s.startswith("u/"):
        s = s[2:].strip()
    return s


def norm_slug(value: str | None) -> str:
    s = (value or "").strip().lower()
    s = re.sub(r"^u/", "", s, flags=re.I)
    s = re.sub(r"[^a-z0-9]+", "-", s).strip("-")
    return s[:40]


def norm_fabform_id(value: str | None) -> str:
    return str(value or "").strip()


def _reason_map(items: Any, norm_fn) -> dict[str, str]:
    """Normalize keys; values are ban/opt-out reason strings."""
    out: dict[str, str] = {}
    if isinstance(items, dict):
        for key, val in items.items():
            nk = norm_fn(str(key))
            if not nk:
                continue
            out[nk] = str(val).strip() if val is not None else ""
        return out
    if not isinstance(items, list):
        return out
    for item in items:
        if item is None:
            continue
        if isinstance(item, dict):
            key = item.get("author") or item.get("id") or item.get("slug") or item.get("formId")
            reason = str(item.get("reason") or "").strip()
            nk = norm_fn(str(key) if key is not None else "")
            if nk:
                out[nk] = reason
            continue
        nk = norm_fn(str(item))
        if nk:
            out.setdefault(nk, "")
    return out


def _lookup_reason(reason_map: dict[str, str], normalized_key: str) -> str | None:
    if not normalized_key or normalized_key not in reason_map:
        return None
    return reason_map[normalized_key]


def author_from_catalog_entry(entry: dict[str, Any]) -> str:
    author = str(entry.get("author") or "").strip()
    if author:
        return author
    raw = entry.get("rawConfig")
    if isinstance(raw, dict):
        for key in ("theme_info", "source_info"):
            block = raw.get(key)
            if isinstance(block, dict):
                a = str(block.get("author") or "").strip()
                if a:
                    return a
    return ""


def banned_author_attempt_notify_fabform_id() -> str:
    """Fabform form id for emailing maintainers when a banned author tries to upload."""
    data = _block()
    raw = data.get("bannedAuthorAttemptNotifyFabformId") or data.get(
        "bannedAuthorAttemptNotifyFabform"
    )
    return norm_fabform_id(str(raw) if raw is not None else "")


def listing_hidden(
    *,
    author: str | None = None,
    folder: str | None = None,
    uploader_slug: str | None = None,
    catalog_entry: dict[str, Any] | None = None,
) -> tuple[bool, str, str]:
    """Returns (hidden, kind, detail_reason)."""
    auth = norm_author(author)
    if not auth and catalog_entry:
        auth = norm_author(author_from_catalog_entry(catalog_entry))
    folder_key = str(folder or (catalog_entry or {}).get("folder") or "").strip()
    slug = norm_slug(uploader_slug)

    opt_authors = _reason_map(_opt_out().get("authors"), norm_author)
    opt_folders = _reason_map(_opt_out().get("folders"), lambda v: str(v or "").strip())
    block_authors = _reason_map(_block().get("authors"), norm_author)
    block_slugs = _reason_map(_block().get("uploaderSlugs"), norm_slug)

    if folder_key and folder_key in opt_folders:
        return True, "opt_out", _lookup_reason(opt_folders, folder_key) or ""
    if auth and auth in opt_authors:
        return True, "opt_out", _lookup_reason(opt_authors, auth) or ""
    if auth and auth in block_authors:
        detail = _lookup_reason(block_authors, auth) or DEFAULT_BLOCK_REASON
        return True, "block", detail
    if slug and slug in block_slugs:
        detail = _lookup_reason(block_slugs, slug) or DEFAULT_BLOCK_REASON
        return True, "block", detail
    return False, "", ""


def theme_is_publicly_listed(entry: dict[str, Any]) -> bool:
    hidden, _, _ = listing_hidden(catalog_entry=entry)
    return not hidden


def reload_policies() -> None:
    global _opt_out_cache, _block_cache
    _opt_out_cache = None
    _block_cache = None
