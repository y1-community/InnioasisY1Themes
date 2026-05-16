"""Tests for zip theme key collapse and variant dropping."""

from __future__ import annotations

import zip_theme_utils as ztu


def test_collapse_redundant_root_allows_variant_subtree_keys() -> None:
    names_t = [
        "config.json",
        "Musica_Metro/config.json",
        "Musica_Metro/Variants/Dark/config.json",
        "Musica_Metro/bg.png",
    ]
    keys = [".", "Musica_Metro", "Musica_Metro/Variants/Dark"]
    out = ztu.collapse_redundant_root_theme_key(names_t, keys, "Musica_Metro")
    assert out == ["Musica_Metro", "Musica_Metro/Variants/Dark"]


def test_drop_variant_keys_removes_under_parent_root() -> None:
    keys = [".", "Musica_Metro", "Musica_Metro/Variants/Dark"]
    assert ztu.drop_variant_keys_under_parent_theme(keys) == [".", "Musica_Metro"]


def test_drop_variant_keys_two_roots_regression() -> None:
    keys = ["A", "B", "A/Variants/X"]
    assert ztu.drop_variant_keys_under_parent_theme(keys) == ["A", "B"]


def test_allowed_theme_index_html_relpath_root_only() -> None:
    from pathlib import PurePosixPath

    assert ztu.allowed_theme_index_html_relpath(PurePosixPath("index.html")) is True


def test_allowed_theme_index_html_relpath_variant_subfolder() -> None:
    from pathlib import PurePosixPath

    assert ztu.allowed_theme_index_html_relpath(PurePosixPath("Variants/Dark/_share/index.html")) is True
    assert ztu.allowed_theme_index_html_relpath(PurePosixPath("Variants/Dark/preview/index.html")) is True


def test_allowed_theme_index_html_relpath_allows_variant_root_index() -> None:
    from pathlib import PurePosixPath

    assert ztu.allowed_theme_index_html_relpath(PurePosixPath("Variants/Dark/index.html")) is True


def test_allowed_theme_index_html_relpath_rejects_bare_variants_index() -> None:
    from pathlib import PurePosixPath

    assert ztu.allowed_theme_index_html_relpath(PurePosixPath("Variants/index.html")) is False


def test_is_allowed_theme_index_html_zip_member() -> None:
    keys = ["Tomodachi_Life"]
    assert ztu.is_allowed_theme_index_html_zip_member("Tomodachi_Life/index.html", keys) is True
    assert ztu.is_allowed_theme_index_html_zip_member("Tomodachi_Life/Variants/Look/_share/index.html", keys) is True
    assert ztu.is_allowed_theme_index_html_zip_member("Tomodachi_Life/Variants/Look/index.html", keys) is True
    assert ztu.is_allowed_theme_index_html_zip_member("Tomodachi_Life/other.html", keys) is False
