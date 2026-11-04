# Innioasis Updater CE — Development Guidelines & Invariants

## 1. Branding & Naming Standards
- **User-Facing Title**: The application name must ALWAYS be **"Innioasis Updater CE"** across all user-facing surfaces:
  - Window title: `Innioasis Updater CE v{APP_VERSION}`
  - Application launcher: `updater-ce` (with legacy symlinks `innioasis-updater` and `updater-ce-neo`)
  - Desktop entry: `Name=Innioasis Updater CE`
  - Installer: `Innioasis Updater CE Installer`
  - All dialogs and translated strings (`src/i18n.py`)
- **Internal / Repo Identifiers**: While the remote GitHub repository is named `updater-ce-neo`, user-facing code, UI elements, and documentation must strictly omit the word "Neo".

## 2. Business Logic & Interfacing Invariant
- The business logic must faithfully mirror `InniUpdaterChin` (the Chinese vendor reference build):
  - **Scatter-Driven**: Flashing must be driven dynamically by the package's scatter file (`MT6572_Android_scatter.txt` / `MT6582_Android_scatter.txt`) rather than hard-coding device SoCs.
  - **State Machine**: Adhere strictly to the `S1_READY` -> `S2_PACKAGE_READY` -> `S3_DEVICE_DETECTED` -> `S4_FLASHING` -> `S5_USB_DISCONNECTED` -> `S6_RETRY` lifecycle.
  - **Dual Backend**:
    - Windows: SP Flash Tool console mode (`download` — Download Only) with MTKClient fallback.
    - Linux: SP Flash Tool console mode (when staged) with MTKClient fallback.
    - macOS: In-process MTKClient backend.

## 3. Network & Download Reliability
- Large firmware packages (>300 MB) must use the resilient download engine in `src/downloads.py`:
  - Stream into `.part` temporary files, atomically renaming on verified completion.
  - Support resumable downloads via HTTP `Range: bytes={downloaded}-` headers.
  - Implement read timeouts (25s) and automatic reconnection with backoff (up to 5 retries).
  - Use 128 KB buffer chunks and throttle progress emissions to integer percentage changes (100 signals max) to prevent Qt event loop starvation.

## 4. Linux Environment Staging
- Maintain universal Linux compatibility across Arch, Debian/Ubuntu, Fedora, openSUSE, and derived distros:
  - Automatic staging of `flash_tool_linux.zip` to `~/.cache/innioasis-updater/linux_flash_tool/`.
  - Bundled `libpng12.so.0` in `assets/compat/` copied to the runtime library directory.
  - MediaTek udev rules (`99-innioasis-mediatek.rules` and `99-ttyacms.rules`) configuring `0e8d:0003` and `0e8d:2000` with `TAG+="uaccess"`, `MODE="0666"`, `RUN+="/bin/chmod 0666 /dev/%k"`, and `ATTR{power/control}="on"`.
  - Distro-aware serial group assignment (`uucp` on Arch-based systems, `dialout` on Debian/Fedora/SUSE, plus `plugdev` and `lock`).
  - Active userspace permission guardian (`TtyAccessGuardian`) during flashing to bypass udev race conditions.
  - Neutralization of conflicting services (`brltty` and `ModemManager`).

## 5. macOS MTKClient & Universal MediaTek Invariants
To maintain reliable flashing across all models and SoCs (legacy MT6572/MT6582 and modern 64-bit MT67xx/MT68xx/MT81xx) on macOS via MTKClient:

### A. macOS LibUSB Transport (`usblib.py` & `Port.py`)
- **No Fast Mode on Darwin**: Apple's `IOUSBHostFamily` kernel driver throws `LIBUSB_ERROR_OVERFLOW` on transfer requests smaller than `wMaxPacketSize`. Fast mode must be forced `False` on macOS, and all reads must request at least `wMaxPacketSize` (or 4096 on overflow), using a queue buffer for excess bytes.
- **Handshake Packet Sizing**: `run_handshake()` must read echoes with `ep_in(maxinsize)`, NEVER `ep_in(1)` which triggers an immediate overflow crash on macOS.
- **Non-BROM Preloader PIDs**: Devices in preloader mode (PID `0x2000`) require a wake byte (`0xa0`) and response flush before handshake.
- **VID-Only Device Discovery**: Devices must be discovered by MediaTek VIDs (`0x0E8D`, etc.) without filtering on `bDeviceClass=devclass` (many MTK devices enumerate with class `0`).
- **Endpoint Stall Recovery**: Pipe errors must attempt endpoint recovery via `clear_halt(EP_IN)`.
- **Bounded Endpoint Reads**: Every bulk read (`usbread`, `usbxmlread`) must pass a real timeout (`self.timeout`, milliseconds) to `epr(...)`. libusb treats `timeout=0` as **unlimited**, which turns a silent download agent into an uninterruptible hang: mtkclient's `maxtimeout` retry logic can never fire, the worker thread keeps holding the USB device, and Cancel / Retry / backend-switch cannot recover. With a bounded read the same failure surfaces as a clean `CONNECTION_FAILED` and the device handle is released.

### B. Download Agent (DA) Payloads
- The bundled `vendor/mtkclient/mtkclient/payloads/` directory MUST retain all vendor DA binaries:
  - `da_x.bin` (64-bit XFlash DA for modern Helio/Dimensity SoCs)
  - `da_xml_64.bin` & `da_xml.bin` (XML DAs)
  - `DA_BR.bin`
- Modern SoCs using XFlash must use `_SEND_PARAM_CHUNK = 0x100000` (1 MB) to prevent 8x throughput degradation and timeouts caused by 512-byte per-syscall overhead.

### C. Partition & Preloader Flashing Engine
- **Preloader Target Routing**: Preloader writes must route to `boot1`, `boot2`, or composite `boot1_boot2`, never to the generic `user` partition.
- **BRLYT Boot Header Synthesis**: Raw preloader binaries without headers must be automatically wrapped with `EMMC_BOOT`/`UFS_BOOT` and `BRLYT` headers so the device ROM bootloader can execute them.
- **Address Bias Calibration**: For legacy MBR/EBR scatters, calibrate linear scatter addresses against physical device MBR partition offsets before flashing to prevent writing at incorrect offsets.
- **GPT Validation & Sync**: For modern devices, validate GPT table geometry against scatter partitions prior to writing image files.
- **Process & Handle Isolation**: On macOS/Linux, ensure in-process MTKClient execution handles all `BaseException` instances and detaches USB handles cleanly on cancellation to protect the Qt GUI event loop.

### D. Preloader Connection & Process Isolation Architecture
- **Direct Preloader Flashing (No Forced BROM)**: Legacy devices (MT6572 / MT6582 such as Timmkoo A5 and Innioasis Y1) MUST flash directly in Preloader mode (`0x2000`). Never attempt to force a watchdog reset or arm USB-DL to reboot into BROM (`0x0003`); legacy bootloaders fail to re-enumerate in BROM, causing port timeouts and hangs.
- **Subprocess CLI Flashing (`--flash-cli`)**: All in-depth MTKClient flash operations must execute in a decoupled subprocess (`--flash-cli`) with IPC line streaming (`[PROGRESS]`, `[STEP]`, `[LOG]`, `[RESULT]`). This insulates the Qt GUI event loop from `sys.exit(1)` and libusb C-level thread locks.
- **Preloader-Last Sequencing**: On legacy packages, re-order the write queue so `PRELOADER` is flashed as the final partition, safeguarding against mid-flash cable disconnections.
- **Global QSS Font Discipline**: NEVER specify `* { font-family: ... }` in Qt Style Sheets (QSS). Wildcard font rules break native font cascading on macOS (CoreText) and Linux (fontconfig), resulting in `□□□□` (tofu) glyphs for international text. Use `QApplication.setFont()` instead.

### E. HTTPS Network Requests & SSL Certificate Discipline
- **Explicit SSL Context via Certifi**: Never make naked `urllib.request.urlopen()` calls without an SSL context. On macOS and frozen PyInstaller standalone bundles, Python's OpenSSL does not inherit macOS system root certificates, causing silent `[SSL: CERTIFICATE_VERIFY_FAILED]` crashes.
- **SSL Fallback Invariant**: Always initialize HTTPS requests with `ssl.create_default_context(cafile=certifi.where())`. If certificate verification fails due to missing bundles or corporate proxies, gracefully fall back to `ssl._create_unverified_context()`.
- **Large Payload Invariant (POST vs GET)**: When transmitting text exceeding 500 characters (e.g. changelogs, donor lists, release notes), use HTTP `POST` with `application/x-www-form-urlencoded` data rather than GET query parameters to prevent `HTTP 414 Request-URI Too Large`.
- **Standard Browser Headers**: Always provide standard browser `User-Agent` headers (`Mozilla/5.0 ...`) on public web API requests; APIs block automated Python User-Agents with HTTP 429 / 403.

## 6. SP Flash Tool Invariants & Universal Troubleshooting (Linux & Windows)
To ensure MediaTek SP Flash Tool executes reliably across all Linux distributions and Windows hosts:

### A. Linux Execution & Permission Invariants
- **Direct Binary Invocation**: Never execute `flash_tool.sh` (which overwrites `LD_LIBRARY_PATH` and causes glibc segmentation faults). Always execute the binary `flash_tool` directly with `linux_sp_flash.process_env(stage)` preserving system library paths.
- **Immediate Node Permissions**: `udev` alone suffers from a 50–100 ms race condition between kernel node creation and `uaccess` ACL assignment. Udev rules must include `RUN+="/bin/chmod 0666 /dev/%k"`, supplemented by `TtyAccessGuardian` during active flash runs.
- **Kernel Module Verification**: MediaTek Preloader requires the `cdc_acm` kernel driver to expose `/dev/ttyACM*`. If absent, load with `modprobe cdc_acm`.
- **Option.ini Normalization**: Normalize `LogPath` in `option.ini` to a valid absolute Linux path (`~/.cache/innioasis-updater/linux_flash_tool/SP_FT_Logs`) to avoid Windows path errors.
- **History.ini Prepopulation**: Always prepopulate `history.ini` in all discovered SP Flash Tool directories with `scatterHistory` pointing to the active scatter file and `lastDir` pointing to the active ROM image directory.

### B. Windows Invariants & Driver Conflicts
- **VCOM Driver Requirement**: SP Flash Tool strictly requires the serial **MediaTek PreLoader USB VCOM Port** driver. It will fail if Zadig/WinUSB/libusb-win32 or UsbDk was installed over the Preloader interface.
- **Space-Free Paths**: SP Flash Tool v5 crashes or fails on file paths containing spaces or non-ASCII characters; package downloads and extractions must be located in clean paths.
- **2–3 Second Enumeration Rule**: Turned-off MediaTek devices remain in Preloader handshake mode for only 2–3 seconds before exiting. Flashing software must be listening before connecting the device.

### C. Windows SP Flash Tool Console Invocation & 8.3 Short Paths
- **8.3 Short Path Conversion (`GetShortPathNameW`)**: SP Flash Tool's C++ parser fails on path strings with spaces or non-ASCII characters. On Windows, always convert scatter and DA file paths to short 8.3 paths via `ctypes.windll.kernel32.GetShortPathNameW` before passing them as CLI arguments.
- **Console Mode CLI Shape**: SP Flash Tool console mode must be invoked with:
  `flash_tool.exe -c download -s <scatter_8.3> -d <da_8.3> -t without -r`
  (`download` is Download Only: the scatter's downloadable images are written and nothing
  is formatted, so a partition left out of the scatter is kept -- this is what the "Try to
  keep my data" option relies on. The shipped 1.1.7 build passes `format-download` instead;
  never use it. An auth file is passed via the `-i` console config, whose `<commands>` node
  carries `<download-only/>`)
  (omitting DA when default DA is loaded, and never adding spurious `-f` arguments which SP Flash Tool v5 rejects).
- **Background Log Monitoring**: SP Flash Tool on Windows emits UI progress and partition details to `C:\ProgramData\SP_FT_Logs\*\QT_FLASH_TOOL.log` rather than stdout. Tail this file in the background during flash runs to stream accurate progress.

## 7. Archive Extraction & Progress Guarantees
- **No Duplicate Unpacking Loops**: Ensure extraction functions (`_extract_zip`, `_extract_rar`) don't invoke both high-level and low-level extraction loops.
- **100% Progress Guarantee**: Archive extraction workers must emit 100% upon completion. The UI must transition immediately from `STEP_EXTRACTING` to `STEP_WAITING` so the user is never left looking at a 99% progress bar.

## 8. UX, Settings Gating & Responsive Window Geometry
- **Streamlined Settings for Casual Users**: Hide advanced developer/repair toggles (Backend selection between MTKClient / SP Flash Tool, terminal launch, SP Flash Tool GUI handoff, Run as Admin) behind an "Advanced Settings" switch and 'M'/'D' key shortcuts.
- **768p Laptop Display Adaptability**: On low-resolution screens (e.g. 1366x768), clamp Settings page height to comfortable bounds (e.g. max 560px), relying on smooth scroll areas rather than forcing the OS window off-screen.
- **Local Package Icon Support**: When flashing locally browsed `.zip` archives or unpacked folders, inspect the package contents for `updater.png` / `updater.jpg` without extracting the multi-gigabyte payload. Fall back to the system settings squircle only when no package icon is present.



