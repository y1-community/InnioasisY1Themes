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
    /* Y1 item_setting.xml is 40dip. Y2 switches to its 45dp
       main_item_height, so callers pass that row height explicitly. */
    var SETTINGS_ROW_HEIGHT = 40;

    var SETTINGS_RIGHT_W = 179;
    var SETTINGS_RIGHT_MARGIN = 22;

    /* better-Y's plus_logo is drawn by the launcher itself, not read from
       settingConfig. SettingActivity hardcodes it on the better-Y row and
       MenuStyle.betterY falls back to it when the theme has no better-y.*
       file, so the preview must not look for it inside the theme. */
    var NATIVE_BETTER_Y_LOGO_URL = (function () {
        if (typeof document === 'undefined') return 'assets/native-y1/better-y.png';
        var script = document.currentScript;
        if (script && script.src) {
            try {
                return new URL('assets/native-y1/better-y.png', script.src).href;
            } catch (e) {}
        }
        return '/assets/native-y1/better-y.png';
    })();

    /* Launcher-owned art used by ThemeListActivity. The default row never
       draws the theme's own cover: ThemeListActivity switches it to
       R.drawable.icon_theme_default_cover2, whose Y1 and Y2 versions are
       different HoloPebble illustrations. The installed themes' icons are
       the cover.png files copied out of assets/themeN. */
    var NATIVE_STUDIO_ASSET_BASE_URL = (function () {
        if (typeof document === 'undefined') return 'assets/';
        var script = document.currentScript;
        if (script && script.src) {
            try {
                return new URL('assets/', script.src).href;
            } catch (e) {}
        }
        return '/assets/';
    })();

    function nativeStudioAssetUrl(relativePath) {
        var relative = String(relativePath || '')
            .replace(/^\.\//, '')
            .replace(/^\/+/, '');
        if (relative.indexOf('assets/') === 0) relative = relative.slice('assets/'.length);
        return NATIVE_STUDIO_ASSET_BASE_URL + relative;
    }

    /* Solar's own shortcut icons, not theme slots: HomeMenuConfig gives
       PC Upload `file_sync` and Podcasts/Get Music `music_list`. */
    var NATIVE_SOLAR_FILE_SYNC_URL = nativeStudioAssetUrl('assets/native-y1/solar-file-sync.png');
    var NATIVE_SOLAR_MUSIC_LIST_URL = nativeStudioAssetUrl('assets/native-y1/solar-music-list.png');

    var THEME_SELECTOR_DEFAULT_COVER_URLS = {
        y1: nativeStudioAssetUrl('assets/native-y1/theme-default-cover.png'),
        y2: nativeStudioAssetUrl('assets/native-y2/theme-default-cover.png')
    };
    /* Music.apk's own R.drawable.albumart_mp_unknown, used for a track with no
       embedded cover. This is deliberately not themeCover: the theme cover is
       the gallery/theme-switcher artwork, not the player's album art. */
    var UNKNOWN_ALBUM_ART_URL = nativeStudioAssetUrl('assets/albumart-unknown.png');
    var BUNDLED_THEME_COVER_URLS = {
        y1: {
            theme1: nativeStudioAssetUrl('assets/bundled-themes/y1/theme1.png'),
            theme2: nativeStudioAssetUrl('assets/bundled-themes/y1/theme2.png'),
            theme3: nativeStudioAssetUrl('assets/bundled-themes/y1/theme3.png'),
            theme4: nativeStudioAssetUrl('assets/bundled-themes/y1/theme4.png')
        },
        y2: {
            theme1: nativeStudioAssetUrl('assets/bundled-themes/y2/theme1.png'),
            theme2: nativeStudioAssetUrl('assets/bundled-themes/y2/theme2.png'),
            theme3: nativeStudioAssetUrl('assets/bundled-themes/y2/theme3.png'),
            theme4: nativeStudioAssetUrl('assets/bundled-themes/y2/theme4.png'),
            theme5: nativeStudioAssetUrl('assets/bundled-themes/y2/theme5.png')
        }
    };

    /* AboutActivity reads StatFs live. Y1's formatCapacity() labels a
       128 GB unit 128G; Y2 prints the real internal-storage total with one
       decimal. These two mock volumes match the stock screenshots. */
    var ABOUT_VOLUMES = {
        y1: { total: 128, used: 33.4, available: 94.6 },
        y2: { total: 116.5, used: 1.3, available: 115.1 }
    };

    function aboutVolume(fw) {
        return ABOUT_VOLUMES[fw && fw.modelId === 'y1' ? 'y1' : 'y2'];
    }

    function aboutPieBackground(fw) {
        var volume = aboutVolume(fw);
        var angle = (volume.available / volume.total) * 360;
        return (
            'conic-gradient(from 90deg, #FFCC23 0deg ' +
            (360 - angle).toFixed(1) +
            'deg, #3CFFDE ' +
            (360 - angle).toFixed(1) +
            'deg 360deg)'
        );
    }

    function aboutVersionName(fw) {
        var version = fw && fw.version;
        return String((version && version.aboutVersion) || (version && version.versionName) || (fw && fw.versionId) || '');
    }

    function aboutVersionLabel(fw) {
        var version = fw && fw.version;
        return String((version && version.aboutVersionLabel) || 'System Version:');
    }

    function aboutInfoText(fw) {
        var volume = aboutVolume(fw);
        var isY1 = fw && fw.modelId === 'y1';
        var available = isY1 ? volume.available.toFixed(1) + 'G' : volume.available.toFixed(1) + 'GB';
        var used = volume.used.toFixed(1) + (isY1 ? 'G' : 'GB');
        var total = isY1 ? volume.total + 'G' : volume.total.toFixed(1) + 'GB';
        return (
            'Total: ' +
            total +
            '\nUsed: ' +
            used +
            '\nAvailable: ' +
            available +
            '\n' +
            aboutVersionLabel(fw) +
            ' ' +
            aboutVersionName(fw)
        );
    }

    /** Matches Theme Maker `constants.tsx` MOCK_SONGS for now-playing preview. */
    var MOCK_SONGS_PREVIEW = [
        { id: '1', title: 'Blinding Lights', artist: 'The Weeknd', album: 'After Hours', duration: 200 },
        { id: '2', title: 'Escapism.', artist: 'RAYE', album: 'My 21st Century Blues', duration: 272 },
        { id: '3', title: 'Easy On Me', artist: 'Adele', album: '30', duration: 224 },
        { id: '4', title: 'Wonderwall', artist: 'Oasis', album: '(What\u2019s the Story) Morning Glory?', duration: 258 },
        { id: '5', title: 'Billie Jean', artist: 'Michael Jackson', album: 'Thriller', duration: 294 }
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
        settingsBetterY: 'better-Y',
        settingsBetterYPlayer: 'better-Y',
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
        radio: 'Radio',
        wifiTransfer: 'Wi\u2011Fi Transfer',
        podcasts: 'Podcasts',
        getMusic: 'Get Music',
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

    function isY2DefaultTheme(cfg, catalogFolder, deviceMode) {
        if (String(deviceMode || '').toLowerCase() === 'y1') return false;
        var folder = String(catalogFolder || '').trim().replace(/\\/g, '/').toLowerCase();
        if (folder === 'y2_default') return true;
        /* HoloPebble's Y2 root is the factory built-in light launcher: the one
           screen where StatusBarFloatView draws dark glyphs. Its Y1 model is a
           normal custom dark theme and keeps white glyphs. */
        if (/^holopebble(\/|$)/.test(folder) && folder.indexOf('/models/y1') === -1) return true;
        var title = String((cfg && cfg.theme_info && cfg.theme_info.title) || '').trim().toLowerCase();
        var statusText = String((cfg && cfg.statusConfig && cfg.statusConfig.statusTextColor) || '').trim().toLowerCase();
        if (title === 'y2 default' && statusText && statusText !== '#ffffff' && statusText !== '#fff') {
            return true;
        }
        return false;
    }

    /* ---------------------------------------------------------------------
       Firmware level
       The simulator draws the menu tree of one stock launcher. When the Studio
       hands over a `firmware` option, studio-test/firmware-catalog.js decides
       which rows exist; without it (theme page folder simulator) these defaults
       describe the latest Y1 and Y2 releases.
       --------------------------------------------------------------------- */
    var FIRMWARE_DEFAULTS = {
        y1: {
            id: '3.1.2',
            settingsStyle: 'flat',
            fileManager: false,
            fm: true,
            musicSettingsRows: null,
            home: ['nowPlaying', 'music', 'video', 'audiobooks', 'ebook', 'photos', 'fm', 'bluetooth', 'settings']
        },
        y2: {
            id: '3.2.8',
            settingsStyle: 'categories',
            fileManager: true,
            fm: true,
            musicSettingsRows: ['song_name_display', 'list_sort', 'artist_view', 'album_view', 'album_art_style'],
            home: [
                'nowPlaying',
                'music',
                'video',
                'audiobooks',
                'ebook',
                'photos',
                'fm',
                'fileManager',
                'settings'
            ]
        }
    };

    function firmwareCatalogApi() {
        return typeof window !== 'undefined' && window.Y1FirmwareCatalog ? window.Y1FirmwareCatalog : null;
    }

    function firmwareFor(opts) {
        var o = opts || {};
        var device = o.deviceMode === 'y1' ? 'y1' : 'y2';
        var fw = o.firmware || null;
        var requested = '';
        if (typeof fw === 'string') requested = fw;
        else if (fw && typeof fw === 'object') requested = fw[device] || '';
        var cat = firmwareCatalogApi();
        if (cat && typeof cat.version === 'function') {
            var version = cat.version(device, requested || (cat.model(device) || {}).latest);
            if (version) {
                var rows = typeof cat.musicSettingsRows === 'function'
                    ? cat.musicSettingsRows(version.musicSettings)
                    : null;
                return {
                    modelId: device,
                    versionId: version.id,
                    label: version.label || version.id,
                    version: version,
                    settingsStyle: version.settingsStyle || 'flat',
                    fileManager: version.fileManager !== false,
                    fm: version.fm !== false,
                    themes: version.themes !== false,
                    musicSettingsRows: rows,
                    bundledThemes:
                        version.bundledThemes ||
                        (cat && typeof cat.bundledThemes === 'function'
                            ? cat.bundledThemes(device, version.baseFirmware || version.id)
                            : []),
                    home: version.home || [],
                    menuProfile: version.menuProfile || 'stock',
                    /* The player a build ships, separate from its menu tree:
                       a launcher can keep Better-Y menus without replacing
                       activity_music_player. */
                    playerProfile:
                        version.playerProfile ||
                        (version.solar === true
                            ? 'solar'
                            : version.menuProfile === 'better-y'
                              ? 'better-y'
                              : 'stock'),
                    solar: version.solar === true,
                    /* Keys declared behind the launcher's internal flag: the
                       release carries the trace, so only it can preview them. */
                    hiddenHome: version.hiddenHome || [],
                    catalog: cat
                };
            }
        }
        var fallback = FIRMWARE_DEFAULTS[device];
        return {
            modelId: device,
            versionId: requested || fallback.id,
            label: device.toUpperCase() + ' ' + (requested || fallback.id),
            version: null,
            settingsStyle: fallback.settingsStyle,
            fileManager: fallback.fileManager,
            fm: fallback.fm,
            themes: true,
            musicSettingsRows: fallback.musicSettingsRows,
            bundledThemes: [],
            home: fallback.home,
            menuProfile: 'stock',
            playerProfile: 'stock',
            solar: false,
            catalog: null
        };
    }

    /* Switching the Preview As target must feel like changing the player under
       the same activity, not like being sent home. Keep the current screen when
       the new launcher has it; map the few launcher-specific variants to their
       nearest equivalent (Better-Y settings ↔ stock settings, Y2 categories →
       the flat list, an unavailable File Manager/FM screen → Home). Now Playing
       and every media browser keep their exact view id across launchers. */
    function equivalentThemeView(viewId, fw) {
        var id = String(viewId || '');
        if (!id || !fw) return id;
        if (id === 'settingsBetterY' || id === 'settingsBetterYPlayer') {
            return fw.menuProfile === 'better-y' ? id : 'settings';
        }
        if (id === 'settings') {
            /* Settings is always the launcher's root list. Better-Y and
               Rockbox 0.6 put their better-Y row inside this list; jumping
               straight to the five better-Y groups skipped the real screen. */
            return id;
        }
        if (id.indexOf('settingsCat_') === 0) {
            if (fw.settingsStyle === 'categories') return id;
            return 'settings';
        }
        if (id === 'musicSettings' && !fw.musicSettingsRows) return 'music';
        if (
            (id === 'fileManager' || id === 'fileManagerList' || id === 'fileManagerSettings') &&
            !fw.fileManager
        ) {
            return 'home';
        }
        if (
            (id === 'fm' ||
                id === 'fmMenu' ||
                id === 'fmChannels' ||
                id === 'fmFavorites' ||
                id === 'fmAudioOutput' ||
                id === 'fmRange') &&
            !fw.fm
        ) {
            return 'home';
        }
        if (id === 'settingsTheme' && fw.themes === false) return 'settings';
        return id;
    }

    function buildHomeItems(homeCfg, settingCfg, opts) {
        homeCfg = homeCfg || {};
        settingCfg = settingCfg || {};
        opts = opts || {};
        var mode = String(opts.mode || 'menu').toLowerCase();
        var deviceMode = normalizeDeviceMode(opts.deviceMode, homeCfg, mode);
        var fw = firmwareFor({ deviceMode: deviceMode, firmware: opts.firmware });
        /* The release decides Home membership, not a studio toggle: Shuffle
           Quick is drawn by Y1 1.7.6–2.1.9 and dropped in 2.8.2, while
           Calculator and Calendar are declared behind an internal flag only
           from 2.8.2 onward (`hiddenHome`), so they never appear on a release
           with no trace of them. */
        var firmwareHome = fw.home || [];
        var revealAll = opts.showLegacyHome === true || opts.showUnimplementedHome === true;
        var betterMenu = fw.menuProfile === 'better-y';
        /* Unified is the full-coverage canvas, not a claim that one release
           shipped every row. It shows the union of the Home items so every
           Home asset can be reached; a Y1 or Y2 target stays exact. */
        var unified = deviceMode === 'both';
        var stockY1 = deviceMode === 'y1' && !betterMenu;
        var labelMap = {
            /* Y1 3.1.2 strings keep the stock lower-case "playing" and
               "radio"; Y2 3.2.8 and Better-Y v1.1.0 use title case. */
            nowPlaying: stockY1 ? 'Now playing' : 'Now Playing',
            music: 'Music',
            video: 'Videos',
            audiobooks: betterMenu ? 'Audiobooks' : 'Audiobook',
            ebook: betterMenu ? 'E-books' : 'E-book',
            calculator: 'Calculator',
            calendar: 'Calendar',
            photos: 'Photos',
            fm: stockY1 ? 'FM radio' : 'FM Radio',
            bluetooth: 'Bluetooth',
            fileManager: 'File Manager',
            settings: 'Settings',
            shuffleQuick: 'Shuffle quick'
        };
        /* Solar does not use MainActivity's list at all. HomeMenuConfig schema
           9 seeds these eight shortcuts; extra rows are Solar-native art, while
           the stock keys still resolve through homePageConfig. */
        if (fw.menuProfile === 'solar') {
            var solarKeys = (fw.home && fw.home.length
                ? fw.home
                : ['nowPlaying', 'music', 'ebook', 'radio', 'settings', 'wifiTransfer', 'podcasts', 'getMusic']
            ).slice();
            var solarLabels = {
                nowPlaying: 'Now Playing',
                music: 'Music',
                ebook: 'E-Book',
                radio: 'Radio',
                settings: 'Settings',
                wifiTransfer: 'Wi\u2011Fi Transfer',
                podcasts: 'Podcasts',
                getMusic: 'Get Music'
            };
            var solarNative = {
                wifiTransfer: NATIVE_SOLAR_FILE_SYNC_URL,
                podcasts: NATIVE_SOLAR_MUSIC_LIST_URL,
                getMusic: NATIVE_SOLAR_MUSIC_LIST_URL
            };
            return solarKeys.map(function (key) {
                var assetKey = key === 'radio' ? 'fm' : key;
                var file = solarNative[key] ? undefined : homePageIconFromCfg(homeCfg, assetKey);
                return {
                    id: key,
                    label: previewText(solarLabels[key] || key),
                    iconFile: typeof file === 'string' ? file : undefined,
                    iconUrl: solarNative[key] || undefined,
                    assetPath: solarNative[key] ? undefined : 'homePageConfig.' + assetKey
                };
            });
        }
        /* Exact firmware MainActivity.initView() order verified from Y1 1.7.6–3.1.2
           and Y2 3.1.7–3.2.8 APKs:
           - Y1: Now Playing, Music, Videos, Audiobook, E-book, [Calc, Cal], Photos, FM Radio, Bluetooth, Settings, [Shuffle Quick]
           - Y2: Now Playing, Music, Videos, Audiobook, E-book, [Calc, Cal], Photos, FM Radio, File Manager, Settings, [Shuffle Quick]
           - Both: Y2 layout + Bluetooth home item so authors can preview & edit both devices at once. */
        /* One Bluetooth slot, two screen positions. Y1 draws the Home icon;
           Y2 draws its Settings row from the same key. A package may carry a
           separate settingConfig.bluetooth for the Y2 look, but a theme with
           only one artwork uses it in both places. */
        var homeBluetooth = homePageIconFromCfg(homeCfg, 'bluetooth');
        var settingBluetooth = String(settingCfg.bluetooth || '').trim();
        var bluetoothAssetPath = 'homePageConfig.bluetooth';
        if (!isUsableHomeIcon(homeBluetooth) && isUsableHomeIcon(settingBluetooth)) {
            homeBluetooth = settingBluetooth;
            bluetoothAssetPath = 'settingConfig.bluetooth';
        }
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
                if (key === 'shuffleQuick') {
                    if (!unified && firmwareHome.indexOf(key) === -1) return false;
                    if (revealAll || mode === 'full') return true;
                    return isUsableHomeIcon(homePageIconFromCfg(homeCfg, key));
                }
                /* Calculator and Calendar are Unified-only coverage rows. No
                   stock release, Better-Y, Koensayr or Rockbox Home draws them:
                   their internal hidden flag is off, so a normal theme preview
                   must not inherit the Studio's full-coverage mode. Only an
                   explicit asset reveal (or Unified) may surface them. */
                if (key === 'calculator' || key === 'calendar') {
                    if (!unified && !revealAll) return false;
                    if (unified && (revealAll || mode === 'full')) return true;
                    return isUsableHomeIcon(homePageIconFromCfg(homeCfg, key));
                }
                if (key === 'fileManager') return (deviceMode === 'y2' || deviceMode === 'both') && fw.fileManager;
                if (key === 'fm') return fw.fm;
                /* Unified is Y2's Home without its Bluetooth row plus the Y1
                   row, so this check must run before the Y2 membership test. */
                if (key === 'bluetooth') {
                    if (deviceMode === 'y2' && fw.settingsStyle === 'categories') return false;
                    if (
                        deviceMode === 'y1' &&
                        fw.home &&
                        fw.home.length &&
                        fw.home.indexOf('bluetooth') === -1
                    ) {
                        return false;
                    }
                    return mode === 'full' ? true : isUsableHomeIcon(homeBluetooth);
                }
                /* A release that predates an item never draws it, whatever the
                   theme declares: the reader is looking at that firmware.
                   Unified is the exception: it deliberately shows every row. */
                if (unified) return true;
                if (fw.home && fw.home.length && fw.home.indexOf(key) === -1) return false;
                var file = homePageIconFromCfg(homeCfg, key);
                if (key === 'ebook') {
                    if (mode === 'full') return true;
                    return file !== undefined && isUsableHomeIcon(file);
                }
                return mode === 'full' ? true : file !== undefined;
            })
            .map(function (key) {
                var file = key === 'bluetooth' ? homeBluetooth : homePageIconFromCfg(homeCfg, key);
                return {
                    id: key,
                    label: previewText(labelMap[key] || key),
                    iconFile: typeof file === 'string' ? file : undefined,
                    assetPath: key === 'bluetooth' ? bluetoothAssetPath : 'homePageConfig.' + key
                };
            });
        return items;
    }

    function buildColors(itemCfg, menuCfg, statusCfg, cfg, catalogFolder, deviceMode) {
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
            status_text: statusTextColor(statusCfg, itemCfg, cfg, catalogFolder, deviceMode)
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

    function statusTextColor(statusCfg, itemCfg, cfg, catalogFolder, deviceMode) {
        /* On stock Y1 & Y2 hardware, StatusBarFloatView forces white text/icons
           for every custom theme; only the built-in factory Y2 light theme
           (HoloPebble, no theme chosen) renders dark ink in its status bar. */
        if (isY2DefaultTheme(cfg, catalogFolder, deviceMode)) {
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

    /* Solar reads the Now Playing info-row treatment from solarConfig first,
       then playerConfig for older packages. The aliases are the launcher's own:
       none/off/disabled/false and item/matchitem/match_item. */
    function nowPlayingInfoBarsMode(cfg) {
        var blocks = [cfg && cfg.solarConfig, cfg && cfg.playerConfig];
        for (var i = 0; i < blocks.length; i += 1) {
            var block = blocks[i];
            if (!block || !Object.prototype.hasOwnProperty.call(block, 'nowPlayingInfoBars')) continue;
            var mode = String(block.nowPlayingInfoBars || 'default').trim().toLowerCase();
            if (mode === 'none' || mode === 'off' || mode === 'disabled' || mode === 'false') return 'none';
            if (mode === 'item' || mode === 'matchitem' || mode === 'match_item') return 'item';
            return 'default';
        }
        return 'default';
    }

    function nowPlayingTextColor(cfg, fallback) {
        var blocks = [cfg && cfg.solarConfig, cfg && cfg.playerConfig];
        for (var i = 0; i < blocks.length; i += 1) {
            var block = blocks[i];
            if (!block) continue;
            var value = block.nowPlayingTextColour || block.nowPlayingTextColor;
            if (value) return value;
        }
        return fallback;
    }

    function progressTextColor(cfg, fallback) {
        var player = (cfg && cfg.playerConfig) || {};
        var value = player.progressTextColor || player.progressTextColour;
        if (value) return value;
        return nowPlayingTextColor(cfg, fallback);
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
        /* Only SettingActivity calls ThemeManager.setSettingMask. The
           About/Theme/Equalizer/... activities inherit BaseActivity's global
           wallpaper and paint no settingMask, so a settings-prefixed page must
           not inherit the settings list's overlay. */
        if (viewId === 'settings') return 'settingConfig.settingMask';
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

    /* File Manager rows add Size / Modified Date cells to the right of the
       name (activity_file_list row layout). One helper keeps the widths in a
       single place for both the row builder and its hit-testing. */
    function menuRowColumns(item) {
        return item && item.columns && item.columns.length ? item.columns : null;
    }

    function menuRowColumnsWidth(item) {
        var cols = menuRowColumns(item);
        if (!cols) return 0;
        var width = 0;
        for (var i = 0; i < cols.length; i++) width += i === 0 ? 86 : 124;
        return width;
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
        if (row._y1Columns) row._y1Columns.style.color = rowTextColor;
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
        if (item.noArrow) {
            if (row._y1Arrow) row._y1Arrow.style.display = 'none';
            return;
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
                        'width:' +
                        (menuRowColumns(item) ? 24 : 22) +
                        'px;height:' +
                        (menuRowColumns(item) ? 24 : 22) +
                        'px;margin-left:10px;margin-right:8px;object-fit:contain;flex-shrink:0;';
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
                    : 'position:absolute;left:5px;top:0;right:' +
                      (menuRowColumns(item) ? menuRowColumnsWidth(item) + 10 : 42) +
                      'px;height:' +
                      itemHeight +
                      'px;') +
                'display:flex;align-items:center;color:' +
                (selected ? colors.text_selected : colors.text_primary) +
                ';font-weight:' +
                (menuRowColumns(item) ? '600' : 'bold') +
                ';font-size:' +
                (menuRowColumns(item) ? '17' : '22') +
                'px;overflow:hidden;white-space:nowrap;';
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

            /* File Manager rows carry Size and Modified Date to the right of the
               name, the way activity_file_list rows lay them out. */
            if (menuRowColumns(item)) {
                var colWrap = document.createElement('div');
                colWrap.style.cssText =
                    'position:absolute;right:0;top:0;height:' +
                    itemHeight +
                    'px;display:flex;align-items:center;pointer-events:none;';
                for (var cj = 0; cj < menuRowColumns(item).length; cj++) {
                    var cell = document.createElement('div');
                    cell.textContent =
                        menuRowColumns(item)[cj] == null ? '' : String(menuRowColumns(item)[cj]);
                    cell.style.cssText =
                        'width:' +
                        (cj === 0 ? 86 : 124) +
                        'px;text-align:right;font-size:15px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;';
                    colWrap.appendChild(cell);
                }
                row.appendChild(colWrap);
                row._y1Columns = colWrap;
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
        var itemHeight = options.itemHeight || SETTINGS_ROW_HEIGHT;
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
        var slot = document.createElement('span');
        slot.className = 'y1-tp-status-slot' + (isBlankStatusFile(file) ? ' is-empty' : '');
        slot.setAttribute('data-theme-status-slot', key);
        slot.setAttribute('data-theme-slot-path', 'statusConfig.' + key);
        slot.setAttribute('data-theme-status-group', statusGroupForKey(key));
        slot.style.cssText =
            'position:relative;display:flex;align-items:center;justify-content:center;width:25px;height:25px;flex:0 0 25px;';
        if (preview !== raw) {
            img.onerror = function () {
                img.onerror = null;
                img.src = raw;
            };
        }
        bindPreviewImgFallback(img, { eager: mode === 'full' });
        slot.appendChild(img);
        rightEl.appendChild(slot);
        return img;
    }

    function isBlankStatusFile(file) {
        if (!file) return true;
        if (Array.isArray(file)) return file.every(isBlankStatusFile);
        if (typeof file === 'object') {
            return Object.keys(file).every(function (key) {
                return isBlankStatusFile(file[key]);
            });
        }
        return /(^|\/)transparent\.png$/i.test(String(file));
    }

    function statusGroupForKey(key) {
        var value = String(key || '');
        if (/^battery/i.test(value)) return 'battery';
        if (/^bl/.test(value)) return 'bluetooth';
        if (/^headset/i.test(value)) return 'headset';
        return 'playback';
    }

    function appendBatteryFallback(rightEl, pct, textColor, cfg, assetPath, showPercent) {
        var p = Number(pct);
        if (!isFinite(p)) p = 100;
        /* Stock's "batteryPercentage" preference hides only the number;
           the battery icon itself is always drawn. */
        var withPercent = showPercent !== false;
        var wrap = document.createElement('div');
        wrap.style.cssText =
            'display:flex;align-items:center;gap:4px;font-size:16px;color:#ffffff;';
        var box = document.createElement('div');
        box.setAttribute('data-theme-asset-path', assetPath || 'statusConfig.battery.3');
        box.setAttribute('data-theme-slot-path', assetPath || 'statusConfig.battery.3');
        box.setAttribute('data-theme-status-group', 'battery');
        box.className = 'y1-tp-status-slot-box';
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
        if (withPercent) {
            var sp = document.createElement('span');
            sp.textContent = p + '%';
            tagFontHotspot(sp, cfg, 'The battery figure');
            wrap.appendChild(sp);
        }
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
        var fw = firmwareFor({ deviceMode: deviceMode, firmware: opts.firmware });
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
        var albumArtStyle = sim.albumArtStyle === 'flat' ? 'flat' : 'perspective';

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
            /* Better-Y's own row is the first thing in its Settings list. The
               firmwares that do not carry Better-Y never see it. */
            better_y: {
                id: 'better_y',
                label: 'better-Y',
                iconUrl: NATIVE_BETTER_Y_LOGO_URL
            },
            shutdown: { id: 'shutdown', label: 'Shutdown', iconFile: settingConfig.shutdown, assetPath: 'settingConfig.shutdown' },
            reboot: {
                id: 'reboot',
                label: 'Reboot',
                iconFile: settingConfig.shutdown,
                assetPath: 'settingConfig.shutdown'
            },
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
            /* 1.7.6 built these two rows before File extensions/Theme existed;
               the strings are `setting_sort_order` = Sort by and
               `setting_sort_logic` = Sort order. */
            sort_order: { id: 'sort_order', label: 'Sort by', valueText: 'Name' },
            sort_logic: { id: 'sort_logic', label: 'Sort order', valueText: 'A to Z' },
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
                /* Y2 3.2.8 strings: Click Wheel Sensitivity. Y1 keeps the
                   shorter Wheel sensitivity. */
                label: deviceMode === 'y2' ? 'Click Wheel Sensitivity' : 'Wheel sensitivity',
                iconFile: settingConfig[wheelSensKey],
                assetPath: 'settingConfig.' + wheelSensKey,
                valueText: gt('wheel_sensitivity')
            },
            wheel_volume: {
                id: 'wheel_volume',
                label: deviceMode === 'y2' ? 'Adjust Volume with Click Wheel' : 'Wheel volume',
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
                /* Better-Y and Rockbox 0.6 renamed the shared preference; the
                   stock string is still Display battery. */
                label: fw.menuProfile === 'better-y' ? 'Battery percentage' : 'Display battery',
                iconFile: settingConfig[displayBatteryAssetKey],
                assetPath: 'settingConfig.' + displayBatteryAssetKey,
                valueText: gt('display_battery')
            },
            date_time: { id: 'date_time', label: 'Date & Time', iconFile: settingConfig.dateTime, assetPath: 'settingConfig.dateTime' },
            theme: { id: 'theme', label: 'Theme', iconFile: settingConfig.theme, assetPath: 'settingConfig.theme' },
            language: { id: 'language', label: 'Language', iconFile: settingConfig.language, assetPath: 'settingConfig.language' },
            /* Stock calls this row Launcher. Only the Rockbox 0.6 stock side
               has Rockbox installed, and only there does it read Rockbox. */
            rockbox: {
                id: 'rockbox',
                label: fw.version && fw.version.id === 'rockbox-0.6' ? 'Rockbox' : 'Launcher',
                iconFile: settingConfig.launcher,
                assetPath: 'settingConfig.launcher'
            },
            factory_reset: { id: 'factory_reset', label: 'Factory reset', iconFile: settingConfig.factoryReset, assetPath: 'settingConfig.factoryReset' },
            clear_cache: { id: 'clear_cache', label: 'Clear cache', iconFile: settingConfig.clearCache, assetPath: 'settingConfig.clearCache' },
            /* Rockbox 0.6 appends this literal row after About. */
            back_to_rockbox: {
                id: 'back_to_rockbox',
                label: 'Back to Rockbox',
                iconFile: settingConfig.launcher,
                assetPath: 'settingConfig.launcher'
            },
            bluetooth: {
                id: 'bluetooth',
                label: 'Bluetooth',
                iconFile: isUsableHomeIcon(settingConfig.bluetooth)
                    ? settingConfig.bluetooth
                    : homeCfg.bluetooth,
                assetPath: isUsableHomeIcon(settingConfig.bluetooth)
                    ? 'settingConfig.bluetooth'
                    : 'homePageConfig.bluetooth'
            },
            about: { id: 'about', label: 'About', iconFile: undefined }
        };

        var base;
        if (category === 'betterYPlayer') {
            /* Better-Y → Now Playing: help/en.txt [player] and the captured
               settings list. The labels and order are the player's own. */
            base = [
                { id: 'betterY_log', label: 'Save diagnostic log' },
                { id: 'betterY_np_preview', label: 'Now playing' },
                /* Prefs.java defaults all three to 0 LIGHT (white). */
                { id: 'betterY_icon_tint', label: 'Icon color', valueText: 'Light' },
                { id: 'betterY_text_tint', label: 'Text color', valueText: 'Light' },
                { id: 'betterY_lyrics_tint', label: 'Lyrics color', valueText: 'Light' },
                {
                    id: 'betterY_tilt',
                    label: 'Tilt the cover',
                    valueText: sim.betterYTilt === true ? 'On' : 'Off'
                }
            ];
        } else if (category === 'betterY') {
            /* Better-Y v1.1.0, the newest published release, lays out five
               groups in its help asset. Cover Flow only exists in later,
               unpublished development builds, so it is not a row here. */
            base = [
                { id: 'betterY_tools', label: 'Tools' },
                { id: 'betterY_player', label: 'Now Playing' },
                { id: 'betterY_menu', label: 'Menu' },
                { id: 'betterY_metadata', label: 'Metadata' },
                { id: 'betterY_system', label: 'System' }
            ];
        } else if (category === 'musicSettings') {
            /* Y2 Music → Settings. Rows and their existence come from the
               release: 3.1.7 opened with four, 3.2.0-fm added Album Art Style
               (music_setting_album_art_style / _flat / _perspective). */
            var musicRows = fw.musicSettingsRows;
            if (musicRows === null) {
                base = [];
            } else {
                var musicRowDefs = {
                    song_name_display: {
                        id: 'song_name_display',
                        label: 'Song Name Display',
                        valueText: sim.songNameDisplay === 'filename' ? 'Filename' : 'Song title'
                    },
                    list_sort: {
                        id: 'list_sort',
                        label: 'List Sort',
                        valueText: sim.listSort === 'desc' ? 'Z to A' : 'A to Z'
                    },
                    artist_view: {
                        id: 'artist_view',
                        label: 'Artist View',
                        valueText: sim.artistView === 'grid' ? 'Grid' : 'List'
                    },
                    album_view: {
                        id: 'album_view',
                        label: 'Album View',
                        valueText: sim.albumView === 'grid' ? 'Grid' : 'List'
                    },
                    album_art_style: {
                        id: 'album_art_style',
                        label: 'Album Art Style',
                        valueText: albumArtStyle === 'flat' ? 'Flat' : 'Perspective'
                    }
                };
                base = musicRows
                    .map(function (id) {
                        return musicRowDefs[id];
                    })
                    .filter(Boolean);
            }
        } else if (category === 'keysWheel') {
            base = [
                allEntries.key_lock,
                allEntries.wheel_sensitivity,
                allEntries.wheel_volume,
                allEntries.key_tone,
                allEntries.key_vibration
            ];
        } else if (category === 'audio') {
            /* Y2 3.2.8 Audio has exactly Headphone gain and Speaker. Equalizer,
               Shuffle and Repeat live elsewhere (or nowhere) and are not rows
               in this category. */
            base = [allEntries.headphone_gain, allEntries.speaker];
        } else if (category === 'display') {
            base = [allEntries.brightness, allEntries.backlight, allEntries.display_battery];
        } else if (category === 'personalization') {
            base = [allEntries.theme, allEntries.wallpaper];
        } else if (category === 'filesStorage') {
            base = [allEntries.file_extension, allEntries.clear_cache];
        } else if (category === 'system') {
            /* Launcher/Rockbox is a Y1 Settings row. Exact Y2 keeps the stock
               System list; Unified adds it so the full menu coverage still
               exposes its icon slot. */
            base = [allEntries.language, allEntries.date_time, allEntries.timed_shutdown];
            if (deviceMode === 'both' || deviceMode === 'y1') base.push(allEntries.rockbox);
            if (deviceMode === 'both') base.push(allEntries.shutdown);
        } else if (fw.menuProfile === 'solar') {
            /* Solar's SettingsActivity root (buildSettingsUI), not a stock
               flat list. Power is conditional on root access at runtime. */
            base = [
                { id: 'solar_playback', label: 'Playback' },
                { id: 'solar_flow', label: 'Flow' },
                { id: 'solar_device', label: 'Device' },
                { id: 'solar_connections', label: 'Connections' },
                { id: 'solar_library', label: 'Library' },
                { id: 'solar_appearance', label: 'Appearance' },
                { id: 'solar_media', label: 'Media' },
                { id: 'solar_reach', label: 'Reach' },
                { id: 'solar_power', label: 'Power' },
                { id: 'solar_reset', label: 'Reset' },
                { id: 'solar_update', label: 'Update' },
                { id: 'solar_report_issue', label: 'Report Issue' },
                { id: 'solar_donations', label: 'Donations' },
                { id: 'solar_about', label: 'About' }
            ];
        } else if (deviceMode === 'y1' || fw.settingsStyle !== 'categories') {
            /* Flat Settings list. Row membership comes from the release:
               1.7.6 has no Theme/Rockbox/File extensions/Clear cache, and
               2.8.2 adds Rockbox. Y2 3.1.7 also shipped a flat list. */
            var flat = {
                better_y: allEntries.better_y,
                shutdown: allEntries.shutdown,
                reboot: allEntries.reboot,
                timed_shutdown: allEntries.timed_shutdown,
                shuffle: allEntries.shuffle,
                repeat: allEntries.repeat,
                equalizer: allEntries.equalizer,
                sort_order: allEntries.sort_order,
                sort_logic: allEntries.sort_logic,
                file_extension: allEntries.file_extension,
                key_lock: allEntries.key_lock,
                key_tone: allEntries.key_tone,
                key_vibration: allEntries.key_vibration,
                wallpaper: allEntries.wallpaper,
                backlight: allEntries.backlight,
                brightness: allEntries.brightness,
                display_battery: allEntries.display_battery,
                date_time: allEntries.date_time,
                theme: allEntries.theme,
                language: allEntries.language,
                rockbox: allEntries.rockbox,
                factory_reset: allEntries.factory_reset,
                clear_cache: allEntries.clear_cache,
                about: allEntries.about,
                back_to_rockbox: allEntries.back_to_rockbox
            };
            var stockRows = [
                'shutdown',
                'timed_shutdown',
                'shuffle',
                'repeat',
                'equalizer',
                'file_extension',
                'key_lock',
                'key_tone',
                'key_vibration',
                'wallpaper',
                'backlight',
                'brightness',
                'display_battery',
                'date_time',
                'theme',
                'language',
                'factory_reset',
                'clear_cache',
                'about'
            ];
            var releaseRows = fw.version && fw.version.settingsRows ? fw.version.settingsRows : null;
            /* Use the release's own order: Better-Y moves better-Y to the top
               and Reboot directly under Shutdown, so filtering a fixed list
               would quietly put them back in stock order. */
            base = (releaseRows || stockRows)
                .filter(function (id) {
                    /* The Rockbox row is a Y1 setting; Y2 never ships it. */
                    if (id === 'rockbox' && deviceMode !== 'y1') return false;
                    return !!flat[id];
                })
                .map(function (id) {
                    return flat[id];
                });
        } else {
            /* Authentic Y2 3.2.8 categorized Settings root (used in Y2 and Both modes). */
            base = [
                allEntries.bluetooth,
                { id: 'cat_keysWheel', label: 'Keys & Wheel', iconFile: settingConfig.categoryKeysWheel, assetPath: 'settingConfig.categoryKeysWheel' },
                { id: 'cat_audio', label: 'Audio', iconFile: settingConfig.categoryAudio, assetPath: 'settingConfig.categoryAudio' },
                { id: 'cat_display', label: 'Display', iconFile: settingConfig.categoryDisplay, assetPath: 'settingConfig.categoryDisplay' },
                { id: 'cat_personalization', label: 'Personalization', iconFile: settingConfig.categoryPersonalization, assetPath: 'settingConfig.categoryPersonalization' },
                { id: 'cat_filesStorage', label: 'Files & Storage', iconFile: settingConfig.categoryFilesStorage, assetPath: 'settingConfig.categoryFilesStorage' },
                { id: 'cat_system', label: 'System', iconFile: settingConfig.categorySystem, assetPath: 'settingConfig.categorySystem' }
            ];
            /* Unified has no single launcher to be faithful to, so expose the
               Launcher / Rockbox row too; Y1 and Y2 stay release-exact. */
            if (deviceMode === 'both') base.push(allEntries.rockbox);
            base.push(allEntries.about, allEntries.factory_reset);
        }
        return base.map(function (item) {
            return {
                id: item.id,
                label: item.label,
                valueText: item.valueText,
                iconUrl: item.iconUrl || (item.iconFile ? buildFileUrl(contentFolder, item.iconFile) : ''),
                assetPath: item.assetPath
            };
        });
    }

    function createSimulatorState() {
        return {
            themeViewId: 'home',
            themeSelectedIndex: 0,
            themeHistory: [],
            /* Music → Settings values (Y2). Album Art Style is the 3.2.0-fm
               Perspective/Flat toggle; the rest shipped in 3.1.7. */
            albumArtStyle: 'perspective',
            /* Better-Y's own default: cover_tilt = 1, the stock iPod-like
               tilted look (Cover.java). */
            betterYTilt: true,
            songNameDisplay: 'songTitle',
            listSort: 'asc',
            artistView: 'list',
            albumView: 'list',
            /* File Manager state (Y2). */
            fileManagerStorage: 'internal',
            fileManagerPath: '/',
            fileManagerSortField: 'name',
            fileManagerSortOrder: 'asc',
            fileManagerShowHidden: false,
            fileManagerShowExtensions: false,
            /* FM Radio state (Y1 + Y2 3.2.0+). */
            fmAudioOutput: 'speaker',
            fmRegion: 'Europe',
            fmFavoriteFreqs: [985, 1015, 917],
            fmScanFreqs: [881, 917, 947, 985, 1015, 1048],
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
            /* ThemeListActivity is a 3-column grid. The launcher opens it on
               row 0; the Studio starts on the previewed theme instead, while
               keeping the same grid geometry and scrolling. */
            themeSelectorInitialized: false,
            themeGridScrollTop: 0,
            /* ThemeOptionsDialog (long-press bar) and its multi-select state. */
            themeOptionsVisible: false,
            themeOptionsIndex: 0,
            themeOptionsTargetIndex: 0,
            themeMultiSelect: false,
            themeMultiSelected: [],
            themeFullPreview: false,
            themeDeletedNames: [],
            themeRenamedNames: {},
            themeCurrentTitle: '',
            themeCurrentDeleted: false,
            /* InputMethodDialog (A-Z strip) used by Rename. */
            inputDialogVisible: false,
            inputValue: '',
            inputCharIndex: 0,
            inputContext: '',
            inputTargetId: '',
            inputOriginalValue: '',
            toastMessage: '',
            toastVisible: false
        };
    }

    /* Sample FM frequencies (87.5–108.0 MHz) and File Manager tree. Both are
       ordered the way the stock apps present them and are only ever used as
       simulator content, never written into a theme package. */
    var SCAN_FREQS = [881, 917, 947, 985, 1015, 1048];
    var FAVORITE_FREQS = [985, 1015, 917];

    var FILE_MANAGER_TREES = {
        internal: [
            { id: 'fm_music', label: 'Music', isFolder: true, columns: ['21 items', '2026-11-20 18:04'] },
            { id: 'fm_movies', label: 'Movies', isFolder: true, columns: ['4 items', '2026-11-18 09:22'] },
            { id: 'fm_pictures', label: 'Pictures', isFolder: true, columns: ['38 items', '2026-11-14 21:11'] },
            { id: 'fm_books', label: 'Books', isFolder: true, columns: ['6 items', '2026-10-30 12:40'] },
            { id: 'fm_themes', label: 'Themes', isFolder: true, columns: ['5 items', '2026-11-26 08:15'] },
            { id: 'fm_recordings', label: 'Recordings', isFolder: true, columns: ['2 items', '2026-11-09 17:52'] },
            { id: 'fm_track1', label: 'Jam.flac', isMusic: true, columns: ['34.8 MB', '2026-11-02 13:07'] },
            { id: 'fm_track2', label: 'Remember the Time.mp3', isMusic: true, columns: ['9.6 MB', '2026-11-02 13:07'] },
            { id: 'fm_note', label: 'README.txt', columns: ['2 KB', '2026-09-21 10:03'] }
        ],
        tf: [
            { id: 'tf_music', label: 'Music', isFolder: true, columns: ['64 items', '2026-11-24 19:31'] },
            { id: 'tf_movies', label: 'Movies', isFolder: true, columns: ['11 items', '2026-11-22 15:45'] },
            { id: 'tf_pictures', label: 'Pictures', isFolder: true, columns: ['12 items', '2026-11-12 11:20'] },
            { id: 'tf_podcasts', label: 'Podcasts', isFolder: true, columns: ['9 items', '2026-10-02 07:38'] },
            { id: 'tf_m3u', label: 'roadtrip.m3u', columns: ['1 KB', '2026-11-25 20:12'] },
            { id: 'tf_img', label: 'IMG_0421.jpg', columns: ['1.2 MB', '2026-11-01 16:09'] }
        ]
    };

    function renameFileManagerEntry(entryId, nextLabel) {
        var stores = [FILE_MANAGER_TREES.internal || [], FILE_MANAGER_TREES.tf || []];
        for (var s = 0; s < stores.length; s += 1) {
            for (var i = 0; i < stores[s].length; i += 1) {
                if (stores[s][i].id === entryId) {
                    stores[s][i].label = nextLabel;
                    return true;
                }
            }
        }
        return false;
    }

    function fileManagerEntriesFor(storage) {
        var tree = FILE_MANAGER_TREES[storage === 'tf' ? 'tf' : 'internal'] || [];
        return tree.map(function (entry) {
            return {
                id: entry.id,
                label: entry.label,
                isFolder: !!entry.isFolder,
                isMusic: !!entry.isMusic,
                columns: (entry.columns || []).slice()
            };
        });
    }

    function genericListForView(viewId, deviceMode, sim, menuProfile) {
        var betterMenu = menuProfile === 'better-y';
        if (viewId === 'music') {
            /* Better-Y v1.1.0 does not patch the Music menu: Cover Flow and
               Album Artists first appear in the unpublished v1.2.0 tree. */
            var musicItems = ['All songs', 'Playlists', 'Artists', 'Albums', 'Genres', 'Folders', 'Search'];
            if (deviceMode !== 'y1' && !betterMenu) musicItems.push('Settings');
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
            var videoItems = betterMenu
                ? ['All videos', 'Playlists', 'Folders', 'Search']
                : ['All video', 'Playlist', 'Folders', 'Search'];
            return videoItems.map(function (label) {
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
            var bookItems = betterMenu
                ? ['All audiobooks', 'Artists', 'Albums', 'Folders', 'Bookmarks']
                : ['All audiobooks', 'Artists', 'Albums', 'Folders', 'Bookmark lists', 'Settings'];
            return bookItems.map(function (label) {
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
            /* FileManagerActivity is the storage picker: the launcher's layout
               lists exactly Internal Storage and TF Card, each with the item
               arrow, above the click wheel. */
            return [
                { id: 'storage_internal', label: 'Internal Storage', isFolder: true, storage: 'internal' },
                { id: 'storage_tf', label: 'TF Card', isFolder: true, storage: 'tf' }
            ];
        }
        if (viewId === 'fileManagerList') {
            return fileManagerEntriesFor(sim && sim.fileManagerStorage);
        }
        if (viewId === 'fmMenu') {
            /* Y2 3.2.8 FM strings: Channel list, Favorite channel list,
               Re-search channel, Record fm, Audio output, Frequency range. */
            return [
                { id: 'fm_menu_channels', label: 'Channel list' },
                { id: 'fm_menu_favorites', label: 'Favorite channel list' },
                { id: 'fm_menu_rescan', label: 'Re-search channel' },
                { id: 'fm_menu_record', label: 'Record fm' },
                { id: 'fm_menu_output', label: 'Audio output' },
                { id: 'fm_menu_range', label: 'Frequency range' }
            ];
        }
        if (viewId === 'fmChannels' || viewId === 'fmFavorites') {
            var freqs = viewId === 'fmFavorites' ? FAVORITE_FREQS : SCAN_FREQS;
            return freqs.map(function (f) {
                return {
                    id: 'freq_' + f,
                    label: (f / 10).toFixed(1) + ' MHz',
                    fmFreq: f
                };
            });
        }
        if (viewId === 'fmAudioOutput') {
            return [
                { id: 'fm_out_speaker', label: 'Speaker' },
                { id: 'fm_out_headset', label: 'Headset' }
            ];
        }
        if (viewId === 'fmRange') {
            return ['America', 'Asia', 'Australia', 'Europe', 'Japan'].map(function (label) {
                return { id: 'fm_range_' + label.toLowerCase(), label: label };
            });
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
                    showUnimplementedHome: opts.showUnimplementedHome === true,
                    /* Which stock launcher the simulator is reproducing. Shape:
                       { y1: '3.1.2', y2: '3.2.8' } or a plain version string. */
                    firmware: opts.firmware || null
                };

                var colors = buildColors(itemCfg, menuCfg, statusCfg, cfg, catalogFolder, previewOpts.deviceMode);
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
                var currentFirmware = firmwareFor(previewOpts);
                var folderIconFile = (cfg.fileConfig && cfg.fileConfig.folderIcon) || '';
                var folderIconUrl = folderIconFile
                    ? buildFileUrl(contentFolder, folderIconFile)
                    : '';
                var musicIconFile = (cfg.fileConfig && cfg.fileConfig.musicIcon) || '';
                var musicIconUrl = musicIconFile
                    ? buildFileUrl(contentFolder, musicIconFile)
                    : '';

                /* ThemeListActivity reads /storage/sdcard0/Themes, sorts the
                   theme folders by name and prepends the default row. The
                   Studio adds the theme being previewed when it is not one of
                   those bundled folders, so the selector always shows what the
                   simulator is currently drawing. */
                function themeSelectorEntries() {
                    var model = currentFirmware.modelId === 'y1' ? 'y1' : 'y2';
                    var defaultCovers = THEME_SELECTOR_DEFAULT_COVER_URLS[model];
                    var bundledCovers = BUNDLED_THEME_COVER_URLS[model] || {};
                    var title = String((cfg.theme_info && cfg.theme_info.title) || '').trim();
                    var fallbackTitle = String((previewMeta && previewMeta.trackTitle) || '').trim();
                    var folderName = String(catalogFolder || '').split('/')[0].trim();
                    var currentTitle =
                        sim.themeCurrentTitle || title || fallbackTitle || folderName || 'Current theme';
                    var deleted = sim.themeDeletedNames || [];
                    var renamed = sim.themeRenamedNames || {};

                    /* The Studio supplies the gallery catalogue so the device
                       ThemeListActivity shows the current theme/variant first and
                       the five themes that follow it alphabetically. A variant is
                       its own row here: on the player it is an individual theme
                       folder under Variants/. */
                    if (Array.isArray(opts.themeCatalog) && opts.themeCatalog.length) {
                        var catalogEntries = [];
                        for (var ti = 0; ti < opts.themeCatalog.length; ti += 1) {
                            var catalogItem = opts.themeCatalog[ti];
                            if (!catalogItem || !catalogItem.name) continue;
                            var catalogFolderName = String(catalogItem.folder || '').split('/')[0].trim();
                            var catalogVariant = String(catalogItem.variant || '').trim();
                            var isCurrent =
                                catalogFolderName === folderName &&
                                catalogVariant === String(variantSegment || '').trim();
                            var isDefault = String(catalogItem.name).toLowerCase() === 'holopebble';
                            catalogEntries.push({
                                name: isCurrent
                                    ? currentTitle
                                    : renamed[catalogItem.name] || catalogItem.name,
                                coverUrl: isCurrent
                                    ? cfg.themeCover
                                        ? buildFileUrl(contentFolder, cfg.themeCover)
                                        : catalogItem.coverUrl || defaultCovers
                                    : catalogItem.coverUrl || defaultCovers,
                                isDefault: isDefault,
                                isCurrent: isCurrent,
                                folder: catalogFolderName,
                                variant: catalogVariant,
                                previewed: isCurrent
                            });
                        }
                        if (!catalogEntries.some(function (entry) { return entry.isCurrent; })) {
                            catalogEntries.push({
                                name: currentTitle,
                                coverUrl: cfg.themeCover
                                    ? buildFileUrl(contentFolder, cfg.themeCover)
                                    : defaultCovers,
                                isDefault: false,
                                isCurrent: true,
                                folder: folderName,
                                variant: String(variantSegment || '').trim(),
                                previewed: true
                            });
                        }
                        catalogEntries = catalogEntries.filter(function (entry) {
                            return deleted.indexOf(entry.name) === -1;
                        });
                        catalogEntries.sort(function (a, b) {
                            return a.name < b.name ? -1 : a.name > b.name ? 1 : 0;
                        });
                        var catalogCurrent = 0;
                        for (var cci = 0; cci < catalogEntries.length; cci += 1) {
                            if (catalogEntries[cci].isCurrent) {
                                catalogCurrent = cci;
                                break;
                            }
                        }
                        if (catalogCurrent > 0) {
                            catalogEntries = catalogEntries.slice(catalogCurrent).concat(
                                catalogEntries.slice(0, catalogCurrent)
                            );
                        }
                        /* The device page holds six cards; the current theme is
                           the first, the other five follow it in album order. */
                        catalogEntries = catalogEntries.slice(0, 6);
                        catalogEntries.forEach(function (entry, entryIndex) {
                            entry.isCurrent = entryIndex === 0;
                        });
                        return { entries: catalogEntries, currentIndex: 0 };
                    }

                    var entries = [
                        {
                            name: 'HoloPebble',
                            coverUrl: defaultCovers,
                            isDefault: true,
                            isCurrent: false
                        }
                    ];
                    var bundled = currentFirmware.bundledThemes || [];
                    for (var bi = 0; bi < bundled.length; bi += 1) {
                        var item = bundled[bi];
                        entries.push({
                            name: item.name,
                            coverUrl: bundledCovers[item.cover] || defaultCovers,
                            isDefault: false,
                            isCurrent: false,
                            bundled: true
                        });
                    }
                    var defaultRow = entries.shift();
                    for (var ri = 0; ri < entries.length; ri += 1) {
                        if (renamed[entries[ri].name]) entries[ri].name = renamed[entries[ri].name];
                    }
                    entries = entries.filter(function (entry) {
                        return deleted.indexOf(entry.name) === -1;
                    });
                    var wanted = currentTitle.toLowerCase();
                    if (String(defaultRow.name).toLowerCase() === wanted) {
                        defaultRow.isCurrent = true;
                        wanted = '';
                    }
                    for (var ei = 0; ei < entries.length; ei += 1) {
                        if (String(entries[ei].name).toLowerCase() === wanted) {
                            entries[ei].isCurrent = true;
                            wanted = '';
                            break;
                        }
                    }
                    if (wanted && currentFirmware.themes && !sim.themeCurrentDeleted) {
                        var currentCover = cfg.themeCover
                            ? buildFileUrl(contentFolder, cfg.themeCover)
                            : defaultCovers;
                        entries.push({
                            name: currentTitle,
                            coverUrl: currentCover,
                            isDefault: false,
                            isCurrent: true,
                            previewed: true
                        });
                    }
                    entries.sort(function (a, b) {
                        return a.name < b.name ? -1 : a.name > b.name ? 1 : 0;
                    });
                    entries.unshift(defaultRow);
                    var currentIndex = 0;
                    for (var ci = 0; ci < entries.length; ci += 1) {
                        if (entries[ci].isCurrent) {
                            currentIndex = ci;
                            break;
                        }
                    }
                    return { entries: entries, currentIndex: currentIndex };
                }

                function settingsRowHeightForCurrent() {
                    /* Stock Y1's item_setting.xml is 40dip; Y2's and Solar's
                       settings rows use the 45dp y1_menu_item_height.
                       Better-Y draws its own rows. */
                    return (currentFirmware.modelId === 'y2' &&
                        currentFirmware.menuProfile !== 'better-y') ||
                        currentFirmware.menuProfile === 'solar'
                        ? 45
                        : 40;
                }

                function settingsItemsForView(viewId) {
                    var cat = '';
                    if (viewId === 'musicSettings') cat = 'musicSettings';
                    else if (viewId === 'settingsBetterYPlayer') cat = 'betterYPlayer';
                    else if (viewId === 'settingsBetterY') cat = 'betterY';
                    else if (String(viewId || '').indexOf('settingsCat_') === 0) {
                        cat = String(viewId).slice('settingsCat_'.length);
                    }
                    return buildSettingsItems(cfg, buildFileUrl, contentFolder, sim, {
                        mode: previewOpts.mode,
                        deviceMode: previewOpts.deviceMode,
                        /* Without the release, Settings kept the first
                           firmware's rows after a Preview As switch. */
                        firmware: previewOpts.firmware,
                        category: cat
                    });
                }

                function isSettingsListView(viewId) {
                    return (
                        viewId === 'settings' ||
                        viewId === 'settingsBetterY' ||
                        viewId === 'settingsBetterYPlayer' ||
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
                canvas.className = 'y1-tp-canvas' + (opts.editableSlots === true ? ' y1-tp-slots-edit' : '');
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
                    /* Fit the whole 480×360 stage. Cover-cropping hid the
                       outer pixels whenever a host viewport was not exactly
                       4:3 (and made the player look sliced, not scaled). */
                    var s = Math.min(vw / W, vh / H);
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
                    if (sim.themeFullPreview && sim.themeViewId === 'settingsTheme') {
                        var fullEntries = themeSelectorEntries().entries;
                        var fullEntry = fullEntries[sim.themeSelectedIndex];
                        if (fullEntry) return fullEntry.name;
                    }
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

                /* Artwork that shows the author nothing is blank in the useful
                   sense: nothing to see, and no honest alpha edge to click
                   through. Missing files, fully transparent placeholders and
                   solid black squares all qualify, so the whole slot becomes the
                   target for adding that asset. */
                var blankArtworkCache = Object.create(null);
                function imageIsBlankArtwork(img) {
                    if (!img) return true;
                    if (!img.getAttribute('src')) return true;
                    if (!img.complete) return false;
                    var nw = img.naturalWidth | 0;
                    var nh = img.naturalHeight | 0;
                    if (nw <= 1 && nh <= 1) return true;
                    var src = img.currentSrc || img.getAttribute('src') || '';
                    var key = src + '|' + nw + 'x' + nh;
                    if (blankArtworkCache[key] !== undefined) return blankArtworkCache[key];
                    var blank = false;
                    try {
                        var c = document.createElement('canvas');
                        c.width = Math.max(1, Math.min(32, nw));
                        c.height = Math.max(1, Math.min(32, nh));
                        var ctx = c.getContext('2d', { willReadFrequently: true });
                        if (!ctx) return false;
                        ctx.clearRect(0, 0, c.width, c.height);
                        ctx.drawImage(img, 0, 0, c.width, c.height);
                        var data = ctx.getImageData(0, 0, c.width, c.height).data;
                        blank = true;
                        for (var i = 0; i < data.length; i += 4) {
                            if (data[i + 3] < 8) continue;
                            if (Math.max(data[i], data[i + 1], data[i + 2]) > 28) {
                                blank = false;
                                break;
                            }
                        }
                    } catch (eRead) {
                        blank = false;
                    }
                    blankArtworkCache[key] = blank;
                    return blank;
                }

                /* Right-hand pane artwork is one big target, whatever its
                   pixels look like. PNG icons normally carry transparent
                   padding, and a blank/missing icon has no pixels at all, so
                   pixel-perfect alpha hit-testing would leave most of the slot
                   unselectable. Home, Settings and Equalizer all reserve a box
                   for this artwork; anywhere inside it belongs to the icon. */
                function rightIconSlotAtPoint(clientX, clientY) {
                    var boxes = canvas.querySelectorAll('[data-theme-art-box]');
                    for (var b = 0; b < boxes.length; b++) {
                        var box = boxes[b];
                        var path = box.getAttribute('data-theme-art-box') || '';
                        if (!RIGHT_ICON_PATH_RE.test(path)) continue;
                        if (box.style.display === 'none' || !box.offsetParent) continue;
                        var img = box.querySelector('img[data-theme-asset-path]');
                        if (img && (img.getAttribute('data-theme-asset-path') || '') !== path) continue;
                        var boxRect = box.getBoundingClientRect();
                        if (boxRect.width < 1 || boxRect.height < 1) continue;
                        if (
                            clientX < boxRect.left ||
                            clientX > boxRect.right ||
                            clientY < boxRect.top ||
                            clientY > boxRect.bottom
                        ) {
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

                    var stack =
                        typeof document.elementsFromPoint === 'function'
                            ? document.elementsFromPoint(clientX, clientY)
                            : [];
                    /* An open dialog sits above everything, so it keeps its clicks. */
                    var dialogOnTop = !!sim.dialogVisible;
                    if (!dialogOnTop) {
                        var rightIconSlot = rightIconSlotAtPoint(clientX, clientY);
                        if (rightIconSlot) return rightIconSlot;
                        var statusSlot = statusSlotAtPoint(clientX, clientY);
                        if (statusSlot) return statusSlot;
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
                            /* Status icons keep their whole box: alpha
                               pass-through applies to screen artwork, not the
                               bar. */
                            var inStatusBar = !!(node.closest && node.closest('.y1-tp-status'));
                            var alpha = inStatusBar
                                ? 1
                                : imageAlphaAtPoint(node, clientX, clientY);
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

                    /* Blank status-bar space is still a status-bar target. The
                       launcher collapses icons that are not currently shown, so
                       this is the only way to edit a hidden state from the bar
                       instead of falling through to the mask or wallpaper. */
                    if (!dialogOnTop) {
                        var statusSpace = statusBarSpaceAtPoint(clientX, clientY);
                        if (statusSpace) return statusSpace;
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

                /* Status-bar artwork is never alpha-gated. Icons carry
                   transparent padding by design and a blank/hidden slot has no
                   pixels at all, so pixel-perfect pass-through would make the
                   bar's own slots hard to hit. Anywhere inside a status slot or
                   a tagged status element belongs to that element. */
                function statusSlotAtPoint(clientX, clientY) {
                    var slots = canvas.querySelectorAll('.y1-tp-status [data-theme-slot-path]');
                    for (var si = 0; si < slots.length; si += 1) {
                        var slot = slots[si];
                        var sr = slot.getBoundingClientRect();
                        if (
                            sr.width < 1 ||
                            sr.height < 1 ||
                            clientX < sr.left ||
                            clientX > sr.right ||
                            clientY < sr.top ||
                            clientY > sr.bottom
                        ) {
                            continue;
                        }
                        var path = slot.getAttribute('data-theme-slot-path') || '';
                        if (!path) continue;
                        return {
                            path: path,
                            node: slot,
                            inMenuRow: false,
                            isStatusSlot: true,
                            isStatusBar: true,
                            statusGroup:
                                slot.getAttribute('data-theme-status-group') || '',
                            isScreenLayer: false,
                            alpha: 1
                        };
                    }
                    return null;
                }

                function statusFallbackPath() {
                    var candidates = [];
                    if (!sim.playState) candidates.push('playing');
                    if (!sim.headsetState) candidates.push('headsetWithMic');
                    if (!sim.bluetoothState) candidates.push('blConnected');
                    candidates.push(
                        sim && sim.isCharging ? 'batteryCharging.3' : 'battery.3'
                    );
                    for (var fi = 0; fi < candidates.length; fi += 1) {
                        var key = candidates[fi];
                        var rootKey = key.split('.')[0];
                        if (statusCfg[key] || statusCfg[rootKey]) {
                            return rootKey === key ? 'statusConfig.' + key : 'statusConfig.' + key;
                        }
                    }
                    return '';
                }

                function statusBarSpaceAtPoint(clientX, clientY) {
                    var bar = canvas.querySelector('.y1-tp-status');
                    if (!bar) return null;
                    var br = bar.getBoundingClientRect();
                    if (
                        br.width < 1 ||
                        br.height < 1 ||
                        clientX < br.left ||
                        clientX > br.right ||
                        clientY < br.top ||
                        clientY > br.bottom
                    ) {
                        return null;
                    }
                    var path = statusFallbackPath();
                    if (!path) return null;
                    return {
                        path: path,
                        node: bar,
                        inMenuRow: false,
                        isStatusSpace: true,
                        isScreenLayer: false,
                        alpha: 1
                    };
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
                        } else if (homeItems[i] && homeItems[i].iconUrl) {
                            pushUrl(homeItems[i].iconUrl);
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
                        var rawIu =
                            sel && sel.iconUrl
                                ? sel.iconUrl
                                : sel && sel.iconFile
                                  ? buildFileUrl(contentFolder, sel.iconFile)
                                  : '';
                        var previewIu = rawIu
                            ? isPreviewMode
                                ? previewAssetUrl(rawIu, 'png')
                                : rawIu
                            : '';
                        var tile = activeRightPanel.tile;
                        var im = activeRightPanel.img;
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
                        /* A blank or missing Home icon stays blank, exactly as the
                           device draws it: no badge, glyph or stand-in artwork.
                           The tile keeps data-theme-art-box so the slot is still
                           clickable in the studio. */
                        /* The icon slot must keep its size even when the artwork
                           is a 1x1 transparent fill: a collapsed box would leave
                           the gap unclickable, so the transparent slot could
                           never be selected. */
                        var iconLoaded = im.complete && im.naturalWidth > 0;
                        var blankIcon =
                            !previewIu || (iconLoaded && imageIsBlankArtwork(im));
                        tile.style.height = blankIcon
                            ? Math.round(HOME_PREVIEW_WIDTH * 0.94) + 'px'
                            : 'auto';
                        if (im._y1BlankSizing !== 'bound') {
                            im._y1BlankSizing = 'bound';
                            im.addEventListener('load', function () {
                                updateRightPanelInPlace();
                            });
                        }
                        return;
                    }
                    if (activeRightPanel.kind === 'settings') {
                        var sItem = (activeMenuList && activeMenuList.items && activeMenuList.items[sim.themeSelectedIndex]) || {};
                        var isAbout = sItem.id === 'about';
                        activeRightPanel.titleEl.textContent = sItem.label || '';
                        if (isAbout) {
                            /* refreshRight() hides rightImage and lays bzt_view
                               over it. info_state_tv is one TextView: all four
                               lines, centred, at 16sp. */
                            activeRightPanel.imgBox.removeAttribute('data-theme-art-box');
                            activeRightPanel.aboutWrap.style.display = 'flex';
                            var aboutPieSize = currentFirmware && currentFirmware.modelId === 'y1' ? 130 : 155;
                            activeRightPanel.aboutPie.style.width = aboutPieSize + 'px';
                            activeRightPanel.aboutPie.style.height = aboutPieSize + 'px';
                            activeRightPanel.valueEl.style.top = 96 + aboutPieSize + 'px';
                            activeRightPanel.aboutPie.style.background = aboutPieBackground(currentFirmware);
                            activeRightPanel.img.style.display = 'none';
                            activeRightPanel.img.removeAttribute('data-theme-asset-path');
                            setReusableArtSrc(activeRightPanel.img, '', '');
                            activeRightPanel.valueEl.style.display = 'block';
                            activeRightPanel.valueEl.style.whiteSpace = 'pre';
                            activeRightPanel.valueEl.textContent = aboutInfoText(currentFirmware);
                            return;
                        }
                        activeRightPanel.aboutWrap.style.display = 'none';
                        activeRightPanel.valueEl.style.top = '236px';
                        activeRightPanel.valueEl.style.whiteSpace = 'nowrap';
                        if (sItem.assetPath) {
                            activeRightPanel.imgBox.setAttribute('data-theme-art-box', sItem.assetPath);
                        } else {
                            activeRightPanel.imgBox.removeAttribute('data-theme-art-box');
                        }
                        if (sItem.iconUrl) {
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
                        if (sItem.valueText) {
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
                    /* Colour roles depend on the current device mode: the factory
                       Y2 HoloPebble screen uses dark status ink, the Y1 theme
                       does not. Rebuild them so a Preview As switch repaints the
                       status bar instead of keeping mount-time colours. */
                    colors = buildColors(itemCfg, menuCfg, statusCfg, cfg, catalogFolder, previewOpts.deviceMode);
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
                        appendStatusIcon(right, statusCfg, pk, buildFileUrl, contentFolder, mode);
                    }
                    var battRaw = sim && sim.batteryLevel;
                    var battLvl =
                        battRaw !== undefined && battRaw !== null && battRaw !== ''
                            ? battRaw
                            : 3;
                    var pct = batteryPercentFromLevel(battLvl);
                    if (!isFinite(pct)) pct = 100;
                    var showBatteryPercent = sim.displayBatteryEnabled !== false;
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
                        bi.setAttribute('data-theme-slot-path', battPath || 'statusConfig.battery.3');
                        bi.setAttribute('data-theme-status-group', 'battery');
                        var battFile =
                            battConfig && Array.isArray(battConfig)
                                ? battConfig[normalizedBatteryLevel(battLvl)]
                                : battConfig && typeof battConfig === 'object'
                                  ? battConfig[normalizedBatteryLevel(battLvl)]
                                  : battConfig;
                        bi.className =
                            'y1-tp-status-slot-image' +
                            (isBlankStatusFile(battFile) ? ' is-empty' : '');
                        var pctSpan = null;
                        if (showBatteryPercent) {
                            pctSpan = document.createElement('span');
                            pctSpan.style.fontSize = '16px';
                            pctSpan.textContent = pct + '%';
                            tagFontHotspot(pctSpan, cfg, 'The battery figure');
                            tagStatusTextHotspot(pctSpan, 'The battery figure');
                        }
                        if (prevBatt !== rawBatt) {
                                                            bi.onerror = function () {
                                    bi.onerror = function () {
                                        bi.style.display = 'none';
                                        if (pctSpan && pctSpan.parentNode) pctSpan.parentNode.removeChild(pctSpan);
                                        appendBatteryFallback(right, pct, colors.status_text, cfg, battPath, showBatteryPercent);
                                    };
                                    bi.src = rawBatt;
                                };
                        } else {
                            bi.onerror = function () {
                                bi.onerror = null;
                                bi.style.display = 'none';
                                if (pctSpan && pctSpan.parentNode) pctSpan.parentNode.removeChild(pctSpan);
                                appendBatteryFallback(right, pct, colors.status_text, cfg, battPath, showBatteryPercent);
                            };
                        }
                        right.appendChild(bi);
                        if (pctSpan) right.appendChild(pctSpan);
                    } else {
                        appendBatteryFallback(right, pct, colors.status_text, cfg, battPath, showBatteryPercent);
                    }
                    status.appendChild(right);
                    canvas.appendChild(status);

                    var useSettingMask = sim.themeViewId === 'settings';
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
                        var gItems = genericListForView(
                            sim.themeViewId,
                            previewOpts.deviceMode,
                            sim,
                            currentFirmware.menuProfile
                        );
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
                        /* FileManagerActivity is the storage picker: the launcher
                           layout lists Internal Storage and TF Card as 45dp rows
                           with the item arrow, 22sp bold, above the wheel. */
                        var fmTipH0 = 26;
                        var fmBox = document.createElement('div');
                        fmBox.style.cssText =
                            'position:absolute;left:25px;top:' +
                            (statusH + 6) +
                            'px;width:' +
                            (W - 50) +
                            'px;height:' +
                            (H - statusH - fmTipH0 - 10) +
                            'px;overflow:hidden;z-index:10;';
                        var fileItems = genericListForView('fileManager', previewOpts.deviceMode);
                        activeMenuList = appendMenuRows(fmBox, {
                            items: fileItems,
                            selectedIndex: sim.themeSelectedIndex,
                            itemHeight: 45,
                            visibleHeight: H - statusH - fmTipH0 - 10,
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
                            folderIconUrl: '',
                            musicIconUrl: '',
                            scrollState: scrollState,
                            eager: eagerImages
                        });
                        activeMenuList.viewId = 'fileManager';
                        layer.appendChild(fmBox);
                        var fmTip = document.createElement('div');
                        fmTip.style.cssText =
                            'position:absolute;left:0;right:0;bottom:0;height:' +
                            fmTipH0 +
                            'px;display:flex;align-items:center;justify-content:space-between;padding:0 26px;font-size:12px;color:' +
                            colors.menu_text_primary +
                            ';opacity:0.78;background:rgba(0,0,0,0.28);z-index:12;box-sizing:border-box;';
                        fmTip.innerHTML = '<span>Storage Devices</span><span>OK open &middot; Back exit</span>';
                        layer.appendChild(fmTip);
                    } else if (sim.themeViewId === 'fileManagerList') {
                        /* activity_file_list: Name / Size / Modified Date header row,
                           45dp file rows with a 26dp folder or music glyph, and the
                           bottom info strip that names the open folder. */
                        var fmTipH = 26;
                        var fmHead = document.createElement('div');
                        fmHead.style.cssText =
                            'position:absolute;left:10px;top:' +
                            (statusH + 4) +
                            'px;width:' +
                            (W - 20) +
                            'px;display:flex;align-items:center;font-size:18px;font-weight:600;color:' +
                            colors.menu_text_primary +
                            ';opacity:0.92;z-index:11;';
                        fmHead.innerHTML =
                            '<span style="flex:1">Name</span>' +
                            '<span style="width:86px;text-align:right">Size</span>' +
                            '<span style="width:124px;text-align:right">Modified Date</span>';
                        layer.appendChild(fmHead);
                        var fmListTop = statusH + 32;
                        var fmListH = H - fmListTop - fmTipH - 4;
                        var fmListBox = document.createElement('div');
                        fmListBox.style.cssText =
                            'position:absolute;left:10px;top:' +
                            fmListTop +
                            'px;width:' +
                            (W - 20) +
                            'px;height:' +
                            fmListH +
                            'px;overflow:hidden;z-index:10;';
                        var fmRows = genericListForView('fileManagerList', previewOpts.deviceMode, sim);
                        activeMenuList = appendMenuRows(fmListBox, {
                            items: fmRows,
                            selectedIndex: sim.themeSelectedIndex,
                            itemHeight: 45,
                            visibleHeight: fmListH,
                            colors: {
                                text_primary: colors.menu_text_primary,
                                text_selected: colors.menu_text_selected
                            },
                            itemBackgroundStyle: itemBackgroundStyle,
                            itemSelectedBackgroundStyle: itemSelectedBackgroundStyle,
                            itemRightArrowUrl: itemRightArrowUrl,
                            fullWidth: false,
                            leftPad: 0,
                            rowWidth: W - 20,
                            folderIconUrl: folderIconUrl,
                            musicIconUrl: musicIconUrl,
                            scrollState: scrollState,
                            eager: eagerImages
                        });
                        activeMenuList.viewId = 'fileManagerList';
                        layer.appendChild(fmListBox);
                        var fmListTip = document.createElement('div');
                        fmListTip.style.cssText =
                            'position:absolute;left:0;right:0;bottom:0;height:' +
                            fmTipH +
                            'px;display:flex;align-items:center;justify-content:space-between;padding:0 26px;font-size:12px;color:' +
                            colors.menu_text_primary +
                            ';opacity:0.78;background:rgba(0,0,0,0.28);z-index:12;box-sizing:border-box;';
                        fmListTip.innerHTML =
                            '<span>/' +
                            (sim.fileManagerStorage === 'tf' ? 'TF Card' : 'Internal Storage') +
                            '</span><span>OK options</span>';
                        layer.appendChild(fmListTip);
                    } else if (sim.themeViewId === 'fileManagerSettings') {
                        /* FileManagerSettingsActivity layout (3.2.8 launcher):
                           Sorting Method (field + order), Display Options
                           (hidden files + extensions), Storage Management
                           (format internal, format TF card, restore defaults). */
                        var fmSortNames = {
                            name: 'By Name',
                            size: 'By Size',
                            time: 'By Modify Time',
                            type: 'By File Type'
                        };
                        var fmSettingRows = [
                            { label: 'Sorting Method', value: fmSortNames[sim.fileManagerSortField] || 'By Name' },
                            { label: 'Sort order', value: sim.fileManagerSortOrder === 'desc' ? 'Desc' : 'Asc' },
                            { label: 'Show Hidden Files', value: sim.fileManagerShowHidden ? 'On' : 'Off' },
                            { label: 'Show File Extensions', value: sim.fileManagerShowExtensions ? 'On' : 'Off' },
                            { label: 'Format Internal Storage', value: '' },
                            { label: 'Format TF Card', value: '' },
                            { label: 'Restore Default Settings', value: '' }
                        ];
                        var groupTitles = ['Sorting Method', 'Display Options', 'Storage Management'];
                        var groupStarts = [0, 2, 4];
                        var fmSetTop = statusH + 6;
                        var fmSetRowH = 34;
                        var fmGroupHeadH = 22;
                        var fmSetY = fmSetTop;
                        for (var g = 0; g < groupTitles.length; g++) {
                            var gHead = document.createElement('div');
                            gHead.textContent = groupTitles[g];
                            gHead.style.cssText =
                                'position:absolute;left:26px;top:' +
                                fmSetY +
                                'px;font-size:14px;font-weight:700;letter-spacing:0.02em;text-transform:uppercase;color:' +
                                colors.text_primary +
                                ';opacity:0.72;z-index:11;';
                            layer.appendChild(gHead);
                            fmSetY += fmGroupHeadH;
                            var gRows = groupStarts[g + 1] != null ? groupStarts[g + 1] : fmSettingRows.length;
                            for (var rIdx = groupStarts[g]; rIdx < gRows; rIdx++) {
                                var rowInfo = fmSettingRows[rIdx];
                                var isSel = rIdx === sim.themeSelectedIndex;
                                var fRow = document.createElement('div');
                                fRow.className = 'y1-tp-row' + (isSel ? ' is-selected' : '');
                                fRow.setAttribute('data-y1-row', String(rIdx));
                                fRow.setAttribute('data-theme-asset-path', 'itemConfig.itemSelectedBackground');
                                fRow.style.cssText =
                                    'position:absolute;left:26px;top:' +
                                    fmSetY +
                                    'px;width:' +
                                    (W - 52) +
                                    'px;height:' +
                                    fmSetRowH +
                                    'px;display:flex;align-items:center;box-sizing:border-box;padding:0 6px;';
                                var fRowCtx = {
                                    isSettings: false,
                                    itemHeight: fmSetRowH,
                                    colors: {
                                        text_primary: colors.text_primary,
                                        text_selected: colors.text_selected
                                    },
                                    itemBg: itemBackgroundStyle,
                                    itemSel: itemSelectedBackgroundStyle,
                                    arrowUrl: '',
                                    marqueeOnLongLabel: false,
                                    eager: eagerImages
                                };
                                var fLabel = document.createElement('span');
                                fLabel.textContent = rowInfo.label;
                                fLabel.style.cssText =
                                    'flex:1;font-size:17px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;';
                                fRow.appendChild(fLabel);
                                if (rowInfo.value) {
                                    var fVal = document.createElement('span');
                                    fVal.textContent = rowInfo.value;
                                    fVal.style.cssText = 'font-size:16px;font-weight:600;opacity:0.9;';
                                    fRow.appendChild(fVal);
                                }
                                rowInfo._node = fRow;
                                applyMenuRowSelection(fRow, { noArrow: true }, isSel, fRowCtx);
                                fLabel.style.color = isSel ? colors.text_selected : colors.text_primary;
                                if (fRow.children[1]) {
                                    fRow.children[1].style.color = fLabel.style.color;
                                }
                                layer.appendChild(fRow);
                                fmSetY += fmSetRowH;
                            }
                            fmSetY += 8;
                        }
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
                        /* Better-Y's own menu is a full-width list with the
                           value at the right edge (its Settings screen has no
                           right-hand preview pane). Stock Y1 keeps the
                           218dp list + preview column. */
                        var betterYFullList =
                            sim.themeViewId === 'settingsBetterY' ||
                            sim.themeViewId === 'settingsBetterYPlayer';
                        var sMenu = document.createElement('div');
                        sMenu.style.cssText =
                            'position:absolute;left:' +
                            (betterYFullList ? 0 : SETTINGS_MENU_LEFT) +
                            'px;top:' +
                            SETTINGS_MENU_TOP +
                            'px;width:' +
                            (betterYFullList ? W : SETTINGS_MENU_WIDTH) +
                            'px;height:' +
                            (betterYFullList ? Math.max(0, H - SETTINGS_MENU_TOP) : SETTINGS_MENU_HEIGHT) +
                            'px;overflow:hidden;z-index:10;';
                        activeMenuList = appendSettingsMenuRows(sMenu, {
                            items: sItems,
                            selectedIndex: sim.themeSelectedIndex,
                            itemHeight: settingsRowHeightForCurrent(),
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
                            'px;z-index:10;' +
                            (betterYFullList ? 'display:none;' : '');
                        var rt = document.createElement('div');
                        rt.style.cssText =
                            'position:absolute;top:58px;left:0;right:0;text-align:center;font-size:18px;font-weight:bold;color:' +
                            colors.text_primary +
                            ';white-space:nowrap;overflow:hidden;text-overflow:ellipsis;padding:0 5px;line-height:1.2;';
                        rp.appendChild(rt);

                        var imgBox = document.createElement('div');
                        imgBox.style.cssText =
                            'position:absolute;top:96px;left:0;right:0;width:100%;min-height:146px;display:flex;flex-direction:column;align-items:center;justify-content:flex-start;';
                        /* activity_setting.xml: the About row swaps rightImage
                           for bzt_view (a 130dip AboutView pie) and fills
                           info_state_tv with Total / Used / Available /
                           System Version. There is no model card here. */
                        var abWrap = document.createElement('div');
                        abWrap.style.cssText =
                            'width:100%;display:none;justify-content:center;align-items:flex-start;';
                        var aboutPie = document.createElement('div');
                        aboutPie.style.cssText =
                            'width:130px;height:130px;border-radius:50%;flex:none;';
                        abWrap.appendChild(aboutPie);
                        imgBox.appendChild(abWrap);

                        var simg = document.createElement('img');
                        bindReusableArtImg(simg);
                        simg.style.cssText =
                            'max-width:146px;max-height:146px;width:auto;height:auto;object-fit:contain;display:none;';
                        imgBox.appendChild(simg);
                        rp.appendChild(imgBox);

                        var stx = document.createElement('div');
                        stx.style.cssText =
                            'position:absolute;top:236px;left:0;right:0;font-size:16px;color:#fff;text-align:center;white-space:nowrap;line-height:1.25;overflow:hidden;text-overflow:ellipsis;padding:0 5px;display:none;';
                        rp.appendChild(stx);
                        layer.appendChild(rp);

                        if (!betterYFullList) {
                            activeRightPanel = {
                                kind: 'settings',
                                titleEl: rt,
                                imgBox: imgBox,
                                aboutWrap: abWrap,
                                aboutPie: aboutPie,
                                img: simg,
                                valueEl: stx
                            };
                            updateRightPanelInPlace();
                        }
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
                            itemHeight: settingsRowHeightForCurrent(),
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
                        /* ThemeListActivity, read from both launchers:
                           activity_theme_list.xml + item_theme.xml. The
                           RecyclerView is a 3-column grid; each item is a
                           140dp selected-ring CardView around a 135dp cover
                           card, with a 19sp folder name underneath. Y1's
                           selected ring is #FF36C6FF. Y2 uses its
                           theme_selected_ring (#FF0084FF light default,
                           #FF00FFF5 night/custom) and the card/text colours
                           from the same qualified resource set. The default
                           row uses the launcher's
                           icon_theme_default_cover2, not the theme cover. */
                        var selector = themeSelectorEntries();
                        var selectorEntries = selector.entries;
                        var modelId = currentFirmware.modelId === 'y1' ? 'y1' : 'y2';
                        var lightCard =
                            modelId === 'y2' &&
                            isY2DefaultTheme(cfg, catalogFolder, previewOpts.deviceMode);
                        var ringColor =
                            modelId === 'y1' ? '#36C6FF' : lightCard ? '#0084FF' : '#00FFF5';
                        var themeCardBg = modelId === 'y1' ? '#000000' : lightCard ? '#FFFFFF' : '#000000';
                        var themeNameColor =
                            modelId === 'y1'
                                ? 'rgba(255,255,255,0.8)'
                                : lightCard
                                  ? '#2D2D44'
                                  : '#FFFFFF';
                        var gridTop = statusH;
                        var gridViewportH = H - statusH;
                        var gridCellW = W / 3;
                        var gridRowH = 167;
                        var gridCard = 140;
                        var gridInner = 135;
                        if (!sim.themeSelectorInitialized) {
                            sim.themeSelectedIndex = selector.currentIndex;
                            sim.themeGridScrollTop = 0;
                            sim.themeSelectorInitialized = true;
                        }
                        sim.themeSelectedIndex = Math.max(
                            0,
                            Math.min(sim.themeSelectedIndex | 0, selectorEntries.length - 1)
                        );
                        var selectedRow = Math.floor(sim.themeSelectedIndex / 3);
                        var selectedTop = selectedRow * gridRowH;
                        var selectedBottom = selectedTop + gridRowH;
                        if (selectedTop < sim.themeGridScrollTop) {
                            sim.themeGridScrollTop = selectedTop;
                        } else if (selectedBottom > sim.themeGridScrollTop + gridViewportH) {
                            sim.themeGridScrollTop = selectedBottom - gridViewportH;
                        }
                        sim.themeGridScrollTop = Math.max(
                            0,
                            Math.min(
                                sim.themeGridScrollTop,
                                Math.max(0, Math.ceil(selectorEntries.length / 3) * gridRowH - gridViewportH)
                            )
                        );
                        var grid = document.createElement('div');
                        grid.setAttribute('data-theme-grid', 'theme-list');
                        grid.style.cssText =
                            'position:absolute;left:0;top:' +
                            gridTop +
                            'px;width:' +
                            W +
                            'px;height:' +
                            gridViewportH +
                            'px;overflow:hidden;z-index:10;';
                        var gridInnerEl = document.createElement('div');
                        gridInnerEl.style.cssText =
                            'position:absolute;left:0;top:' +
                            -sim.themeGridScrollTop +
                            'px;width:' +
                            W +
                            'px;height:' +
                            Math.max(gridViewportH, Math.ceil(selectorEntries.length / 3) * gridRowH) +
                            'px;';
                        for (var ti = 0; ti < selectorEntries.length; ti += 1) {
                            var tentry = selectorEntries[ti];
                            var tcol = ti % 3;
                            var trow = Math.floor(ti / 3);
                            var multiChecked =
                                !!sim.themeMultiSelect &&
                                (sim.themeMultiSelected || []).indexOf(ti) !== -1;
                            var selected = ti === sim.themeSelectedIndex;
                            var cell = document.createElement('div');
                            cell.setAttribute('data-y1-row', String(ti));
                            cell.setAttribute('data-theme-selector-index', String(ti));
                            if (tentry.isCurrent) cell.setAttribute('data-theme-current', 'true');
                            cell.style.cssText =
                                'position:absolute;left:' +
                                tcol * gridCellW +
                                'px;top:' +
                                trow * gridRowH +
                                'px;width:' +
                                gridCellW +
                                'px;height:' +
                                gridRowH +
                                'px;box-sizing:border-box;cursor:pointer;';
                            var ring = document.createElement('div');
                            ring.style.cssText =
                                'position:absolute;left:' +
                                (gridCellW - gridCard) / 2 +
                                'px;top:2px;width:' +
                                gridCard +
                                'px;height:' +
                                gridCard +
                                'px;border-radius:0;background:' +
                                (selected ? ringColor : 'transparent') +
                                ';box-sizing:border-box;';
                            var card = document.createElement('div');
                            card.style.cssText =
                                'position:absolute;left:' +
                                (gridCard - gridInner) / 2 +
                                'px;top:' +
                                (gridCard - gridInner) / 2 +
                                'px;width:' +
                                gridInner +
                                'px;height:' +
                                gridInner +
                                'px;border-radius:5px;background:' +
                                themeCardBg +
                                ';overflow:hidden;display:flex;align-items:center;justify-content:center;' +
                                (modelId === 'y1' ? 'box-shadow:0 3px 6px rgba(0,0,0,0.35);' : '');
                            var cover = document.createElement('img');
                            cover.alt = '';
                            cover.src = tentry.coverUrl;
                            bindPreviewImgFallback(cover, { eager: eagerImages });
                            if (!tentry.isDefault && (tentry.isCurrent || tentry.previewed)) {
                                cover.setAttribute('data-theme-asset-path', 'themeCover');
                                card.setAttribute('data-theme-art-box', 'themeCover');
                            }
                            /* item_theme.xml draws the cover into the square
                               135dp card with centerCrop; it does not letterbox
                               a 4:3 theme cover inside it. */
                            cover.style.cssText = tentry.isDefault
                                ? 'display:block;width:auto;height:auto;max-width:100px;max-height:75px;object-fit:contain;'
                                : 'display:block;width:100%;height:100%;object-fit:cover;';
                            card.appendChild(cover);
                            ring.appendChild(card);
                            if (sim.themeMultiSelect && !tentry.isDefault) {
                                var check = document.createElement('img');
                                check.alt = '';
                                check.src = nativeStudioAssetUrl(
                                    'assets/native-' +
                                        modelId +
                                        '/' +
                                        (multiChecked ? 'theme-selected' : 'theme-multiselect') +
                                        (modelId === 'y2' ? (lightCard ? '-light' : '-dark') : '') +
                                        '.png'
                                );
                                check.style.cssText =
                                    'position:absolute;right:10px;bottom:10px;width:26px;height:26px;object-fit:contain;';
                                ring.appendChild(check);
                            }
                            cell.appendChild(ring);
                            var themeName = document.createElement('div');
                            themeName.textContent = tentry.name;
                            themeName.style.cssText =
                                'position:absolute;left:8px;top:142px;width:' +
                                (gridCellW - 10) +
                                'px;height:23px;line-height:23px;text-align:center;font-size:19px;font-weight:400;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:' +
                                themeNameColor +
                                ';cursor:pointer;';
                            cell.appendChild(themeName);
                            (function (index, entry) {
                                themeName.addEventListener('click', function (ev) {
                                    ev.preventDefault();
                                    ev.stopPropagation();
                                    sim.themeSelectedIndex = index;
                                    if (entry.isDefault) {
                                        showToast('The default theme cannot be renamed');
                                        return;
                                    }
                                    /* The current row is the Studio's own theme or
                                       variant. Let the Studio open its real rename
                                       dialog; the other rows use the player's
                                       InputMethodDialog, exactly as on device. */
                                    if (
                                        entry.isCurrent &&
                                        typeof opts.onThemeRenameRequest === 'function'
                                    ) {
                                        var handled = opts.onThemeRenameRequest(entry);
                                        if (handled !== false) return;
                                    }
                                    openInputDialog('themeRename', entry.name, entry.name);
                                });
                            })(ti, tentry);
                            (function (index) {
                                cell.addEventListener('click', function (ev) {
                                    ev.preventDefault();
                                    ev.stopPropagation();
                                    if (sim.themeMultiSelect) {
                                        sim.themeSelectedIndex = index;
                                        paint();
                                        return;
                                    }
                                    sim.themeSelectedIndex = index;
                                    paint();
                                });
                            })(ti);
                            gridInnerEl.appendChild(cell);
                        }
                        grid.appendChild(gridInnerEl);
                        layer.appendChild(grid);
                        if (sim.themeFullPreview) {
                            var fullEntry = selectorEntries[sim.themeSelectedIndex] || selectorEntries[0];
                            var fullTop = modelId === 'y2' ? statusH : 0;
                            var fullViewTop = modelId === 'y1' ? statusH : 0;
                            var fullViewH = H - fullViewTop;
                            var fullFooterH = 65;
                            var fullView = document.createElement('div');
                            fullView.setAttribute('data-theme-full-preview', 'true');
                            fullView.style.cssText =
                                'position:absolute;left:0;width:' +
                                W +
                                'px;height:' +
                                fullViewH +
                                'px;background:' +
                                (lightCard ? '#FFFFFF' : '#000000') +
                                ';z-index:30;box-sizing:border-box;top:' +
                                fullViewTop +
                                'px;';
                            if (fullEntry) {
                                var fullImg = document.createElement('img');
                                fullImg.alt = fullEntry.name;
                                fullImg.src = fullEntry.coverUrl;
                                if (!fullEntry.isDefault && (fullEntry.isCurrent || fullEntry.previewed)) {
                                    fullImg.setAttribute('data-theme-art-box', 'themeCover');
                                    fullImg.setAttribute('data-theme-asset-path', 'themeCover');
                                }
                                bindPreviewImgFallback(fullImg, { eager: eagerImages });
                                fullImg.style.cssText =
                                    'position:absolute;left:0;top:' +
                                    fullTop +
                                    'px;width:' +
                                    W +
                                    'px;height:' +
                                    Math.max(0, fullViewH - fullTop - fullFooterH) +
                                    'px;object-fit:contain;display:block;';
                                fullView.appendChild(fullImg);
                            }
                            var fullFooter = document.createElement('div');
                            fullFooter.style.cssText =
                                'position:absolute;left:0;bottom:0;width:' +
                                W +
                                'px;height:' +
                                fullFooterH +
                                'px;padding-bottom:5px;box-sizing:border-box;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;gap:1px;';
                            var fullIcon = document.createElement('img');
                            fullIcon.alt = '';
                            fullIcon.src = nativeStudioAssetUrl(
                                'assets/native-' +
                                    modelId +
                                    '/theme-options/as-theme-selected' +
                                    (modelId === 'y2' && !lightCard ? '-dark' : '') +
                                    '.png'
                            );
                            fullIcon.style.cssText = 'display:block;width:32px;height:32px;object-fit:contain;';
                            var fullLabel = document.createElement('div');
                            fullLabel.textContent = 'As Theme';
                            fullLabel.style.cssText =
                                'font-size:15px;line-height:1.1;color:' +
                                (modelId === 'y1'
                                    ? 'rgba(0,255,245,0.8)'
                                    : lightCard
                                      ? '#0084FF'
                                      : '#00FFF5') +
                                ';';
                            fullFooter.appendChild(fullIcon);
                            fullFooter.appendChild(fullLabel);
                            fullView.appendChild(fullFooter);
                            layer.appendChild(fullView);
                        }
                        activeMenuList = {
                            viewId: 'settingsTheme',
                            items: selectorEntries,
                            selectedIndex: sim.themeSelectedIndex
                        };
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
                            itemHeight: settingsRowHeightForCurrent(),
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
                        /* Two layouts, both read from the shipped APK:
                           Y1 1.7.6–3.1.2 activity_about.xml is a 140dip
                           AboutView above two chained TextViews; Y2 3.1.7+
                           is the right-aligned 140dip pie with one 16sp
                           TextView, plus Internal storage / SD card rows. */
                        var isY1About = currentFirmware.modelId === 'y1';
                        var aboutOutline =
                            currentFirmware.menuProfile === 'better-y'
                                ? 'text-shadow:0 0 2px #000,0 0 2px #000;'
                                : '';
                        if (isY1About) {
                            var y1Pie = document.createElement('div');
                            y1Pie.style.cssText =
                                'position:absolute;left:' +
                                (W - 140) / 2 +
                                'px;top:' +
                                (statusH + 60) +
                                'px;width:140px;height:140px;border-radius:50%;z-index:10;background:' +
                                aboutPieBackground(currentFirmware) +
                                ';';
                            layer.appendChild(y1Pie);
                            var y1Info = document.createElement('div');
                            y1Info.style.cssText =
                                'position:absolute;left:0;top:' +
                                (statusH + 210) +
                                'px;width:' +
                                W +
                                'px;display:flex;justify-content:center;align-items:flex-start;gap:10px;z-index:10;box-sizing:border-box;color:#fff;font-size:14px;line-height:1.3;text-align:left;' +
                                aboutOutline;
                            var y1Volume = aboutVolume(currentFirmware);
                            var y1Left = document.createElement('div');
                            y1Left.style.cssText = 'white-space:pre;';
                            y1Left.textContent =
                                'Total: ' +
                                y1Volume.total +
                                'G\nAvailable: ' +
                                y1Volume.available.toFixed(1) +
                                'G';
                            var y1Right = document.createElement('div');
                            y1Right.style.cssText = 'white-space:pre;';
                            y1Right.textContent =
                                'Used: ' +
                                y1Volume.used.toFixed(1) +
                                'G\n' +
                                aboutVersionLabel(currentFirmware) +
                                ' ' +
                                aboutVersionName(currentFirmware);
                            y1Info.appendChild(y1Left);
                            y1Info.appendChild(y1Right);
                            layer.appendChild(y1Info);
                        } else {
                            var y2Rows = ['Internal Storage', 'TF Card'];
                            /* AboutActivity opens on the TF Card row in the
                               retail build; the arrow belongs to the selected
                               ItemLinearLayout only. */
                            var y2Selected = 1;
                            for (var abi = 0; abi < y2Rows.length; abi++) {
                                var y2Row = document.createElement('div');
                                y2Row.style.cssText =
                                    'position:absolute;left:0;top:' +
                                    (statusH + abi * 45) +
                                    'px;width:260px;height:45px;display:flex;align-items:center;padding-left:16px;box-sizing:border-box;font-size:22px;font-weight:700;z-index:10;';
                                applyCssProps(
                                    y2Row,
                                    abi === y2Selected ? itemSelectedBackgroundStyle : itemBackgroundStyle
                                );
                                y2Row.style.color =
                                    abi === y2Selected ? itemCfg.itemSelectedTextColor || '#fff' : colors.text_primary;
                                y2Row.textContent = y2Rows[abi];
                                if (abi === y2Selected) {
                                    var y2Arrow = document.createElement('span');
                                    y2Arrow.style.cssText =
                                        'position:absolute;right:8px;top:0;height:45px;line-height:45px;font-size:28px;font-weight:400;color:#fff;opacity:0.9;';
                                    y2Arrow.textContent = '\u203a';
                                    y2Row.appendChild(y2Arrow);
                                }
                                layer.appendChild(y2Row);
                            }
                            var y2Pie = document.createElement('div');
                            y2Pie.style.cssText =
                                'position:absolute;left:' +
                                (W - 37 - 140) +
                                'px;top:' +
                                (statusH + 60) +
                                'px;width:140px;height:140px;border-radius:50%;z-index:10;background:' +
                                aboutPieBackground(currentFirmware) +
                                ';';
                            layer.appendChild(y2Pie);
                            var y2Info = document.createElement('div');
                            y2Info.style.cssText =
                                'position:absolute;left:' +
                                (W - 37 - 140) +
                                'px;top:' +
                                (statusH + 220) +
                                'px;width:140px;color:#fff;font-size:16px;line-height:1.3;text-align:center;white-space:pre;z-index:10;';
                            y2Info.textContent = aboutInfoText(currentFirmware);
                            layer.appendChild(y2Info);
                        }
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

                        /* FMMainActivity keeps the tuned channel, the audio route
                           and the favourite marker under the dial. */
                        var fmMeta = document.createElement('div');
                        fmMeta.style.cssText =
                            'display:flex;align-items:center;justify-content:space-between;width:440px;font-size:12px;color:' +
                            colors.text_primary +
                            ';opacity:0.8;';
                        var fmIsFav =
                            (sim.fmFavoriteFreqs || []).indexOf(Math.round(freqVal)) !== -1;
                        fmMeta.innerHTML =
                            '<span>MENU &middot; Channel list</span><span>' +
                            (fmIsFav ? '\u2605 Favourite' : '\u2606 Not saved') +
                            ' &middot; ' +
                            (sim.fmAudioOutput === 'headset' ? 'Headset' : 'Speaker') +
                            '</span>';
                        fmLayer.appendChild(fmMeta);
                        layer.appendChild(fmLayer);
                    } else if (
                        sim.themeViewId === 'fmMenu' ||
                        sim.themeViewId === 'fmChannels' ||
                        sim.themeViewId === 'fmFavorites' ||
                        sim.themeViewId === 'fmAudioOutput' ||
                        sim.themeViewId === 'fmRange'
                    ) {
                        /* FM popup lists. The menu items are the 3.2.8 launcher's
                           FM strings: Channel list, Favorite channel list,
                           Re-search channel, Record fm, Audio output, Frequency
                           range. Y1 3.1.2 shows the same five plus Record fm. */
                        var fmTitleMap = {
                            fmMenu: 'FM Radio',
                            fmChannels: 'Channel list',
                            fmFavorites: 'Favorite channel list',
                            fmAudioOutput: 'Audio output',
                            fmRange: 'Frequency range'
                        };
                        var fmListItems = genericListForView(sim.themeViewId, previewOpts.deviceMode, sim);
                        var fmViewTop = statusH + 6;
                        var fmTitleEl = document.createElement('div');
                        fmTitleEl.textContent = fmTitleMap[sim.themeViewId] || 'FM Radio';
                        fmTitleEl.style.cssText =
                            'position:absolute;left:26px;top:' +
                            fmViewTop +
                            'px;font-size:15px;font-weight:700;letter-spacing:0.02em;text-transform:uppercase;color:' +
                            colors.text_primary +
                            ';opacity:0.72;z-index:11;';
                        layer.appendChild(fmTitleEl);
                        var fmListTop = fmViewTop + 24;
                        var fmListBox2 = document.createElement('div');
                        fmListBox2.style.cssText =
                            'position:absolute;left:26px;top:' +
                            fmListTop +
                            'px;width:' +
                            (W - 52) +
                            'px;height:' +
                            (H - fmListTop - 14) +
                            'px;overflow:hidden;z-index:10;';
                        activeMenuList = appendMenuRows(fmListBox2, {
                            items: fmListItems,
                            selectedIndex: sim.themeSelectedIndex,
                            itemHeight: 42,
                            visibleHeight: H - fmListTop - 14,
                            colors: {
                                text_primary: colors.menu_text_primary,
                                text_selected: colors.menu_text_selected
                            },
                            itemBackgroundStyle: itemBackgroundStyle,
                            itemSelectedBackgroundStyle: itemSelectedBackgroundStyle,
                            itemRightArrowUrl: '',
                            fullWidth: false,
                            leftPad: 0,
                            rowWidth: W - 52,
                            folderIconUrl: '',
                            musicIconUrl: '',
                            scrollState: scrollState,
                            eager: eagerImages
                        });
                        activeMenuList.viewId = sim.themeViewId;
                        layer.appendChild(fmListBox2);
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
                        /* activity_music_player.xml (Y1 and Y2, read from
                           3.1.2/3.2.8): a 45dp top content band, a 235dp info
                           column pinned 10dp from the right, rows
                           42/38/38/38dp with 7dp gaps, and a 32dp bottom
                           progress band. Better-Y's Cover.java squares and
                           centres the cover, keeps the layout's #1affffff
                           boxes and reflects the lower half. Y2 3.2.0 adds the
                           Flat/Perspective Album Art Style. */
                        var trackIdx = (sim.nowPlayingTrackIndex || 0) % MOCK_SONGS_PREVIEW.length;
                        var mock = MOCK_SONGS_PREVIEW[trackIdx] || MOCK_SONGS_PREVIEW[0] || {};
                        /* The player always previews its own sample track:
                           the theme's title, author and description are not
                           song metadata and must never leak into Now Playing. */
                        var npTitle = mock.title || 'Blinding Lights';
                        var npArtist = mock.artist || '';
                        var npAlbum = mock.album || '';
                        /* ProgressBar's own drawable, not the theme's selected-text
                           colour: a white-menu theme selects in white, which made
                           the bar disappear on its white player. */
                        var progCol = playerCfg.progressColor || '#2F80ED';
                        var progBgCol = playerCfg.progressBackgroundColor || 'rgba(0,0,0,0.16)';
                        var playerKind =
                            currentFirmware.playerProfile ||
                            (currentFirmware.solar === true
                                ? 'solar'
                                : currentFirmware.menuProfile === 'better-y'
                                  ? 'better-y'
                                  : 'stock');
                        var betterYPlayer = playerKind === 'better-y';
                        var solarPlayer = playerKind === 'solar';
                        var solarBars = solarPlayer ? nowPlayingInfoBarsMode(cfg) : 'default';
                        /* Unified is the latest Y2 player: only its Home and
                           Settings coverage is wider, never its layout. */
                        var y2Player = !solarPlayer && currentFirmware.modelId === 'y2';
                        var y2FlatArt = y2Player && sim.albumArtStyle === 'flat';
                        /* player_info_bg / player_info_divider: night (the
                           themed player) gives #1AFFFFFF rows and transparent
                           dividers; Y2's default light theme gives transparent
                           rows and #4D2D2D44 hairlines. */
                        var y2LightPlayer =
                            y2Player && isY2DefaultTheme(cfg, contentFolder, previewOpts.deviceMode);
                        var stockTextCol = y2LightPlayer ? '#2D2D44' : '#FFFFFF';
                        var progressH = solarPlayer ? 34 : 32;
                        var infoLeft = solarPlayer ? 245 : W - 10 - 235;
                        var infoW = 235;
                        /* activity_music_player.xml places the info column
                           26dip below the 45dip content band. These are
                           coordinates inside `np`, so the band offset must
                           not be added a second time: doing that pushed the
                           action row under the progress bar. */
                        var infoTop = solarPlayer ? 0 : 26;
                        var infoHeight = solarPlayer ? 225 : 0;
                        var infoPadTop = solarPlayer ? 8 : 0;
                        var npTextCol = solarPlayer
                            ? nowPlayingTextColor(cfg, stockTextCol)
                            : stockTextCol;
                        var npProgressText = solarPlayer
                            ? progressTextColor(cfg, stockTextCol)
                            : npTextCol;
                        var rowBg;
                        var rowDivider = '';
                        if (solarPlayer) {
                            rowBg = solarBars === 'none' ? 'transparent' : 'rgba(255,255,255,0.102)';
                        } else if (y2LightPlayer) {
                            rowBg = 'transparent';
                            /* Android #4D2D2D44, written in CSS order. */
                            rowDivider = '#2D2D444D';
                        } else {
                            /* Y1 layout's #1affffff and Better-Y's tinted box
                               at the same 0x1A alpha. */
                            rowBg = 'rgba(255,255,255,0.102)';
                        }
                        var rowBgIsItem = solarPlayer && solarBars === 'item';
                        if (rowBgIsItem) rowBg = 'transparent';
                        var np = document.createElement('div');
                        np.style.cssText =
                            'position:absolute;left:0;top:45px;width:' +
                            W +
                            'px;height:' +
                            Math.max(0, H - 45) +
                            'px;z-index:10;box-sizing:border-box;overflow:hidden;';

                        /* ReflectImageView boxes are declared 200×300 (Y1 and
                           Better-Y) and 200×310 perspective / 200×250 flat
                           (Y2). The bitmap is square; Better-Y additionally
                           fits it to the gap beside the info column
                           ({@code Cover.inset}) and centres it on the rows
                           ({@code Cover.topFor}). */
                        var artW = solarPlayer ? 235 : 200;
                        var artH = solarPlayer
                            ? 225
                            : y2Player
                              ? y2FlatArt
                                  ? 250
                                  : 310
                              : 300;
                        var artLeft = solarPlayer ? 5 : y2Player ? (y2FlatArt ? 15 : 10) : 25;
                        var artTop = solarPlayer ? 0 : y2Player ? (y2FlatArt ? 35 : 10) : 35;
                        var infoRowsHeight = 42 + 7 + 38 + 7 + 38 + 7 + 38 + 7 + 38;
                        var coverH = solarPlayer
                            ? 225
                            : betterYPlayer
                              ? Math.max(0, Math.min(artW, W - 245 - 50))
                              : Math.min(artW, artH);
                        if (betterYPlayer) {
                            artTop = infoTop + Math.max(0, (infoRowsHeight - coverH) / 2);
                        }
                        var coverW = solarPlayer ? artW : coverH;
                        var artWrap = document.createElement('div');
                        var tiltCover = y2Player
                            ? !y2FlatArt
                            : betterYPlayer
                              ? sim.betterYTilt === true
                              : false;
                        artWrap.style.cssText =
                            'position:absolute;left:' +
                            artLeft +
                            'px;top:' +
                            artTop +
                            'px;width:' +
                            artW +
                            'px;height:' +
                            artH +
                            'px;z-index:1;' +
                            (tiltCover
                                ? 'transform:perspective(560px) rotateY(' +
                                  (betterYPlayer ? 20 : 18) +
                                  'deg);transform-origin:left ' +
                                  (betterYPlayer ? '33%' : 'center') +
                                  ';'
                                : '');
                        var art = document.createElement('div');
                        art.style.cssText =
                            'position:relative;width:' +
                            coverW +
                            'px;height:' +
                            coverH +
                            'px;border-radius:4px;overflow:hidden;background:rgba(0,0,0,0.28);' +
                            (tiltCover
                                ? 'box-shadow:0 10px 24px rgba(0,0,0,0.36);'
                                : 'box-shadow:0 2px 10px rgba(0,0,0,0.22);');
                        /* The sample tracks ship no embedded art: the player
                           shows its own no-artwork placeholder, never the
                           theme's gallery cover. */
                        var coverU = UNKNOWN_ALBUM_ART_URL;
                        if (coverU) {
                            var ai = document.createElement('img');
                            ai.src = coverU;
                            ai.alt = 'No album artwork';
                            bindPreviewImgFallback(ai, { eager: eagerImages });
                            ai.style.cssText =
                                'width:100%;height:100%;object-fit:' +
                                (solarPlayer ? 'cover' : 'contain') +
                                ';display:block;';
                            art.appendChild(ai);
                        }
                        artWrap.appendChild(art);
                        /* ReflectImageView's faded mirror sits under every stock
                           and Better-Y cover. */
                        if (coverU && !solarPlayer) {
                            /* ReflectImageView mirrors the lower half of the
                               square cover under it, fading to nothing. */
                            var mirrorH = Math.round(coverH / 2);
                            var mirror = document.createElement('div');
                            mirror.style.cssText =
                                'position:absolute;left:0;top:' +
                                coverH +
                                'px;width:' +
                                coverW +
                                'px;height:' +
                                mirrorH +
                                'px;background-image:url("' +
                                String(coverU).replace(/"/g, '%22') +
                                '");background-size:100% 100%;transform:scaleY(-1);transform-origin:top center;opacity:0.38;pointer-events:none;-webkit-mask-image:linear-gradient(to bottom,rgba(0,0,0,0.9),rgba(0,0,0,0));mask-image:linear-gradient(to bottom,rgba(0,0,0,0.9),rgba(0,0,0,0));';
                            artWrap.appendChild(mirror);
                        }
                        np.appendChild(artWrap);

                        var colR = document.createElement('div');
                        colR.style.cssText =
                            'position:absolute;left:' +
                            infoLeft +
                            'px;top:' +
                            infoTop +
                            'px;width:' +
                            infoW +
                            'px;display:flex;flex-direction:column;z-index:2;' +
                            (solarPlayer
                                ? 'height:' + infoHeight + 'px;padding-top:' + infoPadTop + 'px;box-sizing:border-box;'
                                : '');
                        var npRows = [
                            { text: npTitle, h: solarPlayer ? 36 : 42, size: 25 },
                            { text: npArtist || '\u00a0', h: 38, size: 21 },
                            { text: npAlbum || '\u00a0', h: 38, size: 21 },
                            { text: trackIdx + 1 + '/' + MOCK_SONGS_PREVIEW.length, h: 38, size: 21 }
                        ];
                        npRows.forEach(function (row, rowIndex) {
                            var rowEl = document.createElement('div');
                            rowEl.style.cssText =
                                'position:relative;height:' +
                                row.h +
                                'px;margin-top:' +
                                (rowIndex === 0 ? 0 : solarPlayer ? 8 : 7) +
                                'px;background:' +
                                rowBg +
                                ';padding:0 13px;box-sizing:border-box;display:flex;align-items:center;color:' +
                                npTextCol +
                                ';font-size:' +
                                row.size +
                                'px;font-weight:700;line-height:1;white-space:nowrap;overflow:hidden;';
                            /* text-overflow needs a block/inline-block box of
                               its own; on the flex row it just cut the glyphs. */
                            var rowText = document.createElement('span');
                            rowText.textContent = row.text;
                            rowText.style.cssText =
                                'display:block;width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;';
                            rowEl.appendChild(rowText);
                            /* player_info_divider: 1dip at each row's bottom
                               edge, inset 13dip from both sides. Y2's themed
                               (night) player resolves it to transparent. */
                            if (rowDivider) {
                                var rowHair = document.createElement('span');
                                rowHair.style.cssText =
                                    'position:absolute;left:13px;right:13px;bottom:0;height:1px;background:' +
                                    rowDivider +
                                    ';pointer-events:none;';
                                rowEl.appendChild(rowHair);
                            }
                            if (rowBgIsItem) applyCssProps(rowEl, itemSelectedBackgroundStyle);
                            colR.appendChild(rowEl);
                        });

                        var actionRow = document.createElement('div');
                        actionRow.style.cssText =
                            'position:relative;height:' +
                            (solarPlayer ? 35 : 38) +
                            'px;margin-top:' +
                            (solarPlayer ? 8 : 7) +
                            'px;background:' +
                            rowBg +
                            ';padding:' +
                            (solarPlayer ? '0 10px' : '4px 10px 4px 13px') +
                            ';box-sizing:border-box;display:flex;align-items:center;gap:10px;color:' +
                            npTextCol +
                            ';';
                        /* Stock Y1/Y2 show the layout's two visible buttons.
                           Better-Y's Deck adds the music row in its own order:
                           heart, shuffle, repeat, lyrics, A-B (queue is hidden
                           at the default top_hold=Queue). */
                        var npActions = solarPlayer
                            ? (sim.shuffleEnabled ? [{ id: 'shuffle', label: 'Shuffle' }] : []).concat(
                                  sim.repeatMode && sim.repeatMode !== 'off'
                                      ? [{ id: 'repeat', label: 'Repeat' }]
                                      : []
                              )
                            : betterYPlayer
                              ? [
                                    { id: 'heart', label: 'Favourite' },
                                    { id: 'shuffle', label: 'Shuffle' },
                                    { id: 'repeat', label: 'Repeat' },
                                    { id: 'lyrics', label: 'Lyrics' },
                                    { id: 'ab', label: 'A-B repeat' }
                                ]
                              : [
                                    { id: 'shuffle', label: 'Shuffle' },
                                    { id: 'repeat', label: 'Repeat' }
                                ];
                        function npActionSvg(id) {
                            var paths = {
                                heart: '<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z"/>',
                                shuffle: '<path d="M16 3h5v5"/><path d="M4 20 21 3"/><path d="M21 16v5h-5"/><path d="m15 15 6 6"/><path d="m4 4 5 5"/>',
                                repeat: '<path d="m17 1 4 4-4 4"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><path d="m7 23-4-4 4-4"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/>',
                                lyrics: '<rect x="9" y="2" width="6" height="11" rx="3"/><path d="M5 10a7 7 0 0 0 14 0"/><path d="M12 17v5"/>',
                                ab: '<path d="M4 8h5a4 4 0 0 1 0 8H7"/><path d="m7 5-3 3 3 3"/><path d="M20 16h-5a4 4 0 0 1 0-8h2"/><path d="m17 19 3-3-3-3"/>',
                                queue: '<path d="M3 6h12M3 12h9M3 18h9"/><path d="m16 14 5 4-5 4z"/>'
                            };
                            return (
                                '<svg viewBox="0 0 24 24" width="' +
                                (solarPlayer ? 24 : 30) +
                                '" height="' +
                                (solarPlayer ? 24 : 30) +
                                '" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
                                (paths[id] || paths.queue) +
                                '</svg>'
                            );
                        }
                        npActions.forEach(function (action) {
                            var actionBtn = document.createElement('button');
                            actionBtn.type = 'button';
                            actionBtn.title = action.label;
                            actionBtn.setAttribute('aria-label', action.label);
                            actionBtn.innerHTML = npActionSvg(action.id);
                            actionBtn.style.cssText =
                                'width:' +
                                (solarPlayer ? 24 : 30) +
                                'px;height:' +
                                (solarPlayer ? 24 : 30) +
                                'px;display:flex;align-items:center;justify-content:center;padding:0;border:0;background:transparent;color:inherit;cursor:pointer;';
                            actionBtn.addEventListener('click', function (ev) {
                                ev.preventDefault();
                                ev.stopPropagation();
                                if (action.id === 'shuffle') {
                                    sim.shuffleEnabled = !sim.shuffleEnabled;
                                    showToast('Shuffle ' + (sim.shuffleEnabled ? 'on' : 'off'));
                                } else if (action.id === 'repeat') {
                                    sim.repeatMode = sim.repeatMode === 'all' ? 'one' : sim.repeatMode === 'one' ? 'off' : 'all';
                                    showToast('Repeat: ' + sim.repeatMode);
                                } else if (action.id === 'lyrics') {
                                    showToast('Lyrics');
                                } else if (action.id === 'ab') {
                                    showToast('A-B repeat');
                                } else if (action.id === 'queue') {
                                    showToast('Queue');
                                } else if (action.id === 'heart') {
                                    actionBtn.style.opacity = actionBtn.style.opacity === '0.35' ? '1' : '0.35';
                                }
                            });
                            actionRow.appendChild(actionBtn);
                        });
                        if (rowBgIsItem) applyCssProps(actionRow, itemSelectedBackgroundStyle);
                        colR.appendChild(actionRow);
                        np.appendChild(colR);

                        var npBarRow = document.createElement('div');
                        npBarRow.style.cssText =
                            'position:absolute;left:0;bottom:0;width:' +
                            W +
                            'px;height:' +
                            progressH +
                            'px;display:flex;align-items:center;z-index:3;' +
                            (solarPlayer ? 'padding:0 10px;box-sizing:border-box;' : '');
                        var tEl = document.createElement('span');
                        tEl.textContent = '01:42';
                        tEl.style.cssText =
                            'width:77px;text-align:center;font-size:15px;font-weight:700;color:' +
                            npProgressText +
                            ';flex:0 0 77px;';
                        var barTrack = document.createElement('div');
                        barTrack.style.cssText =
                            'flex:1;height:8px;overflow:hidden;background:' + progBgCol + ';margin:0 2px;';
                        var barFill = document.createElement('div');
                        barFill.style.cssText = 'width:42%;height:100%;background:' + progCol + ';';
                        barTrack.appendChild(barFill);
                        var durSec = mock.duration || 243;
                        var durStr =
                            String(Math.floor(durSec / 60)).padStart(2, '0') +
                            ':' +
                            String(durSec % 60).padStart(2, '0');
                        var tTot = document.createElement('span');
                        tTot.textContent = durStr;
                        tTot.style.cssText =
                            'width:77px;text-align:center;font-size:15px;font-weight:700;color:' +
                            npProgressText +
                            ';flex:0 0 77px;';
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
                        if (sim.dialogMessage) panel.appendChild(dm);
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

                    if (sim.themeOptionsVisible) {
                        /* ThemeOptionsDialog: a full-width 70dp bar with five
                           equal cells, read from dialog_photos.xml and
                           item_photos_submenu.xml. Y1 paints #FF0A214B with
                           white labels and #FF3CFFDE for the accent; Y2 uses
                            its light or night bar, with 30dp/14sp or
                            26dp/12sp items respectively. The selected cell
                            also swaps to the native *_selected icon. */
                        var menuModel = currentFirmware.modelId === 'y1' ? 'y1' : 'y2';
                        var menuOptions = themeOptionsItems();
                        var menuLight = menuModel === 'y2' && lightCard;
                        var menuIconSuffix = menuLight ? '' : menuModel === 'y2' ? '-dark' : '';
                        var menuBar = document.createElement('div');
                        menuBar.setAttribute('data-theme-options', 'true');
                        menuBar.style.cssText =
                            'position:absolute;left:0;bottom:0;width:' +
                            W +
                            'px;height:70px;background:' +
                            (menuLight ? '#FFFFFF' : '#0A214B') +
                            ';display:flex;align-items:stretch;z-index:46;box-sizing:border-box;';
                        var menuSelectedColor = menuLight ? '#0084FF' : '#3CFFDE';
                        var menuTextColor = menuLight ? '#2D2D44' : '#FFFFFF';
                        for (var mo = 0; mo < menuOptions.length; mo += 1) {
                            (function (optionIndex) {
                                var option = menuOptions[optionIndex];
                                var optionSelected = optionIndex === (sim.themeOptionsIndex | 0);
                                var item = document.createElement('div');
                                item.setAttribute('data-theme-option-index', String(optionIndex));
                                item.style.cssText =
                                    'flex:1 1 0;min-width:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1px;cursor:pointer;box-sizing:border-box;';
                                var icon = document.createElement('img');
                                icon.alt = '';
                                icon.src = nativeStudioAssetUrl(
                                    'assets/native-' +
                                        menuModel +
                                        '/theme-options/' +
                                        option.icon +
                                        (optionSelected ? '-selected' : '') +
                                        menuIconSuffix +
                                        '.png'
                                );
                                icon.style.cssText =
                                    'display:block;height:' +
                                    (menuLight ? 30 : menuModel === 'y2' ? 26 : 24) +
                                    'px;width:auto;max-width:90%;object-fit:contain;';
                                var label = document.createElement('div');
                                label.textContent = option.label;
                                label.style.cssText =
                                    'max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:' +
                                    (menuLight ? 14 : 12) +
                                    'px;line-height:1.1;color:' +
                                    (optionSelected ? menuSelectedColor : menuTextColor) +
                                    ';';
                                item.appendChild(icon);
                                item.appendChild(label);
                                item.addEventListener('click', function (ev) {
                                    ev.preventDefault();
                                    ev.stopPropagation();
                                    sim.themeOptionsIndex = optionIndex;
                                    paint();
                                });
                                menuBar.appendChild(item);
                            })(mo);
                        }
                        layer.appendChild(menuBar);
                    }

                    if (sim.inputDialogVisible) {
                        /* InputMethodDialog: a 400px-wide floating Dialog pinned
                           40px above the bottom. dialog_input_method.xml puts a
                           110x37dp EditText at 9dp then a horizontal A-Z
                           RecyclerView; item_input_method.xml is a 21x32dp
                           letter cell. Menu closes the dialog, Enter types the
                           highlighted letter, Right inserts a space and Left
                           deletes one character. */
                        var inputFont =
                            '700 24px ' + fontStack + ', Arial, sans-serif';
                        var keyboardModelId = currentFirmware.modelId === 'y1' ? 'y1' : 'y2';
                        var keyboardLight =
                            keyboardModelId === 'y2' &&
                            isY2DefaultTheme(cfg, catalogFolder, previewOpts.deviceMode);
                        var alphabet =
                            String(global.STUDIO_PREVIEW_LOCALE || '').toLowerCase() === 'ru'
                                ? 'АБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯ'.split('')
                                : 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
                        var dialogBg = keyboardLight ? 'rgba(255,255,255,0.80)' : '#192E4B';
                        var keyText = keyboardLight ? '#000000' : '#FFFFFF';
                        var kb = document.createElement('div');
                        kb.setAttribute('data-input-method', 'true');
                        kb.style.cssText =
                            'position:absolute;left:40px;top:' +
                            (H - 40 - 55) +
                            'px;width:400px;height:55px;border-radius:8px;background:' +
                            dialogBg +
                            ';box-sizing:border-box;z-index:60;color:' +
                            keyText +
                            ';overflow:hidden;';
                        var edit = document.createElement('div');
                        edit.style.cssText =
                            'position:absolute;left:9px;top:9px;width:110px;height:37px;background:#FFFFFF;border-radius:5px;box-sizing:border-box;padding:0 7px;display:flex;align-items:center;font:' +
                            inputFont +
                            ';color:#000000;white-space:nowrap;overflow:hidden;';
                        var shownInput = String(sim.inputValue || '');
                        if (shownInput.length > 6) {
                            shownInput = '...' + shownInput.slice(-4);
                        }
                        edit.textContent = shownInput;
                        kb.appendChild(edit);
                        var letters = document.createElement('div');
                        letters.style.cssText =
                            'position:absolute;left:128px;top:0;right:9px;height:55px;display:flex;align-items:center;overflow:hidden;';
                        var charW = 21;
                        var charGap = 6;
                        var visibleChars = Math.floor((400 - 128 - 9 + charGap) / (charW + charGap));
                        var firstChar = Math.max(
                            0,
                            Math.min(
                                (sim.inputCharIndex | 0) - Math.floor(visibleChars / 2),
                                Math.max(0, alphabet.length - visibleChars)
                            )
                        );
                        for (var ci = firstChar; ci < Math.min(alphabet.length, firstChar + visibleChars); ci += 1) {
                            (function (charIndex) {
                                var charEl = document.createElement('div');
                                charEl.textContent = alphabet[charIndex];
                                charEl.setAttribute('data-input-char', String(charIndex));
                                var charSelected = charIndex === (sim.inputCharIndex | 0);
                                charEl.style.cssText =
                                    'flex:0 0 ' +
                                    charW +
                                    'px;width:' +
                                    charW +
                                    'px;height:32px;margin:0 3px;border-radius:5px;display:flex;align-items:center;justify-content:center;font-size:20px;color:' +
                                    keyText +
                                    ';background:' +
                                    (charSelected ? '#00A4FF' : 'transparent') +
                                    ';font-weight:' +
                                    (charSelected ? '700' : '400') +
                                    ';cursor:pointer;box-sizing:border-box;';
                                charEl.addEventListener('click', function (ev) {
                                    ev.preventDefault();
                                    ev.stopPropagation();
                                    sim.inputCharIndex = charIndex;
                                    sim.inputValue = String(sim.inputValue || '') + alphabet[charIndex].toLowerCase();
                                    paint();
                                });
                                letters.appendChild(charEl);
                            })(ci);
                        }
                        kb.appendChild(letters);
                        layer.appendChild(kb);
                    }

                    if (sim.toastVisible && sim.toastMessage) {
                        var toast = document.createElement('div');
                        toast.style.cssText =
                            'position:absolute;bottom:24px;left:50%;transform:translateX(-50%);z-index:70;background:rgba(0,0,0,0.82);color:#fff;padding:8px 14px;border-radius:8px;font-size:14px;font-weight:600;max-width:80%;text-align:center;';
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

                function openInputDialog(context, targetId, initialValue) {
                    sim.inputDialogVisible = true;
                    sim.inputContext = String(context || '');
                    sim.inputTargetId = String(targetId || '');
                    sim.inputValue = String(initialValue || '');
                    sim.inputOriginalValue = String(initialValue || '');
                    sim.inputCharIndex = 0;
                    paint();
                }

                function commitInputDialog() {
                    var context = sim.inputContext;
                    var targetId = sim.inputTargetId;
                    var value = String(sim.inputValue || '').trim();
                    var original = String(sim.inputOriginalValue || '').trim();
                    sim.inputDialogVisible = false;
                    sim.inputContext = '';
                    sim.inputTargetId = '';
                    sim.inputOriginalValue = '';
                    if (context === 'fileRename') {
                        if (!value) {
                            showToast('Filename cannot be empty');
                            return;
                        }
                        if (value !== original) {
                            renameFileManagerEntry(targetId, value);
                            showToast('Renamed to ' + value);
                            return;
                        }
                    }
                    if (context === 'themeRename') {
                        if (!value) {
                            showToast('Filename cannot be empty');
                            return;
                        }
                        if (value !== original) {
                            var themeEntries = themeSelectorEntries().entries;
                            var duplicate = themeEntries.some(function (entry) {
                                return entry.name.toLowerCase() === value.toLowerCase();
                            });
                            if (duplicate) {
                                showToast('Filename cannot be duplicate');
                                return;
                            }
                            sim.dialogVisible = true;
                            sim.dialogContext = 'themeRenameConfirm';
                            sim.dialogTitle = 'Sure to rename?';
                            sim.dialogMessage = '';
                            sim.dialogOptions = ['Yes', 'No'];
                            sim.dialogSelectedIndex = 1;
                            sim.themePendingRename = { from: original, to: value };
                            paint();
                            return;
                        }
                    }
                    paint();
                }

                function themeOptionsItems() {
                    return [
                        { label: 'Delete', icon: 'delete' },
                        { label: 'MultiSelect', icon: 'multi-select' },
                        { label: 'All Select', icon: 'all-select' },
                        { label: 'Rename', icon: 'rename' },
                        { label: 'As Theme', icon: 'as-theme' }
                    ];
                }

                function closeThemeOptions() {
                    sim.themeOptionsVisible = false;
                    sim.themeOptionsIndex = 0;
                }

                function openThemeSetDialog(entry) {
                    if (!entry) return;
                    sim.dialogVisible = true;
                    sim.dialogContext = 'themeSet';
                    sim.dialogTitle = 'Set Theme';
                    sim.dialogMessage = 'Are you sure you set ' + entry.name + ' as the theme?';
                    sim.dialogOptions = ['Yes', 'No'];
                    sim.dialogSelectedIndex = 1;
                    sim.themePendingName = entry.name;
                    sim.themePendingEntry = entry;
                    paint();
                }

                function themeOptionsAction(index) {
                    var selector = themeSelectorEntries();
                    var entries = selector.entries;
                    var targetIndex = sim.themeOptionsTargetIndex | 0;
                    var target = entries[targetIndex] || entries[0];
                    closeThemeOptions();
                    if (!target) {
                        paint();
                        return;
                    }
                    if (index === 0) {
                        if (target.isDefault) {
                            showToast('The default theme cannot be deleted');
                            return;
                        }
                        var names = [target.name];
                        if (sim.themeMultiSelect) {
                            names = (sim.themeMultiSelected || [])
                                .map(function (selectedIndex) {
                                    return entries[selectedIndex] && entries[selectedIndex].name;
                                })
                                .filter(Boolean);
                        }
                        names = names.filter(function (name) {
                            return name && name !== 'HoloPebble';
                        });
                        if (!names.length) {
                            showToast('The default theme cannot be deleted');
                            return;
                        }
                        sim.dialogVisible = true;
                        sim.dialogContext = 'themeDelete';
                        sim.dialogTitle =
                            names.indexOf(sim.themeCurrentTitle) !== -1
                                ? 'Caution: The theme you are deleting includes the currently active one. Confirm deletion?'
                                : 'Sure to delete？';
                        sim.dialogMessage = '';
                        sim.dialogOptions = ['Yes', 'No'];
                        sim.dialogSelectedIndex = 1;
                        sim.themePendingDeleteNames = names.slice();
                        paint();
                        return;
                    }
                    if (index === 1) {
                        sim.themeMultiSelect = true;
                        sim.themeMultiSelected = target.isDefault ? [] : [targetIndex];
                        paint();
                        return;
                    }
                    if (index === 2) {
                        sim.themeMultiSelect = true;
                        sim.themeMultiSelected = entries
                            .map(function (entry, entryIndex) {
                                return entry.isDefault ? -1 : entryIndex;
                            })
                            .filter(function (entryIndex) {
                                return entryIndex >= 0;
                            });
                        paint();
                        return;
                    }
                    if (index === 3) {
                        if (target.isDefault) {
                            showToast('The default theme cannot be renamed');
                            return;
                        }
                        openInputDialog('themeRename', target.name, target.name);
                        return;
                    }
                    if (index === 4) {
                        openThemeSetDialog(target);
                    }
                }

                function goBack() {
                    if (sim.inputDialogVisible) {
                        commitInputDialog();
                        return;
                    }
                    if (sim.themeOptionsVisible) {
                        closeThemeOptions();
                        paint();
                        return;
                    }
                    if (sim.themeMultiSelect) {
                        sim.themeMultiSelect = false;
                        sim.themeMultiSelected = [];
                        paint();
                        return;
                    }
                    if (sim.dialogVisible) {
                        sim.dialogVisible = false;
                        paint();
                        return;
                    }
                    if (sim.themeFullPreview && sim.themeViewId === 'settingsTheme') {
                        sim.themeFullPreview = false;
                        paint();
                        return;
                    }
                    if (sim.themeHistory.length > 0) {
                        var prev = sim.themeHistory[sim.themeHistory.length - 1];
                        sim.themeHistory.pop();
                        sim.themeViewId = prev;
                        if (prev === 'settingsTheme') sim.themeSelectorInitialized = false;
                        if (
                            [
                                'home',
                                'music',
                                'videos',
                                'audiobooks',
                                'settings',
                                'settingsBetterY',
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
                    if (sim.inputDialogVisible) {
                        var alphabetLength =
                            String(global.STUDIO_PREVIEW_LOCALE || '').toLowerCase() === 'ru'
                                ? 33
                                : 26;
                        var inputDelta = direction === 'down' ? 1 : -1;
                        sim.inputCharIndex =
                            ((sim.inputCharIndex | 0) + inputDelta + alphabetLength * 10) % alphabetLength;
                        paint();
                        return;
                    }
                    if (sim.themeOptionsVisible) {
                        var optionLen = themeOptionsItems().length;
                        var optionDelta = direction === 'down' ? 1 : -1;
                        sim.themeOptionsIndex =
                            ((sim.themeOptionsIndex | 0) + optionDelta + optionLen * 10) % optionLen;
                        paint();
                        return;
                    }
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
                        vid === 'fileManagerList' ||
                        vid === 'fmMenu' ||
                        vid === 'fmChannels' ||
                        vid === 'fmFavorites' ||
                        vid === 'fmAudioOutput' ||
                        vid === 'fmRange' ||
                        vid === 'bluetooth' ||
                        vid === 'settingsLanguage'
                    ) {
                        scrollClamp(
                            direction,
                            genericListForView(
                                vid,
                                previewOpts.deviceMode,
                                sim,
                                currentFirmware.menuProfile
                            ).length
                        );
                    } else if (vid === 'fileManagerSettings') {
                        scrollClamp(direction, 7);
                    } else if (vid === 'settingsTheme') {
                        if (sim.themeFullPreview) return;
                        scrollClamp(direction, themeSelectorEntries().entries.length);
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
                    if (sim.inputDialogVisible) {
                        var inputAlphabet =
                            String(global.STUDIO_PREVIEW_LOCALE || '').toLowerCase() === 'ru'
                                ? 'АБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯ'.split('')
                                : 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
                        var inputChar = inputAlphabet[sim.inputCharIndex | 0] || 'A';
                        sim.inputValue = String(sim.inputValue || '') + inputChar.toLowerCase();
                        paint();
                        return;
                    }
                    if (sim.themeOptionsVisible) {
                        themeOptionsAction(sim.themeOptionsIndex | 0);
                        return;
                    }
                    if (sim.dialogVisible) {
                        var chosen = (sim.dialogOptions || [])[sim.dialogSelectedIndex] || '';
                        var dialogContext = sim.dialogContext || '';
                        sim.dialogVisible = false;
                        sim.dialogContext = '';
                        if (dialogContext === 'fmOutput') {
                            sim.fmAudioOutput = chosen === 'Headset' ? 'headset' : 'speaker';
                            showToast('Audio output: ' + chosen);
                            paint();
                            return;
                        }
                        if (dialogContext === 'fmRange') {
                            sim.fmRegion = chosen;
                            showToast('Frequency range: ' + chosen);
                            paint();
                            return;
                        }
                        if (dialogContext === 'fmDeleteChannel') {
                            if (chosen === 'Yes') {
                                var pending = Number(sim.fmPendingFreq);
                                sim.fmFavoriteFreqs = (sim.fmFavoriteFreqs || []).filter(function (f) {
                                    return Number(f) !== pending;
                                });
                                showToast('Successfully removed from favorites.');
                            }
                            paint();
                            return;
                        }
                        if (dialogContext === 'fmRecord') {
                            showToast(chosen === 'Save' ? 'Recording saved to /Recordings' : 'Recording discarded');
                            paint();
                            return;
                        }
                        if (dialogContext === 'themeSet') {
                            if (chosen === 'Yes') {
                                var appliedName = sim.themePendingName || 'theme';
                                var pendingEntry = sim.themePendingEntry || null;
                                sim.themePendingName = '';
                                sim.themePendingEntry = null;
                                var applyTheme = function () {
                                    sim.themeCurrentDeleted = false;
                                    sim.themeCurrentTitle = appliedName;
                                    sim.themeFullPreview = false;
                                    sim.themeViewId = 'settingsTheme';
                                    showToast('Theme set to ' + appliedName);
                                };
                                /* Setting a theme on the device is also a request
                                   to load that theme here. The Studio asks before
                                   replacing the workbench; declining keeps the
                                   player on this theme list. */
                                if (
                                    pendingEntry &&
                                    pendingEntry.folder &&
                                    typeof opts.onThemeSwitchRequest === 'function'
                                ) {
                                    var switchAnswer = opts.onThemeSwitchRequest(pendingEntry);
                                    paint();
                                    if (switchAnswer && typeof switchAnswer.then === 'function') {
                                        switchAnswer.then(function (accepted) {
                                            if (accepted) applyTheme();
                                        });
                                    } else if (switchAnswer === true) {
                                        applyTheme();
                                    }
                                    return;
                                }
                                applyTheme();
                            } else {
                                sim.themeViewId = 'settingsTheme';
                                paint();
                            }
                            return;
                        }
                        if (dialogContext === 'themeDelete') {
                            if (chosen === 'Yes') {
                                var deleteNames = sim.themePendingDeleteNames || [];
                                var currentThemeBeforeDelete = themeSelectorEntries().entries.filter(
                                    function (entry) {
                                        return entry.isCurrent;
                                    }
                                )[0];
                                if (
                                    currentThemeBeforeDelete &&
                                    deleteNames.indexOf(currentThemeBeforeDelete.name) !== -1
                                ) {
                                    sim.themeCurrentDeleted = true;
                                    sim.themeCurrentTitle = '';
                                }
                                var alreadyDeleted = sim.themeDeletedNames || [];
                                for (var dn = 0; dn < deleteNames.length; dn += 1) {
                                    if (alreadyDeleted.indexOf(deleteNames[dn]) === -1) {
                                        alreadyDeleted.push(deleteNames[dn]);
                                    }
                                }
                                sim.themeDeletedNames = alreadyDeleted;
                                sim.themePendingDeleteNames = [];
                                sim.themeMultiSelect = false;
                                sim.themeMultiSelected = [];
                                var remaining = themeSelectorEntries().entries;
                                sim.themeSelectedIndex = Math.min(
                                    sim.themeSelectedIndex,
                                    Math.max(0, remaining.length - 1)
                                );
                                showToast('Deleted successfully');
                            } else {
                                paint();
                            }
                            return;
                        }
                        if (dialogContext === 'themeRenameConfirm') {
                            if (chosen === 'Yes') {
                                var rename = sim.themePendingRename || null;
                                if (rename && rename.from && rename.to) {
                                    var currentBefore = themeSelectorEntries().entries.filter(function (entry) {
                                        return entry.isCurrent;
                                    })[0];
                                    sim.themeRenamedNames[rename.from] = rename.to;
                                    if (currentBefore && currentBefore.name === rename.from) {
                                        sim.themeCurrentTitle = rename.to;
                                    }
                                }
                                sim.themePendingRename = null;
                                paint();
                            } else {
                                sim.themePendingRename = null;
                                paint();
                            }
                            return;
                        }
                        if (dialogContext === 'fileOptions') {
                            var pendingEntry = sim.filePendingEntry || null;
                            if (chosen === 'Settings') {
                                sim.themeHistory.push('fileManagerList');
                                sim.themeViewId = 'fileManagerSettings';
                                sim.themeSelectedIndex = 0;
                            } else if (chosen === 'Open' && pendingEntry) {
                                if (pendingEntry.isFolder) {
                                    showToast('Opening ' + pendingEntry.label);
                                } else if (pendingEntry.isMusic) {
                                    sim.playState = 'playing';
                                    sim.themeHistory.push('fileManagerList');
                                    sim.themeViewId = 'nowPlaying';
                                    sim.themeSelectedIndex = 0;
                                } else {
                                    showToast('No app for this file');
                                }
                            } else if (chosen === 'Copy') {
                                showToast('Copying 1 item to Internal');
                            } else if (chosen === 'Cut') {
                                showToast('Cutting 1 item');
                            } else if (chosen === 'Delete') {
                                sim.dialogVisible = true;
                                sim.dialogContext = 'fileConfirmDelete';
                                sim.dialogTitle = 'Delete';
                                sim.dialogMessage = 'This item will be deleted.';
                                sim.dialogOptions = ['Yes', 'No'];
                                sim.dialogSelectedIndex = 1;
                            } else if (chosen === 'Rename') {
                                openInputDialog(
                                    'fileRename',
                                    pendingEntry ? pendingEntry.id : '',
                                    pendingEntry ? pendingEntry.label : ''
                                );
                                return;
                            } else if (chosen === 'Properties' && pendingEntry) {
                                sim.dialogVisible = true;
                                sim.dialogContext = 'fileProperties';
                                sim.dialogTitle = 'File Properties';
                                sim.dialogMessage =
                                    pendingEntry.label +
                                    '\nSize: ' +
                                    ((pendingEntry.columns && pendingEntry.columns[0]) || '-') +
                                    '\nModified: ' +
                                    ((pendingEntry.columns && pendingEntry.columns[1]) || '-');
                                sim.dialogOptions = ['OK'];
                                sim.dialogSelectedIndex = 0;
                            }
                            paint();
                            return;
                        }
                        if (dialogContext === 'fileConfirmDelete') {
                            showToast(chosen === 'Yes' ? 'Deleted successfully' : 'Cancelled');
                            paint();
                            return;
                        }
                        if (dialogContext === 'fileConfirmFormat') {
                            showToast(chosen === 'Yes' ? 'Format Completed!' : 'Cancelled');
                            paint();
                            return;
                        }
                        if (dialogContext === 'fileRestoreDefaults') {
                            if (chosen === 'Yes') {
                                sim.fileManagerSortField = 'name';
                                sim.fileManagerSortOrder = 'asc';
                                sim.fileManagerShowHidden = false;
                                sim.fileManagerShowExtensions = false;
                                showToast('Settings restored');
                            }
                            paint();
                            return;
                        }
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
                        var mList = genericListForView(
                            'music',
                            previewOpts.deviceMode,
                            sim,
                            currentFirmware.menuProfile
                        );
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
                    if (vid === 'fileManager') {
                        /* Storage picker → the folder list for that volume. */
                        var storageItems = genericListForView('fileManager', previewOpts.deviceMode);
                        var storagePick = storageItems[sim.themeSelectedIndex];
                        if (storagePick) {
                            sim.fileManagerStorage = storagePick.storage || 'internal';
                            sim.themeHistory.push('fileManager');
                            sim.themeViewId = 'fileManagerList';
                            sim.themeSelectedIndex = 0;
                            scrollState.override = 0;
                        }
                        paint();
                        return;
                    }
                    if (vid === 'fileManagerList') {
                        var fmRows = genericListForView('fileManagerList', previewOpts.deviceMode, sim);
                        var fmEntry = fmRows[sim.themeSelectedIndex] || null;
                        sim.filePendingEntry = fmEntry;
                        sim.dialogVisible = true;
                        sim.dialogContext = 'fileOptions';
                        sim.dialogTitle = fmEntry ? fmEntry.label : 'File Manager';
                        sim.dialogMessage = '';
                        sim.dialogOptions = ['Open', 'Copy', 'Cut', 'Delete', 'Rename', 'Properties', 'Settings', 'Cancel'];
                        sim.dialogSelectedIndex = 0;
                        paint();
                        return;
                    }
                    if (vid === 'fileManagerSettings') {
                        var fmSettingIndex = sim.themeSelectedIndex;
                        if (fmSettingIndex === 0) {
                            var fields = ['name', 'size', 'time', 'type'];
                            var fi = fields.indexOf(sim.fileManagerSortField);
                            sim.fileManagerSortField = fields[(fi + 1) % fields.length];
                        } else if (fmSettingIndex === 1) {
                            sim.fileManagerSortOrder = sim.fileManagerSortOrder === 'desc' ? 'asc' : 'desc';
                        } else if (fmSettingIndex === 2) {
                            sim.fileManagerShowHidden = !sim.fileManagerShowHidden;
                        } else if (fmSettingIndex === 3) {
                            sim.fileManagerShowExtensions = !sim.fileManagerShowExtensions;
                        } else if (fmSettingIndex === 4 || fmSettingIndex === 5) {
                            sim.dialogVisible = true;
                            sim.dialogContext = 'fileConfirmFormat';
                            sim.dialogTitle = fmSettingIndex === 4 ? 'Format Internal Storage' : 'Format TF Card';
                            sim.dialogMessage = 'Are you sure you want to format?';
                            sim.dialogOptions = ['Yes', 'No'];
                            sim.dialogSelectedIndex = 1;
                        } else if (fmSettingIndex === 6) {
                            sim.dialogVisible = true;
                            sim.dialogContext = 'fileRestoreDefaults';
                            sim.dialogTitle = 'Restore Default Settings';
                            sim.dialogMessage = 'Are you sure you want to restore all settings to their defaults?';
                            sim.dialogOptions = ['Yes', 'No'];
                            sim.dialogSelectedIndex = 1;
                        }
                        paint();
                        return;
                    }
                    if (vid === 'music_folders') {
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
                        /* FMMainActivity's MENU key opens the popup list. The
                           launcher's own strings: Channel list, Favorite channel
                           list, Re-search channel, Record fm, Audio output,
                           Frequency range. */
                        sim.themeHistory.push('fm');
                        sim.themeViewId = 'fmMenu';
                        sim.themeSelectedIndex = 0;
                        paint();
                        return;
                    }
                    if (vid === 'fmMenu') {
                        var fmMenuItems = genericListForView('fmMenu', previewOpts.deviceMode, sim);
                        var fmPick = fmMenuItems[sim.themeSelectedIndex] || {};
                        if (fmPick.id === 'fm_menu_channels') {
                            sim.themeHistory.push('fmMenu');
                            sim.themeViewId = 'fmChannels';
                            sim.themeSelectedIndex = 0;
                        } else if (fmPick.id === 'fm_menu_favorites') {
                            sim.themeHistory.push('fmMenu');
                            sim.themeViewId = 'fmFavorites';
                            sim.themeSelectedIndex = 0;
                        } else if (fmPick.id === 'fm_menu_rescan') {
                            showToast('Searching... ' + SCAN_FREQS.length + ' channels found');
                        } else if (fmPick.id === 'fm_menu_record') {
                            sim.dialogVisible = true;
                            sim.dialogContext = 'fmRecord';
                            sim.dialogTitle = 'Record fm';
                            sim.dialogMessage = 'Save current recording?';
                            sim.dialogOptions = ['Save', 'Discard'];
                            sim.dialogSelectedIndex = 0;
                        } else if (fmPick.id === 'fm_menu_output') {
                            sim.themeHistory.push('fmMenu');
                            sim.themeViewId = 'fmAudioOutput';
                            sim.themeSelectedIndex = sim.fmAudioOutput === 'headset' ? 1 : 0;
                        } else if (fmPick.id === 'fm_menu_range') {
                            sim.themeHistory.push('fmMenu');
                            sim.themeViewId = 'fmRange';
                            sim.themeSelectedIndex = 0;
                        }
                        paint();
                        return;
                    }
                    if (vid === 'fmChannels' || vid === 'fmFavorites') {
                        var fmPickList = genericListForView(vid, previewOpts.deviceMode, sim);
                        var tuned = fmPickList[sim.themeSelectedIndex];
                        if (tuned && tuned.fmFreq) {
                            sim.fmFreq = tuned.fmFreq;
                            sim.playState = 'fmPlaying';
                        }
                        sim.themeViewId = 'fm';
                        sim.themeSelectedIndex = 0;
                        paint();
                        return;
                    }
                    if (vid === 'fmAudioOutput') {
                        sim.fmAudioOutput = sim.themeSelectedIndex === 1 ? 'headset' : 'speaker';
                        sim.themeViewId = 'fm';
                        sim.themeSelectedIndex = 0;
                        paint();
                        return;
                    }
                    if (vid === 'fmRange') {
                        var rangeItems = genericListForView('fmRange', previewOpts.deviceMode, sim);
                        var pickedRange = rangeItems[sim.themeSelectedIndex];
                        if (pickedRange) sim.fmRegion = pickedRange.label;
                        sim.themeViewId = 'fm';
                        sim.themeSelectedIndex = 0;
                        paint();
                        return;
                    }
                    if (vid === 'videos') {
                        var videoList = genericListForView(
                            'videos',
                            previewOpts.deviceMode,
                            sim,
                            currentFirmware.menuProfile
                        );
                        var vs = (videoList[sim.themeSelectedIndex] || {}).label;
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
                    if (vid === 'settingsTheme') {
                        var themeEntries = themeSelectorEntries().entries;
                        if (sim.themeMultiSelect) {
                            var multiNow = sim.themeMultiSelected || [];
                            var at = multiNow.indexOf(sim.themeSelectedIndex);
                            if (at === -1) multiNow.push(sim.themeSelectedIndex);
                            else multiNow.splice(at, 1);
                            sim.themeMultiSelected = multiNow;
                            if (sim.themeSelectedIndex < themeEntries.length - 1) {
                                sim.themeSelectedIndex += 1;
                            }
                            paint();
                            return;
                        }
                        var chosenTheme = themeEntries[sim.themeSelectedIndex] || themeEntries[0];
                        if (sim.themeFullPreview) {
                            openThemeSetDialog(chosenTheme);
                            return;
                        }
                        sim.themeFullPreview = true;
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
                        } else if (sid === 'better_y') {
                            sim.themeHistory.push(vid);
                            sim.themeViewId = 'settingsBetterY';
                            sim.themeSelectedIndex = 0;
                        } else if (sid === 'betterY_player') {
                            sim.themeHistory.push(vid);
                            sim.themeViewId = 'settingsBetterYPlayer';
                            sim.themeSelectedIndex = 0;
                        } else if (sid === 'betterY_tilt') {
                            sim.betterYTilt = sim.betterYTilt !== true;
                            showToast('Tilt the cover: ' + (sim.betterYTilt ? 'On' : 'Off'));
                        } else if (sid === 'betterY_np_preview') {
                            sim.themeHistory.push(vid);
                            sim.themeViewId = 'nowPlaying';
                            sim.themeSelectedIndex = 0;
                        } else if (sid === 'betterY_log') {
                            showToast('Diagnostic log saved to /better-Y/logs/');
                        } else if (sid.indexOf('betterY_') === 0) {
                            showToast((selEntry.label || 'better-Y') + ' — better-Y');
                        } else if (sid === 'bluetooth') {
                            sim.themeHistory.push(vid);
                            sim.themeViewId = 'bluetooth';
                            sim.themeSelectedIndex = 0;
                        } else if (sid === 'theme') {
                            sim.themeHistory.push(vid);
                            sim.themeViewId = 'settingsTheme';
                            sim.themeSelectedIndex = 0;
                            sim.themeSelectorInitialized = false;
                            sim.themeFullPreview = false;
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
                            showToast('Switch to ' + (selEntry.label || 'Rockbox'));
                        } else if (sid === 'back_to_rockbox') {
                            /* SettingActivity finishes and launches org.rockbox. */
                            showToast('Back to Rockbox');
                        } else if (sid === 'shutdown') {
                            sim.dialogVisible = true;
                            sim.dialogTitle = 'Shutdown';
                            sim.dialogMessage = 'Sure to shut down?';
                            sim.dialogOptions = ['Yes', 'No'];
                            sim.dialogSelectedIndex = 1;
                        } else if (sid === 'reboot') {
                            sim.dialogVisible = true;
                            sim.dialogTitle = 'Reboot';
                            sim.dialogMessage = 'Sure to reboot?';
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
                        } else if (sid === 'song_name_display') {
                            sim.songNameDisplay = sim.songNameDisplay === 'filename' ? 'songTitle' : 'filename';
                        } else if (sid === 'list_sort') {
                            sim.listSort = sim.listSort === 'desc' ? 'asc' : 'desc';
                        } else if (sid === 'artist_view') {
                            sim.artistView = sim.artistView === 'grid' ? 'list' : 'grid';
                        } else if (sid === 'album_view') {
                            sim.albumView = sim.albumView === 'grid' ? 'list' : 'grid';
                        } else if (sid === 'album_art_style') {
                            /* Music → Settings → Album Art Style (Y2 3.2.0-fm).
                               Perspective tilts the cover; Flat keeps it square. */
                            sim.albumArtStyle = sim.albumArtStyle === 'flat' ? 'perspective' : 'flat';
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
                    if (sim.inputDialogVisible) {
                        ev.preventDefault();
                        if (k === 'Escape') {
                            commitInputDialog();
                        } else if (k === 'Backspace') {
                            sim.inputValue = String(sim.inputValue || '').slice(0, -1);
                            paint();
                        } else if (k === 'Enter') {
                            var inputAlphabet =
                                String(global.STUDIO_PREVIEW_LOCALE || '').toLowerCase() === 'ru'
                                    ? 'АБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯ'.split('')
                                    : 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
                            var inputChar = inputAlphabet[sim.inputCharIndex | 0] || 'A';
                            sim.inputValue = String(sim.inputValue || '') + inputChar.toLowerCase();
                            paint();
                        } else if (k === 'ArrowUp' || k === 'ArrowDown') {
                            handleScroll(k === 'ArrowDown' ? 'down' : 'up');
                        } else if (/^[a-zA-Z]$/.test(k)) {
                            sim.inputValue = String(sim.inputValue || '') + k.toLowerCase();
                            paint();
                        }
                        return;
                    }
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
                    /* ThemeListActivity's grid has pointer selection and a
                       long-press menu; hovering must not repaint the grid for
                       every adjacent cover the way a settings list does. */
                    if (sim.themeViewId === 'settingsTheme') return false;
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
                            if (sim.themeViewId === 'settingsTheme') {
                                sim.themeSelectedIndex = index;
                                sim.themeOptionsTargetIndex = index;
                                sim.themeOptionsVisible = true;
                                sim.themeOptionsIndex = 0;
                                rowHold = null;
                                paint();
                                return;
                            }
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
                    if (sim.themeViewId === 'settingsTheme' && sim.themeMultiSelect) {
                        sim.themeSelectedIndex = index;
                        var multiAt = (sim.themeMultiSelected || []).indexOf(index);
                        if (multiAt === -1) sim.themeMultiSelected.push(index);
                        else sim.themeMultiSelected.splice(multiAt, 1);
                        paint();
                        return true;
                    }
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

                function onThemeContextMenu(ev) {
                    if (!interactive || sim.themeViewId !== 'settingsTheme' || sim.themeFullPreview) return;
                    var index = rowIndexFromEvent(ev);
                    if (!(index >= 0) || sim.dialogVisible) return;
                    ev.preventDefault();
                    sim.themeSelectedIndex = index;
                    sim.themeOptionsTargetIndex = index;
                    sim.themeOptionsVisible = true;
                    sim.themeOptionsIndex = 0;
                    paint();
                }

                if (interactive) {
                    dev.tabIndex = 0;
                    dev.addEventListener('keydown', onKeyDown);
                    dev.addEventListener('contextmenu', onThemeContextMenu);
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
                        if (nextOpts.firmware !== undefined) {
                            previewOpts.firmware = nextOpts.firmware;
                        }
                        currentFirmware = firmwareFor(previewOpts);
                        homeItems = buildHomeItems(cfg.homePageConfig || {}, settingCfg, previewOpts);
                        sim.themeSelectorInitialized = false;
                        sim.themeCurrentDeleted = false;
                        sim.themeFullPreview = false;
                        var fwNow = currentFirmware;
                        var mappedView = equivalentThemeView(sim.themeViewId, fwNow);
                        if (mappedView !== sim.themeViewId) {
                            sim.themeViewId = mappedView;
                            sim.themeSelectedIndex = 0;
                        }
                        /* Back should stay meaningful after a target change too. */
                        if (Array.isArray(sim.themeHistory)) {
                            sim.themeHistory = sim.themeHistory.map(function (id) {
                                return equivalentThemeView(id, fwNow);
                            });
                        }
                        if (sim.themeViewId === 'home') {
                            sim.themeSelectedIndex = Math.max(0, Math.min(sim.themeSelectedIndex, Math.max(0, homeItems.length - 1)));
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
                            albumArtStyle: sim.albumArtStyle,
                            betterYTilt: sim.betterYTilt === true,
                            songNameDisplay: sim.songNameDisplay,
                            listSort: sim.listSort,
                            artistView: sim.artistView,
                            albumView: sim.albumView,
                            fileManagerStorage: sim.fileManagerStorage,
                            fileManagerSortField: sim.fileManagerSortField,
                            fileManagerSortOrder: sim.fileManagerSortOrder,
                            fileManagerShowHidden: sim.fileManagerShowHidden,
                            fileManagerShowExtensions: sim.fileManagerShowExtensions,
                            fmAudioOutput: sim.fmAudioOutput,
                            fmRegion: sim.fmRegion,
                            fmFavoriteFreqs: (sim.fmFavoriteFreqs || []).slice(),
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
                        if (snap.albumArtStyle !== undefined) sim.albumArtStyle = snap.albumArtStyle;
                        if (snap.betterYTilt !== undefined) sim.betterYTilt = snap.betterYTilt === true;
                        if (snap.songNameDisplay !== undefined) sim.songNameDisplay = snap.songNameDisplay;
                        if (snap.listSort !== undefined) sim.listSort = snap.listSort;
                        if (snap.artistView !== undefined) sim.artistView = snap.artistView;
                        if (snap.albumView !== undefined) sim.albumView = snap.albumView;
                        if (snap.fileManagerStorage !== undefined) sim.fileManagerStorage = snap.fileManagerStorage;
                        if (snap.fileManagerSortField !== undefined) sim.fileManagerSortField = snap.fileManagerSortField;
                        if (snap.fileManagerSortOrder !== undefined) sim.fileManagerSortOrder = snap.fileManagerSortOrder;
                        if (snap.fileManagerShowHidden !== undefined) sim.fileManagerShowHidden = snap.fileManagerShowHidden;
                        if (snap.fileManagerShowExtensions !== undefined)
                            sim.fileManagerShowExtensions = snap.fileManagerShowExtensions;
                        if (snap.fmAudioOutput !== undefined) sim.fmAudioOutput = snap.fmAudioOutput;
                        if (snap.fmRegion !== undefined) sim.fmRegion = snap.fmRegion;
                        if (Array.isArray(snap.fmFavoriteFreqs)) sim.fmFavoriteFreqs = snap.fmFavoriteFreqs.slice();
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
                                    showUnimplementedHome: true,
                                    firmware: previewOpts.firmware
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
                        sim.themeSelectorInitialized = false;
                        sim.themeFullPreview = false;
                        sim.themeOptionsVisible = false;
                        sim.themeMultiSelect = false;
                        sim.themeMultiSelected = [];
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
                    /* Coverage of the Home/Settings overlay mask at a point in
                       the page. The Studio only offers the mask when it is
                       actually painted under the clicked pixel, so an icon
                       floating over transparent mask stays a one-asset edit. */
                    maskAlphaAt: function (clientX, clientY) {
                        if (typeof clientX !== 'number' || typeof clientY !== 'number') return null;
                        if (typeof maskAtPoint === 'function') {
                            var maskHit = maskAtPoint(clientX, clientY);
                            return maskHit ? maskHit.alpha : null;
                        }
                        return null;
                    },
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
        var colors = buildColors(itemCfg, menuCfg, statusCfg, cfg, catalogFolder, opts.deviceMode || 'y2');
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
        var heroUrl =
            firstItem && firstItem.iconUrl
                ? firstItem.iconUrl
                : firstItem && firstItem.iconFile
                  ? buildFileUrl(contentFolder, firstItem.iconFile)
                  : '';

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
