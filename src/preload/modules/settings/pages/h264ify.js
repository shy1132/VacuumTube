const CODECS = { webm: 'WebM', vp8: 'VP8', vp9: 'VP9', av1: 'AV1' }
const CODEC_KEYS = Object.keys(CODECS).map((id) => `h264ify_disable_${id}`)

module.exports = {
    id: 'h264ify',
    CODEC_KEYS,

    title: (locale) => locale.h264ify.codecs_link,
    description: (locale) => locale.h264ify.description,

    rows: (config, locale) => Object.entries(CODECS).map(([ id, name ]) => ({
        type: 'toggle',
        key: `h264ify_disable_${id}`,
        title: locale.h264ify.disable_codec_title.replaceAll('{codec}', name),
        description: locale.h264ify.disable_codec_description.replaceAll('{codec}', name),
        dependsOn: 'h264ify'
    }))
}