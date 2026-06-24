#!/usr/bin/env python3
"""Trigger a Cloudflare Pages production build from the linked GitHub main branch."""

from __future__ import annotations

import json
import os
import sys
import urllib.error
import urllib.request


def main() -> int:
    token = os.environ.get("CLOUDFLARE_API_TOKEN", "").strip()
    account_id = os.environ.get("CLOUDFLARE_ACCOUNT_ID", "").strip()
    project = os.environ.get("CLOUDFLARE_PAGES_PROJECT", "y1themes").strip() or "y1themes"
    branch = os.environ.get("CLOUDFLARE_PAGES_BRANCH", "main").strip() or "main"

    if not token or not account_id:
        print(
            "SKIP: CLOUDFLARE_API_TOKEN / CLOUDFLARE_ACCOUNT_ID not set. "
            "Relying on the Cloudflare Pages Git integration to deploy main."
        )
        return 0

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
        print(raw, file=sys.stderr)
        print(f"ERROR: Cloudflare Pages git deployment failed (HTTP {status}).", file=sys.stderr)
        return 1

    try:
        parsed = json.loads(raw)
    except json.JSONDecodeError:
        parsed = {"raw": raw[:500]}
    print(json.dumps(parsed, indent=2))
    if not isinstance(parsed, dict) or not parsed.get("success", True):
        print("ERROR: Cloudflare API returned success=false.", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
