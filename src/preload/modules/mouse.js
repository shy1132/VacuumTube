//various mouse controls to improve desktop usability

module.exports = () => {
    const BACK = 32769;

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

    //block scroll events (enableTouchSupport in touch-support.js adds native scrollbars, which messes with scrollwheel)
    window.addEventListener('wheel', (e) => {
        e.preventDefault()
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