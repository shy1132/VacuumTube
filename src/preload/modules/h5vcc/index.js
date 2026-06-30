const { ipcRenderer } = require('electron')
const http = require('./dial/http')
const DialServer = require('./dial/server')
const configManager = require('../../config')
const config = configManager.get()

async function waitForDeviceId() {
    let start = Date.now()
    while ((Date.now() - start) < 10000) {
        try {
            let json = localStorage.getItem('yt.leanback.default::mdx-device-id')
            let id = JSON.parse(json)?.data;
            if (id && typeof id === 'string') return;
        } catch {}

        await new Promise((resolve) => setTimeout(resolve, 50))
    }

    console.warn('[h5vcc] DIAL: Device ID not available after waiting, using fallback UUID')
}

async function startDial() {
    if (!config.device_discoverability) return;

    try {
        await waitForDeviceId()
        await http.listen()
        require('./dial/discover')

        console.log('[h5vcc] DIAL: Server started')
    } catch (err) {
        console.error('[h5vcc] DIAL: Failed to start server', err)
    }
}

module.exports = async () => {
    const initialDeepLink = await ipcRenderer.invoke('get-deeplink')

    window.h5vcc = {
        dial: { DialServer },
        runtime: {
            initialDeepLink
        },
        system: {
            getVideoContainerSizeOverride: () => { //unlock high res
                return `${window.screen.width}x${window.screen.height}`;
            }
        }
    }

    startDial()
}