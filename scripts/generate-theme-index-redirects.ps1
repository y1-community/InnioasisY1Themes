# Overwrites each theme folder's index.html (not repo root) with a small SEO page
# that redirects to theme.html?theme=...&variant=... on the main gallery.
$ErrorActionPreference = 'Stop'
# This script lives in <repo>/scripts/
$root = Split-Path -Parent $PSScriptRoot
if (-not (Test-Path (Join-Path $root 'themes.json'))) {
    throw "Could not find themes.json under repo root: $root"
}

$canonicalHost = 'https://themes.innioasis.app'
$rootIndex = Join-Path $root 'index.html'

function Escape-Html([string]$s) {
    if ($null -eq $s) { return '' }
    return [System.Net.WebUtility]::HtmlEncode($s)
}

function Encode-Uri([string]$s) {
    return [System.Uri]::EscapeDataString($s)
}

Get-ChildItem -LiteralPath $root -Recurse -Filter 'index.html' | ForEach-Object {
    if ($_.FullName -eq $rootIndex) { return }

    $dir = $_.DirectoryName
    $rel = [string]::new('')
    if ($dir.Length -gt $root.Length) {
        $rel = $dir.Substring($root.Length).TrimStart('\', '/')
    }
    $relNorm = $rel -replace '\\', '/'
    $depth = 0
    if ($relNorm.Length -gt 0) {
        $depth = ($relNorm -split '/', [StringSplitOptions]::RemoveEmptyEntries).Count
    }

    $themeKey = $relNorm
    $variantSeg = ''
    if ($relNorm -match '(?i)^(.*)/variants/([^/]+)/') {
        $themeKey = $Matches[1]
        $variantSeg = $Matches[2]
    }

    $dots = @()
    for ($i = 0; $i -lt $depth; $i++) { $dots += '..' }
    $prefix = if ($dots.Count) { ($dots -join '/') + '/' } else { './' }

    $q = 'theme=' + (Encode-Uri $themeKey)
    if ($variantSeg) {
        $q += '&variant=' + (Encode-Uri $variantSeg)
    }
    $relThemePage = $prefix + 'theme.html?' + $q
    $canonical = "$canonicalHost/theme.html?$q"

    $cfgPath = Join-Path $dir 'config.json'
    $pageTitle = $themeKey -replace '/', ' — '
    $desc = "Preview and download the Innioasis Y1 theme `"$pageTitle`" on the official themes gallery."
    if (Test-Path -LiteralPath $cfgPath) {
        try {
            $cfg = Get-Content -LiteralPath $cfgPath -Raw -Encoding UTF8 | ConvertFrom-Json
            $info = $cfg.theme_info
            if ($info) {
                if ($info.title) {
                    $t = [string]$info.title
                    if ($t.Trim().Length) { $pageTitle = $t.Trim() }
                }
                if ($info.description) {
                    $d = [string]$info.description
                    if ($d.Trim().Length) { $desc = $d.Trim() }
                }
            }
        } catch { }
    }

    $titleEsc = Escape-Html $pageTitle
    $descEsc = Escape-Html $desc
    $hrefEsc = Escape-Html $relThemePage

    $html = @"
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>$titleEsc – Innioasis Y1 theme</title>
  <meta name="description" content="$descEsc" />
  <link rel="canonical" href="$canonical" />
  <meta property="og:type" content="website" />
  <meta property="og:title" content="$titleEsc" />
  <meta property="og:description" content="$descEsc" />
  <meta property="og:url" content="$canonical" />
  <script>
    (function () {
      var u = "$relThemePage";
      if (typeof location !== "undefined" && location.replace) location.replace(u);
      else if (typeof location !== "undefined") location.href = u;
    })();
  </script>
  <noscript><meta http-equiv="refresh" content="0;url=$hrefEsc" /></noscript>
</head>
<body>
  <main style="font-family:system-ui,Segoe UI,sans-serif;max-width:42rem;margin:2rem auto;padding:0 1rem;color:#111;">
    <h1 style="font-size:1.35rem;">$titleEsc</h1>
    <p>$descEsc</p>
    <p><a href="$hrefEsc">Open the interactive theme preview</a> on the gallery.</p>
  </main>
</body>
</html>
"@

    $utf8NoBom = New-Object System.Text.UTF8Encoding $false
    [System.IO.File]::WriteAllText($_.FullName, $html, $utf8NoBom)
    Write-Host "Wrote $($_.FullName)"
}
