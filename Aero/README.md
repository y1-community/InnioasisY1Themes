# How to Create, Update, or Edit Themes

## 🎯 For Complete Beginners - Start Here!

**Don't worry if you've never used GitHub before!** This guide will walk you through everything step-by-step, even if you've only ever edited images in Canva or similar apps.

### What is This?

Think of this like a shared folder where everyone can add or improve themes for the Y1 music player. The website [themes.innioasis.app](https://themes.innioasis.app) automatically shows all themes from this folder.

### What You Can Do

- ✅ **Create a new theme** - Make your own custom design
- ✅ **Edit an existing theme** - Change colors, images, or text
- ✅ **Fix problems** - Update broken images or descriptions
- ✅ **No special skills needed** - If you can edit images and follow simple steps, you can do this!

---

## 📚 Beginner Tutorial: Your First Theme Edit

### What You'll Need

- A free GitHub account (we'll show you how to create one)
- Images you want to use (can be from Canva, photos, or any image editor)
- About 15-20 minutes

### Step 1: Create a GitHub Account (If You Don't Have One)

1. Go to [github.com](https://github.com)
2. Click **"Sign up"** in the top-right corner
3. Enter your email, create a password, and choose a username
4. Verify your email address
5. **That's it!** You now have a GitHub account.

### Step 2: Make Your Own Copy (This is Called "Forking")

**What is "forking"?** It's like making a photocopy of a book so you can write in it without changing the original.

1. Go to [github.com/y1-community/InnioasisY1Themes](https://github.com/y1-community/InnioasisY1Themes)
2. Click the **"Fork"** button in the top-right corner (it looks like a fork icon)
3. Click **"Create fork"** on the next screen
4. Wait a few seconds... **Done!** You now have your own copy.

### Step 3: Edit Images (The Easy Part!)

**Option A: Editing an Existing Theme**

1. In your forked copy, click on a theme folder (like "Aero" or "MelodyMuncher")
2. Click on any image file (like `cover.png` or `1.png`)
3. Click the **pencil icon** (✏️) to edit
4. Click **"Upload file"** and choose your new image
5. Scroll down and click **"Commit changes"**
6. Type a message like "Updated cover image" and click **"Commit changes"** again

**Option B: Creating a New Theme**

1. Go to the [MelodyMuncher theme folder](https://github.com/y1-community/InnioasisY1Themes/tree/main/MelodyMuncher) - this is the recommended starting point
2. Click the **"Code"** button (green button) and select **"Download ZIP"**
3. Extract the ZIP file on your computer
4. Rename the `MelodyMuncher` folder to your theme's name (use letters and numbers only, no spaces - like "MyCoolTheme")
5. Replace the images with your own:
   - Open images in Canva, Photoshop, or any image editor
   - Make them the same size as the originals (check the original image dimensions)
   - Save them with the same file names (like `cover.png`, `1.png`, etc.)
6. Go back to GitHub and click **"Add file"** → **"Upload files"**
7. Drag your entire theme folder into the upload area
8. Scroll down and click **"Commit changes"**

### Step 4: Change Text and Colors (Simple!)

1. In your theme folder, click on `config.json`
2. Click the **pencil icon** (✏️) to edit
3. Find the section that looks like this:
   ```json
   "theme_info": {
       "title": "Aero",
       "author": "u/YourUsername",
       "description": "A description of your theme."
   }
   ```
4. Change the text between the quotes:
   - `"title"` = Your theme's name
   - `"author"` = Your Reddit username (start with "u/" if you have one)
   - `"description"` = What your theme is about
5. To change colors, look for lines like `"#ffffff"` (this is white) or `"#000000"` (this is black)
   - You can find color codes at [htmlcolorcodes.com](https://htmlcolorcodes.com)
   - Just copy the code (like `#FF5733` for orange) and replace the existing one
6. Scroll down and click **"Commit changes"**

### Step 5: Share Your Changes (This is Called a "Pull Request")

**What is a "Pull Request"?** It's like asking "Hey, can you add my changes to the main folder?"

1. Go to your forked repository (you'll see your username at the top)
2. You should see a yellow banner saying **"This branch is X commits ahead"** - click **"Contribute"**
3. Click **"Open pull request"**
4. Fill in:
   - **Title:** What you changed (like "Added MyCoolTheme" or "Updated Aero cover image")
   - **Description:** Explain what you did (like "I created a new theme based on my favorite colors")
5. Click **"Create pull request"**
6. **That's it!** The maintainers will review it and add it to the website.

### Common Questions

**Q: What if I make a mistake?**  
A: Don't worry! You can always edit your files again and make another change.

**Q: How long until my theme appears on the website?**  
A: Usually within a few hours after your pull request is approved.

**Q: Do I need to know coding?**  
A: No! You just need to be able to edit images and follow these steps.

**Q: What image sizes should I use?**  
A: Keep them similar to the original sizes. Most UI images are small (like 100-200 pixels wide). The cover image can be larger (like 400-600 pixels wide).

**Q: Can I use images from the internet?**  
A: Only if you have permission or they're free to use. Check the license/terms of any images you use.

---

## 🔧 For Advanced Users - Technical Details

### Repository Structure

This repository hosts [themes.innioasis.app](https://themes.innioasis.app). All themes in this repository automatically appear on the website.

### How Themes Are Added

#### 1. **Self Submission** (Recommended)
1. Fork the repository
2. Add your theme folder with `config.json` and images
3. Submit a pull request
4. Once merged, your theme appears on themes.innioasis.app

#### 2. **Curation by Maintainers**
Maintainers find themes on social media (Reddit, forums, etc.) and add them to the repository on your behalf. Your original post/profile is linked via the `authorUrl` field.

### Theme Information Priority

Theme information is loaded in this order (highest to lowest priority):

1. **`config.json`** (in theme folder) - Most authoritative
2. **`themes.json`** (root directory) - Fast cache/fallback
3. **Folder name** - Last resort

### `config.json` Structure

The `config.json` file should contain a `theme_info` section:

```json
{
    "theme_info": {
        "title": "Theme Name",
        "author": "u/Username",
        "authorUrl": "https://www.reddit.com/user/Username",
        "description": "Theme description"
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
    },
    "dialogConfig": {
        "dialogBackgroundColor": "#ffffff",
        "dialogOptionSelectedTextColor": "#000000",
        "dialogOptionSelectedBackground": "4.png"
    }
}
```

**Note:** The `authorUrl` field can point to any link (Reddit post, portfolio, social media, etc.) and will be linked from author mentions on the theme's page.

### Theme URLs

Each theme receives a URL: `https://themes.innioasis.app/[ThemeFolderName]`

**⚠️ Important:** An `index.html` file is required in the theme folder for the URL to work. Without it, the theme page will return a 404 error.

The `index.html` automatically loads theme information from `config.json` and `themes.json`, so you don't need to manually edit it.

### File Naming Conventions

- **Cover image:** `cover.png`, `cover.jpg`, or any file with "cover" in the name
- **Screenshots:** `screenshot.png`, `screenshot.jpg`, or files with "screenshot" in the name
- **UI elements:** `1.png` (selected background), `2.png` (right arrow), `3.png`, `4.png`, etc.
- **Suffixed variants:** `1_YS.png` takes priority over `1.png` when both exist

### Recommended Starting Base

**The MelodyMuncher theme** is recommended as the starting point for new themes. It includes:
- Complete `config.json` with all options
- All standard UI element images
- Proper folder structure
- Example `index.html`

To use it: Fork the repo, copy the `MelodyMuncher` folder, rename it, and customize.

---

## 📥 Installation Methods

### Method 1: Direct Installation (Chrome, Edge, Opera)

1. Connect Y1 via USB and power it on
2. Visit the theme's page on [themes.innioasis.app](https://themes.innioasis.app)
3. Click **"🚀 Install on Y1"**
4. Select the **Themes** folder on your Y1
5. Installation completes automatically

### Method 2: ZIP Download

1. Visit the theme's page
2. Click **"📦 Download ZIP"**
3. Extract the ZIP file
4. Copy the theme folder to your Y1's **Themes** directory

### Method 3: Innioasis Updater Toolkit (Recommended)

1. Download [Innioasis Updater](https://innioasis.app/installguide.html)
2. Open the **Toolkit** section
3. Browse or search for the theme
4. Drag the theme ZIP into the Updater
5. Connect your Y1 - the Updater handles the rest

**Note:** After installation, restart your Y1 and select the theme from Settings to apply it.

---

**Need Help?** If you get stuck, you can ask for help on [Reddit's r/innioasis community](https://www.reddit.com/r/innioasis) or create an issue on GitHub.
