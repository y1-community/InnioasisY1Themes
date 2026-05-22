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


def _author_set(items: Any) -> set[str]:
    out: set[str] = set()
    if not isinstance(items, list):
        return out
    for item in items:
        n = norm_author(str(item) if item is not None else "")
        if n:
            out.add(n)
    return out


def _slug_set(items: Any) -> set[str]:
    out: set[str] = set()
    if not isinstance(items, list):
        return out
    for item in items:
        n = norm_slug(str(item) if item is not None else "")
        if n:
            out.add(n)
    return out


def _fabform_set(items: Any) -> set[str]:
    out: set[str] = set()
    if not isinstance(items, list):
        return out
    for item in items:
        n = norm_fabform_id(str(item) if item is not None else "")
        if n:
            out.add(n)
    return out


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


def listing_hidden(
    *,
    author: str | None = None,
    uploader_slug: str | None = None,
    fabform_form_id: str | None = None,
    fabform_submission_id: str | None = None,
    catalog_entry: dict[str, Any] | None = None,
) -> tuple[bool, str]:
    auth = norm_author(author)
    if not auth and catalog_entry:
        auth = norm_author(author_from_catalog_entry(catalog_entry))
    slug = norm_slug(uploader_slug)
    form_id = norm_fabform_id(fabform_form_id)
    sub_id = norm_fabform_id(fabform_submission_id)

    opt_authors = _author_set(_opt_out().get("authors"))
    block_authors = _author_set(_block().get("authors"))
    block_slugs = _slug_set(_block().get("uploaderSlugs"))
    block_fab = _fabform_set(_block().get("fabformFormIds"))

    if auth and auth in opt_authors:
        return True, "opt_out"
    if auth and auth in block_authors:
        return True, "block"
    if slug and slug in block_slugs:
        return True, "block"
    if form_id and form_id in block_fab:
        return True, "block"
    if sub_id and sub_id in block_fab:
        return True, "block"
    return False, ""


def theme_is_publicly_listed(entry: dict[str, Any]) -> bool:
    hidden, _ = listing_hidden(catalog_entry=entry)
    return not hidden


def reload_policies() -> None:
    global _opt_out_cache, _block_cache
    _opt_out_cache = None
    _block_cache = None
