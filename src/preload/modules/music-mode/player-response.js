function isObject(value) {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isPlayerResponse(value) {
    return isObject(value) && isObject(value.streamingData) && isObject(value.videoDetails);
}

function getThumbnail(playerResponse) {
    const thumbnails = playerResponse.videoDetails?.thumbnail?.thumbnails
    if (Array.isArray(thumbnails)) {
        const largest = [ ...thumbnails ]
            .filter((thumbnail) => typeof thumbnail?.url === 'string' && thumbnail.url.length > 0)
            .sort((a, b) => ((b.width || 0) * (b.height || 0)) - ((a.width || 0) * (a.height || 0)))[0]

        if (largest) return largest;
    }

    const videoId = playerResponse.videoDetails?.videoId
    if (typeof videoId === 'string' && videoId.length > 0) {
        return {
            url: `https://i.ytimg.com/vi/${encodeURIComponent(videoId)}/hqdefault.jpg`,
            width: 480,
            height: 360
        };
    }

    return null;
}

function getThumbnailUrl(playerResponse) {
    return getThumbnail(playerResponse)?.url || null;
}

function enableAudioOnly(playerResponse) {
    if (!isPlayerResponse(playerResponse)) return null;

    if (!isObject(playerResponse.playerConfig)) {
        playerResponse.playerConfig = {}
    }

    if (!isObject(playerResponse.playerConfig.audioConfig)) {
        playerResponse.playerConfig.audioConfig = {}
    }

    // Set this before the player consumes the response. Unlike hiding the video with
    // CSS, YouTube's native audio-only path does not create a video SourceBuffer.
    playerResponse.playerConfig.audioConfig.playAudioOnly = true;

    return getThumbnailUrl(playerResponse);
}

module.exports = {
    enableAudioOnly,
    getThumbnail,
    getThumbnailUrl,
    isPlayerResponse
}
