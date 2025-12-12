//since leanback is made for tvs and consoles, there are some things you simply can't do, as well as things that are less desirable on keyboards

const ui = require('../util/ui')
const patchFunction = require('../util/patchFunction')
const localeProvider = require('../util/localeProvider')

module.exports = async () => {
    await localeProvider.waitUntilAvailable()

    let locale = localeProvider.getLocale()

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

    //allow shift+enter to do longpress
    patchFunction(window, 'setTimeout', function (setTimeout, callback, delay) {
        if (callback.toString().includes('onLongPress') && shiftEnterHeld) { //feels weird lol
            delay = 0;
        }

        return setTimeout(function(...args) {
            callback(...args)
        }, delay);
    })

    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'c') {
            let url;

            let isShort = !!document.querySelector('ytlr-shorts-page')?.classList?.contains('zylon-focus')
            if (isShort) { //very dumb, don't like it, but there doesn't seem to be a better way
                let thumbnail = document.querySelector('ytlr-thumbnail-details[idomkey="ytLrShortsPageThumbnail"].ytLrThumbnailDetailsFocused').style.backgroundImage;
                let id = thumbnail.split('/vi/')[1]?.slice(0, 11)
                if (!id) return;

                url = `https://youtube.com/shorts/${id}`
            } else {
                let baseUri = window.yt?.player?.utils?.videoElement_?.baseURI;
                if (!baseUri || !baseUri.includes('/watch?v=')) return;

                let id = baseUri.split('/watch?v=')[1]?.slice(0, 11)
                if (!id) return;

                url = `https://youtu.be/${id}`
            }

            navigator.clipboard.writeText(url)
            ui.toast('VacuumTube', locale.general.video_copied)
        }
    })
}
