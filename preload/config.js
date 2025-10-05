const { ipcRenderer } = require('electron')

let config = ipcRenderer.sendSync('get-config')
let sharedConfig = { ...config }

ipcRenderer.on('config-update', (event, newConfig) => {
    for (let key in sharedConfig) delete sharedConfig[key]
    for (let key in newConfig) sharedConfig[key] = newConfig[key]
})

function get() {
    return sharedConfig;
}

function set(newConfig) {
    let updated = ipcRenderer.sendSync('set-config', newConfig) //hate to use sendSync since it's blocking, but i have no choice since youtube doesn't await stuff on ui calls
    for (let key in sharedConfig) delete sharedConfig[key]
    for (let key in updated) sharedConfig[key] = updated[key]
}

module.exports = {
    get,
    set
}