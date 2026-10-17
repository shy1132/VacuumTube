//various mouse controls to improve desktop usability

const shortcuts = require('../util/shortcuts')

module.exports = () => {
    const BACK = 32769;
    const UP = 32780;
    const DOWN = 32781;
    const LEFT = 32782;
    const RIGHT = 32783;

    const wheelThrottle = 100;

    let visible = true;
    let lastUse = 0;

    const showCursor = () => {
        document.documentElement.style.cursor = 'default'
        visible = true;
    }

    const hideCursor = () => {
        document.documentElement.style.cursor = 'none'
        visible = false;
    }

    const mouseUsed = () => {
        lastUse = Date.now()
        showCursor()
    }

    const simulateKeyDown = (keyCode) => {
        let event = new Event('keydown')
        event.keyCode = keyCode;
        document.dispatchEvent(event)
    }

    const simulateKeyUp = (keyCode) => {
        let event = new Event('keyup')
        event.keyCode = keyCode;
        document.dispatchEvent(event)
    }

    const pressKey = (keyCode) => {
        simulateKeyDown(keyCode)
        simulateKeyUp(keyCode)
    }

    let wheelThrottled = false;

    //same as leanback's wheel handling, but better and less buggy for us
    window.addEventListener('wheel', (e) => {
        e.preventDefault()
        e.stopPropagation()

        if (shortcuts.isSettingsOpen() || wheelThrottled) return;

        let keyCode;
        if (e.deltaY) {
            keyCode = e.deltaY < 0 ? UP : DOWN;
        } else if (e.deltaX) {
            keyCode = e.deltaX < 0 ? LEFT : RIGHT; //leanback doesn't do horizontal scrolling at all by default, we do
        } else {
            return;
        }

        pressKey(keyCode)

        wheelThrottled = true;
        setTimeout(() => wheelThrottled = false, wheelThrottle)
    }, { passive: false, capture: true })

    //right click to go back
    window.addEventListener('mousedown', (e) => {
        if (e.button === 2) {
            simulateKeyDown(BACK)
            setTimeout(() => simulateKeyUp(BACK), 50)
        }
    })

    //make mouse disappear after a bit of no movement
    setInterval(() => {
        if (!visible) return;
        if ((Date.now() - lastUse) >= 3000) {
            hideCursor()
        }
    }, 20)

    window.addEventListener('pointermove', mouseUsed, true)
    window.addEventListener('pointerdown', mouseUsed, true)
    window.addEventListener('pointerup', mouseUsed, true)
}