#!/usr/bin/env python3
"""Runtime health check for gallery ingest → publish pipeline (debug + CI)."""

from __future__ import annotations

import json
import sys
import time
import urllib.request
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
LOG_PATH = REPO_ROOT / ".cursor" / "debug-f20d5f.log"
SESSION_ID = "f20d5f"
MAIN_THEMES_JSON = (
    "https://raw.githubusercontent.com/y1-community/InnioasisY1Themes/main/themes.json"
)
LIVE_THEMES_JSON = "https://themes.innioasis.app/themes.json"


def _log(hypothesis_id: str, location: str, message: str, data: dict) -> None:
    payload = {
        "sessionId": SESSION_ID,
        "timestamp": int(time.time() * 1000),
        "hypothesisId": hypothesis_id,
        "location": location,
        "message": message,
        "data": data,
        "runId": "pipeline-health",
    }
    LOG_PATH.parent.mkdir(parents=True, exist_ok=True)
    with LOG_PATH.open("a", encoding="utf-8") as fh:
        fh.write(json.dumps(payload, ensure_ascii=False) + "\n")


def _fetch_json(url: str) -> tuple[int, dict | None]:
    req = urllib.request.Request(
        url,
        headers={"User-Agent": "InnioasisY1Themes-pipeline-health/1.0"},
    )
    try:
        with urllib.request.urlopen(req, timeout=45) as resp:
            body = resp.read().decode("utf-8")
            doc = json.loads(body)
            return len(doc.get("themes") or []), doc
    except Exception as exc:
        return -1, {"error": str(exc)}


def _root_zips() -> list[str]:
    return sorted(p.name for p in REPO_ROOT.glob("*.zip") if p.is_file())


def main() -> int:
    local_count = 0
    local_path = REPO_ROOT / "themes.json"
    if local_path.is_file():
        local_count = len(json.loads(local_path.read_text(encoding="utf-8")).get("themes") or [])

    main_count, _ = _fetch_json(MAIN_THEMES_JSON)
    live_count, _ = _fetch_json(LIVE_THEMES_JSON)
    zips = _root_zips()
    live_behind = main_count >= 0 and live_count >= 0 and live_count < main_count

    _log(
        "A",
        "pipeline_health_check.py:main",
        "catalog counts",
        {
            "localThemes": local_count,
            "githubMainThemes": main_count,
            "liveSiteThemes": live_count,
            "liveBehindMain": live_behind,
        },
    )
    _log(
        "B",
        "pipeline_health_check.py:main",
        "root upload zips",
        {"zipFiles": zips, "hasCommittedZipArtifacts": bool(zips)},
    )

    pip_live = []
    pip_main = []
    if live_count >= 0:
        _, live_doc = _fetch_json(LIVE_THEMES_JSON)
        if isinstance(live_doc, dict):
            pip_live = [
                t.get("folder")
                for t in live_doc.get("themes") or []
                if "pip-boy" in str(t.get("name") or "").lower()
                or "fallout pip" in str(t.get("folder") or "").lower()
            ]
    _, main_doc = _fetch_json(MAIN_THEMES_JSON)
    if isinstance(main_doc, dict):
        pip_main = [
            t.get("folder")
            for t in main_doc.get("themes") or []
            if "pip-boy" in str(t.get("name") or "").lower()
            or "fallout pip" in str(t.get("folder") or "").lower()
        ]
    _log(
        "C",
        "pipeline_health_check.py:main",
        "pip-boy catalog shape",
        {"livePipBoyFolders": pip_live, "mainPipBoyFolders": pip_main},
    )

    print(f"local={local_count} main={main_count} live={live_count} root_zips={zips}")
    if live_behind:
        print("WARN: live site catalog is behind GitHub main (Pages publish stalled).")
        return 1
    if zips:
        print("WARN: root *.zip artifacts present (should be removed after ingest).")
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
