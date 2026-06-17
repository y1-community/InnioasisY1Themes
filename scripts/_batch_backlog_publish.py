#!/usr/bin/env python3
"""Batch helpers for backlog clearance: extract PR zips, upload via gallery worker."""

from __future__ import annotations

import base64
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
import time
import urllib.error
import urllib.request
import zipfile
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
UPLOAD_URL = os.environ.get(
    "THEME_UPLOAD_URL",
    "https://y1-theme-upload.itsryanspecter.workers.dev/api/upload-theme",
)
GH_REPO = "y1-community/InnioasisY1Themes"

# PRs to skip merge (opted-out author uploads)
SKIP_PR_NUMBERS = {233, 234, 235}

# Duplicate groups: keep first (newest), close rest
DUPLICATE_CLOSE = {
    327: 359, 326: 359, 325: 359, 296: 359,
    373: 380, 371: 380, 308: 380,
    409: 410, 408: 410,
    375: 379, 297: 379,
    374: 378, 360: 378,
    398: 399,
    384: 388,
    329: 330,
    273: 280,
    348: 349, 285: 349,
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


def fetch_pr_ref(n: int) -> str:
    ref = f"pr-{n}"
    _run("git", "fetch", "origin", f"pull/{n}/head:{ref}")
    return ref


def root_zips_from_ref(ref: str) -> list[str]:
    out = _run("git", "diff", "--name-only", f"origin/main...{ref}")
    zips = []
    for line in out.stdout.splitlines():
        name = line.strip()
        if re.fullmatch(r"[^/]+\.zip", name, re.I):
            zips.append(name)
    return zips


def extract_zip_from_ref(ref: str, zip_name: str, dest: Path) -> Path:
    dest.mkdir(parents=True, exist_ok=True)
    out_path = dest / zip_name
    with open(out_path, "wb") as fh:
        subprocess.run(
            ["git", "show", f"{ref}:{zip_name}"],
            check=True,
            stdout=fh,
        )
    return out_path


def upload_zip(zip_path: Path, title: str, author: str, hints: list[str] | None = None) -> dict:
    import mimetypes

    boundary = f"----batch{int(time.time() * 1000)}"
    body = bytearray()
    for key, val in [
        ("themeTitle", title),
        ("themeAuthor", author),
        ("uploaderName", author),
    ]:
        body.extend(f"--{boundary}\r\n".encode())
        body.extend(f'Content-Disposition: form-data; name="{key}"\r\n\r\n'.encode())
        body.extend(f"{val}\r\n".encode())
    if hints:
        body.extend(f"--{boundary}\r\n".encode())
        body.extend(b'Content-Disposition: form-data; name="shareFolderHints"\r\n\r\n')
        body.extend(json.dumps(hints).encode())
        body.extend(b"\r\n")
    data = zip_path.read_bytes()
    body.extend(f"--{boundary}\r\n".encode())
    body.extend(
        f'Content-Disposition: form-data; name="zip"; filename="{zip_path.name}"\r\n'.encode()
    )
    body.extend(f"Content-Type: {mimetypes.guess_type(zip_path.name)[0] or 'application/zip'}\r\n\r\n".encode())
    body.extend(data)
    body.extend(f"\r\n--{boundary}--\r\n".encode())
    req = urllib.request.Request(
        UPLOAD_URL,
        data=bytes(body),
        headers={
            "Content-Type": f"multipart/form-data; boundary={boundary}",
            "User-Agent": "y1-theme-upload/1.0 (+https://github.com/y1-community/InnioasisY1Themes)",
        },
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=120) as resp:
        return json.loads(resp.read().decode())


def upload_direct_files(files: list[tuple[str, Path]], title: str, author: str) -> dict:
    payload = []
    for path, src in files:
        payload.append(
            {
                "path": path,
                "contentBase64": base64.b64encode(src.read_bytes()).decode(),
            }
        )
    boundary = f"----batch{int(time.time() * 1000)}"
    body = bytearray()
    for key, val in [
        ("themeTitle", title),
        ("themeAuthor", author),
        ("uploaderName", author),
        ("directFilesJson", json.dumps(payload)),
    ]:
        body.extend(f"--{boundary}\r\n".encode())
        body.extend(f'Content-Disposition: form-data; name="{key}"\r\n\r\n'.encode())
        body.extend(f"{val}\r\n".encode())
    body.extend(f"--{boundary}--\r\n".encode())
    req = urllib.request.Request(
        UPLOAD_URL,
        data=bytes(body),
        headers={
            "Content-Type": f"multipart/form-data; boundary={boundary}",
            "User-Agent": "y1-theme-upload/1.0 (+https://github.com/y1-community/InnioasisY1Themes)",
        },
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=120) as resp:
        return json.loads(resp.read().decode())


def parse_pr_title(title: str) -> tuple[str, str]:
    if " — " in title:
        a, b = title.split(" — ", 1)
        return a.strip(), b.strip()
    return title.strip(), "maintainer"


def list_open_theme_prs() -> list[dict]:
    token = os.environ.get("GH_TOKEN", "")
    if not token:
        raise SystemExit("GH_TOKEN required")
    out = _run(
        "gh", "pr", "list", "--repo", GH_REPO, "--state", "open", "--limit", "500",
        "--json", "number,title",
    )
    prs = json.loads(out.stdout)
    return [p for p in prs if not str(p["title"]).startswith("[")]


def copy_zips_to_repo_root(zips: list[Path]) -> None:
    for z in zips:
        shutil.copy2(z, REPO_ROOT / z.name)


def main() -> int:
    cmd = sys.argv[1] if len(sys.argv) > 1 else "help"
    if cmd == "extract-pr-zips":
        nums = [int(x) for x in sys.argv[2:]] if len(sys.argv) > 2 else []
        if not nums:
            prs = list_open_theme_prs()
            nums = [
                p["number"] for p in prs
                if p["number"] not in DUPLICATE_CLOSE and p["number"] not in SKIP_PR_NUMBERS
            ]
        staging = Path(tempfile.mkdtemp(prefix="theme-pr-zips-"))
        copied: list[str] = []
        for n in nums:
            ref = fetch_pr_ref(n)
            for zip_name in root_zips_from_ref(ref):
                zp = extract_zip_from_ref(ref, zip_name, staging)
                shutil.copy2(zp, REPO_ROOT / zip_name)
                copied.append(zip_name)
                print(f"PR #{n}: copied {zip_name}")
        print(f"Copied {len(copied)} zip(s) to repo root")
        return 0
    if cmd == "upload-zip":
        zip_path = Path(sys.argv[2])
        title, author = parse_pr_title(sys.argv[3]) if len(sys.argv) > 3 else ("Theme", "maintainer")
        result = upload_zip(zip_path, title, author)
        print(json.dumps(result, indent=2))
        return 0
    if cmd == "upload-direct":
        title, author = sys.argv[2], sys.argv[3]
        files = [(sys.argv[i], Path(sys.argv[i + 1])) for i in range(4, len(sys.argv), 2)]
        result = upload_direct_files(files, title, author)
        print(json.dumps(result, indent=2))
        return 0
    print("Usage: batch_backlog_publish.py extract-pr-zips [pr numbers...]")
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
