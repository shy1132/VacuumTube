const ui = require('../util/ui')
const localeProvider = require('../util/localeProvider')
const configManager = require('../config')
const config = configManager.get()

const SPONSORBLOCK_CATEGORIES = [ 'sponsor', 'selfpromo', 'interaction', 'intro', 'outro', 'preview', 'hook', 'filler' ]

//https://wiki.sponsor.ajay.app/w/API_Docs
async function getSegments(videoId, categories) {
    let params = new URLSearchParams({ videoID: videoId, service: 'YouTube', categories: JSON.stringify(categories) })

    let res = await fetch(`https://sponsor.ajay.app/api/skipSegments?${params}`)
    if (res.status === 404) return []; //the video has no segments
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);

    let data = await res.json()
    return data.map(({ segment, category }) => ({ startTime: segment[0], endTime: segment[1], category }));
}

module.exports = async () => {
    await localeProvider.waitUntilAvailable()
    let locale = localeProvider.getLocale()

    let sponsorBlockSegments = []

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
    }

    const checkForSponsorSkip = function () {
        if (!config.sponsorblock || !activeVideo || sponsorBlockSegments.length === 0) return;

        if (activeVideo.paused) return;

        let matchingSegment = sponsorBlockSegments.filter((v) => {
            // Only skip if at the start of the segment - if the user jumped into the segment
            // they probably want to watch it for whatever reason
            return activeVideo.currentTime > v.startTime
                && activeVideo.currentTime < v.startTime + 2
                && activeVideo.currentTime < v.endTime;
        }).sort((x, y) => x.startTime - y.startTime)

        if (matchingSegment.length === 0) return;

        console.log('[SponsorBlock] Skipping sponsor segment')

        activeVideo.currentTime = matchingSegment[0].endTime;
        ui.toast('VacuumTube', locale.sponsorblock[`${matchingSegment[0].category}_skipped`])
    }

    const onNavigate = () => {
        if (!config.sponsorblock) return;

        const pageUrl = new URL(location.hash.substring(1), location.href)

        if (pageUrl.pathname === '/watch') {
            const videoId = pageUrl.searchParams.get('v')
            if (videoId === activeVideoId) return;

            sponsorBlockSegments = []
            activeVideoId = videoId;

            const categories = SPONSORBLOCK_CATEGORIES.filter(
                category => config[`sponsorblock_skip_${category}`]
            )
            if (categories.length === 0) return;

            getSegments(videoId, categories).then((segments) => {
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
            if (attachVideoTimeout != null) {
                clearTimeout(attachVideoTimeout)
                attachVideoTimeout = null;
            }
        }
    }

    window.addEventListener('hashchange', onNavigate)
    onNavigate()
}