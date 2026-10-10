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


def test_separate_foreign_owner_suffixes_and_credits_uploader() -> None:
    dest, overwrite, rewrite, credit, reason = ptz.separate_foreign_owner_folder(
        "Olivia_Rodrigo",
        overwrite=True,
        owner="Ethan Anaya",
        uploader="Shadow",
        uploader_slug="shadow",
        config_author="Ethan Anaya",
        existing_owners={"Olivia_Rodrigo": "Ethan Anaya"},
    )
    assert dest == "Olivia_Rodrigo_shadow"
    assert overwrite is False
    assert rewrite is True
    assert credit == "Shadow"
    assert "Olivia_Rodrigo" in reason


def test_separate_foreign_owner_keeps_uploader_when_config_already_names_them() -> None:
    dest, overwrite, rewrite, credit, _reason = ptz.separate_foreign_owner_folder(
        "Shadow_The_Hedgehog_2.0",
        overwrite=True,
        owner="Baddog22",
        uploader="Lilac06",
        uploader_slug="lilac06",
        config_author="Lilac06",
        existing_owners={"Shadow_The_Hedgehog_2.0": "Baddog22"},
    )
    assert dest == "Shadow_The_Hedgehog_2.0_lilac06"
    assert overwrite is False
    assert rewrite is False
    assert credit == "Lilac06"


def test_separate_foreign_owner_updates_same_uploader() -> None:
    dest, overwrite, rewrite, credit, reason = ptz.separate_foreign_owner_folder(
        "mcr",
        overwrite=True,
        owner="sasha",
        uploader="sasha",
        uploader_slug="sasha",
        config_author="sasha",
        existing_owners={"mcr": "sasha"},
    )
    assert dest == "mcr"
    assert overwrite is True
    assert rewrite is False
    assert reason == ""
    assert credit == "sasha"


def test_separate_foreign_owner_keeps_same_author_update_without_sidecar() -> None:
    dest, overwrite, rewrite, credit, reason = ptz.separate_foreign_owner_folder(
        "Cinnamoroll",
        overwrite=True,
        owner="Aisha Shanaya Wasi",
        uploader="",
        uploader_slug="",
        config_author="Aisha Shanaya Wasi",
        existing_owners={"Cinnamoroll": "Aisha Shanaya Wasi"},
    )
    assert dest == "Cinnamoroll"
    assert overwrite is True
    assert rewrite is False
    assert credit == "Aisha Shanaya Wasi"
    assert reason == ""


def test_separate_foreign_owner_uses_unknown_when_config_author_is_missing() -> None:
    dest, overwrite, rewrite, credit, _reason = ptz.separate_foreign_owner_folder(
        "Cinnamoroll",
        overwrite=True,
        owner="Aisha Shanaya Wasi",
        uploader="",
        uploader_slug="",
        config_author="",
        existing_owners={"Cinnamoroll": "Aisha Shanaya Wasi"},
    )
    assert dest == "Cinnamoroll_unknown"
    assert overwrite is False
    assert rewrite is True
    assert credit == "Unknown"
