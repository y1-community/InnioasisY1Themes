#!/usr/bin/env python3
"""Classify a PR diff for CI: gallery uploader zip-only vs changes that need full metadata sync.

Gallery submissions often add only root-level ``*.zip`` + ``*.zip.meta.json`` before GitHub
Actions extracts inner archives on ``main``. Running ``sync_theme_metadata.py`` on that PR
would rewrite ``themes.json`` / indexes against the pre-extraction tree and fail the
"generated metadata must be committed" sanity check.

Prints a single line to stdout:
  ``zip_only`` — only root zip + optional paired meta; skip full sync + dirty-tree check.
  ``full``     — run sync and require a clean working tree after.
"""

from __future__ import annotations

import subprocess
import sys


def _run(*args: str) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        list(args),
        check=True,
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
    )


def main() -> int:
    if len(sys.argv) != 3:
        print("Usage: is_zip_only_gallery_upload_pr.py <base_sha> <head_sha>", file=sys.stderr)
        return 2
    base, head = sys.argv[1], sys.argv[2]
    diff = _run("git", "diff", "--name-status", "--no-renames", base, head)
    rows = [ln.strip() for ln in diff.stdout.splitlines() if ln.strip()]
    if not rows:
        print("full")
        return 0

    for row in rows:
        parts = row.split("\t", 1)
        if len(parts) != 2:
            print("full")
            return 0
        status, path = parts[0].strip(), parts[1].strip()
        if status != "A":
            print("full")
            return 0
        if "/" in path:
            print("full")
            return 0
        lower = path.lower()
        if lower.endswith(".zip.meta.json"):
            continue
        if lower.endswith(".zip"):
            continue
        print("full")
        return 0

    print("zip_only")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
