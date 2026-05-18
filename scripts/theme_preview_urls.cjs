/**
 * Build public theme.html preview URLs for PR comments (Node / github-script).
 * @param {string} hint Theme folder or path (e.g. "MyTheme", "MyTheme/Variants/Dark/_share").
 * @returns {string}
 */
function themePreviewUrlFromHint(hint) {
    const parts = String(hint || "")
        .split("/")
        .map((s) => s.trim())
        .filter(Boolean);
    if (!parts.length) return "https://themes.innioasis.app/";
    const folder = parts[0];
    let variant = "";
    const vi = parts.findIndex((p) => p.toLowerCase() === "variants");
    if (vi >= 0 && parts[vi + 1]) {
        const seg = parts[vi + 1];
        if (seg.toLowerCase() !== "_share") variant = seg;
    }
    let url = `https://themes.innioasis.app/theme.html?theme=${encodeURIComponent(folder)}`;
    if (variant) url += `&variant=${encodeURIComponent(variant)}`;
    return url;
}

/** @param {Iterable<string>} hints */
function themePreviewUrlsFromHints(hints) {
    const seen = new Set();
    const out = [];
    for (const h of hints) {
        const url = themePreviewUrlFromHint(h);
        if (seen.has(url)) continue;
        seen.add(url);
        out.push(url);
    }
    return out.length ? out : ["https://themes.innioasis.app/"];
}

module.exports = { themePreviewUrlFromHint, themePreviewUrlsFromHints };
