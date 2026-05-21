/**
 * Author display helpers: Reddit u/ parsing, outbound link icons, gallery filter buttons.
 */
(function (global) {
    "use strict";

    function safeText(v) {
        return v == null ? "" : String(v);
    }

    function isUnknownish(v) {
        const s = safeText(v).trim().toLowerCase();
        return !s || s === "unknown" || s === "unknown author" || s === "n/a" || s === "na" || s === "none";
    }

    /** If author contains exactly one u/username token, return that Reddit profile URL. */
    function extractSingleRedditProfileUrl(authorValue) {
        const raw = safeText(authorValue).trim();
        if (!raw) return "";
        if (/^https?:\/\/(www\.)?reddit\.com\//i.test(raw)) return raw;
        const matches = [...raw.matchAll(/\bu\/([A-Za-z0-9_-]{2,21})\b/gi)];
        if (matches.length !== 1) return "";
        const user = matches[0][1];
        return `https://www.reddit.com/user/${encodeURIComponent(user)}/`;
    }

    /** Outbound URL for the icon link: explicit authorUrl, else single Reddit u/ in name. */
    function resolveAuthorOutboundUrl(author, authorUrl) {
        const explicit = safeText(authorUrl).trim();
        if (/^https?:\/\//i.test(explicit)) return explicit;
        return extractSingleRedditProfileUrl(author);
    }

    function authorOutboundIconClass(url) {
        const u = safeText(url).toLowerCase();
        if (u.includes("github.com") || u.includes("gist.github.com")) return "fa-brands fa-github";
        if (u.includes("reddit.com")) return "fa-brands fa-reddit";
        if (u.includes("twitter.com") || u.includes("x.com")) return "fa-brands fa-x-twitter";
        if (u.includes("youtube.com") || u.includes("youtu.be")) return "fa-brands fa-youtube";
        if (u.includes("ko-fi.com")) return "fa-solid fa-mug-hot";
        if (u.includes("patreon.com")) return "fa-brands fa-patreon";
        return "fa-solid fa-globe";
    }

    function appendOutboundAuthorIcon(parent, author, authorUrl, title) {
        const outUrl = resolveAuthorOutboundUrl(author, authorUrl);
        if (!outUrl) return null;
        const ic = document.createElement("a");
        ic.className = "theme-author-outbound";
        ic.href = outUrl;
        ic.target = "_blank";
        ic.rel = "noopener noreferrer";
        ic.title = title || "Author profile";
        ic.setAttribute("aria-label", title || "Open author profile");
        const icon = authorOutboundIconClass(outUrl);
        ic.innerHTML = '<i class="' + icon + '" aria-hidden="true"></i>';
        parent.appendChild(ic);
        return ic;
    }

    /**
     * Gallery card / index: author name filters the gallery; icon opens authorUrl or Reddit.
     */
    function buildGalleryAuthorRow(theme, onFilterAuthor) {
        const wrap = document.createElement("div");
        wrap.className = "theme-author";
        const author = safeText(theme && theme.author).trim();
        if (!author || isUnknownish(author) || (theme && theme.sourceType === "external")) {
            wrap.style.display = "none";
            return wrap;
        }
        const prefix = document.createElement("span");
        prefix.className = "theme-author-prefix";
        prefix.textContent = "by";
        wrap.appendChild(prefix);

        const chips = document.createElement("span");
        chips.className = "theme-author-chips";

        const nameBtn = document.createElement("button");
        nameBtn.type = "button";
        nameBtn.className = "theme-author-name theme-author-filter";
        nameBtn.textContent = author;
        if (typeof onFilterAuthor === "function") {
            nameBtn.addEventListener("click", function (e) {
                e.preventDefault();
                onFilterAuthor(author);
            });
        }
        chips.appendChild(nameBtn);

        let iconUrl = resolveAuthorOutboundUrl(author, theme && theme.authorUrl);
        if (author === "Innioasis") iconUrl = "https://innioasis.com";
        if (author === "u/ope-nz | Normal-Curve-1642") {
            iconUrl = "https://www.reddit.com/user/Normal-Curve-1642/";
        }
        if (iconUrl) {
            const ic = document.createElement("a");
            ic.className = "theme-author-outbound";
            ic.href = iconUrl;
            ic.target = "_blank";
            ic.rel = "noopener noreferrer";
            ic.title = "Author profile";
            ic.setAttribute("aria-label", "Open author profile");
            ic.innerHTML =
                '<i class="' + authorOutboundIconClass(iconUrl) + '" aria-hidden="true"></i>';
            chips.appendChild(ic);
        }
        wrap.appendChild(chips);
        return wrap;
    }

    /**
     * theme.html: plain author name; icon for authorUrl / inferred Reddit only.
     */
    function buildThemePageAuthorRow(themeMeta) {
        const wrap = document.createElement("div");
        wrap.className = "theme-author theme-author--page";
        const author = safeText(themeMeta && themeMeta.author).trim();
        if (!author) {
            wrap.style.display = "none";
            return wrap;
        }
        const prefix = document.createElement("span");
        prefix.className = "theme-author-prefix";
        prefix.textContent = "by";
        wrap.appendChild(prefix);

        const chips = document.createElement("span");
        chips.className = "theme-author-chips";

        const nameSpan = document.createElement("span");
        nameSpan.className = "theme-author-name theme-author-pill";
        nameSpan.textContent = author;
        chips.appendChild(nameSpan);

        let iconUrl = resolveAuthorOutboundUrl(author, themeMeta && themeMeta.authorUrl);
        if (author === "Innioasis") iconUrl = "https://innioasis.com";
        if (author === "u/ope-nz | Normal-Curve-1642") {
            iconUrl = "https://www.reddit.com/user/Normal-Curve-1642/";
        }
        if (iconUrl) {
            const ic = document.createElement("a");
            ic.className = "theme-author-outbound";
            ic.href = iconUrl;
            ic.target = "_blank";
            ic.rel = "noopener noreferrer";
            ic.title = "Author profile";
            ic.setAttribute("aria-label", "Open author profile");
            ic.innerHTML =
                '<i class="' + authorOutboundIconClass(iconUrl) + '" aria-hidden="true"></i>';
            chips.appendChild(ic);
        }
        wrap.appendChild(chips);
        return wrap;
    }

    global.Y1AuthorLinks = {
        safeText: safeText,
        isUnknownish: isUnknownish,
        extractSingleRedditProfileUrl: extractSingleRedditProfileUrl,
        resolveAuthorOutboundUrl: resolveAuthorOutboundUrl,
        authorOutboundIconClass: authorOutboundIconClass,
        appendOutboundAuthorIcon: appendOutboundAuthorIcon,
        buildGalleryAuthorRow: buildGalleryAuthorRow,
        buildThemePageAuthorRow: buildThemePageAuthorRow,
    };
})(typeof window !== "undefined" ? window : globalThis);
