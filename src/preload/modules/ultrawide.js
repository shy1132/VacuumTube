//expand the YouTube TV interface to fill ultrawide displays

const { ipcRenderer } = require('electron')
const configManager = require('../config')
const css = require('../util/css')

const ultrawideCSS = `
div#container,
yt-virtual-list,
ytlr-section-list-renderer,
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

function isEnabled(config) {
    return config.features_enabled === true && config.ultrawide_feature === true;
}

function update(enabled) {
    if (enabled) {
        css.inject('ultrawide', ultrawideCSS)
    } else {
        css.delete('ultrawide')
    }
}

module.exports = () => {
    let enabled = isEnabled(configManager.get())

    if (enabled) {
        update(true)
    }

    ipcRenderer.on('config-update', (event, config) => {
        if (isEnabled(config) === enabled) return;

        enabled = isEnabled(config)
        update(enabled)
    })
}