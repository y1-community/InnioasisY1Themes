/**
 * Theme analytics API: page views, download/install events, star ratings (D1).
 * Used by workers/theme-analytics and optionally Cloudflare Pages Functions.
 */

export const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

const THEME_KEY_RE = /^[a-zA-Z0-9][a-zA-Z0-9._\- ]{0,118}[a-zA-Z0-9.]?$/;
const EVENTS = new Set(["page_view", "zip_download", "direct_install"]);
const SOURCES = new Set(["gallery", "theme_page", "theme_lookup", "other"]);

function jsonResponse(body, status = 200) {
  return Response.json(body, { status, headers: CORS_HEADERS });
}

export function handleAnalyticsOptions() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

export function normalizeThemeKey(raw) {
  const s = String(raw || "")
    .trim()
    .replace(/^\.\/+/, "")
    .replace(/\/+$/, "");
  if (!s || s.includes("..") || s.includes("/")) return "";
  if (!THEME_KEY_RE.test(s)) return "";
  return s;
}

function metricRowToStats(row, userRating) {
  const count = Number(row?.rating_count || 0);
  const sum = Number(row?.rating_sum || 0);
  return {
    pageViews: Number(row?.page_views || 0),
    zipDownloads: Number(row?.zip_downloads || 0),
    directInstalls: Number(row?.direct_installs || 0),
    downloads:
      Number(row?.zip_downloads || 0) + Number(row?.direct_installs || 0),
    ratingCount: count,
    ratingAverage: count > 0 ? Math.round((sum / count) * 10) / 10 : 0,
    userRating: typeof userRating === "number" ? userRating : null,
  };
}

async function ensureMetricsRow(db, themeKey) {
  await db
    .prepare(
      `INSERT INTO theme_metrics (theme_key) VALUES (?)
       ON CONFLICT(theme_key) DO NOTHING`,
    )
    .bind(themeKey)
    .run();
}

async function incrementMetric(db, themeKey, column) {
  await ensureMetricsRow(db, themeKey);
  await db
    .prepare(
      `UPDATE theme_metrics SET ${column} = ${column} + 1, updated_at = datetime('now')
       WHERE theme_key = ?`,
    )
    .bind(themeKey)
    .run();
}

async function refreshRatingAggregate(db, themeKey) {
  const agg = await db
    .prepare(
      `SELECT COALESCE(SUM(rating), 0) AS s, COUNT(*) AS c
       FROM theme_rating_votes WHERE theme_key = ?`,
    )
    .bind(themeKey)
    .first();
  await ensureMetricsRow(db, themeKey);
  await db
    .prepare(
      `UPDATE theme_metrics
       SET rating_sum = ?, rating_count = ?, updated_at = datetime('now')
       WHERE theme_key = ?`,
    )
    .bind(Number(agg?.s || 0), Number(agg?.c || 0), themeKey)
    .run();
}

export async function handleThemeEventPost(request, env) {
  if (!env.DB) {
    return jsonResponse({ error: "Analytics database not configured." }, 503);
  }
  let body;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON body." }, 400);
  }
  const themeKey = normalizeThemeKey(body.theme || body.themeKey || body.folder);
  const event = String(body.event || "").trim();
  if (!themeKey) return jsonResponse({ error: "Invalid theme key." }, 400);
  if (!EVENTS.has(event)) {
    return jsonResponse({ error: "Invalid event type." }, 400);
  }
  const col =
    event === "page_view"
      ? "page_views"
      : event === "zip_download"
        ? "zip_downloads"
        : "direct_installs";
  try {
    await incrementMetric(env.DB, themeKey, col);
  } catch (err) {
    console.error("theme event", err);
    return jsonResponse({ error: "Could not record event." }, 500);
  }
  return jsonResponse({ ok: true, theme: themeKey, event });
}

export async function handleThemeRatingPost(request, env) {
  if (!env.DB) {
    return jsonResponse({ error: "Analytics database not configured." }, 503);
  }
  let body;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON body." }, 400);
  }
  const themeKey = normalizeThemeKey(body.theme || body.themeKey || body.folder);
  const rating = Number(body.rating);
  const voterId = String(body.voterId || body.visitorId || "").trim().slice(0, 64);
  if (!themeKey) return jsonResponse({ error: "Invalid theme key." }, 400);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return jsonResponse({ error: "Rating must be an integer from 1 to 5." }, 400);
  }
  if (!voterId || voterId.length < 8) {
    return jsonResponse({ error: "Missing visitor id." }, 400);
  }
  try {
    await env.DB.prepare(
      `INSERT INTO theme_rating_votes (theme_key, voter_id, rating, updated_at)
       VALUES (?, ?, ?, datetime('now'))
       ON CONFLICT(theme_key, voter_id) DO UPDATE SET
         rating = excluded.rating,
         updated_at = datetime('now')`,
    )
      .bind(themeKey, voterId, rating)
      .run();
    await refreshRatingAggregate(env.DB, themeKey);
    const row = await env.DB.prepare(
      `SELECT page_views, zip_downloads, direct_installs, rating_sum, rating_count
       FROM theme_metrics WHERE theme_key = ?`,
    )
      .bind(themeKey)
      .first();
    return jsonResponse({
      ok: true,
      theme: themeKey,
      stats: metricRowToStats(row, rating),
    });
  } catch (err) {
    console.error("theme rating", err);
    return jsonResponse({ error: "Could not save rating." }, 500);
  }
}

export async function handleThemeStatsGet(request, env) {
  if (!env.DB) {
    return jsonResponse({ error: "Analytics database not configured." }, 503);
  }
  const url = new URL(request.url);
  const voterId = String(url.searchParams.get("voterId") || "").trim().slice(0, 64);
  const keys = [];
  const single = url.searchParams.get("theme");
  if (single) keys.push(single);
  const list = url.searchParams.get("themes");
  if (list) {
    for (const part of list.split(",")) {
      const k = normalizeThemeKey(part);
      if (k && !keys.includes(k)) keys.push(k);
    }
  }
  if (!keys.length) {
    return jsonResponse({ error: "Provide theme= or themes= query parameter." }, 400);
  }
  if (keys.length > 80) {
    return jsonResponse({ error: "Too many themes requested (max 80)." }, 400);
  }
  const placeholders = keys.map(() => "?").join(",");
  try {
    const { results } = await env.DB.prepare(
      `SELECT theme_key, page_views, zip_downloads, direct_installs, rating_sum, rating_count
       FROM theme_metrics WHERE theme_key IN (${placeholders})`,
    )
      .bind(...keys)
      .all();
    const byKey = new Map();
    for (const row of results || []) {
      byKey.set(row.theme_key, row);
    }
    let userVotes = new Map();
    if (voterId && voterId.length >= 8) {
      const { results: votes } = await env.DB.prepare(
        `SELECT theme_key, rating FROM theme_rating_votes
         WHERE voter_id = ? AND theme_key IN (${placeholders})`,
      )
        .bind(voterId, ...keys)
        .all();
      for (const v of votes || []) {
        userVotes.set(v.theme_key, Number(v.rating));
      }
    }
    const themes = {};
    for (const k of keys) {
      themes[k] = metricRowToStats(byKey.get(k), userVotes.get(k));
    }
    return jsonResponse({ ok: true, themes });
  } catch (err) {
    console.error("theme stats", err);
    return jsonResponse({ error: "Could not load stats." }, 500);
  }
}
