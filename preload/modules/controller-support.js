//controller support with console parity (normal leanback doesn't have this for some reason, not sure how the console apps do it...)

const { ipcRenderer } = require('electron')
const controller = require('../util/controller')
const ui = require('../util/ui')
const localeProvider = require('../util/localeProvider')
const configManager = require('../config')
const config = configManager.get()

module.exports = async () => {
    const gamepadKeyCodeMap = { //aiming to maintain parity with the console versions of leanback
        0:  13,  //a -> enter
        1:  27,  //b -> escape
        2:  170, //x -> asterisk (search)
        4:  115, //left bumper -> f4 (back)
        5:  116, //right bumper -> f5 (forward)
        6:  113, //left trigger -> f2 (seek backwards)
        7:  114, //right trigger -> f3 (seek forwards)
        8:  13,  //select -> enter
        9:  13,  //start -> enter
        11: 'vt-settings', // r3 -> (vacuumtube settings)
        12: 38,  //dpad up -> arrow key up
        13: 40,  //dpad down -> arrow key down
        14: 37,  //dpad left -> arrow key left
        15: 39,  //dpad right -> arrow key right

        1012: 38,  //left stick up -> arrow key up
        1014: 40,  //left stick down -> arrow key down
        1011: 37,  //left stick left -> arrow key left
        1013: 39   //left stick right -> arrow key right
    }

    const fallbackKeyCode = 135; //f24, key isn't used by youtube but is picked up and brings up the menu thing (which all buttons do if they dont do anything else)
    let hasPressedButton = false;

    let runningOnSteam = await ipcRenderer.invoke('is-steam')
    if (runningOnSteam) {
        setTimeout(async () => {
            if (!hasPressedButton) {
                await localeProvider.waitUntilAvailable()

                const locale = localeProvider.getLocale()
                ui.toast('VacuumTube', locale.general.steam_controller_notice)
            }
        }, 5000)
    }

    controller.on('down', (e) => {
        hasPressedButton = true;

        let keyCode = gamepadKeyCodeMap[e.code]
        if (!keyCode) keyCode = fallbackKeyCode;

        simulateKeyDown(keyCode)
    })

    controller.on('up', (e) => {
        let keyCode = gamepadKeyCodeMap[e.code]
        if (!keyCode) keyCode = fallbackKeyCode;

        simulateKeyUp(keyCode)
    })

    function simulateKeyDown(keyCode) {
        if (!config.controller_support) return;

        if (keyCode === 'vt-settings') {
            if (window.vtToggleSettingsOverlay) {
                window.vtToggleSettingsOverlay()
            }

            return;
        }

        let event = new Event('keydown')
        event.keyCode = keyCode;
        document.dispatchEvent(event)
    }

    function simulateKeyUp(keyCode) {
        if (!config.controller_support) return;

        if (keyCode === 'vt-settings') {
            return;
        }

        let event = new Event('keyup')
        event.keyCode = keyCode;
        document.dispatchEvent(event)
    }
}