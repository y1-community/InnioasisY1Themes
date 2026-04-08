from pathlib import Path
import re
from urllib.parse import quote

root = Path(r'c:\Users\itsry\Documents\InnioasisY1Themes\InnioasisY1Themes')
updated=[]
for p in root.rglob('index.html'):
    if p.parent == root:
        continue
    if p.name != 'index.html':
        continue
    if p.parent.parent != root:
        continue
    theme = p.parent.name
    enc = quote(theme, safe='')
    redirect_url = f"https://themes.innioasis.app/theme.html?theme={enc}"
    desc = f"Explore the {theme} theme for Innioasis Y1 with curated visuals and downloadable assets for a personalized player setup."
    kw = f"{theme} theme, {theme} Innioasis Y1, Innioasis Y1 {theme}, Innioasis Y1 themes, Y1 customization"
    og_title = f"{theme} theme for Innioasis Y1"
    try:
        s = p.read_text(encoding='utf-8')
        enc_used='utf-8'
    except UnicodeDecodeError:
        s = p.read_text(encoding='cp1252')
        enc_used='cp1252'
    o=s
    for pat,rep in [
      (r'<meta name="description" content="[^"]*">', f'<meta name="description" content="{desc}">'),
      (r'<meta name="keywords" content="[^"]*">', f'<meta name="keywords" content="{kw}">'),
      (r'<link rel="canonical" href="[^"]*">', f'<link rel="canonical" href="{redirect_url}">'),
      (r'<meta property="og:title" content="[^"]*">', f'<meta property="og:title" content="{og_title}">'),
      (r'<meta property="og:description" content="[^"]*">', f'<meta property="og:description" content="{desc}">'),
      (r'<meta property="og:url" content="[^"]*">', f'<meta property="og:url" content="{redirect_url}">'),
      (r'<meta name="twitter:title" content="[^"]*">', f'<meta name="twitter:title" content="{og_title}">'),
      (r'<meta name="twitter:description" content="[^"]*">', f'<meta name="twitter:description" content="{desc}">'),
    ]:
      s = re.sub(pat, rep, s, count=1)
    if 'const THEME_NAME_PLACEHOLDER =' in s:
      s = re.sub(r'const THEME_NAME_PLACEHOLDER = .*?;', f'const THEME_NAME_PLACEHOLDER = "{theme}";', s, count=1)
      s = re.sub(r'const THEME_REDIRECT_URL = .*?;', f'const THEME_REDIRECT_URL = "{redirect_url}";', s, count=1)
    else:
      s, _ = re.subn(r"(const GITHUB_TOKEN = ''\s*;\s*\n)", r"\1        const THEME_NAME_PLACEHOLDER = \""+theme.replace('"','\\"')+r"\";\n        const THEME_REDIRECT_URL = \""+redirect_url+r"\";\n", s, count=1)
    s = s.replace('\\"','"')
    s = re.sub(r'href="https://themes\.innioasis\.app/index\.html" style="color:lightblue;">themes\.innioasis\.app/index\.html</a>', r'href="${THEME_REDIRECT_URL}" style="color:lightblue;">${THEME_REDIRECT_URL}</a>', s)
    s = re.sub(r"location\.href = 'https://themes\.innioasis\.app/index\.html';", "location.href = THEME_REDIRECT_URL;", s)
    if s!=o:
      p.write_text(s, encoding=enc_used, newline='\n')
      updated.append(p.relative_to(root).as_posix())
print('UPDATED_COUNT='+str(len(updated)))
for r in updated:
  print(r)
