const { ipcRenderer } = require('electron')

let modules = [
    events,
    controllerSupport,
    touchControls,
    mouseDisappear,
    preventVisibilityChange,
    overrideF11
]

if (location.host === 'www.youtube.com') {
    for (let module of modules) {
        module()
    }
}

function events() {
    window.addEventListener('load', () => {
        async function waitForSelector(selector) {
            return new Promise(resolve => {
                let observer = new MutationObserver(() => {
                    let el = document.querySelector(selector)
                    if (el) {
                        resolve(el)
                        observer.disconnect()
                    }
                })
    
                observer.observe(document.documentElement, {
                    childList: true,
                    subtree: true
                })
    
                let el = document.querySelector(selector)
                if (el) {
                    resolve(el)
                    observer.disconnect()
                }
            })
        }

        (async () => {
            ipcRenderer.send('player-started-loading')
            await waitForSelector('.html5-main-video')
            ipcRenderer.send('player-finished-loading')
        })()
    })
}

async function controllerSupport() {
    //controller support (normal leanback doesnt have this for some reason, not sure how the console apps do it...)
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

    let focused = await ipcRenderer.invoke('is-focused')

    ipcRenderer.on('focus', () => {
        focused = true;
    })

    ipcRenderer.on('blur', () => {
        focused = false;
    })

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
        if (!focused) return;

        let event = new Event('keydown')
        event.keyCode = keyCode;
        document.dispatchEvent(event)
    }

    function simulateKeyUp(keyCode) {
        if (!focused) return;

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

function touchControls() {
    //onscreen touch controls
    window.addEventListener('load', () => {
        const touchKeyCodeMap = {
            'back': 27, //escape
            'select': 13, //enter
            'up': 38,
            'down': 40,
            'left': 37,
            'right': 39
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

        let zIndex = 999;
        let controls = document.createElement('div')

        let bottomLeft = document.createElement('div')
        bottomLeft.style.position = 'absolute'
        bottomLeft.style.bottom = '5vh'
        bottomLeft.style.left = '5vh'
        bottomLeft.style.zIndex = zIndex.toString()
        controls.appendChild(bottomLeft)

        let bottomRight = document.createElement('div')
        bottomRight.style.position = 'absolute'
        bottomRight.style.bottom = '5vh'
        bottomRight.style.right = '5vh'
        bottomRight.style.zIndex = zIndex.toString()
        controls.appendChild(bottomRight)

        function createCircularButton(text, keyCode, margin, ytIcon) {
            let button = document.createElement('div')
            button.style.display = 'inline-flex'
            button.style.justifyContent = 'center'
            button.style.alignItems = 'center'
            button.style.width = '10vw'
            button.style.height = '10vw'
            button.style.backgroundColor = '#272727'
            button.style.opacity = '0.9'
            button.style.borderRadius = '50%'
            button.style.color = 'white'
            button.style.fontWeight = 'bold'
            button.style.userSelect = 'none'
            button.style.verticalAlign = 'middle'
            button.style.zIndex = (zIndex + 1).toString()
            button.textContent = text;

            button.onmousedown = () => simulateKeyDown(keyCode)
            button.onmouseup = () => simulateKeyUp(keyCode)

            if (margin) {
                button.style.marginLeft = '1vw'
            }

            if (ytIcon) {
                button.style.fontFamily = 'YouTube Icons Outlined'
                button.style.fontSize = '5vw'
            }

            return button;
        }

        let left = createCircularButton('\ue5de', touchKeyCodeMap.left, true, true)
        bottomLeft.appendChild(left)

        let right = createCircularButton('\ue5df', touchKeyCodeMap.right, true, true)
        bottomLeft.appendChild(right)

        let up = createCircularButton('\ue5de', touchKeyCodeMap.up, true, true)
        up.style.transform = 'rotate(90deg)' //up arrow, youtube icons dont have one
        bottomLeft.appendChild(up)

        let down = createCircularButton('\ue5de', touchKeyCodeMap.down, true, true)
        down.style.transform = 'rotate(-90deg)' //down arrow, youtube icons dont have one
        bottomLeft.appendChild(down)

        let back = createCircularButton('◦', touchKeyCodeMap.back, true)
        back.style.fontSize = '7vw'
        bottomRight.appendChild(back)

        let select = createCircularButton('·', touchKeyCodeMap.select, true)
        select.style.fontSize = '12vw'
        bottomRight.appendChild(select)

        document.body.appendChild(controls)

        let visible = true;
        let lastTouch = 0;

        function hide() {
            controls.style.display = 'none'
            visible = false;
        }

        function show() {
            controls.style.display = ''
            visible = true;
        }

        hide()

        setInterval(() => {
            if (!visible) return;
            if ((Date.now() - lastTouch) >= 3000) {
                hide()
            }
        }, 20)

        window.addEventListener('touchstart', (e) => {
            lastTouch = Date.now()

            if (!visible) {
                e.preventDefault()
                show()
            }
        }, { passive: false })
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