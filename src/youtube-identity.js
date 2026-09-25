const package = require('../package.json')

const youtubeUserAgent = `Mozilla/5.0 (PS4; Leanback Shell) Cobalt/19.lts.0-qa; compatible; VacuumTube/${package.version}`
const defaultUserAgent = `VacuumTube/${package.version}`

function isYouTubePlaybackHost(hostname) {
    return hostname === 'www.youtube.com'
        || hostname === 'jnn-pa.googleapis.com'
        || hostname === 'googlevideo.com'
        || hostname.endsWith('.googlevideo.com');
}

function userAgentForHost(hostname) {
    return isYouTubePlaybackHost(hostname) ? youtubeUserAgent : defaultUserAgent;
}

module.exports = {
    defaultUserAgent,
    isYouTubePlaybackHost,
    userAgentForHost,
    youtubeUserAgent
};
