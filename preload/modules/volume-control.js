const functions = require('../util/functions');

module.exports = async () => {
    await functions.waitForCondition(() => !!document.body);

    let volumeTimeout;

    // Helper to create elements with attributes and children
    function el(tag, attrs = {}, children = []) {
        const element = document.createElement(tag)
        for (const [key, value] of Object.entries(attrs)) {
            if (key === 'className') {
                element.className = value;
            } else if (key === 'textContent') {
                element.textContent = value;
            } else if (key === 'style' && typeof value === 'object') {
                Object.assign(element.style, value)
            } else if (key.startsWith('data')) {
                element.setAttribute(key.replace(/([A-Z])/g, '-$1').toLowerCase(), value)
            } else {
                element.setAttribute(key, value)
            }
        }

        for (const child of children) {
            if (child) element.appendChild(child)
        }

        return element;
    }

    function createVolumeIndicatorDOM() {
        return el('div', { id: 'vt-volume-indicator' }, [
            el('div', { id: 'vt-volume-icon', className: 'vt-volume-icon' }),
            el('div', { className: 'vt-volume-bar-container' }, [
                el('div', { id: 'vt-volume-bar', className: 'vt-volume-bar' })
            ]),
            el('span', { id: 'vt-volume-text', className: 'vt-volume-text' })
        ]);
    }

    //create volume indicator
    const volumeIndicatorElement = createVolumeIndicatorDOM();
    document.body.appendChild(volumeIndicatorElement);

    function showVolumeIndicator(volume) {
        const indicator = document.getElementById('vt-volume-indicator');
        const bar = document.getElementById('vt-volume-bar');
        const text = document.getElementById('vt-volume-text');
        const icon = document.getElementById('vt-volume-icon');
        if (!indicator || !bar || !text || !icon) return;

        const volumePercent = Math.round(volume * 100);
        bar.style.width = `${volumePercent}%`;
        text.textContent = `${volumePercent}%`;

        // Update icon based on volume level
        if (volumePercent === 0) {
            icon.className = 'vt-volume-icon vt-volume-muted';
        } else if (volumePercent < 50) {
            icon.className = 'vt-volume-icon vt-volume-low';
        } else {
            icon.className = 'vt-volume-icon vt-volume-high';
        }

        indicator.classList.add('visible');

        clearTimeout(volumeTimeout);
        volumeTimeout = setTimeout(() => {
            indicator.classList.remove('visible');
        }, 1500);
    }

    // Volume controls
    document.addEventListener('keydown', (e) => {
        const overlay = document.getElementById('vt-settings-overlay-root');
        if (overlay && !overlay.classList.contains('vt-settings-hidden')) return;

        const video = document.querySelector('video');
        if (!video) return;

        let actionTaken = false;
        const volumeStep = 0.05;

        if (e.key === '+' || e.key === '=') {
            if (video.muted) video.muted = false;
            video.volume = Math.min(1, video.volume + volumeStep);
            actionTaken = true;
        } else if (e.key === '-') {
            if (video.muted) video.muted = false;
            video.volume = Math.max(0, video.volume - volumeStep);
            actionTaken = true;
        } else if (e.key.toLowerCase() === 'm') {
            video.muted = !video.muted;
            actionTaken = true;
        }

        if (actionTaken) {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            showVolumeIndicator(video.muted ? 0 : video.volume);
        }
    }, true);
};