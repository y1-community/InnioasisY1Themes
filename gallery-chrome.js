/**
 * Shared gallery top bar: Y1 & Y2 Themes brand, search placeholder, backfill hint banner.
 */
(function () {
    "use strict";

    const GALLERY_HOME = "https://themes.innioasis.app/index.html";
    const SOLAR_PAGE = "https://themes.innioasis.app/solar.html";
    const SOLAR_BANNER_DISMISS_KEY = "y1ThemesSolarBannerDismissed";

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

    function isSolarBannerDismissed() {
        try {
            return localStorage.getItem(SOLAR_BANNER_DISMISS_KEY) === "1";
        } catch (_) {
            return false;
        }
    }

    function dismissSolarBanner() {
        try {
            localStorage.setItem(SOLAR_BANNER_DISMISS_KEY, "1");
        } catch (_) {
            /* ignore quota / private mode */
        }
    }

    function getThemeContext() {
        const p = String(location.pathname || "");
        const s = String(location.search || "");
        if (/\/theme\.html(?:$|\?)/i.test(p)) {
            try {
                const params = new URLSearchParams(s);
                const t = params.get("theme");
                if (t && t.toLowerCase() !== "home") return decodeURIComponent(t).replace(/_/g, " ");
            } catch (_) {}
            return "This theme";
        }
        const clean = p.replace(/^\/+|\/+$/g, "");
        if (!clean || ["index.html", "home", "home/index.html", "creators", "creators/index.html", "upload", "upload.html", "update", "update.html"].includes(clean.toLowerCase())) {
            return null;
        }
        if (/\/index\.html(?:$|\?)/i.test(p) || p.endsWith("/")) {
            const parts = clean.split("/");
            const first = parts[0];
            if (first && !["scripts", "creators", "assets", "home", "index.html", "upload", "update"].includes(first.toLowerCase())) {
                const decoded = decodeURIComponent(first).replace(/_/g, " ");
                if (!["home", "upload", "update", "creators"].includes(decoded.toLowerCase())) return decoded;
            }
        }
        return null;
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
            'Themes in this gallery are compatible with <strong>Original OS</strong>, <strong>Better-Y</strong>, <a href="' + SOLAR_PAGE + '" class="site-compat-banner__link"><strong>Solar</strong></a>, and <strong>Koensayr</strong> custom firmwares.' +
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
