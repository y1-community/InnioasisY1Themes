#!/usr/bin/env python3
"""Remove root gitlink entries that point at missing commits (breaks CI checkout)."""

from __future__ import annotations

import subprocess
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]


def _git(*args: str) -> str:
    return subprocess.check_output(["git", *args], cwd=REPO_ROOT, text=True).strip()


def _object_exists(sha: str) -> bool:
    try:
        _git("cat-file", "-e", sha)
        return True
    except subprocess.CalledProcessError:
        return False


def main() -> int:
    broken: list[str] = []
    for line in _git("ls-tree", "HEAD").splitlines():
        parts = line.split()
        if len(parts) < 4 or parts[1] != "commit":
            continue
        sha, path = parts[2], parts[3]
        if not _object_exists(sha):
            broken.append(path)

    if not broken:
        print("No broken gitlinks at repository root.")
        return 0

    for path in broken:
        print(f"Removing broken gitlink: {path} ({path} -> missing commit)")
        subprocess.check_call(["git", "rm", "-rf", "--cached", path], cwd=REPO_ROOT)
        target = REPO_ROOT / path
        if target.exists():
            if target.is_dir():
                import shutil

                shutil.rmtree(target)
            else:
                target.unlink()

    print(f"Removed {len(broken)} broken gitlink(s).")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
