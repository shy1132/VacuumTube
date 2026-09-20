const CANVAS_ID = 'vt-steam-overlay-compatibility-surface'

const canvasStyle = Object.freeze({
    position: 'fixed',
    inset: '0',
    width: '100vw',
    height: '100vh',
    pointerEvents: 'none',
    background: 'transparent',
    zIndex: '2147483647',
    contain: 'strict',
    transform: 'translateZ(0)',
    willChange: 'transform'
})

function getSurfaceSize(win) {
    const pixelRatio = Math.max(1, Number(win.devicePixelRatio) || 1)
    const width = Math.max(1, Math.ceil((Number(win.innerWidth) || 1) * pixelRatio))
    const height = Math.max(1, Math.ceil((Number(win.innerHeight) || 1) * pixelRatio))

    return { width, height }
}

function createSteamOverlayCompatibilitySurface(win = window, doc = document) {
    let canvas = null;
    let context = null;
    let animationId = null;
    let frame = 0;

    function resize() {
        if (!canvas) return;

        const { width, height } = getSurfaceSize(win)
        if (canvas.width !== width) canvas.width = width;
        if (canvas.height !== height) canvas.height = height;
    }

    function draw() {
        if (!canvas || !context) return;

        resize()

        const alpha = frame % 2 === 0 ? '0.001' : '0.003'
        context.clearRect(0, 0, 2, 2)
        context.fillStyle = `rgba(0, 0, 0, ${alpha})`
        context.fillRect(0, 0, 2, 2)

        frame++;
        animationId = win.requestAnimationFrame(draw)
    }

    function start() {
        if (canvas) return false;

        const parent = doc.body || doc.documentElement;
        if (!parent) return false;

        canvas = doc.createElement('canvas')
        canvas.id = CANVAS_ID;
        canvas.setAttribute('aria-hidden', 'true')
        Object.assign(canvas.style, canvasStyle)

        context = canvas.getContext('2d', {
            alpha: true,
            desynchronized: true
        })

        if (!context) {
            canvas.remove()
            canvas = null;
            return false;
        }

        resize()
        parent.appendChild(canvas)
        win.addEventListener('resize', resize)
        animationId = win.requestAnimationFrame(draw)

        return true;
    }

    function stop() {
        if (!canvas) return false;

        if (animationId !== null) {
            win.cancelAnimationFrame(animationId)
            animationId = null;
        }

        win.removeEventListener('resize', resize)
        canvas.remove()
        canvas = null;
        context = null;

        return true;
    }

    function isRunning() {
        return !!canvas;
    }

    function getCanvas() {
        return canvas;
    }

    return {
        start,
        stop,
        isRunning,
        getCanvas
    }
}

module.exports = {
    CANVAS_ID,
    getSurfaceSize,
    createSteamOverlayCompatibilitySurface
}
