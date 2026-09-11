const { el, createToggle } = require('../dom')
const scroll = require('../scroll')
const configManager = require('../../../config')

const viewport = scroll.bindViewport('sponsorblock')

const SPONSORBLOCK_CATEGORIES = [ 'sponsor', 'selfpromo', 'interaction', 'intro', 'outro', 'preview', 'hook', 'filler' ]

function getConfig() {
    return configManager.get()
}

function updateInactiveState() {
    const root = document.querySelector('.vt-content-panel[data-panel="sponsorblock"]')
    if (!root) return;

    const isEnabled = !!getConfig().sponsorblock

    root.querySelectorAll('.vt-setting-item[data-sponsorblock="true"]').forEach((item) => {
        item.classList.toggle('vt-setting-item-inactive', !isEnabled)
        item.setAttribute('aria-disabled', isEnabled ? 'false' : 'true')
    })
}

module.exports = {
    id: 'sponsorblock',

    init(ctx) {
        locale = ctx.locale
    },

    render() {
        const config = getConfig()

        return el('div', { className: 'vt-sponsorblock-section' }, [
            el('div', { className: 'vt-sponsorblock-viewport' }, [
                el('div', { className: 'vt-sponsorblock-list', id: 'vt-sponsorblock-list' }, [
                    el('div', {
                        className: 'vt-setting-item',
                        dataSetting: 'sponsorblock',
                        dataIndex: '0'
                    }, [
                        el('div', { className: 'vt-setting-info' }, [
                            el('span', { className: 'vt-setting-title', textContent: locale.settings.sponsorblock.title }),
                            el('span', { className: 'vt-setting-description', textContent: locale.settings.sponsorblock.description })
                        ]),
                        el('div', { className: 'vt-setting-control' }, [
                            createToggle('sponsorblock', config.sponsorblock)
                        ])
                    ]),

                    ...SPONSORBLOCK_CATEGORIES.map((name, idx) => {
                        const setting_name = `sponsorblock_skip_${name}`

                          return el('div', {
                            className: `vt-setting-item ${config.sponsorblock? '' : 'vt-setting-item-inactive'}`.trim(),
                            dataSetting: setting_name,
                            dataSponsorblock: 'true',
                            dataIndex: String(idx + 1)
                        }, [
                            el('div', { className: 'vt-setting-info' }, [
                                el('span', { className: 'vt-setting-title', textContent: locale.settings.sponsorblock.categories[name].name}),
                                el('span', { className: 'vt-setting-description', textContent: locale.settings.sponsorblock.categories[name].description })
                            ]),
                            el('div', { className: 'vt-setting-control' }, [
                                createToggle(setting_name, config[setting_name])
                            ])
                        ])
                    })
                ]),
                el('div', { className: 'vt-scrollbar', id: 'vt-sponsorblock-scrollbar' }, [
                    el('div', { className: 'vt-scrollbar-thumb', id: 'vt-sponsorblock-scrollbar-thumb' })
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

        if (config.sponsorblock === undefined) return;

        updateInactiveState()
    }
}
