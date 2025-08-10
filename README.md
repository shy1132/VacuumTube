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
    <a href="https://github.com/shy1132/VacuumTube/blob/main/LICENSE.md">
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
- Portable:
  - [x64 / amd64](https://github.com/shy1132/VacuumTube/releases/latest/download/VacuumTube-x64-Portable.zip)
  - [Arm® 64](https://github.com/shy1132/VacuumTube/releases/latest/download/VacuumTube-arm64-Portable.zip)

### macOS

While macOS builds are available, they are completely untested since I don't have access to Mac hardware. If anything goes wrong at all, please make an issue!

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
npm run build-windows
npm run build-mac
npm run build-linux
```

## Custom CSS (Userstyles)

You can apply custom styles to VacuumTube by first enabling it in the settings, and then creating `.css` files in the userstyles folder. You can access the developer tools by pressing **Ctrl+Shift+I**, these are extremely useful for writing custom CSS.

### File Location

Your userstyles folder is located at:

- **Windows**: `%APPDATA%\VacuumTube\userstyles\`
- **macOS**: `~/Library/Application Support/VacuumTube/userstyles/`
- **Linux**: `~/.config/VacuumTube/userstyles/`
- **Linux (Flatpak)**: `~/.var/app/rocks.shy.VacuumTube/config/VacuumTube/userstyles/`
