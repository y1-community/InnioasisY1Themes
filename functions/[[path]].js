/**
 * Rewrite /Theme_Folder/Variant_Name (and /Theme/Variants/Name) to theme.html query params
 * so shared pretty links open the gallery theme page.
 */

const RESERVED_TOP = new Set([
    'api',
    'assets',
    'scripts',
    'functions',
    'workers',
    '.well-known'
]);

function parseThemeVariantPath(pathname) {
    const segments = String(pathname || '')
        .split('/')
        .filter(Boolean)
        .map((s) => {
            try {
                return decodeURIComponent(s);
            } catch (_) {
                return s;
            }
        });
    if (segments.length < 2) return null;
    if (RESERVED_TOP.has(segments[0].toLowerCase())) return null;
    if (segments.some((s) => s.includes('.'))) return null;
    const theme = segments[0];
    let variant = '';
    if (segments[1] === 'Variants') {
        variant = segments.slice(2).join('/');
    } else {
        variant = segments.slice(1).join('/');
    }
    return { theme, variant };
}

export async function onRequest(context) {
    const method = context.request.method;
    if (method !== 'GET' && method !== 'HEAD') {
        return context.next();
    }

    const url = new URL(context.request.url);
    const parsed = parseThemeVariantPath(url.pathname);
    if (!parsed || !parsed.theme) {
        return context.next();
    }

    const dest = new URL('/theme.html', url.origin);
    dest.searchParams.set('theme', parsed.theme);
    if (parsed.variant) dest.searchParams.set('variant', parsed.variant);

    const assetRequest = new Request(dest.toString(), {
        method,
        headers: context.request.headers
    });

    if (context.env && context.env.ASSETS) {
        return context.env.ASSETS.fetch(assetRequest);
    }

    return Response.redirect(dest.toString(), 302);
}
