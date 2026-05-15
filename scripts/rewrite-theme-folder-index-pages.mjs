/**
 * One-off / maintenance: rewrite each theme folder's index.html (not repo root)
 * into a small SEO shell that redirects to theme.html on themes.innioasis.app.
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

function collectIndexHtmlPaths(dir, acc = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ent.name.startsWith('.')) continue;
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      collectIndexHtmlPaths(p, acc);
    } else if (ent.name === 'index.html') {
      const parent = path.dirname(p);
      if (path.relative(ROOT, parent) === '' || parent === ROOT) continue;
      acc.push(p);
    }
  }
  return acc;
}

function parseThemeDir(relDirPosix) {
  const segs = relDirPosix.split('/').filter(Boolean);
  const vIdx = segs.findIndex((s) => s.toLowerCase() === 'variants');
  if (vIdx > 0 && vIdx < segs.length - 1) {
    const catalogFolder = segs.slice(0, vIdx).join('/');
    const variant = segs.slice(vIdx + 1).join('/');
    return { catalogFolder, variant };
  }
  return { catalogFolder: segs.join('/'), variant: '' };
}

function buildPreviewUrl(catalogFolder, variant) {
  const u = new URL('/theme.html', SITE_ORIGIN);
  u.searchParams.set('theme', catalogFolder);
  const v = String(variant || '').trim();
  if (v) u.searchParams.set('variant', v);
  return u.toString();
}

function main() {
  const { themes } = readJsonSafe(THEMES_JSON) || { themes: [] };
  const byFolder = new Map();
  for (const t of themes) {
    if (t && t.folder) byFolder.set(t.folder, t);
  }

  const indexFiles = collectIndexHtmlPaths(ROOT);
  let written = 0;

  for (const abs of indexFiles) {
    const relDir = path.relative(ROOT, path.dirname(abs));
    const relDirPosix = relDir.split(path.sep).join('/');
    const { catalogFolder, variant } = parseThemeDir(relDirPosix);
    if (!catalogFolder) continue;

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

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
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

  <script>
    (function () {
      var u = ${JSON.stringify(previewUrl)};
      if (typeof location !== "undefined" && location.replace) location.replace(u);
      else if (typeof location !== "undefined") location.href = u;
    })();
  </script>
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

    fs.writeFileSync(abs, html, 'utf8');
    written += 1;
  }

  console.log(`Wrote ${written} theme folder index.html file(s).`);
}

main();
