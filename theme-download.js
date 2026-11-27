/* Download a theme from its own folder page.

   The gallery card builds its ZIP in the browser: read config.json, take every
   asset the config references, map them to device filenames with
   ThemePackaging, fetch each file, and pack with JSZip. A reader on
   /iPod-ish/ expects the same button, so this module runs that same pipeline
   from the same two libraries, with progress drawn inside the button that was
   clicked instead of replacing a card.

   Website-only assets (covers, screenshot_preview.jpg, index.html) are removed
   by ThemePackaging, so the saved ZIP is the device theme and nothing else. */
(function (global) {
    'use strict';
    if (global.ThemePageDownload) return;

    var doc = global.document;
    var CONCURRENCY = 4;
    var FETCH_TIMEOUT_MS = 15000;

    function encodePath(path) {
        return String(path || '')
            .split('/')
            .filter(Boolean)
            .map(encodeURIComponent)
            .join('/');
    }

    function fileUrl(folder, relativePath) {
        var TP = global.ThemePackaging;
        if (!TP || typeof TP.resolvedRepoPath !== 'function') return '';
        var full = TP.resolvedRepoPath(folder, relativePath);
        if (!full) return '';
        return '/' + encodePath(full);
    }

    /** Every asset the config names, exactly as the gallery collects them. */
    function filesFromConfig(cfg, folder) {
        var TP = global.ThemePackaging;
        var out = ['config.json'];
        var seen = Object.create(null);
        seen['config.json'] = 1;
        (function walk(node) {
            if (!node) return;
            if (Array.isArray(node)) {
                for (var i = 0; i < node.length; i++) walk(node[i]);
                return;
            }
            if (typeof node === 'object') {
                for (var key in node) {
                    if (Object.prototype.hasOwnProperty.call(node, key)) walk(node[key]);
                }
                return;
            }
            if (typeof node !== 'string') return;
            var val = TP.normalizeConfigAssetPath(node, folder);
            if (!val || seen[val]) return;
            seen[val] = 1;
            if (TP.isI18nMetadataFile(val)) return;
            if (!TP.isLikelyAssetPathString(val)) return;
            out.push(val);
        })(cfg);
        return out;
    }

    function formatBytes(bytes) {
        if (bytes >= 1048576) return (bytes / 1048576).toFixed(1) + ' MB';
        if (bytes >= 1024) return Math.round(bytes / 1024) + ' KB';
        return bytes + ' B';
    }

    function progressUi(button) {
        var original = button.innerHTML;
        var fill = doc.createElement('span');
        fill.className = 'theme-dl-fill';
        var label = doc.createElement('span');
        label.className = 'theme-dl-label';
        label.textContent = 'Preparing…';
        button.classList.add('theme-dl-busy');
        button.innerHTML = '';
        button.appendChild(fill);
        button.appendChild(label);
        button.setAttribute('aria-busy', 'true');
        return {
            set: function (percent, text) {
                var pct = Math.max(0, Math.min(100, Math.round(percent)));
                fill.style.width = pct + '%';
                if (text) label.textContent = text;
            },
            fail: function () {
                button.classList.remove('theme-dl-busy');
                button.removeAttribute('aria-busy');
                button.innerHTML = original;
                button.disabled = false;
            },
            done: function () {
                button.classList.remove('theme-dl-busy');
                button.removeAttribute('aria-busy');
                button.innerHTML = original;
                button.disabled = false;
                button.classList.add('theme-dl-done');
                var restore = button.innerHTML;
                button.innerHTML = '<i class="fa-solid fa-check"></i> Saved';
                setTimeout(function () {
                    button.innerHTML = restore;
                    button.classList.remove('theme-dl-done');
                }, 2500);
            }
        };
    }

    function fetchBytes(url) {
        var ctrl = typeof AbortController === 'function' ? new AbortController() : null;
        var timer = ctrl ? setTimeout(function () { ctrl.abort(); }, FETCH_TIMEOUT_MS) : null;
        return fetch(url, { cache: 'no-cache', signal: ctrl ? ctrl.signal : undefined })
            .then(function (res) {
                if (timer) clearTimeout(timer);
                if (!res || !res.ok) return null;
                return res.arrayBuffer().then(function (buf) {
                    return { size: buf.byteLength, data: buf };
                });
            })
            .catch(function () {
                if (timer) clearTimeout(timer);
                return null;
            });
    }

    /* A theme can carry a Y1 Home Bluetooth icon and a Y2 Settings one. The
       reader's answer decides which artwork the single config slot names, and
       the helper key never reaches the player. Ask only when the answer would
       change the ZIP, so ordinary themes keep their one-click download. */
    var modelStylesReady = false;
    function injectModelStyles() {
        if (modelStylesReady) return;
        modelStylesReady = true;
        var style = doc.createElement('style');
        style.textContent =
            '.tp-model-dialog{border:1px solid rgba(255,255,255,.12);border-radius:18px;padding:0;max-width:min(92vw,440px);width:100%;background:var(--bg-dark,#13141d);color:var(--text-primary,#f5f6fa);box-shadow:0 24px 70px rgba(0,0,0,.55);}' +
            '.tp-model-dialog::backdrop{background:rgba(6,6,11,.72);backdrop-filter:blur(6px);}' +
            '.tp-model-body{padding:22px 22px 18px;display:grid;gap:14px;}' +
            '.tp-model-eyebrow{margin:0;font-size:.72rem;letter-spacing:.12em;text-transform:uppercase;color:var(--accent,#22d3ee);font-weight:700;}' +
            '.tp-model-title{margin:0;font-size:1.18rem;line-height:1.3;}' +
            '.tp-model-copy{margin:0;color:var(--text-secondary,#9aa0b8);font-size:.9rem;line-height:1.5;}' +
            '.tp-model-options{display:grid;gap:10px;margin-top:2px;}' +
            '.tp-model-option{display:flex;align-items:center;gap:12px;padding:12px 14px;border-radius:12px;border:1px solid rgba(255,255,255,.12);background:var(--bg-card,rgba(255,255,255,.04));color:inherit;font:inherit;text-align:left;cursor:pointer;transition:border-color .15s ease,background .15s ease;}' +
            '.tp-model-option:hover,.tp-model-option:focus-visible{border-color:var(--accent,#22d3ee);background:rgba(34,211,238,.08);outline:none;}' +
            '.tp-model-option i{font-size:1.05rem;color:var(--accent,#22d3ee);width:20px;text-align:center;}' +
            '.tp-model-option span{display:grid;gap:2px;}' +
            '.tp-model-option strong{font-size:.95rem;font-weight:650;}' +
            '.tp-model-option small{color:var(--text-secondary,#9aa0b8);font-size:.78rem;}' +
            '.tp-model-foot{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:12px 22px 18px;}' +
            '.tp-model-note{margin:0;color:var(--text-secondary,#9aa0b8);font-size:.76rem;line-height:1.4;}' +
            '.tp-model-cancel{border:0;background:none;color:var(--text-secondary,#9aa0b8);font:inherit;font-size:.85rem;cursor:pointer;padding:8px 10px;border-radius:8px;}' +
            '.tp-model-cancel:hover,.tp-model-cancel:focus-visible{color:var(--text-primary,#f5f6fa);outline:none;background:rgba(255,255,255,.06);}' +
            '@media (max-width:480px){.tp-model-body{padding:18px 16px 12px}.tp-model-foot{padding:8px 16px 16px;flex-direction:column-reverse;align-items:stretch}.tp-model-option{padding:11px 12px}}';
        doc.head.appendChild(style);
    }

    function askModelChoice(choice, themeName) {
        return new Promise(function (resolve) {
            if (typeof doc.createElement !== 'function' || typeof global.HTMLDialogElement === 'undefined') {
                resolve(choice.defaultModel);
                return;
            }
            injectModelStyles();
            var dialog = doc.createElement('dialog');
            dialog.className = 'tp-model-dialog';
            dialog.setAttribute('aria-labelledby', 'tp-model-title');

            var body = doc.createElement('div');
            body.className = 'tp-model-body';
            var eyebrow = doc.createElement('p');
            eyebrow.className = 'tp-model-eyebrow';
            eyebrow.textContent = 'Download';
            var title = doc.createElement('h2');
            title.className = 'tp-model-title';
            title.id = 'tp-model-title';
            title.textContent = 'Which player is this for?';
            var copy = doc.createElement('p');
            copy.className = 'tp-model-copy';
            copy.textContent =
                '“' + themeName + '” ships different Bluetooth artwork for each player. Pick the one you install it on — the ZIP is the same theme either way.';
            var options = doc.createElement('div');
            options.className = 'tp-model-options';

            var foot = doc.createElement('div');
            foot.className = 'tp-model-foot';
            var note = doc.createElement('p');
            note.className = 'tp-model-note';
            note.textContent = 'You can download the other version again any time.';
            var cancel = doc.createElement('button');
            cancel.type = 'button';
            cancel.className = 'tp-model-cancel';
            cancel.textContent = 'Cancel';

            function choose(model) {
                close(model);
            }
            function close(value) {
                dialog.remove();
                resolve(value);
            }
            [['y1', 'fa-music', choice.labels.y1, 'Home screen icon'],
                ['y2', 'fa-sliders', choice.labels.y2, 'Settings list icon']].forEach(function (row) {
                var button = doc.createElement('button');
                button.type = 'button';
                button.className = 'tp-model-option';
                button.innerHTML =
                    '<i class="fa-solid ' + row[1] + '" aria-hidden="true"></i><span><strong></strong><small></small></span>';
                button.querySelector('strong').textContent = row[2];
                button.querySelector('small').textContent = row[3];
                button.addEventListener('click', function () { choose(row[0]); });
                options.appendChild(button);
            });
            cancel.addEventListener('click', function () { close(''); });
            dialog.addEventListener('cancel', function (event) {
                event.preventDefault();
                close('');
            });
            dialog.addEventListener('click', function (event) {
                if (event.target === dialog) close('');
            });

            body.appendChild(eyebrow);
            body.appendChild(title);
            body.appendChild(copy);
            body.appendChild(options);
            foot.appendChild(note);
            foot.appendChild(cancel);
            dialog.appendChild(body);
            dialog.appendChild(foot);
            doc.body.appendChild(dialog);
            dialog.showModal();
            var preferred = options.querySelectorAll('.tp-model-option')[choice.defaultModel === 'y1' ? 0 : 1];
            if (preferred) preferred.focus();
        });
    }

    async function download(options) {
        var folder = String(options.folder || '').replace(/^\.?\/+/, '').replace(/\/+$/, '');
        var variant = String(options.variant || '').trim();
        var contentFolder = variant ? folder + '/Variants/' + variant : folder;
        var name = String(options.name || folder).trim() || folder;
        var button = options.button;
        var ui = progressUi(button);
        button.disabled = true;

        var TP = global.ThemePackaging;
        if (!TP || typeof global.JSZip !== 'function') {
            ui.fail();
            alert('Download is unavailable: the page could not load its packaging libraries.');
            return Promise.resolve(false);
        }
        if (!folder) {
            ui.fail();
            alert('This page does not know which theme folder to download.');
            return Promise.resolve(false);
        }

        ui.set(4, 'Reading config…');
        try {
            var response = await fetch('/' + encodePath(contentFolder) + '/config.json', { cache: 'no-cache' });
            if (!response.ok) throw new Error('config.json could not be loaded');
            var cfg = await response.json();
            var choice = TP.modelChoiceForConfig(cfg);
            var targetModel = '';
            if (choice.needsChoice) {
                ui.set(4, 'Waiting for your player…');
                targetModel = await askModelChoice(choice, name);
                if (!targetModel) {
                    ui.fail();
                    return false;
                }
                ui.set(6, 'Preparing ' + targetModel.toUpperCase() + ' download…');
            }

            var entries = filesFromConfig(cfg, contentFolder)
                .map(function (rel) {
                    return { path: rel, download_url: fileUrl(contentFolder, rel) };
                })
                .filter(function (entry) { return !!entry.download_url; });
            var manifest = TP.buildPackManifest(entries, contentFolder, folder, cfg);
            var structured = (manifest.mode || 'flat') === 'structured';
            var finalConfig = structured
                ? JSON.parse(JSON.stringify(cfg))
                : TP.rewriteConfigForDeviceFlatPack(cfg, contentFolder, manifest.logicalToDevice);
            var devicePaths = (manifest.items || []).map(function (item) { return item.devicePath; });
            TP.normalizeConfigForModel(finalConfig, devicePaths, targetModel);
            var configJson = JSON.stringify(finalConfig, null, 2);

            var rows = (manifest.items || []).filter(function (item) {
                var dev = String(item.devicePath || '').toLowerCase();
                return dev && dev !== 'config.json' && !TP.isPreviewOrWebsiteOnlyAsset(dev);
            });
            var total = rows.length;
            var next = 0;
            var finished = 0;
            var bytes = 0;
            var zip = new global.JSZip();

            function take() {
                var index = next++;
                if (index >= rows.length) return Promise.resolve();
                var row = rows[index];
                ui.set(8 + Math.round((finished / Math.max(total, 1)) * 72),
                    'Downloading ' + (index + 1) + '/' + total + ' · ' + formatBytes(bytes));
                return fetchBytes(row.download_url).then(function (result) {
                    finished += 1;
                    if (result) {
                        bytes += result.size;
                        var key = String(row.devicePath || '').replace(/\\/g, '/').replace(/^\/+/, '');
                        if (key && key.indexOf('..') === -1) zip.file(key, result.data);
                    }
                    ui.set(8 + Math.round((finished / Math.max(total, 1)) * 72),
                        'Downloading ' + finished + '/' + total + ' · ' + formatBytes(bytes));
                    return take();
                });
            }

            var workers = [];
            for (var i = 0; i < Math.min(CONCURRENCY, total); i++) workers.push(take());
            await Promise.all(workers);
            if (!Object.keys(zip.files).length) {
                throw new Error('No theme files could be downloaded.');
            }
            zip.file('config.json', configJson);
            ui.set(85, 'Packaging…');
            var blob = await zip.generateAsync(
                {
                    type: 'blob',
                    compression: 'DEFLATE',
                    compressionOptions: { level: 6 }
                },
                function (meta) {
                    ui.set(85 + Math.round((meta.percent || 0) * 0.15),
                        'Creating ZIP (' + Math.round(meta.percent || 0) + '%)');
                }
            );
            var link = doc.createElement('a');
            link.href = URL.createObjectURL(blob);
            var safe = name.replace(/[^\w\d\-_ ]/g, '_') || 'theme';
            link.download = safe + (targetModel ? ' (' + targetModel.toUpperCase() + ')' : '') + '.zip';
            doc.body.appendChild(link);
            link.click();
            link.remove();
            setTimeout(function () { URL.revokeObjectURL(link.href); }, 60000);
            if (global.ThemeAnalytics && typeof global.ThemeAnalytics.trackZipDownload === 'function') {
                global.ThemeAnalytics.trackZipDownload(folder, 'theme-page');
            }
            ui.done();
            if (typeof global.openY1DonatePanel === 'function') {
                setTimeout(function () {
                    global.openY1DonatePanel({
                        action: 'download',
                        themeName: name
                    });
                }, 350);
            }
            return true;
        } catch (err) {
            console.error('Theme download failed', err);
            ui.fail();
            alert('Failed to download ' + name + ': ' + ((err && err.message) || err));
            return false;
        }
    }

    function studioHref(folder, mode, variant) {
        var url = '/studio-test/?folder=' + encodeURIComponent(folder) + '&mode=' + encodeURIComponent(mode || 'preview');
        if (variant) url += '&variant=' + encodeURIComponent(variant);
        return url;
    }

    function enhanceThemeShellActions() {
        var actionsBar = doc.querySelector('.theme-seo-shell-actions');
        if (!actionsBar || actionsBar.dataset.studioActionsReady === '1') return;
        var dlBtn = actionsBar.querySelector('[data-theme-download]');
        var folder = dlBtn ? String(dlBtn.getAttribute('data-folder') || '').trim() : '';
        var variant = dlBtn ? String(dlBtn.getAttribute('data-variant') || '').trim() : '';
        if (!folder) {
            var segs = String(global.location && global.location.pathname || '').split('/').filter(Boolean);
            if (segs.length && !/\.html$/i.test(segs[0])) {
                try { folder = decodeURIComponent(segs[0]); } catch (_) { folder = segs[0]; }
            }
            if (segs.length >= 3 && segs[1] === 'Variants') {
                try { variant = decodeURIComponent(segs[2]); } catch (_) { variant = segs[2]; }
            }
        }
        if (!folder) return;
        actionsBar.dataset.studioActionsReady = '1';

        /* Upgrade legacy "Open preview" link pointing at retired theme.html */
        var previewHref = studioHref(folder, 'preview', variant);
        var editHref = studioHref(folder, 'edit', variant);
        var updateHref = studioHref(folder, 'submit', variant);

        var legacyPreview = actionsBar.querySelector('a[href*="theme.html"], a[data-studio-action="preview"]');
        if (legacyPreview) {
            legacyPreview.href = previewHref;
            legacyPreview.setAttribute('data-studio-action', 'preview');
            legacyPreview.innerHTML = '<i class="fa-solid fa-eye" aria-hidden="true"></i> Preview in Studio';
        } else {
            var previewLink = doc.createElement('a');
            previewLink.className = 'btn btn-primary';
            previewLink.href = previewHref;
            previewLink.setAttribute('data-studio-action', 'preview');
            previewLink.innerHTML = '<i class="fa-solid fa-eye" aria-hidden="true"></i> Preview in Studio';
            actionsBar.insertBefore(previewLink, actionsBar.firstChild);
        }

        if (!actionsBar.querySelector('a[data-studio-action="edit"], a[data-studio-open="edit"]')) {
            var editLink = doc.createElement('a');
            editLink.className = 'btn';
            editLink.href = editHref;
            editLink.setAttribute('data-studio-action', 'edit');
            editLink.setAttribute('data-studio-open', 'edit');
            editLink.title = 'Open this theme as a base in Theme Studio';
            editLink.innerHTML = '<i class="fa-solid fa-pen-ruler" aria-hidden="true"></i> Edit in Studio';
            if (dlBtn) actionsBar.insertBefore(editLink, dlBtn);
            else actionsBar.appendChild(editLink);
        }

        if (!actionsBar.querySelector('a[data-studio-action="update"], a[data-studio-open="update"], a[data-studio-open="manage"]')) {
            var updateLink = doc.createElement('a');
            updateLink.className = 'btn';
            updateLink.href = updateHref;
            updateLink.setAttribute('data-studio-action', 'update');
            updateLink.setAttribute('data-studio-open', 'update');
            updateLink.title = 'Submit an update or manage this listing in Theme Studio';
            updateLink.innerHTML = '<i class="fa-solid fa-paper-plane" aria-hidden="true"></i> Update in Studio';
            if (dlBtn) actionsBar.insertBefore(updateLink, dlBtn);
            else actionsBar.appendChild(updateLink);
        }

        /* Keep topbar Editor and Upload tabs pointed at local Studio */
        var legacyTabs = doc.querySelectorAll('.gallery-tab[href*="y1-themes.vercel.app"], .gallery-tab[href="/studio-test"]');
        for (var j = 0; j < legacyTabs.length; j++) {
            legacyTabs[j].setAttribute('href', '/studio-test/');
        }
        var uploadTabs = doc.querySelectorAll('.gallery-tab[href$="upload.html"], .gallery-tab[href*="/upload.html"]');
        for (var u = 0; u < uploadTabs.length; u++) {
            uploadTabs[u].setAttribute('href', '/studio-test/?welcome=upload');
        }

        /* Ensure site-wide drag-and-drop into Theme Studio is also active on static theme pages */
        if (!global.Y1StudioDropHandoff && !doc.getElementById('studio-drop-handoff-script')) {
            var dropScript = doc.createElement('script');
            dropScript.id = 'studio-drop-handoff-script';
            dropScript.src = '/studio-drop-handoff.js?v=20261123studio2';
            dropScript.defer = true;
            if (doc.head) doc.head.appendChild(dropScript);
        }
    }

    function wire() {
        enhanceThemeShellActions();
        var buttons = doc.querySelectorAll('[data-theme-download]');
        for (var i = 0; i < buttons.length; i++) {
            (function (button) {
                if (button.dataset.themeDownloadWired === '1') return;
                button.dataset.themeDownloadWired = '1';
                button.addEventListener('click', function () {
                    if (button.disabled) return;
                    download({
                        folder: button.getAttribute('data-folder') || '',
                        variant: button.getAttribute('data-variant') || '',
                        name: button.getAttribute('data-name') || '',
                        button: button
                    });
                });
            })(buttons[i]);
        }
    }

    if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', wire);
    else wire();

    global.ThemePageDownload = { download: download, wire: wire, enhanceThemeShellActions: enhanceThemeShellActions };
})(window);
