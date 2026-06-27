const { ipcRenderer } = require('electron')
const http = require('./dial/http')

module.exports = async () => {
    let DialServer = null;

    try {
        await http.listen()

        require('./dial/discover')

        DialServer = require('./dial/server')
    } catch (err) {
        console.error('[h5vcc] DIAL: Failed to start server', err)
    }

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
}