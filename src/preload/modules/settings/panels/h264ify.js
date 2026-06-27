const { el, createToggle } = require('../dom')
const scroll = require('../scroll')
const configManager = require('../../../config')

const viewport = scroll.bindViewport('h264ify')

let locale = null;

function getConfig() {
    return configManager.get()
}

function updateInactiveState() {
    const root = document.querySelector('.vt-content-panel[data-panel="h264ify"]')
    if (!root) return;

    const isEnabled = !!getConfig().h264ify

    root.querySelectorAll('.vt-setting-item[data-h264ify-codec="true"]').forEach((item) => {
        item.classList.toggle('vt-setting-item-inactive', !isEnabled)
        item.setAttribute('aria-disabled', isEnabled ? 'false' : 'true')
    })
}

module.exports = {
    id: 'h264ify',

    init(ctx) {
        locale = ctx.locale
    },

    render() {
        const config = getConfig()

        return el('div', { className: 'vt-h264ify-section' }, [
            el('div', { className: 'vt-h264ify-viewport' }, [
                el('div', { className: 'vt-h264ify-list', id: 'vt-h264ify-list' }, [
                    el('div', {
                        className: 'vt-setting-item',
                        dataSetting: 'h264ify',
                        dataIndex: '0'
                    }, [
                        el('div', { className: 'vt-setting-info' }, [
                            el('span', { className: 'vt-setting-title', textContent: locale.settings.h264ify.enable_title }),
                            el('span', { className: 'vt-setting-description', textContent: locale.settings.h264ify.enable_description })
                        ]),
                        el('div', { className: 'vt-setting-control' }, [
                            createToggle('h264ify', config.h264ify)
                        ])
                    ]),
                    el('div', {
                        className: `vt-setting-item ${config.h264ify ? '' : 'vt-setting-item-inactive'}`.trim(),
                        dataSetting: 'h264ify_disable_webm',
                        dataH264ifyCodec: 'true',
                        dataIndex: '1',
                        ariaDisabled: config.h264ify ? 'false' : 'true'
                    }, [
                        el('div', { className: 'vt-setting-info' }, [
                            el('span', { className: 'vt-setting-title', textContent: locale.settings.h264ify.disable_codec_title.replaceAll('{codec}', 'WebM') }),
                            el('span', { className: 'vt-setting-description', textContent: locale.settings.h264ify.disable_codec_description.replaceAll('{codec}', 'WebM') })
                        ]),
                        el('div', { className: 'vt-setting-control' }, [
                            createToggle('h264ify_disable_webm', config.h264ify_disable_webm)
                        ])
                    ]),
                    el('div', {
                        className: `vt-setting-item ${config.h264ify ? '' : 'vt-setting-item-inactive'}`.trim(),
                        dataSetting: 'h264ify_disable_vp8',
                        dataH264ifyCodec: 'true',
                        dataIndex: '2',
                        ariaDisabled: config.h264ify ? 'false' : 'true'
                    }, [
                        el('div', { className: 'vt-setting-info' }, [
                            el('span', { className: 'vt-setting-title', textContent: locale.settings.h264ify.disable_codec_title.replaceAll('{codec}', 'VP8') }),
                            el('span', { className: 'vt-setting-description', textContent: locale.settings.h264ify.disable_codec_description.replaceAll('{codec}', 'VP8') })
                        ]),
                        el('div', { className: 'vt-setting-control' }, [
                            createToggle('h264ify_disable_vp8', config.h264ify_disable_vp8)
                        ])
                    ]),
                    el('div', {
                        className: `vt-setting-item ${config.h264ify ? '' : 'vt-setting-item-inactive'}`.trim(),
                        dataSetting: 'h264ify_disable_vp9',
                        dataH264ifyCodec: 'true',
                        dataIndex: '3',
                        ariaDisabled: config.h264ify ? 'false' : 'true'
                    }, [
                        el('div', { className: 'vt-setting-info' }, [
                            el('span', { className: 'vt-setting-title', textContent: locale.settings.h264ify.disable_codec_title.replaceAll('{codec}', 'VP9') }),
                            el('span', { className: 'vt-setting-description', textContent: locale.settings.h264ify.disable_codec_description.replaceAll('{codec}', 'VP9') })
                        ]),
                        el('div', { className: 'vt-setting-control' }, [
                            createToggle('h264ify_disable_vp9', config.h264ify_disable_vp9)
                        ])
                    ]),
                    el('div', {
                        className: `vt-setting-item ${config.h264ify ? '' : 'vt-setting-item-inactive'}`.trim(),
                        dataSetting: 'h264ify_disable_av1',
                        dataH264ifyCodec: 'true',
                        dataIndex: '4',
                        ariaDisabled: config.h264ify ? 'false' : 'true'
                    }, [
                        el('div', { className: 'vt-setting-info' }, [
                            el('span', { className: 'vt-setting-title', textContent: locale.settings.h264ify.disable_codec_title.replaceAll('{codec}', 'AV1') }),
                            el('span', { className: 'vt-setting-description', textContent: locale.settings.h264ify.disable_codec_description.replaceAll('{codec}', 'AV1') })
                        ]),
                        el('div', { className: 'vt-setting-control' }, [
                            createToggle('h264ify_disable_av1', config.h264ify_disable_av1)
                        ])
                    ])
                ]),
                el('div', { className: 'vt-scrollbar', id: 'vt-h264ify-scrollbar' }, [
                    el('div', { className: 'vt-scrollbar-thumb', id: 'vt-h264ify-scrollbar-thumb' })
                ])
            ])
        ])
    },

    setup() {
        viewport.setup()
    },

    onShow() {
        viewport.reset()
        updateInactiveState()
    },

    onFocusItem(element) {
        viewport.scrollTo(element)
    },

    onConfigUpdate(config) {
        if (!config) return;

        if (config.h264ify === undefined) return;

        updateInactiveState()
    }
}
