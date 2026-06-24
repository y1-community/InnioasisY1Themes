#!/usr/bin/env python3
"""Apply removal requests by updating opt_out.json / block.json (archive, do not delete)."""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

SCRIPTS_DIR = Path(__file__).resolve().parent
if str(SCRIPTS_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPTS_DIR))

from classify_removal_request import RemovalKind, classify_removal_pr

REPO_ROOT = Path(__file__).resolve().parents[1]
OPT_OUT_PATH = REPO_ROOT / "opt_out.json"
BLOCK_PATH = REPO_ROOT / "block.json"


def _load_json(path: Path) -> dict:
    if not path.is_file():
        return {}
    data = json.loads(path.read_text(encoding="utf-8"))
    return data if isinstance(data, dict) else {}


def _save_json(path: Path, data: dict) -> None:
    path.write_text(json.dumps(data, indent=4, ensure_ascii=False) + "\n", encoding="utf-8")


def _norm_author_key(author: str) -> str:
    s = " ".join(str(author or "").strip().split()).lower()
    if s.startswith("u/"):
        s = s[2:].strip()
    return s


def apply_removal(req, *, dry_run: bool = False) -> tuple[bool, str]:
    if req.kind == RemovalKind.UPLOAD_RETRY:
        return True, (
            "Upload/replace request — not a gallery removal. "
            "Theme update PRs are merged separately; no opt-out applied."
        )

    if req.kind == RemovalKind.AUTHOR_DISPUTE:
        return False, (
            "Author/metadata dispute — not a gallery removal. "
            "Use a metadata update PR to correct author attribution instead of deleting the theme."
        )

    opt = _load_json(OPT_OUT_PATH)
    block = _load_json(BLOCK_PATH)
    opt.setdefault("version", 2)
    block.setdefault("version", 2)
    opt_authors = opt.setdefault("authors", {})
    opt_folders = opt.setdefault("folders", {})
    block_authors = block.setdefault("authors", {})

    changed = False
    reason = req.reason or "Author requested removal from the public gallery."

    if req.opt_out_folder and req.folder and req.folder not in opt_folders:
        opt_folders[req.folder] = reason
        changed = True

    author = req.catalog_author.strip()
    if req.opt_out_author and author and req.kind == RemovalKind.GALLERY_OPT_OUT:
        for key in {author, _norm_author_key(author)}:
            if key and key not in opt_authors:
                opt_authors[key] = reason
                changed = True

    if req.blacklist_requested and author and req.kind == RemovalKind.GALLERY_OPT_OUT:
        for key in {author, _norm_author_key(author)}:
            if key and key not in block_authors:
                block_authors[key] = "Author requested removal and block on re-upload."
                changed = True

    if not changed:
        return True, "Already applied (no policy file changes needed)."

    if dry_run:
        return True, "Dry run: would update opt_out.json / block.json."

    _save_json(OPT_OUT_PATH, opt)
    _save_json(BLOCK_PATH, block)
    return True, "Updated opt_out.json / block.json (theme files remain archived in the repo)."


def parse_pr_markdown(title: str, body: str) -> tuple[bool, str]:
    if not str(title or "").strip().lower().startswith("[removal]"):
        return False, "Not a removal PR."
    req = classify_removal_pr(title=title, body=body)
    if not req:
        return False, "Could not parse removal request body."
    ok, msg = apply_removal(req)
    return ok, msg


def main(argv: list[str] | None = None) -> int:
    argv = argv if argv is not None else sys.argv[1:]
    if len(argv) < 2:
        print("Usage: apply_removal_opt_out.py <pr-title> <pr-body-file|->", file=sys.stderr)
        return 2
    title = argv[0]
    if argv[1] == "-":
        body = sys.stdin.read()
    else:
        body = Path(argv[1]).read_text(encoding="utf-8")
    ok, msg = parse_pr_markdown(title, body)
    print(msg)
    return 0 if ok else 1


if __name__ == "__main__":
    raise SystemExit(main())
