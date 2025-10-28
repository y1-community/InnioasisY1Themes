# Complete Theme Creation Guide for com.innioasis.y1

## Overview

This guide provides comprehensive instructions for creating custom themes for the Innioasis Y1 music player. Themes allow you to customize the visual appearance of the entire interface including backgrounds, icons, colors, fonts, and UI elements.

---

## Table of Contents

1. [Theme Structure](#theme-structure)
2. [Configuration File (config.json)](#configuration-file)
3. [Image Assets](#image-assets)
4. [Color Definitions](#color-definitions)
5. [Font Customization](#font-customization)
6. [Complete Configuration Reference](#complete-configuration-reference)
7. [Installation](#installation)
8. [Best Practices](#best-practices)

---

## Theme Structure

### Directory Layout

```
/storage/sdcard0/Themes/YourThemeName/
├── config.json              # Theme configuration file (REQUIRED)
├── cover.png                # Theme preview thumbnail (REQUIRED)
├── font.ttf                 # Custom font (OPTIONAL)
├── desk_bg001.png          # Desktop wallpaper
├── global_bg001.png        # Global wallpaper
├── mask.png                # Desktop mask overlay (OPTIONAL)
│
├── Main Menu Icons/
│   ├── Now Playing.png
│   ├── Music.png
│   ├── Videos.png
│   ├── Audiobooks.png
│   ├── Photos.png
│   ├── FM Radio.png
│   ├── Bluetooth.png
│   ├── Settings.png
│   ├── Shuffle Quick.png
│   ├── calculator.png
│   ├── calendar.png
│   └── ebook.png
│
├── UI Element Images/
│   ├── 1.png               # Selected item background
│   ├── 2.png               # Right arrow
│   ├── 3.png               # Dialog option background
│   ├── 4.png               # Dialog option selected
│   └── ...
│
└── Settings Icons/
    ├── Shutdown@1x.png
    ├── Launcher.png
    ├── Brightness@1x.png
    └── ... (many more)
```

---

## Configuration File

### Required Files

1. **`config.json`** - Main configuration file (REQUIRED)
2. **`cover.png`** - Theme preview image shown in theme selector (REQUIRED)

### Basic config.json Structure

```json
{
    "theme_info": {
        "title": "Your Theme Name",
        "author": "Your Name",
        "authorUrl": "https://yourwebsite.com",
        "description": "Description of your theme"
    },
    "themeCover": "cover.png",
    "desktopWallpaper": "desk_bg001.png",
    "globalWallpaper": "global_bg001.png",
    "desktopMask": "mask.png",
    "fontFamily": "customfont.ttf",
    "itemConfig": { ... },
    "dialogConfig": { ... },
    "menuConfig": { ... },
    "homePageConfig": { ... },
    "fileConfig": { ... },
    "settingConfig": { ... },
    "statusConfig": { ... },
    "playerConfig": { ... }
}
```

---

## Image Assets

### Image Size Reference

Based on `BitmapSize.smali`:

| Asset Type | Width | Height | Purpose |
|------------|-------|--------|---------|
| **MAIN_ICON** | 166px | 166px | Main menu icons (Music, Videos, etc.) |
| **SETTING_ICON** | 146px | 146px | Settings menu icons |
| **ITEM** | 640px | 91px | List item backgrounds |
| **WALLPAPER** | 320px | 240px | Background wallpapers |
| **SMALL_ICON** | 64px | 64px | Small status icons |

### Recommended Image Specifications

- **Format**: PNG with transparency support
- **Color depth**: 24-bit or 32-bit (with alpha channel)
- **Compression**: PNG-8 or PNG-24
- **Background**: Transparent or solid depending on design

---

## Color Definitions

### Color Format

All colors use standard hex format:
- `"#RRGGBB"` - RGB format (e.g., `"#FF0000"` for red)
- `"#AARRGGBB"` - ARGB with alpha (e.g., `"#80FF0000"` for 50% transparent red)

### Empty Values

- Use `""` (empty string) to use default app values
- Omit properties entirely to use defaults

---

## Complete Configuration Reference

### 1. Item Configuration (`itemConfig`)

Controls appearance of list items (music lists, file browsers, etc.):

```json
"itemConfig": {
    "itemTextColor": "#ffffff",
    "itemSelectedTextColor": "#ffffff",
    "itemBackground": "",
    "itemSelectedBackground": "1.png",
    "itemRightArrow": "2.png"
}
```

**Properties**:
- **`itemTextColor`** - Text color for unselected items
- **`itemSelectedTextColor`** - Text color for selected items
- **`itemBackground`** - Background image for unselected items (640×91px)
- **`itemSelectedBackground`** - Background image for selected items (640×91px)
- **`itemRightArrow`** - Right arrow indicator image (small icon)

---

### 2. Dialog Configuration (`dialogConfig`)

Controls appearance of dialog boxes and popups:

```json
"dialogConfig": {
    "dialogOptionBackground": "3.png",
    "dialogOptionTextColor": "#ffffff",
    "dialogOptionSelectedBackground": "4.png",
    "dialogOptionSelectedTextColor": "#ffffff",
    "dialogBackgroundColor": "#000000",
    "dialogTextColor": "#ffffff"
}
```

**Properties**:
- **`dialogOptionBackground`** - Background for dialog options
- **`dialogOptionTextColor`** - Text color for dialog options
- **`dialogOptionSelectedBackground`** - Background for selected dialog option
- **`dialogOptionSelectedTextColor`** - Text color for selected option
- **`dialogBackgroundColor`** - Overall dialog background color
- **`dialogTextColor`** - General dialog text color

---

### 3. Menu Configuration (`menuConfig`)

Controls appearance of main menu and menu items:

```json
"menuConfig": {
    "menuBackgroundColor": "#000000",
    "menuItemBackground": "",
    "menuItemTextColor": "#ffffff",
    "menuItemSelectedBackground": "1.png",
    "menuItemSelectedTextColor": "#ffffff"
}
```

**Properties**:
- **`menuBackgroundColor`** - Background color of main menu
- **`menuItemBackground`** - Background image for unselected menu items
- **`menuItemTextColor`** - Text color for unselected menu items
- **`menuItemSelectedBackground`** - Background image for selected menu item
- **`menuItemSelectedTextColor`** - Text color for selected menu item

---

### 4. Home Page Configuration (`homePageConfig`)

**This is where ALL main menu icons are defined!**

```json
"homePageConfig": {
    "nowPlaying": "Now Playing.png",
    "music": "Music.png",
    "video": "Videos.png",
    "audiobooks": "Audiobooks.png",
    "photos": "Photos.png",
    "fm": "FM Radio.png",
    "bluetooth": "Bluetooth.png",
    "settings": "Settings.png",
    "shuffleQuick": "Shuffle Quick.png",
    "ebook": "ebook.png",
    "calculator": "calculator.png",
    "calendar": "calendar.png"
}
```

**All Properties (Exhaustive List)**:

| Property | Menu Option | Image Size | Description |
|----------|-------------|------------|-------------|
| **`nowPlaying`** | Now Playing | 166×166px | Currently playing track |
| **`music`** | Music | 166×166px | Music library |
| **`video`** | Videos | 166×166px | Video library |
| **`audiobooks`** | Audiobooks | 166×166px | Audiobook library |
| **`photos`** | Photos | 166×166px | Photo gallery |
| **`fm`** | FM Radio | 166×166px | FM radio tuner |
| **`bluetooth`** | Bluetooth | 166×166px | Bluetooth settings |
| **`settings`** | Settings | 166×166px | Settings menu |
| **`shuffleQuick`** | Shuffle Quick | 166×166px | Quick shuffle play |
| **`ebook`** | E-book | 166×166px | E-book reader |
| **`calculator`** | Calculator | 166×166px | Calculator |
| **`calendar`** | Calendar | 166×166px | Calendar |

**Important Notes**:
- All icons are **166×166 pixels** (MAIN_ICON size)
- If omitted, the app uses default built-in icons
- Empty string (`""`) also triggers default icons
- File names can be customized (don't need to match property names)

---

### 5. File Configuration (`fileConfig`)

Icons for file types in file browsers:

```json
"fileConfig": {
    "folderIcon": "folder.png",
    "musicIcon": "music_file.png"
}
```

**Properties**:
- **`folderIcon`** - Icon for folders in file browser
- **`musicIcon`** - Icon for music files

---

### 6. Settings Configuration (`settingConfig`)

**EXHAUSTIVE list of all settings menu icons:**

```json
"settingConfig": {
    "shutdown": "Shutdown@1x.png",
    
    "timedShutdown_off": "Timed shutdown_001@1x.png",
    "timedShutdown_10": "Timed shutdown_002@1x.png",
    "timedShutdown_20": "Timed shutdown_003@1x.png",
    "timedShutdown_30": "Timed shutdown_004@1x.png",
    "timedShutdown_60": "Timed shutdown_005@1x.png",
    "timedShutdown_90": "Timed shutdown_006@1x.png",
    "timedShutdown_120": "Timed shutdown_007@1x.png",
    
    "shuffleOn": "Shuffle_on@1x.png",
    "shuffleOff": "Shuffle_off@1x.png",
    
    "repeatOff": "Repeat_off@1x.png",
    "repeatAll": "Repeat_all@1x.png",
    "repeatOne": "Repeat_one@1x.png",
    
    "equalizer_normal": "Equalizer_normal@1x.png",
    "equalizer_classical": "Equalizer_classical@1x.png",
    "equalizer_dance": "Equalizer_dance@1x.png",
    "equalizer_flat": "Equalizer_flat@1x.png",
    "equalizer_folk": "Equalizer_folk@1x.png",
    "equalizer_heavymetal": "Equalizer_heavy metal@1x.png",
    "equalizer_hiphop": "Equalizer_hiphop@1x.png",
    "equalizer_jazz": "Equalizer_jazz@1x.png",
    "equalizer_pop": "Equalizer_pop@1x.png",
    "equalizer_rock": "Equalizer_rock@1x.png",
    
    "keyLockOn": "Key lock_on@1x.png",
    "keyLockOff": "Key lock_off@1x.png",
    
    "keyToneOn": "Key tone_on@1x.png",
    "keyToneOff": "Key tone_off@1x.png",
    
    "keyVibrationOn": "Key vibration_on@1x.png",
    "keyVibrationOff": "Key vibration_off@1x.png",
    
    "wallpaper": "Wallpaper@1x.png",
    
    "backlight_10": "Backlight_001@1x.png",
    "backlight_15": "Backlight_003@1x.png",
    "backlight_30": "Backlight_004@1x.png",
    "backlight_45": "Backlight_005@1x.png",
    "backlight_60": "Backlight_006@1x.png",
    "backlight_120": "Backlight_007@1x.png",
    "backlight_300": "Backlight_007@1x.png",
    "backlight_always": "Backlight_002@1x.png",
    
    "brightness": "Brightness@1x.png",
    
    "displayBatteryOn": "Display battery_on@1x.png",
    "displayBatteryOff": "Display battery_off@1x.png",
    
    "dateTime": "Date & Time@1x.png",
    "language": "Language@1x.png",
    "launcher": "Launcher.png",
    "factoryReset": "Factory@1x.png",
    "clearCache": "Clear cache@1x.png",
    "theme": "Change Theme@1x.png",
    
    "fileExtensionOn": "file_ext_on.png",
    "fileExtensionOff": "file_ext_off.png",
    
    "settingMask": "settings_mask.png"
}
```

**All Setting Icons (Grouped by Category)**:

#### Shutdown & Power
- `shutdown` - Shutdown option
- `timedShutdown_off`, `timedShutdown_10/20/30/60/90/120` - Timed shutdown states

#### Playback Controls
- `shuffleOn`, `shuffleOff` - Shuffle mode toggle
- `repeatOff`, `repeatAll`, `repeatOne` - Repeat mode options

#### Equalizer Presets (10 options)
- `equalizer_normal`, `equalizer_classical`, `equalizer_dance`
- `equalizer_flat`, `equalizer_folk`, `equalizer_heavymetal`
- `equalizer_hiphop`, `equalizer_jazz`, `equalizer_pop`, `equalizer_rock`

#### Key Behavior
- `keyLockOn`, `keyLockOff` - Key lock states
- `keyToneOn`, `keyToneOff` - Key tone states
- `keyVibrationOn`, `keyVibrationOff` - Key vibration states

#### Display Settings
- `backlight_10/15/30/45/60/120/300/always` - Backlight timeout options (8 states)
- `brightness` - Brightness setting
- `displayBatteryOn`, `displayBatteryOff` - Battery display toggle

#### System Settings
- `dateTime` - Date & Time setting
- `language` - Language selection
- `launcher` - Launcher/Rockbox toggle
- `factoryReset` - Factory reset
- `clearCache` - Cache clearing
- `theme` - Theme selection
- `wallpaper` - Wallpaper selection
- `fileExtensionOn`, `fileExtensionOff` - File extension display toggle

#### Additional
- `settingMask` - Settings screen overlay mask

**Image Size**: 146×146 pixels for all setting icons

---

### 7. Status Configuration (`statusConfig`)

Status bar indicators and battery icons:

```json
"statusConfig": {
    "playing": "play.png",
    "audiobookPlaying": "audiobook_play.png",
    "pause": "pause.png",
    "fmPlaying": "fm_play.png",
    "stop": "stop.png",
    
    "blConnected": "bl_connected.png",
    "blConnecting": "bl_connecting.png",
    "blDisconnected": "bl_disconnected.png",
    
    "headsetWithMic": "headset_mic.png",
    "headsetWithoutMic": "headset_no_mic.png",
    
    "statusBarColor": "#000000",
    
    "battery": [
        "battery.001.png",
        "battery.002.png",
        "battery.003.png",
        "battery.004.png"
    ],
    "batteryCharging": [
        "batterycharge.001.png",
        "batterycharge.002.png",
        "batterycharge.003.png",
        "batterycharge.004.png"
    ]
}
```

**Properties**:

#### Playback Status Icons
- **`playing`** - Music playing indicator
- **`audiobookPlaying`** - Audiobook playing indicator
- **`pause`** - Paused indicator
- **`fmPlaying`** - FM radio playing indicator
- **`stop`** - Stopped indicator

#### Bluetooth Status Icons
- **`blConnected`** - Bluetooth connected
- **`blConnecting`** - Bluetooth connecting
- **`blDisconnected`** - Bluetooth disconnected

#### Headset Icons
- **`headsetWithMic`** - Headset with microphone connected
- **`headsetWithoutMic`** - Headset without microphone connected

#### Battery Icons (Arrays)
- **`battery`** - Array of 4 battery level images (0-25%, 26-50%, 51-75%, 76-100%)
- **`batteryCharging`** - Array of 4 charging battery images

#### Colors
- **`statusBarColor`** - Status bar background color

**Image Size**: 64×64 pixels (SMALL_ICON size) for status icons

---

### 8. Player Configuration (`playerConfig`)

Media player UI customization:

```json
"playerConfig": {
    "progressTextColor": "#ffffff",
    "progressColor": "#00ff00",
    "progressBackgroundColor": "#333333"
}
```

**Properties**:
- **`progressTextColor`** - Color of time/progress text
- **`progressColor`** - Color of progress bar fill
- **`progressBackgroundColor`** - Color of progress bar background

---

## Font Customization

### Custom Font File

Place a TrueType font (`.ttf`) file in your theme directory:

```json
"fontFamily": "YourFont.ttf"
```

**Supported Formats**:
- `.ttf` (TrueType Font)

**Behavior**:
- Applied globally throughout the app
- Overrides system default font
- Must be a valid font file

**Font Loading Process**:
1. Theme manager copies font to temp location
2. Font is loaded via `Typeface.createFromFile()`
3. Applied to all text views in the app

---

## Complete config.json Example

Here's a complete, fully-documented example:

```json
{
    "theme_info": {
        "title": "Complete Theme Example",
        "author": "Theme Developer",
        "authorUrl": "https://example.com",
        "description": "A fully featured theme with all options"
    },
    
    "themeCover": "cover.png",
    "desktopWallpaper": "desk_bg001.png",
    "globalWallpaper": "global_bg001.png",
    "desktopMask": "mask.png",
    "fontFamily": "CustomFont.ttf",
    
    "itemConfig": {
        "itemTextColor": "#ffffff",
        "itemSelectedTextColor": "#00ff00",
        "itemBackground": "",
        "itemSelectedBackground": "item_selected.png",
        "itemRightArrow": "arrow_right.png"
    },
    
    "dialogConfig": {
        "dialogOptionBackground": "dialog_bg.png",
        "dialogOptionTextColor": "#ffffff",
        "dialogOptionSelectedBackground": "dialog_selected.png",
        "dialogOptionSelectedTextColor": "#ffff00",
        "dialogBackgroundColor": "#333333",
        "dialogTextColor": "#ffffff"
    },
    
    "menuConfig": {
        "menuBackgroundColor": "#000000",
        "menuItemBackground": "",
        "menuItemTextColor": "#ffffff",
        "menuItemSelectedBackground": "menu_selected.png",
        "menuItemSelectedTextColor": "#00ff00"
    },
    
    "homePageConfig": {
        "nowPlaying": "Now Playing.png",
        "music": "Music.png",
        "video": "Videos.png",
        "audiobooks": "Audiobooks.png",
        "photos": "Photos.png",
        "fm": "FM Radio.png",
        "bluetooth": "Bluetooth.png",
        "settings": "Settings.png",
        "shuffleQuick": "Shuffle Quick.png",
        "ebook": "E-book.png",
        "calculator": "Calculator.png",
        "calendar": "Calendar.png"
    },
    
    "fileConfig": {
        "folderIcon": "folder.png",
        "musicIcon": "music_file.png"
    },
    
    "settingConfig": {
        "settingMask": "settings_overlay.png",
        "shutdown": "Shutdown.png",
        "timedShutdown_off": "TimedShutdown_Off.png",
        "timedShutdown_10": "TimedShutdown_10.png",
        "timedShutdown_20": "TimedShutdown_20.png",
        "timedShutdown_30": "TimedShutdown_30.png",
        "timedShutdown_60": "TimedShutdown_60.png",
        "timedShutdown_90": "TimedShutdown_90.png",
        "timedShutdown_120": "TimedShutdown_120.png",
        "shuffleOn": "Shuffle_On.png",
        "shuffleOff": "Shuffle_Off.png",
        "repeatOff": "Repeat_Off.png",
        "repeatAll": "Repeat_All.png",
        "repeatOne": "Repeat_One.png",
        "equalizer_normal": "EQ_Normal.png",
        "equalizer_classical": "EQ_Classical.png",
        "equalizer_dance": "EQ_Dance.png",
        "equalizer_flat": "EQ_Flat.png",
        "equalizer_folk": "EQ_Folk.png",
        "equalizer_heavymetal": "EQ_HeavyMetal.png",
        "equalizer_hiphop": "EQ_HipHop.png",
        "equalizer_jazz": "EQ_Jazz.png",
        "equalizer_pop": "EQ_Pop.png",
        "equalizer_rock": "EQ_Rock.png",
        "keyLockOn": "KeyLock_On.png",
        "keyLockOff": "KeyLock_Off.png",
        "keyToneOn": "KeyTone_On.png",
        "keyToneOff": "KeyTone_Off.png",
        "keyVibrationOn": "KeyVib_On.png",
        "keyVibrationOff": "KeyVib_Off.png",
        "wallpaper": "Wallpaper.png",
        "backlight_10": "Backlight_10.png",
        "backlight_15": "Backlight_15.png",
        "backlight_30": "Backlight_30.png",
        "backlight_45": "Backlight_45.png",
        "backlight_60": "Backlight_60.png",
        "backlight_120": "Backlight_120.png",
        "backlight_300": "Backlight_300.png",
        "backlight_always": "Backlight_Always.png",
        "brightness": "Brightness.png",
        "displayBatteryOn": "BatteryDisplay_On.png",
        "displayBatteryOff": "BatteryDisplay_Off.png",
        "dateTime": "DateTime.png",
        "language": "Language.png",
        "launcher": "Launcher.png",
        "factoryReset": "FactoryReset.png",
        "clearCache": "ClearCache.png",
        "theme": "ThemeSelector.png",
        "fileExtensionOn": "FileExt_On.png",
        "fileExtensionOff": "FileExt_Off.png"
    },
    
    "statusConfig": {
        "playing": "status_playing.png",
        "audiobookPlaying": "status_audiobook.png",
        "pause": "status_pause.png",
        "fmPlaying": "status_fm.png",
        "stop": "status_stop.png",
        "blConnected": "status_bt_on.png",
        "blConnecting": "status_bt_connecting.png",
        "blDisconnected": "status_bt_off.png",
        "headsetWithMic": "status_headset_mic.png",
        "headsetWithoutMic": "status_headset.png",
        "statusBarColor": "#1a1a1a",
        "battery": [
            "battery_0.png",
            "battery_25.png",
            "battery_50.png",
            "battery_75.png"
        ],
        "batteryCharging": [
            "battery_charging_0.png",
            "battery_charging_25.png",
            "battery_charging_50.png",
            "battery_charging_75.png"
        ]
    },
    
    "playerConfig": {
        "progressTextColor": "#ffffff",
        "progressColor": "#00ff00",
        "progressBackgroundColor": "#222222"
    }
}
```

---

## Installation

### Theme Directory Location

Themes must be placed in:
```
/storage/sdcard0/Themes/YourThemeName/
```

### Installation Steps

1. Create your theme directory on the SD card
2. Add `config.json` and `cover.png` (minimum required files)
3. Add any custom images referenced in config.json
4. Open Y1 app → Settings → Theme
5. Select your theme from the list
6. Confirm to apply

### Theme Validation

The app validates themes by checking:
- Directory exists at `/storage/sdcard0/Themes/`
- `config.json` exists in theme directory
- JSON is valid and parseable
- Referenced image files exist

---

## Best Practices

### 1. Image Optimization

- **Use appropriate sizes**: Don't use 1000×1000 images when 166×166 is needed
- **Optimize PNGs**: Use tools like `pngquant` or `optipng` to reduce file size
- **Transparency**: Use alpha channel only where needed
- **Test on device**: Some images may look different on the actual hardware screen

### 2. Color Choices

- **Contrast**: Ensure sufficient contrast between text and backgrounds
- **Readability**: Test with actual device screen (often lower resolution/color depth)
- **Dark mode friendly**: Consider both light and dark backgrounds
- **Consistency**: Use consistent color palette throughout

### 3. JSON Formatting

- **Validate JSON**: Use a JSON validator before deploying
- **Use empty strings**: Use `""` for properties you want to skip, not `null`
- **Quote all strings**: Even hex colors must be in quotes: `"#FF0000"`
- **No trailing commas**: Last item in objects/arrays must not have comma

### 4. File Naming

- **Case sensitive**: Linux filesystem - `Music.png` ≠ `music.png`
- **Special characters**: Avoid spaces in filenames if possible
- **Consistent naming**: Use a consistent naming scheme (e.g., all lowercase, all PascalCase)

### 5. Fallback Strategy

You don't need to define EVERY property. The app will:
- Use default icons for missing images
- Use default colors for missing color properties
- Continue to function with minimal config.json

**Minimal viable theme**:
```json
{
    "themeCover": "cover.png",
    "desktopWallpaper": "bg.png",
    "globalWallpaper": "bg.png",
    "itemConfig": {
        "itemTextColor": "#ffffff",
        "itemSelectedTextColor": "#00ff00"
    },
    "menuConfig": {
        "menuBackgroundColor": "#000000",
        "menuItemTextColor": "#ffffff"
    },
    "homePageConfig": {
        "music": "Music.png",
        "settings": "Settings.png"
    }
}
```

---

## Advanced Features

### Desktop Mask (`desktopMask`)

An overlay image applied to the desktop/home screen:

```json
"desktopMask": "overlay_mask.png"
```

**Use cases**:
- Frame effects
- Vignetting
- Border decorations
- Screen texture overlays

### Setting Mask (`settingMask`)

An overlay image applied to the settings screen:

```json
"settingConfig": {
    "settingMask": "settings_overlay.png"
}
```

---

## Troubleshooting

### Theme Doesn't Appear in List

**Check**:
- Theme directory is in `/storage/sdcard0/Themes/`
- `config.json` exists and is valid JSON
- Directory name doesn't contain special characters

### Images Not Loading

**Check**:
- File names in config.json match actual files (case-sensitive)
- Images are in PNG format
- Files are not corrupted
- Sufficient storage space available

### Colors Not Applied

**Check**:
- Colors use hex format with `#`
- Colors are quoted as strings
- No typos in property names (e.g., `itemTextColor` not `itemTextColour`)

### Font Not Loading

**Check**:
- Font file is valid TTF format
- Font file name matches exactly in config.json
- Font file is in theme root directory
- Font has appropriate character set for your language

---

## Example Themes Included

### Theme1 (Stock Theme)
- Basic theme with all menu icons defined
- Demonstrates minimal configuration
- Good starting point for customization

### Theme2
- Similar to Theme1
- Alternative color scheme

### Theme3
- More complex theme
- Includes custom font and desktop mask
- Shows advanced features

---

## Theme Property Quick Reference

### Complete Property Checklist

#### ✅ Required
- [ ] `themeCover` - Theme preview
- [ ] `desktopWallpaper` - Desktop background
- [ ] `globalWallpaper` - Global background

#### ⭕ Recommended
- [ ] `itemConfig` section
- [ ] `menuConfig` section
- [ ] `homePageConfig` section with at least main icons
- [ ] `dialogConfig` section

#### 🔧 Optional
- [ ] `theme_info` section (metadata)
- [ ] `desktopMask` (overlay)
- [ ] `fontFamily` (custom font)
- [ ] `settingConfig` (all settings icons)
- [ ] `statusConfig` (status bar icons)
- [ ] `playerConfig` (player colors)
- [ ] `fileConfig` (file browser icons)

---

## Icon Asset Checklist for Main Menu

Use this checklist to ensure you have all main menu icons:

### Core Menu Items (Always Visible)
- [ ] `nowPlaying` - Now Playing (166×166px)
- [ ] `music` - Music (166×166px)
- [ ] `settings` - Settings (166×166px)

### Common Menu Items
- [ ] `video` - Videos (166×166px)
- [ ] `audiobooks` - Audiobooks (166×166px)
- [ ] `photos` - Photos (166×166px)
- [ ] `fm` - FM Radio (166×166px)
- [ ] `bluetooth` - Bluetooth (166×166px)

### Additional Features
- [ ] `shuffleQuick` - Shuffle Quick (166×166px)
- [ ] `ebook` - E-book Reader (166×166px)
- [ ] `calculator` - Calculator (166×166px)
- [ ] `calendar` - Calendar (166×166px)

**Total**: 12 main menu icons

---

## Settings Icon Checklist

### Essential Settings Icons
- [ ] `shutdown` - Shutdown (146×146px)
- [ ] `wallpaper` - Wallpaper (146×146px)
- [ ] `brightness` - Brightness (146×146px)
- [ ] `language` - Language (146×146px)
- [ ] `launcher` - Launcher/Rockbox (146×146px)
- [ ] `theme` - Theme Selection (146×146px)
- [ ] `factoryReset` - Factory Reset (146×146px)
- [ ] `clearCache` - Clear Cache (146×146px)
- [ ] `dateTime` - Date & Time (146×146px)

### Playback Settings (6 icons)
- [ ] `shuffleOn` / `shuffleOff`
- [ ] `repeatOff` / `repeatAll` / `repeatOne`

### Timed Shutdown (8 icons)
- [ ] `timedShutdown_off/10/20/30/60/90/120`

### Equalizer Presets (10 icons)
- [ ] `equalizer_normal/classical/dance/flat/folk`
- [ ] `equalizer_heavymetal/hiphop/jazz/pop/rock`

### Key Behavior (6 icons)
- [ ] `keyLockOn` / `keyLockOff`
- [ ] `keyToneOn` / `keyToneOff`
- [ ] `keyVibrationOn` / `keyVibrationOff`

### Backlight Options (8 icons)
- [ ] `backlight_10/15/30/45/60/120/300/always`

### Display Options (4 icons)
- [ ] `displayBatteryOn` / `displayBatteryOff`
- [ ] `fileExtensionOn` / `fileExtensionOff`

**Total**: ~53 setting icons (many are toggle states)

---

## Status Bar Icon Checklist

### Playback Status (5 icons, 64×64px)
- [ ] `playing`
- [ ] `audiobookPlaying`
- [ ] `pause`
- [ ] `fmPlaying`
- [ ] `stop`

### Bluetooth Status (3 icons, 64×64px)
- [ ] `blConnected`
- [ ] `blConnecting`
- [ ] `blDisconnected`

### Headset Status (2 icons, 64×64px)
- [ ] `headsetWithMic`
- [ ] `headsetWithoutMic`

### Battery Arrays (8 icons total, 64×64px)
- [ ] `battery[0]` - 0-25%
- [ ] `battery[1]` - 26-50%
- [ ] `battery[2]` - 51-75%
- [ ] `battery[3]` - 76-100%
- [ ] `batteryCharging[0]` - Charging 0-25%
- [ ] `batteryCharging[1]` - Charging 26-50%
- [ ] `batteryCharging[2]` - Charging 51-75%
- [ ] `batteryCharging[3]` - Charging 76-100%

**Total**: 18 status icons

---

## Theme Testing Workflow

### 1. Development
1. Create theme directory structure
2. Add config.json with minimal configuration
3. Add cover.png
4. Test on device - verify theme appears in list

### 2. Incremental Addition
1. Add one section at a time (e.g., start with `homePageConfig`)
2. Test after each section
3. Verify images load correctly
4. Check for JSON errors

### 3. Refinement
1. Adjust colors for readability
2. Optimize image sizes
3. Test with different content (long text, different languages)
4. Verify all states (selected/unselected, on/off)

### 4. Final Testing
1. Apply theme
2. Navigate through all menus
3. Check all settings options
4. Verify status icons appear
5. Test with music playback

---

## Common Mistakes to Avoid

❌ **Invalid JSON syntax** - Use a validator  
❌ **Missing required files** - config.json and cover.png are mandatory  
❌ **Wrong image sizes** - Use recommended dimensions  
❌ **Case mismatch** - `Music.png` in config but `music.png` as filename  
❌ **Absolute paths** - Use relative paths (just filenames)  
❌ **Non-PNG formats** - Stick to PNG for compatibility  
❌ **Trailing commas** - Remove comma after last property  
❌ **Unquoted colors** - `#FF0000` should be `"#FF0000"`  

---

## Resources

### Color Pickers
- Use hex color format: `#RRGGBB` or `#AARRGGBB`
- Online tools: color.adobe.com, coolors.co

### Image Creation
- **Recommended tools**: GIMP, Photoshop, Affinity Designer
- **Icon generators**: Use AI tools or icon packs
- **Transparency**: Support alpha channel for overlays

### JSON Validation
- jsonlint.com
- Visual Studio Code with JSON extension

---

## Summary

Creating a complete theme requires:

1. **Minimum**: 2 files (config.json + cover.png)
2. **Basic theme**: ~15 files (config + wallpapers + main icons)
3. **Complete theme**: 70+ files (all icons + states + custom font)

**Total possible customization**:
- 12 main menu icons
- 53+ settings icons (including states)
- 18 status bar icons
- Multiple wallpapers and masks
- Custom font
- Color schemes for all UI elements

**Start simple**, test frequently, and add complexity gradually!

---

## Version History

- **v1.0** - Initial theme system
- **v2.7.2** - Current version with Calculator, Calendar, and eBook support

---

**Happy Theming! 🎨**
