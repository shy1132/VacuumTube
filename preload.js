let modules = [
    controllerSupport,
    mouseDisappear,
    preventVisibilityChange,
    overrideF11
]

if (location.host === 'www.youtube.com') {
    for (let module of modules) {
        module()
    }
}

async function controllerSupport() {
    //controller support (normal leanback doesnt have this for some reason, not sure how the console apps do it...)
    window.addEventListener('DOMContentLoaded', () => {
        const gamepadKeyCodeMap = { //aiming to maintain parity with the console versions of leanback
            0: 13, //a -> enter
            1: 27, //b -> escape
            2: 83, //x -> s (search)
            4: 115, //left bumper -> f4 (back)
            5: 116, //right bumper -> f5 (forward)
            6: 113, //left trigger -> f2 (seek backwards)
            7: 114, //right trigger -> f3 (seek forwards)
            8: 13, //select -> enter
            9: 13, //start -> enter
            12: 38, //dpad up -> arrow key up
            13: 40, //dpad down -> arrow key down
            14: 37, //dpad left -> arrow key left
            15: 39 //dpad right -> arrow key right
        }

        const fallbackKeyCode = 135; //f24, key isn't used by youtube but is picked up and brings up the menu thing (which all buttons do if they dont do anything else)
        const keyRepeatInterval = 100;
        const keyRepeatDelay = 500;

        let pressedButtons = {}
        let keyRepeatTimeout;

        window.addEventListener('gamepadconnected', (event) => {
            requestAnimationFrame(() => checkControllerInput(event.gamepad.index))
        })

        window.addEventListener('gamepaddisconnected', () => {
            pressedButtons = {}
        })

        function checkControllerInput(index) {
            let gamepad = navigator.getGamepads()[index]

            if (gamepad) {
                for (let i = 0; i < gamepad.buttons.length; i++) {
                    let keyCode = gamepadKeyCodeMap[i]
                    if (!keyCode) keyCode = fallbackKeyCode;

                    let button = gamepad.buttons[i]
                    let buttonWasPressed = pressedButtons[i]

                    if (button.pressed && !buttonWasPressed) {
                        pressedButtons[i] = true;
                        simulateKeyDown(keyCode)
                        stopKeyRepeat()
                        keyRepeatTimeout = setTimeout(() => startKeyRepeat(keyCode), keyRepeatDelay)
                    } else if (!button.pressed && buttonWasPressed) {
                        pressedButtons[i] = false;
                        simulateKeyUp(keyCode)
                        stopKeyRepeat()
                    }
                }

                for (let i = 0; i < gamepad.axes.length; i++) {
                    let axisValue = gamepad.axes[i]
                    let keyCode = null;
                    let axisIndex = i + gamepad.buttons.length; //this is kind of hacky but its fine

                    let axisWasPressed = pressedButtons[axisIndex]

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
                            pressedButtons[axisIndex] = true;
                            simulateKeyDown(keyCode)
                            stopKeyRepeat()
                            keyRepeatTimeout = setTimeout(() => startKeyRepeat(keyCode), keyRepeatDelay)
                        }
                    } else {
                        if (axisWasPressed) {
                            pressedButtons[axisIndex] = false;
                            simulateKeyUp(keyCode)
                            stopKeyRepeat()
                        }
                    }
                }
            }

            requestAnimationFrame(() => checkControllerInput(index))
        }

        function simulateKeyDown(keyCode) {
            let event = new Event('keydown')
            event.keyCode = keyCode;
            document.dispatchEvent(event)
        }

        function simulateKeyUp(keyCode) {
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
    })
}

async function mouseDisappear() {
    //make mouse disappear after a bit of no movement
    let visible = true;
    let lastUse = 0;

    setInterval(() => {
        if (!visible) return;
        if ((Date.now() - lastUse) >= 3000) {
            hideCursor()
        }
    }, 20)

    window.addEventListener('mousemove', () => {
        lastUse = Date.now()
        showCursor()
    })

    window.addEventListener('mousedown', () => {
        lastUse = Date.now()
        showCursor()
    })

    function showCursor() {
        document.documentElement.style.cursor = 'default'
        visible = true;
    }

    function hideCursor() {
        document.documentElement.style.cursor = 'none'
        visible = false;
    }
}

async function preventVisibilityChange() {
    //don't tell youtube when application is minimized, otherwise it'll stop playback inconsistently
    document.addEventListener('visibilitychange', (event) => {
        event.stopImmediatePropagation()
    })

    document.addEventListener('webkitvisibilitychange', (event) => {
        event.stopImmediatePropagation()
    })
}

async function overrideF11() {
    //block youtube from seeing f11 being pressed so it doesn't impede the user trying to toggle fullscreen
    document.addEventListener('keydown', (e) => {
        if (e.key == 'F11') {
            e.stopImmediatePropagation()
        }
    }, true)
}