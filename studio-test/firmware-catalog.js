/* Innioasis firmware catalogue
 * ---------------------------------------------------------------------------
 * Every stock launcher released for the Y1 and Y2, what its menu tree looks
 * like, and which firmware first draws each theme asset.
 *
 * Source: the release-by-release launcher evidence recorded in
 *   docs/firmware-changelogs.md      (activities, classes, string resources)
 *   docs/firmware-asset-support.md   (first firmware that draws each key)
 * Those files are derived from the 11 stock ROMs archived in
 * y1-community/y1-stock-rom. Where the latest two releases were re-checked for
 * this catalogue, the APK strings/layouts were read directly:
 *   Y2 3.2.8-fm  com.innioasis.y2 3.2.9 (329) sha256 9aae687ff2d71913...
 *   Y1 3.1.2     com.innioasis.y1 3.1.2 (312) sha256 09a6f804b05a37f1...
 * A blank/absent value means the release's evidence does not establish it.
 *
 * Consumed by studio-test/studio.js (firmware picker + asset badges) and
 * y1-theme-preview.js (menu tree the simulator draws).
 */
(function (root) {
    'use strict';

    /* Flat Settings rows: the order MainActivity/SettingActivity builds them.
       Stock 3.1.2 reserves array slot 16 for the Launcher row but leaves it
       blank on the general flavour, so the shipped screen has 19 visible rows
       and no Rockbox/Launcher row. Rockbox 0.4/0.5 inherit those same rows;
       Better-Y and Rockbox 0.6 use their own arrays below. */
    var Y1_FLAT = [
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

    /* 2.1.9 added File extensions and Theme but still had no Launcher row. */
    var Y1_FLAT_219 = [
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

    var Y1_FLAT_176 = [
        'shutdown',
        'timed_shutdown',
        'shuffle',
        'repeat',
        'equalizer',
        'sort_order',
        'sort_logic',
        'key_lock',
        'key_tone',
        'key_vibration',
        'wallpaper',
        'backlight',
        'brightness',
        'display_battery',
        'date_time',
        'language',
        'factory_reset',
        'about'
    ];

    var Y2_CATEGORIES = [
        { id: 'settingsCat_keysWheel', label: 'Keys & Wheel', icon: 'categoryKeysWheel' },
        { id: 'settingsCat_audio', label: 'Audio', icon: 'categoryAudio' },
        { id: 'settingsCat_display', label: 'Display', icon: 'categoryDisplay' },
        { id: 'settingsCat_personalization', label: 'Personalization', icon: 'categoryPersonalization' },
        { id: 'settingsCat_filesStorage', label: 'Files & Storage', icon: 'categoryFilesStorage' },
        { id: 'settingsCat_system', label: 'System', icon: 'categorySystem' }
    ];

    var CATEGORY_ROWS = {
        settingsCat_keysWheel: ['key_lock', 'wheel_sensitivity', 'wheel_volume', 'key_tone', 'key_vibration'],
        settingsCat_audio: ['headphone_gain', 'speaker'],
        settingsCat_display: ['brightness', 'backlight', 'display_battery'],
        settingsCat_personalization: ['theme', 'wallpaper'],
        settingsCat_filesStorage: ['file_extension', 'clear_cache'],
        settingsCat_system: ['language', 'date_time', 'timed_shutdown', 'rockbox']
    };

    /* Music → Settings. Y2 3.1.7 opened with four rows; 3.2.0-fm added the
       album-art style toggle (strings music_setting_album_art_style /
       _flat / _perspective in the 3.2.8 launcher). */
    var MUSIC_SETTINGS = {
        '3.1.7': ['song_name_display', 'list_sort', 'artist_view', 'album_view'],
        '3.2.0': ['song_name_display', 'list_sort', 'artist_view', 'album_view', 'album_art_style']
    };

    /* Themes installed by the launcher on first boot -----------------------
     * ThemeManager copies each APK asset theme into /storage/sdcard0/Themes
     * under a human-readable folder name, then ThemeListActivity sorts those
     * folders by name and inserts the factory HoloPebble row at index 0.
     *
     * Y1 3.1.2 ThemeManager.checkThemeDirExist copies theme1-4 as HoloBubble,
     * Unseen, Melody Munchkin and HoloFacet. Y2 3.2.8's K0.f does the same and
     * adds theme5 as Classic. Y1 builds before 3.0.7 have only theme1-3; the
     * fourth (HoloFacet) arrived in 3.0.7. Y2's theme engine starts at 3.1.7
     * with all five. Names below are the folder names the launcher creates,
     * which are the names ThemeListActivity renders (it does not read a
     * title from config.json). `cover` is the asset theme number.
     */
    var BUNDLED_THEME_SETS = {
        y1: {
            beforeHoloFacet: [
                { name: 'HoloBubble', cover: 'theme1' },
                { name: 'Unseen', cover: 'theme2' },
                { name: 'Melody Munchkin', cover: 'theme3' }
            ],
            withHoloFacet: [
                { name: 'HoloBubble', cover: 'theme1' },
                { name: 'Unseen', cover: 'theme2' },
                { name: 'Melody Munchkin', cover: 'theme3' },
                { name: 'HoloFacet', cover: 'theme4' }
            ]
        },
        y2: [
            { name: 'HoloBubble', cover: 'theme1' },
            { name: 'Unseen', cover: 'theme2' },
            { name: 'Melody Munchkin', cover: 'theme3' },
            { name: 'HoloFacet', cover: 'theme4' },
            { name: 'Classic', cover: 'theme5' }
        ]
    };

    function themeVersionAtLeast(versionId, minimum) {
        var left = String(versionId || '').split('.').map(Number);
        var right = String(minimum || '').split('.').map(Number);
        for (var i = 0; i < Math.max(left.length, right.length); i += 1) {
            var a = left[i] || 0;
            var b = right[i] || 0;
            if (a !== b) return a > b;
        }
        return true;
    }

    function bundledThemes(modelId, versionId) {
        var model = String(modelId || '').toLowerCase();
        var set = [];
        if (model === 'y1') {
            if (!versionId || !themeVersionAtLeast(versionId, '2.1.9')) return [];
            set = (
                themeVersionAtLeast(versionId, '3.0.7')
                    ? BUNDLED_THEME_SETS.y1.withHoloFacet
                    : BUNDLED_THEME_SETS.y1.beforeHoloFacet
            ).slice();
        } else if (model === 'y2') {
            if (!versionId || !themeVersionAtLeast(versionId, '3.1.7')) return [];
            set = BUNDLED_THEME_SETS.y2.slice();
        }
        return set
            .map(function (theme) {
                return { name: theme.name, cover: theme.cover };
            })
            .sort(function (a, b) {
                return a.name < b.name ? -1 : a.name > b.name ? 1 : 0;
            });
    }

    /* File Manager settings screen (Y2). Rows read from the 3.2.8 launcher
       layout for FileManagerSettingsActivity: Sorting Method (method + order),
       Display Options (hidden files + extensions), Storage Management
       (format internal, format TF card, restore defaults). */
    var FILE_MANAGER_SETTINGS = [
        { group: 'Sorting Method', rows: ['fm_sort_method', 'fm_sort_order'] },
        { group: 'Display Options', rows: ['fm_hidden_files', 'fm_file_extensions'] },
        {
            group: 'Storage Management',
            rows: ['fm_format_internal', 'fm_format_tf', 'fm_restore_defaults']
        }
    ];

    /* Launcher mods ---------------------------------------------------------
     * These are not stock releases, but the menu tree still belongs to a real
     * launcher. `base` names the stock release the mod is built on, and the
     * rows below are the ones its SettingsActivity actually builds.
     *
     * Better-Y v1.1.0 (the latest published release), based on 3.1.2:
     * inserts `better-Y` at index 0, adds Reboot under Shutdown, removes
     * Shuffle/Repeat and Display battery, and adds a Rockbox row only when
     * Rockbox is installed. Standalone Better-Y therefore has no Rockbox row.
     * Its Music menu is still stock 3.1.2: Cover Flow and Album Artists are
     * only in the unreleased v1.2.0 development tree.
     *
     * Koensayr only patches artist -> album drilling and AVRCP; its menus are
     * stock 3.0.2/3.0.7, so it reuses those rows unchanged.
     *
     * Rockbox 0.6 is Better-Y v1.1.0-dev1: it keeps the battery row (renamed
     * Battery percentage), removes Shuffle/Repeat, and appends the literal
     * "Back to Rockbox" row. 0.5/0.4 ship ordinary stock-launcher menus, so
     * they have neither the Better-Y row nor a Rockbox/Launcher row.
     */
    var BETTER_Y_SETTINGS = [
        'better_y',
        'shutdown',
        'reboot',
        'timed_shutdown',
        'equalizer',
        'file_extension',
        'key_lock',
        'key_tone',
        'key_vibration',
        'wallpaper',
        'backlight',
        'brightness',
        'date_time',
        'theme',
        'language',
        'factory_reset',
        'clear_cache',
        'about'
    ];

    /* Rockbox 0.6: the Better-Y launcher with the Rockbox row installed. The
       binary blanks Shuffle and Repeat, keeps Display battery (renamed Battery
       percentage), omits the blank Launcher slot, and appends Back to Rockbox.
       Better-Y's own TopBar module (which removes the battery row) is not in
       this build. */
    var ROCKBOX_06_SETTINGS = [
        'better_y',
        'shutdown',
        'timed_shutdown',
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
        'about',
        'back_to_rockbox'
    ];

    /* Solar is a custom launcher on the Y1 3.1.2 base. Its Home is not the
       stock MainActivity list: schema 9 seeds eight shortcuts, and Settings
       opens Solar's own root instead of the stock flat list. */
    var SOLAR_HOME = [
        'nowPlaying',
        'music',
        'ebook',
        'radio',
        'settings',
        'wifiTransfer',
        'podcasts',
        'getMusic'
    ];
    var SOLAR_SETTINGS = [
        'solar_playback',
        'solar_flow',
        'solar_device',
        'solar_connections',
        'solar_library',
        'solar_appearance',
        'solar_media',
        'solar_reach',
        'solar_power',
        'solar_reset',
        'solar_update',
        'solar_report_issue',
        'solar_donations',
        'solar_about'
    ];

    var LAUNCHERS = [
        {
            id: 'solar',
            label: 'Solar — Y1 3.1.2 base (2026-11-26 build)',
            device: 'y1',
            base: '3.1.2',
            date: '2026-11-26',
            menuProfile: 'solar',
            settingsStyle: 'solar',
            playerProfile: 'solar',
            solar: true,
            home: SOLAR_HOME,
            settingsRows: SOLAR_SETTINGS,
            notes: 'Solar is a custom launcher, not a stock menu reskin. Home schema 9 seeds Now Playing, Music, E-Book, Radio, Settings, Wi-Fi Transfer, Podcasts and Get Music; Settings is Solar\u2019s own Playback/Device/Appearance/... root. Theme packages stay cross-compatible.'
        },
        {
            id: 'better-y',
            label: 'Better-Y — Y1 3.1.2 menu',
            device: 'y1',
            base: '3.1.2',
            menuProfile: 'better-y',
            playerProfile: 'better-y',
            settingsRows: BETTER_Y_SETTINGS,
            notes: 'Better-Y v1.1.0: better-Y row at the top of Settings, Reboot under Shutdown, Shuffle/Repeat and Display battery removed, five better-Y groups; stock 3.1.2 Music menu.'
        },
        {
            id: 'koensayr-3.0.7',
            label: 'Koensayr — Y1 3.0.7 menus',
            device: 'y1',
            base: '3.0.7',
            menuProfile: 'stock',
            playerProfile: 'stock',
            settingsRows: Y1_FLAT,
            notes: 'Stock 3.0.7 launcher; Koensayr changes Artist -> Album navigation, not the menu tree.'
        },
        {
            id: 'koensayr-3.0.2',
            label: 'Koensayr — Y1 3.0.2 menus',
            device: 'y1',
            base: '3.0.2',
            menuProfile: 'stock',
            playerProfile: 'stock',
            settingsRows: Y1_FLAT,
            notes: 'Stock 3.0.2 launcher; Koensayr changes Artist -> Album navigation, not the menu tree.'
        },
        {
            id: 'rockbox-0.6',
            label: 'Rockbox 0.6 — Better-Y v1.1.0-dev1',
            device: 'y1',
            base: '3.1.2',
            menuProfile: 'better-y',
            /* Rockbox 0.6 is a launcher row on the Better-Y build; the
               Now Playing activity is still Better-Y's. */
            playerProfile: 'better-y',
            settingsRows: ROCKBOX_06_SETTINGS,
            notes: 'Better-Y v1.1.0-dev1 (versionName 3.1.2): better-Y row, Back to Rockbox at the end, Shuffle/Repeat removed, battery row retained as Battery percentage. No Reboot row in this build.'
        },
        {
            id: 'rockbox-0.5',
            label: 'Rockbox 0.5 — Y1 3.0.7 build',
            device: 'y1',
            base: '3.0.7',
            menuProfile: 'stock',
            playerProfile: 'stock',
            settingsRows: Y1_FLAT,
            notes: 'Stock 3.0.7 launcher strings and Settings rows; versionName 3.0.7, versionCode 307. No Better-Y row and no Rockbox-labelled Launcher row.'
        },
        {
            id: 'rockbox-0.4',
            label: 'Rockbox 0.4 — Y1 3.1.2 UI (FR 2.7.2)',
            device: 'y1',
            base: '3.1.2',
            menuProfile: 'stock',
            playerProfile: 'stock',
            settingsRows: Y1_FLAT,
            notes: 'French build labelled FR_2.7.2 (versionCode 272) but built on the 3.1.2 UI and player layout. No Better-Y row and no Rockbox-labelled Launcher row.'
        }
    ];

    var CATALOG = {
        generated: '2026-11-28',
        sourceDocs: ['docs/firmware-changelogs.md', 'docs/firmware-asset-support.md'],
        models: [
            {
                id: 'y1',
                name: 'Innioasis Y1',
                platform: 'Android 4.2.2 (SDK 17)',
                packageName: 'com.innioasis.y1',
                latest: '3.1.2',
                themeEngineFrom: '2.1.9',
                versions: [
                    {
                        id: '1.7.6',
                        label: 'Y1 1.7.6 (Type B)',
                        versionName: '1.7.6',
                        versionCode: 77,
                        date: '2023-04-07',
                        sha256: '9499b9f2fd496b56',
                        themes: false,
                        home: ['nowPlaying', 'music', 'audiobooks', 'photos', 'fm', 'bluetooth', 'settings', 'shuffleQuick'],
                        settingsStyle: 'flat',
                        settingsRows: Y1_FLAT_176,
                        notes: 'Type B scroll-wheel hardware. No theme engine.',
                        fileManager: false,
                        fm: true,
                        musicSettings: null
                    },
                    {
                        id: '2.1.9',
                        label: 'Y1 2.1.9',
                        versionName: '2.1.9',
                        versionCode: 219,
                        date: '2025-07-18',
                        sha256: 'd617feeda015e9fc',
                        themes: true,
                        home: [
                            'nowPlaying',
                            'music',
                            'video',
                            'audiobooks',
                            'photos',
                            'fm',
                            'bluetooth',
                            'settings',
                            'shuffleQuick'
                        ],
                        settingsStyle: 'flat',
                        settingsRows: Y1_FLAT_219,
                        notes: 'Theme engine, Videos, 3 bundled themes, M3U-free music library.',
                        fileManager: false,
                        fm: true,
                        musicSettings: null
                    },
                    {
                        id: '2.8.2',
                        label: 'Y1 2.8.2',
                        versionName: 'EN_2.8.2',
                        versionCode: 282,
                        date: '2025-07-31',
                        sha256: 'db9f097449d6f41b',
                        themes: true,
                        home: [
                            'nowPlaying',
                            'music',
                            'video',
                            'audiobooks',
                            'ebook',
                            'photos',
                            'fm',
                            'bluetooth',
                            'settings'
                        ],
                        settingsStyle: 'flat',
                        settingsRows: Y1_FLAT,
                        hiddenHome: ['calculator', 'calendar'],
                        notes: 'E-Book engine, Rockbox row, Shuffle Quick dropped from Home.',
                        fileManager: false,
                        fm: true,
                        musicSettings: null
                    },
                    {
                        id: '3.0.2',
                        label: 'Y1 3.0.2',
                        versionName: '3.0.2',
                        versionCode: 302,
                        date: '2025-12-12',
                        sha256: '58fba95ef121d82b',
                        themes: true,
                        home: [
                            'nowPlaying',
                            'music',
                            'video',
                            'audiobooks',
                            'ebook',
                            'photos',
                            'fm',
                            'bluetooth',
                            'settings'
                        ],
                        settingsStyle: 'flat',
                        settingsRows: Y1_FLAT,
                        hiddenHome: ['calculator', 'calendar'],
                        notes: 'First-boot language selection.',
                        fileManager: false,
                        fm: true,
                        musicSettings: null
                    },
                    {
                        id: '3.0.7',
                        label: 'Y1 3.0.7',
                        versionName: '3.0.7',
                        versionCode: 307,
                        date: '2026-03-13',
                        sha256: 'ddaf183a21794c97',
                        themes: true,
                        home: [
                            'nowPlaying',
                            'music',
                            'video',
                            'audiobooks',
                            'ebook',
                            'photos',
                            'fm',
                            'bluetooth',
                            'settings'
                        ],
                        settingsStyle: 'flat',
                        settingsRows: Y1_FLAT,
                        hiddenHome: ['calculator', 'calendar'],
                        notes: 'Fourth bundled theme (HoloFacet); E-Book advertised.',
                        fileManager: false,
                        fm: true,
                        musicSettings: null
                    },
                    {
                        id: '3.1.2',
                        label: 'Y1 3.1.2 (latest Y1)',
                        versionName: '3.1.2',
                        versionCode: 312,
                        date: '2026-07-16',
                        sha256: '09a6f804b05a37f17f5d1f299aa36abfe39e62761bd7d4b631b36efa6078deeb',
                        themes: true,
                        home: [
                            'nowPlaying',
                            'music',
                            'video',
                            'audiobooks',
                            'ebook',
                            'photos',
                            'fm',
                            'bluetooth',
                            'settings'
                        ],
                        settingsStyle: 'flat',
                        settingsRows: Y1_FLAT,
                        hiddenHome: ['calculator', 'calendar'],
                        notes: 'Bluetooth Classic/AirPods fixes. Final Y1 theme schema (50 setting keys).',
                        fileManager: false,
                        fm: true,
                        musicSettings: null
                    }
                ]
            },
            {
                id: 'y2',
                name: 'Innioasis Y2',
                platform: 'Android 4.4.4 (SDK 19)',
                packageName: 'com.innioasis.y2',
                latest: '3.2.8',
                themeEngineFrom: '3.1.7',
                versions: [
                    {
                        id: '3.1.7',
                        label: 'Y2 3.1.7 (launch)',
                        versionName: '3.1.7',
                        aboutVersion: '3.1.7',
                        versionCode: 317,
                        date: '2026-06-01',
                        sha256: 'ad39091e24cb0542',
                        themes: true,
                        home: [
                            'nowPlaying',
                            'music',
                            'video',
                            'audiobooks',
                            'ebook',
                            'photos',
                            'bluetooth',
                            'fileManager',
                            'settings'
                        ],
                        settingsStyle: 'flat',
                        settingsRows: [
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
                        ],
                        notes: 'Light HoloPebble default, File Manager app, 9-patch, fontScale, M3U.',
                        fileManager: true,
                        fm: false,
                        musicSettings: '3.1.7'
                    },
                    {
                        id: '3.2.0',
                        label: 'Y2 3.2.0-fm',
                        versionName: '3.2.0',
                        aboutVersion: 'FM_3.2.0',
                        versionCode: 320,
                        date: '2026-08-13',
                        sha256: '088b0d728d2eb422',
                        themes: true,
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
                        ],
                        settingsStyle: 'categories',
                        settingsRows: Y1_FLAT,
                        notes: 'FM Radio on Y2, 6 categorized Settings, speaker/gain/wheel rows, Album Art Style, showNativeIcon.',
                        fileManager: true,
                        fm: true,
                        musicSettings: '3.2.0'
                    },
                    {
                        id: '3.2.1',
                        label: 'Y2 3.2.1',
                        versionName: '3.2.1',
                        aboutVersion: 'FM_3.2.1',
                        versionCode: 321,
                        date: '2026-08-14',
                        sha256: '1b3d81b98f629436',
                        themes: true,
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
                        ],
                        settingsStyle: 'categories',
                        settingsRows: Y1_FLAT,
                        notes: 'Stability release; identical schema to 3.2.0-fm.',
                        fileManager: true,
                        fm: true,
                        musicSettings: '3.2.0'
                    },
                    {
                        id: '3.2.4',
                        label: 'Y2 3.2.4-fm (retail)',
                        versionName: '3.2.3',
                        aboutVersion: 'FM_3.2.4',
                        versionCode: 323,
                        date: '2026-08-19',
                        sha256: 'ff19eaa288d3a13a',
                        themes: true,
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
                        ],
                        settingsStyle: 'categories',
                        settingsRows: Y1_FLAT,
                        aboutVersionLabel: 'Version:',
                        notes: 'Retail shipping ROM; About screen shortened to "Version:".',
                        fileManager: true,
                        fm: true,
                        musicSettings: '3.2.0'
                    },
                    {
                        id: '3.2.8',
                        label: 'Y2 3.2.8-fm (latest Y2)',
                        versionName: '3.2.9',
                        aboutVersion: 'FM_3.2.8',
                        versionCode: 329,
                        date: '2026-11-27',
                        sha256: '9aae687ff2d71913dd1bb649f644a47365f7fb45fa63452b1db922a60b0dca49',
                        themes: true,
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
                        ],
                        settingsStyle: 'categories',
                        settingsRows: Y1_FLAT,
                        aboutVersionLabel: 'Version:',
                        notes: 'app_name "Y2"; Unseen ships a blank fileManager slot; identical 67-key schema to 3.2.0-fm. Current package: boot chain rebuilt 2026-10-23; the Android system and launcher are unchanged from 3.2.8, so every menu matches.',
                        fileManager: true,
                        fm: true,
                        musicSettings: '3.2.0'
                    }
                ]
            }
        ],

        /* What each release draws -------------------------------------------------
         * First firmware that reads a config key, per model. Studio badges an
         * asset with this so an author can see when a key is ignored.
         */
        assetMinimums: {
            y1: {
                'homePageConfig.nowPlaying': '2.1.9',
                'homePageConfig.music': '2.1.9',
                'homePageConfig.video': '2.1.9',
                'homePageConfig.audiobooks': '2.1.9',
                'homePageConfig.photos': '2.1.9',
                'homePageConfig.fm': '2.1.9',
                'homePageConfig.bluetooth': '2.1.9',
                'homePageConfig.settings': '2.1.9',
                'homePageConfig.shuffleQuick': '2.1.9',
                'homePageConfig.ebook': '2.8.2',
                'homePageConfig.fileManager': null,
                'settingConfig.launcher': '2.8.2',
                'settingConfig.categoryKeysWheel': null,
                'settingConfig.speakerOn': null,
                'settingConfig.headphoneGainStandard': null,
                'settingConfig.wheelSensitivityStandard': null,
                'settingConfig.wheelVolumeOn': null,
                'settingConfig.fileExtensionOn': '2.1.9',
                'settingConfig.clearCache': '2.1.9',
                'itemConfig.itemSelectedBackgroundIs9Patch': null,
                'fontScale': null,
                'showNativeIcon': null
            },
            y2: {
                'homePageConfig.nowPlaying': '3.1.7',
                'homePageConfig.music': '3.1.7',
                'homePageConfig.video': '3.1.7',
                'homePageConfig.audiobooks': '3.1.7',
                'homePageConfig.photos': '3.1.7',
                'homePageConfig.fm': '3.2.0',
                'homePageConfig.bluetooth': '3.1.7',
                'homePageConfig.fileManager': '3.1.7',
                'homePageConfig.ebook': '3.1.7',
                'homePageConfig.shuffleQuick': null,
                'settingConfig.categoryKeysWheel': '3.2.0',
                'settingConfig.categoryAudio': '3.2.0',
                'settingConfig.categoryDisplay': '3.2.0',
                'settingConfig.categoryPersonalization': '3.2.0',
                'settingConfig.categoryFilesStorage': '3.2.0',
                'settingConfig.categorySystem': '3.2.0',
                'settingConfig.speakerOn': '3.2.0',
                'settingConfig.speakerOff': '3.2.0',
                'settingConfig.headphoneGainLow': '3.2.0',
                'settingConfig.headphoneGainStandard': '3.2.0',
                'settingConfig.headphoneGainHigh': '3.2.0',
                'settingConfig.headphoneGainMaximum': '3.2.0',
                'settingConfig.wheelSensitivityLow': '3.2.0',
                'settingConfig.wheelSensitivityStandard': '3.2.0',
                'settingConfig.wheelSensitivityHigh': '3.2.0',
                'settingConfig.wheelVolumeOn': '3.2.0',
                'settingConfig.wheelVolumeOff': '3.2.0',
                'itemConfig.itemSelectedBackgroundIs9Patch': '3.1.7',
                'fontScale': '3.1.7',
                'showNativeIcon': '3.2.0',
                'settingConfig.launcher': '3.1.7'
            }
        },

        launchers: LAUNCHERS,
        musicSettingsRows: MUSIC_SETTINGS,
        fileManagerSettings: FILE_MANAGER_SETTINGS,
        settingsCategories: Y2_CATEGORIES,
        categoryRows: CATEGORY_ROWS,
        solarHome: SOLAR_HOME,
        solarSettings: SOLAR_SETTINGS
    };

    function model(id) {
        var wanted = String(id || '').toLowerCase();
        for (var i = 0; i < CATALOG.models.length; i++) {
            if (CATALOG.models[i].id === wanted) return CATALOG.models[i];
        }
        return null;
    }

    function launcher(id) {
        var wanted = String(id || '');
        for (var i = 0; i < LAUNCHERS.length; i++) {
            if (LAUNCHERS[i].id === wanted) return LAUNCHERS[i];
        }
        return null;
    }

    function launcherVersion(mod, m) {
        var base = null;
        for (var i = 0; i < m.versions.length; i++) {
            if (m.versions[i].id === mod.base) base = m.versions[i];
        }
        base = base || m.versions[m.versions.length - 1];
        return {
            id: mod.id,
            label: mod.label,
            versionName: base.versionName,
            aboutVersion: base.aboutVersion || base.versionName,
            versionCode: base.versionCode,
            date: mod.date || base.date,
            sha256: '',
            themes: base.themes,
            home: (mod.home || base.home || []).slice(),
            hiddenHome: (mod.hiddenHome || base.hiddenHome || []).slice(),
            settingsStyle: mod.settingsStyle || base.settingsStyle || 'flat',
            settingsRows: (mod.settingsRows || base.settingsRows || []).slice(),
            notes: mod.notes,
            bundledThemes: bundledThemes(m.id, base.id),
            fileManager: base.fileManager === true,
            fm: base.fm !== false,
            musicSettings: null,
            menuProfile: mod.menuProfile || 'stock',
            playerProfile:
                mod.playerProfile ||
                (mod.solar === true
                    ? 'solar'
                    : mod.menuProfile === 'better-y'
                      ? 'better-y'
                      : 'stock'),
            solar: mod.solar === true,
            launcher: true,
            baseFirmware: base.id
        };
    }

    function version(modelId, versionId) {
        var m = model(modelId);
        if (!m) return null;
        var wanted = String(versionId || '');
        for (var i = 0; i < m.versions.length; i++) {
            if (m.versions[i].id === wanted) return m.versions[i];
        }
        if (m.id === 'y1') {
            var mod = launcher(wanted);
            if (mod && mod.device === m.id) return launcherVersion(mod, m);
        }
        for (var j = 0; j < m.versions.length; j++) {
            if (m.versions[j].id === m.latest) return m.versions[j];
        }
        return m.versions[m.versions.length - 1];
    }

    /* Music → Settings rows for a release: null means the screen does not exist. */
    function musicSettingsRows(versionId) {
        if (!versionId) return null;
        if (MUSIC_SETTINGS[versionId]) return MUSIC_SETTINGS[versionId].slice();
        return null;
    }

    /* Minimum firmware for an asset path, or null when no stock release draws it. */
    function assetMinimum(modelId, assetPath) {
        var table = CATALOG.assetMinimums[String(modelId || '').toLowerCase()];
        if (!table) return undefined;
        if (Object.prototype.hasOwnProperty.call(table, assetPath)) return table[assetPath];
        return undefined;
    }

    function firmwareLevelIndex(modelId, versionId) {
        var m = model(modelId);
        if (!m) return -1;
        for (var i = 0; i < m.versions.length; i++) {
            if (m.versions[i].id === versionId) return i;
        }
        return -1;
    }

    CATALOG.model = model;
    CATALOG.launcher = launcher;
    CATALOG.version = version;
    CATALOG.musicSettingsRows = musicSettingsRows;
    CATALOG.bundledThemes = bundledThemes;
    CATALOG.assetMinimum = assetMinimum;
    CATALOG.firmwareLevelIndex = firmwareLevelIndex;

    root.Y1FirmwareCatalog = CATALOG;
})(typeof window !== 'undefined' ? window : globalThis);
