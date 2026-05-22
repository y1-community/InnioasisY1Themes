/**
 * Author opt-out and block lists (opt_out.json, block.json).
 * Themes from listed authors remain in the repo; the public site hides them.
 */
(function (global) {
    const OPT_OUT_URL = './opt_out.json';
    const BLOCK_URL = './block.json';

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

    function authorSetFromList(list) {
        const set = new Set();
        if (!Array.isArray(list)) return set;
        for (const item of list) {
            const n = normAuthor(item);
            if (n) set.add(n);
        }
        return set;
    }

    function slugSetFromList(list) {
        const set = new Set();
        if (!Array.isArray(list)) return set;
        for (const item of list) {
            const n = normSlug(item);
            if (n) set.add(n);
        }
        return set;
    }

    function fabformIdSetFromList(list) {
        const set = new Set();
        if (!Array.isArray(list)) return set;
        for (const item of list) {
            const n = normFabformId(item);
            if (n) set.add(n);
        }
        return set;
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
        const formId = normFabformId(o.fabformFormId);
        const submissionId = normFabformId(o.fabformSubmissionId);

        const optAuthors = authorSetFromList(optOutData && optOutData.authors);
        const blockAuthors = authorSetFromList(blockData && blockData.authors);
        const blockSlugs = slugSetFromList(blockData && blockData.uploaderSlugs);
        const blockFab = fabformIdSetFromList(blockData && blockData.fabformFormIds);

        if (author && optAuthors.has(author)) {
            return { hidden: true, reason: 'opt_out' };
        }
        if (author && blockAuthors.has(author)) {
            return { hidden: true, reason: 'block' };
        }
        if (slug && blockSlugs.has(slug)) {
            return { hidden: true, reason: 'block' };
        }
        if (formId && blockFab.has(formId)) {
            return { hidden: true, reason: 'block' };
        }
        if (submissionId && blockFab.has(submissionId)) {
            return { hidden: true, reason: 'block' };
        }
        return { hidden: false, reason: '' };
    }

    function isPubliclyListed(themeOrOpts) {
        return !listingHidden(themeOrOpts).hidden;
    }

    function filterPublicThemes(themes) {
        if (!Array.isArray(themes)) return [];
        return themes.filter((t) => isPubliclyListed({ theme: t }));
    }

    function uploadPolicyForAuthor(authorRaw) {
        const author = normAuthor(authorRaw);
        const optAuthors = authorSetFromList(optOutData && optOutData.authors);
        const blockAuthors = authorSetFromList(blockData && blockData.authors);
        if (author && blockAuthors.has(author)) {
            return {
                level: 'block',
                message:
                    'This author is blocked from the public gallery due to abuse or low-quality submissions. Your package can still be sent to GitHub, but it will not appear on themes.innioasis.app.',
            };
        }
        if (author && optAuthors.has(author)) {
            return {
                level: 'opt_out',
                message:
                    'This author has opted out of the public gallery. The theme can remain in the repository but will not be listed on the site.',
            };
        }
        return { level: '', message: '' };
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
    };

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = api;
    } else {
        global.ThemeAuthorPolicy = api;
    }
})(typeof window !== 'undefined' ? window : globalThis);
