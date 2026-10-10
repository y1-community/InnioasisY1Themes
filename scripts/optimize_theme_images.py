#!/usr/bin/env python3
"""Website JPEG covers and lossless PNG optimization for theme folders.

PNG theme assets stay PNG, including alpha. ``cover.jpg`` and ``cover-thumb.jpg``
are extra files for the gallery. They are not written into ``themeCover`` and are
not a replacement for the downloadable theme.

One bad image is logged and skipped. This script exits 0 unless it cannot read
the catalogue at all.
"""

from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path
from typing import Any

REPO_ROOT = Path(__file__).resolve().parents[1]
THEMES_JSON = REPO_ROOT / "themes.json"
GALLERY_BG = (23, 25, 31)  # #17191f, the gallery card background
COVER_MAX = 640
THUMB_MAX = 320
COVER_NAME = "cover.jpg"
THUMB_NAME = "cover-thumb.jpg"
IMAGE_EXTS = {".png", ".jpg", ".jpeg", ".webp", ".gif"}
SKIP_DIR_NAMES = {
    ".git",
    ".github",
    ".vscode",
    "scripts",
    "functions",
    "node_modules",
    "__pycache__",
}
OXIPNG_ARGS = [
    "-o",
    "2",
    "--strip",
    "safe",
    "--nb",
    "--nc",
    "--np",
    "--ng",
    "-q",
]


def _read_json(path: Path) -> dict[str, Any] | None:
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return None
    return data if isinstance(data, dict) else None


def _case_insensitive_file(folder: Path, relative: str) -> Path | None:
    """Resolve a config path when the filename case does not match the filesystem."""
    parts = [part for part in relative.replace("\\", "/").split("/") if part and part != "."]
    if not parts or ".." in parts:
        return None
    current = folder
    for part in parts:
        if not current.is_dir():
            return None
        exact = current / part
        if exact.exists():
            current = exact
            continue
        match = next((child for child in current.iterdir() if child.name.lower() == part.lower()), None)
        if match is None:
            return None
        current = match
    return current if current.is_file() else None


def find_cover_source(folder: Path) -> Path | None:
    """Best existing image to derive the website cover from. Never returns a generated thumb."""
    config = _read_json(folder / "config.json") or {}
    theme_cover = str(config.get("themeCover") or "").strip().replace("\\", "/")
    if theme_cover and not theme_cover.lower().startswith(("http://", "https://")):
        candidate = _case_insensitive_file(folder, theme_cover.lstrip("./"))
        if candidate and candidate.suffix.lower() in IMAGE_EXTS and candidate.name.lower() != THUMB_NAME:
            return candidate
    for name in ("cover.png", "cover.jpg", "cover.jpeg", "screenshot.png", "cover1.png"):
        candidate = _case_insensitive_file(folder, name)
        if candidate and candidate.name.lower() != THUMB_NAME:
            return candidate
    return None


def flatten_for_jpeg(image: Any) -> Any:
    """Composite alpha onto the gallery background. Opaque images stay their own colors."""
    from PIL import Image

    if image.mode == "P" and "transparency" in image.info:
        image = image.convert("RGBA")
    if image.mode in ("RGBA", "LA"):
        rgba = image.convert("RGBA")
        alpha = rgba.getchannel("A")
        lo, hi = alpha.getextrema()
        if lo == 255 and hi == 255:
            return rgba.convert("RGB")
        background = Image.new("RGB", rgba.size, GALLERY_BG)
        background.paste(rgba, mask=alpha)
        return background
    return image.convert("RGB")


def _save_jpeg(image: Any, dest: Path, max_edge: int, quality: int) -> None:
    from PIL import Image

    frame = image.copy()
    frame.thumbnail((max_edge, max_edge), Image.Resampling.LANCZOS)
    dest.parent.mkdir(parents=True, exist_ok=True)
    frame.save(
        dest,
        format="JPEG",
        quality=quality,
        optimize=True,
        progressive=True,
    )


def write_web_covers(folder: Path, source: Path) -> str:
    """Write cover.jpg and cover-thumb.jpg. Returns a short status. Raises on unexpected bugs only."""
    from PIL import Image, UnidentifiedImageError

    try:
        with Image.open(source) as image:
            image.load()
            rgb = flatten_for_jpeg(image)
            _save_jpeg(rgb, folder / COVER_NAME, COVER_MAX, 82)
            _save_jpeg(rgb, folder / THUMB_NAME, THUMB_MAX, 75)
    except (UnidentifiedImageError, OSError, ValueError) as exc:
        return f"skip {source.name}: {exc}"
    return "wrote"


def optimize_pngs_in_folder(folder: Path) -> tuple[int, str]:
    """Lossless oxipng on PNGs under ``folder``. Missing oxipng is a skip, not a failure."""
    import shutil

    oxipng = shutil.which("oxipng")
    if not oxipng:
        return 0, "oxipng not installed"
    pngs = [p for p in folder.rglob("*") if p.is_file() and p.suffix.lower() == ".png"]
    if not pngs:
        return 0, "no png"
    try:
        subprocess.run(
            [oxipng, *OXIPNG_ARGS, "--", *[str(p) for p in pngs]],
            check=False,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.PIPE,
            text=True,
        )
    except OSError as exc:
        return 0, f"oxipng failed: {exc}"
    return len(pngs), "ok"


def optimize_theme_folder(
    folder: Path,
    *,
    optimize_png: bool = True,
    only_missing_covers: bool = False,
) -> dict[str, Any]:
    """Optimize one theme directory. Never raises for a bad image."""
    result: dict[str, Any] = {"folder": folder.name, "covers": "missing-source", "pngs": 0, "error": ""}
    try:
        if not folder.is_dir():
            result["error"] = "not a directory"
            return result
        source = find_cover_source(folder)
        cover_jpg = folder / COVER_NAME
        if source is None:
            result["covers"] = "no-source"
        elif only_missing_covers and cover_jpg.is_file() and (folder / THUMB_NAME).is_file():
            result["covers"] = "present"
        else:
            result["covers"] = write_web_covers(folder, source)
        if optimize_png:
            count, status = optimize_pngs_in_folder(folder)
            result["pngs"] = count
            if status not in {"ok", "no png", "oxipng not installed"}:
                result["error"] = status
    except Exception as exc:
        result["error"] = str(exc)
        result["covers"] = "error"
    return result


def iter_theme_folders(root: Path) -> list[Path]:
    """Theme roots only. Nested config.json files are variant packs, not extra themes."""
    found: list[Path] = []
    for cfg in root.rglob("config.json"):
        if any(part in SKIP_DIR_NAMES or part.startswith(".") for part in cfg.parts):
            continue
        if cfg.parent.parent != root:
            continue
        found.append(cfg.parent)
    return found


def point_catalog_at_jpeg(themes_path: Path = THEMES_JSON) -> int:
    """Point themes.json screenshot fields at cover.jpg when that file exists."""
    try:
        data = json.loads(themes_path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        print(f"WARNING: could not update themes.json: {exc}", file=sys.stderr)
        return 0
    themes = data.get("themes")
    if not isinstance(themes, list):
        return 0
    changed = 0
    for item in themes:
        if not isinstance(item, dict):
            continue
        folder = str(item.get("folder") or "").strip()
        if not folder or "/" in folder or folder.startswith("."):
            continue
        if (REPO_ROOT / folder / COVER_NAME).is_file():
            rel = f"./{folder}/{COVER_NAME}"
            if item.get("screenshot") != rel:
                item["screenshot"] = rel
                changed += 1
    if changed:
        themes_path.write_text(json.dumps(data, indent=4, ensure_ascii=False) + "\n", encoding="utf-8")
    return changed


def main(argv: list[str] | None = None) -> int:
    args = list(sys.argv[1:] if argv is None else argv)
    only_missing = "--only-missing" in args
    optimize_png = "--optimize-png" in args
    folders: list[Path] = []
    if "--folder" in args:
        idx = args.index("--folder")
        if idx + 1 >= len(args):
            print("ERROR: --folder needs a path", file=sys.stderr)
            return 2
        folders = [Path(args[idx + 1])]
        if not folders[0].is_absolute():
            folders[0] = REPO_ROOT / folders[0]
    else:
        folders = iter_theme_folders(REPO_ROOT)

    wrote = 0
    skipped = 0
    errors = 0
    total = len(folders)
    for index, folder in enumerate(folders, start=1):
        missing_covers = not ((folder / COVER_NAME).is_file() and (folder / THUMB_NAME).is_file())
        # Full-repo PNG passes are too slow for the 15-minute ingest cron. On
        # --only-missing, compress PNGs only in folders that still need covers
        # (a new upload). An explicit --folder run compresses that folder.
        png_this = optimize_png and (not only_missing or missing_covers or "--folder" in args)
        result = optimize_theme_folder(
            folder,
            optimize_png=png_this,
            only_missing_covers=only_missing,
        )
        status = str(result.get("covers") or "")
        if status == "wrote":
            wrote += 1
        elif status.startswith("skip") or status == "error" or result.get("error"):
            errors += 1
            print(f"WARNING: {folder}: {result.get('error') or status}", file=sys.stderr)
        else:
            skipped += 1
        if index == 1 or index % 50 == 0 or index == total:
            print(f"[{index}/{total}] {folder.name}: {status}", flush=True)
    catalog = point_catalog_at_jpeg()
    print(
        f"Web covers: wrote {wrote}, unchanged {skipped}, image errors {errors}, "
        f"themes.json screenshots updated {catalog}."
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
