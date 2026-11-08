/**
 * Localized Theme metadata loader and updater for Innioasis Themes Gallery.
 * Fetches themes_i18n.json (and optional config_i18n.json) to render
 * descriptions and titles in the visitor's preferred language.
 */
(function (global) {
    "use strict";

    var i18nData = null;
    var loadPromise = null;

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

    function loadThemesI18n() {
        if (i18nData) return Promise.resolve(i18nData);
        if (loadPromise) return loadPromise;

        var candidates = [
            "themes_i18n.json",
            "./themes_i18n.json",
            "/themes_i18n.json",
            "https://themes.innioasis.app/themes_i18n.json"
        ];

        function tryNext(idx) {
            if (idx >= candidates.length) {
                i18nData = {};
                return Promise.resolve(i18nData);
            }
            return fetch(candidates[idx], { cache: "default" })
                .then(function (r) {
                    if (!r.ok) throw new Error("HTTP " + r.status);
                    return r.json();
                })
                .then(function (json) {
                    i18nData = (json && json.locales) ? json.locales : (json || {});
                    return i18nData;
                })
                .catch(function () {
                    return tryNext(idx + 1);
                });
        }

        loadPromise = tryNext(0);
        return loadPromise;
    }

    function getThemeTranslation(folder, defaultName, defaultDesc) {
        var locale = getActiveLocale();
        var lang = baseLang(locale);
        if (lang === "en" || !i18nData) {
            return { name: defaultName, description: defaultDesc };
        }
        var langDict = i18nData[lang] || i18nData[locale] || {};
        var entry = langDict[folder] || {};
        return {
            name: entry.name || defaultName,
            description: entry.description || defaultDesc
        };
    }

    function applyTranslationsToCards() {
        var cards = document.querySelectorAll(".theme-card[data-catalog-folder]");
        var locale = getActiveLocale();
        var lang = baseLang(locale);
        var isEn = lang === "en";

        cards.forEach(function (card) {
            var folder = card.getAttribute("data-catalog-folder");
            if (!folder) return;

            var descEl = card.querySelector(".theme-desc");
            var nameEl = card.querySelector(".theme-name");

            // Remember original English texts if not already remembered
            if (!card.dataset.origDesc && descEl) {
                card.dataset.origDesc = descEl.textContent;
            }
            if (!card.dataset.origName && nameEl) {
                card.dataset.origName = nameEl.textContent;
            }

            var origDesc = card.dataset.origDesc || "";
            var origName = card.dataset.origName || "";

            if (isEn) {
                if (descEl && origDesc) descEl.textContent = origDesc;
                if (nameEl && origName) nameEl.textContent = origName;
                return;
            }

            var trans = getThemeTranslation(folder, origName, origDesc);
            if (descEl && trans.description) {
                descEl.textContent = trans.description;
            }
            if (nameEl && trans.name) {
                nameEl.textContent = trans.name;
            }
        });
    }

    function init() {
        loadThemesI18n().then(function () {
            applyTranslationsToCards();
        });

        if (typeof global.addEventListener === "function") {
            ["site-locale-ready", "site-locale-change", "y1-locale-change"].forEach(function (ev) {
                global.addEventListener(ev, function () {
                    loadThemesI18n().then(function () {
                        applyTranslationsToCards();
                    });
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
        applyToCards: applyTranslationsToCards,
        getActiveLocale: getActiveLocale,
        baseLang: baseLang
    };
})(typeof window !== "undefined" ? window : globalThis);
