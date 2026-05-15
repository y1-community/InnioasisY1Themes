/**
 * Shared optional-artwork checks for Innioasis Y1 themes (gallery + theme preview).
 * Exposes window.y1ThemeArtworkCompat.warnings(fileUrlFn, configObj, folderPath).
 */
(function (global) {
    'use strict';

    var REQUIRED_ARTWORK_FEATURES = [
        { feature: 'eBook reader (3.0.7+)', configPath: ['homePageConfig', 'ebook'] },
        { feature: 'Rockbox launcher switch', configPath: ['settingConfig', 'launcher'] },
        { feature: 'Calendar', configPath: ['homePageConfig', 'calendar'] },
        { feature: 'Calculator', configPath: ['homePageConfig', 'calculator'] }
    ];

    function encodePathSegments(pathValue) {
        return String(pathValue || '')
            .split('/')
            .filter(Boolean)
            .map(function (seg) {
                return encodeURIComponent(seg);
            })
            .join('/');
    }

    function normalizeConfigAssetPath(rawPath, folderPath) {
        var p = String(rawPath || '')
            .trim()
            .replace(/\\/g, '/');
        p = p.replace(/^\.\/+/, '').replace(/^\/+/, '');
        if (!p) return '';
        var folder = String(folderPath || '')
            .trim()
            .replace(/\\/g, '/')
            .replace(/^\.\/+/, '')
            .replace(/\/+$/, '');
        if (!folder) return p;
        var lowP = p.toLowerCase();
        var lowFolder = folder.toLowerCase();
        if (lowP === lowFolder) return '';
        if (lowP.indexOf(lowFolder + '/') === 0) {
            return p.slice(folder.length + 1);
        }
        return p;
    }

    function resolvedRepoPath(folderPath, rawRelativePath) {
        var folder = String(folderPath || '')
            .trim()
            .replace(/\\/g, '/')
            .replace(/^\.\/+/, '')
            .replace(/\/+$/, '');
        var rel = normalizeConfigAssetPath(String(rawRelativePath || '').trim().replace(/\\/g, '/'), folder);
        if (!rel) return '';
        var stack = folder.split('/').filter(Boolean);
        rel.split('/').forEach(function (seg) {
            if (!seg || seg === '.') return;
            if (seg === '..') {
                if (stack.length) stack.pop();
                return;
            }
            stack.push(seg);
        });
        return stack.join('/');
    }

    function defaultFileUrl(folderPath, relativePath) {
        var full = resolvedRepoPath(folderPath, relativePath);
        if (!full) return '';
        return './' + encodePathSegments(full);
    }

    function getConfigValueByPath(rootObj, pathParts) {
        var cursor = rootObj;
        for (var i = 0; i < pathParts.length; i++) {
            var key = pathParts[i];
            if (!cursor || typeof cursor !== 'object') return '';
            cursor = cursor[key];
        }
        return typeof cursor === 'string' ? String(cursor).trim() : '';
    }

    function isIntentionalTransparentPath(pathValue) {
        var name = String(pathValue || '')
            .split('/')
            .pop();
        return /transparent/i.test(name || '');
    }

    function isPngFullyTransparentBlob(blob) {
        return new Promise(function (resolve) {
            try {
                if (!(blob instanceof Blob)) return resolve(false);
                if (!/^image\/png$/i.test(String(blob.type || ''))) return resolve(false);
                createImageBitmap(blob).then(
                    function (bitmap) {
                        try {
                            var canvas = document.createElement('canvas');
                            canvas.width = bitmap.width;
                            canvas.height = bitmap.height;
                            var ctx = canvas.getContext('2d', { willReadFrequently: true });
                            if (!ctx) {
                                bitmap.close();
                                return resolve(false);
                            }
                            ctx.drawImage(bitmap, 0, 0);
                            bitmap.close();
                            var data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
                            for (var i = 3; i < data.length; i += 4) {
                                if (data[i] !== 0) return resolve(false);
                            }
                            resolve(true);
                        } catch (_) {
                            resolve(false);
                        }
                    },
                    function () {
                        resolve(false);
                    }
                );
            } catch (_) {
                resolve(false);
            }
        });
    }

    var ASSET_FETCH_TIMEOUT_MS = 8000;

    function fetchWithTimeout(url, init) {
        if (typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function') {
            return fetch(url, Object.assign({}, init || {}, { signal: AbortSignal.timeout(ASSET_FETCH_TIMEOUT_MS) }));
        }
        return new Promise(function (resolve, reject) {
            var timer = setTimeout(function () {
                reject(new Error('timeout'));
            }, ASSET_FETCH_TIMEOUT_MS);
            fetch(url, init || {})
                .then(function (res) {
                    clearTimeout(timer);
                    resolve(res);
                })
                .catch(function (err) {
                    clearTimeout(timer);
                    reject(err);
                });
        });
    }

    function checkArtworkAssetHealth(fileUrlFn, folderPath, configuredPath) {
        return new Promise(function (resolve) {
            var normalized = normalizeConfigAssetPath(configuredPath, folderPath);
            if (!normalized) return resolve({ ok: false, issue: 'invalid path' });
            var url = fileUrlFn(folderPath, normalized);
            if (!url) return resolve({ ok: false, issue: 'invalid path' });
            var allowTransparent = isIntentionalTransparentPath(normalized);
            fetchWithTimeout(url, { cache: 'no-cache' })
                .then(function (response) {
                    if (!response.ok) return resolve({ ok: false, issue: 'file not found' });
                    return response.blob();
                })
                .then(function (blob) {
                    if (!blob) return resolve({ ok: false, issue: 'failed to read asset' });
                    if (blob.size === 0 && !allowTransparent) {
                        return resolve({ ok: false, issue: '0-byte file' });
                    }
                    if (/\.png$/i.test(normalized) && !allowTransparent) {
                        return isPngFullyTransparentBlob(blob).then(function (fully) {
                            if (fully) return resolve({ ok: false, issue: 'fully transparent PNG' });
                            resolve({ ok: true, issue: '' });
                        });
                    }
                    resolve({ ok: true, issue: '' });
                })
                .catch(function () {
                    resolve({ ok: false, issue: 'could not fetch asset' });
                });
        });
    }

    function artworkCompatibilityWarnings(fileUrlFn, configObj, folderPath) {
        return new Promise(function (resolve) {
            if (!configObj || typeof configObj !== 'object') return resolve([]);
            var fn = typeof fileUrlFn === 'function' ? fileUrlFn : defaultFileUrl;
            var warnings = [];
            var i = 0;

            function next() {
                if (i >= REQUIRED_ARTWORK_FEATURES.length) return resolve(warnings);
                var requirement = REQUIRED_ARTWORK_FEATURES[i++];
                var configured = getConfigValueByPath(configObj, requirement.configPath);
                if (!configured) {
                    warnings.push(
                        requirement.feature + ': this setting is missing in the theme configuration.'
                    );
                    return next();
                }
                checkArtworkAssetHealth(fn, folderPath, configured).then(function (health) {
                    if (!health.ok) {
                        var issueText =
                            health.issue === 'file not found'
                                ? 'linked artwork file is missing'
                                : health.issue === '0-byte file'
                                  ? 'linked artwork file is empty (0 bytes)'
                                  : health.issue === 'fully transparent PNG'
                                    ? 'linked artwork is fully transparent'
                                    : health.issue;
                        warnings.push(requirement.feature + ': ' + issueText + '.');
                    }
                    next();
                });
            }
            next();
        });
    }

    global.y1ThemeArtworkCompat = {
        warnings: artworkCompatibilityWarnings,
        defaultFileUrl: defaultFileUrl
    };
})(typeof window !== 'undefined' ? window : globalThis);
