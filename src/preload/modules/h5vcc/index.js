const { ipcRenderer } = require('electron')
const http = require('./dial/http')
const discover = require('./dial/discover')
const dialEvents = require('./dial/events')
const DialServer = require('./dial/server')
const configManager = require('../../config')
const config = configManager.get()

let dialOperation = null;

function getMaxResolution() {
    let resolutions = [ '256x144', '426x240', '640x360', '854x480', '1280x720', '1920x1080', '2560x1440', '3840x2160', '7680x4320' ]
    let screenWidth = Math.max(window.screen.width, window.screen.height)
    let screenHeight = Math.min(window.screen.width, window.screen.height)

    for (let i = 0; i < resolutions.length; i++) {
        let [ width, height ] = resolutions[i].split('x').map(Number)
        if (screenWidth <= width && screenHeight <= height) return resolutions[i];
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

function reportDialStatus(status) {
    ipcRenderer.send('dial-status', status)
}

async function startDial({ restart = false } = {}) {
    if (dialOperation) return await dialOperation;

    dialOperation = (async () => {
        if (!config.device_discoverability) {
            if (restart) await discover.stop()
            reportDialStatus('disabled')
            return false;
        }

        try {
            await waitForDeviceId()
            await http.listen()

            if (restart) {
                await discover.restart()
            } else {
                await discover.start()
            }

            console.log(`[h5vcc] DIAL: Server ${restart ? 'refreshed' : 'started'} at ${http.base}`)
            reportDialStatus('ready')
            return true;
        } catch (err) {
            console.error('[h5vcc] DIAL: Failed to start or refresh server', err)
            reportDialStatus('failed')
            return false;
        }
    })()

    try {
        return await dialOperation;
    } finally {
        dialOperation = null;
    }
}

dialEvents.on('launch-succeeded', () => {
    ipcRenderer.send('dial-launch-succeeded')
})

ipcRenderer.on('dial-refresh', () => {
    startDial({ restart: true })
})

window.addEventListener('online', () => {
    startDial({ restart: true })
})

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
