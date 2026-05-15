/**
 * Gold Badge: theme qualifies when config.json defines artwork paths for
 * ebook, calculator, calendar (home page) and launcher (settings).
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

    /** True when all required launcher / ebook / calculator / calendar paths are set in config. */
    function configQualifiesForGold(cfg) {
        if (!cfg || typeof cfg !== "object") return false;
        const gallery = cfg.gallery && typeof cfg.gallery === "object" ? cfg.gallery : {};
        const medal = String(gallery.compatibilityMedal || "").trim().toLowerCase();
        if (medal === "gold") return true;
        if (medal === "none") return false;
        return GOLD_ARTWORK_PATHS.every((parts) => !!getConfigValueByPath(cfg, parts));
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
            return configQualifiesForGold(cfg);
        } catch (_) {
            return false;
        }
    }

    async function annotateThemes(themes, options) {
        const list = Array.isArray(themes) ? themes.filter(Boolean) : [];
        const batchSize = Math.max(1, Number(options && options.batchSize) || 16);
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
                        if (configQualifiesForGold(cfg)) t.compatibilityMedal = "gold";
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
        isGoldTheme,
        annotateThemes,
        findGoldThemes,
        coverUrlForTheme,
        buildThemeFileUrl,
    };
})();
