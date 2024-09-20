let gamepadKeyCodeMap = {
    0: 13, //a -> enter
    1: 8, //b -> backspace
    8: 27, //select -> escape
    9: 13, //start -> enter
    12: 38, //dpad up -> arrow key up
    13: 40, //dpad down -> arrow key down
    14: 37, //dpad left -> arrow key left
    15: 39 //dpad right -> arrow key right
}

let pressedButtons = {}
let keyRepeatInterval = 100;
let keyRepeatTimeout;
let keyRepeatDelay = 500;   

window.addEventListener('DOMContentLoaded', () => {
    //adblock and player modifications
    let style = document.createElement('style')
    style.textContent = '.ad-interrupting { display: none; }\n.ad-showing { display: none; }'
    document.head.appendChild(style)

    function adBlock() { //modified from ublock
        let moviePlayer = document.querySelector('.html5-video-player')
        if (!moviePlayer) return;

        let isAd = moviePlayer?.classList?.contains('ad-interrupting') || moviePlayer?.classList?.contains('ad-showing')
        if (!isAd) return;

        let video = moviePlayer?.querySelector('video')
        if (!video) return;

        video.volume = 0; //so you hopefully don't hear it

        let progressState = moviePlayer?.getProgressState()
        if (progressState && progressState.duration > 0 && progressState.loaded < progressState.duration) {
            video.currentTime = progressState.duration;
            video.volume = 1;
        }
    }

    function setHighRes() {
        let moviePlayer = document.querySelector('.html5-video-player')
        if (!moviePlayer) return;

        moviePlayer.setPlaybackQualityRange('highres')
    }

    new MutationObserver(() => {
        adBlock()
        setHighRes()
    }).observe(document, { childList: true, subtree: true })

    //gamepad
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
                if (!keyCode) continue;

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
                let axisValue = gamepad.axes[i];
                let keyCode = null;
                let axisIndex = i + gamepad.buttons.length; //this is kind of hacky but i dont mind

                let axisWasPressed = pressedButtons[axisIndex];
            
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
                }

                if (keyCode != null) {
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
        event.keyCode = keyCode
        document.dispatchEvent(event)
    }

    function simulateKeyUp(keyCode) {
        let event = new Event('keyup')
        event.keyCode = keyCode
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

function waitForElement(selector, callback) {
    function checkElement() {
        if (document.querySelector(selector)) {
            callback(document.querySelector(selector))
        } else {
            setTimeout(checkElement, 50)
        }
    }

    checkElement()
}