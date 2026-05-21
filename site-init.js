/**
 * Shared site shell: body classes + unified bottom dock loader.
 */
(function (global) {
    "use strict";

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
            "https://themes.innioasis.app/support_toolbar.html",
        ];
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
                try {
                    global.dispatchEvent(new CustomEvent("y1-dock-slot-ready"));
                } catch (_) {}
                return;
            } catch (_) {}
        }
    }

    function init() {
        if (document.body) {
            document.body.classList.add("site-themes-app", "site-dock-mode");
        }
        loadSupportToolbar();
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }

    global.y1LoadSupportToolbar = loadSupportToolbar;
})(typeof window !== "undefined" ? window : globalThis);
