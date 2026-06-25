/**
 * Normalize theme display names by removing a trailing " Theme" suffix.
 * Preserves intrinsic uses (e.g. "Theme Hospital") — only strips when "Theme" is the last word.
 */
(function (global) {
    'use strict';

    function normalizeSpaces(value) {
        return String(value || '')
            .trim()
            .replace(/\s+/g, ' ');
    }

    function stripRedundantThemeWord(name) {
        let s = normalizeSpaces(name);
        if (!s) return '';
        const original = s;
        while (/\s+theme$/i.test(s)) {
            s = s.replace(/\s+theme$/i, '').trim();
        }
        return s || original;
    }

    function sanitizeThemeTitleInput(value) {
        const trimmed = normalizeSpaces(value);
        if (!trimmed) return { value: '', changed: false };
        const cleaned = stripRedundantThemeWord(trimmed);
        return { value: cleaned, changed: cleaned !== trimmed };
    }

    function titleFromFolderStem(folderStem) {
        const raw = String(folderStem || '').trim();
        if (!raw) return '';
        const humanized = normalizeSpaces(raw.replace(/_/g, ' '));
        return stripRedundantThemeWord(humanized) || humanized || raw;
    }

    function publicDisplayName(name) {
        return stripRedundantThemeWord(name);
    }

    global.ThemeDisplayName = {
        normalizeSpaces,
        stripRedundantThemeWord,
        sanitizeThemeTitleInput,
        titleFromFolderStem,
        publicDisplayName
    };
})(typeof window !== 'undefined' ? window : globalThis);
