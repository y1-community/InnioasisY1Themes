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
