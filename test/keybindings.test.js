const assert = require('node:assert/strict')
const { EventEmitter } = require('node:events')
const Module = require('node:module')
const path = require('node:path')
const test = require('node:test')

const config = {}
const controller = new EventEmitter()
const originalLoad = Module._load
const originalWindow = global.window
let keyboardListener;

global.window = {
    addEventListener(type, listener) {
        if (type === 'keydown') keyboardListener = listener;
    }
}

Module._load = function (request, parent, ...rest) {
    if (request === '../config' && parent?.filename.endsWith(path.join('util', 'keybindings.js'))) {
        return { get: () => config };
    }
    if (request === './controller' && parent?.filename.endsWith(path.join('util', 'keybindings.js'))) {
        return controller;
    }

    return originalLoad.call(this, request, parent, ...rest);
}

const keybindings = require('../src/preload/util/keybindings')
Module._load = originalLoad
if (originalWindow === undefined) {
    delete global.window;
} else {
    global.window = originalWindow;
}

test.afterEach(() => {
    keybindings.cancelCapture()
    delete config.keyboard_bindings;
    delete config.controller_bindings;
})

test('matches the default keyboard shortcuts and modifiers', () => {
    assert.equal(keybindings.keyboardMatches({
        code: 'KeyM', key: 'm', ctrlKey: false, altKey: false, shiftKey: false, metaKey: false
    }, 'mute'), true)
    assert.equal(keybindings.keyboardMatches({
        code: 'KeyM', key: 'm', ctrlKey: true, altKey: false, shiftKey: false, metaKey: false
    }, 'mute'), false)
    assert.equal(keybindings.keyboardMatches({
        code: 'KeyC', key: 'C', ctrlKey: true, altKey: false, shiftKey: true, metaKey: false
    }, 'copy_video_url'), true)
})

test('custom keyboard bindings replace the defaults and can be disabled', () => {
    config.keyboard_bindings = {
        mute: { code: 'KeyQ', key: 'q', ctrl: false, alt: false, shift: false, meta: false }
    }

    assert.equal(keybindings.keyboardMatches({
        code: 'KeyQ', ctrlKey: false, altKey: false, shiftKey: false, metaKey: false
    }, 'mute'), true)
    assert.equal(keybindings.keyboardMatches({
        code: 'KeyM', ctrlKey: false, altKey: false, shiftKey: false, metaKey: false
    }, 'mute'), false)

    config.keyboard_bindings.mute = null;
    assert.equal(keybindings.keyboardMatches({ code: 'KeyQ' }, 'mute'), false)
})

test('controller bindings retain defaults and resolve customized inputs', () => {
    for (const actionId of [ 'volume_up', 'volume_down', 'mute', 'speed_toggle', 'speed_down', 'speed_up' ]) {
        assert.equal(keybindings.getControllerBinding(actionId), null)
    }
    assert.equal(keybindings.controllerAction(32772), 'previous_video')
    assert.equal(keybindings.controllerAction(32773), 'next_video')
    assert.equal(keybindings.controllerAction(32774), 'seek_backward')
    assert.equal(keybindings.controllerAction(32775), 'seek_forward')
    assert.equal(keybindings.controllerAction(32779), 'open_settings')
    config.controller_bindings = { volume_down: 32770 }
    assert.equal(keybindings.controllerAction(32770), 'volume_down')
})

test('controller capture claims the input before other listeners handle it', () => {
    let captured = null;
    keybindings.startCapture('controller', (code) => { captured = code })
    const event = { code: 32770 }
    controller.emit('down', event)

    assert.equal(event.capturedByKeybindings, true)
    assert.equal(captured, 32770)
    assert.equal(keybindings.isCapturing(), false)
})

test('keyboard capture stores a shortcut or clears it with Backspace', () => {
    let captured = undefined;
    const event = {
        key: 'q',
        code: 'KeyQ',
        ctrlKey: true,
        altKey: false,
        shiftKey: true,
        metaKey: false,
        repeat: false,
        preventDefault() {},
        stopPropagation() {},
        stopImmediatePropagation() {}
    }

    keybindings.startCapture('keyboard', (binding) => { captured = binding })
    keyboardListener(event)
    assert.deepEqual(captured, {
        code: 'KeyQ',
        key: 'q',
        ctrl: true,
        alt: false,
        shift: true,
        meta: false
    })

    keybindings.startCapture('keyboard', (binding) => { captured = binding })
    keyboardListener({
        key: 'Backspace',
        preventDefault() {},
        stopPropagation() {},
        stopImmediatePropagation() {}
    })
    assert.equal(captured, null)
})
