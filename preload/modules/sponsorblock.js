const { SponsorBlock } = require('sponsorblock-api');
const configManager = require('../config');
const config = configManager.get()

let sponsorBlock = null;
let sponsorBlockSegments = []

let activeVideoId = 0;
let attachVideoTimeout = null
let activeVideo = null
const attachToVideo = function () {
    clearTimeout(attachVideoTimeout)
    attachVideoTimeout = null

    activeVideo = document.querySelector('video')
    if (!activeVideo) {
        attachVideoTimeout = setTimeout(attachToVideo, 100)
        return
    }

    console.log("Sponsorblock attached to video ID ", activeVideoId)

    activeVideo.addEventListener('timeupdate', checkForSponsorSkip)
}

const checkForSponsorSkip = function () {
    if (!config.sponsorblock || !activeVideo || sponsorBlockSegments.length === 0)
        return

    if (activeVideo.paused)
        return

    let matchingSegment = sponsorBlockSegments.filter((v) => {
        // Only skip if at the start of the segment - if the user jumped into the segment
        // they probably want to watch it for whatever reason
        return activeVideo.currentTime > v.startTime
            && activeVideo.currentTime < v.startTime + 2
            && activeVideo.currentTime < v.endTime
    }).sort((x,y) => x.startTime - y.startTime)
    if (matchingSegment.length === 0)
        return

    // TODO: Add a notification when this happens
    console.log("Skipping sponsor segment...")
    activeVideo.currentTime = matchingSegment[0].endTime
}

module.exports = () => {
    if (!config.sponsorblock)
        return;

    sponsorBlock = new SponsorBlock(config.sponsorblock_uuid)

    window.addEventListener('hashchange', () => {
        if (!config.sponsorblock)
            return;

        const pageUrl = new URL(location.hash.substring(1), location.href);

        if (pageUrl.pathname === '/watch') {
            const videoId = pageUrl.searchParams.get('v');

            // TODO: Full SponsorBlock config so you can choose what categories to skip/show
            const categories = ['sponsor']
            sponsorBlock.getSegments(videoId, categories).then((segments) => {
                sponsorBlockSegments = segments
                activeVideoId = videoId
                attachToVideo()
                console.log(segments)
            })
        } else {
            activeVideo = null
            activeVideoId = 0
            sponsorBlockSegments = []
            if (attachVideoTimeout != null) {
                clearTimeout(attachVideoTimeout)
                attachVideoTimeout = null
            }
        }

    })
}