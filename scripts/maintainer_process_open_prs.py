#!/usr/bin/env python3
"""Locally integrate open gallery PRs (themes, metadata, opt-out removals, author fixes)."""

from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

SCRIPTS_DIR = Path(__file__).resolve().parent
REPO_ROOT = SCRIPTS_DIR.parent
GIT_IDENTITY = ["-c", "user.name=Ryan Specter", "-c", "user.email=itsryanspecter@gmail.com"]
if str(SCRIPTS_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPTS_DIR))

from apply_author_correction import apply_author_dispute_from_pr
from apply_removal_opt_out import apply_removal
from classify_removal_request import RemovalKind, classify_removal_pr


def _run(cmd: list[str], *, check: bool = True, cwd: Path | None = None) -> subprocess.CompletedProcess:
    if cmd and cmd[0] == "git":
        cmd = ["git", *GIT_IDENTITY, *cmd[1:]]
    return subprocess.run(
        cmd,
        cwd=cwd or REPO_ROOT,
        text=True,
        capture_output=True,
        check=check,
    )


def _pr_list() -> list[dict]:
    out = _run(
        [
            "gh",
            "pr",
            "list",
            "--state",
            "open",
            "--limit",
            "100",
            "--json",
            "number,title,body,headRefName",
        ]
    )
    return json.loads(out.stdout)


def _squash_merge_pr(pr_num: int, title: str) -> tuple[bool, str]:
    ref = f"pr-maint-{pr_num}"
    _run(["git", "fetch", "origin", f"pull/{pr_num}/head:{ref}"], check=False)
    probe = _run(["git", "rev-parse", ref], check=False)
    if probe.returncode != 0:
        return False, "could not fetch PR head"

    _run(["git", "reset", "--hard", "HEAD"], check=False)
    merge = _run(["git", "merge", "--squash", ref], check=False)
    _run(["git", "branch", "-D", ref], check=False)
    if merge.returncode != 0:
        _run(["git", "merge", "--abort"], check=False)
        _run(["git", "reset", "--hard", "HEAD"], check=False)
        return False, (merge.stderr or merge.stdout or "merge conflict").strip()[:400]

    if not _run(["git", "status", "--porcelain"], check=True).stdout.strip():
        return True, "already integrated (no file changes)"

    short = title.replace('"', "'")[:72]
    commit = _run(
        ["git", "commit", "-m", f"Integrate PR #{pr_num}: {short}"],
        check=False,
    )
    if commit.returncode != 0:
        return False, (commit.stderr or "commit failed").strip()[:300]
    return True, "squash-merged"


def _commit_if_dirty(message: str) -> bool:
    if not _run(["git", "status", "--porcelain"], check=False).stdout.strip():
        return False
    _run(["git", "add", "-A"], check=False)
    _run(["git", "commit", "-m", message], check=False)
    return True


def main() -> int:
    results: list[str] = []
    author_fixes = 0
    removals_applied = 0
    merged = 0
    skipped = 0
    failed = 0
    handled_prs: list[int] = []

    for pr in sorted(_pr_list(), key=lambda p: p["number"]):
        num = pr["number"]
        title = str(pr.get("title") or "")
        body = str(pr.get("body") or "")

        if title.startswith("[Removal]"):
            req = classify_removal_pr(title=title, body=body)
            if not req:
                results.append(f"#{num} REMOVAL skip: unparseable")
                skipped += 1
                continue
            if req.kind == RemovalKind.UPLOAD_RETRY:
                results.append(f"#{num} REMOVAL skip (upload retry, not removal): {req.folder}")
                skipped += 1
                continue
            if req.kind == RemovalKind.AUTHOR_DISPUTE:
                ok, msg = apply_author_dispute_from_pr(title, body)
                if ok:
                    author_fixes += 1
                    handled_prs.append(num)
                    results.append(f"#{num} AUTHOR FIX: {req.folder} — {msg}")
                else:
                    failed += 1
                    results.append(f"#{num} AUTHOR FIX failed: {msg}")
                continue
            ok, msg = apply_removal(req)
            if ok:
                removals_applied += 1
                handled_prs.append(num)
                results.append(f"#{num} REMOVAL opt-out: {req.folder} — {msg}")
            else:
                failed += 1
                results.append(f"#{num} REMOVAL failed: {msg}")
            continue

        ok, msg = _squash_merge_pr(num, title)
        if ok:
            merged += 1
            handled_prs.append(num)
            results.append(f"#{num} MERGED: {title} — {msg}")
        else:
            failed += 1
            results.append(f"#{num} FAILED: {title} — {msg}")

    if author_fixes:
        _commit_if_dirty("Correct theme author attribution from removal dispute PRs")
    if removals_applied:
        _run(["git", "add", "opt_out.json", "block.json"], check=False)
        _commit_if_dirty("Apply gallery removal opt-outs from open removal PRs")

    print("\n".join(results))
    print(
        f"\nSummary: merged={merged} author_fixes={author_fixes} removals={removals_applied} "
        f"skipped={skipped} failed={failed}",
        file=sys.stderr,
    )
    if handled_prs:
        print("Handled PRs: " + ", ".join(f"#{n}" for n in handled_prs), file=sys.stderr)
    return 1 if failed else 0


if __name__ == "__main__":
    raise SystemExit(main())
