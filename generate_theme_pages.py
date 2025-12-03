import json
import os
import glob
import urllib.parse

def get_images(folder):
    extensions = ['*.png', '*.jpg', '*.jpeg', '*.gif', '*.PNG', '*.JPG', '*.JPEG', '*.GIF']
    images = []
    for ext in extensions:
        images.extend(glob.glob(os.path.join(folder, ext)))
    
    # Separate cover and screenshots
    # Cover image: match *cover*.* pattern (e.g., cover.png, gregcover.jpg, cover_image.png)
    cover_image = None
    screenshots = []
    
    for img_path in sorted(images):
        filename = os.path.basename(img_path)
        lower_name = filename.lower()
        name_without_ext = os.path.splitext(lower_name)[0]
        
        # Match any filename containing "cover" (wildcard pattern *cover*.*)
        if 'cover' in name_without_ext and not cover_image:
            cover_image = filename
        elif 'screenshot' in lower_name:
            screenshots.append(filename)
            
    return cover_image, screenshots

def get_font(folder):
    fonts = glob.glob(os.path.join(folder, '*.ttf'))
    if fonts:
        return os.path.basename(fonts[0])
    return None

# New: Get background images for blurred cycling
def get_backgrounds(folder):
    extensions = ['*.png', '*.jpg', '*.jpeg', '*.gif', '*.PNG', '*.JPG', '*.JPEG', '*.GIF']
    backgrounds = []
    for ext in extensions:
        for path in glob.glob(os.path.join(folder, ext)):
            filename = os.path.basename(path).lower()
            name_without_ext = os.path.splitext(filename)[0]
            if 'background' in name_without_ext:
                backgrounds.append(filename)
    return backgrounds

# 1. Load existing themes.json
try:
    with open('themes.json', 'r') as f:
        data = json.load(f)
        themes = data.get('themes', [])
except FileNotFoundError:
    themes = []

# 2. Scan directories for new themes
# A theme is a folder with a 'cover.*' image
all_dirs = [d for d in os.listdir('.') if os.path.isdir(d) and not d.startswith('.')]
known_folders = {t['folder'] for t in themes}

for folder in all_dirs:
    # Check for cover image using get_images
    cover_image, _ = get_images(folder)
    
    if cover_image:
        if folder not in known_folders:
            print(f"Discovered new theme: {folder}")
            
            # Try to read config.json
            theme_data = {
                'folder': folder,
                'name': folder, # Default
                'author': 'Unknown',
                'description': f'Theme for Innioasis Y1: {folder}'
            }
            
            config_path = os.path.join(folder, 'config.json')
            if os.path.exists(config_path):
                try:
                    with open(config_path, 'r') as cf:
                        config = json.load(cf)
                        # Update only if keys exist
                        if 'name' in config: theme_data['name'] = config['name']
                        if 'author' in config: theme_data['author'] = config['author']
                        if 'authorUrl' in config: theme_data['authorUrl'] = config['authorUrl']
                        if 'description' in config: theme_data['description'] = config['description']
                except Exception as e:
                    print(f"Error reading config.json for {folder}: {e}")
            
            themes.append(theme_data)
            known_folders.add(folder)

# 3. Write back to themes.json to ensure index.html sees them
with open('themes.json', 'w') as f:
    json.dump({'themes': themes}, f, indent=4)

# HTML Template (Using single braces for CSS/JS, placeholders will be replaced via .replace())
html_template = """<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{name} Theme - Official Innioasis Y1 Community Themes</title>
    <meta name="description" content="Download {name} theme for Innioasis Y1 MP3 player. Official community theme repository endorsed by Innioasis. {description}">
    <meta name="keywords" content="Innioasis Y1, Y1 themes, MP3 player themes, {name}, Y1 customization, official Y1 themes">
    <script src="https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js"></script>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
            margin: 0;
            color: #333;
            display: flex;
            flex-direction: column;
            align-items: center;
        }
        .container {
            background: white;
            padding: 40px;
            border-radius: 20px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            max-width: 800px;
            width: 100%;
            text-align: center;
            margin-bottom: 20px;
        }
        h1 {
            margin-bottom: 10px;
            color: #333;
        }
        .author {
            color: #666;
            margin-bottom: 20px;
            font-style: italic;
        }
        .description {
            line-height: 1.6;
            margin-bottom: 30px;
            color: #444;
        }
        .gallery {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        .gallery-item {
            display: flex;
            flex-direction: column;
            align-items: center;
        }
        .screenshot {
            width: 100%;
            border-radius: 10px;
            box-shadow: 0 5px 15px rgba(0,0,0,0.1);
            object-fit: contain;
            transition: transform 0.2s;
            cursor: pointer;
        }
        .screenshot:hover {
            transform: scale(1.02);
        }
        .image-label {
            margin-top: 8px;
            font-size: 0.8rem;
            color: #888;
        }
        .btn {
            width: 100%;
            padding: 12px 16px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            text-decoration: none;
            border-radius: 8px;
            font-size: 1rem;
            font-weight: 600;
            cursor: pointer;
            text-align: left;
            display: flex;
            align-items: center;
            justify-content: space-between;
            min-height: 44px;
            max-height: 44px;
            box-sizing: border-box;
            overflow: hidden;
            text-shadow: 0 1px 3px rgba(0, 0, 0, 0.5), 0 0 2px rgba(0, 0, 0, 0.8);
            position: relative;
            border: none;
            transition: all 0.3s;
        }
        .btn:hover, .btn:focus {
            /* No transform - buttons should not grow on hover */
        }
        .btn.install {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        }
        .btn.download {
            background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
        }
        .btn.share {
            background: transparent;
            color: #666;
            border: 1px solid #ddd;
            padding: 8px 15px;
            font-size: 0.9rem;
            box-shadow: none;
            text-shadow: none;
        }
        .btn.share:hover {
            background: #f5f5f5;
            /* No transform - buttons should not grow on hover */
        }
        /* Ensure button content is always visible above background */
        .btn > span {
            display: flex;
            align-items: center;
            justify-content: space-between;
            width: 100%;
            gap: 8px;
            position: relative;
            z-index: 2;
        }
        .btn > span > span:first-child {
            position: relative;
            z-index: 3;
            flex: 1;
            text-align: left;
        }
        .btn img {
            height: 100%;
            max-height: 100%;
            width: auto;
            flex-shrink: 0;
            object-fit: contain;
            display: block;
            position: relative;
            z-index: 3;
        }
        /* Arrow icon - hidden on desktop by default, shown on hover/focus/active */
        .btn .arrow-icon {
            height: 100%;
            max-height: 100%;
            width: auto;
            flex-shrink: 0;
            display: none;
            margin-left: 8px;
            position: relative;
            z-index: 3;
        }
        
        .btn .arrow-icon img {
            height: 100%;
            max-height: 100%;
            width: auto;
            flex-shrink: 0;
            object-fit: contain;
            display: block;
        }
        
        /* Show arrow on hover for desktop */
        @media (hover: hover) {
            .btn:hover .arrow-icon,
            .btn:focus .arrow-icon {
                display: block;
            }
        }
        
        /* Show arrow on mobile (always visible) */
        @media (hover: none) {
            .btn .arrow-icon {
                display: block;
            }
        }
        {font_css}
        .header-section {
            display: flex;
            align-items: center;
            gap: 30px;
            margin-bottom: 20px;
        }
        .header-text {
            flex: 1;
        }
        .cover-image {
            width: 200px;
            height: auto;
            border-radius: 10px;
            box-shadow: 0 5px 15px rgba(0,0,0,0.2);
            cursor: pointer;
            transition: transform 0.2s;
        }
        .cover-image:hover {
            transform: scale(1.05);
        }
        .screenshots-section {
            margin: 30px 0;
        }
        .screenshots-section h3 {
            color: #667eea;
            margin-bottom: 15px;
        }
        /* Image Carousel */
        .image-carousel-section {
            margin: 30px 0;
        }
        .image-carousel-section h3 {
            color: #667eea;
            margin-bottom: 15px;
            font-size: 1rem;
        }
        .image-carousel-container {
            position: relative;
            width: 100%;
            overflow: hidden;
            background: #f5f5f5;
            border-radius: 8px;
            padding: 10px;
        }
        .image-carousel-wrapper {
            display: flex;
            gap: 10px;
            overflow-x: auto;
            scroll-behavior: smooth;
            scrollbar-width: thin;
            scrollbar-color: #667eea #f5f5f5;
            padding: 5px 0;
        }
        .image-carousel-wrapper::-webkit-scrollbar {
            height: 6px;
        }
        .image-carousel-wrapper::-webkit-scrollbar-track {
            background: #f5f5f5;
            border-radius: 3px;
        }
        .image-carousel-wrapper::-webkit-scrollbar-thumb {
            background: #667eea;
            border-radius: 3px;
        }
        .image-carousel-item {
            flex: 0 0 auto;
            width: 120px;
            text-align: center;
            cursor: pointer;
            transition: transform 0.2s;
        }
        .image-carousel-item:hover {
            transform: scale(1.05);
        }
        .image-carousel-item img {
            width: 100%;
            height: 80px;
            object-fit: contain;
            background: white;
            border-radius: 4px;
            border: 1px solid #ddd;
            padding: 4px;
        }
        .image-carousel-item .image-name {
            margin-top: 5px;
            font-size: 0.75rem;
            color: #666;
            word-break: break-word;
            line-height: 1.2;
        }
        .image-carousel-nav {
            display: flex;
            justify-content: center;
            gap: 8px;
            margin-top: 10px;
        }
        .image-carousel-nav-btn {
            background: #667eea;
            color: white;
            border: none;
            border-radius: 4px;
            padding: 6px 12px;
            font-size: 0.85rem;
            cursor: pointer;
            transition: background 0.2s;
        }
        .image-carousel-nav-btn:hover {
            background: #5568d3;
        }
        .image-carousel-nav-btn:disabled {
            background: #ccc;
            cursor: not-allowed;
        }
        .image-carousel-nav-info {
            display: flex;
            align-items: center;
            font-size: 0.85rem;
            color: #666;
            padding: 0 10px;
        }
        /* Lightbox */
        .lightbox {
            display: none;
            position: fixed;
            z-index: 1000;
            left: 0;
            top: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0,0,0,0.9);
            justify-content: center;
            align-items: center;
        }
        .lightbox.active {
            display: flex;
        }
        .lightbox-content {
            max-width: 90%;
            max-height: 90%;
            border-radius: 5px;
            box-shadow: 0 0 20px rgba(255,255,255,0.2);
        }
        .lightbox-close {
            position: absolute;
            top: 20px;
            right: 30px;
            color: #f1f1f1;
            font-size: 40px;
            font-weight: bold;
            cursor: pointer;
            transition: 0.3s;
        }
        .lightbox-close:hover {
            color: #bbb;
        }
        .back-link {
            display: block;
            margin-top: 20px;
            color: #666;
            text-decoration: none;
            font-size: 0.9rem;
        }
        .back-link:hover {
            text-decoration: underline;
        }
        /* Existing CSS */
        .bg-cycle {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-size: cover;
            background-position: center;
            filter: blur(20px) brightness(0.5);
            z-index: -1;
            opacity: 0;
            transition: opacity 1s ease-in-out;
        }
        /* Download link when install is available */
        .download-link-small {
            font-size: 0.85rem;
            color: #667eea;
            text-decoration: none;
            margin-left: 10px;
        }
        .download-link-small:hover {
            text-decoration: underline;
        }
        /* Install Instructions Modal */
        .install-modal {
            display: none;
            position: fixed;
            z-index: 2000;
            left: 0;
            top: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0,0,0,0.7);
            justify-content: center;
            align-items: center;
        }
        .install-modal.active {
            display: flex;
        }
        .install-modal-content {
            background: white;
            padding: 30px;
            border-radius: 15px;
            max-width: 500px;
            width: 90%;
            box-shadow: 0 10px 40px rgba(0,0,0,0.3);
            position: relative;
        }
        .install-modal-close {
            position: absolute;
            top: 15px;
            right: 20px;
            font-size: 28px;
            font-weight: bold;
            color: #999;
            cursor: pointer;
            line-height: 1;
        }
        .install-modal-close:hover {
            color: #333;
        }
        .install-modal h3 {
            margin-top: 0;
            color: #667eea;
            font-size: 1.3rem;
        }
        .install-modal ol {
            margin: 20px 0;
            padding-left: 25px;
        }
        .install-modal li {
            margin: 10px 0;
            line-height: 1.6;
        }
        .install-modal-btn {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: none;
            border-radius: 8px;
            padding: 12px 30px;
            font-size: 1rem;
            font-weight: 600;
            cursor: pointer;
            margin-top: 20px;
            width: 100%;
        }
        .install-modal-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 5px 15px rgba(102, 126, 234, 0.4);
        }
    </style>
</head>
<body>
    <!-- 
    IMPORTANT: This page is designed to load information programmatically.
    
    DATA LOADING PRIORITY (Source of Truth):
    1. config.json (in this theme's folder) = AUTHORITATIVE SOURCE
    2. themes.json (in parent directory) = FAST CACHE/FALLBACK
    3. Hardcoded values in this HTML = LAST RESORT ONLY
    
    This design allows users to:
    - Copy this index.html to another theme folder without editing it
    - Update theme info by editing config.json or themes.json
    - The page will automatically use the most up-to-date information
    
    All theme data (name, author, description, colors, images) should be loaded
    from config.json or themes.json when possible, not from hardcoded HTML.
    -->
    {background_cycle_html}
    <div class="container">
        <div class="header-section">
            <div class="header-text">
                <!-- Title and subtitle removed; using About line instead -->
                <h2 {title_style}>About the {name} Theme for Innioasis Y1</h2>
                <p class="description" id="theme-description">{description}</p>
            </div>
            {cover_html}
        </div>
        
        {screenshots_section_html}
        
        <div class="image-carousel-section">
            <h3 {title_style}>All Theme Images</h3>
            <div class="image-carousel-container">
                <div class="image-carousel-wrapper" id="image-carousel-wrapper">
                    <div style="text-align: center; padding: 20px; color: #999;">Loading images...</div>
                </div>
                <div class="image-carousel-nav">
                    <button class="image-carousel-nav-btn" id="carousel-prev" onclick="scrollCarousel(-1)">← Prev</button>
                    <div class="image-carousel-nav-info" id="carousel-info">- / -</div>
                    <button class="image-carousel-nav-btn" id="carousel-next" onclick="scrollCarousel(1)">Next →</button>
                </div>
            </div>
        </div>
        
        <div class="button-group" style="margin-top: 30px;">
            <button id="install-btn" onclick="showInstallInstructions()" class="btn install" style="display: none;">
                <span style="display: flex; align-items: center; justify-content: space-between; width: 100%; position: relative; z-index: 2;">
                    <span style="position: relative; z-index: 3; flex: 1; text-align: left;">Install</span>
                </span>
            </button>
            <button id="download-btn-full" onclick="downloadTheme()" class="btn download">
                <span style="display: flex; align-items: center; justify-content: space-between; width: 100%; position: relative; z-index: 2;">
                    <span style="position: relative; z-index: 3; flex: 1; text-align: left;">Download</span>
                </span>
            </button>
            <a href="#" id="download-link-small" onclick="downloadTheme(); return false;" class="download-link-small" style="display: none;">📦 Download ZIP instead</a>
        </div>
        <div id="download-status" style="margin-top: 10px; color: #666; display: none;">Starting download...</div>

        <!-- Install Instructions Modal -->
        <div id="install-modal" class="install-modal" onclick="if(event.target === this) closeInstallModal()">
            <div class="install-modal-content" onclick="event.stopPropagation()">
                <span class="install-modal-close" onclick="closeInstallModal()">&times;</span>
                <h3>Prepare Your Y1 Device</h3>
                <p>Before installing, please follow these steps:</p>
                <ol>
                    <li><strong>Power up your Y1 device</strong></li>
                    <li><strong>Connect your Y1 to your computer via USB</strong></li>
                    <li><strong>Enable USB storage mode</strong> on your Y1 (if prompted)</li>
                    <li>On the next screen, <strong>select the "Themes" folder</strong> on your Y1 device</li>
                </ol>
                <p style="color: #666; font-size: 0.9rem; margin-top: 15px;">The installation will automatically copy all theme files to your device.</p>
                <button class="install-modal-btn" onclick="proceedWithInstall()">Continue to Folder Selection</button>
            </div>
        </div>

        <!-- Feature Support Section -->
        <!-- This section shows features from config.json that are not supported by this theme -->
        <!-- Features are checked against MelodyMuncher's complete config.json (100% spec usage) -->
        <div id="feature-support-section" style="margin-top: 30px; display: none;">
            <h3 {title_style}>Feature Support</h3>
            <div id="unsupported-features" style="background: #f9f9f9; border-radius: 8px; padding: 15px; border-left: 4px solid #ff9800;">
                <p style="margin: 0 0 10px 0; font-weight: 600; color: #666;">To the creator:</p>
                <p style="margin: 0 0 10px 0; font-size: 0.9rem; color: #666;">Add these images to your theme to ensure compatibility with:</p>
                <ul id="unsupported-features-list" style="margin: 0 0 10px 0; padding-left: 20px; color: #888; list-style-type: disc;">
                    <!-- Features will be populated dynamically -->
                </ul>
                <p style="margin: 10px 0 0 0; font-size: 0.85rem; color: #999; font-style: italic;">
                    These features may not be available to users at present but are defined in the theme spec in firmware 2.8.2 and are to be expected in future releases and where features are only available in certain regions.
                </p>
            </div>
        </div>
        
        <!-- SEO Content -->
        <div class="seo-content" style="margin-top: 40px; text-align: left; color: #666; font-size: 0.9rem; line-height: 1.6;">
            <p>This theme was made by <strong id="author-display">{author}</strong>. <span id="description-display">{description}</span></p>
        </div>
        
        <div style="margin-top: 30px; font-size: 0.9rem; color: #888;">
            <a href="../index.html" class="back-link">← Back to All Themes</a>
            <span style="margin: 0 10px;">|</span>
            <a href="https://github.com/y1-community/InnioasisY1Themes/tree/main/{folder}#readme" target="_blank" style="color: #888; text-decoration: none;">✏️ Edit or Update this Theme</a>
        </div>
    </div>

    <!-- Lightbox Modal -->
    <div id="lightbox" class="lightbox" onclick="closeLightbox()">
        <span class="lightbox-close" onclick="closeLightbox()">&times;</span>
        <img class="lightbox-content" id="lightbox-img" onclick="event.stopPropagation()">
    </div>

    <!-- Toast Notification -->
    <div id="toast" style="visibility: hidden; min-width: 250px; margin-left: -125px; background-color: #333; color: #fff; text-align: center; border-radius: 2px; padding: 16px; position: fixed; z-index: 1; left: 50%; bottom: 30px; font-size: 17px;">Link Copied to Clipboard!</div>

    <div class="footer" style="margin-top: 50px; text-align: center; color: #eee; font-size: 0.9rem; padding-bottom: 20px;">
        <p><strong>Community Maintainers:</strong> <a href="https://ryanspecter.uk" target="_blank" style="color: #fff; text-decoration: underline;">Ryan Specter</a> & <a href="https://reddit.com/user/dmitrimedina" target="_blank" style="color: #fff; text-decoration: underline;">Dmitri Medina</a></p>
        <p>BETA | This site is open source. <a href="https://github.com/y1-community/InnioasisY1Themes" target="_blank" style="color: #fff;">Contribute on GitHub</a></p>
    </div>

    <!-- Support Toolbar -->
    <style>
        #support-toolbar {
            position: fixed;
            bottom: 20px;
            right: 20px;
            z-index: 1000;
            display: flex;
            align-items: center;
            justify-content: flex-end;
            gap: 12px;
            padding: 8px 12px;
            background: #f0f0f3;
            border-radius: 30px;
            box-shadow:
                8px 8px 16px rgba(163, 177, 198, 0.6),
                -8px -8px 16px rgba(255, 255, 255, 0.5);
            transition: all 0.3s ease;
            flex-wrap: wrap;
        }

        .support-toolbar-btn {
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
        }

        .support-toolbar-btn:hover {
            box-shadow:
                2px 2px 4px rgba(163, 177, 198, 0.6),
                -2px -2px 4px rgba(255, 255, 255, 0.5);
            transform: translateY(-1px);
        }

        .support-toolbar-btn:active {
            box-shadow:
                inset 2px 2px 4px rgba(163, 177, 198, 0.6),
                inset -2px -2px 4px rgba(255, 255, 255, 0.5);
            transform: translateY(0);
        }

        .support-toolbar-btn.primary {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            box-shadow:
                4px 4px 8px rgba(102, 126, 234, 0.4),
                -4px -4px 8px rgba(118, 75, 162, 0.3);
        }

        .support-toolbar-btn.primary:hover {
            box-shadow:
                2px 2px 4px rgba(102, 126, 234, 0.4),
                -2px -2px 4px rgba(118, 75, 162, 0.3);
        }

        .support-toolbar-icon {
            font-size: 16px;
            display: inline-block;
            line-height: 1;
        }

        #donate-options {
            display: none;
            gap: 10px;
            align-items: center;
            flex-wrap: wrap;
        }

        #donate-options.expanded {
            display: flex;
        }

        .crypto-address {
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
        }

        .crypto-label {
            font-size: 11px;
            font-weight: 700;
            color: #667eea;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            display: flex;
            align-items: center;
            gap: 6px;
        }

        .crypto-copy-hint {
            font-size: 9px;
            font-weight: 400;
            color: #86868b;
            text-transform: none;
            letter-spacing: 0;
        }

        .crypto-code {
            font-size: 10px;
            font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace;
            color: #2d2d2d;
            word-break: break-all;
            cursor: pointer;
            padding: 4px 6px;
            background: rgba(0, 0, 0, 0.05);
            border-radius: 6px;
            transition: all 0.2s ease;
        }

        .crypto-code:hover {
            background: rgba(0, 0, 0, 0.1);
        }

        .crypto-code.copied {
            background: rgba(34, 197, 94, 0.2);
            color: #22c55e;
        }

        @media (max-width: 768px) {
            #support-toolbar {
                bottom: 15px;
                right: 15px;
                left: 15px;
                justify-content: center;
                padding: 6px 10px;
                gap: 8px;
                border-radius: 25px;
            }

            .support-toolbar-btn {
                padding: 8px 14px;
                font-size: 12px;
            }

            .support-toolbar-icon {
                font-size: 16px;
            }

            .crypto-address {
                min-width: 120px;
                padding: 6px 10px;
            }

            .crypto-code {
                font-size: 9px;
            }
        }

        @media (prefers-color-scheme: dark) {
            #support-toolbar {
                background: #2d2d2d;
                box-shadow:
                    8px 8px 16px rgba(0, 0, 0, 0.4),
                    -8px -8px 16px rgba(60, 60, 60, 0.3);
            }

            .support-toolbar-btn {
                background: #2d2d2d;
                color: #e0e0e0;
                box-shadow:
                    4px 4px 8px rgba(0, 0, 0, 0.4),
                    -4px -4px 8px rgba(60, 60, 60, 0.3);
            }

            .support-toolbar-btn:hover {
                box-shadow:
                    2px 2px 4px rgba(0, 0, 0, 0.4),
                    -2px -2px 4px rgba(60, 60, 60, 0.3);
            }

            .support-toolbar-btn:active {
                box-shadow:
                    inset 2px 2px 4px rgba(0, 0, 0, 0.4),
                    inset -2px -2px 4px rgba(60, 60, 60, 0.3);
            }

            .crypto-address {
                background: #2d2d2d;
                box-shadow:
                    2px 2px 4px rgba(0, 0, 0, 0.4),
                    -2px -2px 4px rgba(60, 60, 60, 0.3);
            }

            .crypto-code {
                color: #e0e0e0;
                background: rgba(255, 255, 255, 0.05);
            }

            .crypto-code:hover {
                background: rgba(255, 255, 255, 0.1);
            }
        }
    </style>
    <div id="support-toolbar">
        <a href="https://github.com/y1-community/InnioasisY1Themes/tree/main/MelodyMuncher#readme" class="support-toolbar-btn primary" target="_blank"
            rel="noopener noreferrer">
            <span class="support-toolbar-icon">💙</span>
            <span>Submit Themes</span>
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
        (function () {
            const donateToggle = document.getElementById('donate-toggle');
            const donateOptions = document.getElementById('donate-options');

            donateToggle.addEventListener('click', function (e) {
                e.preventDefault();
                e.stopPropagation();
                donateOptions.classList.toggle('expanded');
            });

            // Close when clicking outside
            document.addEventListener('click', function (e) {
                if (!e.target.closest('#support-toolbar')) {
                    donateOptions.classList.remove('expanded');
                }
            });

            function copyCryptoAddress(address, elementId) {
                navigator.clipboard.writeText(address).then(function () {
                    const element = document.getElementById(elementId);
                    const originalText = element.textContent;
                    element.textContent = 'Copied!';
                    element.classList.add('copied');
                    setTimeout(function () {
                        element.textContent = originalText;
                        element.classList.remove('copied');
                    }, 2000);
                }).catch(function (err) {
                    console.error('Failed to copy: ', err);
                    alert('Failed to copy to clipboard. Please copy manually: ' + address);
                });
            }

            // Make copyCryptoAddress available globally
            window.copyCryptoAddress = copyCryptoAddress;
        })();
    </script>

    <script>
        // Share Theme Function
        async function shareTheme() {
            const url = window.location.href;
            const title = document.title;
            const text = "Check out this theme for Innioasis Y1!";

            if (navigator.share) {
                try {
                    await navigator.share({
                        title: title,
                        text: text,
                        url: url
                    });
                    console.log('Shared successfully');
                } catch (err) {
                    console.log('Error sharing:', err);
                }
            } else {
                // Fallback to clipboard
                navigator.clipboard.writeText(url).then(() => {
                    const toast = document.getElementById("toast");
                    toast.style.visibility = "visible";
                    setTimeout(() => { toast.style.visibility = "hidden"; }, 3000);
                }).catch(err => {
                    console.error('Failed to copy: ', err);
                    alert('Failed to copy link. URL: ' + url);
                });
            }
        }

        // Apply theme styling to buttons
        async function applyThemeButtonStyling() {
            try {
                const configResponse = await fetch('./config.json');
                if (!configResponse.ok) return;
                
                const config = await configResponse.json();
                const itemConfig = config?.itemConfig || {};
                const menuConfig = config?.menuConfig || {};
                const dialogConfig = config?.dialogConfig || {};
                
                // Get button background image - same logic as main page
                let selectedBgImage = itemConfig.itemSelectedBackground || menuConfig.menuItemSelectedBackground || 
                                     dialogConfig.dialogOptionSelectedBackground || null;
                
                // IMPORTANT: If config specifies "1.png", check if a suffixed version exists (e.g., "1_YS.png")
                // and ALWAYS prefer the suffixed version if available (even if config says "1.png")
                if (selectedBgImage && selectedBgImage.trim() !== '') {
                    // Check if this is a plain "1.png" type file (not already suffixed)
                    const isPlainOnePng = /^1\.(png|jpg|jpeg|gif|svg)$/i.test(selectedBgImage);
                    if (isPlainOnePng) {
                        // Config has "1.png" - try to find suffixed version
                        const imageExtensions = ['png', 'jpg', 'jpeg', 'gif'];
                        const commonSuffixes = ['_YS', '_YS1', '_1'];
                        for (const suffix of commonSuffixes) {
                            for (const ext of imageExtensions) {
                                const suffixedFile = `1${suffix}.${ext}`;
                                try {
                                    const testResponse = await fetch(`./${suffixedFile}`);
                                    if (testResponse.ok) {
                                        selectedBgImage = suffixedFile; // ALWAYS prefer suffixed version
                                        break;
                                    }
                                } catch (e) {
                                    // Continue trying
                                }
                            }
                            if (selectedBgImage !== '1.png' && selectedBgImage !== '1.jpg') break;
                        }
                    }
                }
                
                // Fallback: Try to find 1*.png files (prioritize suffixed versions)
                if (!selectedBgImage || selectedBgImage.trim() === '') {
                    try {
                        // Try common patterns - suffixed versions first
                        const commonFiles = ['1_YS.png', '1_YS.jpg', '1.png', '1.jpg'];
                        for (const file of commonFiles) {
                            const testResponse = await fetch(`./${file}`);
                            if (testResponse.ok) {
                                selectedBgImage = file;
                                break;
                            }
                        }
                    } catch (e) {
                        // Ignore errors
                    }
                }
                
                // Get button background color
                let buttonBgColor = menuConfig.menuBackgroundColor || 
                                  dialogConfig.dialogBackgroundColor || 
                                  itemConfig.itemBackgroundColor ||
                                  '#667eea';
                
                // Get button text color
                let buttonTextColor = itemConfig.itemSelectedTextColor || 
                                     menuConfig.menuItemSelectedTextColor || 
                                     dialogConfig.dialogOptionSelectedTextColor ||
                                     '#ffffff';
                
                // Get arrow icon - try config first, then look for *RightArrow*.* pattern
                let arrowIconFile = itemConfig.itemRightArrow || null;
                // If not in config, try common patterns
                if (!arrowIconFile || arrowIconFile.trim() === '') {
                    const commonArrowFiles = ['2_YS.png', '2_YS.jpg', '2.png', '2.jpg'];
                    for (const file of commonArrowFiles) {
                        try {
                            const testResponse = await fetch(`./${file}`);
                            if (testResponse.ok) {
                                arrowIconFile = file;
                                break;
                            }
                        } catch (e) {
                            // Continue trying
                        }
                    }
                }
                
                // Build button style
                let buttonBgStyle = '';
                if (selectedBgImage && selectedBgImage.trim() !== '') {
                    buttonBgStyle = `background-color: ${buttonBgColor}; background-image: url('./${selectedBgImage}'); background-size: 100% 100%; background-repeat: no-repeat; background-position: center;`;
                } else {
                    buttonBgStyle = `background-color: ${buttonBgColor};`;
                }
                
                const buttonStyle = `${buttonBgStyle} color: ${buttonTextColor}; text-shadow: 0 1px 3px rgba(0, 0, 0, 0.5), 0 0 2px rgba(0, 0, 0, 0.8);`;
                
                // Apply to all buttons (install and download)
                const buttons = document.querySelectorAll('.btn.install, .btn.download');
                buttons.forEach(btn => {
                    // Apply button style (background, color, text shadow)
                    // Preserve existing display/flex properties, only override background/color/text-shadow
                    const existingStyle = btn.getAttribute('style') || '';
                    // Remove old background, color, and text-shadow from existing style
                    const cleanedStyle = existingStyle
                        .replace(/background[^;]*;?/gi, '')
                        .replace(/color[^;]*;?/gi, '')
                        .replace(/text-shadow[^;]*;?/gi, '')
                        .trim();
                    // Combine new theme styles with preserved styles
                    btn.setAttribute('style', buttonStyle + (cleanedStyle ? '; ' + cleanedStyle : ''));
                    
                    // Add arrow icon if available
                    if (arrowIconFile && arrowIconFile.trim() !== '') {
                        const existingArrow = btn.querySelector('.arrow-icon');
                        if (!existingArrow) {
                            const arrowSpan = document.createElement('span');
                            arrowSpan.className = 'arrow-icon';
                            const arrowImg = document.createElement('img');
                            arrowImg.src = `./${arrowIconFile}`;
                            arrowImg.alt = '→';
                            arrowImg.style.cssText = 'height: 100%; max-height: 100%; width: auto; flex-shrink: 0; object-fit: contain; display: block; position: relative; z-index: 3;';
                            arrowSpan.appendChild(arrowImg);
                            
                            // Find the inner span (flex container) and add arrow to it
                            // Structure should be: btn > span (flex container) > span (text) + span (arrow-icon)
                            const flexContainer = btn.querySelector('span');
                            if (flexContainer) {
                                // Add arrow to the flex container (same level as text span)
                                flexContainer.appendChild(arrowSpan);
                            } else {
                                // Fallback: add directly to button
                                btn.appendChild(arrowSpan);
                            }
                        }
                    }
                });
            } catch (error) {
                console.warn('Could not apply theme button styling:', error);
            }
        }
        
        // Dynamic Data Loading
        // IMPORTANT: This page loads information programmatically from:
        // 1. config.json (in this theme's folder) - AUTHORITATIVE SOURCE
        // 2. themes.json (in parent directory) - FAST CACHE/FALLBACK  
        // 3. Hardcoded HTML values - LAST RESORT ONLY
        // This allows users to copy this index.html to another theme without editing it.
        document.addEventListener('DOMContentLoaded', async () => {
            const currentPath = window.location.pathname;
            let folderName = '';
            const pathParts = currentPath.split('/');
            if (pathParts[pathParts.length - 1].toLowerCase() === 'index.html' || pathParts[pathParts.length - 1] === '') {
                folderName = pathParts[pathParts.length - 2];
            } else {
                folderName = pathParts[pathParts.length - 1];
            }
            
            folderName = decodeURIComponent(folderName);

            // Check for File System Access API support
            if ('showDirectoryPicker' in window) {
                document.getElementById('install-btn').style.display = 'inline-block';
                // Hide full download button, show small link
                document.getElementById('download-btn-full').style.display = 'none';
                document.getElementById('download-link-small').style.display = 'inline';
            }
            
            // Apply theme button styling
            await applyThemeButtonStyling();
            
            // Check for unsupported features
            await checkFeatureSupport();
            
            // Load and update author information with authorUrl link
            await loadAuthorInfo();
        });
        
        // Load author information from config.json (priority) or themes.json (fallback)
        async function loadAuthorInfo() {
            try {
                let author = '{author}';
                let authorUrl = null;
                let description = '{description}';
                
                // Try to load from config.json first (authoritative source)
                try {
                    const configResponse = await fetch('./config.json');
                    if (configResponse.ok) {
                        const config = await configResponse.json();
                        if (config.author) author = config.author;
                        if (config.authorUrl) authorUrl = config.authorUrl;
                        if (config.description) description = config.description;
                    }
                } catch (e) {
                    console.warn('Could not load config.json:', e);
                }
                
                // Fallback to themes.json if authorUrl not found in config.json
                if (!authorUrl) {
                    try {
                        const themesResponse = await fetch('../themes.json');
                        if (themesResponse.ok) {
                            const themesData = await themesResponse.json();
                            const currentPath = window.location.pathname;
                            let folderName = '';
                            const pathParts = currentPath.split('/');
                            if (pathParts[pathParts.length - 1].toLowerCase() === 'index.html' || pathParts[pathParts.length - 1] === '') {
                                folderName = pathParts[pathParts.length - 2];
                            } else {
                                folderName = pathParts[pathParts.length - 1];
                            }
                            folderName = decodeURIComponent(folderName);
                            
                            const theme = themesData.themes.find(t => t.folder === folderName);
                            if (theme) {
                                if (theme.author) author = theme.author;
                                if (theme.authorUrl) authorUrl = theme.authorUrl;
                                if (theme.description) description = theme.description;
                            }
                        }
                    } catch (e) {
                        console.warn('Could not load themes.json:', e);
                    }
                }
                
                // Update author display with link if authorUrl is available
                const authorDisplay = document.getElementById('author-display');
                const descriptionDisplay = document.getElementById('description-display');
                
                if (authorDisplay) {
                    if (authorUrl) {
                        authorDisplay.innerHTML = `<a href="${authorUrl}" target="_blank" rel="noopener noreferrer" style="color: inherit; text-decoration: underline;">${author}</a>`;
                    } else {
                        authorDisplay.textContent = author;
                    }
                }
                
                if (descriptionDisplay) {
                    descriptionDisplay.textContent = description;
                }
            } catch (error) {
                console.warn('Could not load author information:', error);
            }
        }
        
        // Check which features are not supported by this theme
        async function checkFeatureSupport() {
            try {
                const configResponse = await fetch('./config.json');
                if (!configResponse.ok) return;
                
                const config = await configResponse.json();
                
                // Define all possible features that should be checked
                // Based on MelodyMuncher's complete config.json (100% spec usage)
                // Format: { key: 'configKey', displayName: 'Display Name', section: 'homePageConfig' | 'settingConfig' }
                // For self-explanatory features (like "backlight_60"), displayName is the key itself
                // For features needing explanation, provide a friendly displayName
                const allFeatures = [
                    // homePageConfig features
                    { key: 'ebook', displayName: 'E-book Reader', section: 'homePageConfig' },
                    { key: 'calculator', displayName: 'Calculator', section: 'homePageConfig' },
                    { key: 'calendar', displayName: 'Calendar', section: 'homePageConfig' },
                    
                    // settingConfig features (comprehensive list from MelodyMuncher)
                    { key: 'settingMask', displayName: 'settingMask', section: 'settingConfig' },
                    { key: 'shutdown', displayName: 'shutdown', section: 'settingConfig' },
                    { key: 'timedShutdown_off', displayName: 'timedShutdown_off', section: 'settingConfig' },
                    { key: 'timedShutdown_10', displayName: 'timedShutdown_10', section: 'settingConfig' },
                    { key: 'timedShutdown_20', displayName: 'timedShutdown_20', section: 'settingConfig' },
                    { key: 'timedShutdown_30', displayName: 'timedShutdown_30', section: 'settingConfig' },
                    { key: 'timedShutdown_60', displayName: 'timedShutdown_60', section: 'settingConfig' },
                    { key: 'timedShutdown_90', displayName: 'timedShutdown_90', section: 'settingConfig' },
                    { key: 'timedShutdown_120', displayName: 'timedShutdown_120', section: 'settingConfig' },
                    { key: 'shuffleOn', displayName: 'shuffleOn', section: 'settingConfig' },
                    { key: 'shuffleOff', displayName: 'shuffleOff', section: 'settingConfig' },
                    { key: 'repeatOff', displayName: 'repeatOff', section: 'settingConfig' },
                    { key: 'repeatAll', displayName: 'repeatAll', section: 'settingConfig' },
                    { key: 'repeatOne', displayName: 'repeatOne', section: 'settingConfig' },
                    { key: 'equalizer_normal', displayName: 'equalizer_normal', section: 'settingConfig' },
                    { key: 'equalizer_classical', displayName: 'equalizer_classical', section: 'settingConfig' },
                    { key: 'equalizer_dance', displayName: 'equalizer_dance', section: 'settingConfig' },
                    { key: 'equalizer_flat', displayName: 'equalizer_flat', section: 'settingConfig' },
                    { key: 'equalizer_folk', displayName: 'equalizer_folk', section: 'settingConfig' },
                    { key: 'equalizer_heavymetal', displayName: 'equalizer_heavymetal', section: 'settingConfig' },
                    { key: 'equalizer_hiphop', displayName: 'equalizer_hiphop', section: 'settingConfig' },
                    { key: 'equalizer_jazz', displayName: 'equalizer_jazz', section: 'settingConfig' },
                    { key: 'equalizer_pop', displayName: 'equalizer_pop', section: 'settingConfig' },
                    { key: 'equalizer_rock', displayName: 'equalizer_rock', section: 'settingConfig' },
                    { key: 'keyLockOn', displayName: 'keyLockOn', section: 'settingConfig' },
                    { key: 'keyLockOff', displayName: 'keyLockOff', section: 'settingConfig' },
                    { key: 'keyToneOn', displayName: 'keyToneOn', section: 'settingConfig' },
                    { key: 'keyToneOff', displayName: 'keyToneOff', section: 'settingConfig' },
                    { key: 'keyVibrationOn', displayName: 'keyVibrationOn', section: 'settingConfig' },
                    { key: 'keyVibrationOff', displayName: 'keyVibrationOff', section: 'settingConfig' },
                    { key: 'wallpaper', displayName: 'wallpaper', section: 'settingConfig' },
                    { key: 'backlight_10', displayName: 'backlight_10', section: 'settingConfig' },
                    { key: 'backlight_15', displayName: 'backlight_15', section: 'settingConfig' },
                    { key: 'backlight_30', displayName: 'backlight_30', section: 'settingConfig' },
                    { key: 'backlight_45', displayName: 'backlight_45', section: 'settingConfig' },
                    { key: 'backlight_60', displayName: 'backlight_60', section: 'settingConfig' },
                    { key: 'backlight_120', displayName: 'backlight_120', section: 'settingConfig' },
                    { key: 'backlight_300', displayName: 'backlight_300', section: 'settingConfig' },
                    { key: 'backlight_always', displayName: 'backlight_always', section: 'settingConfig' },
                    { key: 'brightness', displayName: 'brightness', section: 'settingConfig' },
                    { key: 'displayBatteryOn', displayName: 'displayBatteryOn', section: 'settingConfig' },
                    { key: 'displayBatteryOff', displayName: 'displayBatteryOff', section: 'settingConfig' },
                    { key: 'dateTime', displayName: 'dateTime', section: 'settingConfig' },
                    { key: 'language', displayName: 'language', section: 'settingConfig' },
                    { key: 'launcher', displayName: 'Rockbox Icon', section: 'settingConfig' },
                    { key: 'factoryReset', displayName: 'factoryReset', section: 'settingConfig' },
                    { key: 'clearCache', displayName: 'clearCache', section: 'settingConfig' },
                    { key: 'theme', displayName: 'theme', section: 'settingConfig' },
                    { key: 'fileExtensionOn', displayName: 'fileExtensionOn', section: 'settingConfig' },
                    { key: 'fileExtensionOff', displayName: 'fileExtensionOff', section: 'settingConfig' }
                ];
                
                const unsupportedFeatures = [];
                
                // Check each feature
                for (const feature of allFeatures) {
                    const section = config[feature.section] || {};
                    const featureValue = section[feature.key];
                    
                    // Feature is unsupported if:
                    // 1. The key doesn't exist in the section
                    // 2. The value is empty string
                    // 3. The value is null or undefined
                    // 4. The value is not a string (should be a string with filename)
                    if (!featureValue || 
                        (typeof featureValue === 'string' && featureValue.trim() === '') ||
                        typeof featureValue !== 'string') {
                        unsupportedFeatures.push(feature.displayName);
                    }
                }
                
                // Display unsupported features if any
                if (unsupportedFeatures.length > 0) {
                    const section = document.getElementById('feature-support-section');
                    const list = document.getElementById('unsupported-features-list');
                    
                    if (section && list) {
                        list.innerHTML = unsupportedFeatures.map(feature => 
                            `<li style="margin-bottom: 5px;">${feature}</li>`
                        ).join('');
                        section.style.display = 'block';
                    }
                }
            } catch (error) {
                console.warn('Could not check feature support:', error);
            }
        }
        
        // Show install instructions modal
        function showInstallInstructions() {
            document.getElementById('install-modal').classList.add('active');
            document.body.style.overflow = 'hidden';
        }
        
        // Close install instructions modal
        function closeInstallModal() {
            document.getElementById('install-modal').classList.remove('active');
            document.body.style.overflow = 'auto';
        }
        
        // Proceed with installation after user confirms
        function proceedWithInstall() {
            closeInstallModal();
            installTheme();
        }

        // Install Theme directly to device
        async function installTheme() {
            const folderName = '{folder}';
            const btn = document.getElementById('install-btn');
            const status = document.getElementById('download-status');
            
            try {
                // 1. Ask user to select Themes folder
                status.style.display = 'block';
                status.textContent = 'Please select the "Themes" folder on your Y1 device...';
                
                const dirHandle = await window.showDirectoryPicker({
                    mode: 'readwrite',
                    startIn: 'downloads'
                });
                
                // Verify it's likely the right folder (optional, but good UX)
                if (dirHandle.name !== 'Themes' && dirHandle.name !== 'themes') {
                    if (!confirm(`You selected "${dirHandle.name}", but usually this should be the "Themes" folder. Continue?`)) {
                        status.textContent = 'Installation cancelled.';
                        return;
                    }
                }

                btn.disabled = true;
                btn.textContent = '⏳ Installing...';
                status.textContent = 'Fetching file list...';

                // 2. Get files from GitHub
                const apiUrl = `https://api.github.com/repos/y1-community/InnioasisY1Themes/contents/${folderName}`;
                const response = await fetch(apiUrl);
                if (!response.ok) throw new Error('Failed to fetch file list');
                const files = await response.json();

                // 3. Create theme folder on device
                const themeDir = await dirHandle.getDirectoryHandle(folderName, { create: true });

                let processed = 0;
                const total = files.filter(f => f.type === 'file').length;

                // 4. Download and write each file
                for (const file of files) {
                    if (file.type === 'file') {
                        status.textContent = `Installing ${file.name} (${processed + 1}/${total})...`;
                        
                        // Fetch content
                        const fileResponse = await fetch(file.download_url);
                        const blob = await fileResponse.blob();
                        
                        // Write to device
                        const fileHandle = await themeDir.getFileHandle(file.name, { create: true });
                        const writable = await fileHandle.createWritable();
                        await writable.write(blob);
                        await writable.close();
                        
                        processed++;
                    }
                }

                btn.textContent = '✅ Installed!';
                status.textContent = 'Theme installed successfully! You can now disconnect your device.';
                setTimeout(() => {
                    btn.disabled = false;
                    btn.textContent = '🚀 Install on Y1';
                }, 3000);

            } catch (error) {
                console.error('Installation error:', error);
                if (error.name === 'AbortError') {
                    status.textContent = 'Installation cancelled.';
                } else {
                    status.textContent = 'Installation failed: ' + error.message;
                    alert('Installation failed. Please try downloading the ZIP instead.');
                }
                btn.disabled = false;
                btn.textContent = '🚀 Install on Y1';
            }
        }

        // Download theme as ZIP
        async function downloadTheme() {
            const folderName = '{folder}';
            const themeName = '{name}';
            const btn = document.getElementById('download-btn');
            const status = document.getElementById('download-status');
            
            btn.disabled = true;
            btn.textContent = '⏳ Downloading...';
            status.style.display = 'block';
            status.textContent = 'Fetching file list...';
            
            try {
                const zip = new JSZip();
                // Create a folder inside the zip with the theme name
                const themeFolder = zip.folder(folderName);
                
                // Get all files from GitHub
                const apiUrl = `https://api.github.com/repos/y1-community/InnioasisY1Themes/contents/${folderName}`;
                const response = await fetch(apiUrl);
                if (!response.ok) throw new Error('Failed to fetch file list');
                const files = await response.json();
                
                let processed = 0;
                const total = files.filter(f => f.type === 'file').length;
                
                // Download each file
                for (const file of files) {
                    if (file.type === 'file') {
                        status.textContent = `Downloading ${file.name} (${processed + 1}/${total})...`;
                        const fileResponse = await fetch(file.download_url);
                        const blob = await fileResponse.blob();
                        const arrayBuffer = await blob.arrayBuffer();
                        themeFolder.file(file.name, arrayBuffer);
                        processed++;
                    }
                }
                
                status.textContent = 'Generating ZIP file...';
                // Generate and download ZIP
                const zipBlob = await zip.generateAsync({ type: 'blob' });
                const url = URL.createObjectURL(zipBlob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `${folderName}.zip`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                
                btn.textContent = '✅ Download Complete';
                status.textContent = 'Download started!';
                setTimeout(() => {
                    btn.disabled = false;
                    btn.textContent = '📦 Download ZIP';
                    status.style.display = 'none';
                }, 3000);
                
            } catch (error) {
                console.error('Error downloading theme:', error);
                btn.textContent = '❌ Error';
                status.textContent = 'Download failed. Please try again.';
                alert('Error downloading theme. Please try again.');
                btn.disabled = false;
            }
        }

        // Lightbox functions
        function openLightbox(imgSrc) {
            const lightbox = document.getElementById('lightbox');
            const lightboxImg = document.getElementById('lightbox-img');
            lightboxImg.src = imgSrc;
            lightbox.classList.add('active');
            document.body.style.overflow = 'hidden';
        }

        function closeLightbox() {
            const lightbox = document.getElementById('lightbox');
            lightbox.classList.remove('active');
            document.body.style.overflow = 'auto';
        }

        // Close lightbox on ESC key
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') {
                closeLightbox();
                closeInstallModal();
            }
        });
        
        // Load all theme images for carousel
        // This function discovers all .jpg and .png files in the theme folder
        // Images are loaded using relative paths (works locally and on GitHub Pages)
        // This also helps speed up ZIP downloads as images are already cached in browser
        async function loadThemeImages() {
            const folderName = '{folder}';
            const carouselWrapper = document.getElementById('image-carousel-wrapper');
            const carouselInfo = document.getElementById('carousel-info');
            
            if (!carouselWrapper) return;
            
            try {
                let imageFiles = [];
                
                // Strategy 1: Try GitHub API to get file list (if available)
                try {
                    const apiUrl = `https://api.github.com/repos/y1-community/InnioasisY1Themes/contents/${encodeURIComponent(folderName)}`;
                    const response = await fetch(apiUrl);
                    if (response.ok) {
                        const files = await response.json();
                        imageFiles = files
                            .filter(file => file.type === 'file' && /\.(jpg|jpeg|png|gif)$/i.test(file.name))
                            .map(file => ({
                                name: file.name,
                                url: `./${encodeURIComponent(file.name)}` // Use relative path for caching
                            }));
                    }
                } catch (apiError) {
                    console.log('GitHub API not available, using pattern discovery');
                }
                
                // Strategy 2: If API didn't work or returned no files, try common patterns
                // This works for local development and GitHub Pages
                if (imageFiles.length === 0) {
                    const imageExtensions = ['png', 'jpg', 'jpeg', 'gif'];
                    const commonBaseNames = [
                        '1', '1_YS', '2', '2_YS', '3', '4', '4_YS',
                        'cover', 'screenshot', 'screenshot1', 'screenshot2', 'screenshot3',
                        'background', 'bg', 'desktopWallpaper', 'globalWallpaper'
                    ];
                    
                    // Build list of potential image files
                    for (const base of commonBaseNames) {
                        for (const ext of imageExtensions) {
                            imageFiles.push({
                                name: `${base}.${ext}`,
                                url: `./${encodeURIComponent(`${base}.${ext}`)}`
                            });
                        }
                    }
                }
                
                if (imageFiles.length === 0) {
                    carouselWrapper.innerHTML = '<div style="text-align: center; padding: 20px; color: #999;">No images found</div>';
                    if (carouselInfo) carouselInfo.textContent = '0 / 0';
                    return;
                }
                
                // Clear loading message
                carouselWrapper.innerHTML = '';
                
                // Test which images actually exist by trying to load them
                // This filters out non-existent files
                const loadedImages = [];
                const loadPromises = imageFiles.map((image) => {
                    return new Promise((resolve) => {
                        const img = new Image();
                        img.onload = () => {
                            loadedImages.push(image);
                            resolve();
                        };
                        img.onerror = () => {
                            // Image doesn't exist, skip it
                            resolve();
                        };
                        // Set timeout to avoid hanging on slow networks
                        setTimeout(() => resolve(), 2000);
                        img.src = image.url;
                    });
                });
                
                await Promise.all(loadPromises);
                
                // Sort by filename for consistent display
                loadedImages.sort((a, b) => a.name.localeCompare(b.name));
                
                if (loadedImages.length === 0) {
                    carouselWrapper.innerHTML = '<div style="text-align: center; padding: 20px; color: #999;">No images found</div>';
                    if (carouselInfo) carouselInfo.textContent = '0 / 0';
                    return;
                }
                
                // Create carousel items for successfully loaded images
                // Images are clickable and open in lightbox (like screenshots)
                loadedImages.forEach((image) => {
                    const item = document.createElement('div');
                    item.className = 'image-carousel-item';
                    item.onclick = () => openLightbox(image.url);
                    item.style.cursor = 'pointer';
                    
                    const img = document.createElement('img');
                    img.src = image.url;
                    img.alt = image.name;
                    img.loading = 'lazy';
                    
                    const label = document.createElement('div');
                    label.className = 'image-name';
                    label.textContent = image.name;
                    
                    item.appendChild(img);
                    item.appendChild(label);
                    carouselWrapper.appendChild(item);
                });
                
                updateCarouselInfo();
                
            } catch (error) {
                console.error('Error loading theme images:', error);
                carouselWrapper.innerHTML = '<div style="text-align: center; padding: 20px; color: #999;">Error loading images</div>';
            }
        }
        
        // Update carousel info (current / total)
        function updateCarouselInfo() {
            const carouselInfo = document.getElementById('carousel-info');
            const items = document.querySelectorAll('.image-carousel-item');
            if (carouselInfo) {
                carouselInfo.textContent = `${items.length} / ${items.length}`;
            }
        }
        
        // Carousel navigation (scroll)
        function scrollCarousel(direction) {
            const wrapper = document.getElementById('image-carousel-wrapper');
            if (!wrapper) return;
            
            const scrollAmount = 130; // Width of item + gap
            wrapper.scrollBy({
                left: direction * scrollAmount,
                behavior: 'smooth'
            });
        }
        
        // Load images when page loads
        document.addEventListener('DOMContentLoaded', () => {
            loadThemeImages();
        });
    </script>
<div class="bg-cycle"></div>
<script>
    // Background cycling logic
    const bgImages = [{background_images}];
    if (bgImages.length) {
        const bgDiv = document.querySelector('.bg-cycle');
        let idx = 0;
        const setBg = () => {
            bgDiv.style.backgroundImage = `url('${bgImages[idx]}')`;
            bgDiv.style.opacity = '1';
            setTimeout(() => {
                bgDiv.style.opacity = '0';
            }, 5000);
            idx = (idx + 1) % bgImages.length;
        };
        setBg();
        setInterval(setBg, 6000);
    }
</script>
</body>
</html>
"""

for theme in themes:
    folder = theme['folder']
    name = theme['name']
    description = theme.get('description', f'Y1 Theme: {name}')
    author = theme.get('author', 'Unknown')
    
    # Get cover and screenshots
    if os.path.exists(folder):
        cover_image, screenshots = get_images(folder)
        font_file = get_font(folder)
    else:
        cover_image, screenshots = None, []
        font_file = None
    
    # Font CSS (must be defined before building HTML that uses title_style)
        font_css = ''
    title_style = ''
    if font_file:
        font_css = f'''
        @font-face {{
            font-family: 'ThemeFont';
            src: url('{font_file}');
        }}
        '''
        title_style = 'style="font-family: \'ThemeFont\', sans-serif; font-size: 1rem; margin-bottom: 15px; color: #667eea;"'
    else:
        title_style = 'style="font-size: 1rem; margin-bottom: 15px; color: #667eea;"'
    
    # Build gallery HTML with cover next to title and screenshots below
    gallery_html = ''
    
    # Cover image (will be positioned next to title via CSS)
    cover_html = ''
    if cover_image:
        # Use simple quote for onclick to avoid f-string backslash issues
        cover_html = f'''<img src="{cover_image}" alt="{name} cover" class="cover-image" onclick="openLightbox('{cover_image}')">'''
    
    # Screenshots section - only show if there are screenshots
    # If no screenshots exist, don't show the section at all (redundant to tell user there are none)
    screenshots_section_html = ''
    if screenshots:
        gallery_html = '<div class="gallery">'
        for img in screenshots:
            gallery_html += f'''
            <div class="gallery-item">
                <img src="{img}" alt="{name} screenshot" class="screenshot" onclick="openLightbox('{img}')">
            </div>
            '''
        gallery_html += '</div>'
        screenshots_section_html = f'''
        <div class="screenshots-section">
            <h3 {title_style}>Screenshots</h3>
            {gallery_html}
        </div>
        '''
    # If no screenshots, don't show the section at all
        font_css = f'''
        @font-face {{
            font-family: 'ThemeFont';
            src: url('{font_file}');
        }}
        '''
        title_style = 'style="font-family: \'ThemeFont\', sans-serif;"'

    # Generate HTML using replace instead of format to avoid brace issues
    content = html_template
    content = content.replace('{name}', name)
    content = content.replace('{description}', description)
    content = content.replace('{author}', author)
    content = content.replace('{folder}', folder)
    content = content.replace('{cover_html}', cover_html)
    content = content.replace('{screenshots_section_html}', screenshots_section_html)
    content = content.replace('{font_css}', font_css)
    content = content.replace('{title_style}', title_style)
    
    # Write to index.html in theme folder
    if not os.path.exists(folder):
        os.makedirs(folder)
        
    with open(os.path.join(folder, 'index.html'), 'w') as f:
        f.write(content)
        
    print(f'Generated page for {name}')

# Generate Sitemap
base_url = "https://themes.innioasis.app"
sitemap_content = '<?xml version="1.0" encoding="UTF-8"?>\n'
sitemap_content += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'

# Add main page
sitemap_content += f'  <url>\n    <loc>{base_url}/</loc>\n    <changefreq>daily</changefreq>\n    <priority>1.0</priority>\n  </url>\n'

# Add theme pages
for theme in themes:
    folder = theme['folder']
    encoded_folder = urllib.parse.quote(folder)
    sitemap_content += f'  <url>\n    <loc>{base_url}/{encoded_folder}/</loc>\n    <changefreq>weekly</changefreq>\n    <priority>0.8</priority>\n  </url>\n'

sitemap_content += '</urlset>'

with open('sitemap.xml', 'w') as f:
    f.write(sitemap_content)

print('Generated sitemap.xml')
print('All theme pages generated successfully!')
