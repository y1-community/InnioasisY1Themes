#!/usr/bin/env python3
"""End-to-end git tests for scripts/validate_theme_pr.py auto-merge & anti-vandalism rules."""

from __future__ import annotations

import io
import json
import os
import subprocess
import sys
import tempfile
import unittest
import zipfile
from pathlib import Path

SCRIPTS_DIR = Path(__file__).resolve().parent
VALIDATOR = SCRIPTS_DIR / "validate_theme_pr.py"

PNG_A = b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR-ALPHA-ART-BYTES-0001"
PNG_B = b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR-BETA-WALLPAPER-0002"
PNG_FM = b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR-FILE-MANAGER-Y2-0003"
PNG_NEW = b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR-BRAND-NEW-CUSTOM-0004"
PNG_TRANSPARENT = b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR-TRANSPARENT-1X1"


def _git(repo: Path, *args: str) -> str:
    res = subprocess.run(
        ["git", *args],
        cwd=str(repo),
        check=True,
        capture_output=True,
        text=True,
    )
    return res.stdout.strip()


def _make_zip_bytes(files: dict[str, bytes]) -> bytes:
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", compression=zipfile.ZIP_DEFLATED) as zf:
        for name, data in files.items():
            zf.writestr(name, data)
    return buf.getvalue()


class ValidateThemePrTests(unittest.TestCase):
    def setUp(self) -> None:
        self._tmp = tempfile.TemporaryDirectory()
        self.repo = Path(self._tmp.name)
        _git(self.repo, "init", "-b", "main")
        _git(self.repo, "config", "user.email", "test@example.com")
        _git(self.repo, "config", "user.name", "Test")

        self.base_cfg = {
            "theme_info": {
                "title": "Sample Theme",
                "author": "Alice",
                "description": "Original Y1 theme",
            },
            "desktopWallpaper": "wall.png",
            "globalWallpaper": "wall.png",
            "homePageConfig": {
                "nowPlaying": "icon.png",
                "music": "icon.png",
            },
            "statusConfig": {
                "statusTextColor": "#00ff00",
            },
        }
        theme_dir = self.repo / "Sample Theme"
        theme_dir.mkdir(parents=True)
        (theme_dir / "config.json").write_text(json.dumps(self.base_cfg, indent=2), encoding="utf-8")
        (theme_dir / "wall.png").write_bytes(PNG_B)
        (theme_dir / "icon.png").write_bytes(PNG_A)
        (self.repo / "themes.json").write_text(
            json.dumps(
                {
                    "themes": [
                        {
                            "folder": "Sample Theme",
                            "name": "Sample Theme",
                            "author": "Alice",
                            "description": "Original Y1 theme",
                        }
                    ]
                },
                indent=2,
            ),
            encoding="utf-8",
        )
        _git(self.repo, "add", "-A")
        _git(self.repo, "commit", "-m", "base")
        self.base_sha = _git(self.repo, "rev-parse", "HEAD")

    def tearDown(self) -> None:
        self._tmp.cleanup()

    def _run_validator(self, pr_branch: str) -> tuple[int, str]:
        env = dict(os.environ)
        env["PYTHONPATH"] = str(SCRIPTS_DIR)
        res = subprocess.run(
            [sys.executable, str(VALIDATOR), self.base_sha, pr_branch],
            cwd=str(self.repo),
            capture_output=True,
            text=True,
            env=env,
        )
        return res.returncode, res.stdout + res.stderr

    def test_direct_file_manager_only_update_auto_merges(self) -> None:
        _git(self.repo, "checkout", "-b", "pr-direct-fm", self.base_sha)
        cfg = json.loads(json.dumps(self.base_cfg))
        cfg["homePageConfig"]["fileManager"] = "files_y2.png"
        cfg["theme_info"]["updatedAt"] = "2026-11-27T15:00:00Z"
        cfg["statusConfig"]["statusTextColor"] = "#ffffff"
        (self.repo / "Sample Theme" / "config.json").write_text(json.dumps(cfg, indent=2), encoding="utf-8")
        (self.repo / "Sample Theme" / "files_y2.png").write_bytes(PNG_FM)
        _git(self.repo, "add", "-A")
        _git(self.repo, "commit", "-m", "add y2 file manager icon")

        rc, out = self._run_validator("pr-direct-fm")
        self.assertEqual(rc, 0, out)
        self.assertIn("THEME_PR_AUTO_MERGE_ALLOWED=1", out)

    def test_zip_file_manager_only_update_auto_merges(self) -> None:
        _git(self.repo, "checkout", "-b", "pr-zip-fm", self.base_sha)
        cfg = json.loads(json.dumps(self.base_cfg))
        cfg["homePageConfig"]["fileManager"] = "custom_fm.png"
        cfg["homePageConfig"]["ebook"] = "transparent.png"
        cfg["theme_info"]["updatedAt"] = "2026-11-27T15:05:00Z"
        cfg["statusConfig"]["statusTextColor"] = "#ffffff"
        zbytes = _make_zip_bytes(
            {
                "Sample Theme/config.json": json.dumps(cfg, indent=2).encode("utf-8"),
                "Sample Theme/wall.png": PNG_B,
                "Sample Theme/icon.png": PNG_A,
                "Sample Theme/custom_fm.png": PNG_FM,
                "Sample Theme/transparent.png": PNG_TRANSPARENT,
                "Sample Theme/screenshot_preview.jpg": b"\xff\xd8\xff\xe0PREVIEW",
            }
        )
        (self.repo / "Sample_Theme.zip").write_bytes(zbytes)
        (self.repo / "Sample_Theme.zip.meta.json").write_text(
            json.dumps({"uploaderName": "Alice", "submissionIntent": "update"}), encoding="utf-8"
        )
        _git(self.repo, "add", "-A")
        _git(self.repo, "commit", "-m", "zip y2 fm update")

        rc, out = self._run_validator("pr-zip-fm")
        self.assertEqual(rc, 0, out)
        self.assertIn("THEME_PR_AUTO_MERGE_ALLOWED=1", out)

    def test_zip_fm_update_with_metadata_or_other_art_change_requires_review(self) -> None:
        _git(self.repo, "checkout", "-b", "pr-zip-fm-hijack", self.base_sha)
        cfg = json.loads(json.dumps(self.base_cfg))
        cfg["homePageConfig"]["fileManager"] = "custom_fm.png"
        cfg["theme_info"]["author"] = "Vandal"
        zbytes = _make_zip_bytes(
            {
                "Sample Theme/config.json": json.dumps(cfg, indent=2).encode("utf-8"),
                "Sample Theme/wall.png": PNG_B,
                "Sample Theme/icon.png": PNG_A,
                "Sample Theme/custom_fm.png": PNG_FM,
            }
        )
        (self.repo / "Sample_Theme.zip").write_bytes(zbytes)
        _git(self.repo, "add", "-A")
        _git(self.repo, "commit", "-m", "hijack attempt")

        rc, out = self._run_validator("pr-zip-fm-hijack")
        self.assertEqual(rc, 0, out)
        self.assertIn("THEME_PR_AUTO_MERGE_ALLOWED=0", out)

    def test_metadata_only_pr_never_auto_merges(self) -> None:
        _git(self.repo, "checkout", "-b", "pr-meta", self.base_sha)
        cfg = json.loads(json.dumps(self.base_cfg))
        cfg["theme_info"]["description"] = "Vandalized description"
        (self.repo / "Sample Theme" / "config.json").write_text(json.dumps(cfg, indent=2), encoding="utf-8")
        _git(self.repo, "add", "-A")
        _git(self.repo, "commit", "-m", "metadata edit")

        rc, out = self._run_validator("pr-meta")
        self.assertEqual(rc, 0, out)
        self.assertIn("THEME_PR_AUTO_MERGE_ALLOWED=0", out)

    def test_gallery_text_only_pr_never_auto_merges(self) -> None:
        _git(self.repo, "checkout", "-b", "pr-gallery-text", self.base_sha)
        catalog = json.loads((self.repo / "themes.json").read_text(encoding="utf-8"))
        catalog["themes"][0]["description"] = "A refreshed description with no new artwork"
        (self.repo / "themes.json").write_text(json.dumps(catalog, indent=2), encoding="utf-8")
        _git(self.repo, "add", "-A")
        _git(self.repo, "commit", "-m", "listing text only")

        rc, out = self._run_validator("pr-gallery-text")
        self.assertEqual(rc, 0, out)
        self.assertIn("THEME_PR_AUTO_MERGE_ALLOWED=0", out)
        self.assertIn("THEME_PR_MANUAL_REVIEW", out)

    def test_existing_theme_text_only_package_never_auto_merges(self) -> None:
        _git(self.repo, "checkout", "-b", "pr-text-package", self.base_sha)
        cfg = json.loads(json.dumps(self.base_cfg))
        cfg["theme_info"]["description"] = "A new description, with no artwork changes"
        zbytes = _make_zip_bytes(
            {
                "Sample Theme/config.json": json.dumps(cfg, indent=2).encode("utf-8"),
                "Sample Theme/wall.png": PNG_B,
                "Sample Theme/icon.png": PNG_A,
            }
        )
        (self.repo / "Sample_Theme.zip").write_bytes(zbytes)
        (self.repo / "Sample_Theme.zip.meta.json").write_text(
            json.dumps({"uploaderName": "Alice", "submissionIntent": "update"}), encoding="utf-8"
        )
        _git(self.repo, "add", "-A")
        _git(self.repo, "commit", "-m", "text-only update package")

        rc, out = self._run_validator("pr-text-package")
        self.assertEqual(rc, 0, out)
        self.assertIn("THEME_PR_AUTO_MERGE_ALLOWED=0", out)

    def test_existing_theme_general_update_never_auto_merges(self) -> None:
        _git(self.repo, "checkout", "-b", "pr-update-art", self.base_sha)
        zbytes = _make_zip_bytes(
            {
                "Sample Theme/config.json": json.dumps(self.base_cfg, indent=2).encode("utf-8"),
                "Sample Theme/wall.png": PNG_NEW,
                "Sample Theme/icon.png": PNG_A,
            }
        )
        (self.repo / "Sample_Theme.zip").write_bytes(zbytes)
        _git(self.repo, "add", "-A")
        _git(self.repo, "commit", "-m", "update wallpaper")

        rc, out = self._run_validator("pr-update-art")
        self.assertEqual(rc, 0, out)
        self.assertIn("THEME_PR_AUTO_MERGE_ALLOWED=0", out)

    def test_unchanged_clone_under_new_title_blocks_auto_merge(self) -> None:
        _git(self.repo, "checkout", "-b", "pr-clone", self.base_sha)
        cfg = json.loads(json.dumps(self.base_cfg))
        cfg["theme_info"]["title"] = "Totally Original Clone"
        cfg["theme_info"]["author"] = "Bob"
        zbytes = _make_zip_bytes(
            {
                "Totally Original Clone/config.json": json.dumps(cfg, indent=2).encode("utf-8"),
                "Totally Original Clone/wall.png": PNG_B,
                "Totally Original Clone/icon.png": PNG_A,
            }
        )
        (self.repo / "Totally_Original_Clone.zip").write_bytes(zbytes)
        _git(self.repo, "add", "-A")
        _git(self.repo, "commit", "-m", "unchanged clone")

        rc, out = self._run_validator("pr-clone")
        self.assertEqual(rc, 0, out)
        self.assertIn("THEME_PR_AUTO_MERGE_ALLOWED=0", out)
        self.assertIn("byte-identical", out)

    def test_new_theme_with_modified_image_auto_merges(self) -> None:
        _git(self.repo, "checkout", "-b", "pr-new-remix", self.base_sha)
        cfg = json.loads(json.dumps(self.base_cfg))
        cfg["theme_info"]["title"] = "Brand New Remix"
        cfg["theme_info"]["author"] = "Bob"
        zbytes = _make_zip_bytes(
            {
                "Brand New Remix/config.json": json.dumps(cfg, indent=2).encode("utf-8"),
                "Brand New Remix/wall.png": PNG_NEW,
                "Brand New Remix/icon.png": PNG_A,
            }
        )
        (self.repo / "Brand_New_Remix.zip").write_bytes(zbytes)
        _git(self.repo, "add", "-A")
        _git(self.repo, "commit", "-m", "new remix")

        rc, out = self._run_validator("pr-new-remix")
        self.assertEqual(rc, 0, out)
        self.assertIn("THEME_PR_AUTO_MERGE_ALLOWED=1", out)


if __name__ == "__main__":
    unittest.main()
