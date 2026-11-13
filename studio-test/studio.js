/**
 * Local-only Studio shell.
 *
 * Preview is the real Y1 simulator. A gallery theme is loaded from the catalog;
 * a local ZIP/folder becomes a spec plus object URLs so the same simulator can
 * render it before anything is submitted.
 */
(function () {
    'use strict';

    var DEFAULT_THEME = 'Persona5';
    var UPLOAD_ORIGIN = 'https://y1-theme-upload.itsryanspecter.workers.dev';

    function byId(id) {
        return document.getElementById(id);
    }

    function each(list, fn) {
        Array.prototype.forEach.call(list || [], fn);
    }

    function cloneJson(value) {
        return value == null ? value : JSON.parse(JSON.stringify(value));
    }

    function readPath(object, path) {
        var parts = String(path || '').split('.');
        var node = object;
        for (var i = 0; i < parts.length; i += 1) {
            if (!node || typeof node !== 'object') return undefined;
            node = node[parts[i]];
        }
        return node;
    }

    function writePath(object, path, value) {
        var parts = String(path || '').split('.');
        var node = object;
        for (var i = 0; i < parts.length - 1; i += 1) {
            if (!node[parts[i]] || typeof node[parts[i]] !== 'object') node[parts[i]] = {};
            node = node[parts[i]];
        }
        node[parts[parts.length - 1]] = value;
    }

    function deletePath(object, path) {
        var parts = String(path || '').split('.');
        var node = object;
        for (var i = 0; i < parts.length - 1; i += 1) {
            if (!node || typeof node !== 'object') return;
            node = node[parts[i]];
        }
        if (node && typeof node === 'object') delete node[parts[parts.length - 1]];
    }

    function safeStem(value) {
        var stem = String(value || '')
            .replace(/[\\/:*?"<>|]+/g, ' ')
            .replace(/\s+/g, ' ')
            .trim()
            .slice(0, 96);
        return stem || 'theme';
    }

    function fileName(path) {
        return String(path || '').replace(/\\/g, '/').split('/').filter(Boolean).pop() || '';
    }

    var el = {
        previewArea: byId('studio-preview-area'),
        preview: byId('studio-preview'),
        previewLoading: byId('studio-preview-loading'),
        loadingLabel: byId('studio-loading-label'),
        empty: byId('studio-empty'),
        emptyTitle: byId('studio-empty-title'),
        emptyText: byId('studio-empty-text'),
        title: byId('studio-title'),
        byline: byId('studio-byline'),
        sourceLabel: byId('studio-source-label'),
        sourceDetail: byId('studio-source-detail'),
        sourceChip: byId('studio-source-chip'),
        sourceName: byId('studio-source-name'),
        sourceAuthor: byId('studio-source-author'),
        sourceDesc: byId('studio-source-desc'),
        cover: byId('studio-cover'),
        coverWrap: byId('studio-cover-wrap'),
        submitCover: byId('studio-submit-cover'),
        submitCoverWrap: byId('studio-submit-cover-wrap'),
        packageName: byId('studio-package-name'),
        packageSource: byId('studio-package-source'),
        themeFilter: byId('studio-theme-filter'),
        themeSelect: byId('studio-theme-select'),
        themeCount: byId('studio-theme-count'),
        palette: byId('studio-palette'),
        font: byId('studio-font'),
        screens: byId('studio-screens'),
        submitTitle: byId('studio-submit-title'),
        submitAuthor: byId('studio-submit-author'),
        submitDesc: byId('studio-submit-desc'),
        checklist: byId('studio-checklist'),
        submitBtn: byId('studio-submit-btn'),
        panelScroll: byId('studio-panel-scroll'),
        drop: byId('studio-drop'),
        toast: byId('studio-toast'),
        zipInput: byId('studio-zip-input'),
        folderInput: byId('studio-folder-input'),
        startEdit: byId('studio-start-edit'),
        editBack: byId('studio-edit-back'),
        editSubmit: byId('studio-edit-submit'),
        openZip: byId('studio-open-zip'),
        openFolder: byId('studio-open-folder'),
        appearance: byId('lumen-theme-select'),
        assetInput: byId('studio-asset-input'),
        assetList: byId('studio-asset-list'),
        assetEmpty: byId('studio-asset-empty'),
        assetCountAll: byId('studio-asset-count-all'),
        assetCountMissing: byId('studio-asset-count-missing'),
        assetCountChanged: byId('studio-asset-count-changed'),
        assetDetail: byId('studio-asset-detail'),
        assetSection: byId('studio-asset-section'),
        assetName: byId('studio-asset-name'),
        assetPath: byId('studio-asset-path'),
        assetStatus: byId('studio-asset-status'),
        assetPreview: byId('studio-asset-detail-preview'),
        assetReplace: byId('studio-asset-replace'),
        assetPaste: byId('studio-asset-paste'),
        assetReset: byId('studio-asset-reset'),
        assetHint: byId('studio-asset-hint'),
        colorEditor: byId('studio-color-editor'),
        browseFont: byId('studio-browse-font'),
        resetAssets: byId('studio-reset-assets'),
        save: byId('studio-save'),
        saveProgress: byId('studio-save-progress'),
        saveProgressLabel: byId('studio-save-progress-label'),
        saveProgressValue: byId('studio-save-progress-value'),
        saveProgressBar: byId('studio-save-progress-bar'),
        submitForm: byId('studio-submit-form'),
        submitAuthorUrl: byId('studio-submit-author-url'),
        submitExternal: byId('studio-submit-external'),
        submitExternalWrap: byId('studio-submit-external-wrap'),
        submitExternalUrl: byId('studio-submit-external-url'),
        submitStatus: byId('studio-submit-status'),
        updateNotice: byId('studio-update-notice'),
        updateFolder: byId('studio-update-folder'),
        editAck: byId('studio-edit-ack'),
        submitOwn: byId('studio-submit-own'),
        ownCheckTarget: byId('studio-own-check-target'),
        ownNote: byId('studio-own-update-note'),
        ownModal: byId('studio-own-modal'),
        ownModalAck: byId('studio-own-modal-ack'),
        ownModalConfirm: byId('studio-own-modal-confirm'),
        ownModalCancel: byId('studio-own-modal-cancel'),
        ownModalTheme: byId('studio-own-modal-theme'),
        policyBanner: byId('studio-policy-banner'),
        authorOptions: byId('studio-author-options'),
        submitOpenZip: byId('studio-submit-open-zip'),
        submitOpenFolder: byId('studio-submit-open-folder'),
        swap: byId('studio-swap'),
        swapPanel: byId('studio-swap-panel'),
        unsaved: byId('studio-unsaved'),
        commandContext: byId('studio-command-context')
    };

    var state = {
        mode: 'preview',
        sourceType: null,
        folder: null,
        meta: null,
        config: null,
        configBase: null,
        objectUrls: [],
        localMap: null,
        localFiles: [],
        localFileMap: Object.create(null),
        assets: [],
        assetById: Object.create(null),
        selectedAssetId: null,
        assetFilter: 'all',
        assetOverrides: Object.create(null),
        assetUrls: [],
        pendingAssetId: null,
        gallery: [],
        byFolder: Object.create(null),
        previewOk: false,
        loading: false,
        formDirty: false,
        busy: false,
        baseCover: '',
        pendingPolicy: null,
        ownUpdate: false,
        dirty: false,
        hoverAssetId: null,
        assetDragY: 0,
        assetScrollTimer: null,
        colorPreviewTimer: null,
        swapOpen: false,
        compactExpanded: false
    };

    var filterTimer = null;
    var toastTimer = null;
    var saveProgressTimer = null;
    var dragDepth = 0;
    var bootModeRequest = null;
    var saveTarget = { kind: 'device', label: 'Save to device' };
    var saveTargetTimer = null;

    /* —— Save target wording —— */

    function detectSaveTarget(nav, screenLike) {
        nav = nav || {};
        screenLike = screenLike || {};
        var ua = String(nav.userAgent || '').toLowerCase();
        var platform = String(nav.platform || '').toLowerCase();
        var uad = nav.userAgentData || {};
        var uadPlatform = String(uad.platform || '').toLowerCase();
        var touch = Math.max(Number(nav.maxTouchPoints || 0), Number(nav.msMaxTouchPoints || 0)) > 1;
        var width = Number(screenLike.width) || (typeof window !== 'undefined' ? window.innerWidth : 1024) || 1024;
        var height = Number(screenLike.height) || (typeof window !== 'undefined' ? window.innerHeight : 768) || 768;
        var minSide = Math.min(width, height);
        var maxSide = Math.max(width, height);

        function target(kind, label) {
            return { kind: kind, label: label };
        }

        if (
            /smart-tv|smarttv|googletv|appletv|hbbtv|tizen|webos|netcast|viera|bravia|roku|firetv|aft[bsm]|crkey|playstation|xbox|nintendo/.test(ua) ||
            uadPlatform === 'tv'
        ) {
            return target('tv', 'Save to TV');
        }
        if (/windows phone/.test(ua)) return target('phone', 'Save to Phone');

        var isIPad =
            /ipad/.test(ua) ||
            (/iphone|ipad|ipod/.test(ua) && touch && /macintosh|mac os x/.test(ua)) ||
            (uadPlatform === 'macos' && touch);
        if (isIPad) return target('ipad', 'Save to iPad');
        if (/iphone|ipod/.test(ua) || uadPlatform === 'ios') return target('iphone', 'Save to iPhone');

        if (/android/.test(ua) || uadPlatform === 'android') {
            var androidMobile = /mobile/.test(ua) || uad.mobile === true;
            if (!androidMobile && (minSide >= 600 || maxSide >= 900)) {
                return target('android-tablet', 'Save to Tablet');
            }
            return target('android-phone', 'Save to Phone');
        }

        if (/cros/.test(ua) || uadPlatform === 'chrome os') return target('chromebook', 'Save to Chromebook');
        if (/windows/.test(ua) || uadPlatform === 'windows') return target('windows', 'Save to Windows PC');
        if (/macintosh|mac os x/.test(ua) || uadPlatform === 'macos') return target('mac', 'Save to Mac');
        if (/linux|x11/.test(ua) || uadPlatform === 'linux') return target('linux', 'Save to Linux PC');
        if (touch && minSide >= 600) return target('tablet', 'Save to Tablet');
        if (touch || /mobile/.test(ua)) return target('phone', 'Save to Phone');
        return target('device', 'Save to device');
    }

    function refreshSaveTarget() {
        saveTarget = detectSaveTarget(navigator, typeof screen !== 'undefined' ? screen : null);
        if (el.save) {
            var label = el.save.querySelector('span');
            if (label && !state.busy) label.textContent = saveTarget.label;
            el.save.setAttribute('aria-label', saveTarget.label + ' as a ZIP');
            el.save.setAttribute('title', saveTarget.label + ' as a ZIP');
            el.save.setAttribute('data-save-target', saveTarget.kind);
        }
        window.StudioSaveTarget = {
            current: { kind: saveTarget.kind, label: saveTarget.label },
            detect: detectSaveTarget
        };
    }

    function watchSaveTarget() {
        refreshSaveTarget();
        function queueRefresh() {
            if (saveTargetTimer) window.clearTimeout(saveTargetTimer);
            saveTargetTimer = window.setTimeout(refreshSaveTarget, 120);
        }
        window.addEventListener('resize', queueRefresh, { passive: true });
        window.addEventListener('orientationchange', queueRefresh);
        if (window.visualViewport) window.visualViewport.addEventListener('resize', queueRefresh, { passive: true });
    }

    /* —— Boot and navigation —— */

    function boot() {
        bindEvents();
        watchSaveTarget();
        setupPwa();
        var params = new URLSearchParams(location.search);
        var requestedMode = params.get('mode');
        var requestedFolder = params.get('folder') || params.get('theme') || '';
        if (requestedMode === 'edit' || requestedMode === 'submit') {
            /* The theme is fetched after boot, so Edit and Submit cannot be
               activated yet. Remember the deep link and apply it once the
               config and its assets are in place. */
            bootModeRequest = { mode: requestedMode, folder: requestedFolder };
        }
        setMode('preview', true);

        loadGalleryIndex().then(function () {
            var requested = params.get('folder') || params.get('theme');
            if (requested && state.byFolder[requested]) {
                loadGalleryTheme(requested);
                return;
            }
            bootModeRequest = null;
            updateChrome();
            setLoading(false);
            showEmpty(
                state.gallery.length ? 'Open a theme to begin' : 'No gallery themes found',
                state.gallery.length
                    ? 'Choose a gallery theme below, or open a theme ZIP or folder from this device.'
                    : 'Open a local package, or check that themes.json is available.'
            );
        });
        if (window.ThemeAuthorPolicy && typeof window.ThemeAuthorPolicy.ready === 'function') {
            window.ThemeAuthorPolicy.ready().then(syncPolicy).catch(function () {});
        }
    }

    function loadGalleryIndex() {
        return fetch('../themes.json', { cache: 'no-cache' })
            .then(function (res) {
                if (!res.ok) throw new Error('themes.json (' + res.status + ')');
                return res.json();
            })
            .then(function (data) {
                state.gallery = data && Array.isArray(data.themes) ? data.themes.filter(function (t) {
                    return t && t.folder;
                }) : [];
                state.byFolder = Object.create(null);
                state.gallery.forEach(function (theme) {
                    state.byFolder[theme.folder] = theme;
                });
                populateThemeSelect('');
            })
            .catch(function (err) {
                console.warn('Studio: gallery index unavailable', err);
                state.gallery = [];
                state.byFolder = Object.create(null);
                populateThemeSelect('');
                el.themeCount.textContent = 'Gallery index unavailable';
            });
    }

    function setMode(mode, initial) {
        if (mode !== 'preview' && mode !== 'edit' && mode !== 'submit') mode = 'preview';
        if (mode !== 'preview' && !state.meta) {
            toast('Open a theme first.');
            mode = 'preview';
        }
        state.mode = mode;
        document.body.setAttribute('data-mode', mode);
        each(document.querySelectorAll('[data-mode-btn]'), function (btn) {
            var active = btn.getAttribute('data-mode-btn') === mode;
            btn.classList.toggle('is-active', active);
            btn.setAttribute('aria-selected', active ? 'true' : 'false');
        });
        each(document.querySelectorAll('[data-pane]'), function (pane) {
            pane.hidden = pane.getAttribute('data-pane') !== mode;
        });
        if (!initial) {
            el.panelScroll.scrollTop = 0;
            syncUrl();
        }
        each(document.querySelectorAll('[data-pane]'), function (pane) {
            if (pane.getAttribute('data-pane') !== mode) return;
            pane.setAttribute('data-i18n-dynamic', '');
            pane.removeAttribute('data-i18n-dynamic-state');
            if (window.InnioasisLocale && typeof window.InnioasisLocale.translateDynamic === 'function') {
                try {
                    window.InnioasisLocale.translateDynamic(pane);
                } catch (e) {}
            }
        });
        if (mode === 'submit') {
            window.setTimeout(function () {
                if (!el.submitForm) return;
                var top = el.submitForm.getBoundingClientRect().top + window.scrollY - 92;
                window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
                if (window.matchMedia('(max-width: 700px)').matches) el.submitTitle.focus({ preventScroll: true });
            }, 90);
        }
        updateChecklist();
    }

    function syncUrl() {
        if (!history.replaceState) return;
        var params = new URLSearchParams(location.search);
        if (state.sourceType === 'gallery' && state.folder) params.set('folder', state.folder);
        else params.delete('folder');
        params.delete('theme');
        var pendingMode =
            bootModeRequest &&
            state.sourceType === 'gallery' &&
            state.folder &&
            (!bootModeRequest.folder || bootModeRequest.folder === state.folder)
                ? bootModeRequest.mode
                : null;
        params.set('mode', pendingMode || state.mode);
        var query = params.toString();
        history.replaceState(null, '', location.pathname + (query ? '?' + query : ''));
    }

    /* —— Gallery themes —— */

    function galleryMeta(theme, folder) {
        var shot = String((theme && (theme.screenshot || theme.screenshotPreview)) || '').trim();
        var cover = '';
        if (shot) {
            if (/^https?:\/\//i.test(shot) || shot.charAt(0) === '/') {
                cover = shot;
            } else {
                var clean = shot.replace(/^\.\/+/, '').replace(/^\/+/, '');
                cover = '../' + clean.split('/').map(encodeURIComponent).join('/');
            }
        }
        return {
            name: (theme && theme.name) || folder || 'Untitled theme',
            author: (theme && theme.author) || '',
            authorUrl: (theme && theme.authorUrl) || '',
            desc: (theme && theme.description) || '',
            externalDownloadUrl: (theme && theme.externalDownloadUrl) || '',
            cover: cover,
            fileCount: 0,
            bytes: 0
        };
    }

    function loadGalleryTheme(folder) {
        if (!folder) return;
        var requestedFolder = folder;
        state.sourceType = 'gallery';
        state.folder = folder;
        state.config = null;
        state.compactExpanded = false;
        state.previewOk = false;
        state.formDirty = false;
        state.dirty = false;
        state.swapOpen = false;
        state.meta = galleryMeta(state.byFolder[folder], folder);
        state.baseCover = state.meta.cover;
        state.localFiles = [];
        state.localFileMap = Object.create(null);
        resetAssetOverrides();
        state.assets = [];
        state.assetById = Object.create(null);
        state.selectedAssetId = null;

        if (window.Y1ThemePreview && typeof window.Y1ThemePreview.unmount === 'function') {
            window.Y1ThemePreview.unmount(el.preview);
        }
        clearLocalState();
        hideEmpty();
        setLoading(true, 'Loading ' + state.meta.name + '…');
        updateChrome();
        fillSubmitForm();
        updateChecklist();
        syncUrl();

        fetch('../' + encodePath(folder) + '/config.json', { cache: 'no-cache' })
            .then(function (res) {
                if (!res.ok) throw new Error('config.json (' + res.status + ')');
                return res.json();
            })
            .then(function (config) {
                if (state.sourceType !== 'gallery' || state.folder !== requestedFolder) return;
                state.config = config;
                state.configBase = cloneJson(config);
                var info = (config && config.theme_info) || {};
                if (info.title) state.meta.name = info.title;
                if (info.author) state.meta.author = info.author;
                if (info.authorUrl) state.meta.authorUrl = info.authorUrl;
                if (info.description) state.meta.desc = info.description;
                if (info.externalDownloadUrl) state.meta.externalDownloadUrl = info.externalDownloadUrl;
                state.baseCover = state.meta.cover;
                rebuildAssets();
                updateChrome();
                applyBootMode(requestedFolder);
                fillSubmitForm();
                updateChecklist();
                return mountPreview();
            })
            .catch(function (err) {
                if (state.sourceType !== 'gallery' || state.folder !== requestedFolder) return;
                showPreviewError(err);
            });
    }

    function applyBootMode(folder) {
        if (!bootModeRequest) return;
        var request = bootModeRequest;
        if (request.folder && folder && request.folder !== folder) return;
        bootModeRequest = null;
        setMode(request.mode);
    }

    function populateThemeSelect(query) {
        var q = String(query || '').trim().toLowerCase();
        var list = state.gallery;
        if (q) {
            list = list.filter(function (theme) {
                var haystack = [theme.name, theme.folder, theme.author, theme.description]
                    .join(' ')
                    .toLowerCase();
                return haystack.indexOf(q) !== -1;
            });
        }
        var limited = list.slice(0, 120);
        el.themeSelect.innerHTML = '';
        el.themeSelect.appendChild(
            new Option(state.sourceType === 'local' ? 'Local package (not in gallery)' : 'Choose a gallery theme…', '')
        );
        limited.forEach(function (theme) {
            var label = theme.name || theme.folder;
            if (theme.author) label += ' · ' + theme.author;
            el.themeSelect.appendChild(new Option(label, theme.folder));
        });
        if (state.sourceType === 'gallery' && state.folder && optionExists(state.folder)) {
            el.themeSelect.value = state.folder;
        }
        el.themeCount.textContent = q
            ? list.length
                ? 'Showing ' + limited.length + ' of ' + list.length + ' matches'
                : 'No matching themes'
            : 'All ' + state.gallery.length + ' gallery themes';
        if (!q) updateThemeSelectValue();
    }

    function optionExists(value) {
        for (var i = 0; i < el.themeSelect.options.length; i += 1) {
            if (el.themeSelect.options[i].value === value) return true;
        }
        return false;
    }

    function updateThemeSelectValue() {
        var placeholder = el.themeSelect.options[0];
        if (state.sourceType === 'gallery' && state.folder) {
            if (placeholder && placeholder.value === '') placeholder.text = 'Choose a gallery theme…';
            /* The 120-option preview list is alphabetical, so a deep link to a
               later theme (Persona5, for one) would otherwise leave the picker
               reading "Choose a gallery theme" while that theme is loaded. */
            if (!optionExists(state.folder)) {
                var theme = state.byFolder[state.folder];
                var label = (theme && theme.name) || state.folder;
                if (theme && theme.author) label += ' · ' + theme.author;
                el.themeSelect.insertBefore(new Option(label, state.folder), el.themeSelect.options[1] || null);
            }
            el.themeSelect.value = state.folder;
            return;
        }
        if (placeholder && placeholder.value === '') placeholder.text = 'Local package (not in gallery)';
        el.themeSelect.value = '';
    }

    /* —— Preview —— */

    function mountPreview() {
        if (!window.Y1ThemePreview || typeof window.Y1ThemePreview.mount !== 'function') {
            return Promise.reject(new Error('The preview engine did not load.'));
        }
        hideEmpty();
        window.Y1ThemePreview.unmount(el.preview);
        el.preview.innerHTML = '';

        var options = {
            catalogFolder: state.sourceType === 'gallery' ? state.folder : '__studio_local__',
            variantSegment: '',
            mode: 'full',
            compactControls: true,
            compactExpanded: state.compactExpanded === true,
            onCompactChange: function (expanded) {
                state.compactExpanded = expanded === true;
            },
            spec: state.config,
            buildFileUrl: state.sourceType === 'gallery' ? galleryFileUrl : localFileUrl,
            previewMeta: {
                trackTitle: state.meta.name || 'Untitled theme',
                trackArtist: state.meta.author || 'Unknown author',
                trackAlbum: (state.meta.desc || 'Y1 Theme').slice(0, 96)
            }
        };

        return window.Y1ThemePreview.mount(el.preview, options).then(function () {
            state.previewOk = true;
            setLoading(false);
            updateChecklist();
            if (state.selectedAssetId) highlightPreviewAsset(state.selectedAssetId);
        });
    }

    function galleryFileUrl(contentFolder, relativePath) {
        var overrideKey = localKey('', relativePath);
        if (state.assetOverrides[overrideKey] && state.assetOverrides[overrideKey].url) {
            return state.assetOverrides[overrideKey].url;
        }
        var folder = String(contentFolder || '')
            .replace(/^\.\/+/, '')
            .replace(/\/+$/, '');
        var path = String(relativePath || '')
            .replace(/\\/g, '/')
            .replace(/^\.\/+/, '')
            .replace(/^\/+/, '');
        var stack = folder.split('/').filter(Boolean);
        path.split('/').forEach(function (segment) {
            if (!segment || segment === '.') return;
            if (segment === '..') {
                if (stack.length) stack.pop();
                return;
            }
            stack.push(segment);
        });
        return '../' + stack.map(encodeURIComponent).join('/');
    }

    function localFileUrl(contentFolder, relativePath) {
        var overrideKey = localKey('', relativePath);
        if (state.assetOverrides[overrideKey] && state.assetOverrides[overrideKey].url) {
            return state.assetOverrides[overrideKey].url;
        }
        if (!state.localMap) return '';
        var key = localKey(contentFolder, relativePath);
        return state.localMap[key] || '';
    }

    function localKey(contentFolder, relativePath) {
        var path = String(relativePath || '')
            .replace(/\\/g, '/')
            .replace(/^\.\/+/, '')
            .replace(/^\/+/, '');
        var stack = [];
        path.split('/').forEach(function (segment) {
            if (!segment || segment === '.') return;
            if (segment === '..') {
                if (stack.length) stack.pop();
                return;
            }
            stack.push(segment);
        });
        return stack.join('/').toLowerCase();
    }

    function setCover(img, wrap, url) {
        if (!img || !wrap) return;
        img.onload = function () {
            wrap.classList.add('has-image');
        };
        img.onerror = function () {
            wrap.classList.remove('has-image');
            img.removeAttribute('src');
        };
        if (!url) {
            wrap.classList.remove('has-image');
            img.removeAttribute('src');
            img.alt = '';
            return;
        }
        img.alt = ((state.meta && state.meta.name) || 'Theme') + ' cover';
        img.src = url;
    }

    function updateChrome() {
        var meta = state.meta || {};
        var isLocalSource = state.sourceType === 'local';
        var hasTheme = !!state.meta;
        document.body.classList.toggle('has-theme', hasTheme);
        el.title.textContent = hasTheme ? meta.name || 'Untitled theme' : 'Theme Studio';
        el.byline.textContent = hasTheme
            ? meta.author
                ? 'by ' + meta.author
                : 'Author not listed'
            : 'Preview, remix and submit a Y1 or Y2 theme.';
        el.sourceLabel.textContent = isLocalSource ? 'Local package' : 'Gallery theme';
        el.sourceDetail.textContent = isLocalSource
            ? meta.fileCount
                ? fileCountLabel(meta.fileCount)
                : 'this device'
            : hasTheme
              ? state.folder || ''
              : 'not opened';
        el.sourceChip.textContent = isLocalSource ? 'Local' : hasTheme ? 'Gallery' : 'No theme';
        el.commandContext.textContent = hasTheme
            ? (meta.name || 'Theme') + (meta.author ? ' · ' + meta.author : '')
            : 'Open a theme, or choose one from the gallery';

        el.sourceName.textContent = meta.name || '—';
        el.sourceAuthor.textContent = isLocalSource
            ? 'Opened from this device'
            : meta.author
              ? 'by ' + meta.author
              : 'Author not listed';
        el.sourceDesc.textContent = hasTheme ? meta.desc || 'No description in this package.' : '';
        el.packageName.textContent = meta.name || '—';
        el.packageSource.textContent = isLocalSource
            ? fileCountLabel(meta.fileCount || 0) + ' · local' + (meta.bytes ? ' · ' + formatBytes(meta.bytes) : '')
            : 'Gallery theme · ' + (state.folder || '');

        setCover(el.cover, el.coverWrap, hasTheme ? meta.cover : '');
        setCover(el.submitCover, el.submitCoverWrap, hasTheme ? meta.cover : '');
        if (el.swap) el.swap.hidden = !hasTheme;
        if (el.swapPanel) el.swapPanel.hidden = hasTheme && !state.swapOpen;
        if (el.unsaved) el.unsaved.hidden = !state.dirty;
        each(document.querySelectorAll('[data-mode-btn]'), function (btn) {
            var isPreview = btn.getAttribute('data-mode-btn') === 'preview';
            btn.disabled = !hasTheme && !isPreview;
        });
        if (el.startEdit) el.startEdit.disabled = !hasTheme;
        if (el.editBack) el.editBack.disabled = !hasTheme;
        if (el.editSubmit) el.editSubmit.disabled = !hasTheme;
        if (el.save) el.save.disabled = !hasTheme || state.busy;
        if (hasTheme) updateThemeSelectValue();
        renderAssets();
    }

    /* —— Inspector content —— */

    function updatePalette() {
        if (!el.palette) return;
        var config = state.config || {};
        var item = config.itemConfig || {};
        var menu = config.menuConfig || {};
        var status = config.statusConfig || {};
        var entries = [
            ['Item text', item.itemTextColor],
            ['Selected', item.itemSelectedTextColor],
            ['Menu', menu.menuBackgroundColor],
            ['Status bar', status.statusBarColor]
        ];
        el.palette.innerHTML = '';
        var shown = 0;
        entries.forEach(function (entry) {
            var value = String(entry[1] || '').trim();
            if (!isColor(value)) return;
            var row = document.createElement('div');
            row.className = 'studio-swatch';
            var swatch = document.createElement('i');
            swatch.style.background = value;
            swatch.setAttribute('aria-hidden', 'true');
            var label = document.createElement('span');
            label.textContent = entry[0];
            row.appendChild(swatch);
            row.appendChild(label);
            el.palette.appendChild(row);
            shown += 1;
        });
        if (!shown) {
            var empty = document.createElement('p');
            empty.className = 'studio-hint';
            empty.textContent = 'This package does not declare colors.';
            el.palette.appendChild(empty);
        }
    }

    function isColor(value) {
        return /^(#([0-9a-f]{3,8})|rgba?\(|hsla?\(|oklch\(|color\()/i.test(String(value || '').trim());
    }

    function colorPickerValue(value) {
        var text = String(value || '').trim();
        var hex = text.match(/^#([0-9a-f]{3,8})$/i);
        if (hex) {
            var digits = hex[1];
            if (digits.length === 3) {
                return '#' + digits.charAt(0) + digits.charAt(0) + digits.charAt(1) + digits.charAt(1) + digits.charAt(2) + digits.charAt(2);
            }
            return '#' + digits.slice(0, 6);
        }
        var rgb = text.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
        if (rgb) {
            return (
                '#' +
                [rgb[1], rgb[2], rgb[3]]
                    .map(function (part) {
                        return ('0' + Math.max(0, Math.min(255, Number(part) || 0)).toString(16)).slice(-2);
                    })
                    .join('')
            );
        }
        return '#000000';
    }

    function collectColorDefinitions(config) {
        var defs = [];
        var seen = Object.create(null);
        function walk(node, path, topKey) {
            if (!node || typeof node !== 'object') return;
            if (topKey === 'theme_info' || topKey === 'source_info') return;
            if (Array.isArray(node)) {
                node.forEach(function (value, index) {
                    walk(value, path + '.' + index, topKey);
                });
                return;
            }
            Object.keys(node).forEach(function (key) {
                var value = node[key];
                var childPath = path ? path + '.' + key : key;
                if (typeof value === 'string') {
                    if (!isColor(value) || seen[childPath]) return;
                    seen[childPath] = true;
                    defs.push({
                        path: childPath,
                        value: value.trim(),
                        section: assetSection(topKey || key),
                        label: assetLabel(key, childPath)
                    });
                    return;
                }
                walk(value, childPath, topKey || key);
            });
        }
        walk(config, '', '');
        defs.sort(function (a, b) {
            return a.section === b.section ? a.label.localeCompare(b.label) : a.section.localeCompare(b.section);
        });
        return defs;
    }

    function scheduleColorPreview() {
        if (state.colorPreviewTimer) window.clearTimeout(state.colorPreviewTimer);
        state.colorPreviewTimer = window.setTimeout(function () {
            state.colorPreviewTimer = null;
            if (state.config) remountPreview('Applying colour changes…');
        }, 320);
    }

    function renderColorEditor() {
        if (!el.colorEditor) return;
        var defs = collectColorDefinitions(state.config || {});
        el.colorEditor.innerHTML = '';
        el.colorEditor.hidden = defs.length === 0;
        if (!defs.length) return;

        var head = document.createElement('div');
        head.className = 'studio-color-editor-head';
        var title = document.createElement('p');
        title.className = 'studio-eyebrow';
        title.textContent = 'Colours';
        var hint = document.createElement('span');
        hint.textContent = defs.length + ' editable values';
        head.appendChild(title);
        head.appendChild(hint);
        el.colorEditor.appendChild(head);

        var groups = Object.create(null);
        defs.forEach(function (def) {
            if (!groups[def.section]) groups[def.section] = [];
            groups[def.section].push(def);
        });
        Object.keys(groups).forEach(function (sectionName) {
            var group = document.createElement('details');
            group.className = 'studio-color-group';
            group.open = true;
            var summary = document.createElement('summary');
            var groupTitle = document.createElement('span');
            groupTitle.textContent = sectionName;
            var count = document.createElement('span');
            count.className = 'studio-asset-group-count';
            count.textContent = groups[sectionName].length;
            summary.appendChild(groupTitle);
            summary.appendChild(count);
            group.appendChild(summary);

            groups[sectionName].forEach(function (def) {
                var row = document.createElement('div');
                row.className = 'studio-color-row';
                var label = document.createElement('label');
                label.textContent = def.label;
                var code = document.createElement('code');
                code.textContent = def.path;
                code.title = def.path;
                var picker = document.createElement('input');
                picker.type = 'color';
                picker.value = colorPickerValue(def.value);
                picker.setAttribute('aria-label', def.label + ' colour picker');
                var text = document.createElement('input');
                text.type = 'text';
                text.className = 'studio-color-value';
                text.value = def.value;
                text.spellcheck = false;
                text.setAttribute('aria-label', def.label + ' value');

                function commit(value) {
                    var clean = String(value || '').trim();
                    if (clean) writePath(state.config || {}, def.path, clean);
                    else deletePath(state.config || {}, def.path);
                    markDirty();
                    scheduleColorPreview();
                }
                picker.addEventListener('input', function () {
                    text.value = picker.value;
                    commit(picker.value);
                });
                text.addEventListener('input', function () {
                    picker.value = colorPickerValue(text.value);
                });
                text.addEventListener('change', function () {
                    commit(text.value);
                });

                var copy = document.createElement('div');
                copy.className = 'studio-color-copy';
                copy.appendChild(label);
                copy.appendChild(code);
                row.appendChild(copy);
                row.appendChild(picker);
                row.appendChild(text);
                group.appendChild(row);
            });
            el.colorEditor.appendChild(group);
        });
    }

    function updateTypography() {
        var font = state.config && state.config.fontFamily;
        if (!font) {
            el.font.textContent = 'Theme default';
            return;
        }
        var name = String(font).replace(/\\/g, '/').split('/').pop();
        el.font.textContent = name;
    }

    function updateScreens() {
        var config = state.config || {};
        var home = config.homePageConfig || {};
        var count = 0;
        Object.keys(home).forEach(function (key) {
            if (/\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(String(home[key] || ''))) count += 1;
        });
        var rows = [
            ['Home', count ? count + ' items' : 'layout'],
            ['Music', 'list'],
            ['Now Playing', 'mock track'],
            ['Settings', 'menu'],
            ['Dialog', 'modal']
        ];
        el.screens.innerHTML = '';
        rows.forEach(function (row) {
            var span = document.createElement('span');
            span.className = 'studio-screen';
            var strong = document.createElement('strong');
            strong.textContent = row[0];
            span.appendChild(strong);
            span.appendChild(document.createTextNode(row[1]));
            el.screens.appendChild(span);
        });
    }

    /* —— Asset editor —— */

    var SECTION_LABELS = {
        themeCover: 'Theme art',
        desktopWallpaper: 'Theme art',
        globalWallpaper: 'Theme art',
        desktopMask: 'Theme art',
        homePageConfig: 'Home screen',
        mainMenuConfig: 'Main menu',
        subMenuConfig: 'Menus',
        itemConfig: 'Lists and items',
        dialogConfig: 'Dialogs',
        statusConfig: 'Status bar',
        musicConfig: 'Music',
        videoConfig: 'Video',
        photoConfig: 'Photos',
        ebookConfig: 'Ebooks',
        fmConfig: 'FM radio',
        bluetoothConfig: 'Bluetooth',
        settingsConfig: 'Settings',
        bootConfig: 'Boot and shutdown',
        clockConfig: 'Clock',
        calculatorConfig: 'Calculator',
        calendarConfig: 'Calendar',
        fileManagerConfig: 'Files',
        theme_info: 'Listing metadata',
        source_info: 'Source metadata'
    };

    var LABELS = {
        themeCover: 'Theme cover',
        desktopWallpaper: 'Home wallpaper',
        globalWallpaper: 'Global wallpaper',
        desktopMask: 'Home overlay mask',
        fontFamily: 'Theme font',
        nowPlayingBackground: 'Now playing background',
        nowPlayingAlbumArt: 'Album art placeholder',
        albumArtDefault: 'Default album art',
        backgroundImage: 'Background',
        selectedBackground: 'Selected background',
        menuBackground: 'Menu background',
        itemBackground: 'Item background',
        itemSelectedBackground: 'Selected item background',
        scrollbarThumb: 'Scrollbar thumb',
        bootLogo: 'Boot logo',
        shutdownLogo: 'Shutdown logo'
    };

    function assetSection(topKey) {
        if (SECTION_LABELS[topKey]) return SECTION_LABELS[topKey];
        var text = String(topKey || '').replace(/Config$/i, '').replace(/([a-z])([A-Z])/g, '$1 $2');
        return text ? text.charAt(0).toUpperCase() + text.slice(1) : 'Theme assets';
    }

    function assetLabel(key, path) {
        if (LABELS[key]) return LABELS[key];
        var text = String(key || '')
            .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
            .replace(/[_-]+/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
        if (!text) text = fileName(path) || 'Asset';
        return text.charAt(0).toUpperCase() + text.slice(1);
    }

    function isThemeAssetValue(value) {
        var text = String(value || '').trim();
        if (!text || /^(https?:|data:|blob:)/i.test(text)) return false;
        return /\.(png|jpe?g|gif|webp|bmp|svg|ttf|otf|woff2?)$/i.test(text);
    }

    function assetKind(path, value) {
        if (/fontFamily$/i.test(path) || /\.(ttf|otf|woff2?)$/i.test(value)) return 'font';
        return 'image';
    }

    function assetTargetSize(path) {
        var key = String(path || '');
        if (/fontFamily$/i.test(key)) return null;
        if (key.indexOf('homePageConfig.') === 0) return { width: 166, height: 166 };
        if (key === 'settingConfig.settingMask') return { width: 320, height: 240 };
        if (key.indexOf('settingConfig.') === 0) return { width: 146, height: 146 };
        if (key === 'itemConfig.itemBackground' || key === 'itemConfig.itemSelectedBackground') {
            return { width: 640, height: 91 };
        }
        if (key === 'desktopWallpaper' || key === 'globalWallpaper' || key === 'themeCover') {
            return { width: 320, height: 240 };
        }
        if (key.indexOf('statusConfig.') === 0 || key === 'itemConfig.itemRightArrow') {
            return { width: 64, height: 64 };
        }
        if (key.indexOf('fileConfig.') === 0) return { width: 166, height: 166 };
        return null;
    }

    function assetSizeLabel(asset) {
        if (!asset || asset.kind === 'font') return 'Font file';
        var target = assetTargetSize(asset.path);
        return target ? target.width + ' × ' + target.height : 'Source size';
    }

    function defaultAssetFileName(asset, file) {
        var base = 'asset';
        if (asset.path === 'fileConfig.folderIcon') base = 'folder';
        else if (asset.path === 'fileConfig.musicIcon') base = 'music_file';
        else base = fileName(file.name || '').replace(/\.[^.]+$/, '') || 'asset';
        var type = String(file.type || '').toLowerCase();
        var ext = type.indexOf('jpeg') !== -1 ? 'jpg' : type.indexOf('webp') !== -1 ? 'webp' : 'png';
        return base + '.' + ext;
    }

    function resizeImageFile(file, target) {
        if (!target || !/^image\//i.test(file.type || '') || /svg|gif/i.test(file.type || '')) {
            return Promise.resolve(file);
        }
        return new Promise(function (resolve) {
            var url = URL.createObjectURL(file);
            var image = new Image();
            image.onload = function () {
                URL.revokeObjectURL(url);
                var width = image.naturalWidth || image.width;
                var height = image.naturalHeight || image.height;
                if (!width || !height || (width <= target.width && height <= target.height)) {
                    resolve(file);
                    return;
                }
                var scale = Math.min(target.width / width, target.height / height);
                var nextWidth = Math.max(1, Math.round(width * scale));
                var nextHeight = Math.max(1, Math.round(height * scale));
                var canvas = document.createElement('canvas');
                canvas.width = nextWidth;
                canvas.height = nextHeight;
                var context = canvas.getContext('2d');
                if (!context) {
                    resolve(file);
                    return;
                }
                context.imageSmoothingEnabled = true;
                context.imageSmoothingQuality = 'high';
                context.drawImage(image, 0, 0, nextWidth, nextHeight);
                canvas.toBlob(
                    function (blob) {
                        if (!blob) {
                            resolve(file);
                            return;
                        }
                        resolve(new File([blob], fileName(file.name || '').replace(/\.[^.]+$/, '') + '.png', { type: 'image/png' }));
                    },
                    'image/png'
                );
            };
            image.onerror = function () {
                URL.revokeObjectURL(url);
                resolve(file);
            };
            image.src = url;
        });
    }

    function collectAssetDefinitions(config) {
        var defs = [];
        function walk(node, path, topKey) {
            if (!node || typeof node !== 'object') return;
            if (Array.isArray(node)) {
                node.forEach(function (value, index) {
                    walk(value, path + '.' + index, topKey);
                });
                return;
            }
            Object.keys(node).forEach(function (key) {
                var value = node[key];
                var childPath = path ? path + '.' + key : key;
                if (typeof value === 'string') {
                    if (!isThemeAssetValue(value)) return;
                    defs.push({
                        path: childPath,
                        value: value.trim(),
                        section: assetSection(topKey || key),
                        label: assetLabel(key, childPath),
                        kind: assetKind(childPath, value)
                    });
                    return;
                }
                walk(value, childPath, topKey || key);
            });
        }
        walk(config, '', '');
        var known = Object.create(null);
        defs.forEach(function (def) {
            known[def.path] = true;
        });
        [
            ['fileConfig.folderIcon', 'Folder icon'],
            ['fileConfig.musicIcon', 'Music file icon']
        ].forEach(function (optional) {
            if (known[optional[0]]) return;
            defs.push({
                path: optional[0],
                value: String(readPath(config || {}, optional[0]) || '').trim(),
                section: 'Files',
                label: optional[1],
                kind: 'image'
            });
        });
        return defs;
    }

    function resolveStoredAssetUrl(value) {
        if (!value) return '';
        var key = localKey('', value);
        var override = state.assetOverrides[key];
        if (override && override.url) return override.url;
        if (state.sourceType === 'local') return state.localMap ? state.localMap[key] || '' : '';
        if (state.sourceType === 'gallery' && state.folder) return galleryFileUrl(state.folder, value);
        return '';
    }

    function rebuildAssets() {
        var defs = collectAssetDefinitions(state.config || {});
        state.assetById = Object.create(null);
        state.assets = defs.map(function (def, index) {
            var baseValue = readPath(state.configBase || {}, def.path);
            var key = localKey('', def.value);
            var override = state.assetOverrides[key];
            var localMissing = false;
            if (state.sourceType === 'local' && def.value && !override) {
                localMissing = !(state.localFileMap && state.localFileMap[key]);
            }
            var asset = {
                id: def.path,
                path: def.path,
                value: def.value,
                label: def.label,
                section: def.section,
                kind: def.kind,
                url: resolveStoredAssetUrl(def.value),
                override: override || null,
                missing: localMissing,
                localMissing: localMissing,
                empty: !String(def.value || '').trim(),
                changed: !!override || String(baseValue || '') !== String(def.value || ''),
                order: index
            };
            state.assetById[asset.id] = asset;
            return asset;
        });
        state.assets.sort(function (a, b) {
            return a.section === b.section ? a.label.localeCompare(b.label) : a.section.localeCompare(b.section);
        });
        if (state.selectedAssetId && !state.assetById[state.selectedAssetId]) {
            state.selectedAssetId = state.assets[0] ? state.assets[0].id : null;
        }
        if (!state.selectedAssetId && state.assets[0]) state.selectedAssetId = state.assets[0].id;
        renderAssets();
        renderColorEditor();
    }

    function assetStatus(asset) {
        if (asset.override) return { label: 'Replaced', key: 'changed' };
        if (asset.localMissing) return { label: 'Missing', key: 'missing' };
        if (asset.changed) return { label: 'Changed', key: 'changed' };
        if (asset.empty) return { label: 'Empty', key: 'empty' };
        return { label: 'Ready', key: 'ready' };
    }

    function createAssetRow(asset) {
        var status = assetStatus(asset);
        var row = document.createElement('div');
        row.className = 'studio-asset-row is-' + status.key;
        row.setAttribute('role', 'listitem');
        row.setAttribute('tabindex', '0');
        row.setAttribute('data-asset-id', asset.id);
        row.setAttribute('aria-label', asset.label + ', ' + (asset.value || 'no file') + ', ' + status.label);

        var thumb = document.createElement('span');
        thumb.className = 'studio-asset-thumb';
        if (asset.url && asset.kind === 'image') {
            var img = document.createElement('img');
            img.loading = 'lazy';
            img.alt = '';
            img.src = asset.url;
            thumb.appendChild(img);
        } else {
            var icon = document.createElement('i');
            icon.className = asset.kind === 'font' ? 'fa-solid fa-font' : 'fa-regular fa-image';
            icon.setAttribute('aria-hidden', 'true');
            thumb.appendChild(icon);
        }

        var copy = document.createElement('span');
        copy.className = 'studio-asset-row-copy';
        var name = document.createElement('strong');
        name.textContent = asset.label;
        var file = document.createElement('span');
        file.textContent = (fileName(asset.value) || 'No file') + ' · ' + assetSizeLabel(asset);
        file.title = asset.value || 'No file assigned';
        copy.appendChild(name);
        copy.appendChild(file);

        var meta = document.createElement('span');
        meta.className = 'studio-asset-row-meta';
        var section = document.createElement('span');
        section.textContent = asset.section;
        var badge = document.createElement('span');
        badge.className = 'studio-asset-badge';
        badge.textContent = status.label;
        meta.appendChild(section);
        meta.appendChild(badge);

        var actions = document.createElement('span');
        actions.className = 'studio-asset-row-actions';
        [
            ['import', 'fa-folder-open', 'Import or replace ' + asset.label],
            ['paste', 'fa-paste', 'Paste into ' + asset.label]
        ].forEach(function (action) {
            var btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'studio-asset-row-action';
            btn.setAttribute('data-asset-action', action[0]);
            btn.setAttribute('aria-label', action[2]);
            btn.title = action[2];
            var actionIcon = document.createElement('i');
            actionIcon.className = 'fa-solid ' + action[1];
            actionIcon.setAttribute('aria-hidden', 'true');
            btn.appendChild(actionIcon);
            actions.appendChild(btn);
        });

        row.appendChild(thumb);
        row.appendChild(copy);
        row.appendChild(meta);
        row.appendChild(actions);
        return row;
    }

    function assetMatchesFilter(asset, filter) {
        if (filter === 'missing') return !!asset.localMissing;
        if (filter === 'changed') return !!asset.changed;
        return true;
    }

    function renderAssets() {
        if (!el.assetList) return;
        var all = state.assets;
        var missing = all.filter(function (asset) {
            return asset.localMissing;
        }).length;
        var changed = all.filter(function (asset) {
            return asset.changed;
        }).length;
        if (el.assetCountAll) el.assetCountAll.textContent = String(all.length);
        if (el.assetCountMissing) el.assetCountMissing.textContent = String(missing);
        if (el.assetCountChanged) el.assetCountChanged.textContent = String(changed);

        var filter = state.assetFilter;
        each(document.querySelectorAll('[data-asset-filter]'), function (btn) {
            var active = btn.getAttribute('data-asset-filter') === filter;
            btn.classList.toggle('is-active', active);
            btn.setAttribute('aria-pressed', active ? 'true' : 'false');
        });

        var visible = all.filter(function (asset) {
            return assetMatchesFilter(asset, filter);
        });
        el.assetList.innerHTML = '';
        if (el.assetEmpty) {
            el.assetEmpty.hidden = visible.length > 0;
            el.assetEmpty.textContent = all.length
                ? 'No assets match this filter.'
                : 'This theme does not declare any image or font assets in config.json.';
        }

        var groups = Object.create(null);
        visible.forEach(function (asset) {
            if (!groups[asset.section]) groups[asset.section] = [];
            groups[asset.section].push(asset);
        });
        Object.keys(groups).forEach(function (sectionName) {
            var group = document.createElement('details');
            group.className = 'studio-asset-group';
            group.open = true;
            var summary = document.createElement('summary');
            summary.className = 'studio-asset-group-head';
            var title = document.createElement('span');
            title.textContent = sectionName;
            var count = document.createElement('span');
            count.className = 'studio-asset-group-count';
            count.textContent = groups[sectionName].length;
            summary.appendChild(title);
            summary.appendChild(count);
            group.appendChild(summary);
            var body = document.createElement('div');
            body.className = 'studio-asset-group-body';
            groups[sectionName].forEach(function (asset) {
                body.appendChild(createAssetRow(asset));
            });
            group.appendChild(body);
            el.assetList.appendChild(group);
        });
        paintAssetSelection();
        if (state.selectedAssetId) highlightPreviewAsset(state.selectedAssetId);
    }

    function paintAssetSelection() {
        each(el.assetList ? el.assetList.querySelectorAll('[data-asset-id]') : [], function (row) {
            var active = row.getAttribute('data-asset-id') === state.selectedAssetId;
            row.classList.toggle('is-selected', active);
            row.setAttribute('aria-selected', active ? 'true' : 'false');
        });
        updateAssetDetail();
    }

    function selectAsset(id) {
        if (!id || !state.assetById[id]) return;
        state.selectedAssetId = id;
        paintAssetSelection();
        highlightPreviewAsset(id);
        if (window.matchMedia('(max-width: 940px)').matches && el.assetDetail) {
            el.assetDetail.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }

    function previewAssetNodes(path) {
        if (!path || !el.preview) return [];
        return Array.prototype.filter.call(
            el.preview.querySelectorAll('[data-theme-asset-path]'),
            function (node) {
                return node.getAttribute('data-theme-asset-path') === path;
            }
        );
    }

    function clearPreviewAssetLink() {
        each(el.preview ? el.preview.querySelectorAll('.is-studio-linked') : [], function (node) {
            node.classList.remove('is-studio-linked');
        });
        each(el.assetList ? el.assetList.querySelectorAll('.is-preview-linked') : [], function (row) {
            row.classList.remove('is-preview-linked');
        });
    }

    function highlightPreviewAsset(path) {
        clearPreviewAssetLink();
        if (!path) return;
        each(previewAssetNodes(path), function (node) {
            node.classList.add('is-studio-linked');
        });
        each(el.assetList ? el.assetList.querySelectorAll('[data-asset-id]') : [], function (row) {
            if (row.getAttribute('data-asset-id') === path) row.classList.add('is-preview-linked');
        });
    }

    function revealAssetInEdit(id) {
        var asset = state.assetById[id];
        if (!asset) return false;
        setMode('edit');
        if (!assetMatchesFilter(asset, state.assetFilter)) {
            state.assetFilter = 'all';
            renderAssets();
        }
        selectAsset(id);
        window.setTimeout(function () {
            var row = null;
            each(el.assetList ? el.assetList.querySelectorAll('[data-asset-id]') : [], function (candidate) {
                if (!row && candidate.getAttribute('data-asset-id') === id) row = candidate;
            });
            if (!row) return;
            try {
                row.scrollIntoView({ behavior: 'smooth', block: 'center' });
                row.focus({ preventScroll: true });
            } catch (e) {}
        }, 80);
        return true;
    }

    function previewAssetPathFromEvent(event) {
        var target = event && event.target;
        if (!target || !target.closest || !el.preview || !el.preview.contains(target)) return '';
        var node = target.closest('[data-theme-asset-path]');
        if (!node || !el.preview.contains(node)) return '';
        return node.getAttribute('data-theme-asset-path') || '';
    }

    function setupPreviewAssetFocus() {
        if (!el.preview) return;
        el.preview.addEventListener('pointerover', function (event) {
            var path = previewAssetPathFromEvent(event);
            if (!path || !state.assetById[path]) return;
            var node = event.target.closest('[data-theme-asset-path]');
            if (node && !node.title) node.title = 'Click to edit this theme asset';
            highlightPreviewAsset(path);
        });
        el.preview.addEventListener('pointerout', function (event) {
            var node = event.target && event.target.closest ? event.target.closest('[data-theme-asset-path]') : null;
            if (!node) return;
            var next = event.relatedTarget;
            if (next && node.contains(next)) return;
            clearPreviewAssetLink();
        });
        el.preview.addEventListener('click', function (event) {
            var path = previewAssetPathFromEvent(event);
            if (!path || !state.assetById[path]) return;
            event.preventDefault();
            event.stopPropagation();
            revealAssetInEdit(path);
        });
        el.preview.addEventListener('contextmenu', function (event) {
            var path = previewAssetPathFromEvent(event);
            if (!path || !state.assetById[path]) return;
            event.preventDefault();
            event.stopPropagation();
            revealAssetInEdit(path);
        });
    }

    function updateAssetDetail() {
        if (!el.assetDetail) return;
        var asset = state.selectedAssetId ? state.assetById[state.selectedAssetId] : null;
        el.assetDetail.hidden = !asset;
        if (!asset) return;
        var status = assetStatus(asset);
        el.assetSection.textContent = asset.section;
        el.assetName.textContent = asset.label;
        el.assetPath.textContent = asset.value || 'No file assigned';
        el.assetStatus.textContent = status.label;
        el.assetStatus.setAttribute('data-state', status.key);
        el.assetPreview.innerHTML = '';
        if (asset.url && asset.kind === 'image') {
            var img = document.createElement('img');
            img.src = asset.url;
            img.alt = asset.label + ' preview';
            el.assetPreview.appendChild(img);
        } else {
            var icon = document.createElement('i');
            icon.className = asset.kind === 'font' ? 'fa-solid fa-font' : 'fa-regular fa-image';
            icon.setAttribute('aria-hidden', 'true');
            el.assetPreview.appendChild(icon);
        }
        el.assetReset.disabled = !asset.changed;
        el.assetReplace.disabled = false;
        el.assetPaste.disabled = asset.kind !== 'image';
        var sizeHint = asset.kind === 'font' ? 'Fonts keep their source file.' : 'Ideal size: ' + assetSizeLabel(asset) + '.';
        el.assetHint.textContent =
            (asset.localMissing
                ? 'This file is referenced by config.json but is missing from the package. Import a replacement or reset it. '
                : asset.empty
                  ? 'This optional slot has no file yet. Import an image to add it to the theme. '
                  : '') +
            sizeHint +
            (asset.kind === 'font' ? ' Fonts cannot be pasted.' : ' Drop an image on this row, or copy one and press Ctrl+V / Cmd+V while the row is hovered.');
    }

    function setAssetFilter(filter) {
        if (filter !== 'all' && filter !== 'missing' && filter !== 'changed') filter = 'all';
        state.assetFilter = filter;
        renderAssets();
    }

    function markDirty() {
        state.dirty = true;
        if (el.unsaved) el.unsaved.hidden = false;
    }

    function isDirty() {
        return !!(
            state.dirty ||
            state.formDirty ||
            (state.assetOverrides && Object.keys(state.assetOverrides).length)
        );
    }

    function confirmReplace(label) {
        if (!state.meta) return true;
        var warning = isDirty()
            ? 'Unsaved replacements and listing edits will be lost.'
            : 'The theme currently in Studio will be closed.';
        return window.confirm('Replace ' + (state.meta.name || 'the current theme') + ' with ' + label + '?\n\n' + warning);
    }

    function openAssetPicker(assetId) {
        var asset = state.assetById[assetId];
        if (!asset) return;
        state.pendingAssetId = assetId;
        el.assetInput.accept = asset.kind === 'font' ? '.ttf,.otf,.woff,.woff2,font/ttf,font/otf,font/woff,font/woff2' : 'image/*';
        el.assetInput.click();
    }

    async function replaceAssetFromFile(assetId, file) {
        var asset = state.assetById[assetId];
        if (!asset || !file) return;
        if (file.size > 24 * 1024 * 1024) {
            toast('That file is larger than 24 MB. Choose a smaller asset.');
            return;
        }
        var isFont = /\.(ttf|otf|woff2?)$/i.test(file.name || '');
        if (asset.kind === 'font' && !isFont) {
            toast('That slot needs a font file.');
            return;
        }
        if (asset.kind === 'image' && !/^image\//i.test(file.type || '') && !/\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(file.name || '')) {
            toast('That slot needs an image.');
            return;
        }
        var working = file;
        if (asset.kind === 'image' && !/^image\//i.test(working.type || '')) {
            var ext = (fileName(working.name || '').split('.').pop() || 'png').toLowerCase();
            var inferred = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : ext === 'webp' ? 'image/webp' : ext === 'gif' ? 'image/gif' : ext === 'svg' ? 'image/svg+xml' : 'image/png';
            working = new File([working], working.name || 'image.' + ext, { type: inferred });
        }
        var target = asset.kind === 'image' ? assetTargetSize(asset.path) : null;
        if (target) {
            var before = working;
            working = await resizeImageFile(working, target);
            if (working !== before) {
                toast('Resized ' + asset.label + ' to fit ' + assetSizeLabel(asset) + '.');
            }
        }
        var targetValue = String(asset.value || '').trim();
        if (!targetValue) {
            targetValue = defaultAssetFileName(asset, working);
            writePath(state.config || {}, asset.path, targetValue);
        }
        var key = localKey('', targetValue);
        var previous = state.assetOverrides[key];
        if (previous && previous.url) revokeAssetUrl(previous.url);
        var url = URL.createObjectURL(working);
        state.assetUrls.push(url);
        state.assetOverrides[key] = {
            blob: working,
            url: url,
            name: working.name || 'clipboard-image.png',
            size: working.size,
            type: working.type
        };
        if (asset.path === 'themeCover') state.meta.cover = url;
        markDirty();
        rebuildAssets();
        selectAsset(asset.id);
        remountPreview('Applying ' + fileName(targetValue) + '…');
        toast('Replaced ' + asset.label + '. Save when you are ready.');
    }

    function revokeAssetUrl(url) {
        try {
            URL.revokeObjectURL(url);
        } catch (e) {}
        state.assetUrls = state.assetUrls.filter(function (item) {
            return item !== url;
        });
    }

    function resetAsset(assetId) {
        var asset = state.assetById[assetId];
        if (!asset) return;
        var key = localKey('', asset.value);
        var override = state.assetOverrides[key];
        if (override && override.url) revokeAssetUrl(override.url);
        delete state.assetOverrides[key];
        var base = readPath(state.configBase || {}, asset.path);
        if (base === undefined) deletePath(state.config || {}, asset.path);
        else writePath(state.config || {}, asset.path, base);
        if (asset.path === 'themeCover') state.meta.cover = state.baseCover;
        markDirty();
        rebuildAssets();
        selectAsset(asset.id);
        remountPreview('Restoring ' + asset.label + '…');
    }

    function resetAssetOverrides() {
        if (state.colorPreviewTimer) {
            window.clearTimeout(state.colorPreviewTimer);
            state.colorPreviewTimer = null;
        }
        (state.assetUrls || []).forEach(function (url) {
            try {
                URL.revokeObjectURL(url);
            } catch (e) {}
        });
        state.assetUrls = [];
        state.assetOverrides = Object.create(null);
        state.pendingAssetId = null;
        state.hoverAssetId = null;
    }

    function resetAllAssets() {
        if (!state.config) return;
        resetAssetOverrides();
        state.config = cloneJson(state.configBase);
        state.meta.cover = state.baseCover;
        markDirty();
        rebuildAssets();
        remountPreview('Restoring the original theme…');
        toast('All asset replacements were reset.');
    }

    function remountPreview(label) {
        setLoading(true, label || 'Updating preview…');
        mountPreview().catch(function (err) {
            showPreviewError(err);
        });
    }

    function readClipboardImage() {
        if (!navigator.clipboard || typeof navigator.clipboard.read !== 'function') {
            return Promise.reject(new Error('Clipboard reading is unavailable in this browser.'));
        }
        return navigator.clipboard.read().then(function (items) {
            var item = items.find(function (entry) {
                return entry.types.some(function (type) {
                    return type.indexOf('image/') === 0;
                });
            });
            if (!item) throw new Error('No image is on the clipboard.');
            var type = item.types.find(function (entry) {
                return entry.indexOf('image/') === 0;
            });
            return item.getType(type).then(function (blob) {
                var ext = (type.split('/')[1] || 'png').replace('jpeg', 'jpg');
                return new File([blob], 'clipboard-image.' + ext, { type: type });
            });
        });
    }

    function pasteIntoAsset(assetId) {
        var asset = state.assetById[assetId];
        if (!asset || asset.kind !== 'image') {
            toast('Choose an image asset first.');
            return;
        }
        readClipboardImage()
            .then(function (file) {
                replaceAssetFromFile(asset.id, file);
            })
            .catch(function (err) {
                toast((err && err.message) || 'Could not read the clipboard. Use Ctrl+V / Cmd+V while hovering the row.');
            });
    }

    function clearHoveredAsset() {
        state.hoverAssetId = null;
        each(el.assetList ? el.assetList.querySelectorAll('.is-hovered') : [], function (row) {
            row.classList.remove('is-hovered');
        });
        clearPreviewAssetLink();
    }

    function setHoveredAsset(row) {
        clearHoveredAsset();
        if (!row) return;
        state.hoverAssetId = row.getAttribute('data-asset-id');
        row.classList.add('is-hovered');
        highlightPreviewAsset(state.hoverAssetId);
    }

    function stopAssetAutoScroll() {
        if (state.assetScrollTimer) {
            window.clearInterval(state.assetScrollTimer);
            state.assetScrollTimer = null;
        }
        state.assetDragY = 0;
    }

    function startAssetAutoScroll(list, y) {
        state.assetDragY = y;
        if (state.assetScrollTimer) return;
        state.assetScrollTimer = window.setInterval(function () {
            var rect = list.getBoundingClientRect();
            var edge = 38;
            if (state.assetDragY < rect.top + edge) list.scrollTop -= 14;
            else if (state.assetDragY > rect.bottom - edge) list.scrollTop += 14;
        }, 16);
    }

    function setupAssetListEvents() {
        if (!el.assetList) return;
        el.assetList.addEventListener('click', function (event) {
            var action = event.target.closest('[data-asset-action]');
            var row = event.target.closest('[data-asset-id]');
            if (action && row) {
                event.preventDefault();
                event.stopPropagation();
                var id = row.getAttribute('data-asset-id');
                if (action.getAttribute('data-asset-action') === 'import') openAssetPicker(id);
                else pasteIntoAsset(id);
                return;
            }
            if (row) selectAsset(row.getAttribute('data-asset-id'));
        });
        el.assetList.addEventListener('keydown', function (event) {
            var row = event.target.closest('[data-asset-id]');
            if (!row || event.target.closest('button')) return;
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                selectAsset(row.getAttribute('data-asset-id'));
            }
        });
        el.assetList.addEventListener('pointerover', function (event) {
            var row = event.target.closest('[data-asset-id]');
            if (row) setHoveredAsset(row);
        });
        el.assetList.addEventListener('pointerleave', clearHoveredAsset);
        el.assetList.addEventListener('focusin', function (event) {
            var row = event.target.closest('[data-asset-id]');
            if (row) setHoveredAsset(row);
        });
        el.assetList.addEventListener('focusout', function (event) {
            if (!event.relatedTarget || !event.relatedTarget.closest || !event.relatedTarget.closest('[data-asset-id]')) {
                clearHoveredAsset();
            }
        });

        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(function (type) {
            el.assetList.addEventListener(type, function (event) {
                if (!hasFilePayload(event)) return;
                event.preventDefault();
                event.stopPropagation();
                hideDrop();
                if (type === 'dragleave') {
                    if (!el.assetList.contains(event.relatedTarget)) stopAssetAutoScroll();
                    return;
                }
                if (type === 'drop') {
                    stopAssetAutoScroll();
                    var row = event.target.closest('[data-asset-id]');
                    var file = event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files[0];
                    if (row && file) {
                        setHoveredAsset(row);
                        replaceAssetFromFile(row.getAttribute('data-asset-id'), file);
                    }
                    return;
                }
                var hovered = event.target.closest('[data-asset-id]');
                if (hovered) setHoveredAsset(hovered);
                if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy';
                startAssetAutoScroll(el.assetList, event.clientY);
            });
        });

        each(document.querySelectorAll('[data-asset-filter]'), function (btn) {
            btn.addEventListener('click', function () {
                setAssetFilter(btn.getAttribute('data-asset-filter'));
            });
        });
        if (el.assetReplace) {
            el.assetReplace.addEventListener('click', function () {
                if (state.selectedAssetId) openAssetPicker(state.selectedAssetId);
            });
        }
        if (el.assetPaste) {
            el.assetPaste.addEventListener('click', function () {
                if (state.selectedAssetId) pasteIntoAsset(state.selectedAssetId);
            });
        }
        if (el.assetReset) {
            el.assetReset.addEventListener('click', function () {
                if (state.selectedAssetId) resetAsset(state.selectedAssetId);
            });
        }
        if (el.browseFont) {
            el.browseFont.addEventListener('click', function () {
                var font = state.assets.find(function (asset) {
                    return asset.kind === 'font';
                });
                if (font) openAssetPicker(font.id);
                else {
                    setAssetFilter('all');
                    toast('This theme does not declare a font file.');
                }
            });
        }
        if (el.resetAssets) {
            el.resetAssets.addEventListener('click', function () {
                if (!Object.keys(state.assetOverrides).length) {
                    toast('There are no replacements to reset.');
                    return;
                }
                if (window.confirm('Reset every asset replacement in this theme?')) resetAllAssets();
            });
        }
        if (el.assetInput) {
            el.assetInput.addEventListener('change', function () {
                var file = el.assetInput.files && el.assetInput.files[0];
                var id = state.pendingAssetId;
                el.assetInput.value = '';
                state.pendingAssetId = null;
                if (file && id) replaceAssetFromFile(id, file);
            });
        }
        document.addEventListener('paste', function (event) {
            if (state.mode !== 'edit') return;
            var active = document.activeElement;
            if (active && /^(INPUT|TEXTAREA|SELECT)$/.test(active.tagName)) return;
            if (active && active.isContentEditable) return;
            var targetId = state.hoverAssetId || state.selectedAssetId;
            if (!targetId) return;
            var asset = state.assetById[targetId];
            if (!asset || asset.kind !== 'image') return;
            var items = event.clipboardData && event.clipboardData.items ? Array.prototype.slice.call(event.clipboardData.items) : [];
            var imageItem = items.find(function (item) {
                return item.kind === 'file' && /^image\//.test(item.type);
            });
            if (!imageItem) return;
            var file = imageItem.getAsFile();
            if (!file) return;
            event.preventDefault();
            replaceAssetFromFile(targetId, file);
        });
        window.addEventListener('dragend', stopAssetAutoScroll);
        window.addEventListener('drop', stopAssetAutoScroll);
    }

    /* —— Listing form —— */

    function normalizeAuthor(value) {
        return String(value || '')
            .trim()
            .toLowerCase()
            .replace(/^u\//, '')
            .replace(/^@/, '')
            .replace(/\s+/g, ' ');
    }

    function normalizeTitle(value) {
        return String(value || '')
            .trim()
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '');
    }

    function populateAuthorOptions() {
        if (!el.authorOptions) return;
        var seen = Object.create(null);
        var authors = [];
        state.gallery.forEach(function (theme) {
            var author = String(theme.author || '').trim();
            var key = normalizeAuthor(author);
            if (!key || seen[key]) return;
            seen[key] = true;
            authors.push(author);
        });
        authors.sort(function (a, b) {
            return a.localeCompare(b);
        });
        el.authorOptions.innerHTML = '';
        authors.slice(0, 500).forEach(function (author) {
            el.authorOptions.appendChild(new Option(author, author));
        });
    }

    function matchingListing() {
        var author = normalizeAuthor(el.submitAuthor.value);
        var title = normalizeTitle(el.submitTitle.value);
        if (!author || !title) return null;
        return (
            state.gallery.find(function (theme) {
                return normalizeAuthor(theme.author) === author && normalizeTitle(theme.name) === title;
            }) || null
        );
    }

    function updateUpdateNotice() {
        if (!el.updateNotice) return;
        var match = matchingListing();
        var sameLoadedGallery = state.sourceType === 'gallery' && state.folder && match && match.folder === state.folder;
        if (!match || sameLoadedGallery) {
            el.updateNotice.hidden = true;
            if (el.editAck) el.editAck.checked = false;
            return;
        }
        el.updateNotice.hidden = false;
        el.updateFolder.textContent = match.folder;
    }

    function syncPolicy() {
        if (!el.policyBanner) return;
        var policy = null;
        if (window.ThemeAuthorPolicy && typeof window.ThemeAuthorPolicy.uploadPolicyForAuthor === 'function') {
            policy = window.ThemeAuthorPolicy.uploadPolicyForAuthor(el.submitAuthor.value);
        }
        state.pendingPolicy = policy;
        if (!policy || !policy.level) {
            el.policyBanner.hidden = true;
            el.policyBanner.textContent = '';
            el.policyBanner.className = 'studio-policy-banner';
            return;
        }
        el.policyBanner.hidden = false;
        el.policyBanner.textContent = policy.message || 'This author cannot submit to the public gallery.';
        el.policyBanner.className = 'studio-policy-banner is-' + policy.level;
    }

    /* —— Package, save and submit —— */

    function collectConfigAssetValues(config) {
        var seen = Object.create(null);
        var values = [];
        function walk(node) {
            if (!node || typeof node !== 'object') return;
            if (Array.isArray(node)) {
                node.forEach(walk);
                return;
            }
            Object.keys(node).forEach(function (key) {
                var value = node[key];
                if (typeof value === 'string') {
                    if (!isThemeAssetValue(value)) return;
                    var clean = value.trim();
                    var k = clean.toLowerCase();
                    if (seen[k]) return;
                    seen[k] = true;
                    values.push(clean);
                    return;
                }
                walk(value);
            });
        }
        walk(config);
        return values;
    }

    function blobForAssetValue(value) {
        var key = localKey('', value);
        var override = state.assetOverrides[key];
        if (override && override.blob) return Promise.resolve(override.blob);
        if (state.sourceType === 'local') {
            var local = state.localFileMap[key];
            if (local) return Promise.resolve(local);
            return Promise.reject(new Error('Missing file: ' + value));
        }
        if (state.sourceType === 'gallery') {
            return fetch(galleryFileUrl(state.folder, value), { cache: 'no-store' }).then(function (res) {
                if (!res.ok) throw new Error('Could not read ' + value + ' (' + res.status + ').');
                return res.blob();
            });
        }
        return Promise.reject(new Error('No theme package is open.'));
    }

    function syncConfigMetadata(config, title, author) {
        if (!config.theme_info || typeof config.theme_info !== 'object' || Array.isArray(config.theme_info)) {
            config.theme_info = {};
        }
        var info = config.theme_info;
        info.title = String(title || '').trim();
        info.author = String(author || '').trim();
        var authorUrl = el.submitAuthorUrl.value.trim();
        var desc = el.submitDesc.value.trim();
        var external = el.submitExternal.checked ? el.submitExternalUrl.value.trim() : '';
        if (authorUrl) info.authorUrl = authorUrl;
        else delete info.authorUrl;
        if (desc) info.description = desc;
        else delete info.description;
        if (external) info.externalDownloadUrl = external;
        else delete info.externalDownloadUrl;
    }

    async function buildThemePackage(reportProgress) {
        if (!state.config) throw new Error('Open a theme first.');
        if (!window.JSZip) throw new Error('The ZIP builder did not load.');
        if (!window.ThemePackaging) throw new Error('The theme packager did not load.');
        var report = typeof reportProgress === 'function' ? reportProgress : null;
        function reportPercent(percent, label) {
            if (report) report(percent, label);
        }
        var title = el.submitTitle.value.trim() || state.meta.name || 'Untitled theme';
        var author = el.submitAuthor.value.trim();
        var stem = safeStem(title);
        var config = cloneJson(state.config);
        syncConfigMetadata(config, title, author);
        reportPercent(2, 'Preparing theme…');

        var entries = [];
        var blobs = Object.create(null);
        var seenPaths = Object.create(null);
        var totalAssets = 0;
        var readAssets = 0;
        function reportAsset(path) {
            readAssets += 1;
            if (!report || !totalAssets) return;
            reportPercent(
                4 + (readAssets / totalAssets) * 30,
                'Reading ' + (fileName(path) || 'asset') + ' · ' + readAssets + '/' + totalAssets
            );
        }

        if (state.sourceType === 'local') {
            totalAssets = state.localFiles.length;
            state.localFiles.forEach(function (entry) {
                var path = entry.path;
                var key = path.toLowerCase();
                if (seenPaths[key]) return;
                seenPaths[key] = true;
                entries.push({ path: path, download_url: path });
                blobs[key] = entry.blob;
                reportAsset(path);
            });
        } else {
            var values = collectConfigAssetValues(config);
            totalAssets = values.length;
            for (var i = 0; i < values.length; i += 1) {
                var value = values[i];
                var valueKey = value.toLowerCase();
                if (seenPaths[valueKey]) continue;
                seenPaths[valueKey] = true;
                var blob = await blobForAssetValue(value);
                entries.push({ path: value, download_url: value });
                blobs[valueKey] = blob;
                reportAsset(value);
            }
        }

        reportPercent(35, 'Compressing theme…');
        var manifest = window.ThemePackaging.buildPackManifest(entries, '', '', config);
        var outputConfig =
            manifest.mode === 'flat'
                ? window.ThemePackaging.rewriteConfigForDeviceFlatPack(config, '', manifest.logicalToDevice)
                : config;
        var zip = new window.JSZip();
        zip.file(stem + '/config.json', JSON.stringify(outputConfig, null, 2));
        manifest.items.forEach(function (item) {
            if (String(item.devicePath || '').toLowerCase() === 'config.json') return;
            var blob =
                blobs[String(item.logicalPath || '').toLowerCase()] ||
                blobs[String(item.resolved || '').toLowerCase()] ||
                blobs[String(item.download_url || '').toLowerCase()];
            if (!blob) throw new Error('Missing file for ' + item.logicalPath + '.');
            zip.file(stem + '/' + item.devicePath, blob);
        });
        var zipBlob = await zip.generateAsync(
            {
                type: 'blob',
                compression: 'DEFLATE',
                compressionOptions: { level: 9 },
                streamFiles: true
            },
            function (metadata) {
                reportPercent(35 + (metadata.percent || 0) * 0.65, 'Compressing theme…');
            }
        );
        reportPercent(100, 'Download ready');
        return new File([zipBlob], stem + '.zip', { type: 'application/zip' });
    }

    async function wrapUploadBatch(file, stem) {
        if (!window.JSZip) throw new Error('The ZIP builder did not load.');
        var innerName = (file.name || 'theme.zip').replace(/[^\w.\-()+[\] ]+/g, '_');
        if (!/\.zip$/i.test(innerName)) innerName += '.zip';
        var outer = new window.JSZip();
        outer.file(innerName, await file.arrayBuffer());
        var blob = await outer.generateAsync({ type: 'blob', compression: 'STORE' });
        return new File([blob], safeStem(stem) + '.zip', { type: 'application/zip' });
    }

    function downloadBlob(file) {
        var url = URL.createObjectURL(file);
        var link = document.createElement('a');
        link.href = url;
        link.download = file.name || 'theme.zip';
        link.rel = 'noopener';
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.setTimeout(function () {
            try {
                URL.revokeObjectURL(url);
            } catch (e) {}
        }, 15000);
    }

    function setSaveProgress(percent, label) {
        if (!el.saveProgress) return;
        if (saveProgressTimer) {
            window.clearTimeout(saveProgressTimer);
            saveProgressTimer = null;
        }
        var value = Math.max(0, Math.min(100, Math.round(Number(percent) || 0)));
        el.saveProgress.hidden = false;
        if (label) el.saveProgressLabel.textContent = label;
        el.saveProgressValue.textContent = value + '%';
        if (el.saveProgressBar) {
            el.saveProgressBar.value = value;
            el.saveProgressBar.textContent = value + '%';
        }
    }

    function hideSaveProgress(delay) {
        if (saveProgressTimer) window.clearTimeout(saveProgressTimer);
        saveProgressTimer = window.setTimeout(function () {
            if (el.saveProgress) el.saveProgress.hidden = true;
            saveProgressTimer = null;
        }, delay || 0);
    }

    function setBusy(on, action) {
        state.busy = !!on;
        if (el.save) {
            el.save.disabled = !!on || !state.meta;
            var saveText = el.save.querySelector('span');
            if (saveText) saveText.textContent = on && action === 'save' ? 'Building ZIP…' : saveTarget.label;
        }
        if (el.submitBtn) {
            el.submitBtn.disabled = !!on || !state.meta;
            var submitText = el.submitBtn.querySelector('span');
            if (submitText) submitText.textContent = on && action === 'submit' ? 'Sending theme…' : 'Send my theme';
        }
    }

    function setSubmitStatus(message, ok, linkUrl) {
        if (!el.submitStatus) return;
        el.submitStatus.innerHTML = '';
        el.submitStatus.className = 'studio-submit-status' + (ok ? ' is-ok' : ' is-error');
        var text = document.createElement('span');
        text.textContent = message;
        el.submitStatus.appendChild(text);
        if (linkUrl) {
            var link = document.createElement('a');
            link.href = linkUrl;
            link.target = '_blank';
            link.rel = 'noopener';
            link.textContent = 'View pull request';
            el.submitStatus.appendChild(link);
        }
    }

    async function saveTheme() {
        if (state.busy) return;
        if (!state.config) {
            toast('Open a theme first.');
            return;
        }
        setBusy(true, 'save');
        setSaveProgress(0, 'Preparing theme…');
        try {
            var file = await buildThemePackage(setSaveProgress);
            downloadBlob(file);
            setSaveProgress(100, 'Download started');
            hideSaveProgress(2400);
            state.dirty = false;
            state.formDirty = false;
            if (el.unsaved) el.unsaved.hidden = true;
            toast('Saved ' + file.name + '. Copy it to your player’s theme folder to install.');
        } catch (err) {
            hideSaveProgress(0);
            toast((err && err.message) || 'Could not build that theme ZIP.');
        } finally {
            setBusy(false);
        }
    }

    async function submitTheme() {
        if (state.busy) return;
        if (!state.config || !state.previewOk) {
            toast('Wait for the theme preview to render first.');
            return;
        }
        var title = el.submitTitle.value.trim();
        var author = el.submitAuthor.value.trim();
        if (!title || !author) {
            toast('Enter your own title and author — the suggested text in the fields does not count.');
            if (!title) el.submitTitle.focus();
            else el.submitAuthor.focus();
            return;
        }
        if (!state.ownUpdate) {
            /* Someone typing a title and author that already belong to a listing is
               about to file an update, not a new theme. Make them say so on purpose. */
            var clash = matchingListing();
            if (clash) {
                var clashIsLoaded = state.sourceType === 'gallery' && state.folder && clash.folder === state.folder;
                if (clashIsLoaded) {
                    toast('Those are the open theme\u2019s details. Tick the author update box if it is your theme.');
                    openOwnModal();
                } else {
                    toast(
                        '\u201c' +
                            (clash.name || title) +
                            '\u201d is already listed for ' +
                            (clash.author || 'another author') +
                            '. Use your own title and author, or open that theme to update it.'
                    );
                }
                return;
            }
        }
        syncPolicy();
        if (state.pendingPolicy && state.pendingPolicy.level === 'block') {
            setSubmitStatus(state.pendingPolicy.message, false);
            toast('This author cannot submit to the public gallery.');
            return;
        }
        var missing = state.assets.filter(function (asset) {
            return asset.localMissing;
        });
        if (missing.length) {
            setAssetFilter('missing');
            setMode('edit');
            toast('Replace the missing files before submitting.');
            return;
        }
        if (el.submitExternal.checked) {
            var external = el.submitExternalUrl.value.trim();
            if (!/^https?:\/\//i.test(external)) {
                toast('Add a full http(s) link for the external download.');
                el.submitExternalUrl.focus();
                return;
            }
        }
        if (!el.updateNotice.hidden && el.editAck && !el.editAck.checked) {
            toast('Confirm that this is an update to the existing listing.');
            el.editAck.focus();
            return;
        }

        setBusy(true, 'submit');
        setSubmitStatus('Building your package…', true);
        try {
            var file = await buildThemePackage();
            var stem = safeStem(title);
            var batch = await wrapUploadBatch(file, stem);
            setSubmitStatus('Sending your theme for review…', true);
            var form = new FormData();
            form.set('zip', batch, batch.name);
            form.set('themeTitle', title);
            form.set('themeAuthor', author);
            form.set('submissionIntent', state.ownUpdate ? 'update' : 'new');
            form.set('shareFolderHints', JSON.stringify([stem]));
            var response = await fetch(UPLOAD_ORIGIN + '/api/upload-theme', { method: 'POST', body: form });
            var payload = await response.json().catch(function () {
                return {};
            });
            if (!response.ok) throw new Error(payload.error || payload.message || 'Upload failed (' + response.status + ').');
            var prUrl = payload.prUrl ? String(payload.prUrl) : '';
            setSubmitStatus(
                state.ownUpdate
                    ? 'Received. Your update waits for a maintainer: updates are reviewed and never published automatically.'
                    : prUrl
                      ? 'Received. Your theme is waiting for review in a pull request.'
                      : 'Received. A maintainer will review your theme before it goes live.',
                true,
                prUrl
            );
            state.dirty = false;
            state.formDirty = false;
            if (el.unsaved) el.unsaved.hidden = true;
            toast('Theme submitted for review.');
        } catch (err) {
            var message = (err && err.message) || 'The upload did not complete.';
            setSubmitStatus(message, false);
            toast(message);
        } finally {
            setBusy(false);
        }
    }

    /* —— PWA plumbing: installation stays in the browser's own UI —— */

    function setupPwa() {
        if ('serviceWorker' in navigator && location.protocol !== 'file:') {
            window.addEventListener('load', function () {
                var manifest = document.querySelector('link[rel="manifest"]');
                var swUrl = manifest ? new URL('sw.js', manifest.href).toString() : '/studio-test/sw.js';
                var swScope = manifest ? new URL('./', manifest.href).pathname : '/studio-test/';
                navigator.serviceWorker.register(swUrl, { scope: swScope }).catch(function (err) {
                    console.warn('Studio: service worker unavailable', err);
                });
            });
        }
        function paintThemeColor() {
            var meta = document.querySelector('meta[name="theme-color"]');
            if (!meta) return;
            var accent = getComputedStyle(document.documentElement).getPropertyValue('--site-accent').trim();
            if (accent) meta.setAttribute('content', accent);
        }
        paintThemeColor();
        document.addEventListener('innioasis-accent-change', paintThemeColor);
    }

    /* —— Submit details: suggestions stay in placeholders —— */

    function setPlaceholder(field, value) {
        if (!field) return;
        var text = String(value || '').trim();
        if (!text) return;
        field.placeholder = text;
        field.title = 'From the open theme: ' + text;
    }

    function clearSubmitFields() {
        [el.submitTitle, el.submitAuthor, el.submitDesc, el.submitAuthorUrl, el.submitExternalUrl].forEach(function (field) {
            if (field) field.value = '';
        });
        if (el.submitExternal) el.submitExternal.checked = false;
        if (el.submitExternalWrap) el.submitExternalWrap.hidden = true;
    }

    function applyOwnDetails() {
        if (!state.meta) return;
        var meta = state.meta;
        if (el.submitTitle) el.submitTitle.value = meta.name || '';
        if (el.submitAuthor) el.submitAuthor.value = meta.author || '';
        if (el.submitDesc) el.submitDesc.value = meta.desc || '';
        if (el.submitAuthorUrl) el.submitAuthorUrl.value = meta.authorUrl || '';
        if (meta.externalDownloadUrl) {
            el.submitExternal.checked = true;
            el.submitExternalWrap.hidden = false;
            el.submitExternalUrl.value = meta.externalDownloadUrl;
        }
        state.formDirty = true;
    }

    function syncOwnUpdateUi() {
        var on = !!state.ownUpdate;
        if (el.submitOwn) {
            el.submitOwn.checked = on;
            var canUpdate = state.sourceType === 'gallery' && !!state.meta;
            el.submitOwn.disabled = !canUpdate;
            var row = el.submitOwn.closest('.studio-own-check');
            if (row) row.hidden = !canUpdate;
        }
        if (el.ownCheckTarget) {
            var name = state.meta && state.meta.name ? '\u201c' + state.meta.name + '\u201d' : '';
            el.ownCheckTarget.textContent = name;
            el.ownCheckTarget.hidden = !name;
        }
        if (el.ownNote) el.ownNote.hidden = !on;
    }

    function openOwnModal() {
        if (!el.ownModal) return false;
        var name = state.meta && state.meta.name ? '\u201c' + state.meta.name + '\u201d' : 'the existing listing';
        if (el.ownModalTheme) el.ownModalTheme.textContent = name;
        if (el.ownModalAck) el.ownModalAck.checked = false;
        if (el.ownModalConfirm) el.ownModalConfirm.disabled = true;
        el.ownModal.hidden = false;
        if (el.ownModalAck) el.ownModalAck.focus();
        return true;
    }

    function closeOwnModal() {
        if (el.ownModal) el.ownModal.hidden = true;
    }

    function setOwnUpdate(on) {
        state.ownUpdate = !!on;
        if (on) applyOwnDetails();
        else clearSubmitFields();
        syncOwnUpdateUi();
        updateUpdateNotice();
        updateChecklist();
        markDirty();
    }

    function fillSubmitForm() {
        if (!state.meta) return;
        state.formDirty = false;
        state.ownUpdate = false;
        /* The open theme's details are only ever suggestions: they show as
           placeholder text and vanish the moment someone types, so a new upload
           cannot inherit another listing's title, author or description. They
           become real values only after the author-update box is confirmed. */
        setPlaceholder(el.submitTitle, state.meta.name);
        setPlaceholder(el.submitAuthor, state.meta.author);
        setPlaceholder(el.submitDesc, state.meta.desc);
        setPlaceholder(el.submitAuthorUrl, state.meta.authorUrl);
        setPlaceholder(el.submitExternalUrl, state.meta.externalDownloadUrl);
        clearSubmitFields();
        if (el.editAck) el.editAck.checked = false;
        closeOwnModal();
        populateAuthorOptions();
        syncOwnUpdateUi();
        updateUpdateNotice();
        syncPolicy();
        updateChecklist();
    }

    function setCheck(name, ok, detail) {
        var item = el.checklist.querySelector('[data-check="' + name + '"]');
        if (!item) return;
        item.setAttribute('data-state', ok ? 'ok' : 'pending');
        var detailEl = item.querySelector('.studio-check-detail');
        if (detailEl) detailEl.textContent = detail;
    }

    function updateChecklist() {
        var configOk = !!state.config;
        setCheck('config', configOk, configOk ? 'config.json loaded' : 'Waiting for a theme');
        setCheck(
            'preview',
            state.previewOk,
            state.previewOk ? 'The Y1 preview rendered' : state.loading ? 'Rendering preview…' : 'Preview has not rendered yet'
        );
        var title = el.submitTitle.value.trim();
        var author = el.submitAuthor.value.trim();
        var detailsOk = !!(title && author);
        setCheck('details', detailsOk, detailsOk ? 'Title and author are ready' : 'Add a title and author');
        var referenced = state.assets.filter(function (asset) {
            return !!asset.value;
        });
        var missing = referenced.filter(function (asset) {
            return !!asset.localMissing;
        });
        var assetsOk = configOk && !missing.length;
        setCheck(
            'assets',
            assetsOk,
            !configOk
                ? 'Waiting for a theme'
                : missing.length
                  ? missing.length + (missing.length === 1 ? ' referenced file is missing' : ' referenced files are missing')
                  : referenced.length
                    ? referenced.length + ' referenced files found'
                    : 'No referenced files'
        );
    }

    /* —— Loading, empty state and toast —— */

    function setLoading(on, label) {
        state.loading = !!on;
        el.previewArea.classList.toggle('is-loading', !!on);
        el.previewLoading.hidden = !on;
        if (label) el.loadingLabel.textContent = label;
        updateChecklist();
    }

    function setLoadingLabel(label) {
        if (label) el.loadingLabel.textContent = label;
    }

    function hideEmpty() {
        el.empty.hidden = true;
        el.preview.hidden = false;
    }

    function showEmpty(title, text) {
        el.emptyTitle.textContent = title;
        el.emptyText.textContent = text;
        el.empty.hidden = false;
        el.preview.hidden = true;
    }

    function showPreviewError(err) {
        state.previewOk = false;
        setLoading(false);
        var message = (err && err.message) || 'The theme preview did not load.';
        showEmpty('Could not open this theme', message);
        toast(message);
        updateChecklist();
    }

    function toast(message) {
        if (!el.toast) return;
        el.toast.textContent = message;
        el.toast.classList.add('is-visible');
        clearTimeout(toastTimer);
        toastTimer = setTimeout(function () {
            el.toast.classList.remove('is-visible');
        }, 4200);
    }

    /* —— Local ZIP / folder import —— */

    function clearLocalState() {
        state.objectUrls.forEach(function (url) {
            try {
                URL.revokeObjectURL(url);
            } catch (e) {}
        });
        state.objectUrls = [];
        state.localMap = null;
        state.localFiles = [];
        state.localFileMap = Object.create(null);
    }

    function importZip(file) {
        if (!file) return;
        if (!confirmReplace('the ZIP “' + file.name + '”')) return;
        if (!window.JSZip) {
            toast('The ZIP reader did not load. Use "Open folder" instead.');
            return;
        }
        setLoading(true, 'Reading ' + file.name + '…');
        hideEmpty();
        var entries = [];
        window.JSZip.loadAsync(file)
            .then(function (zip) {
                var names = Object.keys(zip.files).filter(function (name) {
                    var entry = zip.files[name];
                    return (
                        entry &&
                        !entry.dir &&
                        name.charAt(0) !== '.' &&
                        !/(^|\/)__MACOSX(\/|$)/.test(name)
                    );
                });
                var chain = Promise.resolve();
                names.forEach(function (name, index) {
                    chain = chain.then(function () {
                        if (index % 12 === 0) {
                            setLoadingLabel('Reading ' + file.name + ' · ' + index + '/' + names.length);
                        }
                        return zip.files[name].async('blob').then(function (blob) {
                            entries.push({ path: name.replace(/\\/g, '/'), blob: blob });
                        });
                    });
                });
                return chain;
            })
            .then(function () {
                return openLocalEntries(entries, file.name.replace(/\.zip$/i, ''));
            })
            .catch(function (err) {
                setLoading(false);
                toast((err && err.message) || 'Could not read that ZIP.');
            });
    }

    function importFolderFiles(fileList) {
        var files = Array.prototype.slice.call(fileList || []);
        if (!files.length) return;
        if (!confirmReplace('a local theme folder')) return;
        var entries = files.map(function (file) {
            return {
                path: String(file.webkitRelativePath || file.name).replace(/\\/g, '/'),
                blob: file
            };
        });
        var fallback = entries[0].path.split('/')[0] || 'Local theme';
        openLocalEntries(entries, fallback);
    }

    async function openLocalEntries(entries, fallbackName) {
        if (!entries || !entries.length) {
            toast('No theme files were found.');
            return;
        }
        setLoading(true, 'Preparing preview…');
        hideEmpty();

        var prepared;
        try {
            prepared = await prepareLocalEntries(entries, fallbackName);
        } catch (err) {
            setLoading(false);
            toast((err && err.message) || 'Could not read that package.');
            if (!state.previewOk) {
                showEmpty('Could not open that package', (err && err.message) || 'No preview was produced.');
            }
            return;
        }

        if (window.Y1ThemePreview && typeof window.Y1ThemePreview.unmount === 'function') {
            window.Y1ThemePreview.unmount(el.preview);
        }
        clearLocalState();
        state.objectUrls = prepared.urls;
        state.localMap = prepared.map;
        state.localFiles = prepared.files;
        state.localFileMap = Object.create(null);
        prepared.files.forEach(function (entry) {
            state.localFileMap[entry.path.toLowerCase()] = entry.blob;
        });
        state.config = prepared.config;
        state.configBase = cloneJson(prepared.config);
        state.sourceType = 'local';
        state.folder = null;
        state.compactExpanded = false;
        bootModeRequest = null;
        state.meta = {
            name: prepared.name,
            author: prepared.author,
            authorUrl: prepared.authorUrl || '',
            desc: prepared.desc,
            externalDownloadUrl: prepared.externalDownloadUrl || '',
            cover: prepared.cover,
            fileCount: prepared.fileCount,
            bytes: prepared.bytes
        };
        state.baseCover = prepared.cover;
        state.previewOk = false;
        state.formDirty = false;
        state.dirty = false;
        state.swapOpen = false;
        resetAssetOverrides();
        rebuildAssets();
        hideEmpty();
        updateChrome();
        fillSubmitForm();
        updateChecklist();
        setMode('preview');
        syncUrl();

        try {
            await mountPreview();
            toast('Opened ' + prepared.name + ' locally.');
        } catch (err) {
            showPreviewError(err);
        }
    }

    async function prepareLocalEntries(entries, fallbackName) {
        var clean = [];
        entries.forEach(function (entry) {
            if (!entry || !entry.blob) return;
            var path = String(entry.path || '')
                .replace(/\\/g, '/')
                .replace(/^\.\/+/, '')
                .replace(/^\/+/, '');
            if (!path || /(^|\/)__MACOSX(\/|$)/.test(path)) return;
            clean.push({ path: path, blob: entry.blob });
        });
        if (!clean.length) throw new Error('No theme files were found.');

        var rootInfo = findThemeRoot(clean);
        if (!rootInfo) throw new Error('No config.json was found in this package.');

        var root = rootInfo.root;
        var text = await rootInfo.config.blob.text();
        text = text.replace(/^\uFEFF/, '');
        var config;
        try {
            config = JSON.parse(text);
        } catch (e) {
            throw new Error('config.json is not valid JSON.');
        }
        if (!config || typeof config !== 'object' || Array.isArray(config)) {
            throw new Error('config.json is not a theme config.');
        }

        var scoped = [];
        clean.forEach(function (entry) {
            if (root && entry.path.indexOf(root) !== 0) return;
            var relative = root ? entry.path.slice(root.length) : entry.path;
            if (!relative) return;
            scoped.push({ path: relative, blob: entry.blob });
        });
        if (!scoped.length) throw new Error('The theme folder is empty.');

        var map = Object.create(null);
        var urls = [];
        scoped.forEach(function (entry) {
            var key = entry.path.toLowerCase();
            if (map[key]) return;
            var url = URL.createObjectURL(entry.blob);
            map[key] = url;
            urls.push(url);
        });

        var info = config.theme_info && typeof config.theme_info === 'object' ? config.theme_info : {};
        var name = String(info.title || config.title || '').trim() || guessThemeName(root, fallbackName);
        var author = String(info.author || config.author || '').trim();
        var desc = String(info.description || config.description || '').trim();
        var authorUrl = String(info.authorUrl || '').trim();
        var externalDownloadUrl = String(info.externalDownloadUrl || '').trim();
        var coverRel = String(config.themeCover || config.desktopWallpaper || config.globalWallpaper || '').trim();
        var cover = coverRel ? map[localKey('', coverRel)] || '' : '';
        var bytes = scoped.reduce(function (total, entry) {
            return total + (entry.blob && entry.blob.size ? entry.blob.size : 0);
        }, 0);

        return {
            config: config,
            map: map,
            urls: urls,
            files: scoped,
            name: name,
            author: author,
            authorUrl: authorUrl,
            desc: desc,
            externalDownloadUrl: externalDownloadUrl,
            cover: cover,
            fileCount: scoped.length,
            bytes: bytes
        };
    }

    function findThemeRoot(entries) {
        var configs = entries.filter(function (entry) {
            return /(^|\/)config\.json$/i.test(entry.path);
        });
        if (!configs.length) return null;
        configs.sort(function (a, b) {
            return configScore(a.path) - configScore(b.path);
        });
        var chosen = configs[0];
        var index = chosen.path.lastIndexOf('/');
        return {
            config: chosen,
            root: index === -1 ? '' : chosen.path.slice(0, index + 1)
        };
    }

    function configScore(path) {
        var value = '/' + String(path || '').replace(/\\/g, '/');
        var score = value.split('/').length;
        if (/\/_share\//i.test(value)) score += 100;
        if (/\/Variants\//i.test(value)) score += 20;
        if (/\/__MACOSX\//i.test(value)) score += 500;
        return score;
    }

    function guessThemeName(root, fallbackName) {
        var fromRoot = String(root || '')
            .replace(/\/+$/, '')
            .split('/')
            .filter(Boolean)
            .pop();
        return fromRoot || String(fallbackName || '').trim() || 'Untitled theme';
    }

    function formatBytes(bytes) {
        var value = Number(bytes) || 0;
        if (value < 1024) return value + ' B';
        if (value < 1024 * 1024) return (value / 1024).toFixed(1) + ' KB';
        return (value / (1024 * 1024)).toFixed(1) + ' MB';
    }

    function fileCountLabel(count) {
        var value = Number(count) || 0;
        return value + (value === 1 ? ' file' : ' files');
    }

    /* —— Drag and drop —— */

    function hasFilePayload(event) {
        var dt = event.dataTransfer;
        if (!dt) return false;
        if (dt.types && dt.types.length) {
            for (var i = 0; i < dt.types.length; i += 1) {
                if (dt.types[i] === 'Files') return true;
            }
            return false;
        }
        return !!(dt.files && dt.files.length);
    }

    function showDrop() {
        el.drop.classList.add('is-visible');
        el.drop.setAttribute('aria-hidden', 'false');
    }

    function hideDrop() {
        el.drop.classList.remove('is-visible');
        el.drop.setAttribute('aria-hidden', 'true');
    }

    function onDrop(event) {
        event.preventDefault();
        dragDepth = 0;
        hideDrop();
        var dt = event.dataTransfer;
        if (!dt) return;

        var items = dt.items ? Array.prototype.slice.call(dt.items) : [];
        var entries = [];
        items.forEach(function (item) {
            if (item.kind !== 'file' || typeof item.webkitGetAsEntry !== 'function') return;
            var entry = item.webkitGetAsEntry();
            if (entry) entries.push(entry);
        });

        if (entries.length === 1 && entries[0].isFile && /\.zip$/i.test(entries[0].name)) {
            entries[0].file(
                function (file) {
                    importZip(file);
                },
                function () {
                    toast('Could not read that ZIP.');
                }
            );
            return;
        }

        if (
            entries.some(function (entry) {
                return entry.isDirectory;
            })
        ) {
            collectDroppedEntries(entries)
                .then(function (list) {
                    return openLocalEntries(list, 'Dropped theme');
                })
                .catch(function (err) {
                    toast((err && err.message) || 'Could not read that folder.');
                });
            return;
        }

        var files = dt.files ? Array.prototype.slice.call(dt.files) : [];
        if (files.length === 1 && /\.zip$/i.test(files[0].name)) {
            importZip(files[0]);
            return;
        }
        if (files.length) {
            openLocalEntries(
                files.map(function (file) {
                    return { path: file.name, blob: file };
                }),
                'Dropped theme'
            );
        }
    }

    function collectDroppedEntries(entries) {
        return Promise.all(
            entries.map(function (entry) {
                return walkEntry(entry, '');
            })
        ).then(function (groups) {
            var all = [];
            groups.forEach(function (group) {
                all = all.concat(group);
            });
            return all;
        });
    }

    function walkEntry(entry, base) {
        return new Promise(function (resolve, reject) {
            if (entry.isFile) {
                entry.file(
                    function (file) {
                        resolve([{ path: String(base + file.name).replace(/\\/g, '/'), blob: file }]);
                    },
                    reject
                );
                return;
            }
            if (!entry.isDirectory) {
                resolve([]);
                return;
            }
            readAllEntries(entry.createReader())
                .then(function (children) {
                    return Promise.all(
                        children.map(function (child) {
                            return walkEntry(child, base + entry.name + '/');
                        })
                    );
                })
                .then(function (groups) {
                    var out = [];
                    groups.forEach(function (group) {
                        out = out.concat(group);
                    });
                    resolve(out);
                })
                .catch(reject);
        });
    }

    function readAllEntries(reader) {
        return new Promise(function (resolve, reject) {
            var all = [];
            function next() {
                reader.readEntries(function (batch) {
                    if (!batch.length) {
                        resolve(all);
                        return;
                    }
                    all = all.concat(Array.prototype.slice.call(batch));
                    next();
                }, reject);
            }
            next();
        });
    }

    /* —— Events —— */

    function bindEvents() {
        setupAssetListEvents();
        setupPreviewAssetFocus();
        window.addEventListener('beforeunload', function (event) {
            if (!isDirty()) return;
            event.preventDefault();
            event.returnValue = '';
        });

        each(document.querySelectorAll('[data-mode-btn]'), function (btn) {
            btn.addEventListener('click', function () {
                setMode(btn.getAttribute('data-mode-btn'));
            });
        });

        el.startEdit.addEventListener('click', function () {
            if (!state.meta) {
                toast('Open a theme first.');
                return;
            }
            setMode('edit');
        });
        el.editBack.addEventListener('click', function () {
            setMode('preview');
        });
        el.editSubmit.addEventListener('click', function () {
            setMode('submit');
        });

        el.openZip.addEventListener('click', function () {
            el.zipInput.click();
        });
        el.openFolder.addEventListener('click', function () {
            el.folderInput.click();
        });
        el.zipInput.addEventListener('change', function () {
            var file = el.zipInput.files && el.zipInput.files[0];
            el.zipInput.value = '';
            if (file) importZip(file);
        });
        el.folderInput.addEventListener('change', function () {
            if (el.folderInput.files && el.folderInput.files.length) importFolderFiles(el.folderInput.files);
            el.folderInput.value = '';
        });

        el.themeFilter.addEventListener('input', function () {
            clearTimeout(filterTimer);
            filterTimer = setTimeout(function () {
                populateThemeSelect(el.themeFilter.value);
            }, 120);
        });
        el.themeSelect.addEventListener('change', function () {
            var next = el.themeSelect.value;
            if (!next) return;
            var theme = state.byFolder[next];
            if (!confirmReplace('“' + ((theme && theme.name) || next) + '”')) {
                updateThemeSelectValue();
                return;
            }
            loadGalleryTheme(next);
        });

        [el.submitTitle, el.submitAuthor, el.submitDesc, el.submitAuthorUrl, el.submitExternalUrl].forEach(function (field) {
            field.addEventListener('input', function () {
                state.formDirty = true;
                markDirty();
                updateUpdateNotice();
                syncPolicy();
                updateChecklist();
            });
        });

        el.submitExternal.addEventListener('change', function () {
            el.submitExternalWrap.hidden = !el.submitExternal.checked;
            state.formDirty = true;
            markDirty();
            if (el.submitExternal.checked) el.submitExternalUrl.focus();
        });

        if (el.submitOwn) {
            el.submitOwn.addEventListener('change', function () {
                if (el.submitOwn.checked) {
                    /* Ask before turning a submission into an update: the box on its
                       own is too easy to tick by accident. */
                    el.submitOwn.checked = false;
                    openOwnModal();
                    return;
                }
                setOwnUpdate(false);
            });
        }

        if (el.ownModalAck) {
            el.ownModalAck.addEventListener('change', function () {
                if (el.ownModalConfirm) el.ownModalConfirm.disabled = !el.ownModalAck.checked;
            });
        }
        if (el.ownModalConfirm) {
            el.ownModalConfirm.addEventListener('click', function () {
                if (!el.ownModalAck || !el.ownModalAck.checked) return;
                closeOwnModal();
                setOwnUpdate(true);
                toast('Your own details are filled in for this update.');
            });
        }
        if (el.ownModalCancel) {
            el.ownModalCancel.addEventListener('click', function () {
                closeOwnModal();
                syncOwnUpdateUi();
            });
        }
        if (el.ownModal) {
            el.ownModal.addEventListener('click', function (event) {
                if (event.target === el.ownModal) closeOwnModal();
            });
            document.addEventListener('keydown', function (event) {
                if (event.key === 'Escape' && !el.ownModal.hidden) closeOwnModal();
            });
        }

        el.submitBtn.addEventListener('click', function () {
            submitTheme();
        });

        if (el.save) el.save.addEventListener('click', saveTheme);
        each(document.querySelectorAll('[data-studio-save]'), function (button) {
            button.addEventListener('click', saveTheme);
        });
        if (el.swap) {
            el.swap.addEventListener('click', function () {
                state.swapOpen = !state.swapOpen;
                if (el.swapPanel) el.swapPanel.hidden = !state.swapOpen;
                if (state.swapOpen && el.themeFilter) el.themeFilter.focus();
            });
        }
        [el.submitOpenZip, el.submitOpenFolder].forEach(function (button) {
            if (!button) return;
            button.addEventListener('click', function () {
                if (button === el.submitOpenZip) el.zipInput.click();
                else el.folderInput.click();
            });
        });

        window.addEventListener('dragenter', function (event) {
            if (!hasFilePayload(event)) return;
            event.preventDefault();
            dragDepth += 1;
            showDrop();
        });
        window.addEventListener('dragover', function (event) {
            if (!hasFilePayload(event)) return;
            event.preventDefault();
            if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy';
        });
        window.addEventListener('dragleave', function (event) {
            if (!hasFilePayload(event)) return;
            dragDepth = Math.max(0, dragDepth - 1);
            if (!dragDepth) hideDrop();
        });
        window.addEventListener('drop', onDrop);
        window.addEventListener('keydown', function (event) {
            if (event.key === 'Escape') hideDrop();
        });
    }

    function encodePath(path) {
        return String(path || '')
            .split('/')
            .filter(Boolean)
            .map(encodeURIComponent)
            .join('/');
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot);
    } else {
        boot();
    }
})();
