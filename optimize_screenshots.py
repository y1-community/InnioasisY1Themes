#!/usr/bin/env python3
"""
Convert all *screenshot*.png files to JPEG format for better web performance.
Updates all references in themes.json, index.html, and theme pages.
"""

import os
import json
import re
from PIL import Image
import glob

def convert_png_to_jpeg(png_path, quality=85):
    """Convert PNG to JPEG and return the new path."""
    jpeg_path = png_path.rsplit('.', 1)[0] + '.jpg'
    
    try:
        # Open PNG image
        img = Image.open(png_path)
        
        # Convert RGBA to RGB if necessary (JPEG doesn't support transparency)
        if img.mode in ('RGBA', 'LA', 'P'):
            # Create white background
            rgb_img = Image.new('RGB', img.size, (255, 255, 255))
            if img.mode == 'P':
                img = img.convert('RGBA')
            rgb_img.paste(img, mask=img.split()[-1] if img.mode == 'RGBA' else None)
            img = rgb_img
        elif img.mode != 'RGB':
            img = img.convert('RGB')
        
        # Save as JPEG with quality 85 (good balance)
        img.save(jpeg_path, 'JPEG', quality=quality, optimize=True)
        
        # Get file sizes
        png_size = os.path.getsize(png_path)
        jpeg_size = os.path.getsize(jpeg_path)
        reduction = ((png_size - jpeg_size) / png_size) * 100
        
        print(f"✓ Converted: {png_path}")
        print(f"  {png_size/1024:.1f}KB → {jpeg_size/1024:.1f}KB ({reduction:.1f}% reduction)")
        
        return jpeg_path, jpeg_size < png_size
    except Exception as e:
        print(f"✗ Error converting {png_path}: {e}")
        return None, False

def update_file_references(file_path, png_name, jpg_name):
    """Update references from PNG to JPG in a file."""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        original_content = content
        
        # Replace various patterns
        # Direct filename references
        content = content.replace(png_name, jpg_name)
        # Path references with ./folder/screenshot.png
        content = re.sub(
            rf'(["\']\.\/[^"\']*){re.escape(png_name)}',
            rf'\1{jpg_name}',
            content
        )
        # Screenshot references in themes.json format
        content = re.sub(
            rf'(screenshot["\']?\s*:\s*["\']?[^"\']*){re.escape(png_name)}',
            rf'\1{jpg_name}',
            content
        )
        
        if content != original_content:
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(content)
            return True
        return False
    except Exception as e:
        print(f"  Warning: Could not update {file_path}: {e}")
        return False

def main():
    # Find all screenshot PNG files
    screenshot_files = []
    for root, dirs, files in os.walk('.'):
        # Skip hidden directories
        dirs[:] = [d for d in dirs if not d.startswith('.')]
        for file in files:
            if 'screenshot' in file.lower() and file.lower().endswith('.png'):
                screenshot_files.append(os.path.join(root, file))
    
    if not screenshot_files:
        print("No screenshot PNG files found.")
        return
    
    print(f"Found {len(screenshot_files)} screenshot PNG file(s):\n")
    
    converted_files = []
    
    # Convert each PNG to JPEG
    for png_path in screenshot_files:
        jpeg_path, success = convert_png_to_jpeg(png_path)
        if success:
            converted_files.append((png_path, jpeg_path))
    
    if not converted_files:
        print("\nNo files were converted.")
        return
    
    print(f"\n✓ Converted {len(converted_files)} file(s) to JPEG")
    print("\nUpdating references...")
    
    # Update themes.json
    themes_json_path = 'themes.json'
    if os.path.exists(themes_json_path):
        updated = False
        try:
            with open(themes_json_path, 'r', encoding='utf-8') as f:
                themes_data = json.load(f)
            
            for theme in themes_data.get('themes', []):
                if 'screenshot' in theme:
                    for png_path, jpeg_path in converted_files:
                        png_name = os.path.basename(png_path)
                        jpg_name = os.path.basename(jpeg_path)
                        if png_name in theme['screenshot']:
                            theme['screenshot'] = theme['screenshot'].replace(png_name, jpg_name)
                            updated = True
            
            if updated:
                with open(themes_json_path, 'w', encoding='utf-8') as f:
                    json.dump(themes_data, f, indent=4)
                print(f"✓ Updated {themes_json_path}")
        except Exception as e:
            print(f"✗ Error updating {themes_json_path}: {e}")
    
    # Update index.html
    index_html_path = 'index.html'
    if os.path.exists(index_html_path):
        for png_path, jpeg_path in converted_files:
            png_name = os.path.basename(png_path)
            jpg_name = os.path.basename(jpeg_path)
            if update_file_references(index_html_path, png_name, jpg_name):
                print(f"✓ Updated references in {index_html_path}")
    
    # Update individual theme pages
    for root, dirs, files in os.walk('.'):
        dirs[:] = [d for d in dirs if not d.startswith('.')]
        if 'index.html' in files:
            theme_index = os.path.join(root, 'index.html')
            for png_path, jpeg_path in converted_files:
                png_name = os.path.basename(png_path)
                jpg_name = os.path.basename(jpeg_path)
                if update_file_references(theme_index, png_name, jpg_name):
                    print(f"✓ Updated references in {theme_index}")
    
    # Remove original PNG files
    print("\nRemoving original PNG files...")
    for png_path, jpeg_path in converted_files:
        try:
            os.remove(png_path)
            print(f"✓ Removed {png_path}")
        except Exception as e:
            print(f"✗ Could not remove {png_path}: {e}")
    
    print(f"\n✓ Complete! Converted {len(converted_files)} screenshot file(s) to JPEG format.")

if __name__ == '__main__':
    main()

