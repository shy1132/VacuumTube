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

function enableAudioOnly(playerResponse) {
    if (!isPlayerResponse(playerResponse)) return null;

    if (!isObject(playerResponse.playerConfig)) {
        playerResponse.playerConfig = {}
    }

    if (!isObject(playerResponse.playerConfig.audioConfig)) {
        playerResponse.playerConfig.audioConfig = {}
    }

    playerResponse.playerConfig.audioConfig.playAudioOnly = true;
    playerResponse.videoDetails.musicVideoType = 'MUSIC_VIDEO_TYPE_ATV';

    return getThumbnail(playerResponse);
}

function getWatchMetadataItem(json) {
    const contents = json.contents?.singleColumnWatchNextResults?.results?.results?.contents
    if (!Array.isArray(contents)) return null;

    for (const result of contents) {
        const items = result?.itemSectionRenderer?.contents
        if (!Array.isArray(items)) continue;

        const item = items.find((candidate) => candidate?.videoMetadataRenderer)
        if (item) return item;
    }

    return null;
}

function asThumbnailModel(currentVideoThumbnail, fallbackThumbnail) {
    if (Array.isArray(currentVideoThumbnail?.thumbnails) && currentVideoThumbnail.thumbnails.length > 0) {
        return { thumbnails: currentVideoThumbnail.thumbnails };
    }

    if (typeof fallbackThumbnail?.url === 'string') {
        return { thumbnails: [ fallbackThumbnail ] };
    }

    return null;
}

function enableNativeMusicRenderer(json, fallbackThumbnail = null) {
    if (!isObject(json)) return false;

    const metadataItem = getWatchMetadataItem(json)
    const videoMetadata = metadataItem?.videoMetadataRenderer
    if (!videoMetadata) return false;

    const currentVideoThumbnail = isObject(json.currentVideoThumbnail)
        ? json.currentVideoThumbnail
        : null;
    const thumbnailModel = asThumbnailModel(currentVideoThumbnail, fallbackThumbnail)
    const musicMetadata = {
        title: videoMetadata.title,
        byline: videoMetadata.owner?.videoOwnerRenderer?.title,
        secondaryTitle: videoMetadata.title,
        viewCountText: videoMetadata.viewCount?.videoViewCountRenderer?.shortViewCount,
        mayTruncateChannelName: true,
        trackingParams: videoMetadata.trackingParams
    }

    if (thumbnailModel) {
        musicMetadata.blurredBackgroundThumbnail = thumbnailModel;

        if (!currentVideoThumbnail) {
            json.currentVideoThumbnail = thumbnailModel;
        }
    }

    if (isObject(currentVideoThumbnail?.darkColorPalette)) {
        musicMetadata.darkColorPalette = currentVideoThumbnail.darkColorPalette;
    }

    for (const key of Object.keys(musicMetadata)) {
        if (musicMetadata[key] === undefined) delete musicMetadata[key];
    }

    delete metadataItem.videoMetadataRenderer;
    metadataItem.musicWatchMetadataRenderer = musicMetadata;
    return true;
}

module.exports = {
    enableAudioOnly,
    enableNativeMusicRenderer,
    getThumbnail,
    isPlayerResponse
}