//Kept independent of Electron so shortcut behavior can be tested without an app.
function createCopyVideoHandler({ platform, document, getShortId, writeText, copySelection, onCopied }) {
    return async (event) => {
        if (event.key?.toLowerCase() !== 'c' || event.altKey) return;

        const commandCopy = platform === 'darwin' && event.metaKey && !event.ctrlKey;
        const legacyCopy = event.ctrlKey && event.shiftKey && !event.metaKey;
        if (!commandCopy && !legacyCopy) return;

        if (commandCopy && !event.shiftKey) {
            let active = document.activeElement;
            while (active?.shadowRoot?.activeElement) active = active.shadowRoot.activeElement;
            if (active?.matches('input, textarea, select') || active?.isContentEditable ||
                document.getSelection()?.toString()) {
                event.preventDefault();
                event.stopImmediatePropagation();
                if (event.repeat) return;
                //The native Copy accelerator is suppressed for this chord on macOS.
                try {
                    await copySelection();
                } catch (err) {
                    console.error('[Clipboard] Failed to copy selection', err);
                }
                return;
            }
        }

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
        if (commandCopy && event.shiftKey && !isShort &&
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
