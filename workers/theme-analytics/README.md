# y1-theme-analytics (Cloudflare Worker + D1)

Public API for **unified theme statistics** (page views, ZIP downloads, direct installs) and **star ratings**, consumed by the static gallery on GitHub Pages / `themes.innioasis.app`.

## Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/api/theme-event` | `{ "theme": "FolderName", "event": "page_view" \| "zip_download" \| "direct_install", "source": "gallery" \| "theme_page" }` |
| `GET` | `/api/theme-stats?themes=A,B&voterId=…` | Batch stats + optional user rating |
| `POST` | `/api/theme-rating` | `{ "theme": "FolderName", "rating": 0 \| 2.5 \| 5, "reaction": "down" \| "up" \| "heart", "voterId": "…" }` — average shown as 0–5 |
| `GET` | `/api/theme-privacy?voterId=…` | Load stored opt-in flags (`stored: true` when a row exists) |
| `POST` | `/api/theme-privacy` | `{ "voterId": "…", "analytics": bool, "ratingsSubmit": bool, "ratingsView": bool }` |

Visitors **opt out by default**: events and ratings increment only when preferences are saved with the corresponding flag enabled. Public stats remain readable for everyone.

CORS allows browser calls from the static site origin.

## Deploy

### Fix Git deploy error `10181` (placeholder database_id)

If CI logs show `database '00000000-0000-0000-0000-000000000000' which was not found`:

1. Open **Cloudflare Dashboard** → **Storage & Databases** → **D1**.
2. Open **`y1-theme-metrics`** (create it first if missing: **Create database**).
3. Copy **Database ID** (a real UUID, not all zeros).
4. Paste it into `workers/theme-analytics/wrangler.toml` as `database_id = "…"`.
5. Commit, push to `main`, or click **Retry deployment**.

Then apply tables once:

```bash
cd workers/theme-analytics
npx wrangler d1 execute y1-theme-metrics --remote --file=./schema.sql
```

### First-time (CLI)

```bash
cd workers/theme-analytics
npx wrangler d1 create y1-theme-metrics
# Set database_id in wrangler.toml from the command output
npx wrangler d1 execute y1-theme-metrics --remote --file=./schema.sql
npx wrangler deploy
```

Point the site at the Worker (meta tag on gallery pages):

```html
<meta name="cf-theme-analytics-origin" content="https://y1-theme-analytics.<subdomain>.workers.dev" />
```

Shared handler: [`functions/_lib/theme-analytics-handler.js`](../../functions/_lib/theme-analytics-handler.js).

Client: [`theme-analytics.js`](../../theme-analytics.js) + [`theme-analytics.css`](../../theme-analytics.css).
