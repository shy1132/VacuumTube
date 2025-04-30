# VacuumTube

VacuumTube is an unofficial wrapper of YouTube Leanback (the console and Smart TV version of YouTube) for the desktop, with a built-in adblocker and minor enhancements.

## What exactly is this?

It is **not** a custom client, YouTube Leanback is an official interface. This project simply encompasses it and makes it usable as a standalone desktop application.

YouTube Leanback is just an HTML5 app, and so you *can* just use it in your browser by going to https://www.youtube.com/tv, but they intentionally block browsers unless it's one of their console or TV apps.

You can technically bypass this by spoofing your user agent, but it isn't the same experience you'd get on a console or TV as it doesn't support controllers outside of the official app, and it's just a much more involved process to get it working.

VacuumTube solves all of this by wrapping it with Electron, pretending to be the YouTube app, implementing controller support, and overall making it a much better experience than just spoofing your user agent.

## Installing

### Windows

If you don't know the difference, pick the Installer.

- [Installer](https://github.com/shy1132/VacuumTube/releases/latest/download/VacuumTube-Setup.exe)
- Portable:
  - [x64 / amd64](https://github.com/shy1132/VacuumTube/releases/latest/download/VacuumTube-x64-Portable.zip)
  - [Arm® 64](https://github.com/shy1132/VacuumTube/releases/latest/download/VacuumTube-arm64-Portable.zip)

### Mac
No macOS builds available yet.

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

# Or package release builds
npm run build
```
