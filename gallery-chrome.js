/**
 * Shared gallery top bar: Y1 Themes brand + consistent search placeholder.
 */
(function () {
    "use strict";

    const GALLERY_HOME = "https://themes.innioasis.app/index.html";

    function isPlaceholderSlot(el) {
        if (!el) return false;
        if (el.classList && el.classList.contains("gallery-brand")) return false;
        if (el.getAttribute("aria-hidden") === "true") return true;
        if (!el.className && !el.id && el.childElementCount === 0) return true;
        return false;
    }

    function buildBrand() {
        const a = document.createElement("a");
        a.className = "gallery-brand";
        a.href = GALLERY_HOME;
        a.title = "Innioasis Y1 Themes gallery";
        a.innerHTML =
            '<span class="gallery-brand-icon" aria-hidden="true"><i class="fa-solid fa-palette"></i></span>' +
            '<span class="gallery-brand-text">Y1 Themes</span>';
        return a;
    }

    function normalizeSearchInputs(root) {
        root.querySelectorAll(".topbar-search, #theme-search, #global-theme-search").forEach(function (input) {
            const ph = String(input.getAttribute("placeholder") || "");
            if (!ph || ph === "\uD83D\uDD0D" || ph === "🔍" || /[\u{1F300}-\u{1FAFF}]/u.test(ph)) {
                input.setAttribute("placeholder", "Search themes");
            }
        });
    }

    function upgradeTopbar(topbar) {
        if (!topbar || topbar.dataset.galleryChromeReady === "1") return;
        if (!topbar.querySelector(".gallery-brand")) {
            const existing = topbar.querySelector(".gallery-brand");
            if (!existing) {
                const brand = buildBrand();
                const first = topbar.firstElementChild;
                if (isPlaceholderSlot(first)) {
                    topbar.replaceChild(brand, first);
                } else {
                    topbar.insertBefore(brand, topbar.firstChild);
                }
            }
        }
        normalizeSearchInputs(topbar);
        topbar.dataset.galleryChromeReady = "1";
    }

    function init() {
        document.querySelectorAll(".gallery-topbar").forEach(upgradeTopbar);
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();
