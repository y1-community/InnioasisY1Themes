# How to Create or Edit Themes

## For Beginners

If you can edit images in Canva or similar apps, you can create a theme. You don't need to know coding.

### What This Is

This is a shared folder where anyone can add themes for the Y1 music player. When you add a theme here, it automatically appears on themes.innioasis.app.

### Creating Your First Theme

**Step 1: Get a GitHub account**

Go to github.com and sign up. It's free and takes about 2 minutes.

**Step 2: Copy this theme (MelodyMuncher)**

This theme is the recommended starting point for creating new themes. It has everything you need already set up - all the right files, proper structure, and working configuration. Start here to make theme creation easier.

1. Go to github.com/y1-community/InnioasisY1Themes
2. Click the green "Code" button
3. Click "Download ZIP"
4. Extract the ZIP file on your computer
5. Open the MelodyMuncher folder

**Step 3: Make it yours**

1. Rename the MelodyMuncher folder to your theme name (use letters and numbers only, like "MyTheme")
2. Replace the images with your own:
   - Open images in Canva or any image editor
   - Make them the same size as the originals
   - Save them with the same file names (cover.png, 1.png, 2.png, etc.)
3. Edit config.json:
   - Open it in any text editor
   - Find "title" and change it to your theme name
   - Find "author" and change it to your name or username
   - Find "description" and write what your theme is about
   - To change colors, find codes like "#ffffff" (white) or "#000000" (black) and replace them. You can find color codes at htmlcolorcodes.com

**Step 4: Upload to GitHub**

1. Go to github.com and sign in
2. Go to github.com/y1-community/InnioasisY1Themes
3. Click "Fork" in the top right (this makes your own copy)
4. In your copy, click "Add file" then "Upload files"
5. Drag your entire theme folder into the upload area
6. Scroll down, type a message like "Added MyTheme", and click "Commit changes"
7. Click "Contribute" then "Open pull request"
8. Click "Create pull request"

That's it. Your theme will be reviewed and added to the website.

### Editing an Existing Theme

1. Fork the repository (click "Fork" button)
2. Find the theme you want to edit
3. Click on any file (like an image or config.json)
4. Click the pencil icon to edit
5. Make your changes
6. Click "Commit changes"
7. Create a pull request

### Common Questions

**What image sizes should I use?**
Keep them similar to the originals. Most UI images are 100-200 pixels wide. Cover images can be 400-600 pixels wide.

**Can I use images from the internet?**
Only if you have permission or they're free to use. Check the license.

**What if I make a mistake?**
Just edit the file again and make another change. It's that simple.

**How long until my theme appears?**
Usually within a few hours after your pull request is approved.

---

## For Advanced Users

### Repository Structure

This repository hosts themes.innioasis.app. All themes here automatically appear on the website.

### Theme Information Priority

1. config.json (in theme folder) - highest priority
2. themes.json (root directory) - fallback cache
3. Folder name - last resort

### config.json Structure

```json
{
    "theme_info": {
        "title": "Theme Name",
        "author": "u/Username",
        "authorUrl": "https://example.com",
        "description": "Description"
    },
    "itemConfig": {
        "itemSelectedTextColor": "#ffffff",
        "itemSelectedBackground": "1.png",
        "itemRightArrow": "2.png"
    },
    "menuConfig": {
        "menuBackgroundColor": "#000000",
        "menuItemSelectedTextColor": "#ffffff",
        "menuItemSelectedBackground": "1.png"
    }
}
```

The authorUrl field can point to any link (Reddit post, portfolio, social media, etc.) and will be linked from author mentions on the theme page.

### Theme URLs

Each theme gets a URL: https://themes.innioasis.app/[ThemeFolderName]

An index.html file is required in the theme folder for the URL to work. The index.html automatically loads theme information from config.json, so you don't need to edit it manually.

### File Naming

- Cover: cover.png or any file with "cover" in the name
- Screenshots: screenshot.png or files with "screenshot" in the name
- UI elements: 1.png (selected background), 2.png (right arrow), etc.
- Suffixed variants: 1_YS.png takes priority over 1.png when both exist

### Starting Base

The MelodyMuncher theme is recommended as the starting point. It includes complete config.json, all standard UI images, proper folder structure, and example index.html.

---

## Installation

**Method 1: Direct Install (Chrome, Edge, Opera)**

Connect Y1 via USB, visit the theme page, click "Install on Y1", select the Themes folder.

**Method 2: ZIP Download**

Download ZIP, extract, copy theme folder to Y1's Themes directory.

**Method 3: Innioasis Updater Toolkit**

Download Innioasis Updater, use the Toolkit section, drag theme ZIP into it, connect Y1.

After installation, restart your Y1 and select the theme from Settings to apply it.
