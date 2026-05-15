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

    /** Gold = config declares required artwork paths and each linked asset passes health checks. */
    async function qualifiesFromConfigAndAssets(cfg, folderPath, fileUrlFn) {
        return qualifiesForGoldAsync(cfg, folderPath, fileUrlFn);
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

    async function fetchThemeConfig(folder) {
        const enc = encodePathSegments(folder);
        const res = await fetch(`./${enc}/config.json`, { cache: "no-store" });
        if (!res.ok) return null;
        return await res.json();
    }

    async function isGoldTheme(theme) {
        if (!theme) return false;
        if (String(theme.sourceType || "internal").toLowerCase() === "external") return false;
        const folder = String(theme.folder || "").replace(/^\.\/+/, "");
        if (!folder) return false;
        if (String(theme.compatibilityMedal || "").toLowerCase() === "gold") return true;
        try {
            const cfg = await fetchThemeConfig(folder);
            return qualifiesForGoldAsync(cfg, folder, (cf, rel) => buildThemeFileUrl(cf, rel));
        } catch (_) {
            return false;
        }
    }

    async function annotateThemes(themes, options) {
        const list = Array.isArray(themes) ? themes.filter(Boolean) : [];
        const batchSize = Math.max(1, Number(options && options.batchSize) || 8);
        const fileUrlFn =
            options && typeof options.buildFileUrl === "function"
                ? options.buildFileUrl
                : (cf, rel) => buildThemeFileUrl(cf, rel);
        for (let i = 0; i < list.length; i += batchSize) {
            const slice = list.slice(i, i + batchSize);
            await Promise.all(
                slice.map(async (t) => {
                    if (String(t.sourceType || "internal").toLowerCase() === "external") return;
                    const folder = String(t.folder || "").replace(/^\.\/+/, "");
                    if (!folder) return;
                    if (String(t.compatibilityMedal || "").toLowerCase() === "gold") return;
                    try {
                        const cfg = await fetchThemeConfig(folder);
                        if (!cfg) return;
                        const medal = medalFromConfig(cfg);
                        if (medal === "none") return;
                        if (medal === "gold" || (await artworkCompatQualifiesForGold(cfg, folder, fileUrlFn))) {
                            t.compatibilityMedal = "gold";
                        }
                    } catch (_) {}
                }),
            );
        }
        return list;
    }

    async function findGoldThemes(themes, options) {
        const list = Array.isArray(themes) ? themes.filter(Boolean) : [];
        await annotateThemes(list, options);
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
        configQualifiesForGold,
        artworkCompatQualifiesForGold,
        qualifiesForGoldAsync,
        qualifiesFromConfigAndAssets,
        isGoldTheme,
        annotateThemes,
        findGoldThemes,
        coverUrlForTheme,
        buildThemeFileUrl,
    };
})();
