const configManager = require('../config')
const controller = require('./controller')

const actions = [
    { id: 'volume_up', key: { code: 'Equal', keys: [ '=', '+' ], keyCodes: [ 187 ], ctrl: false, alt: false, meta: false }, keyCode: 16002 },
    { id: 'volume_down', key: { code: 'Minus', keys: [ '-' ], keyCodes: [ 189 ], ctrl: false, alt: false, meta: false }, keyCode: 16001 },
    { id: 'mute', key: { code: 'KeyM', keys: [ 'm' ], keyCodes: [ 77 ], ctrl: false, alt: false, meta: false }, keyCode: 16000 },
    { id: 'speed_toggle', key: { code: 'KeyS', keys: [ 's' ], keyCodes: [ 83 ], ctrl: false, alt: false, meta: false }, keyCode: 16003 },
    { id: 'speed_down', key: { code: 'KeyA', keys: [ 'a' ], keyCodes: [ 65 ], ctrl: false, alt: false, meta: false }, keyCode: 16004 },
    { id: 'speed_up', key: { code: 'KeyD', keys: [ 'd' ], keyCodes: [ 68 ], ctrl: false, alt: false, meta: false }, keyCode: 16005 },
    { id: 'previous_video', controller: 32772, keyCode: 32772 },
    { id: 'next_video', controller: 32773, keyCode: 32773 },
    { id: 'seek_backward', controller: 32774, keyCode: 32774 },
    { id: 'seek_forward', controller: 32775, keyCode: 32775 },
    { id: 'captions', key: { code: 'KeyC', keys: [ 'c' ], keyCodes: [ 67 ], ctrl: false, alt: false, shift: false, meta: false }, keyCode: 16006 },
    { id: 'remaining_time', key: { code: 'KeyR', keys: [ 'r' ], keyCodes: [ 82 ], ctrl: false, alt: false, meta: false }, keyCode: 16007 },
    {
        id: 'copy_video_url',
        key: { code: 'KeyC', keys: [ 'c' ], keyCodes: [ 67 ], ctrl: true, alt: false, shift: true, meta: false },
        keyCode: 16008
    },
    {
        id: 'open_settings',
        key: { code: 'KeyO', keys: [ 'o' ], keyCodes: [ 79 ], ctrl: true, alt: false, meta: false },
        controller: 32779,
        keyCode: 16009
    }
]

let capture = null;

function own(object, key) {
    return Object.prototype.hasOwnProperty.call(object, key);
}

function getConfigBindings(name) {
    const bindings = configManager.get()[name]
    return bindings && typeof bindings === 'object' && !Array.isArray(bindings) ? bindings : {};
}

function getKeyboardBinding(actionId) {
    const action = actions.find((entry) => entry.id === actionId)
    if (!action) return null;

    const bindings = getConfigBindings('keyboard_bindings')
    if (own(bindings, actionId)) {
        const binding = bindings[actionId]
        return binding && typeof binding.code === 'string' ? binding : null;
    }
    return action.key || null;
}

function getControllerBinding(actionId) {
    const action = actions.find((entry) => entry.id === actionId)
    if (!action) return null;

    const bindings = getConfigBindings('controller_bindings')
    if (own(bindings, actionId)) return bindings[actionId];
    return action.controller ?? null;
}

function keyboardMatches(event, actionId) {
    const binding = getKeyboardBinding(actionId)
    if (!binding || typeof binding !== 'object' || typeof binding.code !== 'string') return false;
    if (event.code) {
        if (event.code !== binding.code) return false;
    } else if (!binding.keys?.includes(String(event.key || '').toLowerCase()) && !binding.keyCodes?.includes(event.keyCode)) {
        return false;
    }

    for (const modifier of [ 'ctrl', 'alt', 'shift', 'meta' ]) {
        if (binding[modifier] !== undefined && !!event[`${modifier}Key`] !== binding[modifier]) return false;
    }

    return true;
}

function controllerMatches(event, actionId) {
    const action = actions.find((entry) => entry.id === actionId)
    return !!action && event.keyCode === action.keyCode;
}

function controllerAction(code) {
    return actions.find((action) => getControllerBinding(action.id) === code)?.id || null;
}

function displayKeyboardBinding(actionId) {
    const binding = getKeyboardBinding(actionId)
    if (!binding) return 'Unassigned';

    const modifiers = [ 'ctrl', 'alt', 'shift', 'meta' ]
        .filter((modifier) => binding[modifier])
        .map((modifier) => modifier === 'ctrl' ? 'Ctrl' : modifier[0].toUpperCase() + modifier.slice(1))
    const key = binding.key === ' ' ? 'Space' : binding.key || binding.code?.replace(/^(Key|Digit)/, '') || 'Unassigned'
    return [ ...modifiers, key ].join('+');
}

function displayControllerBinding(actionId) {
    const code = getControllerBinding(actionId)
    if (!Number.isInteger(code)) return 'Unassigned';

    const input = code - 32768
    return input < 16 ? `Button ${input + 1}` : `Controller input ${input}`;
}

function handleCaptureKey(event) {
    if (!capture) return;

    event.preventDefault()
    event.stopPropagation()
    event.stopImmediatePropagation()

    if (event.key === 'Escape') {
        const previous = capture;
        capture = null;
        previous.onCancel?.()
        return;
    }

    if (event.key === 'Backspace') {
        const previous = capture;
        capture = null;
        previous.onCapture(null)
        return;
    }

    if (capture.type !== 'keyboard' || event.repeat || !event.code) return;
    if ([ 'Control', 'Alt', 'Shift', 'Meta' ].includes(event.key)) return;

    const previous = capture;
    capture = null;
    previous.onCapture({
        code: event.code,
        key: event.key,
        ctrl: event.ctrlKey,
        alt: event.altKey,
        shift: event.shiftKey,
        meta: event.metaKey
    })
}

if (typeof window !== 'undefined') {
    window.addEventListener('keydown', handleCaptureKey, true)
}

controller.on('down', (event) => {
    if (capture?.type !== 'controller') return;

    event.capturedByKeybindings = true;
    const previous = capture;
    capture = null;
    previous.onCapture(event.code)
})

function startCapture(type, onCapture, onCancel) {
    capture = { type, onCapture, onCancel }
}

function cancelCapture() {
    capture = null;
}

module.exports = {
    actions,
    keyboardMatches,
    controllerMatches,
    controllerAction,
    getKeyboardBinding,
    getControllerBinding,
    displayKeyboardBinding,
    displayControllerBinding,
    startCapture,
    cancelCapture,
    isCapturing: () => capture !== null
}
