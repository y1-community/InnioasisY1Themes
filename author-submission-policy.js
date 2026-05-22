/**
 * Author opt-out and block lists (opt_out.json, block.json).
 * Themes from listed authors remain in the repo; the public site hides them.
 *
 * block.json / opt_out.json "authors" may be:
 *   - object: { "AuthorHandle": "reason shown on upload (block) or maintainer note (opt-out)" }
 *   - array (legacy): ["AuthorHandle", ...]
 * uploaderSlugs accept the same object-or-array shapes.
 * block.json bannedAuthorAttemptNotifyFabformId: Fabform form id for email when any banned author tries to upload (not a block list entry).
 */
(function (global) {
    const OPT_OUT_URL = './opt_out.json';
    const BLOCK_URL = './block.json';

    const DEFAULT_BLOCK_REASON = 'abuse or repeated low-quality submissions';

    let optOutData = null;
    let blockData = null;
    let readyPromise = null;

    function normAuthor(value) {
        let s = String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');
        if (s.startsWith('u/')) s = s.slice(2).trim().replace(/\s+/g, ' ');
        return s;
    }

    function normSlug(value) {
        let s = String(value || '').trim().toLowerCase();
        s = s.replace(/^u\//i, '');
        s = s.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
        return s.slice(0, 40);
    }

    function normFabformId(value) {
        return String(value || '').trim();
    }

    function readAuthorFromTheme(theme) {
        if (!theme || typeof theme !== 'object') return '';
        const direct = theme.author;
        if (typeof direct === 'string' && direct.trim()) return direct.trim();
        const cfg = theme.rawConfig;
        if (cfg && typeof cfg === 'object') {
            for (const key of ['theme_info', 'source_info']) {
                const block = cfg[key];
                if (block && typeof block === 'object' && typeof block.author === 'string' && block.author.trim()) {
                    return block.author.trim();
                }
            }
        }
        return '';
    }

    /**
     * @param {unknown} items
     * @param {(v: string) => string} normFn
     * @returns {Map<string, string>} normalized key -> reason
     */
    function reasonMapFromField(items, normFn) {
        const map = new Map();
        if (!items) return map;

        if (typeof items === 'object' && !Array.isArray(items)) {
            for (const [key, val] of Object.entries(items)) {
                const nk = normFn(String(key || ''));
                if (!nk) continue;
                const reason = val != null ? String(val).trim() : '';
                map.set(nk, reason);
            }
            return map;
        }

        if (!Array.isArray(items)) return map;

        for (const item of items) {
            if (item == null) continue;
            if (typeof item === 'object' && !Array.isArray(item)) {
                const key = item.author || item.id || item.slug || item.formId;
                const reason = item.reason != null ? String(item.reason).trim() : '';
                const nk = normFn(String(key || ''));
                if (nk) map.set(nk, reason);
                continue;
            }
            const nk = normFn(String(item));
            if (nk) map.set(nk, map.get(nk) || '');
        }
        return map;
    }

    function lookupReason(map, normalizedKey) {
        if (!normalizedKey || !map || !map.has(normalizedKey)) return null;
        return map.get(normalizedKey) ?? '';
    }

    function getOptOutAuthorMap() {
        return reasonMapFromField(optOutData && optOutData.authors, normAuthor);
    }

    function getBlockAuthorMap() {
        return reasonMapFromField(blockData && blockData.authors, normAuthor);
    }

    function getBlockSlugMap() {
        return reasonMapFromField(blockData && blockData.uploaderSlugs, normSlug);
    }

    function bannedAuthorAttemptNotifyFabformUrl() {
        const raw =
            (blockData && blockData.bannedAuthorAttemptNotifyFabformId) ||
            (blockData && blockData.bannedAuthorAttemptNotifyFabform) ||
            '';
        const id = normFabformId(raw);
        if (!id) return '';
        return `https://fabform.io/f/${encodeURIComponent(id)}`;
    }

    async function ready() {
        if (readyPromise) return readyPromise;
        readyPromise = (async () => {
            const fetchJson = async (url) => {
                try {
                    const res = await fetch(url, { cache: 'no-cache' });
                    if (!res.ok) return {};
                    const data = await res.json();
                    return data && typeof data === 'object' ? data : {};
                } catch (_) {
                    return {};
                }
            };
            const [o, b] = await Promise.all([fetchJson(OPT_OUT_URL), fetchJson(BLOCK_URL)]);
            optOutData = o;
            blockData = b;
        })();
        return readyPromise;
    }

    function listingHidden(opts) {
        const o = opts && typeof opts === 'object' ? opts : {};
        const authorRaw = o.author != null ? o.author : (o.theme ? readAuthorFromTheme(o.theme) : '');
        const author = normAuthor(authorRaw);
        const slug = normSlug(o.uploaderSlug);

        const optAuthors = getOptOutAuthorMap();
        const blockAuthors = getBlockAuthorMap();
        const blockSlugs = getBlockSlugMap();

        if (author && optAuthors.has(author)) {
            return {
                hidden: true,
                reason: 'opt_out',
                detail: lookupReason(optAuthors, author) || '',
            };
        }
        if (author && blockAuthors.has(author)) {
            return {
                hidden: true,
                reason: 'block',
                detail: lookupReason(blockAuthors, author) || DEFAULT_BLOCK_REASON,
            };
        }
        if (slug && blockSlugs.has(slug)) {
            return {
                hidden: true,
                reason: 'block',
                detail: lookupReason(blockSlugs, slug) || DEFAULT_BLOCK_REASON,
            };
        }
        return { hidden: false, reason: '', detail: '' };
    }

    function isPubliclyListed(themeOrOpts) {
        return !listingHidden(themeOrOpts).hidden;
    }

    function filterPublicThemes(themes) {
        if (!Array.isArray(themes)) return [];
        return themes.filter((t) => isPubliclyListed({ theme: t }));
    }

    function blockNotAllowedMessage(banReason) {
        const reason = String(banReason || '').trim() || DEFAULT_BLOCK_REASON;
        return `Themes from this author are not allowed because "${reason}".`;
    }

    function uploadPolicyForAuthor(authorRaw) {
        const author = normAuthor(authorRaw);
        const blockAuthors = getBlockAuthorMap();
        const optAuthors = getOptOutAuthorMap();

        if (author && blockAuthors.has(author)) {
            const banReason = lookupReason(blockAuthors, author) || DEFAULT_BLOCK_REASON;
            return {
                level: 'block',
                banReason,
                message: blockNotAllowedMessage(banReason),
            };
        }
        if (author && optAuthors.has(author)) {
            const note = lookupReason(optAuthors, author) || '';
            const archival =
                'This author has opted out of the public gallery. Themes are preserved in the GitHub repository for archival purposes but are not shown or offered for download on themes.innioasis.app.';
            return {
                level: 'opt_out',
                banReason: note,
                message: note ? `${archival} (${note})` : archival,
            };
        }
        return { level: '', banReason: '', message: '' };
    }

    const api = {
        ready,
        normAuthor,
        normSlug,
        listingHidden,
        isPubliclyListed,
        filterPublicThemes,
        readAuthorFromTheme,
        uploadPolicyForAuthor,
        blockNotAllowedMessage,
        bannedAuthorAttemptNotifyFabformUrl,
    };

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = api;
    } else {
        global.ThemeAuthorPolicy = api;
    }
})(typeof window !== 'undefined' ? window : globalThis);
