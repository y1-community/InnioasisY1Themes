# y1-theme-analytics (Cloudflare Worker + D1)

Public API for **unified theme statistics** (page views, ZIP downloads, direct installs) and **star ratings**, consumed by the static gallery on GitHub Pages / `themes.innioasis.app`.

## Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/api/theme-event` | `{ "theme": "FolderName", "event": "page_view" \| "zip_download" \| "direct_install", "source": "gallery" \| "theme_page" }` |
| `GET` | `/api/theme-stats?themes=A,B&voterId=…` | Batch stats + optional user rating |
| `POST` | `/api/theme-rating` | `{ "theme": "FolderName", "rating": 1-5, "voterId": "…" }` |

CORS allows browser calls from the static site origin.

## Deploy

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
