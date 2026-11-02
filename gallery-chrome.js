/**
 * Shared gallery top bar: Themes brand, site switcher, search placeholder, firmware compatibility banner,
 * theme reactivity, and community social buttons (Reddit & Discord).
 */
(function () {
    "use strict";

    /* Dark is the site default; light appearance is disabled until it is properly supported. */
    var SITE_THEMES = ["dark", "high-contrast", "2077"];
    (function applyStoredSiteTheme() {
        var stored = "dark";
        try {
            stored = localStorage.getItem("lumen-theme") || "dark";
        } catch (_) {}
        if (SITE_THEMES.indexOf(stored) < 0) stored = "dark";
        document.documentElement.setAttribute("data-lumen-theme", stored);
        try {
            localStorage.setItem("lumen-theme", stored);
        } catch (_) {}
    })();

    function decorateUrl(href) {
        if (!href) return href;
        try {
            var u = new URL(href, window.location.origin);
            if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
                if (u.hostname === "innioasis.app") {
                    u.protocol = window.location.protocol;
                    u.hostname = window.location.hostname;
                    u.port = "8080";
                }
            }
            return u.toString();
        } catch (_) {}
        return href;
    }

    function ensureChromeStyles() {
        if (document.getElementById("gallery-chrome-styles")) return;
        var style = document.createElement("style");
        style.id = "gallery-chrome-styles";
        style.textContent =
            '.gallery-topbar {' +
            '  position: sticky !important; top: 0 !important; z-index: 1200 !important; display: flex !important; align-items: center !important; justify-content: space-between !important; gap: 12px !important; padding: 8px 16px !important;' +
            '  background: var(--lumen-panel, #12141c) !important; border-bottom: 1px solid var(--lumen-line, rgba(255, 255, 255, 0.12)) !important;' +
            '  backdrop-filter: blur(14px) !important; -webkit-backdrop-filter: blur(14px) !important;' +
            '}' +
            ':root[data-lumen-theme="light"] .gallery-topbar {' +
            '  background: #ffffff !important; border-bottom: 1px solid rgba(0, 0, 0, 0.12) !important; color: #0f172a !important;' +
            '}' +
            ':root[data-lumen-theme="dark"] .gallery-topbar {' +
            '  background: #12141c !important; border-bottom: 1px solid rgba(255, 255, 255, 0.12) !important; color: #f8fafc !important;' +
            '}' +
            ':root[data-lumen-theme="2077"] .gallery-topbar {' +
            '  background: #0d0f1a !important; border-bottom: 2px solid #00f0ff !important; box-shadow: 0 0 15px rgba(0, 240, 255, 0.25) !important; color: #00f0ff !important;' +
            '}' +
            ':root[data-lumen-theme="high-contrast"] .gallery-topbar {' +
            '  background: #000000 !important; border-bottom: 2px solid #ffffff !important; color: #ffffff !important;' +
            '}' +
            '.gallery-brand, .lumen-brand-home { display: inline-flex !important; align-items: center !important; text-decoration: none !important; color: var(--lumen-text, #f8fafc) !important; flex-shrink: 0 !important; white-space: nowrap !important; }' +
            '.gallery-brand-text, .lumen-brand-title { color: var(--lumen-text, #f8fafc) !important; font-size: 1.15rem !important; font-weight: 700 !important; letter-spacing: -0.02em !important; line-height: 1.2 !important; white-space: nowrap !important; word-break: keep-all !important; flex-shrink: 0 !important; }' +
            ':root[data-lumen-theme="light"] .gallery-brand, :root[data-lumen-theme="light"] .gallery-brand-text,' +
            ':root[data-lumen-theme="light"] .lumen-brand-home, :root[data-lumen-theme="light"] .lumen-brand-title { color: #0f172a !important; }' +
            ':root[data-lumen-theme="dark"] .gallery-brand, :root[data-lumen-theme="dark"] .gallery-brand-text,' +
            ':root[data-lumen-theme="dark"] .lumen-brand-home, :root[data-lumen-theme="dark"] .lumen-brand-title { color: #f8fafc !important; }' +
            ':root[data-lumen-theme="2077"] .gallery-brand, :root[data-lumen-theme="2077"] .gallery-brand-text,' +
            ':root[data-lumen-theme="2077"] .lumen-brand-home, :root[data-lumen-theme="2077"] .lumen-brand-title { color: #00f0ff !important; }' +
            ':root[data-lumen-theme="high-contrast"] .gallery-brand, :root[data-lumen-theme="high-contrast"] .gallery-brand-text,' +
            ':root[data-lumen-theme="high-contrast"] .lumen-brand-home, :root[data-lumen-theme="high-contrast"] .lumen-brand-title { color: #ffffff !important; }' +
            '.lumen-brand-switcher-wrap { position: relative; display: inline-flex; align-items: center; flex-shrink: 0 !important; white-space: nowrap !important; }' +
            '.lumen-brand-bar { display: inline-flex; align-items: center; flex-shrink: 0 !important; white-space: nowrap !important; }' +
            '.lumen-site-switcher-toggle { display: inline-flex; align-items: center; justify-content: center; width: 24px; height: 24px; margin-left: 6px; padding: 0; border-radius: 6px; border: 1px solid var(--lumen-line, rgba(255,255,255,0.14)); background: var(--lumen-panel-soft, rgba(255,255,255,0.06)); color: var(--lumen-muted, #94a3b8); cursor: pointer; transition: all 0.15s ease; flex-shrink: 0 !important; }' +
            '.lumen-site-switcher-toggle:hover { background: var(--lumen-accent-wash, rgba(99,102,241,0.15)); color: var(--lumen-paper, #fff); border-color: var(--lumen-accent, #6366f1); }' +
            ':root[data-lumen-theme="light"] .lumen-site-switcher-toggle { background: rgba(0,0,0,0.04); border-color: rgba(0,0,0,0.12); color: #475569; }' +
            ':root[data-lumen-theme="light"] .lumen-site-switcher-toggle:hover { background: rgba(0,0,0,0.08); color: #0f172a; }' +
            ':root[data-lumen-theme="2077"] .lumen-site-switcher-toggle { background: rgba(35,230,224,0.08); border-color: rgba(35,230,224,0.3); color: #23e6e0; }' +
            ':root[data-lumen-theme="2077"] .lumen-site-switcher-toggle:hover { background: rgba(255,30,60,0.18); border-color: #ff1e3c; color: #ff1e3c; }' +
            '.lumen-site-switcher-tray { position: absolute; top: calc(100% + 8px); left: 0; width: 320px; max-width: 90vw; background: var(--lumen-panel, #12141c); border: 1px solid var(--lumen-line-strong, rgba(255,255,255,0.18)); border-radius: 14px; padding: 12px; box-shadow: 0 12px 36px rgba(0,0,0,0.45); z-index: 10002; box-sizing: border-box; }' +
            ':root[data-lumen-theme="light"] .lumen-site-switcher-tray { background: #ffffff; border-color: rgba(0,0,0,0.12); box-shadow: 0 12px 36px rgba(0,0,0,0.15); }' +
            ':root[data-lumen-theme="2077"] .lumen-site-switcher-tray { background: #0c0d14; border-color: rgba(35,230,224,0.45); box-shadow: 0 12px 36px rgba(0,0,0,0.65), 0 0 16px rgba(35,230,224,0.2); }' +
            '.lumen-site-switcher-heading { margin: 0 0 8px 4px; font-size: 0.72rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: var(--lumen-muted, #94a3b8); }' +
            ':root[data-lumen-theme="light"] .lumen-site-switcher-heading { color: #64748b; }' +
            ':root[data-lumen-theme="2077"] .lumen-site-switcher-heading { color: #ff1e3c; }' +
            '.lumen-site-switcher-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 6px; }' +
            '.lumen-site-switcher-item { display: flex; align-items: center; gap: 12px; padding: 8px 10px; border-radius: 9px; text-decoration: none; background: transparent; border: 1px solid transparent; transition: all 0.15s ease; }' +
            '.lumen-site-switcher-item:hover { background: var(--lumen-accent-wash, rgba(99,102,241,0.1)); border-color: var(--lumen-line, rgba(255,255,255,0.1)); }' +
            ':root[data-lumen-theme="light"] .lumen-site-switcher-item:hover { background: rgba(0,0,0,0.04); border-color: rgba(0,0,0,0.08); }' +
            '.lumen-site-switcher-item-icon { display: flex; align-items: center; justify-content: center; flex-shrink: 0; }' +
            '.lumen-site-switcher-item-copy { display: flex; flex-direction: column; gap: 2px; }' +
            '.lumen-site-switcher-item-copy strong { font-size: 0.92rem; font-weight: 700; color: var(--lumen-text, #f8fafc); line-height: 1.2; }' +
            '.lumen-site-switcher-item-copy small { font-size: 0.78rem; color: var(--lumen-muted, #94a3b8); line-height: 1.25; }' +
            ':root[data-lumen-theme="light"] .lumen-site-switcher-item-copy strong { color: #0f172a; }' +
            ':root[data-lumen-theme="light"] .lumen-site-switcher-item-copy small { color: #64748b; }' +
            ':root[data-lumen-theme="2077"] .lumen-site-switcher-item-copy strong { color: #e9f0f5; }' +
            ':root[data-lumen-theme="2077"] .lumen-site-switcher-item-copy small { color: #aab8c8; }' +
            '.lumen-nav-social-btn { display: inline-flex !important; align-items: center !important; justify-content: center !important; width: auto !important; height: auto !important; min-width: 0 !important; min-height: 0 !important; padding: 4px 6px !important; background: transparent !important; border: none !important; box-shadow: none !important; border-radius: 0 !important; text-decoration: none !important; transition: transform 0.15s ease, opacity 0.15s ease, color 0.15s ease !important; flex-shrink: 0 !important; cursor: pointer !important; opacity: 0.88 !important; }' +
            '.lumen-nav-social-btn:hover { opacity: 1 !important; transform: scale(1.15) !important; background: transparent !important; border: none !important; box-shadow: none !important; }' +
            '.lumen-nav-social-btn--reddit { color: #ff4500 !important; }' +
            '.lumen-nav-social-btn--reddit:hover { color: #ff5722 !important; filter: drop-shadow(0 0 6px rgba(255, 69, 0, 0.5)) !important; }' +
            '.lumen-nav-social-btn--discord { color: #5865f2 !important; }' +
            '.lumen-nav-social-btn--discord:hover { color: #7289da !important; filter: drop-shadow(0 0 6px rgba(88, 101, 242, 0.5)) !important; }' +
            '.lumen-nav-social-btn svg { display: block !important; width: 22px !important; height: 22px !important; }' +
            '.gallery-tabs { display: inline-flex !important; align-items: center !important; gap: 6px !important; padding: 0 !important; background: transparent !important; border: none !important; flex-wrap: wrap !important; }' +
            '.gallery-tab { display: inline-flex !important; align-items: center !important; padding: 0.4rem 0.65rem !important; border-radius: 8px !important; color: var(--lumen-muted, #94a3b8) !important; text-decoration: none !important; font-size: 0.88rem !important; font-weight: 600 !important; border: 1px solid transparent !important; transition: all 0.15s ease !important; white-space: nowrap !important; line-height: 1.2 !important; }' +
            '.gallery-tab:hover { color: var(--lumen-text, #f8fafc) !important; background: var(--lumen-panel-soft, rgba(255, 255, 255, 0.06)) !important; }' +
            '.gallery-tab.active { color: var(--lumen-text, #f8fafc) !important; background: var(--lumen-panel-soft, rgba(255, 255, 255, 0.08)) !important; font-weight: 700 !important; }' +
            ':root[data-lumen-theme="light"] .gallery-tabs { background: transparent !important; border: none !important; }' +
            ':root[data-lumen-theme="light"] .gallery-tab { color: #475569 !important; }' +
            ':root[data-lumen-theme="light"] .gallery-tab:hover { color: #0f172a !important; background: rgba(0,0,0,0.04) !important; }' +
            ':root[data-lumen-theme="light"] .gallery-tab.active { color: #0f172a !important; background: rgba(0,0,0,0.06) !important; font-weight: 700 !important; }' +
            ':root[data-lumen-theme="2077"] .gallery-tabs { background: transparent !important; border: none !important; }' +
            ':root[data-lumen-theme="2077"] .gallery-tab { color: #23e6e0 !important; }' +
            ':root[data-lumen-theme="2077"] .gallery-tab:hover { color: #ff1e3c !important; background: rgba(255,30,60,0.1) !important; }' +
            ':root[data-lumen-theme="2077"] .gallery-tab.active { background: rgba(35,230,224,0.12) !important; color: #23e6e0 !important; font-weight: 700 !important; }' +
            '';
        document.head.appendChild(style);
    }

    function buildBrandAndSwitcher() {
        var wrap = document.createElement("div");
        wrap.className = "logo lumen-brand-switcher-wrap";
        wrap.innerHTML =
            '<div class="lumen-brand-bar">' +
            '<a class="gallery-brand lumen-brand-home" href="index.html" title="Innioasis Themes Gallery">' +
            '<span class="lumen-brand-icon lumen-brand-icon--themes" style="display:inline-flex;align-items:center;justify-content:center;width:28px;height:28px;border-radius:8px;background:#141721;border:1px solid rgba(255,255,255,0.14);box-shadow:0 1px 4px rgba(0,0,0,0.3);font-size:16px;line-height:1;margin-right:8px;flex-shrink:0;" aria-hidden="true">🎨</span>' +
            '<span class="gallery-brand-text lumen-brand-title">Themes Gallery</span>' +
            '</a>' +
            '<button type="button" class="lumen-site-switcher-toggle" id="lumen-site-switcher-toggle" aria-expanded="false" aria-controls="lumen-site-switcher-tray" aria-label="Switch Innioasis site" title="Switch site">' +
            '<svg class="lumen-site-switcher-glyph" viewBox="0 0 16 16" width="12" height="12" fill="currentColor" aria-hidden="true"><path d="M4.2 6.2a.75.75 0 0 1 1.06 0L8 8.94l2.74-2.74a.75.75 0 1 1 1.06 1.06l-3.27 3.27a.75.75 0 0 1-1.06 0L4.2 7.26a.75.75 0 0 1 0-1.06z"/></svg>' +
            '</button>' +
            '</div>' +
            '<div class="lumen-site-switcher-tray" id="lumen-site-switcher-tray" hidden role="menu" aria-label="Switch between Updater CE and Firmware Archive">' +
            '<p class="lumen-site-switcher-heading">Innioasis Community Sites</p>' +
            '<ul class="lumen-site-switcher-list">' +
            '<li>' +
            '<a class="lumen-site-switcher-item" href="' + decorateUrl("https://innioasis.app/") + '" data-cross-site-link="1">' +
            '<span class="lumen-site-switcher-item-icon"><span class="lumen-app-icon lumen-app-icon--updater" style="display:inline-flex;align-items:center;justify-content:center;width:28px;height:28px;border-radius:8px;background:#141721;border:1px solid rgba(255,255,255,0.14);box-shadow:0 2px 6px rgba(0,0,0,0.35);overflow:hidden;flex-shrink:0;" aria-hidden="true"><img src="' + decorateUrl("https://innioasis.app/mtkclient/gui/images/icon.png") + '" width="38" height="38" style="width:38px;height:38px;max-width:none;display:block;margin:-5px;" alt="" aria-hidden="true"></span></span>' +
            '<span class="lumen-site-switcher-item-copy"><strong>Updater CE</strong><small>One-click installer for Windows, macOS & Linux</small></span>' +
            '</a>' +
            '</li>' +
            '<li>' +
            '<a class="lumen-site-switcher-item" href="' + decorateUrl("https://innioasis.app/firmware.html") + '" data-cross-site-link="1">' +
            '<span class="lumen-site-switcher-item-icon"><span class="lumen-app-icon lumen-app-icon--firmware" style="display:inline-flex;align-items:center;justify-content:center;width:28px;height:28px;border-radius:8px;background:#141721;border:1px solid rgba(255,255,255,0.14);box-shadow:0 2px 6px rgba(0,0,0,0.35);font-size:16px;line-height:1;flex-shrink:0;" aria-hidden="true">📚</span></span>' +
            '<span class="lumen-site-switcher-item-copy"><strong>Innioasis Firmware Archive</strong><small>Original Software, custom ROMs & guides</small></span>' +
            '</a>' +
            '</li>' +
            '</ul>' +
            '</div>';

        var toggle = wrap.querySelector("#lumen-site-switcher-toggle");
        var tray = wrap.querySelector("#lumen-site-switcher-tray");
        if (toggle && tray) {
            toggle.addEventListener("click", function (e) {
                e.preventDefault();
                e.stopPropagation();
                var open = tray.hidden;
                tray.hidden = !open;
                toggle.setAttribute("aria-expanded", open ? "true" : "false");
            });
            document.addEventListener("click", function (e) {
                if (!tray.hidden && !tray.contains(e.target) && !toggle.contains(e.target)) {
                    tray.hidden = true;
                    toggle.setAttribute("aria-expanded", "false");
                }
            });
            document.addEventListener("keydown", function (e) {
                if (e.key === "Escape" && !tray.hidden) {
                    tray.hidden = true;
                    toggle.setAttribute("aria-expanded", "false");
                }
            });
        }
        return wrap;
    }

    function buildSocialButtons() {
        var div = document.createElement("div");
        div.className = "gallery-social-tools";
        div.style.cssText = "display:inline-flex;align-items:center;gap:6px;flex-shrink:0;";
        div.innerHTML =
            '<a href="https://reddit.com/r/innioasis" target="_blank" rel="noopener noreferrer" class="lumen-nav-social-btn lumen-nav-social-btn--reddit" aria-label="r/innioasis on Reddit" title="Reddit r/innioasis">' +
            '<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" aria-hidden="true"><path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z"/></svg>' +
            '</a>' +
            '<a href="https://discord.gg/zHrT2zrcek" target="_blank" rel="noopener noreferrer" class="lumen-nav-social-btn lumen-nav-social-btn--discord" aria-label="Join our Discord community" title="Discord community">' +
            '<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" aria-hidden="true"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.894.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/></svg>' +
            '</a>';
        return div;
    }

    function ensureThemeSelect(topbar) {
        if (!topbar || topbar.querySelector("#lumen-theme-select")) return;
        var label = document.createElement("label");
        label.className = "lumen-theme-control";
        label.style.cssText = "display:inline-flex;align-items:center;gap:6px;font-size:0.84rem;color:var(--lumen-muted,#94a3b8);flex-shrink:0;";
        label.innerHTML =
            '<span>Theme</span>' +
            '<select id="lumen-theme-select" aria-label="Choose site colour theme" style="min-height:32px;padding:2px 8px;border-radius:6px;border:1px solid var(--lumen-line,rgba(255,255,255,0.15));background:var(--lumen-panel-soft,rgba(255,255,255,0.06));color:var(--lumen-paper,#fff);font:inherit;cursor:pointer;">' +
            '<option value="dark">Dark</option>' +
            '<option value="high-contrast">High contrast</option>' +
            '<option value="2077">2077</option>' +
            '</select>';

        var sel = label.querySelector("select");
        var storedTheme = "dark";
        try {
            storedTheme = localStorage.getItem("lumen-theme") || "dark";
        } catch (_) {}
        if (sel) {
            sel.value = SITE_THEMES.indexOf(storedTheme) >= 0 ? storedTheme : "dark";
            document.documentElement.setAttribute("data-lumen-theme", sel.value);
            sel.addEventListener("change", function () {
                var value = sel.value;
                document.documentElement.setAttribute("data-lumen-theme", value);
                try {
                    localStorage.setItem("lumen-theme", value);
                } catch (_) {}
            });
        }
        return label;
    }

    function normalizeSearchInputs(root) {
        root.querySelectorAll(".topbar-search, #theme-search, #global-theme-search").forEach(function (input) {
            var ph = String(input.getAttribute("placeholder") || "");
            if (!ph || ph === "\uD83D\uDD0D" || ph === "🔍" || /[\u{1F300}-\u{1FAFF}]/u.test(ph)) {
                input.setAttribute("placeholder", "Search themes");
            }
        });
    }

    function ensureCompatibilityBanner(topbar) {
        if (!topbar || !topbar.parentNode) return;
        if (document.getElementById("site-compat-banner")) return;
        var banner = document.createElement("aside");
        banner.id = "site-compat-banner";
        banner.className = "site-compat-banner";
        banner.setAttribute("role", "note");
        banner.setAttribute("aria-label", "Firmware compatibility notice");
        banner.innerHTML =
            '<div class="site-compat-banner__content">' +
            '<i class="fa-solid fa-circle-check site-compat-banner__icon" aria-hidden="true"></i>' +
            '<span class="site-compat-banner__text">' +
            'Themes in this gallery are compatible with <a class="site-compat-banner__link" href="https://innioasis.app/original-software-benefits.html" target="_blank" rel="noopener noreferrer"><strong>Original OS</strong></a>, <a class="site-compat-banner__link" href="https://innioasis.app/better-y-benefits.html" target="_blank" rel="noopener noreferrer"><strong>Better-Y</strong></a>, <a class="site-compat-banner__link" href="https://innioasis.app/solar-benefits.html" target="_blank" rel="noopener noreferrer"><strong>Solar</strong></a>, and <a class="site-compat-banner__link" href="https://innioasis.app/koensayr-benefits.html" target="_blank" rel="noopener noreferrer"><strong>Koensayr</strong></a> custom firmwares - <a class="site-compat-banner__cta" href="https://innioasis.app/guide.html#platform" target="_blank" rel="noopener noreferrer">Available in Updater CE &rarr;</a>' +
            '</span>' +
            '</div>';

        if (topbar.nextSibling) {
            topbar.parentNode.insertBefore(banner, topbar.nextSibling);
        } else {
            topbar.parentNode.appendChild(banner);
        }
    }

    function upgradeTopbar(topbar) {
        if (!topbar || topbar.dataset.galleryChromeReady === "1") return;
        ensureChromeStyles();

        // 1. Brand & Switcher
        var existingBrand = topbar.querySelector(".gallery-brand");
        var brandSwitcher = buildBrandAndSwitcher();
        if (existingBrand) {
            var wrap = existingBrand.closest(".lumen-brand-switcher-wrap");
            if (!wrap) {
                existingBrand.parentNode.replaceChild(brandSwitcher, existingBrand);
            }
        } else {
            topbar.insertBefore(brandSwitcher, topbar.firstChild);
        }

        // 2. Clean up header tabs: keep only Gallery and Upload; firmware/software links live in the footer
        topbar.querySelectorAll(".gallery-tab").forEach(function (t) {
            var txt = (t.textContent || "").trim().toLowerCase();
            if (txt === "editor" || txt === "software updates" || txt === "firmware downloads") {
                t.remove();
            }
        });

        // 3. Social Buttons & Theme Select
        if (!topbar.querySelector(".gallery-social-tools")) {
            var social = buildSocialButtons();
            var searchWrap = topbar.querySelector(".topbar-search-wrap");
            if (searchWrap) {
                topbar.insertBefore(social, searchWrap);
            } else {
                topbar.appendChild(social);
            }
        }

        if (!topbar.querySelector("#lumen-theme-select")) {
            var themeCtrl = ensureThemeSelect(topbar);
            if (themeCtrl) {
                var searchWrap2 = topbar.querySelector(".topbar-search-wrap");
                if (searchWrap2) {
                    topbar.insertBefore(themeCtrl, searchWrap2);
                } else {
                    topbar.appendChild(themeCtrl);
                }
            }
        }

        normalizeSearchInputs(topbar);
        topbar.dataset.galleryChromeReady = "1";
        ensureCompatibilityBanner(topbar);
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
