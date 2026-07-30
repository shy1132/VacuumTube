const { ipcRenderer } = require('electron')
const configManager = require('../../config')
const jsonModifiers = require('../../util/jsonModifiers')
const resolveCommandModifiers = require('../../util/resolveCommandModifiers')
const localeProvider = require('../../util/localeProvider')
const { enableAudioOnly, enableNativeMusicRenderer, isPlayerResponse } = require('./player-response')

let featureEnabled = false;
let enabled = false;
let lastThumbnail = null;
let labels = {
    title: 'Music Mode'
}

function isFeatureEnabled(config) {
    return config.features_enabled === true && config.music_mode_feature === true;
}

function getPlayerResponses(json) {
    const candidates = [ json, json?.playerResponse ]
    return candidates.filter((candidate, index) =>
        isPlayerResponse(candidate) && candidates.indexOf(candidate) === index
    );
}

function walkCommands(command) {
    const commands = [ command ]
    for (let i = 0; i < commands.length; i++) {
        let nested = commands[i]?.commandExecutorCommand?.commands
        if (Array.isArray(nested)) commands.push(...nested);
    }

    return commands.filter(Boolean);
}

function buildMusicModeItem() {
    return {
        compactLinkRenderer: {
            icon: { iconType: 'MUSIC' },
            secondaryIcon: {
                iconType: enabled ? 'CHECK_BOX' : 'CHECK_BOX_OUTLINE_BLANK'
            },
            serviceEndpoint: {
                signalAction: { signal: 'VT_MUSIC_MODE_TOGGLE' }
            },
            title: {
                runs: [ { text: labels.title } ]
            }
        }
    };
}

//inserts the music mode item into the popup's items array (or replaces it if already there)
function injectMusicModeItem(items) {
    const existingIndex = items.findIndex((item) =>
        item?.compactLinkRenderer?.serviceEndpoint?.signalAction?.signal === 'VT_MUSIC_MODE_TOGGLE'
    )

    const item = buildMusicModeItem()
    if (existingIndex === -1) {
        //insert after Speed
        const speedIndex = items.findIndex((existing) =>
            existing?.compactLinkRenderer?.serviceEndpoint?.openClientOverlayAction?.type === 'CLIENT_OVERLAY_TYPE_VIDEO_PLAYBACK_SPEED'
        )

        const insertAt = speedIndex === -1 ? items.length : speedIndex + 1;
        items.splice(insertAt, 0, item)
    } else {
        items[existingIndex] = item;
    }
}

function toggleMusicMode() {
    if (!featureEnabled) return;
    configManager.set({ music_mode: !enabled })
}

function closePlaybackSettingsPopup() {
    try {
        resolveCommandModifiers.resolveCommand({
            signalAction: { signal: 'POPUP_BACK' }
        })
    } catch (err) {
        console.error('[Music Mode] Failed to close the playback settings popup', err)
    }
}

function reloadCurrentVideo() {
    const player = document.querySelector('.html5-video-player')
    if (!player?.loadVideoById) return false;

    const videoData = player.getVideoData?.() || {}
    const videoId = videoData.video_id || videoData.videoId;
    if (!videoId) return false;

    const currentTime = Number(player.getCurrentTime?.()) || 0;
    const wasPaused = player.getPlayerState?.() === 2;

    try {
        player.loadVideoById(videoId, Math.max(0, currentTime))
        if (wasPaused) setTimeout(() => player.pauseVideo?.(), 100);

        return true;
    } catch (err) {
        console.error('[Music Mode] Failed to reload the current video', err)
        return false;
    }
}

module.exports = () => {
    const config = configManager.get()
    featureEnabled = isFeatureEnabled(config)
    enabled = featureEnabled && config.music_mode === true;

    if (!featureEnabled && config.music_mode === true) {
        configManager.set({ music_mode: false })
        enabled = false;
    }

    jsonModifiers.addModifier((json) => {
        if (!featureEnabled || !enabled) return json;

        for (let playerResponse of getPlayerResponses(json)) {
            lastThumbnail = enableAudioOnly(playerResponse) || lastThumbnail;
        }

        enableNativeMusicRenderer(json, lastThumbnail)
        return json;
    })

    resolveCommandModifiers.addInputModifier((command) => {
        let has = walkCommands(command).some((c) => c?.signalAction?.signal === 'VT_MUSIC_MODE_TOGGLE');
        if (has) {
            toggleMusicMode()
            setTimeout(closePlaybackSettingsPopup, 0)
            return false;
        }

        if (featureEnabled && command?.openPopupAction?.uniqueId === 'playback-settings') {
            const items = command?.openPopupAction?.popup?.overlaySectionRenderer?.overlay?.overlayTwoPanelRenderer?.actionPanel?.overlayPanelRenderer?.content?.overlayPanelItemListRenderer?.items;
            if (Array.isArray(items)) injectMusicModeItem(items)
        }

        return command;
    })

    localeProvider.waitUntilAvailable().then(() => {
        const locale = localeProvider.getLocale()
        labels = {
            title: locale.settings?.features?.music_mode_title || labels.title
        }
    })

    ipcRenderer.on('config-update', (event, nextConfig) => {
        const wasEnabled = enabled;
        featureEnabled = isFeatureEnabled(nextConfig)
        enabled = featureEnabled && nextConfig.music_mode === true;

        if (!featureEnabled && nextConfig.music_mode === true) {
            enabled = false;
            configManager.set({ music_mode: false })
        }

        if (wasEnabled !== enabled) {
            if (!enabled) lastThumbnail = null;
            setTimeout(reloadCurrentVideo, 0)
        }
    })
}