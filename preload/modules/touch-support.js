//onscreen touch controls + native scrollbars

const configOverrides = require('../util/configOverrides')

module.exports = () => {
    configOverrides.tectonicConfigOverrides.push({
        featureSwitches: {
            enableTouchSupport: true //native scrollbars
        }
    })

    window.addEventListener('load', () => {
        const touchKeyCodeMap = {
            'back':   27, //escape
            'select': 13, //enter
            'up':     38,
            'down':   40,
            'left':   37,
            'right':  39
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

            button.ontouchstart = () => simulateKeyDown(keyCode)
            button.ontouchend = () => simulateKeyUp(keyCode)

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
        })
    })
}