//when it sends a RELOAD_PAGE command, youtube's service worker can intercept it and break VacuumTube's preload injection. this script fixes that by telling the main process to reload on electron's side, bypassing the service worker

const { ipcRenderer } = require('electron')
const rcMod = require('../util/resolveCommandModifiers')

module.exports = () => {
    rcMod.addInputModifier((command) => {
        if (!command.signalAction || !command.signalAction.signal || command.signalAction.signal !== 'RELOAD_PAGE') return command;

        ipcRenderer.invoke('reload')
        return false;
    })
}