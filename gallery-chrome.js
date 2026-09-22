/**
 * Shared gallery top bar: Y1 & Y2 Themes brand, search placeholder, firmware compatibility banner.
 */
(function () {
    "use strict";

    const GALLERY_HOME = "https://themes.innioasis.app/index.html";

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

    function ensureCompatibilityBanner(topbar) {
        if (!topbar || !topbar.parentNode) return;
        if (document.getElementById("site-compat-banner")) return;
        const banner = document.createElement("aside");
        banner.id = "site-compat-banner";
        banner.className = "site-compat-banner";
        banner.setAttribute("role", "note");
        banner.setAttribute("aria-label", "Firmware compatibility notice");
        banner.innerHTML =
            '<div class="site-compat-banner__content">' +
            '<i class="fa-solid fa-circle-check site-compat-banner__icon" aria-hidden="true"></i>' +
            '<span class="site-compat-banner__text">' +
            'Themes in this gallery are compatible with <strong>Original OS</strong>, <strong>Better-Y</strong>, <strong>Solar</strong>, and <strong>Koensayr</strong> custom firmwares.' +
            '</span>' +
            '</div>';

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
        ensureCompatibilityBanner(topbar);
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
