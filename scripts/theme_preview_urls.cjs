/**
 * Build public Theme Studio preview URLs for PR comments (Node / github-script).
 * Uses strict RFC-3986 query encoding so GitHub Markdown autolinkers never
 * truncate folder names containing parentheses, apostrophes, or brackets.
 */

function encodeQueryValue(value) {
    return encodeURIComponent(String(value || "")).replace(
        /[!'()*]/g,
        (c) => "%" + c.charCodeAt(0).toString(16).toUpperCase()
    );
}

function normSpace(value) {
    return String(value || "")
        .toLowerCase()
        .replace(/[\s_-]+/g, " ")
        .trim();
}

function normAlnum(value) {
    return String(value || "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, " ")
        .trim();
}

function normAuthor(value) {
    return String(value || "")
        .toLowerCase()
        .replace(/^@/, "")
        .replace(/[^a-z0-9]+/g, "");
}

function splitHint(hint) {
    const parts = String(hint || "")
        .replace(/\\/g, "/")
        .split("/")
        .map((s) => s.trim())
        .filter(Boolean);
    if (!parts.length) return { folder: "", variant: "" };
    const folder = parts[0];
    let variant = "";
    const vi = parts.findIndex((p) => p.toLowerCase() === "variants");
    if (vi >= 0 && parts[vi + 1]) {
        const seg = parts[vi + 1];
        if (seg.toLowerCase() !== "_share") variant = seg;
    }
    return { folder, variant };
}

function pickBestCandidate(matches, prAuthor) {
    if (!matches.length) return null;
    if (matches.length === 1) return matches[0];
    const wantAuthor = normAuthor(prAuthor);
    if (wantAuthor) {
        const byAuthor = matches.find((t) => normAuthor(t && t.author) === wantAuthor);
        if (byAuthor) return byAuthor;
    }
    return matches[0];
}

/**
 * Resolve a raw folder hint against the live themes.json catalog so PR comments
 * always link to the exact folder key created on main (even when spaces,
 * punctuation, or author-slug disambiguation changed the folder name).
 *
 * @param {string} rawFolder
 * @param {Array<Record<string, any>>} themes
 * @param {{ prTitle?: string, prAuthor?: string }} [opts]
 * @returns {string}
 */
function resolveCanonicalFolderFromCatalog(rawFolder, themes, opts = {}) {
    const clean = String(rawFolder || "").trim();
    const list = Array.isArray(themes) ? themes.filter((t) => t && t.folder) : [];
    const prTitle = String((opts && opts.prTitle) || "").trim();
    const prAuthor = String((opts && opts.prAuthor) || "").trim();
    if (!list.length) return clean;

    if (clean) {
        const exact = list.find((t) => String(t.folder) === clean);
        if (exact) return exact.folder;

        const low = clean.toLowerCase();
        const ciMatches = list.filter((t) => String(t.folder).toLowerCase() === low);
        const ciPick = pickBestCandidate(ciMatches, prAuthor);
        if (ciPick) return ciPick.folder;

        const spaceKey = normSpace(clean);
        if (spaceKey) {
            const spaceMatches = list.filter(
                (t) => normSpace(t.folder) === spaceKey || normSpace(t.name) === spaceKey
            );
            const spacePick = pickBestCandidate(spaceMatches, prAuthor);
            if (spacePick) return spacePick.folder;
        }

        const alnumKey = normAlnum(clean);
        if (alnumKey) {
            const alnumMatches = list.filter(
                (t) => normAlnum(t.folder) === alnumKey || normAlnum(t.name) === alnumKey
            );
            const alnumPick = pickBestCandidate(alnumMatches, prAuthor);
            if (alnumPick) return alnumPick.folder;
        }
    }

    const wantAuthor = normAuthor(prAuthor);
    const titleAlnum = normAlnum(prTitle);
    if (titleAlnum && wantAuthor) {
        const byTitleAndAuthor = list.find(
            (t) =>
                normAuthor(t.author) === wantAuthor &&
                (normAlnum(t.name) === titleAlnum || normAlnum(t.folder).startsWith(titleAlnum))
        );
        if (byTitleAndAuthor) return byTitleAndAuthor.folder;
    }

    return clean;
}

/**
 * @param {string} hint Theme folder or path (e.g. "MyTheme", "MyTheme/Variants/Dark/_share").
 * @param {{ themes?: Array<Record<string, any>>, prTitle?: string, prAuthor?: string }} [opts]
 * @returns {string}
 */
function themePreviewUrlFromHint(hint, opts = {}) {
    const parsed = splitHint(hint);
    if (!parsed.folder) return "https://themes.innioasis.app/studio-test/";
    const folder = resolveCanonicalFolderFromCatalog(parsed.folder, opts && opts.themes, opts);
    if (!folder) return "https://themes.innioasis.app/studio-test/";
    let url = `https://themes.innioasis.app/studio-test/?folder=${encodeQueryValue(folder)}&mode=preview`;
    if (parsed.variant) url += `&variant=${encodeQueryValue(parsed.variant)}`;
    return url;
}

/**
 * @param {Iterable<string>} hints
 * @param {{ themes?: Array<Record<string, any>>, prTitle?: string, prAuthor?: string }} [opts]
 */
function themePreviewUrlsFromHints(hints, opts = {}) {
    const seen = new Set();
    const out = [];
    for (const h of hints) {
        const url = themePreviewUrlFromHint(h, opts);
        if (seen.has(url)) continue;
        seen.add(url);
        out.push(url);
    }
    return out.length ? out : ["https://themes.innioasis.app/studio-test/"];
}

module.exports = {
    encodeQueryValue,
    resolveCanonicalFolderFromCatalog,
    themePreviewUrlFromHint,
    themePreviewUrlsFromHints,
};
