/**
 * Shared gallery top bar: Themes brand, site switcher, search placeholder, firmware compatibility banner,
 * theme reactivity, and community social buttons (Reddit & Discord).
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

    function decorateUrl(href) {
        if (!href) return href;
        if (typeof window.y1DecorateUrl === "function") {
            try { return window.y1DecorateUrl(href); } catch (_) {}
        }
        try {
            var u = new URL(href, window.location.origin);
            if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
                if (u.hostname === "innioasis.app") {
                    u.protocol = window.location.protocol;
                    u.hostname = window.location.hostname;
                    u.port = "8080";
                }
            }
            return u.toString();
        } catch (_) {}
        return href;
    }


    function buildBrandAndSwitcher() {
        var wrap = document.createElement("div");
        wrap.className = "logo lumen-brand-switcher-wrap";
        wrap.innerHTML =
            '<div class="lumen-brand-bar">' +
            '<a class="gallery-brand lumen-brand-home" href="index.html" title="Innioasis Themes Gallery">' +
            '<span class="lumen-brand-icon lumen-brand-icon--themes" aria-hidden="true"><svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M12 3a9 9 0 1 0 0 18c1.2 0 2-.8 2-2 0-.5-.2-1-.5-1.3-.4-.4-.6-.9-.6-1.4 0-1.2 1-2.1 2.1-2.1H17a4 4 0 0 0 4-4C21 6.4 17 3 12 3zm-4.5 9a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm3-4a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm5 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3z"/></svg></span>' +
            '<span class="gallery-brand-text lumen-brand-title">Themes Gallery</span>' +
            '</a>' +
            '<button type="button" class="lumen-site-switcher-toggle" id="lumen-site-switcher-toggle" aria-expanded="false" aria-controls="lumen-site-switcher-tray" aria-label="Switch Innioasis site" title="Switch site">' +
            '<svg class="lumen-site-switcher-glyph" viewBox="0 0 16 16" width="12" height="12" fill="currentColor" aria-hidden="true"><path d="M4.2 6.2a.75.75 0 0 1 1.06 0L8 8.94l2.74-2.74a.75.75 0 1 1 1.06 1.06l-3.27 3.27a.75.75 0 0 1-1.06 0L4.2 7.26a.75.75 0 0 1 0-1.06z"/></svg>' +
            '</button>' +
            '</div>' +
            '<div class="lumen-site-switcher-tray" id="lumen-site-switcher-tray" hidden role="menu" aria-label="Switch between Updater CE and Firmware Archive">' +
            '<p class="lumen-site-switcher-heading">Innioasis Community Sites</p>' +
            '<ul class="lumen-site-switcher-list">' +
            '<li>' +
            '<a class="lumen-site-switcher-item" href="' + decorateUrl("https://innioasis.app/") + '" data-cross-site-link="1">' +
            '<span class="lumen-site-switcher-item-icon"><span class="lumen-app-icon lumen-app-icon--updater" aria-hidden="true"><img src="' + decorateUrl("https://innioasis.app/mtkclient/gui/images/icon.png") + '" width="38" height="38" alt="" aria-hidden="true"></span></span>' +
            '<span class="lumen-site-switcher-item-copy"><strong>Updater CE</strong><small>One-click installer for Windows, macOS & Linux</small></span>' +
            '</a>' +
            '</li>' +
            '<li>' +
            '<a class="lumen-site-switcher-item" href="' + decorateUrl("https://innioasis.app/firmware.html") + '" data-cross-site-link="1">' +
            '<span class="lumen-site-switcher-item-icon"><span class="lumen-app-icon lumen-app-icon--firmware" aria-hidden="true"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m16 6 4 14"/><path d="M12 6v14"/><path d="M8 8v12"/><path d="M4 4v16"/></svg></span></span>' +
            '<span class="lumen-site-switcher-item-copy"><strong>Innioasis Firmware Archive</strong><small>Original Software, custom ROMs & guides</small></span>' +
            '</a>' +
            '</li>' +
            '</ul>' +
            '</div>';

        var toggle = wrap.querySelector("#lumen-site-switcher-toggle");
        var tray = wrap.querySelector("#lumen-site-switcher-tray");
        if (toggle && tray) {
            function setSwitcherOpen(open) {
                if (open) closeNotices();
                tray.hidden = !open;
                toggle.setAttribute("aria-expanded", open ? "true" : "false");
            }

            function closeNotices() {
                var noticesTray = document.getElementById("lumen-notices-tray");
                var noticesBtn = document.getElementById("lumen-notices-btn");
                if (!noticesTray || noticesTray.hidden) return;
                noticesTray.hidden = true;
                if (noticesBtn) noticesBtn.setAttribute("aria-expanded", "false");
            }

            toggle.addEventListener("click", function (e) {
                e.preventDefault();
                e.stopPropagation();
                var open = tray.hidden;
                if (open) closeNotices();
                setSwitcherOpen(open);
            });
            document.addEventListener("click", function (e) {
                if (!tray.hidden && !tray.contains(e.target) && !toggle.contains(e.target)) {
                    setSwitcherOpen(false);
                }
            });
            document.addEventListener("keydown", function (e) {
                if (e.key === "Escape" && !tray.hidden) {
                    setSwitcherOpen(false);
                }
            });
            document.addEventListener("click", function (e) {
                var target = e.target;
                var noticesBtn = target && target.closest ? target.closest("#lumen-notices-btn") : null;
                if (noticesBtn && !tray.hidden) setSwitcherOpen(false);
            }, true);
        }
        return wrap;
    }


    function ensureThemeSelect(topbar) {
        if (!topbar || topbar.querySelector("#lumen-theme-select")) return;
        var label = document.createElement("label");
        label.className = "lumen-theme-control";
        label.innerHTML =
            '<select id="lumen-theme-select" aria-label="Site appearance" title="Site appearance">' +
            '<option value="auto">Auto</option>' +
            '<option value="dark">Dark</option>' +
            '<option value="light">Light</option>' +
            '<option value="high-contrast">High contrast</option>' +
            '<option value="2077">2077</option>' +
            '</select>';

        var sel = label.querySelector("select");
        var storedTheme = "auto";
        try {
            storedTheme = (typeof window.y1GetAppearance === "function" ? window.y1GetAppearance() : localStorage.getItem("lumen-theme")) || "auto";
        } catch (_) {}
        if (sel) {
            sel.value = SITE_THEMES.indexOf(storedTheme) >= 0 ? storedTheme : "auto";
            if (typeof window.y1ApplyAppearance === "function") {
                window.y1ApplyAppearance(sel.value, false);
            } else {
                var eff = resolveEffectiveTheme(sel.value);
                document.documentElement.setAttribute("data-lumen-theme", eff);
                document.documentElement.setAttribute("data-theme", eff);
            }
            sel.addEventListener("change", function () {
                if (typeof window.y1ApplyAppearance === "function") {
                    window.y1ApplyAppearance(sel.value, true);
                    return;
                }
                var updated = resolveEffectiveTheme(sel.value);
                document.documentElement.setAttribute("data-lumen-theme", updated);
                document.documentElement.setAttribute("data-theme", updated);
                try { localStorage.setItem("lumen-theme", sel.value); } catch (_) {}
            });
        }
        return label;
    }

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

    function upgradeTopbar(topbar) {
        if (!topbar || topbar.dataset.galleryChromeReady === "1") return;

        // 1. Brand & Switcher
        var existingBrand = topbar.querySelector(".gallery-brand");
        var brandSwitcher = buildBrandAndSwitcher();
        if (existingBrand) {
            var wrap = existingBrand.closest(".lumen-brand-switcher-wrap");
            if (!wrap) {
                existingBrand.parentNode.replaceChild(brandSwitcher, existingBrand);
            }
        } else {
            topbar.insertBefore(brandSwitcher, topbar.firstChild);
        }

        // 2. Remove redundant header tabs; the brand links back to the gallery.
        topbar.querySelectorAll(".gallery-tab").forEach(function (t) {
            var txt = (t.textContent || "").trim().toLowerCase();
            if (txt === "gallery" || txt === "editor" || txt === "software updates" || txt === "firmware downloads") {
                t.remove();
            }
        });

        // 3. Notices and theme control on the left; social links at the far right.
        var noticesMount = topbar.querySelector(".gallery-social-tools");
        if (!noticesMount) {
            noticesMount = document.createElement("div");
            noticesMount.className = "gallery-social-tools";
        }
        topbar.insertBefore(noticesMount, brandSwitcher.nextSibling);

        var existingTheme = topbar.querySelector("#lumen-theme-select");
        var themeCtrl = existingTheme ? existingTheme.closest("label") : ensureThemeSelect(topbar);
        if (themeCtrl) topbar.insertBefore(themeCtrl, noticesMount.nextSibling);


        normalizeSearchInputs(topbar);
        enhanceSearch(topbar);
        topbar.classList.add("site-sticky");
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
