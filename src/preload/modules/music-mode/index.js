//experimental audio-only playback with the video's thumbnail in place of video

const fs = require('fs')
const path = require('path')
const { ipcRenderer } = require('electron')
const configManager = require('../../config')
const css = require('../../util/css')
const functions = require('../../util/functions')
const jsonModifiers = require('../../util/jsonModifiers')
const localeProvider = require('../../util/localeProvider')
const resolveCommandModifiers = require('../../util/resolveCommandModifiers')
const { enableAudioOnly, getThumbnail, isPlayerResponse } = require('./player-response')

const STYLE_ID = 'music-mode'
const VISUAL_ID = 'vt-music-mode-visual'
const NO_VIDEO_SIGNAL = 'VT_MUSIC_MODE'
const QUALITY_OVERLAY_TYPE = 'CLIENT_OVERLAY_TYPE_VIDEO_QUALITY'
const PLAYBACK_QUALITY_SETTING = 'PLAYBACK_QUALITY'

let enabled = false;
let qualityInjectionTimer = null;
let qualityMenuObserver = null;
let playerMetadataTimer = null;
let playerVisualState = {
    active: false,
    thumbnailUrl: null,
    title: '',
    byline: '',
    useNativeArtwork: false
}
let labels = {
    title: 'No Video',
    subtitle: 'Audio only'
}

function normalizeThumbnailUrl(url) {
    if (!url) return null;

    try {
        return new URL(url, location.href).href;
    } catch {
        return null;
    }
}

function createPlayerVisual() {
    const backdrop = functions.el('div', {
        className: 'vt-music-mode-visual__backdrop'
    })
    const scrim = functions.el('div', {
        className: 'vt-music-mode-visual__scrim'
    })
    const artwork = functions.el('img', {
        className: 'vt-music-mode-visual__artwork',
        alt: '',
        draggable: 'false'
    })
    const title = functions.el('div', {
        className: 'vt-music-mode-visual__title'
    })
    const byline = functions.el('div', {
        className: 'vt-music-mode-visual__byline'
    })
    const content = functions.el('div', {
        className: 'vt-music-mode-visual__content'
    }, [ artwork, title, byline ])

    return functions.el('div', {
        id: VISUAL_ID,
        'aria-hidden': 'true'
    }, [ backdrop, scrim, content ]);
}

function ensurePlayerVisual() {
    if (!document.body) return null;

    let visual = document.getElementById(VISUAL_ID)
    if (!visual) visual = createPlayerVisual();
    if (visual.parentElement !== document.body) document.body.appendChild(visual);

    return visual;
}

function renderPlayerVisual() {
    const root = document.documentElement
    if (!root) return;

    const state = playerVisualState
    const customVisualActive = state.active && !state.useNativeArtwork;
    const normalizedUrl = normalizeThumbnailUrl(state.thumbnailUrl)

    root.classList.toggle('vt-music-mode-active', state.active)
    root.classList.toggle('vt-music-mode-custom-visual', customVisualActive)

    if (state.active && normalizedUrl) {
        root.style.setProperty('--vt-music-mode-thumbnail', `url(${JSON.stringify(normalizedUrl)})`)
    } else {
        root.style.removeProperty('--vt-music-mode-thumbnail')
    }

    let visual = document.getElementById(VISUAL_ID)
    if (customVisualActive) visual = ensurePlayerVisual();
    if (!visual) return;

    visual.hidden = !customVisualActive;
    if (!customVisualActive) return;

    const artwork = visual.querySelector('.vt-music-mode-visual__artwork')
    const title = visual.querySelector('.vt-music-mode-visual__title')
    const byline = visual.querySelector('.vt-music-mode-visual__byline')

    if (normalizedUrl) {
        if (artwork.src !== normalizedUrl) artwork.src = normalizedUrl;
        artwork.hidden = false;
    } else {
        artwork.removeAttribute('src')
        artwork.hidden = true;
    }

    title.textContent = state.title
    title.hidden = !state.title;
    byline.textContent = state.byline
    byline.hidden = !state.byline;
}

function getFormattedStringText(element) {
    const data = element?.__instance?.props?.data
    if (typeof data?.simpleText === 'string') return data.simpleText;
    if (Array.isArray(data?.runs)) return data.runs.map((run) => run.text || '').join('');

    return element?.textContent?.trim() || '';
}

function readNativePlayerMetadata() {
    const title = getFormattedStringText(
        document.querySelector('ytlr-video-title-tray yt-formatted-string')
    )
    const byline = getFormattedStringText(
        document.querySelector('ytlr-watch-metadata ytlr-video-metadata-line yt-formatted-string')
    )

    return { title, byline };
}

function schedulePlayerMetadataRefresh() {
    if (playerMetadataTimer != null) clearTimeout(playerMetadataTimer);

    let attempts = 0;
    const refresh = () => {
        playerMetadataTimer = null;
        if (!playerVisualState.active || playerVisualState.useNativeArtwork) return;

        const metadata = readNativePlayerMetadata()
        const title = metadata.title || playerVisualState.title;
        const byline = metadata.byline || playerVisualState.byline;

        if (title !== playerVisualState.title || byline !== playerVisualState.byline) {
            playerVisualState = { ...playerVisualState, title, byline }
            renderPlayerVisual()
        }

        attempts++;
        if (attempts < 50) {
            playerMetadataTimer = setTimeout(refresh, 100)
        }
    }

    playerMetadataTimer = setTimeout(refresh, 0)
}

function setPlayerVisual(active, metadata = {}) {
    playerVisualState = {
        active,
        thumbnailUrl: metadata.thumbnailUrl || null,
        title: metadata.title || '',
        byline: metadata.byline || '',
        useNativeArtwork: metadata.useNativeArtwork === true
    }

    renderPlayerVisual()
    if (active && !playerVisualState.useNativeArtwork) {
        schedulePlayerMetadataRefresh()
    } else if (playerMetadataTimer != null) {
        clearTimeout(playerMetadataTimer)
        playerMetadataTimer = null;
    }
}

function getPlayerVisualMetadata(playerResponse) {
    const thumbnail = getThumbnail(playerResponse)
    const videoDetails = playerResponse.videoDetails || {}

    return {
        thumbnailUrl: thumbnail?.url || null,
        title: typeof videoDetails.title === 'string' ? videoDetails.title : '',
        byline: typeof videoDetails.author === 'string' ? videoDetails.author : '',
        useNativeArtwork: videoDetails.musicVideoType === 'MUSIC_VIDEO_TYPE_ATV'
    };
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

function injectQualityMenuItem() {
    const panels = document.querySelectorAll('ytlr-overlay-panel-item-list-renderer')
    const panel = [ ...panels ].find((candidate) =>
        candidate.__instance?.props?.data?.items?.some(isQualityItem)
    )
    if (!panel) return false;

    const instance = panel.__instance
    const data = instance.props.data
    const existingNoVideoIndex = data.items.findIndex(isNoVideoItem)
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

    const nativeItems = data.items.filter((item) => !isNoVideoItem(item))

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

    instance.props.data = {
        ...data,
        items,
        selectedIndex: enabled ? noVideoIndex : data.selectedIndex
    }
    const nextState = typeof instance.j === 'function' ? instance.j(items) : {};
    if (enabled) nextState.selectedIndex = noVideoIndex;
    instance.K(nextState)

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

        if (qualityPanelChanged) scheduleQualityMenuInjection();
    })

    qualityMenuObserver.observe(document.documentElement, {
        childList: true,
        subtree: true
    })
}

function scheduleQualityMenuInjection() {
    if (qualityInjectionTimer != null) clearTimeout(qualityInjectionTimer);

    let attempts = 0;
    const tryInjection = () => {
        qualityInjectionTimer = null;
        if (injectQualityMenuItem()) return;

        attempts++;
        if (attempts < 20) {
            qualityInjectionTimer = setTimeout(tryInjection, 25)
        }
    }

    qualityInjectionTimer = setTimeout(tryInjection, 0)
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
    const changed = !enabled;
    enabled = true;
    configManager.set({ music_mode: true })

    setTimeout(() => {
        closeQualityMenu()
        if (changed) reloadCurrentVideo();
    }, 0)
}

function disableMusicModeForQualitySelection() {
    if (!enabled) return;

    enabled = false;
    configManager.set({ music_mode: false })
    setTimeout(reloadCurrentVideo, 0)
}

function isPlaybackRoute() {
    try {
        const pageUrl = new URL(location.hash.substring(1), location.href)
        return pageUrl.pathname === '/watch' || pageUrl.pathname.startsWith('/shorts');
    } catch {
        return false;
    }
}

module.exports = () => {
    enabled = configManager.get().music_mode === true;

    const stylePath = path.join(__dirname, 'style.css')
    css.inject(STYLE_ID, fs.readFileSync(stylePath, 'utf-8'))
    functions.waitForCondition(() => !!document.documentElement).then(startQualityMenuObserver)
    functions.waitForCondition(() => !!document.body).then(renderPlayerVisual)

    jsonModifiers.addModifier((json) => {
        const playerResponses = getPlayerResponses(json)
        if (playerResponses.length === 0) return json;

        if (!enabled) {
            setPlayerVisual(false)
            return json;
        }

        let visualMetadata = {}
        for (const playerResponse of playerResponses) {
            const candidateMetadata = getPlayerVisualMetadata(playerResponse)
            if (!visualMetadata.thumbnailUrl || candidateMetadata.thumbnailUrl) {
                visualMetadata = candidateMetadata
            }

            enableAudioOnly(playerResponse)
        }

        setPlayerVisual(true, visualMetadata)
        return json;
    })

    resolveCommandModifiers.addInputModifier((command) => {
        if (opensQualityMenu(command)) scheduleQualityMenuInjection();

        if (hasSignal(command, NO_VIDEO_SIGNAL)) {
            enableMusicMode()
            return false;
        }

        if (getPlaybackQuality(command)) {
            disableMusicModeForQualitySelection()
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

    ipcRenderer.on('config-update', (event, config) => {
        enabled = config.music_mode === true;
        injectQualityMenuItem()
    })

    // The existing audio-only stream remains active until navigation away from playback.
    window.addEventListener('hashchange', () => {
        if (!isPlaybackRoute()) setPlayerVisual(false)
    })
}
