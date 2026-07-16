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

    function ensureSolarBanner(topbar) {
        if (!topbar || !topbar.parentNode) return;
        if (isSolarBannerDismissed()) return;
        if (document.getElementById("y1-solar-hint-banner")) return;
        // Avoid nesting the hint on the explainer page itself.
        try {
            if (/\/solar\.html(?:$|\?)/i.test(String(location.pathname || ""))) return;
        } catch (_) {
            /* ignore */
        }

        const themeName = getThemeContext();
        const banner = document.createElement("aside");
        banner.id = "y1-solar-hint-banner";
        banner.className = "y1-solar-hint-banner";
        banner.setAttribute("role", "note");

        let contentHtml = "";
        if (themeName) {
            contentHtml =
                '<div class="y1-solar-hint-banner__body">' +
                '<p class="y1-solar-hint-banner__text">' +
                "<strong>" + themeName + " works seamlessly with Solar!</strong><br>" +
                'You can install and use <strong>' + themeName + '</strong> right now on Solar — a new custom firmware by <a href="https://github.com/thesolarproject/solar" target="_blank" rel="noopener noreferrer">@TheSolarProject</a> who are currently <a href="https://github.com/thesolarproject/solar/issues" target="_blank" rel="noopener noreferrer">Looking for testers</a> for their Y1 custom firmware. Solar unlocks Wi-Fi so you can download and apply themes straight to your device over the air without a PC, plus enjoy free Deezer music streaming &amp; downloads, ad-free YouTube videos, Cover Flow album browsing, and Navidrome, while keeping 100% full compatibility with every theme in this gallery.' +
                "</p>" +
                '<a class="y1-solar-hint-banner__link" href="' +
                SOLAR_PAGE +
                '">Learn more &amp; install</a>' +
                "</div>";
        } else {
            contentHtml =
                '<div class="y1-solar-hint-banner__body">' +
                '<p class="y1-solar-hint-banner__text">' +
                "<strong>Get YouTube and Soulseek on your Y1</strong><br>" +
                '<a href="https://github.com/thesolarproject/solar" target="_blank" rel="noopener noreferrer">TheSolarProject</a> are looking for testers to try their new Y1 firmware: Solar, with Wi-Fi features including ad-free YouTube music / video streaming and downloads, free Deezer streaming &amp; downloads, Cover Flow, Navidrome, full compatibility with our site themes, plus direct theme downloads straight from your device without needing a PC.' +
                "</p>" +
                '<a class="y1-solar-hint-banner__link" href="' +
                SOLAR_PAGE +
                '">Learn more &amp; install</a>' +
                "</div>";
        }

        banner.innerHTML =
            contentHtml +
            '<button type="button" class="y1-solar-hint-banner__dismiss" aria-label="Dismiss Solar notice">' +
            '<i class="fa-solid fa-xmark" aria-hidden="true"></i>' +
            "</button>";

        const dismissBtn = banner.querySelector(".y1-solar-hint-banner__dismiss");
        if (dismissBtn) {
            dismissBtn.addEventListener("click", function () {
                dismissSolarBanner();
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
        ensureSolarBanner(topbar);
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
