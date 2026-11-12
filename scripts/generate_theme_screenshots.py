#!/usr/bin/env python3
"""Render pre-warmed theme screen captures (``screenshot_preview.jpg``).

The gallery homepage mounts the live simulator for every visible card: one
config.json, the theme font, the wallpaper, the status art, the home icons and a
full 480x360 DOM paint. That is the correct way to preview a theme, but doing it
for a whole catalogue is why the grid feels slow.

``screenshot.html`` renders exactly one theme with the same renderer the cards
use. This script drives it in headless Chromium, captures the 480x360 device
screen, and writes it back into the theme folder as ``screenshot_preview.jpg``
at a quality that keeps the file around 15-30 KB. The homepage serves that JPEG
instead of mounting the simulator; themes without one keep the live preview.

Website-only. ``screenshot_preview.jpg`` is excluded from every theme ZIP the
site offers (see ``theme-packaging.js``), so players never receive it.

Usage
-----
    # fill in whatever is missing or stale (what CI runs)
    python3 scripts/generate_theme_screenshots.py --only-missing

    # local retrospective backfill of the whole catalogue
    python3 scripts/generate_theme_screenshots.py --only-missing --write-metadata

    # one theme, or re-render everything
    python3 scripts/generate_theme_screenshots.py --folder Silksong --force

Requires Pillow and Playwright (``pip install pillow playwright`` then
``playwright install chromium``).
"""

from __future__ import annotations

import argparse
import functools
import http.server
import io
import json
import os
import shutil
import socketserver
import sys
import threading
from pathlib import Path
from typing import Iterable

try:
    from PIL import Image
except ImportError:  # pragma: no cover - environment guard
    Image = None  # type: ignore[assignment]

SCREENSHOT_NAME = "screenshot_preview.jpg"
VARIANTS_SEGMENT = "Variants"
TARGET_SIZE = (480, 360)
JPEG_QUALITY = 60
JPEG_MIN_QUALITY = 42

REPO_ROOT = Path(__file__).resolve().parents[1]
THEMES_JSON_PATH = REPO_ROOT / "themes.json"
HARNESS_PAGE = "screenshot.html"

# Directories that are site infrastructure, not themes (mirrors the other scripts).
EXCLUDED_DIRS = {
    ".git",
    ".github",
    ".vscode",
    ".claude",
    ".agents",
    ".freebuff",
    "__pycache__",
    "assets",
    "scripts",
    "functions",
    "workers",
    "themes",
    "i18n",
    "dist",
    "_site",
    "node_modules",
    "themes-i18n",
    "docs",
    "main_package",
}

RENDER_INPUT_SUFFIXES = {
    ".json",
    ".png",
    ".jpg",
    ".jpeg",
    ".webp",
    ".gif",
    ".bmp",
    ".svg",
    ".ttf",
    ".otf",
    ".woff",
    ".woff2",
}


class _QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *_args):  # noqa: D102 - silence per-request logging
        pass


class _ThreadingServer(socketserver.ThreadingMixIn, http.server.HTTPServer):
    daemon_threads = True
    allow_reuse_address = True


def start_static_server(root: Path) -> tuple[_ThreadingServer, str]:
    handler = functools.partial(_QuietHandler, directory=str(root))
    server = _ThreadingServer(("127.0.0.1", 0), handler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    host, port = server.server_address[:2]
    return server, f"http://{host}:{port}"


def is_theme_dir(path: Path) -> bool:
    return (path / "config.json").is_file()


def variant_dirs(theme_dir: Path) -> list[Path]:
    variants_root = theme_dir / VARIANTS_SEGMENT
    if not variants_root.is_dir():
        return []
    return sorted(
        (p for p in variants_root.iterdir() if p.is_dir() and is_theme_dir(p)),
        key=lambda p: p.name.lower(),
    )


def discover_themes(only_folder: str = "") -> list[tuple[str, str, Path]]:
    """Return ``(catalog_folder, variant_segment, content_dir)`` triples to render."""
    wanted = only_folder.strip().strip("/").replace("\\", "/").lower()
    targets: list[tuple[str, str, Path]] = []
    for child in sorted(REPO_ROOT.iterdir(), key=lambda p: p.name.lower()):
        if not child.is_dir() or child.name.startswith("."):
            continue
        if child.name in EXCLUDED_DIRS:
            continue
        if not is_theme_dir(child):
            continue
        if wanted and child.name.lower() != wanted:
            continue
        targets.append((child.name, "", child))
        for variant in variant_dirs(child):
            targets.append((child.name, variant.name, variant))
    return targets


def newest_render_input(content_dir: Path) -> float:
    """Newest mtime of any file that can change what the preview paints."""
    newest = 0.0
    for root, dirs, files in os.walk(content_dir):
        dirs[:] = [d for d in dirs if d not in {"__pycache__", "node_modules"}]
        for name in files:
            if name == SCREENSHOT_NAME:
                continue
            path = Path(root) / name
            if path.suffix.lower() not in RENDER_INPUT_SUFFIXES:
                continue
            try:
                newest = max(newest, path.stat().st_mtime)
            except OSError:
                continue
    return newest


def is_stale(content_dir: Path, force: bool) -> bool:
    output = content_dir / SCREENSHOT_NAME
    if force or not output.is_file() or output.stat().st_size == 0:
        return True
    try:
        output_mtime = output.stat().st_mtime
    except OSError:
        return True
    return newest_render_input(content_dir) > output_mtime


def compress_to_jpeg(raw_png: bytes, dest: Path) -> int:
    """Normalise to 480x360 and write the smallest acceptable progressive JPEG."""
    if Image is None:
        raise RuntimeError("Pillow is required to encode screenshot_preview.jpg")
    with Image.open(io.BytesIO(raw_png)) as shot:
        rgb = shot.convert("RGB") if shot.mode != "RGB" else shot.copy()
    if rgb.size != TARGET_SIZE:
        # Never upscale: the harness is already 480x360 at deviceScaleFactor 1.
        rgb.thumbnail(TARGET_SIZE, Image.Resampling.LANCZOS)
        if rgb.size != TARGET_SIZE:
            canvas = Image.new("RGB", TARGET_SIZE, (0, 0, 0))
            canvas.paste(rgb, ((TARGET_SIZE[0] - rgb.width) // 2, (TARGET_SIZE[1] - rgb.height) // 2))
            rgb = canvas

    dest.parent.mkdir(parents=True, exist_ok=True)
    quality = JPEG_QUALITY
    while True:
        buffer = io.BytesIO()
        rgb.save(buffer, "JPEG", quality=quality, optimize=True, progressive=True)
        data = buffer.getvalue()
        # The point of the file is transfer size: back off further while the
        # capture is still heavier than a card wants to download.
        if len(data) <= 26_000 or quality <= JPEG_MIN_QUALITY:
            break
        quality -= 8
    dest.write_bytes(data)
    return len(data)


def render(
    browser,
    base_url: str,
    catalog_folder: str,
    variant_segment: str,
    dest: Path,
    timeout_ms: int,
) -> tuple[bool, str]:
    from urllib.parse import quote, urlencode

    url = f"{base_url}/{HARNESS_PAGE}?" + urlencode(
        {"theme": catalog_folder, **({"variant": variant_segment} if variant_segment else {})},
        quote_via=quote,
    )
    context = browser.new_context(
        viewport={"width": TARGET_SIZE[0], "height": TARGET_SIZE[1]},
        device_scale_factor=1,
        reduced_motion="reduce",
    )

    def _local_only(route):
        # Every capture must depend on this checkout alone. The previewer falls back
        # to CDN fonts and the site pulls analytics; a slow or offline network would
        # otherwise stall or vary the shot.
        try:
            if route.request.url.startswith(base_url):
                route.continue_()
            else:
                route.abort()
        except Exception:
            pass

    context.route("**/*", _local_only)
    page = context.new_page()
    last_error = ""
    try:
        for attempt in (1, 2, 3):
            try:
                # domcontentloaded, not load: the harness signals readiness itself
                # once fonts and art are settled, so the load event adds nothing.
                page.goto(url, wait_until="domcontentloaded", timeout=timeout_ms)
                page.wait_for_function(
                    "() => window.__screenshotState && window.__screenshotState.ready === true",
                    timeout=timeout_ms,
                )
                state = page.evaluate("() => window.__screenshotState")
                if state.get("error"):
                    return False, str(state["error"])
                node = page.query_selector("#shot")
                if node is None:
                    return False, "harness container missing"
                raw = node.screenshot(type="png")
                size = compress_to_jpeg(raw, dest)
                note = ""
                if state.get("fontsLoaded") is False:
                    # Still written (the live card would fall back the same way), but
                    # the run log has to say the capture may not use the theme face.
                    note = " (font warning: " + "; ".join(state.get("warnings") or ["unresolved"]) + ")"
                return True, f"{size // 1024 or 1} KB{note}"
            except Exception as exc:  # dropped local request under load is transient
                last_error = str(exc).splitlines()[0][:180]
                if attempt < 3:
                    page.wait_for_timeout(400 * attempt)
                    continue
                return False, last_error
        return False, last_error or "unknown error"
    finally:
        try:
            page.close()
        finally:
            context.close()


def _relative(path: Path) -> str:
    return "./" + path.relative_to(REPO_ROOT).as_posix()


def update_themes_json(theme_folders: Iterable[str] | None = None) -> int:
    """Add/refresh ``screenshotPreview`` + ``variantScreenshots`` from disk.

    Keeps themes.json the single catalogue the homepage already downloads, so a
    card knows it has a pre-warmed capture without probing for the file.
    """
    if not THEMES_JSON_PATH.is_file():
        return 0
    try:
        payload = json.loads(THEMES_JSON_PATH.read_text(encoding="utf-8"))
    except (OSError, ValueError) as exc:
        print(f"  ! could not read themes.json: {exc}", file=sys.stderr)
        return 0
    themes = payload.get("themes")
    if not isinstance(themes, list):
        return 0

    only = {f.lower() for f in theme_folders} if theme_folders else None
    changed = 0
    for entry in themes:
        if not isinstance(entry, dict):
            continue
        folder = str(entry.get("folder") or "").strip().strip("/")
        if not folder:
            continue
        if only is not None and folder.lower() not in only:
            continue
        theme_dir = REPO_ROOT / folder
        default_shot = theme_dir / SCREENSHOT_NAME
        variants: dict[str, str] = {}
        for variant in variant_dirs(theme_dir):
            shot = variant / SCREENSHOT_NAME
            if shot.is_file():
                variants[variant.name] = _relative(shot)

        before = json.dumps(entry, sort_keys=True)
        if default_shot.is_file():
            entry["screenshotPreview"] = _relative(default_shot)
        else:
            entry.pop("screenshotPreview", None)
        if variants:
            entry["variantScreenshots"] = variants
        else:
            entry.pop("variantScreenshots", None)
        if json.dumps(entry, sort_keys=True) != before:
            changed += 1

    if changed:
        THEMES_JSON_PATH.write_text(
            json.dumps(payload, indent=4, ensure_ascii=False) + "\n", encoding="utf-8"
        )
    return changed


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--only-missing", action="store_true", help="render only missing or stale captures (default)")
    parser.add_argument("--force", action="store_true", help="re-render every selected theme")
    parser.add_argument("--folder", default="", help="limit to one catalog folder")
    parser.add_argument("--limit", type=int, default=0, help="stop after N captures")
    parser.add_argument("--timeout", type=float, default=25.0, help="per-theme timeout in seconds")
    parser.add_argument("--write-metadata", action="store_true", help="update themes.json screenshot fields")
    parser.add_argument("--metadata-only", action="store_true", help="only resync themes.json from the captures on disk")
    parser.add_argument("--no-metadata", action="store_true", help="never touch themes.json")
    parser.add_argument("--base-url", default="", help="use an already running origin instead of the local server")
    parser.add_argument(
        "--channel",
        default=os.environ.get("SCREENSHOT_CHANNEL", ""),
        help="browser channel to drive, e.g. chrome (uses the installed browser instead of Playwright's Chromium)",
    )
    parser.add_argument("--headful", action="store_true", help="show the browser (debugging)")
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv)
    # themes.json is what tells the gallery a capture exists; refreshing it must not
    # depend on a browser being installed (a killed render run still leaves JPEGs).
    if args.metadata_only:
        folders = [args.folder] if args.folder else None
        changed = update_themes_json(folders)
        print(f"themes.json: refreshed screenshot fields on {changed} entr(y/ies).")
        return 0
    if Image is None:
        print("Pillow is required: python3 -m pip install pillow", file=sys.stderr)
        return 1
    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        print(
            "Playwright is required: python3 -m pip install playwright && playwright install chromium",
            file=sys.stderr,
        )
        return 1
    if not (REPO_ROOT / HARNESS_PAGE).is_file():
        print(f"{HARNESS_PAGE} is missing from the repository root", file=sys.stderr)
        return 1

    force = bool(args.force)
    targets = discover_themes(args.folder)
    pending = [t for t in targets if force or is_stale(t[2], force)]
    if args.limit:
        pending = pending[: args.limit]

    print(f"{len(targets)} theme render target(s); {len(pending)} need a capture.")
    if not pending:
        if args.write_metadata and not args.no_metadata:
            changed = update_themes_json()
            if changed:
                print(f"themes.json: refreshed screenshot fields on {changed} entr(y/ies).")
        return 0

    server = None
    base_url = args.base_url.rstrip("/")
    if not base_url:
        server, base_url = start_static_server(REPO_ROOT)
        print(f"serving {REPO_ROOT} at {base_url}")

    written = 0
    failures: list[tuple[str, str]] = []
    timeout_ms = int(args.timeout * 1000)
    touched_folders: set[str] = set()
    try:
        with sync_playwright() as playwright:
            launch_opts = {"headless": not args.headful}
            if args.channel:
                launch_opts["channel"] = args.channel
            browser = playwright.chromium.launch(**launch_opts)
            try:
                for index, (catalog_folder, variant_segment, content_dir) in enumerate(pending, start=1):
                    label = f"{catalog_folder}/{variant_segment}" if variant_segment else catalog_folder
                    dest = content_dir / SCREENSHOT_NAME
                    try:
                        ok, detail = render(browser, base_url, catalog_folder, variant_segment, dest, timeout_ms)
                    except Exception as exc:  # one broken theme must not stop the batch
                        ok, detail = False, str(exc).splitlines()[0][:180]
                    if ok:
                        written += 1
                        touched_folders.add(catalog_folder)
                        print(f"[{index}/{len(pending)}] {label} -> {detail}")
                    else:
                        failures.append((label, detail))
                        print(f"[{index}/{len(pending)}] {label} FAILED: {detail}", file=sys.stderr)
            finally:
                browser.close()
    finally:
        if server is not None:
            server.shutdown()
            server.server_close()

    print(f"Wrote {written} capture(s).")
    if failures:
        print(f"{len(failures)} theme(s) could not be captured:", file=sys.stderr)
        for label, detail in failures:
            print(f"  - {label}: {detail}", file=sys.stderr)

    if args.write_metadata and not args.no_metadata:
        # Scan every theme, not only this run's: captures written by an earlier,
        # interrupted run still need their themes.json entry.
        changed = update_themes_json(None)
        print(f"themes.json: refreshed screenshot fields on {changed} entr(y/ies).")
    return 0


if __name__ == "__main__":
    sys.exit(main())
