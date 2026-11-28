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

    function isI18nMetadataFile(nameOrPath) {
        const s = String(nameOrPath || '').trim().replace(/\\/g, '/');
        const base = s.split('/').filter(Boolean).pop() || '';
        const low = base.toLowerCase();
        return low === 'config_i18n.json' || low === 'themes_i18n.json' || /(^|_|\.)i18n\.json$/i.test(low);
    }

    function isLikelyAssetPathString(s) {
        const t = String(s || '').trim();
        if (!t || t.includes('://')) return false;
        if (/^#|^rgba?\(/i.test(t)) return false;
        if (isI18nMetadataFile(t)) return false;
        if (isPreviewOrWebsiteOnlyAsset(t)) return false;
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

    /* Files that exist for the website only. Never shipped in a theme ZIP, so a
       player never receives a 480x360 screenshot it cannot use. */
    const WEBSITE_ONLY_COVERS = new Set([
        "cover.jpg",
        "cover.jpeg",
        "cover-thumb.jpg",
        "cover-thumb.jpeg",
        "screenshot_preview.jpg",
        "screenshot_preview.jpeg",
    ]);

    function isPreviewOrWebsiteOnlyAsset(nameOrPath) {
        const s = String(nameOrPath || '').trim().replace(/\\/g, '/');
        const base = s.split('/').filter(Boolean).pop() || '';
        const low = base.toLowerCase();
        if (low.includes('.preview.') || low.endsWith('.preview.jpg') || low.endsWith('.preview.png')) return true;
        if (WEBSITE_ONLY_COVERS.has(low)) return true;
        if (low === 'index.html' || low.endsWith('.html') || low.endsWith('.md') || low === 'license') return true;
        return false;
    }

    function configReferencedBasenames(cfg) {
        const names = new Set();
        walkConfigAssetStrings(cfg, (val) => {
            const text = String(val || "")
                .trim()
                .replace(/\\/g, "/");
            if (!text || /^https?:/i.test(text)) return;
            const base = text.split("/").filter(Boolean).pop();
            if (base) names.add(base.toLowerCase());
        });
        return names;
    }

    /**
     * Gallery JPEG covers, preview assets, and non-theme files are excluded.
     * Strictly ensures only files specified in the theme's config.json and config.json itself get packed.
     */
    function withoutWebsiteOnlyCovers(fileEntries, cfg) {
        const referenced = configReferencedBasenames(cfg);
        return (Array.isArray(fileEntries) ? fileEntries : []).filter((entry) => {
            const logical = entryLogicalPath(entry).replace(/\\/g, "/");
            const base = logical.split("/").filter(Boolean).pop() || "";
            const low = base.toLowerCase();
            if (isI18nMetadataFile(low) || isI18nMetadataFile(logical)) return false;
            if (isPreviewOrWebsiteOnlyAsset(low) || isPreviewOrWebsiteOnlyAsset(logical)) return false;
            if (low === 'config.json') return true;
            return referenced.has(low);
        });
    }

    function buildPackManifest(fileEntries, contentFolder, catalogFolder, cfg) {
        const files = withoutWebsiteOnlyCovers(fileEntries, cfg);
        let manifest;
        if (configUsesStructuredAssetPaths(cfg)) {
            manifest = buildStructuredPackManifest(files, contentFolder, catalogFolder);
        } else {
            manifest = buildFlattenPackManifest(files, contentFolder, catalogFolder);
        }
        /* Structured packs keep config-relative paths, so their config is not
           rewritten later. Fold the Bluetooth pair here while the manifest's
           device paths are still available. Flat packs do it in
           rewriteConfigForDeviceFlatPack, where the paths have been collapsed. */
        const targetModel = typeof window !== 'undefined' ? String(window.__y1TargetModel || '') : '';
        if (targetModel && manifest.mode === 'structured') {
            normalizeConfigForModel(
                cfg,
                (manifest.items || []).map((item) => item.devicePath),
                targetModel
            );
        }
        return manifest;
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
        const targetModel = typeof window !== 'undefined' ? String(window.__y1TargetModel || '') : '';
        if (targetModel && logicalToDevice && typeof logicalToDevice.values === 'function') {
            normalizeConfigForModel(clone, Array.from(new Set(logicalToDevice.values())), targetModel);
        }
        return clone;
    }

    /* The one slot both launchers read. Y2 draws homePageConfig.bluetooth in
       Settings; Y1 draws the same key as its Home icon. A theme that wants
       both looks carries settingConfig.bluetooth for Y2 next to
       homePageConfig.bluetooth for Y1, and the packager folds the pair back so
       the device receives stock JSON with one Bluetooth key. */
    function modelChoiceForConfig(cfg) {
        const config = cfg && typeof cfg === 'object' ? cfg : {};
        const home = config.homePageConfig && typeof config.homePageConfig === 'object' ? config.homePageConfig : {};
        const setting = config.settingConfig && typeof config.settingConfig === 'object' ? config.settingConfig : {};
        const gallery = config.gallery && typeof config.gallery === 'object' ? config.gallery : {};
        const models = gallery.modelFolders && typeof gallery.modelFolders === 'object' ? gallery.modelFolders : {};
        const labels = gallery.modelLabels && typeof gallery.modelLabels === 'object' ? gallery.modelLabels : {};
        const homeBluetooth = String(home.bluetooth || '');
        const settingBluetooth = String(setting.bluetooth || '');
        return {
            needsChoice:
                (!!settingBluetooth && settingBluetooth !== homeBluetooth) ||
                Object.keys(models).length > 0 ||
                /_y1\.[a-z0-9]+$/i.test(homeBluetooth) ||
                /_y2\.[a-z0-9]+$/i.test(homeBluetooth),
            labels: {
                y1: String(labels.y1 || 'Y1 · Home Bluetooth icon'),
                y2: String(labels.y2 || 'Y2 · Settings Bluetooth icon')
            },
            defaultModel: String(gallery.defaultModel || 'y2').toLowerCase() === 'y1' ? 'y1' : 'y2'
        };
    }

    function normalizeConfigForModel(cfg, devicePaths, targetModel) {
        const model = String(targetModel || '').toLowerCase();
        if (!cfg || typeof cfg !== 'object' || !model) return cfg;
        const home = cfg.homePageConfig && typeof cfg.homePageConfig === 'object' ? cfg.homePageConfig : (cfg.homePageConfig = {});
        const setting = cfg.settingConfig && typeof cfg.settingConfig === 'object' ? cfg.settingConfig : (cfg.settingConfig = {});
        const files = Object.create(null);
        (Array.isArray(devicePaths) ? devicePaths : []).forEach((path) => {
            const rel = String(path || '').replace(/\\/g, '/').replace(/^\.?\//, '').toLowerCase();
            if (rel) files[rel] = true;
        });
        const shipped = (value) => {
            const rel = String(value || '').replace(/\\/g, '/').replace(/^\.?\//, '').toLowerCase();
            if (!rel || /transparent\.png$/.test(rel)) return false;
            return !!files[rel];
        };
        const homeBt = String(home.bluetooth || '');
        let y1Icon = homeBt;
        if (y1Icon && !/_(?:y1|y2)\.[a-z0-9]+$/i.test(y1Icon)) {
            const sibling = y1Icon.replace(/(\.[a-z0-9]+)$/i, '_Y1$1');
            if (shipped(sibling)) y1Icon = sibling;
        }
        let y2Icon = String(setting.bluetooth || '');
        if (y2Icon && !/_(?:y1|y2)\.[a-z0-9]+$/i.test(y2Icon)) {
            const sibling = y2Icon.replace(/(\.[a-z0-9]+)$/i, '_Y2$1');
            if (shipped(sibling)) y2Icon = sibling;
        }
        if (!y2Icon && y1Icon) {
            const fromHome = y1Icon.replace(/_y1(\.[a-z0-9]+)$/i, '$1');
            if (shipped(fromHome)) y2Icon = fromHome;
        }
        if (!y1Icon && y2Icon) {
            const fromSetting = y2Icon.replace(/_y2(\.[a-z0-9]+)$/i, '$1');
            if (shipped(fromSetting)) y1Icon = fromSetting;
            else y1Icon = y2Icon;
        }
        const chosen = model === 'y1' ? y1Icon || y2Icon : y2Icon || y1Icon;
        if (chosen) home.bluetooth = chosen;
        /* The helper key has no reader on either player, so it never ships. */
        delete setting.bluetooth;
        if (model === 'y1' && cfg.itemConfig && cfg.itemConfig.itemSelectedBackgroundIs9Patch) {
            delete cfg.itemConfig.itemSelectedBackgroundIs9Patch;
        }
        return cfg;
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

    /* The gallery and a static theme page both need the same two-option
       question before they pack a ZIP. The dialog lives here so every
       download path asks once, with the same wording and the same result. */
    let modelStylesReady = false;
    function injectModelStyles() {
        if (modelStylesReady || typeof document === 'undefined' || !document.head) return;
        modelStylesReady = true;
        const style = document.createElement('style');
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
        document.head.appendChild(style);
    }

    function askModelChoice(choice, themeName) {
        const labels = (choice && choice.labels) || {};
        const defaultModel = String((choice && choice.defaultModel) || 'y2').toLowerCase() === 'y1' ? 'y1' : 'y2';
        return new Promise((resolve) => {
            if (
                typeof document === 'undefined' ||
                !document.body ||
                typeof global.HTMLDialogElement === 'undefined'
            ) {
                resolve('');
                return;
            }
            injectModelStyles();
            const dialog = document.createElement('dialog');
            dialog.className = 'tp-model-dialog';
            dialog.setAttribute('aria-labelledby', 'tp-model-title');
            const body = document.createElement('div');
            body.className = 'tp-model-body';
            const eyebrow = document.createElement('p');
            eyebrow.className = 'tp-model-eyebrow';
            eyebrow.textContent = 'Download';
            const title = document.createElement('h2');
            title.className = 'tp-model-title';
            title.id = 'tp-model-title';
            title.textContent = 'Which player is this for?';
            const copy = document.createElement('p');
            copy.className = 'tp-model-copy';
            copy.textContent =
                '\u201c' + (themeName || 'This theme') + '\u201d ships different Bluetooth artwork for each player. Pick the one you install it on \u2014 the ZIP is the same theme either way.';
            const options = document.createElement('div');
            options.className = 'tp-model-options';
            const foot = document.createElement('div');
            foot.className = 'tp-model-foot';
            const note = document.createElement('p');
            note.className = 'tp-model-note';
            note.textContent = 'You can download the other version again any time.';
            const cancel = document.createElement('button');
            cancel.type = 'button';
            cancel.className = 'tp-model-cancel';
            cancel.textContent = 'Cancel';
            let settled = false;
            function close(value) {
                if (settled) return;
                settled = true;
                try { if (dialog.open) dialog.close(); } catch (_) {}
                dialog.remove();
                resolve(value);
            }
            [
                ['y1', 'fa-music', labels.y1 || 'Y1 \u00b7 Home Bluetooth icon', 'Home screen icon'],
                ['y2', 'fa-sliders', labels.y2 || 'Y2 \u00b7 Settings Bluetooth icon', 'Settings list icon']
            ].forEach((row) => {
                const button = document.createElement('button');
                button.type = 'button';
                button.className = 'tp-model-option';
                button.innerHTML =
                    '<i class="fa-solid ' + row[1] + '" aria-hidden="true"></i><span><strong></strong><small></small></span>';
                button.querySelector('strong').textContent = row[2];
                button.querySelector('small').textContent = row[3];
                button.addEventListener('click', () => close(row[0]));
                options.appendChild(button);
            });
            cancel.addEventListener('click', () => close(''));
            dialog.addEventListener('cancel', (event) => {
                event.preventDefault();
                close('');
            });
            dialog.addEventListener('click', (event) => {
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
            document.body.appendChild(dialog);
            dialog.showModal();
            const preferred = options.querySelectorAll('.tp-model-option')[defaultModel === 'y1' ? 0 : 1];
            if (preferred) preferred.focus();
        });
    }

    /* Gallery pages are generated copies of one inline script (87 files at the
       time of writing), so the model gate is installed here instead of editing
       every copy. It wraps the two local-download entry points after the inline
       script has defined them; a theme that does not need a choice goes
       straight through. */
    function encodePagePath(path) {
        return String(path || '')
            .split('/')
            .filter(Boolean)
            .map((segment) => encodeURIComponent(segment))
            .join('/');
    }

    function choiceForTheme(theme) {
        const fallback = {
            needsChoice: true,
            labels: {
                y1: 'Y1 \u00b7 Home Bluetooth icon',
                y2: 'Y2 \u00b7 Settings Bluetooth icon'
            },
            defaultModel: 'y2'
        };
        const folder = theme && String(theme.folder || '').replace(/^\/?/, '');
        if (!folder || typeof fetch !== 'function') return Promise.resolve(fallback);
        return fetch('/' + encodePagePath(folder) + '/config.json', { cache: 'no-cache' })
            .then((response) => (response && response.ok ? response.json() : null))
            .then((cfg) => (cfg ? modelChoiceForConfig(cfg) : fallback))
            .catch(() => fallback);
    }

    function installGalleryModelGate() {
        if (typeof window === 'undefined' || typeof document === 'undefined') return;
        if (window.__y1ThemeModelGateInstalled) return;
        if (typeof window.downloadTheme !== 'function' && typeof window.directInstallTheme !== 'function') return;
        window.__y1ThemeModelGateInstalled = true;
        ['downloadTheme', 'directInstallTheme'].forEach((name) => {
            const original = window[name];
            if (typeof original !== 'function' || original.__y1ModelGateWrapped) return;
            const wrapped = function (theme) {
                const receiver = this;
                const args = arguments;
                if (window.__y1ThemeModelGateBypass) return original.apply(receiver, args);
                return choiceForTheme(theme).then((choice) => {
                    if (!choice || !choice.needsChoice) return original.apply(receiver, args);
                    return askModelChoice(choice, (theme && (theme.name || theme.folder)) || 'this theme').then((model) => {
                        if (!model) return false;
                        window.__y1TargetModel = model;
                        let result;
                        try {
                            result = original.apply(receiver, args);
                        } catch (error) {
                            window.__y1TargetModel = '';
                            throw error;
                        }
                        return Promise.resolve(result).then(
                            (value) => {
                                window.__y1TargetModel = '';
                                return value;
                            },
                            (error) => {
                                window.__y1TargetModel = '';
                                throw error;
                            }
                        );
                    });
                });
            };
            wrapped.__y1ModelGateWrapped = true;
            window[name] = wrapped;
        });
    }

    if (typeof window !== 'undefined' && window.document) {
        if (window.document.readyState === 'loading') {
            window.document.addEventListener('DOMContentLoaded', installGalleryModelGate);
        } else {
            installGalleryModelGate();
        }
    }

    global.ThemePackaging = {
        normalizeConfigAssetPath,
        resolvedRepoPath,
        buildFlattenPackManifest,
        buildStructuredPackManifest,
        buildPackManifest,
        rewriteConfigForDeviceFlatPack,
        modelChoiceForConfig,
        askModelChoice,
        normalizeConfigForModel,
        isLikelyAssetPathString,
        isStructuredAssetPath,
        configUsesStructuredAssetPaths,
        assetFolderPrefixesFromConfig,
        isDeclaredAssetSubfolderName,
        isDriveGoogleFolderExternalUrl,
        effectiveExternalDownloadUrl,
        isI18nMetadataFile,
        isPreviewOrWebsiteOnlyAsset
    };
})(typeof window !== 'undefined' ? window : this);
