/**
 * Shared gallery top bar: Y1 & Y2 Themes brand, search placeholder, backfill hint banner.
 */
(function () {
    "use strict";

    const GALLERY_HOME = "https://themes.innioasis.app/index.html";
    const BACKFILL_PAGE = "https://themes.innioasis.app/backfill.html";
    const BACKFILL_BANNER_DISMISS_KEY = "y1ThemesBackfillBannerDismissed";

    function isPlaceholderSlot(el) {
        if (!el) return false;
        if (el.classList && el.classList.contains("gallery-brand")) return false;
        if (el.getAttribute("aria-hidden") === "true") return true;
        if (!el.className && !el.id && el.childElementCount === 0) return true;
        return false;
    }

    function buildBrand() {
        const a = document.createElement("a");
        a.className = "gallery-brand";
        a.href = GALLERY_HOME;
        a.title = "Innioasis Y1 & Y2 Themes gallery";
        a.innerHTML =
            '<span class="gallery-brand-icon" aria-hidden="true"><i class="fa-solid fa-palette"></i></span>' +
            '<span class="gallery-brand-text">Innioasis Y1 & Y2 Themes</span>';
        return a;
    }

    function normalizeSearchInputs(root) {
        root.querySelectorAll(".topbar-search, #theme-search, #global-theme-search").forEach(function (input) {
            const ph = String(input.getAttribute("placeholder") || "");
            if (!ph || ph === "\uD83D\uDD0D" || ph === "🔍" || /[\u{1F300}-\u{1FAFF}]/u.test(ph)) {
                input.setAttribute("placeholder", "Search themes");
            }
        });
    }

    function isBackfillBannerDismissed() {
        try {
            return localStorage.getItem(BACKFILL_BANNER_DISMISS_KEY) === "1";
        } catch (_) {
            return false;
        }
    }

    function dismissBackfillBanner() {
        try {
            localStorage.setItem(BACKFILL_BANNER_DISMISS_KEY, "1");
        } catch (_) {
            /* ignore quota / private mode */
        }
    }

    function ensureBackfillBanner(topbar) {
        if (!topbar || !topbar.parentNode) return;
        if (isBackfillBannerDismissed()) return;
        if (document.getElementById("y1-backfill-hint-banner")) return;
        // Avoid nesting the hint on the explainer page itself.
        try {
            if (/\/backfill\.html(?:$|\?)/i.test(String(location.pathname || ""))) return;
        } catch (_) {
            /* ignore */
        }

        const banner = document.createElement("aside");
        banner.id = "y1-backfill-hint-banner";
        banner.className = "y1-backfill-hint-banner";
        banner.setAttribute("role", "note");
        banner.innerHTML =
            '<div class="y1-backfill-hint-banner__body">' +
            '<p class="y1-backfill-hint-banner__text">' +
            "<strong>Automatic backfill:</strong> uploaded themes get blank placeholders for newer Y1 &amp; Y2 icons " +
            "so the player does not swap in stock artwork. Optional <code>backfill.png</code> uses your generic icon instead." +
            "</p>" +
            '<a class="y1-backfill-hint-banner__link" href="' +
            BACKFILL_PAGE +
            '">Learn how backfill works</a>' +
            "</div>" +
            '<button type="button" class="y1-backfill-hint-banner__dismiss" aria-label="Dismiss backfill notice">' +
            '<i class="fa-solid fa-xmark" aria-hidden="true"></i>' +
            "</button>";

        const dismissBtn = banner.querySelector(".y1-backfill-hint-banner__dismiss");
        if (dismissBtn) {
            dismissBtn.addEventListener("click", function () {
                dismissBackfillBanner();
                if (banner.parentNode) banner.parentNode.removeChild(banner);
            });
        }

        if (topbar.nextSibling) {
            topbar.parentNode.insertBefore(banner, topbar.nextSibling);
        } else {
            topbar.parentNode.appendChild(banner);
        }
    }

    function upgradeTopbar(topbar) {
        if (!topbar || topbar.dataset.galleryChromeReady === "1") return;
        if (!topbar.querySelector(".gallery-brand")) {
            const existing = topbar.querySelector(".gallery-brand");
            if (!existing) {
                const brand = buildBrand();
                const first = topbar.firstElementChild;
                if (isPlaceholderSlot(first)) {
                    topbar.replaceChild(brand, first);
                } else {
                    topbar.insertBefore(brand, topbar.firstChild);
                }
            }
        }
        normalizeSearchInputs(topbar);
        topbar.dataset.galleryChromeReady = "1";
        ensureBackfillBanner(topbar);
    }

    function init() {
        document.querySelectorAll(".gallery-topbar").forEach(upgradeTopbar);
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();
