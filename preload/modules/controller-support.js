//controller support with console parity (normal leanback doesn't have this for some reason, not sure how the console apps do it...)

const { ipcRenderer } = require('electron')
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
        12: 38,  //dpad up -> arrow key up
        13: 40,  //dpad down -> arrow key down
        14: 37,  //dpad left -> arrow key left
        15: 39   //dpad right -> arrow key right
    }

    const fallbackKeyCode = 135; //f24, key isn't used by youtube but is picked up and brings up the menu thing (which all buttons do if they dont do anything else)
    const keyRepeatInterval = 100;
    const keyRepeatDelay = 500;

    const pressedButtons = {}
    let keyRepeatTimeout;
    let hasPressedButton = false;

    let focused = await ipcRenderer.invoke('is-focused')

    ipcRenderer.on('focus', () => {
        focused = true;
    })

    ipcRenderer.on('blur', () => {
        focused = false;
    })

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

    requestAnimationFrame(pollGamepads)

    function pollGamepads() {
        const gamepads = navigator.getGamepads()
        for (let index of Object.keys(pressedButtons)) {
            if (!gamepads[index]) pressedButtons[index] = null;
        }

        let steamInput = gamepads.find(g => g && g.id.endsWith('(STANDARD GAMEPAD Vendor: 28de Product: 11ff)'))
        if (steamInput) { //the one true controller here
            handleGamepad(steamInput)
        } else {
            for (let gamepad of gamepads) {
                handleGamepad(gamepad)
            }
        }

        requestAnimationFrame(pollGamepads)
    }

    function handleGamepad(gamepad) {
        if (!gamepad || !gamepad.connected) return;

        const index = gamepad.index;
        if (!pressedButtons[index]) pressedButtons[index] = {}

        for (let i = 0; i < gamepad.buttons.length; i++) {
            let keyCode = gamepadKeyCodeMap[i]
            if (!keyCode) keyCode = fallbackKeyCode;

            let button = gamepad.buttons[i]
            let buttonWasPressed = pressedButtons[index][i]

            if (button.pressed && !buttonWasPressed) {
                hasPressedButton = true;
                pressedButtons[index][i] = true;
                simulateKeyDown(keyCode)
                stopKeyRepeat()
                keyRepeatTimeout = setTimeout(() => startKeyRepeat(keyCode), keyRepeatDelay)
            } else if (!button.pressed && buttonWasPressed) {
                pressedButtons[index][i] = false;
                simulateKeyUp(keyCode)
                stopKeyRepeat()
            }
        }

        for (let i = 0; i < gamepad.axes.length; i++) {
            let axisValue = gamepad.axes[i]
            let keyCode = null;
            let axisIndex = i + gamepad.buttons.length; //this is kind of hacky but its fine

            let axisWasPressed = pressedButtons[index][axisIndex]

            if (i === 0) {
                if (axisValue > 0.5) {
                    keyCode = 39; //right arrow
                } else if (axisValue < -0.5) {
                    keyCode = 37; //left arrow
                }
            } else if (i === 1) {
                if (axisValue > 0.5) {
                    keyCode = 40; //down arrow
                } else if (axisValue < -0.5) {
                    keyCode = 38; //up arrow
                }
            } else if (i === 2 || i === 3) {
                if (axisValue > 0.5 || axisValue < -0.5) {
                    keyCode = fallbackKeyCode;
                }
            }

            if (keyCode) {
                if (!axisWasPressed) {
                    hasPressedButton = true;
                    pressedButtons[index][axisIndex] = true;
                    simulateKeyDown(keyCode)
                    stopKeyRepeat()
                    keyRepeatTimeout = setTimeout(() => startKeyRepeat(keyCode), keyRepeatDelay)
                }
            } else {
                if (axisWasPressed) {
                    pressedButtons[index][axisIndex] = false;
                    simulateKeyUp(keyCode)
                    stopKeyRepeat()
                }
            }
        }
    }

    function simulateKeyDown(keyCode) {
        if (!focused || !config.controller_support) return;

        let event = new Event('keydown')
        event.keyCode = keyCode;
        document.dispatchEvent(event)
    }

    function simulateKeyUp(keyCode) {
        if (!focused || !config.controller_support) return;

        let event = new Event('keyup')
        event.keyCode = keyCode;
        document.dispatchEvent(event)
    }

    function startKeyRepeat(keyCode) {
        clearInterval(keyRepeatTimeout)
        clearTimeout(keyRepeatTimeout)
        keyRepeatTimeout = setInterval(() => simulateKeyDown(keyCode), keyRepeatInterval)
    }

    function stopKeyRepeat() {
        clearInterval(keyRepeatTimeout)
    }
}