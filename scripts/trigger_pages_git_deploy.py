#!/usr/bin/env python3
"""Trigger a Cloudflare Pages production build from the linked GitHub main branch."""

from __future__ import annotations

import json
import os
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
LOG_PATH = REPO_ROOT / ".cursor" / "debug-f20d5f.log"
SESSION_ID = "f20d5f"


def _log(hypothesis_id: str, message: str, data: dict) -> None:
    payload = {
        "sessionId": SESSION_ID,
        "timestamp": int(time.time() * 1000),
        "hypothesisId": hypothesis_id,
        "location": "trigger_pages_git_deploy.py",
        "message": message,
        "data": data,
        "runId": os.environ.get("DEPLOY_RUN_ID", "pages-git-deploy"),
    }
    try:
        LOG_PATH.parent.mkdir(parents=True, exist_ok=True)
        with LOG_PATH.open("a", encoding="utf-8") as fh:
            fh.write(json.dumps(payload, ensure_ascii=False) + "\n")
    except OSError:
        pass


def main() -> int:
    token = os.environ.get("CLOUDFLARE_API_TOKEN", "").strip()
    account_id = os.environ.get("CLOUDFLARE_ACCOUNT_ID", "").strip()
    project = os.environ.get("CLOUDFLARE_PAGES_PROJECT", "y1themes").strip() or "y1themes"
    branch = os.environ.get("CLOUDFLARE_PAGES_BRANCH", "main").strip() or "main"

    if not token or not account_id:
        _log("E", "missing cloudflare credentials", {"hasToken": bool(token), "hasAccountId": bool(account_id)})
        print("ERROR: CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID are required.", file=sys.stderr)
        return 1

    url = f"https://api.cloudflare.com/client/v4/accounts/{account_id}/pages/projects/{project}/deployments"
    body = json.dumps({"branch": branch}).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=body,
        method="POST",
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
            "User-Agent": "InnioasisY1Themes-pages-deploy/1.0",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=120) as resp:
            raw = resp.read().decode("utf-8")
            status = resp.status
    except urllib.error.HTTPError as exc:
        raw = exc.read().decode("utf-8", errors="replace")
        status = exc.code
        _log("E", "cloudflare pages git deploy failed", {"httpStatus": status, "body": raw[:500]})
        print(raw, file=sys.stderr)
        print(f"ERROR: Cloudflare Pages git deployment failed (HTTP {status}).", file=sys.stderr)
        return 1

    try:
        parsed = json.loads(raw)
    except json.JSONDecodeError:
        parsed = {"raw": raw[:500]}
    deployment = (parsed.get("result") or {}) if isinstance(parsed, dict) else {}
    _log(
        "A",
        "cloudflare pages git deploy started",
        {
            "httpStatus": status,
            "project": project,
            "branch": branch,
            "deploymentId": deployment.get("id"),
            "deploymentUrl": deployment.get("url"),
        },
    )
    print(json.dumps(parsed, indent=2))
    if not isinstance(parsed, dict) or not parsed.get("success", True):
        print("ERROR: Cloudflare API returned success=false.", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
