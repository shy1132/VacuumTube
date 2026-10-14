//since leanback is made for tvs and consoles, there are some things you simply can't do, as well as things that are less desirable on keyboards

const ui = require('../util/ui')
const rcMod = require('../util/resolveCommandModifiers')
const patchFunction = require('../util/patchFunction')
const localeProvider = require('../util/localeProvider')
const shortcuts = require('../util/shortcuts')
const { ipcRenderer } = require('electron')
const { createCopyVideoHandler } = require('../util/copy-video-link')

module.exports = async () => {
    await localeProvider.waitUntilAvailable()

    let locale = localeProvider.getLocale()

    //shift+enter to longpress
    let shiftHeld = false;
    let enterHeld = false;
    let shiftEnterHeld = false;

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Shift') shiftHeld = true;
        if (e.key === 'Enter') enterHeld = true;

        shiftEnterHeld = shiftHeld && enterHeld;
    }, true)

    document.addEventListener('keyup', (e) => {
        if (e.key === 'Shift') shiftHeld = false;
        if (e.key === 'Enter') enterHeld = false;

        shiftEnterHeld = shiftHeld && enterHeld;
    }, true)

    patchFunction(window, 'setTimeout', function (setTimeout, callback, delay, ...args) {
        if (shiftEnterHeld && typeof callback === 'function' && /^\(\)=>\{\([\w$]+=[\w$]+\.call\([^)]*\)\)&&[\w$]+\(\);[\w$]+\(\)\}$/.test(callback.toString())) { //matches "()=>{(x=x.call(x,x,x))&&x();x()}", only applied while shift and enter are held
            delay = 0;
        }

        return setTimeout(callback, delay, ...args);
    })

    //copy the current video, including Shorts
    let lastShortId = null;
    rcMod.addInputModifier((c) => {
        if (c.reelWatchEndpoint) {
            lastShortId = c.reelWatchEndpoint.videoId;
        }

        return c;
    })

    document.addEventListener('keydown', createCopyVideoHandler({
        platform: process.platform,
        document,
        getVideo: () => window.yt?.player?.utils?.videoElement_,
        getShortId: () => lastShortId,
        writeText: (url) => ipcRenderer.invoke('copy-video-link', url),
        copySelection: () => ipcRenderer.invoke('copy-selection'),
        onCopied: () => ui.toast('VacuumTube', locale.general.video_copied)
    }), true)

    //c to toggle captions (like desktop)
    let captions = false;
    let captionSettings = { useDefaultTrack: true }

    rcMod.addInputModifier((c) => {
        if (c.selectSubtitlesTrackCommand) {
            if (Object.keys(c.selectSubtitlesTrackCommand).length === 0) {
                captions = false;
            } else {
                captions = true;
                captionSettings = c.selectSubtitlesTrackCommand;
            }
        }

        return c;
    })

    function toggleCaptions() { //doesn't actually change boolean value of captions variable because that's handled by the rcMod code above, which will hear these commands (as well as manual ones from toggling the button or changing track)
        if (captions) {
            rcMod.resolveCommand({
                commandMetadata: {
                    webCommandMetadata: {
                        clientAction: true
                    }
                },
                selectSubtitlesTrackCommand: {} //off
            })
        } else {
            rcMod.resolveCommand({
                commandMetadata: {
                    webCommandMetadata: {
                        clientAction: true
                    }
                },
                selectSubtitlesTrackCommand: captionSettings //last known caption settings or the default
            })
        }
    }

    document.addEventListener('keydown', (e) => {
        if (!document.body.classList.contains('WEB_PAGE_TYPE_WATCH') && !document.body.classList.contains('WEB_PAGE_TYPE_SHORTS')) return;
        if (!e.shiftKey && shortcuts.isShortcutKey(e) && e.key?.toLowerCase() === 'c') {
            e.stopImmediatePropagation()
            e.stopPropagation()
            toggleCaptions()
        }
    }, true)
}