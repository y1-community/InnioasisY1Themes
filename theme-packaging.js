/**
 * Package theme assets for ZIP download and direct install.
 * - Flat mode: collapse variant ``../`` escapes and duplicate leaf names (legacy).
 * - Structured mode: preserve config-relative subfolders (e.g. ``Settings/foo.png``).
 */
(function (global) {
    'use strict';

    function normalizeConfigAssetPath(rawPath, folderPath) {
        let p = String(rawPath || '').trim().replace(/\\/g, '/');
        p = p.replace(/^\.\/+/, '').replace(/^\/+/, '');
        if (!p) return '';
        const folder = String(folderPath || '')
            .trim()
            .replace(/\\/g, '/')
            .replace(/^\.\/+/, '')
            .replace(/\/+$/, '');
        if (!folder) return p;
        const lowP = p.toLowerCase();
        const lowFolder = folder.toLowerCase();
        if (lowP === lowFolder) return '';
        if (lowP.startsWith(lowFolder + '/')) {
            return p.slice(folder.length + 1);
        }
        return p;
    }

    function resolvedRepoPath(folderPath, rawRelativePath) {
        const folder = String(folderPath || '')
            .trim()
            .replace(/\\/g, '/')
            .replace(/^\.\/+/, '')
            .replace(/\/+$/, '');
        const rel = normalizeConfigAssetPath(String(rawRelativePath || '').trim().replace(/\\/g, '/'), folder);
        if (!rel) return '';
        const stack = folder.split('/').filter(Boolean);
        for (const seg of rel.split('/')) {
            if (!seg || seg === '.') continue;
            if (seg === '..') {
                if (stack.length) stack.pop();
                continue;
            }
            stack.push(seg);
        }
        return stack.join('/');
    }

    function isLikelyAssetPathString(s) {
        const t = String(s || '').trim();
        if (!t || t.includes('://')) return false;
        if (/^#|^rgba?\(/i.test(t)) return false;
        return /\.(png|jpe?g|gif|webp|bmp|svg|ttf|otf|woff2?|json|txt|md|ini)$/i.test(t);
    }

    function isVariantEscapeAssetPath(val) {
        return String(val || '').includes('../');
    }

    /** Config path is a theme asset in a subfolder (not a variant parent escape). */
    function isStructuredAssetPath(val) {
        const t = String(val || '').trim().replace(/\\/g, '/');
        if (!isLikelyAssetPathString(t) || isVariantEscapeAssetPath(t)) return false;
        const rel = t.replace(/^\.\/+/, '');
        return rel.includes('/') && !rel.startsWith('/');
    }

    function walkConfigAssetStrings(cfg, visit) {
        const walk = (node) => {
            if (Array.isArray(node)) {
                for (let i = 0; i < node.length; i++) walk(node[i]);
                return;
            }
            if (node && typeof node === 'object') {
                for (const key of Object.keys(node)) walk(node[key]);
                return;
            }
            if (typeof node === 'string') visit(node);
        };
        walk(cfg);
    }

    function assetFolderPrefixesFromConfig(cfg) {
        const prefixes = new Set();
        const gallery = cfg && cfg.gallery;
        const declared = gallery && Array.isArray(gallery.assetFolders) ? gallery.assetFolders : [];
        for (const raw of declared) {
            const seg = String(raw || '')
                .trim()
                .replace(/\\/g, '/')
                .replace(/^\.\/+/, '')
                .replace(/\/+$/, '')
                .split('/')
                .filter(Boolean)[0];
            if (seg && seg.toLowerCase() !== 'variants') prefixes.add(seg);
        }
        walkConfigAssetStrings(cfg, (val) => {
            const t = String(val || '').trim().replace(/\\/g, '/');
            if (!isStructuredAssetPath(t)) return;
            const first = t.replace(/^\.\/+/, '').split('/').filter(Boolean)[0];
            if (first && first.toLowerCase() !== 'variants') prefixes.add(first);
        });
        return prefixes;
    }

    function configUsesStructuredAssetPaths(cfg) {
        if (!cfg || typeof cfg !== 'object') return false;
        return assetFolderPrefixesFromConfig(cfg).size > 0;
    }

    function isDeclaredAssetSubfolderName(name) {
        const seg = String(name || '').trim();
        if (!seg) return false;
        const low = seg.toLowerCase();
        return low !== 'variants' && low !== '_share';
    }

    function pathScore(resolvedFull, contentRoot) {
        const r = String(resolvedFull || '').toLowerCase();
        const c = String(contentRoot || '').toLowerCase();
        let s = 0;
        if (c && r.startsWith(c + '/')) s += 2000;
        if (r.includes('/variants/')) s += 500;
        s += r.split('/').filter(Boolean).length;
        return s;
    }

    function entryLogicalPath(entry) {
        if (!entry) return '';
        if (typeof entry === 'string') return String(entry).trim();
        return String(entry.path || '').trim();
    }

    /**
     * @param {Array<{path:string,download_url:string}>} fileEntries
     * @param {string} contentFolder
     * @param {string} catalogFolder
     * @returns {{ items: Array<{download_url:string,devicePath:string,logicalPath:string,resolved:string}>, logicalToDevice: Map<string,string> }}
     */
    function buildFlattenPackManifest(fileEntries, contentFolder, catalogFolder) {
        const contentRoot = String(contentFolder || '')
            .trim()
            .replace(/\\/g, '/')
            .replace(/^\.\/+/, '')
            .replace(/\/+$/, '');
        const catalog = String(catalogFolder || '')
            .trim()
            .replace(/\\/g, '/')
            .replace(/^\.\/+/, '')
            .replace(/\/+$/, '');
        const rows = [];
        for (const entry of Array.isArray(fileEntries) ? fileEntries : []) {
            const logical = normalizeConfigAssetPath(entryLogicalPath(entry), contentRoot);
            if (!logical) continue;
            const resolved = resolvedRepoPath(contentRoot, logical);
            if (!resolved) continue;
            const download_url = String(entry.download_url || '').trim();
            if (!download_url) continue;
            rows.push({
                logicalPath: logical,
                resolved,
                download_url,
                score: pathScore(resolved, contentRoot)
            });
        }
        const byResolved = new Map();
        for (const row of rows) {
            const k = row.resolved.toLowerCase();
            if (!byResolved.has(k)) byResolved.set(k, row);
        }
        const unique = [...byResolved.values()];
        const leafGroups = new Map();
        for (const row of unique) {
            const leaf = (row.resolved.split('/').pop() || row.logicalPath.split('/').pop() || 'file').trim();
            const lk = leaf.toLowerCase();
            if (!leafGroups.has(lk)) leafGroups.set(lk, []);
            leafGroups.get(lk).push({ ...row, devicePath: leaf });
        }
        const items = [];
        for (const [, group] of leafGroups) {
            if (group.length === 1) {
                items.push(group[0]);
                continue;
            }
            group.sort((a, b) => b.score - a.score);
            items.push(group[0]);
            let dup = 1;
            for (let i = 1; i < group.length; i++) {
                const g = group[i];
                const base = g.devicePath;
                const m = base.match(/^(.+)(\.[^./]+)$/);
                const alt = m ? `${m[1]}__dup${dup}${m[2]}` : `${base}__dup${dup}`;
                dup += 1;
                console.warn('[theme-packaging] disambiguating duplicate leaf', base, '←', g.logicalPath, '→', alt);
                items.push({ ...g, devicePath: alt });
            }
        }
        const resToDevice = new Map();
        for (const it of items) {
            resToDevice.set(it.resolved.toLowerCase(), it.devicePath);
        }
        const logicalToDevice = new Map();
        for (const row of rows) {
            const dev = resToDevice.get(row.resolved.toLowerCase());
            if (dev) logicalToDevice.set(row.logicalPath.toLowerCase(), dev);
        }
        for (const it of items) {
            logicalToDevice.set(it.resolved.toLowerCase(), it.devicePath);
        }
        return { items, logicalToDevice, contentRoot, catalog, mode: 'flat' };
    }

    /**
     * Preserve config-relative subfolders in ZIP / device installs (Y1 reads paths literally).
     */
    function buildStructuredPackManifest(fileEntries, contentFolder, catalogFolder) {
        const contentRoot = String(contentFolder || '')
            .trim()
            .replace(/\\/g, '/')
            .replace(/^\.\/+/, '')
            .replace(/\/+$/, '');
        const catalog = String(catalogFolder || '')
            .trim()
            .replace(/\\/g, '/')
            .replace(/^\.\/+/, '')
            .replace(/\/+$/, '');
        const rows = [];
        for (const entry of Array.isArray(fileEntries) ? fileEntries : []) {
            const logical = normalizeConfigAssetPath(entryLogicalPath(entry), contentRoot);
            if (!logical || isVariantEscapeAssetPath(logical)) continue;
            const resolved = resolvedRepoPath(contentRoot, logical);
            if (!resolved) continue;
            const download_url = String(entry.download_url || '').trim();
            if (!download_url) continue;
            rows.push({
                logicalPath: logical,
                resolved,
                download_url,
                devicePath: logical
            });
        }
        const byResolved = new Map();
        for (const row of rows) {
            const k = row.resolved.toLowerCase();
            if (!byResolved.has(k)) byResolved.set(k, row);
        }
        const items = [...byResolved.values()];
        const logicalToDevice = new Map();
        for (const it of items) {
            logicalToDevice.set(it.logicalPath.toLowerCase(), it.devicePath);
            logicalToDevice.set(it.resolved.toLowerCase(), it.devicePath);
        }
        return { items, logicalToDevice, contentRoot, catalog, mode: 'structured' };
    }

    function buildPackManifest(fileEntries, contentFolder, catalogFolder, cfg) {
        if (configUsesStructuredAssetPaths(cfg)) {
            return buildStructuredPackManifest(fileEntries, contentFolder, catalogFolder);
        }
        return buildFlattenPackManifest(fileEntries, contentFolder, catalogFolder);
    }

    function rewriteConfigForDeviceFlatPack(cfg, contentFolder, logicalToDevice) {
        const contentRoot = String(contentFolder || '')
            .trim()
            .replace(/\\/g, '/')
            .replace(/^\.\/+/, '')
            .replace(/\/+$/, '');
        const clone = JSON.parse(JSON.stringify(cfg));
        const assign = (parent, key, value) => {
            if (typeof value !== 'string' || !isLikelyAssetPathString(value)) return;
            const raw = value.trim();
            const n1 = normalizeConfigAssetPath(raw, contentRoot);
            const resKey = resolvedRepoPath(contentRoot, raw).toLowerCase();
            const keys = [raw.toLowerCase(), n1.toLowerCase(), resKey].filter(Boolean);
            for (const k of keys) {
                if (logicalToDevice.has(k)) {
                    parent[key] = logicalToDevice.get(k);
                    return;
                }
            }
        };
        const walk2 = (node) => {
            if (Array.isArray(node)) {
                for (let i = 0; i < node.length; i++) walk2(node[i]);
                return;
            }
            if (node && typeof node === 'object') {
                for (const key of Object.keys(node)) {
                    const v = node[key];
                    if (typeof v === 'string') assign(node, key, v);
                    else walk2(v);
                }
            }
        };
        walk2(clone);
        return clone;
    }

    /** Google Drive folder shares are poor download targets; use on-site ZIP/install instead. */
    function isDriveGoogleFolderExternalUrl(url) {
        const u = String(url || '').trim();
        if (!/^https?:\/\//i.test(u) || !/drive\.google\.com/i.test(u)) return false;
        return /folder/i.test(u);
    }

    function effectiveExternalDownloadUrl(url) {
        const u = String(url || '').trim();
        if (!u || isDriveGoogleFolderExternalUrl(u)) return '';
        return /^https?:\/\//i.test(u) ? u : '';
    }

    global.ThemePackaging = {
        normalizeConfigAssetPath,
        resolvedRepoPath,
        buildFlattenPackManifest,
        buildStructuredPackManifest,
        buildPackManifest,
        rewriteConfigForDeviceFlatPack,
        isLikelyAssetPathString,
        isStructuredAssetPath,
        configUsesStructuredAssetPaths,
        assetFolderPrefixesFromConfig,
        isDeclaredAssetSubfolderName,
        isDriveGoogleFolderExternalUrl,
        effectiveExternalDownloadUrl
    };
})(typeof window !== 'undefined' ? window : this);
