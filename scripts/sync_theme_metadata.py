#!/usr/bin/env python3
"""Synchronize theme folders, themes.json, config theme_info, and theme pages.

Behavior:
- Detect theme folders (root directories containing config.json).
- Ensure every detected folder has an entry in themes.json.
- Ensure each theme config.json contains theme_info (backfilled from themes.json/folder).
- Ensure each theme index.html exists and has theme-specific SEO metadata.
- Skip source-only folders that do not define theme image assets.
"""

from __future__ import annotations

import html
import json
import os
import re
import subprocess
import urllib.request
from pathlib import Path
from typing import Any


REPO_ROOT = Path(__file__).resolve().parents[1]
THEMES_JSON_PATH = REPO_ROOT / "themes.json"
THEME_TEMPLATE_PATH = REPO_ROOT / "theme.html"
SITE_BASE_URL = "https://themes.innioasis.app"
IMAGE_EXTENSIONS = {".gif", ".jpeg", ".jpg", ".png", ".svg", ".webp"}
PROTECTED_UPLOADERS = {
    "ryan-specter",
    "ryan specter",
    "itsryanspecter@gmail.com",
    "y1-community",
    "github-actions[bot]",
}
EXCLUDED_DIRS = {
    ".git",
    ".github",
    ".vscode",
    "__pycache__",
    "assets",
    "scripts",
}


def _extract_theme_objects_lenient(raw_text: str) -> list[dict[str, Any]]:
    """Best-effort parse for malformed themes.json files."""
    try:
        parsed = json.loads(raw_text)
        themes = parsed.get("themes", [])
        return themes if isinstance(themes, list) else []
    except Exception:
        pass

    themes_key = raw_text.find('"themes"')
    if themes_key == -1:
        return []
    array_start = raw_text.find("[", themes_key)
    if array_start == -1:
        return []

    depth = 0
    in_string = False
    escaping = False
    array_end = -1
    for idx in range(array_start, len(raw_text)):
        ch = raw_text[idx]
        if in_string:
            if escaping:
                escaping = False
            elif ch == "\\":
                escaping = True
            elif ch == '"':
                in_string = False
            continue
        if ch == '"':
            in_string = True
            continue
        if ch == "[":
            depth += 1
        elif ch == "]":
            depth -= 1
            if depth == 0:
                array_end = idx
                break
    if array_end == -1:
        return []

    payload = raw_text[array_start + 1 : array_end]
    objects: list[dict[str, Any]] = []

    depth = 0
    start = None
    in_string = False
    escaping = False
    for idx, ch in enumerate(payload):
        if in_string:
            if escaping:
                escaping = False
            elif ch == "\\":
                escaping = True
            elif ch == '"':
                in_string = False
            continue
        if ch == '"':
            in_string = True
            continue
        if ch == "{":
            if depth == 0:
                start = idx
            depth += 1
        elif ch == "}":
            depth -= 1
            if depth == 0 and start is not None:
                obj_text = payload[start : idx + 1]
                fixed = obj_text
                for _ in range(3):
                    # Insert missing commas before keys in malformed objects.
                    fixed = re.sub(r'(["\}\]0-9])\s*("[-A-Za-z0-9 _&./\u00C0-\u017F]+"\s*:)', r"\1,\2", fixed)
                try:
                    parsed_obj = json.loads(fixed)
                    if isinstance(parsed_obj, dict):
                        objects.append(parsed_obj)
                except Exception:
                    continue
    return objects


def _load_themes_json(path: Path) -> list[dict[str, Any]]:
    raw = path.read_text(encoding="utf-8")
    return _extract_theme_objects_lenient(raw)


def _iter_config_values(value: Any) -> list[Any]:
    if isinstance(value, dict):
        out: list[Any] = []
        for nested in value.values():
            out.extend(_iter_config_values(nested))
        return out
    if isinstance(value, list):
        out = []
        for nested in value:
            out.extend(_iter_config_values(nested))
        return out
    return [value]


def _looks_like_image_asset(value: Any) -> bool:
    if not isinstance(value, str):
        return False
    clean = value.strip()
    if not clean:
        return False
    suffix = Path(clean.split("?", 1)[0].split("#", 1)[0]).suffix.lower()
    return suffix in IMAGE_EXTENSIONS


def _has_theme_image_assets(config: dict[str, Any] | None) -> bool:
    if not isinstance(config, dict):
        return False
    source_info = config.get("source_info")
    for key, value in config.items():
        if key in {"theme_info", "source_info"}:
            continue
        if any(_looks_like_image_asset(item) for item in _iter_config_values(value)):
            return True
    return not isinstance(source_info, dict) and any(_looks_like_image_asset(item) for item in _iter_config_values(config))


def _is_theme_config(path: Path) -> bool:
    return _has_theme_image_assets(_load_json_file(path))


def _is_theme_dir(path: Path) -> bool:
    if not path.is_dir():
        return False
    if path.name in EXCLUDED_DIRS or path.name.startswith("."):
        return False
    config_path = path / "config.json"
    return config_path.is_file() and _is_theme_config(config_path)


def _discover_theme_folders(root: Path) -> list[str]:
    folders = [p.name for p in root.iterdir() if _is_theme_dir(p)]
    return sorted(folders, key=lambda s: s.lower())


def _load_json_file(path: Path) -> dict[str, Any] | None:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return None


def _extract_folder_key(item: dict[str, Any]) -> str:
    return str(item.get("folder") or item.get("Folder") or "").strip()


def _extract_theme_info_from_config(config: dict[str, Any]) -> dict[str, str]:
    theme_info = config.get("theme_info")
    if not isinstance(theme_info, dict):
        return {}
    extracted: dict[str, str] = {}
    for key in ("title", "author", "authorUrl", "description"):
        value = str(theme_info.get(key) or "").strip()
        if value:
            extracted[key] = value
    return extracted


def _default_description(name: str) -> str:
    return f"{name} theme for Innioasis Y1."


def _download_description(name: str, author: str = "") -> str:
    if author:
        return f"Download the {name} theme for Innioasis Y1 by {author} and personalize your player's look with curated UI assets."
    return f"Download the {name} theme for Innioasis Y1 and personalize your player's look with curated UI assets."


def _is_default_description(value: str, name: str) -> bool:
    clean_value = str(value or "").strip()
    return clean_value in {
        _default_description(name),
        f"Customize your Innioasis Y1 with the {name} theme.",
    }


def _clean_github_user(value: str, *, allow_name_fallback: bool = False) -> str:
    clean = str(value or "").strip()
    if not clean:
        return ""
    clean = clean.split("<", 1)[0].strip()
    match = re.match(r"^\d+\+([^@]+)@users\.noreply\.github\.com$", clean, re.I)
    if match:
        clean = match.group(1)
    elif "@" in clean:
        return ""
    if clean.endswith("[bot]"):
        return clean
    if allow_name_fallback:
        clean = re.sub(r"\s+", "-", clean)
    return clean.strip("@")


def _github_login_from_commit(commit_sha: str) -> str:
    if not commit_sha:
        return ""

    request = urllib.request.Request(
        f"https://api.github.com/repos/y1-community/InnioasisY1Themes/commits/{commit_sha}",
        headers={
            "Accept": "application/vnd.github+json",
            "User-Agent": "InnioasisY1Themes metadata sync",
        },
    )
    token = os.environ.get("GITHUB_TOKEN")
    if token:
        request.add_header("Authorization", f"Bearer {token}")

    try:
        with urllib.request.urlopen(request, timeout=10) as response:
            payload = json.loads(response.read().decode("utf-8"))
    except Exception:
        return ""

    for key in ("author", "committer"):
        user = payload.get(key)
        if isinstance(user, dict):
            login = str(user.get("login") or "").strip()
            if login:
                return login
    return ""


def _github_pr_author_from_commit(commit_sha: str) -> str:
    if not commit_sha:
        return ""

    request = urllib.request.Request(
        f"https://api.github.com/repos/y1-community/InnioasisY1Themes/commits/{commit_sha}/pulls",
        headers={
            "Accept": "application/vnd.github+json",
            "User-Agent": "InnioasisY1Themes metadata sync",
        },
    )
    token = os.environ.get("GITHUB_TOKEN")
    if token:
        request.add_header("Authorization", f"Bearer {token}")

    try:
        with urllib.request.urlopen(request, timeout=10) as response:
            payload = json.loads(response.read().decode("utf-8"))
    except Exception:
        return ""

    if not isinstance(payload, list):
        return ""

    # Prefer the earliest PR that references this commit.
    best_login = ""
    best_number: int | None = None
    for item in payload:
        if not isinstance(item, dict):
            continue
        user = item.get("user")
        login = str(user.get("login") or "").strip() if isinstance(user, dict) else ""
        if not login:
            continue
        number = item.get("number")
        if isinstance(number, int):
            if best_number is None or number < best_number:
                best_number = number
                best_login = login
        elif not best_login:
            best_login = login
    return best_login


def _infer_folder_uploader(folder: str) -> dict[str, str]:
    """Infer the GitHub user that first added files in a theme folder."""
    try:
        result = subprocess.run(
            [
                "git",
                "log",
                "--diff-filter=A",
                "--follow",
                "--format=%H%x00%an%x00%ae",
                "--",
                folder,
            ],
            cwd=REPO_ROOT,
            check=False,
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
        )
    except Exception:
        return {}

    if result.returncode != 0:
        return {}

    candidates: list[tuple[str, str, str]] = []
    for line in result.stdout.splitlines():
        if "\x00" not in line:
            continue
        parts = line.split("\x00", 2)
        if len(parts) != 3:
            continue
        commit_sha, author_name, author_email = parts
        candidates.append((commit_sha.strip(), author_name.strip(), author_email.strip()))

    if not candidates:
        return {}

    # git log is newest-first; the oldest add commit is the one that introduced the folder.
    commit_sha, author_name, author_email = candidates[-1]
    pr_author_login = _github_pr_author_from_commit(commit_sha)
    login = pr_author_login or _github_login_from_commit(commit_sha)
    protected_checks = {
        login.lower(),
        author_name.lower(),
        author_email.lower(),
        _clean_github_user(author_email).lower(),
        _clean_github_user(author_name, allow_name_fallback=True).lower(),
    }
    if protected_checks & PROTECTED_UPLOADERS:
        return {"protected": "true", "login": login}

    login = login or _clean_github_user(author_email) or _clean_github_user(author_name, allow_name_fallback=True)
    if not login:
        return {}

    return {
        "login": login,
        "url": f"https://github.com/{login}",
        "email": author_email,
    }


def _theme_entry_from_folder(folder: str, config: dict[str, Any] | None) -> dict[str, Any]:
    theme_info = _extract_theme_info_from_config(config) if isinstance(config, dict) else {}
    name = theme_info.get("title") or folder
    uploader = _infer_folder_uploader(folder)
    protected_uploader = uploader.get("protected") == "true"

    entry: dict[str, Any] = {
        "name": name,
        "folder": folder,
    }

    author = theme_info.get("author") or ("" if protected_uploader else uploader.get("login", ""))
    author_url = theme_info.get("authorUrl") or ("" if protected_uploader else uploader.get("url", ""))
    description = theme_info.get("description") or _download_description(name, author)

    if author:
        entry["author"] = author
    if author_url:
        entry["authorUrl"] = author_url
    if description:
        entry["description"] = description

    return entry


def _is_external_source_entry(item: dict[str, Any]) -> bool:
    return str(item.get("sourceType") or "").strip().lower() == "external"


def _normalize_name_for_compare(value: str) -> str:
    return re.sub(r"[^a-z0-9]", "", str(value or "").lower())


def _refresh_existing_theme_entry(entry: dict[str, Any], folder: str, config: dict[str, Any] | None) -> dict[str, Any]:
    refreshed = dict(entry)
    refreshed["folder"] = folder

    if not isinstance(config, dict):
        return refreshed

    info = _extract_theme_info_from_config(config)
    title = str(info.get("title") or "").strip()
    current_name = str(refreshed.get("name") or "").strip()
    if not current_name:
        refreshed["name"] = title or folder
        return refreshed

    # Housekeeping: only correct stale names that still mirror the folder key.
    if title and _normalize_name_for_compare(current_name) == _normalize_name_for_compare(folder):
        refreshed["name"] = title

    return refreshed


def _sync_theme_info(config: dict[str, Any], theme_entry: dict[str, Any]) -> bool:
    fallback_name = str(theme_entry.get("name") or theme_entry.get("folder") or "Theme").strip()
    existing_theme_info = config.get("theme_info")
    theme_info = dict(existing_theme_info) if isinstance(existing_theme_info, dict) else {}
    existing_description = str(theme_info.get("description") or "").strip()
    entry_description = str(theme_entry.get("description") or "").strip()
    fallback_description = str(config.get("description") or _download_description(fallback_name, str(theme_entry.get("author") or "").strip())).strip()
    description = existing_description or entry_description or fallback_description

    desired = {
        "title": fallback_name,
        "author": str(theme_entry.get("author") or config.get("author") or "").strip(),
        "authorUrl": str(theme_entry.get("authorUrl") or config.get("authorUrl") or "").strip(),
        "description": description,
    }

    changed = not isinstance(existing_theme_info, dict)
    for key, value in desired.items():
        if key == "description":
            if not theme_info.get(key) and value:
                theme_info[key] = value
                changed = True
        elif not theme_info.get(key) and value:
            theme_info[key] = value
            changed = True

    ordered_theme_info = {key: theme_info.get(key, "") for key in ("title", "author", "authorUrl", "description")}
    for key, value in theme_info.items():
        if key not in ordered_theme_info:
            ordered_theme_info[key] = value

    reordered_config = {"theme_info": ordered_theme_info}
    for key, value in config.items():
        if key != "theme_info":
            reordered_config[key] = value

    if list(config.items()) != list(reordered_config.items()):
        config.clear()
        config.update(reordered_config)
        changed = True

    return changed


def _html_attr(value: str) -> str:
    return html.escape(str(value), quote=False).replace('"', "&quot;")


def _theme_title(theme_entry: dict[str, Any]) -> str:
    name = str(theme_entry.get("name") or theme_entry.get("folder") or "Theme").strip()
    return f"{name} theme for Innioasis Y1 - Y1 Themes"


def _theme_description(theme_entry: dict[str, Any]) -> str:
    name = str(theme_entry.get("name") or theme_entry.get("folder") or "Theme").strip()
    author = str(theme_entry.get("author") or "").strip()
    description = str(theme_entry.get("description") or "").strip()
    if description and not _is_default_description(description, name):
        return description
    return _download_description(name, author)


def _theme_keywords(theme_entry: dict[str, Any]) -> str:
    name = str(theme_entry.get("name") or theme_entry.get("folder") or "Theme").strip()
    return f"{name} theme, Innioasis Y1 theme, {name}, Y1 customization, MP3 player theme"


def _theme_url(folder: str) -> str:
    encoded = "/".join(part.replace(" ", "%20") for part in folder.strip("/").split("/"))
    return f"{SITE_BASE_URL}/{encoded}/"


def _replace_once(pattern: str, replacement: str, text: str) -> str:
    return re.sub(pattern, replacement, text, count=1, flags=re.I)


def _build_theme_index_html(template: str, theme_entry: dict[str, Any]) -> str:
    folder = str(theme_entry.get("folder") or "").strip()
    title = _html_attr(_theme_title(theme_entry))
    description = _html_attr(_theme_description(theme_entry))
    keywords = _html_attr(_theme_keywords(theme_entry))
    url = _html_attr(_theme_url(folder))

    html_text = template
    html_text = _replace_once(r"<title id=\"page-title\">.*?</title>", f'<title id="page-title">{title}</title>', html_text)
    html_text = _replace_once(r'<meta name=\"description\" content=\"[^\"]*\">', f'<meta name="description" content="{description}">', html_text)
    html_text = _replace_once(r'<meta name=\"keywords\" content=\"[^\"]*\">', f'<meta name="keywords" content="{keywords}">', html_text)
    html_text = _replace_once(r'<link rel=\"canonical\" href=\"[^\"]*\">', f'<link rel="canonical" href="{url}">', html_text)
    html_text = _replace_once(r'<meta property=\"og:title\" content=\"[^\"]*\">', f'<meta property="og:title" content="{title}">', html_text)
    html_text = _replace_once(r'<meta property=\"og:description\" content=\"[^\"]*\">', f'<meta property="og:description" content="{description}">', html_text)
    html_text = _replace_once(r'<meta property=\"og:url\" content=\"[^\"]*\">', f'<meta property="og:url" content="{url}">', html_text)
    html_text = _replace_once(r'<meta name=\"twitter:title\" content=\"[^\"]*\">', f'<meta name="twitter:title" content="{title}">', html_text)
    html_text = _replace_once(r'<meta name=\"twitter:description\" content=\"[^\"]*\">', f'<meta name="twitter:description" content="{description}">', html_text)
    return html_text


def _sync_theme_index(theme_entry: dict[str, Any], template: str) -> bool:
    folder = _extract_folder_key(theme_entry)
    if not folder:
        return False
    path = REPO_ROOT / folder / "index.html"
    existing = path.read_text(encoding="utf-8") if path.exists() else template
    updated = _build_theme_index_html(existing, theme_entry)
    if updated == existing and path.exists():
        return False
    path.write_text(updated, encoding="utf-8")
    return True


def _theme_index_entry(theme_entry: dict[str, Any], config: dict[str, Any]) -> dict[str, Any]:
    index_entry = dict(theme_entry)
    info = _extract_theme_info_from_config(config)
    if info.get("title"):
        index_entry["name"] = info["title"]
    if info.get("description") and not index_entry.get("description"):
        index_entry["description"] = info["description"]
    if info.get("author") and not index_entry.get("author"):
        index_entry["author"] = info["author"]
    if info.get("authorUrl") and not index_entry.get("authorUrl"):
        index_entry["authorUrl"] = info["authorUrl"]
    return index_entry


def _sync_source_only_config(config: dict[str, Any]) -> bool:
    if not isinstance(config.get("source_info"), dict):
        return False
    if "theme_info" not in config:
        return False
    config.pop("theme_info", None)
    return True


def _write_json(path: Path, payload: dict[str, Any]) -> None:
    path.write_text(json.dumps(payload, indent=4, ensure_ascii=False) + "\n", encoding="utf-8")


def main() -> int:
    if not THEMES_JSON_PATH.exists():
        raise SystemExit("themes.json not found.")

    themes = _load_themes_json(THEMES_JSON_PATH)
    by_folder: dict[str, dict[str, Any]] = {}
    theme_folders = _discover_theme_folders(REPO_ROOT)
    theme_folder_set = set(theme_folders)

    for item in themes:
        folder = _extract_folder_key(item)
        if not folder:
            continue
        if folder not in theme_folder_set and not _is_external_source_entry(item):
            # Housekeeping: prune deleted theme folders from themes.json.
            continue

        normalized = dict(item)
        normalized["folder"] = folder
        if "Folder" in normalized:
            normalized.pop("Folder", None)
        if folder in theme_folder_set:
            cfg_path = REPO_ROOT / folder / "config.json"
            normalized = _refresh_existing_theme_entry(
                normalized,
                folder,
                _load_json_file(cfg_path),
            )
        by_folder[folder] = normalized

    for folder in theme_folders:
        if folder in by_folder:
            continue
        cfg_path = REPO_ROOT / folder / "config.json"
        config = _load_json_file(cfg_path)
        by_folder[folder] = _theme_entry_from_folder(folder, config if isinstance(config, dict) else None)

    ordered_themes = [by_folder[folder] for folder in sorted(by_folder.keys(), key=lambda s: s.lower())]
    _write_json(THEMES_JSON_PATH, {"themes": ordered_themes})
    template_html = THEME_TEMPLATE_PATH.read_text(encoding="utf-8") if THEME_TEMPLATE_PATH.exists() else ""

    for item in ordered_themes:
        folder = _extract_folder_key(item)
        if not folder:
            continue
        cfg_path = REPO_ROOT / folder / "config.json"
        config = _load_json_file(cfg_path)
        if not isinstance(config, dict):
            continue
        if not _has_theme_image_assets(config):
            if _sync_source_only_config(config):
                _write_json(cfg_path, config)
            continue
        if _sync_theme_info(config, item):
            _write_json(cfg_path, config)
        if template_html:
            _sync_theme_index(_theme_index_entry(item, config), template_html)

    return 0


if __name__ == "__main__":
    raise SystemExit(main())

