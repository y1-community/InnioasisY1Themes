/**
 * Y1 UI preview / simulator for the static gallery (480×360 logical pixels, 4:3).
 * Layout and parsing mirror InnioasisY1Themes-tool ThemeDisplay + HomeView + MenuList + useDeviceSimulator.
 */
(function (global) {
    'use strict';

    var VARIANTS = 'Variants';
    var W = 480;
    var H = 360;

    var HOME_MENU_LEFT = 9;
    var HOME_MENU_TOP = 45;
    var HOME_MENU_WIDTH = 204;
    var HOME_MENU_HEIGHT = 307;
    var HOME_ROW_HEIGHT = 45;
    var HOME_ROW_WIDTH = 200;
    var HOME_ROW_LEFT_PAD = 0;

    var PREVIEW_WIDTH = 179;
    var PREVIEW_RIGHT_MARGIN = 23;
    var PREVIEW_TOP_MARGIN = 86;

    var SETTINGS_MENU_LEFT = 9;
    var SETTINGS_MENU_TOP = 45;
    var SETTINGS_MENU_WIDTH = 218;
    var SETTINGS_MENU_HEIGHT = 305;
    var SETTINGS_ROW_HEIGHT = 40;

    var SETTINGS_RIGHT_W = 179;
    var SETTINGS_RIGHT_MARGIN = 22;

    /** Matches Theme Maker `constants.tsx` MOCK_SONGS for now-playing preview. */
    var MOCK_SONGS_PREVIEW = [
        { id: '1', title: 'Jam', artist: 'Michael Jackson', album: 'Dangerous', duration: 243 },
        { id: '2', title: 'Why you wanna trip on me?', artist: 'Michael Jackson', album: 'Dangerous', duration: 230 },
        { id: '3', title: 'In the closet', artist: 'Michael Jackson', album: 'Dangerous', duration: 203 },
        { id: '4', title: 'She drives me wild', artist: 'Michael Jackson', album: 'Dangerous ', duration: 200 },
        { id: '5', title: 'Remember the time', artist: 'Michael Jackson', album: 'Dangerous', duration: 238 }
    ];

    var VIEW_TITLES = {
        home: 'Home',
        music: 'Music',
        music_folders: 'Folders',
        videos: 'Videos',
        videos_folders: 'Folders',
        audiobooks: 'Audiobooks',
        settings: 'Settings',
        settingsEqualizer: 'Equalizer',
        settingsTheme: 'Theme',
        settingsBrightness: 'Brightness',
        settingsWallpaper: 'Wallpaper',
        settingsDateTime: 'Date & Time',
        settingsLanguage: 'Language',
        settingsAbout: 'About',
        nowPlaying: 'Now Playing'
    };

    function normalizeConfigAssetPath(rawPath, folderPath) {
        var p = String(rawPath || '').trim().replace(/\\/g, '/');
        p = p.replace(/^\.\/+/, '').replace(/^\/+/, '');
        if (!p) return '';
        var folder = String(folderPath || '')
            .trim()
            .replace(/\\/g, '/')
            .replace(/^\.\/+/, '')
            .replace(/\/+$/, '');
        if (!folder) return p;
        var lowP = p.toLowerCase();
        var lowFolder = folder.toLowerCase();
        if (lowP === lowFolder) return '';
        if (lowP.startsWith(lowFolder + '/')) {
            return p.slice(folder.length + 1);
        }
        return p;
    }

    function resolvedRepoPath(folderPath, rawRelativePath) {
        var folder = String(folderPath || '')
            .trim()
            .replace(/\\/g, '/')
            .replace(/^\.\/+/, '')
            .replace(/\/+$/, '');
        var rel = normalizeConfigAssetPath(String(rawRelativePath || '').trim().replace(/\\/g, '/'), folder);
        if (!rel) return '';
        var stack = folder.split('/').filter(Boolean);
        var parts = rel.split('/');
        for (var i = 0; i < parts.length; i++) {
            var seg = parts[i];
            if (!seg || seg === '.') continue;
            if (seg === '..') {
                if (stack.length) stack.pop();
                continue;
            }
            stack.push(seg);
        }
        return stack.join('/');
    }

    function encodePathSegments(pathValue) {
        return String(pathValue || '')
            .split('/')
            .filter(Boolean)
            .map(function (seg) {
                return encodeURIComponent(seg);
            })
            .join('/');
    }

    function defaultBuildFileUrl(contentFolder, relativePath) {
        var full = resolvedRepoPath(contentFolder, relativePath);
        if (!full) return '';
        return './' + encodePathSegments(full);
    }

    function effectiveContentPrefix(catalogFolder, variantSegment) {
        var root = String(catalogFolder || '')
            .replace(/^\.\/+/, '')
            .replace(/\/+$/, '')
            .trim();
        var v = String(variantSegment || '').trim();
        if (!root) return '';
        if (!v) return root;
        return root + '/' + VARIANTS + '/' + v;
    }

    function stripExt(name) {
        return String(name || '').replace(/\.[^/.]+$/, '');
    }

    function isHexColor8or6(val) {
        return /^#([0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(String(val || '').trim());
    }

    function pickWallpaper(cfg) {
        if (!cfg || typeof cfg !== 'object') return '';
        return (
            cfg.desktopWallpaper ||
            cfg.globalWallpaper ||
            cfg.themeWallpaper ||
            cfg.themeCover ||
            ''
        );
    }

    function statusBarHeightPx(cfg) {
        var t = cfg && cfg.layout_tokens && cfg.layout_tokens.status_bar;
        if (t && typeof t.height_px === 'number') return t.height_px;
        return 40;
    }

    function buildHomeItems(homeCfg) {
        homeCfg = homeCfg || {};
        var labelMap = {
            nowPlaying: 'Now playing',
            music: 'Music',
            video: 'Videos',
            audiobooks: 'Audiobooks',
            photos: 'Photos',
            fm: 'FM Radio',
            bluetooth: 'Bluetooth',
            settings: 'Settings'
        };
        var standardItems = ['nowPlaying', 'music', 'video', 'audiobooks', 'photos', 'fm', 'bluetooth', 'settings'];
        return standardItems
            .filter(function (key) {
                return homeCfg[key] !== undefined;
            })
            .map(function (key) {
                return {
                    id: key,
                    label: labelMap[key],
                    iconFile: typeof homeCfg[key] === 'string' ? homeCfg[key] : undefined
                };
            });
    }

    function buildColors(itemCfg, menuCfg, statusCfg) {
        itemCfg = itemCfg || {};
        menuCfg = menuCfg || {};
        statusCfg = statusCfg || {};
        var text_primary = itemCfg.itemTextColor || menuCfg.menuItemTextColor || '#00ff2a';
        var text_selected = itemCfg.itemSelectedTextColor || menuCfg.menuItemSelectedTextColor || text_primary;
        return {
            text_primary: text_primary,
            text_selected: text_selected,
            status_bar_bg: statusCfg.statusBarColor || '#0000004e'
        };
    }

    function resolveBackgroundStyle(val, buildFileUrl, contentFolder) {
        if (!val) return null;
        if (isHexColor8or6(val)) {
            return { backgroundColor: val.trim() };
        }
        var url = buildFileUrl(contentFolder, val);
        if (url) {
            return {
                backgroundImage: 'url("' + url.replace(/"/g, '%22') + '")',
                backgroundSize: '100% 100%',
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'center'
            };
        }
        return null;
    }

    function mergeItemBackgrounds(spec, buildFileUrl, contentFolder) {
        var itemCfg = (spec && spec.itemConfig) || {};
        var menuCfg = (spec && spec.menuConfig) || {};
        var itemBg =
            resolveBackgroundStyle(itemCfg.itemBackground, buildFileUrl, contentFolder) ||
            resolveBackgroundStyle(menuCfg.menuItemBackground, buildFileUrl, contentFolder);
        var sel =
            resolveBackgroundStyle(itemCfg.itemSelectedBackground, buildFileUrl, contentFolder) ||
            resolveBackgroundStyle(menuCfg.menuItemSelectedBackground, buildFileUrl, contentFolder);
        if (!sel) {
            sel = { backgroundColor: 'rgba(255,255,255,0.12)' };
        }
        return { itemBackgroundStyle: itemBg, itemSelectedBackgroundStyle: sel };
    }

    function backgroundUrlForView(cfg, viewId, buildFileUrl, contentFolder) {
        if (viewId === 'home') {
            var d = cfg.desktopWallpaper;
            if (d) return buildFileUrl(contentFolder, d);
            return pickWallpaper(cfg) ? buildFileUrl(contentFolder, pickWallpaper(cfg)) : '';
        }
        var g = cfg.globalWallpaper;
        if (g) return buildFileUrl(contentFolder, g);
        var d2 = cfg.desktopWallpaper;
        if (d2) return buildFileUrl(contentFolder, d2);
        return pickWallpaper(cfg) ? buildFileUrl(contentFolder, pickWallpaper(cfg)) : '';
    }

    function applyCssProps(el, props) {
        if (!props || !el) return;
        for (var k in props) {
            if (!Object.prototype.hasOwnProperty.call(props, k)) continue;
            var ck = k.replace(/-([a-z])/g, function (_, c) {
                return c.toUpperCase();
            });
            el.style[ck] = props[k];
        }
    }

    function menuScrollOffset(selectedIndex, itemsLength, itemHeight, visibleHeight) {
        var totalHeight = itemsLength * itemHeight;
        var maxScroll = Math.max(0, totalHeight - visibleHeight);
        var itemsPerPage = Math.floor(visibleHeight / itemHeight) || 1;
        var targetY = 0;
        if (selectedIndex < itemsPerPage) {
            targetY = 0;
        } else {
            var itemsBeforeSelected = Math.floor((itemsPerPage - 1) / 2);
            targetY = (selectedIndex - itemsBeforeSelected) * itemHeight;
            if (targetY > maxScroll) targetY = maxScroll;
        }
        return Math.max(0, Math.min(targetY, maxScroll));
    }

    function appendMenuRows(host, options) {
        var items = options.items || [];
        var selectedIndex = options.selectedIndex | 0;
        var itemHeight = options.itemHeight;
        var visibleHeight = options.visibleHeight;
        var colors = options.colors;
        var itemBg = options.itemBackgroundStyle;
        var itemSel = options.itemSelectedBackgroundStyle;
        var arrowUrl = options.itemRightArrowUrl || '';
        var fullWidth = !!options.fullWidth;
        var leftPad = options.leftPad != null ? options.leftPad : 10;
        var rowWidth = options.rowWidth != null ? options.rowWidth : 200;
        var folderIconUrl = options.folderIconUrl || '';
        var marqueeOnLongLabel = options.marqueeOnLongLabel !== false;

        var actualRowWidth = fullWidth ? W : rowWidth;
        var rowX = fullWidth ? 0 : leftPad;
        var scrollY = menuScrollOffset(selectedIndex, items.length, itemHeight, visibleHeight);

        var outer = document.createElement('div');
        outer.style.cssText =
            'position:relative;height:' + visibleHeight + 'px;overflow:hidden;width:100%;';
        var inner = document.createElement('div');
        inner.style.cssText = 'position:relative;transform:translateY(-' + scrollY + 'px);';
        outer.appendChild(inner);

        for (var idx = 0; idx < items.length; idx++) {
            var item = items[idx];
            var selected = idx === selectedIndex;
            var row = document.createElement('div');
            row.className = 'y1-tp-row' + (selected ? ' is-selected' : '');
            var bg = selected ? itemSel : itemBg || { backgroundColor: 'rgba(0,0,0,0.1)' };
            applyCssProps(row, bg);
            row.style.cssText +=
                'position:absolute;left:' +
                rowX +
                'px;top:' +
                idx * itemHeight +
                'px;width:' +
                actualRowWidth +
                'px;height:' +
                itemHeight +
                'px;display:flex;align-items:center;padding-right:32px;box-sizing:border-box;';

            if (item.isFolder) {
                if (folderIconUrl) {
                    var fi = document.createElement('img');
                    fi.src = folderIconUrl;
                    fi.alt = '';
                    fi.style.cssText =
                        'width:24px;height:24px;margin-left:10px;margin-right:8px;object-fit:contain;flex-shrink:0;';
                    row.appendChild(fi);
                } else {
                    var sp = document.createElement('span');
                    sp.textContent = '\uD83D\uDCC1';
                    sp.style.cssText = 'margin-left:10px;margin-right:8px;font-size:20px;flex-shrink:0;';
                    row.appendChild(sp);
                }
            }

            var labelWrap = document.createElement('div');
            labelWrap.style.cssText =
                (item.isFolder
                    ? 'position:relative;flex:1;'
                    : 'position:absolute;left:5px;top:0;right:42px;height:' +
                      itemHeight +
                      'px;') +
                'display:flex;align-items:center;color:' +
                (selected ? colors.text_selected : colors.text_primary) +
                ';font-weight:bold;font-size:22px;overflow:hidden;white-space:nowrap;';
            var labelInner = document.createElement('div');
            labelInner.style.cssText =
                'display:inline-block;overflow:hidden;white-space:nowrap;' +
                (item.isFolder ? 'text-overflow:ellipsis;' : '');
            var lab = item.label != null ? String(item.label) : '';
            labelInner.textContent = lab;
            if (selected && lab.length > 12 && !item.isFolder && marqueeOnLongLabel) {
                labelInner.style.animation = 'y1-tp-marquee 8s linear infinite';
                var dup = document.createElement('span');
                dup.style.paddingLeft = '40px';
                dup.textContent = lab;
                labelInner.appendChild(dup);
            }
            labelWrap.appendChild(labelInner);
            row.appendChild(labelWrap);

            if (selected) {
                var ar = document.createElement('div');
                ar.style.cssText =
                    'position:absolute;right:10px;top:0;height:' +
                    itemHeight +
                    'px;display:flex;align-items:center;justify-content:center;';
                if (arrowUrl) {
                    var im = document.createElement('img');
                    im.src = arrowUrl;
                    im.alt = '';
                    im.style.cssText =
                        'height:100%;width:auto;object-fit:contain;max-width:64px;max-height:64px;opacity:0.9;';
                    ar.appendChild(im);
                } else {
                    var ch = document.createElement('span');
                    ch.textContent = '\u203A';
                    ch.style.cssText =
                        'color:' +
                        colors.text_selected +
                        ';font-weight:700;font-size:22px;line-height:1;';
                    ar.appendChild(ch);
                }
                row.appendChild(ar);
            }
            inner.appendChild(row);
        }
        host.appendChild(outer);
    }

    function appendSettingsMenuRows(host, options) {
        var items = options.items || [];
        var selectedIndex = options.selectedIndex | 0;
        var visibleHeight = options.visibleHeight;
        var colors = options.colors;
        var itemBg = options.itemBackgroundStyle;
        var itemSel = options.itemSelectedBackgroundStyle;
        var arrowUrl = options.itemRightArrowUrl || '';
        var itemHeight = SETTINGS_ROW_HEIGHT;
        var scrollY = menuScrollOffset(selectedIndex, items.length, itemHeight, visibleHeight);

        var outer = document.createElement('div');
        outer.style.cssText =
            'position:relative;height:' + visibleHeight + 'px;overflow:hidden;width:100%;';
        var inner = document.createElement('div');
        inner.style.cssText = 'position:relative;transform:translateY(-' + scrollY + 'px);';
        outer.appendChild(inner);

        var SELECTED_TEXT = colors.text_selected;

        for (var idx = 0; idx < items.length; idx++) {
            var item = items[idx];
            var selected = idx === selectedIndex;
            var row = document.createElement('div');
            var bg = selected ? itemSel : itemBg || { backgroundColor: 'rgba(0,0,0,0.1)' };
            applyCssProps(row, bg);
            row.style.cssText +=
                'position:absolute;left:0;top:' +
                idx * itemHeight +
                'px;width:100%;height:' +
                itemHeight +
                'px;display:flex;align-items:center;padding-left:5px;padding-right:5px;box-sizing:border-box;';

            var title = document.createElement('div');
            title.style.cssText =
                'flex:1;display:flex;align-items:center;color:' +
                (selected ? SELECTED_TEXT : colors.text_primary) +
                ';font-weight:bold;font-size:22px;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;margin-right:5px;';
            title.textContent = item.label != null ? String(item.label) : '';
            row.appendChild(title);

            if (item.valueText) {
                var vt = document.createElement('div');
                vt.style.cssText =
                    'font-size:20px;font-weight:bold;color:' +
                    (selected ? SELECTED_TEXT : colors.text_primary) +
                    ';margin-right:5px;white-space:nowrap;';
                vt.textContent = String(item.valueText);
                row.appendChild(vt);
            }

            if (selected && !item.valueText) {
                var ar = document.createElement('div');
                ar.style.cssText =
                    'position:absolute;right:10px;top:0;height:' +
                    itemHeight +
                    'px;display:flex;align-items:center;justify-content:center;';
                if (arrowUrl) {
                    var im = document.createElement('img');
                    im.src = arrowUrl;
                    im.alt = '';
                    im.style.cssText =
                        'height:100%;width:auto;object-fit:contain;max-width:64px;max-height:64px;opacity:0.9;';
                    ar.appendChild(im);
                } else {
                    var ch = document.createElement('span');
                    ch.textContent = '\u203A';
                    ch.style.cssText =
                        'color:' + SELECTED_TEXT + ';font-weight:700;font-size:22px;line-height:1;';
                    ar.appendChild(ch);
                }
                row.appendChild(ar);
            }
            inner.appendChild(row);
        }
        host.appendChild(outer);
    }

    function injectRobotoFallback() {
        if (typeof document === 'undefined') return;
        var id = 'y1-tp-roboto-fallback';
        if (document.getElementById(id)) return;
        var head = document.head || document.getElementsByTagName('head')[0];
        if (!head) return;
        var link = document.createElement('link');
        link.id = id;
        link.rel = 'stylesheet';
        link.href =
            'https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap';
        head.appendChild(link);
    }

    function injectThemeFonts(spec, buildFileUrl, contentFolder, styleId) {
        if (typeof document === 'undefined') return;
        var modern = (spec.theme && spec.theme.fonts) || [];
        var fontFamily = spec.fontFamily;
        var themeFonts = modern.length ? modern : fontFamily ? [{ file: fontFamily, default: true }] : [];

        var head = document.head || document.getElementsByTagName('head')[0];
        if (!head) return;
        var existing = head.querySelector('#' + styleId);
        if (existing) existing.remove();

        if (!themeFonts.length) {
            injectRobotoFallback();
            return;
        }

        var css = '';
        for (var i = 0; i < themeFonts.length; i++) {
            var f = themeFonts[i];
            var url = buildFileUrl(contentFolder, f.file);
            if (!url) continue;
            var family = f.id || stripExt(f.file);
            var ext = String(f.file)
                .split('.')
                .pop()
                .toLowerCase();
            var format =
                ext === 'otf' ? 'opentype' : ext === 'woff' ? 'woff' : ext === 'woff2' ? 'woff2' : 'truetype';
            css +=
                '@font-face{font-family:"' +
                family.replace(/"/g, '\\"') +
                '";src:url("' +
                url.replace(/"/g, '%22') +
                '") format("' +
                format +
                '");font-weight:400;font-style:normal;font-display:swap;}';
        }
        if (!css) {
            injectRobotoFallback();
            return;
        }
        var st = document.createElement('style');
        st.id = styleId;
        st.appendChild(document.createTextNode(css));
        head.appendChild(st);
    }

    function defaultFontStack(spec) {
        var modern = (spec.theme && spec.theme.fonts) || [];
        var fontFamily = spec.fontFamily;
        var themeFonts = modern.length ? modern : fontFamily ? [{ file: fontFamily, default: true }] : [];
        if (!themeFonts.length) {
            return '"Roboto", "Helvetica Neue", Arial, sans-serif';
        }
        var def = null;
        for (var fi = 0; fi < themeFonts.length; fi++) {
            if (themeFonts[fi].default) {
                def = themeFonts[fi];
                break;
            }
        }
        if (!def) def = themeFonts[0];
        var fam = def.id || stripExt(def.file);
        var alt = stripExt(def.file);
        var stack = ['"' + fam + '"'];
        if (alt && alt !== fam) stack.push('"' + alt + '"');
        stack.push('"Courier New Bold"', '"Courier New"', 'Courier', 'monospace');
        return stack.join(', ');
    }

    /** 0–3 inclusive, matching Theme Maker status / device battery level index. */
    function normalizedBatteryLevel(raw) {
        var n = Math.floor(Number(raw));
        if (!isFinite(n)) n = 3;
        if (n < 0) n = 0;
        if (n > 3) n = 3;
        return n;
    }

    function batteryPercentFromLevel(level) {
        return (normalizedBatteryLevel(level) + 1) * 25;
    }

    function getBatteryIconUrl(statusCfg, buildFileUrl, contentFolder, level, charging) {
        statusCfg = statusCfg || {};
        var arr = charging ? statusCfg.batteryCharging : statusCfg.battery;
        var lev = normalizedBatteryLevel(level);
        if (typeof arr === 'string' && arr.trim()) {
            return buildFileUrl(contentFolder, arr.trim());
        }
        if (arr && typeof arr === 'object' && !Array.isArray(arr)) {
            var f = arr[String(lev)] != null ? arr[String(lev)] : arr[lev];
            if (f) return buildFileUrl(contentFolder, String(f).trim());
        }
        if (Array.isArray(arr) && arr.length > 0) {
            var idx = Math.min(lev, arr.length - 1);
            var file = arr[idx];
            if (file) return buildFileUrl(contentFolder, String(file).trim());
        }
        return '';
    }

    /** Theme Maker–style fallback when no battery bitmap is available. */
    function appendBatteryFallback(rightEl, pct, textColor) {
        var wrap = document.createElement('div');
        wrap.style.cssText =
            'display:flex;align-items:center;gap:4px;font-size:16px;color:#ffffff;';
        var box = document.createElement('div');
        var borderCol = textColor && String(textColor).charAt(0) === '#' ? textColor : '#ffffff';
        box.style.cssText =
            'width:22px;height:11px;border:1px solid ' +
            borderCol +
            ';border-radius:2px;padding:1px;display:flex;box-sizing:border-box;opacity:0.95;';
        var fill = document.createElement('div');
        fill.style.cssText =
            'width:' +
            Math.max(8, Math.round((pct / 100) * 16)) +
            'px;height:100%;background:linear-gradient(180deg,#7ef29a,#2db84d);border-radius:1px;';
        box.appendChild(fill);
        wrap.appendChild(box);
        var sp = document.createElement('span');
        sp.textContent = pct + '%';
        wrap.appendChild(sp);
        rightEl.appendChild(wrap);
    }

    function buildEqualizerItems(settingConfig, buildFileUrl, contentFolder) {
        settingConfig = settingConfig || {};
        var base = [
            { id: 'equalizer_normal', label: 'Normal', iconFile: settingConfig.equalizer_normal },
            { id: 'equalizer_classical', label: 'Classical', iconFile: settingConfig.equalizer_classical },
            { id: 'equalizer_dance', label: 'Dance', iconFile: settingConfig.equalizer_dance },
            { id: 'equalizer_flat', label: 'Flat', iconFile: settingConfig.equalizer_flat },
            { id: 'equalizer_folk', label: 'Folk', iconFile: settingConfig.equalizer_folk },
            { id: 'equalizer_heavymetal', label: 'Heavy Metal', iconFile: settingConfig.equalizer_heavymetal },
            { id: 'equalizer_hiphop', label: 'Hip Hop', iconFile: settingConfig.equalizer_hiphop },
            { id: 'equalizer_jazz', label: 'Jazz', iconFile: settingConfig.equalizer_jazz },
            { id: 'equalizer_pop', label: 'Pop', iconFile: settingConfig.equalizer_pop },
            { id: 'equalizer_rock', label: 'Rock', iconFile: settingConfig.equalizer_rock }
        ];
        return base.map(function (it) {
            return {
                id: it.id,
                label: it.label,
                iconUrl: it.iconFile ? buildFileUrl(contentFolder, it.iconFile) : ''
            };
        });
    }

    function buildSettingsItems(cfg, buildFileUrl, contentFolder, sim) {
        var settingConfig = (cfg && cfg.settingConfig) || {};
        sim = sim || {};
        var timedShutdownValue = sim.timedShutdownValue || 'off';
        var backlightValue = sim.backlightValue || '10';
        var shuffleEnabled = !!sim.shuffleEnabled;
        var repeatMode = sim.repeatMode || 'off';
        var fileExtensionsEnabled = !!sim.fileExtensionsEnabled;
        var keyLockEnabled = !!sim.keyLockEnabled;
        var keyToneEnabled = sim.keyToneEnabled !== false;
        var keyVibrationEnabled = sim.keyVibrationEnabled !== false;
        var displayBatteryEnabled = sim.displayBatteryEnabled !== false;

        function gt(id) {
            switch (id) {
                case 'timed_shutdown':
                    return timedShutdownValue === 'off' ? 'Off' : timedShutdownValue + ' min';
                case 'shuffle':
                    return shuffleEnabled ? 'On' : 'Off';
                case 'repeat':
                    return repeatMode === 'off' ? 'Off' : repeatMode === 'all' ? 'All' : 'One';
                case 'file_extension':
                    return fileExtensionsEnabled ? 'On' : 'Off';
                case 'key_lock':
                    return keyLockEnabled ? 'On' : 'Off';
                case 'key_tone':
                    return keyToneEnabled ? 'On' : 'Off';
                case 'key_vibration':
                    return keyVibrationEnabled ? 'On' : 'Off';
                case 'backlight':
                    return backlightValue === 'always' ? 'Always' : backlightValue + ' sec';
                case 'display_battery':
                    return displayBatteryEnabled ? 'On' : 'Off';
                case 'about':
                    return 'Version';
                default:
                    return undefined;
            }
        }

        var timedShutdownIcon = settingConfig['timedShutdown_' + timedShutdownValue];
        var backlightIcon = settingConfig['backlight_' + backlightValue];
        var shuffleIcon = shuffleEnabled ? settingConfig.shuffleOn : settingConfig.shuffleOff;
        var repeatIcon =
            repeatMode === 'off'
                ? settingConfig.repeatOff
                : repeatMode === 'all'
                  ? settingConfig.repeatAll
                  : settingConfig.repeatOne;
        var fileExtensionIcon = fileExtensionsEnabled
            ? settingConfig.fileExtensionOn
            : settingConfig.fileExtensionOff;
        var keyLockIcon = keyLockEnabled ? settingConfig.keyLockOn : settingConfig.keyLockOff;
        var keyToneIcon = keyToneEnabled ? settingConfig.keyToneOn : settingConfig.keyToneOff;
        var keyVibrationIcon = keyVibrationEnabled
            ? settingConfig.keyVibrationOn
            : settingConfig.keyVibrationOff;
        var displayBatteryIcon = displayBatteryEnabled
            ? settingConfig.displayBatteryOn
            : settingConfig.displayBatteryOff;

        var base = [
            { id: 'shutdown', label: 'Shutdown', iconFile: settingConfig.shutdown },
            {
                id: 'timed_shutdown',
                label: 'Timed shutdown',
                iconFile: timedShutdownIcon,
                valueText: gt('timed_shutdown')
            },
            { id: 'shuffle', label: 'Shuffle', iconFile: shuffleIcon, valueText: gt('shuffle') },
            { id: 'repeat', label: 'Repeat', iconFile: repeatIcon, valueText: gt('repeat') },
            { id: 'equalizer', label: 'Equalizer', iconFile: settingConfig.equalizer_normal },
            {
                id: 'file_extension',
                label: 'File extensions',
                iconFile: fileExtensionIcon,
                valueText: gt('file_extension')
            },
            { id: 'key_lock', label: 'Key lock', iconFile: keyLockIcon, valueText: gt('key_lock') },
            { id: 'key_tone', label: 'Key tone', iconFile: keyToneIcon, valueText: gt('key_tone') },
            {
                id: 'key_vibration',
                label: 'Key vibration',
                iconFile: keyVibrationIcon,
                valueText: gt('key_vibration')
            },
            { id: 'wallpaper', label: 'Wallpaper', iconFile: settingConfig.wallpaper },
            {
                id: 'backlight',
                label: 'Backlight',
                iconFile: backlightIcon,
                valueText: gt('backlight')
            },
            { id: 'brightness', label: 'Brightness', iconFile: settingConfig.brightness },
            {
                id: 'display_battery',
                label: 'Display battery',
                iconFile: displayBatteryIcon,
                valueText: gt('display_battery')
            },
            { id: 'date_time', label: 'Date & Time', iconFile: settingConfig.dateTime },
            { id: 'theme', label: 'Theme', iconFile: settingConfig.theme },
            { id: 'language', label: 'Language', iconFile: settingConfig.language },
            { id: 'factory_reset', label: 'Factory reset', iconFile: settingConfig.factoryReset },
            { id: 'clear_cache', label: 'Clear cache', iconFile: settingConfig.clearCache },
            { id: 'about', label: 'About', iconFile: undefined, valueText: gt('about') }
        ];
        return base.map(function (item) {
            return {
                id: item.id,
                label: item.label,
                valueText: item.valueText,
                iconUrl: item.iconFile ? buildFileUrl(contentFolder, item.iconFile) : ''
            };
        });
    }

    function createSimulatorState() {
        return {
            themeViewId: 'home',
            themeSelectedIndex: 0,
            themeHistory: [],
            batteryLevel: 3,
            isCharging: false,
            playState: null,
            timedShutdownValue: 'off',
            backlightValue: '10',
            shuffleEnabled: false,
            repeatMode: 'off',
            fileExtensionsEnabled: false,
            keyLockEnabled: false,
            keyToneEnabled: true,
            keyVibrationEnabled: true,
            displayBatteryEnabled: true,
            brightnessLevel: 50,
            dialogVisible: false,
            dialogTitle: '',
            dialogMessage: '',
            dialogOptions: [],
            dialogSelectedIndex: 0,
            toastMessage: '',
            toastVisible: false
        };
    }

    function genericListForView(viewId) {
        if (viewId === 'music') {
            return ['All songs', 'Playlists', 'Artists', 'Albums', 'Genres', 'Folders', 'Search'].map(
                function (label) {
                    return { id: label.toLowerCase().replace(/\s+/g, '_'), label: label };
                }
            );
        }
        if (viewId === 'music_folders') {
            var folders = [
                'Bad',
                'Thriller',
                'Dangerous',
                'HIStory',
                'Invincible',
                'Off the Wall',
                'The Wall',
                'Bloodline',
                'Unreleased',
                'Live',
                'Demos',
                'Remixes',
                'Collabs',
                'Remastered',
                'Vault'
            ];
            return folders.map(function (label) {
                return {
                    id: label.toLowerCase().replace(/\s+/g, '_'),
                    label: label,
                    isFolder: true
                };
            });
        }
        if (viewId === 'videos') {
            return ['All video', 'Playlist', 'Folders', 'Search'].map(function (label) {
                return { id: label.toLowerCase().replace(/\s+/g, '_'), label: label };
            });
        }
        if (viewId === 'videos_folders') {
            var vf = [
                'Music Videos',
                'Concerts',
                'Documentaries',
                'Interviews',
                'Behind The Scenes',
                'Short Films',
                'Live Performances',
                'Rehearsals',
                'Awards Shows',
                'TV Appearances',
                'Tributes',
                'Fan Made',
                'Remastered',
                'Archives',
                'Collections'
            ];
            return vf.map(function (label) {
                return {
                    id: label.toLowerCase().replace(/\s+/g, '_'),
                    label: label,
                    isFolder: true
                };
            });
        }
        if (viewId === 'audiobooks') {
            return [
                'All audiobooks',
                'Artists',
                'Albums',
                'Folders',
                'Bookmark lists',
                'Settings'
            ].map(function (label) {
                return { id: label.toLowerCase().replace(/\s+/g, '_'), label: label };
            });
        }
        if (viewId === 'settingsLanguage') {
            return ['English', '简体中文', 'Español', 'Français', 'Deutsch', '日本語'].map(function (
                label,
                i
            ) {
                return { id: 'lang_' + i, label: label };
            });
        }
        return [];
    }

    function mount(container, options) {
        if (!container) return Promise.reject(new Error('Missing container'));
        var opts = options || {};
        var mode = String(opts.mode || 'menu').toLowerCase();
        var interactive = mode === 'full';
        var catalogFolder = String(opts.catalogFolder || '')
            .replace(/^\.\/+/, '')
            .trim();
        var variantSegment = String(opts.variantSegment || '').trim();
        var contentFolder = effectiveContentPrefix(catalogFolder, variantSegment);
        var buildFileUrl =
            typeof opts.buildFileUrl === 'function' ? opts.buildFileUrl : defaultBuildFileUrl;

        if (typeof container._y1TpCleanup === 'function') {
            try {
                container._y1TpCleanup();
            } catch (e) {}
            container._y1TpCleanup = null;
        }

        container.innerHTML = '';
        container.classList.add('y1-tp-mounted');

        var encoded = contentFolder.split('/').filter(Boolean).map(encodeURIComponent).join('/');
        return fetch('./' + encoded + '/config.json', { cache: 'no-cache' })
            .then(function (res) {
                if (!res.ok) throw new Error('config.json not found');
                return res.json();
            })
            .then(function (cfg) {
                var sim = interactive
                    ? createSimulatorState()
                    : {
                          themeViewId: 'home',
                          themeSelectedIndex: 0,
                          batteryLevel: 3,
                          isCharging: false,
                          playState: null,
                          brightnessLevel: 50
                      };

                var previewMeta = opts.previewMeta || {};

                var fontStyleId =
                    'y1-tp-fonts-' +
                    String(catalogFolder + '-' + variantSegment).replace(/[^a-zA-Z0-9_-]/g, '-');
                injectThemeFonts(cfg, buildFileUrl, contentFolder, fontStyleId);
                var fontStack = defaultFontStack(cfg);

                var itemCfg = (cfg && cfg.itemConfig) || {};
                var menuCfg = (cfg && cfg.menuConfig) || {};
                var statusCfg = (cfg && cfg.statusConfig) || {};
                var settingCfg = (cfg && cfg.settingConfig) || {};
                var dialogCfg = (cfg && cfg.dialogConfig) || {};

                var colors = buildColors(itemCfg, menuCfg, statusCfg);
                var bgMerged = mergeItemBackgrounds(cfg, buildFileUrl, contentFolder);
                var itemBackgroundStyle = bgMerged.itemBackgroundStyle;
                var itemSelectedBackgroundStyle = bgMerged.itemSelectedBackgroundStyle;

                var itemRightArrowUrl = itemCfg.itemRightArrow
                    ? buildFileUrl(contentFolder, itemCfg.itemRightArrow)
                    : '';

                var statusH = statusBarHeightPx(cfg);
                var desktopMaskUrl = cfg.desktopMask ? buildFileUrl(contentFolder, cfg.desktopMask) : '';
                var settingMaskUrl = settingCfg.settingMask
                    ? buildFileUrl(contentFolder, settingCfg.settingMask)
                    : '';

                var homeItems = buildHomeItems(cfg.homePageConfig || {});
                var folderIconFile = (cfg.fileConfig && cfg.fileConfig.folderIcon) || '';
                var folderIconUrl = folderIconFile
                    ? buildFileUrl(contentFolder, folderIconFile)
                    : '';

                var root = document.createElement('div');
                root.className = 'y1-tp-root';

                var dev = document.createElement('div');
                dev.className = 'y1-tp-device' + (interactive ? ' y1-tp-device--full' : '');

                var viewport = document.createElement('div');
                viewport.className = 'y1-tp-viewport';

                var scaleWrap = document.createElement('div');
                scaleWrap.className = 'y1-tp-scale-wrap';

                var canvas = document.createElement('div');
                canvas.className = 'y1-tp-canvas';
                canvas.style.fontFamily = fontStack;

                scaleWrap.appendChild(canvas);
                viewport.appendChild(scaleWrap);
                dev.appendChild(viewport);

                var wheel = null;
                if (interactive) {
                    wheel = document.createElement('div');
                    wheel.className = 'y1-tp-wheel';
                    wheel.innerHTML =
                        '<div class="y1-tp-wheel-row y1-tp-wheel-row--top">' +
                        '<button type="button" class="y1-tp-wbtn" data-y1act="menu" title="Menu">Menu</button>' +
                        '</div>' +
                        '<div class="y1-tp-wheel-mid">' +
                        '<button type="button" class="y1-tp-wbtn" data-y1act="up" title="Up">\u25B2</button>' +
                        '<button type="button" class="y1-tp-wbtn y1-tp-wbtn--round" data-y1act="center" title="Select"></button>' +
                        '<button type="button" class="y1-tp-wbtn" data-y1act="down" title="Down">\u25BC</button>' +
                        '</div>' +
                        '<div class="y1-tp-wheel-row y1-tp-wheel-row--btm">' +
                        '<button type="button" class="y1-tp-wbtn" data-y1act="prev" title="Previous">\u23EE</button>' +
                        '<button type="button" class="y1-tp-wbtn" data-y1act="play" title="Play/Pause">\u23EF</button>' +
                        '<button type="button" class="y1-tp-wbtn" data-y1act="next" title="Next">\u23ED</button>' +
                        '</div>';
                    dev.appendChild(wheel);
                }

                root.appendChild(dev);
                container.appendChild(root);

                function updateScale() {
                    var vw = viewport.clientWidth || 1;
                    var vh = viewport.clientHeight || 1;
                    var s = Math.min(vw / W, vh / H);
                    if (!(s > 0) || !isFinite(s)) s = 1;
                    scaleWrap.style.transform = 'scale(' + s + ')';
                }

                var ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(updateScale) : null;
                if (ro) ro.observe(viewport);
                else updateScale();

                function getViewTitle() {
                    return VIEW_TITLES[sim.themeViewId] || 'Home';
                }

                function paint() {
                    canvas.innerHTML = '';
                    var bgUrl = backgroundUrlForView(cfg, sim.themeViewId, buildFileUrl, contentFolder);
                    canvas.style.backgroundImage = bgUrl ? 'url("' + bgUrl.replace(/"/g, '%22') + '")' : '';
                    canvas.style.backgroundSize = bgUrl ? 'contain' : '';
                    canvas.style.backgroundPosition = bgUrl ? 'center' : '';
                    canvas.style.backgroundRepeat = bgUrl ? 'no-repeat' : '';
                    canvas.style.backgroundColor = '#000';

                    var status = document.createElement('div');
                    status.className = 'y1-tp-status';
                    status.style.cssText =
                        'position:absolute;left:0;top:0;width:' +
                        W +
                        'px;height:' +
                        statusH +
                        'px;background-color:' +
                        (colors.status_bar_bg || 'rgba(0,0,0,0.25)') +
                        ';color:#ffffff;display:flex;align-items:center;padding-left:14px;padding-right:14px;justify-content:space-between;z-index:20;font-size:20px;font-weight:700;box-sizing:border-box;';
                    var leftTitle = document.createElement('span');
                    leftTitle.textContent = getViewTitle();
                    status.appendChild(leftTitle);

                    var right = document.createElement('div');
                    right.style.cssText = 'display:flex;align-items:center;gap:6px;';
                    if (sim.playState) {
                        var pk =
                            sim.playState === 'playing'
                                ? 'playing'
                                : sim.playState === 'pause'
                                  ? 'pause'
                                  : sim.playState === 'stop'
                                    ? 'stop'
                                    : sim.playState === 'fmPlaying'
                                      ? 'fmPlaying'
                                      : 'audiobookPlaying';
                        var pf = statusCfg[pk];
                        if (pf) {
                            var pi = document.createElement('img');
                            pi.src = buildFileUrl(contentFolder, pf);
                            pi.alt = '';
                            pi.style.cssText = 'height:25px;width:25px;object-fit:contain;display:block;';
                            right.appendChild(pi);
                        }
                    }
                    var battRaw = sim && sim.batteryLevel;
                    var battLvl =
                        battRaw !== undefined && battRaw !== null && battRaw !== ''
                            ? battRaw
                            : 3;
                    var pct = batteryPercentFromLevel(battLvl);
                    if (!isFinite(pct)) pct = 100;
                    var battUrl = getBatteryIconUrl(
                        statusCfg,
                        buildFileUrl,
                        contentFolder,
                        battLvl,
                        sim && sim.isCharging
                    );
                    if (battUrl) {
                        var bi = document.createElement('img');
                        bi.src = battUrl;
                        bi.alt = '';
                        bi.style.cssText = 'height:15px;width:auto;object-fit:contain;display:block;';
                        var pctSpan = document.createElement('span');
                        pctSpan.style.fontSize = '16px';
                        pctSpan.textContent = pct + '%';
                        bi.onerror = function () {
                            bi.onerror = null;
                            bi.style.display = 'none';
                            if (pctSpan.parentNode) pctSpan.parentNode.removeChild(pctSpan);
                            appendBatteryFallback(right, pct, colors.text_primary);
                        };
                        right.appendChild(bi);
                        right.appendChild(pctSpan);
                    } else {
                        appendBatteryFallback(right, pct, colors.text_primary);
                    }
                    status.appendChild(right);
                    canvas.appendChild(status);

                    var useSettingMask =
                        sim.themeViewId === 'settings' ||
                        sim.themeViewId.indexOf('settings') === 0;
                    var maskUrl =
                        sim.themeViewId === 'home' ? desktopMaskUrl : useSettingMask ? settingMaskUrl : '';
                    if (maskUrl) {
                        var mk = document.createElement('img');
                        mk.className = 'y1-tp-desktop-mask';
                        mk.src = maskUrl;
                        mk.alt = '';
                        mk.style.cssText =
                            'position:absolute;left:0;top:0;width:100%;height:100%;object-fit:cover;pointer-events:none;z-index:5;';
                        canvas.appendChild(mk);
                    }

                    var layer = document.createElement('div');
                    layer.style.cssText =
                        'position:absolute;left:0;top:0;width:' + W + 'px;height:' + H + 'px;z-index:8;';
                    canvas.appendChild(layer);

                    if (sim.themeViewId === 'home') {
                        var menuBox = document.createElement('div');
                        menuBox.style.cssText =
                            'position:absolute;left:' +
                            HOME_MENU_LEFT +
                            'px;top:' +
                            HOME_MENU_TOP +
                            'px;width:' +
                            HOME_MENU_WIDTH +
                            'px;height:' +
                            HOME_MENU_HEIGHT +
                            'px;overflow:hidden;z-index:10;';
                        appendMenuRows(menuBox, {
                            items: homeItems,
                            selectedIndex: sim.themeSelectedIndex,
                            itemHeight: HOME_ROW_HEIGHT,
                            visibleHeight: HOME_MENU_HEIGHT,
                            colors: colors,
                            itemBackgroundStyle: itemBackgroundStyle,
                            itemSelectedBackgroundStyle: itemSelectedBackgroundStyle,
                            itemRightArrowUrl: itemRightArrowUrl,
                            fullWidth: false,
                            leftPad: HOME_ROW_LEFT_PAD,
                            rowWidth: HOME_ROW_WIDTH,
                            folderIconUrl: folderIconUrl
                        });
                        layer.appendChild(menuBox);

                        var sel = homeItems[sim.themeSelectedIndex];
                        if (sel && sel.iconFile) {
                            var iu = buildFileUrl(contentFolder, sel.iconFile);
                            if (iu) {
                                var tile = document.createElement('div');
                                tile.style.cssText =
                                    'position:absolute;right:' +
                                    PREVIEW_RIGHT_MARGIN +
                                    'px;top:' +
                                    PREVIEW_TOP_MARGIN +
                                    'px;width:' +
                                    PREVIEW_WIDTH +
                                    'px;height:auto;display:flex;align-items:center;justify-content:center;z-index:10;';
                                var im = document.createElement('img');
                                im.src = iu;
                                im.alt = sel.label || '';
                                im.style.cssText =
                                    'max-width:100%;width:auto;height:auto;object-fit:contain;display:block;';
                                tile.appendChild(im);
                                layer.appendChild(tile);
                            }
                        }
                    } else if (
                        sim.themeViewId === 'music' ||
                        sim.themeViewId === 'music_folders' ||
                        sim.themeViewId === 'videos' ||
                        sim.themeViewId === 'videos_folders' ||
                        sim.themeViewId === 'audiobooks'
                    ) {
                        var genBox = document.createElement('div');
                        genBox.style.cssText =
                            'position:absolute;left:0;top:' +
                            statusH +
                            'px;width:' +
                            W +
                            'px;height:' +
                            (H - statusH) +
                            'px;overflow:hidden;z-index:10;';
                        var gItems = genericListForView(sim.themeViewId);
                        appendMenuRows(genBox, {
                            items: gItems,
                            selectedIndex: sim.themeSelectedIndex,
                            itemHeight: Math.floor((H - statusH - 12) / 7) || 40,
                            visibleHeight: H - statusH,
                            colors: colors,
                            itemBackgroundStyle: itemBackgroundStyle,
                            itemSelectedBackgroundStyle: itemSelectedBackgroundStyle,
                            itemRightArrowUrl: itemRightArrowUrl,
                            fullWidth: true,
                            leftPad: 0,
                            rowWidth: W,
                            folderIconUrl: folderIconUrl
                        });
                        layer.appendChild(genBox);
                    } else if (sim.themeViewId === 'settings') {
                        var settingsColors = {
                            text_primary: colors.text_primary,
                            text_selected: itemCfg.itemSelectedTextColor || '#3CFFDE'
                        };
                        var sItems = buildSettingsItems(cfg, buildFileUrl, contentFolder, sim);
                        var sMenu = document.createElement('div');
                        sMenu.style.cssText =
                            'position:absolute;left:' +
                            SETTINGS_MENU_LEFT +
                            'px;top:' +
                            SETTINGS_MENU_TOP +
                            'px;width:' +
                            SETTINGS_MENU_WIDTH +
                            'px;height:' +
                            SETTINGS_MENU_HEIGHT +
                            'px;overflow:hidden;z-index:10;';
                        appendSettingsMenuRows(sMenu, {
                            items: sItems,
                            selectedIndex: sim.themeSelectedIndex,
                            visibleHeight: SETTINGS_MENU_HEIGHT,
                            colors: settingsColors,
                            itemBackgroundStyle: itemBackgroundStyle,
                            itemSelectedBackgroundStyle: itemSelectedBackgroundStyle,
                            itemRightArrowUrl: itemRightArrowUrl
                        });
                        layer.appendChild(sMenu);

                        var selS = sItems[sim.themeSelectedIndex] || {};
                        var isAbout = selS.id === 'about';
                        var rp = document.createElement('div');
                        rp.style.cssText =
                            'position:absolute;right:' +
                            SETTINGS_RIGHT_MARGIN +
                            'px;top:0;width:' +
                            SETTINGS_RIGHT_W +
                            'px;height:' +
                            H +
                            'px;z-index:10;';
                        var rt = document.createElement('div');
                        rt.style.cssText =
                            'position:absolute;top:58px;left:0;right:0;text-align:center;font-size:18px;font-weight:bold;color:#ffffff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;padding:0 5px;line-height:1.2;';
                        rt.textContent = selS.label || '';
                        rp.appendChild(rt);

                        var imgBox = document.createElement('div');
                        imgBox.style.cssText =
                            'position:absolute;top:96px;left:0;right:0;width:100%;display:flex;flex-direction:column;align-items:center;justify-content:flex-start;';
                        if (isAbout) {
                            var abWrap = document.createElement('div');
                            abWrap.style.cssText =
                                'width:100%;display:flex;flex-direction:column;align-items:center;';
                            var sq = document.createElement('div');
                            sq.style.cssText =
                                'width:140px;height:140px;background:rgba(255,255,255,0.1);border-radius:8px;display:flex;align-items:center;justify-content:center;margin-bottom:20px;border:2px solid rgba(255,255,255,0.3);';
                            var y1 = document.createElement('div');
                            y1.style.cssText = 'color:#ffffff;font-size:48px;font-weight:bold;';
                            y1.textContent = 'Y1';
                            sq.appendChild(y1);
                            abWrap.appendChild(sq);
                            var v1 = document.createElement('div');
                            v1.style.cssText = 'color:#ffffff;font-size:16px;text-align:center;margin-bottom:10px;';
                            v1.textContent = 'Version 3.0.2';
                            abWrap.appendChild(v1);
                            var v2 = document.createElement('div');
                            v2.style.cssText =
                                'color:#ffffff;font-size:14px;text-align:center;opacity:0.8;';
                            v2.textContent = 'Innioasis Y1';
                            abWrap.appendChild(v2);
                            imgBox.appendChild(abWrap);
                        } else if (selS.iconUrl) {
                            var simg = document.createElement('img');
                            simg.src = selS.iconUrl;
                            simg.alt = selS.label || '';
                            simg.style.cssText =
                                'max-width:146px;max-height:146px;width:auto;height:auto;object-fit:contain;display:block;';
                            imgBox.appendChild(simg);
                        }
                        rp.appendChild(imgBox);

                        if (selS.valueText && !isAbout) {
                            var stx = document.createElement('div');
                            stx.style.cssText =
                                'position:absolute;top:242px;left:0;right:0;font-size:16px;color:#ffffff;text-align:center;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;padding:0 5px;';
                            stx.textContent = String(selS.valueText);
                            rp.appendChild(stx);
                        }
                        layer.appendChild(rp);
                    } else if (sim.themeViewId === 'settingsEqualizer') {
                        var eqColors = {
                            text_primary: colors.text_primary,
                            text_selected: itemCfg.itemSelectedTextColor || '#3CFFDE'
                        };
                        var eqItems = buildEqualizerItems(settingCfg, buildFileUrl, contentFolder);
                        var eqMenu = document.createElement('div');
                        eqMenu.style.cssText =
                            'position:absolute;left:' +
                            SETTINGS_MENU_LEFT +
                            'px;top:' +
                            SETTINGS_MENU_TOP +
                            'px;width:' +
                            SETTINGS_MENU_WIDTH +
                            'px;height:' +
                            SETTINGS_MENU_HEIGHT +
                            'px;overflow:hidden;z-index:10;';
                        appendSettingsMenuRows(eqMenu, {
                            items: eqItems.map(function (e) {
                                return { id: e.id, label: e.label };
                            }),
                            selectedIndex: sim.themeSelectedIndex,
                            visibleHeight: SETTINGS_MENU_HEIGHT,
                            colors: eqColors,
                            itemBackgroundStyle: itemBackgroundStyle,
                            itemSelectedBackgroundStyle: itemSelectedBackgroundStyle,
                            itemRightArrowUrl: itemRightArrowUrl
                        });
                        layer.appendChild(eqMenu);

                        var eqSel = eqItems[sim.themeSelectedIndex] || {};
                        var erp = document.createElement('div');
                        erp.style.cssText =
                            'position:absolute;right:22px;top:0;width:200px;height:' +
                            H +
                            'px;z-index:10;';
                        var et = document.createElement('div');
                        et.style.cssText =
                            'position:absolute;top:58px;left:0;right:0;text-align:center;font-size:18px;font-weight:bold;color:#ffffff;white-space:nowrap;overflow:hidden;padding:0 5px;';
                        et.textContent = 'Equalizer';
                        erp.appendChild(et);
                        if (eqSel.iconUrl) {
                            var eib = document.createElement('div');
                            eib.style.cssText =
                                'position:absolute;top:96px;left:0;right:0;display:flex;flex-direction:column;align-items:center;';
                            var eim = document.createElement('img');
                            eim.src = eqSel.iconUrl;
                            eim.alt = eqSel.label || '';
                            eim.style.cssText =
                                'max-width:146px;max-height:146px;width:auto;height:auto;object-fit:contain;display:block;';
                            eib.appendChild(eim);
                            erp.appendChild(eib);
                        }
                        var elb = document.createElement('div');
                        elb.style.cssText =
                            'position:absolute;top:242px;left:0;right:0;font-size:16px;color:#ffffff;text-align:center;white-space:nowrap;overflow:hidden;padding:0 5px;';
                        elb.textContent = eqSel.label || '';
                        erp.appendChild(elb);
                        layer.appendChild(erp);
                    } else if (sim.themeViewId === 'settingsTheme') {
                        var themeUrl = cfg.themeCover
                            ? buildFileUrl(contentFolder, cfg.themeCover)
                            : '';
                        var tp = document.createElement('div');
                        tp.style.cssText =
                            'position:absolute;left:0;top:' +
                            statusH +
                            'px;width:' +
                            W +
                            'px;height:' +
                            (H - statusH) +
                            'px;display:flex;align-items:center;justify-content:center;z-index:10;';
                        if (themeUrl) {
                            var box = document.createElement('div');
                            box.style.cssText =
                                'width:' +
                                Math.floor(W * 0.7) +
                                'px;height:' +
                                Math.floor(H * 0.65) +
                                'px;display:flex;align-items:center;justify-content:center;border-radius:12px;overflow:hidden;box-shadow:0 8px 24px rgba(0,0,0,0.35);background:rgba(0,0,0,0.35);';
                            var tim = document.createElement('img');
                            tim.src = themeUrl;
                            tim.alt = 'Theme';
                            tim.style.cssText =
                                'width:100%;height:100%;object-fit:contain;background:rgba(255,255,255,0.04);';
                            box.appendChild(tim);
                            tp.appendChild(box);
                        } else {
                            var nt = document.createElement('div');
                            nt.style.cssText = 'color:' + colors.text_primary + ';opacity:0.8;font-size:18px;';
                            nt.textContent = 'No theme cover';
                            tp.appendChild(nt);
                        }
                        layer.appendChild(tp);
                    } else if (sim.themeViewId === 'settingsBrightness') {
                        var brLev = Number(sim && sim.brightnessLevel);
                        if (!isFinite(brLev)) brLev = 50;
                        brLev = Math.max(0, Math.min(100, brLev));
                        var bv = document.createElement('div');
                        bv.style.cssText =
                            'position:absolute;left:0;top:0;width:' +
                            W +
                            'px;height:' +
                            H +
                            'px;z-index:10;';
                        var t1 = document.createElement('div');
                        t1.style.cssText =
                            'position:absolute;top:' +
                            (statusH + 20) +
                            'px;left:0;right:0;text-align:center;font-size:18px;font-weight:bold;color:#ffffff;';
                        t1.textContent = 'Brightness';
                        bv.appendChild(t1);
                        var barO = document.createElement('div');
                        barO.style.cssText =
                            'position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:' +
                            (W - 100) +
                            'px;';
                        var bar = document.createElement('div');
                        bar.style.cssText =
                            'width:100%;height:8px;background:rgba(255,255,255,0.3);border-radius:4px;overflow:hidden;';
                        var barIn = document.createElement('div');
                        barIn.style.cssText =
                            'width:' +
                            brLev +
                            '%;height:100%;background:#ffffff;transition:width 0.2s;';
                        bar.appendChild(barIn);
                        barO.appendChild(bar);
                        bv.appendChild(barO);
                        var pctEl = document.createElement('div');
                        pctEl.style.cssText =
                            'position:absolute;bottom:50px;left:0;right:0;text-align:center;font-size:24px;font-weight:bold;color:#ffffff;';
                        pctEl.textContent = brLev + '%';
                        bv.appendChild(pctEl);
                        layer.appendChild(bv);
                    } else if (sim.themeViewId === 'settingsWallpaper') {
                        var wallpapers = [
                            {
                                id: 'default',
                                label: 'Default',
                                file: cfg.desktopWallpaper
                            },
                            { id: 'global', label: 'Global', file: cfg.globalWallpaper }
                        ];
                        var wList = document.createElement('div');
                        wList.style.cssText =
                            'position:absolute;left:9px;top:' +
                            statusH +
                            'px;width:260px;height:' +
                            (H - statusH) +
                            'px;overflow:hidden;z-index:10;';
                        var wh = 48;
                        for (var wi = 0; wi < wallpapers.length; wi++) {
                            var wsel = wi === sim.themeSelectedIndex;
                            var wr = document.createElement('div');
                            var wbg = wsel ? itemSelectedBackgroundStyle : itemBackgroundStyle;
                            applyCssProps(wr, wbg || { backgroundColor: 'rgba(0,0,0,0.1)' });
                            wr.style.cssText +=
                                'position:absolute;left:0;top:' +
                                wi * wh +
                                'px;width:100%;height:' +
                                wh +
                                'px;display:flex;align-items:center;padding:0 8px;box-sizing:border-box;font-size:22px;font-weight:bold;color:' +
                                (wsel ? colors.text_selected : colors.text_primary) +
                                ';';
                            wr.textContent = wallpapers[wi].label;
                            wList.appendChild(wr);
                        }
                        layer.appendChild(wList);
                        var wprev = wallpapers[sim.themeSelectedIndex] || wallpapers[0];
                        var wf = wprev && wprev.file ? buildFileUrl(contentFolder, wprev.file) : '';
                        if (wf) {
                            var prv = document.createElement('div');
                            prv.style.cssText =
                                'position:absolute;right:40px;top:' +
                                (statusH + 40) +
                                'px;width:160px;height:120px;z-index:10;border-radius:4px;overflow:hidden;';
                            var pm = document.createElement('img');
                            pm.src = wf;
                            pm.alt = '';
                            pm.style.cssText = 'width:100%;height:100%;object-fit:cover;';
                            prv.appendChild(pm);
                            layer.appendChild(prv);
                            var curl = document.createElement('div');
                            curl.style.cssText =
                                'position:absolute;right:40px;top:' +
                                (statusH + 170) +
                                'px;width:160px;text-align:center;color:#fff;font-size:14px;font-weight:bold;';
                            curl.textContent = 'Current';
                            layer.appendChild(curl);
                        }
                    } else if (sim.themeViewId === 'settingsDateTime') {
                        var dtItems = [
                            { id: 'date', label: 'Date', value: new Date().toLocaleDateString() },
                            { id: 'time', label: 'Time', value: new Date().toLocaleTimeString() },
                            { id: 'time_format', label: 'Time format', value: '24h' },
                            { id: 'time_in_title', label: 'Time in title', value: 'Off' }
                        ];
                        var dtMenu = document.createElement('div');
                        dtMenu.style.cssText =
                            'position:absolute;left:' +
                            SETTINGS_MENU_LEFT +
                            'px;top:' +
                            SETTINGS_MENU_TOP +
                            'px;width:' +
                            SETTINGS_MENU_WIDTH +
                            'px;height:' +
                            SETTINGS_MENU_HEIGHT +
                            'px;overflow:hidden;z-index:10;';
                        var dtc = {
                            text_primary: colors.text_primary,
                            text_selected: itemCfg.itemSelectedTextColor || '#3CFFDE'
                        };
                        appendSettingsMenuRows(dtMenu, {
                            items: dtItems.map(function (d) {
                                return { id: d.id, label: d.label, valueText: d.value };
                            }),
                            selectedIndex: sim.themeSelectedIndex,
                            visibleHeight: SETTINGS_MENU_HEIGHT,
                            colors: dtc,
                            itemBackgroundStyle: itemBackgroundStyle,
                            itemSelectedBackgroundStyle: itemSelectedBackgroundStyle,
                            itemRightArrowUrl: itemRightArrowUrl
                        });
                        layer.appendChild(dtMenu);
                    } else if (sim.themeViewId === 'settingsLanguage') {
                        var langItems = genericListForView('settingsLanguage');
                        var lbox = document.createElement('div');
                        lbox.style.cssText =
                            'position:absolute;left:0;top:' +
                            statusH +
                            'px;width:' +
                            W +
                            'px;height:' +
                            (H - statusH) +
                            'px;overflow:hidden;z-index:10;';
                        appendMenuRows(lbox, {
                            items: langItems,
                            selectedIndex: sim.themeSelectedIndex,
                            itemHeight: Math.floor((H - statusH - 12) / 7) || 40,
                            visibleHeight: H - statusH,
                            colors: colors,
                            itemBackgroundStyle: itemBackgroundStyle,
                            itemSelectedBackgroundStyle: itemSelectedBackgroundStyle,
                            itemRightArrowUrl: itemRightArrowUrl,
                            fullWidth: true,
                            leftPad: 0,
                            rowWidth: W,
                            folderIconUrl: ''
                        });
                        layer.appendChild(lbox);
                    } else if (sim.themeViewId === 'settingsAbout') {
                        var ab = document.createElement('div');
                        ab.style.cssText =
                            'position:absolute;right:22px;top:' +
                            (statusH + 50) +
                            'px;width:179px;display:flex;flex-direction:column;align-items:center;z-index:10;';
                        var sq2 = document.createElement('div');
                        sq2.style.cssText =
                            'width:140px;height:140px;background:rgba(255,255,255,0.1);border-radius:8px;display:flex;align-items:center;justify-content:center;margin-bottom:20px;border:2px solid rgba(255,255,255,0.3);';
                        var y12 = document.createElement('div');
                        y12.style.cssText = 'color:#ffffff;font-size:48px;font-weight:bold;';
                        y12.textContent = 'Y1';
                        sq2.appendChild(y12);
                        ab.appendChild(sq2);
                        var a1 = document.createElement('div');
                        a1.style.cssText = 'color:#ffffff;font-size:16px;text-align:center;margin-bottom:10px;';
                        a1.textContent = 'Version 3.0.2';
                        ab.appendChild(a1);
                        var a2 = document.createElement('div');
                        a2.style.cssText = 'color:#ffffff;font-size:14px;text-align:center;opacity:0.8;';
                        a2.textContent = 'Innioasis Y1';
                        ab.appendChild(a2);
                        layer.appendChild(ab);
                    } else if (sim.themeViewId === 'nowPlaying') {
                        var mock = MOCK_SONGS_PREVIEW[0] || {};
                        var pt = String((previewMeta && previewMeta.trackTitle) || '').trim();
                        var pa = String((previewMeta && previewMeta.trackArtist) || '').trim();
                        var pal = String((previewMeta && previewMeta.trackAlbum) || '').trim();
                        var npTitle = pt || mock.title || 'Theme';
                        var npArtist = pa || mock.artist || '';
                        var npAlbum = pal || mock.album || '';
                        var np = document.createElement('div');
                        np.style.cssText =
                            'position:absolute;left:0;top:' +
                            statusH +
                            'px;width:' +
                            W +
                            'px;height:' +
                            (H - statusH - 60) +
                            'px;display:flex;overflow:visible;z-index:10;';
                        var colL = document.createElement('div');
                        colL.style.cssText =
                            'position:relative;width:' +
                            W / 3 +
                            'px;height:100%;display:flex;flex-direction:column;padding-left:4px;padding-top:12px;';
                        var art = document.createElement('div');
                        art.style.cssText =
                            'position:relative;width:140%;aspect-ratio:1;transform:perspective(500px) rotateY(25deg) rotateX(2deg);transform-style:preserve-3d;';
                        var coverPath = cfg.themeCover || '';
                        var coverU = coverPath ? buildFileUrl(contentFolder, coverPath) : '';
                        if (coverU) {
                            var ai = document.createElement('img');
                            ai.src = coverU;
                            ai.alt = '';
                            ai.style.cssText =
                                'width:100%;height:100%;object-fit:contain;border-radius:2px;display:block;transform:skewY(-2deg);transform-origin:center;background:rgba(0,0,0,0.2);';
                            art.appendChild(ai);
                        }
                        colL.appendChild(art);
                        np.appendChild(colL);
                        var colR = document.createElement('div');
                        colR.style.cssText =
                            'position:relative;width:' +
                            ((W * 2) / 3) +
                            'px;height:100%;padding-left:80px;padding-right:20px;padding-top:30px;display:flex;flex-direction:column;gap:8px;';
                        var tti = document.createElement('div');
                        tti.style.cssText =
                            'color:#ffffff;font-weight:700;font-size:28px;line-height:1.2;overflow:hidden;text-overflow:ellipsis;';
                        tti.textContent = npTitle;
                        colR.appendChild(tti);
                        var sub = document.createElement('div');
                        sub.style.cssText = 'color:rgba(255,255,255,0.85);font-size:18px;';
                        var line2 = [npArtist, npAlbum].filter(Boolean).join(' \u00b7 ');
                        sub.textContent = line2 || '\u00a0';
                        colR.appendChild(sub);
                        np.appendChild(colR);
                        layer.appendChild(np);
                    }

                    if (sim.dialogVisible) {
                        var dlg = document.createElement('div');
                        dlg.style.cssText =
                            'position:absolute;left:0;top:0;width:' +
                            W +
                            'px;height:' +
                            H +
                            'px;background:rgba(0,0,0,0.45);z-index:40;display:flex;align-items:center;justify-content:center;';
                        var panel = document.createElement('div');
                        var dgbg = dialogCfg.dialogBackgroundColor || 'rgba(0,0,0,0.85)';
                        panel.style.cssText =
                            'width:75%;max-width:380px;background-color:' +
                            dgbg +
                            ';border-radius:14px;padding:18px;box-shadow:0 10px 32px rgba(0,0,0,0.45);border:1px solid rgba(255,255,255,0.08);display:flex;flex-direction:column;gap:12px;';
                        var dt = document.createElement('div');
                        dt.style.cssText = 'font-size:20px;font-weight:700;';
                        dt.textContent = sim.dialogTitle || '';
                        panel.appendChild(dt);
                        var dm = document.createElement('div');
                        dm.style.cssText = 'font-size:16px;line-height:1.4;';
                        dm.textContent = sim.dialogMessage || '';
                        panel.appendChild(dm);
                        var optsRow = document.createElement('div');
                        optsRow.style.cssText =
                            'display:flex;justify-content:space-evenly;gap:12px;flex-wrap:wrap;width:100%;';
                        for (var oi = 0; oi < (sim.dialogOptions || []).length; oi++) {
                            (function (idx) {
                                var opt = sim.dialogOptions[idx];
                                var sel = idx === sim.dialogSelectedIndex;
                                var obg = sel
                                    ? resolveBackgroundStyle(
                                          dialogCfg.dialogOptionSelectedBackground,
                                          buildFileUrl,
                                          contentFolder
                                      )
                                    : resolveBackgroundStyle(
                                          dialogCfg.dialogOptionBackground,
                                          buildFileUrl,
                                          contentFolder
                                      );
                                var btn = document.createElement('button');
                                btn.type = 'button';
                                btn.textContent = opt;
                                applyCssProps(
                                    btn,
                                    obg || {
                                        backgroundColor: sel
                                            ? 'rgba(255,255,255,0.16)'
                                            : 'rgba(255,255,255,0.08)'
                                    }
                                );
                                var otc = sel
                                    ? dialogCfg.dialogOptionSelectedTextColor || '#fff'
                                    : dialogCfg.dialogOptionTextColor || '#fff';
                                btn.style.color = otc;
                                btn.style.border = 'none';
                                btn.style.borderRadius = '8px';
                                btn.style.padding = '10px 16px';
                                btn.style.fontSize = '16px';
                                btn.style.fontWeight = '700';
                                btn.style.cursor = 'pointer';
                                optsRow.appendChild(btn);
                            })(oi);
                        }
                        panel.appendChild(optsRow);
                        dlg.appendChild(panel);
                        canvas.appendChild(dlg);
                    }

                    if (sim.toastVisible && sim.toastMessage) {
                        var toast = document.createElement('div');
                        toast.style.cssText =
                            'position:absolute;bottom:24px;left:50%;transform:translateX(-50%);z-index:50;background:rgba(0,0,0,0.82);color:#fff;padding:8px 14px;border-radius:8px;font-size:14px;font-weight:600;max-width:80%;text-align:center;';
                        toast.textContent = sim.toastMessage;
                        canvas.appendChild(toast);
                    }
                }

                paint();

                function showToast(msg) {
                    sim.toastMessage = msg;
                    sim.toastVisible = true;
                    paint();
                    global.clearTimeout(container._y1TpToastT);
                    container._y1TpToastT = global.setTimeout(function () {
                        sim.toastVisible = false;
                        paint();
                    }, 1600);
                }

                function goBack() {
                    if (sim.dialogVisible) {
                        sim.dialogVisible = false;
                        paint();
                        return;
                    }
                    if (sim.themeHistory.length > 0) {
                        var prev = sim.themeHistory[sim.themeHistory.length - 1];
                        sim.themeHistory.pop();
                        sim.themeViewId = prev;
                        if (
                            [
                                'home',
                                'music',
                                'videos',
                                'audiobooks',
                                'settings',
                                'settingsTheme',
                                'settingsEqualizer'
                            ].indexOf(prev) !== -1
                        ) {
                            sim.themeSelectedIndex = 0;
                        }
                        paint();
                    } else {
                        sim.themeViewId = 'home';
                        sim.themeSelectedIndex = 0;
                        paint();
                    }
                }

                function homeLen() {
                    return homeItems.length;
                }

                function handleScroll(direction) {
                    if (sim.dialogVisible && (sim.dialogOptions || []).length) {
                        var len = sim.dialogOptions.length;
                        var delta = direction === 'down' ? 1 : -1;
                        sim.dialogSelectedIndex =
                            (sim.dialogSelectedIndex + delta + len * 10) % len;
                        paint();
                        return;
                    }
                    var vid = sim.themeViewId;
                    if (vid === 'home') {
                        var hl = homeLen();
                        if (hl > 0) {
                            if (direction === 'down') {
                                sim.themeSelectedIndex = (sim.themeSelectedIndex + 1) % hl;
                            } else {
                                sim.themeSelectedIndex = (sim.themeSelectedIndex - 1 + hl) % hl;
                            }
                        }
                    } else if (vid === 'music' || vid === 'videos' || vid === 'audiobooks') {
                        var g1 = genericListForView(vid);
                        scrollClamp(direction, g1.length);
                    } else if (vid === 'music_folders') {
                        scrollClamp(direction, genericListForView('music_folders').length);
                    } else if (vid === 'videos_folders') {
                        scrollClamp(direction, genericListForView('videos_folders').length);
                    } else if (vid === 'settings') {
                        scrollClamp(
                            direction,
                            buildSettingsItems(cfg, buildFileUrl, contentFolder, sim).length
                        );
                    } else if (vid === 'settingsEqualizer') {
                        scrollClamp(
                            direction,
                            buildEqualizerItems(settingCfg, buildFileUrl, contentFolder).length
                        );
                    } else if (vid === 'settingsBrightness') {
                        if (direction === 'down') {
                            sim.brightnessLevel = Math.min(sim.brightnessLevel + 10, 100);
                        } else {
                            sim.brightnessLevel = Math.max(sim.brightnessLevel - 10, 0);
                        }
                    } else if (vid === 'settingsWallpaper') {
                        if (direction === 'down') {
                            sim.themeSelectedIndex = Math.min(sim.themeSelectedIndex + 1, 1);
                        } else {
                            sim.themeSelectedIndex = Math.max(sim.themeSelectedIndex - 1, 0);
                        }
                    } else if (vid === 'settingsDateTime') {
                        scrollClamp(direction, 4);
                    } else if (vid === 'settingsLanguage') {
                        scrollClamp(direction, genericListForView('settingsLanguage').length);
                    }
                    paint();
                }

                function scrollClamp(direction, len) {
                    len = len || 0;
                    if (len <= 0) return;
                    if (direction === 'down') {
                        sim.themeSelectedIndex = Math.min(sim.themeSelectedIndex + 1, len - 1);
                    } else {
                        sim.themeSelectedIndex = Math.max(sim.themeSelectedIndex - 1, 0);
                    }
                }

                function handleCenterClick() {
                    if (sim.dialogVisible) {
                        sim.dialogVisible = false;
                        paint();
                        return;
                    }
                    var vid = sim.themeViewId;
                    if (vid === 'home') {
                        var keys = [
                            'nowPlaying',
                            'music',
                            'video',
                            'audiobooks',
                            'photos',
                            'fm',
                            'bluetooth',
                            'settings'
                        ];
                        var homeCfg = cfg.homePageConfig || {};
                        var available = keys.filter(function (k) {
                            return homeCfg[k] !== undefined;
                        });
                        var selId = available[sim.themeSelectedIndex];
                        sim.themeHistory.push('home');
                        if (selId === 'music') {
                            sim.themeViewId = 'music';
                            sim.themeSelectedIndex = 0;
                        } else if (selId === 'video') {
                            sim.themeViewId = 'videos';
                            sim.themeSelectedIndex = 0;
                        } else if (selId === 'audiobooks') {
                            sim.themeViewId = 'audiobooks';
                            sim.themeSelectedIndex = 0;
                        } else if (selId === 'nowPlaying') {
                            sim.themeViewId = 'nowPlaying';
                            sim.themeSelectedIndex = 0;
                        } else if (selId === 'settings') {
                            sim.themeViewId = 'settings';
                            sim.themeSelectedIndex = 0;
                        } else {
                            showToast('Not implemented');
                            sim.themeHistory.pop();
                        }
                        paint();
                        return;
                    }
                    if (vid === 'music') {
                        var musicMenuItems = [
                            'All songs',
                            'Playlists',
                            'Artists',
                            'Albums',
                            'Genres',
                            'Folders',
                            'Search'
                        ];
                        var ms = musicMenuItems[sim.themeSelectedIndex];
                        if (ms === 'Folders') {
                            sim.themeHistory.push('music');
                            sim.themeViewId = 'music_folders';
                            sim.themeSelectedIndex = 0;
                        } else {
                            showToast('Not implemented');
                        }
                        paint();
                        return;
                    }
                    if (vid === 'videos') {
                        var vs = ['All video', 'Playlist', 'Folders', 'Search'][sim.themeSelectedIndex];
                        if (vs === 'Folders') {
                            sim.themeHistory.push('videos');
                            sim.themeViewId = 'videos_folders';
                            sim.themeSelectedIndex = 0;
                        } else {
                            showToast('Not implemented');
                        }
                        paint();
                        return;
                    }
                    if (vid === 'settings') {
                        var labels = [
                            'Shutdown',
                            'Timed shutdown',
                            'Shuffle',
                            'Repeat',
                            'Equalizer',
                            'File extensions',
                            'Key lock',
                            'Key tone',
                            'Key vibration',
                            'Wallpaper',
                            'Backlight',
                            'Brightness',
                            'Display battery',
                            'Date & Time',
                            'Theme',
                            'Language',
                            'Factory reset',
                            'Clear cache',
                            'About'
                        ];
                        var ch = labels[sim.themeSelectedIndex];
                        if (ch === 'Theme') {
                            sim.themeHistory.push('settings');
                            sim.themeViewId = 'settingsTheme';
                            sim.themeSelectedIndex = 0;
                        } else if (ch === 'Equalizer') {
                            sim.themeHistory.push('settings');
                            sim.themeViewId = 'settingsEqualizer';
                            sim.themeSelectedIndex = 0;
                        } else if (ch === 'Brightness') {
                            sim.themeHistory.push('settings');
                            sim.themeViewId = 'settingsBrightness';
                            sim.themeSelectedIndex = 0;
                        } else if (ch === 'Wallpaper') {
                            sim.themeHistory.push('settings');
                            sim.themeViewId = 'settingsWallpaper';
                            sim.themeSelectedIndex = 0;
                        } else if (ch === 'Date & Time') {
                            sim.themeHistory.push('settings');
                            sim.themeViewId = 'settingsDateTime';
                            sim.themeSelectedIndex = 0;
                        } else if (ch === 'Language') {
                            sim.themeHistory.push('settings');
                            sim.themeViewId = 'settingsLanguage';
                            sim.themeSelectedIndex = 0;
                        } else if (ch === 'About') {
                            sim.themeHistory.push('settings');
                            sim.themeViewId = 'settingsAbout';
                            sim.themeSelectedIndex = 0;
                        } else if (ch === 'Shutdown') {
                            sim.dialogVisible = true;
                            sim.dialogTitle = 'Shutdown';
                            sim.dialogMessage = 'Sure to shut down?';
                            sim.dialogOptions = ['Yes', 'No'];
                            sim.dialogSelectedIndex = 1;
                        } else if (ch === 'Timed shutdown') {
                            var tsv = ['off', '10', '20', '30', '60', '90', '120'];
                            var ti = tsv.indexOf(sim.timedShutdownValue);
                            sim.timedShutdownValue = tsv[(ti + 1) % tsv.length];
                        } else if (ch === 'Shuffle') {
                            sim.shuffleEnabled = !sim.shuffleEnabled;
                        } else if (ch === 'Repeat') {
                            sim.repeatMode =
                                sim.repeatMode === 'off' ? 'all' : sim.repeatMode === 'all' ? 'one' : 'off';
                        } else if (ch === 'File extensions') {
                            sim.fileExtensionsEnabled = !sim.fileExtensionsEnabled;
                        } else if (ch === 'Key lock') {
                            sim.keyLockEnabled = !sim.keyLockEnabled;
                        } else if (ch === 'Key tone') {
                            sim.keyToneEnabled = !sim.keyToneEnabled;
                        } else if (ch === 'Key vibration') {
                            sim.keyVibrationEnabled = !sim.keyVibrationEnabled;
                        } else if (ch === 'Display battery') {
                            sim.displayBatteryEnabled = !sim.displayBatteryEnabled;
                        } else if (ch === 'Backlight') {
                            var bv = ['10', '15', '30', '45', '60', '120', '300', 'always'];
                            var bi = bv.indexOf(sim.backlightValue);
                            sim.backlightValue = bv[(bi + 1) % bv.length];
                        } else if (ch === 'Factory reset') {
                            sim.dialogVisible = true;
                            sim.dialogTitle = 'Factory reset';
                            sim.dialogMessage = 'Sure to reset?';
                            sim.dialogOptions = ['Yes', 'No'];
                            sim.dialogSelectedIndex = 1;
                        } else if (ch === 'Clear cache') {
                            showToast('Clearing cache...');
                        } else {
                            showToast('Not implemented');
                        }
                        paint();
                        return;
                    }
                    showToast('Not implemented');
                    paint();
                }

                function onKeyDown(ev) {
                    if (!interactive) return;
                    var k = ev.key;
                    if (k === 'ArrowUp') {
                        ev.preventDefault();
                        handleScroll('up');
                    } else if (k === 'ArrowDown') {
                        ev.preventDefault();
                        handleScroll('down');
                    } else if (k === 'Enter') {
                        ev.preventDefault();
                        handleCenterClick();
                    } else if (k === 'Escape' || k === 'Backspace') {
                        ev.preventDefault();
                        goBack();
                    }
                }

                function onWheelClick(ev) {
                    var t = ev.target && ev.target.closest && ev.target.closest('[data-y1act]');
                    if (!t) return;
                    var act = t.getAttribute('data-y1act');
                    if (act === 'up') handleScroll('up');
                    else if (act === 'down') handleScroll('down');
                    else if (act === 'center') handleCenterClick();
                    else if (act === 'menu') goBack();
                    else if (act === 'play') {
                        sim.playState = sim.playState === 'playing' ? 'pause' : 'playing';
                        paint();
                    } else showToast('Not implemented');
                }

                if (interactive) {
                    dev.tabIndex = 0;
                    dev.addEventListener('keydown', onKeyDown);
                    wheel.addEventListener('click', onWheelClick);
                }

                container._y1TpCleanup = function () {
                    if (ro) ro.disconnect();
                    if (interactive) {
                        dev.removeEventListener('keydown', onKeyDown);
                        if (wheel) wheel.removeEventListener('click', onWheelClick);
                    }
                    var st = document.getElementById(fontStyleId);
                    if (st) st.remove();
                    global.clearTimeout(container._y1TpToastT);
                    container._y1TpCleanup = null;
                };

                if (typeof opts.onReady === 'function') {
                    try {
                        opts.onReady();
                    } catch (e) {}
                }
            })
            .catch(function (err) {
                if (typeof opts.onError === 'function') {
                    try {
                        opts.onError(err);
                    } catch (e) {}
                }
                throw err;
            });
    }

    function unmount(container) {
        if (!container) return;
        if (typeof container._y1TpCleanup === 'function') {
            try {
                container._y1TpCleanup();
            } catch (e) {}
        }
        container.innerHTML = '';
        container.classList.remove('y1-tp-mounted');
    }

    var _galleryMountActive = 0;
    var _galleryMountMax = 3;
    var _galleryMountQueue = [];

    function drainGalleryMountQueue() {
        while (_galleryMountActive < _galleryMountMax && _galleryMountQueue.length) {
            var job = _galleryMountQueue.shift();
            runGalleryMountJob(job.container, job.opts);
        }
    }

    function runGalleryMountJob(container, opts) {
        _galleryMountActive++;
        void mount(container, opts || {})
            .catch(function () {})
            .finally(function () {
                _galleryMountActive--;
                drainGalleryMountQueue();
            });
    }

    function mountGalleryCardLazy(container, options) {
        if (!container) return;
        if (typeof IntersectionObserver === 'undefined') {
            runGalleryMountJob(container, options || {});
            return;
        }
        var opts = options || {};
        var io = new IntersectionObserver(
            function (entries) {
                for (var i = 0; i < entries.length; i++) {
                    var ent = entries[i];
                    if (!ent.isIntersecting) continue;
                    io.unobserve(ent.target);
                    if (_galleryMountActive < _galleryMountMax) {
                        runGalleryMountJob(ent.target, opts);
                    } else {
                        _galleryMountQueue.push({ container: ent.target, opts: opts });
                    }
                }
            },
            { rootMargin: '140px', threshold: 0.04 }
        );
        io.observe(container);
    }

    global.Y1ThemePreview = {
        mount: mount,
        unmount: unmount,
        effectiveContentPrefix: effectiveContentPrefix,
        mountGalleryCardLazy: mountGalleryCardLazy
    };
})(typeof window !== 'undefined' ? window : this);
