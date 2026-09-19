//expand the YouTube TV interface to fill ultrawide displays

const { ipcRenderer } = require('electron')
const configManager = require('../config')
const css = require('../util/css')

const ultrawideCSS = `
div#container,
yt-virtual-list,
ytlr-section-list-renderer
ytlr-horizontal-list-renderer,
ytlr-tv-surface-content-renderer,
div[idomkey="shadow"],
ytlr-two-column-renderer,
yt-route,
ytlr-welcome-immersive-value-prop
{
    width: 100vw !important;
    max-width: 100vw !important;
    box-sizing: border-box !important;
    min-width: 100vw !important;
}
`

function update(enabled) {
    if (enabled) {
        css.inject('ultrawide', ultrawideCSS)
    } else {
        css.delete('ultrawide')
    }
}

module.exports = () => {
    let enabled = configManager.get().support_ultrawide;

    if (enabled) {
        update(true)
    }

    ipcRenderer.on('config-update', (event, config) => {
        if (config.support_ultrawide === enabled) return;

        enabled = config.support_ultrawide;
        update(enabled)
    })
}
