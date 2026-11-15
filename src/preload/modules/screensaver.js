const { ipcRenderer } = require('electron');
const configManager = require('../config');

module.exports = () => {
    let idleTimer = null;
    let isDimmed = false;

    // Create the dimming overlay element
    const overlay = document.createElement('div');
    overlay.id = 'vt-screensaver-overlay';
    Object.assign(overlay.style, {
        position: 'fixed',
        top: '0',
        left: '0',
        width: '100vw',
        height: '100vh',
        backgroundColor: '#000000',
        opacity: '0',
        pointerEvents: 'none', // Allows user clicks to pass through
        zIndex: '2147483647',   // Sits on top of the YouTube TV UI
        transition: 'opacity 0.6s ease-in-out'
    });

    if (document.documentElement) {
        document.documentElement.appendChild(overlay);
    } else {
        window.addEventListener('DOMContentLoaded', () => {
            document.documentElement.appendChild(overlay);
        });
    }

    function isVideoPlaying() {
        const video = document.querySelector('video');
        return Boolean(video && !video.paused && !video.ended && video.readyState > 2);
    }

    function undim() {
        if (isDimmed) {
            overlay.style.opacity = '0';
            isDimmed = false;
        }
    }

    function dim() {
        const config = configManager.get();
        if (!config.screensaver_enabled) return;

        // If a video is actively playing, cancel dimming
        if (isVideoPlaying()) {
            resetTimer();
            return;
        }

        const dimPercent = Math.max(0, Math.min(100, Number(config.screensaver_dim_percentage) || 75));
        overlay.style.opacity = String(dimPercent / 100);
        isDimmed = true;
    }

    function resetTimer() {
        undim();
        if (idleTimer) {
            clearTimeout(idleTimer);
            idleTimer = null;
        }

        const config = configManager.get();
        if (!config.screensaver_enabled) return;

        const timeoutMinutes = Number(config.screensaver_timeout) || 5;
        const timeoutMs = timeoutMinutes * 60 * 1000;

        idleTimer = setTimeout(dim, timeoutMs);
    }

    // Reset inactivity timer on any user interaction (keyboard, mouse, touch, or gamepad)
    const userEvents = ['keydown', 'mousemove', 'mousedown', 'wheel', 'touchstart', 'pointerdown'];
    for (const eventName of userEvents) {
        window.addEventListener(eventName, resetTimer, { capture: true, passive: true });
    }

    // Wake or pause the timer based on media state
    window.addEventListener('play', () => {
        undim();
        if (idleTimer) {
            clearTimeout(idleTimer);
            idleTimer = null;
        }
    }, true);

    window.addEventListener('playing', () => {
        undim();
        if (idleTimer) {
            clearTimeout(idleTimer);
            idleTimer = null;
        }
    }, true);

    window.addEventListener('pause', resetTimer, true);
    window.addEventListener('ended', resetTimer, true);

    // Re-evaluate immediately if the user updates settings in real-time
    ipcRenderer.on('config-update', () => {
        resetTimer();
    });

    // Start timer on initial load
    resetTimer();
};
