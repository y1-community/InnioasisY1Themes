/**
 * Boots the Y1 theme preview on per-folder index.html pages (after inline theme scripts).
 * Expects optional #theme-y1-sim-wrap; uses getFolderFromCurrentPath() and themeFileUrl() from the page.
 */
(function () {
    'use strict';

    function scriptBaseUrl() {
        var cs = document.currentScript;
        if (!cs || !cs.src) return './';
        try {
            return new URL('.', new URL(cs.getAttribute('src'), location.href)).href;
        } catch (e) {
            return './';
        }
    }

    function injectLink(href) {
        if (document.querySelector('link[href="' + href + '"]')) return;
        var l = document.createElement('link');
        l.rel = 'stylesheet';
        l.href = href;
        document.head.appendChild(l);
    }

    function injectScript(src, onload) {
        if (document.querySelector('script[src="' + src + '"]')) {
            if (onload) onload();
            return;
        }
        var s = document.createElement('script');
        s.src = src;
        s.async = false;
        if (onload) s.onload = onload;
        document.head.appendChild(s);
    }

    function mountWhenReady() {
        if (!window.Y1ThemePreview || typeof window.Y1ThemePreview.mount !== 'function') {
            return false;
        }
        var wrap = document.getElementById('theme-y1-sim-wrap');
        if (!wrap) return true;
        var folder =
            typeof getFolderFromCurrentPath === 'function' ? getFolderFromCurrentPath() : '';
        if (!folder) return true;

        var nameEl = document.getElementById('theme-name');
        var authorEl = document.getElementById('theme-author');
        var descEl = document.getElementById('theme-desc');
        var previewMeta = {
            trackTitle: (nameEl && nameEl.textContent ? nameEl.textContent : '').trim(),
            trackArtist: (authorEl && authorEl.textContent
                ? authorEl.textContent.replace(/^by\s+/i, '')
                : ''
            ).trim(),
            trackAlbum: (descEl && descEl.textContent ? descEl.textContent : 'Y1 Theme')
                .trim()
                .slice(0, 96)
        };

        var variantSeg = '';
        var pv = document.getElementById('preview-variation-select');
        if (pv && pv.value) variantSeg = String(pv.value || '').trim();

        wrap.style.display = 'flex';
        void window.Y1ThemePreview.mount(wrap, {
            catalogFolder: folder,
            variantSegment: variantSeg,
            mode: 'full',
            buildFileUrl:
                typeof themeFileUrl === 'function'
                    ? function (cf, rel) {
                          return themeFileUrl(cf, rel);
                      }
                    : undefined,
            previewMeta: previewMeta,
            onReady: function () {
                var shot = document.getElementById('main-screenshot');
                if (shot) shot.style.display = 'none';
                var d = wrap.querySelector && wrap.querySelector('.y1-tp-device--full');
                if (d && typeof d.focus === 'function') {
                    d.focus();
                    setTimeout(function () {
                        d.focus();
                    }, 80);
                }
            },
            onError: function () {
                wrap.style.display = 'none';
                var shot = document.getElementById('main-screenshot');
                if (shot) shot.style.display = '';
            }
        }).catch(function () {
            wrap.style.display = 'none';
            var shot = document.getElementById('main-screenshot');
            if (shot) shot.style.display = '';
        });
        return true;
    }

    function boot() {
        var base = scriptBaseUrl();
        injectLink(base + 'y1-theme-preview.css');
        injectScript(base + 'y1-theme-preview.js', function () {
            var tries = 0;
            (function tick() {
                tries++;
                if (mountWhenReady() || tries > 80) return;
                setTimeout(tick, 50);
            })();
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot);
    } else {
        boot();
    }
})();
