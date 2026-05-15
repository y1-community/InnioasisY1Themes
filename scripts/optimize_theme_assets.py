#!/usr/bin/env python3
"""Optimize theme image assets for device-friendly package sizes.

Historically this ran in GitHub Actions during theme ingest; uploads now downsize
raster images in the browser when building the ZIP (see ``upload.html``). You can
still run this script locally or in a one-off job to shrink themes already in the repo.

- Shrink oversized images to a bounded max dimension (``THEME_ASSET_MAX_DIMENSION``, default 320).
- Re-encode PNG files with optimization/compression while preserving alpha.
"""

from __future__ import annotations

import io
import os
from pathlib import Path

from PIL import Image


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
    "node_modules",
}
IMAGE_SUFFIXES = {".png", ".jpg", ".jpeg", ".webp"}
MAX_DIMENSION = max(64, int(os.environ.get("THEME_ASSET_MAX_DIMENSION", "320")))


def _is_theme_dir(path: Path) -> bool:
    return path.is_dir() and (path / "config.json").is_file() and path.name not in EXCLUDED_DIRS and not path.name.startswith(".")


def _discover_theme_dirs() -> list[Path]:
    return sorted([p for p in REPO_ROOT.iterdir() if _is_theme_dir(p)], key=lambda p: p.name.lower())


def _iter_images(theme_dir: Path) -> list[Path]:
    out: list[Path] = []
    for p in theme_dir.rglob("*"):
        if not p.is_file():
            continue
        if p.suffix.lower() not in IMAGE_SUFFIXES:
            continue
        out.append(p)
    return out


def _resize_if_needed(img: Image.Image) -> tuple[Image.Image, bool]:
    width, height = img.size
    if width <= MAX_DIMENSION and height <= MAX_DIMENSION:
        return img, False
    ratio = min(MAX_DIMENSION / float(width), MAX_DIMENSION / float(height))
    new_size = (max(1, int(width * ratio)), max(1, int(height * ratio)))
    resized = img.resize(new_size, Image.Resampling.LANCZOS)
    return resized, True


def _encode_png(img: Image.Image) -> bytes:
    out = io.BytesIO()
    img.save(out, format="PNG", optimize=True, compress_level=9)
    return out.getvalue()


def _encode_jpeg_or_webp(img: Image.Image, suffix: str) -> bytes:
    fmt = "WEBP" if suffix == ".webp" else "JPEG"
    if fmt == "JPEG" and img.mode in {"RGBA", "LA", "P"}:
        img = img.convert("RGB")
    out = io.BytesIO()
    if fmt == "WEBP":
        img.save(out, format=fmt, quality=86, method=6)
    else:
        img.save(out, format=fmt, quality=88, optimize=True, progressive=True)
    return out.getvalue()


def _optimize_image(path: Path) -> tuple[bool, str]:
    suffix = path.suffix.lower()
    original = path.read_bytes()
    try:
        with Image.open(path) as opened:
            opened.load()
            img, resized = _resize_if_needed(opened)
            if suffix == ".png":
                encoded = _encode_png(img)
            else:
                encoded = _encode_jpeg_or_webp(img, suffix)
    except Exception as exc:
        return False, f"skip (decode error: {exc})"

    should_write = False
    reason = ""
    if resized:
        should_write = True
        reason = f"resized to <= {MAX_DIMENSION}px"
    if len(encoded) < len(original):
        should_write = True
        if reason:
            reason += " and "
        reason += f"compressed {len(original)} -> {len(encoded)} bytes"

    if not should_write:
        return False, "unchanged"

    path.write_bytes(encoded)
    return True, reason


def main() -> int:
    theme_dirs = _discover_theme_dirs()
    if not theme_dirs:
        print("No theme folders found for asset optimization.")
        return 0

    changed = 0
    scanned = 0
    for theme_dir in theme_dirs:
        for img_path in _iter_images(theme_dir):
            scanned += 1
            updated, detail = _optimize_image(img_path)
            if updated:
                changed += 1
                rel = img_path.relative_to(REPO_ROOT)
                print(f"optimized {rel} ({detail})")

    print(f"Asset optimization complete: scanned={scanned}, optimized={changed}, max_dim={MAX_DIMENSION}px")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

