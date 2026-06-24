#!/usr/bin/env python3
"""Apply author/metadata corrections from removal PRs that are really attribution fixes."""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path
from typing import Any

SCRIPTS_DIR = Path(__file__).resolve().parent
if str(SCRIPTS_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPTS_DIR))

from classify_removal_request import RemovalKind, classify_removal_pr, parse_corrected_author

REPO_ROOT = Path(__file__).resolve().parents[1]
THEMES_JSON = REPO_ROOT / "themes.json"


def parse_corrected_author(reason: str, requester: str = "") -> str:
    text = str(reason or "")
    for pat in (
        r"originally\s+([A-Za-z0-9_./-]+)",
        r"should\s+be\s+([A-Za-z0-9_./-]+)",
        r"correct\s+author\s+is\s+([A-Za-z0-9_./-]+)",
    ):
        m = re.search(pat, text, re.I)
        if m:
            return m.group(1).strip().strip(".,;")
    req = str(requester or "").strip()
    if req and req.lower() not in {"unknown", "anonymous"}:
        return req
    return ""


def _update_config_author(config_path: Path, author: str) -> bool:
    if not config_path.is_file():
        return False
    data = json.loads(config_path.read_text(encoding="utf-8"))
    if not isinstance(data, dict):
        return False
    changed = False
    for key in ("theme_info", "source_info"):
        block = data.get(key)
        if isinstance(block, dict):
            if block.get("author") != author:
                block["author"] = author
                changed = True
    if changed:
        config_path.write_text(json.dumps(data, indent=4, ensure_ascii=False) + "\n", encoding="utf-8")
    return changed


def apply_author_correction(
    *,
    folder: str,
    corrected_author: str,
    catalog_title: str | None = None,
) -> tuple[bool, str]:
    folder = str(folder or "").strip()
    author = str(corrected_author or "").strip()
    if not folder or not author:
        return False, "Missing folder or corrected author."

    if not THEMES_JSON.is_file():
        return False, "themes.json not found."

    catalog = json.loads(THEMES_JSON.read_text(encoding="utf-8"))
    themes: list[dict[str, Any]] = catalog.get("themes") or []
    row = next((t for t in themes if str(t.get("folder") or "").strip() == folder), None)
    if not row:
        return False, f"Folder {folder!r} not in themes.json."

    changed = False
    if row.get("author") != author:
        row["author"] = author
        changed = True
    title = str(catalog_title or row.get("name") or "").strip()
    if title:
        bits = [title, author, folder]
        desc = str(row.get("description") or "").strip().lower()
        if desc:
            bits.append(desc)
        search = " ".join(bits).lower()
        if row.get("searchText") != search:
            row["searchText"] = search
            changed = True

    config_changed = _update_config_author(REPO_ROOT / folder / "config.json", author)
    if changed:
        THEMES_JSON.write_text(json.dumps(catalog, indent=4, ensure_ascii=False) + "\n", encoding="utf-8")

    if not changed and not config_changed:
        return True, f"Author for {folder} already {author!r}."
    return True, f"Corrected author for {folder} → {author!r} in themes.json and config.json."


def apply_author_dispute_from_pr(title: str, body: str) -> tuple[bool, str]:
    req = classify_removal_pr(title=title, body=body)
    if not req:
        return False, "Could not parse removal PR."
    if req.kind != RemovalKind.AUTHOR_DISPUTE:
        return False, "Not an author/metadata dispute."
    corrected = parse_corrected_author(req.reason, req.requester)
    if not corrected:
        return False, "Could not determine corrected author from reason/requester."
    return apply_author_correction(
        folder=req.folder,
        corrected_author=corrected,
        catalog_title=req.catalog_title,
    )


def main(argv: list[str] | None = None) -> int:
    argv = argv if argv is not None else sys.argv[1:]
    if len(argv) < 2:
        print("Usage: apply_author_correction.py <pr-title> <pr-body-file|->", file=sys.stderr)
        return 2
    title = argv[0]
    body = Path(argv[1]).read_text(encoding="utf-8") if argv[1] != "-" else sys.stdin.read()
    ok, msg = apply_author_dispute_from_pr(title, body)
    print(msg)
    return 0 if ok else 1


if __name__ == "__main__":
    raise SystemExit(main())
