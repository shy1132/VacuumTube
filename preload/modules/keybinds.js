//since leanback is made for tvs and consoles, there are some things you simply can't do. these keybinds serve as a way to do those things
const util = require('../util.js')

module.exports = () => {
    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'c') { //ctrl+alt+c to copy video url
            if (!window.yt?.player?.utils?.videoElement_?.baseURI) return;

            let baseUri = window.yt.player.utils.videoElement_.baseURI;
            if (!baseUri || !baseUri.includes('/watch?v=')) return;

            let id = baseUri.split('/watch?v=')[1].slice(0, 11)
            let url = `https://youtu.be/${id}`
            navigator.clipboard.writeText(url)

            util.toast('VacuumTube', 'Video link copied to clipboard') //todo: locale? will need to be taken more seriously once there's a configuration ui
        }
    })
}