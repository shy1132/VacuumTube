const functions = require('../util/functions')
const configManager = require('../config')

module.exports = async () => {
    const config = configManager.get()
    let observer;
    let parentNode;
    let isWatching = false;
    let isObserving = false;

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

    function getRemainingTime(durationSeconds, elapsedSeconds, currentPlacbackRate) {
        durationSeconds = Math.floor(durationSeconds);
        elapsedSeconds = Math.floor(elapsedSeconds);
        let remainingSeconds = Math.round(Math.max(0, (durationSeconds - elapsedSeconds) / currentPlacbackRate));
        return secondsToTime(remainingSeconds);
    }

    window.addEventListener('hashchange', async () => {
        if (observer)
            observer.disconnect();

        const pageUrl = new URL(location.hash.substring(1), location.href);

        if (pageUrl.pathname === '/watch') {
            isWatching = true;
            await functions.waitForCondition(() => !!document.querySelector('span[idomkey="duration"]'));
            let duration = document.querySelector('span[idomkey="duration"]');
            parentNode = duration.parentNode;

            observer = new MutationObserver(() => {
                const durationText = duration.textContent.trim();
                const player = document.querySelector('.html5-video-player');
                const video_duration = player.getDuration();
                const elapsedTime = player.getCurrentTime();
                const currentPlacbackRate = player.getPlaybackRate();
                const remaining = getRemainingTime(video_duration, elapsedTime, currentPlacbackRate);

                if (duration.textContent !== remaining) {
                    duration.textContent = remaining;
                }
            });

            isObserving = config.remaining_time;

            if (isObserving)
                observer.observe(parentNode, { characterData: true, childList: true, subtree: true });

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
            }, true);
        }
        else {
            isWatching = false;
        }
    });
}
