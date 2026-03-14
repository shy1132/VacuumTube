const fs = require('fs')
const path = require('path')
const rcMod = require('../../util/resolveCommandModifiers')
const css = require('../../util/css')
const functions = require('../../util/functions')
const configManager = require('../../config')

const config = configManager.get()

module.exports = async () => {
    const el = functions.el;

    await functions.waitForCondition(() => !!document.body)

    const cssPath = path.join(__dirname, 'style.css')
    const text = fs.readFileSync(cssPath, 'utf-8')

    css.inject('volume-control', text)

    let volume = config.volume || 100;
    let muted = false;
    let volumeTimeout;

    function createVolumeIndicator() {
        return el('div', { id: 'vt-volume-indicator' }, [
            el('div', { id: 'vt-volume-icon', className: 'vt-volume-icon' }),
            el('div', { className: 'vt-volume-bar-container' }, [
                el('div', { id: 'vt-volume-bar', className: 'vt-volume-bar' })
            ]),
            el('span', { id: 'vt-volume-text', className: 'vt-volume-text' })
        ]);
    }

    const volumeIndicatorElement = createVolumeIndicator()
    document.body.appendChild(volumeIndicatorElement)

    function showVolumeIndicator() {
        const indicator = document.getElementById('vt-volume-indicator')
        const bar = document.getElementById('vt-volume-bar')
        const text = document.getElementById('vt-volume-text')
        const icon = document.getElementById('vt-volume-icon')
        if (!indicator || !bar || !text || !icon) return;

        let userFacingVolume = muted ? 0 : volume;

        bar.style.width = `${userFacingVolume}%`
        text.textContent = `${userFacingVolume}%`

        //update icon based on volume level
        if (volume === 0 || muted) {
            icon.className = 'vt-volume-icon vt-volume-muted'
        } else if (volume <= 50) {
            icon.className = 'vt-volume-icon vt-volume-low'
        } else {
            icon.className = 'vt-volume-icon vt-volume-high'
        }

        indicator.classList.add('visible')

        clearTimeout(volumeTimeout)
        volumeTimeout = setTimeout(() => {
            indicator.classList.remove('visible')
        }, 1500)
    }

    function setVolume(interval) {
        if (interval && config.volume !== volume) {
            configManager.set({ volume })
        }

        let players = document.querySelectorAll('.html5-video-player')
        for (let player of players) {
            if (!player?.setVolume) continue;

            if (muted) {
                player.setVolume(0)
            } else {
                player.setVolume(volume)
            }
        }
    }

    function isWatching() {
        let isShort = !!document.querySelector('ytlr-shorts-page')?.classList?.contains('zylon-focus')
        if (isShort) { //very dumb, don't like it, but there doesn't seem to be a better way
            return true;
        } else {
            let baseUri = window.yt?.player?.utils?.videoElement_?.baseURI;
            if (!baseUri || !baseUri.includes('/watch?v=')) return false;

            let id = baseUri.split('/watch?v=')[1]?.slice(0, 11)
            if (!id) return false;

            return true;
        }
    }

    //volume controls
    document.addEventListener('keydown', (e) => {
        if (!e.key || !isWatching()) return;

        const volumeStep = 5;

        if (e.key === '+' || e.key === '=') {
            volume = Math.min(100, volume + volumeStep)
        } else if (e.key === '-') {
            volume = Math.max(0, volume - volumeStep)
        } else if (e.key.toLowerCase() === 'm') {
            muted = !muted;
        } else {
            return;
        }

        e.preventDefault()
        e.stopPropagation()
        e.stopImmediatePropagation()
        showVolumeIndicator()
        setVolume()
    }, true)

    //cast allows you to control the volume, but it uses a different (VERY OLD LOOKING) ui, so we hook it up to our new one instead
    rcMod.addInputModifier((c) => {
        if (!c.volumeControlAction) return c;

        let action = c.volumeControlAction;
        let type = action.volumeControlType;

        if (type === 'VOLUME_CONTROL_ACTION_TYPE_MUTE') {
            muted = true;
        } else if (type === 'VOLUME_CONTROL_ACTION_TYPE_UNMUTE') {
            muted = false;
        } else if (type === 'VOLUME_CONTROL_ACTION_TYPE_SET_ABSOLUTE') {
            volume = action.volumeControlValue;
        }

        showVolumeIndicator()
        setVolume()

        return false;
    })

    //player can change sometimes
    setInterval(() => {
        setVolume(true)
    }, 100)
}