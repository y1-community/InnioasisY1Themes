-- D1 schema for theme page views, downloads, and star ratings.
-- Apply: npx wrangler d1 execute y1-theme-metrics --remote --file=./schema.sql

CREATE TABLE IF NOT EXISTS theme_metrics (
  theme_key TEXT PRIMARY KEY NOT NULL,
  page_views INTEGER NOT NULL DEFAULT 0,
  zip_downloads INTEGER NOT NULL DEFAULT 0,
  direct_installs INTEGER NOT NULL DEFAULT 0,
  rating_sum REAL NOT NULL DEFAULT 0,
  rating_count INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS theme_rating_votes (
  theme_key TEXT NOT NULL,
  voter_id TEXT NOT NULL,
  rating REAL NOT NULL CHECK (rating >= 0 AND rating <= 5),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (theme_key, voter_id)
);

CREATE INDEX IF NOT EXISTS idx_theme_rating_votes_theme ON theme_rating_votes (theme_key);

CREATE TABLE IF NOT EXISTS visitor_preferences (
  voter_id TEXT PRIMARY KEY NOT NULL,
  contribute_analytics INTEGER NOT NULL DEFAULT 1,
  contribute_ratings INTEGER NOT NULL DEFAULT 1,
  hide_ratings_view INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
