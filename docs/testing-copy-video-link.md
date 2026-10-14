# Testing video-link copying

Run `npm ci` and `npm test` for automated shortcut, URL, selection, timestamp,
Shorts, live-stream fallback and clipboard-failure coverage. Then run `npm start`
or use a package from the manually dispatched **Test builds** workflow.
The workflow never publishes a release; downloadable artifacts expire after 14 days.

## macOS

Extract the downloaded artifact, then the ZIP matching your Mac (arm64 for Apple
Silicon, x64 for Intel). The artifact includes `SHA256SUMS`; run
`shasum -a 256 -c SHA256SUMS` from its extracted directory to check the packages.
Replace the previous test app with the freshly extracted VacuumTube.app in
Applications.

Mac test builds are ad-hoc signed, and CI verifies both ZIPs after extraction.
They are **not Developer ID signed or notarized**. macOS may still block a
browser download. Try opening the app, then use **System Settings → Privacy &
Security → Open Anyway** if available. See [Apple's instructions](https://support.apple.com/en-us/102445).

If macOS still reports the app as damaged, use the following only for this trusted
test artifact. The first command checks the bundle signature; only if that passes
does the second remove the download quarantine from this app:

```sh
codesign --verify --deep --strict --verbose=2 /Applications/VacuumTube.app &&
  xattr -dr com.apple.quarantine /Applications/VacuumTube.app
```

Then open the app normally. If signature verification fails, stop and download a
fresh build. Ad-hoc signatures and checksums detect changes but do not authenticate
the developer; use the artifact linked from the draft PR. Opening without a
security override requires Developer ID signing and Apple notarization.

1. Play a normal video. Press Command-C, paste into TextEdit, and confirm a
   `https://youtu.be/VIDEO_ID` link. The clipboard must contain the link, not just
   show a success toast.
2. Pause at 1:23. Press Command-Shift-C and paste. Confirm `?t=83`, then open the
   link in a browser and verify the same video starts around 1:23. Repeat at zero.
3. Focus the search field and select text. Command-C must copy the selection.
   Repeat with selected page text and a contenteditable field if available.
   Command-Shift-C explicitly copies the video even when text is selected.
4. Repeat link copying in fullscreen, with Music Mode enabled, and after moving
   to another video. Confirm the current video's ID and time, not the previous one.
5. On Shorts, both shortcuts must copy the current Short without a timestamp.
   On live streams with an infinite or unknown duration, copy a plain video link.
6. Copy some text, navigate home without a current player, and press both shortcuts.
   Without a valid current video, the clipboard must retain the previous content.
7. Confirm C still toggles captions. Confirm Command-V, Command-A, Command-Q and
   the Edit menu's ordinary Copy action still work. Hold Command-C: only the first
   keydown should copy/notify. Switch away while holding Command and test again.
8. Confirm Ctrl-Shift-C still copies a plain link.

## Linux

Extract the tarball and launch `./vacuumtube`, or make the AppImage executable and
launch it. Ctrl-Shift-C copies a plain video link; repeat with normal videos,
Shorts and Music Mode. Ctrl-C retains its ordinary behavior. Timestamp copying
is intentionally macOS-only in this fix.

Automated tests exercise the renderer handler with injected DOM/player/clipboard
interfaces. They do not establish macOS menu routing or native clipboard behavior;
those require the manual macOS checks above. Linux smoke tests likewise do not
establish live YouTube compatibility on macOS.
