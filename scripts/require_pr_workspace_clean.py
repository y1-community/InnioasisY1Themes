#!/usr/bin/env python3
"""Used by Theme PR Sanity: fail if git is dirty unless only theme SEO shells changed.

Themes often include ``ThemeName/index.html`` or canonical ``Variants/<look>/.../index.html``
shells (matching ``zip_theme_utils.allowed_theme_index_html_relpath``, including optional ``_share/`` paths). Duplicated folder segments from some upload clients (``ThemeName/ThemeName/index.html``) normalize the same way as the Worker + upload validator. Those files do not participate in ``sync_theme_metadata.py`` churn,
but line-ending or tooling noise on them must not fail the clean-tree gate.
Themes.json / config churn must still be committed.
"""

from __future__ import annotations

import subprocess
import sys
from pathlib import PurePosixPath

from zip_theme_utils import allowed_theme_index_html_relpath


def _collapse_duplicate_leading_segments_for_theme_index(repo_parts: tuple[str, ...]) -> tuple[str, ...]:
    """Collapse Theme/Theme/index.html-style prefixes (matches upload-worker + zip client)."""
    parts = list(repo_parts)
    while (
        len(parts) >= 3
        and parts[-1].lower() == "index.html"
        and parts[0].lower() == parts[1].lower()
    ):
        parts = [parts[0]] + parts[2:]
    return tuple(parts)


def seo_theme_repo_index_shell_path(path_raw: str) -> bool:
    """True when ``path_raw`` is a repo-relative theme SEO ``index.html`` (one root segment)."""
    norm = path_raw.strip().replace("\\", "/").lstrip("/")
    if "/" not in norm:
        return False
    parts_t = PurePosixPath(norm).parts
    parts_t = _collapse_duplicate_leading_segments_for_theme_index(parts_t)
    if len(parts_t) < 2:
        return False
    leaf = parts_t[-1].lower()
    if leaf != "index.html":
        return False
    inner = PurePosixPath(*parts_t[1:])
    return allowed_theme_index_html_relpath(inner)


def _norm_path(raw: str) -> str:
    s = raw.strip().strip('"')
    return s.replace("\\", "/")


def _parse_porcelain_path(line: str) -> tuple[str, str] | None:
    """Return (XY status, posix path) for one ``git status --porcelain=v1`` line."""
    line = line.rstrip("\n")
    if not line.strip():
        return None
    if len(line) < 4:
        return None
    xy = line[:2]
    tail = line[3:].strip()
    # Renames/copies report "PATH -> PATH" (possibly quoted segments).
    if " -> " in tail:
        tail = tail.split(" -> ", 1)[1].strip()
    path = _norm_path(tail)
    return xy, path


def main() -> int:
    proc = subprocess.run(
        ["git", "status", "--porcelain=v1"],
        check=False,
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
    )
    if proc.returncode != 0:
        print(proc.stderr.strip() or "git status failed.", file=sys.stderr)
        return 1

    offenders: list[str] = []
    for line in proc.stdout.splitlines():
        parsed = _parse_porcelain_path(line)
        if parsed is None:
            continue
        xy, path = parsed
        if not path:
            continue
        x, y = (xy[0] if xy else " "), (xy[1] if len(xy) > 1 else " ")
        xu, yu = x.upper(), y.upper()
        if "U" in xu + yu:
            offenders.append(line)
            continue
        if xu in "RC" or yu in "RC":
            offenders.append(line)
            continue
        if "D" in xu + yu:
            offenders.append(line)
            continue
        if seo_theme_repo_index_shell_path(path):
            continue
        offenders.append(line)

    if not offenders:
        return 0
    print(
        "Generated metadata or tracked files updated by sync are missing from this PR "
        "(or unexpected working tree drift):",
        file=sys.stderr,
    )
    print("", file=sys.stderr)
    for o in offenders:
        print(o, file=sys.stderr)
    print("", file=sys.stderr)
    print(
        "Run ``python scripts/sync_theme_metadata.py`` locally (and regenerate theme SEO "
        "shells via upload packaging if needed), then commit. Canonical theme ``index.html`` "
        "(root or under ``Variants/<look>/...`` per zip_theme_utils) churn alone does not "
        "fail this check.",
        file=sys.stderr,
    )
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
