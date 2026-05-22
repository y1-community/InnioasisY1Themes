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
                const host = layer.closest(
                    '.theme-preview-frame, .y1-tp-viewport, .theme-frozen-viewport'
                );
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

    function removeFrozenLayer(host) {
        if (!host) return;
        host.querySelectorAll(':scope > .theme-frozen-layer').forEach((el) => el.remove());
        host.classList.remove(
            'theme-preview-frame--frozen',
            'theme-frozen-viewport',
            'theme-frozen-viewport-target'
        );
    }

    /** Undo legacy theme-page wrapper that caused a second empty 4:3 box. */
    function unwrapLegacyFrozenShell(simWrapEl) {
        if (!simWrapEl) return;
        const legacyWrap = simWrapEl.closest('.theme-frozen-viewport');
        if (legacyWrap && legacyWrap.classList.contains('theme-frozen-viewport') && legacyWrap.contains(simWrapEl)) {
            const parent = legacyWrap.parentNode;
            if (parent) {
                parent.insertBefore(simWrapEl, legacyWrap);
                legacyWrap.remove();
            }
        }
        delete simWrapEl.dataset.frozenWrapped;
    }

    function attachFrozenOverlay(host, theme, options) {
        if (!host || !isFrozen(theme)) return false;
        removeFrozenLayer(host);
        host.classList.add('theme-preview-frame--frozen', 'theme-frozen-viewport-target');
        if (!host.style.position || host.style.position === 'static') {
            host.style.position = 'relative';
        }
        const layer = buildFrozenLayer(theme, options || {});
        host.appendChild(layer);
        bindTouchReveal(host);
        return true;
    }

    function attachToCardPreview(previewFrame, theme, options) {
        if (!previewFrame || !isFrozen(theme)) return false;
        previewFrame.classList.remove('theme-preview-frame--unfrozen');
        return attachFrozenOverlay(previewFrame, theme, {
            viewAnywayLabel: 'View anyway',
            onViewAnyway: options && options.onViewAnyway,
        });
    }

    /**
     * Ice overlay on the Y1 simulator LCD (4:3 .y1-tp-viewport) — theme detail page.
     */
    function attachToSimulator(simWrapEl, theme, options) {
        if (!simWrapEl || !isFrozen(theme)) return false;
        unwrapLegacyFrozenShell(simWrapEl);
        const viewport = simWrapEl.querySelector('.y1-tp-viewport');
        if (!viewport) return false;
        viewport.classList.remove('theme-preview-frame--unfrozen');
        return attachFrozenOverlay(viewport, theme, {
            viewAnywayLabel: 'Preview anyway',
            onViewAnyway: options && options.onViewAnyway,
        });
    }

    /**
     * Prefer simulator viewport on gallery cards once lazy preview has mounted.
     */
    function attachToGalleryPreview(cardEl, theme, options) {
        if (!cardEl || !isFrozen(theme)) return false;
        const host = cardEl.querySelector('.y1-theme-preview-host');
        const viewport = host && host.querySelector('.y1-tp-viewport');
        if (viewport) {
            return attachFrozenOverlay(viewport, theme, {
                viewAnywayLabel: 'View anyway',
                onViewAnyway: options && options.onViewAnyway,
            });
        }
        const previewFrame = cardEl.querySelector('.theme-preview-frame');
        if (previewFrame) {
            return attachToCardPreview(previewFrame, theme, options);
        }
        return false;
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

        const simWrap = c.simWrapEl;
        if (simWrap) unwrapLegacyFrozenShell(simWrap);

        const screenshot = c.screenshotEl;
        if (screenshot) {
            screenshot.classList.remove('theme-frozen-viewport', 'theme-preview-frame--frozen');
            const shotWrap = screenshot.closest('.theme-frozen-viewport');
            if (shotWrap && !shotWrap.querySelector('.y1-tp-viewport')) {
                const parent = shotWrap.parentNode;
                if (parent && shotWrap.contains(screenshot)) {
                    parent.insertBefore(screenshot, shotWrap);
                    shotWrap.remove();
                }
            }
            removeFrozenLayer(screenshot);
            screenshot.style.display = 'none';
        }

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
        attachToSimulator,
        attachToGalleryPreview,
        buildPageNoticeElement,
        applyThemePage,
        mergeNoticeFromCatalog,
        MAINTAINER_LINE,
    };

    global.ThemeFrozen = api;
})(typeof window !== 'undefined' ? window : globalThis);
