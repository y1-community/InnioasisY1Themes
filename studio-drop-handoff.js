/* Site-wide drag-and-drop handoff into Theme Studio.
   Dragging a theme .zip or theme folder onto any page of themes.innioasis.app
   reveals a full-viewport drop zone overlay, stages the package in IndexedDB,
   and opens Theme Studio where it loads automatically. */
(function (global) {
    'use strict';
    if (global.Y1StudioDropHandoff) return;

    var DB_NAME = 'innioasis-studio-handoff';
    var STORE_NAME = 'drops';
    var KEY = 'pending';
    var MAX_AGE_MS = 5 * 60 * 1000;

    function openDb() {
        return new Promise(function (resolve, reject) {
            if (!global.indexedDB) {
                reject(new Error('IndexedDB is unavailable in this browser.'));
                return;
            }
            var req = global.indexedDB.open(DB_NAME, 1);
            req.onupgradeneeded = function () {
                var db = req.result;
                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    db.createObjectStore(STORE_NAME);
                }
            };
            req.onsuccess = function () {
                resolve(req.result);
            };
            req.onerror = function () {
                reject(req.error || new Error('Could not open Studio drop storage.'));
            };
        });
    }

    function savePayload(record) {
        return openDb().then(function (db) {
            return new Promise(function (resolve, reject) {
                var tx = db.transaction(STORE_NAME, 'readwrite');
                tx.objectStore(STORE_NAME).put(record, KEY);
                tx.oncomplete = function () {
                    db.close();
                    resolve();
                };
                tx.onerror = function () {
                    db.close();
                    reject(tx.error || new Error('Could not stage dropped theme.'));
                };
            });
        });
    }

    function consumePending() {
        return openDb()
            .then(function (db) {
                return new Promise(function (resolve, reject) {
                    var tx = db.transaction(STORE_NAME, 'readwrite');
                    var store = tx.objectStore(STORE_NAME);
                    var getReq = store.get(KEY);
                    var record = null;
                    getReq.onsuccess = function () {
                        record = getReq.result || null;
                        if (record) {
                            try {
                                store.delete(KEY);
                            } catch (_) {}
                        }
                    };
                    tx.oncomplete = function () {
                        db.close();
                        if (!record || !record.createdAt || Date.now() - record.createdAt > MAX_AGE_MS) {
                            resolve(null);
                            return;
                        }
                        resolve(record);
                    };
                    tx.onerror = function () {
                        db.close();
                        reject(tx.error || new Error('Could not read staged theme drop.'));
                    };
                });
            })
            .catch(function () {
                return null;
            });
    }

    function saveZip(file) {
        return savePayload({
            kind: 'zip',
            name: (file && file.name) || 'theme.zip',
            blob: file,
            createdAt: Date.now()
        });
    }

    function saveEntries(entries, label) {
        return savePayload({
            kind: 'entries',
            label: label || 'Dropped theme',
            entries: entries || [],
            createdAt: Date.now()
        });
    }

    function walkEntry(entry, prefix) {
        return new Promise(function (resolve) {
            if (!entry) {
                resolve([]);
                return;
            }
            if (entry.isFile) {
                entry.file(
                    function (file) {
                        var rel = prefix ? prefix + '/' + entry.name : entry.name;
                        resolve([{ path: rel, blob: file }]);
                    },
                    function () {
                        resolve([]);
                    }
                );
                return;
            }
            if (entry.isDirectory) {
                var reader = entry.createReader();
                var children = [];
                var nextPrefix = prefix ? prefix + '/' + entry.name : entry.name;
                function readBatch() {
                    reader.readEntries(
                        function (batch) {
                            if (!batch || !batch.length) {
                                Promise.all(
                                    children.map(function (child) {
                                        return walkEntry(child, nextPrefix);
                                    })
                                ).then(function (groups) {
                                    var out = [];
                                    for (var i = 0; i < groups.length; i += 1) {
                                        out = out.concat(groups[i]);
                                    }
                                    resolve(out);
                                });
                                return;
                            }
                            for (var j = 0; j < batch.length; j += 1) {
                                children.push(batch[j]);
                            }
                            readBatch();
                        },
                        function () {
                            resolve([]);
                        }
                    );
                }
                readBatch();
                return;
            }
            resolve([]);
        });
    }

    function collectEntries(entries) {
        return Promise.all(
            entries.map(function (entry) {
                return walkEntry(entry, '');
            })
        ).then(function (groups) {
            var all = [];
            for (var i = 0; i < groups.length; i += 1) {
                all = all.concat(groups[i]);
            }
            return all;
        });
    }

    function hasFilePayload(event) {
        var dt = event && event.dataTransfer;
        if (!dt) return false;
        if (dt.types && dt.types.length) {
            for (var i = 0; i < dt.types.length; i += 1) {
                if (dt.types[i] === 'Files') return true;
            }
            return false;
        }
        return !!(dt.files && dt.files.length);
    }

    function isStudioPage() {
        var path = String((global.location && global.location.pathname) || '');
        if (/\/studio-test(\/|$)/i.test(path)) return true;
        return !!(document.body && document.body.classList.contains('studio-app'));
    }

    function mountSiteWideOverlay() {
        if (isStudioPage()) return;
        if (document.getElementById('y1-site-studio-drop')) return;

        var style = document.createElement('style');
        style.id = 'y1-site-studio-drop-style';
        style.textContent = [
            '#y1-site-studio-drop {',
            '  position: fixed; inset: 0; z-index: 10050;',
            '  display: grid; place-items: center;',
            '  background: rgba(7, 10, 18, 0.76);',
            '  backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px);',
            '  opacity: 0; pointer-events: none; transition: opacity 0.16s ease;',
            '  padding: 20px; box-sizing: border-box;',
            '}',
            '#y1-site-studio-drop.is-visible { opacity: 1; pointer-events: auto; }',
            '#y1-site-studio-drop .y1-site-studio-drop-card {',
            '  display: flex; flex-direction: column; align-items: center; text-align: center;',
            '  gap: 10px; max-width: min(92vw, 440px); padding: 30px 28px;',
            '  border-radius: 18px; border: 2px dashed var(--lumen-accent, #5ea1ff);',
            '  background: linear-gradient(145deg, var(--lumen-panel, #141a28), var(--lumen-panel-soft, #0f131d));',
            '  color: var(--lumen-paper, #f5f7ff);',
            '  box-shadow: 0 22px 60px rgba(0, 0, 0, 0.55);',
            '  font-family: var(--site-font, "DM Sans", system-ui, sans-serif);',
            '}',
            '#y1-site-studio-drop .y1-site-studio-drop-icon {',
            '  width: 56px; height: 56px; border-radius: 15px;',
            '  display: grid; place-items: center;',
            '  background: rgba(94, 161, 255, 0.16); color: var(--lumen-accent, #7cb4ff);',
            '  font-size: 1.5rem;',
            '}',
            '#y1-site-studio-drop strong { font-size: 1.15rem; font-weight: 750; line-height: 1.25; }',
            '#y1-site-studio-drop span { font-size: 0.9rem; color: var(--lumen-muted, #aeb7c9); line-height: 1.4; }'
        ].join('\n');
        document.head.appendChild(style);

        var overlay = document.createElement('div');
        overlay.id = 'y1-site-studio-drop';
        overlay.setAttribute('aria-hidden', 'true');
        overlay.innerHTML =
            '<div class="y1-site-studio-drop-card">' +
            '<div class="y1-site-studio-drop-icon" aria-hidden="true">' +
            '<svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
            '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>' +
            '<polyline points="17 8 12 3 7 8"/>' +
            '<line x1="12" y1="3" x2="12" y2="15"/>' +
            '</svg>' +
            '</div>' +
            '<strong id="y1-site-studio-drop-title">Drop theme ZIP or folder to open in Theme Studio</strong>' +
            '<span id="y1-site-studio-drop-sub">Works with any Innioasis Y1 / Y2 theme package — previewed and edited locally in your browser.</span>' +
            '</div>';
        document.body.appendChild(overlay);

        var titleEl = overlay.querySelector('#y1-site-studio-drop-title');
        var subEl = overlay.querySelector('#y1-site-studio-drop-sub');
        var dragDepth = 0;

        function show(title, sub) {
            if (titleEl && title) titleEl.textContent = title;
            if (subEl && sub) subEl.textContent = sub;
            overlay.classList.add('is-visible');
            overlay.setAttribute('aria-hidden', 'false');
        }

        function hide() {
            dragDepth = 0;
            overlay.classList.remove('is-visible');
            overlay.setAttribute('aria-hidden', 'true');
            if (titleEl) titleEl.textContent = 'Drop theme ZIP or folder to open in Theme Studio';
            if (subEl) subEl.textContent = 'Works with any Innioasis Y1 / Y2 theme package — previewed and edited locally in your browser.';
        }

        function openStudioAfterSave(promise) {
            show('Opening in Theme Studio…', 'Loading your theme package locally.');
            promise
                .then(function () {
                    global.location.href = '/studio-test/?handoff=drop';
                })
                .catch(function (err) {
                    show('Could not open that drop', (err && err.message) || 'Try opening the ZIP or folder inside Theme Studio.');
                    setTimeout(hide, 2400);
                });
        }

        global.addEventListener('dragenter', function (event) {
            if (!hasFilePayload(event)) return;
            if (event.target && event.target.closest && event.target.closest('[data-local-dropzone]')) return;
            event.preventDefault();
            dragDepth += 1;
            show();
        });

        global.addEventListener('dragover', function (event) {
            if (!hasFilePayload(event)) return;
            if (event.target && event.target.closest && event.target.closest('[data-local-dropzone]')) return;
            event.preventDefault();
            if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy';
        });

        global.addEventListener('dragleave', function (event) {
            if (!hasFilePayload(event)) return;
            dragDepth = Math.max(0, dragDepth - 1);
            if (!dragDepth) hide();
        });

        global.addEventListener('keydown', function (event) {
            if (event.key === 'Escape' && overlay.classList.contains('is-visible')) hide();
        });

        global.addEventListener('drop', function (event) {
            if (!hasFilePayload(event)) return;
            if (event.target && event.target.closest && event.target.closest('[data-local-dropzone]')) return;
            event.preventDefault();
            dragDepth = 0;

            var dt = event.dataTransfer;
            if (!dt) {
                hide();
                return;
            }

            var items = dt.items ? Array.prototype.slice.call(dt.items) : [];
            var entries = [];
            for (var i = 0; i < items.length; i += 1) {
                if (items[i].kind !== 'file' || typeof items[i].webkitGetAsEntry !== 'function') continue;
                var entry = items[i].webkitGetAsEntry();
                if (entry) entries.push(entry);
            }

            if (entries.length === 1 && entries[0].isFile && /\.zip$/i.test(entries[0].name)) {
                entries[0].file(
                    function (file) {
                        openStudioAfterSave(saveZip(file));
                    },
                    function () {
                        show('Could not read that ZIP', 'Try again or browse from Theme Studio.');
                        setTimeout(hide, 2200);
                    }
                );
                return;
            }

            if (
                entries.some(function (entry) {
                    return entry.isDirectory;
                })
            ) {
                var dirName = entries[0] && entries[0].name ? entries[0].name : 'Dropped theme';
                show('Reading theme folder…', 'Preparing your files for Theme Studio.');
                collectEntries(entries)
                    .then(function (list) {
                        if (!list.length) throw new Error('That folder had no readable files.');
                        return openStudioAfterSave(saveEntries(list, dirName));
                    })
                    .catch(function (err) {
                        show('Could not read that folder', (err && err.message) || 'Try dropping a theme ZIP instead.');
                        setTimeout(hide, 2400);
                    });
                return;
            }

            var files = dt.files ? Array.prototype.slice.call(dt.files) : [];
            if (files.length === 1 && /\.zip$/i.test(files[0].name)) {
                openStudioAfterSave(saveZip(files[0]));
                return;
            }

            var looksLikeThemeFiles =
                files.length > 1 ||
                files.some(function (f) {
                    return /config\.json$/i.test((f && f.name) || '');
                });
            if (files.length && looksLikeThemeFiles) {
                var mapped = files.map(function (file) {
                    return { path: file.webkitRelativePath || file.name, blob: file };
                });
                openStudioAfterSave(saveEntries(mapped, 'Dropped theme'));
                return;
            }

            show('Drop a theme ZIP or folder', 'Drop a .zip archive or a full theme folder containing config.json to open it in Theme Studio.');
            setTimeout(hide, 2400);
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', mountSiteWideOverlay, { once: true });
    } else {
        mountSiteWideOverlay();
    }

    global.Y1StudioDropHandoff = {
        saveZip: saveZip,
        saveEntries: saveEntries,
        consumePending: consumePending,
        mountSiteWideOverlay: mountSiteWideOverlay
    };
})(window);
