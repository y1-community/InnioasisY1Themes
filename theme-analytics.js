/**
 * Unified theme analytics + star ratings for themes.innioasis.app (GitHub Pages → Cloudflare Worker).
 */
(function (global) {
    "use strict";

    const CONSENT_KEY = "y1-theme-consent-v2";
    const LEGACY_CONSENT_KEY = "y1-theme-consent-v1";
    const VISITOR_KEY = "y1-rating-visitor-id";
    const PV_SESSION_PREFIX = "y1-pv-session:";

    /** Visitors contribute by default; they may opt out via Privacy settings. Public stats stay visible. */
    const DEFAULT_CONSENT = {
        decided: false,
        analytics: true,
        ratingsView: true,
        ratingsSubmit: true,
    };

    const DEFAULT_ACCEPT_CONSENT = {
        decided: true,
        analytics: true,
        ratingsView: true,
        ratingsSubmit: true,
    };

    const statsCache = new Map();
    /** Gallery has 100+ themes; batch + session cache keeps Worker usage under Free-tier limits. */
    const STATS_SESSION_CACHE_KEY = "y1-theme-stats-batch-v1";
    const STATS_SESSION_CACHE_TTL_MS = 10 * 60 * 1000;
    const STATS_FETCH_CHUNK = 80;
    const REACTIONS = [
        { key: "down", value: 0, label: "Thumbs down", icon: "&#128078;" },
        { key: "up", value: 2.5, label: "Thumbs up", icon: "&#128077;" },
        { key: "heart", value: 5, label: "Love it", icon: "&#10084;&#65039;" },
    ];

    function formatScoreOutOfFive(avg) {
        const n = Number(avg) || 0;
        return (Math.round(n * 10) / 10).toFixed(1);
    }

    function syncCardStatsAttributes(themeKey) {
        const key = normalizeThemeKey(themeKey);
        const stats = statsCache.get(key);
        if (!stats) return;
        const cards = document.querySelectorAll(".theme-card[data-catalog-folder]");
        for (const card of cards) {
            if (normalizeThemeKey(card.getAttribute("data-catalog-folder")) !== key) continue;
            card.setAttribute("data-views", String(Number(stats.pageViews) || 0));
            card.setAttribute("data-downloads", String(Number(stats.downloads) || 0));
            card.setAttribute("data-rating", String(Number(stats.ratingAverage) || 0));
            card.setAttribute("data-rating-count", String(Number(stats.ratingCount) || 0));
        }
    }

    function syncAllCardStats() {
        for (const key of statsCache.keys()) syncCardStatsAttributes(key);
        try {
            global.dispatchEvent(new CustomEvent("y1-theme-stats-updated"));
        } catch (_) {}
    }

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
        if (s.length > 240) return "";
        return s;
    }

    /** Compare stored REAL ratings (0 | 2.5 | 5) to meter values without IEEE noise. */
    function reactionStoredMatches(userStored, needle) {
        if (userStored === null || userStored === undefined) return false;
        return (
            Math.round(Number(userStored) * 100) === Math.round(Number(needle) * 100)
        );
    }

    function normalizeConsentObject(c) {
        return {
            decided: !!c.decided,
            analytics: c.analytics !== false,
            ratingsView: c.ratingsView !== false,
            ratingsSubmit: c.ratingsSubmit !== false,
        };
    }

    function migrateLegacyConsent(parsed) {
        if (!parsed || typeof parsed !== "object") return { ...DEFAULT_CONSENT };
        if (!parsed.decided) return { ...DEFAULT_CONSENT };
        return normalizeConsentObject(parsed);
    }

    function loadConsent() {
        try {
            let raw = localStorage.getItem(CONSENT_KEY);
            if (!raw) {
                const legacyRaw = localStorage.getItem(LEGACY_CONSENT_KEY);
                if (legacyRaw) {
                    const migrated = migrateLegacyConsent(JSON.parse(legacyRaw));
                    localStorage.setItem(CONSENT_KEY, JSON.stringify(migrated));
                    return migrated;
                }
                return { ...DEFAULT_CONSENT };
            }
            return normalizeConsentObject(JSON.parse(raw));
        } catch (_) {
            return { ...DEFAULT_CONSENT };
        }
    }

    /** Public view/download counts are always shown (community totals). */
    function shouldShowAnalyticsCounts() {
        return true;
    }

    function shouldShowRatings(c) {
        const s = c || loadConsent();
        return s.ratingsView !== false;
    }

    function shouldTrackAnalytics(c) {
        const s = c || loadConsent();
        return s.analytics !== false;
    }

    function shouldSubmitRatings(c) {
        const s = c || loadConsent();
        return s.ratingsSubmit !== false;
    }

    function saveConsentLocal(c) {
        const normalized = normalizeConsentObject({ ...c, decided: true });
        localStorage.setItem(CONSENT_KEY, JSON.stringify(normalized));
        return normalized;
    }

    async function syncConsentToServer(prefs) {
        const vid = getVisitorId();
        if (!vid || !apiUrl("/api/theme-privacy")) return;
        await postJson("/api/theme-privacy", {
            voterId: vid,
            analytics: prefs.analytics !== false,
            ratingsSubmit: prefs.ratingsSubmit !== false,
            ratingsView: prefs.ratingsView !== false,
        });
    }

    async function saveConsent(c) {
        const normalized = saveConsentLocal(c);
        void syncConsentToServer(normalized);
        return normalized;
    }

    async function hydrateConsentFromServer() {
        if (loadConsent().decided) return;
        const vid = getVisitorId();
        const url = apiUrl("/api/theme-privacy");
        if (!vid || !url) return;
        try {
            const res = await fetch(url + "?voterId=" + encodeURIComponent(vid), { cache: "no-store" });
            if (!res.ok) return;
            const data = await res.json();
            if (!data || !data.stored || !data.preferences) return;
            const p = data.preferences;
            saveConsentLocal({
                analytics: p.analytics !== false,
                ratingsSubmit: p.ratingsSubmit !== false,
                ratingsView: p.ratingsView !== false,
            });
        } catch (_) {}
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

    function hydrateStatsCacheFromSession() {
        try {
            const raw = sessionStorage.getItem(STATS_SESSION_CACHE_KEY);
            if (!raw) return;
            const parsed = JSON.parse(raw);
            if (!parsed || typeof parsed !== "object") return;
            const ts = Number(parsed.ts) || 0;
            if (!ts || Date.now() - ts > STATS_SESSION_CACHE_TTL_MS) return;
            const themes = parsed.themes;
            if (!themes || typeof themes !== "object") return;
            for (const k of Object.keys(themes)) {
                const key = normalizeThemeKey(k);
                if (!key) continue;
                statsCache.set(key, normalizeStats(themes[k]));
            }
        } catch (_) {}
    }

    function persistStatsCacheToSession() {
        try {
            const themes = {};
            for (const [k, v] of statsCache.entries()) themes[k] = v;
            sessionStorage.setItem(
                STATS_SESSION_CACHE_KEY,
                JSON.stringify({ ts: Date.now(), themes }),
            );
        } catch (_) {}
    }

    async function fetchStatsChunk(missing) {
        if (!missing.length || !apiUrl("/api/theme-stats")) return;
        const q = new URLSearchParams();
        q.set("themes", missing.join(","));
        const c = loadConsent();
        if (shouldSubmitRatings(c)) q.set("voterId", getVisitorId());
        try {
            const res = await fetch(apiUrl("/api/theme-stats") + "?" + q.toString(), {
                cache: "no-store",
            });
            if (!res.ok) return;
            const data = await res.json();
            const themes = data && data.themes ? data.themes : {};
            for (const k of missing) {
                statsCache.set(k, normalizeStats(themes[k]));
            }
            persistStatsCacheToSession();
        } catch (_) {}
    }

    async function fetchStatsMap(themeKeys) {
        hydrateStatsCacheFromSession();
        const keys = [...new Set(themeKeys.map(normalizeThemeKey).filter(Boolean))];
        if (!keys.length) return {};
        const missing = keys.filter((k) => !statsCache.has(k));
        for (let i = 0; i < missing.length; i += STATS_FETCH_CHUNK) {
            await fetchStatsChunk(missing.slice(i, i + STATS_FETCH_CHUNK));
        }
        const out = {};
        for (const k of keys) {
            out[k] = statsCache.get(k) || emptyStats();
        }
        return out;
    }

    function emptyStats() {
        return normalizeStats({});
    }

    /** Public download count = ZIP downloads + direct installs (always recomputed). */
    function normalizeStats(raw) {
        const s = raw && typeof raw === "object" ? raw : {};
        const zipDownloads =
            Number(s.zipDownloads != null ? s.zipDownloads : s.zip_downloads) || 0;
        const directInstalls =
            Number(s.directInstalls != null ? s.directInstalls : s.direct_installs) || 0;
        const pageViews = Number(s.pageViews != null ? s.pageViews : s.page_views) || 0;
        const ratingCount = Number(s.ratingCount != null ? s.ratingCount : s.rating_count) || 0;
        const ratingAverage =
            Number(s.ratingAverage != null ? s.ratingAverage : s.rating_average) || 0;
        return {
            pageViews,
            zipDownloads,
            directInstalls,
            downloads: zipDownloads + directInstalls,
            ratingCount,
            ratingAverage,
            userRating:
                typeof s.userRating === "number" && !Number.isNaN(s.userRating)
                    ? s.userRating
                    : null,
        };
    }

    function bumpLocalStat(themeKey, field, delta) {
        const cur = statsCache.get(themeKey) || emptyStats();
        const next = normalizeStats({ ...cur, [field]: (Number(cur[field]) || 0) + delta });
        statsCache.set(themeKey, next);
    }

    function trackEvent(themeKey, event, source) {
        const key = normalizeThemeKey(themeKey);
        if (!key) return;
        const consent = loadConsent();
        if (!shouldTrackAnalytics(consent)) return;
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
        void postJson("/api/theme-event", {
            theme: key,
            event,
            source: source || "other",
            voterId: getVisitorId(),
        });
        refreshMetricsHosts(key);
    }

    function renderMetricsInto(el, stats, themeKey) {
        if (!el) return;
        const c = loadConsent();
        el.innerHTML = "";
        el.className = "y1-theme-metrics" + (el.dataset.cardMetrics === "1" ? " y1-theme-metrics--card" : "");

        if (shouldShowAnalyticsCounts()) {
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

        if (shouldShowRatings(c)) {
            const ratingWrap = document.createElement("div");
            ratingWrap.className = "y1-theme-rating";
            ratingWrap.setAttribute("data-theme-key", themeKey);

            const label = document.createElement("span");
            label.className = "y1-rating-label";
            label.textContent = shouldSubmitRatings(c) ? "Rate:" : "Score:";

            const reactions = document.createElement("span");
            reactions.className = "y1-reaction-group";
            reactions.setAttribute("role", "group");
            reactions.setAttribute("aria-label", "Theme rating");

            const avg = Number(stats.ratingAverage) || 0;
            const count = Number(stats.ratingCount) || 0;
            const userR = stats.userRating;

            for (const r of REACTIONS) {
                const btn = document.createElement("button");
                btn.type = "button";
                btn.className = "y1-reaction-btn y1-reaction-btn--" + r.key;
                btn.dataset.value = String(r.value);
                if (reactionStoredMatches(userR, r.value)) btn.classList.add("y1-reaction-btn--active");
                btn.innerHTML = r.icon;
                btn.title = r.label;
                btn.setAttribute("aria-label", r.label);
                btn.setAttribute("aria-pressed", reactionStoredMatches(userR, r.value) ? "true" : "false");
                if (!shouldSubmitRatings(c)) {
                    btn.disabled = true;
                } else {
                    btn.addEventListener("click", () => submitRating(themeKey, r.value, ratingWrap));
                }
                reactions.appendChild(btn);
            }

            const avgEl = document.createElement("span");
            avgEl.className = "y1-rating-avg";
            if (count > 0) {
                avgEl.textContent = formatScoreOutOfFive(avg) + " / 5 · " + formatCount(count);
            } else {
                avgEl.textContent = "No ratings yet";
            }

            const meter = document.createElement("span");
            meter.className = "y1-rating-meter";
            meter.setAttribute("aria-hidden", "true");
            const fill = document.createElement("span");
            fill.className = "y1-rating-meter-fill";
            fill.style.width = count > 0 ? Math.min(100, (avg / 5) * 100) + "%" : "0%";
            meter.appendChild(fill);

            ratingWrap.append(label, reactions, meter, avgEl);
            el.appendChild(ratingWrap);
        }

        if (!shouldShowRatings(c)) {
            el.style.display = el.querySelector(".y1-metric") ? "" : "none";
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
        renderMetricsInto(el, statsCache.get(key) || emptyStats(), key);
    }

    function refreshMetricsHosts(themeKey) {
        const key = normalizeThemeKey(themeKey);
        if (!key || !metricsHosts.has(key)) return;
        const stats = statsCache.get(key) || emptyStats();
        for (const el of metricsHosts.get(key)) {
            renderMetricsInto(el, stats, key);
        }
        syncCardStatsAttributes(key);
    }

    async function mountMetrics(el, themeKey) {
        const key = normalizeThemeKey(themeKey);
        if (!key || !el) return;
        registerMetricsHost(key, el);
        const map = await fetchStatsMap([key]);
        renderMetricsInto(el, map[key] || emptyStats(), key);
        syncCardStatsAttributes(key);
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
        syncAllCardStats();
    }

    async function submitRating(themeKey, rating, hostEl) {
        const key = normalizeThemeKey(themeKey);
        const consent = loadConsent();
        if (!shouldSubmitRatings(consent)) return;
        const reaction =
            rating === 0 ? "down" : rating === 2.5 ? "up" : rating === 5 ? "heart" : "";
        const body = await postJson("/api/theme-rating", {
            theme: key,
            rating,
            reaction,
            voterId: getVisitorId(),
        });
        if (body && body.stats) {
            statsCache.set(key, normalizeStats(body.stats));
        } else {
            const cur = statsCache.get(key) || emptyStats();
            statsCache.set(key, { ...cur, userRating: rating });
        }
        if (hostEl) {
            const metricsEl = hostEl.closest(".y1-theme-metrics");
            if (metricsEl) renderMetricsInto(metricsEl, statsCache.get(key), key);
        }
        refreshMetricsHosts(key);
        syncCardStatsAttributes(key);
    }

    const PRIVACY_GEAR_SVG =
        '<svg class="y1-privacy-settings-icon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">' +
        '<path d="M12 15.5A3.5 3.5 0 1 0 12 8.5a3.5 3.5 0 0 0 0 7Zm8.94-2.06-.76-.44.12-1.02.12-1.02.88-.5.88-.5-.76-1.32-.76-1.32-.88.5-.88.5-1.02-.12-1.02-.12-.76-.44-.76-.44.12-1.02.12-1.02-.88-.5-.88-.5.76-1.32.76-1.32.88.5.88.5 1.02-.12 1.02-.12.76-.44.76-.44-.12-1.02-.12-1.02.88-.5.88-.5-.76-1.32-.76-1.32-.88.5-.88.5-1.02.12-1.02.12.76.44.76.44-.12 1.02-.12 1.02.88.5.88.5.76 1.32.76 1.32-.88.5-.88.5-1.02.12-1.02.12-.76.44Z"/>' +
        "</svg>";

    function ensureConsentDom() {
        if (document.getElementById("y1-privacy-settings-btn")) return;

        const banner = document.createElement("div");
        banner.id = "y1-consent-banner";
        banner.setAttribute("role", "dialog");
        banner.setAttribute("aria-label", "Privacy preferences");
        banner.innerHTML =
            '<div class="y1-consent-inner">' +
            "<p>Theme view, download, and rating <strong>totals are public</strong> for everyone. " +
            "By default we <strong>do</strong> include your visits, downloads, and ratings in those totals. " +
            "Use the <strong>Privacy</strong> button (bottom-left) to opt out anytime.</p>" +
            '<div class="y1-consent-actions">' +
            '<button type="button" class="y1-consent-customize">Customize</button>' +
            '<button type="button" class="y1-consent-accept">Continue</button>' +
            "</div></div>";

        const settingsBtn = document.createElement("button");
        settingsBtn.type = "button";
        settingsBtn.id = "y1-privacy-settings-btn";
        settingsBtn.title = "Privacy & analytics settings";
        settingsBtn.setAttribute("aria-label", "Privacy and analytics settings");
        settingsBtn.innerHTML =
            PRIVACY_GEAR_SVG + '<span class="y1-privacy-settings-label">Privacy</span>';

        const panel = document.createElement("div");
        panel.id = "y1-privacy-panel";
        panel.innerHTML =
            "<h3>Privacy &amp; ratings</h3>" +
            '<p class="y1-privacy-hint">Public totals are always visible. Uncheck a box to stop contributing that data.</p>' +
            '<label><input type="checkbox" id="y1-opt-analytics" checked /> Contribute my page views &amp; download counts</label>' +
            '<label><input type="checkbox" id="y1-opt-ratings-view" checked /> Show star ratings from other visitors</label>' +
            '<label><input type="checkbox" id="y1-opt-ratings-submit" checked /> Contribute my theme ratings</label>' +
            '<button type="button" class="y1-privacy-save">Save preferences</button>';

        document.body.appendChild(banner);
        document.body.appendChild(settingsBtn);
        document.body.appendChild(panel);
        settingsBtn.style.display = "inline-flex";

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
            void saveConsent({ ...DEFAULT_ACCEPT_CONSENT }).then(() => {
                applyBannerVisibility();
                global.dispatchEvent(new CustomEvent("y1-consent-changed"));
            });
        });

        banner.querySelector(".y1-consent-customize").addEventListener("click", () => {
            syncPanelFromConsent();
            panel.classList.add("y1-privacy-panel--open");
        });

        settingsBtn.addEventListener("click", () => {
            syncPanelFromConsent();
            const opening = !panel.classList.contains("y1-privacy-panel--open");
            panel.classList.toggle("y1-privacy-panel--open");
            if (opening && !loadConsent().decided) {
                void hydrateConsentFromServer().then(syncPanelFromConsent);
            }
        });

        panel.querySelector(".y1-privacy-save").addEventListener("click", () => {
            void saveConsent({
                analytics: !!document.getElementById("y1-opt-analytics")?.checked,
                ratingsView: !!document.getElementById("y1-opt-ratings-view")?.checked,
                ratingsSubmit: !!document.getElementById("y1-opt-ratings-submit")?.checked,
            }).then(() => {
                panel.classList.remove("y1-privacy-panel--open");
                applyBannerVisibility();
                global.dispatchEvent(new CustomEvent("y1-consent-changed"));
            });
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
        const start = () => {
            ensureConsentDom();
        };
        if (document.body) {
            start();
        } else {
            document.addEventListener("DOMContentLoaded", start);
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
        registerMetricsHost,
        mountMetrics,
        mountMetricsBatch,
        fetchStatsMap,
        getStats: (themeKey) => statsCache.get(normalizeThemeKey(themeKey)) || emptyStats(),
        syncAllCardStats,
        refreshAll: () => {
            for (const key of metricsHosts.keys()) refreshMetricsHosts(key);
            syncAllCardStats();
        },
        hasApi: () => !!readMetaOrigin(),
    };

    global.addEventListener("y1-consent-changed", () => {
        for (const key of metricsHosts.keys()) refreshMetricsHosts(key);
    });
})(typeof window !== "undefined" ? window : globalThis);
