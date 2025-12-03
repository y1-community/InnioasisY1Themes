# How to Update or Edit this Theme

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

### Theme URLs and Social Sharing

Each theme automatically receives a unique URL based on its folder name:

**Format:** `https://themes.innioasis.app/[ThemeFolderName]`

**Example:** If your theme folder is named `Aero`, the theme's URL will be:
- `https://themes.innioasis.app/Aero`

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
