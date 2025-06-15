const { ipcRenderer } = require('electron')

let config = ipcRenderer.sendSync('get-config')
ipcRenderer.on('config-update', (event, newConfig) => {
    config = newConfig;
})

function get() {
    return config;
}

function set(newConfig) {
    config = ipcRenderer.sendSync('set-config', newConfig) //hate to use sendSync since it's blocking, but i have no choice since youtube doesn't await stuff on ui calls
}

module.exports = {
    get,
    set
}