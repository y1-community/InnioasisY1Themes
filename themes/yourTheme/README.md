# Theme HTML Template

This directory contains the `index.html` template file for theme pages in the Innioasis Y1 Themes repository.

## Purpose

The `index.html` file is a **fully dynamic template** that automatically displays your theme information, screenshots, and assets on the themes.innioasis.app website. When placed in your theme folder, it will:

- ✅ Automatically load theme title, author, and description from `config.json`
- ✅ Display all screenshots matching `*screenshot*.*` and `*cover*.*` patterns
- ✅ Show all theme assets referenced in your `config.json` file
- ✅ Generate proper GitHub links for editing/viewing theme files
- ✅ Work seamlessly when your theme is hosted on GitHub Pages

## How to Use

### For Theme Creators

1. **Download the Template**: [Click Here](https://themes.innioasis.app/yourTheme/index.html) to download the latest `index.html` file (or use the direct link: https://themes.innioasis.app/yourTheme/index.html)

2. **Place in Your Theme Folder**: Copy the downloaded `index.html` file into your theme's folder (alongside your `config.json` and theme images)

3. **Upload to Repository**: When you upload your theme to the Innioasis Y1 Themes repository, include the `index.html` file in your theme folder

### Requirements

- Your theme folder must contain a `config.json` file with theme information
- The `index.html` file should be placed in the same directory as your `config.json` file

## How It Works

The `index.html` file is designed to be **completely dynamic**:

1. **Automatic Theme Detection**: It extracts your theme folder name from the URL automatically
2. **Config.json Loading**: It loads theme information (title, author, description) from your `config.json` file
3. **Screenshot Discovery**: It automatically finds and displays all images matching `*screenshot*.*` and `*cover*.*` patterns
4. **Asset Gallery**: It displays all theme assets referenced in your `config.json` with their configuration keys
5. **Fallback Support**: If `config.json` is missing, it falls back to `themes.json` and shows helpful error messages

## Features

- 🎨 **Dynamic Styling**: Button colors and fonts are automatically styled based on your theme's `config.json`
- 📸 **Screenshot Gallery**: Automatically displays all screenshots and cover images in a large, navigable carousel
- 🖼️ **Asset Gallery**: Shows all theme images with their configuration keys (e.g., `itemConfig.itemSelectedBackground`)
- 🔗 **GitHub Integration**: All images link directly to their GitHub files for easy viewing/editing
- 📱 **Mobile Friendly**: Works perfectly on both desktop and mobile devices
- ♿ **Accessible**: Proper semantic HTML and ARIA labels for screen readers

## Download

[**Click Here to Download index.html**](https://raw.githubusercontent.com/y1-community/InnioasisY1Themes/main/yourTheme/index.html)

Or use this direct download link: `https://raw.githubusercontent.com/y1-community/InnioasisY1Themes/main/yourTheme/index.html`

You can also view the file at: `https://themes.innioasis.app/yourTheme/index.html`

## Support

For questions or issues, please visit the [Innioasis Y1 Themes GitHub Repository](https://github.com/y1-community/InnioasisY1Themes) or contact the community maintainers.

## License

This template is part of the Innioasis Y1 Themes project and follows the same license as the repository.

