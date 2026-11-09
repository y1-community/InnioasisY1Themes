/**
 * Localized Theme metadata loader and updater for Innioasis Themes Gallery.
 * Fetches themes_i18n.json (and optional config_i18n.json) to render
 * descriptions and titles in the visitor's preferred language.
 *
 * Implements lazy loading for theme translations with a globe icon and
 * loading throbber displayed next to names and descriptions while pending.
 */
(function (global) {
    "use strict";

    var i18nData = null;
    var i18nLang = "";
    var loadPromise = null;
    var indexPromise = null;
    var pendingCards = [];

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

    function showBadge(el) {
        if (!el || !el.appendChild) return;
        var lang = baseLang(getActiveLocale());
        if (lang === "en") return;
        ensureBadgeStyles();
        if (el.querySelector(".site-i18n-badge")) return;
        var badge = document.createElement("span");
        badge.className = "site-i18n-badge";
        badge.setAttribute("data-i18n-skip", "");
        badge.setAttribute("translate", "no");
        badge.setAttribute("role", "status");
        badge.setAttribute("aria-label", "Translating");
        badge.innerHTML = BADGE_HTML;
        el.appendChild(badge);
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

    /* One file per language under themes-i18n/. The single themes_i18n.json
       carried every language at once (3 MB), which delayed the gallery for
       everyone and was downloaded even by English visitors. */
    function loadI18nIndex() {
        if (indexPromise) return indexPromise;
        indexPromise = fetch("themes-i18n/index.json", { cache: "default" })
            .then(function (r) { return r.ok ? r.json() : null; })
            .catch(function () { return null; });
        return indexPromise;
    }

    function fetchLocaleDict(lang) {
        return loadI18nIndex().then(function (index) {
            var locales = (index && index.locales) || [];
            if (!locales.length) return {};
            var code = locales.indexOf(lang) >= 0 ? lang : "";
            if (!code) return {};
            var version = index.updated ? "?v=" + encodeURIComponent(index.updated) : "";
            return fetch("themes-i18n/" + code + ".json" + version, { cache: "default" })
                .then(function (r) {
                    if (!r.ok) throw new Error("HTTP " + r.status);
                    return r.json();
                })
                .then(function (dict) { return dict || {}; });
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
            i18nData = dict;
            flushPendingCards();
            return i18nData;
        });
        return loadPromise;
    }

    function getThemeTranslation(folder, defaultName, defaultDesc) {
        var locale = getActiveLocale();
        var lang = baseLang(locale);
        if (lang === "en" || !i18nData || i18nLang !== lang) {
            return { name: defaultName, description: defaultDesc };
        }
        var entry = i18nData[folder] || {};
        return {
            name: entry.name || defaultName,
            description: entry.description || defaultDesc
        };
    }

    function lazyTranslateCard(card) {
        if (!card) return;
        var folder = card.getAttribute("data-catalog-folder");
        if (!folder) return;

        var descEl = card.querySelector(".theme-desc");
        var nameEl = card.querySelector(".theme-name");

        if (!card.dataset.origDesc && descEl) {
            var dClone = descEl.cloneNode(true);
            var b = dClone.querySelector(".site-i18n-badge");
            if (b) b.remove();
            card.dataset.origDesc = dClone.textContent.trim();
        }
        if (!card.dataset.origName && nameEl) {
            var nClone = nameEl.cloneNode(true);
            var b2 = nClone.querySelector(".site-i18n-badge");
            if (b2) b2.remove();
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
            return;
        }

        if (!isReady()) {
            // Still loading dictionary in background: show globe & loading throbber
            if (nameEl && !nameEl.querySelector(".site-i18n-badge")) {
                showBadge(nameEl);
            }
            if (descEl && origDesc && descEl.style.display !== "none" && !descEl.querySelector(".site-i18n-badge")) {
                showBadge(descEl);
            }
            if (pendingCards.indexOf(card) < 0) {
                pendingCards.push(card);
            }
            return;
        }

        // Ready: apply translation and remove throbber
        var trans = getThemeTranslation(folder, origName, origDesc);
        if (nameEl) {
            hideBadge(nameEl);
            if (trans.name) nameEl.textContent = trans.name;
        }
        if (descEl) {
            hideBadge(descEl);
            if (trans.description) descEl.textContent = trans.description;
        }
        card.dataset.i18nTranslated = "1";
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
        var cards = document.querySelectorAll(".theme-card[data-catalog-folder]");
        cards.forEach(function (card) {
            lazyTranslateCard(card);
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
        getActiveLocale: getActiveLocale,
        baseLang: baseLang
    };
})(typeof window !== "undefined" ? window : globalThis);
