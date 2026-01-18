const { ipcRenderer } = require('electron')

module.exports = async () => {
    let initialDeepLink = await ipcRenderer.invoke('get-deeplink')

    window.h5vcc = {
        runtime: {
            initialDeepLink
        }
    }
}