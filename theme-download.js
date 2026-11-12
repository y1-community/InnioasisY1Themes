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

    function download(options) {
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
        return fetch('/' + encodePath(contentFolder) + '/config.json', { cache: 'no-cache' })
            .then(function (res) {
                if (!res.ok) throw new Error('config.json could not be loaded');
                return res.json();
            })
            .then(function (cfg) {
                var entries = filesFromConfig(cfg, contentFolder)
                    .map(function (rel) {
                        return { path: rel, download_url: fileUrl(contentFolder, rel) };
                    })
                    .filter(function (entry) { return !!entry.download_url; });
                var manifest = TP.buildPackManifest(entries, contentFolder, folder, cfg);
                var structured = (manifest.mode || 'flat') === 'structured';
                var configJson = structured
                    ? JSON.stringify(cfg, null, 2)
                    : JSON.stringify(TP.rewriteConfigForDeviceFlatPack(cfg, contentFolder, manifest.logicalToDevice), null, 2);

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
                return Promise.all(workers)
                    .then(function () {
                        if (!Object.keys(zip.files).length) {
                            throw new Error('No theme files could be downloaded.');
                        }
                        zip.file('config.json', configJson);
                        ui.set(85, 'Packaging…');
                        return zip.generateAsync(
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
                    })
                    .then(function (blob) {
                        var link = doc.createElement('a');
                        link.href = URL.createObjectURL(blob);
                        var safe = name.replace(/[^\w\d\-_ ]/g, '_') || 'theme';
                        link.download = safe + '.zip';
                        doc.body.appendChild(link);
                        link.click();
                        link.remove();
                        setTimeout(function () { URL.revokeObjectURL(link.href); }, 60000);
                        if (global.ThemeAnalytics && typeof global.ThemeAnalytics.trackZipDownload === 'function') {
                            global.ThemeAnalytics.trackZipDownload(folder, 'theme-page');
                        }
                        ui.done();
                        return true;
                    });
            })
            .catch(function (err) {
                console.error('Theme download failed', err);
                ui.fail();
                alert('Failed to download ' + name + ': ' + ((err && err.message) || err));
                return false;
            });
    }

    function wire() {
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

    global.ThemePageDownload = { download: download, wire: wire };
})(window);
