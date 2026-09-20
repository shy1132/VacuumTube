//controller support with console parity
//leanback maps gamepad codes (32768 + button index) itself, we just have to emit the key events for it

const { ipcRenderer } = require('electron')
const controller = require('../util/controller')
const ui = require('../util/ui')
const localeProvider = require('../util/localeProvider')
const configManager = require('../config')
const config = configManager.get()

module.exports = async () => {
    const customKeyCodes = { //custom VacuumTube mappings
        32776: 16001,  //select -> vt volume down
        32777: 16002,  //start  -> vt volume up
        32778: 16000   //l3     -> vt mute
    }

    let hasPressedAnyButton = false;

    const runningOnSteam = await ipcRenderer.invoke('is-steam')

    if (runningOnSteam) {
        setTimeout(async () => {
            if (!hasPressedAnyButton) {
                await localeProvider.waitUntilAvailable()

                const locale = localeProvider.getLocale()
                ui.toast('VacuumTube', locale.general.steam_controller_notice)
            }
        }, 15000)
    }

    controller.on('down', (e) => {
        hasPressedAnyButton = true;
        simulateKeyDown(customKeyCodes[e.code] ?? e.code)
    })

    controller.on('up', (e) => {
        simulateKeyUp(customKeyCodes[e.code] ?? e.code)
    })

    function simulateKeyDown(keyCode) {
        if (!config.controller_support) return;

        let event = new Event('keydown')
        event.keyCode = keyCode;
        document.dispatchEvent(event)
    }

    function simulateKeyUp(keyCode) {
        if (!config.controller_support) return;

        let event = new Event('keyup')
        event.keyCode = keyCode;
        document.dispatchEvent(event)
    }
}