#!/usr/bin/env python3
"""
Create stat files for GitHub release tracking.
Creates empty files named {themeFolder}_stat for each theme.
"""

import os
from pathlib import Path

# Get all theme folders
def get_theme_folders():
    """Get all theme folder names"""
    base_path = Path(__file__).parent
    theme_folders = []
    exclude_dirs = {'creators', '.git', '__pycache__', 'node_modules', 'CNAME', 'LICENSE'}
    
    for item in base_path.iterdir():
        if item.is_dir() and item.name not in exclude_dirs and not item.name.startswith('.'):
            # Check if it has an index.html or config.json file (indicates it's a theme)
            if (item / 'index.html').exists() or (item / 'config.json').exists():
                theme_folders.append(item.name)
    
    return sorted(theme_folders)

def create_stat_files(output_dir):
    """Create empty stat files for each theme"""
    theme_folders = get_theme_folders()
    output_path = Path(output_dir)
    output_path.mkdir(parents=True, exist_ok=True)
    
    created_files = []
    for folder in theme_folders:
        # Create empty file with _stat suffix
        stat_filename = f"{folder}_stat"
        stat_file_path = output_path / stat_filename
        
        # Create empty file
        stat_file_path.write_text("", encoding='utf-8')
        created_files.append(stat_filename)
        print(f"✅ Created {stat_filename}")
    
    print(f"\n📊 Created {len(created_files)} stat files in {output_dir}")
    print("\nFiles created:")
    for f in created_files:
        print(f"  • {f}")
    
    return created_files

if __name__ == "__main__":
    # Create files on desktop
    desktop_path = Path.home() / "Desktop" / "theme_stats"
    print("=" * 80)
    print("Creating GitHub Release Stat Files")
    print("=" * 80)
    print()
    
    files = create_stat_files(desktop_path)
    
    print()
    print("=" * 80)
    print("Next Steps:")
    print("=" * 80)
    print("1. Create a new GitHub release in y1-community/InnioasisY1Themes")
    print("2. Upload all files from:", desktop_path)
    print("3. Mark the release as 'Latest'")
    print("4. The download stats will automatically appear on the themes page")
    print()

