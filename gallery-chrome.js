/**
 * Gallery toolbar under the shared site header: tabs, search, the firmware
 * compatibility banner, and the stored appearance applied before first paint.
 */
(function () {
    "use strict";

    var SITE_THEMES = ["auto", "dark", "light", "high-contrast", "2077"];
    function resolveEffectiveTheme(theme) {
        if (!theme || theme === "auto") {
            try {
                if (window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches) {
                    return "light";
                }
            } catch (_) {}
            return "dark";
        }
        return (theme === "light" || theme === "high-contrast" || theme === "2077" || theme === "dark") ? theme : "dark";
    }
    (function applyStoredSiteTheme() {
        var stored = "auto";
        try {
            stored = localStorage.getItem("lumen-theme") || "auto";
        } catch (_) {}
        if (SITE_THEMES.indexOf(stored) < 0) stored = "auto";
        var effective = resolveEffectiveTheme(stored);
        document.documentElement.setAttribute("data-lumen-theme", effective);
        document.documentElement.setAttribute("data-theme", effective);
    })();

    function normalizeSearchInputs(root) {
        root.querySelectorAll(".topbar-search, #theme-search, #global-theme-search").forEach(function (input) {
            input.setAttribute("placeholder", "Search");
        });
    }

    function enhanceSearch(root) {
        root.querySelectorAll(".topbar-search-wrap").forEach(function (wrap) {
            if (wrap.dataset.compactSearchReady === "1") return;
            var input = wrap.querySelector(".topbar-search, #theme-search, #global-theme-search");
            if (!input) return;
            wrap.dataset.compactSearchReady = "1";

            function hasQuery() {
                return String(input.value || "").trim() !== "";
            }

            function syncExpanded() {
                wrap.classList.toggle("is-expanded", document.activeElement === input || hasQuery());
            }

            input.addEventListener("focus", function () {
                wrap.classList.add("is-expanded");
            });
            input.addEventListener("blur", syncExpanded);
            input.addEventListener("input", syncExpanded);
            wrap.addEventListener("click", function (event) {
                if (event.target !== input) input.focus();
            });

            if (hasQuery()) wrap.classList.add("is-expanded");
        });
    }

    function setupCompatBanner(banner) {
        if (!banner || banner.dataset.compatBannerSetup) return;
        banner.dataset.compatBannerSetup = "1";
        var isDismissed = false;
        try {
            isDismissed = localStorage.getItem("y1-compat-banner-dismissed") === "1";
        } catch (_) {}
        if (isDismissed) {
            banner.remove();
            document.documentElement.classList.add("y1-compat-banner-closed");
            return;
        }

        var closeBtn = banner.querySelector(".site-compat-banner__close") || banner.querySelector("#site-compat-banner-close");
        if (!closeBtn) {
            closeBtn = document.createElement("button");
            closeBtn.type = "button";
            closeBtn.id = "site-compat-banner-close";
            closeBtn.className = "site-compat-banner__close";
            closeBtn.setAttribute("aria-label", "Dismiss compatibility notice");
            closeBtn.setAttribute("title", "Dismiss notice");
            closeBtn.innerHTML = "&times;";
            banner.appendChild(closeBtn);
        }
        closeBtn.addEventListener("click", function (e) {
            if (e) { e.preventDefault(); e.stopPropagation(); }
            banner.classList.add("is-dismissing");
            setTimeout(function () {
                banner.remove();
                document.documentElement.classList.add("y1-compat-banner-closed");
            }, 180);
            try {
                localStorage.setItem("y1-compat-banner-dismissed", "1");
            } catch (_) {}
        });
    }

    function ensureCompatibilityBanner(topbar) {
        if (!topbar || !topbar.parentNode) return;
        var isDismissed = false;
        try {
            isDismissed = localStorage.getItem("y1-compat-banner-dismissed") === "1";
        } catch (_) {}
        var existing = document.getElementById("site-compat-banner");
        if (isDismissed) {
            if (existing) existing.remove();
            document.documentElement.classList.add("y1-compat-banner-closed");
            return;
        }
        if (existing) {
            setupCompatBanner(existing);
            return;
        }
        var banner = document.createElement("aside");
        banner.id = "site-compat-banner";
        banner.className = "site-compat-banner";
        banner.setAttribute("role", "note");
        banner.setAttribute("aria-label", "Firmware compatibility notice");
        banner.innerHTML =
            '<div class="site-compat-banner__content">' +
            '<i class="fa-solid fa-circle-check site-compat-banner__icon" aria-hidden="true"></i>' +
            '<span class="site-compat-banner__text">' +
            '<span class="site-compat-banner__text-desktop">Themes in this gallery are compatible with <a class="site-compat-banner__link" href="https://innioasis.app/original-software-benefits.html" target="_blank" rel="noopener noreferrer"><strong>Original OS</strong></a>, <a class="site-compat-banner__link" href="https://innioasis.app/better-y-benefits.html" target="_blank" rel="noopener noreferrer"><strong>Better-Y</strong></a>, <a class="site-compat-banner__link" href="https://innioasis.app/solar-benefits.html" target="_blank" rel="noopener noreferrer"><strong>Solar</strong></a>, and <a class="site-compat-banner__link" href="https://innioasis.app/koensayr-benefits.html" target="_blank" rel="noopener noreferrer"><strong>Koensayr</strong></a> custom firmwares - </span>' +
            '<span class="site-compat-banner__text-mobile">Compatible with <a class="site-compat-banner__link" href="https://innioasis.app/original-software-benefits.html" target="_blank" rel="noopener noreferrer"><strong>Original OS</strong></a>, <a class="site-compat-banner__link" href="https://innioasis.app/better-y-benefits.html" target="_blank" rel="noopener noreferrer"><strong>Better-Y</strong></a>, <a class="site-compat-banner__link" href="https://innioasis.app/solar-benefits.html" target="_blank" rel="noopener noreferrer"><strong>Solar</strong></a> &amp; <a class="site-compat-banner__link" href="https://innioasis.app/koensayr-benefits.html" target="_blank" rel="noopener noreferrer"><strong>Koensayr</strong></a> - </span>' +
            '<a class="site-compat-banner__cta" href="https://innioasis.app/guide.html#platform" target="_blank" rel="noopener noreferrer">Available in Updater CE &rarr;</a>' +
            '</span>' +
            '</div>' +
            '<button type="button" class="site-compat-banner__close" id="site-compat-banner-close" aria-label="Dismiss compatibility notice" title="Dismiss notice">&times;</button>';

        if (topbar.nextSibling) {
            topbar.parentNode.insertBefore(banner, topbar.nextSibling);
        } else {
            topbar.parentNode.appendChild(banner);
        }
        setupCompatBanner(banner);
    }

    function syncTopbarMetrics(topbar) {
        if (!topbar) return;
        var apply = function () {
            var height = Math.ceil(topbar.getBoundingClientRect().height || 0);
            document.documentElement.style.setProperty("--gallery-topbar-height", height + "px");
            document.documentElement.style.setProperty("--gallery-sticky-offset", (height + 10) + "px");
        };
        apply();
        if (typeof ResizeObserver === "function") {
            new ResizeObserver(apply).observe(topbar);
        }
        window.addEventListener("resize", apply, { passive: true });
    }

    /* The shared site header (nav.js) carries the brand, site switcher,
       notices and appearance control on every Innioasis site, so the
       gallery bar keeps only what is specific to the gallery: its tabs and
       search. It scrolls with the page; the shared header is the sticky one. */
    function upgradeTopbar(topbar) {
        if (!topbar || topbar.dataset.galleryChromeReady === "1") return;

        topbar.querySelectorAll(".gallery-brand, .lumen-brand-switcher-wrap, .gallery-social-tools, .gallery-social-links, .lumen-theme-control").forEach(function (node) {
            node.remove();
        });
        topbar.querySelectorAll(".gallery-tab").forEach(function (t) {
            var txt = (t.textContent || "").trim().toLowerCase();
            if (txt === "gallery" || txt === "editor" || txt === "software updates" || txt === "firmware downloads") {
                t.remove();
            }
        });

        normalizeSearchInputs(topbar);
        enhanceSearch(topbar);
        topbar.classList.add("gallery-topbar--toolbar");
        topbar.dataset.galleryChromeReady = "1";
        ensureCompatibilityBanner(topbar);
        syncTopbarMetrics(topbar);
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
