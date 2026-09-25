const assert = require('node:assert/strict')
const test = require('node:test')

const package = require('../package.json')
const { castEnvironmentOverride } = require('../src/preload/modules/identification')
const {
    defaultUserAgent,
    isYouTubePlaybackHost,
    userAgentForHost,
    youtubeUserAgent
} = require('../src/youtube-identity')

test('uses one Cobalt identity for YouTube, BotGuard, and playback media', () => {
    const playbackHosts = [
        'www.youtube.com',
        'jnn-pa.googleapis.com',
        'googlevideo.com',
        'rr1---sn.example.googlevideo.com'
    ]

    assert.match(youtubeUserAgent, /Cobalt\/19\.lts\.0-qa/)
    assert.doesNotMatch(youtubeUserAgent, /Chrome|Cobalt\/25/)

    for (const hostname of playbackHosts) {
        assert.equal(isYouTubePlaybackHost(hostname), true)
        assert.equal(userAgentForHost(hostname), youtubeUserAgent)
    }
})

test('keeps the generic VacuumTube identity away from playback requests', () => {
    assert.equal(defaultUserAgent, `VacuumTube/${package.version}`)
    assert.equal(isYouTubePlaybackHost('example.com'), false)
    assert.equal(userAgentForHost('example.com'), defaultUserAgent)
})

test('does not rewrite the TV client as Desktop Chrome', () => {
    assert.deepEqual(castEnvironmentOverride('homebox.local', 'darwin'), {
        feature_switches: {
            mdx_device_label: 'homebox (VacuumTube)'
        }
    })
})
