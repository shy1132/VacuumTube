#!/bin/bash
# Check the distributables users install, not just electron-builder's staging app.
set -euo pipefail

if [[ "$(uname -s)" != Darwin ]]; then
  echo 'macOS is required to verify signatures and mount DMGs.' >&2
  exit 1
fi

dist="${1:-dist}"
work="$(mktemp -d "${TMPDIR:-/tmp}/vacuumtube-verify.XXXXXX")"
mounted=''
cleanup() {
  if [[ -n "$mounted" ]]; then
    hdiutil detach "$mounted" || true
  fi
  rm -rf "$work"
}
trap cleanup EXIT

verify_app() {
  local app="$1"
  codesign --verify --deep --strict --all-architectures --verbose=2 "$app"
  case "$arch" in
    x64) lipo "$app/Contents/MacOS/VacuumTube" -verify_arch x86_64 ;;
    arm64) lipo "$app/Contents/MacOS/VacuumTube" -verify_arch arm64 ;;
    universal) lipo "$app/Contents/MacOS/VacuumTube" -verify_arch x86_64 arm64 ;;
  esac
}

for arch in x64 arm64 universal; do
  echo "Verifying $arch ZIP and DMG"
  ditto -x -k "$dist/VacuumTube-$arch.zip" "$work/zip-$arch"
  verify_app "$work/zip-$arch/VacuumTube.app"

  hdiutil verify "$dist/VacuumTube-$arch.dmg"
  mounted="$work/mount-$arch"
  mkdir "$mounted"
  hdiutil attach "$dist/VacuumTube-$arch.dmg" -readonly -nobrowse -mountpoint "$mounted"
  verify_app "$mounted/VacuumTube.app"
  # Also exercise the copy from the image, as when installing with Finder.
  ditto "$mounted/VacuumTube.app" "$work/installed-$arch/VacuumTube.app"
  verify_app "$work/installed-$arch/VacuumTube.app"
  hdiutil detach "$mounted"
  mounted=''
done
