const functions = require('../util/functions')
const configManager = require('../config')

module.exports = async () => {
    const config = configManager.get()
    let observer;
    let parentNode;
    let isWatching = false;
    let isObserving = false;

    function sanitizeTime(timeStr) {
        return timeStr.replace(/[\•].*$/g, '');
    }

    function timeToSeconds(timeStr) {
        let cleaned = sanitizeTime(timeStr);
        let parts = cleaned.split(':').map(Number);
        let hours = 0, minutes = 0, seconds = 0;

        if (parts.length === 3) {
            [hours, minutes, seconds] = parts;
        } else if (parts.length === 2) {
            [minutes, seconds] = parts;
        } else if (parts.length === 1) {
            [seconds] = parts;
        }

        return hours * 3600 + minutes * 60 + seconds;
    }

    function secondsToTime(totalSeconds) {
        let hours = Math.floor(totalSeconds / 3600);
        let minutes = Math.floor((totalSeconds % 3600) / 60);
        let seconds = totalSeconds % 60;

        if (hours > 0) {
            return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
        } else {
            return `${minutes}:${String(seconds).padStart(2, '0')}`;
        }
    }

    function getRemainingTime(duration, elapsed, currentPlacbackRate) {
        let durationSeconds = timeToSeconds(duration);
        let elapsedSeconds = timeToSeconds(elapsed);
        let remainingSeconds = Math.round(Math.max(0, (durationSeconds - elapsedSeconds) / currentPlacbackRate));
        return secondsToTime(remainingSeconds);
    }

    window.addEventListener('hashchange', async () => {
        const pageUrl = new URL(location.hash.substring(1), location.href)

        if (pageUrl.pathname === '/watch') {
            isWatching = true;
            await functions.waitForCondition(() => !!document.querySelector('span[idomkey="duration"]'))
            let video_duration = "";
            let duration = document.querySelector('span[idomkey="duration"]');
            let elapsedTime = document.querySelector('span[idomkey="elapsedTime"]');
            parentNode = duration.parentNode;
            video_duration = duration.innerText;

            observer = new MutationObserver(() => {
                const durationText = duration.textContent.trim();
                const player = document.querySelector('.html5-video-player');
                const currentPlacbackRate = player.getPlaybackRate();
                const remaining = getRemainingTime(video_duration, elapsedTime.innerText, currentPlacbackRate);

                if (duration.textContent !== remaining) {
                    duration.textContent = remaining;
                }
            });

            isObserving = config.remaining_time;

            if (isObserving)
                observer.observe(parentNode, { characterData: true, childList: true, subtree: true });
        }
        else {
            isWatching = false;
        }
    });

    document.addEventListener('keydown', (e) => {
        const key = e.key || e.keyCode;
        if (!key || !isWatching)
            return;

        if (key === 'r' || key === 'R') {
            if (isObserving) {
                observer.disconnect();
            }
            else {
                observer.observe(parentNode, { characterData: true, childList: true, subtree: true });
            }
            isObserving = !isObserving;

            e.preventDefault()
            e.stopPropagation()
            e.stopImmediatePropagation()
        }
    }, true)
}
