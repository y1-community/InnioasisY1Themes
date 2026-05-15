/**
 * Theme analytics API: page views, download/install events, star ratings (D1).
 * Used by workers/theme-analytics and optionally Cloudflare Pages Functions.
 */

export const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

const THEME_KEY_RE = /^[a-zA-Z0-9][a-zA-Z0-9._\- &()'+!]{0,118}[a-zA-Z0-9.()]?$/;
const EVENTS = new Set(["page_view", "zip_download", "direct_install"]);
const SOURCES = new Set(["gallery", "theme_page", "theme_lookup", "other"]);

const SCHEMA_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS theme_metrics (
  theme_key TEXT PRIMARY KEY NOT NULL,
  page_views INTEGER NOT NULL DEFAULT 0,
  zip_downloads INTEGER NOT NULL DEFAULT 0,
  direct_installs INTEGER NOT NULL DEFAULT 0,
  rating_sum REAL NOT NULL DEFAULT 0,
  rating_count INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
)`,
  `CREATE TABLE IF NOT EXISTS theme_rating_votes (
  theme_key TEXT NOT NULL,
  voter_id TEXT NOT NULL,
  rating REAL NOT NULL CHECK (rating >= 0 AND rating <= 5),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (theme_key, voter_id)
)`,
  `CREATE TABLE IF NOT EXISTS _y1_migrations (
  id TEXT PRIMARY KEY NOT NULL,
  applied_at TEXT NOT NULL DEFAULT (datetime('now'))
)`,
  `CREATE INDEX IF NOT EXISTS idx_theme_rating_votes_theme ON theme_rating_votes (theme_key)`,
  `CREATE TABLE IF NOT EXISTS visitor_preferences (
  voter_id TEXT PRIMARY KEY NOT NULL,
  contribute_analytics INTEGER NOT NULL DEFAULT 1,
  contribute_ratings INTEGER NOT NULL DEFAULT 1,
  hide_ratings_view INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
)`,
];

let schemaReady = false;
let schemaInitPromise = null;

/** Add direct_installs column when theme_metrics predates that field. */
async function migrateDirectInstallsColumn(db) {
  const done = await db
    .prepare(`SELECT 1 AS ok FROM _y1_migrations WHERE id = ?`)
    .bind("direct_installs_v1")
    .first();
  if (done) return;
  try {
    await db
      .prepare(
        `ALTER TABLE theme_metrics ADD COLUMN direct_installs INTEGER NOT NULL DEFAULT 0`,
      )
      .run();
  } catch (_) {
    /* column may already exist */
  }
  await db
    .prepare(`INSERT OR IGNORE INTO _y1_migrations (id) VALUES (?)`)
    .bind("direct_installs_v1")
    .run();
}

/** Migrate legacy 1–5 star votes to 0–5 reaction scale (down=0, up=2.5, heart=5). */
async function migrateRatingSchemaToReactions(db) {
  const done = await db
    .prepare(`SELECT 1 AS ok FROM _y1_migrations WHERE id = ?`)
    .bind("rating_reactions_v1")
    .first();
  if (done) return;
  try {
    const probe = await db
      .prepare(`SELECT rating FROM theme_rating_votes LIMIT 1`)
      .first();
    if (probe && Number(probe.rating) > 0 && Number(probe.rating) <= 5 && !String(probe.rating).includes(".")) {
      await db
        .prepare(
          `UPDATE theme_rating_votes SET rating = CASE rating
             WHEN 1 THEN 0
             WHEN 2 THEN 2.5
             WHEN 3 THEN 2.5
             WHEN 4 THEN 5
             WHEN 5 THEN 5
             ELSE rating END`,
        )
        .run();
    }
  } catch (_) {
    /* table may be empty */
  }
  try {
    await db.prepare(`UPDATE theme_metrics SET rating_sum = (
      SELECT COALESCE(SUM(rating), 0) FROM theme_rating_votes v WHERE v.theme_key = theme_metrics.theme_key
    )`).run();
  } catch (_) {}
  await db
    .prepare(`INSERT OR IGNORE INTO _y1_migrations (id) VALUES (?)`)
    .bind("rating_reactions_v1")
    .run();
}

/** Create D1 tables on first use (Git deploy does not run schema.sql automatically). */
export async function ensureAnalyticsSchema(db) {
  if (!db) return;
  if (schemaReady) return;
  if (!schemaInitPromise) {
    schemaInitPromise = (async () => {
      for (const sql of SCHEMA_STATEMENTS) {
        await db.prepare(sql).run();
      }
      await migrateDirectInstallsColumn(db);
      await migrateRatingSchemaToReactions(db);
      schemaReady = true;
    })().catch((err) => {
      schemaInitPromise = null;
      throw err;
    });
  }
  await schemaInitPromise;
}

const ALLOWED_REACTION_RATINGS = new Set([0, 2.5, 5]);

export function normalizeReactionRating(body) {
  const reaction = String(body?.reaction || body?.type || "")
    .trim()
    .toLowerCase();
  if (reaction === "down" || reaction === "thumbs_down" || reaction === "thumbsdown") return 0;
  if (reaction === "up" || reaction === "thumbs_up" || reaction === "thumbsup") return 2.5;
  if (reaction === "heart" || reaction === "love") return 5;
  const rating = Number(body?.rating);
  if (ALLOWED_REACTION_RATINGS.has(rating)) return rating;
  return null;
}

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
    ratingAverage: count > 0 ? Math.round((sum / count) * 100) / 100 : 0,
    userRating:
      typeof userRating === "number" && !Number.isNaN(userRating) ? userRating : null,
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

function prefsFromRow(row) {
  if (!row) return null;
  return {
    analytics: Number(row.contribute_analytics) === 1,
    ratingsSubmit: Number(row.contribute_ratings) === 1,
    ratingsView: Number(row.hide_ratings_view) !== 1,
  };
}

async function loadVisitorPreferences(db, voterId) {
  if (!voterId) return null;
  const row = await db
    .prepare(
      `SELECT contribute_analytics, contribute_ratings, hide_ratings_view
       FROM visitor_preferences WHERE voter_id = ?`,
    )
    .bind(voterId)
    .first();
  return prefsFromRow(row);
}

async function saveVisitorPreferences(db, voterId, prefs) {
  await db
    .prepare(
      `INSERT INTO visitor_preferences (
         voter_id, contribute_analytics, contribute_ratings, hide_ratings_view, updated_at
       ) VALUES (?, ?, ?, ?, datetime('now'))
       ON CONFLICT(voter_id) DO UPDATE SET
         contribute_analytics = excluded.contribute_analytics,
         contribute_ratings = excluded.contribute_ratings,
         hide_ratings_view = excluded.hide_ratings_view,
         updated_at = datetime('now')`,
    )
    .bind(
      voterId,
      prefs.analytics ? 1 : 0,
      prefs.ratingsSubmit ? 1 : 0,
      prefs.ratingsView ? 0 : 1,
    )
    .run();
}

/** No stored preference means contribute (opt-out only after explicit save). */
async function visitorContributesAnalytics(db, voterId) {
  if (!voterId || voterId.length < 8) return false;
  const p = await loadVisitorPreferences(db, voterId);
  if (!p) return true;
  return p.analytics !== false;
}

async function visitorContributesRatings(db, voterId) {
  if (!voterId || voterId.length < 8) return false;
  const p = await loadVisitorPreferences(db, voterId);
  if (!p) return true;
  return p.ratingsSubmit !== false;
}

export async function handleThemePrivacyGet(request, env) {
  if (!env.DB) {
    return jsonResponse({ error: "Analytics database not configured." }, 503);
  }
  try {
    await ensureAnalyticsSchema(env.DB);
  } catch (err) {
    console.error("schema init", err);
    return jsonResponse({ error: "Analytics database not ready." }, 503);
  }
  const url = new URL(request.url);
  const voterId = String(url.searchParams.get("voterId") || "").trim().slice(0, 64);
  if (!voterId || voterId.length < 8) {
    return jsonResponse({ error: "Missing voterId." }, 400);
  }
  try {
    const prefs = await loadVisitorPreferences(env.DB, voterId);
    return jsonResponse({
      ok: true,
      stored: !!prefs,
      preferences: prefs || {
        analytics: true,
        ratingsSubmit: true,
        ratingsView: true,
      },
    });
  } catch (err) {
    console.error("theme privacy get", err);
    return jsonResponse({ error: "Could not load preferences." }, 500);
  }
}

export async function handleThemePrivacyPost(request, env) {
  if (!env.DB) {
    return jsonResponse({ error: "Analytics database not configured." }, 503);
  }
  try {
    await ensureAnalyticsSchema(env.DB);
  } catch (err) {
    console.error("schema init", err);
    return jsonResponse({ error: "Analytics database not ready." }, 503);
  }
  let body;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON body." }, 400);
  }
  const voterId = String(body.voterId || body.visitorId || "").trim().slice(0, 64);
  if (!voterId || voterId.length < 8) {
    return jsonResponse({ error: "Missing visitor id." }, 400);
  }
  const prefs = {
    analytics: body.analytics !== false,
    ratingsSubmit: body.ratingsSubmit !== false,
    ratingsView: body.ratingsView !== false,
  };
  try {
    await saveVisitorPreferences(env.DB, voterId, prefs);
    return jsonResponse({ ok: true, preferences: prefs });
  } catch (err) {
    console.error("theme privacy post", err);
    return jsonResponse({ error: "Could not save preferences." }, 500);
  }
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
  try {
    await ensureAnalyticsSchema(env.DB);
  } catch (err) {
    console.error("schema init", err);
    return jsonResponse({ error: "Analytics database not ready." }, 503);
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
  const voterId = String(body.voterId || body.visitorId || "").trim().slice(0, 64);
  if (!(await visitorContributesAnalytics(env.DB, voterId))) {
    return jsonResponse({ ok: true, theme: themeKey, event, recorded: false });
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
  return jsonResponse({ ok: true, theme: themeKey, event, recorded: true });
}

export async function handleThemeRatingPost(request, env) {
  if (!env.DB) {
    return jsonResponse({ error: "Analytics database not configured." }, 503);
  }
  try {
    await ensureAnalyticsSchema(env.DB);
  } catch (err) {
    console.error("schema init", err);
    return jsonResponse({ error: "Analytics database not ready." }, 503);
  }
  let body;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON body." }, 400);
  }
  const themeKey = normalizeThemeKey(body.theme || body.themeKey || body.folder);
  const rating = normalizeReactionRating(body);
  const voterId = String(body.voterId || body.visitorId || "").trim().slice(0, 64);
  if (!themeKey) return jsonResponse({ error: "Invalid theme key." }, 400);
  if (rating === null) {
    return jsonResponse({
      error: "Rating must be thumbs down (0), thumbs up (2.5), or heart (5).",
    }, 400);
  }
  if (!voterId || voterId.length < 8) {
    return jsonResponse({ error: "Missing visitor id." }, 400);
  }
  if (!(await visitorContributesRatings(env.DB, voterId))) {
    return jsonResponse({
      ok: true,
      theme: themeKey,
      recorded: false,
      message: "Ratings contribution is disabled for this visitor.",
    });
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
  try {
    await ensureAnalyticsSchema(env.DB);
  } catch (err) {
    console.error("schema init", err);
    return jsonResponse({ error: "Analytics database not ready." }, 503);
  }
  const url = new URL(request.url);
  const voterId = String(url.searchParams.get("voterId") || "").trim().slice(0, 64);
  const keys = [];
  const single = url.searchParams.get("theme");
  if (single) {
    const k = normalizeThemeKey(single);
    if (k) keys.push(k);
  }
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
