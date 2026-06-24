#!/usr/bin/env python3
"""Classify theme removal PR bodies for automated maintainer handling."""

from __future__ import annotations

import re
from dataclasses import dataclass
from enum import Enum


class RemovalKind(str, Enum):
    AUTHOR_DISPUTE = "author_dispute"
    UPLOAD_RETRY = "upload_retry"
    DUPLICATE = "duplicate"
    GALLERY_OPT_OUT = "gallery_opt_out"


@dataclass
class RemovalRequest:
    folder: str
    catalog_title: str
    catalog_author: str
    requester: str
    reason: str
    blacklist_requested: bool
    kind: RemovalKind

    @property
    def opt_out_author(self) -> bool:
        return self.kind == RemovalKind.GALLERY_OPT_OUT

    @property
    def opt_out_folder(self) -> bool:
        return self.kind in (RemovalKind.DUPLICATE, RemovalKind.GALLERY_OPT_OUT)


_AUTHOR_DISPUTE_PATTERNS = (
    r"author\s+has\s+been\s+changed",
    r"wrong\s+author",
    r"incorrect\s+author",
    r"not\s+correct",
    r"originally\s+",
    r"author\s+details?",
    r"metadata",
    r"impersonat",
    r"credited\s+author",
    r"attribution",
    r"was\s+changed\s+to",
    r"should\s+be\s+",
)

_DUPLICATE_PATTERNS = (
    r"\bduplicate\b",
    r"same\s+theme",
    r"already\s+uploaded",
    r"other\s+version",
    r"my\s+other\s+",
)

_UPLOAD_RETRY_PATTERNS = (
    r"upload.*not.*work",
    r"not\s+working",
    r"remove.*upload.*new",
    r"re-?upload",
    r"upload.*update",
    r"uploaded an update",
)


def _field(body: str, label: str) -> str:
    pat = re.compile(
        rf"^\s*-\s*\*\*{re.escape(label)}:\*\*\s*(.+?)\s*$",
        re.I | re.M,
    )
    m = pat.search(body or "")
    return m.group(1).strip() if m else ""


def _folder_from_title(title: str) -> str:
    t = str(title or "").strip()
    if t.lower().startswith("[removal]"):
        return t.split("]", 1)[-1].strip()
    return t


def classify_removal_pr(*, title: str, body: str) -> RemovalRequest | None:
    folder = _field(body, "Folder").strip("` ") or _folder_from_title(title)
    if not folder:
        return None

    catalog_title = _field(body, "Catalog title")
    catalog_author = _field(body, "Catalog author")
    requester = _field(body, "Requester")
    reason = _field(body, "Reason")
    blacklist_line = _field(body, "Blacklist preference").lower()
    blacklist_requested = "requested" in blacklist_line and "not requested" not in blacklist_line

    reason_l = reason.lower()
    kind = RemovalKind.GALLERY_OPT_OUT
    if any(re.search(p, reason_l) for p in _AUTHOR_DISPUTE_PATTERNS):
        kind = RemovalKind.AUTHOR_DISPUTE
    elif any(re.search(p, reason_l) for p in _UPLOAD_RETRY_PATTERNS):
        kind = RemovalKind.UPLOAD_RETRY
    elif any(re.search(p, reason_l) for p in _DUPLICATE_PATTERNS):
        kind = RemovalKind.DUPLICATE

    return RemovalRequest(
        folder=folder,
        catalog_title=catalog_title,
        catalog_author=catalog_author.replace("_(none listed)_", "").strip(),
        requester=requester,
        reason=reason,
        blacklist_requested=blacklist_requested,
        kind=kind,
    )
