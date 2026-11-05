//Kept independent of Electron so shortcut behavior can be tested without an app.
function createCopyVideoHandler({ platform, document, getShortId, writeText, onCopied }) {
    return async (event) => {
        //Option can change the character produced by C (for example, to ç on macOS).
        if (event.key?.toLowerCase() !== 'c' && !(event.altKey && event.code === 'KeyC')) return;

        const commandCopy = platform === 'darwin' && event.metaKey && !event.ctrlKey;
        const controlCopy = event.ctrlKey && !event.metaKey && (event.shiftKey !== event.altKey);
        if ((!commandCopy || event.altKey) && !controlCopy) return;

        const isShort = document.querySelector('ytlr-shorts-page')?.classList.contains('zylon-focus');
        //YouTube's videoElement_ can be a detached, unloaded template.
        const video = document.querySelector('.html5-video-player video');
        let id;
        if (isShort) {
            id = getShortId();
        } else {
            try {
                const url = new URL(video?.baseURI);
                if (url.hostname !== 'www.youtube.com' && url.hostname !== 'youtube.com') return;
                const route = url.pathname === '/tv' ? new URL(url.hash.slice(1), url) : url;
                if (route.origin !== url.origin || route.pathname !== '/watch') return;
                id = route.searchParams.get('v');
            } catch {
                return;
            }
        }
        if (!/^[\w-]{11}$/.test(id || '')) return;

        let url = isShort ? `https://youtube.com/shorts/${id}` : `https://youtu.be/${id}`;
        //Live timestamps are relative to the moving stream, not a stable share time.
        if ((event.altKey || (commandCopy && event.shiftKey)) && !isShort &&
            !document.querySelector('.html5-video-player')?.getVideoData?.()?.isLive &&
            Number.isFinite(video?.duration) &&
            video.duration > 0 && Number.isFinite(video.currentTime) && video.currentTime >= 0) {
            url += `?t=${Math.floor(video.currentTime)}`;
        }

        event.preventDefault();
        event.stopImmediatePropagation();
        if (event.repeat) return;

        try {
            await writeText(url);
        } catch (err) {
            console.error('[Clipboard] Failed to copy video link', err);
            return;
        }
        onCopied();
    };
}

module.exports = { createCopyVideoHandler };
