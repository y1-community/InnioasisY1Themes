# y1-theme-upload (Cloudflare Worker)

Standalone Worker that exposes **POST/OPTIONS** `https://<worker>/api/upload-theme` for theme ZIP uploads (same behavior as [`functions/api/upload-theme.js`](../../functions/api/upload-theme.js) on Cloudflare Pages). Use this when the static site is on **GitHub Pages** or any host that cannot run Pages Functions.

Shared logic lives in [`functions/_lib/theme-upload-handler.js`](../../functions/_lib/theme-upload-handler.js).

## Deploy

### Local (from this folder)

```bash
cd workers/theme-upload
npx wrangler deploy
```

### Cloudflare dashboard: Git-connected Worker

The root [`wrangler.toml`](../../wrangler.toml) is **Pages-only** (no `main`). You must deploy using **this** folder’s config — but **do not combine** the two options below (that doubles the path and causes `ENOENT .../workers/theme-upload/workers/theme-upload/wrangler.toml`).

**Option A — Root directory empty (repo root)**

- **Root directory:** leave empty or `/`
- **Deploy command:**

  ```bash
  npx wrangler deploy --config workers/theme-upload/wrangler.toml
  ```

**Option B — Root directory = Worker folder (your current setup)**

- **Root directory:** `workers/theme-upload` (no leading slash required; Cloudflare may show `/workers/theme-upload`)
- **Deploy command:** only:

  ```bash
  npx wrangler deploy
  ```

  Do **not** add `--config workers/theme-upload/wrangler.toml` here — paths are relative to the root directory, so Wrangler would look for `workers/theme-upload/workers/theme-upload/wrangler.toml`.

**Build command:** leave empty or `exit 0` (Wrangler bundles during deploy).

**Version command:** leave **empty** unless Cloudflare’s template requires otherwise; `npx wrangler versions upload` is not the normal deploy step for this Worker.

## Secrets and variables

Required (secret):

```bash
npx wrangler secret put GITHUB_UPLOAD_TOKEN
```

Use a GitHub PAT with permission to create branches, commit files on those branches, and open pull requests on the target repo.

Optional — set in the Cloudflare dashboard (Worker → Settings → Variables) or uncomment/add `[vars]` in `wrangler.toml`:

| Name | Default in code |
|------|-----------------|
| `GITHUB_OWNER` | `y1-community` |
| `GITHUB_REPO` | `InnioasisY1Themes` |
| `GITHUB_BASE_BRANCH` | `main` |
| `GITHUB_ZIP_UPLOAD_DIR` | empty (ZIP path at repo root) |
| `MAX_UPLOAD_BYTES` | `26214400` (25 MiB) |

Never commit the token. Never put it in `upload.html`.

## GitHub Pages: point `upload.html` at this Worker

In the published `upload.html`, set (no trailing slash on the URL):

```html
<meta name="cf-pages-upload-api-origin" content="https://y1-theme-upload.<subdomain>.workers.dev" />
```

Use the exact URL Wrangler prints after deploy, or attach a **Custom Domain** to the Worker (e.g. `upload.themes.innioasis.app`) and put that origin in the meta instead.

## CORS

The handler sends `Access-Control-Allow-Origin: *` so browsers on `themes.innioasis.app` (or any origin) can POST without credentials.
