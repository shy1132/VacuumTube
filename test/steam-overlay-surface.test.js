const test = require('node:test')
const assert = require('node:assert/strict')

const {
    CANVAS_ID,
    getSurfaceSize,
    createSteamOverlayCompatibilitySurface
} = require('../src/preload/util/steamOverlayCompatibilitySurface')
const { runSteamOverlayCompatibilityModule } = require('../src/preload/modules/steam-overlay-compatibility')

test('steam overlay surface sizes itself to device pixels', () => {
    assert.deepEqual(getSurfaceSize({
        innerWidth: 640,
        innerHeight: 360,
        devicePixelRatio: 1.5
    }), {
        width: 960,
        height: 540
    })
})

test('steam overlay surface starts and stops a transparent animation layer', () => {
    const env = createFakeDomEnvironment()
    const surface = createSteamOverlayCompatibilitySurface(env.window, env.document)

    assert.equal(surface.isRunning(), false)
    assert.equal(surface.start(), true)

    const canvas = surface.getCanvas()
    assert.equal(surface.isRunning(), true)
    assert.equal(canvas.id, CANVAS_ID)
    assert.equal(canvas.attributes['aria-hidden'], 'true')
    assert.equal(canvas.style.pointerEvents, 'none')
    assert.equal(canvas.style.position, 'fixed')
    assert.equal(canvas.width, 1600)
    assert.equal(canvas.height, 900)
    assert.equal(env.document.body.children.includes(canvas), true)
    assert.equal(env.window.listenerCount('resize'), 1)
    assert.equal(env.window.queuedFrames.length, 1)

    env.window.flushAnimationFrame()

    assert.deepEqual(canvas.context.calls.slice(0, 2), [
        ['clearRect', 0, 0, 2, 2],
        ['fillRect', 0, 0, 2, 2]
    ])
    assert.equal(env.window.queuedFrames.length, 1)

    assert.equal(surface.stop(), true)
    assert.equal(surface.isRunning(), false)
    assert.equal(canvas.removed, true)
    assert.equal(env.window.listenerCount('resize'), 0)
    assert.equal(env.window.cancelledFrames.length, 1)
})

test('steam overlay surface is a no-op when started twice or stopped twice', () => {
    const env = createFakeDomEnvironment()
    const surface = createSteamOverlayCompatibilitySurface(env.window, env.document)

    assert.equal(surface.start(), true)
    assert.equal(surface.start(), false)
    assert.equal(env.document.body.children.length, 1)
    assert.equal(surface.stop(), true)
    assert.equal(surface.stop(), false)
})

test('steam overlay renderer module does not start outside Windows when config is manually enabled', async () => {
    const env = createFakeDomEnvironment()
    const ipcRenderer = createFakeIpcRenderer()
    const surface = createFakeSurface()

    const loaded = await runSteamOverlayCompatibilityModule({
        platform: 'linux',
        ipcRenderer,
        configManager: {
            get: () => ({ steam_overlay_compatibility: true })
        },
        waitForCondition: async () => {},
        createSurface: () => surface,
        win: env.window,
        doc: env.document
    })

    assert.equal(loaded, false)
    assert.equal(surface.started, 0)
    assert.equal(ipcRenderer.listenerCount('config-update'), 0)
    assert.equal(env.window.listenerCount('beforeunload'), 0)
})

test('steam overlay renderer module starts on Windows when config is enabled', async () => {
    const env = createFakeDomEnvironment()
    const ipcRenderer = createFakeIpcRenderer()
    const surface = createFakeSurface()

    const loaded = await runSteamOverlayCompatibilityModule({
        platform: 'win32',
        ipcRenderer,
        configManager: {
            get: () => ({ steam_overlay_compatibility: true })
        },
        waitForCondition: async () => {},
        createSurface: () => surface,
        win: env.window,
        doc: env.document
    })

    assert.equal(loaded, true)
    assert.equal(surface.started, 1)
    assert.equal(ipcRenderer.listenerCount('config-update'), 1)
    assert.equal(env.window.listenerCount('beforeunload'), 1)
})

function createFakeDomEnvironment() {
    const listeners = new Map()
    const queuedFrames = []
    const cancelledFrames = []

    const window = {
        innerWidth: 800,
        innerHeight: 450,
        devicePixelRatio: 2,
        queuedFrames,
        cancelledFrames,
        requestAnimationFrame(callback) {
            const id = queuedFrames.length + cancelledFrames.length + 1
            queuedFrames.push({ id, callback })
            return id;
        },
        cancelAnimationFrame(id) {
            cancelledFrames.push(id)
        },
        addEventListener(name, handler) {
            const handlers = listeners.get(name) || []
            handlers.push(handler)
            listeners.set(name, handlers)
        },
        removeEventListener(name, handler) {
            const handlers = listeners.get(name) || []
            listeners.set(name, handlers.filter((item) => item !== handler))
        },
        listenerCount(name) {
            return (listeners.get(name) || []).length;
        },
        flushAnimationFrame() {
            const frame = queuedFrames.shift()
            if (frame) frame.callback()
        }
    }

    const document = {
        body: createParentNode(),
        documentElement: createParentNode(),
        createElement(tagName) {
            assert.equal(tagName, 'canvas')
            return createCanvas()
        }
    }

    return { window, document }
}

function createParentNode() {
    return {
        children: [],
        appendChild(node) {
            this.children.push(node)
            node.parentNode = this;
        }
    }
}

function createCanvas() {
    return {
        id: '',
        style: {},
        attributes: {},
        removed: false,
        width: 0,
        height: 0,
        context: createCanvasContext(),
        setAttribute(name, value) {
            this.attributes[name] = value;
        },
        getContext(kind, options) {
            assert.equal(kind, '2d')
            assert.deepEqual(options, {
                alpha: true,
                desynchronized: true
            })

            return this.context;
        },
        remove() {
            this.removed = true;
            if (this.parentNode) {
                this.parentNode.children = this.parentNode.children.filter((node) => node !== this)
            }
        }
    }
}

function createCanvasContext() {
    return {
        calls: [],
        fillStyle: null,
        clearRect(...args) {
            this.calls.push(['clearRect', ...args])
        },
        fillRect(...args) {
            this.calls.push(['fillRect', ...args])
        }
    }
}

function createFakeIpcRenderer() {
    const listeners = new Map()

    return {
        on(name, handler) {
            const handlers = listeners.get(name) || []
            handlers.push(handler)
            listeners.set(name, handlers)
        },
        removeListener(name, handler) {
            const handlers = listeners.get(name) || []
            listeners.set(name, handlers.filter((item) => item !== handler))
        },
        listenerCount(name) {
            return (listeners.get(name) || []).length;
        }
    }
}

function createFakeSurface() {
    return {
        started: 0,
        stopped: 0,
        start() {
            this.started++;
        },
        stop() {
            this.stopped++;
        }
    }
}
