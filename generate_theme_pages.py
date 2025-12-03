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
    # Priority order: background images, wallpaper images, desktop images, cover images
    priority_keywords = ['background', 'wallpaper', 'desktop', 'cover', 'desk', 'bg']
    
    for ext in extensions:
        for path in glob.glob(os.path.join(folder, ext)):
            filename = os.path.basename(path)
            filename_lower = filename.lower()
            name_without_ext = os.path.splitext(filename_lower)[0]
            
            # Check if it matches any priority keyword
            for keyword in priority_keywords:
                if keyword in name_without_ext:
                    backgrounds.append(filename)  # Keep original case for display
                    break
    
    # Remove duplicates while preserving order
    seen = set()
    unique_backgrounds = []
    for bg in backgrounds:
        if bg.lower() not in seen:
            seen.add(bg.lower())
            unique_backgrounds.append(bg)
    
    return unique_backgrounds

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
    <meta name="description" content="Download {name} theme for Innioasis Y1 MP3 player. Official community theme repository endorsed by Innioasis. {description} Community Maintainers: Ryan Specter + Dmitri Medina">
    <meta name="keywords" content="Innioasis Y1, Y1 themes, MP3 player themes, {name}, Y1 customization, official Y1 themes, Ryan Specter, Dmitri Medina">
    <script type="application/ld+json">
    {{
        "@context": "https://schema.org",
        "@type": "SoftwareApplication",
        "name": "{name} Theme",
        "applicationCategory": "Theme",
        "operatingSystem": "Innioasis Y1",
        "description": "Download {name} theme for Innioasis Y1 MP3 player. Official community theme repository endorsed by Innioasis. {description} Community Maintainers: Ryan Specter + Dmitri Medina",
        "url": "https://themes.innioasis.app/{folder}/",
        "publisher": {{
            "@type": "Organization",
            "name": "Innioasis Y1 Community",
            "url": "https://themes.innioasis.app"
        }},
        "maintainer": [
            {{
                "@type": "Person",
                "name": "Ryan Specter",
                "url": "https://ryanspecter.uk"
            }},
            {{
                "@type": "Person",
                "name": "Dmitri Medina",
                "url": "https://reddit.com/user/dmitrimedina"
            }}
        ]
    }}
    </script>
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
            padding: 12px 16px;
            font-size: 0.95rem;
            box-shadow: none;
            text-shadow: none;
            width: 100%;
        }
        .btn.share:hover {
            background: #f5f5f5;
            border-color: #667eea;
            color: #667eea;
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
        /* Use opacity/visibility to prevent layout shifts */
        .btn .arrow-icon {
            height: 100%;
            max-height: 100%;
            width: 0;
            overflow: hidden;
            flex-shrink: 0;
            opacity: 0;
            visibility: hidden;
            margin-left: 0;
            position: relative;
            z-index: 3;
            transition: opacity 0.2s, visibility 0.2s, width 0.2s, margin-left 0.2s;
        }
        
        .btn .arrow-icon img {
            height: 100%;
            max-height: 100%;
            width: auto;
            flex-shrink: 0;
            object-fit: contain;
            display: block;
        }
        
        .reddit-favicon {
            display: inline-block;
            width: 16px;
            height: 16px;
            margin-left: 4px;
            vertical-align: middle;
            opacity: 0.8;
            transition: opacity 0.2s;
        }
        .reddit-favicon:hover {
            opacity: 1;
        }
        .reddit-favicon img {
            width: 100%;
            height: 100%;
            object-fit: contain;
        }
        
        /* Social media favicons */
        .social-favicon {
            display: inline-block;
            width: 16px;
            height: 16px;
            margin-left: 4px;
            vertical-align: middle;
            opacity: 0.8;
            transition: opacity 0.2s;
        }
        .social-favicon:hover {
            opacity: 1;
        }
        .social-favicon img {
            width: 100%;
            height: 100%;
            object-fit: contain;
        }
        
        /* Show arrow on hover for desktop (or mobile with mouse) */
        /* @media (hover: hover) means device has hover capability (mouse, trackpad, etc.) */
        @media (hover: hover) {
            .btn:hover .arrow-icon,
            .btn:focus .arrow-icon,
            .btn:active .arrow-icon {
                opacity: 1;
                visibility: visible;
                width: auto;
                margin-left: 8px;
            }
        }
        
        /* Show arrow on mobile (always visible) */
        @media (hover: none) {
            .btn .arrow-icon {
                opacity: 1;
                visibility: visible;
                width: auto;
                margin-left: 8px;
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
        
        /* JSON file icon display */
        .image-carousel-item .json-icon {
            width: 100%;
            height: 80px;
            background: white;
            border-radius: 4px;
            border: 1px solid #ddd;
            padding: 8px;
            display: flex;
            align-items: center;
            justify-content: center;
            position: relative;
            box-sizing: border-box;
        }
        
        .image-carousel-item .json-icon svg {
            width: 100%;
            height: 100%;
        }
        
        .image-carousel-item .json-icon .file-label {
            position: absolute;
            bottom: 4px;
            right: 4px;
            background: rgba(0, 0, 0, 0.7);
            color: white;
            padding: 2px 6px;
            border-radius: 3px;
            font-size: 0.65rem;
            font-weight: 600;
            font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace;
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
        .lightbox-edit-btn {
            position: absolute;
            bottom: 30px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(102, 126, 234, 0.9);
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 8px;
            font-size: 0.95rem;
            font-weight: 600;
            cursor: pointer;
            text-decoration: none;
            display: inline-flex;
            align-items: center;
            gap: 8px;
            transition: all 0.3s;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
            z-index: 1001;
        }
        .lightbox-edit-btn:hover {
            background: rgba(102, 126, 234, 1);
            transform: translateX(-50%) translateY(-2px);
            box-shadow: 0 6px 16px rgba(0, 0, 0, 0.4);
        }
        .lightbox-edit-btn:active {
            transform: translateX(-50%) translateY(0);
        }
        
        /* Config.json info display in lightbox */
        .lightbox-config-info {
            position: absolute;
            bottom: 80px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(0, 0, 0, 0.9);
            color: white;
            padding: 0;
            border-radius: 12px;
            max-width: 800px;
            width: 90%;
            max-height: 60vh;
            overflow-y: auto;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
            z-index: 1001;
            backdrop-filter: blur(10px);
        }
        
        .lightbox-config-header {
            font-size: 1.1rem;
            font-weight: 600;
            margin: 20px 20px 10px 20px;
            color: #fff;
        }
        
        .lightbox-config-explanation {
            font-size: 0.9rem;
            color: #ddd;
            margin: 0 20px 15px 20px;
            line-height: 1.4;
        }
        
        .lightbox-config-file-link {
            margin: 0 20px 15px 20px;
            font-size: 0.9rem;
        }
        
        .lightbox-config-file-link a {
            color: #58a6ff;
            text-decoration: none;
            font-weight: 500;
        }
        
        .lightbox-config-file-link a:hover {
            text-decoration: underline;
        }
        
        .lightbox-config-code-container {
            background: #0d1117;
            border-top: 1px solid #30363d;
            border-bottom: 1px solid #30363d;
            margin: 0;
            padding: 0;
            overflow-x: auto;
        }
        
        .lightbox-config-code-header {
            background: #161b22;
            padding: 8px 16px;
            border-bottom: 1px solid #30363d;
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 0.85rem;
            color: #8b949e;
        }
        
        .lightbox-config-code-header strong {
            color: #c9d1d9;
        }
        
        .lightbox-config-code {
            padding: 16px;
            margin: 0;
            font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace;
            font-size: 0.85rem;
            line-height: 1.6;
            color: #c9d1d9;
            background: #0d1117;
            white-space: pre;
            overflow-x: auto;
        }
        
        .lightbox-config-code-line {
            display: block;
            padding: 0 8px;
        }
        
        .lightbox-config-code-line.highlight {
            background: rgba(187, 128, 9, 0.15);
            border-left: 3px solid #d29922;
        }
        
        .lightbox-config-code-line-number {
            display: inline-block;
            width: 40px;
            text-align: right;
            padding-right: 16px;
            color: #6e7681;
            user-select: none;
            margin-right: 8px;
        }
        
        .lightbox-config-code-line-content {
            color: #c9d1d9;
        }
        
        .lightbox-config-code-line-content .string {
            color: #a5d6ff;
        }
        
        .lightbox-config-code-line-content .key {
            color: #79c0ff;
        }
        
        .lightbox-config-code-line-content .number {
            color: #79c0ff;
        }
        
        .lightbox-config-code-line-content .boolean {
            color: #ff7b72;
        }
        
        .lightbox-config-code-line-content .null {
            color: #ff7b72;
        }
        
        .lightbox-config-details {
            padding: 15px 20px 20px 20px;
        }
        
        .lightbox-config-item {
            font-size: 0.9rem;
            line-height: 1.6;
            margin-bottom: 8px;
        }
        
        .lightbox-config-item strong {
            color: #fff;
            display: inline-block;
            min-width: 100px;
        }
        
        .lightbox-config-item code {
            background: rgba(255, 255, 255, 0.15);
            padding: 4px 8px;
            border-radius: 4px;
            font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace;
            font-size: 0.85rem;
            color: #fff;
            word-break: break-all;
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
        /* Button group - constrained width to match home page theme card buttons */
        .button-group {
            max-width: 400px;
            margin-left: auto;
            margin-right: auto;
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
    <div class="container">
        <div class="header-section">
            <div class="header-text">
                <!-- Title and subtitle removed; using About line instead -->
                <h2 {title_style}>About the {name} Theme for Innioasis Y1</h2>
                <p class="description" id="theme-description">{description}</p>
                <p class="author-info" style="margin-top: 15px; color: #666; font-size: 0.9rem; font-style: italic;">
                    Theme created by <strong id="author-display">{author}</strong>
                </p>
            </div>
            {cover_html}
        </div>
        
        {screenshots_section_html}
        
        <!-- Image carousel section - dynamically shown/hidden based on available images -->
        <!-- This section is hidden by default and only shown when images are loaded -->
        <div class="image-carousel-section" id="image-carousel-section" style="display: none;">
            <h3 {title_style}>All Theme Assets</h3>
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
                    <span class="btn-text" style="position: relative; z-index: 3; flex: 1; text-align: left;">Install</span>
                </span>
            </button>
            <button id="download-btn-full" onclick="downloadTheme()" class="btn download">
                <span style="display: flex; align-items: center; justify-content: space-between; width: 100%; position: relative; z-index: 2;">
                    <span class="btn-text" style="position: relative; z-index: 3; flex: 1; text-align: left;">Download</span>
                </span>
            </button>
            <button onclick="shareTheme()" class="btn share" style="margin-top: 10px;">
                <span style="display: flex; align-items: center; justify-content: center; width: 100%;">
                    <span>🔗 Share this Theme</span>
                </span>
            </button>
        </div>

        <!-- Install Instructions Modal -->
        <div id="install-modal" class="install-modal" onclick="if(event.target === this) closeInstallModal()">
            <div class="install-modal-content" onclick="event.stopPropagation()">
                <span class="install-modal-close" onclick="closeInstallModal()">&times;</span>
                <h3>Prepare Your Y1 Device</h3>
                <p>Before installing, please follow these steps:</p>
                <ol id="install-steps-list">
                    <li><strong>Power up your Y1 device</strong></li>
                    <li><strong>Connect your Y1 to your device via USB</strong></li>
                    <li><strong>Enable USB storage mode</strong> on your Y1 (if prompted)</li>
                    <li id="android-step" style="display: none;"><strong>On Android:</strong> Press the <strong>☰ (three lines/hamburger menu)</strong> button at the top left of the file picker, then navigate to and select your Y1's <strong>"Themes" folder</strong> from the USB drive</li>
                    <li id="desktop-step"><strong>On the next screen, select the "Themes" folder</strong> on your Y1 device</li>
                </ol>
                <p style="color: #666; font-size: 0.9rem; margin-top: 15px;">The installation will automatically copy all theme files to your device.</p>
                <button class="install-modal-btn" onclick="proceedWithInstall()">Continue to Folder Selection</button>
                <p style="text-align: center; margin-top: 15px;">
                    <a href="#" onclick="closeInstallModal(); downloadTheme(); return false;" style="color: #667eea; text-decoration: underline; font-size: 0.9rem;">💾 Save .zip for later</a>
                </p>
                <p style="color: #666; font-size: 0.85rem; margin-top: 10px; text-align: center; font-style: italic;">
                    After downloading, extract the ZIP file and place the folder containing config.json into the "Themes" folder on your Y1 device.
                </p>
            </div>
        </div>

        <!-- Feature Support Section -->
        <!-- This section shows upcoming or region-specific features that need images added -->
        <div id="feature-support-section" style="margin-top: 30px; display: none;">
            <div id="unsupported-features" style="background: #f9f9f9; border-radius: 8px; padding: 15px; border-left: 4px solid #ff9800;">
                <p style="margin: 0 0 10px 0; font-weight: 600; color: #666;">To the creator:</p>
                <p style="margin: 0 0 10px 0; font-size: 0.9rem; color: #666;">Add these images to your theme to ensure compatibility with these upcoming or region-specific features:</p>
                <ul id="unsupported-features-list" style="margin: 0 0 10px 0; padding-left: 20px; color: #888; list-style-type: disc;">
                    <!-- Features will be populated dynamically with links to config.json -->
                </ul>
                <p style="margin: 10px 0 0 0; font-size: 0.85rem; color: #999; font-style: italic;">
                    These features may not be available to users at present but are defined in the theme spec in firmware 2.8.2 and are to be expected in future releases and where features are only available in certain regions.
                </p>
            </div>
        </div>
        
        <!-- SEO Content -->
        <div class="seo-content" style="margin-top: 40px; text-align: left; color: #666; font-size: 0.9rem; line-height: 1.6;">
            <p><span id="description-display">{description}</span></p>
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
        <a id="lightbox-edit-btn" class="lightbox-edit-btn" href="#" target="_blank" rel="noopener noreferrer" onclick="event.stopPropagation()">
            <span>✏️</span>
            <span>View/Edit on GitHub</span>
        </a>
        <!-- Config.json info display (shown for gallery images) -->
        <div id="lightbox-config-info" class="lightbox-config-info" onclick="event.stopPropagation()" style="display: none;">
            <div class="lightbox-config-header">Theme Construction Info</div>
            <div class="lightbox-config-explanation">This information helps you understand how a theme is constructed:</div>
            <div class="lightbox-config-file-link">
                <a id="lightbox-config-file-link" href="#" target="_blank" rel="noopener noreferrer">config.json</a>
            </div>
            <div class="lightbox-config-code-container">
                <div class="lightbox-config-code-header">
                    <span><strong id="lightbox-config-key-display"></strong></span>
                    <span>Line <strong id="lightbox-config-line-number"></strong></span>
                </div>
                <pre class="lightbox-config-code" id="lightbox-config-code"></pre>
            </div>
            <div class="lightbox-config-details">
                <div class="lightbox-config-item">
                    <strong>Image File:</strong> <code id="lightbox-image-name"></code>
                </div>
            </div>
        </div>
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

        // Load theme font and apply to buttons (like main page)
        async function loadThemeFont() {
            try {
                const configResponse = await fetch('./config.json');
                if (!configResponse.ok) return null;
                
                const config = await configResponse.json();
                const configStr = JSON.stringify(config);
                const fontMatches = configStr.match(/"([^"]*\.ttf[^"]*)"/gi);
                
                if (fontMatches && fontMatches.length > 0) {
                    const fontName = fontMatches[0].replace(/"/g, '');
                    const fontUrl = `./${encodeURIComponent(fontName)}`;
                    
                    // Load font using FontFace API
                    try {
                        const fontFace = new FontFace('ThemeFont', `url(${fontUrl})`);
                        await fontFace.load();
                        document.fonts.add(fontFace);
                        return 'ThemeFont';
                    } catch (e) {
                        console.warn('Could not load theme font:', e);
                    }
                }
                
                // Try common font patterns
                const fontPatterns = ['font.ttf', 'Font.ttf', 'theme.ttf', 'Theme.ttf'];
                for (const fontName of fontPatterns) {
                    try {
                        const fontUrl = `./${encodeURIComponent(fontName)}`;
                        const fontFace = new FontFace('ThemeFont', `url(${fontUrl})`);
                        await fontFace.load();
                        document.fonts.add(fontFace);
                        return 'ThemeFont';
                    } catch (e) {
                        // Continue trying
                    }
                }
            } catch (e) {
                console.warn('Could not load theme font:', e);
            }
            return null;
        }
        
        // Apply theme styling to buttons
        async function applyThemeButtonStyling() {
            try {
                // Load theme font first
                const themeFont = await loadThemeFont();
                const fontStyle = themeFont ? `font-family: '${themeFont}', sans-serif;` : '';
                
                const configResponse = await fetch('./config.json');
                if (!configResponse.ok) return;
                
                const config = await configResponse.json();
                const itemConfig = config?.itemConfig || {};
                const menuConfig = config?.menuConfig || {};
                const dialogConfig = config?.dialogConfig || {};
                
                // Get button background image - prioritize itemSelectedBackground (buttons are selected items)
                let selectedBgImage = itemConfig.itemSelectedBackground || itemConfig.itemBackground || 
                                     menuConfig.menuItemSelectedBackground || 
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
                
                // Get button text color - prioritize itemSelectedTextColor (matches selected background)
                let buttonTextColor = itemConfig.itemSelectedTextColor || 
                                     menuConfig.menuItemSelectedTextColor || 
                                     dialogConfig.dialogOptionSelectedTextColor ||
                                     '#ffffff';
                
                // Normalize color format (ensure # prefix if it's a hex color)
                if (buttonTextColor && !buttonTextColor.startsWith('#')) {
                    // If it's a 6-digit hex without #, add it
                    if (/^[0-9A-Fa-f]{6}$/.test(buttonTextColor)) {
                        buttonTextColor = '#' + buttonTextColor;
                    }
                }
                
                // Get arrow icon - use itemRightArrow from config.json (unified approach)
                // Then try *RightArrow*.* pattern, then common patterns
                let arrowIconFile = itemConfig.itemRightArrow || null;
                
                // If not in config, try *RightArrow*.* pattern (works for themes like Naruto)
                if (!arrowIconFile || arrowIconFile.trim() === '') {
                    try {
                        // Try GitHub API to find *RightArrow*.* files
                        const apiUrl = `https://api.github.com/repos/y1-community/InnioasisY1Themes/contents/{folder}`;
                        const response = await fetch(apiUrl);
                        if (response.ok) {
                            const files = await response.json();
                            const rightArrowFiles = files
                                .filter(f => f.type === 'file' && /RightArrow/i.test(f.name) && /\.(png|jpg|jpeg|gif|svg)$/i.test(f.name))
                                .map(f => f.name);
                            if (rightArrowFiles.length > 0) {
                                arrowIconFile = rightArrowFiles[0];
                            }
                        }
                    } catch (e) {
                        // API not available, continue to common patterns
                    }
                }
                
                // If still not found, try common patterns
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
                
                const buttonStyle = `${buttonBgStyle} color: ${buttonTextColor}; ${fontStyle} text-shadow: 0 1px 3px rgba(0, 0, 0, 0.5), 0 0 2px rgba(0, 0, 0, 0.8);`;
                
                // Apply to all buttons (install and download)
                const buttons = document.querySelectorAll('.btn.install, .btn.download');
                buttons.forEach(btn => {
                    // Apply button style (background, color, font, text shadow)
                    // Preserve existing display/flex properties, only override background/color/font/text-shadow
                    const existingStyle = btn.getAttribute('style') || '';
                    // Remove old background, color, font-family, and text-shadow from existing style
                    const cleanedStyle = existingStyle
                        .replace(/background[^;]*;?/gi, '')
                        .replace(/color[^;]*;?/gi, '')
                        .replace(/font-family[^;]*;?/gi, '')
                        .replace(/text-shadow[^;]*;?/gi, '')
                        .trim();
                    // Combine new theme styles with preserved styles
                    btn.setAttribute('style', buttonStyle + (cleanedStyle ? '; ' + cleanedStyle : ''));
                    
                    // Also apply font to button text span
                    const textSpan = btn.querySelector('span span');
                    if (textSpan && themeFont) {
                        textSpan.style.fontFamily = `'${themeFont}', sans-serif`;
                    }
                    
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

            // Check for File System Access API support (works on Chrome desktop and Android)
            if ('showDirectoryPicker' in window) {
                document.getElementById('install-btn').style.display = 'inline-block';
                // Hide full download button (no separate download link - only in modal)
                document.getElementById('download-btn-full').style.display = 'none';
                
                // Detect Android and update install instructions
                const isAndroid = /Android/i.test(navigator.userAgent);
                const androidStep = document.getElementById('android-step');
                const desktopStep = document.getElementById('desktop-step');
                
                if (isAndroid && androidStep && desktopStep) {
                    androidStep.style.display = 'list-item';
                    desktopStep.style.display = 'none';
                } else if (androidStep && desktopStep) {
                    androidStep.style.display = 'none';
                    desktopStep.style.display = 'list-item';
                }
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
                
                // Set authorUrl for Innioasis-made themes if not already set
                if ((author === 'Innioasis' || author.toLowerCase() === 'innioasis') && !authorUrl) {
                    authorUrl = 'https://www.innioasis.com';
                }
                
                // Update author display with link if authorUrl is available
                const authorDisplay = document.getElementById('author-display');
                const descriptionDisplay = document.getElementById('description-display');
                
                if (authorDisplay) {
                    // Remove any erroneous "$" prefix from author name
                    author = author.replace(/^\$+/, '');
                    
                    // Helper function to detect social media platform from URL
                    function getSocialIcon(url) {
                        if (!url) return null;
                        
                        const urlLower = url.toLowerCase();
                        
                        // Check if it's a Reddit profile URL (don't show icon, Reddit favicon handles this)
                        if (/reddit\.com\/(user|u)\//i.test(url)) {
                            return null; // Reddit is handled separately
                        }
                        
                        // Pinterest
                        if (/pinterest\.(com|co\.uk|ca|au|de|fr|it|es|nl|pl|ru|jp|kr|in|br|mx)/i.test(url)) {
                            return {
                                icon: 'https://www.pinterest.com/favicon.ico',
                                alt: 'Pinterest',
                                class: 'social-favicon'
                            };
                        }
                        
                        // Instagram
                        if (/instagram\.com/i.test(url)) {
                            return {
                                icon: 'https://www.instagram.com/static/images/ico/favicon.ico',
                                alt: 'Instagram',
                                class: 'social-favicon'
                            };
                        }
                        
                        // DeviantArt
                        if (/deviantart\.com/i.test(url)) {
                            return {
                                icon: 'https://www.deviantart.com/favicon.ico',
                                alt: 'DeviantArt',
                                class: 'social-favicon'
                            };
                        }
                        
                        // Behance
                        if (/behance\.net/i.test(url)) {
                            return {
                                icon: 'https://www.behance.net/favicon.ico',
                                alt: 'Behance',
                                class: 'social-favicon'
                            };
                        }
                        
                        // GitHub
                        if (/github\.com/i.test(url)) {
                            return {
                                icon: 'https://github.com/favicon.ico',
                                alt: 'GitHub',
                                class: 'social-favicon'
                            };
                        }
                        
                        // Twitter/X
                        if (/(twitter\.com|x\.com)/i.test(url)) {
                            return {
                                icon: 'https://abs.twimg.com/favicons/twitter.ico',
                                alt: 'Twitter/X',
                                class: 'social-favicon'
                            };
                        }
                        
                        // YouTube
                        if (/youtube\.com|youtu\.be/i.test(url)) {
                            return {
                                icon: 'https://www.youtube.com/favicon.ico',
                                alt: 'YouTube',
                                class: 'social-favicon'
                            };
                        }
                        
                        // Default: web/internet globe icon for regular websites
                        return {
                            icon: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTYiIGhlaWdodD0iMTYiIHZpZXdCb3g9IjAgMCAxNiAxNiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iOCIgY3k9IjgiIHI9IjciIHN0cm9rZT0iIzY2N2VlYSIgc3Ryb2tlLXdpZHRoPSIxLjUiLz4KPHBhdGggZD0iTTggMUMyIDMgMiA1IDIgOEMyIDExIDIgMTMgOCAxNUMxNCAxMyAxNCAxMSAxNCA4QzE0IDUgMTQgMyA4IDFaIiBzdHJva2U9IiM2NjdlZWEiIHN0cm9rZS13aWR0aD0iMS41Ii8+CjxwYXRoIGQ9Ik0xIDhIMTVNOCAxVjE1IiBzdHJva2U9IiM2NjdlZWEiIHN0cm9rZS13aWR0aD0iMS41Ii8+Cjwvc3ZnPgo=',
                            alt: 'Website',
                            class: 'social-favicon'
                        };
                    }
                    
                    // Detect Reddit username (u/username pattern)
                    const redditUsernameMatch = author.match(/u\/([^\/\s]+)/i);
                    let redditUsername = null;
                    let redditFaviconHtml = '';
                    
                    if (redditUsernameMatch) {
                        redditUsername = redditUsernameMatch[1];
                        // Only show Reddit favicon if authorUrl is NOT a Reddit profile URL
                        // or if there's no authorUrl
                        const isRedditUrl = authorUrl && /reddit\.com\/(user|u)\//i.test(authorUrl);
                        if (!isRedditUrl || !authorUrl) {
                            // Create Reddit favicon that links to reddit.com/user/username
                            redditFaviconHtml = `<a href="https://reddit.com/user/${redditUsername}" target="_blank" rel="noopener noreferrer" class="reddit-favicon" onclick="event.stopPropagation();" style="display: inline-block; width: 16px; height: 16px; margin-left: 4px; vertical-align: middle; opacity: 0.8; transition: opacity 0.2s;"><img src="https://www.redditstatic.com/desktop2x/img/favicon/favicon-16x16.png" alt="Reddit" style="width: 100%; height: 100%; object-fit: contain;"></a>`;
                        }
                    }
                    
                    // Get social media icon for authorUrl (if not Reddit)
                    let socialIconHtml = '';
                    if (authorUrl) {
                        const socialIcon = getSocialIcon(authorUrl);
                        if (socialIcon) {
                            socialIconHtml = `<a href="${authorUrl}" target="_blank" rel="noopener noreferrer" class="${socialIcon.class}" onclick="event.stopPropagation();" style="display: inline-block; width: 16px; height: 16px; margin-left: 4px; vertical-align: middle; opacity: 0.8; transition: opacity 0.2s;"><img src="${socialIcon.icon}" alt="${socialIcon.alt}" style="width: 100%; height: 100%; object-fit: contain;"></a>`;
                        }
                    }
                    
                    if (authorUrl) {
                        // Author name links to authorUrl, Reddit favicon links to Reddit profile, social icon links to authorUrl
                        authorDisplay.innerHTML = `<a href="${authorUrl}" target="_blank" rel="noopener noreferrer" style="color: #667eea; text-decoration: none; border-bottom: 1px solid #667eea; transition: all 0.2s;">${author}</a>${redditFaviconHtml}${socialIconHtml}`;
                        // Add hover effect
                        const authorLink = authorDisplay.querySelector('a:not(.reddit-favicon):not(.social-favicon)');
                        if (authorLink) {
                            authorLink.addEventListener('mouseenter', function() {
                                this.style.color = '#764ba2';
                                this.style.borderBottomColor = '#764ba2';
                            });
                            authorLink.addEventListener('mouseleave', function() {
                                this.style.color = '#667eea';
                                this.style.borderBottomColor = '#667eea';
                            });
                        }
                    } else {
                        // No authorUrl - just display author name with Reddit favicon if detected
                        authorDisplay.innerHTML = `${author}${redditFaviconHtml}`;
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
                // Only check the 4 specific upcoming/region-specific features
                // Note: ebook, calculator, calendar are in homePageConfig in MelodyMuncher
                // launcher is in settingConfig
                const upcomingFeaturesToCheck = [
                    { key: 'ebook', displayName: 'E-book Reader', section: 'homePageConfig', configKey: 'ebook', imageFile: 'ebook.png' },
                    { key: 'calculator', displayName: 'Calculator', section: 'homePageConfig', configKey: 'calculator', imageFile: 'calculator.png' },
                    { key: 'calendar', displayName: 'Calendar', section: 'homePageConfig', configKey: 'calendar', imageFile: 'calendar.png' },
                    { key: 'launcher', displayName: 'Rockbox / Alternative Launcher Icon', section: 'settingConfig', configKey: 'launcher', imageFile: 'Launcher.png' }
                ];
                
                const unsupportedFeatures = [];
                
                // Check each upcoming feature
                for (const feature of upcomingFeaturesToCheck) {
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
                        unsupportedFeatures.push(feature);
                    }
                }
                
                // Display unsupported features if any
                if (unsupportedFeatures.length > 0) {
                    const section = document.getElementById('feature-support-section');
                    const list = document.getElementById('unsupported-features-list');
                    
                    if (section && list) {
                        list.innerHTML = unsupportedFeatures.map(feature => {
                            // Create GitHub link to the example image in MelodyMuncher
                            const exampleImageUrl = `https://github.com/y1-community/InnioasisY1Themes/blob/main/MelodyMuncher/${encodeURIComponent(feature.imageFile)}`;
                            const sectionName = feature.section === 'homePageConfig' ? 'homePageConfig' : 'settingConfig';
                            return `<li style="margin-bottom: 5px;"><a href="${exampleImageUrl}" target="_blank" rel="noopener noreferrer" style="color: #667eea; text-decoration: none; border-bottom: 1px solid #667eea;">${feature.displayName}</a> - "${feature.configKey}" in "${sectionName}"</li>`;
                        }).join('');
                        section.style.display = 'block';
                    }
                }
            } catch (error) {
                console.warn('Could not check feature support:', error);
            }
        }
        
        // Show install instructions modal (skip if folder already selected on home page)
        function showInstallInstructions() {
            // Check if folder was already selected on home page
            const savedFolderHandle = localStorage.getItem('y1ThemesFolderHandle');
            if (savedFolderHandle) {
                // Folder already selected - skip dialog and proceed directly
                proceedWithInstall();
                return;
            }
            
            // Show dialog for first-time selection
            document.getElementById('install-modal').classList.add('active');
            document.body.style.overflow = 'hidden';
        }
        
        // Close install instructions modal
        function closeInstallModal() {
            document.getElementById('install-modal').classList.remove('active');
            document.body.style.overflow = 'auto';
        }
        
        // Helper function to update button text while preserving structure (text + arrow icon)
        function updateButtonText(button, newText) {
            if (!button) return;
            // Find the text span with class "btn-text" or first span inside the flex container
            const textSpan = button.querySelector('.btn-text') || button.querySelector('span > span:first-child');
            if (textSpan) {
                textSpan.textContent = newText;
            } else {
                // Fallback if structure is different
                const flexContainer = button.querySelector('span');
                if (flexContainer) {
                    const firstChild = flexContainer.querySelector('span:first-child');
                    if (firstChild) {
                        firstChild.textContent = newText;
                    } else {
                        button.textContent = newText;
                    }
                } else {
                    button.textContent = newText;
                }
            }
        }
        
        // Helper function to reset button to original state
        function resetButton(button, originalText, originalClass) {
            if (!button) return;
            button.disabled = false;
            updateButtonText(button, originalText);
            if (originalClass) {
                button.className = originalClass;
            }
            // Ensure button is visible and in correct state
            if (button.id === 'install-btn') {
                // Install button should be visible if File System Access API is supported
                if ('showDirectoryPicker' in window) {
                    button.style.display = 'inline-block';
                }
            } else if (button.id === 'download-btn-full') {
                // Download button should be visible if File System Access API is NOT supported
                if (!('showDirectoryPicker' in window)) {
                    button.style.display = 'inline-block';
                }
            }
        }
        
        // Proceed with installation after user confirms
        function proceedWithInstall() {
            closeInstallModal();
            // Now proceed with actual installation
            installTheme();
        }

        // Install Theme directly to device
        async function installTheme() {
            const folderName = '{folder}';
            const btn = document.getElementById('install-btn');
            
            // Store original button state
            const originalText = 'Install';
            const originalClass = btn.className;
            
            // Get theme font for progress display
            const themeFont = await loadThemeFont();
            const fontStyle = themeFont ? `font-family: '${themeFont}', sans-serif;` : '';
            
            try {
                // Check if folder was already selected on home page (skip dialog if so)
                let dirHandle = null;
                const savedFolderHandle = localStorage.getItem('y1ThemesFolderHandle');
                
                if (!savedFolderHandle) {
                    // 1. Ask user to select Themes folder (modal already shown by showInstallInstructions)
                    updateButtonText(btn, 'Select Themes folder...');
                    
                    dirHandle = await window.showDirectoryPicker({
                        mode: 'readwrite',
                        startIn: 'downloads'
                    });
                } else {
                    // Folder already selected on home page - skip dialog and use saved handle
                    // Note: We can't actually restore the handle from localStorage (security restriction)
                    // So we still need to ask, but we can skip the preparation dialog
                    updateButtonText(btn, 'Select Themes folder...');
                    
                    dirHandle = await window.showDirectoryPicker({
                        mode: 'readwrite',
                        startIn: 'downloads'
                    });
                }
                
                // Verify it's likely the right folder (optional, but good UX)
                if (dirHandle.name !== 'Themes' && dirHandle.name !== 'themes') {
                    if (!confirm(`You selected "${dirHandle.name}", but usually this should be the "Themes" folder. Continue?`)) {
                        resetButton(btn, originalText, originalClass);
                        return;
                    }
                }

                btn.disabled = true;
                updateButtonText(btn, '⏳ Fetching files...');
                if (fontStyle) {
                    btn.style.fontFamily = themeFont ? `'${themeFont}', sans-serif` : '';
                }

                // 2. Get all files from GitHub (recursive - handles subdirectories)
                async function getAllFilesRecursive(path = folderName, basePath = '') {
                    const apiUrl = `https://api.github.com/repos/y1-community/InnioasisY1Themes/contents/${path}`;
                    const response = await fetch(apiUrl);
                    if (!response.ok) {
                        console.warn(`Failed to fetch ${path}, trying alternative method`);
                        return [];
                    }
                    const items = await response.json();
                    const allFiles = [];
                    
                    for (const item of items) {
                        if (item.type === 'file') {
                            allFiles.push({
                                name: basePath ? `${basePath}/${item.name}` : item.name,
                                download_url: item.download_url,
                                path: item.path
                            });
                        } else if (item.type === 'dir') {
                            // Recursively get files from subdirectories
                            const subPath = item.path;
                            const subBasePath = basePath ? `${basePath}/${item.name}` : item.name;
                            const subFiles = await getAllFilesRecursive(subPath, subBasePath);
                            allFiles.push(...subFiles);
                        }
                    }
                    
                    return allFiles;
                }
                
                const allFiles = await getAllFilesRecursive();
                
                if (allFiles.length === 0) {
                    throw new Error('No files found. The theme may be empty or the repository structure has changed.');
                }

                // 3. Create theme folder on device
                const themeDir = await dirHandle.getDirectoryHandle(folderName, { create: true });

                let processed = 0;
                const total = allFiles.length;

                // 4. Download and write each file (handles nested paths)
                // Show progress inside button
                updateButtonText(btn, `⏳ Downloading 0/${total}...`);
                if (fontStyle) {
                    btn.style.fontFamily = themeFont ? `'${themeFont}', sans-serif` : '';
                }
                
                for (const file of allFiles) {
                    processed++;
                    updateButtonText(btn, `⏳ Downloading ${processed}/${total}...`);
                    if (fontStyle) {
                        btn.style.fontFamily = themeFont ? `'${themeFont}', sans-serif` : '';
                    }
                    
                    let blob;
                    
                    // Check cache first (images loaded in gallery are already cached)
                    const cachedFile = fileCache.get(fileName);
                    if (cachedFile) {
                        blob = cachedFile.blob;
                        console.log(`✅ Using cached file: ${fileName}`);
                    } else {
                        // Fetch from network if not cached
                        const fileResponse = await fetch(file.download_url);
                        if (!fileResponse.ok) {
                            console.warn(`Failed to fetch ${file.name}, skipping...`);
                            continue;
                        }
                        blob = await fileResponse.blob();
                        
                        // Cache it for future use
                        const arrayBuffer = await blob.arrayBuffer();
                        fileCache.set(fileName, {
                            blob: blob,
                            arrayBuffer: arrayBuffer,
                            url: file.download_url
                        });
                    }
                    
                }
                
                // 5. Now install files to device
                processed = 0;
                updateButtonText(btn, `⏳ Installing 0/${total}...`);
                if (fontStyle) {
                    btn.style.fontFamily = themeFont ? `'${themeFont}', sans-serif` : '';
                }
                
                for (const file of allFiles) {
                    processed++;
                    updateButtonText(btn, `⏳ Installing ${processed}/${total}...`);
                    if (fontStyle) {
                        btn.style.fontFamily = themeFont ? `'${themeFont}', sans-serif` : '';
                    }
                    
                    // Handle nested paths - create subdirectories if needed
                    const pathParts = file.name.split('/');
                    let currentDir = themeDir;
                    
                    // Create subdirectories if file is in a subdirectory
                    for (let i = 0; i < pathParts.length - 1; i++) {
                        currentDir = await currentDir.getDirectoryHandle(pathParts[i], { create: true });
                    }
                    
                    const finalFileName = pathParts[pathParts.length - 1];
                    
                    // Get blob from cache or fetch
                    let blob;
                    const cachedFile = fileCache.get(finalFileName);
                    if (cachedFile) {
                        blob = cachedFile.blob;
                    } else {
                        // Shouldn't happen if we downloaded above, but fallback
                        const fileResponse = await fetch(file.download_url);
                        if (!fileResponse.ok) {
                            console.warn(`Failed to fetch ${file.name}, skipping...`);
                            continue;
                        }
                        blob = await fileResponse.blob();
                    }
                    
                    // Write to device
                    const fileHandle = await currentDir.getFileHandle(finalFileName, { create: true });
                    const writable = await fileHandle.createWritable();
                    await writable.write(blob);
                    await writable.close();
                    
                }

                updateButtonText(btn, '✅ Installed!');
                setTimeout(() => {
                    resetButton(btn, originalText, originalClass);
                }, 2000);

            } catch (error) {
                console.error('Installation error:', error);
                if (error.name === 'AbortError') {
                    updateButtonText(btn, '❌ Cancelled');
                } else {
                    updateButtonText(btn, '❌ Failed');
                    alert('Installation failed. Please try downloading the ZIP instead.');
                }
                setTimeout(() => {
                    resetButton(btn, originalText, originalClass);
                }, 2000);
            }
        }

        // Download theme as ZIP
        async function downloadTheme() {
            const folderName = '{folder}';
            const themeName = '{name}';
            const btn = document.getElementById('download-btn-full');
            
            // Store original button state
            const originalText = 'Download';
            const originalClass = btn.className;
            
            // Get theme font for progress display
            const themeFont = await loadThemeFont();
            const fontStyle = themeFont ? `font-family: '${themeFont}', sans-serif;` : '';
            
            btn.disabled = true;
            updateButtonText(btn, '⏳ Fetching files...');
            if (fontStyle) {
                btn.style.fontFamily = themeFont ? `'${themeFont}', sans-serif` : '';
            }
            
            try {
                const zip = new JSZip();
                // Create a folder inside the zip with the theme name
                const themeFolder = zip.folder(folderName);
                
                // Get all files from GitHub (recursive - handles subdirectories)
                async function getAllFilesRecursive(path = folderName, basePath = '') {
                    const apiUrl = `https://api.github.com/repos/y1-community/InnioasisY1Themes/contents/${path}`;
                    const response = await fetch(apiUrl);
                    if (!response.ok) {
                        console.warn(`Failed to fetch ${path}, trying alternative method`);
                        return [];
                    }
                    const items = await response.json();
                    const allFiles = [];
                    
                    for (const item of items) {
                        if (item.type === 'file') {
                            allFiles.push({
                                name: basePath ? `${basePath}/${item.name}` : item.name,
                                download_url: item.download_url,
                                path: item.path
                            });
                        } else if (item.type === 'dir') {
                            // Recursively get files from subdirectories
                            const subPath = item.path;
                            const subBasePath = basePath ? `${basePath}/${item.name}` : item.name;
                            const subFiles = await getAllFilesRecursive(subPath, subBasePath);
                            allFiles.push(...subFiles);
                        }
                    }
                    
                    return allFiles;
                }
                
                const allFiles = await getAllFilesRecursive();
                
                if (allFiles.length === 0) {
                    throw new Error('No files found. The theme may be empty or the repository structure has changed.');
                }
                
                let processed = 0;
                const total = allFiles.length;
                
                // Download each file (handles nested paths)
                // Show progress: downloading files before zip packing
                status.textContent = `Downloading files (0/${total})...`;
                btn.textContent = `⏳ Downloading ${0}/${total}...`;
                
                for (const file of allFiles) {
                    const fileName = file.name.split('/').pop(); // Get just filename for display
                    status.textContent = `Downloading ${fileName} (${processed + 1}/${total})...`;
                    btn.textContent = `⏳ Downloading ${processed + 1}/${total}...`;
                    
                    try {
                        let arrayBuffer;
                        
                        // Check cache first (images loaded in gallery are already cached)
                        const cachedFile = fileCache.get(fileName);
                        if (cachedFile) {
                            arrayBuffer = cachedFile.arrayBuffer;
                            console.log(`✅ Using cached file: ${fileName}`);
                        } else {
                            // Fetch from network if not cached
                            const fileResponse = await fetch(file.download_url);
                            if (!fileResponse.ok) {
                                console.warn(`Failed to fetch ${file.name}, skipping...`);
                                continue;
                            }
                            const blob = await fileResponse.blob();
                            arrayBuffer = await blob.arrayBuffer();
                            
                            // Cache it for future use
                            fileCache.set(fileName, {
                                blob: blob,
                                arrayBuffer: arrayBuffer,
                                url: file.download_url
                            });
                        }
                        
                        // Handle nested paths in ZIP
                        const zipPath = file.name;
                        themeFolder.file(zipPath, arrayBuffer);
                        processed++;
                    } catch (err) {
                        console.warn(`Error downloading ${file.name}:`, err);
                        // Continue with other files
                    }
                }
                
                // Now pack into ZIP
                status.textContent = 'Packing files into ZIP...';
                btn.textContent = '⏳ Packing ZIP...';
                
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

        // Helper function to find line number in config.json text for a given key path
        function findConfigKeyLine(configText, keyPath) {
            const lines = configText.split('\n');
            const keyParts = keyPath.split('.');
            
            // Try to find the key in the config
            // For nested keys like "itemConfig.itemSelectedBackground", we need to find:
            // 1. The section (e.g., "itemConfig": {)
            // 2. The key within that section (e.g., "itemSelectedBackground": "...")
            
            let currentSection = null;
            let inTargetSection = false;
            let braceDepth = 0;
            let sectionBraceDepth = 0;
            
            for (let i = 0; i < lines.length; i++) {
                const line = lines[i];
                const trimmed = line.trim();
                
                // Track brace depth to know when we're inside objects
                braceDepth += (line.match(/{/g) || []).length;
                braceDepth -= (line.match(/}/g) || []).length;
                
                // Check if this line starts a section (e.g., "itemConfig": {)
                if (keyParts.length > 1) {
                    const sectionName = keyParts[0];
                    if (trimmed.startsWith(`"${sectionName}"`) && trimmed.includes('{')) {
                        currentSection = sectionName;
                        inTargetSection = true;
                        sectionBraceDepth = braceDepth;
                    }
                }
                
                // If we're in the target section, look for the key
                if (inTargetSection || keyParts.length === 1) {
                    const targetKey = keyParts[keyParts.length - 1];
                    // Match key with quotes and colon (e.g., "itemSelectedBackground":)
                    const keyPattern = new RegExp(`"${targetKey}"\\s*:`);
                    if (keyPattern.test(trimmed)) {
                        // Check if we're still in the right section (for nested keys)
                        if (keyParts.length > 1) {
                            // Make sure we're at the right brace depth (within the section)
                            if (braceDepth > sectionBraceDepth) {
                                return i + 1; // Line numbers are 1-indexed
                            }
                        } else {
                            return i + 1;
                        }
                    }
                }
                
                // Reset section tracking if we've left the section
                if (inTargetSection && braceDepth <= sectionBraceDepth && trimmed.includes('}')) {
                    inTargetSection = false;
                }
            }
            
            return null; // Key not found
        }
        
        // Helper function to extract code snippet around a line
        function extractCodeSnippet(configText, lineNumber, contextLines = 5) {
            const lines = configText.split('\n');
            const startLine = Math.max(0, lineNumber - contextLines - 1);
            const endLine = Math.min(lines.length, lineNumber + contextLines);
            const snippetLines = lines.slice(startLine, endLine);
            
            return {
                lines: snippetLines,
                startLine: startLine + 1, // 1-indexed
                highlightLine: lineNumber
            };
        }
        
        // Helper function to syntax highlight JSON code
        function highlightJSONCode(line) {
            // Simple JSON syntax highlighting
            // Process in order: keys, strings, numbers, booleans, null
            // Note: line is already HTML-escaped
            let highlighted = line;
            
            // Highlight keys (quoted strings followed by colon)
            highlighted = highlighted.replace(/("([^"\\]|\\.)*")\s*:/g, '<span class="key">$1</span>:');
            
            // Highlight string values (quoted strings after colon, but not keys)
            // Match ": "value"" pattern
            highlighted = highlighted.replace(/:\s*("([^"\\]|\\.)*")/g, ': <span class="string">$1</span>');
            
            // Highlight numbers (after colon, not inside strings)
            highlighted = highlighted.replace(/:\s*(\d+\.?\d*)(?![^<]*<\/span>)/g, ': <span class="number">$1</span>');
            
            // Highlight booleans
            highlighted = highlighted.replace(/:\s*(true|false)(?![^<]*<\/span>)/g, ': <span class="boolean">$1</span>');
            
            // Highlight null
            highlighted = highlighted.replace(/:\s*(null)(?![^<]*<\/span>)/g, ': <span class="null">$1</span>');
            
            return highlighted;
        }
        
        // Function to open full config.json in lightbox
        async function openConfigJSON() {
            const lightbox = document.getElementById('lightbox');
            const lightboxImg = document.getElementById('lightbox-img');
            const editBtn = document.getElementById('lightbox-edit-btn');
            const configInfo = document.getElementById('lightbox-config-info');
            const configKeyDisplay = document.getElementById('lightbox-config-key-display');
            const configLineNumber = document.getElementById('lightbox-config-line-number');
            const configCode = document.getElementById('lightbox-config-code');
            const configFileLink = document.getElementById('lightbox-config-file-link');
            const imageNameEl = document.getElementById('lightbox-image-name');
            
            // Hide the image, show config info
            lightboxImg.style.display = 'none';
            lightbox.classList.add('active');
            document.body.style.overflow = 'hidden';
            
            // Show config.json info
            configInfo.style.display = 'block';
            configKeyDisplay.textContent = 'config.json';
            configLineNumber.textContent = 'Full file';
            imageNameEl.textContent = 'config.json';
            
            try {
                const configResponse = await fetch('./config.json');
                if (configResponse.ok) {
                    const configText = await configResponse.text();
                    const lines = configText.split('\n');
                    
                    // Build GitHub link
                    const currentPath = window.location.pathname;
                    let folderName = '';
                    const pathParts = currentPath.split('/');
                    if (pathParts[pathParts.length - 1].toLowerCase() === 'index.html' || pathParts[pathParts.length - 1] === '') {
                        folderName = pathParts[pathParts.length - 2];
                    } else {
                        folderName = pathParts[pathParts.length - 1];
                    }
                    folderName = decodeURIComponent(folderName);
                    
                    const githubUrl = `https://github.com/y1-community/InnioasisY1Themes/blob/main/${encodeURIComponent(folderName)}/config.json`;
                    configFileLink.href = githubUrl;
                    configFileLink.textContent = 'config.json';
                    
                    // Display full file with syntax highlighting
                    let codeHTML = '';
                    lines.forEach((line, index) => {
                        const lineNumber = index + 1;
                        // Escape HTML first, then apply syntax highlighting
                        const escapedLine = line
                            .replace(/&/g, '&amp;')
                            .replace(/</g, '&lt;')
                            .replace(/>/g, '&gt;')
                            .replace(/"/g, '&quot;')
                            .replace(/'/g, '&#039;');
                        const highlightedLine = highlightJSONCode(escapedLine);
                        codeHTML += `<span class="lightbox-config-code-line">`;
                        codeHTML += `<span class="lightbox-config-code-line-number">${lineNumber}</span>`;
                        codeHTML += `<span class="lightbox-config-code-line-content">${highlightedLine}</span>`;
                        codeHTML += `</span>\n`;
                    });
                    configCode.innerHTML = codeHTML;
                }
            } catch (error) {
                console.warn('Could not load config.json:', error);
                configCode.textContent = '// Could not load config.json';
            }
            
            // Set edit button to link to config.json
            const currentPath = window.location.pathname;
            let folderName = '';
            const pathParts = currentPath.split('/');
            if (pathParts[pathParts.length - 1].toLowerCase() === 'index.html' || pathParts[pathParts.length - 1] === '') {
                folderName = pathParts[pathParts.length - 2];
            } else {
                folderName = pathParts[pathParts.length - 1];
            }
            folderName = decodeURIComponent(folderName);
            editBtn.href = `https://github.com/y1-community/InnioasisY1Themes/blob/main/${encodeURIComponent(folderName)}/config.json`;
            editBtn.style.display = 'inline-flex';
        }
        
        // Lightbox functions
        async function openLightbox(imgSrc, configKey = null, imageName = null) {
            const lightbox = document.getElementById('lightbox');
            const lightboxImg = document.getElementById('lightbox-img');
            const editBtn = document.getElementById('lightbox-edit-btn');
            const configInfo = document.getElementById('lightbox-config-info');
            const configKeyDisplay = document.getElementById('lightbox-config-key-display');
            const configLineNumber = document.getElementById('lightbox-config-line-number');
            const configCode = document.getElementById('lightbox-config-code');
            const configFileLink = document.getElementById('lightbox-config-file-link');
            const imageNameEl = document.getElementById('lightbox-image-name');
            
            // Show the image
            lightboxImg.style.display = 'block';
            lightboxImg.src = imgSrc;
            lightbox.classList.add('active');
            document.body.style.overflow = 'hidden';
            
            // Show config.json info if this is from the gallery (has configKey)
            if (configKey && imageName) {
                configInfo.style.display = 'block';
                configKeyDisplay.textContent = configKey;
                imageNameEl.textContent = imageName;
                
                // Fetch config.json as text to find line numbers
                try {
                    const configResponse = await fetch('./config.json');
                    if (configResponse.ok) {
                        const configText = await configResponse.text();
                        
                        // Find the line number for this config key
                        const lineNumber = findConfigKeyLine(configText, configKey);
                        
                        if (lineNumber) {
                            // Extract code snippet
                            const snippet = extractCodeSnippet(configText, lineNumber, 5);
                            
                            // Build GitHub link to the specific line
                            const currentPath = window.location.pathname;
                            let folderName = '';
                            const pathParts = currentPath.split('/');
                            if (pathParts[pathParts.length - 1].toLowerCase() === 'index.html' || pathParts[pathParts.length - 1] === '') {
                                folderName = pathParts[pathParts.length - 2];
                            } else {
                                folderName = pathParts[pathParts.length - 1];
                            }
                            folderName = decodeURIComponent(folderName);
                            
                            const githubUrl = `https://github.com/y1-community/InnioasisY1Themes/blob/main/${encodeURIComponent(folderName)}/config.json#L${lineNumber}`;
                            configFileLink.href = githubUrl;
                            configFileLink.textContent = 'config.json';
                            
                            // Display line number
                            configLineNumber.textContent = lineNumber;
                            
                            // Display code snippet with syntax highlighting
                            let codeHTML = '';
                            snippet.lines.forEach((line, index) => {
                                const actualLineNumber = snippet.startLine + index;
                                const isHighlight = actualLineNumber === snippet.highlightLine;
                                // Escape HTML first, then apply syntax highlighting
                                const escapedLine = line
                                    .replace(/&/g, '&amp;')
                                    .replace(/</g, '&lt;')
                                    .replace(/>/g, '&gt;')
                                    .replace(/"/g, '&quot;')
                                    .replace(/'/g, '&#039;');
                                const highlightedLine = highlightJSONCode(escapedLine);
                                codeHTML += `<span class="lightbox-config-code-line ${isHighlight ? 'highlight' : ''}">`;
                                codeHTML += `<span class="lightbox-config-code-line-number">${actualLineNumber}</span>`;
                                codeHTML += `<span class="lightbox-config-code-line-content">${highlightedLine}</span>`;
                                codeHTML += `</span>\n`;
                            });
                            configCode.innerHTML = codeHTML;
                        } else {
                            // Key not found - show basic info
                            configLineNumber.textContent = '?';
                            configCode.textContent = '// Config key not found in config.json';
                            const currentPath = window.location.pathname;
                            let folderName = '';
                            const pathParts = currentPath.split('/');
                            if (pathParts[pathParts.length - 1].toLowerCase() === 'index.html' || pathParts[pathParts.length - 1] === '') {
                                folderName = pathParts[pathParts.length - 2];
                            } else {
                                folderName = pathParts[pathParts.length - 1];
                            }
                            folderName = decodeURIComponent(folderName);
                            configFileLink.href = `https://github.com/y1-community/InnioasisY1Themes/blob/main/${encodeURIComponent(folderName)}/config.json`;
                            configFileLink.textContent = 'config.json';
                        }
                    }
                } catch (error) {
                    console.warn('Could not load config.json for code display:', error);
                    configLineNumber.textContent = '?';
                    configCode.textContent = '// Could not load config.json';
                }
            } else {
                configInfo.style.display = 'none';
            }
            
            // Extract filename from image source and construct GitHub URL for edit button
            // Image source format: ./filename.png or ./themeFolder/filename.png
            // We need: https://github.com/y1-community/InnioasisY1Themes/tree/main/{folderName}/{filename}
            let editFolderName = '{folder}';
            let filename = imageName || '';
            
            if (!filename) {
                // Remove leading ./ if present
                const cleanSrc = imgSrc.replace(/^\.\//, '');
                
                // If the path contains a folder (shouldn't happen for theme page images, but handle it)
                if (cleanSrc.includes('/')) {
                    const parts = cleanSrc.split('/');
                    filename = parts[parts.length - 1];
                } else {
                    filename = cleanSrc;
                }
                // Remove query params if any
                filename = filename.split('?')[0];
            }
            
            // Construct GitHub URL for image edit button
            const githubUrl = `https://github.com/y1-community/InnioasisY1Themes/tree/main/${encodeURIComponent(editFolderName)}/${encodeURIComponent(filename)}`;
            editBtn.href = githubUrl;
            editBtn.style.display = 'inline-flex';
        }

        function closeLightbox() {
            const lightbox = document.getElementById('lightbox');
            const lightboxImg = document.getElementById('lightbox-img');
            const configInfo = document.getElementById('lightbox-config-info');
            lightbox.classList.remove('active');
            document.body.style.overflow = 'auto';
            // Hide config info when closing
            if (configInfo) {
                configInfo.style.display = 'none';
            }
            // Reset image display
            if (lightboxImg) {
                lightboxImg.style.display = 'block';
            }
        }

        // Close lightbox on ESC key
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') {
                closeLightbox();
                closeInstallModal();
            }
        });
        
        // File cache for downloaded files (used by download/install functions)
        // This cache is populated when images are loaded in the gallery
        const fileCache = new Map(); // Key: filename, Value: { blob, arrayBuffer }
        
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
                // Load config.json to map images to their usage
                let config = null;
                let imageUsageMap = new Map(); // Maps filename -> array of config keys
                
                try {
                    const configResponse = await fetch('./config.json');
                    if (configResponse.ok) {
                        config = await configResponse.json();
                        
                        // Helper function to recursively search for image references
                        function findImageReferences(obj, prefix = '') {
                            for (const [key, value] of Object.entries(obj)) {
                                if (typeof value === 'string' && /\.(png|jpg|jpeg|gif|svg)$/i.test(value)) {
                                    // Extract filename and create multiple lookup keys
                                    const fullPath = value.split('/').pop();
                                    const filename = fullPath;
                                    
                                    // Create lookup keys:
                                    // 1. Full filename (e.g., "@Be_itemSelectedBackground.png")
                                    // 2. Without @ prefix pattern (e.g., "itemSelectedBackground.png")
                                    // 3. Base name without extension (e.g., "itemSelectedBackground")
                                    
                                    const keys = [filename];
                                    
                                    // Try removing @ prefix pattern (e.g., @Be_ or @Theme_)
                                    const withoutPrefix = filename.replace(/^@[^_]+_/, '');
                                    if (withoutPrefix !== filename) {
                                        keys.push(withoutPrefix);
                                    }
                                    
                                    // Base name without extension
                                    const baseName = filename.replace(/\.[^.]+$/, '');
                                    const baseNameWithoutPrefix = withoutPrefix.replace(/\.[^.]+$/, '');
                                    keys.push(baseName, baseNameWithoutPrefix);
                                    
                                    // Store the config key for all variations
                                    const fullKey = prefix ? `${prefix}.${key}` : key;
                                    keys.forEach(lookupKey => {
                                        if (!imageUsageMap.has(lookupKey)) {
                                            imageUsageMap.set(lookupKey, []);
                                        }
                                        if (!imageUsageMap.get(lookupKey).includes(fullKey)) {
                                            imageUsageMap.get(lookupKey).push(fullKey);
                                        }
                                    });
                                } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
                                    const newPrefix = prefix ? `${prefix}.${key}` : key;
                                    findImageReferences(value, newPrefix);
                                }
                            }
                        }
                        
                        // Search all config sections
                        findImageReferences(config);
                    }
                } catch (e) {
                    console.warn('Could not load config.json for image mapping:', e);
                }
                
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
                                url: `./${encodeURIComponent(file.name)}`, // Use relative path for caching
                                download_url: file.download_url || `./${encodeURIComponent(file.name)}`
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
                            const filename = `${base}.${ext}`;
                            imageFiles.push({
                                name: filename,
                                url: `./${encodeURIComponent(filename)}`,
                                download_url: `./${encodeURIComponent(filename)}`
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
                
                // Build a list of all config key -> image filename mappings
                // This allows the same image to appear multiple times if used in multiple places
                const configImageEntries = []; // Array of {filename, configKey, url}
                const imageCache = new Map(); // Cache loaded images to avoid re-fetching
                
                // Iterate through all config keys that reference images
                imageUsageMap.forEach((configKeys, filename) => {
                    // For each config key that uses this filename, create an entry
                    configKeys.forEach(configKey => {
                        configImageEntries.push({
                            filename: filename,
                            configKey: configKey
                        });
                    });
                });
                
                // Always show config.json, even if no images
                // Don't return early - we'll add config.json and show the section
                
                // Load all unique images and create gallery items for each config usage
                const loadedImageData = []; // Array of {filename, url, objectUrl, configKey}
                const uniqueFilenames = new Set();
                
                // First, collect all unique filenames we need to load
                configImageEntries.forEach(entry => {
                    uniqueFilenames.add(entry.filename);
                });
                
                // Load each unique image once
                const loadPromises = Array.from(uniqueFilenames).map(async (filename) => {
                    // Try to find the actual file in imageFiles or construct URL
                    let imageUrl = `./${encodeURIComponent(filename)}`;
                    let foundInFiles = imageFiles.find(f => {
                        const fName = f.name;
                        return fName === filename || 
                               fName.replace(/^@[^_]+_/, '') === filename ||
                               fName.replace(/\.[^.]+$/, '') === filename ||
                               fName.replace(/^@[^_]+_/, '').replace(/\.[^.]+$/, '') === filename;
                    });
                    
                    if (foundInFiles) {
                        imageUrl = foundInFiles.url;
                    }
                    
                    try {
                        // Fetch the image and cache it
                        const response = await fetch(imageUrl);
                        if (response.ok) {
                            const blob = await response.blob();
                            const arrayBuffer = await blob.arrayBuffer();
                            
                            // Cache the file for download/install
                            fileCache.set(filename, {
                                blob: blob,
                                arrayBuffer: arrayBuffer,
                                url: imageUrl
                            });
                            
                            // Create object URL for display
                            const objectUrl = URL.createObjectURL(blob);
                            
                            imageCache.set(filename, {
                                url: imageUrl,
                                objectUrl: objectUrl,
                                blob: blob
                            });
                        }
                    } catch (err) {
                        // Image doesn't exist or failed to load, skip it
                        console.warn(`Could not load image: ${filename}`, err);
                    }
                });
                
                await Promise.all(loadPromises);
                
                // Now create gallery items - one for each config key usage
                // This means the same image can appear multiple times if used in multiple places
                configImageEntries.forEach(entry => {
                    const cached = imageCache.get(entry.filename);
                    if (cached) {
                        loadedImageData.push({
                            filename: entry.filename,
                            url: cached.url,
                            objectUrl: cached.objectUrl,
                            configKey: entry.configKey
                        });
                    }
                });
                
                // Sort by config key name for consistent display
                loadedImageData.sort((a, b) => a.configKey.localeCompare(b.configKey));
                
                // Show the carousel section (always show config.json at minimum)
                const carouselSection = document.getElementById('image-carousel-section');
                if (carouselSection) {
                    carouselSection.style.display = 'block';
                }
                
                // Add config.json as the first item (always shown)
                const configItem = document.createElement('div');
                configItem.className = 'image-carousel-item';
                configItem.onclick = () => openConfigJSON();
                configItem.style.cursor = 'pointer';
                
                // Create JSON file icon (document with settings cog)
                const jsonIcon = document.createElement('div');
                jsonIcon.className = 'json-icon';
                jsonIcon.innerHTML = `
                    <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
                        <!-- Document background -->
                        <rect x="20" y="15" width="60" height="70" rx="2" fill="#f0f0f0" stroke="#ccc" stroke-width="2"/>
                        <!-- Document fold corner -->
                        <path d="M 20 15 L 35 15 L 35 30 L 20 30 Z" fill="#ddd" stroke="#ccc" stroke-width="1"/>
                        <!-- Settings cog icon -->
                        <g transform="translate(50, 50)">
                            <circle cx="0" cy="0" r="12" fill="none" stroke="#667eea" stroke-width="2.5"/>
                            <circle cx="0" cy="0" r="6" fill="#667eea"/>
                            <path d="M -8 -8 L -12 -12 M 8 -8 L 12 -12 M -8 8 L -12 12 M 8 8 L 12 12" 
                                  stroke="#667eea" stroke-width="2" stroke-linecap="round"/>
                            <circle cx="0" cy="-12" r="2" fill="#667eea"/>
                            <circle cx="0" cy="12" r="2" fill="#667eea"/>
                            <circle cx="12" cy="0" r="2" fill="#667eea"/>
                            <circle cx="-12" cy="0" r="2" fill="#667eea"/>
                        </g>
                    </svg>
                    <span class="file-label">.json</span>
                `;
                
                const configLabel = document.createElement('div');
                configLabel.className = 'image-name';
                configLabel.textContent = 'config.json';
                configLabel.title = 'config.json';
                
                configItem.appendChild(jsonIcon);
                configItem.appendChild(configLabel);
                carouselWrapper.appendChild(configItem);
                
                // Create carousel items - one for each config key usage
                // Same image can appear multiple times if used in multiple config keys
                loadedImageData.forEach((imageData) => {
                    const item = document.createElement('div');
                    item.className = 'image-carousel-item';
                    // Pass config key and filename to openLightbox for gallery images
                    item.onclick = () => openLightbox(
                        imageData.objectUrl || imageData.url,
                        imageData.configKey,
                        imageData.filename
                    );
                    item.style.cursor = 'pointer';
                    
                    const img = document.createElement('img');
                    img.src = imageData.objectUrl || imageData.url;
                    img.alt = imageData.filename;
                    img.loading = 'lazy';
                    
                    const label = document.createElement('div');
                    label.className = 'image-name';
                    label.textContent = imageData.configKey;
                    label.title = imageData.filename; // Show filename on hover
                    
                    item.appendChild(img);
                    item.appendChild(label);
                    carouselWrapper.appendChild(item);
                });
                
                updateCarouselInfo();
                
                console.log(`✅ Cached ${fileCache.size} image files for faster download/install`);
                
            } catch (error) {
                console.error('Error loading theme images:', error);
                // Hide the entire carousel section on error
                const carouselSection = document.getElementById('image-carousel-section');
                if (carouselSection) {
                    carouselSection.style.display = 'none';
                }
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
    {background_cycle_html}
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

    # Get background images for cycling
    backgrounds = get_backgrounds(folder) if os.path.exists(folder) else []
    # Use relative paths (./filename) for proper server compatibility
    # URL encode filenames to handle spaces and special characters
    background_images_str = ', '.join([f"'./{urllib.parse.quote(bg)}'" for bg in backgrounds]) if backgrounds else ''
    
    # Generate background cycle HTML
    background_cycle_html = ''
    if backgrounds:
        background_cycle_html = f'''<div class="bg-cycle"></div>
<script>
    // Background cycling logic
    const bgImages = [{background_images_str}];
    if (bgImages.length) {{
        const bgDiv = document.querySelector('.bg-cycle');
        let idx = 0;
        const setBg = () => {{
            bgDiv.style.backgroundImage = `url(${{bgImages[idx]}})`;
            bgDiv.style.opacity = '1';
            setTimeout(() => {{
                bgDiv.style.opacity = '0';
            }}, 5000);
            idx = (idx + 1) % bgImages.length;
        }};
        setBg();
        setInterval(setBg, 6000);
    }}
</script>'''
    
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
    content = content.replace('{background_cycle_html}', background_cycle_html)
    content = content.replace('{background_images}', background_images_str)
    
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
