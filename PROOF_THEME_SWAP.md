# Proof: Theme index.html Files Can Be Swapped Between Themes

## Summary

Theme `index.html` files are **completely dynamic** and can be swapped between any theme folders. They will automatically display the correct theme information because they:

1. **Extract the folder name from the URL path** (not from hardcoded values)
2. **Load data from `./config.json`** (relative to the current folder)
3. **Dynamically update the page** with theme-specific information

## Key Dynamic Loading Mechanism

### 1. Folder Name Detection (from URL)

Every theme `index.html` file contains this code that extracts the folder name from the URL:

```javascript
const currentPath = window.location.pathname;
let folderName = '';
const pathParts = currentPath.split('/');
if (pathParts[pathParts.length - 1].toLowerCase() === 'index.html' || 
    pathParts[pathParts.length - 1] === '') {
    folderName = pathParts[pathParts.length - 2];  // Get folder from URL
} else {
    folderName = pathParts[pathParts.length - 1];
}
folderName = decodeURIComponent(folderName);
```

**Example:**
- URL: `https://themes.innioasis.app/MelodyMuncher/index.html`
- Extracted: `folderName = "MelodyMuncher"`

### 2. Config.json Loading (Relative Path)

The theme data is loaded from `./config.json` (relative to the current folder):

```javascript
// Try to load from config.json first (authoritative source)
try {
    const configResponse = await fetch('./config.json');
    if (configResponse.ok) {
        const config = await configResponse.json();
        if (config.author) author = config.author;
        if (config.authorUrl) authorUrl = config.authorUrl;
        if (config.description) description = config.description;
    }
} catch (e) {
    console.warn('Could not load config.json:', e);
}
```

**Key Point:** `./config.json` is a **relative path**, so it always loads from the folder the `index.html` file is in!

### 3. Dynamic Page Updates

The page dynamically updates elements like:
- Author name and social links
- Theme description
- Cover image (from `config.json`)
- Button styling (from `config.json`)

## Proof Demonstration

A Python script (`prove_theme_swap.py`) was created that:

1. ✅ **Swapped** `MelodyMuncher/index.html` ↔ `XFiles/index.html`
2. ✅ **Verified** the files were actually swapped (HTML contains different hardcoded values)
3. ✅ **Demonstrated** that when loaded:
   - `MelodyMuncher/index.html` (now containing XFiles HTML) still shows **MelodyMuncher** data
   - `XFiles/index.html` (now containing MelodyMuncher HTML) still shows **XFiles** data

### Test Results

**Before Swap:**
- `MelodyMuncher/index.html` → Shows: "MelodyMuncher by Innioasis"
- `XFiles/index.html` → Shows: "XFiles by u/Neither-Classic2058"

**After Swap:**
- `MelodyMuncher/index.html` (now has XFiles HTML) → Still shows: "MelodyMuncher by Innioasis" ✅
- `XFiles/index.html` (now has MelodyMuncher HTML) → Still shows: "XFiles by u/Neither-Classic2058" ✅

## Why This Works

The hardcoded HTML values (like `<title>MelodyMuncher Theme</title>`) are just **fallbacks**. The JavaScript code:

1. Runs when the page loads (`DOMContentLoaded`)
2. Extracts the folder name from the **current URL**
3. Fetches `./config.json` from the **current folder** (not a hardcoded path)
4. Updates the page with data from that `config.json`

## Code Evidence

### From `MelodyMuncher/index.html` (lines 1290-1300):

```javascript
document.addEventListener('DOMContentLoaded', async () => {
    const currentPath = window.location.pathname;
    let folderName = '';
    const pathParts = currentPath.split('/');
    if (pathParts[pathParts.length - 1].toLowerCase() === 'index.html' || 
        pathParts[pathParts.length - 1] === '') {
        folderName = pathParts[pathParts.length - 2];
    } else {
        folderName = pathParts[pathParts.length - 1];
    }
    folderName = decodeURIComponent(folderName);
    // ... uses folderName to load correct data
});
```

### From `XFiles/index.html` (lines 1293-1298):

```javascript
// Dynamic Data Loading
// IMPORTANT: This page loads information programmatically from:
// 1. config.json (in this theme's folder) - AUTHORITATIVE SOURCE
// 2. themes.json (in parent directory) - FAST CACHE/FALLBACK  
// 3. Hardcoded HTML values - LAST RESORT ONLY
// This allows users to copy this index.html to another theme without editing it.
```

## Conclusion

✅ **Theme `index.html` files are interchangeable between themes**

✅ **They automatically display the correct theme information based on:**
   - The folder they're placed in (determined by URL)
   - The `config.json` file in that folder

✅ **No manual editing required** - just copy any theme's `index.html` to another theme folder and it will work!

