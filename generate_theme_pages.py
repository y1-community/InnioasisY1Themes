import json
import os
import glob

# Read themes.json
with open('themes.json', 'r') as f:
    data = json.load(f)

themes = data['themes']

# HTML Template with Download Button
html_template = """<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{name} - Innioasis Y1 Theme</title>
    <meta name="description" content="{description}">
    <script src="https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js"></script>
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
            border: none;
            cursor: pointer;
            font-size: 1rem;
        }}
        .btn:hover {{
            transform: translateY(-2px);
            box-shadow: 0 5px 15px rgba(102, 126, 234, 0.4);
        }}
        .btn.download {{
            background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
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
        <button onclick="downloadTheme()" class="btn download">📦 Download ZIP</button>
        
        <a href="../index.html" class="back-link">← Back to All Themes</a>
    </div>

    <script>
        // Dynamic Data Loading
        document.addEventListener('DOMContentLoaded', async () => {{
            const currentPath = window.location.pathname;
            let folderName = '';
            const pathParts = currentPath.split('/');
            if (pathParts[pathParts.length - 1].toLowerCase() === 'index.html' || pathParts[pathParts.length - 1] === '') {{
                folderName = pathParts[pathParts.length - 2];
            }} else {{
                folderName = pathParts[pathParts.length - 1];
            }}
            
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

        // Download theme as ZIP
        async function downloadTheme() {{
            const folderName = '{folder}';
            const themeName = '{name}';
            
            try {{
                const zip = new JSZip();
                const themeFolder = zip.folder(folderName);
                
                // Get all files from GitHub
                const apiUrl = `https://api.github.com/repos/team-slide/InnioasisY1Themes/contents/${{folderName}}`;
                const response = await fetch(apiUrl);
                const files = await response.json();
                
                // Download each file
                for (const file of files) {{
                    if (file.type === 'file') {{
                        const fileResponse = await fetch(file.download_url);
                        const blob = await fileResponse.blob();
                        const arrayBuffer = await blob.arrayBuffer();
                        themeFolder.file(file.name, arrayBuffer);
                    }}
                }}
                
                // Generate and download ZIP
                const zipBlob = await zip.generateAsync({{ type: 'blob' }});
                const url = URL.createObjectURL(zipBlob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `${{folderName}}.zip`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            }} catch (error) {{
                console.error('Error downloading theme:', error);
                alert('Error downloading theme. Please try again.');
            }}
        }}
    </script>
</body>
</html>
"""

def get_images(folder):
    extensions = ['*.png', '*.jpg', '*.jpeg', '*.gif', '*.PNG', '*.JPG', '*.JPEG', '*.GIF']
    images = []
    for ext in extensions:
        images.extend(glob.glob(os.path.join(folder, ext)))
    
    # Deduplicate and filter for cover/screenshot
    seen = set()
    unique_images = []
    allowed_names = {'cover', 'screenshot'}
    
    for img_path in sorted(images):
        filename = os.path.basename(img_path)
        lower_name = filename.lower()
        name_without_ext = os.path.splitext(lower_name)[0]
        
        if name_without_ext in allowed_names:
            if lower_name not in seen:
                seen.add(lower_name)
                unique_images.append(filename)
            
    return unique_images

for theme in themes:
    folder = theme['folder']
    name = theme['name']
    description = theme.get('description', f'Y1 Theme: {{name}}')
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
                <img src="{{img}}" alt="{{name}} - {{img}}" class="screenshot">
                <span class="image-label">{{img}}</span>
            </div>
            '''
        gallery_html += '</div>'
    else:
        gallery_html = '<p>No preview images available.</p>'
    
    content = html_template.format(
        name=name,
        description=description,
        author=author,
        folder=folder,
        gallery_html=gallery_html
    )
    
    # Create directory if it doesn't exist
    if not os.path.exists(folder):
        os.makedirs(folder)
        
    with open(os.path.join(folder, 'index.html'), 'w') as f:
        f.write(content)
    print(f"Generated index.html for {folder} with {len(images)} images")

print("Done!")
