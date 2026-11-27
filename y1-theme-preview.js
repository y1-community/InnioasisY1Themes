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

    /** HomeView.tsx: right preview tile (iv_now), fitCenter / adjustViewBounds */
    var HOME_PREVIEW_WIDTH = 179;
    var HOME_PREVIEW_RIGHT_MARGIN = 23;
    var HOME_PREVIEW_TOP_MARGIN = 86;

    var SETTINGS_MENU_LEFT = 9;
    var SETTINGS_MENU_TOP = 45;
    var SETTINGS_MENU_WIDTH = 218;
    var SETTINGS_MENU_HEIGHT = 305;
    /* item_setting.xml uses @dimen/main_item_height (45dp), not the 40px the
       old Theme Maker preview assumed. */
    var SETTINGS_ROW_HEIGHT = 45;

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

    var PREVIEW_MENU = {
        de: { "Now Playing": "Wiedergabe", "Music": "Musik", "Videos": "Videos", "Audiobook": "Hörbuch", "FM Radio": "UKW-Radio", "E-Book": "E-Book", "Photos": "Fotos", "File manager": "Dateimanager", "Settings": "Einstellungen", "Bluetooth": "Bluetooth", "Calculator": "Rechner", "Calendar": "Kalender", "Home": "Start", "Folders": "Ordner" },
        es: { "Now Playing": "Reproduciendo", "Music": "Música", "Videos": "Vídeos", "Audiobook": "Audiolibro", "FM Radio": "Radio FM", "E-Book": "E-Book", "Photos": "Fotos", "File manager": "Archivos", "Settings": "Ajustes", "Bluetooth": "Bluetooth", "Calculator": "Calculadora", "Calendar": "Calendario", "Home": "Inicio", "Folders": "Carpetas" },
        fr: { "Now Playing": "Lecture", "Music": "Musique", "Videos": "Vidéos", "Audiobook": "Livre audio", "FM Radio": "Radio FM", "E-Book": "E-Book", "Photos": "Photos", "File manager": "Fichiers", "Settings": "Réglages", "Bluetooth": "Bluetooth", "Calculator": "Calculatrice", "Calendar": "Calendrier", "Home": "Accueil", "Folders": "Dossiers" },
        it: { "Now Playing": "In riproduzione", "Music": "Musica", "Videos": "Video", "Audiobook": "Audiolibro", "FM Radio": "Radio FM", "E-Book": "E-Book", "Photos": "Foto", "File manager": "File", "Settings": "Impostazioni", "Bluetooth": "Bluetooth", "Calculator": "Calcolatrice", "Calendar": "Calendario", "Home": "Home", "Folders": "Cartelle" },
        pt: { "Now Playing": "A reproduzir", "Music": "Música", "Videos": "Vídeos", "Audiobook": "Audiolivro", "FM Radio": "Rádio FM", "E-Book": "E-Book", "Photos": "Fotos", "File manager": "Ficheiros", "Settings": "Definições", "Bluetooth": "Bluetooth", "Calculator": "Calculadora", "Calendar": "Calendário", "Home": "Início", "Folders": "Pastas" },
        nl: { "Now Playing": "Wordt afgespeeld", "Music": "Muziek", "Videos": "Video's", "Audiobook": "Luisterboek", "FM Radio": "FM-radio", "E-Book": "E-book", "Photos": "Foto's", "File manager": "Bestanden", "Settings": "Instellingen", "Bluetooth": "Bluetooth", "Calculator": "Rekenmachine", "Calendar": "Agenda", "Home": "Start", "Folders": "Mappen" },
        pl: { "Now Playing": "Teraz odtwarzane", "Music": "Muzyka", "Videos": "Wideo", "Audiobook": "Audiobook", "FM Radio": "Radio FM", "E-Book": "E-book", "Photos": "Zdjęcia", "File manager": "Pliki", "Settings": "Ustawienia", "Bluetooth": "Bluetooth", "Calculator": "Kalkulator", "Calendar": "Kalendarz", "Home": "Start", "Folders": "Foldery" },
        ru: { "Now Playing": "Сейчас играет", "Music": "Музыка", "Videos": "Видео", "Audiobook": "Аудиокнига", "FM Radio": "FM-радио", "E-Book": "Эл. книга", "Photos": "Фото", "File manager": "Файлы", "Settings": "Настройки", "Bluetooth": "Bluetooth", "Calculator": "Калькулятор", "Calendar": "Календарь", "Home": "Главная", "Folders": "Папки" },
        ja: { "Now Playing": "再生中", "Music": "ミュージック", "Videos": "ビデオ", "Audiobook": "オーディオブック", "FM Radio": "FMラジオ", "E-Book": "電子書籍", "Photos": "写真", "File manager": "ファイル", "Settings": "設定", "Bluetooth": "Bluetooth", "Calculator": "電卓", "Calendar": "カレンダー", "Home": "ホーム", "Folders": "フォルダ" },
        ko: { "Now Playing": "재생 중", "Music": "음악", "Videos": "동영상", "Audiobook": "오디오북", "FM Radio": "FM 라디오", "E-Book": "전자책", "Photos": "사진", "File manager": "파일", "Settings": "설정", "Bluetooth": "Bluetooth", "Calculator": "계산기", "Calendar": "캘린더", "Home": "홈", "Folders": "폴더" },
        "zh-cn": { "Now Playing": "正在播放", "Music": "音乐", "Videos": "视频", "Audiobook": "有声书", "FM Radio": "FM 收音机", "E-Book": "电子书", "Photos": "照片", "File manager": "文件", "Settings": "设置", "Bluetooth": "蓝牙", "Calculator": "计算器", "Calendar": "日历", "Home": "主页", "Folders": "文件夹" },
        "zh-tw": { "Now Playing": "正在播放", "Music": "音樂", "Videos": "影片", "Audiobook": "有聲書", "FM Radio": "FM 收音機", "E-Book": "電子書", "Photos": "相片", "File manager": "檔案", "Settings": "設定", "Bluetooth": "藍牙", "Calculator": "計算機", "Calendar": "日曆", "Home": "主頁", "Folders": "資料夾" }
    };

    function previewLocale() {
        try {
            // The studio edits the theme's own labels, so it pins the device UI
            // to English: a translated menu would misreport what the author wrote.
            if (global.STUDIO_PREVIEW_LOCALE) return String(global.STUDIO_PREVIEW_LOCALE).toLowerCase();
            if (global.InnioasisLocale && global.InnioasisLocale.locale) return String(global.InnioasisLocale.locale).toLowerCase();
            var node = document.documentElement;
            var fromDoc = node && (node.getAttribute("data-locale") || node.lang);
            if (fromDoc) return String(fromDoc).toLowerCase();
        } catch (e) {}
        return "en";
    }

    function previewText(english) {
        var loc = previewLocale();
        var table = PREVIEW_MENU[loc] || PREVIEW_MENU[loc.split("-")[0]];
        if (loc.indexOf("zh") === 0 && !PREVIEW_MENU[loc]) {
            table = /tw|hk|hant/.test(loc) ? PREVIEW_MENU["zh-tw"] : PREVIEW_MENU["zh-cn"];
        }
        return (table && table[english]) || english;
    }

    var VIEW_TITLES = {
        home: 'Home',
        music: 'Music',
        music_folders: 'Folders',
        musicSettings: 'Music Settings',
        videos: 'Videos',
        videos_folders: 'Folders',
        audiobooks: 'Audiobooks',
        settings: 'Settings',
        settingsCat_keysWheel: 'Keys & Wheel',
        settingsCat_audio: 'Audio',
        settingsCat_display: 'Display',
        settingsCat_personalization: 'Personalization',
        settingsCat_filesStorage: 'Files & Storage',
        settingsCat_system: 'System',
        settingsEqualizer: 'Equalizer',
        settingsTheme: 'Theme',
        settingsBrightness: 'Brightness',
        settingsWallpaper: 'Wallpaper',
        settingsDateTime: 'Date & Time',
        settingsLanguage: 'Language',
        settingsAbout: 'About',
        nowPlaying: 'Now Playing',
        photos: 'Photos',
        photosViewer: 'Photos',
        fm: 'FM Radio',
        ebook: 'E-Book',
        ebookReader: 'E-Book',
        bluetooth: 'Bluetooth',
        fileManager: 'File Manager',
        calendar: 'Calendar',
        calculator: 'Calculator'
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
        /* values-480x360/dimens.xml: status_bar_height = 45dp. */
        return 45;
    }

    /** Resolve homePageConfig icon keys (supports ``Calendar`` / ``calendar``). */
    function homePageIconFromCfg(homeCfg, key) {
        homeCfg = homeCfg || {};
        if (homeCfg[key] !== undefined && homeCfg[key] !== null) {
            return typeof homeCfg[key] === 'string' ? homeCfg[key] : undefined;
        }
        if (key === 'calendar') {
            if (homeCfg.Calendar !== undefined && homeCfg.Calendar !== null) {
                return typeof homeCfg.Calendar === 'string' ? homeCfg.Calendar : undefined;
            }
        }
        if (key === 'ebook') {
            if (homeCfg.ebook !== undefined && homeCfg.ebook !== null) {
                return typeof homeCfg.ebook === 'string' ? homeCfg.ebook : undefined;
            }
            if (homeCfg.eBook !== undefined && homeCfg.eBook !== null) {
                return typeof homeCfg.eBook === 'string' ? homeCfg.eBook : undefined;
            }
        }
        return undefined;
    }

    function isUsableHomeIcon(value) {
        var file = String(value || '').trim();
        return !!file && !/(^|\/)transparent\.png$/i.test(file);
    }

    function normalizeDeviceMode(raw, homeCfg, mode) {
        var dm = String(raw || '').trim().toLowerCase();
        if (dm === 'y1' || dm === 'y2' || dm === 'both') return dm;
        if (mode === 'full') return 'both';
        return isUsableHomeIcon(homePageIconFromCfg(homeCfg || {}, 'fileManager')) ? 'y2' : 'y1';
    }

    function isY2DefaultTheme(cfg, catalogFolder) {
        var folder = String(catalogFolder || '').trim().toLowerCase();
        if (folder === 'y2_default') return true;
        var title = String((cfg && cfg.theme_info && cfg.theme_info.title) || '').trim().toLowerCase();
        var statusText = String((cfg && cfg.statusConfig && cfg.statusConfig.statusTextColor) || '').trim().toLowerCase();
        if (title === 'y2 default' && statusText && statusText !== '#ffffff' && statusText !== '#fff') {
            return true;
        }
        return false;
    }

    function buildHomeItems(homeCfg, settingCfg, opts) {
        homeCfg = homeCfg || {};
        settingCfg = settingCfg || {};
        opts = opts || {};
        var mode = String(opts.mode || 'menu').toLowerCase();
        var deviceMode = normalizeDeviceMode(opts.deviceMode, homeCfg, mode);
        /* Shuffle Quick was on Home in Y1 1.7.6–2.1.9 and removed in Y1 2.8.2;
           Calculator and Calendar exist in MainActivity behind an unshipped
           flag (isV4 && !isRockBox). Studio lets authors toggle each group
           independently. */
        var showLegacy = opts.showLegacyHome !== undefined ? opts.showLegacyHome === true : false;
        var showUnimplemented = opts.showUnimplementedHome === true;
        var labelMap = {
            nowPlaying: 'Now Playing',
            music: 'Music',
            video: 'Videos',
            audiobooks: 'Audiobook',
            ebook: 'E-Book',
            calculator: 'Calculator',
            calendar: 'Calendar',
            photos: 'Photos',
            fm: 'FM Radio',
            bluetooth: 'Bluetooth',
            fileManager: 'File Manager',
            settings: 'Settings',
            shuffleQuick: 'Shuffle Quick'
        };
        /* Exact firmware MainActivity.initView() order verified from Y1 1.7.6–3.1.2
           and Y2 3.1.7–3.2.8 APKs:
           - Y1: Now Playing, Music, Videos, Audiobook, E-Book, [Calc, Cal], Photos, FM Radio, Bluetooth, Settings, [Shuffle Quick]
           - Y2: Now Playing, Music, Videos, Audiobook, E-Book, [Calc, Cal], Photos, FM Radio, File Manager, Settings, [Shuffle Quick]
           - Both: Y2 layout + Bluetooth home item so authors can preview & edit both devices at once. */
        var ordered = [
            'nowPlaying',
            'music',
            'video',
            'audiobooks',
            'ebook',
            'calculator',
            'calendar',
            'photos',
            'fm',
            'bluetooth',
            'fileManager',
            'settings',
            'shuffleQuick'
        ];
        var items = ordered
            .filter(function (key) {
                if (key === 'shuffleQuick') return showLegacy;
                if (key === 'calculator' || key === 'calendar') return showUnimplemented;
                if (key === 'fileManager') return deviceMode === 'y2' || deviceMode === 'both';
                if (key === 'bluetooth') {
                    if (deviceMode === 'y2') return false;
                    return mode === 'full' ? true : isUsableHomeIcon(homePageIconFromCfg(homeCfg, key));
                }
                var file = homePageIconFromCfg(homeCfg, key);
                if (key === 'fm') {
                    if (mode === 'full') return true;
                    return isUsableHomeIcon(file);
                }
                if (key === 'ebook') {
                    if (mode === 'full') return true;
                    return file !== undefined && isUsableHomeIcon(file);
                }
                return mode === 'full' ? true : file !== undefined;
            })
            .map(function (key) {
                var file = homePageIconFromCfg(homeCfg, key);
                return {
                    id: key,
                    label: previewText(labelMap[key] || key),
                    iconFile: typeof file === 'string' ? file : undefined,
                    assetPath: 'homePageConfig.' + key
                };
            });
        return items;
    }

    function buildColors(itemCfg, menuCfg, statusCfg, cfg, catalogFolder) {
        itemCfg = itemCfg || {};
        menuCfg = menuCfg || {};
        statusCfg = statusCfg || {};
        var text_primary = itemCfg.itemTextColor || menuCfg.menuItemTextColor || '#00ff2a';
        var text_selected = itemCfg.itemSelectedTextColor || menuCfg.menuItemSelectedTextColor || text_primary;
        return {
            text_primary: text_primary,
            text_selected: text_selected,
            /* MainActivity paints the home list with ItemConfig. The launcher's
               submenu adapters (music/video/ebook option lists) use MenuConfig,
               so those screens get their own pair rather than silently reusing
               the item colours. */
            menu_text_primary: menuCfg.menuItemTextColor || text_primary,
            menu_text_selected: menuCfg.menuItemSelectedTextColor || text_selected,
            status_bar_bg: statusCfg.statusBarColor || '#0000004e',
            status_text: statusTextColor(statusCfg, itemCfg, cfg, catalogFolder)
        };
    }

    /* The launcher's status bar has two looks, not a colour per theme: white
       glyphs for a dark strip, dark glyphs for a light one (StatusBarFloatView
       swaps its drawables and text colour together). Themes here can say which
       they want, and when they do not the bar colour decides. */
    function cssColorChannels(value) {
        var text = String(value || '').trim();
        var hex = /^#([0-9a-f]{3,8})$/i.exec(text);
        if (hex) {
            var digits = hex[1];
            if (digits.length === 3 || digits.length === 4) {
                digits = digits
                    .split('')
                    .map(function (ch) {
                        return ch + ch;
                    })
                    .join('');
            }
            if (digits.length === 6 || digits.length === 8) {
                return {
                    r: parseInt(digits.slice(0, 2), 16),
                    g: parseInt(digits.slice(2, 4), 16),
                    b: parseInt(digits.slice(4, 6), 16),
                    a: digits.length === 8 ? parseInt(digits.slice(6, 8), 16) / 255 : 1
                };
            }
        }
        var rgba = /^rgba?\(([^)]+)\)$/i.exec(text);
        if (rgba) {
            var parts = rgba[1].split(',').map(function (part) {
                return parseFloat(part);
            });
            if (parts.length >= 3) {
                return { r: parts[0] | 0, g: parts[1] | 0, b: parts[2] | 0, a: parts.length > 3 ? parts[3] : 1 };
            }
        }
        return null;
    }

    function statusTextColor(statusCfg, itemCfg, cfg, catalogFolder) {
        /* On stock Y1 & Y2 hardware, StatusBarFloatView forces white text/icons
           for every custom theme; only the built-in factory Y2_Default light
           theme renders dark ink (#2D2D44 / #000000) in its status bar. */
        if (isY2DefaultTheme(cfg, catalogFolder)) {
            var declared = statusCfg && typeof statusCfg.statusTextColor === 'string' ? statusCfg.statusTextColor.trim() : '';
            if (declared) return declared;
            return '#2d2d44';
        }
        return '#ffffff';
    }

    /* Authentic Android .9.png Nine-Patch decoder (mirrors LL0/f.a in Y2 3.2.8):
       reads 1px black stretch guides on top & left edges, strips the 1px guide
       border, and produces CSS border-image slices + cropped canvas so rounded
       corners and bevels never distort at any row width. */
    var ninePatchCache = Object.create(null);

    function parseNinePatchImage(img) {
        if (!img || !img.naturalWidth || !img.naturalHeight) return null;
        var w = img.naturalWidth | 0;
        var h = img.naturalHeight | 0;
        if (w < 4 || h < 4) return null;
        try {
            var probe = document.createElement('canvas');
            probe.width = w;
            probe.height = h;
            var pctx = probe.getContext('2d', { willReadFrequently: true });
            if (!pctx) return null;
            pctx.clearRect(0, 0, w, h);
            pctx.drawImage(img, 0, 0, w, h);
            var data = pctx.getImageData(0, 0, w, h).data;
            function isBlack(px, py) {
                var off = (py * w + px) * 4;
                return data[off + 3] > 128 && data[off] < 48 && data[off + 1] < 48 && data[off + 2] < 48;
            }
            var sx0 = -1;
            var sx1 = -1;
            for (var x = 1; x < w - 1; x++) {
                if (isBlack(x, 0)) {
                    if (sx0 === -1) sx0 = x - 1;
                    sx1 = x;
                }
            }
            var sy0 = -1;
            var sy1 = -1;
            for (var y = 1; y < h - 1; y++) {
                if (isBlack(0, y)) {
                    if (sy0 === -1) sy0 = y - 1;
                    sy1 = y;
                }
            }
            var iw = w - 2;
            var ih = h - 2;
            if (sx0 === -1 || sy0 === -1) return null;
            var cropped = document.createElement('canvas');
            cropped.width = iw;
            cropped.height = ih;
            var cctx = cropped.getContext('2d');
            if (!cctx) return null;
            cctx.drawImage(img, 1, 1, iw, ih, 0, 0, iw, ih);
            var sliceLeft = Math.max(1, Math.min(iw - 1, sx0));
            var sliceRight = Math.max(1, Math.min(iw - sliceLeft, iw - sx1));
            var sliceTop = Math.max(1, Math.min(ih - 1, sy0));
            var sliceBottom = Math.max(1, Math.min(ih - sliceTop, ih - sy1));
            return {
                valid: true,
                dataUrl: cropped.toDataURL('image/png'),
                canvas: cropped,
                iw: iw,
                ih: ih,
                sliceLeft: sliceLeft,
                sliceRight: sliceRight,
                sliceTop: sliceTop,
                sliceBottom: sliceBottom
            };
        } catch (e) {
            return null;
        }
    }

    function ninePatchCssStyle(np) {
        if (!np || !np.valid || !np.dataUrl) return null;
        return {
            backgroundColor: 'transparent',
            backgroundImage: 'none',
            borderStyle: 'solid',
            borderColor: 'transparent',
            borderImageSource: 'url("' + np.dataUrl + '")',
            borderImageSlice:
                np.sliceTop + ' ' + np.sliceRight + ' ' + np.sliceBottom + ' ' + np.sliceLeft + ' fill',
            borderImageWidth:
                np.sliceTop + 'px ' + np.sliceRight + 'px ' + np.sliceBottom + 'px ' + np.sliceLeft + 'px',
            borderImageRepeat: 'stretch'
        };
    }

    function drawNinePatchOnCanvas(ctx, np, dx, dy, dw, dh) {
        if (!ctx || !np || !np.valid || !np.canvas) return false;
        var src = np.canvas;
        var sl = Math.min(np.sliceLeft, Math.floor(dw / 2));
        var sr = Math.min(np.sliceRight, Math.floor(dw / 2));
        var st = Math.min(np.sliceTop, Math.floor(dh / 2));
        var sb = Math.min(np.sliceBottom, Math.floor(dh / 2));
        var smw = Math.max(1, np.iw - np.sliceLeft - np.sliceRight);
        var smh = Math.max(1, np.ih - np.sliceTop - np.sliceBottom);
        var dmw = Math.max(0, dw - sl - sr);
        var dmh = Math.max(0, dh - st - sb);
        /* 4 corners */
        if (sl > 0 && st > 0) ctx.drawImage(src, 0, 0, np.sliceLeft, np.sliceTop, dx, dy, sl, st);
        if (sr > 0 && st > 0) ctx.drawImage(src, np.iw - np.sliceRight, 0, np.sliceRight, np.sliceTop, dx + dw - sr, dy, sr, st);
        if (sl > 0 && sb > 0) ctx.drawImage(src, 0, np.ih - np.sliceBottom, np.sliceLeft, np.sliceBottom, dx, dy + dh - sb, sl, sb);
        if (sr > 0 && sb > 0) ctx.drawImage(src, np.iw - np.sliceRight, np.ih - np.sliceBottom, np.sliceRight, np.sliceBottom, dx + dw - sr, dy + dh - sb, sr, sb);
        /* 4 edges */
        if (dmw > 0 && st > 0) ctx.drawImage(src, np.sliceLeft, 0, smw, np.sliceTop, dx + sl, dy, dmw, st);
        if (dmw > 0 && sb > 0) ctx.drawImage(src, np.sliceLeft, np.ih - np.sliceBottom, smw, np.sliceBottom, dx + sl, dy + dh - sb, dmw, sb);
        if (sl > 0 && dmh > 0) ctx.drawImage(src, 0, np.sliceTop, np.sliceLeft, smh, dx, dy + st, sl, dmh);
        if (sr > 0 && dmh > 0) ctx.drawImage(src, np.iw - np.sliceRight, np.sliceTop, np.sliceRight, smh, dx + dw - sr, dy + st, sr, dmh);
        /* center */
        if (dmw > 0 && dmh > 0) ctx.drawImage(src, np.sliceLeft, np.sliceTop, smw, smh, dx + sl, dy + st, dmw, dmh);
        return true;
    }

    function requestNinePatch(url, onReady) {
        if (!url) return null;
        if (Object.prototype.hasOwnProperty.call(ninePatchCache, url)) {
            return ninePatchCache[url];
        }
        ninePatchCache[url] = { pending: true, valid: false };
        var img = new Image();
        if (!/^(blob:|data:)/i.test(String(url))) {
            try {
                img.crossOrigin = 'anonymous';
            } catch (e) {}
        }
        img.onload = function () {
            var parsed = parseNinePatchImage(img);
            ninePatchCache[url] = parsed || { valid: false };
            if (parsed && typeof onReady === 'function') onReady(parsed);
        };
        img.onerror = function () {
            ninePatchCache[url] = { valid: false };
        };
        img.src = url;
        return null;
    }

    function isNinePatchCandidate(itemCfg, rawPath) {
        if (!rawPath || isHexColor8or6(rawPath)) return false;
        return !!(itemCfg && itemCfg.itemSelectedBackgroundIs9Patch) || /\.9\.png(\?|#|$)/i.test(String(rawPath));
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
        var itemBg = resolveBackgroundStyle(itemCfg.itemBackground, buildFileUrl, contentFolder);
        // menuItemBackground hex values are accent/menu chrome on device, not list-row fills.
        if (!itemBg && menuCfg.menuItemBackground && !isHexColor8or6(menuCfg.menuItemBackground)) {
            itemBg = resolveBackgroundStyle(menuCfg.menuItemBackground, buildFileUrl, contentFolder);
        }
        var sel =
            resolveBackgroundStyle(itemCfg.itemSelectedBackground, buildFileUrl, contentFolder) ||
            resolveBackgroundStyle(menuCfg.menuItemSelectedBackground, buildFileUrl, contentFolder);
        if (!sel) {
            sel = { backgroundColor: 'rgba(255,255,255,0.12)' };
        }
        return { itemBackgroundStyle: itemBg, itemSelectedBackgroundStyle: sel };
    }

    /* Most themes ship no .preview.* derivatives. Guessing the URL made every
       card request a file that does not exist, wait for the 404 and only then
       paint the original, which is why previews crawled in. preview-assets.json
       lists the derivatives that do exist; until it arrives the original
       artwork is used, which is always correct and never a wasted request. */
    var previewAssetIndex = null;
    var previewAssetBase = (function () {
        var script = typeof document !== 'undefined' ? document.currentScript : null;
        if (!script || !script.src) return './';
        return script.src.replace(/[^/]*$/, '');
    })();

    function previewAssetKey(url) {
        var key = String(url || '')
            .split('?')[0]
            .split('#')[0]
            .replace(/^[a-z]+:\/\/[^/]+\//i, '')
            .replace(/^\.?\//, '');
        /* buildFileUrl percent-encodes each segment; the index stores the
           literal path, so "Theme/My Art/bg.png" only matches once decoded. */
        try {
            key = decodeURIComponent(key);
        } catch (e) {}
        return key.toLowerCase();
    }

    (function loadPreviewAssetIndex() {
        if (typeof fetch !== 'function') {
            previewAssetIndex = {};
            return;
        }
        fetch(previewAssetBase + 'preview-assets.json', { cache: 'default' })
            .then(function (response) { return response.ok ? response.json() : null; })
            .then(function (list) {
                var index = {};
                if (Array.isArray(list)) {
                    for (var i = 0; i < list.length; i += 1) index[previewAssetKey(list[i])] = 1;
                }
                previewAssetIndex = index;
            })
            .catch(function () { previewAssetIndex = {}; });
    })();

    function previewAssetUrl(originalUrl, ext) {
        if (!originalUrl || typeof originalUrl !== 'string') return '';
        if (originalUrl.indexOf('.preview.') !== -1) return originalUrl;
        var dot = originalUrl.lastIndexOf('.');
        if (dot === -1) return originalUrl;
        var candidate = originalUrl.slice(0, dot) + '.preview.' + ext;
        if (!previewAssetIndex) return originalUrl;
        return previewAssetIndex[previewAssetKey(candidate)] ? candidate : originalUrl;
    }

    function backgroundUrlForView(cfg, viewId, buildFileUrl, contentFolder, preferPreview) {
        var raw = '';
        if (viewId === 'home') {
            raw = cfg.desktopWallpaper || pickWallpaper(cfg) || cfg.globalWallpaper || '';
        } else {
            raw = cfg.globalWallpaper || cfg.desktopWallpaper || pickWallpaper(cfg) || '';
        }
        if (!raw) return '';
        var full = buildFileUrl(contentFolder, raw);
        if (preferPreview && full) {
            return previewAssetUrl(full, 'jpg');
        }
        return full;
    }

    /* The wallpaper and the mask are painted under the menu layer, so nothing
       under the cursor can name them. These two helpers answer "which config
       slot draws this screen's background" for the Studios: the wallpaper the
       view actually uses, then the mask that punches the menu out of it. */
    function wallpaperAssetPathForView(cfg, viewId) {
        if (!cfg || typeof cfg !== 'object') return '';
        var order =
            viewId === 'home'
                ? ['desktopWallpaper', 'globalWallpaper', 'themeWallpaper', 'themeCover']
                : ['globalWallpaper', 'desktopWallpaper', 'themeWallpaper', 'themeCover'];
        for (var i = 0; i < order.length; i += 1) {
            if (cfg[order[i]]) return order[i];
        }
        return '';
    }

    function maskAssetPathForView(viewId) {
        if (viewId === 'home') return 'desktopMask';
        if (viewId === 'settings' || String(viewId || '').indexOf('settings') === 0) {
            return 'settingConfig.settingMask';
        }
        return '';
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

    /** Hide broken / empty preview bitmaps so layout keeps a blank slot (no broken-image icon). */
    function bindPreviewImgFallback(img, opts) {
        if (!img || typeof img.addEventListener !== 'function') return;
        var eager = !!(opts && opts.eager);
        img.decoding = eager ? 'sync' : 'async';
        try {
            img.loading = eager ? 'eager' : 'lazy';
        } catch (e) {}
        img.addEventListener(
            'error',
            function () {
                try {
                    img.removeAttribute('src');
                } catch (e2) {}
                img.alt = '';
                img.style.opacity = '0';
                img.style.visibility = 'hidden';
            },
            { once: true }
        );
        img.addEventListener(
            'load',
            function () {
                try {
                    if (img.naturalWidth <= 1 && img.naturalHeight <= 1) {
                        img.style.opacity = '0';
                        img.style.visibility = 'hidden';
                    }
                } catch (e3) {}
            },
            { once: true }
        );
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

    function resetRowBackground(el) {
        if (!el) return;
        el.style.backgroundColor = '';
        el.style.backgroundImage = '';
        el.style.backgroundSize = '';
        el.style.backgroundRepeat = '';
        el.style.backgroundPosition = '';
        el.style.borderStyle = '';
        el.style.borderColor = '';
        el.style.borderImageSource = '';
        el.style.borderImageSlice = '';
        el.style.borderImageWidth = '';
        el.style.borderImageRepeat = '';
    }

    function applyMenuRowSelection(row, item, selected, ctx) {
        if (!row) return;
        row.classList.toggle('is-selected', !!selected);
        resetRowBackground(row);
        var bg = selected ? ctx.itemSel : ctx.itemBg || { backgroundColor: 'transparent' };
        applyCssProps(row, bg);

        if (ctx.isSettings) {
            var selText = ctx.colors.text_selected;
            var textCol = selected ? selText : ctx.colors.text_primary;
            if (row._y1Title) row._y1Title.style.color = textCol;
            if (row._y1Value) row._y1Value.style.color = textCol;
            if (row._y1Arrow) {
                row._y1Arrow.style.display = selected && !item.valueText ? 'flex' : 'none';
            } else if (selected && !item.valueText) {
                var sar = document.createElement('div');
                /* item_setting.xml: a 30dp arrow with 5dp trailing margin. */
                sar.style.cssText =
                    'position:absolute;right:5px;top:0;min-width:24px;height:' +
                    ctx.itemHeight +
                    'px;display:flex;align-items:center;justify-content:center;';
                if (ctx.arrowUrl) {
                    var simg = document.createElement('img');
                    simg.src = ctx.arrowUrl;
                    simg.alt = '';
                    bindPreviewImgFallback(simg, { eager: ctx.eager });
                    simg.style.cssText =
                        'height:30px;width:auto;object-fit:contain;max-width:64px;max-height:30px;opacity:0.9;';
                    simg.setAttribute('data-theme-asset-path', 'itemConfig.itemRightArrow');
                    sar.appendChild(simg);
                } else {
                    var sch = document.createElement('span');
                    sch.textContent = '\u203A';
                    sch.setAttribute('data-theme-asset-path', 'itemConfig.itemRightArrow');
                    sch.style.cssText =
                        'color:' + selText + ';font-weight:700;font-size:22px;line-height:1;';
                    sar.appendChild(sch);
                }
                row._y1Arrow = sar;
                row.appendChild(sar);
            }
            return;
        }

        var rowTextColor = selected ? ctx.colors.text_selected : ctx.colors.text_primary;
        if (row._y1LabelWrap) row._y1LabelWrap.style.color = rowTextColor;
        if (row._y1LabelInner) {
            var lab = item.label != null ? String(item.label) : '';
            var wantMarquee = !!(selected && lab.length > 12 && !item.isFolder && ctx.marqueeOnLongLabel);
            if (wantMarquee !== !!row._y1HasMarquee) {
                row._y1HasMarquee = wantMarquee;
                row._y1LabelInner.textContent = lab;
                if (wantMarquee) {
                    row._y1LabelInner.style.animation = 'y1-tp-marquee 8s linear infinite';
                    var dup = document.createElement('span');
                    dup.style.paddingLeft = '40px';
                    dup.textContent = lab;
                    row._y1LabelInner.appendChild(dup);
                } else {
                    row._y1LabelInner.style.animation = '';
                }
            }
        }
        if (row._y1Arrow) {
            row._y1Arrow.style.display = selected ? 'flex' : 'none';
        } else if (selected) {
            var ar = document.createElement('div');
            ar.style.cssText =
                'position:absolute;right:10px;top:0;min-width:24px;height:' +
                ctx.itemHeight +
                'px;display:flex;align-items:center;justify-content:center;';
            if (ctx.arrowUrl) {
                var im = document.createElement('img');
                im.src = ctx.arrowUrl;
                im.alt = '';
                bindPreviewImgFallback(im, { eager: ctx.eager });
                im.style.cssText =
                    'height:100%;width:auto;object-fit:contain;max-width:64px;max-height:64px;opacity:0.9;';
                im.setAttribute('data-theme-asset-path', 'itemConfig.itemRightArrow');
                ar.appendChild(im);
            } else {
                var ch = document.createElement('span');
                ch.textContent = '\u203A';
                ch.setAttribute('data-theme-asset-path', 'itemConfig.itemRightArrow');
                ch.style.cssText =
                    'color:' +
                    ctx.colors.text_selected +
                    ';font-weight:700;font-size:22px;line-height:1;';
                ar.appendChild(ch);
            }
            row._y1Arrow = ar;
            row.appendChild(ar);
        }
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
        var musicIconUrl = options.musicIconUrl || '';
        var marqueeOnLongLabel = options.marqueeOnLongLabel !== false;
        var eager = !!options.eager;
        var scrollState = options.scrollState || { override: null, lastY: 0, animate: true };

        var actualRowWidth = fullWidth ? W : rowWidth;
        var rowX = fullWidth ? 0 : leftPad;
        var scrollY =
            scrollState.override != null
                ? scrollState.override
                : menuScrollOffset(selectedIndex, items.length, itemHeight, visibleHeight);
        var previousScrollY = scrollState.lastY || 0;
        if (scrollState.override == null) scrollState.lastY = scrollY;

        var outer = document.createElement('div');
        outer.style.cssText =
            'position:relative;height:' + visibleHeight + 'px;overflow:hidden;width:100%;';
        /* A finger that starts on the list scrolls the list, not the page. */
        outer.style.touchAction = 'none';
        var inner = document.createElement('div');
        inner.style.cssText = 'position:relative;transform:translateY(-' + scrollY + 'px);';
        /* Sliding from the old offset to the new one keeps a wheel step or a
           drag feeling like a scroll instead of a cut. */
        if (scrollState.animate !== false && previousScrollY !== scrollY && typeof inner.animate === 'function') {
            try {
                inner.animate(
                    [
                        { transform: 'translateY(-' + previousScrollY + 'px)' },
                        { transform: 'translateY(-' + scrollY + 'px)' }
                    ],
                    { duration: 170, easing: 'cubic-bezier(0.22, 0.8, 0.35, 1)' }
                );
            } catch (e) {}
        }
        outer.appendChild(inner);

        var rowCtx = {
            isSettings: false,
            itemHeight: itemHeight,
            colors: colors,
            itemBg: itemBg,
            itemSel: itemSel,
            arrowUrl: arrowUrl,
            marqueeOnLongLabel: marqueeOnLongLabel,
            eager: eager
        };
        var rows = [];

        for (var idx = 0; idx < items.length; idx++) {
            var item = items[idx];
            var selected = idx === selectedIndex;
            var row = document.createElement('div');
            row.className = 'y1-tp-row' + (selected ? ' is-selected' : '');
            /* Lets a hover or a touch-and-hold move the highlight, the same way
               the up/down keys do on the device. */
            row.setAttribute('data-y1-row', String(idx));
            if (item.assetPath) {
                row.setAttribute('data-theme-asset-path', item.assetPath);
                row.setAttribute('data-theme-row-icon-path', item.assetPath);
            } else {
                row.setAttribute('data-theme-asset-path', 'itemConfig.itemSelectedBackground');
            }
            row.style.cssText =
                'position:absolute;left:' +
                rowX +
                'px;top:' +
                idx * itemHeight +
                'px;width:' +
                actualRowWidth +
                'px;height:' +
                itemHeight +
                'px;display:flex;align-items:center;padding-right:32px;box-sizing:border-box;';

            if (item.isFolder || item.isMusic) {
                var isMusicRow = !!item.isMusic && !item.isFolder;
                var rowIconUrl = isMusicRow ? musicIconUrl : folderIconUrl;
                var rowIconAssetPath = isMusicRow ? 'fileConfig.musicIcon' : 'fileConfig.folderIcon';
                if (rowIconUrl) {
                    var fi = document.createElement('img');
                    fi.src = rowIconUrl;
                    fi.alt = '';
                    bindPreviewImgFallback(fi, { eager: eager });
                    fi.style.cssText =
                        'width:22px;height:22px;margin-left:10px;margin-right:8px;object-fit:contain;flex-shrink:0;';
                    fi.setAttribute('data-theme-asset-path', rowIconAssetPath);
                    row.appendChild(fi);
                } else {
                    var sp = document.createElement('span');
                    sp.textContent = isMusicRow ? '\u266B' : '\uD83D\uDCC1';
                    sp.setAttribute('data-theme-asset-path', rowIconAssetPath);
                    sp.style.cssText = 'margin-left:10px;margin-right:8px;font-size:19px;flex-shrink:0;';
                    row.appendChild(sp);
                }
            }

            var hasLeadIcon = !!(item.isFolder || item.isMusic);
            var labelWrap = document.createElement('div');
            labelWrap.style.cssText =
                (hasLeadIcon
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
                (hasLeadIcon ? 'text-overflow:ellipsis;' : '');
            var lab = item.label != null ? String(item.label) : '';
            labelInner.textContent = lab;
            labelWrap.appendChild(labelInner);
            row.appendChild(labelWrap);
            row._y1LabelWrap = labelWrap;
            row._y1LabelInner = labelInner;
            row._y1HasMarquee = false;
            row._y1Arrow = null;

            applyMenuRowSelection(row, item, selected, rowCtx);
            rows.push(row);
            inner.appendChild(row);
        }
        host.appendChild(outer);
        return {
            outer: outer,
            inner: inner,
            rows: rows,
            items: items,
            itemHeight: itemHeight,
            visibleHeight: visibleHeight,
            selectedIndex: selectedIndex,
            rowCtx: rowCtx
        };
    }

    function appendSettingsMenuRows(host, options) {
        var items = options.items || [];
        var selectedIndex = options.selectedIndex | 0;
        var visibleHeight = options.visibleHeight;
        var colors = options.colors;
        var itemBg = options.itemBackgroundStyle;
        var itemSel = options.itemSelectedBackgroundStyle;
        var arrowUrl = options.itemRightArrowUrl || '';
        var eager = !!options.eager;
        var scrollState = options.scrollState || { override: null, lastY: 0, animate: true };
        var itemHeight = SETTINGS_ROW_HEIGHT;
        var scrollY =
            scrollState.override != null
                ? scrollState.override
                : menuScrollOffset(selectedIndex, items.length, itemHeight, visibleHeight);
        var previousScrollY = scrollState.lastY || 0;
        if (scrollState.override == null) scrollState.lastY = scrollY;

        var outer = document.createElement('div');
        outer.style.cssText =
            'position:relative;height:' + visibleHeight + 'px;overflow:hidden;width:100%;';
        /* A finger that starts on the list scrolls the list, not the page. */
        outer.style.touchAction = 'none';
        var inner = document.createElement('div');
        inner.style.cssText = 'position:relative;transform:translateY(-' + scrollY + 'px);';
        /* Sliding from the old offset to the new one keeps a wheel step or a
           drag feeling like a scroll instead of a cut. */
        if (scrollState.animate !== false && previousScrollY !== scrollY && typeof inner.animate === 'function') {
            try {
                inner.animate(
                    [
                        { transform: 'translateY(-' + previousScrollY + 'px)' },
                        { transform: 'translateY(-' + scrollY + 'px)' }
                    ],
                    { duration: 170, easing: 'cubic-bezier(0.22, 0.8, 0.35, 1)' }
                );
            } catch (e) {}
        }
        outer.appendChild(inner);

        var SELECTED_TEXT = colors.text_selected;
        var rowCtx = {
            isSettings: true,
            itemHeight: itemHeight,
            colors: colors,
            itemBg: itemBg,
            itemSel: itemSel,
            arrowUrl: arrowUrl,
            eager: eager
        };
        var rows = [];

        for (var idx = 0; idx < items.length; idx++) {
            var item = items[idx];
            var selected = idx === selectedIndex;
            var row = document.createElement('div');
            row.className = 'y1-tp-row' + (selected ? ' is-selected' : '');
            row.setAttribute('data-y1-row', String(idx));
            if (item.assetPath) {
                row.setAttribute('data-theme-asset-path', item.assetPath);
                row.setAttribute('data-theme-row-icon-path', item.assetPath);
            } else {
                row.setAttribute('data-theme-asset-path', 'itemConfig.itemSelectedBackground');
            }
            row.style.cssText =
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
            row._y1Title = title;
            row._y1Value = null;
            row._y1Arrow = null;

            if (item.valueText) {
                var vt = document.createElement('div');
                vt.style.cssText =
                    'font-size:20px;font-weight:bold;color:' +
                    (selected ? SELECTED_TEXT : colors.text_primary) +
                    ';margin-right:5px;white-space:nowrap;';
                vt.textContent = String(item.valueText);
                row.appendChild(vt);
                row._y1Value = vt;
            }

            applyMenuRowSelection(row, item, selected, rowCtx);
            rows.push(row);
            inner.appendChild(row);
        }
        host.appendChild(outer);
        return {
            outer: outer,
            inner: inner,
            rows: rows,
            items: items,
            itemHeight: itemHeight,
            visibleHeight: visibleHeight,
            selectedIndex: selectedIndex,
            rowCtx: rowCtx
        };
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

    /** True when value should be loaded as a font file URL (not a generic CSS family name). */
    function looksLikeThemeFontFileRef(value) {
        var s = String(value || '').trim();
        if (!s || /^https?:\/\//i.test(s)) return false;
        return /\.(ttf|otf|woff2?)(\?|#|$)/i.test(s);
    }

    var _specFontMountSeq = 0;

    /** Stable id for `<style id="…">` + scoped @font-face family names (one gallery card / preview root). */
    function themePreviewFontStyleId(catalogFolder, variantSegment) {
        return (
            'y1-tp-fonts-' +
            String(String(catalogFolder || '') + '-' + String(variantSegment || '')).replace(/[^a-zA-Z0-9_-]/g, '-')
        );
    }

    /** Per-mount @font-face names so multiple cards on one page never share the same family string. */
    function scopedThemeFontFamily(styleId, logicalName) {
        var base = String(logicalName != null ? logicalName : 'font')
            .replace(/"/g, '')
            .trim()
            .replace(/[^a-zA-Z0-9_-]/g, '_');
        if (!base) base = 'font';
        var sid = String(styleId || 'id').replace(/[^a-zA-Z0-9_]/g, '_');
        return 'y1tp_' + sid + '__' + base;
    }

    /** Collect font asset paths referenced anywhere in config.json (fallback when theme.fonts is incomplete). */
    function walkConfigForFontFilePaths(obj, out, seen) {
        if (!obj) return;
        if (typeof obj === 'string') {
            var s = obj.trim();
            if (!s) return;
            var low = s.toLowerCase();
            if (seen[low]) return;
            if (looksLikeThemeFontFileRef(s)) {
                seen[low] = true;
                out.push(s);
            }
            return;
        }
        if (Array.isArray(obj)) {
            for (var i = 0; i < obj.length; i++) walkConfigForFontFilePaths(obj[i], out, seen);
            return;
        }
        if (typeof obj === 'object') {
            for (var k in obj) {
                if (Object.prototype.hasOwnProperty.call(obj, k)) walkConfigForFontFilePaths(obj[k], out, seen);
            }
        }
    }

    function injectThemeFonts(spec, buildFileUrl, contentFolder, styleId, fontDisplay) {
        if (typeof document === 'undefined') return;
        var display =
            fontDisplay === 'swap' || fontDisplay === 'optional' || fontDisplay === 'fallback' || fontDisplay === 'auto'
                ? fontDisplay
                : 'block';
        var modern = (spec.theme && spec.theme.fonts) || [];
        var fontFamily = spec.fontFamily;
        var discovered = [];
        walkConfigForFontFilePaths(spec, discovered, {});

        var themeFonts = modern.length ? modern.slice() : [];
        if (!themeFonts.length && looksLikeThemeFontFileRef(fontFamily)) {
            themeFonts.push({ file: String(fontFamily).trim(), default: true });
        }
        for (var di = 0; di < discovered.length; di++) {
            var fp = discovered[di];
            var dup = false;
            for (var ti = 0; ti < themeFonts.length; ti++) {
                if (String((themeFonts[ti] && themeFonts[ti].file) || '').toLowerCase() === fp.toLowerCase()) {
                    dup = true;
                    break;
                }
            }
            if (!dup) {
                themeFonts.push({
                    file: fp,
                    default: themeFonts.length === 0 && !looksLikeThemeFontFileRef(fontFamily)
                });
            }
        }

        var head = document.head || document.getElementsByTagName('head')[0];
        if (!head) return;
        var existing = null;
        try {
            existing = document.getElementById(styleId);
        } catch (eRm) {
            existing = null;
        }
        if (existing && existing.parentNode) existing.parentNode.removeChild(existing);

        if (!themeFonts.length) {
            injectRobotoFallback();
            return;
        }

        var css = '';
        for (var i = 0; i < themeFonts.length; i++) {
            var f = themeFonts[i];
            if (!f || !f.file) continue;
            var url = buildFileUrl(contentFolder, f.file);
            if (!url) continue;
            var logical = f.id || stripExt(f.file);
            var family = scopedThemeFontFamily(styleId, logical);
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
                '");font-weight:100 900;font-style:normal;font-display:' +
                display +
                ';}';
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

    function defaultFontStack(spec, styleId) {
        var modern = (spec.theme && spec.theme.fonts) || [];
        var fontFamily = spec.fontFamily;
        var discovered = [];
        walkConfigForFontFilePaths(spec, discovered, {});

        var themeFonts = modern.length ? modern.slice() : [];
        if (!themeFonts.length && looksLikeThemeFontFileRef(fontFamily)) {
            themeFonts.push({ file: String(fontFamily).trim(), default: true });
        }
        for (var di = 0; di < discovered.length; di++) {
            var fp = discovered[di];
            var dup = false;
            for (var ti = 0; ti < themeFonts.length; ti++) {
                if (String((themeFonts[ti] && themeFonts[ti].file) || '').toLowerCase() === fp.toLowerCase()) {
                    dup = true;
                    break;
                }
            }
            if (!dup) {
                themeFonts.push({
                    file: fp,
                    default: themeFonts.length === 0 && !looksLikeThemeFontFileRef(fontFamily)
                });
            }
        }
        if (!themeFonts.length) {
            return 'Roboto, Arial, "Helvetica Neue", Helvetica, sans-serif';
        }
        var def = null;
        for (var fi = 0; fi < themeFonts.length; fi++) {
            if (themeFonts[fi].default) {
                def = themeFonts[fi];
                break;
            }
        }
        if (!def) def = themeFonts[0];
        var logical = def.id || stripExt(def.file);
        var fam = scopedThemeFontFamily(styleId, logical);
        var stack = ['"' + fam + '"'];
        stack.push('Roboto', 'Arial', '"Helvetica Neue"', 'Helvetica', 'sans-serif');
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
    /* The view title and the battery figure are the two spots where the theme
       font is always on screen, so they double as a way into that font: the
       Studio tags them and opens the font asset when the text is tapped. */
    function tagFontHotspot(node, cfg, label) {
        if (!node || !cfg || !cfg.fontFamily) return node;
        node.setAttribute('data-theme-asset-path', 'fontFamily');
        node.style.cursor = 'pointer';
        node.title = label + ' uses the theme font. Click to change it.';
        return node;
    }

    /* The title and the battery figure are text, not files. When the theme
       brings its own font they open that; otherwise they stand for the strip's
       text colour, which is the thing the reader can actually change. */
    function tagStatusTextHotspot(node, label) {
        if (!node || node.hasAttribute('data-theme-asset-path')) return node;
        node.setAttribute('data-theme-asset-path', 'statusConfig.statusTextColor');
        node.style.cursor = 'pointer';
        node.title = label + ': status bar text colour.';
        return node;
    }

    /* One status icon: the same size and object-fit the player uses, tagged so
       a click in the Studio can open that file. */
    function appendStatusIcon(rightEl, statusCfg, key, buildFileUrl, contentFolder, mode) {
        var file = statusCfg && statusCfg[key];
        if (!file) return null;
        var raw = buildFileUrl(contentFolder, file);
        if (!raw) return null;
        var preview = mode === 'gallery' || mode === 'menu' ? previewAssetUrl(raw, 'png') : raw;
        var img = document.createElement('img');
        img.src = preview;
        img.alt = '';
        img.style.cssText = 'height:25px;width:25px;object-fit:contain;display:block;';
        img.setAttribute('data-theme-asset-path', 'statusConfig.' + key);
        if (preview !== raw) {
            img.onerror = function () {
                img.onerror = null;
                img.src = raw;
            };
        }
        bindPreviewImgFallback(img, { eager: mode === 'full' });
        rightEl.appendChild(img);
        return img;
    }

    function appendBatteryFallback(rightEl, pct, textColor, cfg) {
        var p = Number(pct);
        if (!isFinite(p)) p = 100;
        var wrap = document.createElement('div');
        wrap.style.cssText =
            'display:flex;align-items:center;gap:4px;font-size:16px;color:#ffffff;';
        var box = document.createElement('div');
        box.setAttribute('data-theme-asset-path', 'statusConfig.battery.3');
        var borderCol = textColor && String(textColor).charAt(0) === '#' ? textColor : '#ffffff';
        box.style.cssText =
            'width:22px;height:11px;border:1px solid ' +
            borderCol +
            ';border-radius:2px;padding:1px;display:flex;box-sizing:border-box;opacity:0.95;';
        var fill = document.createElement('div');
        fill.style.cssText =
            'width:' +
            Math.max(8, Math.round((p / 100) * 16)) +
            'px;height:100%;background:linear-gradient(180deg,#7ef29a,#2db84d);border-radius:1px;';
        box.appendChild(fill);
        wrap.appendChild(box);
        var sp = document.createElement('span');
        sp.textContent = p + '%';
        tagFontHotspot(sp, cfg, 'The battery figure');
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
                iconUrl: it.iconFile ? buildFileUrl(contentFolder, it.iconFile) : '',
                assetPath: 'settingConfig.' + it.id
            };
        });
    }

    function buildSettingsItems(cfg, buildFileUrl, contentFolder, sim, opts) {
        var settingConfig = (cfg && cfg.settingConfig) || {};
        var homeCfg = (cfg && cfg.homePageConfig) || {};
        sim = sim || {};
        opts = opts || {};
        var deviceMode = normalizeDeviceMode(opts.deviceMode, homeCfg, opts.mode || 'full');
        var category = opts.category || '';
        var timedShutdownValue = sim.timedShutdownValue || 'off';
        var backlightValue = sim.backlightValue || '10';
        var shuffleEnabled = !!sim.shuffleEnabled;
        var repeatMode = sim.repeatMode || 'off';
        var fileExtensionsEnabled = !!sim.fileExtensionsEnabled;
        var keyLockEnabled = !!sim.keyLockEnabled;
        var keyToneEnabled = sim.keyToneEnabled !== false;
        var keyVibrationEnabled = sim.keyVibrationEnabled !== false;
        var displayBatteryEnabled = sim.displayBatteryEnabled !== false;
        var wheelSensitivity = sim.wheelSensitivity || 'standard';
        var wheelVolumeEnabled = sim.wheelVolumeEnabled !== false;
        var headphoneGain = sim.headphoneGain || 'standard';
        var speakerEnabled = sim.speakerEnabled !== false;

        function capFirst(str) {
            var s = String(str || '');
            return s ? s.charAt(0).toUpperCase() + s.slice(1) : '';
        }

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
                case 'wheel_sensitivity':
                    return capFirst(wheelSensitivity);
                case 'wheel_volume':
                    return wheelVolumeEnabled ? 'On' : 'Off';
                case 'headphone_gain':
                    return capFirst(headphoneGain);
                case 'speaker':
                    return speakerEnabled ? 'On' : 'Off';
                case 'about':
                    return 'Version';
                default:
                    return undefined;
            }
        }

        var wheelSensKey = 'wheelSensitivity' + capFirst(wheelSensitivity);
        var wheelVolKey = wheelVolumeEnabled ? 'wheelVolumeOn' : 'wheelVolumeOff';
        var gainKey = 'headphoneGain' + capFirst(headphoneGain);
        var speakerKey = speakerEnabled ? 'speakerOn' : 'speakerOff';
        var repeatAssetKey =
            repeatMode === 'off' ? 'repeatOff' : repeatMode === 'all' ? 'repeatAll' : 'repeatOne';
        var shuffleAssetKey = shuffleEnabled ? 'shuffleOn' : 'shuffleOff';
        var fileExtensionAssetKey = fileExtensionsEnabled ? 'fileExtensionOn' : 'fileExtensionOff';
        var keyLockAssetKey = keyLockEnabled ? 'keyLockOn' : 'keyLockOff';
        var keyToneAssetKey = keyToneEnabled ? 'keyToneOn' : 'keyToneOff';
        var keyVibrationAssetKey = keyVibrationEnabled ? 'keyVibrationOn' : 'keyVibrationOff';
        var displayBatteryAssetKey = displayBatteryEnabled ? 'displayBatteryOn' : 'displayBatteryOff';

        var allEntries = {
            shutdown: { id: 'shutdown', label: 'Shutdown', iconFile: settingConfig.shutdown, assetPath: 'settingConfig.shutdown' },
            timed_shutdown: {
                id: 'timed_shutdown',
                label: 'Timed shutdown',
                iconFile: settingConfig['timedShutdown_' + timedShutdownValue],
                assetPath: 'settingConfig.timedShutdown_' + timedShutdownValue,
                valueText: gt('timed_shutdown')
            },
            shuffle: { id: 'shuffle', label: 'Shuffle', iconFile: settingConfig[shuffleAssetKey], assetPath: 'settingConfig.' + shuffleAssetKey, valueText: gt('shuffle') },
            repeat: { id: 'repeat', label: 'Repeat', iconFile: settingConfig[repeatAssetKey], assetPath: 'settingConfig.' + repeatAssetKey, valueText: gt('repeat') },
            equalizer: { id: 'equalizer', label: 'Equalizer', iconFile: settingConfig.equalizer_normal, assetPath: 'settingConfig.equalizer_normal' },
            file_extension: {
                id: 'file_extension',
                label: 'File extensions',
                iconFile: settingConfig[fileExtensionAssetKey],
                assetPath: 'settingConfig.' + fileExtensionAssetKey,
                valueText: gt('file_extension')
            },
            key_lock: {
                id: 'key_lock',
                label: deviceMode === 'y1' ? 'Key lock' : 'Screen-off key switch',
                iconFile: settingConfig[keyLockAssetKey],
                assetPath: 'settingConfig.' + keyLockAssetKey,
                valueText: gt('key_lock')
            },
            wheel_sensitivity: {
                id: 'wheel_sensitivity',
                label: 'Wheel sensitivity',
                iconFile: settingConfig[wheelSensKey],
                assetPath: 'settingConfig.' + wheelSensKey,
                valueText: gt('wheel_sensitivity')
            },
            wheel_volume: {
                id: 'wheel_volume',
                label: 'Wheel volume',
                iconFile: settingConfig[wheelVolKey],
                assetPath: 'settingConfig.' + wheelVolKey,
                valueText: gt('wheel_volume')
            },
            key_tone: { id: 'key_tone', label: 'Key tone', iconFile: settingConfig[keyToneAssetKey], assetPath: 'settingConfig.' + keyToneAssetKey, valueText: gt('key_tone') },
            key_vibration: {
                id: 'key_vibration',
                label: 'Key vibration',
                iconFile: settingConfig[keyVibrationAssetKey],
                assetPath: 'settingConfig.' + keyVibrationAssetKey,
                valueText: gt('key_vibration')
            },
            headphone_gain: {
                id: 'headphone_gain',
                label: 'Headphone gain',
                iconFile: settingConfig[gainKey],
                assetPath: 'settingConfig.' + gainKey,
                valueText: gt('headphone_gain')
            },
            speaker: {
                id: 'speaker',
                label: 'Speaker',
                iconFile: settingConfig[speakerKey],
                assetPath: 'settingConfig.' + speakerKey,
                valueText: gt('speaker')
            },
            wallpaper: { id: 'wallpaper', label: 'Wallpaper', iconFile: settingConfig.wallpaper, assetPath: 'settingConfig.wallpaper' },
            backlight: {
                id: 'backlight',
                label: 'Backlight',
                iconFile: settingConfig['backlight_' + backlightValue],
                assetPath: 'settingConfig.backlight_' + backlightValue,
                valueText: gt('backlight')
            },
            brightness: { id: 'brightness', label: 'Brightness', iconFile: settingConfig.brightness, assetPath: 'settingConfig.brightness' },
            display_battery: {
                id: 'display_battery',
                label: 'Display battery',
                iconFile: settingConfig[displayBatteryAssetKey],
                assetPath: 'settingConfig.' + displayBatteryAssetKey,
                valueText: gt('display_battery')
            },
            date_time: { id: 'date_time', label: 'Date & Time', iconFile: settingConfig.dateTime, assetPath: 'settingConfig.dateTime' },
            theme: { id: 'theme', label: 'Theme', iconFile: settingConfig.theme, assetPath: 'settingConfig.theme' },
            language: { id: 'language', label: 'Language', iconFile: settingConfig.language, assetPath: 'settingConfig.language' },
            /* Rockbox / Launcher is ALWAYS shown in Settings (never hidden as legacy/unimplemented). */
            rockbox: { id: 'rockbox', label: 'Rockbox', iconFile: settingConfig.launcher, assetPath: 'settingConfig.launcher' },
            factory_reset: { id: 'factory_reset', label: 'Factory reset', iconFile: settingConfig.factoryReset, assetPath: 'settingConfig.factoryReset' },
            clear_cache: { id: 'clear_cache', label: 'Clear cache', iconFile: settingConfig.clearCache, assetPath: 'settingConfig.clearCache' },
            bluetooth: {
                id: 'bluetooth',
                label: 'Bluetooth',
                iconFile: settingConfig.bluetooth || homeCfg.bluetooth,
                assetPath: settingConfig.bluetooth ? 'settingConfig.bluetooth' : 'homePageConfig.bluetooth'
            },
            about: { id: 'about', label: 'About', iconFile: undefined, valueText: gt('about') }
        };

        var base;
        if (category === 'musicSettings') {
            base = [
                allEntries.shuffle,
                allEntries.repeat,
                allEntries.equalizer,
                allEntries.timed_shutdown
            ];
        } else if (category === 'keysWheel') {
            base = [
                allEntries.key_lock,
                allEntries.wheel_sensitivity,
                allEntries.wheel_volume,
                allEntries.key_tone,
                allEntries.key_vibration
            ];
        } else if (category === 'audio') {
            base =
                deviceMode === 'both'
                    ? [allEntries.headphone_gain, allEntries.speaker, allEntries.equalizer, allEntries.shuffle, allEntries.repeat]
                    : [allEntries.headphone_gain, allEntries.speaker];
        } else if (category === 'display') {
            base = [allEntries.brightness, allEntries.backlight, allEntries.display_battery];
        } else if (category === 'personalization') {
            base = [allEntries.theme, allEntries.wallpaper];
        } else if (category === 'filesStorage') {
            base = [allEntries.file_extension, allEntries.clear_cache];
        } else if (category === 'system') {
            base =
                deviceMode === 'both'
                    ? [allEntries.language, allEntries.date_time, allEntries.timed_shutdown, allEntries.rockbox, allEntries.shutdown]
                    : [allEntries.language, allEntries.date_time, allEntries.timed_shutdown, allEntries.rockbox];
        } else if (deviceMode === 'y1') {
            /* Authentic Y1 3.1.2 flat Settings list (Rockbox always included). */
            base = [
                allEntries.shutdown,
                allEntries.timed_shutdown,
                allEntries.shuffle,
                allEntries.repeat,
                allEntries.equalizer,
                allEntries.file_extension,
                allEntries.key_lock,
                allEntries.key_tone,
                allEntries.key_vibration,
                allEntries.wallpaper,
                allEntries.backlight,
                allEntries.brightness,
                allEntries.display_battery,
                allEntries.date_time,
                allEntries.theme,
                allEntries.language,
                allEntries.rockbox,
                allEntries.factory_reset,
                allEntries.clear_cache,
                allEntries.about
            ];
        } else {
            /* Authentic Y2 3.2.8 categorized Settings root (used in Y2 and Both modes). */
            base = [
                allEntries.bluetooth,
                { id: 'cat_keysWheel', label: 'Keys & Wheel', iconFile: settingConfig.categoryKeysWheel, assetPath: 'settingConfig.categoryKeysWheel' },
                { id: 'cat_audio', label: 'Audio', iconFile: settingConfig.categoryAudio, assetPath: 'settingConfig.categoryAudio' },
                { id: 'cat_display', label: 'Display', iconFile: settingConfig.categoryDisplay, assetPath: 'settingConfig.categoryDisplay' },
                { id: 'cat_personalization', label: 'Personalization', iconFile: settingConfig.categoryPersonalization, assetPath: 'settingConfig.categoryPersonalization' },
                { id: 'cat_filesStorage', label: 'Files & Storage', iconFile: settingConfig.categoryFilesStorage, assetPath: 'settingConfig.categoryFilesStorage' },
                { id: 'cat_system', label: 'System', iconFile: settingConfig.categorySystem, assetPath: 'settingConfig.categorySystem' },
                allEntries.about,
                allEntries.factory_reset
            ];
        }
        return base.map(function (item) {
            return {
                id: item.id,
                label: item.label,
                valueText: item.valueText,
                iconUrl: item.iconFile ? buildFileUrl(contentFolder, item.iconFile) : '',
                assetPath: item.assetPath
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
            wheelSensitivity: 'standard',
            wheelVolumeEnabled: true,
            headphoneGain: 'standard',
            speakerEnabled: true,
            fmFreq: 985,
            btEnabled: true,
            nowPlayingTrackIndex: 0,
            photoViewerIndex: 0,
            ebookTitle: 'The Little Prince',
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

    function genericListForView(viewId, deviceMode) {
        if (viewId === 'music') {
            var musicItems = ['All songs', 'Playlists', 'Artists', 'Albums', 'Genres', 'Folders', 'Search'];
            if (deviceMode !== 'y1') musicItems.push('Settings');
            return musicItems.map(function (label) {
                return { id: label.toLowerCase().replace(/\s+/g, '_'), label: label };
            });
        }
        if (viewId === 'music_folders') {
            var folders = [
                { label: 'Bad', isFolder: true },
                { label: 'Thriller', isFolder: true },
                { label: 'Dangerous', isFolder: true },
                { label: '01 - Jam.flac', isMusic: true },
                { label: '02 - Remember the Time.mp3', isMusic: true },
                { label: 'HIStory', isFolder: true },
                { label: 'Invincible', isFolder: true },
                { label: 'Off the Wall', isFolder: true },
                { label: 'Live', isFolder: true },
                { label: 'Demos', isFolder: true },
                { label: 'Remixes', isFolder: true },
                { label: 'Vault', isFolder: true }
            ];
            return folders.map(function (entry) {
                return {
                    id: entry.label.toLowerCase().replace(/[^a-z0-9]+/g, '_'),
                    label: entry.label,
                    isFolder: !!entry.isFolder,
                    isMusic: !!entry.isMusic
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
                'Archives'
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
        if (viewId === 'ebook') {
            return [
                { id: 'continue_reading', label: 'Continue Reading', isAction: true },
                { id: 'local_files', label: 'Local Files', isAction: true },
                { id: 'book_1', label: 'The Little Prince.epub' },
                { id: 'book_2', label: 'Alice in Wonderland.epub' },
                { id: 'book_3', label: 'Frankenstein.txt' },
                { id: 'book_4', label: 'Moby-Dick.epub' }
            ];
        }
        if (viewId === 'fileManager') {
            return [
                { id: 'fm_music', label: 'Music', isFolder: true },
                { id: 'fm_videos', label: 'Videos', isFolder: true },
                { id: 'fm_photos', label: 'Photos', isFolder: true },
                { id: 'fm_ebooks', label: 'Books', isFolder: true },
                { id: 'fm_themes', label: 'Themes', isFolder: true },
                { id: 'fm_track1', label: 'Jam.flac', isMusic: true },
                { id: 'fm_track2', label: 'Remember the Time.mp3', isMusic: true }
            ];
        }
        if (viewId === 'bluetooth') {
            return [
                { id: 'bt_power', label: 'Bluetooth', statusKey: 'power' },
                { id: 'bt_dev1', label: 'AirPods Pro', status: 'Connected' },
                { id: 'bt_dev2', label: 'Sony WH-1000XM5', status: 'Paired' },
                { id: 'bt_scan', label: 'Search for devices', status: '' }
            ];
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

    /* ---- Preview loading --------------------------------------------------
       One shared layer dims a gallery card and spins until its fonts and the
       art the screen needs (wallpaper, battery, arrows, play state) decode, so
       nothing paints in a fallback face or pops in after the fact. */
    function previewFrameFor(container) {
        var node = container;
        while (node && node !== document.body) {
            if (node.classList && node.classList.contains('theme-preview-frame')) return node;
            node = node.parentElement;
        }
        return null;
    }

    function setPreviewLoading(frame, on) {
        if (!frame) return null;
        var layer = frame.querySelector('.y1-preview-loading');
        if (on) {
            if (!layer) {
                layer = document.createElement('div');
                layer.className = 'y1-preview-loading';
                layer.innerHTML =
                    '<span class="y1-preview-loading__spinner" role="status" aria-label="Loading preview"></span>';
                frame.appendChild(layer);
            }
            layer.hidden = false;
            frame.classList.add('is-preview-loading');
            frame.setAttribute('aria-busy', 'true');
            return layer;
        }
        if (layer) layer.hidden = true;
        frame.classList.remove('is-preview-loading');
        frame.removeAttribute('aria-busy');
        return layer;
    }

    function waitForImageElement(img) {
        return new Promise(function (resolve) {
            if (!img) return resolve();
            if (img.complete) {
                if (img.decode) img.decode().catch(function () {}).then(resolve);
                else resolve();
                return;
            }
            function done() {
                img.removeEventListener('load', done);
                img.removeEventListener('error', done);
                resolve();
            }
            img.addEventListener('load', done);
            img.addEventListener('error', done);
        });
    }

    function waitForImageUrl(url) {
        return new Promise(function (resolve) {
            if (!url) return resolve();
            var im = new Image();
            im.onload = function () {
                resolve();
            };
            im.onerror = function () {
                resolve();
            };
            im.src = url;
        });
    }

    function waitForFontFamily(fontStack) {
        if (typeof document === 'undefined' || !document.fonts || typeof document.fonts.load !== 'function') {
            return Promise.resolve();
        }
        var fam = String(fontStack || '')
            .split(',')[0]
            .trim()
            .replace(/^["']|["']$/g, '');
        if (!fam) return Promise.resolve();
        return document.fonts
            .load('22px "' + fam.replace(/"/g, '') + '"')
            .then(function () {
                return document.fonts.ready;
            })
            .catch(function () {});
    }

    function waitForPreviewAssets(container, urls, fontStack) {
        var waits = [waitForFontFamily(fontStack)];
        var imgs = container ? container.querySelectorAll('img') : [];
        for (var i = 0; i < imgs.length; i++) waits.push(waitForImageElement(imgs[i]));
        for (var u = 0; u < urls.length; u++) waits.push(waitForImageUrl(urls[u]));
        return Promise.race([
            Promise.all(waits),
            new Promise(function (resolve) {
                global.setTimeout(resolve, 3200);
            })
        ]);
    }

    /** Start the font and preview-art requests the moment a card is near the
        viewport, instead of waiting for its place in the mount queue. */
    function primeGalleryPreview(opts) {
        opts = opts || {};
        if (typeof document === 'undefined') return;
        var catalogFolder = String(opts.catalogFolder || '')
            .replace(/^\.\/+/, '')
            .trim();
        if (!catalogFolder) return;
        var buildFileUrl =
            typeof opts.buildFileUrl === 'function' ? opts.buildFileUrl : defaultBuildFileUrl;
        var contentFolder = effectiveContentPrefix(catalogFolder, opts.variantSegment);
        var styleId = themePreviewFontStyleId(catalogFolder, opts.variantSegment);
        var request =
            global.Y1ThemeConfig && typeof global.Y1ThemeConfig.request === 'function'
                ? global.Y1ThemeConfig.request(contentFolder)
                : typeof fetch === 'function'
                  ? fetch('./' + encodePathSegments(contentFolder) + '/config.json', { cache: 'force-cache' }).then(
                        function (res) {
                            return res.ok ? res.json() : null;
                        }
                    )
                  : Promise.resolve(null);
        request
            .then(function (cfg) {
                if (!cfg) return;
                if (!document.getElementById(styleId)) {
                    injectThemeFonts(cfg, buildFileUrl, contentFolder, styleId, 'block');
                }
                var urls = [];
                var bg = backgroundUrlForView(cfg, 'home', buildFileUrl, contentFolder, true);
                if (bg) urls.push(bg);
                var statusCfg = cfg.statusConfig || {};
                var batt = getBatteryIconUrl(statusCfg, buildFileUrl, contentFolder, 3, false);
                if (batt) urls.push(previewAssetUrl(batt, 'png'));
                var states = ['playing', 'pause', 'stop', 'fmPlaying', 'audiobookPlaying'];
                for (var s = 0; s < states.length; s++) {
                    var file = statusCfg[states[s]];
                    if (!file) continue;
                    urls.push(previewAssetUrl(buildFileUrl(contentFolder, file), 'png'));
                }
                var arrow = cfg.itemConfig && cfg.itemConfig.itemRightArrow;
                if (arrow) urls.push(previewAssetUrl(buildFileUrl(contentFolder, arrow), 'png'));
                for (var u = 0; u < urls.length; u++) {
                    if (!urls[u]) continue;
                    var im = new Image();
                    im.fetchPriority = 'high';
                    im.src = urls[u];
                }
            })
            .catch(function () {});
    }

    function mount(container, options) {
        if (!container) return Promise.reject(new Error('Missing container'));
        var opts = options || {};
        var mode = String(opts.mode || 'menu').toLowerCase();
        var useFullDevice = mode === 'full';
        var isPreviewMode = mode === 'gallery' || mode === 'menu';
        var suppressDeviceInput = opts.suppressDeviceInput === true;
        var interactive = mode === 'full' && !suppressDeviceInput;
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
        var previewFrame = isPreviewMode ? previewFrameFor(container) : null;
        var showLoadingOverlay = opts.loadingOverlay !== false;
        if (previewFrame && showLoadingOverlay) setPreviewLoading(previewFrame, true);

        var encoded = contentFolder.split('/').filter(Boolean).map(encodeURIComponent).join('/');
        var configUrl = '';
        try {
            if (typeof buildFileUrl === 'function') {
                configUrl = String(buildFileUrl(contentFolder, 'config.json') || '').trim();
            }
        } catch (e) {
            configUrl = '';
        }
        if (!configUrl) {
            configUrl = './' + encoded + '/config.json';
        }
        var fetchOpts = { cache: 'no-cache' };
        if (typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function') {
            fetchOpts.signal = AbortSignal.timeout(12000);
        }
        /* The gallery already asked for this theme's config; reuse that promise
           instead of a second round trip for every mounted preview. */
        var sharedConfig =
            global.Y1ThemeConfig && typeof global.Y1ThemeConfig.request === 'function'
                ? global.Y1ThemeConfig.request(contentFolder)
                : null;
        /* Studio can pass an imported config.json straight in (local ZIP or
           folder), so the preview never has to fetch a path that is not on
           the server. Gallery mounts keep the original fetch path. */
        var configPromise =
            opts.spec && typeof opts.spec === 'object'
                ? Promise.resolve(opts.spec)
                : sharedConfig
                  ? sharedConfig.then(function (cfg) {
                        if (!cfg) throw new Error('config.json not found');
                        return cfg;
                    })
                  : fetch(configUrl, fetchOpts).then(function (res) {
                        if (!res.ok) throw new Error('config.json not found');
                        return res.json();
                    });
        return configPromise
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
                /* The Studio edits a theme on a desk, not on a player, so it can
                   ask for a particular battery or charging state and see how the
                   status bar artwork holds up. */
                if (opts.simState && typeof opts.simState === 'object') {
                    Object.keys(opts.simState).forEach(function (key) {
                        var value = opts.simState[key];
                        if (value === undefined) return;
                        if (key === 'batteryLevel') {
                            var level = Number(value);
                            sim.batteryLevel = isNaN(level) ? sim.batteryLevel : Math.max(0, Math.min(3, Math.round(level)));
                            return;
                        }
                        sim[key] = value;
                    });
                }
                var previewMeta = opts.previewMeta || {};

                /* Studio remounts pass a live spec object whose font blob URL may
                   have just been replaced; giving each Studio mount a fresh scoped
                   style/family id guarantees the browser paints the new face
                   immediately instead of reusing a cached @font-face entry. */
                var baseFontStyleId = themePreviewFontStyleId(catalogFolder, variantSegment);
                var fontStyleId =
                    opts.spec && typeof opts.spec === 'object'
                        ? baseFontStyleId + '-r' + (++_specFontMountSeq)
                        : baseFontStyleId;
                var fontDisplay = isPreviewMode ? 'block' : 'swap';
                /* Prime and mount share one style id; re-injecting it restarts the
                   font request and flashes the fallback face. */
                if (!document.getElementById(fontStyleId)) {
                    injectThemeFonts(cfg, buildFileUrl, contentFolder, fontStyleId, fontDisplay);
                }
                var fontStack = defaultFontStack(cfg, fontStyleId);

                var itemCfg = (cfg && cfg.itemConfig) || {};
                var menuCfg = (cfg && cfg.menuConfig) || {};
                var statusCfg = (cfg && cfg.statusConfig) || {};
                var settingCfg = (cfg && cfg.settingConfig) || {};
                var dialogCfg = (cfg && cfg.dialogConfig) || {};
                var playerCfg = (cfg && cfg.playerConfig) || {};

                var previewOpts = {
                    mode: mode,
                    deviceMode: normalizeDeviceMode(opts.deviceMode, cfg.homePageConfig || {}, mode),
                    showLegacyHome: opts.showLegacyHome === true,
                    showUnimplementedHome: opts.showUnimplementedHome === true
                };

                var colors = buildColors(itemCfg, menuCfg, statusCfg, cfg, catalogFolder);
                var bgMerged = mergeItemBackgrounds(cfg, buildFileUrl, contentFolder);
                var itemBackgroundStyle = bgMerged.itemBackgroundStyle;
                var itemSelectedBackgroundStyle = bgMerged.itemSelectedBackgroundStyle;

                /* Authentic Android .9.png 9-patch decoding for itemSelectedBackground. */
                var selBgRaw = itemCfg.itemSelectedBackground || menuCfg.menuItemSelectedBackground || '';
                if (isNinePatchCandidate(itemCfg, selBgRaw)) {
                    var selBgUrl = buildFileUrl(contentFolder, selBgRaw);
                    var npInfo = requestNinePatch(selBgUrl, function (parsed) {
                        var npCss = ninePatchCssStyle(parsed);
                        if (npCss && !cleanedUp) {
                            itemSelectedBackgroundStyle = npCss;
                            paintKeepingScrollQuietly();
                        }
                    });
                    if (npInfo && npInfo.valid) {
                        var readyCss = ninePatchCssStyle(npInfo);
                        if (readyCss) itemSelectedBackgroundStyle = readyCss;
                    }
                }

                var itemRightArrowUrl = itemCfg.itemRightArrow
                    ? buildFileUrl(contentFolder, itemCfg.itemRightArrow)
                    : '';
                if (itemRightArrowUrl && isPreviewMode) {
                    itemRightArrowUrl = previewAssetUrl(itemRightArrowUrl, 'png');
                }

                var statusH = statusBarHeightPx(cfg);
                var desktopMaskUrl = cfg.desktopMask ? buildFileUrl(contentFolder, cfg.desktopMask) : '';
                var settingMaskUrl = settingCfg.settingMask
                    ? buildFileUrl(contentFolder, settingCfg.settingMask)
                    : '';

                var homeItems = buildHomeItems(cfg.homePageConfig || {}, settingCfg, previewOpts);
                var folderIconFile = (cfg.fileConfig && cfg.fileConfig.folderIcon) || '';
                var folderIconUrl = folderIconFile
                    ? buildFileUrl(contentFolder, folderIconFile)
                    : '';
                var musicIconFile = (cfg.fileConfig && cfg.fileConfig.musicIcon) || '';
                var musicIconUrl = musicIconFile
                    ? buildFileUrl(contentFolder, musicIconFile)
                    : '';

                function settingsItemsForView(viewId) {
                    var cat = '';
                    if (viewId === 'musicSettings') cat = 'musicSettings';
                    else if (String(viewId || '').indexOf('settingsCat_') === 0) {
                        cat = String(viewId).slice('settingsCat_'.length);
                    }
                    return buildSettingsItems(cfg, buildFileUrl, contentFolder, sim, {
                        mode: previewOpts.mode,
                        deviceMode: previewOpts.deviceMode,
                        category: cat
                    });
                }

                function isSettingsListView(viewId) {
                    return (
                        viewId === 'settings' ||
                        viewId === 'musicSettings' ||
                        String(viewId || '').indexOf('settingsCat_') === 0
                    );
                }

                var root = document.createElement('div');
                root.className = 'y1-tp-root';

                var dev = document.createElement('div');
                dev.className = 'y1-tp-device' + (useFullDevice ? ' y1-tp-device--full' : '');

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
                var wheelCollapse = null;
                var stripToggle = null;
                var compactControls = opts.compactControls === true;
                var compactExpanded = compactControls && opts.compactExpanded === true;
                /* The Studio has no scroll-wheel simulation: four transport
                   buttons are enough, and the fifth toggles the options beside
                   the selected element instead of expanding a wheel. */
                var hideWheel = opts.hideWheel === true;
                var controlStrip = null;
                var wheelScrollOpts = { passive: false };
                if (useFullDevice && compactControls) {
                    dev.classList.add('y1-tp-controls-collapsed');
                    if (compactExpanded && !hideWheel) dev.classList.add('is-expanded');
                    controlStrip = document.createElement('div');
                    controlStrip.className = 'y1-tp-control-strip';
                    controlStrip.setAttribute('role', 'group');
                    controlStrip.setAttribute('aria-label', 'Player controls');
                    controlStrip.innerHTML =
                        '<button type="button" class="y1-tp-strip-btn" data-strip-act="prev" aria-label="Previous" title="Previous">\u2191</button>' +
                        '<button type="button" class="y1-tp-strip-btn" data-strip-act="next" aria-label="Next" title="Next">\u2193</button>' +
                        '<button type="button" class="y1-tp-strip-btn y1-tp-strip-btn--wide" data-strip-act="center" aria-label="Select" title="Select">Select</button>' +
                        '<button type="button" class="y1-tp-strip-btn" data-strip-act="menu" aria-label="Back" title="Back">\u21A9</button>' +
                        (hideWheel
                            ? '<button type="button" class="y1-tp-strip-toggle" data-strip-toggle aria-label="Show or hide selection options" title="Show or hide selection options" aria-expanded="false">\u2699</button>'
                            : '<button type="button" class="y1-tp-strip-toggle" data-strip-toggle aria-label="Show scroll wheel" aria-expanded="false" title="Show scroll wheel">\u2304</button>');
                    dev.appendChild(controlStrip);
                    stripToggle = controlStrip.querySelector('[data-strip-toggle]');
                }
                if (useFullDevice && !hideWheel) {
                    wheel = document.createElement('div');
                    wheel.className = 'y1-tp-wheel y1-tp-clickwheel';
                    wheel.innerHTML =
                        '<button type="button" class="y1-tp-cw y1-tp-cw--menu" data-y1act="menu" title="Back">BACK</button>' +
                        '<button type="button" class="y1-tp-cw y1-tp-cw--prev" data-y1act="prev" title="Previous" aria-label="Previous">\u23EE</button>' +
                        '<button type="button" class="y1-tp-cw y1-tp-cw--next" data-y1act="next" title="Next" aria-label="Next">\u23ED</button>' +
                        '<button type="button" class="y1-tp-cw y1-tp-cw--play" data-y1act="play" title="Play / Pause" aria-label="Play Pause">\u23EF</button>' +
                        '<button type="button" class="y1-tp-cw y1-tp-cw--center" data-y1act="center" title="Select" aria-label="Select"></button>';
                    dev.appendChild(wheel);
                    if (typeof styleClickwheelFromTheme === 'function') {
                        styleClickwheelFromTheme(wheel, colors, itemSelectedBackgroundStyle);
                    }
                    if (suppressDeviceInput && wheel) {
                        wheel.style.pointerEvents = 'none';
                    }
                }
                if (useFullDevice && compactControls && controlStrip) {
                    var setCompactExpanded = null;
                    if (!hideWheel) {
                        wheelCollapse = document.createElement('button');
                        wheelCollapse.type = 'button';
                        wheelCollapse.className = 'y1-tp-wheel-collapse';
                        wheelCollapse.setAttribute('aria-label', 'Collapse scroll wheel');
                        wheelCollapse.setAttribute('title', 'Collapse scroll wheel');
                        wheelCollapse.innerHTML = '<span aria-hidden="true">\u2303</span><span>Hide wheel</span>';
                        wheelCollapse.hidden = !compactExpanded;
                        dev.appendChild(wheelCollapse);

                        setCompactExpanded = function (expanded, moveFocus) {
                            compactExpanded = expanded === true;
                            dev.classList.toggle('is-expanded', compactExpanded);
                            dev.setAttribute('data-compact-mode', compactExpanded ? 'wheel' : 'strip');
                            controlStrip.hidden = compactExpanded;
                            controlStrip.setAttribute('aria-hidden', compactExpanded ? 'true' : 'false');
                            if (wheel) {
                                wheel.hidden = !compactExpanded;
                                wheel.setAttribute('aria-hidden', compactExpanded ? 'false' : 'true');
                            }
                            if (stripToggle) {
                                stripToggle.setAttribute('aria-expanded', compactExpanded ? 'true' : 'false');
                                stripToggle.setAttribute('aria-label', compactExpanded ? 'Hide scroll wheel' : 'Show scroll wheel');
                                stripToggle.setAttribute('title', compactExpanded ? 'Hide scroll wheel' : 'Show scroll wheel');
                                stripToggle.textContent = compactExpanded ? '\u2303' : '\u2304';
                            }
                            wheelCollapse.hidden = !compactExpanded;
                            if (typeof opts.onCompactChange === 'function') {
                                try {
                                    opts.onCompactChange(compactExpanded);
                                } catch (e) {}
                            }
                            if (moveFocus) {
                                try {
                                    (compactExpanded ? wheelCollapse : stripToggle).focus({ preventScroll: true });
                                } catch (e) {}
                            }
                        };
                        setCompactExpanded(compactExpanded, false);
                        wheelCollapse.addEventListener('click', function () {
                            setCompactExpanded(false, true);
                        });
                    } else {
                        dev.setAttribute('data-compact-mode', 'strip');
                    }

                    var stripActions = { prev: 'ArrowUp', next: 'ArrowDown', center: 'Enter', menu: 'Escape' };
                    controlStrip.addEventListener('keydown', function (event) {
                        event.stopPropagation();
                    });
                    controlStrip.addEventListener('click', function (event) {
                        var action = event.target && event.target.closest && event.target.closest('[data-strip-act]');
                        var toggle = event.target && event.target.closest && event.target.closest('[data-strip-toggle]');
                        if (toggle) {
                            if (hideWheel) {
                                var stillOpen = false;
                                if (typeof opts.onOptionsToggle === 'function') {
                                    try {
                                        stillOpen = opts.onOptionsToggle() === true;
                                    } catch (e) {}
                                }
                                if (stripToggle) {
                                    stripToggle.setAttribute('aria-expanded', stillOpen ? 'true' : 'false');
                                    stripToggle.classList.toggle('is-active', stillOpen);
                                }
                                return;
                            }
                            if (setCompactExpanded) setCompactExpanded(!compactExpanded, true);
                            return;
                        }
                        if (!action) return;
                        var key = stripActions[action.getAttribute('data-strip-act')];
                        if (!key) return;
                        event.preventDefault();
                        dev.dispatchEvent(new KeyboardEvent('keydown', { key: key, bubbles: true }));
                    });
                    if (suppressDeviceInput) {
                        controlStrip.style.pointerEvents = 'none';
                        if (wheelCollapse) wheelCollapse.style.pointerEvents = 'none';
                    }
                }

                root.appendChild(dev);
                container.appendChild(root);

                function updateScale() {
                    var vw = viewport.clientWidth || 1;
                    var vh = viewport.clientHeight || 1;
                    /* Cover the viewport (4:3) so the 480×360 stage always fills the preview; letterboxing was leaving black bars. */
                    var s = Math.max(vw / W, vh / H);
                    if (!(s > 0) || !isFinite(s)) s = 1;
                    var sw = W * s;
                    var sh = H * s;
                    scaleWrap.style.left = (vw - sw) / 2 + 'px';
                    scaleWrap.style.top = (vh - sh) / 2 + 'px';
                    scaleWrap.style.transform = 'scale(' + s + ')';
                }

                var ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(updateScale) : null;
                if (ro) ro.observe(viewport);
                else updateScale();

                function getViewTitle() {
                    return previewText(VIEW_TITLES[sim.themeViewId] || 'Home');
                }

                var alphaProbeCanvas = null;
                var alphaCache = Object.create(null);
                var ALPHA_CACHE_MAX_PIXELS = 1000000;

                function parseObjectPosRatio(token) {
                    var s = String(token || '').trim().toLowerCase();
                    if (s === 'left' || s === 'top') return 0;
                    if (s === 'right' || s === 'bottom') return 1;
                    if (s === 'center') return 0.5;
                    var pct = /^(-?\d+(?:\.\d+)?)%$/.exec(s);
                    if (pct) return Math.max(0, Math.min(1, parseFloat(pct[1]) / 100));
                    return 0.5;
                }

                function getCachedAlphaGrid(img) {
                    var nw = img.naturalWidth | 0;
                    var nh = img.naturalHeight | 0;
                    if (nw <= 0 || nh <= 0 || nw * nh > ALPHA_CACHE_MAX_PIXELS) return null;
                    var src = img.currentSrc || img.getAttribute('src') || '';
                    if (!src) return null;
                    var key = src + '|' + nw + 'x' + nh;
                    if (Object.prototype.hasOwnProperty.call(alphaCache, key)) {
                        return alphaCache[key];
                    }
                    try {
                        var c = document.createElement('canvas');
                        c.width = nw;
                        c.height = nh;
                        var ctx = c.getContext('2d', { willReadFrequently: true });
                        if (!ctx) return null;
                        ctx.clearRect(0, 0, nw, nh);
                        ctx.drawImage(img, 0, 0, nw, nh);
                        var rgba = ctx.getImageData(0, 0, nw, nh).data;
                        var len = nw * nh;
                        var alpha = new Uint8Array(len);
                        for (var i = 0; i < len; i++) {
                            alpha[i] = rgba[i * 4 + 3];
                        }
                        var entry = { w: nw, h: nh, alpha: alpha, tainted: false };
                        alphaCache[key] = entry;
                        return entry;
                    } catch (eTaint) {
                        var taintedEntry = { w: nw, h: nh, alpha: null, tainted: true };
                        alphaCache[key] = taintedEntry;
                        return taintedEntry;
                    }
                }

                /* Sample the exact rendered source pixel alpha under (clientX, clientY)
                   for any <img> in the preview, respecting CSS object-fit & object-position.
                   Returns 0 for 100% transparent or out-of-bounds pixels, > 0 for visible
                   pixels, or null if cross-origin canvas read is blocked. */
                function imageAlphaAtPoint(img, clientX, clientY) {
                    if (!img || img.tagName !== 'IMG') return null;
                    if (
                        img.style &&
                        (img.style.display === 'none' ||
                            img.style.visibility === 'hidden' ||
                            img.style.opacity === '0')
                    ) {
                        return 0;
                    }
                    if (!img.complete || !img.naturalWidth || !img.naturalHeight) return 0;
                    var rect = img.getBoundingClientRect();
                    if (!rect.width || !rect.height) return 0;
                    if (
                        clientX < rect.left ||
                        clientX > rect.right ||
                        clientY < rect.top ||
                        clientY > rect.bottom
                    ) {
                        return 0;
                    }
                    var nw = img.naturalWidth;
                    var nh = img.naturalHeight;
                    var cs = global.getComputedStyle ? global.getComputedStyle(img) : null;
                    var fit = String((cs && cs.objectFit) || img.style.objectFit || 'fill').toLowerCase();
                    var posParts = String((cs && cs.objectPosition) || img.style.objectPosition || '50% 50%')
                        .trim()
                        .split(/\s+/);
                    var posX = parseObjectPosRatio(posParts[0]);
                    var posY = parseObjectPosRatio(posParts[1] != null ? posParts[1] : posParts[0]);

                    var sx;
                    var sy;
                    if (fit === 'cover') {
                        var covScale = Math.max(rect.width / nw, rect.height / nh);
                        var covOx = (rect.width - nw * covScale) * posX;
                        var covOy = (rect.height - nh * covScale) * posY;
                        sx = (clientX - rect.left - covOx) / covScale;
                        sy = (clientY - rect.top - covOy) / covScale;
                    } else if (fit === 'contain' || fit === 'scale-down') {
                        var conScale = Math.min(rect.width / nw, rect.height / nh);
                        if (fit === 'scale-down') conScale = Math.min(1, conScale);
                        var conOx = (rect.width - nw * conScale) * posX;
                        var conOy = (rect.height - nh * conScale) * posY;
                        sx = (clientX - rect.left - conOx) / conScale;
                        sy = (clientY - rect.top - conOy) / conScale;
                    } else if (fit === 'none') {
                        var noneOx = (rect.width - nw) * posX;
                        var noneOy = (rect.height - nh) * posY;
                        sx = clientX - rect.left - noneOx;
                        sy = clientY - rect.top - noneOy;
                    } else {
                        sx = ((clientX - rect.left) / rect.width) * nw;
                        sy = ((clientY - rect.top) / rect.height) * nh;
                    }

                    if (!isFinite(sx) || !isFinite(sy) || sx < 0 || sy < 0 || sx > nw || sy > nh) {
                        return 0;
                    }
                    var ix = Math.max(0, Math.min(nw - 1, Math.floor(sx)));
                    var iy = Math.max(0, Math.min(nh - 1, Math.floor(sy)));

                    var cached = getCachedAlphaGrid(img);
                    if (cached) {
                        if (cached.tainted) return null;
                        return cached.alpha[iy * cached.w + ix] / 255;
                    }

                    if (!alphaProbeCanvas) alphaProbeCanvas = document.createElement('canvas');
                    alphaProbeCanvas.width = 1;
                    alphaProbeCanvas.height = 1;
                    var ctx = alphaProbeCanvas.getContext('2d', { willReadFrequently: true });
                    if (!ctx) return null;
                    try {
                        ctx.clearRect(0, 0, 1, 1);
                        ctx.drawImage(img, ix, iy, 1, 1, 0, 0, 1, 1);
                        var data = ctx.getImageData(0, 0, 1, 1).data;
                        return data[3] / 255;
                    } catch (eTaint) {
                        return null;
                    }
                }

                /* Which of the two background layers is under the pointer? The
                   mask is only reachable through its visible (non-transparent)
                   pixels: where alpha === 0, the wallpaper shows through and
                   wins the click. */
                function maskAtPoint(clientX, clientY) {
                    var path = maskAssetPathForView(sim.themeViewId);
                    if (!path) return null;
                    var node = canvas.querySelector('.y1-tp-desktop-mask');
                    if (!node || !node.complete || !node.naturalWidth || !node.naturalHeight) return null;
                    var alpha = imageAlphaAtPoint(node, clientX, clientY);
                    if (alpha === null) return { path: path, alpha: null };
                    return { path: path, alpha: alpha };
                }

                var RIGHT_ICON_PATH_RE = /^(?:homePageConfig|settingConfig|fileConfig)\./;

                /* True when an <img> shows nothing at all: not loaded, a 1x1
                   placeholder, hidden by the art loader, or every pixel 100%
                   transparent. Unknown (cross-origin) pixels count as visible. */
                function isImageBlank(img) {
                    if (!img) return true;
                    if (!img.getAttribute('src')) return true;
                    if (!img.complete) return false;
                    var nw = img.naturalWidth | 0;
                    var nh = img.naturalHeight | 0;
                    if (nw <= 1 && nh <= 1) return true;
                    var grid = getCachedAlphaGrid(img);
                    if (!grid || grid.tainted || !grid.alpha) return false;
                    if (grid.blank === undefined) {
                        var blank = true;
                        for (var i = 0; i < grid.alpha.length; i++) {
                            if (grid.alpha[i] !== 0) {
                                blank = false;
                                break;
                            }
                        }
                        grid.blank = blank;
                    }
                    return grid.blank;
                }

                function blankRightIconAtPoint(clientX, clientY, cRect) {
                    var boxes = canvas.querySelectorAll('[data-theme-art-box]');
                    var scale = canvas.offsetWidth ? cRect.width / canvas.offsetWidth : 1;
                    for (var b = 0; b < boxes.length; b++) {
                        var box = boxes[b];
                        var path = box.getAttribute('data-theme-art-box') || '';
                        if (!RIGHT_ICON_PATH_RE.test(path)) continue;
                        if (box.style.display === 'none' || !box.offsetParent) continue;
                        var img = box.querySelector('img[data-theme-asset-path]');
                        if (!img || img.style.display === 'none') continue;
                        if ((img.getAttribute('data-theme-asset-path') || '') !== path) continue;
                        if (!isImageBlank(img)) continue;
                        /* A blank image collapses to (near) nothing, so hit-test
                           the slot the artwork would fill: a square as wide as
                           the art may grow, centred in its box from the top. */
                        var boxRect = box.getBoundingClientRect();
                        var boxW = box.offsetWidth || boxRect.width / scale;
                        var cap = parseFloat(img.style.maxWidth);
                        if (!isFinite(cap) || /%$/.test(img.style.maxWidth || '')) cap = boxW;
                        var side = Math.min(boxW, cap) * scale;
                        if (!side) continue;
                        var left = boxRect.left + (boxRect.width - side) / 2;
                        var top = boxRect.top;
                        if (box.offsetHeight >= Math.min(boxW, cap)) {
                            top = boxRect.top + (boxRect.height - side) / 2;
                        }
                        if (clientX < left || clientX > left + side || clientY < top || clientY > top + side) {
                            continue;
                        }
                        return {
                            path: path,
                            node: box,
                            inMenuRow: false,
                            isRowImage: false,
                            isRightIcon: true,
                            rowIconPath: '',
                            isScreenLayer: false,
                            alpha: 1
                        };
                    }
                    return null;
                }

                /* The selected row's arrow: hit anywhere inside its box (the
                   wrapper spans the row height, so it is easy to tap), as long as
                   the row itself is under the pointer (not scrolled/clipped). */
                function selectionArrowAtPoint(clientX, clientY, stack) {
                    var arrows = canvas.querySelectorAll('[data-theme-asset-path="itemConfig.itemRightArrow"]');
                    for (var a = 0; a < arrows.length; a++) {
                        var arrowNode = arrows[a];
                        var wrap = arrowNode.parentNode;
                        if (!wrap || !wrap.offsetParent || wrap.style.display === 'none') continue;
                        var row = arrowNode.closest('.y1-tp-row');
                        if (row && stack.indexOf(row) === -1 && stack.indexOf(wrap) === -1) continue;
                        var r = wrap.getBoundingClientRect();
                        var ir = arrowNode.getBoundingClientRect();
                        var left = ir.width >= 1 ? Math.min(r.left, ir.left) : r.left;
                        var right = ir.width >= 1 ? Math.max(r.right, ir.right) : r.right;
                        var top = ir.height >= 1 ? Math.min(r.top, ir.top) : r.top;
                        var bottom = ir.height >= 1 ? Math.max(r.bottom, ir.bottom) : r.bottom;
                        if (right - left < 1 || bottom - top < 1) continue;
                        if (clientX < left || clientX > right || clientY < top || clientY > bottom) continue;
                        return {
                            path: 'itemConfig.itemRightArrow',
                            node: arrowNode,
                            inMenuRow: !!row,
                            isRowImage: !!row,
                            rowIconPath: row ? row.getAttribute('data-theme-row-icon-path') || '' : '',
                            isScreenLayer: false,
                            alpha: 1
                        };
                    }
                    return null;
                }

                /* Layered, alpha-aware hit-testing for Theme Studio:
                   walk every asset under (clientX, clientY) from front to back.
                   Clicking a 100% transparent pixel (alpha === 0) passes right
                   through to the visible asset behind it (e.g. icon corner ->
                   mask -> wallpaper, or transparent mask area -> wallpaper). */
                function assetAtPoint(clientX, clientY) {
                    var cRect = canvas.getBoundingClientRect();
                    if (!cRect.width || !cRect.height) return null;
                    if (
                        clientX < cRect.left ||
                        clientX > cRect.right ||
                        clientY < cRect.top ||
                        clientY > cRect.bottom
                    ) {
                        return null;
                    }

                    /* A blank right-hand pane icon (transparent placeholder or an
                       image with no visible pixels) has nothing to click through
                       to by mistake, so its whole artwork slot stays clickable
                       and the author can replace it. Icons with visible pixels
                       keep the normal alpha pass-through below. */
                    var stack =
                        typeof document.elementsFromPoint === 'function'
                            ? document.elementsFromPoint(clientX, clientY)
                            : [];
                    /* An open dialog sits above everything, so it keeps its clicks. */
                    var dialogOnTop = !!sim.dialogVisible;
                    if (!dialogOnTop) {
                        var blankRightIcon = blankRightIconAtPoint(clientX, clientY, cRect);
                        if (blankRightIcon) return blankRightIcon;
                    }

                    /* The item selection arrow is small, so its whole box is the
                       target, even over transparent pixels or a blank placeholder
                       (which the loader hides, so it is never in the stack). */
                    var arrowHit = dialogOnTop ? null : selectionArrowAtPoint(clientX, clientY, stack);
                    if (arrowHit) return arrowHit;

                    var seen = [];
                    var candidates = [];

                    for (var i = 0; i < stack.length; i++) {
                        var hitEl = stack[i];
                        if (!hitEl || !canvas.contains(hitEl)) continue;
                        var tagged =
                            hitEl.hasAttribute && hitEl.hasAttribute('data-theme-asset-path')
                                ? hitEl
                                : hitEl.closest
                                  ? hitEl.closest('[data-theme-asset-path]')
                                  : null;
                        if (!tagged || !canvas.contains(tagged)) continue;
                        if (seen.indexOf(tagged) !== -1) continue;
                        seen.push(tagged);
                        if (
                            tagged.classList &&
                            (tagged.classList.contains('y1-tp-desktop-mask') ||
                                tagged.classList.contains('y1-tp-wallpaper'))
                        ) {
                            continue;
                        }
                        candidates.push(tagged);
                    }

                    for (var ci = 0; ci < candidates.length; ci++) {
                        var node = candidates[ci];
                        var path = node.getAttribute('data-theme-asset-path') || '';
                        if (!path) continue;
                        if (
                            node.style &&
                            (node.style.display === 'none' ||
                                node.style.visibility === 'hidden' ||
                                node.style.opacity === '0')
                        ) {
                            continue;
                        }

                        if (node.tagName === 'IMG') {
                            var alpha = imageAlphaAtPoint(node, clientX, clientY);
                            if (alpha === 0) continue;
                            var imgRow = node.closest('.y1-tp-row');
                            return {
                                path: path,
                                node: node,
                                inMenuRow: !!imgRow,
                                isRowImage: !!imgRow,
                                isRightIcon: !imgRow && /^(?:homePageConfig|settingConfig|fileConfig)\./.test(path),
                                rowIconPath: imgRow ? imgRow.getAttribute('data-theme-row-icon-path') || '' : '',
                                isScreenLayer: false,
                                alpha: alpha == null ? 1 : alpha
                            };
                        }

                        if (node.classList && node.classList.contains('y1-tp-status')) {
                            /* Empty status bar space (away from the title, battery
                               percentage, and status icons) always passes through to
                               the screen's mask / wallpaper alpha hit-test below. */
                            continue;
                        }

                        var rowEl = node.closest('.y1-tp-row');
                        var inMenu =
                            !!rowEl ||
                            (node.tagName !== 'IMG' &&
                                !node.classList.contains('y1-tp-wallpaper') &&
                                !node.closest('.y1-tp-status') &&
                                !/^dialogConfig\./.test(path));
                        var rowIconPath =
                            (rowEl && rowEl.getAttribute('data-theme-row-icon-path')) ||
                            (path !== 'itemConfig.itemSelectedBackground' &&
                            /^(?:homePageConfig|settingConfig|fileConfig)\./.test(path)
                                ? path
                                : '');
                        return {
                            path: path,
                            node: node,
                            inMenuRow: inMenu,
                            isMenuItemText: inMenu,
                            isSelectedRow: rowEl ? rowEl.classList.contains('is-selected') : true,
                            rowIconPath: rowIconPath,
                            isScreenLayer: false,
                            alpha: 1
                        };
                    }

                    var maskHit = maskAtPoint(clientX, clientY);
                    if (maskHit && (maskHit.alpha == null || maskHit.alpha > 0)) {
                        return {
                            path: maskHit.path,
                            node: canvas.querySelector('.y1-tp-desktop-mask'),
                            inMenuRow: false,
                            isScreenLayer: true,
                            alpha: maskHit.alpha == null ? 1 : maskHit.alpha
                        };
                    }

                    var wallPath = wallpaperAssetPathForView(cfg, sim.themeViewId);
                    if (wallPath) {
                        return {
                            path: wallPath,
                            node: canvas.querySelector('.y1-tp-wallpaper'),
                            inMenuRow: false,
                            isScreenLayer: true,
                            alpha: 1
                        };
                    }

                    return null;
                }

                /* Per-mount scroll & live-list state so multiple previews or
                   thumbnail capture passes never clobber another mount's offset,
                   and row hover/scroll updates the DOM in place without tearing
                   down wallpaper, masks, status bar, or menu rows. */
                var scrollState = {
                    override: null,
                    lastY: 0,
                    lastViewId: '',
                    animate: true
                };
                var activeMenuList = null;
                var activeRightPanel = null;
                var eagerImages = !isPreviewMode;
                var cleanedUp = false;
                var preloadedArt = [];

                function bindReusableArtImg(im) {
                    im.decoding = eagerImages ? 'sync' : 'async';
                    try {
                        im.loading = eagerImages ? 'eager' : 'lazy';
                    } catch (e) {}
                    im._y1ReqId = 0;
                    im.addEventListener('error', function () {
                        var fallback = im._y1FallbackUrl;
                        if (fallback && im.src !== fallback) {
                            im._y1FallbackUrl = '';
                            im.src = fallback;
                            return;
                        }
                        im.style.opacity = '0';
                        im.style.visibility = 'hidden';
                    });
                    im.addEventListener('load', function () {
                        try {
                            if (im.naturalWidth <= 1 && im.naturalHeight <= 1) {
                                im.style.opacity = '0';
                                im.style.visibility = 'hidden';
                            } else {
                                im.style.opacity = '';
                                im.style.visibility = '';
                            }
                        } catch (e) {}
                    });
                }

                function setReusableArtSrc(im, primaryUrl, fallbackUrl) {
                    if (!im) return;
                    im._y1FallbackUrl = fallbackUrl && fallbackUrl !== primaryUrl ? fallbackUrl : '';
                    if (!primaryUrl) {
                        im._y1CurrentUrl = '';
                        im.style.opacity = '0';
                        im.style.visibility = 'hidden';
                        try {
                            im.removeAttribute('src');
                        } catch (e) {}
                        return;
                    }
                    if (im._y1CurrentUrl === primaryUrl && im.getAttribute('src')) {
                        if (im.complete && im.naturalWidth > 1 && im.naturalHeight > 1) {
                            im.style.opacity = '';
                            im.style.visibility = '';
                        }
                        return;
                    }
                    im._y1CurrentUrl = primaryUrl;
                    im.style.opacity = '';
                    im.style.visibility = '';
                    im.src = primaryUrl;
                }

                function warmInteractiveArtwork() {
                    if (!eagerImages) return;
                    var seen = Object.create(null);
                    var urls = [];
                    function pushUrl(u) {
                        if (!u || seen[u]) return;
                        seen[u] = 1;
                        urls.push(u);
                    }
                    for (var i = 0; i < homeItems.length; i++) {
                        if (homeItems[i] && homeItems[i].iconFile) {
                            pushUrl(buildFileUrl(contentFolder, homeItems[i].iconFile));
                        }
                    }
                    if (itemRightArrowUrl) pushUrl(itemRightArrowUrl);
                    if (desktopMaskUrl) pushUrl(desktopMaskUrl);
                    if (settingMaskUrl) pushUrl(settingMaskUrl);
                    if (folderIconUrl) pushUrl(folderIconUrl);
                    for (var u = 0; u < urls.length; u++) {
                        try {
                            var img = new Image();
                            img.decoding = 'async';
                            img.src = urls[u];
                            preloadedArt.push(img);
                        } catch (e) {}
                    }
                }
                warmInteractiveArtwork();

                function updateRightPanelInPlace() {
                    if (!activeRightPanel) return;
                    if (activeRightPanel.kind === 'home') {
                        var sel = homeItems[sim.themeSelectedIndex];
                        var rawIu = sel && sel.iconFile ? buildFileUrl(contentFolder, sel.iconFile) : '';
                        var previewIu = rawIu
                            ? isPreviewMode
                                ? previewAssetUrl(rawIu, 'png')
                                : rawIu
                            : '';
                        var tile = activeRightPanel.tile;
                        var im = activeRightPanel.img;
                        var nativeBadge = tile._y1NativeBadge || null;
                        if (nativeBadge) nativeBadge.style.display = 'none';
                        if (previewIu) {
                            tile.style.display = 'flex';
                            if (sel.assetPath) {
                                tile.setAttribute('data-theme-art-box', sel.assetPath);
                                im.setAttribute('data-theme-asset-path', sel.assetPath);
                            } else {
                                tile.removeAttribute('data-theme-art-box');
                                im.removeAttribute('data-theme-asset-path');
                            }
                            im.alt = sel.label || '';
                            setReusableArtSrc(im, previewIu, rawIu);
                        } else if (sel && sel.assetPath) {
                            tile.style.display = 'flex';
                            tile.setAttribute('data-theme-art-box', sel.assetPath);
                            im.setAttribute('data-theme-asset-path', sel.assetPath);
                            im.alt = sel.label || '';
                            setReusableArtSrc(im, '', '');
                        } else {
                            tile.style.display = 'none';
                            tile.removeAttribute('data-theme-art-box');
                            im.removeAttribute('data-theme-asset-path');
                            setReusableArtSrc(im, '', '');
                        }
                        if (cfg && cfg.showNativeIcon === true && sel && (!sel.iconFile || !isUsableHomeIcon(sel.iconFile))) {
                            if (!nativeBadge) {
                                nativeBadge = document.createElement('div');
                                nativeBadge.style.cssText =
                                    'width:128px;height:128px;border-radius:26px;background:rgba(255,255,255,0.14);border:2px solid rgba(255,255,255,0.28);display:flex;align-items:center;justify-content:center;font-size:48px;color:' +
                                    colors.text_primary +
                                    ';pointer-events:none;';
                                tile._y1NativeBadge = nativeBadge;
                                tile.appendChild(nativeBadge);
                            }
                            var glyphMap = {
                                nowPlaying: '\u266B',
                                music: '\uD83C\uDFB5',
                                video: '\uD83C\uDFAC',
                                audiobooks: '\uD83C\uDFA7',
                                ebook: '\uD83D\uDCD6',
                                photos: '\uD83D\uDDBC',
                                fm: '\uD83D\uDCFB',
                                bluetooth: '\uD83D\uDD35',
                                fileManager: '\uD83D\uDCC2',
                                settings: '\u2699',
                                shuffleQuick: '\uD83D\uDD00',
                                calendar: '\uD83D\uDCC5',
                                calculator: '\uD83E\uDDEE'
                            };
                            nativeBadge.textContent = glyphMap[sel.id] || '\u25A1';
                            nativeBadge.style.display = 'flex';
                        }
                        return;
                    }
                    if (activeRightPanel.kind === 'settings') {
                        var sItem = (activeMenuList && activeMenuList.items && activeMenuList.items[sim.themeSelectedIndex]) || {};
                        var isAbout = sItem.id === 'about';
                        activeRightPanel.titleEl.textContent = sItem.label || '';
                        if (sItem.assetPath) {
                            activeRightPanel.imgBox.setAttribute('data-theme-art-box', sItem.assetPath);
                        } else {
                            activeRightPanel.imgBox.removeAttribute('data-theme-art-box');
                        }
                        activeRightPanel.aboutWrap.style.display = isAbout ? 'flex' : 'none';
                        if (!isAbout && sItem.iconUrl) {
                            activeRightPanel.img.style.display = 'block';
                            activeRightPanel.img.alt = sItem.label || '';
                            if (sItem.assetPath) {
                                activeRightPanel.img.setAttribute('data-theme-asset-path', sItem.assetPath);
                            } else {
                                activeRightPanel.img.removeAttribute('data-theme-asset-path');
                            }
                            setReusableArtSrc(activeRightPanel.img, sItem.iconUrl, '');
                        } else {
                            activeRightPanel.img.style.display = 'none';
                            activeRightPanel.img.removeAttribute('data-theme-asset-path');
                            setReusableArtSrc(activeRightPanel.img, '', '');
                        }
                        if (sItem.valueText && !isAbout) {
                            activeRightPanel.valueEl.style.display = 'block';
                            activeRightPanel.valueEl.textContent = String(sItem.valueText);
                        } else {
                            activeRightPanel.valueEl.style.display = 'none';
                            activeRightPanel.valueEl.textContent = '';
                        }
                        return;
                    }
                    if (activeRightPanel.kind === 'settingsEqualizer') {
                        var eqItem = (activeRightPanel.items && activeRightPanel.items[sim.themeSelectedIndex]) || {};
                        activeRightPanel.labelEl.textContent = eqItem.label || '';
                        if (eqItem.iconUrl) {
                            activeRightPanel.imgBox.style.display = 'flex';
                            if (eqItem.assetPath) {
                                activeRightPanel.imgBox.setAttribute('data-theme-art-box', eqItem.assetPath);
                                activeRightPanel.img.setAttribute('data-theme-asset-path', eqItem.assetPath);
                            } else {
                                activeRightPanel.imgBox.removeAttribute('data-theme-art-box');
                                activeRightPanel.img.removeAttribute('data-theme-asset-path');
                            }
                            activeRightPanel.img.alt = eqItem.label || '';
                            setReusableArtSrc(activeRightPanel.img, eqItem.iconUrl, '');
                        } else {
                            activeRightPanel.imgBox.style.display = 'none';
                            activeRightPanel.imgBox.removeAttribute('data-theme-art-box');
                            activeRightPanel.img.removeAttribute('data-theme-asset-path');
                            setReusableArtSrc(activeRightPanel.img, '', '');
                        }
                    }
                }

                function updateSelectionInPlace(preserveScroll) {
                    if (
                        !activeMenuList ||
                        activeMenuList.viewId !== sim.themeViewId ||
                        sim.dialogVisible ||
                        !activeMenuList.outer ||
                        !activeMenuList.outer.isConnected
                    ) {
                        return false;
                    }
                    var list = activeMenuList;
                    var nextIndex = sim.themeSelectedIndex | 0;
                    if (nextIndex < 0 || nextIndex >= list.rows.length) return false;
                    var prevIndex = list.selectedIndex;
                    if (prevIndex !== nextIndex) {
                        if (prevIndex >= 0 && prevIndex < list.rows.length) {
                            applyMenuRowSelection(list.rows[prevIndex], list.items[prevIndex], false, list.rowCtx);
                        }
                        applyMenuRowSelection(list.rows[nextIndex], list.items[nextIndex], true, list.rowCtx);
                        list.selectedIndex = nextIndex;
                    }
                    if (!preserveScroll) {
                        var nextY = menuScrollOffset(nextIndex, list.items.length, list.itemHeight, list.visibleHeight);
                        if (nextY !== scrollState.lastY) {
                            list.inner.style.transition =
                                scrollState.animate !== false
                                    ? 'transform 160ms cubic-bezier(0.22, 0.8, 0.35, 1)'
                                    : 'none';
                            list.inner.style.transform = 'translateY(-' + nextY + 'px)';
                            scrollState.lastY = nextY;
                        }
                    }
                    updateRightPanelInPlace();
                    return true;
                }

                function paint() {
                    if (cleanedUp) return;
                    if (sim.themeViewId !== scrollState.lastViewId) {
                        scrollState.lastViewId = sim.themeViewId;
                        scrollState.lastY = 0;
                        scrollState.override = null;
                    }
                    activeMenuList = null;
                    activeRightPanel = null;
                    canvas.innerHTML = '';
                    var rawBgUrl = backgroundUrlForView(cfg, sim.themeViewId, buildFileUrl, contentFolder, false);
                    var previewBgUrl = (mode === 'gallery' || mode === 'menu') ? backgroundUrlForView(cfg, sim.themeViewId, buildFileUrl, contentFolder, true) : rawBgUrl;
                    var activeBg = previewBgUrl || rawBgUrl;
                    canvas.style.backgroundColor = 'transparent';
                    var wall = document.createElement('div');
                    wall.className = 'y1-tp-wallpaper';
                    var wallAssetPath = wallpaperAssetPathForView(cfg, sim.themeViewId);
                    if (wallAssetPath) wall.setAttribute('data-theme-asset-path', wallAssetPath);
                    wall.style.cssText =
                        'position:absolute;left:0;top:0;width:' +
                        W +
                        'px;height:' +
                        H +
                        'px;z-index:0;pointer-events:none;background-color:#000;' +
                        (activeBg
                            ? 'background-image:url("' +
                              activeBg.replace(/"/g, '%22') +
                              '");background-size:cover;background-position:center;background-repeat:no-repeat;'
                            : '');
                    if (previewBgUrl) {
                        try {
                            var preWall = new Image();
                            preWall.fetchPriority = 'high';
                            preWall.src = previewBgUrl;
                        } catch (_) {}
                    }
                    if (previewBgUrl && previewBgUrl !== rawBgUrl) {
                        var bgFallback = new Image();
                        bgFallback.onerror = function () {
                            wall.style.backgroundImage = 'url("' + rawBgUrl.replace(/"/g, '%22') + '")';
                        };
                        bgFallback.src = previewBgUrl;
                    }
                    canvas.appendChild(wall);

                    var status = document.createElement('div');
                    status.className = 'y1-tp-status';
                    var isDarkPlayerView =
                        sim.themeViewId === 'nowPlaying' ||
                        sim.themeViewId === 'photosViewer' ||
                        sim.themeViewId === 'ebookReader';
                    var activeStatusText = isDarkPlayerView ? '#ffffff' : colors.status_text;
                    status.style.cssText =
                        'position:absolute;left:0;top:0;width:' +
                        W +
                        'px;height:' +
                        statusH +
                        'px;background-color:' +
                        (colors.status_bar_bg || 'rgba(0,0,0,0.25)') +
                        ';color:' +
                        activeStatusText +
                        ';display:flex;align-items:center;padding-left:14px;padding-right:14px;justify-content:space-between;z-index:20;font-size:20px;font-weight:700;box-sizing:border-box;';
                    var leftTitle = document.createElement('span');
                    leftTitle.textContent = getViewTitle();
                    tagFontHotspot(leftTitle, cfg, 'This screen title');
                    tagStatusTextHotspot(leftTitle, 'This screen title');
                    status.appendChild(leftTitle);

                    var right = document.createElement('div');
                    right.style.cssText = 'display:flex;align-items:center;gap:6px;';
                    /* Headset and Bluetooth are ordinary status icons in the
                       theme, so they obey the same rules as the play badge: the
                       state picks the file, and the file is the thing you edit. */
                    if (sim.headsetState) {
                        var headsetKey = sim.headsetState === 'withoutMic' ? 'headsetWithoutMic' : 'headsetWithMic';
                        appendStatusIcon(right, statusCfg, headsetKey, buildFileUrl, contentFolder, mode);
                    }
                    if (sim.bluetoothState) {
                        var btKey =
                            sim.bluetoothState === 'connected'
                                ? 'blConnected'
                                : sim.bluetoothState === 'connecting'
                                  ? 'blConnecting'
                                  : 'blDisconnected';
                        appendStatusIcon(right, statusCfg, btKey, buildFileUrl, contentFolder, mode);
                    }
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
                            var rawPf = buildFileUrl(contentFolder, pf);
                            var prevPf = (mode === 'gallery' || mode === 'menu') ? previewAssetUrl(rawPf, 'png') : rawPf;
                            var pi = document.createElement('img');
                            pi.src = prevPf;
                            pi.alt = '';
                            if (prevPf !== rawPf) {
                                pi.onerror = function () {
                                    pi.onerror = null;
                                    pi.src = rawPf;
                                };
                            }
                            bindPreviewImgFallback(pi, { eager: eagerImages });
                            pi.style.cssText = 'height:25px;width:25px;object-fit:contain;display:block;';
                            pi.setAttribute('data-theme-asset-path', 'statusConfig.' + pk);
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
                    var battKey = sim && sim.isCharging ? 'batteryCharging' : 'battery';
                    var battConfig = statusCfg[battKey];
                    var battPath = '';
                    if (Array.isArray(battConfig)) {
                        battPath = 'statusConfig.' + battKey + '.' + normalizedBatteryLevel(battLvl);
                    } else if (battConfig && typeof battConfig === 'object') {
                        battPath = 'statusConfig.' + battKey + '.' + normalizedBatteryLevel(battLvl);
                    } else if (battConfig) {
                        battPath = 'statusConfig.' + battKey;
                    }
                    if (battUrl) {
                        var rawBatt = battUrl;
                        var prevBatt = (mode === 'gallery' || mode === 'menu') ? previewAssetUrl(rawBatt, 'png') : rawBatt;
                        var bi = document.createElement('img');
                        bi.decoding = eagerImages ? 'sync' : 'async';
                        try {
                            bi.loading = eagerImages ? 'eager' : 'lazy';
                        } catch (e) {}
                        bi.src = prevBatt;
                        bi.alt = '';
                        bi.style.cssText = 'height:15px;width:auto;object-fit:contain;display:block;';
                        if (battPath) bi.setAttribute('data-theme-asset-path', battPath);
                        var pctSpan = document.createElement('span');
                        pctSpan.style.fontSize = '16px';
                        pctSpan.textContent = pct + '%';
                        tagFontHotspot(pctSpan, cfg, 'The battery figure');
                        tagStatusTextHotspot(pctSpan, 'The battery figure');
                        if (prevBatt !== rawBatt) {
                            bi.onerror = function () {
                                bi.onerror = function () {
                                    bi.style.display = 'none';
                                    if (pctSpan.parentNode) pctSpan.parentNode.removeChild(pctSpan);
                                    appendBatteryFallback(right, pct, colors.status_text, cfg);
                                };
                                bi.src = rawBatt;
                            };
                        } else {
                            bi.onerror = function () {
                                bi.onerror = null;
                                bi.style.display = 'none';
                                if (pctSpan.parentNode) pctSpan.parentNode.removeChild(pctSpan);
                                appendBatteryFallback(right, pct, colors.status_text, cfg);
                            };
                        }
                        right.appendChild(bi);
                        right.appendChild(pctSpan);
                    } else {
                        appendBatteryFallback(right, pct, colors.status_text, cfg);
                    }
                    status.appendChild(right);
                    canvas.appendChild(status);

                    var useSettingMask =
                        sim.themeViewId === 'settings' ||
                        sim.themeViewId === 'musicSettings' ||
                        sim.themeViewId.indexOf('settings') === 0;
                    var maskUrl =
                        sim.themeViewId === 'home' ? desktopMaskUrl : useSettingMask ? settingMaskUrl : '';
                    if (maskUrl) {
                        var mk = document.createElement('img');
                        mk.className = 'y1-tp-desktop-mask';
                        mk.decoding = eagerImages ? 'sync' : 'async';
                        try {
                            mk.loading = eagerImages ? 'eager' : 'lazy';
                        } catch (e) {}
                        mk.src = maskUrl;
                        mk.alt = '';
                        mk.setAttribute(
                            'data-theme-asset-path',
                            sim.themeViewId === 'home' ? 'desktopMask' : 'settingConfig.settingMask'
                        );
                        mk.addEventListener(
                            'error',
                            function () {
                                try {
                                    if (mk.parentNode) mk.parentNode.removeChild(mk);
                                } catch (eRm) {}
                            },
                            { once: true }
                        );
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
                        activeMenuList = appendMenuRows(menuBox, {
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
                            folderIconUrl: folderIconUrl,
                            musicIconUrl: musicIconUrl,
                            scrollState: scrollState,
                            eager: eagerImages
                        });
                        activeMenuList.viewId = 'home';
                        layer.appendChild(menuBox);

                        var maxPrevH = Math.max(40, H - HOME_PREVIEW_TOP_MARGIN - 8);
                        var tile = document.createElement('div');
                        tile.style.cssText =
                            'position:absolute;right:' +
                            HOME_PREVIEW_RIGHT_MARGIN +
                            'px;top:' +
                            HOME_PREVIEW_TOP_MARGIN +
                            'px;width:' +
                            HOME_PREVIEW_WIDTH +
                            'px;max-height:' +
                            maxPrevH +
                            'px;height:auto;display:none;align-items:center;justify-content:center;overflow:hidden;z-index:10;box-sizing:border-box;';
                        var im = document.createElement('img');
                        im.fetchPriority = 'high';
                        bindReusableArtImg(im);
                        im.style.cssText =
                            'max-width:100%;width:auto;height:auto;max-height:' +
                            maxPrevH +
                            'px;object-fit:contain;object-position:center;display:block;';
                        tile.appendChild(im);
                        layer.appendChild(tile);
                        activeRightPanel = {
                            kind: 'home',
                            tile: tile,
                            img: im
                        };
                        updateRightPanelInPlace();
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
                        var gItems = genericListForView(sim.themeViewId, previewOpts.deviceMode);
                        activeMenuList = appendMenuRows(genBox, {
                            items: gItems,
                            selectedIndex: sim.themeSelectedIndex,
                            itemHeight: Math.floor((H - statusH - 12) / 7) || 40,
                            visibleHeight: H - statusH,
                            colors: {
                                text_primary: colors.menu_text_primary,
                                text_selected: colors.menu_text_selected
                            },
                            itemBackgroundStyle: itemBackgroundStyle,
                            itemSelectedBackgroundStyle: itemSelectedBackgroundStyle,
                            itemRightArrowUrl: itemRightArrowUrl,
                            fullWidth: true,
                            leftPad: 0,
                            rowWidth: W,
                            folderIconUrl: folderIconUrl,
                            musicIconUrl: musicIconUrl,
                            scrollState: scrollState,
                            eager: eagerImages
                        });
                        activeMenuList.viewId = sim.themeViewId;
                        layer.appendChild(genBox);
                    } else if (sim.themeViewId === 'fileManager') {
                        /* Authentic activity_file_manager.xml + item_file_kt.xml:
                           25dp side margins, 45dp rows with 22dp folderIcon / musicIcon,
                           22sp bold labels, right arrow, plus bottom tip strip. */
                        var fmTipH = 26;
                        var fmBox = document.createElement('div');
                        fmBox.style.cssText =
                            'position:absolute;left:25px;top:' +
                            (statusH + 6) +
                            'px;width:' +
                            (W - 50) +
                            'px;height:' +
                            (H - statusH - fmTipH - 10) +
                            'px;overflow:hidden;z-index:10;';
                        var fileItems = genericListForView('fileManager', previewOpts.deviceMode);
                        activeMenuList = appendMenuRows(fmBox, {
                            items: fileItems,
                            selectedIndex: sim.themeSelectedIndex,
                            itemHeight: 45,
                            visibleHeight: H - statusH - fmTipH - 10,
                            colors: {
                                text_primary: colors.menu_text_primary,
                                text_selected: colors.menu_text_selected
                            },
                            itemBackgroundStyle: itemBackgroundStyle,
                            itemSelectedBackgroundStyle: itemSelectedBackgroundStyle,
                            itemRightArrowUrl: itemRightArrowUrl,
                            fullWidth: false,
                            leftPad: 0,
                            rowWidth: W - 50,
                            folderIconUrl: folderIconUrl,
                            musicIconUrl: musicIconUrl,
                            scrollState: scrollState,
                            eager: eagerImages
                        });
                        activeMenuList.viewId = 'fileManager';
                        layer.appendChild(fmBox);
                        var fmTip = document.createElement('div');
                        fmTip.style.cssText =
                            'position:absolute;left:0;right:0;bottom:0;height:' +
                            fmTipH +
                            'px;display:flex;align-items:center;justify-content:space-between;padding:0 26px;font-size:12px;color:' +
                            colors.menu_text_primary +
                            ';opacity:0.78;background:rgba(0,0,0,0.28);z-index:12;box-sizing:border-box;';
                        fmTip.innerHTML = '<span>/Internal Storage</span><span>Hold Select for options</span>';
                        layer.appendChild(fmTip);
                    } else if (sim.themeViewId === 'ebook') {
                        /* Authentic activity_book_main.xml: Continue Reading + Local Files,
                           bold 22sp Library header + 1dp #2A2A2A divider + book rows. */
                        var bookItems = genericListForView('ebook', previewOpts.deviceMode);
                        var bookBox = document.createElement('div');
                        bookBox.style.cssText =
                            'position:absolute;left:0;top:' +
                            statusH +
                            'px;width:' +
                            W +
                            'px;height:' +
                            (H - statusH) +
                            'px;overflow:hidden;z-index:10;box-sizing:border-box;';
                        var curY = 2;
                        for (var bki = 0; bki < bookItems.length; bki++) {
                            if (bki === 2) {
                                var libHead = document.createElement('div');
                                libHead.textContent = 'Library';
                                libHead.style.cssText =
                                    'position:absolute;left:12px;top:' +
                                    (curY + 4) +
                                    'px;font-size:20px;font-weight:700;color:' +
                                    colors.menu_text_primary +
                                    ';line-height:1.2;';
                                bookBox.appendChild(libHead);
                                var libDiv = document.createElement('div');
                                libDiv.style.cssText =
                                    'position:absolute;left:0;right:0;top:' +
                                    (curY + 30) +
                                    'px;height:1px;background:#2A2A2A;';
                                bookBox.appendChild(libDiv);
                                curY += 34;
                            }
                            var bkSel = bki === sim.themeSelectedIndex;
                            var bkRow = document.createElement('div');
                            bkRow.className = 'y1-tp-row' + (bkSel ? ' is-selected' : '');
                            bkRow.setAttribute('data-y1-row', String(bki));
                            bkRow.setAttribute(
                                'data-theme-asset-path',
                                bkSel ? 'itemConfig.itemSelectedBackground' : 'itemConfig.itemBackground'
                            );
                            var bkBg = bkSel ? itemSelectedBackgroundStyle : itemBackgroundStyle || { backgroundColor: 'transparent' };
                            applyCssProps(bkRow, bkBg);
                            bkRow.style.cssText +=
                                'position:absolute;left:0;top:' +
                                curY +
                                'px;width:' +
                                W +
                                'px;height:42px;display:flex;align-items:center;padding:0 40px 0 14px;box-sizing:border-box;font-size:20px;font-weight:700;color:' +
                                (bkSel ? colors.menu_text_selected : colors.menu_text_primary) +
                                ';white-space:nowrap;overflow:hidden;text-overflow:ellipsis;';
                            bkRow.textContent = bookItems[bki].label;
                            if (bkSel) {
                                var bkAr = document.createElement('span');
                                bkAr.style.cssText = 'position:absolute;right:12px;top:0;height:42px;display:flex;align-items:center;';
                                if (itemRightArrowUrl) {
                                    var bkaImg = document.createElement('img');
                                    bkaImg.src = itemRightArrowUrl;
                                    bkaImg.alt = '';
                                    bindPreviewImgFallback(bkaImg, { eager: eagerImages });
                                    bkaImg.style.cssText = 'height:28px;width:auto;object-fit:contain;';
                                    bkaImg.setAttribute('data-theme-asset-path', 'itemConfig.itemRightArrow');
                                    bkAr.appendChild(bkaImg);
                                } else {
                                    bkAr.textContent = '\u203A';
                                    bkAr.setAttribute('data-theme-asset-path', 'itemConfig.itemRightArrow');
                                    bkAr.style.fontSize = '22px';
                                }
                                bkRow.appendChild(bkAr);
                            }
                            bookBox.appendChild(bkRow);
                            curY += 42;
                        }
                        layer.appendChild(bookBox);
                    } else if (sim.themeViewId === 'ebookReader') {
                        /* Authentic activity_book_text.xml reader view. */
                        var reader = document.createElement('div');
                        reader.style.cssText =
                            'position:absolute;left:0;top:' +
                            statusH +
                            'px;width:' +
                            W +
                            'px;height:' +
                            (H - statusH) +
                            'px;padding:16px 22px;box-sizing:border-box;background:rgba(18,18,22,0.88);color:#f0f0f0;z-index:12;display:flex;flex-direction:column;gap:10px;';
                        var rTitle = document.createElement('div');
                        rTitle.textContent = sim.ebookTitle || 'The Little Prince';
                        rTitle.style.cssText = 'font-size:18px;font-weight:700;opacity:0.95;border-bottom:1px solid rgba(255,255,255,0.18);padding-bottom:6px;';
                        reader.appendChild(rTitle);
                        var rBody = document.createElement('div');
                        rBody.style.cssText = 'font-size:15px;line-height:1.58;opacity:0.92;flex:1;overflow:hidden;';
                        rBody.textContent =
                            'Once when I was six years old I saw a magnificent picture in a book, called True Stories from Nature, about the primeval forest. It was a picture of a boa constrictor in the act of swallowing an animal. Grown-ups never understand anything by themselves, and it is tiresome for children to be always and forever explaining things to them.';
                        reader.appendChild(rBody);
                        var rFoot = document.createElement('div');
                        rFoot.style.cssText = 'display:flex;justify-content:space-between;font-size:12px;opacity:0.65;';
                        rFoot.innerHTML = '<span>Chapter 1</span><span>Page 1 / 48</span>';
                        reader.appendChild(rFoot);
                        layer.appendChild(reader);
                    } else if (sim.themeViewId === 'bluetooth') {
                        /* Authentic item_blutooth.xml: 50dp rows, 30dp start / 50dp end padding,
                           18sp device name left + 16sp status text right. */
                        var btItems = genericListForView('bluetooth', previewOpts.deviceMode);
                        var btBox = document.createElement('div');
                        btBox.style.cssText =
                            'position:absolute;left:0;top:' +
                            statusH +
                            'px;width:' +
                            W +
                            'px;height:' +
                            (H - statusH) +
                            'px;overflow:hidden;z-index:10;';
                        for (var bti = 0; bti < btItems.length; bti++) {
                            var btItem = btItems[bti];
                            var btSel = bti === sim.themeSelectedIndex;
                            var btRow = document.createElement('div');
                            btRow.className = 'y1-tp-row' + (btSel ? ' is-selected' : '');
                            btRow.setAttribute('data-y1-row', String(bti));
                            btRow.setAttribute(
                                'data-theme-asset-path',
                                btSel ? 'itemConfig.itemSelectedBackground' : 'itemConfig.itemBackground'
                            );
                            applyCssProps(
                                btRow,
                                btSel ? itemSelectedBackgroundStyle : itemBackgroundStyle || { backgroundColor: 'transparent' }
                            );
                            btRow.style.cssText +=
                                'position:absolute;left:0;top:' +
                                bti * 50 +
                                'px;width:' +
                                W +
                                'px;height:50px;display:flex;align-items:center;padding:0 36px 0 28px;box-sizing:border-box;color:' +
                                (btSel ? colors.menu_text_selected : colors.menu_text_primary) +
                                ';';
                            var btName = document.createElement('span');
                            btName.style.cssText = 'flex:1;font-size:18px;font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;';
                            btName.textContent = btItem.label;
                            btRow.appendChild(btName);
                            var btStat = document.createElement('span');
                            btStat.style.cssText = 'font-size:16px;font-weight:600;opacity:0.9;';
                            btStat.textContent =
                                btItem.statusKey === 'power'
                                    ? sim.btEnabled !== false
                                        ? 'On'
                                        : 'Off'
                                    : sim.btEnabled !== false
                                      ? btItem.status || ''
                                      : '';
                            btRow.appendChild(btStat);
                            btBox.appendChild(btRow);
                        }
                        layer.appendChild(btBox);
                    } else if (isSettingsListView(sim.themeViewId)) {
                        var settingsColors = {
                            text_primary: colors.text_primary,
                            text_selected: itemCfg.itemSelectedTextColor || '#3CFFDE'
                        };
                        var sItems = settingsItemsForView(sim.themeViewId);
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
                        activeMenuList = appendSettingsMenuRows(sMenu, {
                            items: sItems,
                            selectedIndex: sim.themeSelectedIndex,
                            visibleHeight: SETTINGS_MENU_HEIGHT,
                            colors: settingsColors,
                            itemBackgroundStyle: itemBackgroundStyle,
                            itemSelectedBackgroundStyle: itemSelectedBackgroundStyle,
                            itemRightArrowUrl: itemRightArrowUrl,
                            scrollState: scrollState,
                            eager: eagerImages
                        });
                        activeMenuList.viewId = sim.themeViewId;
                        layer.appendChild(sMenu);

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
                            'position:absolute;top:58px;left:0;right:0;text-align:center;font-size:18px;font-weight:bold;color:' +
                            colors.text_primary +
                            ';white-space:nowrap;overflow:hidden;text-overflow:ellipsis;padding:0 5px;line-height:1.2;';
                        rp.appendChild(rt);

                        var imgBox = document.createElement('div');
                        imgBox.style.cssText =
                            'position:absolute;top:96px;left:0;right:0;width:100%;display:flex;flex-direction:column;align-items:center;justify-content:flex-start;';
                        var abWrap = document.createElement('div');
                        abWrap.style.cssText =
                            'width:100%;display:none;flex-direction:column;align-items:center;';
                        var isY1Model = previewOpts.deviceMode === 'y1';
                        var sq = document.createElement('div');
                        sq.style.cssText =
                            'width:140px;height:140px;background:rgba(255,255,255,0.1);border-radius:8px;display:flex;align-items:center;justify-content:center;margin-bottom:20px;border:2px solid rgba(255,255,255,0.3);';
                        var y1 = document.createElement('div');
                        y1.style.cssText =
                            'color:' + colors.text_primary + ';font-size:48px;font-weight:bold;';
                        y1.textContent = isY1Model ? 'Y1' : 'Y2';
                        sq.appendChild(y1);
                        abWrap.appendChild(sq);
                        var v1 = document.createElement('div');
                        v1.style.cssText =
                            'color:' + colors.text_primary + ';font-size:16px;text-align:center;margin-bottom:10px;';
                        v1.textContent = isY1Model ? 'Version 3.1.2' : 'Version 3.2.8';
                        abWrap.appendChild(v1);
                        var v2 = document.createElement('div');
                        v2.style.cssText =
                            'color:' + colors.text_primary + ';font-size:14px;text-align:center;opacity:0.8;';
                        v2.textContent = isY1Model ? 'Innioasis Y1' : 'Innioasis Y2';
                        abWrap.appendChild(v2);
                        imgBox.appendChild(abWrap);

                        var simg = document.createElement('img');
                        bindReusableArtImg(simg);
                        simg.style.cssText =
                            'max-width:146px;max-height:146px;width:auto;height:auto;object-fit:contain;display:none;';
                        imgBox.appendChild(simg);
                        rp.appendChild(imgBox);

                        var stx = document.createElement('div');
                        stx.style.cssText =
                            'position:absolute;top:242px;left:0;right:0;font-size:16px;color:' +
                            colors.text_primary +
                            ';text-align:center;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;padding:0 5px;display:none;';
                        rp.appendChild(stx);
                        layer.appendChild(rp);

                        activeRightPanel = {
                            kind: 'settings',
                            titleEl: rt,
                            imgBox: imgBox,
                            aboutWrap: abWrap,
                            img: simg,
                            valueEl: stx
                        };
                        updateRightPanelInPlace();
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
                        activeMenuList = appendSettingsMenuRows(eqMenu, {
                            items: eqItems.map(function (e) {
                                return { id: e.id, label: e.label, assetPath: e.assetPath };
                            }),
                            selectedIndex: sim.themeSelectedIndex,
                            visibleHeight: SETTINGS_MENU_HEIGHT,
                            colors: eqColors,
                            itemBackgroundStyle: itemBackgroundStyle,
                            itemSelectedBackgroundStyle: itemSelectedBackgroundStyle,
                            itemRightArrowUrl: itemRightArrowUrl,
                            scrollState: scrollState,
                            eager: eagerImages
                        });
                        activeMenuList.viewId = 'settingsEqualizer';
                        layer.appendChild(eqMenu);

                        var erp = document.createElement('div');
                        erp.style.cssText =
                            'position:absolute;right:22px;top:0;width:200px;height:' +
                            H +
                            'px;z-index:10;';
                        var et = document.createElement('div');
                        et.style.cssText =
                            'position:absolute;top:58px;left:0;right:0;text-align:center;font-size:18px;font-weight:bold;color:' +
                            colors.text_primary +
                            ';white-space:nowrap;overflow:hidden;padding:0 5px;';
                        et.textContent = 'Equalizer';
                        erp.appendChild(et);
                        var eib = document.createElement('div');
                        eib.style.cssText =
                            'position:absolute;top:96px;left:0;right:0;height:146px;display:none;flex-direction:column;align-items:center;justify-content:center;';
                        var eim = document.createElement('img');
                        bindReusableArtImg(eim);
                        eim.style.cssText =
                            'max-width:146px;max-height:146px;width:auto;height:auto;object-fit:contain;display:block;';
                        eib.appendChild(eim);
                        erp.appendChild(eib);
                        var elb = document.createElement('div');
                        elb.style.cssText =
                            'position:absolute;top:242px;left:0;right:0;font-size:16px;color:' +
                            colors.text_primary +
                            ';text-align:center;white-space:nowrap;overflow:hidden;padding:0 5px;';
                        erp.appendChild(elb);
                        layer.appendChild(erp);
                        activeRightPanel = {
                            kind: 'settingsEqualizer',
                            items: eqItems,
                            imgBox: eib,
                            img: eim,
                            labelEl: elb
                        };
                        updateRightPanelInPlace();
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
                            box.setAttribute('data-theme-art-box', 'themeCover');
                            box.style.cssText =
                                'width:' +
                                Math.floor(W * 0.7) +
                                'px;height:' +
                                Math.floor(H * 0.65) +
                                'px;display:flex;align-items:center;justify-content:center;border-radius:12px;overflow:hidden;box-shadow:0 8px 24px rgba(0,0,0,0.35);background:rgba(0,0,0,0.35);';
                            var tim = document.createElement('img');
                            tim.src = themeUrl;
                            tim.alt = 'Theme';
                            tim.setAttribute('data-theme-asset-path', 'themeCover');
                            bindPreviewImgFallback(tim);
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
                            var wAssetPath = wallpapers[wi].id === 'global' ? 'globalWallpaper' : 'desktopWallpaper';
                            wr.className = 'y1-tp-row' + (wsel ? ' is-selected' : '');
                            wr.setAttribute('data-y1-row', String(wi));
                            wr.setAttribute('data-theme-asset-path', wAssetPath);
                            wr.setAttribute('data-theme-row-icon-path', wAssetPath);
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
                            pm.setAttribute(
                                'data-theme-asset-path',
                                wprev.id === 'global' ? 'globalWallpaper' : 'desktopWallpaper'
                            );
                            bindPreviewImgFallback(pm);
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
                        activeMenuList = appendSettingsMenuRows(dtMenu, {
                            items: dtItems.map(function (d) {
                                return { id: d.id, label: d.label, valueText: d.value };
                            }),
                            selectedIndex: sim.themeSelectedIndex,
                            visibleHeight: SETTINGS_MENU_HEIGHT,
                            colors: dtc,
                            itemBackgroundStyle: itemBackgroundStyle,
                            itemSelectedBackgroundStyle: itemSelectedBackgroundStyle,
                            itemRightArrowUrl: itemRightArrowUrl,
                            scrollState: scrollState,
                            eager: eagerImages
                        });
                        activeMenuList.viewId = 'settingsDateTime';
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
                        activeMenuList = appendMenuRows(lbox, {
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
                            folderIconUrl: '',
                            scrollState: scrollState,
                            eager: eagerImages
                        });
                        activeMenuList.viewId = 'settingsLanguage';
                        layer.appendChild(lbox);
                    } else if (sim.themeViewId === 'settingsAbout') {
                        var isY1About = previewOpts.deviceMode === 'y1';
                        var aboutRows = [
                            { label: 'Model', val: isY1About ? 'Innioasis Y1' : 'Innioasis Y2' },
                            { label: 'Firmware', val: isY1About ? '3.1.2' : '3.2.8' },
                            { label: 'Storage', val: '128 GB' },
                            { label: 'Available', val: '94.6 GB' }
                        ];
                        var aboutList = document.createElement('div');
                        aboutList.style.cssText =
                            'position:absolute;left:9px;top:' +
                            (statusH + 10) +
                            'px;width:252px;z-index:10;display:flex;flex-direction:column;gap:4px;';
                        for (var abi = 0; abi < aboutRows.length; abi++) {
                            var arow = document.createElement('div');
                            arow.style.cssText =
                                'height:45px;display:flex;align-items:center;justify-content:space-between;padding:0 10px;box-sizing:border-box;color:' +
                                colors.text_primary +
                                ';font-size:18px;font-weight:700;';
                            arow.innerHTML =
                                '<span>' +
                                aboutRows[abi].label +
                                '</span><span style="font-size:15px;opacity:0.85;">' +
                                aboutRows[abi].val +
                                '</span>';
                            aboutList.appendChild(arow);
                        }
                        layer.appendChild(aboutList);
                        var ab = document.createElement('div');
                        ab.style.cssText =
                            'position:absolute;right:22px;top:' +
                            (statusH + 40) +
                            'px;width:179px;display:flex;flex-direction:column;align-items:center;z-index:10;';
                        var sq2 = document.createElement('div');
                        sq2.style.cssText =
                            'width:136px;height:136px;background:rgba(255,255,255,0.1);border-radius:10px;display:flex;align-items:center;justify-content:center;margin-bottom:14px;border:2px solid rgba(255,255,255,0.3);';
                        var y12 = document.createElement('div');
                        y12.style.cssText = 'color:' + colors.text_primary + ';font-size:48px;font-weight:bold;';
                        y12.textContent = isY1About ? 'Y1' : 'Y2';
                        sq2.appendChild(y12);
                        ab.appendChild(sq2);
                        var a1 = document.createElement('div');
                        a1.style.cssText = 'color:' + colors.text_primary + ';font-size:15px;text-align:center;margin-bottom:6px;font-weight:700;';
                        a1.textContent = isY1About ? 'Version 3.1.2' : 'Version 3.2.8';
                        ab.appendChild(a1);
                        var a2 = document.createElement('div');
                        a2.style.cssText = 'color:' + colors.text_primary + ';font-size:13px;text-align:center;opacity:0.8;';
                        a2.textContent = isY1About ? 'Innioasis Y1' : 'Innioasis Y2';
                        ab.appendChild(a2);
                        layer.appendChild(ab);
                    } else if (sim.themeViewId === 'photos') {
                        /* Authentic activity_photos.xml + item_photos.xml:
                           4-column grid of 100×75 rounded cards (5dp radius) with filename captions
                           and selection highlight; Select opens fullscreen photosViewer. */
                        var photoLayer = document.createElement('div');
                        photoLayer.style.cssText =
                            'position:absolute;left:0;top:' +
                            statusH +
                            'px;width:' +
                            W +
                            'px;height:' +
                            (H - statusH) +
                            'px;z-index:10;overflow:hidden;';
                        var grid = document.createElement('div');
                        grid.style.cssText =
                            'position:absolute;left:8px;top:6px;right:8px;bottom:6px;display:grid;grid-template-columns:repeat(4,1fr);grid-template-rows:repeat(3,1fr);gap:6px;';
                        var thumbs = [cfg.themeCover, cfg.desktopWallpaper, cfg.globalWallpaper]
                            .filter(function (p) {
                                return typeof p === 'string' && p;
                            })
                            .map(function (p) {
                                return buildFileUrl(contentFolder, p);
                            });
                        var photoNames = [
                            'IMG_0101.jpg', 'IMG_0102.jpg', 'Sunset.png', 'Wallpaper.jpg',
                            'Cover.png', 'Concert.jpg', 'Studio.png', 'Album.jpg',
                            'Roadtrip.jpg', 'Sketches.png', 'Notes.jpg', 'City.png'
                        ];
                        for (var ti = 0; ti < 12; ti++) {
                            var pSel = ti === sim.themeSelectedIndex;
                            var tile = document.createElement('div');
                            tile.className = 'y1-tp-photo-tile' + (pSel ? ' is-selected' : '');
                            tile.style.cssText =
                                'position:relative;display:flex;flex-direction:column;align-items:center;padding:3px;border-radius:6px;box-sizing:border-box;overflow:hidden;';
                            tile.setAttribute('data-y1-row', String(ti));
                            tile.setAttribute(
                                'data-theme-asset-path',
                                pSel ? 'itemConfig.itemSelectedBackground' : 'itemConfig.itemBackground'
                            );
                            if (pSel) {
                                applyCssProps(
                                    tile,
                                    itemSelectedBackgroundStyle || {
                                        backgroundColor: 'rgba(255,255,255,0.18)'
                                    }
                                );
                                tile.style.outline = '2px solid ' + colors.text_selected;
                                tile.style.outlineOffset = '-2px';
                            }
                            var card = document.createElement('div');
                            card.style.cssText =
                                'width:100%;flex:1;min-height:0;border-radius:5px;overflow:hidden;background:rgba(255,255,255,0.08);box-shadow:0 2px 6px rgba(0,0,0,0.3);';
                            var thumbUrl = thumbs.length ? thumbs[ti % thumbs.length] : '';
                            if (thumbUrl) {
                                var thi = document.createElement('img');
                                thi.src = thumbUrl;
                                thi.alt = '';
                                bindPreviewImgFallback(thi, { eager: eagerImages });
                                thi.style.cssText = 'width:100%;height:100%;object-fit:cover;display:block;';
                                card.appendChild(thi);
                            }
                            tile.appendChild(card);
                            var cap = document.createElement('div');
                            cap.textContent = photoNames[ti] || 'Photo ' + (ti + 1);
                            cap.style.cssText =
                                'width:100%;margin-top:2px;font-size:12px;font-weight:600;text-align:center;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:' +
                                (pSel ? colors.menu_text_selected : colors.menu_text_primary) +
                                ';';
                            tile.appendChild(cap);
                            grid.appendChild(tile);
                        }
                        photoLayer.appendChild(grid);
                        layer.appendChild(photoLayer);
                    } else if (sim.themeViewId === 'photosViewer') {
                        var vThumbs = [cfg.themeCover, cfg.desktopWallpaper, cfg.globalWallpaper]
                            .filter(function (p) { return typeof p === 'string' && p; })
                            .map(function (p) { return buildFileUrl(contentFolder, p); });
                        var vUrl = vThumbs.length ? vThumbs[(sim.photoViewerIndex || 0) % vThumbs.length] : '';
                        var pv = document.createElement('div');
                        pv.style.cssText =
                            'position:absolute;left:0;top:' +
                            statusH +
                            'px;width:' +
                            W +
                            'px;height:' +
                            (H - statusH) +
                            'px;background:#000;display:flex;align-items:center;justify-content:center;z-index:12;';
                        if (vUrl) {
                            var pvi = document.createElement('img');
                            pvi.src = vUrl;
                            pvi.alt = '';
                            pvi.style.cssText = 'max-width:100%;max-height:100%;object-fit:contain;';
                            pv.appendChild(pvi);
                        }
                        layer.appendChild(pv);
                    } else if (sim.themeViewId === 'fm') {
                        /* Authentic activity_fmmain.xml: centered 60sp frequency + 12sp MHz
                           baseline-aligned, bottom 100dp horizontal tuning scale (87..108 MHz)
                           with interactive needle shifted by Up/Down. */
                        var freqVal = Number(sim.fmFreq);
                        if (!isFinite(freqVal) || freqVal < 875 || freqVal > 1080) freqVal = 985;
                        var fmLayer = document.createElement('div');
                        fmLayer.style.cssText =
                            'position:absolute;left:0;top:' +
                            statusH +
                            'px;width:' +
                            W +
                            'px;height:' +
                            (H - statusH) +
                            'px;display:flex;flex-direction:column;align-items:center;justify-content:space-between;padding:24px 0 12px;box-sizing:border-box;z-index:10;';
                        var fmTop = document.createElement('div');
                        fmTop.style.cssText = 'display:flex;align-items:baseline;justify-content:center;gap:6px;margin-top:26px;';
                        var fmFreq = document.createElement('span');
                        fmFreq.textContent = (freqVal / 10).toFixed(1);
                        fmFreq.style.cssText =
                            'color:' + colors.text_primary + ';font-size:60px;font-weight:700;line-height:1;letter-spacing:1px;';
                        fmTop.appendChild(fmFreq);
                        var fmUnit = document.createElement('span');
                        fmUnit.textContent = 'MHz';
                        fmUnit.style.cssText =
                            'color:' + colors.text_primary + ';font-size:14px;font-weight:600;opacity:0.88;';
                        fmTop.appendChild(fmUnit);
                        fmLayer.appendChild(fmTop);

                        var fmRulerWrap = document.createElement('div');
                        fmRulerWrap.style.cssText =
                            'position:relative;width:440px;height:96px;overflow:hidden;border-top:1px solid rgba(255,255,255,0.22);display:flex;flex-direction:column;justify-content:flex-end;padding-bottom:8px;box-sizing:border-box;';
                        var needle = document.createElement('div');
                        needle.style.cssText =
                            'position:absolute;left:50%;top:4px;bottom:24px;width:3px;transform:translateX(-50%);background:' +
                            colors.text_selected +
                            ';border-radius:2px;z-index:2;';
                        fmRulerWrap.appendChild(needle);
                        var ticksRow = document.createElement('div');
                        ticksRow.style.cssText =
                            'position:relative;height:66px;width:100%;display:flex;align-items:flex-end;justify-content:space-between;padding:0 12px;box-sizing:border-box;';
                        var centerMhz = freqVal / 10;
                        for (var m = -5; m <= 5; m++) {
                            var tickFreq = Math.round((centerMhz + m * 0.5) * 10) / 10;
                            var isWhole = Math.abs(tickFreq - Math.round(tickFreq)) < 0.05;
                            var tCol = document.createElement('div');
                            tCol.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:4px;width:34px;';
                            var bar = document.createElement('div');
                            bar.style.cssText =
                                'width:' +
                                (isWhole ? '2px' : '1px') +
                                ';height:' +
                                (isWhole ? '32px' : '18px') +
                                ';background:' +
                                colors.text_primary +
                                ';opacity:' +
                                (tickFreq < 87.5 || tickFreq > 108 ? '0.18' : isWhole ? '0.85' : '0.45') +
                                ';';
                            tCol.appendChild(bar);
                            var lbl = document.createElement('span');
                            lbl.style.cssText =
                                'font-size:11px;font-weight:600;color:' +
                                colors.text_primary +
                                ';opacity:' +
                                (isWhole && tickFreq >= 87.5 && tickFreq <= 108 ? '0.85' : '0') +
                                ';';
                            lbl.textContent = isWhole ? String(Math.round(tickFreq)) : '.';
                            tCol.appendChild(lbl);
                            ticksRow.appendChild(tCol);
                        }
                        fmRulerWrap.appendChild(ticksRow);
                        fmLayer.appendChild(fmRulerWrap);
                        layer.appendChild(fmLayer);
                    } else if (sim.themeViewId === 'calendar') {
                        /* Authentic activity_calendar.xml (unimplemented stock slot):
                           #F0F5FB backdrop, rounded white month header + 7-col grid. */
                        var calLayer = document.createElement('div');
                        calLayer.style.cssText =
                            'position:absolute;left:0;top:' +
                            statusH +
                            'px;width:' +
                            W +
                            'px;height:' +
                            (H - statusH) +
                            'px;background:#F0F5FB;padding:6px;box-sizing:border-box;display:flex;flex-direction:column;gap:6px;z-index:10;color:#1f2937;';
                        var calHead = document.createElement('div');
                        calHead.style.cssText =
                            'height:36px;background:#ffffff;border-radius:14px;display:flex;align-items:center;justify-content:center;font-size:16px;font-weight:700;box-shadow:0 1px 3px rgba(0,0,0,0.08);';
                        calHead.textContent = 'November 2026';
                        calLayer.appendChild(calHead);
                        var calCard = document.createElement('div');
                        calCard.style.cssText =
                            'flex:1;background:#ffffff;border-radius:14px;padding:8px 10px;display:grid;grid-template-columns:repeat(7,1fr);grid-auto-rows:1fr;align-items:center;justify-items:center;font-size:14px;font-weight:600;box-shadow:0 1px 3px rgba(0,0,0,0.08);';
                        ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].forEach(function (dName) {
                            var dh = document.createElement('span');
                            dh.textContent = dName;
                            dh.style.cssText = 'color:#64748b;font-size:13px;';
                            calCard.appendChild(dh);
                        });
                        for (var day = 1; day <= 30; day++) {
                            var dc = document.createElement('span');
                            dc.textContent = String(day);
                            if (day === 27) {
                                dc.style.cssText =
                                    'width:26px;height:26px;border-radius:50%;background:#2f80ed;color:#fff;display:flex;align-items:center;justify-content:center;';
                            }
                            calCard.appendChild(dc);
                        }
                        calLayer.appendChild(calCard);
                        layer.appendChild(calLayer);
                    } else if (sim.themeViewId === 'calculator') {
                        /* Authentic activity_calculator.xml (unimplemented stock slot):
                           #F0F5FB backdrop, rounded white card with 76px display + 4×5 keypad. */
                        var calcLayer = document.createElement('div');
                        calcLayer.style.cssText =
                            'position:absolute;left:0;top:' +
                            statusH +
                            'px;width:' +
                            W +
                            'px;height:' +
                            (H - statusH) +
                            'px;background:#F0F5FB;padding:6px;box-sizing:border-box;z-index:10;';
                        var calcCard = document.createElement('div');
                        calcCard.style.cssText =
                            'width:100%;height:100%;background:#ffffff;border-radius:14px;padding:8px 10px;box-sizing:border-box;display:flex;flex-direction:column;gap:8px;box-shadow:0 1px 4px rgba(0,0,0,0.08);';
                        var calcDisp = document.createElement('div');
                        calcDisp.style.cssText =
                            'height:64px;background:#f4f7fb;border-radius:10px;padding:6px 12px;display:flex;flex-direction:column;justify-content:center;align-items:flex-end;box-sizing:border-box;';
                        calcDisp.innerHTML =
                            '<div style="font-size:15px;font-weight:700;color:#868686;">128 + 256</div>' +
                            '<div style="font-size:22px;font-weight:700;color:#000000;">384</div>';
                        calcCard.appendChild(calcDisp);
                        var calcGrid = document.createElement('div');
                        calcGrid.style.cssText =
                            'flex:1;display:grid;grid-template-columns:repeat(4,1fr);grid-template-rows:repeat(5,1fr);gap:5px;';
                        ['C', '\u00F7', '\u00D7', '\u232B', '7', '8', '9', '-', '4', '5', '6', '+', '1', '2', '3', '=', '%', '0', '.', '\u00B1'].forEach(function (k, ki) {
                            var kb = document.createElement('div');
                            kb.textContent = k;
                            var isAccent = k === '=';
                            var isClear = k === 'C';
                            kb.style.cssText =
                                'display:flex;align-items:center;justify-content:center;border-radius:8px;font-size:16px;font-weight:700;background:' +
                                (isAccent ? '#2f80ed' : ki === sim.themeSelectedIndex ? '#dbeafe' : '#f1f5f9') +
                                ';color:' +
                                (isAccent ? '#fff' : isClear ? '#8A1D25' : '#111827') +
                                ';';
                            calcGrid.appendChild(kb);
                        });
                        calcCard.appendChild(calcGrid);
                        calcLayer.appendChild(calcCard);
                        layer.appendChild(calcLayer);
                    } else if (sim.themeViewId === 'nowPlaying') {
                        /* Authentic activity_music_player.xml: 45dp top offset, 200×240 album art
                           left, 235dp track info column right, bottom 32dp progress bar with
                           playerConfig colors. */
                        var trackIdx = (sim.nowPlayingTrackIndex || 0) % MOCK_SONGS_PREVIEW.length;
                        var mock = MOCK_SONGS_PREVIEW[trackIdx] || MOCK_SONGS_PREVIEW[0] || {};
                        var pt = trackIdx === 0 ? String((previewMeta && previewMeta.trackTitle) || '').trim() : '';
                        var pa = trackIdx === 0 ? String((previewMeta && previewMeta.trackArtist) || '').trim() : '';
                        var pal = trackIdx === 0 ? String((previewMeta && previewMeta.trackAlbum) || '').trim() : '';
                        var npTitle = pt || mock.title || 'Theme';
                        var npArtist = pa || mock.artist || '';
                        var npAlbum = pal || mock.album || '';
                        var progCol = playerCfg.progressColor || colors.text_selected || '#3CFFDE';
                        var progBgCol = playerCfg.progressBackgroundColor || 'rgba(255,255,255,0.28)';
                        var progTxtCol = playerCfg.progressTextColor || colors.text_primary || '#ffffff';
                        var np = document.createElement('div');
                        np.style.cssText =
                            'position:absolute;left:0;top:' +
                            statusH +
                            'px;width:' +
                            W +
                            'px;height:' +
                            (H - statusH) +
                            'px;display:flex;flex-direction:column;justify-content:space-between;z-index:10;box-sizing:border-box;padding:12px 16px 14px;';
                        var npTop = document.createElement('div');
                        npTop.style.cssText = 'display:flex;align-items:center;gap:18px;flex:1;min-height:0;';
                        var art = document.createElement('div');
                        art.style.cssText =
                            'position:relative;width:190px;height:190px;flex:0 0 190px;transform:perspective(500px) rotateY(18deg) rotateX(2deg);border-radius:6px;overflow:hidden;box-shadow:0 12px 28px rgba(0,0,0,0.45);background:rgba(0,0,0,0.28);';
                        var coverPath = cfg.themeCover || cfg.desktopWallpaper || '';
                        var coverU = coverPath ? buildFileUrl(contentFolder, coverPath) : '';
                        if (coverU) {
                            var ai = document.createElement('img');
                            ai.src = coverU;
                            ai.alt = '';
                            ai.setAttribute('data-theme-asset-path', cfg.themeCover ? 'themeCover' : 'desktopWallpaper');
                            bindPreviewImgFallback(ai, { eager: eagerImages });
                            ai.style.cssText = 'width:100%;height:100%;object-fit:cover;display:block;';
                            art.appendChild(ai);
                        }
                        npTop.appendChild(art);
                        var colR = document.createElement('div');
                        colR.style.cssText = 'flex:1;min-width:0;display:flex;flex-direction:column;gap:8px;';
                        var tti = document.createElement('div');
                        tti.style.cssText =
                            'color:' + progTxtCol + ';font-weight:700;font-size:24px;line-height:1.2;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;';
                        tti.textContent = npTitle;
                        colR.appendChild(tti);
                        var subArtist = document.createElement('div');
                        subArtist.style.cssText = 'color:' + progTxtCol + ';opacity:0.86;font-size:17px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;';
                        subArtist.textContent = npArtist || '\u00a0';
                        colR.appendChild(subArtist);
                        var subAlbum = document.createElement('div');
                        subAlbum.style.cssText = 'color:' + progTxtCol + ';opacity:0.68;font-size:15px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;';
                        subAlbum.textContent = npAlbum || '\u00a0';
                        colR.appendChild(subAlbum);
                        var subIdx = document.createElement('div');
                        subIdx.style.cssText = 'color:' + progTxtCol + ';opacity:0.62;font-size:13px;margin-top:6px;';
                        subIdx.textContent = (trackIdx + 1) + ' / ' + MOCK_SONGS_PREVIEW.length;
                        colR.appendChild(subIdx);
                        npTop.appendChild(colR);
                        np.appendChild(npTop);

                        var npBarRow = document.createElement('div');
                        npBarRow.style.cssText = 'height:32px;display:flex;align-items:center;gap:10px;width:100%;';
                        var tEl = document.createElement('span');
                        tEl.textContent = '01:42';
                        tEl.style.cssText = 'font-size:14px;font-weight:700;color:' + progTxtCol + ';min-width:46px;text-align:left;';
                        var barTrack = document.createElement('div');
                        barTrack.style.cssText =
                            'flex:1;height:8px;border-radius:4px;overflow:hidden;background:' + progBgCol + ';';
                        var barFill = document.createElement('div');
                        barFill.style.cssText = 'width:42%;height:100%;border-radius:4px;background:' + progCol + ';';
                        barTrack.appendChild(barFill);
                        var durSec = mock.duration || 243;
                        var durStr =
                            String(Math.floor(durSec / 60)).padStart(2, '0') +
                            ':' +
                            String(durSec % 60).padStart(2, '0');
                        var tTot = document.createElement('span');
                        tTot.textContent = durStr;
                        tTot.style.cssText = 'font-size:14px;font-weight:700;color:' + progTxtCol + ';min-width:46px;text-align:right;';
                        npBarRow.appendChild(tEl);
                        npBarRow.appendChild(barTrack);
                        npBarRow.appendChild(tTot);
                        np.appendChild(npBarRow);
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
                        panel.setAttribute('data-theme-asset-path', 'dialogConfig.dialogBackground');
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
                                /* Lets an editor focus the option art the same way it
                                   focuses menu rows: the option owns the dialog
                                   background slot it is drawn with. */
                                btn.setAttribute(
                                    'data-theme-asset-path',
                                    sel ? 'dialogConfig.dialogOptionSelectedBackground' : 'dialogConfig.dialogOptionBackground'
                                );
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
                                /* Picking an option moves the highlight, so the
                                   selected and unselected dialog art can both be
                                   compared without guessing which is drawn. */
                                btn.addEventListener('click', function () {
                                    if (!sim.dialogVisible) return;
                                    sim.dialogSelectedIndex = idx;
                                    paint();
                                });
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

                function paintKeepingScrollQuietly() {
                    if (cleanedUp) return;
                    var prevAnim = scrollState.animate;
                    scrollState.override = scrollState.lastY;
                    scrollState.animate = false;
                    try {
                        paint();
                    } finally {
                        scrollState.override = null;
                        scrollState.animate = prevAnim;
                    }
                }

                function primeLoadedThemeFontsThenInitialPaint() {
                    paint();
                    if (typeof document !== 'undefined' && document.fonts && document.fonts.load) {
                        var firstFam = String(fontStack || '')
                            .split(',')[0]
                            .trim();
                        document.fonts
                            .load('22px ' + firstFam)
                            .catch(function () {})
                            .then(function () {
                                paintKeepingScrollQuietly();
                            });
                    } else {
                        global.setTimeout(function () {
                            paintKeepingScrollQuietly();
                        }, 60);
                    }
                    if (typeof document !== 'undefined' && document.fonts && document.fonts.ready) {
                        document.fonts.ready
                            .then(function () {
                                paintKeepingScrollQuietly();
                            })
                            .catch(function () {});
                    }
                }
                primeLoadedThemeFontsThenInitialPaint();

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
                                'settingsEqualizer',
                                'musicSettings'
                            ].indexOf(prev) !== -1 ||
                            String(prev || '').indexOf('settingsCat_') === 0
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

                var suppressHoverUntil = 0;

                function handleScroll(direction) {
                    suppressHoverUntil = Date.now() + 360;
                    if (sim.dialogVisible && (sim.dialogOptions || []).length) {
                        var len = sim.dialogOptions.length;
                        var delta = direction === 'down' ? 1 : -1;
                        sim.dialogSelectedIndex =
                            (sim.dialogSelectedIndex + delta + len * 10) % len;
                        paint();
                        return;
                    }
                    var vid = sim.themeViewId;
                    var prevIdx = sim.themeSelectedIndex;
                    if (vid === 'home') {
                        scrollClamp(direction, homeLen());
                    } else if (
                        vid === 'music' ||
                        vid === 'music_folders' ||
                        vid === 'videos' ||
                        vid === 'videos_folders' ||
                        vid === 'audiobooks' ||
                        vid === 'ebook' ||
                        vid === 'fileManager' ||
                        vid === 'bluetooth' ||
                        vid === 'settingsLanguage'
                    ) {
                        scrollClamp(direction, genericListForView(vid, previewOpts.deviceMode).length);
                    } else if (isSettingsListView(vid)) {
                        scrollClamp(direction, settingsItemsForView(vid).length);
                    } else if (vid === 'settingsEqualizer') {
                        scrollClamp(
                            direction,
                            buildEqualizerItems(settingCfg, buildFileUrl, contentFolder).length
                        );
                    } else if (vid === 'photos') {
                        scrollClamp(direction, 12);
                        paint();
                        return;
                    } else if (vid === 'photosViewer') {
                        var pNext = (sim.photoViewerIndex || 0) + (direction === 'down' ? 1 : -1);
                        sim.photoViewerIndex = (pNext + 12) % 12;
                        paint();
                        return;
                    } else if (vid === 'fm') {
                        var fCur = Number(sim.fmFreq) || 985;
                        fCur += direction === 'down' ? 5 : -5;
                        sim.fmFreq = Math.max(875, Math.min(1080, fCur));
                        paint();
                        return;
                    } else if (vid === 'nowPlaying') {
                        var tLen = MOCK_SONGS_PREVIEW.length || 1;
                        sim.nowPlayingTrackIndex =
                            ((sim.nowPlayingTrackIndex || 0) + (direction === 'down' ? 1 : -1) + tLen) % tLen;
                        paint();
                        return;
                    } else if (vid === 'calculator') {
                        scrollClamp(direction, 20);
                        paint();
                        return;
                    } else if (vid === 'settingsBrightness') {
                        if (direction === 'down') {
                            sim.brightnessLevel = Math.min(sim.brightnessLevel + 10, 100);
                        } else {
                            sim.brightnessLevel = Math.max(sim.brightnessLevel - 10, 0);
                        }
                        paint();
                        return;
                    } else if (vid === 'settingsWallpaper') {
                        if (direction === 'down') {
                            sim.themeSelectedIndex = Math.min(sim.themeSelectedIndex + 1, 1);
                        } else {
                            sim.themeSelectedIndex = Math.max(sim.themeSelectedIndex - 1, 0);
                        }
                        paint();
                        return;
                    } else if (vid === 'settingsDateTime') {
                        scrollClamp(direction, 4);
                    }
                    if (sim.themeSelectedIndex === prevIdx) return;
                    if (!updateSelectionInPlace(false)) {
                        paint();
                    }
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
                        var selItem = homeItems[sim.themeSelectedIndex];
                        var selId = selItem && selItem.id;
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
                        } else if (
                            selId === 'photos' ||
                            selId === 'fm' ||
                            selId === 'ebook' ||
                            selId === 'bluetooth' ||
                            selId === 'fileManager' ||
                            selId === 'calendar' ||
                            selId === 'calculator'
                        ) {
                            sim.themeViewId = selId;
                            sim.themeSelectedIndex = 0;
                        } else if (selId === 'settings') {
                            sim.themeViewId = 'settings';
                            sim.themeSelectedIndex = 0;
                        } else if (selId === 'shuffleQuick') {
                            sim.playState = 'playing';
                            sim.themeViewId = 'nowPlaying';
                            sim.themeSelectedIndex = 0;
                        } else if (selId === 'rockbox') {
                            showToast('Switch to Rockbox');
                            sim.themeHistory.pop();
                        } else {
                            showToast('Not implemented');
                            sim.themeHistory.pop();
                        }
                        paint();
                        return;
                    }
                    if (vid === 'music') {
                        var mList = genericListForView('music', previewOpts.deviceMode);
                        var ms = mList[sim.themeSelectedIndex] && mList[sim.themeSelectedIndex].label;
                        if (ms === 'Folders') {
                            sim.themeHistory.push('music');
                            sim.themeViewId = 'music_folders';
                            sim.themeSelectedIndex = 0;
                        } else if (ms === 'Settings') {
                            sim.themeHistory.push('music');
                            sim.themeViewId = 'musicSettings';
                            sim.themeSelectedIndex = 0;
                        } else if (ms === 'All songs') {
                            sim.themeHistory.push('music');
                            sim.themeViewId = 'nowPlaying';
                            sim.themeSelectedIndex = 0;
                        } else {
                            showToast(ms || 'Music');
                        }
                        paint();
                        return;
                    }
                    if (vid === 'music_folders' || vid === 'fileManager') {
                        var fList = genericListForView(vid, previewOpts.deviceMode);
                        var fEntry = fList[sim.themeSelectedIndex];
                        if (fEntry && fEntry.isMusic) {
                            sim.themeHistory.push(vid);
                            sim.playState = 'playing';
                            sim.themeViewId = 'nowPlaying';
                            sim.themeSelectedIndex = 0;
                        } else {
                            showToast((fEntry && fEntry.label) || 'Folder');
                        }
                        paint();
                        return;
                    }
                    if (vid === 'ebook') {
                        var bList = genericListForView('ebook', previewOpts.deviceMode);
                        var bEntry = bList[sim.themeSelectedIndex];
                        sim.ebookTitle = (bEntry && bEntry.label && bEntry.label.replace(/\.[^.]+$/, '')) || 'The Little Prince';
                        sim.themeHistory.push('ebook');
                        sim.themeViewId = 'ebookReader';
                        sim.themeSelectedIndex = 0;
                        paint();
                        return;
                    }
                    if (vid === 'photos') {
                        sim.photoViewerIndex = sim.themeSelectedIndex;
                        sim.themeHistory.push('photos');
                        sim.themeViewId = 'photosViewer';
                        paint();
                        return;
                    }
                    if (vid === 'bluetooth') {
                        var btList = genericListForView('bluetooth', previewOpts.deviceMode);
                        var btEntry = btList[sim.themeSelectedIndex];
                        if (btEntry && btEntry.id === 'bt_power') {
                            sim.btEnabled = sim.btEnabled === false;
                            showToast('Bluetooth ' + (sim.btEnabled ? 'On' : 'Off'));
                        } else if (btEntry && btEntry.id === 'bt_scan') {
                            showToast('Scanning for devices...');
                        } else if (btEntry) {
                            showToast('Connected: ' + btEntry.label);
                        }
                        paint();
                        return;
                    }
                    if (vid === 'fm') {
                        sim.dialogVisible = true;
                        sim.dialogTitle = 'FM Radio';
                        sim.dialogMessage = ((Number(sim.fmFreq) || 985) / 10).toFixed(1) + ' MHz';
                        sim.dialogOptions = ['Auto scan', 'Presets', 'Close'];
                        sim.dialogSelectedIndex = 0;
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
                            showToast(vs || 'Videos');
                        }
                        paint();
                        return;
                    }
                    if (isSettingsListView(vid)) {
                        var sItemsNow = settingsItemsForView(vid);
                        var selEntry = sItemsNow[sim.themeSelectedIndex] || {};
                        var sid = String(selEntry.id || '');
                        if (sid.indexOf('cat_') === 0) {
                            sim.themeHistory.push(vid);
                            sim.themeViewId = 'settingsCat_' + sid.slice(4);
                            sim.themeSelectedIndex = 0;
                        } else if (sid === 'bluetooth') {
                            sim.themeHistory.push(vid);
                            sim.themeViewId = 'bluetooth';
                            sim.themeSelectedIndex = 0;
                        } else if (sid === 'theme') {
                            sim.themeHistory.push(vid);
                            sim.themeViewId = 'settingsTheme';
                            sim.themeSelectedIndex = 0;
                        } else if (sid === 'equalizer') {
                            sim.themeHistory.push(vid);
                            sim.themeViewId = 'settingsEqualizer';
                            sim.themeSelectedIndex = 0;
                        } else if (sid === 'brightness') {
                            sim.themeHistory.push(vid);
                            sim.themeViewId = 'settingsBrightness';
                            sim.themeSelectedIndex = 0;
                        } else if (sid === 'wallpaper') {
                            sim.themeHistory.push(vid);
                            sim.themeViewId = 'settingsWallpaper';
                            sim.themeSelectedIndex = 0;
                        } else if (sid === 'date_time') {
                            sim.themeHistory.push(vid);
                            sim.themeViewId = 'settingsDateTime';
                            sim.themeSelectedIndex = 0;
                        } else if (sid === 'language') {
                            sim.themeHistory.push(vid);
                            sim.themeViewId = 'settingsLanguage';
                            sim.themeSelectedIndex = 0;
                        } else if (sid === 'about') {
                            sim.themeHistory.push(vid);
                            sim.themeViewId = 'settingsAbout';
                            sim.themeSelectedIndex = 0;
                        } else if (sid === 'rockbox') {
                            showToast('Switch to Rockbox');
                        } else if (sid === 'shutdown') {
                            sim.dialogVisible = true;
                            sim.dialogTitle = 'Shutdown';
                            sim.dialogMessage = 'Sure to shut down?';
                            sim.dialogOptions = ['Yes', 'No'];
                            sim.dialogSelectedIndex = 1;
                        } else if (sid === 'timed_shutdown') {
                            var tsv = ['off', '10', '20', '30', '60', '90', '120'];
                            var ti = tsv.indexOf(sim.timedShutdownValue);
                            sim.timedShutdownValue = tsv[(ti + 1) % tsv.length];
                        } else if (sid === 'shuffle') {
                            sim.shuffleEnabled = !sim.shuffleEnabled;
                        } else if (sid === 'repeat') {
                            sim.repeatMode =
                                sim.repeatMode === 'off' ? 'all' : sim.repeatMode === 'all' ? 'one' : 'off';
                        } else if (sid === 'file_extension') {
                            sim.fileExtensionsEnabled = !sim.fileExtensionsEnabled;
                        } else if (sid === 'key_lock') {
                            sim.keyLockEnabled = !sim.keyLockEnabled;
                        } else if (sid === 'wheel_sensitivity') {
                            var ws = ['low', 'standard', 'high'];
                            var wsi = ws.indexOf(sim.wheelSensitivity || 'standard');
                            sim.wheelSensitivity = ws[(wsi + 1) % ws.length];
                        } else if (sid === 'wheel_volume') {
                            sim.wheelVolumeEnabled = sim.wheelVolumeEnabled === false;
                        } else if (sid === 'headphone_gain') {
                            var hg = ['low', 'standard', 'high', 'maximum'];
                            var hgi = hg.indexOf(sim.headphoneGain || 'standard');
                            sim.headphoneGain = hg[(hgi + 1) % hg.length];
                        } else if (sid === 'speaker') {
                            sim.speakerEnabled = sim.speakerEnabled === false;
                        } else if (sid === 'key_tone') {
                            sim.keyToneEnabled = !sim.keyToneEnabled;
                        } else if (sid === 'key_vibration') {
                            sim.keyVibrationEnabled = !sim.keyVibrationEnabled;
                        } else if (sid === 'display_battery') {
                            sim.displayBatteryEnabled = !sim.displayBatteryEnabled;
                        } else if (sid === 'backlight') {
                            var bv = ['10', '15', '30', '45', '60', '120', '300', 'always'];
                            var bi = bv.indexOf(sim.backlightValue);
                            sim.backlightValue = bv[(bi + 1) % bv.length];
                        } else if (sid === 'factory_reset') {
                            sim.dialogVisible = true;
                            sim.dialogTitle = 'Factory reset';
                            sim.dialogMessage = 'Sure to reset?';
                            sim.dialogOptions = ['Yes', 'No'];
                            sim.dialogSelectedIndex = 1;
                        } else if (sid === 'clear_cache') {
                            showToast('Clearing cache...');
                        } else {
                            showToast(selEntry.label || 'Settings');
                        }
                        paint();
                        return;
                    }
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

                function invokeWheelQuadrantAction(act) {
                    if (act === 'center') handleCenterClick();
                    else if (act === 'menu') goBack();
                    else if (act === 'play') {
                        sim.playState = sim.playState === 'playing' ? 'pause' : 'playing';
                        paint();
                    } else if (act === 'prev') {
                        handleScroll('up');
                    } else if (act === 'next') {
                        handleScroll('down');
                    }
                }

                var cwPointer = null;

                function detachCwPointerTracking() {
                    document.removeEventListener('pointermove', onCwPointerDocMove, true);
                    document.removeEventListener('pointerup', onCwPointerDocEnd, true);
                    document.removeEventListener('pointercancel', onCwPointerDocEnd, true);
                }

                function onCwPointerDocMove(ev) {
                    if (!cwPointer || ev.pointerId !== cwPointer.pid) return;
                    var dx = ev.clientX - cwPointer.x0;
                    var dy = ev.clientY - cwPointer.y0;
                    if (dx * dx + dy * dy > 49) cwPointer.moved = true;
                }

                function onCwPointerDocEnd(ev) {
                    if (!cwPointer || ev.pointerId !== cwPointer.pid) return;
                    detachCwPointerTracking();
                    var moved = cwPointer.moved;
                    var act = cwPointer.act;
                    cwPointer = null;
                    if (!moved) invokeWheelQuadrantAction(act);
                }

                function onWheelButtonPointerDownCap(ev) {
                    if (!interactive || (ev.pointerType === 'mouse' && ev.button !== 0)) return;
                    var btn = ev.target && ev.target.closest && ev.target.closest('[data-y1act]');
                    if (!btn || !wheel.contains(btn)) return;
                    if (cwPointer) return;
                    cwPointer = {
                        pid: ev.pointerId,
                        x0: ev.clientX,
                        y0: ev.clientY,
                        moved: false,
                        act: btn.getAttribute('data-y1act')
                    };
                    document.addEventListener('pointermove', onCwPointerDocMove, true);
                    document.addEventListener('pointerup', onCwPointerDocEnd, true);
                    document.addEventListener('pointercancel', onCwPointerDocEnd, true);
                    try {
                        ev.preventDefault();
                    } catch (e) {}
                }

                /* One notch of a trackpad can arrive as dozens of wheel events.
                   Accumulate physical pixels with a clear per-step threshold and
                   cap the pending queue so a single flick never turns into
                   seconds of runaway scrolling. */
                var wheelStepTimer = null;
                var wheelAccResetTimer = null;
                var wheelSteps = 0;
                var wheelDeltaAcc = 0;
                var WHEEL_STEP_PX = 42;
                var WHEEL_MAX_QUEUED = 3;

                function onWheelDelta(ev) {
                    if (!interactive) return;
                    ev.preventDefault();
                    var dy = ev.deltaY;
                    if (ev.deltaMode === 1) dy *= 36;
                    else if (ev.deltaMode === 2) dy *= 240;
                    if (!isFinite(dy) || Math.abs(dy) < 0.5) return;
                    suppressHoverUntil = Date.now() + 360;
                    if ((dy > 0 && wheelDeltaAcc < 0) || (dy < 0 && wheelDeltaAcc > 0)) {
                        wheelDeltaAcc = 0;
                    }
                    wheelDeltaAcc += dy;
                    if (wheelAccResetTimer) global.clearTimeout(wheelAccResetTimer);
                    wheelAccResetTimer = global.setTimeout(function () {
                        wheelAccResetTimer = null;
                        wheelDeltaAcc = 0;
                    }, 220);

                    var added = 0;
                    while (Math.abs(wheelDeltaAcc) >= WHEEL_STEP_PX) {
                        var dir = wheelDeltaAcc > 0 ? 1 : -1;
                        wheelDeltaAcc -= dir * WHEEL_STEP_PX;
                        wheelSteps = Math.max(-WHEEL_MAX_QUEUED, Math.min(WHEEL_MAX_QUEUED, wheelSteps + dir));
                        added += 1;
                    }
                    if (!added && Math.abs(dy) >= 24 && !wheelStepTimer && wheelSteps === 0) {
                        wheelSteps = dy > 0 ? 1 : -1;
                        wheelDeltaAcc = 0;
                    }
                    if (!wheelSteps || wheelStepTimer) return;
                    var step = function () {
                        if (cleanedUp || !wheelSteps) {
                            wheelStepTimer = null;
                            return;
                        }
                        var direction = wheelSteps > 0 ? 'down' : 'up';
                        wheelSteps -= wheelSteps > 0 ? 1 : -1;
                        handleScroll(direction);
                        wheelStepTimer = wheelSteps ? global.setTimeout(step, 95) : null;
                    };
                    wheelStepTimer = global.setTimeout(step, 0);
                }

                var ringDrag = { active: false, lastAngle: 0, acc: 0 };

                function wheelClientCenter() {
                    var r = wheel.getBoundingClientRect();
                    return { cx: r.left + r.width * 0.5, cy: r.top + r.height * 0.5 };
                }

                function onWheelPointerDown(ev) {
                    if (!interactive || (ev.pointerType === 'mouse' && ev.button !== 0)) return;
                    if (ev.target && ev.target.closest && ev.target.closest('[data-y1act]')) return;
                    ringDrag.active = true;
                    ringDrag.acc = 0;
                    var c = wheelClientCenter();
                    ringDrag.lastAngle = Math.atan2(ev.clientY - c.cy, ev.clientX - c.cx);
                    try {
                        wheel.setPointerCapture(ev.pointerId);
                    } catch (e) {}
                    ev.preventDefault();
                }

                function onWheelPointerMove(ev) {
                    if (!ringDrag.active) return;
                    var c = wheelClientCenter();
                    var a = Math.atan2(ev.clientY - c.cy, ev.clientX - c.cx);
                    var da = a - ringDrag.lastAngle;
                    if (da > Math.PI) da -= 2 * Math.PI;
                    if (da < -Math.PI) da += 2 * Math.PI;
                    ringDrag.lastAngle = a;
                    ringDrag.acc += da;
                    var step = 0.28;
                    while (ringDrag.acc > step) {
                        handleScroll('down');
                        ringDrag.acc -= step;
                    }
                    while (ringDrag.acc < -step) {
                        handleScroll('up');
                        ringDrag.acc += step;
                    }
                    ev.preventDefault();
                }

                function onWheelPointerEnd(ev) {
                    if (!ringDrag.active) return;
                    ringDrag.active = false;
                    ringDrag.acc = 0;
                    try {
                        wheel.releasePointerCapture(ev.pointerId);
                    } catch (e) {}
                }

                /* Hovering a row is the pointer's version of pressing up or down:
                   the highlight moves to that row and the screen repaints, which
                   also swaps the artwork drawn beside the list. Touch has no
                   hover, so a press held still on one row does the same thing; a
                   press that moves or lifts early stays an ordinary tap. */
                var rowHold = null;
                var rowDrag = null;

                function rowIndexFromEvent(ev) {
                    var target = ev.target;
                    if (!target || !target.closest) return -1;
                    var row = target.closest('[data-y1-row]');
                    if (!row || !canvas.contains(row)) return -1;
                    var idx = parseInt(row.getAttribute('data-y1-row'), 10);
                    return isFinite(idx) ? idx : -1;
                }

                function focusRowIndex(index) {
                    if (!interactive) return false;
                    if (!(index >= 0)) return false;
                    if (sim.dialogVisible) return false;
                    if (index === sim.themeSelectedIndex) return false;
                    sim.themeSelectedIndex = index;
                    if (updateSelectionInPlace(true)) {
                        return true;
                    }
                    scrollState.override = scrollState.lastY;
                    scrollState.animate = false;
                    try {
                        paint();
                    } finally {
                        scrollState.override = null;
                        scrollState.animate = true;
                    }
                    return true;
                }

                /* pointerover fires again whenever a paint puts a fresh row
                   under a stationary cursor, so it cannot be the hover source.
                   Real physical movement is: require >= 3px of actual pointer
                   motion, ignore hovers during active scroll transitions, skip
                   barely-clipped edge slivers, and update the row in place. */
                var hoverFrame = 0;
                var hoverPoint = null;
                var lastHoverX = NaN;
                var lastHoverY = NaN;

                function rowVisibleInList(row) {
                    if (!row || !activeMenuList || !activeMenuList.outer) return true;
                    var outerBox = activeMenuList.outer.getBoundingClientRect();
                    var rowBox = row.getBoundingClientRect();
                    if (!outerBox.height || !rowBox.height) return false;
                    var visibleTop = Math.max(rowBox.top, outerBox.top);
                    var visibleBottom = Math.min(rowBox.bottom, outerBox.bottom);
                    var visibleH = visibleBottom - visibleTop;
                    return visibleH >= Math.min(16, rowBox.height * 0.45);
                }

                function onRowHover(ev) {
                    if (!interactive || ev.pointerType === 'touch') return;
                    if (Date.now() < suppressHoverUntil) return;
                    if (
                        isFinite(lastHoverX) &&
                        isFinite(lastHoverY) &&
                        Math.hypot(ev.clientX - lastHoverX, ev.clientY - lastHoverY) < 3
                    ) {
                        return;
                    }
                    lastHoverX = ev.clientX;
                    lastHoverY = ev.clientY;
                    hoverPoint = { x: ev.clientX, y: ev.clientY };
                    if (hoverFrame) return;
                    hoverFrame = global.requestAnimationFrame(function () {
                        hoverFrame = 0;
                        if (cleanedUp || !hoverPoint || Date.now() < suppressHoverUntil) return;
                        var node = document.elementFromPoint(hoverPoint.x, hoverPoint.y);
                        var row = node && node.closest ? node.closest('[data-y1-row]') : null;
                        if (!row || !canvas.contains(row)) return;
                        if (!rowVisibleInList(row)) return;
                        focusRowIndex(parseInt(row.getAttribute('data-y1-row'), 10));
                    });
                }

                function clearRowHold() {
                    if (rowHold && rowHold.timer) global.clearTimeout(rowHold.timer);
                    rowHold = null;
                }

                function onRowHoldStart(ev) {
                    if (!interactive || ev.pointerType !== 'touch') return;
                    var index = rowIndexFromEvent(ev);
                    if (index < 0) return;
                    clearRowHold();
                    rowDrag = {
                        id: ev.pointerId,
                        x0: ev.clientX,
                        y0: ev.clientY,
                        lastY: ev.clientY,
                        acc: 0,
                        moved: false
                    };
                    rowHold = {
                        id: ev.pointerId,
                        x: ev.clientX,
                        y: ev.clientY,
                        index: index,
                        timer: global.setTimeout(function () {
                            if (!rowHold || rowHold.index !== index) return;
                            rowHold.timer = null;
                            /* Held still: open the artwork behind this row in
                               the Studio's asset list. Painting first means the
                               row was rebuilt, so ask for it again. */
                            focusRowIndex(index);
                            var row = canvas.querySelector('[data-y1-row="' + index + '"]');
                            var path = row && row.getAttribute('data-theme-asset-path');
                            if (row && path) {
                                row.dispatchEvent(
                                    new MouseEvent('click', { bubbles: true, cancelable: true, view: global })
                                );
                            }
                        }, 450)
                    };
                }

                function onRowHoldMove(ev) {
                    if (!rowDrag || ev.pointerId !== rowDrag.id) return;
                    var dy = ev.clientY - rowDrag.lastY;
                    rowDrag.lastY = ev.clientY;
                    if (Math.abs(ev.clientY - rowDrag.y0) > 8 || Math.abs(ev.clientX - rowDrag.x0) > 8) {
                        rowDrag.moved = true;
                        /* A finger that travels is scrolling, not holding. */
                        if (rowHold) {
                            if (rowHold.timer) global.clearTimeout(rowHold.timer);
                            rowHold = null;
                        }
                    }
                    /* A drag step is one row: the list follows the finger
                       instead of jumping a page at a time. */
                    var step = 24;
                    rowDrag.acc += dy;
                    while (rowDrag.acc >= step) {
                        rowDrag.acc -= step;
                        handleScroll('down');
                    }
                    while (rowDrag.acc <= -step) {
                        rowDrag.acc += step;
                        handleScroll('up');
                    }
                }

                function onRowHoldEnd(ev) {
                    if (rowDrag && ev.pointerId === rowDrag.id && rowDrag.moved) {
                        rowDrag = null;
                        clearRowHold();
                        return;
                    }
                    if (rowDrag && ev.pointerId === rowDrag.id) rowDrag = null;
                    if (!rowHold || ev.pointerId !== rowHold.id) return;
                    /* A quick tap (the hold timer never fired) is the pointer's
                       Select: the first one only moves the highlight, the second
                       on the same row opens it. */
                    var wasTap = !!rowHold.timer;
                    var index = rowHold.index;
                    clearRowHold();
                    if (!wasTap) return;
                    activateRow(index);
                }

                /* Selecting a row twice is the device's Select button. Rows that
                   lead to a dialog (Shutdown, Factory reset, clear cache) open it,
                   so the Studio can show what the dialog art looks like. */
                function activateRow(index) {
                    if (!interactive || !(index >= 0) || sim.dialogVisible) return false;
                    if (index !== sim.themeSelectedIndex) {
                        sim.themeSelectedIndex = index;
                        if (!updateSelectionInPlace(true)) {
                            paint();
                        }
                        return false;
                    }
                    handleCenterClick();
                    return true;
                }

                function onRowDoubleClick(ev) {
                    if (!interactive) return;
                    var index = rowIndexFromEvent(ev);
                    if (!(index >= 0) || sim.dialogVisible) return;
                    sim.themeSelectedIndex = index;
                    handleCenterClick();
                }

                if (interactive) {
                    dev.tabIndex = 0;
                    dev.addEventListener('keydown', onKeyDown);
                    /* Without a wheel (the Studio hides it) there is nothing to
                       bind: the control strip dispatches the same key events. */
                    if (wheel) {
                        wheel.addEventListener('pointerdown', onWheelButtonPointerDownCap, true);
                        wheel.addEventListener('wheel', onWheelDelta, wheelScrollOpts);
                        wheel.addEventListener('pointerdown', onWheelPointerDown);
                        wheel.addEventListener('pointermove', onWheelPointerMove);
                        wheel.addEventListener('pointerup', onWheelPointerEnd);
                        wheel.addEventListener('pointercancel', onWheelPointerEnd);
                    }
                    canvas.addEventListener('pointermove', onRowHover);
                    canvas.addEventListener('dblclick', onRowDoubleClick);
                    canvas.addEventListener('pointerdown', onRowHoldStart);
                    canvas.addEventListener('pointermove', onRowHoldMove);
                    canvas.addEventListener('pointerup', onRowHoldEnd);
                    canvas.addEventListener('pointercancel', onRowHoldEnd);
                }

                /* The Studio can focus one asset. Jumping to the screen that draws
                   it is what makes a tray row meaningful on a phone: the edit and
                   the result sit a thumb apart instead of a scroll apart. */
                function assetContextView(assetPath) {
                    var path = String(assetPath || '');
                    var isY1 = previewOpts.deviceMode === 'y1';
                    if (path === 'homePageConfig.bluetooth' && previewOpts.deviceMode === 'y2') return 'settings';
                    if (/^homePageConfig\./.test(path)) return 'home';
                    if (/^settingConfig\.equalizer_/i.test(path)) return 'settingsEqualizer';
                    if (/^settingConfig\.category/i.test(path)) return 'settings';
                    if (/^settingConfig\.(wheelSensitivity|wheelVolume|keyLock|keyTone|keyVibration)/i.test(path)) {
                        return isY1 ? 'settings' : 'settingsCat_keysWheel';
                    }
                    if (/^settingConfig\.(headphoneGain|speaker)/i.test(path)) {
                        return isY1 ? 'settings' : 'settingsCat_audio';
                    }
                    if (/^settingConfig\.(brightness|backlight_|displayBattery)/i.test(path)) {
                        return isY1 ? 'settings' : 'settingsCat_display';
                    }
                    if (/^settingConfig\.(theme|wallpaper)$/i.test(path)) {
                        return isY1 ? 'settings' : 'settingsCat_personalization';
                    }
                    if (/^settingConfig\.(fileExtension|clearCache)/i.test(path)) {
                        return isY1 ? 'settings' : 'settingsCat_filesStorage';
                    }
                    if (/^settingConfig\.(language|dateTime|timedShutdown_|launcher|shutdown)/i.test(path)) {
                        return isY1 ? 'settings' : 'settingsCat_system';
                    }
                    if (/^settingConfig\.(shuffle|repeat)/i.test(path)) {
                        return isY1 ? 'settings' : 'musicSettings';
                    }
                    if (/^settingConfig\./.test(path)) return 'settings';
                    if (path === 'fileConfig.musicIcon') return 'fileManager';
                    if (/^fileConfig\./.test(path)) return 'fileManager';
                    if (/^itemConfig\.|^menuConfig\.|^dialogConfig\./.test(path)) return 'settings';
                    if (/^themeCover$/.test(path)) return 'settingsTheme';
                    if (/^statusConfig\./.test(path)) return 'home';
                    if (/^globalWallpaper$/i.test(path)) return 'settings';
                    if (/wallpaper/i.test(path) || /desktopMask$/.test(path)) return 'home';
                    return '';
                }

                function applyRevealAssetState(assetPath) {
                    var p = String(assetPath || '');
                    var batt = /^statusConfig\.battery\.(\d)$/.exec(p);
                    if (batt) {
                        sim.batteryLevel = Number(batt[1]);
                        sim.isCharging = false;
                        return;
                    }
                    var chg = /^statusConfig\.batteryCharging\.(\d)$/.exec(p);
                    if (chg) {
                        sim.batteryLevel = Number(chg[1]);
                        sim.isCharging = true;
                        return;
                    }
                    if (p === 'statusConfig.blConnected') { sim.bluetoothState = 'connected'; return; }
                    if (p === 'statusConfig.blConnecting') { sim.bluetoothState = 'connecting'; return; }
                    if (p === 'statusConfig.blDisconnected') { sim.bluetoothState = 'disconnected'; return; }
                    if (p === 'statusConfig.headsetWithMic') { sim.headsetState = 'withMic'; return; }
                    if (p === 'statusConfig.headsetWithoutMic') { sim.headsetState = 'withoutMic'; return; }
                    if (p === 'statusConfig.playing') { sim.playState = 'playing'; return; }
                    if (p === 'statusConfig.pause') { sim.playState = 'pause'; return; }
                    if (p === 'statusConfig.stop') { sim.playState = 'stop'; return; }
                    if (p === 'statusConfig.fmPlaying') { sim.playState = 'fmPlaying'; return; }
                    if (p === 'statusConfig.audiobookPlaying') { sim.playState = 'audiobookPlaying'; return; }
                    if (p === 'settingConfig.shuffleOn') { sim.shuffleEnabled = true; return; }
                    if (p === 'settingConfig.shuffleOff') { sim.shuffleEnabled = false; return; }
                    if (p === 'settingConfig.repeatOff') { sim.repeatMode = 'off'; return; }
                    if (p === 'settingConfig.repeatAll') { sim.repeatMode = 'all'; return; }
                    if (p === 'settingConfig.repeatOne') { sim.repeatMode = 'one'; return; }
                    if (p === 'settingConfig.fileExtensionOn') { sim.fileExtensionsEnabled = true; return; }
                    if (p === 'settingConfig.fileExtensionOff') { sim.fileExtensionsEnabled = false; return; }
                    if (p === 'settingConfig.keyLockOn') { sim.keyLockEnabled = true; return; }
                    if (p === 'settingConfig.keyLockOff') { sim.keyLockEnabled = false; return; }
                    if (p === 'settingConfig.keyToneOn') { sim.keyToneEnabled = true; return; }
                    if (p === 'settingConfig.keyToneOff') { sim.keyToneEnabled = false; return; }
                    if (p === 'settingConfig.keyVibrationOn') { sim.keyVibrationEnabled = true; return; }
                    if (p === 'settingConfig.keyVibrationOff') { sim.keyVibrationEnabled = false; return; }
                    if (p === 'settingConfig.displayBatteryOn') { sim.displayBatteryEnabled = true; return; }
                    if (p === 'settingConfig.displayBatteryOff') { sim.displayBatteryEnabled = false; return; }
                    if (p === 'settingConfig.wheelVolumeOn') { sim.wheelVolumeEnabled = true; return; }
                    if (p === 'settingConfig.wheelVolumeOff') { sim.wheelVolumeEnabled = false; return; }
                    if (p === 'settingConfig.speakerOn') { sim.speakerEnabled = true; return; }
                    if (p === 'settingConfig.speakerOff') { sim.speakerEnabled = false; return; }
                    var ws = /^settingConfig\.wheelSensitivity(Low|Standard|High)$/.exec(p);
                    if (ws) { sim.wheelSensitivity = ws[1].toLowerCase(); return; }
                    var hg = /^settingConfig\.headphoneGain(Low|Standard|High|Maximum)$/.exec(p);
                    if (hg) { sim.headphoneGain = hg[1].toLowerCase(); return; }
                    var td = /^settingConfig\.timedShutdown_(.+)$/.exec(p);
                    if (td) { sim.timedShutdownValue = td[1]; return; }
                    var bl = /^settingConfig\.backlight_(.+)$/.exec(p);
                    if (bl) { sim.backlightValue = bl[1]; return; }
                }

                container._y1TpApi = {
                    setOptionsToggleState: function (isOpen) {
                        if (!stripToggle || !hideWheel) return;
                        stripToggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
                        stripToggle.classList.toggle('is-active', !!isOpen);
                    },
                    setPreviewOptions: function (nextOpts) {
                        if (!nextOpts || typeof nextOpts !== 'object') return;
                        if (nextOpts.deviceMode !== undefined) {
                            previewOpts.deviceMode = normalizeDeviceMode(
                                nextOpts.deviceMode,
                                cfg.homePageConfig || {},
                                previewOpts.mode
                            );
                        }
                        if (nextOpts.showLegacyHome !== undefined) {
                            previewOpts.showLegacyHome = nextOpts.showLegacyHome === true;
                        }
                        if (nextOpts.showUnimplementedHome !== undefined) {
                            previewOpts.showUnimplementedHome = nextOpts.showUnimplementedHome === true;
                        }
                        homeItems = buildHomeItems(cfg.homePageConfig || {}, settingCfg, previewOpts);
                        if (sim.themeViewId === 'home') {
                            sim.themeSelectedIndex = Math.max(0, Math.min(sim.themeSelectedIndex, Math.max(0, homeItems.length - 1)));
                        } else if (previewOpts.deviceMode === 'y1' && String(sim.themeViewId || '').indexOf('settingsCat_') === 0) {
                            sim.themeViewId = 'settings';
                            sim.themeSelectedIndex = 0;
                        }
                        paint();
                    },
                    snapshotState: function () {
                        return {
                            themeViewId: sim.themeViewId,
                            themeSelectedIndex: sim.themeSelectedIndex,
                            lastMenuScrollY: scrollState.lastY,
                            themeHistory: Array.isArray(sim.themeHistory) ? sim.themeHistory.slice() : [],
                            dialogVisible: !!sim.dialogVisible,
                            dialogTitle: sim.dialogTitle,
                            dialogMessage: sim.dialogMessage,
                            dialogOptions: Array.isArray(sim.dialogOptions) ? sim.dialogOptions.slice() : [],
                            dialogSelectedIndex: sim.dialogSelectedIndex,
                            batteryLevel: sim.batteryLevel,
                            isCharging: sim.isCharging,
                            playState: sim.playState,
                            bluetoothState: sim.bluetoothState,
                            headsetState: sim.headsetState,
                            timedShutdownValue: sim.timedShutdownValue,
                            backlightValue: sim.backlightValue,
                            shuffleEnabled: sim.shuffleEnabled,
                            repeatMode: sim.repeatMode,
                            fileExtensionsEnabled: sim.fileExtensionsEnabled,
                            keyLockEnabled: sim.keyLockEnabled,
                            keyToneEnabled: sim.keyToneEnabled,
                            keyVibrationEnabled: sim.keyVibrationEnabled,
                            displayBatteryEnabled: sim.displayBatteryEnabled,
                            wheelSensitivity: sim.wheelSensitivity,
                            wheelVolumeEnabled: sim.wheelVolumeEnabled,
                            headphoneGain: sim.headphoneGain,
                            speakerEnabled: sim.speakerEnabled,
                            fmFreq: sim.fmFreq,
                            btEnabled: sim.btEnabled
                        };
                    },
                    restoreState: function (snap) {
                        if (!snap) return false;
                        sim.themeViewId = snap.themeViewId || 'home';
                        sim.themeSelectedIndex = Number(snap.themeSelectedIndex) || 0;
                        sim.themeHistory = Array.isArray(snap.themeHistory) ? snap.themeHistory.slice() : [];
                        sim.dialogVisible = !!snap.dialogVisible;
                        sim.dialogTitle = snap.dialogTitle || '';
                        sim.dialogMessage = snap.dialogMessage || '';
                        sim.dialogOptions = Array.isArray(snap.dialogOptions) ? snap.dialogOptions.slice() : [];
                        sim.dialogSelectedIndex = Number(snap.dialogSelectedIndex) || 0;
                        sim.batteryLevel = snap.batteryLevel;
                        sim.isCharging = snap.isCharging;
                        sim.playState = snap.playState;
                        sim.bluetoothState = snap.bluetoothState;
                        sim.headsetState = snap.headsetState;
                        sim.timedShutdownValue = snap.timedShutdownValue;
                        sim.backlightValue = snap.backlightValue;
                        sim.shuffleEnabled = snap.shuffleEnabled;
                        sim.repeatMode = snap.repeatMode;
                        sim.fileExtensionsEnabled = snap.fileExtensionsEnabled;
                        sim.keyLockEnabled = snap.keyLockEnabled;
                        sim.keyToneEnabled = snap.keyToneEnabled;
                        sim.keyVibrationEnabled = snap.keyVibrationEnabled;
                        sim.displayBatteryEnabled = snap.displayBatteryEnabled;
                        if (snap.wheelSensitivity !== undefined) sim.wheelSensitivity = snap.wheelSensitivity;
                        if (snap.wheelVolumeEnabled !== undefined) sim.wheelVolumeEnabled = snap.wheelVolumeEnabled;
                        if (snap.headphoneGain !== undefined) sim.headphoneGain = snap.headphoneGain;
                        if (snap.speakerEnabled !== undefined) sim.speakerEnabled = snap.speakerEnabled;
                        if (snap.fmFreq !== undefined) sim.fmFreq = snap.fmFreq;
                        if (snap.btEnabled !== undefined) sim.btEnabled = snap.btEnabled;
                        var restoreY = typeof snap.lastMenuScrollY === 'number' ? snap.lastMenuScrollY : null;
                        scrollState.lastViewId = sim.themeViewId;
                        if (restoreY != null) {
                            scrollState.lastY = restoreY;
                            scrollState.override = restoreY;
                        }
                        scrollState.animate = false;
                        try {
                            paint();
                        } finally {
                            scrollState.override = null;
                            scrollState.animate = true;
                        }
                        return true;
                    },
                    revealAsset: function (assetPath, revealOpts) {
                        if (!interactive || !assetPath) return false;
                        var silent = !!(revealOpts && revealOpts.silent);
                        var pathStr = String(assetPath);
                        if (!silent && !sim.dialogVisible) {
                            if (
                                (pathStr === 'itemConfig.itemSelectedBackground' ||
                                    pathStr === 'itemConfig.itemBackground') &&
                                canvas.querySelector('.y1-tp-row')
                            ) {
                                return true;
                            }
                            if (pathStr === 'itemConfig.itemRightArrow') {
                                var existingArrows = canvas.querySelectorAll(
                                    '[data-theme-asset-path="itemConfig.itemRightArrow"]'
                                );
                                for (var ea = 0; ea < existingArrows.length; ea++) {
                                    var eaWrap = existingArrows[ea].parentNode;
                                    if (eaWrap && eaWrap.offsetParent && eaWrap.style.display !== 'none') {
                                        return true;
                                    }
                                }
                            }
                        }
                        var view = assetContextView(assetPath);
                        if (!view) return false;
                        /* Temporarily include hidden Home items (e.g. Calendar, Calculator,
                           Shuffle Quick, File Manager in Y1 mode) when capturing thumbnails
                           or explicitly revealing them from the tray. */
                        var prevHomeItems = homeItems;
                        var tempHomeOverride = false;
                        if (view === 'home') {
                            var hasInHome = homeItems.some(function (h) { return h && h.assetPath === assetPath; });
                            if (!hasInHome) {
                                homeItems = buildHomeItems(cfg.homePageConfig || {}, settingCfg, {
                                    mode: previewOpts.mode,
                                    deviceMode: 'both',
                                    showLegacyHome: true,
                                    showUnimplementedHome: true
                                });
                                tempHomeOverride = true;
                            }
                        }
                        sim.dialogVisible = false;
                        sim.themeHistory = [];
                        sim.themeViewId = view;
                        sim.themeSelectedIndex = 0;
                        applyRevealAssetState(assetPath);
                        var prevAnim = scrollState.animate;
                        if (silent) scrollState.animate = false;
                        try {
                            /* Dialog art only exists on screen while a dialog is up,
                               so give the author the shutdown dialog to look at
                               instead of an empty settings list. */
                            if (/^dialogConfig\./.test(String(assetPath))) {
                                sim.dialogVisible = true;
                                sim.dialogTitle = 'Shutdown';
                                sim.dialogMessage = 'Sure to shut down?';
                                sim.dialogOptions = ['Yes', 'No'];
                                sim.dialogSelectedIndex = 1;
                                paint();
                                return true;
                            }
                            try {
                                var items = isSettingsListView(view)
                                    ? settingsItemsForView(view)
                                    : view === 'settingsEqualizer'
                                      ? buildEqualizerItems(settingCfg, buildFileUrl, contentFolder)
                                      : view === 'home'
                                        ? homeItems
                                        : [];
                                for (var i = 0; i < items.length; i++) {
                                    if (items[i] && items[i].assetPath === assetPath) {
                                        sim.themeSelectedIndex = i;
                                        break;
                                    }
                                }
                            } catch (e) {}
                            paint();
                            return true;
                        } finally {
                            if (tempHomeOverride && silent) homeItems = prevHomeItems;
                            scrollState.animate = prevAnim;
                        }
                    },
                    showView: function (viewId, viewOpts) {
                        if (!interactive || !viewId) return false;
                        var silent = !!(viewOpts && viewOpts.silent);
                        sim.dialogVisible = false;
                        sim.themeHistory = [];
                        sim.themeViewId = String(viewId);
                        sim.themeSelectedIndex = 0;
                        var prevAnim = scrollState.animate;
                        if (silent) scrollState.animate = false;
                        try {
                            paint();
                        } finally {
                            scrollState.animate = prevAnim;
                        }
                        return true;
                    },
                    currentView: function () {
                        return sim.themeViewId;
                    },
                    /* The wallpaper and the mask this screen is drawn with, in
                       painting order: wallpaper first, then the mask over it. */
                    maskAtPoint: maskAtPoint,
                    assetAtPoint: assetAtPoint,
                    screenAssets: function () {
                        var out = [];
                        var wall = wallpaperAssetPathForView(cfg, sim.themeViewId);
                        var mask = maskAssetPathForView(sim.themeViewId);
                        if (wall) out.push(wall);
                        if (mask) out.push(mask);
                        return out;
                    }
                };

                container._y1TpCleanup = function () {
                    cleanedUp = true;
                    container._y1TpApi = null;
                    if (hoverFrame) {
                        global.cancelAnimationFrame(hoverFrame);
                        hoverFrame = 0;
                    }
                    if (wheelStepTimer) {
                        global.clearTimeout(wheelStepTimer);
                        wheelStepTimer = null;
                    }
                    if (wheelAccResetTimer) {
                        global.clearTimeout(wheelAccResetTimer);
                        wheelAccResetTimer = null;
                    }
                    wheelSteps = 0;
                    wheelDeltaAcc = 0;
                    preloadedArt.length = 0;
                    alphaCache = Object.create(null);
                    activeMenuList = null;
                    activeRightPanel = null;
                    if (ro) ro.disconnect();
                    if (interactive) {
                        dev.removeEventListener('keydown', onKeyDown);
                        if (wheel) {
                            if (wheel) {
                                wheel.removeEventListener('pointerdown', onWheelButtonPointerDownCap, true);
                                wheel.removeEventListener('wheel', onWheelDelta, wheelScrollOpts);
                                wheel.removeEventListener('pointerdown', onWheelPointerDown);
                                wheel.removeEventListener('pointermove', onWheelPointerMove);
                                wheel.removeEventListener('pointerup', onWheelPointerEnd);
                                wheel.removeEventListener('pointercancel', onWheelPointerEnd);
                            }
                        }
                        canvas.removeEventListener('pointermove', onRowHover);
                        canvas.removeEventListener('dblclick', onRowDoubleClick);
                        canvas.removeEventListener('pointerdown', onRowHoldStart);
                        canvas.removeEventListener('pointermove', onRowHoldMove);
                        canvas.removeEventListener('pointerup', onRowHoldEnd);
                        canvas.removeEventListener('pointercancel', onRowHoldEnd);
                        clearRowHold();
                    }
                    detachCwPointerTracking();
                    cwPointer = null;
                    var st = document.getElementById(fontStyleId);
                    if (st) st.remove();
                    global.clearTimeout(container._y1TpToastT);
                    container._y1TpCleanup = null;
                };

                function deliverReady() {
                    if (previewFrame) setPreviewLoading(previewFrame, false);
                    if (typeof opts.onReady === 'function') {
                        try {
                            opts.onReady(cfg, {
                                previewFontFamily: fontStack,
                                contentFolder: contentFolder,
                                fontStyleId: fontStyleId
                            });
                        } catch (e) {}
                    }
                }

                /* A gallery card is only "ready" once its own face, wallpaper
                   and status art have decoded; otherwise the first frame shows
                   the fallback font and then reflows. */
                if (isPreviewMode) {
                    var readyBg = backgroundUrlForView(
                        cfg,
                        sim.themeViewId,
                        buildFileUrl,
                        contentFolder,
                        true
                    );
                    waitForPreviewAssets(container, readyBg ? [readyBg] : [], fontStack).then(
                        deliverReady,
                        deliverReady
                    );
                } else {
                    deliverReady();
                }
            })
            .catch(function (err) {
                if (previewFrame) setPreviewLoading(previewFrame, false);
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
        setPreviewLoading(previewFrameFor(container), false);
        if (typeof container._y1TpCleanup === 'function') {
            try {
                container._y1TpCleanup();
            } catch (e) {}
        }
        container.innerHTML = '';
        container.classList.remove('y1-tp-mounted');
    }

    /**
     * Inject @font-face rules for a card theme (same style id as mount) and return the scoped
     * `font-family` stack for matching Download / Direct Install buttons.
     */
    function ensureCardPreviewFonts(cfg, opts) {
        opts = opts || {};
        if (!cfg || typeof cfg !== 'object') {
            return 'Arial, "Helvetica Neue", Helvetica, sans-serif';
        }
        var catalogFolder = String(opts.catalogFolder || '')
            .replace(/^\.\/+/, '')
            .trim();
        var variantSegment = String(opts.variantSegment || '').trim();
        var buildFileUrl =
            typeof opts.buildFileUrl === 'function' ? opts.buildFileUrl : defaultBuildFileUrl;
        var contentFolder = effectiveContentPrefix(catalogFolder, variantSegment);
        var fontStyleId = themePreviewFontStyleId(catalogFolder, variantSegment);
        if (!document.getElementById(fontStyleId)) {
            injectThemeFonts(cfg, buildFileUrl, contentFolder, fontStyleId, 'block');
        }
        return defaultFontStack(cfg, fontStyleId);
    }

    var _galleryMountActive = 0;
    var _galleryMountMax = 8;
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
        var opts = options || {};
        var frame = previewFrameFor(container);
        var showLoadingOverlay = opts.loadingOverlay !== false;
        if (showLoadingOverlay) setPreviewLoading(frame, true);
        primeGalleryPreview(opts);

        var settled = false;
        function finishPreviewLoading() {
            if (settled) return;
            settled = true;
            global.clearTimeout(failSafe);
            if (showLoadingOverlay) setPreviewLoading(frame, false);
        }
        var failSafe = global.setTimeout(finishPreviewLoading, 12000);

        var jobOpts = {};
        for (var k in opts) {
            if (Object.prototype.hasOwnProperty.call(opts, k)) jobOpts[k] = opts[k];
        }
        jobOpts.onReady = function (cfg, meta) {
            finishPreviewLoading();
            if (typeof opts.onReady === 'function') {
                try {
                    opts.onReady(cfg, meta);
                } catch (e) {}
            }
        };
        jobOpts.onError = function (err) {
            finishPreviewLoading();
            if (typeof opts.onError === 'function') {
                try {
                    opts.onError(err);
                } catch (e) {}
            }
        };

        var rect = container.getBoundingClientRect ? container.getBoundingClientRect() : null;
        var isAboveTheFold = rect && rect.top < (window.innerHeight || 800) + 100;
        if (opts.priority || isAboveTheFold || typeof IntersectionObserver === 'undefined') {
            if (_galleryMountActive < _galleryMountMax) {
                runGalleryMountJob(container, jobOpts);
            } else {
                _galleryMountQueue.unshift({ container: container, opts: jobOpts });
                drainGalleryMountQueue();
            }
            return;
        }
        var io = new IntersectionObserver(
            function (entries) {
                for (var i = 0; i < entries.length; i++) {
                    var ent = entries[i];
                    if (!ent.isIntersecting) continue;
                    io.unobserve(ent.target);
                    if (_galleryMountActive < _galleryMountMax) {
                        runGalleryMountJob(ent.target, jobOpts);
                    } else {
                        _galleryMountQueue.push({ container: ent.target, opts: jobOpts });
                    }
                }
            },
            { rootMargin: '350px 0px', threshold: 0.01 }
        );
        io.observe(container);
    }

    function loadCanvasImage(url, timeoutMs) {
        return new Promise(function (resolve) {
            if (!url || typeof Image === 'undefined') return resolve(null);
            var settled = false;
            var timer = null;
            var img = new Image();
            if (!/^(blob:|data:)/i.test(String(url))) {
                try {
                    img.crossOrigin = 'anonymous';
                } catch (e) {}
            }
            function finish(result) {
                if (settled) return;
                settled = true;
                if (timer) global.clearTimeout(timer);
                img.onload = null;
                img.onerror = null;
                resolve(result);
            }
            timer = global.setTimeout(function () {
                finish(null);
            }, timeoutMs || 4500);
            img.onload = function () {
                if (img.naturalWidth <= 1 && img.naturalHeight <= 1) {
                    finish(null);
                    return;
                }
                finish(img);
            };
            img.onerror = function () {
                finish(null);
            };
            img.src = url;
        });
    }

    function drawImageCover(ctx, img, dx, dy, dw, dh) {
        if (!ctx || !img || !img.naturalWidth || !img.naturalHeight) return;
        var nw = img.naturalWidth;
        var nh = img.naturalHeight;
        var scale = Math.max(dw / nw, dh / nh);
        var sw = dw / scale;
        var sh = dh / scale;
        var sx = (nw - sw) / 2;
        var sy = (nh - sh) / 2;
        ctx.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh);
    }

    function canvasToJpegBlob(canvas, quality) {
        return new Promise(function (resolve) {
            try {
                if (typeof canvas.toBlob === 'function') {
                    canvas.toBlob(
                        function (blob) {
                            resolve(blob || null);
                        },
                        'image/jpeg',
                        quality
                    );
                    return;
                }
                var dataUrl = canvas.toDataURL('image/jpeg', quality);
                if (!dataUrl || dataUrl.indexOf('data:image/jpeg') !== 0) return resolve(null);
                var bin = global.atob(dataUrl.split(',')[1] || '');
                var bytes = new Uint8Array(bin.length);
                for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
                resolve(new Blob([bytes], { type: 'image/jpeg' }));
            } catch (err) {
                resolve(null);
            }
        });
    }

    /**
     * Render a 480x360 Home screen JPEG capture directly in the user's browser
     * using the exact same layout metrics, colors, masks, icons, and fonts as
     * the live preview so uploads can include an accurate screenshot_preview.jpg
     * upfront (with GitHub Actions as an automatic fallback).
     */
    function renderHomeScreenshotBlob(cfg, options) {
        if (typeof document === 'undefined' || !cfg || typeof cfg !== 'object') {
            return Promise.resolve(null);
        }
        var opts = options || {};
        var catalogFolder = String(opts.catalogFolder || '')
            .replace(/^\.\/+/, '')
            .trim();
        var variantSegment = String(opts.variantSegment || '').trim();
        var contentFolder = effectiveContentPrefix(catalogFolder, variantSegment);
        var buildFileUrl =
            typeof opts.buildFileUrl === 'function' ? opts.buildFileUrl : defaultBuildFileUrl;
        var maxBytes = typeof opts.maxBytes === 'number' && opts.maxBytes > 4096 ? opts.maxBytes : 32000;

        var fontStyleId = 'y1-tp-shot-font-' + (++_specFontMountSeq);
        injectThemeFonts(cfg, buildFileUrl, contentFolder, fontStyleId, 'block');
        var fontStack = defaultFontStack(cfg, fontStyleId);

        var itemCfg = cfg.itemConfig || {};
        var menuCfg = cfg.menuConfig || {};
        var statusCfg = cfg.statusConfig || {};
        var settingCfg = cfg.settingConfig || {};
        var colors = buildColors(itemCfg, menuCfg, statusCfg, cfg, catalogFolder);
        var statusH = statusBarHeightPx(cfg);
        var isSel9Patch = isNinePatchCandidate(
            itemCfg,
            itemCfg.itemSelectedBackground || menuCfg.menuItemSelectedBackground || ''
        );

        var prevStudioLocale = global.STUDIO_PREVIEW_LOCALE;
        var homeItems = [];
        try {
            global.STUDIO_PREVIEW_LOCALE = 'en';
            homeItems = buildHomeItems(cfg.homePageConfig || {}, settingCfg);
        } finally {
            if (prevStudioLocale === undefined) delete global.STUDIO_PREVIEW_LOCALE;
            else global.STUDIO_PREVIEW_LOCALE = prevStudioLocale;
        }

        function resolveSlotVisual(val) {
            if (!val) return null;
            if (isHexColor8or6(val)) return { color: String(val).trim(), url: '' };
            var u = buildFileUrl(contentFolder, val);
            return u ? { color: '', url: u } : null;
        }

        var itemBgVis = resolveSlotVisual(itemCfg.itemBackground);
        if (!itemBgVis && menuCfg.menuItemBackground && !isHexColor8or6(menuCfg.menuItemBackground)) {
            itemBgVis = resolveSlotVisual(menuCfg.menuItemBackground);
        }
        var itemSelVis =
            resolveSlotVisual(itemCfg.itemSelectedBackground) ||
            resolveSlotVisual(menuCfg.menuItemSelectedBackground) || {
                color: 'rgba(255,255,255,0.12)',
                url: ''
            };

        var wallUrl = backgroundUrlForView(cfg, 'home', buildFileUrl, contentFolder, false);
        var maskUrl = cfg.desktopMask ? buildFileUrl(contentFolder, cfg.desktopMask) : '';
        var battUrl = getBatteryIconUrl(statusCfg, buildFileUrl, contentFolder, 3, false);
        var arrowUrl = itemCfg.itemRightArrow ? buildFileUrl(contentFolder, itemCfg.itemRightArrow) : '';
        var firstItem = homeItems[0] || null;
        var heroUrl = firstItem && firstItem.iconFile ? buildFileUrl(contentFolder, firstItem.iconFile) : '';

        var fontWait = Promise.race([
            waitForFontFamily(fontStack),
            new Promise(function (resolve) {
                global.setTimeout(resolve, 2600);
            })
        ]);

        return Promise.all([
            fontWait,
            loadCanvasImage(wallUrl, 4500),
            loadCanvasImage(maskUrl, 4500),
            loadCanvasImage(battUrl, 3000),
            loadCanvasImage(arrowUrl, 3000),
            loadCanvasImage(heroUrl, 4500),
            itemBgVis && itemBgVis.url ? loadCanvasImage(itemBgVis.url, 3000) : Promise.resolve(null),
            itemSelVis && itemSelVis.url ? loadCanvasImage(itemSelVis.url, 3000) : Promise.resolve(null)
        ])
            .then(function (loaded) {
                var wallImg = loaded[1];
                var maskImg = loaded[2];
                var battImg = loaded[3];
                var arrowImg = loaded[4];
                var heroImg = loaded[5];
                var itemBgImg = loaded[6];
                var itemSelImg = loaded[7];

                var canvas = document.createElement('canvas');
                canvas.width = W;
                canvas.height = H;
                var ctx = canvas.getContext('2d');
                if (!ctx) return null;

                /* 1. Background & wallpaper (object-fit: cover). */
                ctx.fillStyle = '#000000';
                ctx.fillRect(0, 0, W, H);
                if (wallImg) {
                    drawImageCover(ctx, wallImg, 0, 0, W, H);
                }

                /* 2. Desktop mask overlay (z-index 5, object-fit: cover). */
                if (maskImg) {
                    drawImageCover(ctx, maskImg, 0, 0, W, H);
                }

                /* 3. Home menu rows (clipped to HOME_MENU box). */
                ctx.save();
                ctx.beginPath();
                ctx.rect(HOME_MENU_LEFT, HOME_MENU_TOP, HOME_MENU_WIDTH, HOME_MENU_HEIGHT);
                ctx.clip();

                for (var idx = 0; idx < homeItems.length; idx++) {
                    var item = homeItems[idx];
                    var rowY = HOME_MENU_TOP + idx * HOME_ROW_HEIGHT;
                    if (rowY >= HOME_MENU_TOP + HOME_MENU_HEIGHT) break;
                    var selected = idx === 0;
                    var rowX = HOME_MENU_LEFT + HOME_ROW_LEFT_PAD;
                    var rowW = HOME_ROW_WIDTH;
                    var rowH = HOME_ROW_HEIGHT;

                    if (selected) {
                        if (itemSelImg) {
                            var shotNp = isSel9Patch ? parseNinePatchImage(itemSelImg) : null;
                            if (!shotNp || !drawNinePatchOnCanvas(ctx, shotNp, rowX, rowY, rowW, rowH)) {
                                ctx.drawImage(itemSelImg, rowX, rowY, rowW, rowH);
                            }
                        } else if (itemSelVis && itemSelVis.color) {
                            ctx.fillStyle = itemSelVis.color;
                            ctx.fillRect(rowX, rowY, rowW, rowH);
                        }
                    } else if (itemBgImg) {
                        ctx.drawImage(itemBgImg, rowX, rowY, rowW, rowH);
                    } else if (itemBgVis && itemBgVis.color) {
                        ctx.fillStyle = itemBgVis.color;
                        ctx.fillRect(rowX, rowY, rowW, rowH);
                    }

                    /* Label text clipped to [rowX + 5, rowX + rowW - 42]. */
                    ctx.save();
                    ctx.beginPath();
                    ctx.rect(rowX + 5, rowY, Math.max(10, rowW - 47), rowH);
                    ctx.clip();
                    ctx.fillStyle = selected ? colors.text_selected : colors.text_primary;
                    ctx.font = '700 22px ' + fontStack;
                    ctx.textBaseline = 'middle';
                    ctx.textAlign = 'left';
                    ctx.fillText(String(item.label || ''), rowX + 5, rowY + rowH / 2 + 1);
                    ctx.restore();

                    if (selected) {
                        if (arrowImg && arrowImg.naturalWidth && arrowImg.naturalHeight) {
                            var aScale = Math.min(rowH / arrowImg.naturalHeight, 64 / arrowImg.naturalWidth, 64 / arrowImg.naturalHeight);
                            var aw = Math.max(1, arrowImg.naturalWidth * aScale);
                            var ah = Math.max(1, arrowImg.naturalHeight * aScale);
                            ctx.save();
                            ctx.globalAlpha = 0.9;
                            ctx.drawImage(arrowImg, rowX + rowW - 10 - aw, rowY + (rowH - ah) / 2, aw, ah);
                            ctx.restore();
                        } else {
                            ctx.save();
                            ctx.fillStyle = colors.text_selected;
                            ctx.font = '700 22px ' + fontStack;
                            ctx.textBaseline = 'middle';
                            ctx.textAlign = 'right';
                            ctx.fillText('\u203A', rowX + rowW - 10, rowY + rowH / 2);
                            ctx.restore();
                        }
                    }
                }
                ctx.restore();

                /* 4. Right-hand preview tile for the first Home item. */
                if (heroImg && heroImg.naturalWidth && heroImg.naturalHeight) {
                    var maxPrevH = Math.max(40, H - HOME_PREVIEW_TOP_MARGIN - 8);
                    var tileX = W - HOME_PREVIEW_RIGHT_MARGIN - HOME_PREVIEW_WIDTH;
                    var tileY = HOME_PREVIEW_TOP_MARGIN;
                    var fitScale = Math.min(
                        1,
                        HOME_PREVIEW_WIDTH / heroImg.naturalWidth,
                        maxPrevH / heroImg.naturalHeight
                    );
                    var drawW = heroImg.naturalWidth * fitScale;
                    var drawH = heroImg.naturalHeight * fitScale;
                    var drawX = tileX + (HOME_PREVIEW_WIDTH - drawW) / 2;
                    ctx.drawImage(heroImg, drawX, tileY, drawW, drawH);
                }

                /* 5. Status bar (z-index 20). */
                ctx.fillStyle = colors.status_bar_bg || 'rgba(0,0,0,0.25)';
                ctx.fillRect(0, 0, W, statusH);
                ctx.fillStyle = colors.status_text || '#ffffff';
                ctx.font = '700 20px ' + fontStack;
                ctx.textBaseline = 'middle';
                ctx.textAlign = 'left';
                ctx.fillText('Home', 14, statusH / 2 + 1);

                var pctText = '100%';
                ctx.font = '700 16px ' + fontStack;
                ctx.textAlign = 'right';
                var rightEdge = W - 14;
                var pctWidth = ctx.measureText(pctText).width;
                ctx.fillText(pctText, rightEdge, statusH / 2 + 1);
                if (battImg && battImg.naturalWidth && battImg.naturalHeight) {
                    var bh = 15;
                    var bw = Math.max(1, (battImg.naturalWidth / battImg.naturalHeight) * bh);
                    ctx.drawImage(battImg, rightEdge - pctWidth - 6 - bw, (statusH - bh) / 2, bw, bh);
                } else {
                    var bx = rightEdge - pctWidth - 4 - 22;
                    var by = (statusH - 11) / 2;
                    var borderCol =
                        colors.status_text && String(colors.status_text).charAt(0) === '#'
                            ? colors.status_text
                            : '#ffffff';
                    ctx.save();
                    ctx.strokeStyle = borderCol;
                    ctx.lineWidth = 1;
                    ctx.strokeRect(bx + 0.5, by + 0.5, 21, 10);
                    var grad = ctx.createLinearGradient(0, by + 2, 0, by + 9);
                    grad.addColorStop(0, '#7ef29a');
                    grad.addColorStop(1, '#2db84d');
                    ctx.fillStyle = grad;
                    ctx.fillRect(bx + 2, by + 2, 16, 7);
                    ctx.restore();
                }

                var qualities = [0.76, 0.66, 0.58, 0.5, 0.44];
                function encodeAt(qi) {
                    return canvasToJpegBlob(canvas, qualities[qi]).then(function (blob) {
                        if (!blob || blob.size === 0) return null;
                        if (blob.size <= maxBytes || qi >= qualities.length - 1) return blob;
                        return encodeAt(qi + 1);
                    });
                }
                return encodeAt(0);
            })
            .catch(function () {
                return null;
            })
            .finally(function () {
                try {
                    var st = document.getElementById(fontStyleId);
                    if (st && st.parentNode) st.parentNode.removeChild(st);
                } catch (e) {}
            });
    }

    global.Y1ThemePreview = {
        mount: mount,
        unmount: unmount,
        effectiveContentPrefix: effectiveContentPrefix,
        mountGalleryCardLazy: mountGalleryCardLazy,
        previewAssetUrl: previewAssetUrl,
        ensureCardPreviewFonts: ensureCardPreviewFonts,
        renderHomeScreenshotBlob: renderHomeScreenshotBlob
    };
})(typeof window !== 'undefined' ? window : this);
