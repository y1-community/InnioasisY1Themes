"""Direct checks for website cover generation. Run: python3 scripts/test_optimize_theme_images.py"""

from __future__ import annotations

import json
import tempfile
from pathlib import Path

import optimize_theme_images as images


def test_flatten_opaque_does_not_paint_gallery_background() -> None:
    from PIL import Image

    src = Image.new("RGBA", (4, 4), (200, 10, 10, 255))
    flat = images.flatten_for_jpeg(src)
    assert flat.mode == "RGB"
    assert flat.getpixel((0, 0)) == (200, 10, 10)


def test_flatten_transparent_uses_gallery_background() -> None:
    from PIL import Image

    src = Image.new("RGBA", (2, 2), (0, 0, 0, 0))
    flat = images.flatten_for_jpeg(src)
    assert flat.getpixel((0, 0)) == images.GALLERY_BG


def test_bad_image_does_not_raise_and_good_image_writes_covers() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        folder = Path(tmp)
        (folder / "config.json").write_text(
            json.dumps({"themeCover": "cover.png", "theme_info": {"title": "t", "author": "a"}}),
            encoding="utf-8",
        )
        (folder / "cover.png").write_bytes(b"not a png")
        bad = images.optimize_theme_folder(folder, optimize_png=False)
        assert str(bad.get("covers") or "").startswith("skip")
        assert not (folder / "cover.jpg").exists()

        from PIL import Image

        Image.new("RGB", (800, 600), (12, 80, 200)).save(folder / "cover.png")
        good = images.optimize_theme_folder(folder, optimize_png=False)
        assert good.get("covers") == "wrote"
        assert (folder / "cover.jpg").is_file()
        assert (folder / "cover-thumb.jpg").is_file()
        with Image.open(folder / "cover.jpg") as cover:
            assert max(cover.size) <= images.COVER_MAX
        with Image.open(folder / "cover-thumb.jpg") as thumb:
            assert max(thumb.size) <= images.THUMB_MAX


def test_cover_source_matches_filename_case() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        folder = Path(tmp)
        (folder / "config.json").write_text(json.dumps({"themeCover": "Cover.png"}), encoding="utf-8")
        from PIL import Image

        Image.new("RGB", (8, 8), (1, 2, 3)).save(folder / "Cover.PNG")
        source = images.find_cover_source(folder)
        assert source is not None
        assert source.name == "Cover.PNG"


def test_catalog_points_at_cover_jpg() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        theme = root / "demo"
        theme.mkdir()
        (theme / "cover.jpg").write_bytes(b"jpg")
        catalog = root / "themes.json"
        catalog.write_text(
            json.dumps({"themes": [{"folder": "demo", "screenshot": "./demo/cover.png"}]}),
            encoding="utf-8",
        )
        original = images.REPO_ROOT
        images.REPO_ROOT = root
        try:
            changed = images.point_catalog_at_jpeg(catalog)
        finally:
            images.REPO_ROOT = original
        assert changed == 1
        data = json.loads(catalog.read_text(encoding="utf-8"))
        assert data["themes"][0]["screenshot"] == "./demo/cover.jpg"


def main() -> None:
    test_flatten_opaque_does_not_paint_gallery_background()
    test_flatten_transparent_uses_gallery_background()
    test_bad_image_does_not_raise_and_good_image_writes_covers()
    test_cover_source_matches_filename_case()
    test_catalog_points_at_cover_jpg()
    print("ok")


if __name__ == "__main__":
    main()
