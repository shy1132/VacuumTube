//shows the remaining time in place of the elapsed time in the player (e.g. -4:17 4:27), like the official apps do

const configManager = require('../config')
const shortcuts = require('../util/shortcuts')

function isEnabled(config) {
    return config.features_enabled === true && config.remaining_time_feature === true;
}

function secondsToTime(totalSeconds) {
    let hours = Math.floor(totalSeconds / 3600)
    let minutes = Math.floor((totalSeconds % 3600) / 60)
    let seconds = totalSeconds % 60

    if (hours > 0) {
        return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    } else {
        return `${minutes}:${String(seconds).padStart(2, '0')}`;
    }
}

function getRemainingTime(player) {
    let duration = Math.floor(player.getDuration())
    let elapsed = Math.floor(player.getCurrentTime())
    let remaining = Math.round(Math.max(0, (duration - elapsed) / player.getPlaybackRate())) //takes playback speed into account

    return `-${secondsToTime(remaining)}`; //parity with mobile app
}

function isWatchPage() {
    return new URL(location.hash.substring(1), location.href).pathname === '/watch';
}

module.exports = () => {
    const config = configManager.get()

    let timeLabel = null;
    let player = null;
    let videoId = null;
    let showRemaining = true; //toggled with R, reset for each video
    let showing = false;

    function getElapsedTextNode() {
        let node = timeLabel?.querySelector('[idomkey="elapsedTime"]')?.firstChild
        return node?.nodeType === Node.TEXT_NODE ? node : null;
    }

    function isActive() {
        return isEnabled(config) && showRemaining && isWatchPage() && !!player && !player.getVideoData?.()?.isLive;
    }

    function render() {
        let node = getElapsedTextNode()
        if (!node) return;

        if (!isActive()) {
            if (showing && player) { //put the elapsed time back, youtube doesn't render it when controls are hidden
                node.data = secondsToTime(Math.floor(player.getCurrentTime()))
            }

            showing = false;
            return;
        }

        let remaining = getRemainingTime(player)
        if (node.data === remaining) return;

        node.data = remaining;
        showing = true;
    }

    const observer = new MutationObserver(render)

    setInterval(() => {
        if (!isEnabled(config) && !showing) return;

        let label = document.querySelector('[idomkey="time-label"] > [idomkey="elapsedTime"]')?.parentElement ?? null;
        if (label !== timeLabel) {
            observer.disconnect()
            timeLabel = label;
            showing = false;

            if (label) {
                observer.observe(label, { characterData: true, childList: true, subtree: true })
            }
        }

        player = document.querySelector('.html5-video-player')

        let id = player?.getVideoData?.()?.video_id ?? null;
        if (id !== videoId) {
            videoId = id;
            showRemaining = true;
        }

        render()
    }, 250)

    document.addEventListener('keydown', (e) => {
        if (e.key !== 'r' && e.key !== 'R') return;
        if (!shortcuts.isShortcutKey(e)) return;
        if (!isEnabled(config) || !isWatchPage()) return;

        showRemaining = !showRemaining;
        render()

        e.preventDefault()
        e.stopPropagation()
        e.stopImmediatePropagation()
    }, true)
}