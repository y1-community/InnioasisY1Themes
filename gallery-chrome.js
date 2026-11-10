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
            '<span class="site-compat-banner__text-desktop">Themes in this gallery are compatible with <a class="site-compat-banner__link" href="https://innioasis.app/original-software-benefits.html" target="_blank" rel="noopener noreferrer"><strong>Original OS</strong></a>, <a class="site-compat-banner__link" href="https://innioasis.app/better-y-benefits.html" target="_blank" rel="noopener noreferrer"><strong>Better-Y</strong></a>, <a class="site-compat-banner__link" href="https://innioasis.app/solar-benefits.html" target="_blank" rel="noopener noreferrer"><strong>Solar</strong></a>, and <a class="site-compat-banner__link" href="https://innioasis.app/koensayr-benefits.html" target="_blank" rel="noopener noreferrer"><strong>Koensayr</strong></a> software - </span>' +
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

    /* Directory writing (showDirectoryPicker) is desktop Chromium only.
       Chrome on Android does not implement it, and iOS browsers are WebKit,
       so a phone cannot hand a theme to a player over USB from this page. */
    function usbDirectInstallAvailable() {
        if (typeof window.showDirectoryPicker !== "function") return false;
        var ua = navigator.userAgent || "";
        if (/Android|iPhone|iPad|iPod|Mobile/i.test(ua)) return false;
        try {
            if (navigator.userAgentData && navigator.userAgentData.mobile) return false;
        } catch (_) {}
        if ((navigator.platform || "") === "MacIntel" && navigator.maxTouchPoints > 1) return false;
        return true;
    }

    function restyleUsbLink(button) {
        if (!button) return;
        button.classList.add("theme-usb-link");
        button.textContent = "Direct Install via USB";
        button.disabled = false;
        button.removeAttribute("aria-hidden");
        button.style.setProperty("display", "inline", "important");
        button.style.setProperty("background", "none", "important");
        button.style.setProperty("border", "0", "important");
        button.style.setProperty("padding", "0", "important");
        button.style.setProperty("box-shadow", "none", "important");
        button.style.setProperty("color", "var(--lumen-accent, var(--site-accent, #4f8cff))", "important");
        button.style.setProperty("font", "600 0.78rem var(--site-font, inherit)", "important");
        button.style.setProperty("text-decoration", "underline", "important");
        button.style.setProperty("text-underline-offset", "0.15em", "important");
        button.style.setProperty("cursor", "pointer", "important");
        button.style.setProperty("opacity", "1", "important");
        button.style.setProperty("width", "auto", "important");
        button.style.setProperty("min-height", "0", "important");
    }

    function suppressInstallCard() {
        var banner = document.getElementById("direct-install-banner");
        if (!banner) return;
        var controls = document.querySelector(".gallery-controls");
        var filter = document.getElementById("filter-on-device");
        var bulk = document.getElementById("bulk-update-all-btn");
        if (controls && filter && filter.parentNode !== controls) controls.appendChild(filter);
        if (controls && bulk && bulk.parentNode !== controls) {
            bulk.classList.add("theme-usb-link");
            bulk.textContent = "Update themes already on the player";
            bulk.hidden = true;
            controls.appendChild(bulk);
            var indicator = document.getElementById("folder-selected-indicator");
            var reveal = function () {
                if (indicator && indicator.style.display && indicator.style.display !== "none") bulk.hidden = false;
            };
            if (indicator && typeof MutationObserver === "function") {
                new MutationObserver(reveal).observe(indicator, { attributes: true, attributeFilter: ["style"] });
            }
        }
        var hide = function () {
            banner.style.setProperty("display", "none", "important");
        };
        hide();
        if (typeof MutationObserver === "function") {
            new MutationObserver(hide).observe(banner, { attributes: true, attributeFilter: ["style"] });
        }
    }

    function setupDirectUsb() {
        if (!usbDirectInstallAvailable()) {
            document.documentElement.classList.add("no-direct-usb");
            var banner = document.getElementById("direct-install-banner");
            if (banner) banner.style.setProperty("display", "none", "important");
            var promo = document.getElementById("direct-install-promo");
            if (promo) promo.style.setProperty("display", "none", "important");
            document.querySelectorAll("[data-direct-install-btn]").forEach(function (button) {
                button.style.setProperty("display", "none", "important");
            });
            return;
        }
        suppressInstallCard();
        var promo = document.getElementById("direct-install-promo");
        var download = document.getElementById("download-btn");
        if (promo) promo.style.setProperty("display", "none", "important");
        if (download && download.parentNode && !download.parentNode.querySelector(".theme-usb-link")) {
            var link = document.createElement("a");
            link.className = "theme-usb-link";
            link.href = "index.html";
            link.textContent = "Direct Install via USB";
            link.style.setProperty("display", "block", "important");
            link.style.setProperty("margin-top", "0.35rem", "important");
            link.style.setProperty("color", "var(--lumen-accent, var(--site-accent, #4f8cff))", "important");
            link.style.setProperty("font", "600 0.78rem var(--site-font, inherit)", "important");
            link.style.setProperty("text-decoration", "underline", "important");
            download.insertAdjacentElement("afterend", link);
        }
        document.querySelectorAll("[data-direct-install-btn]").forEach(restyleUsbLink);
        var grid = document.getElementById("theme-grid");
        if (grid && typeof MutationObserver === "function") {
            new MutationObserver(function () {
                grid.querySelectorAll("[data-direct-install-btn]").forEach(restyleUsbLink);
            }).observe(grid, { childList: true, subtree: true });
        }
        var folderReady = false;
        document.addEventListener("click", function (event) {
            var button = event.target && event.target.closest ? event.target.closest("[data-direct-install-btn]") : null;
            if (!button) return;
            var mark = document.getElementById("folder-selected-indicator");
            if (folderReady || (mark && mark.style.display && mark.style.display !== "none")) {
                folderReady = true;
                return;
            }
            var choose = document.getElementById("choose-folder-btn");
            if (!choose) return;
            event.preventDefault();
            event.stopImmediatePropagation();
            choose.click();
            var pending = button;
            var started = Date.now();
            var timer = setInterval(function () {
                var indicator = document.getElementById("folder-selected-indicator");
                if (indicator && indicator.style.display && indicator.style.display !== "none") {
                    clearInterval(timer);
                    folderReady = true;
                    pending.click();
                    return;
                }
                if (Date.now() - started > 120000) clearInterval(timer);
            }, 150);
        }, true);
    }

    function useSharedHeader(topbar) {
        var search = topbar.querySelector("#theme-search, #global-theme-search, .topbar-search");
        if (search) document.body.appendChild(search);
        ensureCompatibilityBanner(topbar);
        topbar.remove();
        document.documentElement.style.setProperty("--gallery-topbar-height", "0px");
        document.documentElement.style.setProperty("--gallery-sticky-offset", "0px");
    }

    /* Upload sits left of the page numbers. Rockbox and the one large search
       button sit on the right. The same large button opens the field and,
       while it is open, becomes the X that clears it. */
    function placeGalleryActionRow() {
        var hero = document.querySelector(".gallery-home-hero");
        var topPager = document.getElementById("theme-pager-top");
        var bottomPager = document.getElementById("theme-pager-bottom");
        var controls = document.querySelector(".gallery-controls");
        if (!hero || !topPager || !controls || document.querySelector(".gallery-action-row")) return;

        var upload = hero.querySelector(".hero-actions > a.btn:not(#rockbox-btn)");
        var rockbox = document.getElementById("rockbox-btn");
        var search = document.getElementById("theme-search");
        var rows = [];
        var searching = false;

        function glyph(button, name) {
            button.innerHTML = '<i class="fa-solid fa-' + name + '" aria-hidden="true"></i>';
        }

        function mirrorInput(real) {
            var input = document.createElement("input");
            input.type = "search";
            input.className = "gallery-pager-search-input";
            input.setAttribute("placeholder", "Search themes");
            input.setAttribute("aria-label", "Search themes");
            input.autocomplete = "off";
            input.addEventListener("input", function () {
                if (!real || real.value === input.value) return;
                real.value = input.value;
                real.dispatchEvent(new Event("input", { bubbles: true }));
            });
            if (real) {
                real.addEventListener("input", function () {
                    if (input.value !== real.value) input.value = real.value;
                });
            }
            return input;
        }

        function buildRow(pager, kind) {
            var parent = pager.parentNode;
            var next = pager.nextSibling;
            var row = document.createElement("div");
            row.className = "gallery-action-row gallery-action-row--" + kind;

            var cluster = document.createElement("div");
            cluster.className = "gallery-pager-cluster";

            var searchWrap = document.createElement("div");
            searchWrap.className = "gallery-pager-search";
            searchWrap.hidden = true;
            var field = kind === "top" && search ? search : mirrorInput(search);
            if (kind === "top" && search) {
                search.classList.add("gallery-pager-search-input");
                search.setAttribute("placeholder", "Search themes");
            }
            searchWrap.appendChild(field);

            var toggle = document.createElement("button");
            toggle.type = "button";
            toggle.className = "gallery-search-toggle";
            toggle.setAttribute("aria-label", "Search themes");
            glyph(toggle, "magnifying-glass");

            var side = document.createElement("span");
            side.className = "gallery-row-side";
            if (kind === "top" && rockbox) side.appendChild(rockbox);
            else if (rockbox) {
                var copy = rockbox.cloneNode(true);
                copy.removeAttribute("id");
                copy.classList.add("gallery-rockbox");
                side.appendChild(copy);
            }
            side.appendChild(toggle);

            cluster.appendChild(pager);
            cluster.appendChild(searchWrap);
            if (kind === "top" && upload) row.appendChild(upload);
            else if (upload) row.appendChild(upload.cloneNode(true));
            row.appendChild(cluster);
            row.appendChild(side);

            function stripInnerSearch() {
                pager.querySelectorAll(".pager-search-box, .pager-search-toggle, .pager-search-close").forEach(function (node) {
                    node.remove();
                });
                pager.classList.remove("is-searching");
            }
            stripInnerSearch();
            if (typeof MutationObserver === "function") {
                new MutationObserver(function () {
                    stripInnerSearch();
                    if (searching && !pager.hidden) pager.hidden = true;
                }).observe(pager, { childList: true, attributes: true, attributeFilter: ["hidden"] });
            }

            rows.push({ row: row, pager: pager, wrap: searchWrap, toggle: toggle, field: field });
            toggle.addEventListener("click", function () { setSearching(!searching, field); });
            if (parent) parent.insertBefore(row, next);
            return row;
        }

        function setSearching(on, focusField) {
            searching = on;
            rows.forEach(function (entry) {
                entry.wrap.hidden = !on;
                entry.row.classList.toggle("is-searching", on);
                if (on) {
                    entry.pager.dataset.pagerWasHidden = entry.pager.hidden ? "1" : "0";
                    entry.pager.hidden = true;
                    entry.toggle.setAttribute("aria-label", "Close search");
                    glyph(entry.toggle, "xmark");
                } else {
                    entry.pager.hidden = entry.pager.dataset.pagerWasHidden === "1" || !entry.pager.querySelector("button");
                    entry.toggle.setAttribute("aria-label", "Search themes");
                    glyph(entry.toggle, "magnifying-glass");
                }
            });
            if (!on && search) {
                search.value = "";
                search.dispatchEvent(new Event("input", { bubbles: true }));
            }
            if (on && focusField) focusField.focus();
        }

        buildRow(topPager, "top");
        if (bottomPager) buildRow(bottomPager, "bottom");

        var actions = hero.querySelector(".hero-actions");
        if (actions && !actions.querySelector("a, button")) actions.remove();
    }

    function init() {
        var hasSharedNav = !!document.getElementById("nav-root");
        document.querySelectorAll(".gallery-topbar").forEach(function (topbar) {
            if (hasSharedNav) useSharedHeader(topbar);
            else upgradeTopbar(topbar);
        });
        placeGalleryActionRow();
        setupDirectUsb();
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();
