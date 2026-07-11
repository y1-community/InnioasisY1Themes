/**
 * Public theme URLs and Web Share / clipboard helpers for the gallery and theme page.
 */
(function (global) {
    'use strict';

    const SITE_ORIGIN = 'https://themes.innioasis.app';

    function cleanFolder(catalogFolder) {
        return String(catalogFolder || '')
            .replace(/^\.\/+/, '')
            .replace(/\/+$/, '')
            .trim();
    }

    function encodePathSegments(pathValue) {
        return String(pathValue || '')
            .split('/')
            .filter(Boolean)
            .map((seg) => encodeURIComponent(seg))
            .join('/');
    }

    /** Pretty share URL: /Theme_Name/ or /Theme_Name/Variant_Name */
    function buildPublicThemeUrl(catalogFolder, variantSegment) {
        const root = cleanFolder(catalogFolder);
        if (!root) return `${SITE_ORIGIN}/`;
        const v = String(variantSegment || '').trim();
        if (v) {
            return `${SITE_ORIGIN}/${encodePathSegments(root)}/${encodePathSegments(v)}`;
        }
        return `${SITE_ORIGIN}/${encodePathSegments(root)}/`;
    }

    /** Canonical SEO URL matching sitemap / generated index hosts (variant shells under Variants/.../_share/). */
    function buildSeoThemeUrl(catalogFolder, variantSegment) {
        const root = cleanFolder(catalogFolder);
        if (!root) return `${SITE_ORIGIN}/`;
        const v = String(variantSegment || '').trim();
        if (v) {
            return (
                `${SITE_ORIGIN}/${encodePathSegments(root)}/Variants/` +
                `${encodePathSegments(v)}/_share/`
            );
        }
        return `${SITE_ORIGIN}/${encodePathSegments(root)}/`;
    }

    /** Theme detail page (query params). */
    function buildThemeDetailPageUrl(catalogFolder, variantSegment, baseHref) {
        const theme = cleanFolder(catalogFolder);
        if (!theme) return String(baseHref || './theme.html');
        const v = String(variantSegment || '').trim();
        const base = String(baseHref || './theme.html').replace(/\?.*$/, '');
        let href = `${base}?theme=${encodeURIComponent(theme)}`;
        if (v) href += `&variant=${encodeURIComponent(v)}`;
        return href;
    }

    /**
     * Parse /Theme_Name/ or /Theme_Name/Variant_Name (also /Theme/Variants/Variant) from pathname.
     * @returns {{ folder: string, variant: string } | null}
     */
    function parseThemePathFromLocation(loc) {
        const locationRef = loc || global.location;
        const parts = String(locationRef.pathname || '')
            .split('/')
            .filter(Boolean)
            .map((p) => {
                try {
                    return decodeURIComponent(p);
                } catch (_) {
                    return p;
                }
            });
        if (!parts.length) return null;
        const lastLow = parts[parts.length - 1].toLowerCase();
        if (lastLow === 'theme.html' || lastLow === 'index.html') {
            parts.pop();
        }
        if (!parts.length) return null;
        const folder = parts[0];
        if (parts.length === 1) return { folder, variant: '' };
        if (parts[1] === 'Variants') {
            let variantParts = parts.slice(2);
            // SEO hosts live at Variants/<name>/_share/ — strip the share segment.
            if (variantParts.length && String(variantParts[variantParts.length - 1]).toLowerCase() === '_share') {
                variantParts = variantParts.slice(0, -1);
            }
            const variant = variantParts.join('/');
            return { folder, variant };
        }
        return { folder, variant: parts.slice(1).join('/') };
    }

    async function copyTextToClipboard(text) {
        const value = String(text || '').trim();
        if (!value) return false;
        try {
            if (global.navigator && global.navigator.clipboard && global.navigator.clipboard.writeText) {
                await global.navigator.clipboard.writeText(value);
                return true;
            }
        } catch (_) {}
        try {
            const ta = document.createElement('textarea');
            ta.value = value;
            ta.setAttribute('readonly', '');
            ta.style.position = 'fixed';
            ta.style.left = '-9999px';
            document.body.appendChild(ta);
            ta.select();
            const ok = document.execCommand('copy');
            ta.remove();
            return ok;
        } catch (_) {
            return false;
        }
    }

    /**
     * @param {{ catalogFolder: string, variantSegment?: string, title?: string, text?: string }}
     */
    async function shareThemeLink(opts) {
        const url = buildPublicThemeUrl(opts && opts.catalogFolder, opts && opts.variantSegment);
        const title = String((opts && opts.title) || 'Innioasis Y1 & Y2 theme').trim();
        const text = String((opts && opts.text) || title).trim();
        if (global.navigator && typeof global.navigator.share === 'function') {
            try {
                await global.navigator.share({ title, text, url });
                return { ok: true, url, method: 'share' };
            } catch (err) {
                if (err && err.name === 'AbortError') return { ok: false, aborted: true, url };
            }
        }
        const copied = await copyTextToClipboard(url);
        return { ok: copied, url, method: copied ? 'clipboard' : 'none' };
    }

    async function copyThemeLink(opts) {
        const url = buildPublicThemeUrl(opts && opts.catalogFolder, opts && opts.variantSegment);
        const copied = await copyTextToClipboard(url);
        return { ok: copied, url };
    }

    global.ThemeShareLinks = {
        SITE_ORIGIN,
        buildPublicThemeUrl,
        buildSeoThemeUrl,
        buildThemeDetailPageUrl,
        parseThemePathFromLocation,
        copyTextToClipboard,
        shareThemeLink,
        copyThemeLink
    };
})(typeof window !== 'undefined' ? window : globalThis);
