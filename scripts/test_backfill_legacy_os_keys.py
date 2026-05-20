#!/usr/bin/env python3
import json
import shutil
import tempfile
import unittest
from pathlib import Path

from backfill_legacy_os_keys import (
    TRANSPARENT_FILENAME,
    TRANSPARENT_VALUE,
    add_legacy_os_keys,
    backfill_config_file,
    ensure_canonical_transparent_source,
    fill_theme_folder,
    iter_content_dirs,
    sync_transparent_png,
    sync_transparent_in_theme_folder,
)


REF = {
    "homePageConfig": {
        "ebook": "ebook.png",
        "calendar": "calendar.png",
        "calculator": "calculator.png",
    },
    "settingConfig": {"launcher": "Launcher.png"},
}


class LegacyOsBackfillTests(unittest.TestCase):
    def test_circular_like_adds_keys(self) -> None:
        cfg = {
            "homePageConfig": {"music": "Music_YS.png", "settings": "Settings_YS.png"},
            "settingConfig": {"shutdown": "Shutdown@1x.png"},
        }
        self.assertTrue(add_legacy_os_keys(cfg, REF))
        self.assertEqual(cfg["homePageConfig"]["music"], "Music_YS.png")
        self.assertEqual(cfg["homePageConfig"]["ebook"], TRANSPARENT_VALUE)
        self.assertEqual(cfg["homePageConfig"]["calendar"], TRANSPARENT_VALUE)
        self.assertEqual(cfg["homePageConfig"]["calculator"], TRANSPARENT_VALUE)
        self.assertEqual(cfg["settingConfig"]["launcher"], TRANSPARENT_VALUE)

    def test_minecraft_like_unchanged(self) -> None:
        cfg = {
            "homePageConfig": {
                "ebook": "ebook.png",
                "calendar": "calendar.png",
                "calculator": "calculator.png",
            },
            "settingConfig": {"launcher": "Launcher.png"},
        }
        self.assertFalse(add_legacy_os_keys(cfg, REF))

    def test_empty_string_unchanged(self) -> None:
        cfg = {"homePageConfig": {"ebook": ""}}
        add_legacy_os_keys(cfg, REF)
        self.assertEqual(cfg["homePageConfig"]["ebook"], "")

    def test_sync_replaces_wrong_transparent(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            theme = Path(tmp) / "Theme"
            theme.mkdir()
            dest = theme / TRANSPARENT_FILENAME
            dest.write_bytes(b"legacy-custom-transparent")
            source = ensure_canonical_transparent_source()
            self.assertTrue(sync_transparent_png(theme, source))
            self.assertEqual(dest.read_bytes(), source.read_bytes())

    def test_sync_skips_when_already_canonical(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            theme = Path(tmp) / "Theme"
            theme.mkdir()
            source = ensure_canonical_transparent_source()
            shutil_copy = source.read_bytes()
            (theme / TRANSPARENT_FILENAME).write_bytes(shutil_copy)
            self.assertFalse(sync_transparent_png(theme, source))

    def test_backfill_config_file_additive_only(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            theme = Path(tmp) / "Theme"
            theme.mkdir()
            cfg_path = theme / "config.json"
            cfg_path.write_text(
                json.dumps({"homePageConfig": {"music": "a.png"}}, indent=4) + "\n",
                encoding="utf-8",
            )
            source = ensure_canonical_transparent_source()
            changed, copied = backfill_config_file(cfg_path, REF, transparent_source=source)
            self.assertTrue(changed)
            self.assertTrue(copied)
            data = json.loads(cfg_path.read_text(encoding="utf-8"))
            self.assertEqual(data["homePageConfig"]["music"], "a.png")
            self.assertEqual(data["homePageConfig"]["ebook"], TRANSPARENT_VALUE)
            self.assertEqual(data["settingConfig"]["launcher"], TRANSPARENT_VALUE)

    def test_variant_folder(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            variant = Path(tmp) / "Theme" / "Variants" / "Dark"
            variant.mkdir(parents=True)
            cfg_path = variant / "config.json"
            cfg_path.write_text(json.dumps({"homePageConfig": {}}, indent=4) + "\n", encoding="utf-8")
            source = ensure_canonical_transparent_source()
            changed, copied = backfill_config_file(cfg_path, REF, transparent_source=source)
            self.assertTrue(changed)
            self.assertTrue(copied)
            self.assertTrue((variant / TRANSPARENT_FILENAME).is_file())

    def test_fill_theme_folder_syncs_root_and_variant(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            theme = Path(tmp) / "Theme"
            root = theme
            root.mkdir(parents=True)
            (root / "config.json").write_text(json.dumps({"homePageConfig": {}}, indent=4) + "\n", encoding="utf-8")
            variant = theme / "Variants" / "Light"
            variant.mkdir(parents=True)
            (variant / "config.json").write_text(json.dumps({"homePageConfig": {}}, indent=4) + "\n", encoding="utf-8")
            (root / TRANSPARENT_FILENAME).write_bytes(b"bad-root")
            (variant / TRANSPARENT_FILENAME).write_bytes(b"bad-variant")
            source = ensure_canonical_transparent_source()
            self.assertTrue(fill_theme_folder(theme))
            self.assertEqual((root / TRANSPARENT_FILENAME).read_bytes(), source.read_bytes())
            self.assertEqual((variant / TRANSPARENT_FILENAME).read_bytes(), source.read_bytes())
            dirs = iter_content_dirs(theme)
            self.assertEqual(len(dirs), 2)


if __name__ == "__main__":
    unittest.main()
