// Keeps a transparent Chromium-rendered surface active for Steam's non-Steam game overlay.

const { isSteamOverlayCompatibilitySupported } = require('../../steam-overlay-compatibility')

async function runSteamOverlayCompatibilityModule({
    platform = process.platform,
    ipcRenderer,
    configManager,
    waitForCondition,
    createSurface,
    win = window,
    doc = document
}) {
    if (!isSteamOverlayCompatibilitySupported(platform)) return false;

    const surface = createSurface(win, doc)

    function sync(newConfig = configManager.get()) {
        if (newConfig.steam_overlay_compatibility) {
            surface.start()
        } else {
            surface.stop()
        }
    }

    function cleanup() {
        surface.stop()
        ipcRenderer.removeListener('config-update', onConfigUpdate)
        win.removeEventListener('beforeunload', cleanup)
    }

    function onConfigUpdate(event, newConfig) {
        sync(newConfig)
    }

    await waitForCondition(() => !!doc.body)

    sync()
    ipcRenderer.on('config-update', onConfigUpdate)
    win.addEventListener('beforeunload', cleanup)

    return true;
}

module.exports = async () => {
    const { ipcRenderer } = require('electron')
    const configManager = require('../config')
    const functions = require('../util/functions')
    const { createSteamOverlayCompatibilitySurface } = require('../util/steamOverlayCompatibilitySurface')

    return runSteamOverlayCompatibilityModule({
        ipcRenderer,
        configManager,
        waitForCondition: functions.waitForCondition,
        createSurface: createSteamOverlayCompatibilitySurface
    })
}

module.exports.runSteamOverlayCompatibilityModule = runSteamOverlayCompatibilityModule
