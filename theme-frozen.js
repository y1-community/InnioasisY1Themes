/**
 * Frozen themes: themes.json "notice" marks low-quality freeze (Monzo-style ice overlay).
 */
(function (global) {
    const FROZEN_OVERLAY_SRC = './frozen.png';
    const DEFAULT_HEADING = 'Frozen due to low quality';
    const MAINTAINER_LINE = 'Please update your theme in order to keep it in the gallery.';

    function escHtml(value) {
        return String(value || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    function noticeText(theme) {
        const n = theme && theme.notice;
        if (n == null) return '';
        if (typeof n === 'string') return n.trim();
        if (typeof n === 'boolean' && n) return '';
        return String(n).trim();
    }

    function isFrozen(theme) {
        return noticeText(theme).length > 0;
    }

    function freezeHeading() {
        return DEFAULT_HEADING;
    }

    function buildFrozenLayer(theme, options) {
        const opts = options && typeof options === 'object' ? options : {};
        const reason = noticeText(theme) || DEFAULT_HEADING;
        const viewLabel = String(opts.viewAnywayLabel || 'View anyway').trim() || 'View anyway';
        const layer = document.createElement('div');
        layer.className = 'theme-frozen-layer';
        layer.setAttribute('aria-hidden', opts.decorative ? 'true' : 'false');

        const ice = document.createElement('img');
        ice.className = 'theme-frozen-ice';
        ice.src = FROZEN_OVERLAY_SRC;
        ice.alt = '';
        ice.decoding = 'async';
        ice.setAttribute('aria-hidden', 'true');

        const hover = document.createElement('div');
        hover.className = 'theme-frozen-hover';
        hover.innerHTML =
            `<p class="theme-frozen-badge">Frozen</p>` +
            `<p class="theme-frozen-heading">${escHtml(freezeHeading())}</p>` +
            `<p class="theme-frozen-reason">${escHtml(reason)}</p>` +
            `<p class="theme-frozen-maintainer">${escHtml(MAINTAINER_LINE)}</p>` +
            `<button type="button" class="theme-frozen-view-btn">${escHtml(viewLabel)}</button>`;

        const viewBtn = hover.querySelector('.theme-frozen-view-btn');
        if (viewBtn) {
            viewBtn.addEventListener('click', (ev) => {
                ev.preventDefault();
                ev.stopPropagation();
                const host = layer.closest('.theme-preview-frame, .theme-frozen-viewport');
                if (host) {
                    host.classList.add('theme-preview-frame--unfrozen', 'is-frozen-unfrozen');
                }
                if (typeof opts.onViewAnyway === 'function') {
                    opts.onViewAnyway(ev);
                }
            });
        }

        layer.append(ice, hover);
        return layer;
    }

    function bindTouchReveal(host) {
        if (!host || host.dataset.frozenTouchBound === '1') return;
        host.dataset.frozenTouchBound = '1';
        host.addEventListener(
            'touchstart',
            (ev) => {
                if (host.classList.contains('theme-preview-frame--unfrozen')) return;
                if (ev.target.closest('.theme-frozen-view-btn')) return;
                host.classList.toggle('is-frozen-touch-open');
            },
            { passive: true }
        );
    }

    function attachToCardPreview(previewFrame, theme, options) {
        if (!previewFrame || !isFrozen(theme)) return false;
        previewFrame.classList.add('theme-preview-frame--frozen');
        previewFrame.classList.remove('theme-preview-frame--unfrozen');
        const existing = previewFrame.querySelector('.theme-frozen-layer');
        if (existing) existing.remove();
        const layer = buildFrozenLayer(theme, {
            viewAnywayLabel: 'View anyway',
            onViewAnyway: options && options.onViewAnyway,
        });
        previewFrame.appendChild(layer);
        bindTouchReveal(previewFrame);
        return true;
    }

    function attachToViewport(viewportEl, theme, options) {
        if (!viewportEl || !isFrozen(theme)) return false;
        viewportEl.classList.add('theme-frozen-viewport', 'theme-preview-frame--frozen');
        const existing = viewportEl.querySelector('.theme-frozen-layer');
        if (existing) existing.remove();
        const layer = buildFrozenLayer(theme, options || {});
        viewportEl.appendChild(layer);
        bindTouchReveal(viewportEl);
        return true;
    }

    function buildPageNoticeElement(theme) {
        if (!isFrozen(theme)) return null;
        const reason = noticeText(theme);
        const el = document.createElement('div');
        el.className = 'theme-frozen-page-notice';
        el.setAttribute('role', 'status');
        el.innerHTML =
            `<h2><i class="fa-solid fa-snowflake" aria-hidden="true"></i> ${escHtml(freezeHeading())}</h2>` +
            `<p>This theme is frozen in the gallery because it does not meet our quality bar. You can still preview and download it if you want to try it on your Y1.</p>` +
            (reason
                ? `<p class="theme-frozen-author-note">Notice to author: ${escHtml(reason)}</p>`
                : '') +
            `<p class="theme-frozen-author-note">${escHtml(MAINTAINER_LINE)}</p>`;
        return el;
    }

    function applyThemePage(ctx) {
        const c = ctx && typeof ctx === 'object' ? ctx : {};
        const theme = c.theme;
        if (!isFrozen(theme)) return false;

        const noticeHost = c.noticeHostEl;
        if (noticeHost) {
            noticeHost.innerHTML = '';
            const notice = buildPageNoticeElement(theme);
            if (notice) noticeHost.appendChild(notice);
        }

        if (c.downloadBtn && !c.downloadBtn.querySelector('.fa-arrow-up-right-from-square')) {
            c.downloadBtn.innerHTML =
                '<i class="fa-solid fa-download" style="margin-right: 4px;"></i> Download anyway';
        }

        const simWrap = c.simWrapEl;
        if (simWrap && !simWrap.dataset.frozenWrapped) {
            const parent = simWrap.parentElement;
            if (parent && !parent.classList.contains('theme-frozen-viewport')) {
                const wrap = document.createElement('div');
                wrap.className = 'theme-frozen-viewport';
                simWrap.parentNode.insertBefore(wrap, simWrap);
                wrap.appendChild(simWrap);
                attachToViewport(wrap, theme, { viewAnywayLabel: 'Preview anyway' });
                simWrap.dataset.frozenWrapped = '1';
            }
        }

        const screenshot = c.screenshotEl;
        if (screenshot && screenshot.style.display !== 'none') {
            const shotWrap = screenshot.closest('.theme-frozen-viewport') || (() => {
                const w = document.createElement('div');
                w.className = 'theme-frozen-viewport';
                screenshot.parentNode.insertBefore(w, screenshot);
                w.appendChild(screenshot);
                return w;
            })();
            attachToViewport(shotWrap, theme, { viewAnywayLabel: 'Preview anyway' });
        }

        return true;
    }

    function mergeNoticeFromCatalog(catalogTheme, configJson) {
        if (catalogTheme && isFrozen(catalogTheme)) return catalogTheme;
        const g = configJson && configJson.gallery;
        const fromCfg =
            (g && (g.notice || g.freezeNotice)) ||
            (configJson && configJson.theme_info && configJson.theme_info.notice);
        if (!fromCfg || !String(fromCfg).trim()) return catalogTheme;
        return { ...(catalogTheme || {}), notice: String(fromCfg).trim() };
    }

    const api = {
        isFrozen,
        noticeText,
        freezeHeading,
        attachToCardPreview,
        attachToViewport,
        buildPageNoticeElement,
        applyThemePage,
        mergeNoticeFromCatalog,
        MAINTAINER_LINE,
    };

    global.ThemeFrozen = api;
})(typeof window !== 'undefined' ? window : globalThis);
