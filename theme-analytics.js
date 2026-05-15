/**
 * Unified theme analytics + star ratings for themes.innioasis.app (GitHub Pages → Cloudflare Worker).
 */
(function (global) {
    "use strict";

    const CONSENT_KEY = "y1-theme-consent-v1";
    const VISITOR_KEY = "y1-rating-visitor-id";
    const PV_SESSION_PREFIX = "y1-pv-session:";

    const DEFAULT_CONSENT = {
        decided: false,
        analytics: true,
        ratingsView: true,
        ratingsSubmit: true,
    };

    const statsCache = new Map();

    function readMetaOrigin() {
        const meta = document.querySelector('meta[name="cf-theme-analytics-origin"]');
        const raw = meta && meta.getAttribute("content") ? String(meta.getAttribute("content")).trim() : "";
        if (!raw) return "";
        try {
            return raw.replace(/\/+$/, "");
        } catch (_) {
            return "";
        }
    }

    function apiUrl(path) {
        const base = readMetaOrigin();
        if (!base) return "";
        try {
            return new URL(path, base + "/").toString();
        } catch (_) {
            return "";
        }
    }

    function normalizeThemeKey(raw) {
        const s = String(raw || "")
            .trim()
            .replace(/^\.\/+/, "")
            .replace(/\/+$/, "");
        if (!s || s.includes("..") || s.includes("/")) return "";
        return s;
    }

    function loadConsent() {
        try {
            const raw = localStorage.getItem(CONSENT_KEY);
            if (!raw) return { ...DEFAULT_CONSENT };
            const parsed = JSON.parse(raw);
            return {
                decided: !!parsed.decided,
                analytics: parsed.analytics !== false,
                ratingsView: parsed.ratingsView !== false,
                ratingsSubmit: parsed.ratingsSubmit !== false,
            };
        } catch (_) {
            return { ...DEFAULT_CONSENT };
        }
    }

    function saveConsent(c) {
        localStorage.setItem(
            CONSENT_KEY,
            JSON.stringify({
                decided: true,
                analytics: !!c.analytics,
                ratingsView: !!c.ratingsView,
                ratingsSubmit: !!c.ratingsSubmit,
            }),
        );
    }

    function getVisitorId() {
        try {
            let id = localStorage.getItem(VISITOR_KEY);
            if (!id || id.length < 12) {
                id =
                    (global.crypto && crypto.randomUUID && crypto.randomUUID()) ||
                    "v-" + Math.random().toString(36).slice(2) + Date.now().toString(36);
                localStorage.setItem(VISITOR_KEY, id);
            }
            return id;
        } catch (_) {
            return "anon-" + Math.random().toString(36).slice(2);
        }
    }

    function formatCount(n) {
        const x = Number(n) || 0;
        if (x >= 1_000_000) return (x / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
        if (x >= 10_000) return Math.round(x / 1000) + "k";
        if (x >= 1000) return (x / 1000).toFixed(1).replace(/\.0$/, "") + "k";
        return String(x);
    }

    async function postJson(path, body) {
        const url = apiUrl(path);
        if (!url) return null;
        try {
            const res = await fetch(url, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
                keepalive: true,
            });
            if (!res.ok) return null;
            return await res.json();
        } catch (_) {
            return null;
        }
    }

    async function fetchStatsMap(themeKeys) {
        const keys = [...new Set(themeKeys.map(normalizeThemeKey).filter(Boolean))];
        if (!keys.length) return {};
        const missing = keys.filter((k) => !statsCache.has(k));
        if (missing.length && apiUrl("/api/theme-stats")) {
            const q = new URLSearchParams();
            q.set("themes", missing.join(","));
            const c = loadConsent();
            if (c.ratingsSubmit) q.set("voterId", getVisitorId());
            try {
                const res = await fetch(apiUrl("/api/theme-stats") + "?" + q.toString(), {
                    cache: "no-store",
                });
                if (res.ok) {
                    const data = await res.json();
                    const themes = data && data.themes ? data.themes : {};
                    for (const k of missing) {
                        statsCache.set(k, themes[k] || emptyStats());
                    }
                }
            } catch (_) {}
        }
        const out = {};
        for (const k of keys) {
            out[k] = statsCache.get(k) || emptyStats();
        }
        return out;
    }

    function emptyStats() {
        return {
            pageViews: 0,
            zipDownloads: 0,
            directInstalls: 0,
            downloads: 0,
            ratingCount: 0,
            ratingAverage: 0,
            userRating: null,
        };
    }

    function bumpLocalStat(themeKey, field, delta) {
        const cur = statsCache.get(themeKey) || emptyStats();
        const next = { ...cur, [field]: (Number(cur[field]) || 0) + delta };
        if (field === "zipDownloads" || field === "directInstalls") {
            next.downloads = (Number(next.zipDownloads) || 0) + (Number(next.directInstalls) || 0);
        }
        statsCache.set(themeKey, next);
    }

    function trackEvent(themeKey, event, source) {
        const key = normalizeThemeKey(themeKey);
        if (!key) return;
        const consent = loadConsent();
        if (!consent.decided || !consent.analytics) return;
        if (event === "page_view") {
            try {
                const sk = PV_SESSION_PREFIX + key;
                if (sessionStorage.getItem(sk)) return;
                sessionStorage.setItem(sk, "1");
            } catch (_) {}
            bumpLocalStat(key, "pageViews", 1);
        } else if (event === "zip_download") {
            bumpLocalStat(key, "zipDownloads", 1);
        } else if (event === "direct_install") {
            bumpLocalStat(key, "directInstalls", 1);
        }
        void postJson("/api/theme-event", { theme: key, event, source: source || "other" });
        refreshMetricsHosts(key);
    }

    function renderMetricsInto(el, stats, themeKey) {
        if (!el) return;
        const c = loadConsent();
        el.innerHTML = "";
        el.className = "y1-theme-metrics" + (el.dataset.cardMetrics === "1" ? " y1-theme-metrics--card" : "");

        if (c.decided && c.analytics) {
            const views = document.createElement("span");
            views.className = "y1-metric";
            views.title = "Page views (gallery + theme page + preview)";
            views.innerHTML =
                '<i class="fa-regular fa-eye" aria-hidden="true"></i> ' +
                formatCount(stats.pageViews) +
                " views";

            const dls = document.createElement("span");
            dls.className = "y1-metric";
            dls.title = "ZIP downloads and direct installs";
            dls.innerHTML =
                '<i class="fa-solid fa-download" aria-hidden="true"></i> ' +
                formatCount(stats.downloads) +
                " downloads";

            el.append(views, dls);
        }

        if (c.decided && c.ratingsView) {
            const ratingWrap = document.createElement("div");
            ratingWrap.className = "y1-theme-rating";
            ratingWrap.setAttribute("data-theme-key", themeKey);

            const label = document.createElement("span");
            label.className = "y1-rating-label";
            label.textContent = c.ratingsSubmit ? "Rate:" : "Rating:";

            const stars = document.createElement("span");
            stars.className = "y1-rating-stars";
            stars.setAttribute("role", "group");
            stars.setAttribute("aria-label", "Theme star rating");

            const avg = Number(stats.ratingAverage) || 0;
            const count = Number(stats.ratingCount) || 0;
            const userR = stats.userRating;

            for (let i = 1; i <= 5; i++) {
                const btn = document.createElement("button");
                btn.type = "button";
                btn.className = "y1-star";
                btn.dataset.value = String(i);
                const filled = userR ? i <= userR : count > 0 && i <= Math.round(avg);
                if (filled) btn.classList.add("y1-star--on");
                btn.innerHTML = filled ? "&#9733;" : "&#9734;";
                btn.setAttribute("aria-label", i + " star" + (i > 1 ? "s" : ""));
                if (!c.ratingsSubmit) {
                    btn.disabled = true;
                } else {
                    btn.addEventListener("click", () => submitRating(themeKey, i, ratingWrap));
                }
                stars.appendChild(btn);
            }

            const avgEl = document.createElement("span");
            avgEl.className = "y1-rating-avg";
            if (count > 0) {
                avgEl.textContent = avg.toFixed(1) + " (" + formatCount(count) + ")";
            } else {
                avgEl.textContent = "No ratings yet";
            }

            ratingWrap.append(label, stars, avgEl);
            el.appendChild(ratingWrap);
        }

        if (!c.decided) {
            el.style.display = "none";
        } else if (!c.analytics && !c.ratingsView) {
            el.style.display = "none";
        } else {
            el.style.display = "";
        }
    }

    const metricsHosts = new Map();

    function registerMetricsHost(themeKey, el) {
        const key = normalizeThemeKey(themeKey);
        if (!key || !el) return;
        if (!metricsHosts.has(key)) metricsHosts.set(key, new Set());
        metricsHosts.get(key).add(el);
    }

    function refreshMetricsHosts(themeKey) {
        const key = normalizeThemeKey(themeKey);
        if (!key || !metricsHosts.has(key)) return;
        const stats = statsCache.get(key) || emptyStats();
        for (const el of metricsHosts.get(key)) {
            renderMetricsInto(el, stats, key);
        }
    }

    async function mountMetrics(el, themeKey) {
        const key = normalizeThemeKey(themeKey);
        if (!key || !el) return;
        registerMetricsHost(key, el);
        const map = await fetchStatsMap([key]);
        renderMetricsInto(el, map[key] || emptyStats(), key);
    }

    async function mountMetricsBatch(entries) {
        const list = Array.isArray(entries) ? entries : [];
        const keys = list.map((e) => normalizeThemeKey(e.themeKey || e.theme)).filter(Boolean);
        const map = await fetchStatsMap(keys);
        for (const e of list) {
            const key = normalizeThemeKey(e.themeKey || e.theme);
            const el = e.el;
            if (!key || !el) continue;
            registerMetricsHost(key, el);
            renderMetricsInto(el, map[key] || emptyStats(), key);
        }
    }

    async function submitRating(themeKey, rating, hostEl) {
        const key = normalizeThemeKey(themeKey);
        const consent = loadConsent();
        if (!consent.decided || !consent.ratingsSubmit) return;
        const body = await postJson("/api/theme-rating", {
            theme: key,
            rating,
            voterId: getVisitorId(),
        });
        if (body && body.stats) {
            statsCache.set(key, body.stats);
        } else {
            const cur = statsCache.get(key) || emptyStats();
            statsCache.set(key, { ...cur, userRating: rating });
        }
        if (hostEl) {
            const metricsEl = hostEl.closest(".y1-theme-metrics");
            if (metricsEl) renderMetricsInto(metricsEl, statsCache.get(key), key);
        }
        refreshMetricsHosts(key);
    }

    function ensureConsentDom() {
        if (document.getElementById("y1-consent-banner")) return;

        const banner = document.createElement("div");
        banner.id = "y1-consent-banner";
        banner.setAttribute("role", "dialog");
        banner.setAttribute("aria-label", "Privacy preferences");
        banner.innerHTML =
            '<div class="y1-consent-inner">' +
            "<p>We use optional analytics (page views and download counts) and an optional star rating system so creators can see how themes are used. You can change these anytime.</p>" +
            '<div class="y1-consent-actions">' +
            '<button type="button" class="y1-consent-customize">Customize</button>' +
            '<button type="button" class="y1-consent-accept">Accept all</button>' +
            "</div></div>";

        const settingsBtn = document.createElement("button");
        settingsBtn.type = "button";
        settingsBtn.id = "y1-privacy-settings-btn";
        settingsBtn.title = "Privacy & ratings settings";
        settingsBtn.setAttribute("aria-label", "Privacy and ratings settings");
        settingsBtn.innerHTML = '<i class="fa-solid fa-gear" aria-hidden="true"></i>';

        const panel = document.createElement("div");
        panel.id = "y1-privacy-panel";
        panel.innerHTML =
            "<h3>Privacy &amp; ratings</h3>" +
            '<p class="y1-privacy-hint">Counts and ratings are stored on our analytics service (not sold). Opt out of any feature below.</p>' +
            '<label><input type="checkbox" id="y1-opt-analytics" checked /> Usage statistics (page views &amp; download counts)</label>' +
            '<label><input type="checkbox" id="y1-opt-ratings-view" checked /> Show star ratings from other visitors</label>' +
            '<label><input type="checkbox" id="y1-opt-ratings-submit" checked /> Allow me to submit star ratings</label>' +
            '<button type="button" class="y1-privacy-save">Save preferences</button>';

        document.body.appendChild(banner);
        document.body.appendChild(settingsBtn);
        document.body.appendChild(panel);

        const syncPanelFromConsent = () => {
            const c = loadConsent();
            const a = document.getElementById("y1-opt-analytics");
            const rv = document.getElementById("y1-opt-ratings-view");
            const rs = document.getElementById("y1-opt-ratings-submit");
            if (a) a.checked = c.analytics;
            if (rv) rv.checked = c.ratingsView;
            if (rs) rs.checked = c.ratingsSubmit;
        };

        const applyBannerVisibility = () => {
            const c = loadConsent();
            if (!c.decided) {
                banner.classList.add("y1-consent--visible");
                document.body.classList.add("y1-consent-banner-open");
            } else {
                banner.classList.remove("y1-consent--visible");
                document.body.classList.remove("y1-consent-banner-open");
            }
        };

        banner.querySelector(".y1-consent-accept").addEventListener("click", () => {
            saveConsent({ analytics: true, ratingsView: true, ratingsSubmit: true });
            applyBannerVisibility();
            global.dispatchEvent(new CustomEvent("y1-consent-changed"));
        });

        banner.querySelector(".y1-consent-customize").addEventListener("click", () => {
            syncPanelFromConsent();
            panel.classList.add("y1-privacy-panel--open");
        });

        settingsBtn.addEventListener("click", () => {
            syncPanelFromConsent();
            panel.classList.toggle("y1-privacy-panel--open");
        });

        panel.querySelector(".y1-privacy-save").addEventListener("click", () => {
            saveConsent({
                analytics: !!document.getElementById("y1-opt-analytics")?.checked,
                ratingsView: !!document.getElementById("y1-opt-ratings-view")?.checked,
                ratingsSubmit: !!document.getElementById("y1-opt-ratings-submit")?.checked,
            });
            panel.classList.remove("y1-privacy-panel--open");
            applyBannerVisibility();
            global.dispatchEvent(new CustomEvent("y1-consent-changed"));
        });

        document.addEventListener("click", (ev) => {
            if (
                panel.classList.contains("y1-privacy-panel--open") &&
                !panel.contains(ev.target) &&
                ev.target !== settingsBtn &&
                !settingsBtn.contains(ev.target)
            ) {
                panel.classList.remove("y1-privacy-panel--open");
            }
        });

        applyBannerVisibility();
    }

    function initConsent() {
        if (document.body) {
            ensureConsentDom();
        } else {
            document.addEventListener("DOMContentLoaded", ensureConsentDom);
        }
    }

    function trackPageView(themeKey, source) {
        trackEvent(themeKey, "page_view", source || "theme_page");
    }

    function trackZipDownload(themeKey, source) {
        trackEvent(themeKey, "zip_download", source || "gallery");
    }

    function trackDirectInstall(themeKey, source) {
        trackEvent(themeKey, "direct_install", source || "gallery");
    }

    function wrapDownloadSuccess(themeKey, source, fn) {
        return async function (...args) {
            const result = await fn.apply(this, args);
            try {
                trackZipDownload(themeKey, source);
            } catch (_) {}
            return result;
        };
    }

    initConsent();

    global.ThemeAnalytics = {
        normalizeThemeKey,
        loadConsent,
        trackPageView,
        trackZipDownload,
        trackDirectInstall,
        mountMetrics,
        mountMetricsBatch,
        fetchStatsMap,
        refreshAll: () => {
            for (const key of metricsHosts.keys()) refreshMetricsHosts(key);
        },
        hasApi: () => !!readMetaOrigin(),
    };

    global.addEventListener("y1-consent-changed", () => {
        for (const key of metricsHosts.keys()) refreshMetricsHosts(key);
    });
})(typeof window !== "undefined" ? window : globalThis);
