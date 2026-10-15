# Testing video-link copying

Run `npm ci`, `npm test`, then `npm start`, or download an artifact from the
manually dispatched **Test builds** workflow. Artifacts expire after 14 days.
Unit tests use mocked interfaces; check native shortcuts and clipboard behavior below.

## macOS

Extract the artifact and run `shasum -a 256 -c SHA256SUMS` in its directory.
Extract the ZIP for your Mac (arm64: Apple Silicon; x64: Intel) and replace
`/Applications/VacuumTube.app`.

Test builds are ad-hoc signed and verified in CI, **not Developer ID signed or
notarized**. If macOS blocks opening, use **System Settings → Privacy & Security →
Open Anyway** ([Apple's instructions](https://support.apple.com/en-us/102445)).
If it still reports damage, only for a trusted artifact linked from the draft PR:

```sh
codesign --verify --deep --strict --verbose=2 /Applications/VacuumTube.app &&
  xattr -dr com.apple.quarantine /Applications/VacuumTube.app
```

This removes download quarantine only if signature verification passes. If it
fails, download a fresh build. Checksums and ad-hoc signatures do not authenticate
the developer; opening without an override requires Developer ID signing and notarization.

1. Play a video, press Command-C and paste into TextEdit: `https://youtu.be/VIDEO_ID`.
2. Pause at 1:23; Command-Shift-C should paste a link ending in `?t=83`.
   Open it in a browser to verify playback starts at 1:23. Repeat at zero (`?t=0`).
3. Command-C should copy selected search-field, page and contenteditable text.
   Command-Shift-C should still copy the video link with its timestamp.
4. Repeat in fullscreen, Music Mode and after changing videos; verify the current ID/time.
5. Shorts and live streams (including DVR) should copy plain links with either shortcut.
6. On the home screen without a player, both shortcuts should leave the clipboard unchanged.
7. Check captions (C), Command-V, Command-A, Command-Q and Edit → Copy.
   Holding Command-C should copy/notify once; check again after switching away and back.
8. Ctrl-Shift-C should still copy a plain link.

## Linux

Extract the tarball and run `./vacuumtube`, or make the AppImage executable and
launch it. Test Ctrl-Shift-C on videos, Shorts and Music Mode: it copies a plain
link. Ctrl-C should retain normal behavior. Timestamp copying is macOS-only.
