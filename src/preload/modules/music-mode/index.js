const { ipcRenderer } = require('electron')
const configManager = require('../../config')
const functions = require('../../util/functions')
const jsonModifiers = require('../../util/jsonModifiers')
const localeProvider = require('../../util/localeProvider')
const resolveCommandModifiers = require('../../util/resolveCommandModifiers')
const { enableAudioOnly, enableNativeMusicRenderer, isPlayerResponse } = require('./player-response')

const NO_VIDEO_SIGNAL = 'VT_MUSIC_MODE'
const QUALITY_OVERLAY_TYPE = 'CLIENT_OVERLAY_TYPE_VIDEO_QUALITY'
const PLAYBACK_QUALITY_SETTING = 'PLAYBACK_QUALITY'

let featureEnabled = false;
let enabled = false;
let lastThumbnail = null;
let qualityInjectionTimer = null;
let qualityMenuObserver = null;
let labels = {
    title: 'No Video',
    subtitle: 'Audio only'
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

function getCommands(command) {
    const commands = [ command ]

    for (let index = 0; index < commands.length; index++) {
        const nested = commands[index]?.commandExecutorCommand?.commands
        if (Array.isArray(nested)) commands.push(...nested);
    }

    return commands.filter(Boolean);
}

function hasSignal(command, signal) {
    return getCommands(command).some((candidate) => candidate.signalAction?.signal === signal);
}

function opensQualityMenu(command) {
    return getCommands(command).some((candidate) =>
        candidate.openClientOverlayAction?.type === QUALITY_OVERLAY_TYPE
    );
}

function getPlaybackQuality(command) {
    for (const candidate of getCommands(command)) {
        const settingData = candidate.setClientSettingEndpoint?.settingDatas
        if (!Array.isArray(settingData)) continue;

        const playbackQuality = settingData.find((setting) =>
            setting.clientSettingEnum?.item === PLAYBACK_QUALITY_SETTING
        )
        if (!playbackQuality?.stringValue) continue;

        try {
            return JSON.parse(playbackQuality.stringValue).quality || null;
        } catch {
            return null;
        }
    }

    return null;
}

function createNoVideoItem() {
    return {
        compactLinkRenderer: {
            title: { simpleText: labels.title },
            subtitle: { simpleText: labels.subtitle },
            secondaryIcon: {
                iconType: enabled ? 'CHECK' : 'RADIO_BUTTON_UNCHECKED'
            },
            serviceEndpoint: {
                signalAction: { signal: NO_VIDEO_SIGNAL }
            }
        }
    };
}

function isNoVideoItem(item) {
    return hasSignal(item?.compactLinkRenderer?.serviceEndpoint, NO_VIDEO_SIGNAL);
}

function isQualityItem(item) {
    return !!getPlaybackQuality(item?.compactLinkRenderer?.serviceEndpoint);
}

function updateQualityPanel(instance, data, items, selectedIndex) {
    instance.props.data = { ...data, items, selectedIndex }
    const nextState = typeof instance.j === 'function' ? instance.j(items) : {};
    nextState.selectedIndex = selectedIndex;
    instance.K(nextState)
}

function syncQualityMenuItem() {
    const panels = document.querySelectorAll('ytlr-overlay-panel-item-list-renderer')
    const panel = [ ...panels ].find((candidate) =>
        candidate.__instance?.props?.data?.items?.some((item) => isQualityItem(item) || isNoVideoItem(item))
    )
    if (!panel) return false;

    const instance = panel.__instance
    const data = instance.props.data
    const existingNoVideoIndex = data.items.findIndex(isNoVideoItem)
    const nativeItems = data.items.filter((item) => !isNoVideoItem(item))

    if (!featureEnabled) {
        if (existingNoVideoIndex === -1) return true;

        const checkedNativeIndex = nativeItems.findIndex((item) =>
            item.compactLinkRenderer?.secondaryIcon?.iconType === 'CHECK'
        )
        const selectedIndex = checkedNativeIndex === -1 ? 0 : checkedNativeIndex;
        updateQualityPanel(instance, data, nativeItems, selectedIndex)
        return true;
    }

    if (existingNoVideoIndex !== -1) {
        const renderer = data.items[existingNoVideoIndex].compactLinkRenderer
        const expectedIcon = enabled ? 'CHECK' : 'RADIO_BUTTON_UNCHECKED';
        const nativeSelectionCleared = !enabled || data.items.every((item, index) =>
            index === existingNoVideoIndex || item.compactLinkRenderer?.secondaryIcon?.iconType !== 'CHECK'
        )
        const selectedIndexMatches = !enabled || data.selectedIndex === existingNoVideoIndex;

        if (
            renderer.title?.simpleText === labels.title &&
            renderer.subtitle?.simpleText === labels.subtitle &&
            renderer.secondaryIcon?.iconType === expectedIcon &&
            nativeSelectionCleared &&
            selectedIndexMatches
        ) {
            return true;
        }
    }

    const items = nativeItems.map((item) => {
        const renderer = item.compactLinkRenderer
        if (!enabled || renderer?.secondaryIcon?.iconType !== 'CHECK') return item;

        return {
            ...item,
            compactLinkRenderer: {
                ...renderer,
                secondaryIcon: { iconType: 'RADIO_BUTTON_UNCHECKED' }
            }
        };
    })

    const noVideoIndex = items.length;
    items.push(createNoVideoItem())
    updateQualityPanel(instance, data, items, enabled ? noVideoIndex : data.selectedIndex)

    return true;
}

function startQualityMenuObserver() {
    if (qualityMenuObserver || !document.documentElement) return;

    qualityMenuObserver = new MutationObserver((mutations) => {
        const qualityPanelChanged = mutations.some((mutation) => {
            if (mutation.target.closest?.('ytlr-overlay-panel-item-list-renderer')) return true;

            return [ ...mutation.addedNodes ].some((node) =>
                node.nodeType === 1 && (
                    node.matches?.('ytlr-overlay-panel-item-list-renderer') ||
                    node.querySelector?.('ytlr-overlay-panel-item-list-renderer')
                )
            );
        })

        if (qualityPanelChanged) scheduleQualityMenuSync();
    })

    qualityMenuObserver.observe(document.documentElement, {
        childList: true,
        subtree: true
    })
}

function scheduleQualityMenuSync() {
    if (qualityInjectionTimer != null) clearTimeout(qualityInjectionTimer);

    let attempts = 0;
    const trySync = () => {
        qualityInjectionTimer = null;
        if (syncQualityMenuItem()) return;

        attempts++;
        if (attempts < 20) {
            qualityInjectionTimer = setTimeout(trySync, 25)
        }
    }

    qualityInjectionTimer = setTimeout(trySync, 0)
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

function closeQualityMenu() {
    try {
        resolveCommandModifiers.resolveCommand({
            signalAction: { signal: 'POPUP_BACK' }
        })
    } catch (err) {
        console.error('[Music Mode] Failed to close the quality menu', err)
    }
}

function enableMusicMode() {
    if (!featureEnabled) return;

    const changed = !enabled;
    enabled = true;
    configManager.set({ music_mode: true })

    setTimeout(() => {
        closeQualityMenu()
        if (changed) reloadCurrentVideo();
    }, 0)
}

function disableMusicMode({ reload = true } = {}) {
    if (!enabled) return;

    enabled = false;
    lastThumbnail = null;
    configManager.set({ music_mode: false })
    if (reload) setTimeout(reloadCurrentVideo, 0);
}

module.exports = () => {
    const config = configManager.get()
    featureEnabled = isFeatureEnabled(config)
    enabled = featureEnabled && config.music_mode === true;

    if (!featureEnabled && config.music_mode === true) {
        configManager.set({ music_mode: false })
    }

    functions.waitForCondition(() => !!document.documentElement).then(startQualityMenuObserver)

    jsonModifiers.addModifier((json) => {
        if (!featureEnabled || !enabled) return json;

        for (const playerResponse of getPlayerResponses(json)) {
            lastThumbnail = enableAudioOnly(playerResponse) || lastThumbnail;
        }

        enableNativeMusicRenderer(json, lastThumbnail)
        return json;
    })

    resolveCommandModifiers.addInputModifier((command) => {
        if (opensQualityMenu(command)) scheduleQualityMenuSync();

        if (hasSignal(command, NO_VIDEO_SIGNAL)) {
            enableMusicMode()
            return false;
        }

        if (getPlaybackQuality(command)) {
            disableMusicMode()
        }

        return command;
    })

    localeProvider.waitUntilAvailable().then(() => {
        const locale = localeProvider.getLocale()
        labels = {
            title: locale.music_mode?.title || labels.title,
            subtitle: locale.music_mode?.subtitle || labels.subtitle
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

        if (wasEnabled && !enabled) {
            lastThumbnail = null;
            setTimeout(reloadCurrentVideo, 0)
        }

        syncQualityMenuItem()
    })
}
