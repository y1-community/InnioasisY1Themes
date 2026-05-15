<#!
  Regenerate theme/variant index.html SEO shells (repo root index.html is untouched).
  Static GitHub Pages — no Node required. Run from repo root (or via theme-ingest-and-sync CI):
    pwsh -NoProfile -ExecutionPolicy Bypass -File scripts/Rewrite-ThemeIndexPages.ps1
#>
$ErrorActionPreference = 'Stop'
$Root = Resolve-Path (Join-Path $PSScriptRoot '..')
$Site = 'https://themes.innioasis.app'
$ThemesPath = Join-Path $Root 'themes.json'

function Escape-Html([string]$s) {
    if ($null -eq $s) { return '' }
    return ($s -replace '&', '&amp;' -replace '<', '&lt;' -replace '>', '&gt;' -replace '"', '&quot;')
}

function To-Absolute-AssetUrl([string]$rel) {
    $r = ($rel -replace '^\./', '').Trim()
    if (-not $r) { return "$Site/y1_illustration.png" }
    $enc = ($r -split '/' | ForEach-Object { [Uri]::EscapeDataString($_) }) -join '/'
    return "$Site/$enc"
}

function Read-JsonObject([string]$path) {
    if (-not (Test-Path -LiteralPath $path)) { return $null }
    return Get-Content -LiteralPath $path -Raw -Encoding UTF8 | ConvertFrom-Json
}

function Get-CatalogFoldersFromDisk {
    $out = [System.Collections.Generic.List[string]]::new()
    foreach ($ent in Get-ChildItem -LiteralPath $Root -Directory -Force) {
        if ($ent.Name.StartsWith('.')) { continue }
        $cfg = Join-Path $ent.FullName 'config.json'
        if (Test-Path -LiteralPath $cfg) { $out.Add($ent.Name) }
    }
    return $out
}

function Get-VariantSubfolders([string]$folder, $themeMeta) {
    $vp = Join-Path (Join-Path $Root $folder) 'Variants'
    if (-not (Test-Path -LiteralPath $vp)) { return @() }
    $listed = [System.Collections.Generic.HashSet[string]]::new([StringComparer]::OrdinalIgnoreCase)
    if ($themeMeta -and $themeMeta.variantFolders) {
        foreach ($x in $themeMeta.variantFolders) { if ($x) { [void]$listed.Add("$x") } }
    }
    $names = @()
    foreach ($sub in Get-ChildItem -LiteralPath $vp -Directory -Force) {
        if ($sub.Name.StartsWith('.')) { continue }
        $hasCfg = Test-Path -LiteralPath (Join-Path $sub.FullName 'config.json')
        if ($hasCfg -or $listed.Contains($sub.Name)) { $names += $sub.Name }
    }
    return $names
}

function Build-PreviewUrl([string]$catalogFolder, [string]$variant) {
    $t = [Uri]::EscapeDataString($catalogFolder)
    $qs = "theme=$t"
    $v = ($variant -as [string]).Trim()
    if ($v) {
        $qs += "&variant=$([Uri]::EscapeDataString($v))"
    }
    return "$Site/theme.html?$qs"
}

function Build-SharePageUrl([string]$catalogFolder, [string]$variant) {
    $segs = New-Object System.Collections.Generic.List[string]
    [void]$segs.Add($catalogFolder)
    $v = ($variant -as [string]).Trim()
    if ($v) { [void]$segs.Add('Variants'); [void]$segs.Add($v) }
    return $Site + '/' + (($segs | ForEach-Object { [Uri]::EscapeDataString($_) }) -join '/')
}

$themesDoc = Read-JsonObject $ThemesPath
$byFolder = @{}
foreach ($t in @($themesDoc.themes)) {
    if ($t -and $t.folder) { $byFolder[$t.folder] = $t }
}

$folderSet = [System.Collections.Generic.HashSet[string]]::new([StringComparer]::OrdinalIgnoreCase)
foreach ($t in @($themesDoc.themes)) {
    if (-not $t -or -not $t.folder) { continue }
    if (Test-Path -LiteralPath (Join-Path $Root $t.folder)) { [void]$folderSet.Add($t.folder) }
}
foreach ($f in Get-CatalogFoldersFromDisk) { [void]$folderSet.Add($f) }

$targets = [ordered]@{}

foreach ($folder in ($folderSet | Sort-Object)) {
    $tm = $byFolder[$folder]
    $rootIndex = Join-Path (Join-Path $Root $folder) 'index.html'
    $targets[$rootIndex] = @{ CatalogFolder = $folder; Variant = '' }
    foreach ($v in (Get-VariantSubfolders $folder $tm)) {
        $vp = Join-Path (Join-Path (Join-Path (Join-Path $Root $folder) 'Variants') $v) 'index.html'
        $targets[$vp] = @{ CatalogFolder = $folder; Variant = $v }
    }
}

function Render-IndexHtml([string]$catalogFolder, [string]$variant) {
    $meta = $byFolder[$catalogFolder]
    $cfgPath = Join-Path (Join-Path $Root $catalogFolder) 'config.json'
    $cfg = Read-JsonObject $cfgPath
    $ti = $null
    if ($cfg.theme_info) { $ti = $cfg.theme_info } elseif ($cfg.source_info) { $ti = $cfg.source_info }

    $displayName = if ($meta.name) { "$($meta.name)".Trim() } elseif ($ti.title) { "$($ti.title)".Trim() } else { $catalogFolder }
    $author = if ($meta.author) { "$($meta.author)".Trim() } elseif ($ti.author) { "$($ti.author)".Trim() } else { 'Innioasis Community' }
    $rawDesc = if ($meta.description) { "$($meta.description)".Trim() }
    elseif ($ti.description) { "$($ti.description)".Trim() }
    else { "$displayName UI theme for the Innioasis Y1 media player." }
    $variantNote = if ($variant) { " Variant: $variant." } else { '' }
    $fullDesc = "$rawDesc$variantNote"
    if (-not $fullDesc) { $fullDesc = $displayName }
    $descPlain = if ($fullDesc.Length -le 320) { $fullDesc } else { $fullDesc.Substring(0, 320) }
    $description = Escape-Html $descPlain

    $shot = if ($meta.screenshot) { "$($meta.screenshot)".Trim() } else { '' }
    $ogImage = if ($shot) { To-Absolute-AssetUrl $shot }
    elseif ($cfg.themeCover) { To-Absolute-AssetUrl "$catalogFolder/$($cfg.themeCover)" }
    else { To-Absolute-AssetUrl '' }

    $previewUrl = Build-PreviewUrl $catalogFolder $variant
    $sharePageUrl = Build-SharePageUrl $catalogFolder $variant
    $title = if ($variant) { "$displayName ($variant) by $author | Innioasis Y1" } else { "$displayName by $author | Innioasis Y1" }

    $kwSet = New-Object 'System.Collections.Generic.HashSet[string]'
    foreach ($x in @($displayName, $catalogFolder, $variant, 'Innioasis Y1', 'Y1 theme', 'Rockbox', 'MP3 player theme', $author)) {
        if ($x) { [void]$kwSet.Add("$x") }
    }
    $keywords = Escape-Html (($kwSet | Sort-Object) -join ', ')

    $jsonLd = @{
        '@context'    = 'https://schema.org'
        '@type'       = 'SoftwareApplication'
        name          = $title
        description   = "$rawDesc$variantNote"
        applicationCategory = 'MultimediaApplication'
        operatingSystem = 'Innioasis Y1'
        offers        = @{ '@type' = 'Offer'; price = '0'; priceCurrency = 'USD' }
        url           = $previewUrl
        image         = $ogImage
        author        = @{ '@type' = 'Person'; name = $author }
    } | ConvertTo-Json -Compress -Depth 6

    $titleE = Escape-Html $title
    $authorE = Escape-Html $author
    $previewE = Escape-Html $previewUrl
    $shareE = Escape-Html $sharePageUrl
    $ogImageE = Escape-Html $ogImage
    $dispE = Escape-Html $displayName
    $varE = Escape-Html $variant
    $jsonLdSafe = $jsonLd -replace '</', '<\/'

    $variantHeading = if ($variant) { " <span style=`"opacity:.85;font-weight:500`">($varE)</span>" } else { '' }

    return @"
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <meta name="themes-preview-base-path" content="" />
  <title>$titleE</title>
  <meta name="description" content="$description" />
  <meta name="keywords" content="$keywords" />
  <meta name="author" content="$authorE" />
  <meta name="robots" content="index,follow" />
  <link rel="canonical" href="$previewE" />

  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="Innioasis Y1 Themes" />
  <meta property="og:title" content="$titleE" />
  <meta property="og:description" content="$description" />
  <meta property="og:url" content="$previewE" />
  <meta property="og:image" content="$ogImageE" />

  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="$titleE" />
  <meta name="twitter:description" content="$description" />
  <meta name="twitter:image" content="$ogImageE" />

  <script type="application/ld+json">$jsonLdSafe</script>
  <noscript><meta http-equiv="refresh" content="0;url=$previewE" /></noscript>
</head>
<body>
  <main style="font-family:system-ui,Segoe UI,sans-serif;max-width:28rem;margin:2.5rem auto;padding:0 1.25rem;color:#eaeef7;background:#0f1116;min-height:100vh;">
    <p style="margin:0 0 1rem 0;font-size:0.9rem;color:#8b95a8;">Opening the live preview...</p>
    <button type="button" id="theme-seo-copy" data-copy-url="$shareE" style="margin:0 0 1rem 0;padding:0.5rem 1rem;border-radius:999px;border:1px solid rgba(255,255,255,0.18);background:rgba(255,255,255,0.06);color:#eaf0ff;font:inherit;cursor:pointer;">Copy page link</button>
    <h1 style="font-size:1.35rem;font-weight:650;margin:0 0 0.5rem 0;">$dispE$variantHeading</h1>
    <p style="margin:0 0 0.35rem 0;font-size:0.92rem;color:#aeb6c5;">$authorE</p>
    <p style="line-height:1.5;color:#aeb6c5;">$description</p>
    <p style="margin-top:1.25rem;"><a href="$previewE" style="color:#8ec5ff;font-weight:600;text-decoration:none;">Open preview</a></p>
  </main>
  <script>
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
        try { return decodeURIComponent(seg); } catch (e) { return seg; }
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
            if (segs[j] !== prefixSegs[j]) { ok = false; break; }
          }
          if (ok) segs = segs.slice(prefixSegs.length);
        }
      }
      if (!segs.length) return '';
      var vidx = -1;
      for (var i = 0; i < segs.length; i++) {
        if (String(segs[i]).toLowerCase() === 'variants') { vidx = i; break; }
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
  var dest = previewUrlFromPath();
  if (!dest) {
    var c = document.querySelector('link[rel="canonical"]');
    if (c && c.href) dest = c.href;
  }
  if (!dest) dest = $($previewUrl | ConvertTo-Json);
  var cancelled = false;
  var t = setTimeout(function () {
    if (!cancelled && dest) location.replace(dest);
  }, 420);
  var btn = document.getElementById('theme-seo-copy');
  if (btn) {
    btn.addEventListener('click', function () {
      cancelled = true;
      clearTimeout(t);
      var u = btn.getAttribute('data-copy-url');
      if (!u) return;
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(u).then(function () {
          btn.textContent = 'Copied';
        }).catch(function () {});
      }
    });
  }
})();
  </script>
</body>
</html>
"@
}

$written = 0
foreach ($kv in $targets.GetEnumerator()) {
    $abs = $kv.Key
    $cf = $kv.Value.CatalogFolder
    $va = $kv.Value.Variant
    $dir = Split-Path -Parent $abs
    if (-not (Test-Path -LiteralPath $dir)) { New-Item -ItemType Directory -Path $dir -Force | Out-Null }
    $html = Render-IndexHtml $cf $va
    Set-Content -LiteralPath $abs -Value $html -Encoding UTF8
    $written++
}
Write-Host "Wrote $written theme / variant index.html file(s)."
