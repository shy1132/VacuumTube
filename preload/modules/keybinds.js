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

    window.addEventListener('keydown', e => {
        if (e.key === 'Shift') shiftHeld = true;
        if (e.key === 'Enter') enterHeld = true;

        shiftEnterHeld = shiftHeld && enterHeld;
    }, true)

    window.addEventListener('keyup', e => {
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
        if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'c') { //ctrl+alt+c to copy video url
            if (!window.yt?.player?.utils?.videoElement_?.baseURI) return;

            let baseUri = window.yt.player.utils.videoElement_.baseURI;
            if (!baseUri || !baseUri.includes('/watch?v=')) return;

            let id = baseUri.split('/watch?v=')[1].slice(0, 11)
            let url = `https://youtu.be/${id}`
            navigator.clipboard.writeText(url)

            ui.toast('VacuumTube', locale.general.video_copied)
        }
    })
}