//experimental: autoplays a preview of a tile's video (with sound) over its thumbnail after it's focused for a moment,
//similar to the PS4 YouTube app.
//
//the actual preview player is a real youtube.com/embed/<id> iframe, but it's NOT rendered in this page - it's shown
//via a dedicated Electron WebContentsView, owned and positioned by the main process (see src/index.js). that view
//uses its own separate session, because this page's session identifies itself as a tv/console client (see the
//user agent comment in src/index.js), and youtube's embed player refuses to serve those. a fresh, ordinary-looking
//session doesn't hit that block. this module only handles focus/dwell detection in the dom and tells the main
//process where to show/hide/position that view via the 'autoplay-preview-show'/'-position'/'-hide' ipc messages.
//
//NOTE: tile data lookup (getTileData() below) relies on leanback's tile custom elements keeping a reference to
//their component instance/props on the dom node itself (the same `__instance.props.data` pattern used in
//modules/music-mode/index.js for the quality menu). if this stops matching real tile data after a leanback
//update, check what a focused tile node actually looks like in devtools and adjust getTileData() accordingly.

const { ipcRenderer } = require('electron')
const configManager = require('../config')
const functions = require('../util/functions')

const DWELL_MS = 1000 //how long a tile needs to stay focused before the preview starts
const MAX_ANCESTOR_SEARCH = 8 //how many parent elements to walk up while looking for tile data

module.exports = async () => {
    const config = configManager.get()

    //preload modules can run before the parser has created <html>/<body>, so wait for the dom to exist first
    await functions.waitForCondition(() => !!document.body)

    let dwellTimer = null;
    let focusedTile = null;
    let previewActive = false; //whether the main process's preview view is currently shown (the view itself lives there, not here)

    function isEnabled() {
        return config.features_enabled === true && config.autoplay_preview_feature === true;
    }

    //walks up from the focused element to find the tile renderer's data (contentId, contentType, etc)
    function getTileData(element) {
        let node = element;

        for (let i = 0; i < MAX_ANCESTOR_SEARCH && node; i++) {
            let data = node.__instance?.props?.data;
            if (data?.tileRenderer) data = data.tileRenderer;

            if (data?.contentId && data.contentType === 'TILE_CONTENT_TYPE_VIDEO') {
                return { element: node, contentId: data.contentId };
            }

            node = node.parentElement;
        }

        return null;
    }

    //the tile's thumbnail is only ever the top portion of the tile (title/metadata sits below it), so try to find
    //that specific sub-element instead of just falling back to the whole tile (which would cover the title too).
    function getThumbnailElement(tileElement) {
        let header = tileElement.querySelector('ytlr-tile-header-renderer')
        if (header) return header;

        let img = tileElement.querySelector('img')
        if (img) return img;

        let genericHeader = tileElement.querySelector('[class*="header" i], [class*="thumbnail" i]')
        if (genericHeader) return genericHeader;

        return tileElement.firstElementChild || tileElement;
    }

    //zylon-focus gets applied at multiple nesting levels at once (a focus-path marker bubbling up towards the root),
    //so grab every match and return the most specific one (the one that isn't an ancestor of any other match)
    function getFocusedElement() {
        let candidates = [...document.querySelectorAll('.zylon-focus')]
        if (candidates.length === 0) return null;

        return candidates.find((el) => !candidates.some((other) => other !== el && el.contains(other))) || null;
    }

    //serializes a DOMRect into a plain object, since the ipc call below needs something structured-cloneable
    function toRect(target) {
        let rect = target.getBoundingClientRect()
        return { x: rect.left, y: rect.top, width: rect.width, height: rect.height }
    }

    //asks the main process to show its dedicated preview view (see the file header comment above) over the given target
    function createPreview(videoId, target) {
        previewActive = true;
        ipcRenderer.send('autoplay-preview-show', {
            videoId,
            rect: toRect(target)
        })
    }

    function destroyPreview() {
        if (dwellTimer) {
            clearTimeout(dwellTimer)
            dwellTimer = null;
        }

        if (!previewActive) return;

        previewActive = false;
        ipcRenderer.send('autoplay-preview-hide')
    }

    //treated the same as "nothing is focused" - the settings overlay renders on top of the tile grid, so a
    //preview left running underneath it would still be visible/audible through/around the overlay
    function isSettingsOverlayOpen() {
        return !!document.querySelector('#vt-settings-overlay-root:not(.vt-settings-hidden)')
    }

    function handleFocusChange() {
        let focused = isSettingsOverlayOpen() ? null : getFocusedElement()
        if (focused === focusedTile) return;

        focusedTile = focused;
        destroyPreview()

        if (!focused || !isEnabled()) return;

        let tile = getTileData(focused)
        if (!tile) return;

        dwellTimer = setTimeout(() => {
            dwellTimer = null;

            //bail if focus moved on (or the feature got disabled) while we were waiting
            if (getFocusedElement() !== focused) return;
            if (!isEnabled()) return;

            createPreview(tile.contentId, getThumbnailElement(tile.element))
        }, DWELL_MS)
    }

    //isEnabled() only ever changes across a restart (see the settings UI's restart note), so it's safe to check
    //once here rather than on every mutation - nothing below (observer, resize/blur listeners) is set up at all
    //unless the feature is actually on, keeping it truly zero-cost while disabled.
    if (!isEnabled()) return;

    let observer = new MutationObserver(handleFocusChange)
    observer.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['class'],
        subtree: true
    })

    //resizing/maximizing mid-preview is a rare edge case (VacuumTube is normally launched and used fullscreen, and
    //stays that way) - rather than trying to precisely track the tile's rect through every intermediate layout
    //change (which got unreliable in odd in-between window sizes/aspect ratios), just tear the preview down on
    //any resize/bounds change. it reappears normally the next time a tile is focused for a moment.
    window.addEventListener('resize', destroyPreview)

    //maximize/unmaximize don't reliably fire a DOM 'resize' event - see the corresponding
    //win.on('maximize'/'unmaximize', ...) handlers in src/index.js
    ipcRenderer.on('window-bounds-changed', destroyPreview)

    //the main process sends this when the whole app window loses focus (alt-tab, minimize, etc) - the preview
    //has its own sound, so it shouldn't keep playing in the background once the app itself isn't
    ipcRenderer.on('blur', destroyPreview)
}
