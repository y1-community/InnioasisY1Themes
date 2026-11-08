#!/usr/bin/env python3
"""
Sync canonical donors.csv and notice.xml from Innioasis-Updater / innioasis.app into InnioasisY1Themes.

Ensures exact copies of both files exist in the repository with:
- Multiple redundant fallback sources:
    1. GitHub raw content (y1-community/Innioasis-Updater/main)
    2. Live production site (https://innioasis.app)
    3. GitHub REST API (Accept: application/vnd.github.v3.raw)
- Strict validation:
    * donors.csv: valid UTF-8, non-empty, expected CSV headers
    * notice.xml: valid UTF-8, non-empty, well-formed XML with <notices> root
- Normalized line endings (LF only, trailing newline)
- Change detection: only modifies files when contents actually differ
- Optional translation catalog refresh when notice.xml changes
"""

from __future__ import annotations

import argparse
import os
import sys
import urllib.error
import urllib.request
import xml.etree.ElementTree as ET
from pathlib import Path
from typing import Optional, Tuple

ROOT = Path(__file__).resolve().parent.parent

ASSET_CONFIGS = {
    "donors.csv": {
        "sources": [
            "https://raw.githubusercontent.com/y1-community/Innioasis-Updater/main/donors.csv",
            "https://innioasis.app/donors.csv",
            "https://api.github.com/repos/y1-community/Innioasis-Updater/contents/donors.csv?ref=main",
        ],
        "min_bytes": 50,
        "type": "csv",
    },
    "notice.xml": {
        "sources": [
            "https://raw.githubusercontent.com/y1-community/Innioasis-Updater/main/notice.xml",
            "https://innioasis.app/notice.xml",
            "https://api.github.com/repos/y1-community/Innioasis-Updater/contents/notice.xml?ref=main",
        ],
        "min_bytes": 50,
        "type": "xml",
    },
}


def normalize_text(raw_bytes: bytes) -> bytes:
    """Normalize line endings to LF and ensure a trailing newline."""
    text = raw_bytes.replace(b"\r\n", b"\n").replace(b"\r", b"\n")
    if text and not text.endswith(b"\n"):
        text += b"\n"
    return text


def fetch_url(url: str, github_token: Optional[str] = None) -> Optional[bytes]:
    """Fetch content from a URL with proper headers and error handling."""
    headers = {
        "User-Agent": "Innioasis-AssetSync/1.0 (+https://themes.innioasis.app)",
    }
    if "api.github.com" in url:
        headers["Accept"] = "application/vnd.github.v3.raw"
        if github_token:
            headers["Authorization"] = f"Bearer {github_token}"
    elif github_token and "raw.githubusercontent.com" in url:
        headers["Authorization"] = f"token {github_token}"

    req = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=20) as resp:
            if resp.status == 200:
                data = resp.read()
                return data
            print(f"  [warn] {url} returned HTTP {resp.status}", file=sys.stderr)
    except urllib.error.HTTPError as e:
        print(f"  [warn] {url} HTTP {e.code}: {e.reason}", file=sys.stderr)
    except Exception as e:
        print(f"  [warn] {url} failed: {e}", file=sys.stderr)
    return None


def validate_csv(data: bytes) -> Tuple[bool, str]:
    """Validate CSV structure."""
    try:
        text = data.decode("utf-8")
    except UnicodeDecodeError:
        return False, "Not valid UTF-8"
    lines = [line.strip() for line in text.split("\n") if line.strip()]
    if not lines:
        return False, "CSV is empty"
    header = lines[0].lower()
    if "name" not in header or "amount" not in header:
        return False, f"CSV missing required columns in header: {header!r}"
    return True, f"Valid CSV with {len(lines)} rows"


def validate_xml(data: bytes) -> Tuple[bool, str]:
    """Validate XML structure."""
    try:
        text = data.decode("utf-8")
    except UnicodeDecodeError:
        return False, "Not valid UTF-8"
    try:
        root = ET.fromstring(text)
    except ET.ParseError as e:
        return False, f"Invalid XML: {e}"
    if root.tag != "notices":
        return False, f"Root tag must be <notices>, got <{root.tag}>"
    notices = root.findall("notice")
    return True, f"Valid notices.xml with {len(notices)} notices"


def sync_asset(
    name: str,
    target_path: Path,
    github_token: Optional[str] = None,
) -> Tuple[bool, str]:
    """
    Fetch, validate, and update a single asset if modified.
    Returns (changed: bool, message: str).
    """
    config = ASSET_CONFIGS[name]
    fetched_data: Optional[bytes] = None
    successful_url: Optional[str] = None

    for url in config["sources"]:
        print(f"Trying source for {name}: {url}...")
        data = fetch_url(url, github_token)
        if not data or len(data) < config["min_bytes"]:
            continue

        normalized = normalize_text(data)

        if config["type"] == "csv":
            valid, msg = validate_csv(normalized)
        elif config["type"] == "xml":
            valid, msg = validate_xml(normalized)
        else:
            valid, msg = True, "OK"

        if valid:
            fetched_data = normalized
            successful_url = url
            print(f"  Successfully fetched and validated from {url} ({msg})")
            break
        else:
            print(f"  Validation failed for {url}: {msg}")

    if fetched_data is None:
        raise RuntimeError(f"Failed to fetch valid {name} from all available sources.")

    existing_data = b""
    if target_path.exists():
        existing_data = normalize_text(target_path.read_bytes())

    if existing_data == fetched_data:
        print(f"{name} is already an exact copy (up to date).")
        return False, f"{name}: up to date (source: {successful_url})"

    target_path.write_bytes(fetched_data)
    print(f"Updated {name} from {successful_url}.")
    return True, f"{name}: updated from {successful_url}"


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--token",
        default=os.environ.get("GITHUB_TOKEN"),
        help="GitHub token for API calls",
    )
    parser.add_argument(
        "--update-catalogs",
        action="store_true",
        help="Run translate_notices.py if notice.xml changed",
    )
    parser.add_argument(
        "--output-github-env",
        action="store_true",
        help="Set GitHub Action step outputs via $GITHUB_OUTPUT",
    )
    args = parser.parse_args()

    changed_assets = []
    messages = []

    for name in ASSET_CONFIGS:
        target = ROOT / name
        try:
            changed, msg = sync_asset(name, target, github_token=args.token)
            messages.append(msg)
            if changed:
                changed_assets.append(name)
        except Exception as e:
            print(f"Error syncing {name}: {e}", file=sys.stderr)
            return 1

    if "notice.xml" in changed_assets and args.update_catalogs:
        translate_script = ROOT / "scripts" / "i18n" / "translate_notices.py"
        if translate_script.exists():
            print("notice.xml was updated; refreshing translation catalogs...")
            import subprocess
            res = subprocess.run([sys.executable, str(translate_script)], capture_output=True, text=True)
            print(res.stdout)
            if res.returncode != 0:
                print(f"[warn] translate_notices.py exited with {res.returncode}: {res.stderr}", file=sys.stderr)

    has_changes = len(changed_assets) > 0
    print("\nSync Summary:")
    for msg in messages:
        print(f"  - {msg}")
    print(f"Total changes: {len(changed_assets)} assets ({', '.join(changed_assets) if changed_assets else 'none'})")

    if args.output_github_env and "GITHUB_OUTPUT" in os.environ:
        with open(os.environ["GITHUB_OUTPUT"], "a", encoding="utf-8") as gh_out:
            gh_out.write(f"has_changes={'true' if has_changes else 'false'}\n")
            gh_out.write(f"changed_assets={','.join(changed_assets)}\n")

    return 0


if __name__ == "__main__":
    sys.exit(main())
