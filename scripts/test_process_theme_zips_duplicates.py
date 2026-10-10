"""Duplicate-copy selection and ingest exit status."""

from __future__ import annotations

import process_theme_zips as ptz


def test_finder_duplicate_base_strips_copy_suffix() -> None:
    assert ptz._finder_duplicate_base("aqua y2k _v2_ 2") == "aqua y2k _v2_"
    assert ptz._finder_duplicate_base("Theme copy") == "Theme"
    assert ptz._finder_duplicate_base("Theme copy 2") == "Theme"
    assert ptz._finder_duplicate_base("Theme (1)") == "Theme"
    assert ptz._finder_duplicate_base("aqua y2k _v2_") is None
    assert ptz._finder_duplicate_base("Area51") is None


def test_prefer_theme_key_keeps_unsuffixed_finder_copy() -> None:
    original = "aqua_y2k__v2/aqua y2k _v2_"
    duplicate = "aqua_y2k__v2/aqua y2k _v2_ 2"
    assert ptz._prefer_theme_key(duplicate, original) == original
    assert ptz._prefer_theme_key(original, duplicate) == original
    assert ptz._prefer_theme_key("Pack/Theme copy 2", "Pack/Theme") == "Pack/Theme"
    assert ptz._prefer_theme_key("Pack/Theme", "Pack/Theme (1)") == "Pack/Theme"


def test_prefer_theme_key_keeps_current_when_names_are_unrelated() -> None:
    assert ptz._prefer_theme_key("Alpha", "Beta") == "Alpha"


def test_ingest_exit_code_does_not_fail_after_rejected_zip_is_removed() -> None:
    assert ptz.ingest_exit_code(rejected_remaining=0) == 0
    assert ptz.ingest_exit_code(rejected_remaining=1) == 1
