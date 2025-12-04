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

### Give Your Theme Its Own Page

This theme uses an `index.html` template that automatically displays your theme's information, screenshots, and assets. To give your new theme its own page on **themes.innioasis.app**:

1. **Copy `index.html`** from one theme's folder (like this one) to your new theme's folder, OR
2. **Download the template** from [themes.innioasis.app/yourTheme](https://themes.innioasis.app/yourTheme/) and place it in your theme folder

When you upload your theme folder to the repository, it will automatically get its own page at `themes.innioasis.app/YourThemeName`. The `index.html` file reads from your `config.json` to display theme information automatically.

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
