/**
 * Rewrite or create each theme folder's index.html (not repo root): SEO shell +
 * redirect to theme.html on themes.innioasis.app.
 *
 * Covers:
 * - Every catalog folder from themes.json that exists on disk
 * - Every other root subfolder that has ./config.json (e.g. not yet in JSON)
 * - Every ./ThemeFolder/Variants/<name>/ that has config.json or is listed in variantFolders
 *
 * Run from repo root: node scripts/rewrite-theme-folder-index-pages.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const SITE_ORIGIN = 'https://themes.innioasis.app';
const THEMES_JSON = path.join(ROOT, 'themes.json');

/**
 * Identical in every generated index.html: redirect URL is derived from
 * `location.pathname` (and optional `themes-preview-base-path` for GitHub Pages
 * project sites). If parsing fails, falls back to `<link rel="canonical">`.
 * Per-theme meta tags stay fixed for crawlers.
 */
const THEME_INDEX_REDIRECT_SCRIPT = `<script>
(function () {
  function trimTrailingSlashes(s) {
    var t = String(s || '');
    while (t.length > 1 && t.charAt(t.length - 1) === '/') t = t.slice(0, -1);
    return t;
  }
  function stripIndexHtml(pathname) {
    var p = String(pathname || '');
    var low = p.toLowerCase();
    if (low.endsWith('/index.html')) p = p.slice(0, -11);
    else if (low.endsWith('/index.htm')) p = p.slice(0, -10);
    return trimTrailingSlashes(p);
  }
  function previewUrlFromPath() {
    try {
      var pathPart = stripIndexHtml(location.pathname);
      var segs = pathPart.split('/').filter(Boolean).map(function (seg) {
        try {
          return decodeURIComponent(seg);
        } catch (e) {
          return seg;
        }
      });
      var meta = document.querySelector('meta[name="themes-preview-base-path"]');
      var base = meta && meta.getAttribute('content') != null ? String(meta.getAttribute('content')).trim() : '';
      if (base && base.charAt(0) !== '/') base = '/' + base;
      if (base && base.charAt(base.length - 1) !== '/') base += '/';
      if (base) {
        var prefixSegs = trimTrailingSlashes(base).split('/').filter(Boolean);
        if (prefixSegs.length && segs.length >= prefixSegs.length) {
          var ok = true;
          for (var j = 0; j < prefixSegs.length; j++) {
            if (segs[j] !== prefixSegs[j]) {
              ok = false;
              break;
            }
          }
          if (ok) segs = segs.slice(prefixSegs.length);
        }
      }
      if (!segs.length) return '';
      var vidx = -1;
      for (var i = 0; i < segs.length; i++) {
        if (String(segs[i]).toLowerCase() === 'variants') {
          vidx = i;
          break;
        }
      }
      var theme = '';
      var variant = '';
      if (vidx > 0 && vidx < segs.length - 1) {
        theme = segs.slice(0, vidx).join('/');
        variant = segs.slice(vidx + 1).join('/');
      } else {
        theme = segs.join('/');
      }
      if (!theme) return '';
      var rootBase = base ? new URL(base, location.origin).toString() : new URL('/', location.origin).toString();
      var u = new URL('theme.html', rootBase);
      u.searchParams.set('theme', theme);
      if (variant) u.searchParams.set('variant', variant);
      return u.toString();
    } catch (e) {
      return '';
    }
  }
  var u = previewUrlFromPath();
  if (!u) {
    var c = document.querySelector('link[rel="canonical"]');
    if (c && c.href) u = c.href;
  }
  if (u && typeof location !== 'undefined' && location.replace) location.replace(u);
  else if (u) location.href = u;
})();
</script>`;

function escapeHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function toAbsoluteAssetUrl(rel) {
  const r = String(rel || '').trim().replace(/^\.?\//, '');
  if (!r) return `${SITE_ORIGIN}/y1_illustration.png`;
  const posix = r.split(path.sep).join('/');
  const enc = posix
    .split('/')
    .map((seg) => encodeURIComponent(seg))
    .join('/');
  return `${SITE_ORIGIN}/${enc}`;
}

function readJsonSafe(p) {
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch {
    return null;
  }
}

function catalogFoldersFromDisk() {
  const out = [];
  let names;
  try {
    names = fs.readdirSync(ROOT, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const ent of names) {
    if (!ent.isDirectory() || ent.name.startsWith('.')) continue;
    const cfg = path.join(ROOT, ent.name, 'config.json');
    if (fs.existsSync(cfg)) out.push(ent.name);
  }
  return out;
}

function listVariantSubfolderNames(folder, themeMeta) {
  const variantsPath = path.join(ROOT, folder, 'Variants');
  if (!fs.existsSync(variantsPath)) return [];
  let st;
  try {
    st = fs.statSync(variantsPath);
  } catch {
    return [];
  }
  if (!st.isDirectory()) return [];

  const listed = new Set(
    Array.isArray(themeMeta && themeMeta.variantFolders) ? themeMeta.variantFolders : []
  );
  const out = [];
  for (const ent of fs.readdirSync(variantsPath, { withFileTypes: true })) {
    if (!ent.isDirectory() || ent.name.startsWith('.')) continue;
    const sub = path.join(variantsPath, ent.name);
    const hasCfg = fs.existsSync(path.join(sub, 'config.json'));
    if (hasCfg || listed.has(ent.name)) out.push(ent.name);
  }
  return out;
}

function buildPreviewUrl(catalogFolder, variant) {
  const u = new URL('/theme.html', SITE_ORIGIN);
  u.searchParams.set('theme', catalogFolder);
  const v = String(variant || '').trim();
  if (v) u.searchParams.set('variant', v);
  return u.toString();
}

function renderIndexHtml(catalogFolder, variant, byFolder) {
  const meta = byFolder.get(catalogFolder) || {};
  const cfgPath = path.join(ROOT, catalogFolder, 'config.json');
  const cfg = readJsonSafe(cfgPath);
  const ti = (cfg && (cfg.theme_info || cfg.source_info)) || {};

  const displayName = String(meta.name || ti.title || catalogFolder).trim() || catalogFolder;
  const author = String(meta.author || ti.author || 'Innioasis Community').trim();
  const rawDesc = String(
    meta.description || ti.description || `${displayName} UI theme for the Innioasis Y1 media player.`
  ).trim();
  const variantNote = variant ? ` Variant: ${variant}.` : '';
  const description = escapeHtml((rawDesc + variantNote).slice(0, 320));

  const shot = meta.screenshot || '';
  let ogImage = toAbsoluteAssetUrl(shot);
  if (!shot && cfg && cfg.themeCover) {
    ogImage = toAbsoluteAssetUrl(`${catalogFolder}/${cfg.themeCover}`);
  }

  const previewUrl = buildPreviewUrl(catalogFolder, variant);
  const title = variant
    ? `${displayName} (${variant}) — Innioasis Y1 theme`
    : `${displayName} — Innioasis Y1 theme`;

  const keywords = [
    ...new Set(
      [
        displayName,
        catalogFolder,
        variant,
        'Innioasis Y1',
        'Y1 theme',
        'Rockbox',
        'MP3 player theme',
        author
      ].filter(Boolean)
    )
  ].join(', ');

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: title,
    description: rawDesc + variantNote,
    applicationCategory: 'MultimediaApplication',
    operatingSystem: 'Innioasis Y1',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
    url: previewUrl,
    image: ogImage,
    author: { '@type': 'Person', name: author }
  };

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <meta name="themes-preview-base-path" content="" />
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${description}" />
  <meta name="keywords" content="${escapeHtml(keywords)}" />
  <meta name="author" content="${escapeHtml(author)}" />
  <meta name="robots" content="index,follow" />
  <link rel="canonical" href="${escapeHtml(previewUrl)}" />

  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="Innioasis Y1 Themes" />
  <meta property="og:title" content="${escapeHtml(title)}" />
  <meta property="og:description" content="${description}" />
  <meta property="og:url" content="${escapeHtml(previewUrl)}" />
  <meta property="og:image" content="${escapeHtml(ogImage)}" />

  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${escapeHtml(title)}" />
  <meta name="twitter:description" content="${description}" />
  <meta name="twitter:image" content="${escapeHtml(ogImage)}" />

  <script type="application/ld+json">${JSON.stringify(jsonLd)}</script>

  ${THEME_INDEX_REDIRECT_SCRIPT}
  <noscript><meta http-equiv="refresh" content="0;url=${escapeHtml(previewUrl)}" /></noscript>
</head>
<body>
  <main style="font-family:system-ui,Segoe UI,sans-serif;max-width:42rem;margin:2rem auto;padding:0 1rem;color:#eaeef7;background:#0f1116;min-height:100vh;">
    <h1 style="font-size:1.35rem;">${escapeHtml(displayName)}${variant ? ` <span style="opacity:.85">(${escapeHtml(variant)})</span>` : ''}</h1>
    <p style="line-height:1.5;color:#aeb6c5;">${description}</p>
    <p><a href="${escapeHtml(previewUrl)}" style="color:#8ec5ff;">Open the interactive theme preview</a> on the gallery.</p>
  </main>
</body>
</html>
`;
}

function main() {
  const { themes } = readJsonSafe(THEMES_JSON) || { themes: [] };
  const byFolder = new Map();
  for (const t of themes) {
    if (t && t.folder) byFolder.set(t.folder, t);
  }

  const folderSet = new Set();
  for (const t of themes) {
    if (t && t.folder && fs.existsSync(path.join(ROOT, t.folder))) folderSet.add(t.folder);
  }
  for (const f of catalogFoldersFromDisk()) folderSet.add(f);

  const targets = new Map();

  for (const folder of folderSet) {
    const themeMeta = byFolder.get(folder) || {};
    const rootIndex = path.join(ROOT, folder, 'index.html');
    targets.set(path.normalize(rootIndex), { catalogFolder: folder, variant: '' });

    for (const v of listVariantSubfolderNames(folder, themeMeta)) {
      const p = path.join(ROOT, folder, 'Variants', v, 'index.html');
      targets.set(path.normalize(p), { catalogFolder: folder, variant: v });
    }
  }

  let written = 0;
  const sortedPaths = [...targets.keys()].sort();
  for (const abs of sortedPaths) {
    const { catalogFolder, variant } = targets.get(abs);
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, renderIndexHtml(catalogFolder, variant, byFolder), 'utf8');
    written += 1;
  }

  console.log(`Wrote ${written} theme / variant index.html file(s).`);
}

main();
