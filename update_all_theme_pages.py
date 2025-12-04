#!/usr/bin/env python3
"""
Update all theme index.html files with the new implementation:
1. Larger title heading (h1 with id="theme-title")
2. Generic placeholders for SEO
3. Updated button structure
4. Dynamic folderName detection
5. Updated installTheme and downloadTheme functions
6. Updated getThemeFiles function
7. Updated loadAuthorInfo to update title
"""

import os
import re
from pathlib import Path

# Template file (already updated)
TEMPLATE_FILE = "MelodyMuncher/index.html"

# Get all theme folders (exclude certain directories)
EXCLUDE_DIRS = {'creators', '.git', '__pycache__', 'node_modules'}

def get_theme_folders():
    """Get all theme folder names"""
    base_path = Path(__file__).parent
    theme_folders = []
    for item in base_path.iterdir():
        if item.is_dir() and item.name not in EXCLUDE_DIRS and not item.name.startswith('.'):
            # Check if it has an index.html file
            if (item / 'index.html').exists():
                theme_folders.append(item.name)
    return sorted(theme_folders)

def read_template():
    """Read the template file"""
    base_path = Path(__file__).parent
    template_path = base_path / TEMPLATE_FILE
    with open(template_path, 'r', encoding='utf-8') as f:
        return f.read()

def update_theme_file(theme_folder, template_content):
    """Update a theme's index.html file with the template content"""
    base_path = Path(__file__).parent
    theme_index_path = base_path / theme_folder / "index.html"
    
    if not theme_index_path.exists():
        print(f"⚠️  {theme_folder}/index.html not found, skipping")
        return False
    
    # The template is already generic and will work for any theme
    # Just copy it over
    with open(theme_index_path, 'w', encoding='utf-8') as f:
        f.write(template_content)
    
    print(f"✅ Updated {theme_folder}/index.html")
    return True

def main():
    print("=" * 80)
    print("Updating all theme index.html files with new implementation")
    print("=" * 80)
    print()
    
    # Read template
    print(f"📖 Reading template from {TEMPLATE_FILE}...")
    template_content = read_template()
    print(f"✅ Template loaded ({len(template_content)} characters)")
    print()
    
    # Get all theme folders
    theme_folders = get_theme_folders()
    print(f"📁 Found {len(theme_folders)} theme folders with index.html")
    print()
    
    # Skip MelodyMuncher (it's the template)
    theme_folders = [f for f in theme_folders if f != 'MelodyMuncher']
    
    print(f"🔄 Updating {len(theme_folders)} theme files...")
    print()
    
    updated = 0
    failed = 0
    
    for theme_folder in theme_folders:
        try:
            if update_theme_file(theme_folder, template_content):
                updated += 1
            else:
                failed += 1
        except Exception as e:
            print(f"❌ Error updating {theme_folder}: {e}")
            failed += 1
    
    print()
    print("=" * 80)
    print("Update Complete!")
    print("=" * 80)
    print(f"✅ Successfully updated: {updated}")
    if failed > 0:
        print(f"❌ Failed: {failed}")
    print()
    print("All theme pages now have:")
    print("  • Larger title heading (2.5rem)")
    print("  • Generic placeholders for SEO")
    print("  • Updated button structure matching main index.html")
    print("  • Dynamic folderName detection from URL")
    print("  • Updated installTheme and downloadTheme functions")
    print("  • Updated getThemeFiles function")
    print("  • Image carousel with config.json images")
    print("  • All images clickable to open in lightbox")

if __name__ == "__main__":
    main()

