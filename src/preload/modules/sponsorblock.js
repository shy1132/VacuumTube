const { ipcRenderer } = require('electron')
const ui = require('../util/ui')
const css = require('../util/css')
const localeProvider = require('../util/localeProvider')
const configManager = require('../config')
const config = configManager.get()

const SPONSORBLOCK_CATEGORIES = [ 'sponsor', 'selfpromo', 'interaction', 'intro', 'outro', 'preview', 'hook', 'filler' ]

const SEGMENT_COLORS = { //same as sponsorblock
    'sponsor': '#00d400',
    'selfpromo': '#ffff00',
    'interaction': '#cc00ff',
    'intro': '#00ffff',
    'outro': '#0202ed',
    'preview': '#008fd6',
    'hook': '#395699',
    'filler': '#7300ff'
}

function isEnabled(segment) {
    return config.sponsorblock && config[`sponsorblock_skip_${segment.category}`];
}

//https://wiki.sponsor.ajay.app/w/API_Docs
async function getSegments(videoId, categories) {
    let params = new URLSearchParams({ videoID: videoId, service: 'YouTube', categories: JSON.stringify(categories) })

    let res = await fetch(`https://sponsor.ajay.app/api/skipSegments?${params}`)
    if (res.status === 404) return []; //the video has no segments
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);

    let data = await res.json()
    return data.map(({ segment, category }) => ({ startTime: segment[0], endTime: segment[1], category }));
}

//gradients for the segments within a time range (the whole video, or one chapter), positioned relative to that range
function getLayers(segments, from, to) {
    let layers = []

    for (let segment of segments) {
        if (segment.endTime <= from || segment.startTime >= to) continue;

        let color = SEGMENT_COLORS[segment.category] || '#ffffff'
        let start = Math.max(0, (segment.startTime - from) / (to - from) * 100)
        let end = Math.min(100, (segment.endTime - from) / (to - from) * 100)

        layers.push(`linear-gradient(to right, transparent ${start}%, ${color} ${start}%, ${color} ${end}%, transparent ${end}%)`)
    }

    return layers.join(', ') || 'none';
}

//videos with chapters have a different progress bar
function getChapters(duration) {
    let pieces = document.querySelectorAll('ytlr-multi-markers-player-bar-renderer [idomkey="progress-bar"] > [idomkey^="chapter-"]')
    if (pieces.length === 0 || !(duration > 0)) return null;

    let total = 0;
    for (let piece of pieces) {
        total += parseFloat(piece.style.width)
    }

    if (!(total > 0)) return null;

    let chapters = []
    let start = 0;
    for (let piece of pieces) {
        let width = parseFloat(piece.style.width)
        chapters.push({ key: piece.getAttribute('idomkey'), from: start / total * duration, to: (start + width) / total * duration })
        start += width;
    }

    return chapters;
}

//segments are drawn over the progress bar with css, since leanback rerenders the bar and would remove any elements added to it
function showSegments(segments, duration, chapters) {
    if (segments.length === 0 || !(duration > 0)) {
        css.delete('sponsorblock-segments')
        return;
    }

    segments = [ ...segments ].sort((a, b) => (a.endTime - a.startTime) - (b.endTime - b.startTime)) //shorter segments on top so longer ones don't hide them

    let style = `ytlr-progress-bar [idomkey="slider"]::after { background: ${getLayers(segments, 0, duration)}; }`
    if (chapters) {
        for (let chapter of chapters) {
            style += `ytlr-multi-markers-player-bar-renderer [idomkey="${chapter.key}"]::after { background: ${getLayers(segments, chapter.from, chapter.to)}; }`
        }
    }

    css.inject('sponsorblock-segments', style)
}

module.exports = async () => {
    await localeProvider.waitUntilAvailable()
    let locale = localeProvider.getLocale()

    css.inject('sponsorblock-bar', `
        ytlr-progress-bar [idomkey="slider"]::after,
        ytlr-multi-markers-player-bar-renderer [idomkey^="chapter-"]::after {
            content: '';
            position: absolute;
            inset: 0;
            pointer-events: none;
            opacity: 0.7;
        }
    `)

    let sponsorBlockSegments = []
    let chapters = null;

    const getDuration = () => document.querySelector('.html5-video-player')?.getDuration?.() //0 until the video has loaded, segments are redrawn on durationchange
    const updateSegments = () => showSegments(sponsorBlockSegments.filter(isEnabled), getDuration(), chapters)

    ipcRenderer.on('config-update', updateSegments)

    //the chapter bar can render after the segments are loaded, so it's checked for until it's there (and again if it changes)
    setInterval(() => {
        if (sponsorBlockSegments.length === 0) return;

        let found = getChapters(getDuration())
        if (!found || JSON.stringify(found) === JSON.stringify(chapters)) return;

        chapters = found;
        updateSegments()
    }, 1000)

    let activeVideoId = 0;
    let attachVideoTimeout = null;
    let activeVideo = null;
    const attachToVideo = function () {
        clearTimeout(attachVideoTimeout)
        attachVideoTimeout = null;

        activeVideo = document.querySelector('video')
        if (!activeVideo) {
            attachVideoTimeout = setTimeout(attachToVideo, 100)
            return;
        }

        console.log('[SponsorBlock] Attached to video ID', activeVideoId)

        activeVideo.addEventListener('timeupdate', checkForSponsorSkip)
        activeVideo.addEventListener('durationchange', updateSegments)
        updateSegments()
    }

    const checkForSponsorSkip = function () {
        if (!config.sponsorblock || !activeVideo || sponsorBlockSegments.length === 0) return;

        if (activeVideo.paused) return;

        let matchingSegment = sponsorBlockSegments.filter((v) => {
            // Only skip if at the start of the segment - if the user jumped into the segment
            // they probably want to watch it for whatever reason
            return isEnabled(v)
                && activeVideo.currentTime > v.startTime
                && activeVideo.currentTime < v.startTime + 2
                && activeVideo.currentTime < v.endTime;
        }).sort((x, y) => x.startTime - y.startTime)

        if (matchingSegment.length === 0) return;

        console.log('[SponsorBlock] Skipping sponsor segment')

        activeVideo.currentTime = matchingSegment[0].endTime;
        ui.toast('VacuumTube', locale.sponsorblock[`${matchingSegment[0].category}_skipped`])
    }

    const onNavigate = () => {
        const pageUrl = new URL(location.hash.substring(1), location.href)

        if (pageUrl.pathname === '/watch') {
            const videoId = pageUrl.searchParams.get('v')
            if (videoId === activeVideoId) return;

            sponsorBlockSegments = []
            chapters = null;
            activeVideoId = videoId;
            updateSegments()

            if (!config.sponsorblock) return;

            //every category is fetched so enabling one while watching works too
            getSegments(videoId, SPONSORBLOCK_CATEGORIES).then((segments) => {
                if (activeVideoId !== videoId) return; //navigated to another video before this one finished

                sponsorBlockSegments = segments;
                attachToVideo()
            }).catch((err) => {
                console.error('[SponsorBlock] Failed to get segments for', videoId, err)
            })
        } else {
            activeVideo = null;
            activeVideoId = 0;
            sponsorBlockSegments = []
            chapters = null;
            updateSegments()
            if (attachVideoTimeout != null) {
                clearTimeout(attachVideoTimeout)
                attachVideoTimeout = null;
            }
        }
    }

    window.addEventListener('hashchange', onNavigate)
    onNavigate()
}