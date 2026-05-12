# y1-theme-upload (Cloudflare Worker)

Standalone Worker that exposes **POST/OPTIONS** for:

- `https://<worker>/api/upload-theme` — theme ZIP uploads (same behavior as [`functions/api/upload-theme.js`](../../functions/api/upload-theme.js) on Cloudflare Pages).
- `https://<worker>/api/removal-request` — catalog removal requests (same behavior as [`functions/api/removal-request.js`](../../functions/api/removal-request.js)).

Use this when the static site is on **GitHub Pages** or any host that cannot run Pages Functions.

Shared logic lives in [`functions/_lib/theme-upload-handler.js`](../../functions/_lib/theme-upload-handler.js) and [`functions/_lib/theme-removal-handler.js`](../../functions/_lib/theme-removal-handler.js).

Each upload opens a PR that adds a **timestamped** root `*.zip` plus a sibling **`*.zip.meta.json`** (uploader slug/name for identity checks). [`scripts/validate_theme_pr.py`](../../scripts/validate_theme_pr.py) allows that sidecar only when the matching zip is in the same PR. ZIPs may contain **multiple** themes (one `config.json` per folder, optional root `config.json`); rules mirror the validator and [`scripts/process_theme_zips.py`](../../scripts/process_theme_zips.py). For **auto-merge**, leave [`GITHUB_ZIP_UPLOAD_DIR`](../../functions/_lib/theme-upload-handler.js) empty so both files sit at repo root (nested zip paths are rejected by the validator today).

On **main**, root ZIP ingestion, `themes.json` sync, per-theme `index.html` updates, and cleanup of processed zips/meta are handled by [`.github/workflows/theme-ingest-and-sync.yml`](../../.github/workflows/theme-ingest-and-sync.yml) (replacing separate extract/process workflows). A scheduled [`sync-theme-metadata.yml`](../../.github/workflows/sync-theme-metadata.yml) run remains a safety net.

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

Use a GitHub PAT with permission to create branches, commit files on those branches, and open pull requests on the target repo. The same token is used for uploads and removal requests (deletes under a theme folder + `themes.json` edit).

Optional — set in the Cloudflare dashboard (Worker → Settings → Variables) or uncomment/add `[vars]` in `wrangler.toml`:

| Name | Default in code |
|------|-----------------|
| `GITHUB_OWNER` | `y1-community` |
| `GITHUB_REPO` | `InnioasisY1Themes` |
| `GITHUB_BASE_BRANCH` | `main` |
| `GITHUB_ZIP_UPLOAD_DIR` | empty (ZIP path at repo root) |
| `MAX_UPLOAD_BYTES` | `26214400` (25 MiB) |

Never commit the token. Never put it in `upload.html`.

### `User-Agent` required (403 from GitHub)

Server-side `fetch` to `api.github.com` does not send a browser `User-Agent`. GitHub rejects those requests with 403 unless a **`User-Agent`** header is set. The shared handler sets `User-Agent: y1-theme-upload/1.0 (+https://github.com/y1-community/InnioasisY1Themes)`.

### Still seeing `GitHub API 403` after rotating the token?

The upload form will show a longer message after redeploy (which step failed + GitHub’s text). Common causes:

1. **Fine-grained PAT** — Repository **`y1-community/InnioasisY1Themes`** must be explicitly selected; permissions **Contents** and **Pull requests** must be **Read and write** (not read-only).
2. **Org SAML SSO** — Authorize the PAT for **`y1-community`** (GitHub → token → **Configure SSO**).
3. **Wrong secret on the Worker** — Must be **`GITHUB_UPLOAD_TOKEN`** under the Worker’s **Variables and secrets** (Production), not only the Cloudflare Git “API token” used to clone the repo.
4. **Wrong repo in env** — If you set **`GITHUB_REPO`** / **`GITHUB_OWNER`** on the Worker, they must match the real GitHub repo name exactly.

## GitHub Pages: point `upload.html` at this Worker

In the published `upload.html`, set (no trailing slash on the URL):

```html
<meta name="cf-pages-upload-api-origin" content="https://y1-theme-upload.<subdomain>.workers.dev" />
```

Use the exact URL Wrangler prints after deploy, or attach a **Custom Domain** to the Worker (e.g. `upload.themes.innioasis.app`) and put that origin in the meta instead.

## CORS

The handlers send `Access-Control-Allow-Origin: *` so browsers on `themes.innioasis.app` (or any origin) can POST without credentials.

### Removal request body (`POST /api/removal-request`)

`multipart/form-data` fields: **`folder`** (catalog folder path), **`confirmName`** (must match `themes.json` **name** for that folder), **`confirmAuthor`** (must match **author** when the listing has an author; omit or leave blank when none is listed), **`contactEmail`** (required, used for verification), optional **`confirmContactEmail`** (must match `contactEmail` if provided), optional **`reason`**, **`requester`**, optional **`blacklistOptOut`** (`1/true/yes/on` to request blocklist preference).

Removal requests use the title prefix `[Removal]` and are **not** published automatically by the repository workflow.
