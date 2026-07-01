# VacuumTube
<p>
    <a href="https://github.com/shy1132/VacuumTube/stargazers">
      <img alt="Stars" title="Stars" src="https://img.shields.io/github/stars/shy1132/VacuumTube?style=shield&label=%E2%AD%90%20Stars&branch=main&kill_cache=1%22" />
    </a>
    <a href="https://github.com/shy1132/VacuumTube/releases/latest">
      <img alt="Latest Release" title="Latest Release" src="https://img.shields.io/github/v/release/shy1132/VacuumTube?style=shield&label=%F0%9F%9A%80%20Release">
    </a>
    <a href="https://klausenbusk.github.io/flathub-stats/#ref=rocks.shy.VacuumTube&interval=infinity&downloadType=installs%2Bupdates">
      <img alt="Flathub Downloads" title="Flathub Downloads" src="https://img.shields.io/badge/dynamic/json?color=informational&label=Downloads&logo=flathub&logoColor=white&query=%24.installs_total&url=https%3A%2F%2Fflathub.org%2Fapi%2Fv2%2Fstats%2Frocks.shy.VacuumTube">
    </a>
    <a href="https://github.com/shy1132/VacuumTube/blob/main/LICENSE">
      <img alt="License" title="License" src="https://img.shields.io/github/license/shy1132/VacuumTube?label=%F0%9F%93%9C%20License" />
    </a>
</p>

VacuumTube is an unofficial wrapper of YouTube Leanback (the console and Smart TV version of YouTube) for the desktop, with a built-in adblocker and minor enhancements.

## What exactly is this?

It is **not** a custom client, YouTube Leanback is an official interface. This project simply encompasses it and makes it usable as a standalone desktop application.

YouTube Leanback is just an HTML5 app, and so you *can* just use it in your browser by going to https://www.youtube.com/tv, but they intentionally block browsers unless it's one of their console or TV apps.

You can technically bypass this by spoofing your user agent, but it isn't the same experience you'd get on a console or TV as it doesn't support controllers outside of the official app, and it's just a much more involved process to get it working.

VacuumTube solves all of this by wrapping it with Electron, pretending to be the YouTube app, implementing controller *and* touch support, and overall making it a much better experience than just spoofing your user agent.

If there's anything that you think makes it look lazy or half-baked, open an issue! The goal is to make it feel as official as possible, while also providing niceties like ad blocking, DeArrow and userstyles.

## Installing

### Windows

If you don't know the difference, pick the Installer.

- [Installer](https://github.com/shy1132/VacuumTube/releases/latest/download/VacuumTube-Setup.exe)
- Portable ZIP:
  - [x64 / amd64](https://github.com/shy1132/VacuumTube/releases/latest/download/VacuumTube-x64-Portable.zip)
  - [Arm® 64](https://github.com/shy1132/VacuumTube/releases/latest/download/VacuumTube-arm64-Portable.zip)

### macOS

Note that macOS builds are not yet signed, so they do not auto-update. For now, please periodically check for updates.

- [Universal](https://github.com/shy1132/VacuumTube/releases/latest/download/VacuumTube-universal.dmg)

### Linux

In most cases, you very likely want to use the [Flatpak](https://flathub.org/apps/rocks.shy.VacuumTube), which works across all distributions and common architectures.

Otherwise, you can use a distribution package or a portable one. If you don't know the difference, you likely want amd64.

- amd64 / x86_64
  - [AppImage](https://github.com/shy1132/VacuumTube/releases/latest/download/VacuumTube-x86_64.AppImage)
  - [Ubuntu/Debian/Mint (.deb)](https://github.com/shy1132/VacuumTube/releases/latest/download/VacuumTube-amd64.deb)
  - [tarball](https://github.com/shy1132/VacuumTube/releases/latest/download/VacuumTube-x64.tar.gz)
- Arm® 64 / aarch64
  - [AppImage](https://github.com/shy1132/VacuumTube/releases/latest/download/VacuumTube-arm64.AppImage)
  - [Ubuntu/Debian/Mint (.deb)](https://github.com/shy1132/VacuumTube/releases/latest/download/VacuumTube-arm64.deb)
  - [tarball](https://github.com/shy1132/VacuumTube/releases/latest/download/VacuumTube-arm64.tar.gz)
 
## Settings

VacuumTube has some settings that you can change, which are located directly in the YouTube settings. They can also be opened by pressing `Ctrl+O` on your keyboard or `R3` on your controller.

- Ad Block
  - Seamlessly blocks video and feed ads, not subject to YouTube's methods of preventing blockers
- SponsorBlock
  - Automatically skips sponsored segments in videos based on a [community-contributed database](https://sponsor.ajay.app/)
- DeArrow
  - Replaces titles and thumbnails with more accurate, less sensationalized versions from a public crowdsourced database
- Return Dislikes
  - Uses community data from the [Return YouTube Dislike API](https://returnyoutubedislike.com) to show rough dislike counts
- Remove Super Resolution
  - Removes \"Super resolution\" (AI upscaled) qualities from low quality videos
- Hide Shorts
  - Hides YouTube Shorts from the homepage
- Filter Video Codecs
  - Allows you to block specific video codecs, forcing YouTube to pick an alternative. Similiar to [h264ify](https://github.com/erkserkserks/h264ify), but more powerful
- Hardware Decoding
  - Uses your GPU to decode videos when possible
- Wayland HDR (Linux)
  - Enables HDR on Wayland (Linux) platforms, but can cause desaturated colors on unsupported platforms. Requires up to date drivers and a compatible Wayland compositor. See [HDR - Arch Wiki](https://wiki.archlinux.org/title/HDR)
- Low Memory Mode
  - Tells YouTube to enable it's low memory mode
- Fullscreen
  - Enables fullscreen, and makes VacuumTube always launch in fullscreen
- No Window Decorations
  - Disables window decorations, including the title bar and window border
- Keep on Top
  - Enables Keep on Top, and makes VacuumTube launch with the window pinned on top of every other window
- Pause on Blur
  - Pause current video when VacuumTube loses focus (e.g. tabbing out or minimizing the window)
- Custom CSS (Userstyles)
  - Enables injection of custom CSS styles. See the section below for more information
- Touch Overlay
  - Enables on-screen touch controls for easier navigation when touch input is detected
- Controller Support
  - Enables support for game controllers, including navigation and video playback controls. Requires an external controller, such as an Xbox controller. Can be turned off to avoid conflicting with apps like JoyToKey
- Device Discoverability
  - Allows VacuumTube to be discovered by the YouTube mobile app on devices within the same local network (DIAL)

## Extra Input Mappings

VacuumTube exposes a few extra input mappings for actions that may be desired on a desktop:

- `Ctrl+O` or `R3`
  - Open VacuumTube Settings
- `Ctrl+Shift+C`
  - Copy current video URL to clipboard
- `Shift+Enter`
  - Simulate long-press of the Enter key
- `Right Click`
  - Go back
- `+` or `Start`
  - Increase volume
- `-` or `Select`
  - Decrease volume
- `M` or `L3`
  - Toggle mute
- `C`
  - Toggle captions

## Custom CSS (Userstyles)

You can apply custom styles to VacuumTube by first enabling it in the settings, and then creating `.css` files in the userstyles folder. They can then be managed in VacuumTube settings. You can access the developer tools by pressing **Ctrl+Shift+I**, which are extremely helpful when writing custom CSS.

The userstyles folder is located in the config folder mentioned below.

## VacuumTube Flags

- `--version`/`-v`
  - Prints current version and exits
- `--portable`/`-p`
  - Operates VacuumTube in portable mode, setting data directory to the one you specify, or defaulting to `data` in the executable directory (you can also create `portable.txt` in the executable directory, which works in the same way)
- `--fullscreen`
  - Forces VacuumTube to open in fullscreen
- `--no-window-decorations`
  - Opens VacuumTube with hidden window decorations
- `enable-devtools`
  - Opens VacuumTube with the Chromium developer tools open
- `--debug-gpu`
  - Opens chrome://gpu in VacuumTube, helpful for debugging issues
- `[url]`
  - Opens a specific YouTube URL within Leanback. You'll be prompted to choose an account before the URL is opened.
  - The `https://` part is optional
  - The `youtube.com/` also is optional
  - The smallest form is pure query parameters, like `v=Something` 
  - `vacuumtube 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' --fullscreen`
  - `vacuumtube --fullscreen 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'`
  - `vacuumtube --fullscreen 'youtube.com/watch?v=dQw4w9WgXcQ'`
  - `vacuumtube --fullscreen 'watch?v=dQw4w9WgXcQ'`
  - `vacuumtube --fullscreen 'v=dQw4w9WgXcQ'`

## Chromium Flags

You can provide extra command line flags to Chromium via the `flags.txt` file located in the config folder.

For example, putting `--disable-gpu` into the `flags.txt` file will cause VacuumTube to run with the GPU disabled. You can find more flags by searching for Chromium command line flags, but you likely won't need to mess with this.

## Config Folder

Your config folder is located at:

- **Windows**: `%APPDATA%\VacuumTube\`
- **macOS**: `~/Library/Application Support/VacuumTube/`
- **Linux**: `~/.config/VacuumTube/`
- **Linux (Flatpak)**: `~/.var/app/rocks.shy.VacuumTube/config/VacuumTube/`
- **Portable (Default)**: `(executable directory)\data\`

## Building from Source

Builds will be created in the dist/ folder

```sh
git clone https://github.com/shy1132/VacuumTube
cd VacuumTube

# Install Dependencies
npm i

# Run without packaging
npm run start

# Or package builds for your operating system
npm run windows:build
npm run mac:build
npm run linux:build(-unpacked,-appimage)
```
