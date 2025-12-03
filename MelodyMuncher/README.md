# How to Create, Update, or Edit Themes

## 🎨 Recommended Starting Base for New Theme Creation

**The MelodyMuncher theme is recommended as the ideal starting point for creating new themes!**

This theme provides a clean, well-structured foundation that includes:
- ✅ Complete `config.json` with all necessary configuration options
- ✅ All standard UI element images (1.png, 2.png, etc.)
- ✅ Proper folder structure and file organization
- ✅ Example `index.html` for theme pages
- ✅ Comprehensive documentation

**To create a new theme based on MelodyMuncher:**

1. **Fork the repository** - Create your own copy of [github.com/y1-community/InnioasisY1Themes](https://github.com/y1-community/InnioasisY1Themes)
2. **Copy the MelodyMuncher folder** - Duplicate the `MelodyMuncher` folder and rename it to your theme's name
3. **Customize your theme** - Edit `config.json`, replace images, modify colors, and add your own assets
4. **Update theme information** - Edit the `theme_info` section in `config.json` with your theme's details
5. **Submit your theme** - Create a pull request to add your new theme to the repository

Using MelodyMuncher as a base ensures you have all the necessary files and a working configuration to build upon, making theme creation faster and easier!

---

## About This Repository

**Important:** The GitHub repository at [github.com/y1-community/InnioasisY1Themes](https://github.com/y1-community/InnioasisY1Themes) is where [themes.innioasis.app](https://themes.innioasis.app) is hosted. This means:

- ✅ **Anyone can edit themes** - The repository is open for contributions from the community
- ✅ **Changes appear on the website** - Updates to themes in this repository automatically appear on themes.innioasis.app
- ✅ **You can improve any theme** - Feel free to fix bugs, update images, improve descriptions, or enhance any theme
- ✅ **No permission needed** - Just fork, edit, and submit a pull request

### How Themes Are Added to the Website

Themes appear on [themes.innioasis.app](https://themes.innioasis.app) through two main methods:

#### 1. **Self Submission** (Recommended for Theme Creators)

If you've created a theme, you can add it yourself by:

1. **Forking the repository** - Create your own copy of [github.com/y1-community/InnioasisY1Themes](https://github.com/y1-community/InnioasisY1Themes)
2. **Making your edits** - Add your theme folder, update `config.json`, add images, etc.
3. **Submitting a pull request** - Request to merge your changes back into the main repository
4. **Automatic publication** - Once approved and merged, your theme automatically appears on themes.innioasis.app

This method gives you full control over how your theme is presented and ensures accurate information.

#### 2. **Curation by Maintainers**

The repository maintainers actively search for themes on social media platforms (like Reddit's r/innioasis community) and other online sources. When they find a theme:

- **Automatic upload** - The maintainers add the theme to the repository on your behalf
- **Proper attribution** - Your original post and profile are linked via the `authorUrl` field
- **Community benefit** - Your theme becomes available to all Y1 users, even if you're not familiar with GitHub

If you've shared your theme online and it appears on themes.innioasis.app, you can still edit it yourself using the self-submission method above!

## Making Changes to This Theme

If you'd like to update, improve, or fix this theme, here's how to contribute:

### Step 1: Fork the Repository

1. Visit the [main repository](https://github.com/y1-community/InnioasisY1Themes)
2. Click the **"Fork"** button in the top-right corner
3. This creates a copy of the repository in your GitHub account

### Step 2: Make Your Changes

1. In your forked repository, navigate to this theme's folder
2. Make your changes (update images, modify `config.json`, add files, etc.)
3. Commit your changes with a clear message describing what you changed

### Step 3: Create a Pull Request

1. Go to your forked repository on GitHub
2. Click **"Contribute"** or **"New Pull Request"**
3. Select your fork as the source and the main repository as the destination
4. Add a description of your changes
5. Click **"Create Pull Request"**

Your changes will be reviewed and, if approved, merged into the main repository!

### Tip

Uploading or changing a theme's folder to GitHub will make it appear on the website (at the bare minimum the site will display in alphabetical order themes listed in `themes.json` or not listed, provided it has a directory name, `config.json`, and a `*cover*.*` file available).

---

## Theme Information and URLs

### Where Theme Information is Stored

Theme information can be stored in two places, with different priorities:

#### 1. `config.json` (Same Directory - Highest Priority)

The `config.json` file in your theme's folder is the **most authoritative** source for theme information. It should contain a `theme_info` section:

```json
{
    "theme_info": {
        "title": "Aero",
        "author": "u/YourUsername",
        "authorUrl": "https://www.reddit.com/user/YourUsername",
        "description": "A description of your theme."
    },
    ...
}
```

**Priority:** Information in `config.json` takes precedence over `themes.json` when both are present.

**Important:** The `authorUrl` field can be used for **any link of the author's choice** - this could be:
- A link to the original source/announcement for the theme (e.g., Reddit post, forum thread)
- The author's portfolio or personal website
- The author's social media profile
- Any other relevant link the author wants to share

This URL will be automatically linked from all mentions of the author's name on the theme's `index.html` description page, making it easy for users to find more information about the theme or the author's other work.

#### 2. `themes.json` (Root Directory - Fallback)

The `themes.json` file in the repository root serves as a fast cache for the main page. It contains an array of theme objects:

```json
{
    "themes": [
        {
            "name": "Aero",
            "folder": "Aero",
            "screenshot": "./Aero/screenshot.jpg",
            "description": "This theme is inspired by Windows Vista.",
            "author": "u/Neither-Classic2058",
            "authorUrl": "https://www.reddit.com/r/innioasis/comments/..."
        },
        ...
    ]
}
```

**Priority:** Used as a fallback if `config.json` doesn't contain theme information, or for initial page load performance.

**Note:** The `authorUrl` in `themes.json` works the same way as in `config.json` - it can point to any link the author chooses (original source, portfolio, social media, etc.) and will be linked from author mentions on the theme's description page.

### Theme URLs and Social Sharing

Each theme automatically receives a unique URL based on its folder name:

**Format:** `https://themes.innioasis.app/[ThemeFolderName]`

**Example:** If your theme folder is named `Aero`, the theme's URL will be:
- `https://themes.innioasis.app/Aero`

**⚠️ Important: `index.html` is Required for Theme URLs**

For a theme to be accessible via its URL and shareable, **you must include an `index.html` file** in your theme's folder. Without `index.html`, users will not be able to:
- Visit the theme's dedicated page
- Share the theme's URL on social media
- Link directly to the theme from other websites
- Bookmark the theme page

**How it works:**
- When you place an `index.html` file in your theme folder, GitHub Pages automatically serves it when someone visits `https://themes.innioasis.app/[YourThemeFolder]`
- The main themes page links to individual themes using the format `[ThemeFolder]/index.html`
- If `index.html` is missing, the link will result in a 404 error

**Getting started:**
- You can copy the `index.html` template from another theme's folder
- The `index.html` file will automatically load theme information from `config.json` and `themes.json` (as described above)
- You don't need to manually edit `index.html` - it will dynamically display your theme's information

This URL is useful for:
- **Social Sharing:** Share your theme directly on social media platforms
- **Direct Links:** Link to your theme from forums, Reddit, or other websites
- **Bookmarking:** Users can bookmark specific themes
- **SEO:** Search engines can index individual theme pages

The URL is automatically generated from the theme's folder name, so make sure your folder name is descriptive and URL-friendly (use letters, numbers, and hyphens, avoid spaces and special characters).

---

## Installation Methods

### Method 1: Direct Installation (Desktop - Chrome, Edge, or Opera)

1. Connect your Y1 device to your computer via USB
2. Power on your Y1 device
3. Visit the theme's page on [themes.innioasis.app](https://themes.innioasis.app)
4. Click the **"🚀 Install on Y1"** button
5. Select your Y1's **Themes** folder when prompted
6. The theme will be automatically installed!

### Method 2: ZIP Download

1. Visit the theme's page on [themes.innioasis.app](https://themes.innioasis.app)
2. Click the **"📦 Download ZIP"** button
3. Extract the downloaded ZIP file
4. Copy the theme folder to your Y1's **Themes** directory
5. Safely eject your Y1 device

### Method 3: Innioasis Updater Toolkit (Recommended)

1. Download and install [Innioasis Updater](https://innioasis.app/installguide.html)
2. Open the **Toolkit** section in Innioasis Updater
3. Browse or search for this theme
4. Drag the theme ZIP file into the Updater window (or click "browse files")
5. Connect your Y1 device and power it on
6. The Updater will automatically send the theme to your Y1 when connected

The Innioasis Updater Toolkit is the easiest way to install themes, as it handles both regular Y1 themes and Rockbox themes, plus firmware updates and Rockbox installation.

---

**Note:** After installation, restart your Y1 device and select this theme from the Settings menu to apply it.
