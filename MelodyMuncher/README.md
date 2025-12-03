# How to Create Themes

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
   - Click "Add file" → "Upload files"
   - Drag your theme folder in
   - Click "Commit changes"
   - Click "Contribute" → "Open pull request"

Your theme will be reviewed and added to the website.

### Why Use This Template?

Downloading MelodyMuncher from themes.innioasis.app ensures you get config.json already set up correctly. You just fill in your details instead of creating it from scratch.

### Editing This Theme

Fork the repository, find this folder, click any file, click pencil icon, make changes, commit, create pull request.

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
