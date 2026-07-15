const fs = require('fs')
const path = require('path')
const css = require('../../util/css')
const functions = require('../../util/functions')

module.exports = async () => {
    await functions.waitForCondition(() => !!document.body && !!document.head)

    // key-navigation injects its bundled stylesheet as soon as it is imported,
    // so it must not be required during document-start module discovery.
    const Keyboard = require('simple-keyboard').default
    const keyNavigation = require('simple-keyboard-key-navigation').default

    const baseStyle = fs.readFileSync(require.resolve('simple-keyboard/build/css/index.css'), 'utf-8')
    const style = fs.readFileSync(path.join(__dirname, 'style.css'), 'utf-8')
    css.inject('virtual-keyboard-base', baseStyle)
    css.inject('virtual-keyboard', style)

    const root = document.createElement('div')
    root.id = 'vt-virtual-keyboard-root'
    root.className = 'vt-keyboard-hidden'
    root.innerHTML = `
        <button id="vt-keyboard-trigger" type="button" tabindex="0" aria-label="Open QWERTY keyboard">
            <span class="vt-keyboard-trigger-icon">⌨</span>
            <span>QWERTY keyboard</span>
        </button>
        <div id="vt-keyboard-overlay" role="dialog" aria-label="QWERTY keyboard" aria-modal="true">
            <div class="vt-keyboard-heading">
                <span>QWERTY keyboard</span>
                <span class="vt-keyboard-hint">Back to close</span>
            </div>
            <div class="simple-keyboard"></div>
        </div>
    `
    document.body.appendChild(root)

    const trigger = root.querySelector('#vt-keyboard-trigger')
    const overlay = root.querySelector('#vt-keyboard-overlay')
    let keyboardOpen = false
    let dispatchingVirtualKey = false
    let language = 'english'

    const keyboard = new Keyboard({
        layout: {
            english: [
                'e t a o i n s h r',
                'd l c u m w f g y',
                'p b v k j x q z',
                '{shift} {language} {bksp} {space} {enter}'
            ],
            englishShift: [
                'E T A O I N S H R',
                'D L C U M W F G Y',
                'P B V K J X Q Z',
                '{shift} {language} {bksp} {space} {enter}'
            ],
            arabic: [
                'ا ل ي م و ن ر ت ب د',
                'ع ه س ف ق ك ح ج ش ط',
                'ص ض ذ ث خ ز ظ غ ة ى ء',
                '{language} {bksp} {space} {enter}'
            ]
        },
        layoutName: 'english',
        display: {
            '{bksp}': '⌫',
            '{enter}': 'Search',
            '{shift}': '⇧',
            '{space}': 'Space',
            '{language}': 'العربية'
        },
        enableKeyNavigation: true,
        modules: [keyNavigation],
        onKeyPress: handleVirtualKey
    })

    function isSearchPageActive() {
        const searchPage = document.querySelector('ytlr-search-page')
        if (searchPage) {
            return searchPage.classList.contains('zylon-focus') || searchPage.offsetParent !== null
        }

        return document.body.classList.contains('WEB_PAGE_TYPE_SEARCH')
            || location.hash.toLowerCase().includes('search')
    }

    function emitKey(key, code, keyCode) {
        dispatchingVirtualKey = true

        for (const type of ['keydown', 'keypress', 'keyup']) {
            if (type === 'keypress' && key.length > 1 && key !== 'Enter') continue;

            const event = new KeyboardEvent(type, {
                key,
                code,
                bubbles: true,
                cancelable: true
            })

            // Leanback still reads legacy keyCode/which in a few input paths.
            Object.defineProperty(event, 'keyCode', { get: () => keyCode })
            Object.defineProperty(event, 'which', { get: () => keyCode })
            document.dispatchEvent(event)
        }

        dispatchingVirtualKey = false
    }

    function emitText(text) {
        dispatchingVirtualKey = true

        const target = document.activeElement && document.activeElement !== document.body
            ? document.activeElement
            : document

        target.dispatchEvent(new KeyboardEvent('keydown', {
            key: text,
            code: 'Unidentified',
            bubbles: true,
            cancelable: true
        }))
        target.dispatchEvent(new CompositionEvent('compositionstart', { data: '', bubbles: true }))
        target.dispatchEvent(new CompositionEvent('compositionupdate', { data: text, bubbles: true }))
        target.dispatchEvent(new InputEvent('beforeinput', {
            data: text,
            inputType: 'insertText',
            bubbles: true,
            cancelable: true,
            composed: true
        }))
        target.dispatchEvent(new CompositionEvent('compositionend', { data: text, bubbles: true }))
        target.dispatchEvent(new InputEvent('input', {
            data: text,
            inputType: 'insertText',
            bubbles: true,
            composed: true
        }))
        target.dispatchEvent(new KeyboardEvent('keyup', {
            key: text,
            code: 'Unidentified',
            bubbles: true,
            cancelable: true
        }))

        dispatchingVirtualKey = false
    }

    function sendLeanbackAction(action, value) {
        const leanbackKeyboard = document.querySelector('ytlr-search-keyboard')?.__instance
        if (typeof leanbackKeyboard?.Ac !== 'function') return false;

        const key = { action }
        if (value !== undefined) {
            key.value = value
            key.label = value
        }

        leanbackKeyboard.Ac(key)
        return true;
    }

    function handleVirtualKey(button) {
        if (button === '{shift}') {
            const nextLayout = keyboard.options.layoutName === 'englishShift' ? 'english' : 'englishShift'
            keyboard.setOptions({ layoutName: nextLayout })
            return;
        }

        if (button === '{language}') {
            language = language === 'english' ? 'arabic' : 'english'
            keyboard.setOptions({
                layoutName: language,
                rtl: language === 'arabic',
                display: {
                    ...keyboard.options.display,
                    '{language}': language === 'english' ? 'العربية' : 'English',
                    '{space}': language === 'english' ? 'Space' : 'مسافة',
                    '{enter}': language === 'english' ? 'Search' : 'بحث'
                }
            })
            return;
        }

        if (button === '{bksp}') {
            if (!sendLeanbackAction('BACKSPACE')) emitKey('Backspace', 'Backspace', 8)
        } else if (button === '{space}') {
            if (!sendLeanbackAction('SPACE')) emitKey(' ', 'Space', 32)
        } else if (button === '{enter}') {
            if (!sendLeanbackAction('SEARCH')) emitKey('Enter', 'Enter', 13)
            closeKeyboard()
        } else {
            if (!sendLeanbackAction('TEXT', button)) {
                if (/[^\x00-\x7F]/.test(button)) {
                    emitText(button)
                } else {
                    const upper = button.toUpperCase()
                    emitKey(button, `Key${upper}`, upper.charCodeAt(0))
                }
            }
        }
    }

    function openKeyboard() {
        if (!isSearchPageActive()) return;

        keyboardOpen = true
        root.classList.add('vt-keyboard-open')
        keyboard.setOptions({ layoutName: language })
        keyboard.modules.keyNavigation.init()
        overlay.focus({ preventScroll: true })
    }

    function closeKeyboard() {
        keyboardOpen = false
        root.classList.remove('vt-keyboard-open')
        trigger.focus({ preventScroll: true })
    }

    trigger.addEventListener('click', openKeyboard)
    trigger.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            e.stopImmediatePropagation()
            openKeyboard()
        }
    }, true)

    window.vtFocusVirtualKeyboardTrigger = () => {
        if (!isSearchPageActive() || keyboardOpen) return;
        trigger.focus({ preventScroll: true })
    }

    document.addEventListener('keydown', (e) => {
        if (dispatchingVirtualKey) return;

        if (!keyboardOpen) {
            // Tab provides a deterministic keyboard/controller-remapper route to
            // the explicit trigger without opening the keyboard automatically.
            if (isSearchPageActive() && e.key === 'Tab') {
                e.preventDefault()
                e.stopImmediatePropagation()
                trigger.focus({ preventScroll: true })
            }
            return;
        }

        const navigation = keyboard.modules.keyNavigation
        if (e.key === 'ArrowUp') navigation.up()
        else if (e.key === 'ArrowDown') navigation.down()
        else if (e.key === 'ArrowLeft') navigation.left()
        else if (e.key === 'ArrowRight') navigation.right()
        else if (e.key === 'Enter') navigation.press()
        else if (e.key === 'Escape') closeKeyboard()
        else return;

        e.preventDefault()
        e.stopPropagation()
        e.stopImmediatePropagation()
    }, true)

    function updateVisibility() {
        const searchActive = isSearchPageActive()
        root.classList.toggle('vt-keyboard-hidden', !searchActive)

        if (!searchActive && keyboardOpen) {
            keyboardOpen = false
            root.classList.remove('vt-keyboard-open')
        }
    }

    window.addEventListener('hashchange', updateVisibility)
    setInterval(updateVisibility, 500)
    updateVisibility()
}
