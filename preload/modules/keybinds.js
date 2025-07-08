//since leanback is made for tvs and consoles, there are some things you simply can't do. these keybinds serve as a way to do those things

const ui = require('../util/ui')
const localeProvider = require('../util/localeProvider')

module.exports = async () => {
    await localeProvider.waitUntilAvailable()

    let locale = localeProvider.getLocale()

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