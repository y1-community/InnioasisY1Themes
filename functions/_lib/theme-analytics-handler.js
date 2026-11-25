/**
 * Theme analytics API: page views, download/install events, star ratings (D1).
 * Used by workers/theme-analytics and optionally Cloudflare Pages Functions.
 *
 * Quota & reliability architecture (Cloudflare Free Tier):
 * - Lazy schema init ONLY if a query fails with "no such table/column" (zero cold-start DDL queries).
 * - Covering index idx_theme_rating_votes_voter(voter_id, theme_key, rating) turns voter lookups from
 *   full-table scans into 0-3 row indexed reads.
 * - Two-tier cache for theme_metrics (isolate memory + Cloudflare Edge Cache API, 5m TTL / 60m stale)
 *   serves ALL public/batched/single stats reads with ~0 D1 rows read on cache hit.
 * - Single-query atomic upserts with RETURNING cut event writes from 4 D1 queries to 1-2.
 * - Bot/crawler filtering skips D1 writes from search/SEO/AI crawlers.
 * - Accepts both application/json and text/plain JSON bodies so clients skip CORS OPTIONS preflights.
 * - D1 quota/overload circuit breaker enters 5m cooldown and serves stale cache / degraded 200s so
 *   analytics never triggers client retry storms or exhausts shared account Worker request quotas.
 */

export const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Max-Age": "86400",
};

function isAllowedCredentialOrigin(origin) {
  if (!origin) return false;
  try {
    const u = new URL(origin);
    const host = u.hostname.toLowerCase();
    if (
      host === "themes.innioasis.app" ||
      host === "innioasis.app" ||
      host.endsWith(".innioasis.app") ||
      host.endsWith(".pages.dev") ||
      host === "localhost" ||
      host === "127.0.0.1"
    ) {
      return u.protocol === "https:" || host === "localhost" || host === "127.0.0.1";
    }
  } catch (_) {}
  return false;
}

/** Echo trusted origins with Allow-Credentials so even sendBeacon requests pass CORS preflight. */
export function corsHeadersFor(request) {
  const origin = request && request.headers ? String(request.headers.get("Origin") || "").trim() : "";
  if (isAllowedCredentialOrigin(origin)) {
    return {
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Credentials": "true",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Max-Age": "86400",
      Vary: "Origin",
    };
  }
  return CORS_HEADERS;
}

const EVENTS = new Set(["page_view", "zip_download", "direct_install"]);

const BOT_UA_RE =
  /googlebot|google-inspectiontool|mediapartners-google|adsbot|apis-google|feedfetcher|bingbot|bingpreview|msnbot|slurp|duckduckbot|baiduspider|yandex(?:bot|images|mobile)|applebot|ahrefsbot|semrushbot|mj12bot|dotbot|petalbot|bytespider|gptbot|oai-searchbot|claudebot|anthropic-ai|ccbot|perplexitybot|amazonbot|facebookexternalhit|facebot|twitterbot|linkedinbot|slackbot|discordbot|whatsapp|telegrambot|embedly|pinterestbot|quora link preview|uptimerobot|pingdom|statuscake|datadog|newrelic|pagespeed|lighthouse|gtmetrix|scrapy|python-requests|python-urllib|go-http-client|^curl\/|^wget\/|^axios\/|^node-fetch|^undici/i;

function isCrawlerRequest(request) {
  const ua = request && request.headers ? String(request.headers.get("User-Agent") || "") : "";
  if (!ua) return false;
  return BOT_UA_RE.test(ua);
}

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
  `CREATE INDEX IF NOT EXISTS idx_theme_rating_votes_voter ON theme_rating_votes (voter_id, theme_key, rating)`,
  `CREATE TABLE IF NOT EXISTS visitor_preferences (
  voter_id TEXT PRIMARY KEY NOT NULL,
  contribute_analytics INTEGER NOT NULL DEFAULT 1,
  contribute_ratings INTEGER NOT NULL DEFAULT 1,
  hide_ratings_view INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
)`,
];

let schemaInitPromise = null;

async function migrateDirectInstallsColumn(db) {
  const done = await db
    .prepare(`SELECT 1 AS ok FROM _y1_migrations WHERE id = ?`)
    .bind("direct_installs_v1")
    .first();
  if (done) return;
  try {
    await db
      .prepare(`ALTER TABLE theme_metrics ADD COLUMN direct_installs INTEGER NOT NULL DEFAULT 0`)
      .run();
  } catch (_) {}
  await db
    .prepare(`INSERT OR IGNORE INTO _y1_migrations (id) VALUES (?)`)
    .bind("direct_installs_v1")
    .run();
}

async function migrateRatingSchemaToReactions(db) {
  const done = await db
    .prepare(`SELECT 1 AS ok FROM _y1_migrations WHERE id = ?`)
    .bind("rating_reactions_v1")
    .first();
  if (done) return;
  try {
    const probe = await db.prepare(`SELECT rating FROM theme_rating_votes LIMIT 1`).first();
    if (
      probe &&
      Number(probe.rating) > 0 &&
      Number(probe.rating) <= 5 &&
      !String(probe.rating).includes(".")
    ) {
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
  } catch (_) {}
  try {
    await db
      .prepare(
        `UPDATE theme_metrics SET rating_sum = (
           SELECT COALESCE(SUM(rating), 0) FROM theme_rating_votes v WHERE v.theme_key = theme_metrics.theme_key
         )`,
      )
      .run();
  } catch (_) {}
  await db
    .prepare(`INSERT OR IGNORE INTO _y1_migrations (id) VALUES (?)`)
    .bind("rating_reactions_v1")
    .run();
}

/** Only called lazily when a fresh/uninitialized D1 reports missing tables or columns. */
export async function ensureAnalyticsSchema(db) {
  if (!db) return;
  if (!schemaInitPromise) {
    schemaInitPromise = (async () => {
      for (const sql of SCHEMA_STATEMENTS) {
        await db.prepare(sql).run();
      }
      await migrateDirectInstallsColumn(db);
      await migrateRatingSchemaToReactions(db);
    })().catch((err) => {
      schemaInitPromise = null;
      throw err;
    });
  }
  await schemaInitPromise;
}

function isMissingSchemaError(err) {
  const msg = String(err && (err.message || err.cause || err) || "").toLowerCase();
  return msg.includes("no such table") || msg.includes("no such column");
}

function isD1QuotaOrOverloadError(err) {
  const msg = String(err && (err.message || err.cause || err) || "").toLowerCase();
  return (
    msg.includes("exceeded") ||
    msg.includes("daily limit") ||
    msg.includes("quota") ||
    msg.includes("rate limit") ||
    msg.includes("too many requests") ||
    msg.includes("429") ||
    msg.includes("overload") ||
    msg.includes("sqlite_busy") ||
    msg.includes("capacity") ||
    msg.includes("temporarily unavailable")
  );
}

/* Isolate-level D1 cooldown when quota/rate limit trips. */
const D1_COOLDOWN_MS = 5 * 60 * 1000;
let d1DegradedUntil = 0;

function isD1Degraded() {
  return Date.now() < d1DegradedUntil;
}

function noteD1Error(err) {
  if (isD1QuotaOrOverloadError(err)) {
    d1DegradedUntil = Date.now() + D1_COOLDOWN_MS;
    return true;
  }
  return false;
}

async function runWithSchemaFallback(db, fn) {
  try {
    return await fn();
  } catch (err) {
    if (isMissingSchemaError(err)) {
      await ensureAnalyticsSchema(db);
      return await fn();
    }
    throw err;
  }
}

/* Two-tier cache for the public theme_metrics table (isolate memory + Cloudflare Edge Cache). */
const METRICS_CACHE_KEY_URL = "https://y1-theme-analytics.internal/cache/theme-metrics-all-v2";
const METRICS_FRESH_TTL_MS = 10 * 60 * 1000;
const METRICS_STALE_TTL_MS = 60 * 60 * 1000;
const METRICS_EDGE_MAX_AGE_S = 600;
let metricsMemCache = null; // { ts: number, rows: Record<string, CompactRow> }
let metricsFetchInFlight = null;

function compactMetricRow(row) {
  return {
    page_views: Number(row?.page_views || 0),
    zip_downloads: Number(row?.zip_downloads || 0),
    direct_installs: Number(row?.direct_installs || 0),
    rating_sum: Number(row?.rating_sum || 0),
    rating_count: Number(row?.rating_count || 0),
  };
}

function patchMetricsMemCache(themeKey, row) {
  if (!metricsMemCache || !metricsMemCache.rows || !themeKey || !row) return;
  metricsMemCache.rows[themeKey] = compactMetricRow(row);
}

async function readEdgeMetricsCache() {
  try {
    if (typeof caches === "undefined" || !caches.default) return null;
    const hit = await caches.default.match(METRICS_CACHE_KEY_URL);
    if (!hit) return null;
    const payload = await hit.json();
    if (!payload || !payload.rows || typeof payload.rows !== "object") return null;
    return { ts: Number(payload.ts) || Date.now(), rows: payload.rows };
  } catch (_) {
    return null;
  }
}

function writeEdgeMetricsCache(payload, ctx) {
  try {
    if (typeof caches === "undefined" || !caches.default) return;
    const res = new Response(JSON.stringify(payload), {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": `public, max-age=${METRICS_EDGE_MAX_AGE_S}`,
      },
    });
    const p = caches.default.put(METRICS_CACHE_KEY_URL, res).catch(() => {});
    if (ctx && typeof ctx.waitUntil === "function") {
      ctx.waitUntil(p);
    }
  } catch (_) {}
}

/**
 * Load all public theme_metrics rows from memory -> Edge Cache -> single deduplicated D1 scan.
 * Never hammers D1 during cooldown; returns stale snapshot when degraded.
 */
async function loadAllMetricsSnapshot(db, ctx) {
  const now = Date.now();
  if (metricsMemCache && now - metricsMemCache.ts < METRICS_FRESH_TTL_MS) {
    return { rows: metricsMemCache.rows, source: "HIT-MEM", degraded: false };
  }

  const edge = await readEdgeMetricsCache();
  if (edge && now - edge.ts < METRICS_FRESH_TTL_MS) {
    metricsMemCache = edge;
    return { rows: edge.rows, source: "HIT-EDGE", degraded: false };
  }

  if (isD1Degraded()) {
    const stale =
      (metricsMemCache && now - metricsMemCache.ts < METRICS_STALE_TTL_MS && metricsMemCache.rows) ||
      (edge && edge.rows) ||
      {};
    return { rows: stale, source: "STALE-COOLDOWN", degraded: true };
  }

  if (!metricsFetchInFlight) {
    metricsFetchInFlight = (async () => {
      try {
        const { results } = await runWithSchemaFallback(db, () =>
          db
            .prepare(
              `SELECT theme_key, page_views, zip_downloads, direct_installs, rating_sum, rating_count
               FROM theme_metrics`,
            )
            .all(),
        );
        const rows = {};
        for (const row of results || []) {
          if (!row || !row.theme_key) continue;
          rows[row.theme_key] = compactMetricRow(row);
        }
        const snapshot = { ts: Date.now(), rows };
        metricsMemCache = snapshot;
        writeEdgeMetricsCache(snapshot, ctx);
        return { rows, source: "MISS", degraded: false };
      } catch (err) {
        noteD1Error(err);
        const stale =
          (metricsMemCache && now - metricsMemCache.ts < METRICS_STALE_TTL_MS && metricsMemCache.rows) ||
          (edge && edge.rows) ||
          null;
        if (stale) {
          return { rows: stale, source: "STALE-ERR", degraded: true };
        }
        throw err;
      } finally {
        metricsFetchInFlight = null;
      }
    })();
  }
  return await metricsFetchInFlight;
}

/* Isolate-level LRU cache for visitor_preferences (avoids repeated 1-row reads per active visitor). */
const PREFS_CACHE_TTL_MS = 10 * 60 * 1000;
const PREFS_CACHE_MAX = 2000;
const prefsMemCache = new Map(); // voterId -> { ts, prefs }

function getCachedPrefs(voterId) {
  const entry = prefsMemCache.get(voterId);
  if (!entry) return undefined;
  if (Date.now() - entry.ts > PREFS_CACHE_TTL_MS) {
    prefsMemCache.delete(voterId);
    return undefined;
  }
  return entry.prefs;
}

function setCachedPrefs(voterId, prefs) {
  if (!voterId) return;
  if (prefsMemCache.size >= PREFS_CACHE_MAX) {
    const firstKey = prefsMemCache.keys().next().value;
    if (firstKey !== undefined) prefsMemCache.delete(firstKey);
  }
  prefsMemCache.set(voterId, { ts: Date.now(), prefs });
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

async function parseJsonBody(request) {
  const raw = await request.text();
  if (!raw) return null;
  return JSON.parse(raw);
}

function jsonResponse(body, status = 200, request = null, extraHeaders = null) {
  const base = corsHeadersFor(request);
  const headers = extraHeaders ? { ...base, ...extraHeaders } : base;
  return Response.json(body, { status, headers });
}

export function handleAnalyticsOptions(request = null) {
  return new Response(null, { status: 204, headers: corsHeadersFor(request) });
}

export function handleAnalyticsHealth(request = null, env = null) {
  const degraded = isD1Degraded();
  return jsonResponse(
    {
      ok: true,
      worker: "y1-theme-analytics",
      configured: Boolean(env && env.DB),
      degraded,
      cacheHot: Boolean(metricsMemCache && Date.now() - metricsMemCache.ts < METRICS_FRESH_TTL_MS),
    },
    200,
    request,
    { "Cache-Control": "no-store" },
  );
}

export function normalizeThemeKey(raw) {
  const s = String(raw || "")
    .trim()
    .replace(/^\.\/+/, "")
    .replace(/\/+$/, "");
  if (!s || s.includes("..") || s.includes("/")) return "";
  if (s.length > 240) return "";
  return s;
}

function metricRowToStats(row, userRating) {
  const count = Number(row?.rating_count || 0);
  const sum = Number(row?.rating_sum || 0);
  return {
    pageViews: Number(row?.page_views || 0),
    zipDownloads: Number(row?.zip_downloads || 0),
    directInstalls: Number(row?.direct_installs || 0),
    downloads: Number(row?.zip_downloads || 0) + Number(row?.direct_installs || 0),
    ratingCount: count,
    ratingAverage: count > 0 ? Math.round((sum / count) * 100) / 100 : 0,
    userRating:
      typeof userRating === "number" && !Number.isNaN(userRating) ? userRating : null,
  };
}

/** Single-query atomic increment + RETURNING (replaces 3 sequential D1 queries). */
async function incrementMetricAndFetch(db, themeKey, column) {
  return await runWithSchemaFallback(db, () =>
    db
      .prepare(
        `INSERT INTO theme_metrics (theme_key, ${column}, updated_at)
         VALUES (?, 1, datetime('now'))
         ON CONFLICT(theme_key) DO UPDATE SET
           ${column} = ${column} + 1,
           updated_at = datetime('now')
         RETURNING page_views, zip_downloads, direct_installs, rating_sum, rating_count`,
      )
      .bind(themeKey)
      .first(),
  );
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
  const cached = getCachedPrefs(voterId);
  if (cached !== undefined) return cached;
  const row = await runWithSchemaFallback(db, () =>
    db
      .prepare(
        `SELECT contribute_analytics, contribute_ratings, hide_ratings_view
         FROM visitor_preferences WHERE voter_id = ?`,
      )
      .bind(voterId)
      .first(),
  );
  const parsed = prefsFromRow(row);
  setCachedPrefs(voterId, parsed);
  return parsed;
}

async function saveVisitorPreferences(db, voterId, prefs) {
  await runWithSchemaFallback(db, () =>
    db
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
      .run(),
  );
  setCachedPrefs(voterId, prefs);
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
    return jsonResponse({ error: "Analytics database not configured." }, 503, request);
  }
  const url = new URL(request.url);
  const voterId = String(url.searchParams.get("voterId") || "").trim().slice(0, 64);
  if (!voterId || voterId.length < 8) {
    return jsonResponse({ error: "Missing voterId." }, 400, request);
  }
  if (isD1Degraded()) {
    return jsonResponse(
      {
        ok: true,
        stored: false,
        degraded: true,
        preferences: { analytics: true, ratingsSubmit: true, ratingsView: true },
      },
      200,
      request,
    );
  }
  try {
    const prefs = await loadVisitorPreferences(env.DB, voterId);
    return jsonResponse(
      {
        ok: true,
        stored: !!prefs,
        preferences: prefs || {
          analytics: true,
          ratingsSubmit: true,
          ratingsView: true,
        },
      },
      200,
      request,
      { "Cache-Control": "private, max-age=120" },
    );
  } catch (err) {
    noteD1Error(err);
    console.error("theme privacy get", err);
    return jsonResponse({ error: "Could not load preferences." }, 500, request);
  }
}

export async function handleThemePrivacyPost(request, env) {
  if (!env.DB) {
    return jsonResponse({ error: "Analytics database not configured." }, 503, request);
  }
  let body;
  try {
    body = await parseJsonBody(request);
  } catch {
    return jsonResponse({ error: "Invalid JSON body." }, 400, request);
  }
  if (!body || typeof body !== "object") {
    return jsonResponse({ error: "Invalid JSON body." }, 400, request);
  }
  const voterId = String(body.voterId || body.visitorId || "").trim().slice(0, 64);
  if (!voterId || voterId.length < 8) {
    return jsonResponse({ error: "Missing visitor id." }, 400, request);
  }
  const prefs = {
    analytics: body.analytics !== false,
    ratingsSubmit: body.ratingsSubmit !== false,
    ratingsView: body.ratingsView !== false,
  };
  if (isD1Degraded()) {
    setCachedPrefs(voterId, prefs);
    return jsonResponse({ ok: true, preferences: prefs, degraded: true }, 200, request);
  }
  try {
    await saveVisitorPreferences(env.DB, voterId, prefs);
    return jsonResponse({ ok: true, preferences: prefs }, 200, request);
  } catch (err) {
    noteD1Error(err);
    console.error("theme privacy post", err);
    return jsonResponse({ error: "Could not save preferences." }, 500, request);
  }
}

/** Recompute theme rating aggregate and return updated row in 2 queries instead of 4. */
async function refreshRatingAggregateAndFetch(db, themeKey) {
  const agg = await runWithSchemaFallback(db, () =>
    db
      .prepare(
        `SELECT COALESCE(SUM(rating), 0) AS s, COUNT(*) AS c
         FROM theme_rating_votes WHERE theme_key = ?`,
      )
      .bind(themeKey)
      .first(),
  );
  return await runWithSchemaFallback(db, () =>
    db
      .prepare(
        `INSERT INTO theme_metrics (theme_key, rating_sum, rating_count, updated_at)
         VALUES (?, ?, ?, datetime('now'))
         ON CONFLICT(theme_key) DO UPDATE SET
           rating_sum = excluded.rating_sum,
           rating_count = excluded.rating_count,
           updated_at = datetime('now')
         RETURNING page_views, zip_downloads, direct_installs, rating_sum, rating_count`,
      )
      .bind(themeKey, Number(agg?.s || 0), Number(agg?.c || 0))
      .first(),
  );
}

export async function handleThemeEventPost(request, env, _ctx = null) {
  if (!env.DB) {
    return jsonResponse({ error: "Analytics database not configured." }, 503, request);
  }
  if (isCrawlerRequest(request)) {
    return jsonResponse({ ok: true, recorded: false, skipped: "bot" }, 200, request);
  }
  let body;
  try {
    body = await parseJsonBody(request);
  } catch {
    return jsonResponse({ error: "Invalid JSON body." }, 400, request);
  }
  if (!body || typeof body !== "object") {
    return jsonResponse({ error: "Invalid JSON body." }, 400, request);
  }
  const themeKey = normalizeThemeKey(body.theme || body.themeKey || body.folder);
  const event = String(body.event || "").trim();
  if (!themeKey) return jsonResponse({ error: "Invalid theme key." }, 400, request);
  if (!EVENTS.has(event)) {
    return jsonResponse({ error: "Invalid event type." }, 400, request);
  }
  if (isD1Degraded()) {
    return jsonResponse(
      { ok: true, theme: themeKey, event, recorded: false, degraded: true },
      200,
      request,
      { "X-Analytics-Degraded": "1" },
    );
  }
  const voterId = String(body.voterId || body.visitorId || "").trim().slice(0, 64);
  try {
    if (!(await visitorContributesAnalytics(env.DB, voterId))) {
      return jsonResponse({ ok: true, theme: themeKey, event, recorded: false }, 200, request);
    }
    const col =
      event === "page_view"
        ? "page_views"
        : event === "zip_download"
          ? "zip_downloads"
          : "direct_installs";
    const row = await incrementMetricAndFetch(env.DB, themeKey, col);
    patchMetricsMemCache(themeKey, row);
    return jsonResponse(
      {
        ok: true,
        theme: themeKey,
        event,
        recorded: true,
        stats: metricRowToStats(row, null),
      },
      200,
      request,
    );
  } catch (err) {
    if (noteD1Error(err)) {
      return jsonResponse(
        { ok: true, theme: themeKey, event, recorded: false, degraded: true },
        200,
        request,
        { "X-Analytics-Degraded": "1" },
      );
    }
    console.error("theme event", err);
    return jsonResponse({ error: "Could not record event." }, 500, request);
  }
}

export async function handleThemeRatingPost(request, env, _ctx = null) {
  if (!env.DB) {
    return jsonResponse({ error: "Analytics database not configured." }, 503, request);
  }
  if (isCrawlerRequest(request)) {
    return jsonResponse({ ok: true, recorded: false, skipped: "bot" }, 200, request);
  }
  let body;
  try {
    body = await parseJsonBody(request);
  } catch {
    return jsonResponse({ error: "Invalid JSON body." }, 400, request);
  }
  if (!body || typeof body !== "object") {
    return jsonResponse({ error: "Invalid JSON body." }, 400, request);
  }
  const themeKey = normalizeThemeKey(body.theme || body.themeKey || body.folder);
  const rating = normalizeReactionRating(body);
  const voterId = String(body.voterId || body.visitorId || "").trim().slice(0, 64);
  if (!themeKey) return jsonResponse({ error: "Invalid theme key." }, 400, request);
  if (rating === null) {
    return jsonResponse(
      {
        error: "Rating must be thumbs down (0), thumbs up (2.5), or heart (5).",
      },
      400,
      request,
    );
  }
  if (!voterId || voterId.length < 8) {
    return jsonResponse({ error: "Missing visitor id." }, 400, request);
  }
  if (isD1Degraded()) {
    return jsonResponse(
      { error: "Analytics temporarily busy. Please try rating again shortly." },
      503,
      request,
      { "Retry-After": "300", "X-Analytics-Degraded": "1" },
    );
  }
  try {
    if (!(await visitorContributesRatings(env.DB, voterId))) {
      return jsonResponse(
        {
          ok: true,
          theme: themeKey,
          recorded: false,
          message: "Ratings contribution is disabled for this visitor.",
        },
        200,
        request,
      );
    }
    await runWithSchemaFallback(env.DB, () =>
      env.DB.prepare(
        `INSERT INTO theme_rating_votes (theme_key, voter_id, rating, updated_at)
         VALUES (?, ?, ?, datetime('now'))
         ON CONFLICT(theme_key, voter_id) DO UPDATE SET
           rating = excluded.rating,
           updated_at = datetime('now')`,
      )
        .bind(themeKey, voterId, rating)
        .run(),
    );
    const row = await refreshRatingAggregateAndFetch(env.DB, themeKey);
    patchMetricsMemCache(themeKey, row);
    return jsonResponse(
      {
        ok: true,
        theme: themeKey,
        stats: metricRowToStats(row, rating),
      },
      200,
      request,
    );
  } catch (err) {
    if (noteD1Error(err)) {
      return jsonResponse(
        { error: "Analytics temporarily busy. Please try rating again shortly." },
        503,
        request,
        { "Retry-After": "300", "X-Analytics-Degraded": "1" },
      );
    }
    console.error("theme rating", err);
    return jsonResponse({ error: "Could not save rating." }, 500, request);
  }
}

async function loadVoterRatingsMap(db, voterId) {
  const userVotes = new Map();
  if (!voterId || voterId.length < 8 || isD1Degraded()) return userVotes;
  try {
    // Uses covering index idx_theme_rating_votes_voter(voter_id, theme_key, rating) -> 0-3 rows read.
    const { results: votes } = await runWithSchemaFallback(db, () =>
      db
        .prepare(`SELECT theme_key, rating FROM theme_rating_votes WHERE voter_id = ?`)
        .bind(voterId)
        .all(),
    );
    for (const v of votes || []) {
      if (v && v.theme_key) userVotes.set(v.theme_key, Number(v.rating));
    }
  } catch (err) {
    noteD1Error(err);
  }
  return userVotes;
}

export async function handleThemeStatsGet(request, env, ctx = null) {
  if (!env.DB) {
    return jsonResponse({ error: "Analytics database not configured." }, 503, request);
  }
  const url = new URL(request.url);
  const voterId = String(url.searchParams.get("voterId") || "").trim().slice(0, 64);
  const votesOnly = url.searchParams.get("votesOnly") === "1";
  const fetchAll = url.searchParams.get("all") === "1";

  // Dedicated ultra-cheap endpoint for a single visitor's own ratings (covering index: 0-3 rows).
  if (votesOnly) {
    if (!voterId || voterId.length < 8) {
      return jsonResponse({ ok: true, votesOnly: true, votes: {} }, 200, request, {
        "Cache-Control": "private, max-age=120",
      });
    }
    const userVotes = await loadVoterRatingsMap(env.DB, voterId);
    const votes = {};
    for (const [k, v] of userVotes.entries()) votes[k] = v;
    return jsonResponse({ ok: true, votesOnly: true, votes }, 200, request, {
      "Cache-Control": "private, max-age=120",
    });
  }

  if (fetchAll) {
    try {
      const snapshot = await loadAllMetricsSnapshot(env.DB, ctx);
      const userVotes =
        voterId && voterId.length >= 8 ? await loadVoterRatingsMap(env.DB, voterId) : new Map();
      const themes = {};
      for (const key of Object.keys(snapshot.rows)) {
        themes[key] = metricRowToStats(snapshot.rows[key], userVotes.get(key));
      }
      for (const [votedKey, rating] of userVotes.entries()) {
        if (!themes[votedKey]) {
          themes[votedKey] = metricRowToStats(null, rating);
        }
      }
      const headers = {
        ...corsHeadersFor(request),
        "Cache-Control": voterId
          ? "private, max-age=60"
          : "public, max-age=300, stale-while-revalidate=900",
        "X-Analytics-Cache": snapshot.source,
      };
      if (snapshot.degraded) headers["X-Analytics-Degraded"] = "1";
      return Response.json(
        { ok: true, all: true, degraded: snapshot.degraded || undefined, themes },
        { status: 200, headers },
      );
    } catch (err) {
      noteD1Error(err);
      console.error("theme stats all", err);
      return jsonResponse({ error: "Could not load stats." }, 500, request);
    }
  }

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
    return jsonResponse({ error: "Provide theme= or themes= query parameter." }, 400, request);
  }
  if (keys.length > 80) {
    return jsonResponse({ error: "Too many themes requested (max 80)." }, 400, request);
  }
  try {
    // Serve single/chunked lookups from the same cached snapshot (0 extra D1 scans!).
    const snapshot = await loadAllMetricsSnapshot(env.DB, ctx);
    const userVotes =
      voterId && voterId.length >= 8 ? await loadVoterRatingsMap(env.DB, voterId) : new Map();
    const themes = {};
    for (const k of keys) {
      themes[k] = metricRowToStats(snapshot.rows[k], userVotes.get(k));
    }
    const headers = {
      "Cache-Control": voterId
        ? "private, max-age=60"
        : "public, max-age=300, stale-while-revalidate=900",
      "X-Analytics-Cache": snapshot.source,
    };
    if (snapshot.degraded) headers["X-Analytics-Degraded"] = "1";
    return jsonResponse({ ok: true, themes }, 200, request, headers);
  } catch (err) {
    noteD1Error(err);
    console.error("theme stats", err);
    return jsonResponse({ error: "Could not load stats." }, 500, request);
  }
}
