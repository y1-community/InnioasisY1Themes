/**
 * Gold Badge: themes qualify when optional artwork passes compatibility checks
 * (config paths present and linked assets load correctly).
 */
(function (global) {
    "use strict";

    const GOLD_ARTWORK_PATHS = [
        ["homePageConfig", "ebook"],
        ["homePageConfig", "calculator"],
        ["homePageConfig", "calendar"],
        ["settingConfig", "launcher"],
    ];

    const THEME_VARIANTS_FOLDER = "Variants";

    function encodePathSegments(pathValue) {
        return String(pathValue || "")
            .split("/")
            .filter(Boolean)
            .map((seg) => encodeURIComponent(seg))
            .join("/");
    }

    function buildThemeFileUrl(folderPath, relativePath) {
        const folder = String(folderPath || "")
            .trim()
            .replace(/^\.\/+/, "")
            .replace(/\/+$/, "");
        const rel = String(relativePath || "")
            .trim()
            .replace(/^\.\/+/, "")
            .replace(/^\/+/, "");
        if (!folder) return rel ? "./" + encodePathSegments(rel) : "";
        const stack = folder.split("/").filter(Boolean);
        rel.split("/").forEach((seg) => {
            if (!seg || seg === ".") return;
            if (seg === "..") {
                if (stack.length) stack.pop();
                return;
            }
            stack.push(seg);
        });
        return "./" + encodePathSegments(stack.join("/"));
    }

    function getConfigValueByPath(rootObj, pathParts) {
        let cursor = rootObj;
        for (let i = 0; i < pathParts.length; i++) {
            const key = pathParts[i];
            if (!cursor || typeof cursor !== "object") return "";
            cursor = cursor[key];
        }
        return typeof cursor === "string" ? String(cursor).trim() : "";
    }

    function medalFromConfig(cfg) {
        const gallery = cfg && cfg.gallery && typeof cfg.gallery === "object" ? cfg.gallery : {};
        return String(gallery.compatibilityMedal || "").trim().toLowerCase();
    }

    /** Fast check: required paths declared in config (and honour gallery.medal overrides). */
    function configQualifiesForGold(cfg) {
        if (!cfg || typeof cfg !== "object") return false;
        const medal = medalFromConfig(cfg);
        if (medal === "gold") return true;
        if (medal === "none") return false;
        return GOLD_ARTWORK_PATHS.every((parts) => !!getConfigValueByPath(cfg, parts));
    }

    function artworkWarningsFn() {
        return global.y1ThemeArtworkCompat &&
            typeof global.y1ThemeArtworkCompat.warnings === "function"
            ? global.y1ThemeArtworkCompat.warnings
            : null;
    }

    /** Content folders to scan: catalog root + Variants/* from root gallery config. */
    function resolveGoldContentFolders(catalogFolder, rootCfg) {
        const root = String(catalogFolder || "")
            .replace(/^\.\/+/, "")
            .replace(/\/+$/, "")
            .trim();
        if (!root) return [];
        const folders = [root];
        const gallery =
            rootCfg && rootCfg.gallery && typeof rootCfg.gallery === "object" ? rootCfg.gallery : {};
        const variantNames = Array.isArray(gallery.variantFolders) ? gallery.variantFolders : [];
        const seen = new Set([root.toLowerCase()]);
        for (const name of variantNames) {
            const seg = String(name || "").trim();
            if (!seg) continue;
            const path = `${root}/${THEME_VARIANTS_FOLDER}/${seg}`;
            const key = path.toLowerCase();
            if (seen.has(key)) continue;
            seen.add(key);
            folders.push(path);
        }
        return folders;
    }

    function effectiveContentFolder(catalogFolder, variantSegment) {
        const root = String(catalogFolder || "")
            .replace(/^\.\/+/, "")
            .replace(/\/+$/, "")
            .trim();
        const v = String(variantSegment || "").trim();
        if (!root) return "";
        if (!v) return root;
        return `${root}/${THEME_VARIANTS_FOLDER}/${v}`;
    }

    /** Full check: artwork compat passes (paths + files healthy). */
    async function artworkCompatQualifiesForGold(cfg, folderPath, fileUrlFn) {
        if (!cfg || !folderPath) return false;
        const medal = medalFromConfig(cfg);
        if (medal === "gold") return true;
        if (medal === "none") return false;
        const warnFn = artworkWarningsFn();
        if (!warnFn) return configQualifiesForGold(cfg);
        const fn =
            typeof fileUrlFn === "function"
                ? fileUrlFn
                : (cf, rel) => buildThemeFileUrl(cf, rel);
        const warnings = await warnFn(fn, cfg, folderPath);
        return Array.isArray(warnings) && warnings.length === 0;
    }

    async function qualifiesForGoldAsync(cfg, folderPath, fileUrlFn) {
        return artworkCompatQualifiesForGold(cfg, folderPath, fileUrlFn);
    }

    async function qualifiesFromConfigAndAssets(cfg, folderPath, fileUrlFn) {
        return qualifiesForGoldAsync(cfg, folderPath, fileUrlFn);
    }

    async function fetchThemeConfig(folder) {
        const enc = encodePathSegments(folder);
        const res = await fetch(`./${enc}/config.json`, { cache: "no-store" });
        if (!res.ok) return null;
        return await res.json();
    }

    /**
     * Evaluate one catalog theme (root + variant configs).
     * @returns {Promise<{ gold: boolean, medal: string, checkedFolder: string }>}
     */
    async function evaluateThemeGoldStatus(theme, options) {
        const empty = { gold: false, medal: "", checkedFolder: "" };
        if (!theme) return empty;
        if (String(theme.sourceType || "internal").toLowerCase() === "external") return empty;
        const catalogFolder = String(theme.folder || "")
            .replace(/^\.\/+/, "")
            .trim();
        if (!catalogFolder) return empty;

        const fileUrlFn =
            options && typeof options.buildFileUrl === "function"
                ? options.buildFileUrl
                : (cf, rel) => buildThemeFileUrl(cf, rel);

        const variantSeg =
            options && options.variantSegment != null
                ? String(options.variantSegment || "").trim()
                : "";

        if (variantSeg) {
            const contentFolder = effectiveContentFolder(catalogFolder, variantSeg);
            const cfg = await fetchThemeConfig(contentFolder);
            if (!cfg) return empty;
            const medal = medalFromConfig(cfg);
            if (medal === "none") return { gold: false, medal: "none", checkedFolder: contentFolder };
            if (medal === "gold") return { gold: true, medal: "gold", checkedFolder: contentFolder };
            const ok = await artworkCompatQualifiesForGold(cfg, contentFolder, fileUrlFn);
            return { gold: ok, medal: ok ? "gold" : "", checkedFolder: contentFolder };
        }

        const rootCfg = await fetchThemeConfig(catalogFolder);
        if (!rootCfg) return empty;

        const rootMedal = medalFromConfig(rootCfg);
        if (rootMedal === "none") {
            const variantFolders = resolveGoldContentFolders(catalogFolder, rootCfg).slice(1);
            for (const contentFolder of variantFolders) {
                const vCfg = await fetchThemeConfig(contentFolder);
                if (!vCfg) continue;
                const vMedal = medalFromConfig(vCfg);
                if (vMedal === "none") continue;
                if (vMedal === "gold") {
                    return { gold: true, medal: "gold", checkedFolder: contentFolder };
                }
                if (await artworkCompatQualifiesForGold(vCfg, contentFolder, fileUrlFn)) {
                    return { gold: true, medal: "gold", checkedFolder: contentFolder };
                }
            }
            return { gold: false, medal: "none", checkedFolder: catalogFolder };
        }

        const folders = resolveGoldContentFolders(catalogFolder, rootCfg);
        for (const contentFolder of folders) {
            const cfg =
                contentFolder === catalogFolder ? rootCfg : await fetchThemeConfig(contentFolder);
            if (!cfg) continue;
            const medal = medalFromConfig(cfg);
            if (medal === "none") continue;
            if (medal === "gold") {
                return { gold: true, medal: "gold", checkedFolder: contentFolder };
            }
            if (await artworkCompatQualifiesForGold(cfg, contentFolder, fileUrlFn)) {
                return { gold: true, medal: "gold", checkedFolder: contentFolder };
            }
        }
        return empty;
    }

    function emitGoldUpdate(detail) {
        try {
            global.dispatchEvent(new CustomEvent("y1-gold-themes-updated", { detail: detail || {} }));
        } catch (_) {}
    }

    async function annotateOneTheme(t, fileUrlFn) {
        if (String(t.sourceType || "internal").toLowerCase() === "external") {
            t.compatibilityMedal = "";
            return false;
        }
        const folder = String(t.folder || "").replace(/^\.\/+/, "");
        if (!folder) {
            t.compatibilityMedal = "";
            return false;
        }

        const status = await evaluateThemeGoldStatus(t, { buildFileUrl: fileUrlFn });
        // Always sync from evaluated status so stale medals from themes.json / cache cannot
        // bypass artwork checks or stay gold after compat fails.
        t.compatibilityMedal = status.gold ? "gold" : "";
        return status.gold;
    }

    async function annotateThemes(themes, options) {
        const list = Array.isArray(themes) ? themes.filter(Boolean) : [];
        const batchSize = Math.max(1, Number(options && options.batchSize) || 4);
        const maxThemes =
            options && options.maxThemes != null
                ? Math.max(0, Number(options.maxThemes) || 0)
                : list.length;
        const limit = maxThemes > 0 ? Math.min(list.length, maxThemes) : list.length;
        const fileUrlFn =
            options && typeof options.buildFileUrl === "function"
                ? options.buildFileUrl
                : (cf, rel) => buildThemeFileUrl(cf, rel);
        const onProgress =
            options && typeof options.onProgress === "function" ? options.onProgress : null;
        const emitEvents = options && options.emitEvents !== false;

        for (let i = 0; i < limit; i += batchSize) {
            const slice = list.slice(i, i + batchSize);
            await Promise.all(
                slice.map(async (t) => {
                    try {
                        const gold = await annotateOneTheme(t, fileUrlFn);
                        if (emitEvents) {
                            emitGoldUpdate({
                                folder: String(t.folder || "").replace(/^\.\/+/, ""),
                                gold,
                                theme: t,
                            });
                        }
                    } catch (_) {}
                }),
            );
            if (onProgress) {
                onProgress({
                    done: Math.min(i + batchSize, limit),
                    total: limit,
                });
            }
        }
        return list;
    }

    function annotateThemesProgressive(themes, options) {
        const list = Array.isArray(themes) ? themes.filter(Boolean) : [];
        const opts = { ...(options || {}), emitEvents: true };
        void annotateThemes(list, opts).catch(() => {});
        return list;
    }

    function coverUrlForTheme(theme) {
        const shot = String(theme.screenshot || theme.cover || "").trim();
        if (shot) {
            if (/^https?:\/\//i.test(shot)) return shot;
            if (shot.startsWith("./")) return shot;
            return "./" + encodePathSegments(shot.replace(/^\.\/+/, ""));
        }
        const folder = String(theme.folder || "").replace(/^\.\/+/, "");
        if (!folder) return "placeholder.png";
        return buildThemeFileUrl(folder, "cover.png");
    }

    async function isGoldTheme(theme) {
        const status = await evaluateThemeGoldStatus(theme);
        return status.gold;
    }

    async function findGoldThemes(themes, options) {
        const list = Array.isArray(themes) ? themes.filter(Boolean) : [];
        await annotateThemes(list, { ...(options || {}), emitEvents: false });
        const gold = list.filter((t) => String(t.compatibilityMedal || "").toLowerCase() === "gold");
        gold.sort((a, b) =>
            String(a.name || a.folder || "").localeCompare(String(b.name || b.folder || ""), undefined, {
                sensitivity: "base",
            }),
        );
        return gold;
    }

    global.GoldThemeDetect = {
        GOLD_ARTWORK_PATHS,
        THEME_VARIANTS_FOLDER,
        configQualifiesForGold,
        artworkCompatQualifiesForGold,
        qualifiesForGoldAsync,
        qualifiesFromConfigAndAssets,
        resolveGoldContentFolders,
        effectiveContentFolder,
        evaluateThemeGoldStatus,
        isGoldTheme,
        annotateThemes,
        annotateThemesProgressive,
        findGoldThemes,
        coverUrlForTheme,
        buildThemeFileUrl,
        fetchThemeConfig,
    };
})();
