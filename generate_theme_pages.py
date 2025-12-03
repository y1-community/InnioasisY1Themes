import json
import os
import glob

# Read themes.json
with open('themes.json', 'r') as f:
    data = json.load(f)

themes = data['themes']

# HTML Template with Support Toolbar
html_template = """<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{name} - Innioasis Y1 Theme</title>
    <meta name="description" content="{description}">
    <style>
        body {{
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
            margin: 0;
            color: #333;
            display: flex;
            flex-direction: column;
            align-items: center;
        }}
        .container {{
            background: white;
            padding: 40px;
            border-radius: 20px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            max-width: 800px;
            width: 100%;
            text-align: center;
            margin-bottom: 20px;
        }}
        h1 {{
            margin-bottom: 10px;
            color: #333;
        }}
        .author {{
            color: #666;
            margin-bottom: 20px;
            font-style: italic;
        }}
        .description {{
            line-height: 1.6;
            margin-bottom: 30px;
            color: #444;
        }}
        .gallery {{
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }}
        .gallery-item {{
            display: flex;
            flex-direction: column;
            align-items: center;
        }}
        .screenshot {{
            width: 100%;
            border-radius: 10px;
            box-shadow: 0 5px 15px rgba(0,0,0,0.1);
            object-fit: contain;
            transition: transform 0.2s;
        }}
        .screenshot:hover {{
            transform: scale(1.02);
        }}
        .image-label {{
            margin-top: 8px;
            font-size: 0.8rem;
            color: #888;
        }}
        .btn {{
            display: inline-block;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            text-decoration: none;
            padding: 12px 30px;
            border-radius: 50px;
            font-weight: bold;
            transition: transform 0.2s, box-shadow 0.2s;
            margin: 10px;
        }}
        .btn:hover {{
            transform: translateY(-2px);
            box-shadow: 0 5px 15px rgba(102, 126, 234, 0.4);
        }}
        .back-link {{
            display: block;
            margin-top: 20px;
            color: #666;
            text-decoration: none;
            font-size: 0.9rem;
        }}
        .back-link:hover {{
            text-decoration: underline;
        }}
    </style>
</head>
<body>
    <div class="container">
        <h1 id="theme-name">{name}</h1>
        <div class="author" id="theme-author">by {author}</div>
        
        <p class="description" id="theme-description">{description}</p>
        
        {gallery_html}
        
        <a href="../index.html" class="btn">Install this Theme</a>
        
        <a href="../index.html" class="back-link">← Back to All Themes</a>
    </div>

    <!-- Neomorphic Floating Support Us Toolbar -->
    <div id="support-toolbar-container">
        <style>
            #support-toolbar {{
                position: fixed;
                bottom: 20px;
                right: 20px;
                z-index: 10000;
                display: flex;
                gap: 10px;
                align-items: center;
                font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'SF Pro Text', 'Helvetica Neue', Helvetica, Arial, sans-serif;
                background: #f0f0f3;
                padding: 8px 12px;
                border-radius: 50px;
                box-shadow:
                    8px 8px 16px rgba(163, 177, 198, 0.6),
                    -8px -8px 16px rgba(255, 255, 255, 0.5);
                transition: all 0.3s ease;
                flex-wrap: wrap;
                max-width: calc(100vw - 40px);
            }}

            .support-toolbar-btn {{
                background: #f0f0f3;
                border: none;
                border-radius: 25px;
                padding: 10px 18px;
                cursor: pointer;
                font-size: 13px;
                font-weight: 600;
                color: #2d2d2d;
                text-decoration: none;
                display: flex;
                align-items: center;
                gap: 8px;
                box-shadow:
                    4px 4px 8px rgba(163, 177, 198, 0.6),
                    -4px -4px 8px rgba(255, 255, 255, 0.5);
                transition: all 0.3s ease;
                white-space: nowrap;
            }}

            .support-toolbar-btn:hover {{
                box-shadow:
                    2px 2px 4px rgba(163, 177, 198, 0.6),
                    -2px -2px 4px rgba(255, 255, 255, 0.5);
                transform: translateY(-1px);
            }}

            .support-toolbar-btn:active {{
                box-shadow:
                    inset 2px 2px 4px rgba(163, 177, 198, 0.6),
                    inset -2px -2px 4px rgba(255, 255, 255, 0.5);
                transform: translateY(0);
            }}

            .support-toolbar-btn.primary {{
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                box-shadow:
                    4px 4px 8px rgba(102, 126, 234, 0.4),
                    -4px -4px 8px rgba(118, 75, 162, 0.3);
            }}

            .support-toolbar-btn.primary:hover {{
                box-shadow:
                    2px 2px 4px rgba(102, 126, 234, 0.4),
                    -2px -2px 4px rgba(118, 75, 162, 0.3);
            }}

            .support-toolbar-icon {{
                font-size: 16px;
                display: inline-block;
                line-height: 1;
            }}

            #donate-options {{
                display: none;
                gap: 10px;
                align-items: center;
                flex-wrap: wrap;
            }}

            #donate-options.expanded {{
                display: flex;
            }}

            .crypto-address {{
                display: flex;
                flex-direction: column;
                gap: 4px;
                padding: 8px 12px;
                background: #f0f0f3;
                border-radius: 12px;
                box-shadow:
                    2px 2px 4px rgba(163, 177, 198, 0.6),
                    -2px -2px 4px rgba(255, 255, 255, 0.5);
                min-width: 140px;
            }}

            .crypto-label {{
                font-size: 11px;
                font-weight: 700;
                color: #667eea;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                display: flex;
                align-items: center;
                gap: 6px;
            }}

            .crypto-copy-hint {{
                font-size: 9px;
                font-weight: 400;
                color: #86868b;
                text-transform: none;
                letter-spacing: 0;
            }}

            .crypto-code {{
                font-size: 10px;
                font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace;
                color: #2d2d2d;
                word-break: break-all;
                cursor: pointer;
                padding: 4px 6px;
                background: rgba(0, 0, 0, 0.05);
                border-radius: 6px;
                transition: all 0.2s ease;
            }}

            .crypto-code:hover {{
                background: rgba(0, 0, 0, 0.1);
            }}

            .crypto-code.copied {{
                background: rgba(34, 197, 94, 0.2);
                color: #22c55e;
            }}

            @media (max-width: 768px) {{
                #support-toolbar {{
                    bottom: 15px;
                    right: 15px;
                    left: 15px;
                    justify-content: center;
                    padding: 6px 10px;
                    gap: 8px;
                    border-radius: 25px;
                }}

                .support-toolbar-btn {{
                    padding: 8px 14px;
                    font-size: 12px;
                }}

                .support-toolbar-icon {{
                    font-size: 16px;
                }}

                .crypto-address {{
                    min-width: 120px;
                    padding: 6px 10px;
                }}

                .crypto-code {{
                    font-size: 9px;
                }}
            }}
        </style>
        <div id="support-toolbar">
            <a href="https://innioasis.app/support_devs.html" class="support-toolbar-btn primary" target="_blank"
                rel="noopener noreferrer">
                <span class="support-toolbar-icon">💙</span>
                <span>Get Involved / Submit Themes</span>
            </a>
            <button id="donate-toggle" class="support-toolbar-btn" type="button">
                <span class="support-toolbar-icon">💳</span>
                <span>Donate</span>
            </button>
            <div id="donate-options">
                <a href="https://revolut.me/rspecter" class="support-toolbar-btn" target="_blank"
                    rel="noopener noreferrer">
                    <span class="support-toolbar-icon">💸</span>
                    <span>Revolut</span>
                </a>
                <a href="https://ko-fi.com/teamslide" class="support-toolbar-btn" target="_blank"
                    rel="noopener noreferrer">
                    <span class="support-toolbar-icon">☕</span>
                    <span>Ko-fi</span>
                </a>
                <a href="https://paypal.me/respectyarn" class="support-toolbar-btn" target="_blank"
                    rel="noopener noreferrer">
                    <span class="support-toolbar-icon">💳</span>
                    <span>PayPal</span>
                </a>
                <div class="crypto-address">
                    <span class="crypto-label">
                        Bitcoin
                        <span class="crypto-copy-hint">(click to copy)</span>
                    </span>
                    <code class="crypto-code" id="btc-address"
                        onclick="copyCryptoAddress('bc1q9vsjqjr6pjuc3vrgverx0v9ydst8s82ck4kpue', 'btc-address')"
                        title="Click to copy">bc1q9vsjqjr6pjuc3vrgverx0v9ydst8s82ck4kpue</code>
                </div>
                <div class="crypto-address">
                    <span class="crypto-label">
                        Ethereum
                        <span class="crypto-copy-hint">(click to copy)</span>
                    </span>
                    <code class="crypto-code" id="eth-address"
                        onclick="copyCryptoAddress('0x3eec22630ca9fd77D22d362bF6C50dE29D3B84c4', 'eth-address')"
                        title="Click to copy">0x3eec22630ca9fd77D22d362bF6C50dE29D3B84c4</code>
                </div>
            </div>
        </div>
        <script>
            (function () {{
                const donateToggle = document.getElementById('donate-toggle');
                const donateOptions = document.getElementById('donate-options');

                donateToggle.addEventListener('click', function (e) {{
                    e.preventDefault();
                    e.stopPropagation();
                    donateOptions.classList.toggle('expanded');
                }});

                // Close when clicking outside
                document.addEventListener('click', function (e) {{
                    if (!e.target.closest('#support-toolbar-container')) {{
                        donateOptions.classList.remove('expanded');
                    }}
                }});

                function copyCryptoAddress(address, elementId) {{
                    navigator.clipboard.writeText(address).then(function () {{
                        const element = document.getElementById(elementId);
                        const originalText = element.textContent;
                        element.textContent = 'Copied!';
                        element.classList.add('copied');
                        setTimeout(function () {{
                            element.textContent = originalText;
                            element.classList.remove('copied');
                        }}, 2000);
                    }}).catch(function (err) {{
                        console.error('Failed to copy: ', err);
                        alert('Failed to copy to clipboard. Please copy manually: ' + address);
                    }});
                }}

                // Make copyCryptoAddress available globally
                window.copyCryptoAddress = copyCryptoAddress;
            }})();
        </script>
    </div>
    </div>
    <script>
        // Dynamic Data Loading
        document.addEventListener('DOMContentLoaded', async () => {{
            const currentPath = window.location.pathname;
            // Assumes structure is /ThemeName/index.html
            // We need to handle both local file system and server paths
            // For local file system, we might need to rely on the folder name being the theme folder name
            
            // Get the folder name. 
            // If path ends with index.html, go up one level.
            let folderName = '';
            const pathParts = currentPath.split('/');
            if (pathParts[pathParts.length - 1].toLowerCase() === 'index.html' || pathParts[pathParts.length - 1] === '') {{
                folderName = pathParts[pathParts.length - 2];
            }} else {{
                folderName = pathParts[pathParts.length - 1];
            }}
            
            // Decode URI component to handle spaces/special chars in folder name
            folderName = decodeURIComponent(folderName);

            const themeNameEl = document.getElementById('theme-name');
            const themeAuthorEl = document.getElementById('theme-author');
            const themeDescEl = document.getElementById('theme-description');

            // 1. Fetch from themes.json (Fast Cache)
            try {{
                const response = await fetch('../themes.json');
                if (response.ok) {{
                    const data = await response.json();
                    const theme = data.themes.find(t => t.folder === folderName);
                    if (theme) {{
                        if (theme.name) themeNameEl.textContent = theme.name;
                        if (theme.author) themeAuthorEl.textContent = 'by ' + theme.author;
                        if (theme.description) themeDescEl.textContent = theme.description;
                    }}
                }}
            }} catch (e) {{
                console.log('Could not load themes.json', e);
            }}

            // 2. Fetch from config.json (Authoritative)
            try {{
                const response = await fetch('config.json');
                if (response.ok) {{
                    const config = await response.json();
                    if (config.name) themeNameEl.textContent = config.name;
                    if (config.author) themeAuthorEl.textContent = 'by ' + config.author;
                    if (config.description) themeDescEl.textContent = config.description;
                }}
            }} catch (e) {{
                console.log('Could not load config.json', e);
            }}
        }});
    </script>
</body>
</html>
"""

def get_images(folder):
    # Extensions to look for
    extensions = ['*.png', '*.jpg', '*.jpeg', '*.gif', '*.PNG', '*.JPG', '*.JPEG', '*.GIF']
    images = []
    for ext in extensions:
        images.extend(glob.glob(os.path.join(folder, ext)))
    
    # Deduplicate based on lowercase filename and filter for cover/screenshot
    seen = set()
    unique_images = []
    allowed_names = {'cover', 'screenshot'}
    
    for img_path in sorted(images):
        filename = os.path.basename(img_path)
        lower_name = filename.lower()
        name_without_ext = os.path.splitext(lower_name)[0]
        
        # Check if the name (without extension) is 'cover' or 'screenshot'
        if name_without_ext in allowed_names:
            if lower_name not in seen:
                seen.add(lower_name)
                unique_images.append(filename)
            
    return unique_images

for theme in themes:
    folder = theme['folder']
    name = theme['name']
    description = theme.get('description', f'Y1 Theme: {name}')
    author = theme.get('author', 'Unknown')
    
    # Get all images in the folder
    if os.path.exists(folder):
        images = get_images(folder)
    else:
        images = []
        
    # Build gallery HTML
    if images:
        gallery_html = '<div class="gallery">'
        for img in images:
            gallery_html += f'''
            <div class="gallery-item">
                <img src="{img}" alt="{name} - {img}" class="screenshot">
                <span class="image-label">{img}</span>
            </div>
            '''
        gallery_html += '</div>'
    else:
        gallery_html = '<p>No preview images available.</p>'
    
    content = html_template.format(
        name=name,
        description=description,
        author=author,
        gallery_html=gallery_html
    )
    
    # Create directory if it doesn't exist
    if not os.path.exists(folder):
        os.makedirs(folder)
        
    with open(os.path.join(folder, 'index.html'), 'w') as f:
        f.write(content)
    print(f"Generated index.html for {folder} with {len(images)} images")

print("Done!")
