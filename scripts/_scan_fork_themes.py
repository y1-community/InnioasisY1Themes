#!/usr/bin/env python3
"""Scan forks for theme folders missing from local repo and import them."""

from __future__ import annotations

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
UPSTREAM = "y1-community/InnioasisY1Themes"
TOKEN = os.environ.get("GH_TOKEN", "")
SKIP_DIRS = {
    "scripts", "functions", "workers", "creators", ".github", ".vscode",
    "assets", "node_modules", "themes",
}
SKIP_FILES = {
    "LICENSE", "CNAME", "themes.json", "opt_out.json", "block.json", "sitemap.xml",
}


def gh_paginate(url: str) -> list:
    items = []
    while url:
        req = urllib.request.Request(
            url,
            headers={
                "Authorization": f"Bearer {TOKEN}",
                "Accept": "application/vnd.github+json",
                "X-GitHub-Api-Version": "2022-11-28",
            },
        )
        with urllib.request.urlopen(req, timeout=60) as resp:
            chunk = json.load(resp)
            items.extend(chunk)
            link = resp.headers.get("Link", "")
            url = None
            for part in link.split(","):
                if 'rel="next"' in part:
                    url = part[part.find("<") + 1 : part.find(">")]
                    break
        time.sleep(0.1)
    return items


def local_theme_folders() -> set[str]:
    out = set()
    for p in REPO_ROOT.iterdir():
        if p.is_dir() and (p / "config.json").is_file():
            out.add(p.name)
    return out


def fork_theme_folders(owner: str, repo: str) -> list[str]:
    url = f"https://api.github.com/repos/{owner}/{repo}/contents?per_page=100"
    try:
        req = urllib.request.Request(
            url,
            headers={
                "Authorization": f"Bearer {TOKEN}",
                "Accept": "application/vnd.github+json",
            },
        )
        with urllib.request.urlopen(req, timeout=30) as resp:
            data = json.load(resp)
    except urllib.error.HTTPError:
        return []
    if not isinstance(data, list):
        return []
    themes = []
    for item in data:
        name = item.get("name", "")
        if item.get("type") != "dir" or name in SKIP_DIRS or name.startswith("."):
            continue
        if name in SKIP_FILES:
            continue
        enc = urllib.parse.quote(name, safe="")
        cfg_url = f"https://api.github.com/repos/{owner}/{repo}/contents/{enc}/config.json"
        try:
            req = urllib.request.Request(
                cfg_url,
                headers={"Authorization": f"Bearer {TOKEN}", "Accept": "application/vnd.github+json"},
            )
            with urllib.request.urlopen(req, timeout=20) as resp:
                if resp.status == 200:
                    themes.append(name)
        except urllib.error.HTTPError:
            pass
        time.sleep(0.05)
    return themes


def main() -> int:
    local = local_theme_folders()
    max_forks = int(os.environ.get("FORK_SCAN_MAX", "40"))
    forks = gh_paginate(f"https://api.github.com/repos/{UPSTREAM}/forks?per_page=100")[:max_forks]
    missing: dict[str, str] = {}
    for fork in forks:
        owner = fork["owner"]["login"]
        repo = fork["name"]
        if owner == "y1-community":
            continue
        for folder in fork_theme_folders(owner, repo):
            if folder not in local and folder not in missing:
                missing[folder] = owner
        time.sleep(0.15)
    print(json.dumps(missing, indent=2))
    print(f"Found {len(missing)} unique missing theme(s) across {len(forks)} fork(s)")
    if "--import" in sys.argv:
        import_script = REPO_ROOT / "scripts" / "_import_theme_folder.py"
        for folder, owner in sorted(missing.items()):
            print(f"Importing {folder} from {owner}")
            subprocess.run(
                [sys.executable, str(import_script), owner, "InnioasisY1Themes", folder, owner],
                check=False,
            )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
