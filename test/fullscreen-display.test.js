const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const test = require('node:test')
const { EventEmitter } = require('node:events')
const { createFullscreenDisplay } = require('../src/fullscreen-display')

function setup({ id = 2, platform = 'win32', maximized = false } = {}) {
    const calls = []
    let fullscreen = false;
    const display = { id: 2, workArea: { x: -800, y: -600, width: 800, height: 600 } }
    let bounds = { x: 0, y: 0, width: 1200, height: 700 };
    const win = Object.assign(new EventEmitter(), {
        isFullScreen: () => fullscreen,
        isMaximized: () => maximized,
        unmaximize: () => { calls.push('unmaximize'); maximized = false },
        maximize: () => { calls.push('maximize'); maximized = true },
        getBounds: () => ({ ...bounds }),
        getNormalBounds: () => ({ ...bounds }),
        getContentSize: () => [1184, 661],
        setBounds: (value) => { calls.push(value); bounds = { ...value } },
        setFullScreen: (value) => { calls.push(value); fullscreen = value }
    })
    let enumerations = 0;
    const controller = createFullscreenDisplay({
        platform, getDisplayId: () => id, getWindow: () => win,
        screen: { getAllDisplays: () => { enumerations++; return [display] } }
    })
    return { controller, calls, display, win, enumerations: () => enumerations };
}

test('moves within a small negative-coordinate display before entering fullscreen', () => {
    const { controller, calls, display } = setup({ maximized: true })
    controller.setFullscreen(true)
    assert.equal(calls[0], 'unmaximize')
    const bounds = calls[1]
    assert.ok(bounds.x >= display.workArea.x)
    assert.ok(bounds.y >= display.workArea.y)
    assert.ok(bounds.x + bounds.width <= 0)
    assert.ok(bounds.y + bounds.height <= 0)
    assert.equal(calls[2], true)
    controller.setFullscreen(false)
    assert.equal(calls.length, 4)
    assert.equal(calls[3], false)
})

test('default, disconnected, invalid and other-platform preferences keep native behavior', () => {
    for (const options of [{ id: null }, { id: 9 }, { id: '2' }, { platform: 'linux' }, { platform: 'darwin' }]) {
        const { controller, calls } = setup(options)
        controller.setFullscreen(true)
        assert.deepEqual(calls, [true])
        controller.onInput({ preventDefault: () => assert.fail('must keep native F11') }, { key: 'F11', type: 'keyDown' })
        assert.deepEqual(calls, [true])
    }
})

test('F11 toggles once, blocks native repeat, and ignores modified keys without enumerating', () => {
    const { controller, calls, enumerations } = setup()
    const event = { preventDefault() {} }
    controller.onInput(event, { key: 'a', type: 'keyDown' })
    controller.onInput(event, { key: 'F11', type: 'keyDown', control: true })
    assert.equal(enumerations(), 0)
    controller.onInput(event, { key: 'F11', type: 'keyDown' })
    assert.equal(calls.at(-1), true)
    const count = calls.length;
    controller.onInput(event, { key: 'F11', type: 'keyDown', isAutoRepeat: true })
    controller.onInput(event, { key: 'F11', type: 'keyUp' })
    assert.equal(calls.length, count)
    controller.onInput(event, { key: 'F11', type: 'keyDown' })
    assert.equal(calls.at(-1), false)
})

test('display page uses buttons and saves only the chosen preference', async () => {
    const writes = []
    const module = { exports: {} }
    vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../src/preload/modules/settings/pages/fullscreen-display.js'), 'utf8'), {
        module,
        require: (name) => name === 'electron' ? {
            ipcRenderer: { invoke: async (channel) => {
                assert.equal(channel, 'get-fullscreen-displays')
                return [{ id: 2, label: 'Projector', size: { width: 800, height: 600 } }];
            } }
        } : { set: (value) => writes.push(value.fullscreen_display) }
    })
    const locale = require('../locale/en.json').settings;
    const rows = await module.exports.rows({ fullscreen_display: 2 }, locale)
    assert.equal(rows.length, 2)
    assert.equal(rows[0].type, 'button')
    assert.match(rows[1].title, /Projector.*Selected/)
    rows[0].run()
    rows[1].run()
    assert.deepEqual(writes, [null, 2])
})


test('restores bounds and maximization only after fullscreen has exited', () => {
    for (const maximized of [false, true]) {
        const { controller, win } = setup({ maximized })
        const originalBounds = win.getNormalBounds()
        controller.setFullscreen(true)
        assert.equal(win.isMaximized(), false)
        assert.notDeepEqual(win.getBounds(), originalBounds)
        controller.setFullscreen(false)
        assert.notDeepEqual(win.getBounds(), originalBounds)
        win.emit('leave-full-screen')
        assert.deepEqual(win.getBounds(), originalBounds)
        assert.equal(win.isMaximized(), maximized)
        assert.equal(win.listenerCount('leave-full-screen'), 0)
    }
})

test('native fullscreen exit restores state and later entries capture fresh bounds', () => {
    const { controller, win } = setup()
    for (const x of [100, 250]) {
        const originalBounds = { x, y: 50, width: 900, height: 536 }
        win.setBounds(originalBounds)
        controller.setFullscreen(true)
        controller.setFullscreen(true) //Repeated entry must not replace the saved bounds.
        assert.equal(win.listenerCount('leave-full-screen'), 1)
        win.setFullScreen(false) //Exit without calling the controller (e.g. native F11).
        win.emit('leave-full-screen')
        assert.deepEqual(win.getBounds(), originalBounds)
        assert.equal(win.isMaximized(), false)
    }
})
