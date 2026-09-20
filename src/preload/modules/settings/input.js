//maps keyboard, controller and mouse events to overlay actions

const controller = require('../../util/controller')

const directions = {
    'ArrowUp': 'up',
    'ArrowDown': 'down',
    'ArrowLeft': 'left',
    'ArrowRight': 'right'
}

//leanback's key codes for controller buttons
const gamepadKeys = {
    32768: 'Enter',      //a
    32769: 'Escape',     //b
    32780: 'ArrowUp',    //dpad up
    32781: 'ArrowDown',  //dpad down
    32782: 'ArrowLeft',  //dpad left
    32783: 'ArrowRight', //dpad right

    32785: 'ArrowUp',    //left stick up
    32786: 'ArrowDown',  //left stick down
    32787: 'ArrowLeft',  //left stick left
    32788: 'ArrowRight'  //left stick right
}

/**
 * @param {object} actions - isOpen(), toggle(), close(), back(), move(direction), activate(node?)
 * @returns {{ markOpened: () => void }} - marks the open time, so the input that opened the overlay is ignored
 */
function listen(actions) {
    let openedAt = 0;

    const justOpened = () => (Date.now() - openedAt) < 100;

    const handleKey = (key) => {
        if (key === 'Escape' || key === 'Backspace') {
            actions.back()
        } else if (directions[key]) {
            actions.move(directions[key])
        } else if (key === 'Enter' || key === ' ') {
            actions.activate()
        }
    }

    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.key.toLowerCase() === 'o') {
            e.preventDefault()
            e.stopPropagation()
            actions.toggle()
        }
    }, true)

    //while the overlay is open every key is swallowed, otherwise leanback acts on it too
    for (const type of [ 'keydown', 'keyup' ]) {
        document.addEventListener(type, (e) => {
            if (!actions.isOpen()) return;

            e.preventDefault()
            e.stopPropagation()
            e.stopImmediatePropagation()

            if (type === 'keydown' && !justOpened()) handleKey(e.key)
        }, true)
    }

    document.addEventListener('click', (e) => {
        if (!actions.isOpen() || justOpened()) return;

        if (e.target.classList.contains('vt-settings-backdrop')) {
            actions.close()
            return;
        }

        const node = e.target.closest('#vt-settings-overlay-root .vt-focusable')
        if (node) actions.activate(node)
    }, true)

    controller.on('down', (e) => {
        if (!actions.isOpen() || justOpened()) return;

        const key = gamepadKeys[e.code]
        if (key) handleKey(key)
    })

    return { markOpened: () => { openedAt = Date.now() } };
}

module.exports = { listen }