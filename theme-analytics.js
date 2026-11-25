/**
 * Unified theme analytics + star ratings for themes.innioasis.app (GitHub Pages -> Cloudflare Worker).
 *
 * Quota-safe design:
 * - Public stats are fetched from /api/theme-stats?all=1 (no voterId, HTTP & localStorage cached 15m).
 * - Personal votes are stored in localStorage and synced at most once via /api/theme-stats?votesOnly=1
 *   only for returning visitors who already had a visitor ID (brand-new visitors make 0 vote queries).
 * - Never falls back to 9 concurrent chunked requests on error; enters a 5m circuit-breaker backoff so
 *   analytics outages never cause retry storms or compete with theme uploads for account Worker quota.
 * - Uses CORS-simple text/plain JSON POSTs to eliminate OPTIONS preflight requests (-50% Worker calls).
 * - Skips crawler/bot page_view beacons and dedupes page views per UTC day in localStorage.
 */
(function (global) {
    "use strict";

    const CONSENT_KEY = "y1-theme-consent-v2";
    const LEGACY_CONSENT_KEY = "y1-theme-consent-v1";
    const VISITOR_KEY = "y1-rating-visitor-id";
    const PV_SESSION_PREFIX = "y1-pv-session:";
    const PV_DAY_PREFIX = "y1-pv-day:";
    const USER_VOTES_KEY = "y1-user-votes-v1";
    const USER_VOTES_SYNCED_KEY = "y1-user-votes-synced-v1";
    const STATS_BACKOFF_KEY = "y1-theme-stats-backoff-until";
    const STATS_BACKOFF_MS = 5 * 60 * 1000;
    const FETCH_TIMEOUT_MS = 8000;

    const CRAWLER_UA_RE =
        /googlebot|bingbot|bingpreview|slurp|duckduckbot|baiduspider|yandex|applebot|ahrefsbot|semrushbot|mj12bot|dotbot|petalbot|bytespider|gptbot|oai-searchbot|claudebot|anthropic-ai|ccbot|perplexitybot|amazonbot|facebookexternalhit|twitterbot|linkedinbot|slackbot|discordbot|pinterestbot|uptimerobot|pingdom|statuscake|pagespeed|lighthouse|gtmetrix|scrapy/i;

    /** Visitors contribute by default; they may opt out via Privacy settings. Public stats stay visible. */
    const DEFAULT_CONSENT = {
        decided: true,
        analytics: true,
        ratingsView: true,
        ratingsSubmit: true,
        feedback: true,
        nightly: true,
    };

    const DEFAULT_ACCEPT_CONSENT = {
        decided: true,
        analytics: true,
        ratingsView: true,
        ratingsSubmit: true,
        feedback: true,
        nightly: true,
    };

    const statsCache = new Map();
    const userVotesCache = new Map();
    let userVotesHydrated = false;
    let userVotesInFlight = null;
    let allStatsLoaded = false;
    let allStatsAttempted = false;
    let allStatsInFlight = null;

    /** Public stats snapshot cached across page loads for 15 minutes (0 Worker/D1 calls on revisits). */
    const STATS_CACHE_KEY = "y1-theme-stats-public-v3";
    const STATS_CACHE_TTL_MS = 15 * 60 * 1000;
    const STATS_FETCH_CHUNK = 80;
    const REACTIONS = [
        { key: "down", value: 0, label: "Thumbs down", icon: "&#128078;" },
        { key: "up", value: 2.5, label: "Thumbs up", icon: "&#128077;" },
        { key: "heart", value: 5, label: "Love it", icon: "&#10084;&#65039;" },
    ];

    function isLikelyCrawler() {
        try {
            const ua = (global.navigator && global.navigator.userAgent) || "";
            if (CRAWLER_UA_RE.test(ua)) return true;
        } catch (_) {}
        return false;
    }

    function utcDayStamp() {
        try {
            return new Date().toISOString().slice(0, 10);
        } catch (_) {
            return "";
        }
    }

    function isInStatsBackoff() {
        try {
            const until = Number(localStorage.getItem(STATS_BACKOFF_KEY) || 0);
            return until > Date.now();
        } catch (_) {
            return false;
        }
    }

    function tripStatsBackoff(ms) {
        try {
            localStorage.setItem(STATS_BACKOFF_KEY, String(Date.now() + (ms || STATS_BACKOFF_MS)));
        } catch (_) {}
    }

    function clearStatsBackoff() {
        try {
            localStorage.removeItem(STATS_BACKOFF_KEY);
        } catch (_) {}
    }

    async function fetchWithTimeout(url, init) {
        if (typeof AbortController !== "function") {
            return fetch(url, init);
        }
        const ac = new AbortController();
        const timer = setTimeout(() => {
            try {
                ac.abort();
            } catch (_) {}
        }, FETCH_TIMEOUT_MS);
        try {
            return await fetch(url, { ...(init || {}), signal: ac.signal });
        } finally {
            clearTimeout(timer);
        }
    }

    function formatScoreOutOfFive(avg) {
        const n = Number(avg) || 0;
        return (Math.round(n * 10) / 10).toFixed(1);
    }

    function applyStatsToCard(card, stats) {
        if (!card || !stats) return;
        card.setAttribute("data-views", String(Number(stats.pageViews) || 0));
        card.setAttribute("data-downloads", String(Number(stats.downloads) || 0));
        card.setAttribute("data-rating", String(Number(stats.ratingAverage) || 0));
        card.setAttribute("data-rating-count", String(Number(stats.ratingCount) || 0));
    }

    function syncCardStatsAttributes(themeKey) {
        const key = normalizeThemeKey(themeKey);
        const stats = statsCache.get(key);
        if (!stats) return;
        const cards = document.querySelectorAll(".theme-card[data-catalog-folder]");
        for (const card of cards) {
            if (normalizeThemeKey(card.getAttribute("data-catalog-folder")) !== key) continue;
            applyStatsToCard(card, stats);
        }
    }

    function syncAllCardStats() {
        const cards = document.querySelectorAll(".theme-card[data-catalog-folder]");
        for (const card of cards) {
            const key = normalizeThemeKey(card.getAttribute("data-catalog-folder"));
            if (!key) continue;
            const stats = statsCache.get(key);
            if (stats) applyStatsToCard(card, stats);
        }
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
        return Math.round(Number(userStored) * 100) === Math.round(Number(needle) * 100);
    }

    function normalizeConsentObject(c) {
        return {
            decided: !!c.decided,
            analytics: c.analytics !== false,
            ratingsView: c.ratingsView !== false,
            ratingsSubmit: c.ratingsSubmit !== false,
        };
    }

    function loadConsent() {
        try {
            let raw = localStorage.getItem(CONSENT_KEY);
            if (!raw) {
                const legacyRaw = localStorage.getItem(LEGACY_CONSENT_KEY) || localStorage.getItem("innioasis-consent");
                if (legacyRaw) {
                    const parsed = JSON.parse(legacyRaw);
                    if (parsed && typeof parsed === "object" && (parsed.decided || typeof parsed.feedback === "boolean")) {
                        const migrated = normalizeConsentObject({
                            decided: true,
                            analytics: typeof parsed.analytics === "boolean" ? parsed.analytics : parsed.feedback !== false,
                            ratingsView: typeof parsed.ratingsView === "boolean" ? parsed.ratingsView : true,
                            ratingsSubmit: typeof parsed.ratingsSubmit === "boolean" ? parsed.ratingsSubmit : parsed.feedback !== false,
                        });
                        localStorage.setItem(CONSENT_KEY, JSON.stringify(migrated));
                        return migrated;
                    }
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

    const PRIVACY_SYNCED_SIG_KEY = "y1-theme-privacy-synced-sig-v1";

    function consentSig(prefs) {
        return (
            (prefs.analytics !== false ? "1" : "0") +
            "," +
            (prefs.ratingsSubmit !== false ? "1" : "0") +
            "," +
            (prefs.ratingsView !== false ? "1" : "0")
        );
    }

    function saveConsentLocal(c) {
        const prev = loadConsent();
        const input = c && typeof c === "object" ? c : {};
        const normalized = normalizeConsentObject({
            decided: true,
            analytics: typeof input.analytics === "boolean" ? input.analytics : prev.analytics,
            ratingsView: typeof input.ratingsView === "boolean" ? input.ratingsView : prev.ratingsView,
            ratingsSubmit: typeof input.ratingsSubmit === "boolean" ? input.ratingsSubmit : prev.ratingsSubmit,
        });
        try {
            localStorage.setItem(CONSENT_KEY, JSON.stringify(normalized));
        } catch (_) {}
        return normalized;
    }

    async function syncConsentToServer(prefs) {
        const sig = consentSig(prefs);
        let lastSig = "";
        try {
            lastSig = localStorage.getItem(PRIVACY_SYNCED_SIG_KEY) || "";
        } catch (_) {}
        /* Worker treats missing rows as default opt-in ("1,1,1"). Only POST when
           opting out or changing a previously synced opt-out — stops thousands of
           redundant POST /api/theme-privacy writes on every page load. */
        if (sig === lastSig) return;
        if (sig === "1,1,1" && (!lastSig || lastSig === "1,1,1")) return;
        const vid = getVisitorId();
        if (!vid || !apiUrl("/api/theme-privacy")) return;
        const res = await postJson("/api/theme-privacy", {
            voterId: vid,
            analytics: prefs.analytics !== false,
            ratingsSubmit: prefs.ratingsSubmit !== false,
            ratingsView: prefs.ratingsView !== false,
        });
        if (res && res.ok) {
            try {
                localStorage.setItem(PRIVACY_SYNCED_SIG_KEY, sig);
            } catch (_) {}
        }
    }

    async function saveConsent(c) {
        const normalized = saveConsentLocal(c);
        void syncConsentToServer(normalized);
        return normalized;
    }

    function readExistingVisitorId() {
        try {
            const id = localStorage.getItem(VISITOR_KEY);
            return id && id.length >= 12 ? id : "";
        } catch (_) {
            return "";
        }
    }

    function getVisitorId() {
        try {
            let id = localStorage.getItem(VISITOR_KEY);
            if (!id || id.length < 12) {
                id =
                    (global.crypto && crypto.randomUUID && crypto.randomUUID()) ||
                    "v-" + Math.random().toString(36).slice(2) + Date.now().toString(36);
                localStorage.setItem(VISITOR_KEY, id);
                /* Brand-new visitor has zero prior votes in D1; skip remote votes lookup. */
                try {
                    if (!localStorage.getItem(USER_VOTES_SYNCED_KEY)) {
                        localStorage.setItem(USER_VOTES_SYNCED_KEY, "1");
                    }
                } catch (_) {}
            }
            return id;
        } catch (_) {
            return "anon-" + Math.random().toString(36).slice(2);
        }
    }

    function hydrateUserVotesLocal() {
        if (userVotesHydrated) return;
        userVotesHydrated = true;
        try {
            const raw = localStorage.getItem(USER_VOTES_KEY);
            if (!raw) return;
            const parsed = JSON.parse(raw);
            if (!parsed || typeof parsed !== "object") return;
            for (const k of Object.keys(parsed)) {
                const key = normalizeThemeKey(k);
                const val = Number(parsed[k]);
                if (key && !Number.isNaN(val)) userVotesCache.set(key, val);
            }
        } catch (_) {}
    }

    function persistUserVotesLocal() {
        try {
            const out = {};
            for (const [k, v] of userVotesCache.entries()) out[k] = v;
            localStorage.setItem(USER_VOTES_KEY, JSON.stringify(out));
            localStorage.setItem(USER_VOTES_SYNCED_KEY, "1");
        } catch (_) {}
    }

    function applyUserVotesToStatsCache() {
        for (const [key, rating] of userVotesCache.entries()) {
            const cur = statsCache.get(key) || emptyStats();
            if (cur.userRating !== rating) {
                statsCache.set(key, { ...cur, userRating: rating });
            }
        }
    }

    /**
     * Sync existing returning visitor's votes ONCE via the indexed votesOnly endpoint (0-3 D1 rows).
     * Brand-new visitors (and anyone already synced) make 0 network requests.
     */
    async function syncUserVotesOnce() {
        hydrateUserVotesLocal();
        if (!shouldSubmitRatings(loadConsent()) || isInStatsBackoff() || isLikelyCrawler()) return;
        try {
            if (localStorage.getItem(USER_VOTES_SYNCED_KEY) === "1") return;
        } catch (_) {}
        const existingVid = readExistingVisitorId();
        if (!existingVid) {
            try {
                localStorage.setItem(USER_VOTES_SYNCED_KEY, "1");
            } catch (_) {}
            return;
        }
        const base = apiUrl("/api/theme-stats");
        if (!base) return;
        if (userVotesInFlight) return userVotesInFlight;
        userVotesInFlight = (async () => {
            try {
                const q = new URLSearchParams();
                q.set("votesOnly", "1");
                q.set("voterId", existingVid);
                const res = await fetchWithTimeout(base + "?" + q.toString(), {
                    cache: "default",
                });
                if (!res.ok) return;
                const data = await res.json();
                if (!data || !data.ok || !data.votes || typeof data.votes !== "object") return;
                for (const k of Object.keys(data.votes)) {
                    const key = normalizeThemeKey(k);
                    const val = Number(data.votes[k]);
                    if (key && !Number.isNaN(val)) userVotesCache.set(key, val);
                }
                persistUserVotesLocal();
                applyUserVotesToStatsCache();
            } catch (_) {
            } finally {
                userVotesInFlight = null;
            }
        })();
        return userVotesInFlight;
    }

    function formatCount(n) {
        const x = Number(n) || 0;
        if (x >= 1_000_000) return (x / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
        if (x >= 10_000) return Math.round(x / 1000) + "k";
        if (x >= 1000) return (x / 1000).toFixed(1).replace(/\.0$/, "") + "k";
        return String(x);
    }

    /** Send CORS-simple text/plain JSON POST to avoid OPTIONS preflight Worker requests. */
    async function postJson(path, body) {
        const url = apiUrl(path);
        if (!url) return null;
        try {
            const res = await fetchWithTimeout(url, {
                method: "POST",
                headers: { "Content-Type": "text/plain;charset=UTF-8" },
                body: JSON.stringify(body),
                credentials: "omit",
                keepalive: true,
            });
            if (res.status === 429 || res.status >= 500) {
                tripStatsBackoff();
                return null;
            }
            if (!res.ok) return null;
            return await res.json();
        } catch (_) {
            return null;
        }
    }

    function hydrateStatsCacheFromStorage() {
        hydrateUserVotesLocal();
        try {
            const raw =
                localStorage.getItem(STATS_CACHE_KEY) ||
                sessionStorage.getItem(STATS_CACHE_KEY);
            if (!raw) return;
            const parsed = JSON.parse(raw);
            if (!parsed || typeof parsed !== "object") return;
            const ts = Number(parsed.ts) || 0;
            if (!ts || Date.now() - ts > STATS_CACHE_TTL_MS) return;
            const themes = parsed.themes;
            if (!themes || typeof themes !== "object") return;
            for (const k of Object.keys(themes)) {
                const key = normalizeThemeKey(k);
                if (!key) continue;
                const s = normalizeStats(themes[k]);
                if (userVotesCache.has(key)) s.userRating = userVotesCache.get(key);
                statsCache.set(key, s);
            }
            if (parsed.all === true) allStatsLoaded = true;
            applyUserVotesToStatsCache();
        } catch (_) {}
    }

    function persistStatsCacheToStorage() {
        try {
            const themes = {};
            for (const [k, v] of statsCache.entries()) {
                themes[k] = {
                    pageViews: v.pageViews,
                    zipDownloads: v.zipDownloads,
                    directInstalls: v.directInstalls,
                    ratingCount: v.ratingCount,
                    ratingAverage: v.ratingAverage,
                };
            }
            const payload = JSON.stringify({ ts: Date.now(), all: allStatsLoaded, themes });
            try {
                localStorage.setItem(STATS_CACHE_KEY, payload);
            } catch (_) {
                sessionStorage.setItem(STATS_CACHE_KEY, payload);
            }
        } catch (_) {}
    }

    async function fetchAllStats() {
        if (!apiUrl("/api/theme-stats")) return false;
        if (isInStatsBackoff()) {
            allStatsAttempted = true;
            return false;
        }
        if (allStatsInFlight) return allStatsInFlight;
        allStatsAttempted = true;
        allStatsInFlight = (async () => {
            try {
                /* Public cacheable URL (no voterId!) so browser + Worker cache serve all users. */
                const res = await fetchWithTimeout(apiUrl("/api/theme-stats") + "?all=1", {
                    cache: "default",
                });
                if (res.status === 429 || res.status >= 500) {
                    tripStatsBackoff();
                    return false;
                }
                if (!res.ok) return false;
                const data = await res.json();
                if (!data || !data.ok || !data.themes || typeof data.themes !== "object") return false;
                clearStatsBackoff();
                hydrateUserVotesLocal();
                for (const k of Object.keys(data.themes)) {
                    const key = normalizeThemeKey(k);
                    if (!key) continue;
                    const normalized = normalizeStats(data.themes[k]);
                    if (userVotesCache.has(key)) normalized.userRating = userVotesCache.get(key);
                    statsCache.set(key, normalized);
                }
                allStatsLoaded = true;
                persistStatsCacheToStorage();
                await syncUserVotesOnce();
                return true;
            } catch (_) {
                tripStatsBackoff();
                return false;
            } finally {
                allStatsInFlight = null;
            }
        })();
        return allStatsInFlight;
    }

    async function fetchSingleStats(keys) {
        if (!keys.length || !apiUrl("/api/theme-stats") || isInStatsBackoff()) return;
        const q = new URLSearchParams();
        if (keys.length === 1) q.set("theme", keys[0]);
        else q.set("themes", keys.slice(0, STATS_FETCH_CHUNK).join(","));
        try {
            const res = await fetchWithTimeout(apiUrl("/api/theme-stats") + "?" + q.toString(), {
                cache: "default",
            });
            if (res.status === 429 || res.status >= 500) {
                tripStatsBackoff();
                return;
            }
            if (!res.ok) return;
            const data = await res.json();
            if (!data || !data.ok || !data.themes || typeof data.themes !== "object") return;
            hydrateUserVotesLocal();
            for (const k of keys) {
                const normalized = normalizeStats(data.themes[k]);
                if (userVotesCache.has(k)) normalized.userRating = userVotesCache.get(k);
                statsCache.set(k, normalized);
            }
            persistStatsCacheToStorage();
            await syncUserVotesOnce();
        } catch (_) {
            tripStatsBackoff();
        }
    }

    async function fetchStatsMap(themeKeys) {
        hydrateStatsCacheFromStorage();
        const keys = [...new Set(themeKeys.map(normalizeThemeKey).filter(Boolean))];
        if (!keys.length) return {};
        let missing = keys.filter((k) => !statsCache.has(k));

        if (missing.length && !isInStatsBackoff()) {
            if (allStatsLoaded) {
                for (const k of missing) {
                    if (!statsCache.has(k)) statsCache.set(k, emptyStats());
                }
            } else if (missing.length > 5) {
                /* Multi-theme / gallery load: at most ONE ?all=1 request, NEVER fan out into 9 chunks on failure! */
                if (!allStatsAttempted) {
                    const ok = await fetchAllStats();
                    if (ok) {
                        for (const k of keys) {
                            if (!statsCache.has(k)) statsCache.set(k, emptyStats());
                        }
                    }
                }
            } else {
                await fetchSingleStats(missing);
            }
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
        persistStatsCacheToStorage();
    }

    function trackEvent(themeKey, event, source) {
        const key = normalizeThemeKey(themeKey);
        if (!key || isLikelyCrawler()) return;
        const consent = loadConsent();
        if (!shouldTrackAnalytics(consent)) return;
        if (event === "page_view") {
            const day = utcDayStamp();
            const sk = PV_SESSION_PREFIX + key;
            const dk = day ? PV_DAY_PREFIX + day + ":" + key : "";
            try {
                if (sessionStorage.getItem(sk)) return;
                if (dk && localStorage.getItem(dk)) {
                    sessionStorage.setItem(sk, "1");
                    return;
                }
                sessionStorage.setItem(sk, "1");
                if (dk) localStorage.setItem(dk, "1");
            } catch (_) {}
            bumpLocalStat(key, "pageViews", 1);
        } else if (event === "zip_download") {
            bumpLocalStat(key, "zipDownloads", 1);
        } else if (event === "direct_install") {
            bumpLocalStat(key, "directInstalls", 1);
        }
        refreshMetricsHosts(key);
        if (isInStatsBackoff()) return;
        void postJson("/api/theme-event", {
            theme: key,
            event,
            source: source || "other",
            voterId: getVisitorId(),
        }).then((res) => {
            if (res && res.ok && res.stats) {
                const existing = statsCache.get(key);
                const merged = normalizeStats({
                    ...res.stats,
                    userRating: existing ? existing.userRating : userVotesCache.get(key) ?? null,
                });
                statsCache.set(key, merged);
                persistStatsCacheToStorage();
                refreshMetricsHosts(key);
            }
        });
    }

    function metricLabel(text) {
        const label = document.createElement("span");
        label.className = "y1-metric-label";
        const translated = (window.InnioasisLocale && typeof window.InnioasisLocale.translate === "function")
            ? window.InnioasisLocale.translate(text)
            : text;
        label.textContent = translated || text;
        return label;
    }

    function renderMetricsInto(el, stats, themeKey) {
        if (!el) return;
        const c = loadConsent();
        el.innerHTML = "";
        el.className = "y1-theme-metrics" + (el.dataset.cardMetrics === "1" ? " y1-theme-metrics--card" : "");

        /* Show download count and rating only; page views stay tracked internally
           for Newest / Best sorting without cluttering the user-facing card. */
        if (shouldShowAnalyticsCounts()) {
            const dlCount = Number(stats.downloads) || 0;
            const dls = document.createElement("span");
            dls.className = "y1-metric y1-metric--downloads";
            dls.setAttribute("data-metric", "downloads");
            const dlWord = dlCount === 1 ? "download" : "downloads";
            dls.title = dlCount.toLocaleString() + " " + dlWord;
            dls.setAttribute("aria-label", dlCount.toLocaleString() + " " + dlWord);
            dls.innerHTML =
                '<i class="fa-solid fa-download" aria-hidden="true"></i> ' +
                formatCount(dlCount) +
                " ";
            dls.append(metricLabel(dlWord));

            if (el.dataset.cardMetrics === "1") {
                const countsRow = document.createElement("div");
                countsRow.className = "y1-metrics-counts";
                countsRow.append(dls);
                el.appendChild(countsRow);
            } else {
                el.appendChild(dls);
            }
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
        userVotesCache.set(key, rating);
        persistUserVotesLocal();
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
        persistStatsCacheToStorage();
        if (hostEl) {
            const metricsEl = hostEl.closest(".y1-theme-metrics");
            if (metricsEl) renderMetricsInto(metricsEl, statsCache.get(key), key);
        }
        refreshMetricsHosts(key);
        syncCardStatsAttributes(key);
    }

    function mountPrivacyButton() {
        const btn = document.getElementById("y1-privacy-settings-btn");
        if (btn) {
            btn.style.display = "none";
            btn.remove();
        }
    }

    function mountPrivacyToDock() {
        mountPrivacyButton();
    }

    function ensureConsentDom() {
        const existingBtn = document.getElementById("y1-privacy-settings-btn");
        if (existingBtn) existingBtn.remove();

        const hasToolbar = !!document.getElementById("support-toolbar-container") ||
                           !!document.querySelector("[data-privacy-open]") ||
                           !!document.getElementById("support-toolbar-slot");

        let banner = document.getElementById("y1-consent-banner");
        let panel = document.getElementById("y1-privacy-panel");

        if (!banner && !hasToolbar) {
            banner = document.createElement("div");
            banner.id = "y1-consent-banner";
            banner.setAttribute("role", "dialog");
            banner.setAttribute("aria-label", "Privacy preferences");
            banner.innerHTML =
                '<div class="y1-consent-inner">' +
                "<p><strong>Analytics and privacy.</strong> Themes.innioasis.app uses Google Analytics and Cloudflare to measure and optimise how the gallery performs and to protect it from attacks. " +
                "Theme view, download, and rating totals are public; use <strong>Privacy</strong> in the bottom dock to manage your preferences anytime.</p>" +
                '<div class="y1-consent-actions">' +
                '<button type="button" class="y1-consent-customize">Customize</button>' +
                '<button type="button" class="y1-consent-accept">Continue</button>' +
                "</div></div>";
            document.body.appendChild(banner);
        }

        if (!panel && !hasToolbar) {
            panel = document.createElement("div");
            panel.id = "y1-privacy-panel";
            panel.innerHTML =
                "<h3>Analytics &amp; privacy</h3>" +
                '<p class="y1-privacy-hint">Themes.innioasis.app uses Google Tag Manager with Google Analytics, and Cloudflare, to measure and optimise performance and protect the gallery from attacks. Public theme totals are always visible; uncheck a box below to stop contributing that data.</p>' +
                '<label><input type="checkbox" id="y1-opt-analytics" checked /> Contribute my page views &amp; download counts</label>' +
                '<label><input type="checkbox" id="y1-opt-ratings-view" checked /> Show star ratings from other visitors</label>' +
                '<label><input type="checkbox" id="y1-opt-ratings-submit" checked /> Contribute my theme ratings</label>' +
                '<button type="button" class="y1-privacy-save">Save preferences</button>';
            document.body.appendChild(panel);
        }

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
            const b = document.getElementById("y1-consent-banner");
            if (!b) return;
            b.classList.remove("y1-consent--visible");
            b.hidden = true;
            document.body.classList.remove("y1-consent-banner-open");
        };

        if (banner) {
            const acceptBtn = banner.querySelector(".y1-consent-accept");
            if (acceptBtn && !acceptBtn._hasConsentListener) {
                acceptBtn._hasConsentListener = true;
                acceptBtn.addEventListener("click", () => {
                    void saveConsent({ ...DEFAULT_ACCEPT_CONSENT }).then(() => {
                        applyBannerVisibility();
                        global.dispatchEvent(new CustomEvent("y1-consent-changed"));
                    });
                });
            }

            const customizeBtn = banner.querySelector(".y1-consent-customize");
            if (customizeBtn && !customizeBtn._hasConsentListener) {
                customizeBtn._hasConsentListener = true;
                customizeBtn.addEventListener("click", () => {
                    syncPanelFromConsent();
                    const p = document.getElementById("y1-privacy-panel");
                    if (p) p.classList.add("y1-privacy-panel--open");
                });
            }
        }

        if (panel) {
            const saveBtn = panel.querySelector(".y1-privacy-save");
            if (saveBtn && !saveBtn._hasConsentListener) {
                saveBtn._hasConsentListener = true;
                saveBtn.addEventListener("click", () => {
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
            }
        }

        document.addEventListener("y1-close-privacy-panel", () => {
            const p = document.getElementById("y1-privacy-panel");
            if (p) p.classList.remove("y1-privacy-panel--open");
        });

        applyBannerVisibility();
    }

    function initConsent() {
        const start = () => {
            ensureConsentDom();
            mountPrivacyToDock();
        };
        const onDockReady = () => {
            mountPrivacyToDock();
        };
        if (document.body) {
            start();
        } else {
            document.addEventListener("DOMContentLoaded", start);
        }
        window.addEventListener("y1-dock-slot-ready", onDockReady);
        if (typeof global.y1LoadSupportToolbar === "function") {
            void global.y1LoadSupportToolbar().then(onDockReady).catch(function () {});
        }
        let tries = 0;
        const poll = setInterval(function () {
            mountPrivacyToDock();
            const btn = document.getElementById("y1-privacy-settings-btn");
            const dockSlot = document.getElementById("y1-site-dock-privacy-slot");
            const inDock = dockSlot && btn && dockSlot.contains(btn);
            if (inDock || !btn) {
                clearInterval(poll);
                return;
            }
            if (++tries > 40) clearInterval(poll);
        }, 150);
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

    /** External-download themes count visits/clicks to their download page as both a view and a download. */
    function trackExternalDownload(themeKey, source) {
        trackEvent(themeKey, "page_view", source || "gallery");
        trackEvent(themeKey, "zip_download", source || "gallery");
    }

    initConsent();

    global.ThemeAnalytics = {
        normalizeThemeKey,
        loadConsent,
        saveConsent,
        trackPageView,
        trackZipDownload,
        trackDirectInstall,
        trackExternalDownload,
        registerMetricsHost,
        mountMetrics,
        mountMetricsBatch,
        fetchAllStats,
        fetchStatsMap,
        getStats: (themeKey) => statsCache.get(normalizeThemeKey(themeKey)) || emptyStats(),
        syncAllCardStats,
        refreshAll: () => {
            for (const key of metricsHosts.keys()) refreshMetricsHosts(key);
            syncAllCardStats();
        },
        hasApi: () => !!readMetaOrigin(),
    };

    ["y1-consent-changed", "site-locale-ready", "site-locale-change", "y1-locale-change"].forEach((evName) => {
        global.addEventListener(evName, () => {
            for (const key of metricsHosts.keys()) refreshMetricsHosts(key);
        });
    });
})(typeof window !== "undefined" ? window : globalThis);
