# VacuumTube

VacuumTube is an unofficial "port" of YouTube Leanback (the TV version of YouTube) to the desktop, with a built-in adblocker.

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

In most cases, you very likely want to use the [Flatpak](https://flathub.org/apps/rocks.shy.VacuumTube), which works across all distributions and architectures.

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
