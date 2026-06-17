#!/usr/bin/env python3
"""Import theme folders from a GitHub repo via Contents API."""

from __future__ import annotations

import base64
import json
import os
import subprocess
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
TOKEN = os.environ.get("GH_TOKEN", "")


def gh_get(url: str) -> object:
    req = urllib.request.Request(
        url,
        headers={
            "Authorization": f"Bearer {TOKEN}",
            "Accept": "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
        },
    )
    with urllib.request.urlopen(req, timeout=60) as resp:
        return json.load(resp)


def download_tree(owner: str, repo: str, path: str, dest: Path) -> None:
    enc = urllib.parse.quote(path, safe="")
    url = f"https://api.github.com/repos/{owner}/{repo}/contents/{enc}?ref=main"
    data = gh_get(url)
    if isinstance(data, dict) and data.get("type") == "file":
        dest.parent.mkdir(parents=True, exist_ok=True)
        content = data.get("content", "")
        dest.write_bytes(base64.b64decode(content))
        return
    if not isinstance(data, list):
        return
    for item in data:
        name = item.get("name", "")
        item_path = f"{path}/{name}" if path else name
        item_type = item.get("type")
        if item_type == "dir":
            download_tree(owner, repo, item_path, dest / name)
        elif item_type == "file":
            dest.parent.mkdir(parents=True, exist_ok=True)
            if item.get("download_url"):
                req = urllib.request.Request(
                    item["download_url"],
                    headers={"Authorization": f"Bearer {TOKEN}"},
                )
                with urllib.request.urlopen(req, timeout=120) as resp:
                    (dest.parent / name).write_bytes(resp.read())
            else:
                download_tree(owner, repo, item_path, dest.parent / name)
        time.sleep(0.05)


def backfill_author(folder: Path, author: str) -> None:
    cfg_path = folder / "config.json"
    if not cfg_path.is_file():
        return
    cfg = json.loads(cfg_path.read_text(encoding="utf-8"))
    info = cfg.setdefault("theme_info", {})
    if not str(info.get("author", "")).strip():
        info["author"] = author
    if not str(info.get("authorUrl", "")).strip():
        info["authorUrl"] = f"https://github.com/{author}"
    cfg_path.write_text(json.dumps(cfg, indent=4, ensure_ascii=False) + "\n", encoding="utf-8")


def main() -> int:
    if len(sys.argv) < 4:
        print("Usage: import_theme_folder.py <owner> <repo> <folder> [author]")
        return 2
    owner, repo, folder = sys.argv[1], sys.argv[2], sys.argv[3]
    author = sys.argv[4] if len(sys.argv) > 4 else owner
    dest = REPO_ROOT / folder
    if dest.exists():
        print(f"Skip existing {folder}")
        return 0
    print(f"Importing {owner}/{repo}/{folder} -> {dest}")
    download_tree(owner, repo, folder, dest)
    backfill_author(dest, author)
    print(f"Done {folder}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
