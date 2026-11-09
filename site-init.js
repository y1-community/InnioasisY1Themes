/**
 * Shared site shell: body classes, bottom dock, and privacy button (theme-analytics).
 */
(function (global) {
    "use strict";

    var THEME_ANALYTICS_VERSION = "20261108";
    var THEME_ANALYTICS_CSS_VERSION = "20260518";
    var CONSENT_KEY = "innioasis-consent";
    var THEME_CONSENT_KEY = "y1-theme-consent-v2";

    /* ---- Appearance -------------------------------------------------------
       One choice, four palettes. The preference is kept locally, mirrored to
       the shared .innioasis.app cookie so it follows the visitor between
       innioasis.app and themes.innioasis.app, and applied as data-theme /
       data-lumen-theme — the attributes tokens.css keys every palette off.
       "Auto" follows the operating system and re-applies when it changes. */
    var APPEARANCE_KEY = "lumen-theme";
    var APPEARANCES = ["auto", "dark", "light", "high-contrast", "2077"];

    function systemAppearance() {
        try {
            if (global.matchMedia && global.matchMedia("(prefers-color-scheme: light)").matches) return "light";
        } catch (_) {}
        return "dark";
    }

    function resolveEffectiveTheme(theme) {
        if (!theme || theme === "auto" || APPEARANCES.indexOf(theme) < 0) return systemAppearance();
        return theme;
    }

    function storedAppearance() {
        var value = null;
        try { value = global.localStorage.getItem(APPEARANCE_KEY); } catch (_) {}
        if (APPEARANCES.indexOf(value) < 0) value = getSharedCookie("innioasis-theme");
        return APPEARANCES.indexOf(value) >= 0 ? value : "auto";
    }

    function applyAppearance(theme, persist) {
        if (APPEARANCES.indexOf(theme) < 0) theme = "auto";
        var effective = resolveEffectiveTheme(theme);
        var root = document.documentElement;
        if (root) {
            root.setAttribute("data-theme", effective);
            root.setAttribute("data-lumen-theme", effective);
            root.setAttribute("data-appearance", theme);
        }
        if (persist) {
            try { global.localStorage.setItem(APPEARANCE_KEY, theme); } catch (_) {}
            setSharedCookie("innioasis-theme", theme);
        }
        var selects = document.querySelectorAll("#lumen-theme-select");
        for (var i = 0; i < selects.length; i++) {
            if (selects[i].value !== theme) selects[i].value = theme;
        }
        var meta = document.querySelector('meta[name="theme-color"]');
        if (meta && root) {
            var colour = "";
            try { colour = global.getComputedStyle(root).getPropertyValue("--lumen-theme-color").trim(); } catch (_) {}
            if (colour) meta.setAttribute("content", colour);
        }
        return effective;
    }

    function applyStoredTheme() {
        var theme = storedAppearance();
        var urlTheme = null;
        try {
            var p = new URLSearchParams((global.location && global.location.search) || "");
            urlTheme = p.get("site_theme") || p.get("theme");
            if (urlTheme) {
                urlTheme = urlTheme.toLowerCase().trim();
                if (APPEARANCES.indexOf(urlTheme) < 0) urlTheme = null;
            }
        } catch (_) {}
        if (urlTheme) theme = urlTheme;
        applyAppearance(theme, Boolean(urlTheme));
        return theme;
    }

    applyStoredTheme();

    /* Follow the OS while the visitor is on Auto, without a reload. */
    (function watchSystemAppearance() {
        try {
            var mq = global.matchMedia ? global.matchMedia("(prefers-color-scheme: light)") : null;
            if (!mq) return;
            var onChange = function () {
                if (storedAppearance() === "auto") applyAppearance("auto", false);
            };
            if (typeof mq.addEventListener === "function") mq.addEventListener("change", onChange);
            else if (typeof mq.addListener === "function") mq.addListener(onChange);
        } catch (_) {}
    })();

    /* Accessibility preference (e.g. reduce-motion) */
    function applyAccessibility() {
        var raw = null;
        try {
            var p = new URLSearchParams(global.location.search);
            raw = p.get("accessibility") || p.get("a11y");
        } catch (_) {}
        if (!raw) {
            try { raw = global.localStorage.getItem("innioasis-accessibility"); } catch (_) {}
        }
        if (!raw) {
            raw = getSharedCookie("innioasis-accessibility");
        }
        if (!raw && global.matchMedia && global.matchMedia("(prefers-reduced-motion: reduce)").matches) {
            raw = "reduce-motion";
        }
        if (raw) {
            var v = String(raw).toLowerCase().trim();
            if (v === "reduce-motion" || v === "reduced-motion" || v === "no-motion" || v === "1" || v === "true") {
                if (document.documentElement) {
                    document.documentElement.classList.add("reduce-motion");
                    document.documentElement.setAttribute("data-reduced-motion", "true");
                }
                try { global.localStorage.setItem("innioasis-accessibility", "reduce-motion"); } catch (_) {}
                setSharedCookie("innioasis-accessibility", "reduce-motion");
            } else if (v === "none" || v === "0" || v === "false" || v === "default") {
                if (document.documentElement) {
                    document.documentElement.classList.remove("reduce-motion");
                    document.documentElement.removeAttribute("data-reduced-motion");
                }
                try { global.localStorage.removeItem("innioasis-accessibility"); } catch (_) {}
                setSharedCookie("innioasis-accessibility", "default");
            }
        }
    }

    /* Shared cross-subdomain cookie helper (.innioasis.app) */
    function setSharedCookie(name, value, days) {
        try {
            var d = new Date();
            d.setTime(d.getTime() + ((days || 365) * 24 * 60 * 60 * 1000));
            var expires = "; expires=" + d.toUTCString();
            var host = (global.location && global.location.hostname) || "";
            var domain = /(^|\.)innioasis\.app$/i.test(host) ? "; domain=.innioasis.app" : "";
            document.cookie = name + "=" + encodeURIComponent(value) + expires + "; path=/" + domain + "; SameSite=Lax";
        } catch (_) {}
    }

    function getSharedCookie(name) {
        try {
            var prefix = name + "=";
            var parts = (document.cookie || "").split(";");
            for (var i = 0; i < parts.length; i++) {
                var item = parts[i].trim();
                if (item.indexOf(prefix) === 0) return decodeURIComponent(item.substring(prefix.length));
            }
        } catch (_) {}
        return null;
    }

    (function rememberDonationsAndLangFromUrl() {
        try {
            var search = (global.location && global.location.search) || "";
            var p = new URLSearchParams(search);
            var d = p.get("donations");
            if (d !== null) {
                var dv = String(d).trim().toLowerCase();
                if (dv === "false" || dv === "0" || dv === "no" || dv === "off") {
                    try { global.localStorage.setItem("innioasis-donations-off", "1"); } catch (_) {}
                    setSharedCookie("innioasis-donations-off", "1");
                } else if (dv === "true" || dv === "1" || dv === "yes" || dv === "on") {
                    try { global.localStorage.removeItem("innioasis-donations-off"); } catch (_) {}
                    setSharedCookie("innioasis-donations-off", "0");
                }
            }
            var l = p.get("lang");
            if (l) {
                var lv = String(l).trim();
                if (lv) {
                    try { global.localStorage.setItem("innioasis-locale", lv); } catch (_) {}
                    setSharedCookie("innioasis-locale", lv);
                }
            }
        } catch (_) {}
    })();

    applyAccessibility();

    /* Accessibility font size adjustment with URL variables & cross-site persistence */
    function applyFontScale() {
        var raw = null;
        try {
            var search = (global.location && global.location.search) || "";
            var p = new URLSearchParams(search);
            raw = p.get("fontSize") || p.get("fontScale") || p.get("font-scale") || p.get("fs") || p.get("lumen-font-scale");
        } catch (_) {}
        var fontScale = 1;
        var hasUrlScale = false;
        if (raw) {
            var cleaned = String(raw).trim().replace("%", "");
            var val = parseFloat(cleaned);
            if (val > 10) val = val / 100;
            if (val >= 0.7 && val <= 1.6) {
                fontScale = +(val.toFixed(2));
                hasUrlScale = true;
            }
        }
        if (!hasUrlScale) {
            try {
                var storedScale = parseFloat(global.localStorage.getItem("lumen-font-scale") || "");
                if (storedScale >= 0.7 && storedScale <= 1.6) fontScale = +(storedScale.toFixed(2));
            } catch (_) {}
            if (fontScale === 1) {
                var cookieScale = parseFloat(getSharedCookie("lumen-font-scale") || "");
                if (cookieScale >= 0.7 && cookieScale <= 1.6) fontScale = +(cookieScale.toFixed(2));
            }
        }
        if (document.documentElement) {
            document.documentElement.style.setProperty("--lumen-font-scale", String(fontScale));
            document.documentElement.setAttribute("data-font-scale", String(fontScale));
        }
        try { global.localStorage.setItem("lumen-font-scale", String(fontScale)); } catch (_) {}
        setSharedCookie("lumen-font-scale", String(fontScale), 365);
        return fontScale;
    }
    applyFontScale();
    global.y1ApplyFontScale = applyFontScale;

    function parsePrivacyParam() {
        try {
            var search = (global.location && global.location.search) || "";
            var params = new URLSearchParams(search);
            var raw = params.get("privacy");
            if (raw) {
                var v = String(raw).trim().toLowerCase();
                if (v === "all" || v === "1" || v === "true" || v === "yes") return { feedback: true, nightly: true, analytics: true };
                if (v === "none" || v === "0" || v === "false" || v === "no") return { feedback: false, nightly: false, analytics: false };
                if (v === "feedback") return { feedback: true, nightly: false, analytics: true };
                if (v === "nightly") return { feedback: false, nightly: true, analytics: true };
            }
        } catch (_) {}
        return null;
    }

    /* Privacy consent. The gallery uses Google Analytics (via Google Tag
       Manager) and Cloudflare to measure and optimise performance and protect
       the website from attacks. Local storage remembers the visitor's theme,
       text size, and privacy/rating choices so the consent banner does not
       reopen on every page load. */
    function readConsent() {
        try {
            var themeRaw = global.localStorage.getItem(THEME_CONSENT_KEY);
            var themeData = themeRaw ? JSON.parse(themeRaw) : null;
            var raw = global.localStorage.getItem(CONSENT_KEY);
            var data = raw ? JSON.parse(raw) : null;
            if ((themeData && themeData.decided === true) || (data && typeof data === "object" && (typeof data.feedback === "boolean" || data.decided === true))) {
                return {
                    decided: true,
                    analytics: themeData && typeof themeData.analytics === "boolean" ? themeData.analytics : (data && typeof data.analytics === "boolean" ? data.analytics : true),
                    ratingsView: themeData && typeof themeData.ratingsView === "boolean" ? themeData.ratingsView : (data && typeof data.ratingsView === "boolean" ? data.ratingsView : true),
                    ratingsSubmit: themeData && typeof themeData.ratingsSubmit === "boolean" ? themeData.ratingsSubmit : (data && typeof data.ratingsSubmit === "boolean" ? data.ratingsSubmit : true),
                    feedback: data && typeof data.feedback === "boolean" ? data.feedback : true,
                    nightly: data && typeof data.nightly === "boolean" ? data.nightly : true
                };
            }
        } catch (_) {}

        // Fallback to shared cross-subdomain cookie
        try {
            var cookieRaw = getSharedCookie(CONSENT_KEY);
            if (cookieRaw) {
                var cdata = JSON.parse(cookieRaw);
                if (cdata && typeof cdata === "object") {
                    return {
                        decided: true,
                        analytics: cdata.analytics !== false,
                        ratingsView: cdata.ratingsView !== false,
                        ratingsSubmit: cdata.ratingsSubmit !== false,
                        feedback: cdata.feedback !== false,
                        nightly: cdata.nightly !== false
                    };
                }
            }
        } catch (_) {}

        return {
            decided: true,
            analytics: true,
            ratingsView: true,
            ratingsSubmit: true,
            feedback: true,
            nightly: true
        };
    }

    function applyAnalyticsConsent(mode) {
        var isOff = mode === false || mode === "off";
        global["ga-disable-GTM-TNDGC37L"] = isOff;
        if (typeof global.gtag === "function") {
            try {
                global.gtag("consent", "update", {
                    analytics_storage: isOff ? "denied" : "granted",
                    ad_storage: "denied"
                });
            } catch (_) {}
        }
        if (global.ThemeAnalytics && typeof global.ThemeAnalytics.saveConsent === "function") {
            try {
                void global.ThemeAnalytics.saveConsent({ analytics: !isOff });
            } catch (_) {}
        }
    }

    function writeConsent(prefs) {
        prefs = prefs || {};
        var prev = readConsent() || {};
        var anPref = typeof prefs.analytics !== "undefined" ? prefs.analytics : prev.analytics;
        var anActive = anPref !== false && anPref !== "off";
        var next = {
            decided: true,
            analytics: anActive ? "essential" : "off",
            ratingsView: typeof prefs.ratingsView === "boolean" ? prefs.ratingsView : (typeof prev.ratingsView === "boolean" ? prev.ratingsView : true),
            ratingsSubmit: typeof prefs.ratingsSubmit === "boolean" ? prefs.ratingsSubmit : (typeof prev.ratingsSubmit === "boolean" ? prev.ratingsSubmit : prefs.feedback !== false),
            feedback: typeof prefs.feedback === "boolean" ? prefs.feedback : (typeof prev.feedback === "boolean" ? prev.feedback : true),
            nightly: typeof prefs.nightly === "boolean" ? prefs.nightly : (typeof prev.nightly === "boolean" ? prev.nightly : true)
        };
        try {
            var consentStr = JSON.stringify({
                decided: true,
                feedback: next.feedback,
                nightly: next.nightly,
                analytics: next.analytics,
                ratingsView: next.ratingsView,
                ratingsSubmit: next.ratingsSubmit
            });
            global.localStorage.setItem(CONSENT_KEY, consentStr);
            setSharedCookie(CONSENT_KEY, consentStr);
            setSharedCookie("innioasis-privacy", next.analytics === "off" ? "none" : (next.feedback && next.nightly ? "all" : (next.feedback ? "feedback" : "nightly")));
            setSharedCookie("innioasis-privacy-analytics", next.analytics);
            global.localStorage.setItem(THEME_CONSENT_KEY, JSON.stringify({
                decided: true,
                analytics: anActive,
                ratingsView: next.ratingsView,
                ratingsSubmit: next.ratingsSubmit
            }));
        } catch (_) {}
        applyAnalyticsConsent(next.analytics);
        if (typeof global.y1DecorateLinks === "function") {
            try { global.y1DecorateLinks(); } catch (_) {}
        }
        if (global.ThemeAnalytics && typeof global.ThemeAnalytics.saveConsent === "function") {
            try {
                void global.ThemeAnalytics.saveConsent({
                    analytics: next.analytics,
                    ratingsView: next.ratingsView,
                    ratingsSubmit: next.ratingsSubmit
                });
            } catch (_) {}
        }
        try {
            global.dispatchEvent(new CustomEvent("innioasis-privacy-change", { detail: next }));
            global.dispatchEvent(new CustomEvent("y1-consent-changed", { detail: next }));
        } catch (_) {}
        return next;
    }

    global.INNIOASIS_PRIVACY = {
        read: readConsent,
        save: writeConsent,
        hasDecided: function () { return true; },
        allows: function (feature) {
            if (feature === "theme") return true;
            var prefs = readConsent();
            if (!prefs) return true;
            if (feature === "analytics") return prefs.analytics !== "off" && prefs.analytics !== false;
            if (feature === "feedback") return prefs.feedback !== false;
            if (feature === "nightly") return prefs.nightly !== false;
            return prefs[feature] !== false;
        }
    };

    function clearPreferenceParamsFromUrl() {
        if (!global.location || !global.history || !global.history.replaceState) return;
        try {
            var url = new URL(global.location.href);
            var params = url.searchParams;
            var modified = false;

            var prefKeys = [
                "privacy",
                "privacy_analytics",
                "privacy_feedback",
                "privacy_nightly",
                "donations",
                "site_theme",
                "accessibility",
                "a11y",
                "reduce-motion",
                "reduce_motion",
                "lang"
            ];

            if (params.has("theme")) {
                var tVal = (params.get("theme") || "").toLowerCase().trim();
                var isSiteTheme = ["auto", "dark", "high-contrast", "2077", "light"].indexOf(tVal) >= 0;
                var isThemeGalleryDetail = /theme(?:_[a-zA-Z0-9_-]+)?\.html$/i.test(url.pathname);
                if (isSiteTheme || !isThemeGalleryDetail) {
                    params.delete("theme");
                    modified = true;
                }
            }

            prefKeys.forEach(function (k) {
                if (params.has(k)) {
                    params.delete(k);
                    modified = true;
                }
            });

            if (modified) {
                var searchStr = params.toString();
                var newUrl = url.pathname + (searchStr ? ("?" + searchStr) : "") + url.hash;
                global.history.replaceState(global.history.state, document.title, newUrl);
            }
        } catch (_) {}
    }

    global.y1ClearPreferencesFromUrl = clearPreferenceParamsFromUrl;

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", clearPreferenceParamsFromUrl);
    } else {
        if (typeof setTimeout === "function") {
            setTimeout(clearPreferenceParamsFromUrl, 0);
        } else {
            clearPreferenceParamsFromUrl();
        }
    }
    window.addEventListener("load", clearPreferenceParamsFromUrl);

    (function initPrivacyFromUrlOrCookie() {
        var fromUrl = parsePrivacyParam();
        if (fromUrl !== null) {
            writeConsent(fromUrl);
        } else {
            var existing = readConsent();
            if (existing !== null) {
                applyAnalyticsConsent(existing.analytics);
            }
        }
    })();

    function executeInlineScripts(container) {
        if (!container) return;
        container.querySelectorAll("script").forEach(function (oldScript) {
            var newScript = document.createElement("script");
            Array.from(oldScript.attributes).forEach(function (attr) {
                newScript.setAttribute(attr.name, attr.value);
            });
            newScript.textContent = oldScript.textContent;
            oldScript.parentNode.replaceChild(newScript, oldScript);
        });
    }

    function toolbarCandidates() {
        return [
            "support_toolbar.html",
            "../support_toolbar.html",
            "../../support_toolbar.html",
            "../../../support_toolbar.html",
            "https://themes.innioasis.app/support_toolbar.html",
        ];
    }

    function themeAnalyticsScriptCandidates() {
        return [
            "theme-analytics.js?v=" + THEME_ANALYTICS_VERSION,
            "../theme-analytics.js?v=" + THEME_ANALYTICS_VERSION,
            "../../theme-analytics.js?v=" + THEME_ANALYTICS_VERSION,
            "../../../theme-analytics.js?v=" + THEME_ANALYTICS_VERSION,
            "https://themes.innioasis.app/theme-analytics.js?v=" + THEME_ANALYTICS_VERSION,
        ];
    }

    function themeAnalyticsCssHref() {
        try {
            return new URL(
                "theme-analytics.css?v=" + THEME_ANALYTICS_CSS_VERSION,
                document.baseURI || global.location.href
            ).href;
        } catch (_) {
            return (
                "https://themes.innioasis.app/theme-analytics.css?v=" +
                THEME_ANALYTICS_CSS_VERSION
            );
        }
    }

    function themeAnalyticsAlreadyIncluded() {
        if (global.ThemeAnalytics) return true;
        if (document.getElementById("y1-privacy-settings-btn")) return true;
        return !!document.querySelector('script[src*="theme-analytics.js"]');
    }

    function ensureThemeAnalyticsCss() {
        if (document.querySelector('link[href*="theme-analytics.css"]')) return;
        var link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = themeAnalyticsCssHref();
        document.head.appendChild(link);
    }

    function waitForThemeAnalytics(maxMs) {
        return new Promise(function (resolve) {
            if (themeAnalyticsAlreadyIncluded()) {
                resolve();
                return;
            }
            var start = Date.now();
            var timer = setInterval(function () {
                if (themeAnalyticsAlreadyIncluded()) {
                    clearInterval(timer);
                    resolve();
                } else if (Date.now() - start >= maxMs) {
                    clearInterval(timer);
                    resolve();
                }
            }, 50);
        });
    }

    function notifyDockReady() {
        try {
            global.dispatchEvent(new CustomEvent("y1-dock-slot-ready"));
        } catch (_) {}
    }

    function loadThemeAnalyticsOnce() {
        if (themeAnalyticsAlreadyIncluded()) {
            return waitForThemeAnalytics(10000).then(notifyDockReady);
        }
        if (global.__y1ThemeAnalyticsLoading) {
            return global.__y1ThemeAnalyticsLoading.then(notifyDockReady);
        }

        ensureThemeAnalyticsCss();

        global.__y1ThemeAnalyticsLoading = new Promise(function (resolve) {
            var candidates = themeAnalyticsScriptCandidates();
            var index = 0;

            function tryNext() {
                if (index >= candidates.length) {
                    resolve();
                    return;
                }
                var src = candidates[index++];
                var script = document.createElement("script");
                script.src = src;
                script.async = true;
                script.dataset.y1ThemeAnalytics = "1";
                script.onload = function () {
                    resolve();
                };
                script.onerror = function () {
                    tryNext();
                };
                document.head.appendChild(script);
            }

            tryNext();
        }).then(notifyDockReady);

        return global.__y1ThemeAnalyticsLoading;
    }

    async function loadSupportToolbar() {
        var slot = document.getElementById("support-toolbar-slot");
        if (!slot || slot.dataset.shellLoaded === "1") return;
        for (var i = 0; i < toolbarCandidates().length; i++) {
            try {
                var res = await fetch(toolbarCandidates()[i], { cache: "no-cache" });
                if (!res.ok) continue;
                slot.innerHTML = await res.text();
                executeInlineScripts(slot);
                slot.dataset.shellLoaded = "1";
                notifyDockReady();
                return;
            } catch (_) {}
        }
    }

    async function init() {
        if (document.documentElement) {
            document.documentElement.classList.add("site-themes-html");
        }
        if (document.body) {
            document.body.classList.add("site-themes-app");
        }
        await loadSupportToolbar();
        if (document.body) {
            document.body.classList.add("site-dock-mode");
        }
        await loadThemeAnalyticsOnce();
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", function () {
            void init();
        });
    } else {
        void init();
    }

    if (typeof global.openY1DonatePanel !== "function") {
        global.openY1DonatePanel = function (options) {
            global._y1PendingDonateOpen = options || true;
            if (typeof global.y1LoadSupportToolbar === "function") {
                void global.y1LoadSupportToolbar();
            }
        };
    }

    global.y1LoadSupportToolbar = loadSupportToolbar;
    global.y1LoadThemeAnalytics = loadThemeAnalyticsOnce;
})(typeof window !== "undefined" ? window : globalThis);
