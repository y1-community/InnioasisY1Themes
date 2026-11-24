/**
 * Local-only Studio shell.
 *
 * Preview is the real Y1 simulator. A gallery theme is loaded from the catalog;
 * a local ZIP/folder becomes a spec plus object URLs so the same simulator can
 * render it before anything is submitted.
 */
(function () {
    'use strict';

    /* A first open lands on a theme that uses everything the player can do:
       menu art, player art, the status bar set, the masks and the file icons.
       An empty canvas teaches nobody which slots exist. */
    var DEFAULT_THEME = 'Melody Munchkin';

    /* Same-origin first: when the handling functions are deployed next to the
       site, /api/* answers without a second hostname in the way. A page can
       still name a different upload host in its meta tag (the hosted gallery
       does), and the worker remains the last resort. */
    var UPLOAD_ORIGIN = (function () {
        var meta = document.querySelector('meta[name="cf-pages-upload-api-origin"]');
        var configured = String(
            (document.documentElement && document.documentElement.getAttribute('data-upload-origin')) ||
            (window.Y1_THEME_UPLOAD_ORIGIN || '') ||
            (meta ? meta.getAttribute('content') : '') ||
            ''
        ).trim();
        if (configured) return configured.replace(/\/+$/, '');
        if (location.protocol === 'file:') return 'https://y1-theme-upload.itsryanspecter.workers.dev';
        return '';
    })();

    /* A dead upload host answers nothing at all, and "Failed to fetch" tells
       the person nothing about what to do next. */
    async function uploadRequest(path, options) {
        try {
            return await fetch(UPLOAD_ORIGIN + path, options);
        } catch (err) {
            throw new Error(
                'The theme upload service did not answer. Your theme is still here: save it to this device, then send the ZIP to the team or try again later.'
            );
        }
    }

    /* The Worker's own message is the most specific thing available, so it wins.
       A status with no body (a dead route, a proxy error page) still has to tell
       the person what they can do about it. */
    function uploadFailureMessage(status, payload) {
        var fromServer = payload && (payload.error || payload.message);
        if (fromServer) return String(fromServer);
        if (status === 400) {
            return 'The upload was rejected as invalid. Check that the package has a config.json and a title and author, then try again.';
        }
        if (status === 401 || status === 403) {
            return 'The upload service could not write to the gallery repository (HTTP ' + status + '). This is a setup problem on the server; save the theme to this device and tell the team.';
        }
        if (status === 404) {
            return 'The theme upload service is not available right now (HTTP 404). Save the theme to this device and try again later, or send the ZIP to the team.';
        }
        if (status === 413) {
            return 'This package is larger than the upload service accepts. Remove unused artwork from the theme and try again.';
        }
        if (status === 429) {
            return 'The gallery is receiving too many submissions right now. Wait a minute and press Send again - your theme is untouched.';
        }
        if (status >= 500) {
            return 'The upload service failed (HTTP ' + status + '). Your theme is still here: try again in a moment, or save it to this device and send the ZIP to the team.';
        }
        return 'Upload failed (HTTP ' + status + '). Try again, or save the theme to this device and send the ZIP to the team.';
    }

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
        emptyEyebrow: byId('studio-empty-eyebrow'),
        emptyActions: byId('studio-empty-actions'),
        emptyHint: byId('studio-empty-hint'),
        emptyZip: byId('studio-empty-zip'),
        emptyFolder: byId('studio-empty-folder'),
        title: byId('studio-title'),
        byline: byId('studio-byline'),
        sourceLabel: byId('studio-source-label'),
        sourceDetail: byId('studio-source-detail'),
        sourceChip: byId('studio-source-chip'),
        platformChip: byId('studio-platform-chip'),
        platformLabel: byId('studio-platform-label'),
        platformPop: byId('studio-platform-pop'),
        platformPopTitle: byId('studio-platform-pop-title'),
        platformPopBody: byId('studio-platform-pop-body'),
        platformFocus: byId('studio-platform-focus'),
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
        recovery: byId('studio-recovery'),
        recoveryText: byId('studio-recovery-text'),
        recoveryDiscard: byId('studio-recovery-discard'),
        recoveryDismiss: byId('studio-recovery-dismiss'),
        openZip: byId('studio-open-zip'),
        openZipBar: byId('studio-open-zip-bar'),
        openFolder: byId('studio-open-folder'),
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
        assetTheme: byId('studio-asset-theme'),
        assetSave: byId('studio-asset-save'),
        assetPaste: byId('studio-asset-paste'),
        assetBlank: byId('studio-asset-blank'),
        assetReset: byId('studio-asset-reset'),
        assetHint: byId('studio-asset-hint'),
        themePicker: byId('studio-theme-picker'),
        themePickerList: byId('studio-theme-picker-list'),
        themePickerQuery: byId('studio-theme-picker-query'),
        themePickerTitle: byId('studio-theme-picker-title'),
        themePickerText: byId('studio-theme-picker-text'),
        themePickerEmpty: byId('studio-theme-picker-empty'),
        themePickerClose: byId('studio-theme-picker-close'),
        colorEditor: byId('studio-color-editor'),
        maskEditor: byId('studio-mask-editor'),
        browseFont: byId('studio-browse-font'),
        resetAssets: byId('studio-reset-assets'),
        save: byId('studio-save'),
        tryDevice: byId('studio-try-device'),
        tryDeviceModal: byId('studio-try-device-modal'),
        tryDeviceX: byId('studio-try-device-x'),
        tryDeviceClose: byId('studio-try-device-close'),
        tryDeviceReminder: byId('studio-try-device-reminder'),
        tryDeviceSteps: byId('studio-try-device-steps'),
        tryDeviceFolderName: byId('studio-try-folder-name'),
        tryDeviceUnsupported: byId('studio-try-device-unsupported'),
        tryDeviceConnected: byId('studio-try-device-connected'),
        tryDeviceConnectedName: byId('studio-try-connected-name'),
        tryDeviceProgress: byId('studio-try-device-progress'),
        tryDeviceProgressLabel: byId('studio-try-progress-label'),
        tryDeviceProgressValue: byId('studio-try-progress-value'),
        tryDeviceProgressBar: byId('studio-try-progress-bar'),
        tryDeviceStatus: byId('studio-try-device-status'),
        trySelectFolder: byId('studio-try-select-folder'),
        tryCopyAgain: byId('studio-try-copy-again'),
        tryChangeFolder: byId('studio-try-change-folder'),
        trySaveFallback: byId('studio-try-save-fallback'),
        openTheme: byId('studio-open-theme'),
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
        submitDetails: byId('studio-submit-details'),
        identity: byId('studio-identity'),
        identityName: byId('studio-identity-name'),
        identityAuthor: byId('studio-identity-author'),
        identityOwnStep: byId('studio-identity-own'),
        identityChangeStep: byId('studio-identity-change'),
        identityResult: byId('studio-identity-result'),
        identityResultTitle: byId('studio-identity-result-title'),
        identityResultText: byId('studio-identity-result-text'),
        identityReset: byId('studio-identity-reset'),
        policyBanner: byId('studio-policy-banner'),
        authorOptions: byId('studio-author-options'),
        submitOpenZip: byId('studio-submit-open-zip'),
        submitOpenFolder: byId('studio-submit-open-folder'),
        swap: byId('studio-swap'),
        swapPanel: byId('studio-swap-panel'),
        unsaved: byId('studio-unsaved'),
        assetWarm: byId('studio-asset-warm'),
        assetWarmLabel: byId('studio-asset-warm-label'),
        assetWarmCount: byId('studio-asset-warm-count'),
        assetWarmBar: byId('studio-asset-warm-bar'),
        commandContext: byId('studio-command-context'),
        helpBtn: byId('studio-help-btn'),
        onboarding: byId('studio-onboarding'),
        onboardingTitle: byId('studio-onboarding-title'),
        onboardingLead: byId('studio-onboarding-lead'),
        onboardingTemplate: byId('studio-onboarding-template'),
        onboardingZip: byId('studio-onboarding-zip'),
        onboardingFolder: byId('studio-onboarding-folder'),
        onboardingUpload: byId('studio-onboarding-upload'),
        onboardingClose: byId('studio-onboarding-close'),
        onboardingX: byId('studio-onboarding-x'),
        onboardingSuppress: byId('studio-onboarding-suppress')
    };

    var state = {
        mode: 'preview',
        sourceType: null,
        folder: null,
        variant: '',
        meta: null,
        config: null,
        configBase: null,
        objectUrls: [],
        localMap: null,
        localFiles: [],
        localFileMap: Object.create(null),
        assets: [],
        assetById: Object.create(null),
        missingAssetPaths: Object.create(null),
        missingAssetValues: Object.create(null),
        selectedAssetId: null,
        /* Which status bar state the preview should show. Battery icons come in
           four levels, and charging has its own set. */
        statusState: {
            batteryLevel: 3,
            isCharging: false,
            playState: null,
            bluetoothState: null,
            headsetState: null
        },
        assetFilter: 'all',
        relatedAnchor: '',
        relatedIds: [],
        relatedTitle: '',
        relatedColors: [],
        assetOverrides: Object.create(null),
        openTrays: Object.create(null),
        assetUrls: [],
        galleryBlobCache: Object.create(null),
        pendingAssetId: null,
        gallery: [],
        byFolder: Object.create(null),
        galleryConfigs: Object.create(null),
        previewOk: false,
        loading: false,
        formDirty: false,
        busy: false,
        baseCover: '',
        pendingPolicy: null,
        ownUpdate: false,
        identity: { listing: null, answer: '', changeDetails: '' },
        dirty: false,
        hoverAssetId: null,
        assetDragY: 0,
        assetScrollTimer: null,
        colorPreviewTimer: null,
        swapOpen: false,
        compactExpanded: false,
        tryDeviceHandle: null,
        tryOnDeviceCount: (function () {
            try {
                return Math.max(0, parseInt(window.sessionStorage.getItem('y1-studio-try-device-count') || '0', 10) || 0);
            } catch (e) {
                return 0;
            }
        })()
    };

    var filterTimer = null;
    var toastTimer = null;
    var saveProgressTimer = null;
    var dragDepth = 0;
    var bootModeRequest = null;
    var saveTarget = {
        kind: 'device',
        device: 'device',
        label: 'Save to device',
        openZipLabel: 'Open ZIP from device',
        saveAssetLabel: 'Save to device'
    };
    var saveTargetTimer = null;

    /* —— Save / open target wording —— */

    function detectSaveTarget(nav, screenLike) {
        nav = nav || {};
        screenLike = screenLike || {};
        var ua = String(nav.userAgent || '').toLowerCase();
        var uad = nav.userAgentData || {};
        var uadPlatform = String(uad.platform || '').toLowerCase();
        var touch = Math.max(Number(nav.maxTouchPoints || 0), Number(nav.msMaxTouchPoints || 0)) > 1;
        var width = Number(screenLike.width) || (typeof window !== 'undefined' ? window.innerWidth : 1024) || 1024;
        var height = Number(screenLike.height) || (typeof window !== 'undefined' ? window.innerHeight : 768) || 768;
        var minSide = Math.min(width, height);
        var maxSide = Math.max(width, height);

        function target(kind, deviceName) {
            return {
                kind: kind,
                device: deviceName,
                label: 'Save to ' + deviceName,
                openZipLabel: 'Open ZIP from ' + deviceName,
                saveAssetLabel: 'Save to ' + deviceName
            };
        }

        if (
            /smart-tv|smarttv|googletv|appletv|hbbtv|tizen|webos|netcast|viera|bravia|roku|firetv|aft[bsm]|crkey|playstation|xbox|nintendo/.test(ua) ||
            uadPlatform === 'tv'
        ) {
            return target('tv', 'TV');
        }
        if (/windows phone/.test(ua)) return target('phone', 'Phone');

        var isIPad =
            /ipad/.test(ua) ||
            (/iphone|ipad|ipod/.test(ua) && touch && /macintosh|mac os x/.test(ua)) ||
            (uadPlatform === 'macos' && touch);
        if (isIPad) return target('ipad', 'iPad');
        if (/iphone|ipod/.test(ua) || uadPlatform === 'ios') return target('iphone', 'iPhone');

        if (/android/.test(ua) || uadPlatform === 'android') {
            var androidMobile = /mobile/.test(ua) || uad.mobile === true;
            if (!androidMobile && (minSide >= 600 || maxSide >= 900)) {
                return target('android-tablet', 'Tablet');
            }
            return target('android-phone', 'Phone');
        }

        if (/cros/.test(ua) || uadPlatform === 'chrome os') return target('chromebook', 'Chromebook');
        if (/windows/.test(ua) || uadPlatform === 'windows') return target('pc', 'PC');
        if (/macintosh|mac os x/.test(ua) || uadPlatform === 'macos') return target('mac', 'Mac');
        if (/linux|x11/.test(ua) || uadPlatform === 'linux') return target('pc', 'PC');
        if (touch && minSide >= 600) return target('tablet', 'Tablet');
        if (touch || /mobile/.test(ua)) return target('phone', 'Phone');
        return target('device', 'device');
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
        if (el.openZipBar) {
            var openLabel = el.openZipBar.querySelector('span');
            if (openLabel) openLabel.textContent = saveTarget.openZipLabel;
            el.openZipBar.setAttribute('aria-label', saveTarget.openZipLabel);
            el.openZipBar.setAttribute('title', saveTarget.openZipLabel);
            el.openZipBar.setAttribute('data-open-target', saveTarget.kind);
        }
        if (el.openZip) {
            el.openZip.innerHTML = '<i class="fa-solid fa-file-zipper" aria-hidden="true"></i>' + saveTarget.openZipLabel;
            el.openZip.setAttribute('title', saveTarget.openZipLabel);
        }
        [el.emptyZip, el.submitOpenZip].forEach(function (btn) {
            if (!btn) return;
            btn.innerHTML = '<i class="fa-solid fa-file-zipper" aria-hidden="true"></i>' + saveTarget.openZipLabel;
            btn.setAttribute('title', saveTarget.openZipLabel);
        });
        if (el.onboardingZip) {
            var obZipSpan = el.onboardingZip.querySelector('span');
            if (obZipSpan) obZipSpan.textContent = saveTarget.openZipLabel;
            el.onboardingZip.setAttribute('title', saveTarget.openZipLabel);
        }
        if (el.assetSave) {
            var assetSaveSpan = el.assetSave.querySelector('span');
            if (assetSaveSpan) assetSaveSpan.textContent = saveTarget.saveAssetLabel;
            el.assetSave.setAttribute('title', saveTarget.saveAssetLabel + ' (blank slots export a transparent PNG at the recommended size)');
        }
        window.StudioSaveTarget = {
            current: {
                kind: saveTarget.kind,
                device: saveTarget.device,
                label: saveTarget.label,
                openZipLabel: saveTarget.openZipLabel,
                saveAssetLabel: saveTarget.saveAssetLabel
            },
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

    /* —— Session recovery ————————————————————————————————————————
       A closed tab used to throw away an afternoon of replacements: the picked
       files only exist as object URLs, which die with the document. The open
       gallery theme, its edited config, every replacement blob, the selected
       asset and the listing fields are mirrored into IndexedDB shortly after
       each edit, expire after a week, and are put back when the Studio opens
       again. Local folders and ZIPs are not mirrored: their files cannot be
       re-read after a reload, so restoring "the theme" would only half work. */
    var RECOVERY_DB = 'innioasis-studio';
    var RECOVERY_STORE = 'recovery';
    var RECOVERY_TTL = 7 * 24 * 60 * 60 * 1000;
    var recoveryTimer = null;
    var recoveryDbPromise = null;
    /* Set when browser storage refuses to work, so the tab knows the edits are
       not safe anywhere but this document. */
    var recoveryBroken = false;

    function recoveryDb() {
        if (recoveryDbPromise) return recoveryDbPromise;
        recoveryDbPromise = new Promise(function (resolve, reject) {
            if (!window.indexedDB) {
                reject(new Error('IndexedDB unavailable'));
                return;
            }
            var request = window.indexedDB.open(RECOVERY_DB, 1);
            request.onupgradeneeded = function () {
                var db = request.result;
                if (!db.objectStoreNames.contains(RECOVERY_STORE)) db.createObjectStore(RECOVERY_STORE);
            };
            request.onsuccess = function () {
                resolve(request.result);
            };
            request.onerror = function () {
                reject(request.error || new Error('IndexedDB blocked'));
            };
        });
        /* Private windows and blocked storage reject here; recovery is a
           convenience, so it never blocks the Studio itself. */
        recoveryDbPromise.catch(function () {
            recoveryDbPromise = null;
            recoveryBroken = true;
        });
        return recoveryDbPromise;
    }

    function recoveryRequest(mode, run) {
        return recoveryDb().then(function (db) {
            return new Promise(function (resolve, reject) {
                var tx = db.transaction(RECOVERY_STORE, mode);
                var request = run(tx.objectStore(RECOVERY_STORE));
                request.onsuccess = function () {
                    resolve(request.result);
                };
                request.onerror = function () {
                    reject(request.error);
                };
                tx.onabort = function () {
                    reject(tx.error || new Error('Recovery transaction aborted'));
                };
            });
        });
    }

    function recoveryFormValues() {
        return {
            title: el.submitTitle ? el.submitTitle.value : '',
            author: el.submitAuthor ? el.submitAuthor.value : '',
            desc: el.submitDesc ? el.submitDesc.value : '',
            authorUrl: el.submitAuthorUrl ? el.submitAuthorUrl.value : '',
            external: !!(el.submitExternal && el.submitExternal.checked),
            externalUrl: el.submitExternalUrl ? el.submitExternalUrl.value : ''
        };
    }

    function recoverySnapshot() {
        if (state.sourceType !== 'gallery' || !state.folder || !state.config || !state.meta) return null;
        var overrides = [];
        Object.keys(state.assetOverrides || {}).forEach(function (key) {
            var entry = state.assetOverrides[key];
            if (!entry || entry.placeholder || !entry.blob) return;
            overrides.push({
                key: key,
                blob: entry.blob,
                name: entry.name || '',
                size: entry.size || entry.blob.size || 0,
                type: entry.type || entry.blob.type || ''
            });
        });
        return {
            version: 1,
            savedAt: Date.now(),
            folder: state.folder,
            mode: state.mode,
            config: cloneJson(state.config),
            meta: {
                name: state.meta.name || '',
                author: state.meta.author || '',
                authorUrl: state.meta.authorUrl || '',
                desc: state.meta.desc || '',
                externalDownloadUrl: state.meta.externalDownloadUrl || ''
            },
            form: recoveryFormValues(),
            overrides: overrides,
            selectedAssetId: state.selectedAssetId,
            openTrays: cloneJson(state.openTrays),
            assetFilter: state.assetFilter,
            compactExpanded: state.compactExpanded,
            dirty: !!state.dirty,
            formDirty: !!state.formDirty
        };
    }

    /* Typing and replacing both land here on every keystroke, so the write is
       debounced: a full snapshot carries image blobs and must not run per key. */
    function scheduleRecoverySave() {
        if (state.sourceType !== 'gallery' || !state.folder || !state.config) return;
        if (recoveryTimer) window.clearTimeout(recoveryTimer);
        recoveryTimer = window.setTimeout(function () {
            recoveryTimer = null;
            saveRecoveryNow();
        }, 600);
    }

    function saveRecoveryNow() {
        if (recoveryTimer) {
            window.clearTimeout(recoveryTimer);
            recoveryTimer = null;
        }
        var snapshot = recoverySnapshot();
        if (!snapshot) return Promise.resolve();
        /* One record per theme folder. A single shared key meant two Studio tabs
           on different themes overwrote each other, so returning restored the
           other tab's work. */
        return recoveryRequest('readwrite', function (store) {
            return store.put(snapshot, snapshot.folder);
        })
            .then(function () {
                recoveryBroken = false;
            })
            .catch(function () {
                recoveryBroken = true;
            });
    }

    /* The most recent unexpired session wins: that is the tab the reader left
       last. Expired records are dropped as they are found. */
    function readRecovery() {
        return recoveryRequest('readonly', function (store) {
            return store.getAll();
        })
            .then(function (records) {
                var list = Array.isArray(records) ? records : [];
                var best = null;
                list.forEach(function (record) {
                    if (!record || !record.folder || !record.savedAt) return;
                    if (Date.now() - record.savedAt > RECOVERY_TTL) {
                        clearRecovery(record.folder);
                        return;
                    }
                    if (!best || record.savedAt > best.savedAt) best = record;
                });
                return best;
            })
            .catch(function () {
                return null;
            });
    }

    function clearRecovery(folder) {
        if (recoveryTimer) {
            window.clearTimeout(recoveryTimer);
            recoveryTimer = null;
        }
        var key = folder || (state.sourceType === 'gallery' ? state.folder : '');
        return recoveryRequest('readwrite', function (store) {
            return key ? store.delete(key) : store.clear();
        }).catch(function () {});
    }

    /* Runs once the package's own config is in hand, so the saved config can be
       laid over the pristine base: the base keeps Reset honest, the saved copy
       keeps the work. */
    function applyRecovery(record) {
        if (!record || !state.config || !state.meta) return 0;
        if (record.config && typeof record.config === 'object') {
            state.config = cloneJson(record.config);
            applyBlankSlots(state.config);
        }
        var restored = 0;
        (record.overrides || []).forEach(function (item) {
            if (!item || !item.key || !item.blob) return;
            var previous = state.assetOverrides[item.key];
            if (previous && previous.url) revokeAssetUrl(previous.url);
            var url = URL.createObjectURL(item.blob);
            state.assetUrls.push(url);
            state.assetOverrides[item.key] = {
                blob: item.blob,
                url: url,
                name: item.name || fileName(item.key) || 'restored.png',
                size: item.size || item.blob.size || 0,
                type: item.type || item.blob.type || ''
            };
            restored += 1;
        });
        if (record.meta) {
            ['name', 'author', 'authorUrl', 'desc', 'externalDownloadUrl'].forEach(function (field) {
                if (typeof record.meta[field] === 'string') state.meta[field] = record.meta[field];
            });
        }
        var coverValue = state.config && state.config.themeCover;
        if (coverValue) state.meta.cover = resolveStoredAssetUrl(String(coverValue)) || state.baseCover;
        if (record.assetFilter === 'missing' || record.assetFilter === 'changed') state.assetFilter = record.assetFilter;
        if (record.openTrays && typeof record.openTrays === 'object') {
            state.openTrays = cloneJson(record.openTrays);
        }
        if (record.selectedAssetId) state.selectedAssetId = record.selectedAssetId;
        state.compactExpanded = record.compactExpanded === true;
        if (record.dirty) {
            state.dirty = true;
            if (el.unsaved) el.unsaved.hidden = false;
        }
        return restored;
    }

    /* The form is filled by fillSubmitForm after the assets are rebuilt, so its
       restored values have to be written after that, not inside applyRecovery. */
    function finishRecovery(record) {
        if (!record) return;
        var form = record.form || {};
        if (el.submitTitle && typeof form.title === 'string') el.submitTitle.value = form.title;
        if (el.submitAuthor && typeof form.author === 'string') el.submitAuthor.value = form.author;
        if (el.submitDesc && typeof form.desc === 'string') el.submitDesc.value = form.desc;
        if (el.submitAuthorUrl && typeof form.authorUrl === 'string') el.submitAuthorUrl.value = form.authorUrl;
        if (el.submitExternal) el.submitExternal.checked = !!form.external;
        if (el.submitExternalWrap) el.submitExternalWrap.hidden = !form.external;
        if (el.submitExternalUrl && typeof form.externalUrl === 'string') el.submitExternalUrl.value = form.externalUrl;
        if (record.formDirty) {
            state.formDirty = true;
            markDirty();
        }
        if (!bootModeRequest && (record.mode === 'edit' || record.mode === 'submit' || record.mode === 'preview')) {
            setMode(record.mode, true);
            /* The theme loaded in Preview and only now moves to the recovered
               pane, so the URL still said preview; a second reload would have
               obeyed it and dropped the user back on Preview. */
            syncUrl();
        }
        showRecoveryBanner(record);
        syncPolicy();
        updateChecklist();
        updateUpdateNotice();
    }

    function recoveryAgeLabel(savedAt) {
        var minutes = Math.max(1, Math.round((Date.now() - savedAt) / 60000));
        if (minutes < 60) return minutes + (minutes === 1 ? ' minute ago' : ' minutes ago');
        var hours = Math.round(minutes / 60);
        if (hours < 24) return hours + (hours === 1 ? ' hour ago' : ' hours ago');
        var days = Math.round(hours / 24);
        return days + (days === 1 ? ' day ago' : ' days ago');
    }

    function showRecoveryBanner(record) {
        if (!el.recovery || !el.recoveryText) return;
        var replaced = (record.overrides || []).length;
        var detail = replaced
            ? replaced + (replaced === 1 ? ' replaced file' : ' replaced files')
            : 'your last theme';
        el.recoveryText.textContent =
            'Restored ' + detail + ' as you left it ' + recoveryAgeLabel(record.savedAt || Date.now()) + '.';
        el.recovery.hidden = false;
    }

    function hideRecoveryBanner() {
        if (el.recovery) el.recovery.hidden = true;
    }

    /* Discarding reloads the package so the tray, the preview and the unsaved
       marker all go back to the untouched theme in one step. */
    function discardRecovery() {
        hideRecoveryBanner();
        clearRecovery();
        toast('Recovered session discarded.');
        if (state.sourceType === 'gallery' && state.folder) loadGalleryTheme(state.folder);
    }

    /* —— Asset thumbnails on their real surface ———————————————————
       The tray sits on a dark panel in dark mode, where a dark menu icon on a
       plain tile is invisible. Each thumbnail is therefore drawn on the surface
       the asset is drawn over in the player: home icons on the desktop
       wallpaper, file icons on a file-list row over the global wallpaper, and
       settings or dialog icons on a menu row. The theme's own files supply the
       backdrop, so the thumbnail follows the theme instead of guessing. */
    /* —— Files a theme references but does not ship ————————————————
       Cupertino's config points at a dialog option background, folder.png and
       music.png that the package does not contain. Every <img> or CSS
       background pointing at one logs a console 404 and leaves a broken
       thumbnail, so referenced files are checked with HEAD requests before
       anything draws them: a failed fetch is not a console error, a failed
       image load is. A slot whose file is gone is rewritten to the shared
       transparent placeholder, so the row survives with a Missing badge and a
       real backdrop, and nothing ever requests the missing file. */
    /* Probing at runtime cannot help: Chromium logs a console error for every
       404, including one from fetch or XHR, so a HEAD check trades an image 404
       for a fetch 404. The gaps are computed at build time instead
       (scripts/generate_missing_theme_assets.py) and served as one small JSON
       file, which means the Studio never requests a file that is not there. */
    var missingManifestPromise = null;

    function loadMissingManifest() {
        if (missingManifestPromise) return missingManifestPromise;
        /* The page sets <base href="/">, so the folder has to be part of the
           path or this resolves to /missing-theme-assets.json. */
        missingManifestPromise = fetch('studio-test/missing-theme-assets.json', { cache: 'no-cache' })
            .then(function (res) {
                return res.ok ? res.json() : {};
            })
            .catch(function () {
                return {};
            });
        return missingManifestPromise;
    }

    function missingMapForFolder(manifest, folder) {
        var map = Object.create(null);
        var entry = manifest && manifest[folder];
        (entry && Array.isArray(entry.files) ? entry.files : []).forEach(function (value) {
            map[String(value || '').trim().toLowerCase()] = true;
        });
        return map;
    }

    function markMissingConfigValues(config, missing) {
        state.missingAssetPaths = Object.create(null);
        state.missingAssetValues = Object.create(null);
        if (!missing || !Object.keys(missing).length) return;
        function visit(node, path) {
            if (!node || typeof node !== 'object') return;
            if (Array.isArray(node)) {
                node.forEach(function (item, index) {
                    var childPath = path + '.' + index;
                    if (typeof item === 'string') {
                        if (missing[item.trim().toLowerCase()]) {
                            state.missingAssetPaths[childPath] = true;
                            state.missingAssetValues[childPath] = item;
                            node[index] = PLACEHOLDER_FILE;
                        }
                        return;
                    }
                    visit(item, childPath);
                });
                return;
            }
            Object.keys(node).forEach(function (key) {
                var value = node[key];
                var childPath = path ? path + '.' + key : key;
                if (typeof value === 'string') {
                    if (missing[value.trim().toLowerCase()]) {
                        state.missingAssetPaths[childPath] = true;
                        state.missingAssetValues[childPath] = value;
                        node[key] = PLACEHOLDER_FILE;
                    }
                    return;
                }
                visit(value, childPath);
            });
        }
        visit(config, '');
    }

    function configAssetUrl(path) {
        var value = readPath(state.config || {}, path);
        if (!value || typeof value !== 'string') return '';
        /* A slot the Studio backfilled with the shared transparent placeholder is
           not a background the theme defines, so the fallback chain keeps going. */
        if (isPlaceholderValue(value)) return '';
        return resolveStoredAssetUrl(value.trim());
    }

    /* The player paints exactly one of two wallpapers, chosen by screen: the home
       screen uses desktopWallpaper, every other screen (settings, file lists,
       menus, dialogs) uses globalWallpaper. Both fall back through the same chain
       the preview engine uses, so a theme that ships only one background still
       shows the right one. This follows config keys only: a filename proves
       nothing — settingConfig.wallpaper is the icon on the Wallpaper setting row,
       not a background, and treating it as one painted a 146px icon behind every
       settings asset. */
    var BACKDROP_CHAIN_HOME = ['desktopWallpaper', 'globalWallpaper', 'themeWallpaper', 'themeCover'];
    var BACKDROP_CHAIN_GLOBAL = ['globalWallpaper', 'desktopWallpaper', 'themeWallpaper', 'themeCover'];
    var BACKGROUND_PATHS = {
        desktopWallpaper: true,
        globalWallpaper: true,
        themeWallpaper: true,
        themeCover: true
    };

    function backdropChainFor(assetPath) {
        var path = String(assetPath || '');
        if (/^(homePageConfig\.|statusConfig\.|desktopMask$)/.test(path)) return BACKDROP_CHAIN_HOME;
        return BACKDROP_CHAIN_GLOBAL;
    }

    /* The first background the theme actually defines for that screen. The asset
       being thumbnailed is skipped: a wallpaper drawn on itself says nothing. */
    function firstBackdropUrl(chain, selfPath) {
        for (var i = 0; i < chain.length; i += 1) {
            if (chain[i] === selfPath) continue;
            var url = configAssetUrl(chain[i]);
            if (url) return url;
        }
        return '';
    }

    /* The row art an item is drawn over, again by config key. File entries sit on
       itemConfig rows; settings and menus on menuConfig rows; dialog options on
       their own row art. */
    function rowBackdropKeyFor(assetPath) {
        var path = String(assetPath || '');
        if (/^settingConfig\./.test(path)) return 'menuConfig.menuItemBackground';
        if (/^fileConfig\./.test(path)) return 'itemConfig.itemBackground';
        if (/^dialogConfig\./.test(path)) return 'dialogConfig.dialogOptionBackground';
        if (/^menuConfig\.|^itemConfig\./.test(path)) return 'menuConfig.menuItemBackground';
        return '';
    }

    function assetBackdrop(asset) {
        if (!asset || asset.kind !== 'image') return null;
        var path = String(asset.path || '');
        /* A background is its own context: thumbnail it on its own art, not on a
           duplicate of itself. */
        if (BACKGROUND_PATHS[path]) return null;
        var wallpaper = firstBackdropUrl(backdropChainFor(path), path);
        var rowKey = rowBackdropKeyFor(path);
        var strip = rowKey && rowKey !== path ? configAssetUrl(rowKey) : '';
        if (!wallpaper && !strip) return null;
        return { wallpaper: wallpaper, strip: strip };
    }

    function cssUrl(url) {
        return 'url("' + String(url || '').replace(/"/g, '%22').replace(/\s/g, '%20') + '")';
    }

    /* Where the asset sits on the screen decides which part of the wallpaper is
       behind it: status bar art hugs the top edge, home icons sit mid-screen, and
       list rows read best on the middle band. */
    function backdropPositionFor(assetPath) {
        if (/^statusConfig\./.test(String(assetPath || ''))) return 'center top';
        return 'center';
    }

    /* —— Thumbnails in context ——

       A home icon is drawn over the home mask, and the mask sits over the
       wallpaper. A thumbnail showing only the wallpaper misses both layers, so
       assets that share a screen with a mask get a small crop of the live
       screen instead: wallpaper, then the mask, then the art where it actually
       sits. The mask is drawn as an image, so its transparent areas let the
       wallpaper through exactly as they do on the player. */

    var THUMB_FALLBACK = { width: 72, height: 54 };

    /* On phones the edit layout hides the stage, so the canvas has no layout
       box and every live crop would fall back to the file. Show it offscreen
       for one layout pass, run the capture, then put the stage back exactly
       as it was. */
    function withPreviewVisible(run) {
        var preview = el.preview;
        var canvas = preview ? preview.querySelector('.y1-tp-canvas') : null;
        if (!canvas) return false;
        if (canvas.getBoundingClientRect().width > 0) return run();
        var stage = preview.closest('.studio-stage');
        if (!stage) return false;
        var prior = stage.getAttribute('style');
        stage.style.display = 'flex';
        stage.style.position = 'fixed';
        stage.style.left = '-10000px';
        stage.style.top = '0';
        stage.style.width = '900px';
        stage.style.maxHeight = 'none';
        stage.style.visibility = 'hidden';
        window.requestAnimationFrame(function () {
            window.requestAnimationFrame(function () {
                try {
                    run();
                } finally {
                    if (prior === null) stage.removeAttribute('style');
                    else stage.setAttribute('style', prior);
                }
            });
        });
        return false;
    }

    function livePreviewNode(assetPath, asset) {
        if (!el.preview || !assetPath) return null;
        var path = String(assetPath);
        var canvas = el.preview.querySelector('.y1-tp-canvas');
        if (!canvas) return null;
        if (path === 'itemConfig.itemSelectedBackground') {
            return canvas.querySelector('.y1-tp-row.is-selected') || canvas.querySelector('.y1-tp-row') || null;
        }
        if (path === 'itemConfig.itemBackground') {
            return canvas.querySelector('.y1-tp-row:not(.is-selected)') || canvas.querySelector('.y1-tp-row') || null;
        }
        if (path === 'desktopWallpaper' || path === 'globalWallpaper' || path === 'themeWallpaper') {
            return canvas.querySelector('.y1-tp-wallpaper') || null;
        }
        if (path === 'desktopMask' || path === 'settingConfig.settingMask') {
            return canvas.querySelector('.y1-tp-desktop-mask') || canvas.querySelector('.y1-tp-wallpaper') || null;
        }
        var escaped;
        try {
            escaped = path.replace(/["\\]/g, '\\$&');
        } catch (err) {
            return null;
        }
        /* Prefer the actual rendered <img> artwork (e.g. right-side Home/Settings icon,
           status icon, mask overlay) rather than the left-hand menu text row that shares
           the same data-theme-asset-path for hover highlighting. */
        var imgNode = canvas.querySelector('img[data-theme-asset-path="' + escaped + '"]');
        var artBox = canvas.querySelector('[data-theme-art-box="' + escaped + '"]');
        if (imgNode) {
            var imgRect = imgNode.getBoundingClientRect();
            /* Blank transparent.png placeholders are 1x1; frame their real artwork slot box instead. */
            if (artBox && ((asset && (asset.placeholder || asset.empty)) || (imgRect.width < 12 && imgRect.height < 12))) {
                return artBox;
            }
            if (imgRect.width >= 2 && imgRect.height >= 2) return imgNode;
        }
        if (artBox) {
            var boxRect = artBox.getBoundingClientRect();
            if (boxRect.width >= 2 && boxRect.height >= 2) return artBox;
        }
        return canvas.querySelector('[data-theme-asset-path="' + escaped + '"]') || null;
    }

    function thumbLayer(className) {
        var layer = document.createElement('span');
        layer.className = 'studio-thumb-layer' + (className ? ' ' + className : '');
        layer.setAttribute('aria-hidden', 'true');
        return layer;
    }

    /* Both small asset preview thumbnails and the large asset detail plate are
       windows onto the live preview: clone the mounted screen, zoom/crop around
       the complete asset with its surrounding screen context, and preserve exact
       relative positioning against the real screen edges. */
    function paintLiveCrop(node, asset, opts) {
        opts = opts || {};
        var canvas = el.preview ? el.preview.querySelector('.y1-tp-canvas') : null;
        if (!canvas || !asset || !node || !node.isConnected) return false;
        if (canvas.getBoundingClientRect().width < 1) {
            if (!opts.skipOffscreenRetry) {
                withPreviewVisible(function () {
                    paintLiveCrop(node, asset, { skipOffscreenRetry: true });
                });
            }
            return false;
        }
        var live = livePreviewNode(asset.path, asset);
        if (!live) return false;
        var rawHostBox = node.getBoundingClientRect();
        var hostW = rawHostBox.width;
        var hostH = rawHostBox.height;
        if (!hostW || !hostH) {
            if (node === el.assetPreview) {
                hostW = 360;
                hostH = 270;
            } else if (node.classList.contains('studio-mask-art')) {
                hostW = 64;
                hostH = 48;
            } else {
                hostW = 52;
                hostH = 39;
            }
        }
        var canvasBox = canvas.getBoundingClientRect();
        var liveBox = live.getBoundingClientRect();
        if (!canvasBox.width || !canvasBox.height || !liveBox.width || !liveBox.height) return false;
        /* The mounted canvas is laid out at its native 480x360 and then scaled
           to fit the stage. Clone it at layout size and fold that stage scale
           into the transform, or the clone's pixel-positioned children clip. */
        var layoutWidth = canvas.offsetWidth || 480;
        var layoutHeight = canvas.offsetHeight || 360;
        var stageScale = canvasBox.width / layoutWidth;

        var rx = Math.max(0, liveBox.left - canvasBox.left);
        var ry = Math.max(0, liveBox.top - canvasBox.top);
        var rw = Math.min(canvasBox.width - rx, liveBox.width);
        var rh = Math.min(canvasBox.height - ry, liveBox.height);
        if (rw < 1 || rh < 1) return false;

        var isWallpaperAsset =
            asset.path === 'desktopWallpaper' ||
            asset.path === 'globalWallpaper' ||
            asset.path === 'themeWallpaper';
        var isMaskAsset =
            asset.path === 'desktopMask' ||
            asset.path === 'settingConfig.settingMask';
        var isFullScreen =
            isMaskAsset ||
            isWallpaperAsset ||
            (rw >= canvasBox.width * 0.85 && rh >= canvasBox.height * 0.85);

        var isSmall = hostW < 120;
        var fitWholeScreen = Math.min(hostW / canvasBox.width, hostH / canvasBox.height);
        var zoom;
        var centreX;
        var centreY;

        if (isFullScreen) {
            /* Full-screen wallpapers & masks show the entire 4:3 screen cleanly
               without cropping away edges. */
            zoom = fitWholeScreen;
            centreX = canvasBox.width / 2;
            centreY = canvasBox.height / 2;
        } else {
            /* Zoomed/cropped in-context view: always fit 100% of the complete
               asset plus surrounding screen context, never clipping large icons
               or wide menu bars, while keeping tiny status glyphs legible with
               their neighbouring icons. */
            var padMult = isSmall ? 1.45 : 1.75;
            var minContextW = canvasBox.width * (isSmall ? 0.24 : 0.34);
            var minContextH = canvasBox.height * (isSmall ? 0.24 : 0.34);
            var windowWidth = Math.min(canvasBox.width, Math.max(rw * padMult, minContextW));
            var windowHeight = Math.min(canvasBox.height, Math.max(rh * padMult, minContextH));
            zoom = Math.min(hostW / windowWidth, hostH / windowHeight);
            /* Hard cap so the complete asset ALWAYS fits inside the viewport with margin. */
            var maxFitAsset = Math.min((hostW * 0.88) / rw, (hostH * 0.88) / rh);
            zoom = Math.min(zoom, maxFitAsset);
            var maxZoom = isSmall ? 2.6 : 5.0;
            zoom = Math.max(fitWholeScreen, Math.min(maxZoom, zoom));
            centreX = rx + rw / 2;
            centreY = ry + rh / 2;
        }
        if (!isFinite(zoom) || zoom <= 0) return false;

        var scaledW = canvasBox.width * zoom;
        var scaledH = canvasBox.height * zoom;
        var left = hostW / 2 - centreX * zoom;
        var top = hostH / 2 - centreY * zoom;

        /* Clamp to real screen boundaries when zoomed past host bounds so edge-anchored
           assets stay in their true relative screen position with zero dead void;
           center cleanly when the full 4:3 screen fits inside the host. */
        if (scaledW >= hostW) {
            left = Math.min(0, Math.max(hostW - scaledW, left));
        } else {
            left = (hostW - scaledW) / 2;
        }
        if (scaledH >= hostH) {
            top = Math.min(0, Math.max(hostH - scaledH, top));
        } else {
            top = (hostH - scaledH) / 2;
        }

        clearThumbLayers(node);
        var layer = thumbLayer('studio-live-crop');
        layer.classList.add('has-live-crop');
        layer.style.cssText =
            'position:absolute;left:' +
            left +
            'px;top:' +
            top +
            'px;width:' +
            layoutWidth +
            'px;height:' +
            layoutHeight +
            'px;transform:scale(' +
            zoom * stageScale +
            ');transform-origin:0 0;';

        var clone = canvas.cloneNode(true);
        clone.removeAttribute('id');
        Array.prototype.forEach.call(clone.querySelectorAll('[id]'), function (child) {
            child.removeAttribute('id');
        });
        Array.prototype.forEach.call(clone.querySelectorAll('[tabindex]'), function (child) {
            child.removeAttribute('tabindex');
        });
        if (isWallpaperAsset) {
            /* Previewing a wallpaper asset shows ONLY the wallpaper — no overlay
               mask, status bar, menu items, or icons covering it. */
            Array.prototype.forEach.call(Array.prototype.slice.call(clone.children), function (child) {
                if (!child.classList || !child.classList.contains('y1-tp-wallpaper')) {
                    child.remove();
                }
            });
            var wallClone = clone.querySelector('.y1-tp-wallpaper');
            if (wallClone) {
                var wallBlank =
                    asset.placeholder ||
                    asset.empty ||
                    asset.missingFile ||
                    asset.localMissing ||
                    isPlaceholderValue(asset.value);
                if (wallBlank) {
                    wallClone.style.backgroundImage = '';
                } else if (asset.url) {
                    wallClone.style.backgroundImage = 'url("' + String(asset.url).replace(/"/g, '%22') + '")';
                    wallClone.style.backgroundSize = 'cover';
                    wallClone.style.backgroundPosition = 'center';
                    wallClone.style.backgroundRepeat = 'no-repeat';
                }
            }
        } else if (isMaskAsset) {
            /* Previewing a mask asset shows the background wallpaper it sits over
               plus the mask itself, with menu rows, icons, and status bar removed
               so the author can clearly inspect what the mask covers and reveals. */
            Array.prototype.forEach.call(Array.prototype.slice.call(clone.children), function (child) {
                if (
                    !child.classList ||
                    (!child.classList.contains('y1-tp-wallpaper') &&
                        !child.classList.contains('y1-tp-desktop-mask'))
                ) {
                    child.remove();
                }
            });
        }
        clone.setAttribute('aria-hidden', 'true');
        clone.style.cssText =
            'position:absolute;left:0;top:0;width:' +
            layoutWidth +
            'px;height:' +
            layoutHeight +
            'px;margin:0;pointer-events:none;';
        layer.appendChild(clone);
        node.classList.add('has-live-crop');
        node.appendChild(layer);
        var pendingUrls = [];
        if (!isWallpaperAsset) {
            if (live.tagName === 'IMG' && (!live.complete || !live.naturalWidth) && (live.currentSrc || live.src)) {
                pendingUrls.push(live.currentSrc || live.src);
            }
            var imgSelector = isMaskAsset ? 'img.y1-tp-desktop-mask[src]' : 'img[src]';
            Array.prototype.forEach.call(canvas.querySelectorAll(imgSelector), function (canvasImg) {
                var src = canvasImg.currentSrc || canvasImg.getAttribute('src') || '';
                if (src && (!canvasImg.complete || !canvasImg.naturalWidth) && pendingUrls.indexOf(src) === -1) {
                    pendingUrls.push(src);
                }
            });
        }
        pendingUrls.forEach(function (src) {
            if (!src || thumbAwaitedUrls[src]) return;
            thumbAwaitedUrls[src] = 1;
            try {
                var probe = new Image();
                probe.onload = function () {
                    if (state.mode === 'edit') scheduleThumbRefresh(140);
                };
                probe.src = src;
            } catch (e) {}
        });
        if (!isFullScreen && node === el.assetPreview) {
            /* Mark the exact asset bounds on the large detail plate. */
            var target = thumbLayer('studio-live-crop-target');
            target.style.cssText =
                'position:absolute;left:' +
                (left + rx * zoom) +
                'px;top:' +
                (top + ry * zoom) +
                'px;width:' +
                rw * zoom +
                'px;height:' +
                rh * zoom +
                'px;border:2px solid var(--site-accent);border-radius:4px;box-shadow:0 1px 5px rgba(3, 6, 10, 0.35);';
            node.appendChild(target);
        }
        return true;
    }

    var thumbAwaitedUrls = Object.create(null);
    var isCapturingThumbs = false;

    function paintAssetCropWithReveal(node, asset) {
        if (!node || !asset || asset.kind === 'font') return false;
        var api = el.preview ? el.preview._y1TpApi : null;
        if (!api || typeof api.revealAsset !== 'function') {
            return paintLiveCrop(node, asset);
        }
        return withPreviewVisible(function () {
            var snap = typeof api.snapshotState === 'function' ? api.snapshotState() : null;
            var prevView = !snap && typeof api.currentView === 'function' ? api.currentView() : '';
            var moved = false;
            var prevCapturing = isCapturingThumbs;
            isCapturingThumbs = true;
            try {
                moved = api.revealAsset(asset.path, { silent: true }) !== false;
                if (!moved && !livePreviewNode(asset.path, asset)) return false;
                return paintLiveCrop(node, asset, { skipOffscreenRetry: true });
            } catch (e) {
                return false;
            } finally {
                if (moved) {
                    try {
                        if (snap && typeof api.restoreState === 'function') api.restoreState(snap);
                        else if (prevView && typeof api.showView === 'function') api.showView(prevView, { silent: true });
                    } catch (e) {}
                }
                isCapturingThumbs = prevCapturing;
            }
        });
    }

    var thumbRefreshTimer = null;
    function scheduleThumbRefresh(delay) {
        if (thumbRefreshTimer) window.clearTimeout(thumbRefreshTimer);
        thumbRefreshTimer = window.setTimeout(function () {
            thumbRefreshTimer = null;
            refreshThumbLayers();
        }, delay || 180);
    }

    function paintRowsInContainer(container, api) {
        if (!container || !api) return;
        Array.prototype.forEach.call(container.querySelectorAll('[data-asset-id]'), function (row) {
            var group = row.closest('details.studio-asset-group');
            if (group && !group.open) return;
            var asset = state.assetById[row.getAttribute('data-asset-id')];
            var thumb = row.querySelector('.studio-asset-thumb');
            if (!asset || !thumb || asset.kind === 'font') return;
            var revealed = typeof api.revealAsset === 'function' && api.revealAsset(asset.path, { silent: true }) !== false;
            if (revealed && paintLiveCrop(thumb, asset, { skipOffscreenRetry: true })) {
                return;
            }
            decorateAssetThumb(thumb, asset, { skipReveal: true });
        });
    }

    function refreshGroupThumbs(group) {
        if (!group || !group.open || state.mode !== 'edit') return;
        var api = el.preview ? el.preview._y1TpApi : null;
        var canvas = el.preview ? el.preview.querySelector('.y1-tp-canvas') : null;
        if (!canvas || !api) return;
        withPreviewVisible(function () {
            var snap = typeof api.snapshotState === 'function' ? api.snapshotState() : null;
            var prevView = !snap && typeof api.currentView === 'function' ? api.currentView() : '';
            var prevCapturing = isCapturingThumbs;
            isCapturingThumbs = true;
            try {
                paintRowsInContainer(group, api);
            } catch (e) {
            } finally {
                try {
                    if (snap && typeof api.restoreState === 'function') api.restoreState(snap);
                    else if (prevView && typeof api.showView === 'function') api.showView(prevView, { silent: true });
                } catch (e) {}
                isCapturingThumbs = prevCapturing;
            }
        });
    }

    /* Batch-capture real zoomed/cropped in-context previews for every visible
       row thumbnail, mask card, and the selected large detail plate in one
       atomic pass, restoring the simulator's exact view/selection afterward. */
    function refreshThumbLayers() {
        if (state.mode !== 'edit') return;
        var api = el.preview ? el.preview._y1TpApi : null;
        var canvas = el.preview ? el.preview.querySelector('.y1-tp-canvas') : null;
        if (!canvas || !api) {
            refreshMaskThumbs();
            if (state.selectedAssetId) updateAssetDetail();
            return;
        }
        withPreviewVisible(function () {
            var snap = typeof api.snapshotState === 'function' ? api.snapshotState() : null;
            var prevView = !snap && typeof api.currentView === 'function' ? api.currentView() : '';
            var prevCapturing = isCapturingThumbs;
            isCapturingThumbs = true;
            try {
                if (el.assetList) {
                    paintRowsInContainer(el.assetList, api);
                }
                if (el.maskEditor) {
                    Array.prototype.forEach.call(el.maskEditor.querySelectorAll('[data-mask-slot]'), function (card) {
                        var id = card.getAttribute('data-mask-slot');
                        var asset = state.assetById[id];
                        var art = card.querySelector('.studio-mask-art');
                        if (!asset || !art) return;
                        var screen = maskScreenFor(asset);
                        if (screen && typeof api.showView === 'function') {
                            api.showView(screen, { silent: true });
                            paintLiveCrop(art, asset, { skipOffscreenRetry: true });
                        }
                    });
                }
                if (state.selectedAssetId && el.assetPreview && el.assetDetail && !el.assetDetail.hidden) {
                    var selectedAsset = state.assetById[state.selectedAssetId];
                    if (selectedAsset && selectedAsset.kind !== 'font') {
                        var rev = typeof api.revealAsset === 'function' && api.revealAsset(selectedAsset.path, { silent: true }) !== false;
                        if (rev) {
                            paintLiveCrop(el.assetPreview, selectedAsset, { skipOffscreenRetry: true });
                        }
                    }
                }
            } catch (e) {
            } finally {
                try {
                    if (snap && typeof api.restoreState === 'function') api.restoreState(snap);
                    else if (prevView && typeof api.showView === 'function') api.showView(prevView, { silent: true });
                } catch (e) {}
                isCapturingThumbs = prevCapturing;
            }
        });
    }

    function maskScreenFor(asset) {
        if (!asset) return '';
        if (asset.path === 'desktopMask') return 'home';
        if (asset.path === 'settingConfig.settingMask') return 'settings';
        return '';
    }

    function paintMaskCardCrop(node, asset) {
        var api = el.preview ? el.preview._y1TpApi : null;
        var screen = maskScreenFor(asset);
        if (!api || !screen || typeof api.showView !== 'function') return false;
        return withPreviewVisible(function () {
            var snap = typeof api.snapshotState === 'function' ? api.snapshotState() : null;
            var current = !snap && typeof api.currentView === 'function' ? api.currentView() : '';
            var moved = false;
            var prevCapturing = isCapturingThumbs;
            isCapturingThumbs = true;
            try {
                if (current !== screen) {
                    moved = api.showView(screen, { silent: true }) !== false;
                }
                clearThumbLayers(node);
                node.classList.remove('has-live-crop');
                return paintLiveCrop(node, asset, { skipOffscreenRetry: true });
            } catch (e) {
                return false;
            } finally {
                if (moved) {
                    try {
                        if (snap && typeof api.restoreState === 'function') api.restoreState(snap);
                        else if (current && typeof api.showView === 'function') api.showView(current, { silent: true });
                    } catch (e) {}
                }
                isCapturingThumbs = prevCapturing;
            }
        });
    }

    function refreshMaskThumbs() {
        if (!el.maskEditor) return;
        Array.prototype.forEach.call(el.maskEditor.querySelectorAll('[data-mask-slot]'), function (card) {
            var id = card.getAttribute('data-mask-slot');
            var asset = state.assetById[id];
            var art = card.querySelector('.studio-mask-art');
            if (!asset || !art) return;
            paintMaskCardCrop(art, asset);
        });
    }

    function clearThumbLayers(node) {
        Array.prototype.forEach.call(node.querySelectorAll('.studio-thumb-layer'), function (layer) {
            layer.remove();
        });
        node.classList.remove('has-layers');
    }

    /* A font slot previews the face it ships, not a generic icon: "Aa" is short
       enough to read at tray size and different enough between typefaces to
       choose by eye, which is the whole point of the thumbnail. */
    function paintFontThumb(node, asset) {
        if (node === el.assetPreview) {
            var plate = document.createElement('span');
            plate.className = 'studio-font-preview';
            var glyph = document.createElement('span');
            glyph.className = 'studio-font-preview-glyph';
            glyph.textContent = 'Aa';
            var line = document.createElement('span');
            line.className = 'studio-font-preview-line';
            line.textContent = asset.value ? fileName(asset.value) : 'Theme font';
            line.title = asset.value || 'Theme font';
            plate.appendChild(glyph);
            plate.appendChild(line);
            node.appendChild(plate);
            paintFontSample(glyph, asset.url);
            paintFontSample(line, asset.url);
            return;
        }
        var sample = document.createElement('span');
        sample.className = 'studio-font-thumb-sample';
        sample.textContent = 'Aa';
        sample.setAttribute('aria-hidden', 'true');
        node.appendChild(sample);
        paintFontSample(sample, asset.url);
    }

    function decorateAssetThumb(node, asset, opts) {
        if (!node) return;
        opts = opts || {};
        var existing = node.querySelector('.studio-thumb-strip');
        if (existing) existing.parentNode.removeChild(existing);
        node.classList.remove('has-backdrop');
        node.classList.remove('has-live-crop');
        node.style.backgroundImage = '';
        clearThumbLayers(node);
        if (asset && asset.kind === 'font') {
            paintFontThumb(node, asset);
            return;
        }
        if (!opts.skipReveal && paintAssetCropWithReveal(node, asset)) return;
        if (paintLiveCrop(node, asset, { skipOffscreenRetry: true })) return;
        var backdrop = assetBackdrop(asset);
        if (!backdrop) return;
        node.classList.add('has-backdrop');
        if (backdrop.wallpaper) {
            node.style.backgroundImage = cssUrl(backdrop.wallpaper);
            node.style.backgroundPosition = backdropPositionFor(asset.path);
        }
        if (backdrop.strip) {
            var strip = document.createElement('span');
            strip.className = 'studio-thumb-strip';
            strip.setAttribute('aria-hidden', 'true');
            strip.style.backgroundImage = cssUrl(backdrop.strip);
            node.appendChild(strip);
        }
    }

    /* —— Boot and navigation —— */

    /* themes.json decides whether a package is an update to an existing listing
       or a new theme. The submit path waits for this so a slow catalog can
       never make an update look new and become eligible for auto-merge. */
    var galleryIndexReady = null;

    function openPendingDropHandoff() {
        if (!window.Y1StudioDropHandoff || typeof window.Y1StudioDropHandoff.consumePending !== 'function') {
            return Promise.resolve(false);
        }
        return window.Y1StudioDropHandoff.consumePending().then(function (record) {
            if (!record) return false;
            try {
                var cleanParams = new URLSearchParams(location.search);
                if (cleanParams.has('handoff')) {
                    cleanParams.delete('handoff');
                    var qs = cleanParams.toString();
                    history.replaceState(null, '', location.pathname + (qs ? '?' + qs : ''));
                }
            } catch (_) {}
            if (record.kind === 'zip' && record.blob) {
                var zipFile =
                    typeof File === 'function'
                        ? new File([record.blob], record.name || 'theme.zip', { type: 'application/zip' })
                        : record.blob;
                importZip(zipFile);
                return true;
            }
            if (record.kind === 'entries' && Array.isArray(record.entries) && record.entries.length) {
                openLocalEntries(record.entries, record.label || 'Dropped theme');
                return true;
            }
            return false;
        });
    }

    function resolveRequestedFolder(raw) {
        var clean = String(raw || '')
            .replace(/^\.\/+/, '')
            .replace(/\/+$/, '')
            .trim();
        if (!clean) return '';
        if (state.byFolder[clean]) return clean;
        var low = clean.toLowerCase();
        var norm = low.replace(/[\s_]+/g, ' ');
        var exactLow = '';
        var fuzzy = '';
        for (var i = 0; i < state.gallery.length; i += 1) {
            var item = state.gallery[i];
            if (!item || !item.folder) continue;
            var fl = String(item.folder).toLowerCase();
            if (fl === low) {
                exactLow = item.folder;
                break;
            }
            if (!fuzzy && (fl.replace(/[\s_]+/g, ' ') === norm || String(item.name || '').toLowerCase() === low)) {
                fuzzy = item.folder;
            }
        }
        return exactLow || fuzzy || clean;
    }

    var ONBOARDING_STORAGE_KEY = 'y1_studio_onboarding_dismissed';

    function isOnboardingDismissed() {
        try {
            return window.localStorage && window.localStorage.getItem(ONBOARDING_STORAGE_KEY) === '1';
        } catch (e) {
            return false;
        }
    }

    function openOnboarding(context) {
        if (!el.onboarding) return;
        var fromUpload = context === 'upload';
        if (el.onboardingTitle) {
            el.onboardingTitle.textContent = fromUpload
                ? 'Edit or upload a theme in Theme Studio'
                : 'Welcome to Innioasis Theme Studio';
        }
        if (el.onboardingLead) {
            el.onboardingLead.textContent = fromUpload
                ? 'Pick an existing gallery theme to use as a template, or drag and drop / browse a local folder or ZIP to edit in Studio and upload it to the gallery.'
                : 'Design, remix, preview, and publish custom themes for your Innioasis Y1 or Y2 right in your browser — no desktop software required.';
        }
        if (el.onboardingSuppress) {
            el.onboardingSuppress.checked = isOnboardingDismissed();
        }
        el.onboarding.hidden = false;
        window.setTimeout(function () {
            if (el.onboardingTemplate) el.onboardingTemplate.focus({ preventScroll: true });
        }, 40);
    }

    function closeOnboarding() {
        if (!el.onboarding || el.onboarding.hidden) return;
        if (el.onboardingSuppress) {
            try {
                if (el.onboardingSuppress.checked) window.localStorage.setItem(ONBOARDING_STORAGE_KEY, '1');
                else window.localStorage.removeItem(ONBOARDING_STORAGE_KEY);
            } catch (e) {}
        }
        el.onboarding.hidden = true;
        try {
            var p = new URLSearchParams(location.search);
            if (p.has('welcome')) {
                p.delete('welcome');
                var q = p.toString();
                history.replaceState(null, '', location.pathname + (q ? '?' + q : ''));
            }
        } catch (e) {}
    }

    function bindOnboardingEvents() {
        if (el.helpBtn) {
            el.helpBtn.addEventListener('click', function () {
                openOnboarding('manual');
            });
        }
        if (!el.onboarding) return;
        if (el.onboardingClose) el.onboardingClose.addEventListener('click', closeOnboarding);
        if (el.onboardingX) el.onboardingX.addEventListener('click', closeOnboarding);
        el.onboarding.addEventListener('click', function (event) {
            if (event.target === el.onboarding) closeOnboarding();
        });
        document.addEventListener('keydown', function (event) {
            if (event.key === 'Escape' && el.onboarding && !el.onboarding.hidden) {
                closeOnboarding();
            }
        });
        if (el.onboardingTemplate) {
            el.onboardingTemplate.addEventListener('click', function () {
                closeOnboarding();
                state.swapOpen = true;
                if (el.swapPanel) el.swapPanel.hidden = false;
                if (window.matchMedia('(max-width: 760px)').matches) {
                    document.body.classList.add('studio-chooser');
                    if (el.openTheme) el.openTheme.setAttribute('aria-expanded', 'true');
                }
                setMode('preview');
                window.setTimeout(function () {
                    if (el.themeFilter) el.themeFilter.focus({ preventScroll: true });
                }, 60);
            });
        }
        if (el.onboardingZip) {
            el.onboardingZip.addEventListener('click', function () {
                closeOnboarding();
                el.zipInput.click();
            });
        }
        if (el.onboardingFolder) {
            el.onboardingFolder.addEventListener('click', function () {
                closeOnboarding();
                el.folderInput.click();
            });
        }
        if (el.onboardingUpload) {
            el.onboardingUpload.addEventListener('click', function () {
                closeOnboarding();
                setMode('submit');
            });
        }
    }

    function boot() {
        bindEvents();
        bindOnboardingEvents();
        setupManage();
        watchSaveTarget();
        setupPwa();
        var params = new URLSearchParams(location.search);
        var requestedMode = params.get('mode');
        var requestedPanel = String(params.get('panel') || '').trim();
        var requestedFolder = params.get('folder') || params.get('theme') || '';
        var requestedVariant = String(params.get('variant') || '').trim();
        var requestedWelcome = String(params.get('welcome') || '').trim().toLowerCase();
        var handoffDrop = params.get('handoff') === 'drop';
        if (requestedMode === 'edit' || requestedMode === 'submit') {
            /* The theme is fetched after boot, so Edit and Submit cannot be
               activated yet. Remember the deep link and apply it once the
               config and its assets are in place. */
            bootModeRequest = { mode: requestedMode, folder: requestedFolder, panel: requestedPanel };
        }
        setMode('preview', true);
        if (requestedWelcome === 'upload' || requestedWelcome === '1' || requestedWelcome === 'true') {
            openOnboarding(requestedWelcome === 'upload' ? 'upload' : 'first');
        } else if (!requestedFolder && !handoffDrop && !requestedMode && !isOnboardingDismissed()) {
            openOnboarding('first');
        }

        galleryIndexReady = loadGalleryIndex().then(function () {
            var handoffPromise = handoffDrop ? openPendingDropHandoff() : Promise.resolve(false);
            return handoffPromise.then(function (handledDrop) {
                if (handledDrop) return;
                return readRecovery().then(function (record) {
                    var requested = resolveRequestedFolder(requestedFolder);
                    if (requested) {
                        if (bootModeRequest && bootModeRequest.folder) bootModeRequest.folder = requested;
                        loadGalleryTheme(
                            requested,
                            !requestedVariant && record && record.folder === requested ? record : null,
                            requestedVariant
                        );
                        return;
                    }
                    /* Nothing in the URL: a tab closed mid-edit comes back to the same
                       theme with its replacements still applied. */
                    if (record && state.byFolder[record.folder]) {
                        loadGalleryTheme(record.folder, record);
                        return;
                    }
                    /* A plain first visit opens the reference theme instead of a
                       holding screen. If it is missing from this checkout, the
                       first listed theme does the same job. */
                    var fallbackFolder = state.byFolder[DEFAULT_THEME]
                        ? DEFAULT_THEME
                        : state.gallery[0] && state.gallery[0].folder;
                    if (fallbackFolder) {
                        loadGalleryTheme(fallbackFolder, null);
                        return;
                    }
                    bootModeRequest = null;
                    updateChrome();
                    setLoading(false);
                    showEmpty(
                        state.gallery.length ? 'Pick a theme, or bring your own' : 'Open your own theme package',
                        state.gallery.length
                            ? 'No theme is open yet. Choose one from the gallery, upload your own theme folder or ZIP, or pick a gallery theme from the list in the sidebar.'
                            : 'The gallery list is unavailable, so start from a theme folder or ZIP on this device.',
                        'start'
                    );
                });
            });
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

    var submitScrollTimer = null;

    function clearSubmitScrollTimer() {
        if (submitScrollTimer) {
            window.clearTimeout(submitScrollTimer);
            submitScrollTimer = null;
        }
    }

    /* Keep the top of the Submit pane — especially the "Is this your theme?"
       question when shown — squarely in view instead of scrolling past it to
       the form fields below. */
    function scrollSubmitPaneIntoView() {
        if (state.mode !== 'submit') return;
        if (el.panelScroll) el.panelScroll.scrollTop = 0;
        var pane = document.getElementById('pane-submit');
        if (!pane || pane.hidden) return;
        var identityVisible = !!(el.identity && !el.identity.hidden);
        var focusTarget = identityVisible ? el.identity : pane;
        /* Compact mobile layout (<=760px) scrolls inside el.panelScroll, which
           is already reset to 0 above. Only focus the title input if the
           identity question is not waiting for an answer. */
        if (window.matchMedia('(max-width: 760px)').matches) {
            if (!identityVisible && el.submitDetails && !el.submitDetails.hidden && el.submitTitle) {
                el.submitTitle.focus({ preventScroll: true });
            }
            return;
        }
        var bar = document.querySelector('.studio-commandbar');
        var barRect = bar ? bar.getBoundingClientRect() : null;
        var barBottom = barRect ? Math.max(0, barRect.bottom) : 72;
        var barHeight = barRect ? Math.ceil(barRect.height) : 64;
        var margin = 12;
        var focusRect = focusTarget.getBoundingClientRect();
        var paneRect = pane.getBoundingClientRect();
        var alreadyInView =
            focusRect.top >= barBottom + 4 &&
            focusRect.bottom <= window.innerHeight - 12 &&
            paneRect.top >= barBottom - 24;
        if (alreadyInView) return;
        var paneDocTop = paneRect.top + window.scrollY;
        var focusDocTop = focusRect.top + window.scrollY;
        var targetTop = paneDocTop <= barHeight + 140 ? 0 : Math.max(0, paneDocTop - (barHeight + margin));
        if (identityVisible) {
            var projectedIdentityBottom = focusDocTop - targetTop + focusRect.height;
            if (projectedIdentityBottom > window.innerHeight - 12) {
                targetTop = Math.max(0, focusDocTop - (barHeight + margin));
            }
        }
        window.scrollTo({ top: targetTop, behavior: 'smooth' });
    }

    function setMode(mode, initial) {
        if (mode !== 'preview' && mode !== 'edit' && mode !== 'submit') mode = 'preview';
        if (mode !== 'preview' && !state.meta) {
            toast('Open a theme first.');
            mode = 'preview';
        }
        clearSubmitScrollTimer();
        state.mode = mode;
        closePlatformPop();
        if ((mode === 'edit' || mode === 'submit') && state.sourceType === 'gallery') {
            warmGalleryAssets();
        }
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
        if (mode === 'edit') {
            scheduleThumbRefresh(60);
        }
        if (mode === 'submit') {
            if (el.panelScroll) el.panelScroll.scrollTop = 0;
            submitScrollTimer = window.setTimeout(function () {
                submitScrollTimer = null;
                scrollSubmitPaneIntoView();
            }, 90);
        }
        updateChecklist();
    }

    function closeThemeChooser() {
        if (!document.body.classList.contains('studio-chooser')) return;
        document.body.classList.remove('studio-chooser');
        if (el.openTheme) el.openTheme.setAttribute('aria-expanded', 'false');
    }

    function galleryContentFolder() {
        if (!state.folder) return '';
        return state.variant ? state.folder + '/Variants/' + state.variant : state.folder;
    }

    function syncUrl() {
        if (!history.replaceState) return;
        var params = new URLSearchParams(location.search);
        if (state.sourceType === 'gallery' && state.folder) {
            params.set('folder', state.folder);
            if (state.variant) params.set('variant', state.variant);
            else params.delete('variant');
        } else {
            params.delete('folder');
            params.delete('variant');
        }
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

    function galleryCoverUrl(repoPath) {
        var shot = String(repoPath || '').trim();
        if (!shot) return '';
        if (/^https?:\/\//i.test(shot) || shot.charAt(0) === '/') return shot;
        var clean = shot.replace(/^\.\/+/, '').replace(/^\/+/, '');
        return '../' + clean.split('/').map(encodeURIComponent).join('/');
    }

    function galleryMeta(theme, folder) {
        var cover = galleryCoverUrl(theme && (theme.screenshot || theme.screenshotPreview));
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

    function loadGalleryTheme(folder, restoreRecord, variant) {
        if (!folder) return;
        var requestedFolder = folder;
        var requestedVariant = String(variant || '').trim();
        state.sourceType = 'gallery';
        state.folder = folder;
        state.variant = requestedVariant;
        state.galleryBlobCache = Object.create(null);
        galleryWarmFolder = '';
        galleryWarmPromise = null;
        setAssetWarmProgress(0, 0, 0);
        state.missingAssetPaths = Object.create(null);
        state.missingAssetValues = Object.create(null);
        state.config = null;
        state.compactExpanded = false;
        state.previewOk = false;
        state.formDirty = false;
        state.dirty = false;
        state.swapOpen = false;
        state.meta = galleryMeta(state.byFolder[folder], folder);
        /* Hold the declared cover until the manifest says whether it exists:
           drawing it now would request a file the theme does not ship. */
        var declaredCover = state.meta.cover;
        state.meta.cover = '';
        state.baseCover = '';
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

        var contentPath = galleryContentFolder();
        fetch('../' + encodePath(contentPath) + '/config.json?v=' + Date.now(), { cache: 'no-cache' })
            .then(function (res) {
                if (!res.ok) throw new Error('config.json (' + res.status + ')');
                return res.json();
            })
            .then(function (config) {
                if (state.sourceType !== 'gallery' || state.folder !== requestedFolder || state.variant !== requestedVariant) return;
                return loadMissingManifest().then(function (manifest) {
                    if (state.sourceType !== 'gallery' || state.folder !== requestedFolder || state.variant !== requestedVariant) return;
                    var manifestEntry = manifest && manifest[requestedFolder];
                    markMissingConfigValues(config, missingMapForFolder(manifest, requestedFolder));
                    state.meta.cover =
                        manifestEntry && manifestEntry.cover
                            ? galleryCoverUrl(manifestEntry.coverFallback)
                            : declaredCover;
                    state.config = config;
                    applyBlankSlots(state.config);
                    state.configBase = cloneJson(state.config);
                    var info = (config && config.theme_info) || {};
                    if (info.title) state.meta.name = info.title;
                    if (info.author) state.meta.author = info.author;
                    if (info.authorUrl) state.meta.authorUrl = info.authorUrl;
                    if (info.description) state.meta.desc = info.description;
                    if (info.externalDownloadUrl) state.meta.externalDownloadUrl = info.externalDownloadUrl;
                    state.baseCover = state.meta.cover;
                    if (restoreRecord) applyRecovery(restoreRecord);
                    rebuildAssets();
                    updateChrome();
                    fillSubmitForm();
                    applyBootMode(requestedFolder);
                    if (restoreRecord) finishRecovery(restoreRecord);
                    updateChecklist();
                    trackStudioGalleryVisit(requestedFolder, state.meta, state.byFolder[requestedFolder]);
                    return mountPreview({ freshView: true });
                });
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
        if (request.panel === 'manage' || request.panel === 'remove' || request.panel === 'details') {
            window.setTimeout(function () {
                openManage(request.panel === 'manage' ? '' : request.panel);
            }, 120);
        }
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
        /* The whole catalogue goes in the picker: capping it at 120 hid every
           theme after the C's and left the rest reachable only by filtering. */
        el.themeSelect.innerHTML = '';
        el.themeSelect.appendChild(
            new Option(state.sourceType === 'local' ? 'Local package (not in gallery)' : 'Choose a gallery theme…', '')
        );
        list.forEach(function (theme) {
            var label = theme.name || theme.folder;
            if (theme.author) label += ' · ' + theme.author;
            el.themeSelect.appendChild(new Option(label, theme.folder));
        });
        if (state.sourceType === 'gallery' && state.folder && optionExists(state.folder)) {
            el.themeSelect.value = state.folder;
        }
        el.themeCount.textContent = q
            ? list.length
                ? list.length + (list.length === 1 ? ' match' : ' matches')
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
            /* A deep link can name a theme the picker was never rebuilt for, so
               make sure the loaded theme always has its own option. */
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

    var previewMountSeq = 0;

    function isExternalDownloadTheme(metaObj, catalogEntry) {
        if (catalogEntry && String(catalogEntry.sourceType || '').toLowerCase() === 'external') return true;
        var raw = String(
            (metaObj && metaObj.externalDownloadUrl) ||
                (catalogEntry && catalogEntry.externalDownloadUrl) ||
                ''
        ).trim();
        if (!raw) return false;
        if (window.ThemePackaging && typeof window.ThemePackaging.effectiveExternalDownloadUrl === 'function') {
            return !!window.ThemePackaging.effectiveExternalDownloadUrl(raw);
        }
        return /^https?:\/\//i.test(raw);
    }

    function trackStudioGalleryVisit(folder, metaObj, catalogEntry) {
        if (!folder || !window.ThemeAnalytics) return;
        try {
            if (typeof window.ThemeAnalytics.trackPageView === 'function') {
                window.ThemeAnalytics.trackPageView(folder, 'studio');
            }
            if (
                isExternalDownloadTheme(metaObj, catalogEntry) &&
                typeof window.ThemeAnalytics.trackZipDownload === 'function'
            ) {
                window.ThemeAnalytics.trackZipDownload(folder, 'studio');
            }
        } catch (e) {}
    }

    function waitForCanvasMedia(root, timeoutMs) {
        var promises = [];
        if (root) {
            Array.prototype.forEach.call(root.querySelectorAll('img'), function (img) {
                if (!img.getAttribute('src')) return;
                if (img.complete && img.naturalWidth > 0) return;
                promises.push(
                    new Promise(function (resolve) {
                        var done = false;
                        var finish = function () {
                            if (done) return;
                            done = true;
                            resolve();
                        };
                        img.addEventListener('load', finish, { once: true });
                        img.addEventListener('error', finish, { once: true });
                        if (typeof img.decode === 'function') {
                            img.decode().then(finish, finish);
                        }
                    })
                );
            });
            Array.prototype.forEach.call(root.querySelectorAll('[style*="blob:"]'), function (node) {
                var bg = node.style && node.style.backgroundImage;
                if (!bg) return;
                var match = /url\(["']?(blob:[^"')]+)["']?\)/i.exec(bg);
                if (!match || !match[1]) return;
                promises.push(
                    new Promise(function (resolve) {
                        var probe = new Image();
                        probe.onload = resolve;
                        probe.onerror = resolve;
                        probe.src = match[1];
                    })
                );
            });
        }
        if (document.fonts && document.fonts.ready) {
            promises.push(document.fonts.ready.catch(function () {}));
        }
        if (!promises.length) return Promise.resolve();
        return Promise.race([
            Promise.all(promises),
            new Promise(function (resolve) {
                window.setTimeout(resolve, timeoutMs || 700);
            })
        ]);
    }

    function mergeStatusIntoSnapshot(snap) {
        if (!snap || !state.statusState) return snap;
        var out = Object.assign({}, snap);
        Object.keys(state.statusState).forEach(function (key) {
            var val = state.statusState[key];
            if (val !== undefined) out[key] = val;
        });
        return out;
    }

    function shouldPreserveScreenForAsset(assetPath, snap) {
        if (!snap || !assetPath) return false;
        var p = String(assetPath);
        if (p === 'fontFamily') return true;
        if (/^statusConfig\./.test(p)) return true;
        if (p === 'desktopWallpaper' || p === 'desktopMask') return snap.themeViewId === 'home';
        if (p === 'globalWallpaper' || p === 'settingConfig.settingMask') return snap.themeViewId === 'settings';
        if (/^(itemConfig|menuConfig)\./.test(p)) {
            return (
                snap.themeViewId === 'home' ||
                snap.themeViewId === 'settings' ||
                snap.themeViewId === 'music_folders' ||
                snap.themeViewId === 'settingsEqualizer'
            );
        }
        return false;
    }

    function mountPreview(opts) {
        opts = opts || {};
        if (!window.Y1ThemePreview || typeof window.Y1ThemePreview.mount !== 'function') {
            return Promise.reject(new Error('The preview engine did not load.'));
        }
        if (thumbRefreshTimer) {
            window.clearTimeout(thumbRefreshTimer);
            thumbRefreshTimer = null;
        }
        var mountSeq = ++previewMountSeq;
        var prevApi = !opts.freshView && el.preview ? el.preview._y1TpApi : null;
        var prevSnap =
            prevApi && typeof prevApi.snapshotState === 'function'
                ? mergeStatusIntoSnapshot(prevApi.snapshotState())
                : null;
        hideEmpty();
        window.Y1ThemePreview.unmount(el.preview);
        el.preview.innerHTML = '';

        var options = {
            catalogFolder: state.sourceType === 'gallery' ? state.folder : '__studio_local__',
            variantSegment: state.sourceType === 'gallery' ? state.variant || '' : '',
            mode: 'full',
            compactControls: true,
            compactExpanded: state.compactExpanded === true,
            onCompactChange: function (expanded) {
                state.compactExpanded = expanded === true;
            },
            spec: state.config,
            simState: state.statusState,
            buildFileUrl: state.sourceType === 'gallery' ? galleryFileUrl : localFileUrl,
            previewMeta: {
                trackTitle: state.meta.name || 'Untitled theme',
                trackArtist: state.meta.author || 'Unknown author',
                trackAlbum: (state.meta.desc || 'Y1 Theme').slice(0, 96)
            }
        };

        return window.Y1ThemePreview.mount(el.preview, options).then(function () {
            if (mountSeq !== previewMountSeq) return;
            var api = el.preview ? el.preview._y1TpApi : null;
            var focusId = opts.focusAssetId || '';
            if (api) {
                if (focusId) {
                    if (prevSnap && shouldPreserveScreenForAsset(focusId, prevSnap)) {
                        if (typeof api.restoreState === 'function') api.restoreState(prevSnap);
                    } else {
                        var revealed = typeof api.revealAsset === 'function' && api.revealAsset(focusId) !== false;
                        if (!revealed && prevSnap && typeof api.restoreState === 'function') {
                            api.restoreState(prevSnap);
                        }
                    }
                } else if (prevSnap && typeof api.restoreState === 'function') {
                    api.restoreState(prevSnap);
                }
            }
            state.previewOk = true;
            setLoading(false);
            updateChecklist();
            if (state.selectedAssetId) highlightPreviewAsset(state.selectedAssetId);

            return waitForCanvasMedia(el.preview, 700).then(function () {
                if (mountSeq !== previewMountSeq) return;
                thumbAwaitedUrls = Object.create(null);
                if (state.mode === 'edit') {
                    refreshThumbLayers();
                    if (state.selectedAssetId) {
                        var sel = state.assetById[state.selectedAssetId];
                        if (
                            (sel && sel.kind === 'font') ||
                            (el.assetPreview && !el.assetPreview.classList.contains('has-live-crop'))
                        ) {
                            updateAssetDetail();
                        }
                        highlightPreviewAsset(state.selectedAssetId);
                    }
                    scheduleThumbRefresh(350);
                }
            });
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
        /* Opening a theme answers the picker, so the player comes back. */
        if (hasTheme) closeThemeChooser();
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
        if (el.tryDevice) el.tryDevice.disabled = !hasTheme || state.busy;
        if (hasTheme) updateThemeSelectValue();
        renderAssets();
        refreshPlatformChip();
        syncManageVisibility();
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
            ['Selected item text', item.itemSelectedTextColor],
            ['Menu item text', menu.menuItemTextColor],
            ['Selected menu text', menu.menuItemSelectedTextColor],
            ['Menu', menu.menuBackgroundColor],
            ['Status text', status.statusTextColor || autoStatusTextColor()],
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

    /* Colours that belong with whatever the reader just clicked. A status
       icon and the strip's text share a bar; a menu row and the palette that
       draws its selected and unselected states share a list. */
    function colorDefForPath(path) {
        var defs = collectColorDefinitions(state.config || {});
        for (var i = 0; i < defs.length; i++) {
            if (defs[i].path === path) return defs[i];
        }
        return null;
    }

    function colorChannels(value) {
        var text = String(value || '').trim();
        var hex = /^#([0-9a-f]{3,8})$/i.exec(text);
        if (hex) {
            var digits = hex[1];
            if (digits.length === 3 || digits.length === 4) {
                digits = digits.split('').map(function (ch) { return ch + ch; }).join('');
            }
            if (digits.length === 6 || digits.length === 8) {
                return {
                    r: parseInt(digits.slice(0, 2), 16),
                    g: parseInt(digits.slice(2, 4), 16),
                    b: parseInt(digits.slice(4, 6), 16),
                    a: digits.length === 8 ? parseInt(digits.slice(6, 8), 16) / 255 : 1
                };
            }
        }
        return null;
    }

    function colorLuma(channels) {
        return channels ? (0.299 * channels.r + 0.587 * channels.g + 0.114 * channels.b) / 255 : 0;
    }

    function autoStatusTextColor() {
        var status = (state.config && state.config.statusConfig) || {};
        var bg = colorChannels(status.statusBarColor);
        /* A translucent strip takes its brightness from the art behind it. The
           theme's own text colour already contrasts with that art, so it is
           the best hint the config gives until someone picks Light or Dark. */
        if (bg && bg.a >= 0.5) return colorLuma(bg) > 0.55 ? '#000000' : '#ffffff';
        var item = (state.config && state.config.itemConfig) || {};
        var ink = colorChannels(item.itemTextColor);
        if (ink) return colorLuma(ink) > 0.55 ? '#ffffff' : '#000000';
        return '#ffffff';
    }

    function statusTextChoice(statusCfg) {
        var v = String((statusCfg && statusCfg.statusTextColor) || '').trim();
        if (!v) return 'auto';
        var channels = colorChannels(v);
        if (!channels || channels.a < 0.5) return 'auto';
        return colorLuma(channels) > 0.55 ? 'light' : 'dark';
    }

    function setStatusTextChoice(choice) {
        if (!state.config) return;
        if (choice === 'auto') {
            deletePath(state.config, 'statusConfig.statusTextColor');
        } else {
            writePath(state.config, 'statusConfig.statusTextColor', choice === 'light' ? '#ffffff' : '#000000');
        }
        markDirty();
        renderColorEditor();
        renderStatusEditor();
        remountPreview('Updating the status bar…');
    }

    /* Text colours belong with the font: the face and the ink are one choice.
       They stay in the normal colour editor as well, but the Font family tray
       offers them together so a theme can be tuned in one place. */
    var TEXT_COLOR_PATHS = [
        'itemConfig.itemTextColor',
        'itemConfig.itemSelectedTextColor',
        'menuConfig.menuItemTextColor',
        'menuConfig.menuItemSelectedTextColor',
        'dialogConfig.dialogOptionTextColor',
        'dialogConfig.dialogOptionSelectedTextColor',
        'dialogConfig.dialogTextColor'
    ];

    function typographyColorDefs() {
        return colorDefsForPaths(TEXT_COLOR_PATHS);
    }

    function relatedColorPaths(anchorId) {
        if (!anchorId) return [];
        if (anchorId === 'fontFamily') return TEXT_COLOR_PATHS.slice();
        if (/^statusConfig\./.test(anchorId)) {
            return ['statusConfig.statusTextColor', 'statusConfig.statusBarColor'];
        }
        if (/^(desktopMask$|settingConfig\.settingMask$)/.test(anchorId)) {
            return [
                'itemConfig.itemTextColor',
                'itemConfig.itemSelectedTextColor',
                'menuConfig.menuItemTextColor',
                'menuConfig.menuItemSelectedTextColor',
                'menuConfig.menuBackgroundColor'
            ];
        }
        if (/^(homePageConfig|menuConfig)\./.test(anchorId)) {
            return [
                'itemConfig.itemTextColor',
                'itemConfig.itemSelectedTextColor',
                'menuConfig.menuItemTextColor',
                'menuConfig.menuItemSelectedTextColor',
                'menuConfig.menuBackgroundColor'
            ];
        }
        if (/^dialogConfig\./.test(anchorId)) {
            return [
                'dialogConfig.dialogOptionTextColor',
                'dialogConfig.dialogOptionSelectedTextColor',
                'dialogConfig.dialogTextColor',
                'dialogConfig.dialogBackgroundColor'
            ];
        }
        if (/^(itemConfig|fileConfig|settingConfig|playerConfig)\./.test(anchorId)) {
            return [
                'itemConfig.itemTextColor',
                'itemConfig.itemSelectedTextColor',
                'menuConfig.menuBackgroundColor'
            ];
        }
        return [];
    }

    function colorDefsForPaths(paths) {
        var out = [];
        (paths || []).forEach(function (path) {
            var def = colorDefForPath(path);
            if (def) {
                out.push(def);
                return;
            }
            /* The status text colour is a new key: show the colour the bar is
               already drawing so the first edit starts from the right place. */
            if (path === 'statusConfig.statusTextColor') {
                out.push({
                    path: path,
                    value: autoStatusTextColor(),
                    label: 'Status bar text',
                    section: 'Status bar'
                });
            } else if (path === 'statusConfig.statusBarColor') {
                out.push({ path: path, value: '', label: 'Status bar background', section: 'Status bar' });
            }
        });
        return out;
    }

    function createColorRow(def) {
        var row = document.createElement('div');
        row.className = 'studio-color-row';
        var label = document.createElement('label');
        label.textContent = def.label;
        var code = document.createElement('code');
        code.textContent = def.path;
        code.title = def.path;
        var picker = document.createElement('input');
        picker.type = 'color';
        picker.value = colorPickerValue(def.value) || '#000000';
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
            picker.value = colorPickerValue(text.value) || picker.value;
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
        return row;
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
            /* Trays open on demand only. What the reader expands is remembered
               so a colour edit that re-renders the list does not snap the group
               shut under their hands. */
            var trayKey = 'color:' + sectionName;
            group.open = !!state.openTrays[trayKey];
            group.addEventListener('toggle', function () {
                state.openTrays[trayKey] = group.open;
            });
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
                group.appendChild(createColorRow(def));
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
        fontFamily: 'Font family',
        theme_info: 'Listing metadata',
        source_info: 'Source metadata'
    };

    var LABELS = {
        themeCover: 'Theme cover',
        desktopWallpaper: 'Home wallpaper',
        globalWallpaper: 'Global wallpaper',
        desktopMask: 'Home overlay mask',
        fontFamily: 'Theme font',
        itemTextColor: 'Item text',
        itemSelectedTextColor: 'Selected item text',
        menuItemTextColor: 'Menu item text',
        menuItemSelectedTextColor: 'Selected menu item text',
        dialogOptionTextColor: 'Dialog option text',
        dialogOptionSelectedTextColor: 'Selected dialog option text',
        dialogTextColor: 'Dialog text',
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
        if (
            key === 'itemConfig.itemBackground' ||
            key === 'itemConfig.itemSelectedBackground' ||
            key === 'menuConfig.menuItemBackground' ||
            key === 'menuConfig.menuItemSelectedBackground'
        ) {
            return { width: 640, height: 91 };
        }
        if (
            key === 'dialogConfig.dialogOptionBackground' ||
            key === 'dialogConfig.dialogOptionSelectedBackground'
        ) {
            return { width: 160, height: 56 };
        }
        if (key === 'dialogConfig.dialogBackground') {
            return { width: 380, height: 220 };
        }
        if (
            key === 'desktopWallpaper' ||
            key === 'globalWallpaper' ||
            key === 'desktopMask' ||
            key === 'themeCover' ||
            /(?:bootLogo|shutdownLogo|nowPlayingBackground|backgroundImage|menuBackground)$/i.test(key)
        ) {
            return { width: 320, height: 240 };
        }
        if (/(?:nowPlayingAlbumArt|albumArtDefault)$/i.test(key)) {
            return { width: 200, height: 200 };
        }
        if (/scrollbarThumb$/i.test(key)) {
            return { width: 12, height: 64 };
        }
        if (key.indexOf('statusConfig.') === 0 || key === 'itemConfig.itemRightArrow') {
            return { width: 64, height: 64 };
        }
        if (key.indexOf('fileConfig.') === 0) return { width: 166, height: 166 };
        return null;
    }

    function recommendedBlankSize(asset) {
        var target = asset ? assetTargetSize(asset.path) : null;
        return target || { width: 320, height: 240 };
    }

    function assetDownloadFileName(asset, isBlank) {
        if (!asset) return 'asset.png';
        if (!isBlank && asset.value && !isPlaceholderValue(asset.value)) {
            var existing = fileName(asset.value);
            if (existing) return existing;
        }
        var leaf = String(asset.path || asset.label || 'asset')
            .split('.')
            .filter(Boolean)
            .slice(-2)
            .join('_')
            .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
            .toLowerCase()
            .replace(/[^a-z0-9_-]+/g, '_')
            .replace(/^_+|_+$/g, '') || 'asset';
        var ext = asset.kind === 'font' ? 'ttf' : 'png';
        return leaf + '.' + ext;
    }

    function createBlankTransparentPng(width, height) {
        var w = Math.max(1, Math.round(Number(width) || 320));
        var h = Math.max(1, Math.round(Number(height) || 240));
        return new Promise(function (resolve, reject) {
            var canvas = document.createElement('canvas');
            canvas.width = w;
            canvas.height = h;
            var ctx = canvas.getContext('2d');
            if (!ctx) {
                reject(new Error('Could not create transparent canvas.'));
                return;
            }
            ctx.clearRect(0, 0, w, h);
            canvas.toBlob(function (blob) {
                if (blob) resolve(blob);
                else reject(new Error('Could not encode transparent PNG.'));
            }, 'image/png');
        });
    }

    function downloadAsset(assetId) {
        var asset = state.assetById[assetId];
        if (!asset) return;
        var isBlankImage =
            asset.kind === 'image' &&
            (asset.placeholder ||
                asset.empty ||
                asset.missingFile ||
                asset.localMissing ||
                isPlaceholderValue(asset.value));
        if (isBlankImage) {
            var size = recommendedBlankSize(asset);
            var blankName = assetDownloadFileName(asset, true);
            createBlankTransparentPng(size.width, size.height)
                .then(function (blob) {
                    var file = new File([blob], blankName, { type: 'image/png' });
                    downloadBlob(file);
                    toast('Saved blank ' + size.width + '×' + size.height + ' transparent PNG (' + blankName + ').');
                })
                .catch(function (err) {
                    toast((err && err.message) || 'Could not generate a blank PNG for that asset.');
                });
            return;
        }
        var outName = assetDownloadFileName(asset, false);
        blobForAssetValue(asset.value)
            .then(function (blob) {
                var mime =
                    (blob && blob.type && blob.type !== 'application/octet-stream' && blob.type) ||
                    (asset.kind === 'font' ? 'font/ttf' : 'image/png');
                var file = new File([blob], outName, { type: mime });
                downloadBlob(file);
                toast('Saved ' + outName + ' to your ' + (saveTarget.device || 'device') + '.');
            })
            .catch(function (err) {
                if (asset.kind === 'image') {
                    var fallbackSize = recommendedBlankSize(asset);
                    var fallbackName = assetDownloadFileName(asset, true);
                    createBlankTransparentPng(fallbackSize.width, fallbackSize.height)
                        .then(function (blob) {
                            downloadBlob(new File([blob], fallbackName, { type: 'image/png' }));
                            toast(
                                'Saved blank ' +
                                    fallbackSize.width +
                                    '×' +
                                    fallbackSize.height +
                                    ' transparent PNG (' +
                                    fallbackName +
                                    ').'
                            );
                        })
                        .catch(function () {
                            toast((err && err.message) || 'Could not save that asset.');
                        });
                    return;
                }
                toast((err && err.message) || 'Could not save that asset.');
            });
    }

    function assetSizeLabel(asset) {
        if (!asset || asset.kind === 'font') return 'Font file';
        var target = assetTargetSize(asset.path);
        return target ? target.width + ' × ' + target.height : 'Source size';
    }

    function isAssetKeyUsedElsewhere(candidateKey, ignorePath) {
        if (!candidateKey) return false;
        if (state.assetOverrides && state.assetOverrides[candidateKey]) {
            var usedByOther = (state.assets || []).some(function (item) {
                return item.path !== ignorePath && localKey('', item.value) === candidateKey;
            });
            if (usedByOther) return true;
        }
        return (state.assets || []).some(function (item) {
            return item.path !== ignorePath && localKey('', item.value) === candidateKey;
        });
    }

    function defaultAssetFileName(asset, file) {
        var rawName = fileName((file && file.name) || '');
        var extMatch = /\.([a-z0-9]+)$/i.exec(rawName);
        var rawExt = extMatch ? extMatch[1].toLowerCase() : '';
        var base = 'asset';
        if (asset.path === 'fileConfig.folderIcon') base = 'folder';
        else if (asset.path === 'fileConfig.musicIcon') base = 'music_file';
        else base = rawName.replace(/\.[^.]+$/, '') || 'asset';
        var ext;
        if (asset.kind === 'font') {
            ext = /^(ttf|otf|woff2?)$/.test(rawExt) ? rawExt : 'ttf';
        } else {
            var type = String((file && file.type) || '').toLowerCase();
            ext =
                type.indexOf('jpeg') !== -1 || rawExt === 'jpg' || rawExt === 'jpeg'
                    ? 'jpg'
                    : type.indexOf('webp') !== -1 || rawExt === 'webp'
                      ? 'webp'
                      : type.indexOf('gif') !== -1 || rawExt === 'gif'
                        ? 'gif'
                        : 'png';
        }
        var candidate = base + '.' + ext;
        if (
            isPlaceholderValue(candidate) ||
            /^clipboard-image$/i.test(base) ||
            isAssetKeyUsedElsewhere(localKey('', candidate), asset.path)
        ) {
            var slotSlug = String(asset.path || 'asset')
                .replace(/[^\w.-]+/g, '_')
                .replace(/^_+|_+$/g, '');
            candidate = (slotSlug || 'asset') + '.' + ext;
        }
        return candidate;
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
                var arrayKey = String(path || '').split('.').pop();
                node.forEach(function (value, index) {
                    var childPath = path + '.' + index;
                    /* Arrays of filenames (battery levels, charging levels) are
                       assets in their own right. Without this branch the status
                       bar drew a battery the tray had no row for, so clicking it
                       selected nothing. */
                    if (typeof value === 'string') {
                        if (!isThemeAssetValue(value)) return;
                        defs.push({
                            path: childPath,
                            value: value.trim(),
                            section: assetSection(topKey || arrayKey),
                            label: assetLabel(arrayKey, childPath) + ' ' + (index + 1),
                            kind: assetKind(childPath, value)
                        });
                        return;
                    }
                    walk(value, childPath, topKey);
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
        /* The launcher always draws a File manager row, so its slot has to be
           editable even in a theme that never shipped art for it. */
        [
            ['fileConfig.folderIcon', 'Folder icon'],
            ['fileConfig.musicIcon', 'Music file icon'],
            ['homePageConfig.fileManager', 'File manager']
        ].forEach(function (optional) {
            if (known[optional[0]]) return;
            defs.push({
                path: optional[0],
                value: String(readPath(config || {}, optional[0]) || '').trim(),
                section: assetSection(optional[0].split('.')[0]),
                label: optional[1],
                kind: 'image'
            });
        });
        /* Item chrome the theme declares but leaves blank: without these, a
           theme with empty itemBackground / itemRightArrow has no slot to edit,
           so focusing one of its menu rows could not offer the item's related
           assets at all. Only slots the config actually mentions are added. */
        [
            ['itemConfig.itemBackground', 'Item background'],
            ['itemConfig.itemSelectedBackground', 'Selected item background'],
            ['itemConfig.itemRightArrow', 'Item right arrow'],
            ['menuConfig.menuItemBackground', 'Menu item background'],
            ['menuConfig.menuItemSelectedBackground', 'Selected menu item background'],
            ['dialogConfig.dialogOptionBackground', 'Dialog option background'],
            ['dialogConfig.dialogOptionSelectedBackground', 'Selected dialog option background']
        ].forEach(function (optional) {
            if (known[optional[0]]) return;
            var declared = readPath(config || {}, optional[0]);
            if (typeof declared !== 'string') return;
            defs.push({
                path: optional[0],
                value: String(declared || '').trim(),
                section: assetSection(optional[0].split('.')[0]),
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
        if (state.sourceType === 'gallery' && state.folder) return galleryFileUrl(galleryContentFolder(), value);
        return '';
    }

    /* —— Blank slots ——————————————————————————————————————————————
       When a theme leaves an asset out, the player draws its own icon there.
       Every slot the fully utilised reference theme (Melody Munchkin) fills a
       config.json line for therefore gets a line pointing at one shared
       transparent.png placeholder: the device keeps the gap, and the tray
       reads "Blank" instead of a filename or "No file".
       Core home-menu keys are deliberately excluded: adding one would add a row
       to the theme's home screen, so only the four the gallery has always
       backfilled are listed. */
    var PLACEHOLDER_FILE = 'transparent.png';
    /* 1x1 RGBA, every channel zero. The widely copied "transparent" snippet is
       actually an opaque red pixel, which is what blank slots used to render. */
    var PLACEHOLDER_PNG_BASE64 =
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVR42mNgAAIAAAUAAen63NgAAAAASUVORK5CYII=';

    var BLANK_SLOT_PATHS = [
        'desktopWallpaper',
        'globalWallpaper',
        'desktopMask',
        'itemConfig.itemBackground',
        'itemConfig.itemSelectedBackground',
        'itemConfig.itemRightArrow',
        'menuConfig.menuItemBackground',
        'menuConfig.menuItemSelectedBackground',
        'dialogConfig.dialogOptionBackground',
        'dialogConfig.dialogOptionSelectedBackground',
        'homePageConfig.ebook',
        'homePageConfig.calendar',
        'homePageConfig.calculator',
        'homePageConfig.fileManager',
        'fileConfig.folderIcon',
        'fileConfig.musicIcon',
        'settingConfig.settingMask',
        'settingConfig.shutdown',
        'settingConfig.timedShutdown_off',
        'settingConfig.timedShutdown_10',
        'settingConfig.timedShutdown_20',
        'settingConfig.timedShutdown_30',
        'settingConfig.timedShutdown_60',
        'settingConfig.timedShutdown_90',
        'settingConfig.timedShutdown_120',
        'settingConfig.shuffleOn',
        'settingConfig.shuffleOff',
        'settingConfig.repeatOff',
        'settingConfig.repeatAll',
        'settingConfig.repeatOne',
        'settingConfig.equalizer_normal',
        'settingConfig.equalizer_classical',
        'settingConfig.equalizer_dance',
        'settingConfig.equalizer_flat',
        'settingConfig.equalizer_folk',
        'settingConfig.equalizer_heavymetal',
        'settingConfig.equalizer_hiphop',
        'settingConfig.equalizer_jazz',
        'settingConfig.equalizer_pop',
        'settingConfig.equalizer_rock',
        'settingConfig.keyLockOn',
        'settingConfig.keyLockOff',
        'settingConfig.keyToneOn',
        'settingConfig.keyToneOff',
        'settingConfig.keyVibrationOn',
        'settingConfig.keyVibrationOff',
        'settingConfig.wallpaper',
        'settingConfig.backlight_10',
        'settingConfig.backlight_15',
        'settingConfig.backlight_30',
        'settingConfig.backlight_45',
        'settingConfig.backlight_60',
        'settingConfig.backlight_120',
        'settingConfig.backlight_300',
        'settingConfig.backlight_always',
        'settingConfig.brightness',
        'settingConfig.displayBatteryOn',
        'settingConfig.displayBatteryOff',
        'settingConfig.dateTime',
        'settingConfig.language',
        'settingConfig.launcher',
        'settingConfig.factoryReset',
        'settingConfig.clearCache',
        'settingConfig.theme',
        'settingConfig.fileExtensionOn',
        'settingConfig.fileExtensionOff',
        'statusConfig.playing',
        'statusConfig.audiobookPlaying',
        'statusConfig.pause',
        'statusConfig.fmPlaying',
        'statusConfig.stop',
        'statusConfig.blConnected',
        'statusConfig.blConnecting',
        'statusConfig.blDisconnected',
        'statusConfig.headsetWithMic',
        'statusConfig.headsetWithoutMic'
    ];

    var BLANK_SLOT_ARRAYS = {
        'statusConfig.battery': 4,
        'statusConfig.batteryCharging': 4
    };

    function isPlaceholderValue(value) {
        return fileName(String(value || '')).toLowerCase() === PLACEHOLDER_FILE;
    }

    function configUsesPlaceholder(config) {
        var values = collectConfigAssetValues(config || {});
        for (var i = 0; i < values.length; i += 1) {
            if (isPlaceholderValue(values[i])) return true;
        }
        return false;
    }

    function decodeBase64Png(base64) {
        var binary = '';
        try {
            binary = window.atob(base64);
        } catch (e) {
            binary = '';
        }
        var bytes = new Uint8Array(binary.length);
        for (var i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
        return bytes;
    }

    /* A fresh canvas is fully transparent, so let the browser encode the
       placeholder: no hand-copied sprite can be red instead of clear. */
    function placeholderBlob() {
        try {
            var canvas = document.createElement('canvas');
            canvas.width = 1;
            canvas.height = 1;
            var dataUrl = canvas.toDataURL('image/png');
            var encoded = String(dataUrl).split(',')[1] || '';
            var bytes = decodeBase64Png(encoded);
            if (bytes.length) return new Blob([bytes], { type: 'image/png' });
        } catch (e) {}
        return new Blob([decodeBase64Png(PLACEHOLDER_PNG_BASE64)], { type: 'image/png' });
    }

    /* One file backs every blank slot, exactly like the themes on disk: the
       package ships a single transparent.png and each config line points at it. */
    function ensurePlaceholderAsset() {
        var existing = state.assetOverrides[PLACEHOLDER_FILE];
        if (existing && existing.placeholder) return existing;
        if (existing && existing.url) revokeAssetUrl(existing.url);
        var blob = placeholderBlob();
        var url = URL.createObjectURL(blob);
        state.assetUrls.push(url);
        var entry = {
            blob: blob,
            url: url,
            name: PLACEHOLDER_FILE,
            size: blob.size,
            type: 'image/png',
            placeholder: true
        };
        state.assetOverrides[PLACEHOLDER_FILE] = entry;
        if (state.sourceType === 'local') {
            if (!state.localFileMap[PLACEHOLDER_FILE]) {
                state.localFileMap[PLACEHOLDER_FILE] = blob;
                state.localFiles.push({ path: PLACEHOLDER_FILE, blob: blob });
            }
            if (!state.localMap[PLACEHOLDER_FILE]) state.localMap[PLACEHOLDER_FILE] = url;
        }
        return entry;
    }

    function fillBlankSlots(config) {
        if (!config || typeof config !== 'object') return false;
        var changed = false;
        BLANK_SLOT_PATHS.forEach(function (path) {
            var current = readPath(config, path);
            if (typeof current !== 'string' || !current.trim()) {
                writePath(config, path, PLACEHOLDER_FILE);
                changed = true;
            }
        });
        Object.keys(BLANK_SLOT_ARRAYS).forEach(function (path) {
            var arity = BLANK_SLOT_ARRAYS[path];
            var current = readPath(config, path);
            var next = [];
            for (var i = 0; i < arity; i += 1) {
                var item = Array.isArray(current) ? current[i] : '';
                next.push(typeof item === 'string' && item.trim() ? item : PLACEHOLDER_FILE);
            }
            if (!Array.isArray(current) || current.length !== arity || next.join('\u0000') !== current.join('\u0000')) {
                writePath(config, path, next);
                changed = true;
            }
        });
        return changed;
    }

    function applyBlankSlots(config) {
        var changed = fillBlankSlots(config);
        if (changed || configUsesPlaceholder(config)) ensurePlaceholderAsset();
        return changed;
    }

    function rebuildAssets(opts) {
        opts = opts || {};
        var defs = collectAssetDefinitions(state.config || {});
        state.assetById = Object.create(null);
        state.assets = defs.map(function (def, index) {
            var baseValue = readPath(state.configBase || {}, def.path);
            var key = localKey('', def.value);
            var override = state.assetOverrides[key];
            var placeholderOverride = !!(override && override.placeholder);
            var localMissing = false;
            if (state.sourceType === 'local' && def.value && !override) {
                localMissing = !(state.localFileMap && state.localFileMap[key]);
            }
            var missingValue = state.missingAssetValues[def.path] || '';
            var asset = {
                id: def.path,
                path: def.path,
                value: def.value,
                missingFile: !!missingValue,
                missingValue: missingValue,
                label: def.label,
                section: def.section,
                kind: def.kind,
                url: resolveStoredAssetUrl(def.value),
                override: override || null,
                missing: localMissing,
                localMissing: localMissing,
                placeholder: placeholderOverride || isPlaceholderValue(def.value),
                empty: !String(def.value || '').trim(),
                changed:
                    (!!override && !placeholderOverride) ||
                    String(baseValue || '') !== String(def.value || ''),
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
        renderAssets(opts);
        renderColorEditor();
        renderStatusEditor();
        renderMaskEditor();
        /* Adding or binning the file manager icon changes which players the
           theme is listed for, so the badge follows the asset list. */
        refreshPlatformChip();
    }

    /* —— Status bar states ——

       A theme ships four battery levels, a charging set and a handful of
       indicator icons. The legacy editor let people pick the state they were
       looking at; these chips do the same and jump straight to the artwork in
       the tray, which is where the blinking cursor usually ends up. */

    var STATUS_STATES = [
        { path: 'statusConfig.battery.0', label: 'Battery 1 of 4', state: { batteryLevel: 0, isCharging: false } },
        { path: 'statusConfig.battery.1', label: 'Battery 2 of 4', state: { batteryLevel: 1, isCharging: false } },
        { path: 'statusConfig.battery.2', label: 'Battery 3 of 4', state: { batteryLevel: 2, isCharging: false } },
        { path: 'statusConfig.battery.3', label: 'Battery full', state: { batteryLevel: 3, isCharging: false } },
        { path: 'statusConfig.batteryCharging.0', label: 'Charging, low', state: { batteryLevel: 0, isCharging: true } },
        { path: 'statusConfig.batteryCharging.3', label: 'Charging, full', state: { batteryLevel: 3, isCharging: true } },
        { path: 'statusConfig.blConnected', label: 'Bluetooth connected', state: { bluetoothState: 'connected' } },
        { path: 'statusConfig.blConnecting', label: 'Bluetooth connecting', state: { bluetoothState: 'connecting' } },
        { path: 'statusConfig.blDisconnected', label: 'Bluetooth off', state: { bluetoothState: 'disconnected' } },
        { path: 'statusConfig.headsetWithMic', label: 'Headset, with mic', state: { headsetState: 'withMic' } },
        { path: 'statusConfig.headsetWithoutMic', label: 'Headset, no mic', state: { headsetState: 'withoutMic' } },
        { path: 'statusConfig.playing', label: 'Playing', state: { playState: 'playing' } },
        { path: 'statusConfig.pause', label: 'Paused', state: { playState: 'pause' } },
        { path: 'statusConfig.stop', label: 'Stopped', state: { playState: 'stop' } },
        { path: 'statusConfig.fmPlaying', label: 'Radio playing', state: { playState: 'fmPlaying' } },
        { path: 'statusConfig.audiobookPlaying', label: 'Audiobook playing', state: { playState: 'audiobookPlaying' } }
    ];

    function statusEditorHost() {
        if (el.statusEditor) return el.statusEditor;
        var pane = document.getElementById('pane-edit');
        if (!pane) return null;
        var host = document.createElement('div');
        host.className = 'studio-status-editor';
        host.id = 'studio-status-editor';
        host.innerHTML =
            '<div class="studio-status-head">' +
            '<h3>Status bar</h3>' +
            '<p class="studio-hint">Pick a state to show it in the preview and open that file in the tray.</p>' +
            '</div>' +
            '<div class="studio-status-text" role="group" aria-label="Status bar text colour">' +
            '<span>Status text</span>' +
            '<button type="button" data-status-text="auto">Auto</button>' +
            '<button type="button" data-status-text="light">Light</button>' +
            '<button type="button" data-status-text="dark">Dark</button>' +
            '</div>' +
            '<div class="studio-status-chips" role="group" aria-label="Status bar states"></div>';
        each(host.querySelectorAll('[data-status-text]'), function (button) {
            button.addEventListener('click', function () {
                setStatusTextChoice(button.getAttribute('data-status-text'));
            });
        });
        var anchor = el.colorEditor && el.colorEditor.parentNode === pane ? el.colorEditor : pane.querySelector('.studio-pane-actions');
        if (anchor && anchor.parentNode === pane) pane.insertBefore(host, anchor);
        else pane.appendChild(host);
        el.statusEditor = host;
        return host;
    }

    function renderStatusEditor() {
        var host = statusEditorHost();
        if (!host) return;
        var statusCfg = (state.config && state.config.statusConfig) || {};
        var choice = statusTextChoice(statusCfg);
        each(host.querySelectorAll('[data-status-text]'), function (button) {
            var active = button.getAttribute('data-status-text') === choice;
            button.classList.toggle('is-active', active);
            button.setAttribute('aria-pressed', active ? 'true' : 'false');
        });
        var chips = host.querySelector('.studio-status-chips');
        if (!chips) return;
        chips.innerHTML = '';
        var shown = 0;
        STATUS_STATES.forEach(function (entry) {
            var asset = state.assetById[entry.path];
            if (!asset) return;
            var button = document.createElement('button');
            button.type = 'button';
            button.className = 'studio-status-chip';
            button.setAttribute('data-status-path', entry.path);
            /* A chip is a state, not just a file: the one whose state the
               status bar is showing stays lit. */
            var active = false;
            if (entry.state) {
                active = Object.keys(entry.state).every(function (key) {
                    return state.statusState[key] === entry.state[key];
                });
            }
            button.classList.toggle('is-active', active);
            button.innerHTML = '<span>' + entry.label + '</span>';
            if (asset.changed) button.classList.add('is-changed');
            button.addEventListener('click', function () {
                /* The strip is the context: icons plus the colours they sit
                   on, listed together in the tray. */
                setRelatedAssets(entry.path, statusStripIds(entry.path), 'Status bar icons and the font');
                /* selectAsset applies the state this art stands for and
                   rebuilds the preview. */
                selectAsset(entry.path, { reveal: true });
            });
            chips.appendChild(button);
            shown += 1;
        });
        host.hidden = !shown;
    }

    /* —— Masks —— */

    /* Two overlays decide how the menus sit on the wallpaper: one for the home
       list, one for the settings list. They are ordinary image slots, but they
       are easy to lose among eighty other assets, so they get their own panel
       with the same replace / blank / swap-from-theme actions. */
    var MASK_SLOTS = [
        { id: 'desktopMask', label: 'Home menu mask', screen: 'Home screen' },
        { id: 'settingConfig.settingMask', label: 'Settings mask', screen: 'Settings list' }
    ];

    var assetSwitchMenu = null;
    var assetSwitchAnchor = null;

    /* The little chevron next to a preview heading. It opens the set the asset
       belongs to (the two masks, or the rest of its section) so the large
       preview can be switched without finding a row or pressing Show. */
    function assetSwitchButton(assetId, label) {
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'studio-asset-switch-toggle';
        btn.setAttribute('aria-haspopup', 'menu');
        btn.setAttribute('aria-expanded', 'false');
        btn.setAttribute('data-asset-switch', assetId);
        btn.title = 'Preview another asset from ' + (label || 'this set');
        var icon = document.createElement('i');
        icon.className = 'fa-solid fa-chevron-down';
        icon.setAttribute('aria-hidden', 'true');
        btn.appendChild(icon);
        btn.addEventListener('click', function (event) {
            event.preventDefault();
            event.stopPropagation();
            /* The detail heading reuses one button as the selection changes,
               so read the current id rather than the one it was born with. */
            openAssetSwitchMenu(btn, btn.getAttribute('data-asset-switch') || assetId);
        });
        return btn;
    }

    function assetSwitchSet(asset) {
        if (!asset) return [];
        if (maskScreenFor(asset)) {
            return MASK_SLOTS.map(function (slot) {
                return state.assetById[slot.id];
            }).filter(Boolean);
        }
        return state.assets.filter(function (item) {
            return item.section === asset.section;
        });
    }

    function closeAssetSwitchMenu() {
        if (assetSwitchMenu && assetSwitchMenu.parentNode) assetSwitchMenu.parentNode.removeChild(assetSwitchMenu);
        if (assetSwitchAnchor) assetSwitchAnchor.setAttribute('aria-expanded', 'false');
        assetSwitchMenu = null;
        assetSwitchAnchor = null;
        document.removeEventListener('pointerdown', onAssetSwitchOutside, true);
        document.removeEventListener('keydown', onAssetSwitchKey, true);
    }

    function onAssetSwitchOutside(event) {
        if (assetSwitchMenu && assetSwitchMenu.contains(event.target)) return;
        if (assetSwitchAnchor && assetSwitchAnchor.contains(event.target)) return;
        closeAssetSwitchMenu();
    }

    function onAssetSwitchKey(event) {
        if (event.key === 'Escape') closeAssetSwitchMenu();
    }

    function openAssetSwitchMenu(anchor, currentId) {
        closeAssetSwitchMenu();
        var asset = state.assetById[currentId];
        if (!asset) return;
        var items = assetSwitchSet(asset);
        if (!items.length) return;

        var menu = document.createElement('div');
        menu.className = 'studio-asset-switch-menu';
        menu.setAttribute('role', 'menu');
        menu.setAttribute('aria-label', 'Preview another asset from this set');

        items.forEach(function (item) {
            var row = document.createElement('button');
            row.type = 'button';
            row.className = 'studio-asset-switch-item' + (item.id === currentId ? ' is-current' : '');
            row.setAttribute('role', 'menuitem');
            var thumb = document.createElement('span');
            thumb.className = 'studio-asset-switch-thumb';
            if (item.url && item.kind === 'image' && !item.missingFile) {
                var img = document.createElement('img');
                img.src = item.url;
                img.alt = '';
                thumb.appendChild(img);
            } else {
                var glyph = document.createElement('i');
                glyph.className = item.kind === 'font' ? 'fa-solid fa-font' : 'fa-regular fa-image';
                glyph.setAttribute('aria-hidden', 'true');
                thumb.appendChild(glyph);
            }
            var text = document.createElement('span');
            text.className = 'studio-asset-switch-copy';
            var name = document.createElement('strong');
            name.textContent = item.label;
            var file = document.createElement('span');
            file.textContent = assetFileLabel(item);
            text.appendChild(name);
            text.appendChild(file);
            row.appendChild(thumb);
            row.appendChild(text);
            if (item.id === currentId) {
                var check = document.createElement('i');
                check.className = 'fa-solid fa-check studio-asset-switch-check';
                check.setAttribute('aria-hidden', 'true');
                row.appendChild(check);
            }
            row.addEventListener('click', function () {
                closeAssetSwitchMenu();
                selectAsset(item.id, { reveal: true });
                focusTrayAsset(item.id);
            });
            menu.appendChild(row);
        });

        document.body.appendChild(menu);
        assetSwitchMenu = menu;
        assetSwitchAnchor = anchor;
        anchor.setAttribute('aria-expanded', 'true');
        var box = anchor.getBoundingClientRect();
        var left = Math.max(8, Math.min(window.innerWidth - menu.offsetWidth - 8, box.right - menu.offsetWidth));
        var top = box.bottom + 6;
        if (top + menu.offsetHeight > window.innerHeight - 8) {
            top = Math.max(8, box.top - menu.offsetHeight - 6);
        }
        menu.style.left = left + 'px';
        menu.style.top = top + 'px';
        document.addEventListener('pointerdown', onAssetSwitchOutside, true);
        document.addEventListener('keydown', onAssetSwitchKey, true);
        var first = menu.querySelector('.is-current') || menu.querySelector('.studio-asset-switch-item');
        if (first) first.focus();
    }

    function maskActionButton(id, action, icon, label, primary) {
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.setAttribute('data-mask-action', action);
        btn.setAttribute('data-mask-id', id);
        if (primary) btn.className = 'is-primary';
        btn.title = label;
        var glyph = document.createElement('i');
        glyph.className = 'fa-solid ' + icon;
        glyph.setAttribute('aria-hidden', 'true');
        var text = document.createElement('span');
        text.textContent = label;
        btn.appendChild(glyph);
        btn.appendChild(text);
        return btn;
    }

    function renderMaskEditor() {
        if (!el.maskEditor) return;
        var slots = MASK_SLOTS.filter(function (slot) {
            return !!state.assetById[slot.id];
        });
        el.maskEditor.innerHTML = '';
        el.maskEditor.hidden = slots.length === 0;
        if (!slots.length) return;

        var head = document.createElement('div');
        head.className = 'studio-mask-head';
        var title = document.createElement('p');
        title.className = 'studio-eyebrow';
        title.textContent = 'Masks';
        var hint = document.createElement('span');
        hint.textContent = slots.length + (slots.length === 1 ? ' overlay' : ' overlays');
        head.appendChild(title);
        head.appendChild(hint);
        el.maskEditor.appendChild(head);

        var grid = document.createElement('div');
        grid.className = 'studio-mask-grid';
        slots.forEach(function (slot) {
            var asset = state.assetById[slot.id];
            var status = assetStatus(asset);
            var card = document.createElement('article');
            card.className = 'studio-mask-card';
            card.setAttribute('data-mask-slot', slot.id);

            var top = document.createElement('div');
            top.className = 'studio-mask-top';
            var art = document.createElement('span');
            art.className = 'studio-mask-art';
            /* Prefer the live screen crop; the file itself is only the fallback
               until the preview has mounted (refreshMaskThumbs retries). */
            var cropPainted = paintMaskCardCrop(art, asset);
            if (cropPainted) {
                art.classList.add('has-live-crop');
                var fallbackImg = document.createElement('img');
                fallbackImg.alt = '';
                fallbackImg.src = asset.url || '';
                art.appendChild(fallbackImg);
            } else if (asset.url && asset.kind === 'image' && !asset.missingFile) {
                var img = document.createElement('img');
                img.alt = '';
                img.src = asset.url;
                art.appendChild(img);
            } else {
                art.innerHTML = '<i class="fa-regular fa-image" aria-hidden="true"></i>';
            }
            var copy = document.createElement('span');
            copy.className = 'studio-mask-copy';
            var nameRow = document.createElement('span');
            nameRow.className = 'studio-mask-title';
            var name = document.createElement('strong');
            name.textContent = slot.label;
            nameRow.appendChild(name);
            nameRow.appendChild(assetSwitchButton(slot.id, slot.label));
            var file = document.createElement('span');
            file.textContent = assetFileLabel(asset) + ' · ' + slot.screen;
            file.title = asset.placeholder
                ? 'Blank: the transparent.png placeholder keeps the device from drawing its own art'
                : asset.value || 'Blank';
            var badge = document.createElement('span');
            badge.className = 'studio-mask-badge is-' + status.key;
            badge.textContent = status.label;
            copy.appendChild(nameRow);
            copy.appendChild(file);
            copy.appendChild(badge);
            top.appendChild(art);
            top.appendChild(copy);

            var actions = document.createElement('div');
            actions.className = 'studio-mask-actions';
            actions.appendChild(maskActionButton(slot.id, 'preview', 'fa-eye', 'Show', false));
            actions.appendChild(maskActionButton(slot.id, 'replace', 'fa-images', 'Replace', true));
            actions.appendChild(maskActionButton(slot.id, 'save', 'fa-download', 'Save', false));
            actions.appendChild(maskActionButton(slot.id, 'blank', 'fa-trash-can', 'Blank', false));
            actions.appendChild(maskActionButton(slot.id, 'theme', 'fa-palette', 'Theme', false));

            card.appendChild(top);
            card.appendChild(actions);
            grid.appendChild(card);
        });
        el.maskEditor.appendChild(grid);

        var foot = document.createElement('p');
        foot.className = 'studio-mask-hint';
        foot.textContent = 'Blank swaps in a fully transparent PNG, so the device keeps the gap instead of drawing its own overlay.';
        el.maskEditor.appendChild(foot);
    }

    function assetStatus(asset) {
        if (asset.override && !asset.override.placeholder) return { label: 'Replaced', key: 'changed' };
        if (asset.localMissing) return { label: 'Missing', key: 'missing' };
        if (asset.missingFile) return { label: 'Missing', key: 'missing' };
        if (asset.placeholder || asset.empty) return { label: 'Blank', key: 'empty' };
        if (asset.changed) return { label: 'Changed', key: 'changed' };
        return { label: 'Ready', key: 'ready' };
    }

    /* A blank slot never shows a filename: it shows what it is. */
    function assetFileLabel(asset) {
        if (!asset) return 'Blank';
        if (asset.missingFile) return (fileName(asset.missingValue) || 'file') + ' (missing)';
        if (asset.placeholder || !String(asset.value || '').trim()) return 'Blank';
        return fileName(asset.value) || 'Blank';
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
        decorateAssetThumb(thumb, asset);
        if (asset.url && asset.kind === 'image' && !asset.missingFile) {
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
        file.textContent = assetFileLabel(asset) + ' · ' + assetSizeLabel(asset);
        file.title = asset.placeholder
            ? 'Blank: the transparent.png placeholder keeps the device from drawing its own art'
            : asset.value || 'Blank';
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
        var rowActions = [
            ['import', 'fa-images', 'Select file from ' + (saveTarget.device || 'device') + ' for ' + asset.label],
            ['theme', 'fa-palette', 'Use ' + asset.label + ' from another gallery theme'],
            ['save', 'fa-download', (saveTarget.saveAssetLabel || 'Save asset') + ' (' + asset.label + ')'],
            ['paste', 'fa-paste', 'Paste into ' + asset.label]
        ];
        if (asset.kind !== 'font') {
            rowActions.push(['blank', 'fa-trash-can', 'Bin ' + asset.label + ' and use a transparent placeholder']);
        }
        rowActions.forEach(function (action) {
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

    /* An asset rarely stands alone: a menu row is its icon plus the item
       background, the selected background and the right arrow. Editing an icon
       from the preview should surface that group next to the row it belongs to,
       which is the difference between a usable tray and a search exercise on a
       phone. */
    function toggleStem(id) {
        var match = String(id || '').match(/^(.*?)(on|off)$/i);
        return match ? match[1].toLowerCase() : '';
    }

    function relatedIdsFor(id) {
        var out = [];
        function add(candidate) {
            if (!candidate || candidate === id) return;
            if (!state.assetById[candidate] || out.indexOf(candidate) !== -1) return;
            out.push(candidate);
        }
        var itemChrome = ['itemConfig.itemBackground', 'itemConfig.itemSelectedBackground', 'itemConfig.itemRightArrow'];
        var stem = toggleStem(id);
        if (stem) {
            state.assets.forEach(function (asset) {
                if (asset.id !== id && toggleStem(asset.id) === stem) add(asset.id);
            });
        }
        if (/^homePageConfig\./.test(id)) {
            add('fontFamily');
            itemChrome.forEach(add);
            ['menuConfig.menuItemBackground', 'menuConfig.menuItemSelectedBackground'].forEach(add);
        } else if (/^(setting|item|file)Config\./.test(id)) {
            add('fontFamily');
            itemChrome.forEach(add);
        } else if (/^menuConfig\./.test(id)) {
            add('fontFamily');
            ['menuConfig.menuItemBackground', 'menuConfig.menuItemSelectedBackground'].forEach(add);
        } else if (/^dialogConfig\./.test(id)) {
            add('fontFamily');
            ['dialogConfig.dialogOptionBackground', 'dialogConfig.dialogOptionSelectedBackground'].forEach(add);
        }
        return out;
    }

    function setRelatedAssets(id, explicitIds, title) {
        state.relatedAnchor = id || '';
        state.relatedTitle = id && title ? String(title) : '';
        state.relatedIds = !id ? [] : explicitIds && explicitIds.length ? explicitIds.slice() : relatedIdsFor(id);
        state.relatedColors = !id ? [] : relatedColorPaths(id);
        renderAssets();
    }

    function clearRelatedAssets() {
        if (!state.relatedAnchor && !state.relatedIds.length) return false;
        state.relatedAnchor = '';
        state.relatedIds = [];
        state.relatedTitle = '';
        state.relatedColors = [];
        renderAssets();
        return true;
    }

    function statusStripIds(exceptId) {
        return state.assets
            .filter(function (item) {
                return /^statusConfig\./.test(item.id) || item.id === 'fontFamily';
            })
            .map(function (item) {
                return item.id;
            })
            .filter(function (itemId) {
                return itemId !== exceptId;
            });
    }

    function createRelatedBlock(anchorId) {
        var colourDefs = colorDefsForPaths(state.relatedColors);
        if ((!state.relatedIds.length && !colourDefs.length) || anchorId !== state.relatedAnchor) {
            return null;
        }
        var wrap = document.createElement('div');
        wrap.className = 'studio-related';
        var head = document.createElement('div');
        head.className = 'studio-related-head';
        var title = document.createElement('span');
        title.textContent = state.relatedTitle || 'Also used by this item';
        var count = document.createElement('span');
        count.className = 'studio-related-count';
        count.textContent = state.relatedIds.length
            ? state.relatedIds.length + ' related'
            : colourDefs.length + ' colours';
        var close = document.createElement('button');
        close.type = 'button';
        close.className = 'studio-related-close';
        close.setAttribute('data-related-close', '');
        close.setAttribute('aria-label', 'Hide the related assets');
        close.innerHTML = '<i class="fa-solid fa-xmark" aria-hidden="true"></i>';
        head.appendChild(title);
        head.appendChild(count);
        head.appendChild(close);
        wrap.appendChild(head);
        state.relatedIds.forEach(function (id) {
            var asset = state.assetById[id];
            if (asset) wrap.appendChild(createAssetRow(asset));
        });
        if (colourDefs.length) {
            var sub = document.createElement('div');
            sub.className = 'studio-related-sub';
            sub.textContent = 'Colours';
            wrap.appendChild(sub);
            colourDefs.forEach(function (def) {
                wrap.appendChild(createColorRow(def));
            });
        }
        return wrap;
    }

    /* Gallery themes get their gaps from the build-time manifest; dropped-in
       packages get them from the exported file list. Both should count here so
       the Missing filter matches the badges a row shows. */
    function isMissingAsset(asset) {
        return !!(asset.localMissing || asset.missingFile);
    }

    function assetMatchesFilter(asset, filter) {
        if (filter === 'missing') return isMissingAsset(asset);
        if (filter === 'changed') return !!asset.changed;
        return true;
    }

    function renderAssets(opts) {
        opts = opts || {};
        if (!el.assetList) return;
        var all = state.assets;
        var missing = all.filter(isMissingAsset).length;
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
        var fontColors = filter === 'all' ? typographyColorDefs() : [];
        el.assetList.innerHTML = '';
        if (el.assetEmpty) {
            el.assetEmpty.hidden = visible.length > 0 || fontColors.length > 0;
            el.assetEmpty.textContent = all.length
                ? 'No assets match this filter.'
                : 'This theme does not declare any image or font assets in config.json.';
        }

        var groups = Object.create(null);
        visible.forEach(function (asset) {
            if (!groups[asset.section]) groups[asset.section] = [];
            groups[asset.section].push(asset);
        });
        /* Even a package with no font still has text colour choices. Keep one
           Font family tray for them rather than burying them in Colours. */
        if (filter === 'all' && fontColors.length && !groups['Font family']) {
            groups['Font family'] = [];
        }
        Object.keys(groups).forEach(function (sectionName) {
            var group = document.createElement('details');
            group.className = 'studio-asset-group';
            var trayKey = 'asset:' + sectionName;
            group.open = !!state.openTrays[trayKey];
            group.addEventListener('toggle', function () {
                state.openTrays[trayKey] = group.open;
                if (group.open) {
                    window.requestAnimationFrame(function () {
                        refreshGroupThumbs(group);
                    });
                }
            });
            var summary = document.createElement('summary');
            summary.className = 'studio-asset-group-head';
            var title = document.createElement('span');
            title.textContent = sectionName;
            var sectionColors = sectionName === 'Font family' && filter === 'all' ? fontColors : [];
            var count = document.createElement('span');
            count.className = 'studio-asset-group-count';
            count.textContent = groups[sectionName].length + sectionColors.length;
            summary.appendChild(title);
            summary.appendChild(count);
            group.appendChild(summary);
            var body = document.createElement('div');
            body.className = 'studio-asset-group-body';
            groups[sectionName].forEach(function (asset) {
                body.appendChild(createAssetRow(asset));
                if (asset.id === state.relatedAnchor) {
                    var related = createRelatedBlock(asset.id);
                    if (related) body.appendChild(related);
                }
            });
            if (sectionColors.length) {
                var sub = document.createElement('div');
                sub.className = 'studio-related-sub';
                sub.textContent = 'Text colours';
                body.appendChild(sub);
                sectionColors.forEach(function (def) {
                    body.appendChild(createColorRow(def));
                });
            }
            group.appendChild(body);
            el.assetList.appendChild(group);
        });
        paintAssetSelection();
        if (state.selectedAssetId) highlightPreviewAsset(state.selectedAssetId);
        if (!opts.deferThumbRefresh) scheduleThumbRefresh(30);
    }

    function paintAssetSelection() {
        each(el.assetList ? el.assetList.querySelectorAll('[data-asset-id]') : [], function (row) {
            var active = row.getAttribute('data-asset-id') === state.selectedAssetId;
            row.classList.toggle('is-selected', active);
            row.setAttribute('aria-selected', active ? 'true' : 'false');
        });
        updateAssetDetail();
    }

    /* Ask the simulator to show the screen that draws this asset, so picking a
       row in the tray lands on the right menu screen instead of requiring the
       reader to find it themselves. */
    function revealAssetContext(id) {
        var api = el.preview ? el.preview._y1TpApi : null;
        if (!api || typeof api.revealAsset !== 'function') return false;
        var moved = false;
        try {
            moved = api.revealAsset(id);
        } catch (e) {
            moved = false;
        }
        if (!moved) return false;
        window.setTimeout(function () {
            highlightPreviewAsset(id);
            /* revealAsset may have switched screens, so the detail plate can
               now crop the screen that actually contains this asset. */
            if (state.selectedAssetId === id) updateAssetDetail();
            var nodes = previewAssetNodes(id);
            if (!nodes.length) return;
            if (window.matchMedia('(max-width: 940px)').matches) {
                try {
                    nodes[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
                } catch (e) {}
            }
        }, 90);
        return true;
    }

    /* Each status icon stands for a state. Choosing its art is also choosing
       that state, so picking the low battery draws a low battery in the
       preview instead of leaving the old level on screen. */
    var STATUS_STATE_ASSETS = {
        'statusConfig.blConnected': { bluetoothState: 'connected' },
        'statusConfig.blConnecting': { bluetoothState: 'connecting' },
        'statusConfig.blDisconnected': { bluetoothState: 'disconnected' },
        'statusConfig.headsetWithMic': { headsetState: 'withMic' },
        'statusConfig.headsetWithoutMic': { headsetState: 'withoutMic' },
        'statusConfig.playing': { playState: 'playing' },
        'statusConfig.pause': { playState: 'pause' },
        'statusConfig.stop': { playState: 'stop' },
        'statusConfig.fmPlaying': { playState: 'fmPlaying' },
        'statusConfig.audiobookPlaying': { playState: 'audiobookPlaying' }
    };

    function statusStatePatchFor(path) {
        var key = String(path || '');
        if (STATUS_STATE_ASSETS[key]) return STATUS_STATE_ASSETS[key];
        var battery = /^statusConfig\.battery\.(\d)$/.exec(key);
        if (battery) return { batteryLevel: Number(battery[1]), isCharging: false };
        var charging = /^statusConfig\.batteryCharging\.(\d)$/.exec(key);
        if (charging) return { batteryLevel: Number(charging[1]), isCharging: true };
        return null;
    }

    function applyStatusStateForAsset(path) {
        var patch = statusStatePatchFor(path);
        if (!patch) return false;
        var changed = false;
        Object.keys(patch).forEach(function (key) {
            if (state.statusState[key] !== patch[key]) {
                state.statusState[key] = patch[key];
                changed = true;
            }
        });
        return changed;
    }

    function selectAsset(id, options) {
        if (!id || !state.assetById[id]) return;
        state.selectedAssetId = id;
        var statusChanged = options && options.keepStatus ? false : applyStatusStateForAsset(id);
        if (statusChanged) renderStatusEditor();
        paintAssetSelection();
        if (options && options.skipRemount) {
            highlightPreviewAsset(id);
        } else if (statusChanged) {
            /* The preview has to be rebuilt: these states live in the
               simulator, not in the files. */
            mountPreview({ focusAssetId: id })
                .then(function () {
                    renderStatusEditor();
                })
                .catch(function () {});
        } else if (options && options.reveal) {
            revealAssetContext(id);
        } else {
            highlightPreviewAsset(id);
        }
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

    function highlightPreviewAsset(path, opts) {
        clearPreviewAssetLink();
        if (!path) return;
        if (!(opts && opts.skipCanvasOutline)) {
            each(previewAssetNodes(path), function (node) {
                node.classList.add('is-studio-linked');
            });
        }
        each(el.assetList ? el.assetList.querySelectorAll('[data-asset-id]') : [], function (row) {
            if (row.getAttribute('data-asset-id') === path) row.classList.add('is-preview-linked');
        });
    }

    function focusTrayAsset(id) {
        window.setTimeout(function () {
            var row = null;
            each(el.assetList ? el.assetList.querySelectorAll('[data-asset-id]') : [], function (candidate) {
                if (!row && candidate.getAttribute('data-asset-id') === id) row = candidate;
            });
            if (!row) return;
            /* A collapsed tray hides its rows, so a jump into one has to open
               it first or the scroll has nothing to land on. */
            var tray = row.closest('details');
            if (tray && !tray.open) tray.open = true;
            /* With a related group open, the group is the payload of the tap: pin
               the item row to the top of the tray so the related rows below it are
               on screen. Centering the row on a 240px watch pushed them a screen
               below the fold, which made the tap look like it did nothing. */
            var related = row.parentElement ? row.parentElement.querySelector('.studio-related') : null;
            var target = related && related.previousElementSibling ? related.previousElementSibling : row;
            try {
                target.scrollIntoView({ behavior: 'auto', block: related ? 'start' : 'center' });
                if (related) {
                    /* On a watch-height tray the row plus the group is taller than the
                       pane, so pinning the row still leaves the group off screen. Give
                       the group the top of the pane instead: it is what the tap asked for. */
                    var first = related.querySelector('[data-asset-id]');
                    var box = first ? first.getBoundingClientRect() : null;
                    if (!box || box.top < 0 || box.bottom > window.innerHeight + 1) {
                        related.scrollIntoView({ behavior: 'auto', block: 'start' });
                    }
                }
                row.focus({ preventScroll: true });
            } catch (e) {}
        }, 80);
    }

    /* A colour is not a file in the asset list, so clicking the status text or
       the bar itself opens the strip around it instead: every status icon plus
       the two colours that paint the bar, with nothing simulated changing. */
    function revealStatusColors() {
        var anchor = state.assetById.fontFamily ? 'fontFamily' : '';
        if (!anchor) {
            [
                'statusConfig.playing',
                'statusConfig.pause',
                'statusConfig.stop',
                'statusConfig.battery.3',
                'statusConfig.battery.2',
                'statusConfig.battery.1',
                'statusConfig.battery.0'
            ].some(function (id) {
                if (state.assetById[id]) {
                    anchor = id;
                    return true;
                }
                return false;
            });
        }
        if (!anchor) return false;
        setMode('edit');
        if (!assetMatchesFilter(state.assetById[anchor], state.assetFilter)) {
            state.assetFilter = 'all';
            renderAssets();
        }
        setRelatedAssets(
            anchor,
            statusStripIds(anchor),
            anchor === 'fontFamily' ? 'Text colours and the status bar' : 'Status bar icons and the font'
        );
        selectAsset(anchor, { keepStatus: true });
        focusTrayAsset(anchor);
        return true;
    }

    function revealAssetInEdit(id, options) {
        var asset = state.assetById[id];
        if (!asset) return false;
        setMode('edit');
        if (!assetMatchesFilter(asset, state.assetFilter)) {
            state.assetFilter = 'all';
            renderAssets();
        }
        /* Only a menu row in the preview describes a whole item (icon, selection,
           background, arrow), so only there does the tray show the related group.
           Picking the large icon art on the right is a single-asset edit. */
        if (id === 'fontFamily') {
            setRelatedAssets(id, [], 'Text colours');
        } else if (/^statusConfig\./.test(id)) {
            setRelatedAssets(id, statusStripIds(id), 'Status bar icons and the font');
        } else if (options && options.related === false) {
            clearRelatedAssets();
        } else {
            setRelatedAssets(id);
        }
        selectAsset(id);
        focusTrayAsset(id);
        return true;
    }

    /* A screen's background is more than the wallpaper: on Home and Settings a
       mask sits over it to clear the menu area. Neither is reachable by pointer,
       because both are painted under the menu layer, so a click on the flat part
       of the preview asks the simulator which slots draw this screen and pins
       them into the tray together. */
    function screenAssetIds() {
        var api = el.preview ? el.preview._y1TpApi : null;
        if (!api || typeof api.screenAssets !== 'function') return [];
        var ids = [];
        try {
            ids = api.screenAssets() || [];
        } catch (e) {
            return [];
        }
        return ids.filter(function (id) {
            return !!state.assetById[id];
        });
    }

    function revealScreenAssets(focusPath) {
        var ids = screenAssetIds();
        if (!ids.length) return false;
        /* The caller may know which of the two layers the pointer is over:
           the transparent parts of a mask are the wallpaper showing through. */
        var anchor = ids[0];
        if (focusPath) {
            for (var i = 0; i < ids.length; i++) {
                if (ids[i] === focusPath) {
                    anchor = ids[i];
                    break;
                }
            }
        }
        setMode('edit');
        var filtered = ids.some(function (id) {
            return !assetMatchesFilter(state.assetById[id], state.assetFilter);
        });
        if (filtered) state.assetFilter = 'all';
        state.selectedAssetId = anchor;
        var related = ids.filter(function (id) {
            return id !== anchor;
        });
        setRelatedAssets(ids.length > 1 ? anchor : '', related, 'Background and mask on this screen');
        selectAsset(anchor);
        focusTrayAsset(anchor);
        return true;
    }

    function previewAssetPathFromEvent(event) {
        var target = event && event.target;
        if (!target || !target.closest || !el.preview || !el.preview.contains(target)) return '';
        var node = target.closest('[data-theme-asset-path]');
        if (!node || !el.preview.contains(node)) return '';
        return node.getAttribute('data-theme-asset-path') || '';
    }

    /* True when the tapped asset sits inside a menu row of the simulated screen
       (the item list on the left), false for the artwork drawn beside it. */
    function previewEventInMenuRow(event) {
        var target = event && event.target;
        if (!target || !target.closest || !el.preview || !el.preview.contains(target)) return false;
        var node = target.closest('[data-theme-asset-path]');
        if (!node) return false;
        if (node.closest('.y1-tp-row')) return true;
        /* Menu and settings lists are plain divs; the artwork beside them is an
           image, and the wallpaper is a div that owns no item assets. */
        return node.tagName !== 'IMG' && !node.classList.contains('y1-tp-wallpaper');
    }

    function previewHitLabel(path) {
        if (!path) return '';
        if (state.assetById[path] && state.assetById[path].label) {
            return state.assetById[path].label;
        }
        if (path === 'statusConfig.statusBarColor') return 'Status bar colour';
        if (path === 'statusConfig.statusTextColor') return 'Status bar text colour';
        return '';
    }

    /* Alpha-aware layered hit-test inside the live preview screen:
       clicking or hovering 100% transparent pixels on an asset (icon, arrow,
       status icon, overlay mask) falls through to whichever visible asset lies
       behind it (e.g. mask -> wallpaper). */
    function resolvePreviewHit(event) {
        var target = event && event.target;
        if (!target || !target.closest || !el.preview || !el.preview.contains(target)) return null;
        if (target.closest('[data-y1act], .y1-tp-control-strip, .y1-tp-wheel, .y1-tp-wheel-collapse')) return null;
        var canvas = target.closest('.y1-tp-canvas');
        if (!canvas) return null;
        var api = el.preview._y1TpApi;
        if (api && typeof api.assetAtPoint === 'function' && isFinite(event.clientX) && isFinite(event.clientY)) {
            var hit = api.assetAtPoint(event.clientX, event.clientY);
            if (hit && hit.path) return hit;
        }
        var fallbackPath = previewAssetPathFromEvent(event);
        if (fallbackPath) {
            return {
                path: fallbackPath,
                node: target.closest('[data-theme-asset-path]'),
                inMenuRow: previewEventInMenuRow(event),
                isScreenLayer: false
            };
        }
        return null;
    }

    function activatePreviewHit(event) {
        var hit = resolvePreviewHit(event);
        if (!hit || !hit.path) return false;
        var path = hit.path;
        if (!state.assetById[path] && /^statusConfig\.[A-Za-z]+Color$/.test(path)) {
            event.preventDefault();
            event.stopPropagation();
            revealStatusColors();
            return true;
        }
        if (hit.isScreenLayer) {
            if (!revealScreenAssets(path)) return false;
            event.preventDefault();
            event.stopPropagation();
            return true;
        }
        if (!state.assetById[path]) return false;
        event.preventDefault();
        event.stopPropagation();
        revealAssetInEdit(path, { related: !!hit.inMenuRow });
        return true;
    }

    function setupPreviewAssetFocus() {
        if (!el.preview) return;
        var hoverRaf = 0;
        var lastHoverEvent = null;
        var lastHoverPath = '';
        var lastHoverScreen = false;

        function clearPreviewHover() {
            if (hoverRaf) {
                window.cancelAnimationFrame(hoverRaf);
                hoverRaf = 0;
            }
            lastHoverEvent = null;
            lastHoverPath = '';
            lastHoverScreen = false;
            clearPreviewAssetLink();
            var canvas = el.preview ? el.preview.querySelector('.y1-tp-canvas') : null;
            if (canvas) canvas.removeAttribute('title');
        }

        el.preview.addEventListener('pointermove', function (event) {
            if (isCapturingThumbs || event.pointerType === 'touch') return;
            lastHoverEvent = event;
            if (hoverRaf) return;
            hoverRaf = window.requestAnimationFrame(function () {
                hoverRaf = 0;
                var ev = lastHoverEvent;
                if (!ev || isCapturingThumbs) return;
                var canvas = el.preview ? el.preview.querySelector('.y1-tp-canvas') : null;
                var hit = resolvePreviewHit(ev);
                if (!hit || !hit.path || (!state.assetById[hit.path] && !/^statusConfig\.[A-Za-z]+Color$/.test(hit.path))) {
                    if (lastHoverPath) clearPreviewHover();
                    return;
                }
                if (hit.path !== lastHoverPath || !!hit.isScreenLayer !== lastHoverScreen) {
                    lastHoverPath = hit.path;
                    lastHoverScreen = !!hit.isScreenLayer;
                    if (state.assetById[hit.path]) {
                        highlightPreviewAsset(hit.path, { skipCanvasOutline: !!hit.isScreenLayer });
                    } else {
                        clearPreviewAssetLink();
                    }
                    if (canvas) {
                        var label = previewHitLabel(hit.path);
                        canvas.title = label ? label + ' — click to edit' : 'Click to edit this theme asset';
                    }
                }
            });
        });

        el.preview.addEventListener('pointerleave', function () {
            if (isCapturingThumbs) return;
            clearPreviewHover();
        });

        el.preview.addEventListener('click', function (event) {
            activatePreviewHit(event);
        });

        el.preview.addEventListener('contextmenu', function (event) {
            activatePreviewHit(event);
        });
    }

    /* A font row in the tray shows a type sample in the theme's own face, so
       swapping a font is a choice you make by looking at it rather than by
       reading the file name. */
    var fontSampleCounter = 0;
    /* One loaded face per font file: the detail pane re-renders on every
       selection, and a second load of the same file is wasted work. */
    var fontSampleFamilies = Object.create(null);

    function paintFontSample(host, url) {
        if (!host || !url) return;
        var ready = fontSampleFamilies[url];
        if (ready) {
            host.style.fontFamily = '"' + ready + '", inherit';
            return;
        }
        if (typeof FontFace !== 'function' || !document.fonts) return;
        fontSampleCounter += 1;
        var family = 'studio-sample-' + fontSampleCounter;
        var face;
        try {
            face = new FontFace(family, 'url("' + String(url).replace(/"/g, '%22') + '")');
        } catch (err) {
            return;
        }
        face
            .load()
            .then(function (loaded) {
                try {
                    document.fonts.add(loaded);
                } catch (err) {
                    return;
                }
                fontSampleFamilies[url] = family;
                if (host.isConnected) host.style.fontFamily = '"' + family + '", inherit';
            })
            .catch(function () {
                /* An unreadable font file leaves the sample in the page font,
                   which is still a usable comparison. */
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
        el.assetPath.textContent = asset.placeholder ? 'Blank (transparent.png placeholder)' : asset.value || 'Blank';
        el.assetStatus.textContent = status.label;
        el.assetStatus.setAttribute('data-state', status.key);
        var nameHost = el.assetName.parentElement;
        var titleRow = nameHost.classList.contains('studio-asset-title-row') ? nameHost : null;
        if (!titleRow) {
            titleRow = document.createElement('span');
            titleRow.className = 'studio-asset-title-row';
            nameHost.insertBefore(titleRow, el.assetName);
            titleRow.appendChild(el.assetName);
        }
        var detailSwitch = titleRow.querySelector('.studio-asset-switch-toggle');
        if (!detailSwitch) {
            detailSwitch = assetSwitchButton(asset.id, asset.section);
            titleRow.appendChild(detailSwitch);
        }
        detailSwitch.setAttribute('data-asset-switch', asset.id);
        detailSwitch.title = 'Preview another asset from ' + asset.section;
        el.assetPreview.innerHTML = '';
        decorateAssetThumb(el.assetPreview, asset);
        /* The live crop already contains the asset in place; only fall back to a
           plain image when there is no mounted screen to crop. */
        var liveCrop = el.assetPreview.classList.contains('has-live-crop');
        if (!liveCrop && asset.url && asset.kind === 'image' && !asset.missingFile) {
            var img = document.createElement('img');
            img.src = asset.url;
            img.alt = asset.label + ' preview';
            /* Theme art and wallpapers are 4:3 plates of their own; scale them
               up to the plate instead of leaving a 320px image in a 400px box.
               Tiny icons keep their pixel size rather than turning to mush. */
            var fitLargeImage = function () {
                if (img.naturalWidth >= 160 || img.naturalHeight >= 160) img.classList.add('is-fit-plate');
            };
            if (img.complete) fitLargeImage();
            else img.addEventListener('load', fitLargeImage);
            el.assetPreview.appendChild(img);
        } else if (!liveCrop && asset.kind !== 'font') {
            var icon = document.createElement('i');
            icon.className = 'fa-regular fa-image';
            icon.setAttribute('aria-hidden', 'true');
            el.assetPreview.appendChild(icon);
        }
        el.assetReset.disabled = !asset.changed;
        el.assetReplace.disabled = false;
        el.assetPaste.disabled = asset.kind !== 'image';
        if (el.assetSave) {
            el.assetSave.disabled = false;
            var saveBlank =
                asset.kind === 'image' &&
                (asset.placeholder ||
                    asset.empty ||
                    asset.missingFile ||
                    asset.localMissing ||
                    isPlaceholderValue(asset.value));
            var recSize = saveBlank ? recommendedBlankSize(asset) : null;
            el.assetSave.title = saveBlank
                ? 'Save a blank ' + recSize.width + '×' + recSize.height + ' transparent PNG template for ' + asset.label
                : (saveTarget.saveAssetLabel || 'Save to device') + ' (' + asset.label + ')';
        }
        if (el.assetBlank) {
            el.assetBlank.disabled = asset.kind === 'font';
            el.assetBlank.title =
                asset.kind === 'font'
                    ? 'Fonts cannot be blanked'
                    : 'Bin this file and use a fully transparent placeholder';
        }
        if (el.assetTheme) {
            el.assetTheme.disabled = !state.gallery.length;
            el.assetTheme.title = state.gallery.length
                ? 'Swap in the same asset from another gallery theme'
                : 'The gallery list is unavailable, so there is nothing to swap from';
        }
        var sizeHint = asset.kind === 'font' ? 'Fonts keep their source file.' : 'Ideal size: ' + assetSizeLabel(asset) + '.';
        el.assetHint.textContent =
            (asset.localMissing
                ? 'This file is referenced by config.json but is missing from the package. Import a replacement or reset it. '
                : asset.placeholder || asset.empty
                  ? 'This slot is blank: config.json points at the shared transparent.png placeholder, so the device keeps the gap instead of drawing its own art. Import an image to fill it. '
                  : '') +
            sizeHint +
            (asset.kind === 'font'
                ? ' Fonts cannot be pasted or blanked, but you can swap in a font from another theme.'
                : ' Drop an image on this row, or copy one and press Ctrl+V / Cmd+V while the row is hovered.') +
            (asset.kind === 'font' ? '' : ' Blank fills the slot with a transparent placeholder so the device keeps the gap instead of drawing its default icon.');
    }

    function setAssetFilter(filter) {
        if (filter !== 'all' && filter !== 'missing' && filter !== 'changed') filter = 'all';
        state.assetFilter = filter;
        renderAssets();
    }

    function markDirty() {
        state.dirty = true;
        if (el.unsaved) el.unsaved.hidden = false;
        scheduleRecoverySave();
    }

    /* Blanking a slot rewrites its config line instead of adding an override, so
       the reset guard counts changed assets, not just override entries. */
    function assetChangeCount() {
        return (state.assets || []).filter(function (asset) {
            return !!asset.changed;
        }).length;
    }

    /* The shared transparent.png override is not a replacement the author made. */
    function realOverrideCount() {
        var keys = Object.keys(state.assetOverrides || {});
        var count = 0;
        for (var i = 0; i < keys.length; i += 1) {
            var entry = state.assetOverrides[keys[i]];
            if (entry && entry.placeholder) continue;
            count += 1;
        }
        return count;
    }

    function isDirty() {
        return !!(
            state.dirty ||
            state.formDirty ||
            realOverrideCount() > 0
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
        if (!targetValue || isPlaceholderValue(targetValue)) {
            /* A filled blank slot gets its own file name: every blank slot shares
               transparent.png, so writing the replacement there would change them all. */
            targetValue = defaultAssetFileName(asset, working);
            if (isPlaceholderValue(targetValue)) {
                targetValue = String(asset.path || 'asset').replace(/[^\w.-]+/g, '_') + (asset.kind === 'font' ? '.ttf' : '.png');
            }
            writePath(state.config || {}, asset.path, targetValue);
        } else if (asset.kind === 'font') {
            var incomingFontExt = /\.(ttf|otf|woff2?)$/i.exec(working.name || '');
            var existingFontExt = /\.(ttf|otf|woff2?)$/i.exec(targetValue);
            if (incomingFontExt && (!existingFontExt || existingFontExt[1].toLowerCase() !== incomingFontExt[1].toLowerCase())) {
                var oldKey = localKey('', targetValue);
                if (state.assetOverrides[oldKey] && state.assetOverrides[oldKey].url) {
                    revokeAssetUrl(state.assetOverrides[oldKey].url);
                }
                delete state.assetOverrides[oldKey];
                targetValue = targetValue.replace(/\.[^.\/]+$/, '') + '.' + incomingFontExt[1].toLowerCase();
                writePath(state.config || {}, asset.path, targetValue);
            }
        }
        delete state.missingAssetPaths[asset.path];
        delete state.missingAssetValues[asset.path];
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
        if (asset.path === 'themeCover') {
            state.meta.cover = url;
            setCover(el.cover, el.coverWrap, url);
            setCover(el.submitCover, el.submitCoverWrap, url);
        }
        markDirty();
        rebuildAssets({ deferThumbRefresh: true });
        selectAsset(asset.id, { skipRemount: true });
        remountPreview('Applying ' + fileName(targetValue) + '…', { focusAssetId: asset.id });
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
        if (asset.path === 'themeCover') {
            state.meta.cover = state.baseCover;
            setCover(el.cover, el.coverWrap, state.baseCover);
            setCover(el.submitCover, el.submitCoverWrap, state.baseCover);
        }
        if (configUsesPlaceholder(state.config)) ensurePlaceholderAsset();
        markDirty();
        rebuildAssets({ deferThumbRefresh: true });
        selectAsset(asset.id, { skipRemount: true });
        remountPreview('Restoring ' + asset.label + '…', { focusAssetId: asset.id });
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
        /* A different theme starts from fully collapsed trays again. */
        state.openTrays = Object.create(null);
    }

    function resetAllAssets() {
        if (!state.config) return;
        resetAssetOverrides();
        state.config = cloneJson(state.configBase);
        state.meta.cover = state.baseCover;
        setCover(el.cover, el.coverWrap, state.baseCover);
        setCover(el.submitCover, el.submitCoverWrap, state.baseCover);
        if (configUsesPlaceholder(state.config)) ensurePlaceholderAsset();
        /* Resetting every replacement puts the theme back where it started, so
           the page is clean again unless the listing details were also edited. */
        state.dirty = !!(realOverrideCount() || JSON.stringify(state.config) !== JSON.stringify(state.configBase));
        if (el.unsaved) el.unsaved.hidden = !(state.dirty || state.formDirty);
        scheduleRecoverySave();
        rebuildAssets({ deferThumbRefresh: true });
        remountPreview('Restoring the original theme…');
        toast('All asset replacements were reset.');
    }

    function remountPreview(label, opts) {
        setLoading(true, label || 'Updating preview…');
        mountPreview(opts).catch(function (err) {
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

    /* —— Bin (transparent placeholder) —— */

    /* Binning a slot points its config line at the shared transparent.png, so the
       row reads Blank and the package carries one placeholder instead of a
       one-off file per binned asset. */
    function blankAsset(assetId) {
        var asset = state.assetById[assetId];
        if (!asset) return;
        if (asset.kind === 'font') {
            toast('Fonts cannot be blanked. Replace the font file, or reset it to the theme original.');
            return;
        }
        delete state.missingAssetPaths[asset.path];
        delete state.missingAssetValues[asset.path];
        writePath(state.config, asset.path, PLACEHOLDER_FILE);
        ensurePlaceholderAsset();
        if (asset.path === 'themeCover') {
            state.meta.cover = '';
            setCover(el.cover, el.coverWrap, '');
            setCover(el.submitCover, el.submitCoverWrap, '');
        }
        markDirty();
        rebuildAssets({ deferThumbRefresh: true });
        selectAsset(asset.id, { skipRemount: true });
        remountPreview('Blanking ' + asset.label + '…', { focusAssetId: asset.id });
        toast('Binned ' + asset.label + ': the slot now reads Blank and points at the transparent placeholder.');
    }

    /* —— Swap from another theme —— */

    var THEME_PICKER_PAGE_SIZE = 24;
    var THEME_PICKER_CONCURRENCY = 8;
    var transparentImageCache = Object.create(null);
    var alphaProbeCanvas = null;

    var themePickerState = {
        assetId: '',
        session: 0,
        themes: [],
        cursor: 0,
        shownCount: 0,
        targetCount: THEME_PICKER_PAGE_SIZE,
        inFlight: 0,
        query: '',
        manifest: null
    };

    function isPixelBufferFullyTransparent(data) {
        if (!data || !data.length) return true;
        for (var i = 3; i < data.length; i += 4) {
            if (data[i] !== 0) return false;
        }
        return true;
    }

    /* Fast filename screen for obvious transparent placeholder files; arbitrarily
       named blank PNGs are caught by full-pixel alpha inspection below. */
    function isTransparentPlaceholderFileName(value) {
        var name = fileName(String(value || '')).toLowerCase();
        if (!name) return true;
        if (name === PLACEHOLDER_FILE) return true;
        return /^transparent(?:[_-].*)?\.(png|gif|webp|bmp|svg)$/i.test(name);
    }

    function isImageElementFullyTransparent(img, cacheKey) {
        if (cacheKey && Object.prototype.hasOwnProperty.call(transparentImageCache, cacheKey)) {
            return transparentImageCache[cacheKey];
        }
        var w = img ? img.naturalWidth || img.width || 0 : 0;
        var h = img ? img.naturalHeight || img.height || 0 : 0;
        if (!w || !h) {
            if (cacheKey) transparentImageCache[cacheKey] = true;
            return true;
        }
        if (!alphaProbeCanvas) alphaProbeCanvas = document.createElement('canvas');
        var maxDim = 2048;
        var drawW = w;
        var drawH = h;
        if (drawW > maxDim || drawH > maxDim) {
            var scale = Math.min(maxDim / drawW, maxDim / drawH);
            drawW = Math.max(1, Math.round(drawW * scale));
            drawH = Math.max(1, Math.round(drawH * scale));
        }
        var fullyTransparent = false;
        try {
            alphaProbeCanvas.width = drawW;
            alphaProbeCanvas.height = drawH;
            var ctx = alphaProbeCanvas.getContext('2d', { willReadFrequently: true });
            if (ctx) {
                ctx.clearRect(0, 0, drawW, drawH);
                ctx.drawImage(img, 0, 0, drawW, drawH);
                fullyTransparent = isPixelBufferFullyTransparent(ctx.getImageData(0, 0, drawW, drawH).data);
            }
        } catch (err) {
            fullyTransparent = false;
        } finally {
            try {
                alphaProbeCanvas.width = 1;
                alphaProbeCanvas.height = 1;
            } catch (e) {}
        }
        if (cacheKey) transparentImageCache[cacheKey] = fullyTransparent;
        return fullyTransparent;
    }

    function probeThemePickerImage(url) {
        if (!url) return Promise.resolve(false);
        if (Object.prototype.hasOwnProperty.call(transparentImageCache, url)) {
            return Promise.resolve(!transparentImageCache[url]);
        }
        return new Promise(function (resolve) {
            var img = new Image();
            img.decoding = 'async';
            img.onload = function () {
                resolve(!isImageElementFullyTransparent(img, url));
            };
            img.onerror = function () {
                transparentImageCache[url] = true;
                resolve(false);
            };
            img.src = url;
        });
    }

    /* A plain catalogue URL for another theme's file: galleryFileUrl applies this
       theme's overrides, which must not leak into someone else's package. */
    function catalogAssetUrl(folder, relativePath) {
        var text = String(relativePath || '').trim();
        if (!text) return '';
        if (/^(https?:|data:|blob:)/i.test(text)) return text;
        var stack = String(folder || '')
            .replace(/^\.\/+/, '')
            .replace(/\/+$/, '')
            .split('/')
            .filter(Boolean);
        text.replace(/\\/g, '/')
            .replace(/^\.\/+/, '')
            .replace(/^\/+/, '')
            .split('/')
            .forEach(function (segment) {
                if (!segment || segment === '.') return;
                if (segment === '..') {
                    if (stack.length) stack.pop();
                    return;
                }
                stack.push(segment);
            });
        return '../' + stack.map(encodeURIComponent).join('/');
    }

    function themeConfig(folder) {
        if (!state.galleryConfigs[folder]) {
            state.galleryConfigs[folder] = fetch('../' + encodePath(folder) + '/config.json?v=' + Date.now(), { cache: 'no-cache' })
                .then(function (res) {
                    if (!res.ok) return null;
                    return res.json();
                })
                .catch(function () {
                    return null;
                });
        }
        return state.galleryConfigs[folder];
    }

    function inspectThemePickerCandidate(theme, asset, manifest) {
        var folder = theme && theme.folder;
        if (!folder || !asset) return Promise.resolve(null);
        return themeConfig(folder).then(function (config) {
            var value = config ? String(readPath(config, asset.path) || '').trim() : '';
            if (!value) return null;
            var missingMap = missingMapForFolder(manifest, folder);
            if (missingMap[value.toLowerCase()]) return null;
            var url = catalogAssetUrl(folder, value);
            if (!url) return null;
            if (asset.kind === 'font') {
                return { theme: theme, value: value, url: url, isFont: true };
            }
            if (isTransparentPlaceholderFileName(value)) return null;
            return probeThemePickerImage(url).then(function (hasVisiblePixels) {
                if (!hasVisiblePixels) return null;
                return { theme: theme, value: value, url: url, isFont: false };
            });
        });
    }

    function buildThemePickerRow(candidate, asset) {
        var theme = candidate.theme;
        var row = document.createElement('button');
        row.type = 'button';
        row.className = 'studio-theme-row has-asset';
        row.setAttribute('role', 'listitem');
        row.setAttribute('data-theme-folder', theme.folder);
        row.setAttribute('data-theme-value', candidate.value);
        row.setAttribute(
            'aria-label',
            'Use ' + asset.label.toLowerCase() + ' from ' + (theme.name || theme.folder)
        );

        var thumb = document.createElement('span');
        thumb.className = 'studio-theme-row-thumb' + (candidate.isFont ? ' studio-theme-row-thumb--font' : '');
        if (candidate.isFont) {
            thumb.textContent = 'Aa';
            paintFontSample(thumb, candidate.url);
        } else {
            var img = document.createElement('img');
            img.alt = '';
            img.decoding = 'async';
            img.src = candidate.url;
            thumb.appendChild(img);
        }

        var copy = document.createElement('span');
        copy.className = 'studio-theme-row-copy';
        var name = document.createElement('strong');
        name.textContent = theme.name || theme.folder;
        var byline = document.createElement('span');
        byline.textContent = theme.author ? 'by ' + theme.author : theme.folder;
        copy.appendChild(name);
        copy.appendChild(byline);

        var badge = document.createElement('span');
        badge.className = 'studio-theme-row-badge';
        badge.textContent = fileName(candidate.value) || 'Included';
        badge.title = candidate.value;

        row.appendChild(thumb);
        row.appendChild(copy);
        row.appendChild(badge);
        return row;
    }

    function updateThemePickerFooter() {
        if (!el.themePickerList) return;
        var oldStatus = el.themePickerList.querySelector('[data-theme-status]');
        var oldMore = el.themePickerList.querySelector('[data-theme-more]');
        var scanning = themePickerState.inFlight > 0;
        var hasMore = themePickerState.cursor < themePickerState.themes.length;

        if (scanning) {
            if (oldMore) oldMore.remove();
            if (!oldStatus) {
                var status = document.createElement('div');
                status.className = 'studio-theme-picker-status';
                status.setAttribute('data-theme-status', '');
                status.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin" aria-hidden="true"></i><span>Checking gallery themes…</span>';
                el.themePickerList.appendChild(status);
            } else {
                el.themePickerList.appendChild(oldStatus);
            }
            if (el.themePickerEmpty) el.themePickerEmpty.hidden = true;
            return;
        }

        if (oldStatus) oldStatus.remove();
        if (themePickerState.shownCount === 0) {
            if (oldMore) oldMore.remove();
            if (el.themePickerEmpty) {
                el.themePickerEmpty.textContent = themePickerState.query
                    ? 'No matching gallery themes have a non-blank asset for this slot.'
                    : 'No gallery themes have a non-blank asset for this slot.';
                el.themePickerEmpty.hidden = false;
            }
            return;
        }

        if (el.themePickerEmpty) el.themePickerEmpty.hidden = true;
        if (hasMore) {
            var remaining = themePickerState.themes.length - themePickerState.cursor;
            if (!oldMore) {
                oldMore = document.createElement('button');
                oldMore.type = 'button';
                oldMore.className = 'studio-btn studio-theme-more';
                oldMore.setAttribute('data-theme-more', '');
            }
            oldMore.textContent = 'Show more themes (' + remaining + ' left to check)';
            el.themePickerList.appendChild(oldMore);
        } else if (oldMore) {
            oldMore.remove();
        }
    }

    function pumpThemePicker(session) {
        if (session !== themePickerState.session || !el.themePickerList) return;
        var asset = state.assetById[themePickerState.assetId];
        if (!asset) return;

        while (
            themePickerState.session === session &&
            themePickerState.shownCount < themePickerState.targetCount &&
            themePickerState.cursor < themePickerState.themes.length &&
            themePickerState.inFlight < THEME_PICKER_CONCURRENCY
        ) {
            var theme = themePickerState.themes[themePickerState.cursor];
            themePickerState.cursor += 1;
            themePickerState.inFlight += 1;
            inspectThemePickerCandidate(theme, asset, themePickerState.manifest)
                .then(function (candidate) {
                    if (themePickerState.session !== session) return;
                    themePickerState.inFlight -= 1;
                    if (candidate && el.themePickerList) {
                        var row = buildThemePickerRow(candidate, asset);
                        var footer =
                            el.themePickerList.querySelector('[data-theme-status]') ||
                            el.themePickerList.querySelector('[data-theme-more]');
                        if (footer) el.themePickerList.insertBefore(row, footer);
                        else el.themePickerList.appendChild(row);
                        themePickerState.shownCount += 1;
                    }
                    pumpThemePicker(session);
                })
                .catch(function () {
                    if (themePickerState.session !== session) return;
                    themePickerState.inFlight -= 1;
                    pumpThemePicker(session);
                });
        }
        updateThemePickerFooter();
    }

    function renderThemePickerRows(query) {
        if (!el.themePickerList) return;
        var asset = state.assetById[themePickerState.assetId];
        if (!asset) return;
        var session = ++themePickerState.session;
        var q = String(query || '').trim().toLowerCase();
        var themes = state.gallery.filter(function (theme) {
            if (!theme || !theme.folder) return false;
            if (state.sourceType === 'gallery' && theme.folder === state.folder) return false;
            if (!q) return true;
            return [theme.name, theme.folder, theme.author].join(' ').toLowerCase().indexOf(q) !== -1;
        });
        themePickerState.themes = themes;
        themePickerState.cursor = 0;
        themePickerState.shownCount = 0;
        themePickerState.targetCount = THEME_PICKER_PAGE_SIZE;
        themePickerState.inFlight = 0;
        themePickerState.query = q;
        el.themePickerList.innerHTML = '';
        if (!themes.length) {
            if (el.themePickerEmpty) {
                el.themePickerEmpty.textContent = 'No theme matches that search.';
                el.themePickerEmpty.hidden = false;
            }
            return;
        }
        if (el.themePickerEmpty) el.themePickerEmpty.hidden = true;
        loadMissingManifest().then(function (manifest) {
            if (themePickerState.session !== session) return;
            themePickerState.manifest = manifest || {};
            pumpThemePicker(session);
        });
    }

    function loadMoreThemePickerRows() {
        if (!themePickerState.assetId || !el.themePickerList) return;
        themePickerState.targetCount += THEME_PICKER_PAGE_SIZE;
        pumpThemePicker(themePickerState.session);
    }

    function openThemePicker(assetId) {
        var asset = state.assetById[assetId];
        if (!asset || !el.themePicker) return;
        if (!state.gallery.length) {
            toast('The gallery list is unavailable right now, so there are no themes to swap from.');
            return;
        }
        themePickerState.assetId = assetId;
        if (el.themePickerTitle) el.themePickerTitle.textContent = asset.label;
        if (el.themePickerText) {
            el.themePickerText.textContent =
                asset.kind === 'font'
                    ? 'Pick ' +
                      asset.label.toLowerCase() +
                      ' from another gallery theme. Themes without a custom font are hidden, and swapping never touches the other theme.'
                    : 'Pick ' +
                      asset.label.toLowerCase() +
                      ' from another gallery theme. Blank and fully transparent placeholder images are hidden automatically, and swapping never touches the other theme.';
        }
        if (el.themePickerQuery) el.themePickerQuery.value = '';
        el.themePicker.hidden = false;
        renderThemePickerRows('');
        if (el.themePickerQuery) el.themePickerQuery.focus();
    }

    function closeThemePicker() {
        themePickerState.session += 1;
        themePickerState.inFlight = 0;
        if (el.themePicker) el.themePicker.hidden = true;
        if (el.themePickerList) el.themePickerList.innerHTML = '';
        themePickerState.assetId = '';
    }

    function swapAssetFromTheme(folder, value) {
        var asset = state.assetById[themePickerState.assetId];
        if (!asset || !folder || !value) return;
        var theme = state.byFolder[folder];
        var label = (theme && theme.name) || folder;
        var url = catalogAssetUrl(folder, value);
        toast('Loading ' + (fileName(value) || asset.label) + ' from ' + label + '…');
        fetch(url)
            .then(function (res) {
                if (!res.ok) throw new Error('that file is missing from the theme (' + res.status + ')');
                return res.blob();
            })
            .then(function (blob) {
                var ext = (fileName(value).split('.').pop() || 'png').toLowerCase();
                var type = blob.type && blob.type !== 'application/octet-stream'
                    ? blob.type
                    : ext === 'ttf'
                      ? 'font/ttf'
                      : ext === 'otf'
                        ? 'font/otf'
                        : ext === 'woff'
                          ? 'font/woff'
                          : ext === 'woff2'
                            ? 'font/woff2'
                            : 'image/png';
                var file = new File([blob], fileName(value) || 'asset.' + ext, { type: type });
                closeThemePicker();
                return replaceAssetFromFile(asset.id, file).then(function () {
                    toast('Swapped ' + asset.label + ' in from ' + label + '.');
                });
            })
            .catch(function (err) {
                toast('Could not load that asset: ' + ((err && err.message) || 'unknown error'));
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
            if (event.target.closest('[data-related-close]')) {
                event.preventDefault();
                clearRelatedAssets();
                return;
            }
            var action = event.target.closest('[data-asset-action]');
            var row = event.target.closest('[data-asset-id]');
            if (action && row) {
                event.preventDefault();
                event.stopPropagation();
                var id = row.getAttribute('data-asset-id');
                var kind = action.getAttribute('data-asset-action');
                if (kind === 'import') openAssetPicker(id);
                else if (kind === 'theme') openThemePicker(id);
                else if (kind === 'save') downloadAsset(id);
                else if (kind === 'blank') blankAsset(id);
                else pasteIntoAsset(id);
                return;
            }
            if (row) {
                var rowId = row.getAttribute('data-asset-id');
                /* A tray click is a direct choice, so it drops the related block;
                   a click inside that block keeps it open. */
                if (!row.closest('.studio-related') && state.relatedAnchor) {
                    state.relatedAnchor = '';
                    state.relatedIds = [];
                    state.relatedTitle = '';
                    renderAssets();
                }
                selectAsset(rowId, { reveal: true });
            }
        });
        el.assetList.addEventListener('keydown', function (event) {
            var row = event.target.closest('[data-asset-id]');
            if (!row || event.target.closest('button')) return;
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                var keyId = row.getAttribute('data-asset-id');
                if (!row.closest('.studio-related') && state.relatedAnchor) {
                    state.relatedAnchor = '';
                    state.relatedIds = [];
                    state.relatedTitle = '';
                    renderAssets();
                }
                selectAsset(keyId, { reveal: true });
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
        if (el.assetTheme) {
            el.assetTheme.addEventListener('click', function () {
                if (state.selectedAssetId) openThemePicker(state.selectedAssetId);
            });
        }
        if (el.assetSave) {
            el.assetSave.addEventListener('click', function () {
                if (state.selectedAssetId) downloadAsset(state.selectedAssetId);
            });
        }
        if (el.assetBlank) {
            el.assetBlank.addEventListener('click', function () {
                if (state.selectedAssetId) blankAsset(state.selectedAssetId);
            });
        }
        if (el.themePickerClose) {
            el.themePickerClose.addEventListener('click', closeThemePicker);
        }
        if (el.themePicker) {
            el.themePicker.addEventListener('click', function (event) {
                if (event.target === el.themePicker) closeThemePicker();
            });
            document.addEventListener('keydown', function (event) {
                if (event.key === 'Escape' && !el.themePicker.hidden) closeThemePicker();
            });
        }
        if (el.themePickerQuery) {
            var pickerFilterTimer = null;
            el.themePickerQuery.addEventListener('input', function () {
                clearTimeout(pickerFilterTimer);
                pickerFilterTimer = setTimeout(function () {
                    renderThemePickerRows(el.themePickerQuery.value);
                }, 160);
            });
        }
        if (el.themePickerList) {
            el.themePickerList.addEventListener('click', function (event) {
                if (event.target.closest('[data-theme-more]')) {
                    loadMoreThemePickerRows();
                    return;
                }
                var row = event.target.closest('[data-theme-folder]');
                if (!row) return;
                var value = row.getAttribute('data-theme-value');
                if (!value) {
                    toast('That theme never used this asset, so there is nothing to take from it.');
                    return;
                }
                swapAssetFromTheme(row.getAttribute('data-theme-folder'), value);
            });
        }
        if (el.maskEditor) {
            el.maskEditor.addEventListener('click', function (event) {
                var button = event.target.closest('[data-mask-action]');
                if (!button) return;
                var id = button.getAttribute('data-mask-id');
                var action = button.getAttribute('data-mask-action');
                if (!state.assetById[id]) return;
                if (action === 'replace') openAssetPicker(id);
                else if (action === 'save') downloadAsset(id);
                else if (action === 'blank') blankAsset(id);
                else if (action === 'theme') openThemePicker(id);
                else {
                    /* Show moves the simulator to the screen the overlay sits on
                       and highlights the art there. The edit pane stays open:
                       that is where the person clicked, and switching tabs
                       throws away the row they were working on. */
                    selectAsset(id);
                    if (!revealAssetContext(id)) {
                        toast('The preview is still loading, so this overlay cannot be shown yet.');
                    }
                }
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
                if (!assetChangeCount()) {
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

    /* —— Submit identity ——
       A package whose config details are exactly a gallery listing is either
       that listing's author filing an update or someone building on top of it.
       The studio cannot tell which from the files, so Submit asks before it
       decides: an update is packed with the listing's own details and waits as
       a pull request, a new theme goes up under the submitter's details and can
       be merged automatically once the checks pass. */

    function matchingGalleryListing() {
        var meta = state.meta;
        if (!meta) return null;
        var title = normalizeTitle(meta.name);
        var author = normalizeAuthor(meta.author);
        if (!title) return null;
        return (
            state.gallery.find(function (theme) {
                return normalizeTitle(theme.name) === title && normalizeAuthor(theme.author) === author;
            }) || null
        );
    }

    function resetIdentity(listing) {
        state.identity = { listing: listing || null, answer: '', changeDetails: '' };
        state.ownUpdate = false;
    }

    function identityDecided() {
        var identity = state.identity;
        if (!identity.listing) return true;
        if (identity.answer === 'other') return true;
        return identity.answer === 'own' && !!identity.changeDetails;
    }

    function submitActionLabel() {
        return state.ownUpdate ? 'Send update' : 'Send my theme';
    }

    function syncIdentity() {
        var identity = state.identity;
        var listing = identity.listing;
        var own = identity.answer === 'own';
        var editing = own && identity.changeDetails === 'yes';
        var listed = own && identity.changeDetails === 'no';
        var ownTheme = identity.answer === 'other';
        /* Confirming authorship hands the top of the pane to the listing tools,
           so the question card steps aside for Manage \u2039theme\u203a. */
        if (el.identity) el.identity.hidden = !listing || own;
        if (listing) {
            if (el.identityName) el.identityName.textContent = '\u201c' + (listing.name || listing.folder) + '\u201d';
            if (el.identityAuthor) el.identityAuthor.textContent = listing.author ? ' by ' + listing.author : '';
        }
        if (el.identityOwnStep) el.identityOwnStep.hidden = !listing || identity.answer !== '';
        if (el.identityChangeStep) el.identityChangeStep.hidden = !listing || !own || !!identity.changeDetails;
        if (el.identityResult) el.identityResult.hidden = !listing || !identityDecided();
        var resultTitle = '';
        var resultText = '';
        if (listed) {
            resultTitle = 'Sending as an update';
            resultText =
                'The package goes up as an update to this listing with its own details, and nothing is published until a maintainer has checked the pull request.';
        } else if (editing) {
            resultTitle = 'Editing this listing';
            resultText =
                'The fields below hold the listing\u2019s own details, so you can edit them. Sending packs the result as an update, which waits for a maintainer.';
        } else if (ownTheme) {
            resultTitle = 'Sending as your own theme';
            resultText =
                'Give it your own title and author. The original details stay as placeholder text and disappear as you type, and the theme goes up as a new submission that can be merged automatically once the checks pass.';
        }
        if (el.identityResultTitle) el.identityResultTitle.textContent = resultTitle;
        if (el.identityResultText) el.identityResultText.textContent = resultText;
        /* The details fields only appear once the question has sent the
           submitter down a path that edits them. */
        if (el.submitDetails) el.submitDetails.hidden = !!listing && !editing && !ownTheme;
        if (el.submitBtn && !state.busy) {
            var label = el.submitBtn.querySelector('span');
            if (label) label.textContent = submitActionLabel();
        }
        updateChecklist();
        syncManageVisibility();
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
            var cacheKey = localKey('', value);
            var cached = state.galleryBlobCache[cacheKey];
            if (cached) return Promise.resolve(cached);
            return fetch(galleryFileUrl(galleryContentFolder(), value), { cache: 'no-store' })
                .then(function (res) {
                    if (!res.ok) throw new Error('Could not read ' + value + ' (' + res.status + ').');
                    return res.blob();
                })
                .then(function (blob) {
                    state.galleryBlobCache[cacheKey] = blob;
                    return blob;
                });
        }
        return Promise.reject(new Error('No theme package is open.'));
    }

    /* Gallery files are read once and kept for the session. Opening Edit (or
       Upload) warms every file the config points at, so a later save and the
       upload package reuse the bytes already in the page instead of fetching
       each image again. Preview keeps loading only what the simulator paints,
       which is why the warm pass reports progress instead of blocking it. */
    var galleryWarmFolder = '';
    var galleryWarmPromise = null;
    var assetWarmHideTimer = null;

    function setAssetWarmProgress(done, total, failed) {
        if (!el.assetWarm) return;
        if (assetWarmHideTimer) {
            window.clearTimeout(assetWarmHideTimer);
            assetWarmHideTimer = null;
        }
        if (!total) {
            el.assetWarm.hidden = true;
            return;
        }
        el.assetWarm.hidden = false;
        var finished = done >= total;
        el.assetWarm.classList.toggle('is-error', finished && failed > 0);
        if (el.assetWarmLabel) {
            el.assetWarmLabel.textContent = finished
                ? failed
                    ? failed + (failed === 1 ? ' file' : ' files') + ' could not be read — Save will try again'
                    : 'Theme files ready'
                : 'Loading theme files…';
        }
        if (el.assetWarmCount) el.assetWarmCount.textContent = done + ' / ' + total;
        var percent = Math.round((done / total) * 100);
        if (el.assetWarmBar) {
            el.assetWarmBar.value = percent;
            el.assetWarmBar.textContent = percent + '%';
        }
        if (finished && !failed) {
            assetWarmHideTimer = window.setTimeout(function () {
                if (el.assetWarm) el.assetWarm.hidden = true;
            }, 2400);
        }
    }

    function warmGalleryAssets() {
        if (state.sourceType !== 'gallery' || !state.folder || !state.config) return Promise.resolve();
        if (galleryWarmFolder === state.folder && galleryWarmPromise) return galleryWarmPromise;
        var folder = state.folder;
        var values = collectConfigAssetValues(state.config);
        galleryWarmFolder = folder;
        if (!values.length) {
            setAssetWarmProgress(0, 0, 0);
            return Promise.resolve();
        }
        var done = 0;
        var failed = 0;
        setAssetWarmProgress(done, values.length, failed);
        var next = 0;
        function lane() {
            if (next >= values.length) return Promise.resolve();
            var value = values[next];
            next += 1;
            return blobForAssetValue(value)
                .catch(function () {
                    failed += 1;
                })
                .then(function () {
                    done += 1;
                    if (galleryWarmFolder === folder) setAssetWarmProgress(done, values.length, failed);
                    return lane();
                });
        }
        var lanes = [];
        var laneCount = Math.min(6, values.length);
        for (var i = 0; i < laneCount; i += 1) lanes.push(lane());
        galleryWarmPromise = Promise.all(lanes).then(function () {
            if (galleryWarmFolder === folder) {
                setAssetWarmProgress(values.length, values.length, failed);
                if (state.mode === 'edit') scheduleThumbRefresh(120);
            }
        });
        return galleryWarmPromise;
    }

    function cleanThemeDescription(raw) {
        var text = String(raw || '').trim();
        if (!text) return '';
        var low = text.toLowerCase();
        var isThemeless = String(state.folder || '').trim().toLowerCase() === 'themeless';
        if (
            /^blank template theme with full config coverage for easy customization\.?/.test(low) ||
            (!isThemeless && /^a blank canvas to start\.\s*drop in your own desktop_wallpaper\.png\b/.test(low)) ||
            /\bis a custom theme for the innioasis y1( and y2)?\.?$/.test(low) ||
            /^download the .+ theme for (the )?innioasis y1\b/.test(low)
        ) {
            return '';
        }
        return text;
    }

    function syncConfigMetadata(config, title, author) {
        if (!config.theme_info || typeof config.theme_info !== 'object' || Array.isArray(config.theme_info)) {
            config.theme_info = {};
        }
        var info = config.theme_info;
        info.title = String(title || '').trim();
        info.author = String(author || '').trim();
        var authorUrl = el.submitAuthorUrl.value.trim();
        var desc = cleanThemeDescription(el.submitDesc.value.trim());
        var external = el.submitExternal.checked ? el.submitExternalUrl.value.trim() : '';
        if (authorUrl) info.authorUrl = authorUrl;
        else delete info.authorUrl;
        if (desc) info.description = desc;
        else delete info.description;
        if (external) info.externalDownloadUrl = external;
        else delete info.externalDownloadUrl;
    }

    async function collectThemeDeviceFiles(reportProgress, folderOverride) {
        if (!state.config) throw new Error('Open a theme first.');
        if (!window.ThemePackaging) throw new Error('The theme packager did not load.');
        var report = typeof reportProgress === 'function' ? reportProgress : null;
        function reportPercent(percent, label) {
            if (report) report(percent, label);
        }
        var title = el.submitTitle.value.trim() || state.meta.name || 'Untitled theme';
        var author = el.submitAuthor.value.trim();
        /* Updates pack into the listing's own folder so the gallery reads them
           as that listing's update; new themes use their own title. */
        var stem = safeStem(folderOverride || title);
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
            var configValues = collectConfigAssetValues(config);
            totalAssets = state.localFiles.length + configValues.length;
            state.localFiles.forEach(function (entry) {
                var path = entry.path;
                var key = localKey('', path);
                if (!key || seenPaths[key]) return;
                seenPaths[key] = true;
                var override = state.assetOverrides && state.assetOverrides[key];
                var blob = override && override.blob ? override.blob : entry.blob;
                entries.push({ path: path, download_url: path });
                blobs[key] = blob;
                blobs[path.toLowerCase()] = blob;
                reportAsset(path);
            });
            configValues.forEach(function (value) {
                var key = localKey('', value);
                if (!key || seenPaths[key]) return;
                var override = state.assetOverrides && state.assetOverrides[key];
                if (!override || !override.blob) return;
                seenPaths[key] = true;
                entries.push({ path: value, download_url: value });
                blobs[key] = override.blob;
                blobs[value.toLowerCase()] = override.blob;
                reportAsset(value);
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

        var manifest = window.ThemePackaging.buildPackManifest(entries, '', '', config);
        var outputConfig =
            manifest.mode === 'flat'
                ? window.ThemePackaging.rewriteConfigForDeviceFlatPack(config, '', manifest.logicalToDevice)
                : config;
        var deviceFiles = [];
        var packagedDeviceBlobs = Object.create(null);
        manifest.items.forEach(function (item) {
            if (String(item.devicePath || '').toLowerCase() === 'config.json') return;
            var blob =
                blobs[String(item.logicalPath || '').toLowerCase()] ||
                blobs[String(item.resolved || '').toLowerCase()] ||
                blobs[String(item.download_url || '').toLowerCase()];
            if (!blob) throw new Error('Missing file for ' + item.logicalPath + '.');
            deviceFiles.push({ devicePath: item.devicePath, blob: blob });
            packagedDeviceBlobs[String(item.devicePath || '').replace(/\\/g, '/').replace(/^\.\/+/, '').toLowerCase()] = blob;
        });

        return {
            title: title,
            stem: stem,
            outputConfig: outputConfig,
            deviceFiles: deviceFiles,
            blobs: blobs,
            packagedDeviceBlobs: packagedDeviceBlobs
        };
    }

    async function buildThemePackage(reportProgress, folderOverride, options) {
        if (!window.JSZip) throw new Error('The ZIP builder did not load.');
        var report = typeof reportProgress === 'function' ? reportProgress : null;
        function reportPercent(percent, label) {
            if (report) report(percent, label);
        }
        var collected = await collectThemeDeviceFiles(reportProgress, folderOverride);
        var stem = collected.stem;
        var outputConfig = collected.outputConfig;
        var blobs = collected.blobs;
        var packagedDeviceBlobs = collected.packagedDeviceBlobs;
        /* A saved theme is installed by pointing the player at the folder, so
           its ZIP opens straight onto config.json and the art. The upload path
           keeps the stem folder because the ingest expects a theme package. */
        var prefix = options && options.flat ? '' : stem + '/';
        reportPercent(35, 'Compressing theme…');
        var zip = new window.JSZip();
        zip.file(prefix + 'config.json', JSON.stringify(outputConfig, null, 2));
        collected.deviceFiles.forEach(function (item) {
            zip.file(prefix + item.devicePath, item.blob);
        });
        /* Gallery uploads (never player Save ZIPs) include a browser-rendered
           480x360 Home screen capture so the theme displays accurately right
           away; if rendering fails, the GitHub Action captures it instead. */
        if (
            options &&
            options.includeScreenshotPreview === true &&
            window.Y1ThemePreview &&
            typeof window.Y1ThemePreview.renderHomeScreenshotBlob === 'function'
        ) {
            var tempShotUrls = [];
            var tempUrlByKey = Object.create(null);
            try {
                var resolveShotUrl = function (_folder, relPath) {
                    var norm = String(relPath || '')
                        .trim()
                        .replace(/\\/g, '/')
                        .replace(/^\.\/+/, '')
                        .replace(/^\/+/, '');
                    if (!norm) return '';
                    var key = norm.toLowerCase();
                    if (tempUrlByKey[key]) return tempUrlByKey[key];
                    var matched =
                        packagedDeviceBlobs[key] ||
                        blobs[key] ||
                        packagedDeviceBlobs[norm.split('/').pop().toLowerCase()];
                    if (matched) {
                        var objUrl = URL.createObjectURL(matched);
                        tempUrlByKey[key] = objUrl;
                        tempShotUrls.push(objUrl);
                        return objUrl;
                    }
                    return state.sourceType === 'gallery'
                        ? galleryFileUrl(state.contentFolder || state.folder || '', norm)
                        : localFileUrl(state.contentFolder || '', norm);
                };
                var shotBlob = await window.Y1ThemePreview.renderHomeScreenshotBlob(outputConfig, {
                    catalogFolder: '',
                    variantSegment: '',
                    buildFileUrl: resolveShotUrl,
                    maxBytes: 32000
                });
                if (shotBlob && shotBlob.size > 0) {
                    zip.file(prefix + 'screenshot_preview.jpg', shotBlob);
                }
            } catch (_shotErr) {
                /* Fall back gracefully to GitHub Actions screenshot generation. */
            } finally {
                tempShotUrls.forEach(function (u) {
                    try {
                        URL.revokeObjectURL(u);
                    } catch (e) {}
                });
            }
        }
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
        if (el.tryDevice) {
            el.tryDevice.disabled = !!on || !state.meta;
        }
        if (el.submitBtn) {
            el.submitBtn.disabled = !!on || !state.meta;
            var submitText = el.submitBtn.querySelector('span');
            if (submitText) submitText.textContent = on && action === 'submit' ? 'Sending theme…' : submitActionLabel();
        }
        [el.trySelectFolder, el.tryCopyAgain, el.tryChangeFolder, el.trySaveFallback].forEach(function (btn) {
            if (btn) btn.disabled = !!on;
        });
    }

    /* —— Try on Device (USB Storage Mode) —— */

    function supportsTryOnDevicePicker() {
        return typeof window.showDirectoryPicker === 'function' && window.isSecureContext !== false;
    }

    function currentTryThemeStem() {
        var title = (el.submitTitle && el.submitTitle.value.trim()) || (state.meta && state.meta.name) || 'StudioTheme';
        return safeStem(title);
    }

    function setTryDeviceProgress(percent, label) {
        if (!el.tryDeviceProgress) return;
        var val = Math.max(0, Math.min(100, Math.round(Number(percent) || 0)));
        el.tryDeviceProgress.hidden = false;
        if (el.tryDeviceProgressLabel && label) el.tryDeviceProgressLabel.textContent = label;
        if (el.tryDeviceProgressValue) el.tryDeviceProgressValue.textContent = val + '%';
        if (el.tryDeviceProgressBar) {
            el.tryDeviceProgressBar.value = val;
            el.tryDeviceProgressBar.textContent = val + '%';
        }
    }

    function setTryDeviceStatus(message, ok) {
        if (!el.tryDeviceStatus) return;
        if (!message) {
            el.tryDeviceStatus.hidden = true;
            el.tryDeviceStatus.textContent = '';
            el.tryDeviceStatus.className = 'studio-try-device-status';
            return;
        }
        el.tryDeviceStatus.hidden = false;
        el.tryDeviceStatus.textContent = message;
        el.tryDeviceStatus.className = 'studio-try-device-status' + (ok ? ' is-ok' : ' is-error');
    }

    function syncTryDeviceModalState() {
        var supported = supportsTryOnDevicePicker();
        var connected = !!(supported && state.tryDeviceHandle);
        var repeated = state.tryOnDeviceCount >= 1;
        if (el.tryDeviceFolderName) {
            el.tryDeviceFolderName.textContent = currentTryThemeStem() + '/';
        }
        if (el.tryDeviceReminder) {
            el.tryDeviceReminder.hidden = !repeated;
        }
        if (el.tryDeviceSteps) {
            el.tryDeviceSteps.hidden = !supported;
        }
        if (el.tryDeviceUnsupported) {
            el.tryDeviceUnsupported.hidden = supported;
        }
        if (el.tryDeviceConnected) {
            el.tryDeviceConnected.hidden = !connected;
        }
        if (el.tryDeviceConnectedName && connected) {
            el.tryDeviceConnectedName.textContent = state.tryDeviceHandle.name || 'Themes';
        }
        if (el.trySelectFolder) {
            el.trySelectFolder.hidden = !supported || connected;
        }
        if (el.tryCopyAgain) {
            el.tryCopyAgain.hidden = !connected;
        }
        if (el.tryChangeFolder) {
            el.tryChangeFolder.hidden = !connected;
        }
        if (el.trySaveFallback) {
            el.trySaveFallback.hidden = supported;
        }
    }

    function openTryOnDeviceModal() {
        if (!state.config) {
            toast('Open a theme first.');
            return;
        }
        if (!el.tryDeviceModal) return;
        if (el.tryDeviceProgress) el.tryDeviceProgress.hidden = true;
        setTryDeviceStatus('', true);
        syncTryDeviceModalState();
        el.tryDeviceModal.hidden = false;
        var focusTarget =
            (el.trySelectFolder && !el.trySelectFolder.hidden && el.trySelectFolder) ||
            (el.tryCopyAgain && !el.tryCopyAgain.hidden && el.tryCopyAgain) ||
            (el.trySaveFallback && !el.trySaveFallback.hidden && el.trySaveFallback) ||
            el.tryDeviceClose;
        if (focusTarget) {
            try {
                focusTarget.focus({ preventScroll: true });
            } catch (e) {}
        }
    }

    function closeTryOnDeviceModal() {
        if (state.busy || !el.tryDeviceModal || el.tryDeviceModal.hidden) return;
        el.tryDeviceModal.hidden = true;
    }

    async function resolvePlayerThemesDir(pickedHandle) {
        if (!pickedHandle) return null;
        var pickedName = String(pickedHandle.name || '').trim().toLowerCase();
        if (pickedName !== 'themes') {
            var candidates = ['Themes', 'themes', 'THEMES'];
            for (var i = 0; i < candidates.length; i += 1) {
                try {
                    var child = await pickedHandle.getDirectoryHandle(candidates[i], { create: false });
                    if (child) return child;
                } catch (_missing) {}
            }
        }
        return pickedHandle;
    }

    async function writeBlobToRelativePath(rootDir, relativePath, blob) {
        var parts = String(relativePath || '')
            .replace(/\\/g, '/')
            .replace(/^\/+/, '')
            .split('/')
            .filter(Boolean);
        if (!parts.length) return;
        var dir = rootDir;
        for (var i = 0; i < parts.length - 1; i += 1) {
            dir = await dir.getDirectoryHandle(parts[i], { create: true });
        }
        var fileHandle = await dir.getFileHandle(parts[parts.length - 1], { create: true });
        var writable = await fileHandle.createWritable();
        try {
            await writable.write(blob);
            await writable.close();
        } catch (err) {
            try {
                await writable.abort();
            } catch (_e) {}
            throw err;
        }
    }

    async function copyThemeToDeviceHandle(baseHandle) {
        if (!baseHandle || state.busy) return;
        if (!state.config) {
            toast('Open a theme first.');
            return;
        }
        setBusy(true, 'try-device');
        setTryDeviceStatus('', true);
        setTryDeviceProgress(2, 'Checking folder permissions…');
        try {
            if (typeof baseHandle.requestPermission === 'function') {
                var perm = await baseHandle.requestPermission({ mode: 'readwrite' });
                if (perm !== 'granted') {
                    throw new Error('Write permission to the Themes folder was not granted.');
                }
            }
            var themesDir = await resolvePlayerThemesDir(baseHandle);
            state.tryDeviceHandle = themesDir;
            syncTryDeviceModalState();

            var collected = await collectThemeDeviceFiles(function (pct, label) {
                setTryDeviceProgress(Math.min(40, pct), label);
            });
            var folderName = collected.stem;
            var themeDir = await themesDir.getDirectoryHandle(folderName, { create: true });
            var totalWrites = collected.deviceFiles.length + 1;
            setTryDeviceProgress(42, 'Writing config.json (1/' + totalWrites + ')…');
            await writeBlobToRelativePath(
                themeDir,
                'config.json',
                new Blob([JSON.stringify(collected.outputConfig, null, 2)], { type: 'application/json' })
            );
            for (var i = 0; i < collected.deviceFiles.length; i += 1) {
                var item = collected.deviceFiles[i];
                var step = i + 2;
                setTryDeviceProgress(
                    42 + (step / totalWrites) * 56,
                    'Copying ' + (fileName(item.devicePath) || 'asset') + ' (' + step + '/' + totalWrites + ')…'
                );
                await writeBlobToRelativePath(themeDir, item.devicePath, item.blob);
            }
            setTryDeviceProgress(100, 'Copied to device');

            state.tryOnDeviceCount += 1;
            try {
                window.sessionStorage.setItem('y1-studio-try-device-count', String(state.tryOnDeviceCount));
            } catch (_e) {}
            syncTryDeviceModalState();

            var baseMsg =
                'Copied "' +
                collected.title +
                '" into ' +
                (themesDir.name || 'Themes') +
                '/' +
                folderName +
                '/. Safely eject USB storage on your computer to test it on your player.';
            if (state.tryOnDeviceCount > 1) {
                baseMsg +=
                    ' Since you have tested more than once in this session, remember to restart your device and select another theme (then switch back) so your updated files load fresh.';
            }
            setTryDeviceStatus(baseMsg, true);
            toast('Copied "' + collected.title + '" to ' + (themesDir.name || 'Themes') + '/' + folderName + '/');
        } catch (err) {
            if (err && err.name === 'AbortError') {
                if (el.tryDeviceProgress) el.tryDeviceProgress.hidden = true;
                return;
            }
            setTryDeviceStatus(
                (err && err.message) || 'Could not copy theme files into that folder. Make sure USB Storage Mode is enabled and try again.',
                false
            );
        } finally {
            setBusy(false);
        }
    }

    async function pickThemesFolderAndTry() {
        if (state.busy) return;
        if (!supportsTryOnDevicePicker()) {
            syncTryDeviceModalState();
            return;
        }
        var handle = null;
        try {
            try {
                handle = await window.showDirectoryPicker({ id: 'y1-themes-folder', mode: 'readwrite' });
            } catch (optErr) {
                if (optErr && optErr.name === 'AbortError') return;
                handle = await window.showDirectoryPicker();
            }
        } catch (err) {
            if (err && err.name === 'AbortError') return;
            setTryDeviceStatus((err && err.message) || 'Could not open the folder chooser.', false);
            return;
        }
        if (handle) {
            await copyThemeToDeviceHandle(handle);
        }
    }

    function setSubmitStatus(message, ok, linkUrl, folderHint) {
        if (!el.submitStatus) return;
        el.submitStatus.innerHTML = '';
        el.submitStatus.className = 'studio-submit-status' + (ok ? ' is-ok' : ' is-error');
        var text = document.createElement('span');
        text.textContent = message;
        el.submitStatus.appendChild(text);
        if (linkUrl) {
            var track = trackingUrlFor(linkUrl, folderHint);
            var link = document.createElement('a');
            link.href = track || linkUrl;
            link.target = '_blank';
            link.rel = 'noopener';
            link.textContent = track ? 'Track this request' : 'View pull request';
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
            var file = await buildThemePackage(setSaveProgress, null, { flat: true });
            downloadBlob(file);
            if (
                state.sourceType === 'gallery' &&
                state.folder &&
                window.ThemeAnalytics &&
                typeof window.ThemeAnalytics.trackZipDownload === 'function'
            ) {
                window.ThemeAnalytics.trackZipDownload(state.folder, 'studio');
            }
            setSaveProgress(100, 'Download started');
            hideSaveProgress(2400);
            state.dirty = false;
            state.formDirty = false;
            if (el.unsaved) el.unsaved.hidden = true;
            /* The work is in the downloaded ZIP now; there is nothing left to
               recover, and a return visit should start clean. */
            clearRecovery();
            hideRecoveryBanner();
            var savedTitle = el.submitTitle.value.trim() || (state.meta && state.meta.name) || '';
            toast('Saved ' + file.name + '. Copy it to your player’s theme folder to install.');
            announceSupportNote('save', {
                themeName: savedTitle,
                fileName: file.name,
                delayMs: 350
            });
        } catch (err) {
            hideSaveProgress(0);
            toast((err && err.message) || 'Could not build that theme ZIP.');
        } finally {
            setBusy(false);
        }
    }

    async function submitTheme() {
        if (state.busy) return;
        if (galleryIndexReady) {
            try {
                await galleryIndexReady;
            } catch (_) {
                /* No catalog means no listing can match; the Worker validates
                   the submission either way. */
            }
        }
        /* The catalog can land after the package opened, so the identity
           question may not have been asked yet. Ask it now rather than send an
           update as a new theme. */
        if (!state.identity.listing) {
            var lateListing = matchingGalleryListing();
            if (lateListing) {
                resetIdentity(lateListing);
                syncIdentity();
                updateUpdateNotice();
                updateChecklist();
                toast(
                    'This package matches the gallery listing \u201c' +
                        (lateListing.name || lateListing.folder) +
                        '\u201d. Answer the question in the panel before sending.'
                );
                if (el.identity) el.identity.scrollIntoView({ block: 'nearest' });
                return;
            }
        }
        if (!state.config || !state.previewOk) {
            toast('Wait for the theme preview to render first.');
            return;
        }
        if (!identityDecided()) {
            /* The package matches a gallery listing and the question in the
               panel has not been answered: both the intent and the details
               depend on that answer, so nothing is packed up yet. */
            toast(
                state.identity.answer
                    ? 'Say whether the listing details should change before sending.'
                    : 'Answer the question above before sending this theme.'
            );
            if (el.identity) el.identity.scrollIntoView({ block: 'nearest' });
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
                    toast('Those are the open theme\u2019s details. Use your own title and author to send it as a new theme.');
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
            var stem = safeStem(title);
            var listing = state.identity.listing;
            var updateFolder = state.ownUpdate && listing && listing.folder ? safeStem(listing.folder) : '';
            var packFolder = updateFolder || stem;
            var file = await buildThemePackage(undefined, packFolder, { includeScreenshotPreview: true });
            var batch = await wrapUploadBatch(file, packFolder);
            setSubmitStatus('Sending your theme for review…', true);
            var form = new FormData();
            form.set('zip', batch, batch.name);
            form.set('themeTitle', title);
            form.set('themeAuthor', author);
            form.set('submissionIntent', state.ownUpdate ? 'update' : 'new');
            if (updateFolder) form.set('targetFolder', updateFolder);
            form.set('shareFolderHints', JSON.stringify([packFolder]));
            var response = await uploadRequest('/api/upload-theme', { method: 'POST', body: form });
            var payload = await response.json().catch(function () {
                return {};
            });
            if (!response.ok) throw new Error(uploadFailureMessage(response.status, payload));
            var prUrl = payload.prUrl ? String(payload.prUrl) : '';
            /* New themes (including ones derived from a listed theme) merge by
               themselves once the checks pass; updates wait for a maintainer.
               Either way the request is tracked on our own page, and the
               submitter is the only one holding that link. */
            setSubmitStatus(
                (state.ownUpdate
                    ? 'Received. Your update is in a pull request that waits for a maintainer to merge it.'
                    : 'Received. Your theme is in a pull request that merges automatically once its checks pass.') +
                    (prUrl ? ' Keep this tracking link: it is how you check on the request later.' : ''),
                true,
                prUrl,
                packFolder
            );
            state.dirty = false;
            state.formDirty = false;
            if (el.unsaved) el.unsaved.hidden = true;
            toast('Theme submitted for review.');
            var submitTrack = trackingUrlFor(prUrl, packFolder);
            announceSupportNote(state.ownUpdate ? 'update' : 'submission', {
                themeName: title,
                linkUrl: submitTrack || prUrl,
                linkLabel: submitTrack ? 'Track this request' : 'View pull request'
            });
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
        if (el.submitDesc) el.submitDesc.value = cleanThemeDescription(meta.desc || '');
        if (el.submitAuthorUrl) el.submitAuthorUrl.value = meta.authorUrl || '';
        if (meta.externalDownloadUrl) {
            el.submitExternal.checked = true;
            el.submitExternalWrap.hidden = false;
            el.submitExternalUrl.value = meta.externalDownloadUrl;
        }
        state.formDirty = true;
    }

    function fillSubmitForm() {
        if (!state.meta) return;
        state.formDirty = false;
        /* A package whose config details exactly match a gallery listing has to
           say whether it is that listing's update before it can be sent, so the
           identity question is recomputed for every theme that opens. */
        resetIdentity(matchingGalleryListing());
        /* The open theme's details are only ever suggestions: they show as
           placeholder text and vanish the moment someone types, so a new upload
           cannot inherit another listing's title, author or description. They
           become real values once the identity question sends the submitter
           down the update path. */
        setPlaceholder(el.submitTitle, state.meta.name);
        setPlaceholder(el.submitAuthor, state.meta.author);
        setPlaceholder(el.submitDesc, cleanThemeDescription(state.meta.desc));
        setPlaceholder(el.submitAuthorUrl, state.meta.authorUrl);
        setPlaceholder(el.submitExternalUrl, state.meta.externalDownloadUrl);
        clearSubmitFields();
        if (el.editAck) el.editAck.checked = false;
        populateAuthorOptions();
        syncIdentity();
        updateUpdateNotice();
        syncPolicy();
        updateChecklist();
        /* A package opened before themes.json arrives cannot be matched against
           the gallery yet. Once the index lands, ask the identity question so
           an update is never filed as a brand-new theme. */
        if (!state.gallery.length && galleryIndexReady) {
            galleryIndexReady.then(function () {
                if (!state.meta || state.identity.answer) return;
                resetIdentity(matchingGalleryListing());
                syncIdentity();
                updateUpdateNotice();
                updateChecklist();
            });
        }
    }

    function setCheck(name, ok, detail) {
        /* The checklist left the Submit pane when the identity question and the
           listing tools took over that space. */
        if (!el.checklist) return;
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
        setCheck(
            'details',
            detailsOk,
            !identityDecided()
                ? 'Answer the question above first'
                : detailsOk
                  ? 'Title and author are ready'
                  : 'Add a title and author'
        );
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

    function showEmpty(title, text, kind) {
        var start = kind === 'start';
        if (el.empty) el.empty.dataset.kind = start ? 'start' : 'error';
        if (el.emptyEyebrow) el.emptyEyebrow.hidden = !start;
        el.emptyTitle.textContent = title;
        el.emptyText.textContent = text;
        /* The three ways in are only offered when nothing is open; an error keeps
           the card focused on what went wrong. */
        if (el.emptyActions) el.emptyActions.hidden = !start;
        if (el.emptyHint) el.emptyHint.hidden = !start;
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
                if (!entries.length) {
                    setLoading(false);
                    toast('That ZIP has no theme files in it. Pick the packaged theme archive, not an empty folder.');
                    return;
                }
                return openLocalEntries(entries, file.name.replace(/\.zip$/i, ''));
            })
            .catch(function (err) {
                setLoading(false);
                var raw = (err && err.message) || '';
                /* JSZip answers a truncated or non-ZIP file with a stack-trace
                   sentence and a link to its own docs. Say what went wrong and
                   what to do instead. */
                if (/end of central directory|not a zip|corrupt|checksum|invalid|unexpected/i.test(raw)) {
                    toast(
                        'That file is not a valid theme ZIP, or the download was cut short. Download it again, or use \u201cOpen folder\u201d to pick the unpacked theme folder.'
                    );
                    return;
                }
                toast(raw || 'Could not read that ZIP. Download it again, or use \u201cOpen folder\u201d instead.');
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
        state.sourceType = 'local';
        /* Local packages resolve their own files (localMissing already covers
           gaps), so nothing from the gallery validation applies here. */
        state.missingAssetPaths = Object.create(null);
        state.missingAssetValues = Object.create(null);
        applyBlankSlots(state.config);
        state.configBase = cloneJson(state.config);
        state.folder = null;
        state.variant = '';
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
            await mountPreview({ freshView: true });
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
        closeOnboarding();
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

    /* —— Which players a theme is listed for ——
       Y2 added a file manager icon to the home screen. A theme only counts as
       Y1 / Y2 when that icon is part of the package; with the slot left on the
       shared transparent placeholder the theme is Y1 only. The badge is read
       from the asset list rather than from the theme's gallery metadata, so an
       icon added or binned in the editor updates the claim immediately. */
    var FILE_MANAGER_ASSET = 'homePageConfig.fileManager';

    function fileManagerAsset() {
        return state.assetById ? state.assetById[FILE_MANAGER_ASSET] : null;
    }

    function themeShipsFileManager() {
        var asset = fileManagerAsset();
        if (!asset) return false;
        if (asset.placeholder || asset.empty) return false;
        return !!String(asset.value || '').trim();
    }

    function platformCopy() {
        if (!state.meta) {
            return {
                label: 'Y1 / Y2',
                title: 'Y1 / Y2 theme',
                body: 'A theme is listed as a Y1 / Y2 theme only when it includes the file manager icon that Y2 adds to the home screen. Open a theme to check it.',
                action: ''
            };
        }
        if (!state.config) {
            return {
                label: 'Y1 / Y2',
                title: 'Y1 / Y2 theme',
                body: 'Reading this theme to see whether it includes the Y2 file manager icon.',
                action: ''
            };
        }
        if (themeShipsFileManager()) {
            return {
                label: 'Y1 / Y2',
                title: 'Y1 / Y2 theme',
                body: 'This theme includes the file manager icon that Y2 adds to the home screen, so it is listed for both Y1 and Y2.',
                action: 'Show file manager icon'
            };
        }
        return {
            label: 'Y1',
            title: 'Y1 theme',
            body: 'This theme has no file manager icon, so it is listed for Y1 only. Add that icon to have the theme listed as a Y1 / Y2 theme.',
            action: 'Add file manager icon'
        };
    }

    function refreshPlatformPopover() {
        var copy = platformCopy();
        if (el.platformPopTitle) el.platformPopTitle.textContent = copy.title;
        if (el.platformPopBody) el.platformPopBody.textContent = copy.body;
        if (el.platformFocus) {
            var label = el.platformFocus.querySelector('span');
            if (label && copy.action) label.textContent = copy.action;
            el.platformFocus.hidden = !copy.action;
        }
    }

    function refreshPlatformChip() {
        var copy = platformCopy();
        if (el.platformLabel) el.platformLabel.textContent = copy.label;
        if (el.platformChip) {
            el.platformChip.title = copy.title + ' — ' + copy.body;
            el.platformChip.setAttribute('aria-label', copy.title + '. ' + copy.body);
            el.platformChip.classList.toggle('is-y1-only', copy.label === 'Y1');
        }
        refreshPlatformPopover();
    }

    function closePlatformPop() {
        if (!el.platformPop) return;
        el.platformPop.hidden = true;
        if (el.platformChip) el.platformChip.setAttribute('aria-expanded', 'false');
        el.platformPop.__pinned = false;
    }

    function focusFileManagerAsset() {
        if (!state.meta) {
            toast('Open a theme first.');
            return;
        }
        var asset = fileManagerAsset();
        if (!asset) {
            toast('This theme does not declare a file manager icon slot.');
            return;
        }
        closePlatformPop();
        setMode('edit');
        var trayKey = 'asset:' + asset.section;
        if (!state.openTrays[trayKey]) {
            state.openTrays[trayKey] = true;
            renderAssets();
        }
        selectAsset(asset.id, { reveal: true });
        var row = null;
        each(el.assetList ? el.assetList.querySelectorAll('[data-asset-id]') : [], function (candidate) {
            if (candidate.getAttribute('data-asset-id') === asset.id) row = candidate;
        });
        if (!row) {
            toast('Open the ' + asset.section + ' group to find ' + asset.label + '.');
            return;
        }
        window.setTimeout(function () {
            try {
                row.scrollIntoView({ behavior: 'smooth', block: 'center' });
            } catch (_) {}
            row.classList.add('is-platform-focus');
            window.setTimeout(function () {
                row.classList.remove('is-platform-focus');
            }, 2600);
        }, 60);
    }

    function setupPlatformBadge() {
        if (!el.platformChip || !el.platformPop) return;
        var wrap = el.platformChip.parentNode;
        var hoverTimer = 0;

        function show(pin) {
            window.clearTimeout(hoverTimer);
            refreshPlatformPopover();
            el.platformPop.hidden = false;
            el.platformChip.setAttribute('aria-expanded', 'true');
            if (pin) el.platformPop.__pinned = true;
        }

        function hide(force) {
            if (el.platformPop.__pinned && !force) return;
            window.clearTimeout(hoverTimer);
            closePlatformPop();
        }

        el.platformChip.addEventListener('click', function (event) {
            event.preventDefault();
            event.stopPropagation();
            if (!el.platformPop.hidden && el.platformPop.__pinned) hide(true);
            else show(true);
        });

        wrap.addEventListener('pointerenter', function () {
            show(false);
        });

        wrap.addEventListener('pointerleave', function () {
            window.clearTimeout(hoverTimer);
            hoverTimer = window.setTimeout(function () { hide(false); }, 170);
        });

        el.platformPop.addEventListener('pointerenter', function () {
            window.clearTimeout(hoverTimer);
        });

        el.platformPop.addEventListener('focusin', function () {
            window.clearTimeout(hoverTimer);
        });

        el.platformPop.addEventListener('focusout', function (event) {
            if (wrap.contains(event.relatedTarget)) return;
            hoverTimer = window.setTimeout(function () { hide(false); }, 130);
        });

        document.addEventListener('click', function (event) {
            if (el.platformPop.hidden) return;
            if (wrap.contains(event.target)) return;
            hide(true);
        });

        document.addEventListener('keydown', function (event) {
            if (event.key !== 'Escape' || el.platformPop.hidden) return;
            hide(true);
            el.platformChip.focus();
        });

        if (el.platformFocus) {
            el.platformFocus.addEventListener('click', function (event) {
                event.preventDefault();
                event.stopPropagation();
                focusFileManagerAsset();
            });
        }
    }

    function bindEvents() {
        setupAssetListEvents();
        setupPreviewAssetFocus();
        setupPlatformBadge();
        /* Once a theme has a changed asset, attribute or detail, leaving the
           page is always asked about first. The recovery copy is a safety net,
           not a reason to close an edit session without a word. */
        window.addEventListener('beforeunload', function (event) {
            if (!isDirty()) return;
            event.preventDefault();
            event.returnValue = '';
        });

        each(document.querySelectorAll('[data-mode-btn]'), function (btn) {
            btn.addEventListener('click', function () {
                /* The mode tabs are the way out of the phone theme picker. */
                closeThemeChooser();
                setMode(btn.getAttribute('data-mode-btn'));
            });
        });

        /* Below 760px the inspector is its own surface, so the gallery list it
           owns disappears with it in Preview mode. Without this button a phone
           that already has a theme open could never swap to another one. */
        if (el.openTheme) {
            el.openTheme.addEventListener('click', function () {
                if (document.body.classList.contains('studio-chooser')) {
                    closeThemeChooser();
                    setMode('preview');
                    return;
                }
                document.body.classList.add('studio-chooser');
                el.openTheme.setAttribute('aria-expanded', 'true');
                state.swapOpen = true;
                if (el.swapPanel) el.swapPanel.hidden = false;
                setMode('preview');
                window.setTimeout(function () {
                    if (el.themeFilter) el.themeFilter.focus({ preventScroll: true });
                }, 80);
            });
        }

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

        if (el.openZipBar) {
            el.openZipBar.addEventListener('click', function () {
                el.zipInput.click();
            });
        }
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

        /* —— Identity question ——
           Answering it is what tells the studio which kind of submission this
           is, so each answer sets the intent and the details in one step. */

        each(document.querySelectorAll('[data-identity-own]'), function (button) {
            button.addEventListener('click', function () {
                var mine = button.getAttribute('data-identity-own') === 'yes';
                state.identity.answer = mine ? 'own' : 'other';
                state.identity.changeDetails = '';
                state.ownUpdate = false;
                clearSubmitFields();
                if (mine) {
                    /* The author confirmed the listing is theirs, so the package
                       is an update until they say otherwise: the details stay
                       as listed and the listing tools replace the question. */
                    state.identity.changeDetails = 'no';
                    state.ownUpdate = true;
                    applyOwnDetails();
                }
                syncIdentity();
                updateUpdateNotice();
                markDirty();
                if (!mine) {
                    toast('Send it as your own theme: fill in your own title and author.');
                    if (el.submitTitle) el.submitTitle.focus();
                }
            });
        });

        if (el.identityReset) {
            el.identityReset.addEventListener('click', function () {
                clearSubmitFields();
                resetIdentity(state.identity.listing);
                syncIdentity();
                updateUpdateNotice();
            });
        }

        el.submitBtn.addEventListener('click', function () {
            submitTheme();
        });

        if (el.save) el.save.addEventListener('click', saveTheme);
        if (el.tryDevice) el.tryDevice.addEventListener('click', openTryOnDeviceModal);
        if (el.tryDeviceX) el.tryDeviceX.addEventListener('click', closeTryOnDeviceModal);
        if (el.tryDeviceClose) el.tryDeviceClose.addEventListener('click', closeTryOnDeviceModal);
        if (el.tryDeviceModal) {
            el.tryDeviceModal.addEventListener('click', function (event) {
                if (event.target === el.tryDeviceModal) closeTryOnDeviceModal();
            });
        }
        if (el.trySelectFolder) el.trySelectFolder.addEventListener('click', pickThemesFolderAndTry);
        if (el.tryChangeFolder) el.tryChangeFolder.addEventListener('click', pickThemesFolderAndTry);
        if (el.tryCopyAgain) {
            el.tryCopyAgain.addEventListener('click', function () {
                if (state.tryDeviceHandle) copyThemeToDeviceHandle(state.tryDeviceHandle);
                else pickThemesFolderAndTry();
            });
        }
        if (el.trySaveFallback) {
            el.trySaveFallback.addEventListener('click', function () {
                closeTryOnDeviceModal();
                saveTheme();
            });
        }
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
        [el.emptyZip, el.emptyFolder].forEach(function (button) {
            if (!button) return;
            button.addEventListener('click', function () {
                if (button === el.emptyZip) el.zipInput.click();
                else el.folderInput.click();
            });
        });

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
            if (event.key === 'Escape') {
                hideDrop();
                closeTryOnDeviceModal();
            }
        });
        /* A debounced write can still be pending when the tab goes away; closing
           the lid mid-edit should not cost the last asset change. */
        window.addEventListener('pagehide', function () {
            if (recoveryTimer) saveRecoveryNow();
        });
        document.addEventListener('visibilitychange', function () {
            if (document.visibilityState === 'hidden' && recoveryTimer) saveRecoveryNow();
        });
        if (el.recoveryDiscard) el.recoveryDiscard.addEventListener('click', discardRecovery);
        if (el.recoveryDismiss) el.recoveryDismiss.addEventListener('click', hideRecoveryBanner);
    }

    /* —— Managing a listing: update, text fixes, removal ——

       These three used to be separate pages (upload.html, report-theme.html).
       They live in the Studio now because the Studio already knows which theme
       is open, who is editing it and what its current details are. */

    function manageSection() {
        return document.getElementById('studio-manage');
    }

    function setManageStatus(message, ok, prUrl, folderHint) {
        var status = document.getElementById('studio-manage-status');
        if (!status) return;
        status.textContent = message || '';
        status.classList.toggle('is-error', ok === false);
        status.classList.toggle('is-ok', ok === true);
        var track = trackingUrlFor(prUrl, folderHint || state.folder);
        if (message && track) {
            var link = document.createElement('a');
            link.href = track;
            link.target = '_blank';
            link.rel = 'noopener';
            link.textContent = 'Track this request';
            status.appendChild(document.createTextNode(' '));
            status.appendChild(link);
        }
    }

    /* Pull requests are tracked on our own page: it reads the merge state from
       GitHub, keeps the submitter off GitHub unless they want the details, and
       links straight into Theme Studio's Preview tab for the submitted theme. */
    function trackingUrlFor(prUrl, folderHint) {
        var match = String(prUrl || '').match(/\/pull\/(\d+)/);
        if (!match) return '';
        var url = '/submission.html?pr=' + match[1];
        var folder = String(folderHint || '').trim();
        if (folder) url += '&folder=' + encodeURIComponent(folder);
        return url;
    }

    async function postManageForm(path, form) {
        var response = await uploadRequest(path, { method: 'POST', body: form });
        var payload = await response.json().catch(function () {
            return {};
        });
        if (!response.ok) throw new Error(payload.error || payload.message || 'The request failed (' + response.status + ').');
        return payload;
    }

    async function postManageJson(path, body) {
        var response = await uploadRequest(path, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        var payload = await response.json().catch(function () {
            return {};
        });
        if (!response.ok) throw new Error(payload.error || payload.message || 'The request failed (' + response.status + ').');
        return payload;
    }

    function galleryThemeForManage() {
        if (!state.folder) return null;
        return state.byFolder[state.folder] || null;
    }

    function syncManageVisibility() {
        var section = manageSection();
        if (!section) return;
        var listing = state.sourceType === 'gallery' ? galleryThemeForManage() : null;
        /* The update, text and removal tools are the author's, so they only
           appear once the question above has been answered with "Yes, I made
           it"; everyone else sees the new-theme path instead. */
        section.hidden = !listing || state.identity.answer !== 'own';
        if (!listing) return;
        var nameEl = section.querySelector('[data-manage-name]');
        if (nameEl) nameEl.textContent = listing.name || state.folder;
        var authorEl = section.querySelector('[data-manage-author]');
        if (authorEl) authorEl.textContent = listing.author ? 'by ' + listing.author : '';
        var hint = section.querySelector('[data-manage-hint]');
        if (hint) {
            hint.textContent = listing.sourceType === 'external'
                ? 'This entry points at a download on the author’s own page, so only the listing text can be changed here.'
                : 'Updates, text fixes and takedowns all go to a maintainer as a pull request.';
        }
        var updateBtn = section.querySelector('[data-manage-update]');
        if (updateBtn) updateBtn.hidden = listing.sourceType === 'external';
    }

    function openManage(panel) {
        var section = manageSection();
        if (!section) return;
        setMode('submit');
        if (!section.hidden) {
            clearSubmitScrollTimer();
            section.scrollIntoView({ block: 'start', behavior: 'smooth' });
        }
        var which = panel === 'remove' || panel === 'details' ? panel : '';
        section.querySelector('[data-manage-remove-form]').hidden = which !== 'remove';
        section.querySelector('[data-manage-details-form]').hidden = which !== 'details';
        if (which === 'remove') {
            var confirmName = section.querySelector('#studio-remove-confirm-name');
            if (confirmName) confirmName.focus();
        }
    }

    function setupManage() {
        var pane = document.getElementById('pane-submit');
        if (!pane || manageSection()) return;
        var anchor = pane.querySelector('.studio-package');

        var section = document.createElement('section');
        section.className = 'studio-manage';
        section.id = 'studio-manage';
        section.hidden = true;
        section.innerHTML = [
            '<div class="studio-manage-head">',
            '  <p class="studio-eyebrow"><i class="fa-solid fa-screwdriver-wrench" aria-hidden="true"></i> Your listing</p>',
            '  <h2>Manage <span data-manage-name translate="no" data-i18n-skip></span></h2>',
            '  <p class="studio-manage-author" data-manage-author translate="no" data-i18n-skip></p>',
            '  <p class="studio-hint" data-manage-hint></p>',
            '</div>',
            '<div class="studio-manage-actions">',
            '  <button class="studio-btn studio-btn--primary" type="button" data-manage-update><i class="fa-solid fa-upload" aria-hidden="true"></i>Send an update</button>',
            '  <button class="studio-btn" type="button" data-manage-details><i class="fa-solid fa-pen" aria-hidden="true"></i>Fix the listing text</button>',
            '  <button class="studio-btn" type="button" data-manage-remove><i class="fa-solid fa-xmark" aria-hidden="true"></i>Request removal</button>',
            '</div>',
            '<button class="studio-mini-btn" type="button" data-manage-reset>',
            '  <i class="fa-solid fa-rotate-left" aria-hidden="true"></i>Change answer',
            '</button>',

            '<form class="studio-manage-form" data-manage-details-form hidden>',
            '  <div class="studio-field">',
            '    <label for="studio-details-title">Title</label>',
            '    <input id="studio-details-title" type="text" maxlength="120" translate="no" data-i18n-skip />',
            '  </div>',
            '  <div class="studio-field">',
            '    <label for="studio-details-desc">Description</label>',
            '    <textarea id="studio-details-desc" rows="3" maxlength="600" translate="no" data-i18n-skip></textarea>',
            '  </div>',
            '  <div class="studio-field">',
            '    <label for="studio-details-author-url">Author link</label>',
            '    <input id="studio-details-author-url" type="url" placeholder="https://" translate="no" data-i18n-skip />',
            '  </div>',
            '  <p class="studio-hint">Write both in English. The gallery translates them for every visitor.</p>',
            '  <div class="studio-manage-buttons">',
            '    <button class="studio-btn studio-btn--primary" type="submit">Send the new text</button>',
            '    <button class="studio-btn" type="button" data-manage-cancel>Cancel</button>',
            '  </div>',
            '</form>',

            '<form class="studio-manage-form" data-manage-remove-form hidden>',
            '  <div class="studio-field">',
            '    <label for="studio-remove-reason">Why should it come down?</label>',
            '    <select id="studio-remove-reason">',
            '      <option value="author request">I am the author and I want it removed</option>',
            '      <option value="copyright">It uses work I own without permission</option>',
            '      <option value="wrong details">The listing credits the wrong person or title</option>',
            '      <option value="other">Something else</option>',
            '    </select>',
            '  </div>',
            '  <div class="studio-field">',
            '    <label for="studio-remove-notes">What should the maintainer know?</label>',
            '    <textarea id="studio-remove-notes" rows="3" maxlength="600" placeholder="Links or details that help us check this"></textarea>',
            '  </div>',
            '  <div class="studio-form-grid">',
            '    <div class="studio-field">',
            '      <label for="studio-remove-requester">Your name or handle</label>',
            '      <input id="studio-remove-requester" type="text" maxlength="80" autocomplete="name" />',
            '    </div>',
            '    <div class="studio-field">',
            '      <label for="studio-remove-email">Contact email</label>',
            '      <input id="studio-remove-email" type="email" autocomplete="email" placeholder="you@example.com" />',
            '    </div>',
            '  </div>',
            '  <div class="studio-form-grid">',
            '    <div class="studio-field">',
            '      <label for="studio-remove-confirm-name">Type the listed title to confirm</label>',
            '      <input id="studio-remove-confirm-name" type="text" translate="no" data-i18n-skip />',
            '    </div>',
            '    <div class="studio-field">',
            '      <label for="studio-remove-confirm-author">Type the listed author to confirm</label>',
            '      <input id="studio-remove-confirm-author" type="text" translate="no" data-i18n-skip />',
            '    </div>',
            '  </div>',
            '  <label class="studio-inline-check">',
            '    <input id="studio-remove-optout" type="checkbox" />',
            '    <span>Do not block this theme’s files from being uploaded again later</span>',
            '  </label>',
            '  <div class="studio-manage-buttons">',
            '    <button class="studio-btn studio-btn--danger" type="submit">Ask for removal</button>',
            '    <button class="studio-btn" type="button" data-manage-cancel>Cancel</button>',
            '  </div>',
            '</form>',

            '<p class="studio-manage-status" id="studio-manage-status" role="status" aria-live="polite"></p>'
        ].join('\n');

        /* The card takes the identity question's place at the top of the pane,
           above the cover and the theme title. */
        var identityCard = el.identity;
        if (identityCard && identityCard.parentNode === pane) pane.insertBefore(section, identityCard.nextSibling);
        else if (anchor && anchor.parentNode === pane) pane.insertBefore(section, anchor);
        else pane.insertBefore(section, pane.firstChild);

        var detailsForm = section.querySelector('[data-manage-details-form]');
        var removeForm = section.querySelector('[data-manage-remove-form]');

        function closeForms() {
            detailsForm.hidden = true;
            removeForm.hidden = true;
        }

        section.querySelector('[data-manage-update]').addEventListener('click', function () {
            closeForms();
            applyOwnDetails();
            state.ownUpdate = true;
            state.identity.changeDetails = 'yes';
            syncIdentity();
            updateUpdateNotice();
            if (el.submitTitle) el.submitTitle.focus();
            setManageStatus('The update keeps this listing’s folder, so it replaces the theme in place once a maintainer merges it.', true);
        });

        section.querySelector('[data-manage-details]').addEventListener('click', function () {
            var listing = galleryThemeForManage() || {};
            section.querySelector('#studio-details-title').value = listing.name || '';
            section.querySelector('#studio-details-desc').value = listing.description || '';
            section.querySelector('#studio-details-author-url').value = listing.authorUrl || '';
            removeForm.hidden = true;
            detailsForm.hidden = false;
            section.querySelector('#studio-details-title').focus();
            setManageStatus('');
        });

        section.querySelector('[data-manage-remove]').addEventListener('click', function () {
            var listing = galleryThemeForManage() || {};
            section.querySelector('#studio-remove-confirm-name').value = '';
            section.querySelector('#studio-remove-confirm-author').value = '';
            detailsForm.hidden = true;
            removeForm.hidden = false;
            section.querySelector('#studio-remove-notes').placeholder = 'The listed title is “' + (listing.name || state.folder) + '”.';
            section.querySelector('#studio-remove-confirm-name').focus();
            setManageStatus('');
        });

        each(section.querySelectorAll('[data-manage-cancel]'), function (button) {
            button.addEventListener('click', function () {
                closeForms();
                setManageStatus('');
            });
        });

        var resetAnswer = section.querySelector('[data-manage-reset]');
        if (resetAnswer) {
            resetAnswer.addEventListener('click', function () {
                closeForms();
                setManageStatus('');
                clearSubmitFields();
                resetIdentity(state.identity.listing);
                syncIdentity();
                updateUpdateNotice();
                markDirty();
            });
        }

        detailsForm.addEventListener('submit', async function (event) {
            event.preventDefault();
            var folder = state.folder;
            if (!folder) return;
            var title = section.querySelector('#studio-details-title').value.trim();
            var description = cleanThemeDescription(section.querySelector('#studio-details-desc').value.trim());
            var authorUrl = section.querySelector('#studio-details-author-url').value.trim();
            if (!title) {
                setManageStatus('A listing needs a title.', false);
                return;
            }
            setManageStatus('Sending the new text…', true);
            try {
                var payload = await postManageJson('/api/theme-metadata', {
                    items: [
                        {
                            folder: folder,
                            themeInfo: { title: title, description: description, authorUrl: authorUrl },
                            listing: { name: title, description: description, authorUrl: authorUrl }
                        }
                    ]
                });
                var metaPr = payload && payload.prUrl ? String(payload.prUrl) : '';
                var metaTrack = trackingUrlFor(metaPr, folder);
                setManageStatus('Sent. A maintainer merges listing text changes, so they go live once the pull request is merged.', true, metaPr, folder);
                announceSupportNote('listing', {
                    themeName: title,
                    linkUrl: metaTrack || metaPr,
                    linkLabel: metaTrack ? 'Track this request' : 'View pull request'
                });
            } catch (err) {
                setManageStatus((err && err.message) || 'The change did not go through.', false);
            }
        });

        removeForm.addEventListener('submit', async function (event) {
            event.preventDefault();
            var folder = state.folder;
            if (!folder) return;
            var listing = galleryThemeForManage() || {};
            var reason = section.querySelector('#studio-remove-reason').value;
            var notes = section.querySelector('#studio-remove-notes').value.trim();
            var requester = section.querySelector('#studio-remove-requester').value.trim();
            var email = section.querySelector('#studio-remove-email').value.trim();
            var confirmName = section.querySelector('#studio-remove-confirm-name').value.trim();
            var confirmAuthor = section.querySelector('#studio-remove-confirm-author').value.trim();
            if (!email) {
                setManageStatus('Add an email so we can check with you before taking anything down.', false);
                return;
            }
            if (!confirmName) {
                setManageStatus('Type the listed title to confirm.', false);
                return;
            }
            setManageStatus('Sending the request…', true);
            try {
                var form = new FormData();
                form.set('folder', folder);
                form.set('reason', [reason, notes].filter(Boolean).join(' — '));
                form.set('requester', requester || listing.author || '');
                form.set('confirmName', confirmName);
                if (confirmAuthor) form.set('confirmAuthor', confirmAuthor);
                form.set('contactEmail', email);
                form.set('confirmContactEmail', email);
                if (section.querySelector('#studio-remove-optout').checked) form.set('blacklistOptOut', '1');
                var payload = await postManageForm('/api/removal-request', form);
                var remPr = payload && payload.prUrl ? String(payload.prUrl) : '';
                var remTrack = trackingUrlFor(remPr, folder);
                setManageStatus(
                    'Sent. Nothing comes down until a maintainer has read and merged the request.',
                    true,
                    remPr,
                    folder
                );
                announceSupportNote('removal', {
                    themeName: listing.name || folder,
                    linkUrl: remTrack || remPr,
                    linkLabel: remTrack ? 'Track this request' : 'View pull request'
                });
            } catch (err) {
                setManageStatus((err && err.message) || 'The request did not go through.', false);
            }
        });

        syncManageVisibility();
    }

    /* Show the completion confirmation inside the toolbar donations appeal modal
       whenever donations are enabled. If the visitor has turned donations off,
       openY1DonatePanel returns without opening anything. */
    function announceSupportNote(kind, details) {
        try {
            var opts = details && typeof details === 'object' ? Object.assign({}, details) : {};
            var delayMs = typeof opts.delayMs === 'number' ? opts.delayMs : 250;
            delete opts.delayMs;
            opts.action = kind;
            var trigger = function () {
                try {
                    if (typeof window.openY1DonatePanel === 'function') {
                        window.openY1DonatePanel(opts);
                    } else if (typeof window.Y1SupportNote === 'function') {
                        window.Y1SupportNote(kind, opts);
                    }
                } catch (e) {}
            };
            if (delayMs > 0) window.setTimeout(trigger, delayMs);
            else trigger();
        } catch (e) {}
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
