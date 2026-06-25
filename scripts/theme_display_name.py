#!/usr/bin/env python3
"""Strip trailing ' Theme' from theme titles and display names."""

from __future__ import annotations

import re


def normalize_spaces(value: str) -> str:
    return re.sub(r"\s+", " ", str(value or "").strip())


def strip_redundant_theme_word(name: str) -> str:
    s = normalize_spaces(name)
    if not s:
        return ""
    original = s
    while re.search(r"\s+theme$", s, re.I):
        s = re.sub(r"\s+theme$", "", s, flags=re.I).strip()
    return s or original


def sanitize_theme_title_input(value: str) -> tuple[str, bool]:
    trimmed = normalize_spaces(value)
    if not trimmed:
        return "", False
    cleaned = strip_redundant_theme_word(trimmed)
    return cleaned, cleaned != trimmed


def title_from_folder_stem(folder_stem: str) -> str:
    raw = str(folder_stem or "").strip()
    if not raw:
        return ""
    humanized = normalize_spaces(raw.replace("_", " "))
    return strip_redundant_theme_word(humanized) or humanized or raw
