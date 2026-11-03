//controller support with console parity
//leanback maps gamepad codes (32768 + button index) itself, we just have to emit the key events for it

const { ipcRenderer } = require('electron')
const controller = require('../util/controller')
const ui = require('../util/ui')
const localeProvider = require('../util/localeProvider')
const configManager = require('../config')
const keybindings = require('../util/keybindings')
const shortcuts = require('../util/shortcuts')
const config = configManager.get()

module.exports = async () => {
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
        if (e.capturedByKeybindings) return;

        hasPressedAnyButton = true;
        const action = keybindings.controllerAction(e.code)
        if (action === 'open_settings') {
            simulateSettingsKey('keydown')
        } else {
            simulateKeyDown(action ? keybindings.actions.find((entry) => entry.id === action).keyCode : e.code)
        }
    })

    controller.on('up', (e) => {
        if (e.capturedByKeybindings) return;

        const action = keybindings.controllerAction(e.code)
        if (action === 'open_settings') {
            simulateSettingsKey('keyup')
        } else {
            simulateKeyUp(action ? keybindings.actions.find((entry) => entry.id === action).keyCode : e.code)
        }
    })

    for (const type of [ 'keydown', 'keyup' ]) {
        document.addEventListener(type, (event) => {
            if (shortcuts.isSettingsOpen()) return;

            const action = keybindings.actions.find((entry) =>
                [ 'previous_video', 'next_video', 'seek_backward', 'seek_forward' ].includes(entry.id) &&
                keybindings.keyboardMatches(event, entry.id)
            )
            if (!action) return;

            event.preventDefault()
            event.stopPropagation()
            event.stopImmediatePropagation()
            if (type === 'keydown') {
                simulateKeyDown(action.keyCode)
            } else {
                simulateKeyUp(action.keyCode)
            }
        }, true)
    }

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

    function simulateSettingsKey(type) {
        if (!config.controller_support) return;

        const event = new KeyboardEvent(type, {
            key: 'o',
            code: 'KeyO',
            ctrlKey: true,
            bubbles: true,
            cancelable: true
        })
        document.dispatchEvent(event)
    }
}
