<#!
  Regenerate theme/variant index.html SEO shells (repo root index.html is untouched).
  Static GitHub Pages — no Node required. Run from repo root (or via theme-ingest-and-sync CI):
    pwsh -NoProfile -ExecutionPolicy Bypass -File scripts/Rewrite-ThemeIndexPages.ps1
    pwsh -NoProfile -ExecutionPolicy Bypass -File scripts/Rewrite-ThemeIndexPages.ps1 -MissingOnly
  -MissingOnly writes only when index.html is absent or lacks theme-seo-shell-analytics.js (safe for ingest).
#>
param(
  [switch]$MissingOnly
)
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
    if ($v) {
        [void]$segs.Add('Variants')
        [void]$segs.Add($v)
        [void]$segs.Add('_share')
    }
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
        $vp = Join-Path (Join-Path (Join-Path (Join-Path $Root $folder) 'Variants') $v) '_share'
        $targets[(Join-Path $vp 'index.html')] = @{ CatalogFolder = $folder; Variant = $v }
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
    # Meta refresh content= must escape & as &amp; in HTML attributes.
    $previewUrlRefreshAttr = ($previewUrl -replace '&', '&amp;')
    $sharePageUrl = Build-SharePageUrl $catalogFolder $variant
    # Document title / social: "ThemeName Theme for Innioasis Y1 by Author" (variant in the theme name slot when present).
    $title = if ($variant) { "$displayName ($variant) Theme for Innioasis Y1 by $author" } else { "$displayName Theme for Innioasis Y1 by $author" }

    $kwSet = New-Object 'System.Collections.Generic.HashSet[string]'
    foreach ($x in @($displayName, $catalogFolder, $variant, 'Innioasis Y1', 'Y1 theme', 'Rockbox', 'MP3 player theme', $author, 'Luci web hosting', 'themes.innioasis.app hosting', 'luci.ltd')) {
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
<html lang="en" data-themes-preview-redirect="$previewE">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <meta name="themes-preview-base-path" content="" />
  <title>$titleE</title>
  <meta name="description" content="$description" />
  <meta name="keywords" content="$keywords" />
  <meta name="author" content="$authorE" />
  <meta name="publisher" content="Luci Ltd" />
  <link rel="author" href="https://www.luci.ltd" title="Luci Ltd — web hosting for Innioasis Y1 Themes" />
  <meta name="robots" content="index,follow" />
  <meta name="cf-theme-analytics-origin" content="https://y1-theme-analytics.itsryanspecter.workers.dev" />
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
  <link rel="stylesheet" href="/site-theme.css?v=20260620" />
  <link rel="stylesheet" href="/site-toolbar.css?v=20260620" />
  <script src="/theme-seo-shell-analytics.js"></script>
  <link rel="canonical" href="$previewE" />
  <script>
(function () {
  function destFromEmbed() {
    try {
      var h = document.documentElement;
      var a = h && h.getAttribute('data-themes-preview-redirect');
      if (a) return String(a).trim();
      var c = document.querySelector('link[rel="canonical"]');
      if (c && c.href) return String(c.href).trim();
    } catch (e) {}
    return '';
  }
  var dest = destFromEmbed();
  if (dest) {
    try { location.replace(dest); } catch (e) {}
  }
})();
  </script>
  <meta http-equiv="refresh" content="0;url=$previewUrlRefreshAttr" />

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
</head>
<body class="site-themes-app site-dock-mode">
  <div id="nav-root"></div>
  <div class="gallery-topbar">
    <div aria-hidden="true"></div>
    <div class="gallery-tabs" aria-label="Site sections">
      <a class="gallery-tab" href="https://y1-themes.vercel.app">Editor</a>
      <a class="gallery-tab active" href="https://themes.innioasis.app/index.html">Gallery</a>
      <a class="gallery-tab" href="https://themes.innioasis.app/upload.html">Upload</a>
    </div>
    <form class="topbar-search-wrap" action="https://themes.innioasis.app/index.html" method="get">
      <i class="fa-solid fa-magnifying-glass topbar-search-icon" aria-hidden="true"></i>
      <input class="topbar-search" name="q" type="search" placeholder="Search themes" aria-label="Search themes">
    </form>
  </div>
  <main class="theme-seo-shell-main">
    <p class="theme-seo-shell-lead">Opening the live preview…</p>
    <button type="button" class="btn" id="theme-seo-copy" data-copy-url="$shareE">Copy page link</button>
    <h1 class="site-display">$dispE$variantHeading</h1>
    <p class="theme-seo-shell-author">$authorE</p>
    <p class="theme-seo-shell-desc">$description</p>
    <p class="theme-seo-shell-actions"><a class="btn btn-primary" href="$previewE">Open preview</a></p>
    <img src="/luci-alt.svg" alt="Innioasis Y1 Themes gallery hosted by Luci Ltd at luci.ltd — themes.innioasis.app" width="1" height="1" decoding="async" class="theme-seo-hosting-mark" aria-hidden="true" />
  </main>
  <div id="footer-root"></div>
  <div id="support-toolbar-slot"></div>
  <script src="/nav.js"></script>
  <script>
(function () {
  var btn = document.getElementById('theme-seo-copy');
  if (btn) {
    btn.addEventListener('click', function () {
      var u = btn.getAttribute('data-copy-url');
      if (!u) return;
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(u).then(function () {
          btn.textContent = 'Copied';
        }).catch(function () {});
      }
    });
  }
  function executeInlineScripts(container) {
    if (!container) return;
    container.querySelectorAll('script').forEach(function (oldScript) {
      var newScript = document.createElement('script');
      Array.from(oldScript.attributes).forEach(function (attr) {
        newScript.setAttribute(attr.name, attr.value);
      });
      newScript.textContent = oldScript.textContent;
      oldScript.parentNode.replaceChild(newScript, oldScript);
    });
  }
  async function loadSupportToolbar() {
    var slot = document.getElementById('support-toolbar-slot');
    if (!slot) return;
    var urls = ['/support_toolbar.html', 'https://themes.innioasis.app/support_toolbar.html'];
    for (var i = 0; i < urls.length; i++) {
      try {
        var res = await fetch(urls[i], { cache: 'no-cache' });
        if (!res.ok) continue;
        slot.innerHTML = await res.text();
        executeInlineScripts(slot);
        return;
      } catch (e) {}
    }
  }
  loadSupportToolbar();
})();
  </script>
</body>
</html>
"@
}

function Test-IndexShellNeedsWrite([string]$abs) {
    if (-not (Test-Path -LiteralPath $abs)) { return $true }
    if (-not $MissingOnly) { return $true }
    try {
        $c = Get-Content -LiteralPath $abs -Raw -Encoding UTF8
        if ($c -notmatch 'theme-seo-shell-analytics\.js') { return $true }
        if ($c -notmatch 'cf-theme-analytics-origin') { return $true }
        if ($c -notmatch 'gallery-topbar') { return $true }
        if ($c -notmatch 'site-themes-app') { return $true }
        if ($c -notmatch 'site-toolbar\.css') { return $true }
        return $false
    } catch {
        return $true
    }
}

$written = 0
foreach ($kv in $targets.GetEnumerator()) {
    $abs = $kv.Key
    if (-not (Test-IndexShellNeedsWrite $abs)) { continue }
    $cf = $kv.Value.CatalogFolder
    $va = $kv.Value.Variant
    $dir = Split-Path -Parent $abs
    if (-not (Test-Path -LiteralPath $dir)) { New-Item -ItemType Directory -Path $dir -Force | Out-Null }
    $html = Render-IndexHtml $cf $va
    Set-Content -LiteralPath $abs -Value $html -Encoding UTF8
    $written++
}
Write-Host "Wrote $written theme / variant index.html file(s)."
