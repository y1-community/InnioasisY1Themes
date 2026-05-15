/**
 * Detect Gold Badge themes (same rules as the gallery).
 */
(function (global) {
    "use strict";

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

    async function medalFromConfig(folder) {
        const enc = encodePathSegments(folder);
        const res = await fetch(`./${enc}/config.json`, { cache: "no-store" });
        if (!res.ok) return "";
        const cfg = await res.json();
        const g = cfg && cfg.gallery && typeof cfg.gallery === "object" ? cfg.gallery : {};
        return String(g.compatibilityMedal || "").trim().toLowerCase();
    }

    async function isGoldTheme(theme) {
        if (!theme) return false;
        if (String(theme.sourceType || "internal").toLowerCase() === "external") return false;
        const folder = String(theme.folder || "").replace(/^\.\/+/, "");
        if (!folder) return false;
        if (String(theme.compatibilityMedal || "").toLowerCase() === "gold") return true;

        let medal = "";
        try {
            medal = await medalFromConfig(folder);
        } catch (_) {
            return false;
        }
        if (medal === "gold") return true;
        if (medal === "none") return false;

        const warnFn =
            global.y1ThemeArtworkCompat && typeof global.y1ThemeArtworkCompat.warnings === "function"
                ? global.y1ThemeArtworkCompat.warnings
                : null;
        if (!warnFn) return false;

        try {
            const enc = encodePathSegments(folder);
            const res = await fetch(`./${enc}/config.json`, { cache: "no-store" });
            if (!res.ok) return false;
            const cfg = await res.json();
            const warnings = await warnFn(
                (cf, rel) => buildThemeFileUrl(cf || folder, rel),
                cfg,
                folder,
            );
            return Array.isArray(warnings) && warnings.length === 0;
        } catch (_) {
            return false;
        }
    }

    async function findGoldThemes(themes, options) {
        const list = Array.isArray(themes) ? themes.filter(Boolean) : [];
        const batchSize = Math.max(1, Number(options && options.batchSize) || 10);
        const gold = [];
        for (let i = 0; i < list.length; i += batchSize) {
            const slice = list.slice(i, i + batchSize);
            const results = await Promise.all(
                slice.map(async (t) => ((await isGoldTheme(t)) ? t : null)),
            );
            for (const t of results) {
                if (t) gold.push(t);
            }
        }
        gold.sort((a, b) =>
            String(a.name || a.folder || "").localeCompare(String(b.name || b.folder || ""), undefined, {
                sensitivity: "base",
            }),
        );
        return gold;
    }

    global.GoldThemeDetect = {
        isGoldTheme,
        findGoldThemes,
        coverUrlForTheme,
        buildThemeFileUrl,
    };
})();
