#!/usr/bin/env python3
"""Remove orphan gallery-upload sidecars at repo root.

Upload flow writes `<timestamp>-<name>.zip` plus `<timestamp>-<name>.zip.meta.json`.
If the zip was removed without the meta (or vice versa), clean up stragglers.
"""

from __future__ import annotations

from pathlib import Path

_GIT_ROOT = Path(__file__).resolve().parents[1]
REPO_ROOT = _GIT_ROOT


def main() -> int:
    removed = 0
    for meta in REPO_ROOT.glob("*.zip.meta.json"):
        if not meta.is_file() or meta.parent != REPO_ROOT:
            continue
        zip_path = Path(str(meta)[: -len(".meta.json")])
        if not zip_path.is_file():
            meta.unlink()
            removed += 1
            print(f"Removed orphan upload metadata: {meta.name}")
    if removed:
        print(f"Cleanup done ({removed} orphan meta file(s)).")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
