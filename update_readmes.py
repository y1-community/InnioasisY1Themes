#!/usr/bin/env python3
"""
Update all theme README files to remove MelodyMuncher template instructions
(except for MelodyMuncher's own README which should mention it's a template)
"""

import os
import re

# Standard README template (without MelodyMuncher template option)
README_TEMPLATE = """# How to Update or Edit This Theme

## For Beginners

You can edit this theme even if you've never used GitHub before.

### Quick Start

**Just upload your theme folder**

At minimum, you can upload a theme folder with images and it will appear on the website. However, it's better to include a config.json file with your theme information.

### Updating This Theme

1. Go to github.com/y1-community/InnioasisY1Themes
2. Click "Fork" (makes your own copy)
3. Navigate to this theme's folder in your fork
4. Click "Add file" → "Upload files"
5. Drag and drop your updated files (or entire folder) into the upload area
   - You can upload individual files or replace the entire folder
   - GitHub will show which files are new, changed, or deleted
6. Scroll down and click "Commit changes"
7. Click "Contribute" → "Open pull request" to submit your changes

**Note:** You can also edit individual files by clicking them and using the pencil icon, but uploading files is easier when you have multiple changes or new images.

### What is config.json?

This file contains your theme's name, author, description, and colors. You can create one by copying the structure from another theme's config.json file.

---

## For Advanced Users

Theme information priority: config.json (in theme folder) > themes.json (root) > folder name.

Each theme gets a URL: https://themes.innioasis.app/[ThemeFolderName]

An index.html file is required for the URL to work. The index.html automatically loads from config.json, so you don't need to edit it manually.

File naming: cover.png (cover image), screenshot.png (screenshots), 1.png (selected background), 2.png (right arrow). Suffixed variants like 1_YS.png take priority over 1.png.

---

## Installation

**Direct Install:** Connect Y1 via USB, visit theme page, click "Install on Y1", select Themes folder.

**ZIP Download:** Download ZIP, extract, copy to Y1's Themes directory.

**Innioasis Updater:** Use Toolkit section, drag theme ZIP, connect Y1.

After installation, restart Y1 and select theme from Settings.
"""

# MelodyMuncher's README (with template mention)
MELODYMUNCHER_README = """# How to Create Themes

This theme is the recommended starting point for creating new themes. Download it from themes.innioasis.app to get a complete template with config.json already set up.

## For Beginners

If you can edit images in Canva, you can create a theme. No coding needed.

### Quick Start

1. Get a GitHub account at github.com (free, takes 2 minutes)

2. Download this theme from themes.innioasis.app/MelodyMuncher as a ZIP

3. Extract and customize:
   - Rename the folder to your theme name (letters and numbers only)
   - Replace images with your own (keep same file names like cover.png, 1.png, 2.png)
   - Edit config.json: change "title", "author", and "description"
   - Change colors by replacing codes like "#ffffff" (find codes at htmlcolorcodes.com)

4. Upload to GitHub:
   - Go to github.com/y1-community/InnioasisY1Themes
   - Click "Fork" (makes your copy)
   - In your fork, click "Add file" → "Upload files"
   - Drag your entire theme folder into the upload area
   - GitHub will show all files being uploaded
   - Scroll down and click "Commit changes"
   - Click "Contribute" → "Open pull request"

Your theme will be reviewed and added to the website.

### Why Use This Template?

Downloading MelodyMuncher from themes.innioasis.app ensures you get config.json already set up correctly. You just fill in your details instead of creating it from scratch.

### Updating This Theme

To update this theme:
1. Fork the repository at github.com/y1-community/InnioasisY1Themes
2. Navigate to the MelodyMuncher folder in your fork
3. Click "Add file" → "Upload files"
4. Drag your updated files or entire folder
5. Commit changes and create a pull request

You can also edit individual files by clicking them and using the pencil icon, but uploading is easier for multiple files or new images.

---

## For Advanced Users

Theme information priority: config.json (theme folder) > themes.json (root) > folder name.

config.json structure includes theme_info (title, author, authorUrl, description), itemConfig (colors and images), menuConfig, and dialogConfig.

Theme URLs: https://themes.innioasis.app/[ThemeFolderName]. Requires index.html in theme folder. index.html auto-loads from config.json.

File naming: cover.png (cover), screenshot.png (screenshots), 1.png (selected background), 2.png (right arrow). Suffixed variants like 1_YS.png take priority over 1.png.

---

## Installation

Direct Install: Connect Y1 via USB, visit theme page, click "Install on Y1", select Themes folder.

ZIP Download: Download ZIP, extract, copy to Y1's Themes directory.

Innioasis Updater: Use Toolkit, drag theme ZIP, connect Y1.

After installation, restart Y1 and select theme from Settings.
"""

def update_readme(theme_folder, is_melodymuncher=False):
    """Update README.md for a theme folder"""
    readme_path = os.path.join(theme_folder, 'README.md')
    
    if not os.path.exists(readme_path):
        print(f"  ⚠️  README.md not found in {theme_folder}")
        return False
    
    if is_melodymuncher:
        content = MELODYMUNCHER_README
    else:
        content = README_TEMPLATE
    
    try:
        with open(readme_path, 'w', encoding='utf-8') as f:
            f.write(content)
        return True
    except Exception as e:
        print(f"  ❌ Error updating {readme_path}: {e}")
        return False

def main():
    """Update all theme README files"""
    base_dir = os.path.dirname(os.path.abspath(__file__))
    
    # Get all theme folders
    theme_folders = []
    for item in os.listdir(base_dir):
        item_path = os.path.join(base_dir, item)
        if os.path.isdir(item_path) and not item.startswith('.') and item not in ['docs', 'creators']:
            readme_path = os.path.join(item_path, 'README.md')
            if os.path.exists(readme_path):
                theme_folders.append(item)
    
    theme_folders.sort()
    
    print(f"Found {len(theme_folders)} theme folders with README files")
    print("Updating README files...\n")
    
    updated = 0
    for folder in theme_folders:
        is_melodymuncher = (folder == 'MelodyMuncher')
        print(f"Updating {folder}...", end=' ')
        if update_readme(folder, is_melodymuncher):
            print("✅")
            updated += 1
        else:
            print("❌")
    
    print(f"\n✅ Updated {updated} README files")
    if is_melodymuncher:
        print("   (MelodyMuncher's README includes template creation instructions)")
    else:
        print("   (All other READMEs focus on updating existing themes)")

if __name__ == '__main__':
    main()

