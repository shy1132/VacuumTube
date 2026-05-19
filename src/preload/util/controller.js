/*
a module for VacuumTube that handles integrating controllers with ui easily, supporting steam input and stuff

controller keycodes are the same as what you'll typically find, but there are custom ones for the axes to be read as directional inputs:
1011: left stick left
1012: left stick up
1013: left stick right
1014: left stick down

1015: right stick left
1016: right stick up
1017: right stick right
1018: right stick down
*/

const { ipcRenderer } = require('electron')
const { EventEmitter } = require('tseep/lib/ee-safe') //youtube doesn't like eval

const emitter = new EventEmitter()

const buttonRepeatInterval = 100;
const buttonRepeatDelay = 500;

const pressedButtons = {}
let buttonRepeatTimeout;
let hasPressedButton = false;

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
        if (!gamepads[index]) pressedButtons[index] = null;
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
    if (!pressedButtons[index]) pressedButtons[index] = {}

    for (let i = 0; i < gamepad.buttons.length; i++) {
        let code = i;

        let button = gamepad.buttons[i]
        let buttonWasPressed = pressedButtons[index][i]

        if (button.pressed && !buttonWasPressed) {
            hasPressedButton = true;
            pressedButtons[index][i] = true;
            buttonDown(code)
            stopKeyRepeat()
            buttonRepeatTimeout = setTimeout(() => startButtonRepeat(code), buttonRepeatDelay)
        } else if (!button.pressed && buttonWasPressed) {
            pressedButtons[index][i] = false;
            buttonUp(code)
            stopKeyRepeat()
        }
    }

    for (let i = 0; i < gamepad.axes.length; i++) {
        let axisValue = gamepad.axes[i]
        let axisIndex = i + gamepad.buttons.length; //this is kind of hacky but its fine
        let axisWasPressed = pressedButtons[index][axisIndex]

        let code = null;

        if (i === 0) { //left stick
            if (axisValue > 0.5) {
                code = 1013; //right
            } else if (axisValue < -0.5) {
                code = 1011; //left
            }
        } else if (i === 1) { //left stick
            if (axisValue > 0.5) {
                code = 1014; //down
            } else if (axisValue < -0.5) {
                code = 1012; //up
            }
        } if (i === 3) { //right stick
            if (axisValue > 0.5) {
                keyCode = 1017; //right
            } else if (axisValue < -0.5) {
                keyCode = 1015; //left
            }
        } else if (i === 4) { //right stick
            if (axisValue > 0.5) {
                keyCode = 1018; //down
            } else if (axisValue < -0.5) {
                keyCode = 1016; //up
            }
        }

        if (code) {
            if (!axisWasPressed) {
                hasPressedButton = true;
                pressedButtons[index][axisIndex] = true;
                buttonDown(code)
                stopKeyRepeat()
                buttonRepeatTimeout = setTimeout(() => startButtonRepeat(code), buttonRepeatDelay)
            }
        } else {
            if (axisWasPressed) {
                pressedButtons[index][axisIndex] = false;
                buttonUp(code)
                stopKeyRepeat()
            }
        }
    }
}

function buttonDown(code) {
    if (!focused) return;
    emitter.emit('down', { code })
}

function buttonUp(code) {
    if (!focused) return;
    emitter.emit('up', { code })
}

function startButtonRepeat(code) {
    clearInterval(buttonRepeatTimeout)
    clearTimeout(buttonRepeatTimeout)
    buttonRepeatTimeout = setInterval(() => buttonDown(code), buttonRepeatInterval)
}

function stopKeyRepeat() {
    clearInterval(buttonRepeatTimeout)
}

module.exports = emitter;