//pause video on blur (if enabled)
//originally, this module was made to not tell youtube when application is minimized, since stopping playback is undesirable usually
//i don't know if youtube still does this, so we still completely block their way of doing it, and implement our way of doing it as a setting

const { ipcRenderer } = require('electron')
const configManager = require('../config')
const rcMod = require('../util/resolveCommandModifiers')

module.exports = () => {
    let config = configManager.get()

    document.addEventListener('visibilitychange', (e) => {
        e.stopImmediatePropagation()
    })

    document.addEventListener('webkitvisibilitychange', (e) => {
        e.stopImmediatePropagation()
    })

    ipcRenderer.on('blur', () => {
        if (!config.pause_on_blur) return;

        rcMod.resolveCommand({
            commandMetadata: {
                webCommandMetadata: {
                    clientAction: true
                }
            },
            playerControlAction: {
                playerControlType: 'PLAYER_CONTROL_ACTION_TYPE_PAUSE',
                userInitiated: true
            }
        })
    })
}