/**
 * Lightweight page-view tracking for per-theme SEO index.html shells (before redirect to theme.html).
 * Shares session dedupe keys with theme-analytics.js so one visit = one view.
 */
(function () {
    "use strict";

    var CONSENT_KEY = "y1-theme-consent-v2";
    var LEGACY_CONSENT_KEY = "y1-theme-consent-v1";
    var PV_SESSION_PREFIX = "y1-pv-session:";
    var VISITOR_KEY = "y1-rating-visitor-id";

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
            if (id && id.length >= 8) return id;
            id = "v_" + Math.random().toString(36).slice(2) + Date.now().toString(36);
            localStorage.setItem(VISITOR_KEY, id);
            return id;
        } catch (e) {
            return "anon";
        }
    }

    function destUrl() {
        try {
            var h = document.documentElement;
            var a = h && h.getAttribute("data-themes-preview-redirect");
            if (a) return String(a).trim();
            var c = document.querySelector('link[rel="canonical"]');
            if (c && c.href) return String(c.href).trim();
        } catch (e) {}
        return "";
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

    function track() {
        var base = readMetaOrigin();
        if (!base) return;
        var consent = loadConsent();
        if (consent.analytics === false) return;
        var dest = destUrl();
        var key = parseThemeFromDest(dest);
        if (!key) return;
        try {
            var sk = PV_SESSION_PREFIX + key;
            if (sessionStorage.getItem(sk)) return;
            sessionStorage.setItem(sk, "1");
        } catch (e) {}
        var url = base + "/api/theme-event";
        var body = JSON.stringify({
            theme: key,
            event: "page_view",
            source: "seo_shell",
            voterId: getVisitorId(),
        });
        try {
            if (navigator.sendBeacon) {
                navigator.sendBeacon(url, new Blob([body], { type: "application/json" }));
                return;
            }
        } catch (e2) {}
        fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: body,
            keepalive: true,
        }).catch(function () {});
    }

    track();
})();
