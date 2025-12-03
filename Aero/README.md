# How to Update or Edit This Theme

## For Beginners

You can edit this theme even if you've never used GitHub before.

### Quick Start

**Option 1: Just upload your theme folder**

At minimum, you can upload a theme folder with images and it will appear on the website. However, it's better to include a config.json file with your theme information.

**Option 2: Use the MelodyMuncher template (recommended)**

1. Go to themes.innioasis.app/MelodyMuncher
2. Download the theme as a ZIP
3. Copy the MelodyMuncher folder and rename it
4. Replace images with your own (keep the same file names)
5. Edit config.json to set your theme name, author, and description
6. Upload your folder to GitHub

The MelodyMuncher template already has config.json set up correctly, so you just need to fill in your details.

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

This file contains your theme's name, author, description, and colors. If you copy MelodyMuncher from themes.innioasis.app, the config.json is already there and ready to edit.

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
