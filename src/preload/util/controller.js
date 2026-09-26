/*
a module for VacuumTube that handles integrating controllers with ui easily, supporting steam input and stuff

controller keycodes are 32768 + button index, which is compatible with what youtube expects (starboard keycodes)
axes are read as virtual buttons past that:
17: left stick up
18: left stick down
19: left stick left
20: left stick right

21: right stick up
22: right stick down
23: right stick left
24: right stick right
*/

const { ipcRenderer } = require('electron')
const { EventEmitter } = require('tseep/lib/ee-safe') //youtube doesn't like eval

const emitter = new EventEmitter()

const buttonOffset = 32768;
const axisThreshold = 0.5;
const buttonRepeatInterval = 100;
const buttonRepeatDelay = 500;

const axisButtons = [
    [ 19, 20 ],
    [ 17, 18 ],
    [ 23, 24 ],
    [ 21, 22 ]
]

const pressedButtons = {}
let buttonRepeatTimeout;

let focused = true;

ipcRenderer.on('focus', () => {
    focused = true;
})

ipcRenderer.on('blur', () => {
    focused = false;
})

requestAnimationFrame(pollGamepads)

function pollGamepads() {
    const gamepads = navigator.getGamepads()

    for (let index in pressedButtons) {
        if (!gamepads[index] && pressedButtons[index]) { //disconnected
            releaseAll(pressedButtons[index])
            pressedButtons[index] = null;
        }
    }

    const steamInput = gamepads.find(g => g && g.id.endsWith('(STANDARD GAMEPAD Vendor: 28de Product: 11ff)'))
    if (steamInput) { //the one true controller here
        handleGamepad(steamInput)
    } else {
        for (let gamepad of gamepads) {
            if (gamepad && gamepad.connected) handleGamepad(gamepad)
        }
    }

    requestAnimationFrame(pollGamepads)
}

function handleGamepad(gamepad) {
    const index = gamepad.index;

    if (!pressedButtons[index]) {
        pressedButtons[index] = { buttons: {}, axes: {} }
    }

    const state = pressedButtons[index]

    for (let i = 0; i < gamepad.buttons.length; i++) {
        let code = buttonOffset + i;
        let isPressed = gamepad.buttons[i].pressed;

        if (isPressed && !state.buttons[code]) {
            state.buttons[code] = true;
            press(code)
        } else if (!isPressed && state.buttons[code]) {
            state.buttons[code] = false;
            release(code)
        }
    }

    for (let i = 0; i < axisButtons.length && i < gamepad.axes.length; i++) {
        let value = gamepad.axes[i]
        let code = null;

        if (value < -axisThreshold) {
            code = buttonOffset + axisButtons[i][0]
        } else if (value > axisThreshold) {
            code = buttonOffset + axisButtons[i][1]
        }

        let heldCode = state.axes[i]

        if (code === heldCode) continue;

        if (heldCode) {
            release(heldCode)
        }

        state.axes[i] = code;

        if (code) {
            press(code)
        }
    }
}

function press(code) {
    buttonDown(code)
    stopButtonRepeat()
    buttonRepeatTimeout = setTimeout(() => startButtonRepeat(code), buttonRepeatDelay)
}

function release(code) {
    buttonUp(code)
    stopButtonRepeat()
}

function releaseAll(state) {
    for (let code in state.buttons) {
        if (state.buttons[code]) {
            release(Number(code))
        }
    }

    for (let code of Object.values(state.axes)) {
        if (code) {
            release(code)
        }
    }
}

function buttonDown(code) {
    if (!focused) return;
    emitter.emit('down', { code })
}

function buttonUp(code) {
    emitter.emit('up', { code })
}

function startButtonRepeat(code) {
    stopButtonRepeat()
    buttonRepeatTimeout = setInterval(() => buttonDown(code), buttonRepeatInterval)
}

function stopButtonRepeat() {
    clearTimeout(buttonRepeatTimeout)
    clearInterval(buttonRepeatTimeout)
}

module.exports = emitter;