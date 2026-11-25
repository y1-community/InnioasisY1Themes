/**
 * Lightweight analytics tracking for per-theme SEO index.html shells.
 * Shares session + daily dedupe keys with theme-analytics.js so one visit = one view,
 * skips crawler/bot traffic, uses CORS-simple text/plain POSTs to avoid OPTIONS preflights,
 * exposes ThemeAnalytics tracking hooks for theme-download.js, and records downloads when
 * visitors open external-download themes.
 */
(function (global) {
    "use strict";

    var CONSENT_KEY = "y1-theme-consent-v2";
    var LEGACY_CONSENT_KEY = "y1-theme-consent-v1";
    var PV_SESSION_PREFIX = "y1-pv-session:";
    var PV_DAY_PREFIX = "y1-pv-day:";
    var EXT_DL_SESSION_PREFIX = "y1-ext-dl-session:";
    var VISITOR_KEY = "y1-rating-visitor-id";
    var STATS_BACKOFF_KEY = "y1-theme-stats-backoff-until";
    var CRAWLER_UA_RE =
        /googlebot|bingbot|bingpreview|slurp|duckduckbot|baiduspider|yandex|applebot|ahrefsbot|semrushbot|mj12bot|dotbot|petalbot|bytespider|gptbot|oai-searchbot|claudebot|anthropic-ai|ccbot|perplexitybot|amazonbot|facebookexternalhit|twitterbot|linkedinbot|slackbot|discordbot|pinterestbot|uptimerobot|pingdom|statuscake|pagespeed|lighthouse|gtmetrix|scrapy/i;

    function isLikelyCrawler() {
        try {
            var nav = global.navigator;
            if (nav && nav.webdriver) return true;
            var ua = (nav && nav.userAgent) || "";
            if (CRAWLER_UA_RE.test(ua)) return true;
        } catch (e) {}
        return false;
    }

    function utcDayStamp() {
        try {
            return new Date().toISOString().slice(0, 10);
        } catch (e) {
            return "";
        }
    }

    function isInBackoff() {
        try {
            return Number(localStorage.getItem(STATS_BACKOFF_KEY) || 0) > Date.now();
        } catch (e) {
            return false;
        }
    }

    function readMetaOrigin() {
        var meta = document.querySelector('meta[name="cf-theme-analytics-origin"]');
        var raw = meta && meta.getAttribute("content") ? String(meta.getAttribute("content")).trim() : "";
        return raw ? raw.replace(/\/+$/, "") : "";
    }

    function normalizeThemeKey(raw) {
        var s = String(raw || "")
            .trim()
            .replace(/^\.\/+/, "")
            .replace(/\/+$/, "");
        if (!s || s.indexOf("..") >= 0 || s.indexOf("/") >= 0 || s.length > 240) return "";
        return s;
    }

    function loadConsent() {
        try {
            var raw = localStorage.getItem(CONSENT_KEY) || localStorage.getItem(LEGACY_CONSENT_KEY);
            if (!raw) return { analytics: true };
            var p = JSON.parse(raw);
            return { analytics: p.analytics !== false };
        } catch (e) {
            return { analytics: true };
        }
    }

    function getVisitorId() {
        try {
            var id = localStorage.getItem(VISITOR_KEY);
            if (id && id.length >= 12) return id;
            id = "v_" + Math.random().toString(36).slice(2) + Date.now().toString(36);
            localStorage.setItem(VISITOR_KEY, id);
            return id;
        } catch (e) {
            return "anon-" + Math.random().toString(36).slice(2) + Date.now().toString(36);
        }
    }

    function destUrl() {
        try {
            var h = document.documentElement;
            var a = h && h.getAttribute("data-themes-preview-redirect");
            if (a) return String(a).trim();
            var preview = document.querySelector("a.btn-primary[href*='theme='], a[data-studio-action='preview'][href*='folder=']");
            if (preview && preview.href) return String(preview.href).trim();
            var c = document.querySelector('link[rel="canonical"]');
            if (c && c.href) return String(c.href).trim();
        } catch (e) {}
        return "";
    }

    function themeFromPath() {
        var parts = (location.pathname || "").split("/").filter(Boolean);
        if (!parts.length) return "";
        try {
            parts = parts.map(function (part) { return decodeURIComponent(part); });
        } catch (e) {}
        return normalizeThemeKey(parts[0]);
    }

    function parseThemeFromDest(dest) {
        try {
            var u = new URL(dest, location.origin);
            var t =
                u.searchParams.get("theme") ||
                u.searchParams.get("t") ||
                u.searchParams.get("folder") ||
                "";
            return normalizeThemeKey(String(t).replace(/\+/g, " "));
        } catch (e) {
            return "";
        }
    }

    function sendEvent(themeKey, event, source) {
        if (isLikelyCrawler() || isInBackoff()) return;
        var base = readMetaOrigin();
        var key = normalizeThemeKey(themeKey);
        if (!base || !key) return;
        var consent = loadConsent();
        if (consent.analytics === false) return;
        if (event === "page_view") {
            var day = utcDayStamp();
            var sk = PV_SESSION_PREFIX + key;
            var dk = day ? PV_DAY_PREFIX + day + ":" + key : "";
            try {
                if (sessionStorage.getItem(sk)) return;
                if (dk && localStorage.getItem(dk)) {
                    sessionStorage.setItem(sk, "1");
                    return;
                }
                sessionStorage.setItem(sk, "1");
                if (dk) localStorage.setItem(dk, "1");
            } catch (e) {}
        }
        var url = base + "/api/theme-event";
        var body = JSON.stringify({
            theme: key,
            event: event,
            source: source || "theme_page",
            voterId: getVisitorId(),
        });
        /* CORS-simple text/plain POST avoids OPTIONS preflight requests (-50% Worker invocations). */
        fetch(url, {
            method: "POST",
            headers: { "Content-Type": "text/plain;charset=UTF-8" },
            body: body,
            credentials: "omit",
            keepalive: true,
        }).catch(function () {});
    }

    function isExternalDownloadUrl(raw) {
        var s = String(raw || "").trim();
        if (!s || !/^https?:\/\//i.test(s)) return false;
        if (global.ThemePackaging && typeof global.ThemePackaging.effectiveExternalDownloadUrl === "function") {
            return !!global.ThemePackaging.effectiveExternalDownloadUrl(s);
        }
        try {
            var u = new URL(s);
            var host = String(u.hostname || "").toLowerCase();
            if (host === "themes.innioasis.app" || host === "www.themes.innioasis.app") return false;
            return true;
        } catch (e) {
            return false;
        }
    }

    function trackExternalShellDownload(key) {
        try {
            var dlKey = EXT_DL_SESSION_PREFIX + key;
            if (sessionStorage.getItem(dlKey)) return;
            sessionStorage.setItem(dlKey, "1");
        } catch (e) {}
        sendEvent(key, "zip_download", "theme_page");
    }

    if (!global.ThemeAnalytics) {
        global.ThemeAnalytics = {
            normalizeThemeKey: normalizeThemeKey,
            trackPageView: function (themeKey, source) {
                sendEvent(themeKey, "page_view", source || "theme_page");
            },
            trackZipDownload: function (themeKey, source) {
                sendEvent(themeKey, "zip_download", source || "theme_page");
            },
            trackDirectInstall: function (themeKey, source) {
                sendEvent(themeKey, "direct_install", source || "theme_page");
            },
            trackExternalDownload: function (themeKey, source) {
                sendEvent(themeKey, "page_view", source || "theme_page");
                sendEvent(themeKey, "zip_download", source || "theme_page");
            },
            hasApi: function () {
                return !!readMetaOrigin();
            },
        };
    }

    function track() {
        if (isLikelyCrawler()) return;
        var dest = destUrl();
        var key = parseThemeFromDest(dest) || themeFromPath();
        if (!key) return;
        sendEvent(key, "page_view", "theme_page");

        /* Internal rich SEO shells never use external download URLs; skip extra ./config.json fetch. */
        if (document.querySelector('main[data-theme-seo-rich="1"]')) return;

        fetch("./config.json", { cache: "no-cache" })
            .then(function (res) {
                return res && res.ok ? res.json() : null;
            })
            .then(function (cfg) {
                if (!cfg || typeof cfg !== "object") return;
                var info = cfg.theme_info || cfg.source_info || {};
                var extUrl =
                    (info && info.externalDownloadUrl) ||
                    cfg.externalDownloadUrl ||
                    "";
                if (isExternalDownloadUrl(extUrl)) {
                    trackExternalShellDownload(key);
                }
            })
            .catch(function () {});
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", track);
    } else {
        track();
    }
})(typeof window !== "undefined" ? window : globalThis);
