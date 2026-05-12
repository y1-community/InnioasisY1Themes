#!/usr/bin/env python3
"""Clean up stale gallery-upload artifacts at repo root.

Upload flow writes `<timestamp>-<name>.zip` plus `<timestamp>-<name>.zip.meta.json`.
This script removes:
- orphan sidecars (meta without zip)
- stale timestamped zip/meta pairs older than a retention window

Retention is controlled by `UPLOAD_ARTIFACT_MAX_AGE_HOURS` (default: 48).
Set to `0` to remove all matching timestamped artifacts immediately.
"""

from __future__ import annotations

import os
import re
import time
from pathlib import Path

_GIT_ROOT = Path(__file__).resolve().parents[1]
REPO_ROOT = _GIT_ROOT
_STAMPED_ZIP_RE = re.compile(r"^\d{10,}-.+\.zip$", re.I)


def _is_upload_zip_name(name: str) -> bool:
    return bool(_STAMPED_ZIP_RE.match(str(name or "").strip()))


def _is_stale(path: Path, cutoff_ts: float) -> bool:
    if cutoff_ts <= 0:
        return True
    try:
        return path.stat().st_mtime <= cutoff_ts
    except OSError:
        return False


def main() -> int:
    max_age_hours = float(os.environ.get("UPLOAD_ARTIFACT_MAX_AGE_HOURS", "48") or "48")
    cutoff = 0.0 if max_age_hours <= 0 else (time.time() - (max_age_hours * 3600.0))

    removed = 0
    for meta in sorted(REPO_ROOT.glob("*.zip.meta.json"), key=lambda p: p.name.lower()):
        if not meta.is_file() or meta.parent != REPO_ROOT:
            continue
        zip_path = Path(str(meta)[: -len(".meta.json")])
        if not _is_upload_zip_name(zip_path.name):
            continue
        if not zip_path.is_file() or _is_stale(meta, cutoff):
            meta.unlink()
            removed += 1
            print(f"Removed upload metadata: {meta.name}")

    for zip_path in sorted(REPO_ROOT.glob("*.zip"), key=lambda p: p.name.lower()):
        if not zip_path.is_file() or zip_path.parent != REPO_ROOT:
            continue
        if not _is_upload_zip_name(zip_path.name):
            continue
        if not _is_stale(zip_path, cutoff):
            continue
        meta = Path(str(zip_path) + ".meta.json")
        zip_path.unlink()
        removed += 1
        print(f"Removed stale upload zip: {zip_path.name}")
        if meta.is_file():
            meta.unlink()
            removed += 1
            print(f"Removed paired upload metadata: {meta.name}")

    if removed:
        print(f"Cleanup done ({removed} artifact file(s) removed).")
    else:
        print("Cleanup done (no stale upload artifacts found).")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
