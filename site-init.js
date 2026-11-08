/**
 * Shared site shell: body classes, bottom dock, and privacy button (theme-analytics).
 */
(function (global) {
    "use strict";

    var THEME_ANALYTICS_VERSION = "20261108";
    var THEME_ANALYTICS_CSS_VERSION = "20260518";
    var CONSENT_KEY = "innioasis-consent";
    var THEME_CONSENT_KEY = "y1-theme-consent-v2";

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

        return null;
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
        hasDecided: function () { return readConsent() !== null; },
        allows: function (feature) {
            if (feature === "theme") return true;
            var prefs = readConsent();
            return !!prefs && prefs[feature] !== false;
        }
    };

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
