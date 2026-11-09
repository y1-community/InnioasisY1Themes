/**
 * Localized Theme metadata loader and updater for Innioasis Themes Gallery.
 * Fetches themes_i18n.json (and optional config_i18n.json) to render
 * descriptions and titles in the visitor's preferred language.
 *
 * Curated names and descriptions come from the per-language files. Anything
 * still missing is translated remotely, but only for cards near the viewport,
 * and those strings share one request instead of one request each. The gallery
 * paints immediately in English (or from the local cache) and never inserts a
 * spinner into every card.
 */
(function (global) {
    "use strict";

    var i18nData = null;
    var i18nLang = "";
    var loadPromise = null;
    var indexPromise = null;
    var pendingCards = [];

    var CACHE_PREFIX = "y1-theme-i18n-v2-";
    var memoryCache = {};
    var batchQueue = [];
    var batchInFlight = false;
    var batchTimer = null;
    var cardObserver = null;
    var remoteObserved = typeof WeakSet === "function" ? new WeakSet() : null;
    /* One GET carries many short strings. Stay under typical URL limits and
       keep a single request in flight so the gallery stays responsive. */
    var BATCH_MAX = 24;
    var BATCH_URL = 6000;

    var BADGE_HTML = '<svg class="site-i18n-globe" viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.6 3.7 5.7 3.7 9s-1.2 6.4-3.7 9c-2.5-2.6-3.7-5.7-3.7-9S9.5 5.6 12 3z"/></svg><span class="site-i18n-spinner" aria-hidden="true"></span>';

    function ensureBadgeStyles() {
        if (typeof document === "undefined" || !document.head) return;
        if (document.getElementById("site-i18n-badge-styles")) return;
        var style = document.createElement("style");
        style.id = "site-i18n-badge-styles";
        style.textContent = [
            ".site-i18n-badge{display:inline-flex;align-items:center;gap:4px;",
            "margin-inline-start:6px;vertical-align:middle;color:currentColor;opacity:.68;",
            "font-size:.85em;line-height:1;pointer-events:none;user-select:none;}",
            "html[lang^=\"en\"] .site-i18n-badge,html:not([lang]) .site-i18n-badge,[lang^=\"en\"] .site-i18n-badge,[data-locale^=\"en\"] .site-i18n-badge{display:none!important;}",
            ".site-i18n-globe{flex:none;width:13px;height:13px;}",
            ".site-i18n-spinner{flex:none;width:10px;height:10px;border-radius:50%;",
            "border:1.5px solid currentColor;border-top-color:transparent;box-sizing:border-box;",
            "animation:site-i18n-spin .8s linear infinite;}",
            "@keyframes site-i18n-spin{to{transform:rotate(360deg);}}",
            "@media (prefers-reduced-motion:reduce){.site-i18n-spinner{animation:none;opacity:.6;}}"
        ].join("");
        (document.head || document.documentElement).appendChild(style);
    }

    function showBadge() {
        /* A spinner on every card forces layout for the whole catalogue.
           English (or the cached translation) shows immediately; the toolbar
           is the only translating indicator. */
    }

    function hideBadge(el) {
        if (!el) return;
        var badge = el.querySelector ? el.querySelector(".site-i18n-badge") : null;
        if (badge) badge.remove();
    }

    function getActiveLocale() {
        if (global.InnioasisLocale && global.InnioasisLocale.locale) {
            return global.InnioasisLocale.locale;
        }
        try {
            var stored = localStorage.getItem("innioasis-locale");
            if (stored) return stored;
        } catch (_) {}
        var param = new URL(location.href).searchParams.get("lang");
        if (param) return param;
        return (navigator.language || "en").toLowerCase();
    }

    function baseLang(locale) {
        if (!locale) return "en";
        var clean = String(locale).toLowerCase().trim();
        if (clean.indexOf("zh-tw") === 0 || clean.indexOf("zh-hk") === 0) return "zh-TW";
        if (clean.indexOf("zh") === 0) return "zh-CN";
        if (clean.indexOf("pt-br") === 0 || clean.indexOf("pt-pt") === 0) return "pt";
        return clean.split("-")[0];
    }

    function isReady() {
        var lang = baseLang(getActiveLocale());
        return lang === "en" || (i18nData !== null && i18nLang === lang);
    }

    function getLocalCache(lang) {
        if (!memoryCache[lang]) {
            memoryCache[lang] = {};
            try {
                var stored = localStorage.getItem(CACHE_PREFIX + lang);
                if (stored) {
                    var parsed = JSON.parse(stored);
                    if (parsed && typeof parsed === "object") memoryCache[lang] = parsed;
                }
            } catch (_) {}
        }
        return memoryCache[lang];
    }

    function saveLocalCache(lang) {
        try {
            var data = memoryCache[lang];
            if (data) localStorage.setItem(CACHE_PREFIX + lang, JSON.stringify(data));
        } catch (_) {}
    }

    /* One file per language under themes-i18n/. The single themes_i18n.json
       carried every language at once (3 MB), which delayed the gallery for
       everyone and was downloaded even by English visitors. */
    function loadI18nIndex() {
        if (indexPromise) return indexPromise;
        var ctrl = typeof AbortController === "function" ? new AbortController() : null;
        var timer = ctrl ? setTimeout(function () { ctrl.abort(); }, 3500) : null;
        indexPromise = fetch("themes-i18n/index.json", { cache: "default", signal: ctrl ? ctrl.signal : undefined })
            .then(function (r) { if (timer) clearTimeout(timer); return r.ok ? r.json() : null; })
            .catch(function () { if (timer) clearTimeout(timer); return null; });
        return indexPromise;
    }

    function fetchLocaleDict(lang) {
        return loadI18nIndex().then(function (index) {
            var locales = (index && index.locales) || [];
            if (!locales.length) return {};
            var code = locales.indexOf(lang) >= 0 ? lang : "";
            if (!code) return {};
            var version = index.updated ? "?v=" + encodeURIComponent(index.updated) : "";
            var ctrl = typeof AbortController === "function" ? new AbortController() : null;
            var timer = ctrl ? setTimeout(function () { ctrl.abort(); }, 4000) : null;
            return fetch("themes-i18n/" + code + ".json" + version, { cache: "default", signal: ctrl ? ctrl.signal : undefined })
                .then(function (r) {
                    if (timer) clearTimeout(timer);
                    if (!r.ok) throw new Error("HTTP " + r.status);
                    return r.json();
                })
                .then(function (dict) { return dict || {}; })
                .catch(function () { if (timer) clearTimeout(timer); return {}; });
        }).catch(function () { return {}; });
    }

    function loadThemesI18n() {
        var lang = baseLang(getActiveLocale());
        if (lang === "en") {
            i18nData = {};
            i18nLang = "en";
            flushPendingCards();
            return Promise.resolve(i18nData);
        }
        if (i18nLang === lang && loadPromise) return loadPromise;
        i18nLang = lang;
        loadPromise = fetchLocaleDict(lang).then(function (dict) {
            i18nData = dict || {};
            flushPendingCards();
            return i18nData;
        }).catch(function () {
            i18nData = {};
            flushPendingCards();
            return i18nData;
        });
        return loadPromise;
    }

    function getThemeTranslation(folder, defaultName, defaultDesc) {
        var locale = getActiveLocale();
        var lang = baseLang(locale);
        if (lang === "en") {
            return { name: defaultName, description: defaultDesc };
        }
        var cache = getLocalCache(lang);
        var cached = cache[folder];
        var dict = (i18nData && i18nLang === lang) ? i18nData[folder] : null;
        return {
            name: (cached && cached.name) || (dict && dict.name) || defaultName,
            description: (cached && cached.description) || (dict && dict.description) || defaultDesc
        };
    }

    /* clients5 returns one entry per repeated `q`. A joined blob with a
       delimiter cannot be split reliably once the provider translates the
       delimiter, so a batch is only accepted when the result lines up. */
    function parseClients5List(data, count) {
        if (count === 1) {
            if (typeof data === "string" && data.trim()) return [data.trim()];
            if (Array.isArray(data) && typeof data[0] === "string") return [String(data[0]).trim()];
            if (Array.isArray(data) && Array.isArray(data[0]) && data[0][0]) return [String(data[0][0]).trim()];
        }
        if (!Array.isArray(data) || data.length !== count) return null;
        var out = [];
        if (typeof data[0] === "string") {
            for (var i = 0; i < data.length; i += 1) out.push(String(data[i] || "").trim());
            return out;
        }
        if (Array.isArray(data[0])) {
            for (var j = 0; j < data.length; j += 1) {
                var row = data[j];
                var cell = Array.isArray(row) ? row[0] : "";
                out.push(cell ? String(cell).trim() : "");
            }
            return out;
        }
        return null;
    }

    function parseGtxList(data, count) {
        var segments = data && data[0];
        if (!Array.isArray(segments) || segments.length !== count) return null;
        var out = [];
        for (var i = 0; i < segments.length; i += 1) {
            out.push(segments[i] && segments[i][0] ? String(segments[i][0]).trim() : "");
        }
        return out;
    }

    function fetchJson(url, timeoutMs) {
        var ctrl = typeof AbortController === "function" ? new AbortController() : null;
        var timer = ctrl ? setTimeout(function () { ctrl.abort(); }, timeoutMs || 8000) : null;
        return fetch(url, { method: "GET", mode: "cors", signal: ctrl ? ctrl.signal : undefined })
            .then(function (response) {
                if (timer) clearTimeout(timer);
                if (!response.ok) throw new Error("HTTP " + response.status);
                return response.json();
            })
            .catch(function (error) {
                if (timer) clearTimeout(timer);
                throw error;
            });
    }

    /* Several missing names and descriptions travel as repeated `q` parameters
       on one GET. The URL budget keeps long descriptions from blowing the
       request; they go out in the next batch instead of alone-by-default. */
    function requestRemoteBatch(texts, targetLang) {
        if (!texts || !texts.length) return Promise.resolve([]);
        var query = texts.map(function (text) {
            return "q=" + encodeURIComponent(text);
        }).join("&");
        var clients5Url = "https://clients5.google.com/translate_a/t?client=dict-chrome-ex&sl=en&tl=" +
            encodeURIComponent(targetLang) + "&" + query;
        var gtxUrl = "https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=" +
            encodeURIComponent(targetLang) + "&dt=t&" + query;
        function aligned(list) {
            return list && list.length === texts.length;
        }
        return fetchJson(clients5Url, 8000).then(function (data) {
            var list = parseClients5List(data, texts.length);
            if (aligned(list)) return list;
            var missed = new Error("unaligned");
            missed.align = true;
            throw missed;
        }).catch(function () {
            return fetchJson(gtxUrl, 8000).then(function (data) {
                var list = parseGtxList(data, texts.length);
                if (aligned(list)) return list;
                var missed = new Error("unaligned");
                missed.align = true;
                throw missed;
            });
        });
    }

    function takeThemeBatch() {
        var batch = [];
        var itemMap = [];
        var texts = [];
        var urlLen = 96;
        while (batchQueue.length && batch.length < BATCH_MAX) {
            var item = batchQueue[0];
            var pending = [];
            if (item.needName && item.origName) pending.push({ type: "name", text: item.origName });
            if (item.needDesc && item.origDesc) pending.push({ type: "desc", text: item.origDesc });
            var add = 0;
            for (var i = 0; i < pending.length; i += 1) add += encodeURIComponent(pending[i].text).length + 3;
            if (batch.length && (texts.length + pending.length > BATCH_MAX || urlLen + add > BATCH_URL)) break;
            batchQueue.shift();
            batch.push(item);
            urlLen += add;
            for (var j = 0; j < pending.length; j += 1) {
                texts.push(pending[j].text);
                itemMap.push({ item: item, type: pending[j].type });
            }
            if (!batch.length) break;
            if (urlLen > BATCH_URL) break;
        }
        return { batch: batch, texts: texts, itemMap: itemMap };
    }

    function applyThemeBatch(itemMap, results, lang) {
        var cache = getLocalCache(lang);
        var updatedCache = false;
        for (var i = 0; i < itemMap.length; i += 1) {
            var mapping = itemMap[i];
            var trans = (results && results[i]) || "";
            var it = mapping.item;
            if (!cache[it.folder]) cache[it.folder] = {};
            if (mapping.type === "name") {
                hideBadge(it.nameEl);
                if (trans && trans !== it.origName && it.nameEl) {
                    it.nameEl.textContent = trans;
                    cache[it.folder].name = trans;
                    updatedCache = true;
                }
            } else if (mapping.type === "desc") {
                hideBadge(it.descEl);
                if (trans && trans !== it.origDesc && it.descEl) {
                    it.descEl.textContent = trans;
                    cache[it.folder].description = trans;
                    updatedCache = true;
                }
            }
        }
        if (updatedCache) saveLocalCache(lang);
    }

    function finishThemeCards(batch) {
        batch.forEach(function (it) {
            if (it.nameEl) hideBadge(it.nameEl);
            if (it.descEl) hideBadge(it.descEl);
            if (!it.needName && !it.needDesc) it.card.dataset.i18nTranslated = "1";
        });
    }

    function requeueThemeHalves(itemMap) {
        var seen = [];
        itemMap.forEach(function (mapping) {
            if (seen.indexOf(mapping.item) < 0) seen.push(mapping.item);
        });
        if (seen.length < 2) {
            finishThemeCards(seen);
            return;
        }
        var mid = Math.ceil(seen.length / 2);
        var right = seen.slice(mid);
        var left = seen.slice(0, mid);
        for (var i = right.length - 1; i >= 0; i -= 1) batchQueue.unshift(right[i]);
        for (var j = left.length - 1; j >= 0; j -= 1) batchQueue.unshift(left[j]);
    }

    function scheduleThemeDrain() {
        if (batchInFlight || batchTimer || !batchQueue.length) return;
        var run = function () {
            batchTimer = null;
            drainBatchQueue();
        };
        if (typeof global.requestIdleCallback === "function") {
            batchTimer = global.requestIdleCallback(run, { timeout: 180 });
        } else {
            batchTimer = setTimeout(run, 32);
        }
    }

    function drainBatchQueue() {
        if (batchInFlight || !batchQueue.length) return;
        var lang = baseLang(getActiveLocale());
        if (lang === "en") {
            batchQueue = [];
            return;
        }

        var taken = takeThemeBatch();
        if (!taken.texts.length) {
            finishThemeCards(taken.batch);
            if (batchQueue.length) scheduleThemeDrain();
            return;
        }
        batchInFlight = true;

        requestRemoteBatch(taken.texts, lang).then(function (results) {
            applyThemeBatch(taken.itemMap, results, lang);
            taken.batch.forEach(function (it) {
                it.needName = false;
                it.needDesc = false;
            });
            finishThemeCards(taken.batch);
        }).catch(function (error) {
            if (error && error.align) requeueThemeHalves(taken.itemMap);
            else finishThemeCards(taken.batch);
        }).then(function () {
            batchInFlight = false;
            if (batchQueue.length) scheduleThemeDrain();
        });
    }

    function scheduleBatchDrain() {
        scheduleThemeDrain();
    }

    function ensureCardObserver() {
        if (cardObserver || typeof IntersectionObserver !== "function") return;
        cardObserver = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (!entry.isIntersecting) return;
                cardObserver.unobserve(entry.target);
                if (!isReady()) {
                    if (pendingCards.indexOf(entry.target) < 0) pendingCards.push(entry.target);
                    return;
                }
                var job = paintCard(entry.target);
                if (job) queueCard(job);
            });
        }, { root: null, rootMargin: "240px 0px", threshold: 0 });
    }

    function watchCard(card) {
        if (!card) return;
        if (remoteObserved && remoteObserved.has(card)) return;
        if (remoteObserved) remoteObserved.add(card);
        ensureCardObserver();
        if (cardObserver) cardObserver.observe(card);
        else {
            var job = paintCard(card);
            if (job) queueCard(job);
        }
    }

    function queueCard(job) {
        if (!job) return;
        if (!isReady()) {
            if (pendingCards.indexOf(job.card) < 0) pendingCards.push(job.card);
            return;
        }
        var alreadyQueued = batchQueue.some(function (queued) { return queued.card === job.card; });
        if (alreadyQueued) return;
        batchQueue.push(job);
        scheduleThemeDrain();
    }

    function paintCard(card) {
        if (!card) return null;
        var folder = card.getAttribute("data-catalog-folder");
        if (!folder) return null;

        var descEl = card.querySelector(".theme-desc");
        var nameEl = card.querySelector(".theme-name");

        if (!card.dataset.origDesc && descEl) {
            var dClone = descEl.cloneNode(true);
            var badge = dClone.querySelector(".site-i18n-badge");
            if (badge) badge.remove();
            card.dataset.origDesc = dClone.textContent.trim();
        }
        if (!card.dataset.origName && nameEl) {
            var nClone = nameEl.cloneNode(true);
            var nameBadge = nClone.querySelector(".site-i18n-badge");
            if (nameBadge) nameBadge.remove();
            card.dataset.origName = nClone.textContent.trim();
        }

        var origDesc = card.dataset.origDesc || "";
        var origName = card.dataset.origName || "";
        var lang = baseLang(getActiveLocale());

        if (lang === "en") {
            if (nameEl) {
                hideBadge(nameEl);
                if (origName) nameEl.textContent = origName;
            }
            if (descEl) {
                hideBadge(descEl);
                if (origDesc) descEl.textContent = origDesc;
            }
            return null;
        }

        var cache = getLocalCache(lang);
        var cached = cache[folder] || {};
        var dict = (i18nData && i18nLang === lang) ? i18nData[folder] : null;
        var translatedName = cached.name || (dict && dict.name) || "";
        var translatedDesc = cached.description || (dict && dict.description) || "";

        if (translatedName && nameEl) {
            hideBadge(nameEl);
            nameEl.textContent = translatedName;
        }
        if (translatedDesc && descEl) {
            hideBadge(descEl);
            descEl.textContent = translatedDesc;
        }

        var needName = !translatedName && !!origName;
        var needDesc = !translatedDesc && !!origDesc && descEl && descEl.style.display !== "none";
        if (!needName && !needDesc) {
            if (nameEl) hideBadge(nameEl);
            if (descEl) hideBadge(descEl);
            card.dataset.i18nTranslated = "1";
            return null;
        }
        return {
            card: card,
            folder: folder,
            nameEl: nameEl,
            descEl: descEl,
            origName: origName,
            origDesc: origDesc,
            needName: needName,
            needDesc: needDesc
        };
    }

    function lazyTranslateCard(card) {
        /* The gallery calls this when a card scrolls into view, so the remote
           request is for that card, not for the rest of the catalogue. */
        var job = paintCard(card);
        if (!job) return;
        if (!isReady()) {
            if (pendingCards.indexOf(card) < 0) pendingCards.push(card);
            return;
        }
        queueCard(job);
    }

    function flushPendingCards() {
        if (!pendingCards.length) return;
        var list = pendingCards.slice();
        pendingCards = [];
        list.forEach(function (card) {
            lazyTranslateCard(card);
        });
    }

    function applyTranslationsToCards() {
        /* Paint every card from the curated file and the local cache. Remote
           translation waits until a card is near the viewport, so opening the
           gallery in another language does not fire one request per theme. */
        var cards = document.querySelectorAll(".theme-card[data-catalog-folder]");
        Array.prototype.forEach.call(cards, function (card) {
            var job = paintCard(card);
            if (job) watchCard(card);
        });
    }

    function init() {
        ensureBadgeStyles();
        var lang = baseLang(getActiveLocale());
        if (lang !== "en") {
            loadThemesI18n();
        }

        if (typeof global.addEventListener === "function") {
            ["site-locale-ready", "site-locale-change", "y1-locale-change"].forEach(function (ev) {
                global.addEventListener(ev, function () {
                    var curLang = baseLang(getActiveLocale());
                    if (curLang === "en") {
                        applyTranslationsToCards();
                    } else {
                        applyTranslationsToCards();
                        loadThemesI18n().then(function () {
                            applyTranslationsToCards();
                        });
                    }
                });
            });
        }
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }

    global.Y1ThemesI18n = {
        load: loadThemesI18n,
        get: getThemeTranslation,
        isReady: isReady,
        showBadge: showBadge,
        hideBadge: hideBadge,
        lazyTranslateCard: lazyTranslateCard,
        applyToCards: applyTranslationsToCards,
        parseBatch: parseClients5List,
        getActiveLocale: getActiveLocale,
        baseLang: baseLang
    };
})(typeof window !== "undefined" ? window : globalThis);
