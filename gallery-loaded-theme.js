/**
 * Build a LoadedTheme-shaped object from gallery static paths (Theme Maker–compatible surface).
 * ThemeDisplay / useDeviceSimulator expect spec to include legacy config fields (themeCover, homePageConfig, …).
 */
(function (global) {
    'use strict';

    function hasFileExt(s) {
        return /\.(png|jpe?g|gif|webp|bmp|svg|ttf|otf|woff2?)$/i.test(String(s || ''));
    }

    function extractReferencedFilesFromLegacySpec(spec, buildFileUrl, contentFolder) {
        const out = [];
        const seen = new Set();
        const push = (fileName, configKey) => {
            const f = String(fileName || '').trim();
            if (!f || !hasFileExt(f) || f.startsWith('#')) return;
            const url = buildFileUrl(contentFolder, f);
            if (!url) return;
            const k = f.toLowerCase();
            if (seen.has(k)) return;
            seen.add(k);
            out.push({
                fileName: f,
                url: url,
                configKey: configKey,
                description: configKey
            });
        };

        if (!spec || typeof spec !== 'object') return out;
        push(spec.themeCover, 'themeCover');
        push(spec.desktopWallpaper, 'desktopWallpaper');
        push(spec.globalWallpaper, 'globalWallpaper');
        push(spec.desktopMask, 'desktopMask');
        push(spec.fontFamily, 'fontFamily');

        const blocks = ['itemConfig', 'dialogConfig', 'menuConfig', 'homePageConfig', 'fileConfig', 'settingConfig', 'statusConfig'];
        for (const b of blocks) {
            const cfg = spec[b];
            if (!cfg || typeof cfg !== 'object') continue;
            for (const [k, v] of Object.entries(cfg)) {
                if (Array.isArray(v)) {
                    v.forEach((item, idx) => push(item, `${b}.${k}[${idx}]`));
                } else {
                    push(v, `${b}.${k}`);
                }
            }
        }
        return out;
    }

    /**
     * @param {object} opts
     * @param {string} opts.catalogFolder
     * @param {string} [opts.variantSegment]
     * @param {function(string,string):string} opts.buildFileUrl (contentFolder, relativePath) -> url
     * @param {string} [opts.displayName]
     */
    async function buildLoadedThemeFromGallery(opts) {
        const catalogFolder = String((opts && opts.catalogFolder) || '')
            .replace(/^\.\/+/, '')
            .trim();
        const variantSegment = String((opts && opts.variantSegment) || '').trim();
        const THEME_VARIANTS_SEGMENT = 'Variants';
        const contentFolder = variantSegment
            ? `${catalogFolder}/${THEME_VARIANTS_SEGMENT}/${variantSegment}`
            : catalogFolder;
        const buildFileUrl =
            opts && typeof opts.buildFileUrl === 'function'
                ? opts.buildFileUrl
                : function () {
                      return '';
                  };

        const enc = contentFolder.split('/').filter(Boolean).map(encodeURIComponent).join('/');
        const res = await fetch(`./${enc}/config.json`, { cache: 'no-cache' });
        if (!res.ok) throw new Error('Could not load theme config.json');
        const spec = await res.json();
        const id =
            String((opts && opts.displayName) || '').trim() ||
            (spec.theme_info && spec.theme_info.title) ||
            catalogFolder;

        const loadedAssets = extractReferencedFilesFromLegacySpec(spec, buildFileUrl, contentFolder);

        const assetUrlForFile = function (fileName) {
            const u = buildFileUrl(contentFolder, fileName);
            return u || undefined;
        };

        return {
            id: id,
            spec: spec,
            loadedAssets: loadedAssets,
            assetUrlForFile: assetUrlForFile,
            assetUrlForId: function () {
                return undefined;
            },
            isEditable: false
        };
    }

    global.GalleryLoadedTheme = {
        buildLoadedThemeFromGallery: buildLoadedThemeFromGallery
    };
})(typeof window !== 'undefined' ? window : this);
