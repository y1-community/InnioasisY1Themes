#!/usr/bin/env python3
"""
Generate heavily compressed .preview.jpg (wallpapers) and .preview.png (icons)
for homepage theme previews and simulators across InnioasisY1Themes.

Specifications:
- Wallpapers: Converted to progressive JPEG (.preview.jpg), max 480x360, quality 75 (~15-30 KB).
- Now-playing / selected home item icon: High compression PNG (.preview.png), max 180x180, alpha retained (~4-10 KB).
- Status bar icons: High compression PNG (.preview.png), max 32x32, alpha retained (~1-3 KB).
- Never modified in config.json; theme packaging strictly excludes .preview.* assets.
"""

from __future__ import annotations

import json
import os
import sys
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from typing import Any, Dict, List, Optional, Set

try:
    from PIL import Image
    HAS_PIL = True
except ImportError:
    HAS_PIL = False

REPO_ROOT = Path(__file__).resolve().parents[1]
EXCLUDED_DIRS = {
    ".git",
    ".github",
    ".vscode",
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
}


def load_json(path: Path) -> Optional[dict]:
    try:
        with open(path, "r", encoding="utf-8", errors="replace") as f:
            return json.load(f)
    except Exception:
        return None


def resolve_case_insensitive_file(folder: Path, rel_path: str) -> Optional[Path]:
    clean = rel_path.strip().replace("\\", "/").lstrip("./")
    if not clean or clean.startswith("http"):
        return None
    direct = folder / clean
    if direct.is_file():
        return direct

    # Try case-insensitive matching per path segment
    parts = clean.split("/")
    cur = folder
    for part in parts:
        if not cur.is_dir():
            return None
        match = None
        for child in cur.iterdir():
            if child.name.lower() == part.lower():
                match = child
                break
        if not match:
            return None
        cur = match
    return cur if cur.is_file() else None


def optimize_wallpaper_jpeg(src: Path, dest: Path) -> bool:
    if not HAS_PIL:
        return False
    try:
        with Image.open(src) as im:
            if im.mode in ("RGBA", "LA", "P"):
                bg = Image.new("RGB", im.size, (0, 0, 0))
                if im.mode == "P":
                    im = im.convert("RGBA")
                mask = im.split()[-1] if "A" in im.getbands() else None
                bg.paste(im, mask=mask)
                im = bg
            elif im.mode != "RGB":
                im = im.convert("RGB")

            # Resize to max 480x360
            im.thumbnail((480, 360), Image.Resampling.LANCZOS)
            dest.parent.mkdir(parents=True, exist_ok=True)
            im.save(dest, "JPEG", quality=75, optimize=True, progressive=True)
            return True
    except Exception as e:
        print(f"Error compressing wallpaper {src}: {e}", file=sys.stderr)
        return False


def optimize_icon_png(src: Path, dest: Path, max_size: int = 180) -> bool:
    if not HAS_PIL:
        return False
    try:
        with Image.open(src) as im:
            if im.mode != "RGBA":
                im = im.convert("RGBA")

            im.thumbnail((max_size, max_size), Image.Resampling.LANCZOS)
            dest.parent.mkdir(parents=True, exist_ok=True)

            # Try adaptive palette with alpha transparency
            try:
                q = im.convert("P", palette=Image.Palette.ADAPTIVE, colors=128)
                q.save(dest, "PNG", optimize=True, compress_level=9)
            except Exception:
                im.save(dest, "PNG", optimize=True, compress_level=9)
            return True
    except Exception as e:
        print(f"Error compressing icon {src}: {e}", file=sys.stderr)
        return False


def process_theme_dir(theme_dir: Path) -> int:
    cfg_path = theme_dir / "config.json"
    if not cfg_path.is_file():
        return 0

    cfg = load_json(cfg_path)
    if not isinstance(cfg, dict):
        return 0

    count = 0

    # 1. Desktop Wallpaper -> .preview.jpg
    wp_rel = cfg.get("desktopWallpaper") or cfg.get("globalWallpaper") or ""
    if not wp_rel and isinstance(cfg.get("gallery"), dict):
        wp_rel = cfg["gallery"].get("wallpaper", "")

    if wp_rel:
        src_wp = resolve_case_insensitive_file(theme_dir, str(wp_rel))
        if src_wp and src_wp.is_file() and not src_wp.name.endswith(".preview.jpg"):
            stem = src_wp.stem
            # Ensure name ends with .preview.jpg
            dest_wp = src_wp.parent / f"{stem}.preview.jpg"
            if not dest_wp.exists() or dest_wp.stat().st_mtime < src_wp.stat().st_mtime:
                if optimize_wallpaper_jpeg(src_wp, dest_wp):
                    count += 1

    # 2. Home Preview Item (Now playing / first item, e.g. Music.png) -> .preview.png
    home_cfg = cfg.get("homePageConfig") or {}
    items = home_cfg.get("items") or []
    icon_rel = ""
    if isinstance(items, list) and items:
        first_item = items[0]
        if isinstance(first_item, dict):
            icon_rel = first_item.get("iconFile") or first_item.get("icon") or ""

    if not icon_rel:
        # Check standard icons: Music.png, Themeless_icon.png, Launcher.png
        for cand in ["Music.png", "Launcher.png", "Themeless_icon.png"]:
            if (theme_dir / cand).is_file():
                icon_rel = cand
                break

    if icon_rel:
        src_icon = resolve_case_insensitive_file(theme_dir, str(icon_rel))
        if src_icon and src_icon.is_file() and not src_icon.name.endswith(".preview.png"):
            stem = src_icon.stem
            dest_icon = src_icon.parent / f"{stem}.preview.png"
            if not dest_icon.exists() or dest_icon.stat().st_mtime < src_icon.stat().st_mtime:
                if optimize_icon_png(src_icon, dest_icon, max_size=180):
                    count += 1

    # 3. Status bar battery / play state and item arrow icons -> .preview.png
    status_cfg = cfg.get("statusConfig") or {}

    def optimize_status_icon(rel_path: Any, max_size: int) -> int:
        if not rel_path or not isinstance(rel_path, str):
            return 0
        src_status = resolve_case_insensitive_file(theme_dir, rel_path)
        if not src_status or not src_status.is_file() or src_status.name.endswith(".preview.png"):
            return 0
        dest_status = src_status.parent / f"{src_status.stem}.preview.png"
        if dest_status.exists() and dest_status.stat().st_mtime >= src_status.stat().st_mtime:
            return 0
        return 1 if optimize_icon_png(src_status, dest_status, max_size=max_size) else 0

    battery_rels: List[str] = []
    for key in ("battery", "batteryCharging"):
        value = status_cfg.get(key)
        if isinstance(value, str):
            battery_rels.append(value)
        elif isinstance(value, list):
            battery_rels.extend(v for v in value if isinstance(v, str))
        elif isinstance(value, dict):
            battery_rels.extend(v for v in value.values() if isinstance(v, str))
    for key in ("playing", "pause", "stop", "fmPlaying", "audiobookPlaying"):
        value = status_cfg.get(key)
        if isinstance(value, str):
            battery_rels.append(value)

    for rel in dict.fromkeys(battery_rels):
        count += optimize_status_icon(rel, 36)

    # Selection / item arrow decoration is drawn at up to 64px in the preview.
    arrow_rel = (cfg.get("itemConfig") or {}).get("itemRightArrow")
    count += optimize_status_icon(arrow_rel, 72)

    # 4. Check Variants subfolder
    variants_dir = theme_dir / "Variants"
    if variants_dir.is_dir():
        for sub in variants_dir.iterdir():
            if sub.is_dir() and (sub / "config.json").is_file():
                count += process_theme_dir(sub)

    return count


def main() -> int:
    if not HAS_PIL:
        print("Pillow is required to generate preview assets. Run: pip3 install pillow", file=sys.stderr)
        return 1

    theme_dirs = [
        p for p in REPO_ROOT.iterdir()
        if p.is_dir() and p.name not in EXCLUDED_DIRS and not p.name.startswith(".")
        and (p / "config.json").is_file()
    ]
    print(f"Found {len(theme_dirs)} theme directories. Generating preview assets (.preview.jpg / .preview.png)...")

    total_generated = 0
    with ThreadPoolExecutor(max_workers=8) as executor:
        results = list(executor.map(process_theme_dir, theme_dirs))
        total_generated = sum(results)

    print(f"Done! Generated or updated {total_generated} web-optimized preview assets.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
