//optional feature: while a video plays with the player controls hidden, left/right skip back/forward 10 seconds right away (like other tv apps)
//instead of opening the progress bar first. holding the key keeps skipping in growing steps
//whenever the controls, a menu or anything else is focused, the keys are left alone so navigation works exactly as before

const fs = require('fs')
const path = require('path')
const css = require('../../util/css')
const functions = require('../../util/functions')
const configManager = require('../../config')
const shortcuts = require('../../util/shortcuts')

const config = configManager.get()

//keyboard arrows, then the d-pad and left stick codes sent by controller-support.js (the touch overlay arrows use the stick ones too)
const leftKeyCodes = [ 37, 32782, 32787 ]
const rightKeyCodes = [ 39, 32783, 32788 ]

const skipInterval = 250; //while a key is held, skip at most this often (keyboard repeat is ~30/s, controllers ~10/s)
const holdTimeout = 1000; //a hold with no events for this long counts as released, in case the keyup got lost

function isEnabled() {
    return config.features_enabled === true && config.arrow_seek_feature === true;
}

function getDirection(e) {
    if (e.key === 'ArrowLeft' || leftKeyCodes.includes(e.keyCode)) return -1;
    if (e.key === 'ArrowRight' || rightKeyCodes.includes(e.keyCode)) return 1;
    return 0;
}

//the step grows the longer the key is held: 10s, then 20s, 30s and 60s
function getStep(heldFor) {
    if (heldFor < 1500) return 10;
    if (heldFor < 3000) return 20;
    if (heldFor < 5000) return 30;
    return 60;
}

//leanback keeps focus on the watch page itself while the controls are hidden, and moves it into the overlay (progress bar, buttons),
//a popup or the end screen whenever one of those is shown, so this is true only when an arrow key would otherwise open the progress bar
function controlsHidden() {
    if (!document.body.classList.contains('WEB_PAGE_TYPE_WATCH')) return false;

    return document.activeElement?.tagName === 'YTLR-WATCH-DEFAULT';
}

//the range we're allowed to seek in, or null if seeking isn't possible right now (ads, live streams without dvr, nothing loaded yet)
function getSeekableRange(player) {
    if (!player?.seekTo || !player.getProgressState) return null;
    if (player.classList.contains('ad-showing')) return null; //getAdState() stays -1 during ads in leanback, the class is reliable

    let state = player.getProgressState()
    if (!state?.allowSeeking || !(state.seekableEnd > state.seekableStart)) return null;

    return { start: state.seekableStart, end: state.seekableEnd };
}

function secondsToTime(totalSeconds) {
    let hours = Math.floor(totalSeconds / 3600)
    let minutes = Math.floor((totalSeconds % 3600) / 60)
    let seconds = Math.floor(totalSeconds % 60)

    if (hours > 0) {
        return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    } else {
        return `${minutes}:${String(seconds).padStart(2, '0')}`;
    }
}

module.exports = async () => {
    const el = functions.el;

    await functions.waitForCondition(() => !!document.body)

    const cssPath = path.join(__dirname, 'style.css')
    const text = fs.readFileSync(cssPath, 'utf-8')

    css.inject('arrow-seek', text)

    const icon = el('div', { className: 'vt-seek-icon' })
    const amountText = el('span', { className: 'vt-seek-text' })
    const timeText = el('span', { className: 'vt-seek-time' })
    const indicator = el('div', { id: 'vt-seek-indicator' }, [ icon, amountText, timeText ])

    document.body.appendChild(indicator)

    let indicatorTimeout;

    function showIndicator(direction, amount, time, duration, isLive) {
        icon.classList.toggle('vt-seek-back', direction < 0)
        amountText.textContent = `${direction < 0 ? '-' : '+'}${amount}s`
        timeText.textContent = isLive ? '' : `${secondsToTime(time)} / ${secondsToTime(duration)}`
        indicator.classList.add('visible')

        clearTimeout(indicatorTimeout)
        indicatorTimeout = setTimeout(() => {
            indicator.classList.remove('visible')
        }, 1500)
    }

    let hold = null; //{ direction, start, lastEvent, lastSkip } while a key is held

    document.addEventListener('keydown', (e) => {
        let direction = getDirection(e)
        if (!direction || !isEnabled()) return;
        if (e.shiftKey || !shortcuts.isShortcutKey(e) || !controlsHidden()) return;

        let player = document.querySelector('.html5-video-player')
        let range = getSeekableRange(player)
        if (!range) return; //let youtube handle it

        let now = Date.now()
        let holding = hold?.direction === direction && now - hold.lastEvent <= holdTimeout;

        let current = player.getCurrentTime()
        let room = direction < 0 ? current - range.start : range.end - current;
        let atEdge = room < 1 || (direction > 0 && player.isAtLiveHead?.())
        if (atEdge && !holding) return; //a new press with nothing to skip to (start, end or live edge) goes to youtube, so its progress bar can show where we are

        e.preventDefault()
        e.stopPropagation()
        e.stopImmediatePropagation()

        if (!holding) hold = { direction, start: now, lastSkip: 0 }
        hold.lastEvent = now;

        if (atEdge || now - hold.lastSkip < skipInterval) return; //swallowed anyway, so the progress bar doesn't open in the middle of a hold
        hold.lastSkip = now;

        let step = Math.min(getStep(now - hold.start), room)
        let target = current + direction * step;

        player.seekTo(target, true)
        showIndicator(direction, Math.round(step), target, player.getDuration(), !!player.getVideoData?.()?.isLive)
    }, true)

    document.addEventListener('keyup', (e) => {
        if (hold && getDirection(e) === hold.direction) {
            hold = null;
        }
    }, true)
}
