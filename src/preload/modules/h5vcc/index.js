const { ipcRenderer } = require('electron')
const http = require('./dial/http')
const DialServer = require('./dial/server')
const configManager = require('../../config')
const config = configManager.get()

function getMaxResolution() {
    let resolutions = [ '256x144', '426x240', '640x360', '854x480', '1280x720', '1920x1080', '2560x1440', '3840x2160', '7680x4320' ]
    let screenSize = Math.max(window.screen.width, window.screen.height)

    for (let i = 0; i < resolutions.length; i++) {
        let width = Number(resolutions[i].split('x')[0])
        if (screenSize <= width) return resolutions[i];
    }

    return `${window.screen.width}x${window.screen.height}`;
}

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
    const maxResolution = getMaxResolution()

    window.h5vcc = {
        dial: { DialServer },
        runtime: {
            initialDeepLink
        },
        system: {
            getVideoContainerSizeOverride: () => { //unlock high res
                return config.unlock_resolution ? '7680x4320' : maxResolution;
            }
        }
    }

    startDial()
}