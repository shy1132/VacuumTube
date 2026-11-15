const { ipcRenderer } = require('electron')
const configManager = require('../config')

module.exports = () => {
    let wakeKey = null; //the key that woke the screen only wakes it, so it is kept from leanback and the other modules
    let idleTimer = null;
    let isDimmed = false;

    const overlay = document.createElement('div')
    overlay.id = 'vt-screensaver-overlay'
    Object.assign(overlay.style, {
        position: 'fixed',
        top: '0',
        left: '0',
        width: '100vw',
        height: '100vh',
        backgroundColor: '#000000',
        opacity: '0',
        pointerEvents: 'none', //allow clicks to pass through
        zIndex: '2147483647', //on top of absolutely everything
        transition: 'opacity 0.6s ease-in-out'
    })

    if (document.documentElement) {
        document.documentElement.appendChild(overlay)
    } else {
        window.addEventListener('DOMContentLoaded', () => {
            document.documentElement.appendChild(overlay)
        })
    }

    function isVideoPlaying() {
        return [ ...document.querySelectorAll('.html5-video-player video') ].some((video) => !video.paused && !video.ended);
    }

    function undim() {
        if (isDimmed) {
            overlay.style.opacity = '0'
            isDimmed = false;
        }
    }

    function dim() {
        const config = configManager.get()
        if (!config.screensaver_enabled) return;

        if (isVideoPlaying()) {
            resetTimer();
            return;
        }

        const dimPercent = Math.max(0, Math.min(100, Number(config.screensaver_dim_percentage) || 75))
        overlay.style.opacity = String(dimPercent / 100);
        isDimmed = true;
    }

    function resetTimer() {
        undim()
        if (idleTimer) {
            clearTimeout(idleTimer)
            idleTimer = null;
        }

        const config = configManager.get()
        if (!config.screensaver_enabled) return;

        const timeoutMinutes = Number(config.screensaver_timeout) || 5;
        idleTimer = setTimeout(dim, timeoutMinutes * 60 * 1000)
    }

    const userEvents = [ 'mousemove', 'mousedown', 'wheel', 'touchstart', 'pointerdown' ]
    for (const eventName of userEvents) {
        window.addEventListener(eventName, resetTimer, { capture: true, passive: true })
    }

    window.addEventListener('keydown', (e) => {
        if (isDimmed || e.keyCode === wakeKey) {
            wakeKey = e.keyCode;
            e.preventDefault()
            e.stopImmediatePropagation()
        }

        resetTimer()
    }, true)

    window.addEventListener('keyup', (e) => {
        if (e.keyCode !== wakeKey) return;

        wakeKey = null;
        e.preventDefault()
        e.stopImmediatePropagation()
    }, true)

    window.addEventListener('blur', () => wakeKey = null)

    window.addEventListener('play', () => {
        undim()
        if (idleTimer) {
            clearTimeout(idleTimer)
            idleTimer = null;
        }
    }, true)

    window.addEventListener('playing', () => {
        undim()
        if (idleTimer) {
            clearTimeout(idleTimer)
            idleTimer = null;
        }
    }, true)

    window.addEventListener('pause', resetTimer, true)
    window.addEventListener('ended', resetTimer, true)

    ipcRenderer.on('config-update', () => {
        resetTimer()
    })

    resetTimer()
}