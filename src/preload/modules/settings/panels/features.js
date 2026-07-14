const { el, createSettingItem } = require('../dom')
const scroll = require('../scroll')
const configManager = require('../../../config')

const viewport = scroll.bindViewport('features')

let locale = null;

function updateFeatureState(config = configManager.get()) {
    const root = document.querySelector('.vt-content-panel[data-panel="features"]')
    if (!root) return;

    const musicModeItem = root.querySelector('.vt-setting-item[data-setting="music_mode_feature"]')
    if (!musicModeItem) return;

    const enabled = config.features_enabled === true;
    musicModeItem.classList.toggle('vt-setting-item-inactive', !enabled)
    musicModeItem.setAttribute('aria-disabled', enabled ? 'false' : 'true')
}

module.exports = {
    id: 'features',

    init(ctx) {
        locale = ctx.locale
    },

    render() {
        const config = configManager.get()
        const enableFeaturesItem = createSettingItem(
            'features_enabled',
            locale.settings.features.enable_title,
            locale.settings.features.enable_description,
            config.features_enabled,
            true
        )
        const musicModeItem = createSettingItem(
            'music_mode_feature',
            locale.settings.features.music_mode_title,
            locale.settings.features.music_mode_description,
            config.music_mode_feature
        )

        musicModeItem.dataset.index = '1';
        musicModeItem.classList.toggle('vt-setting-item-inactive', config.features_enabled !== true)
        musicModeItem.setAttribute('aria-disabled', config.features_enabled === true ? 'false' : 'true')

        return el('div', { className: 'vt-features-section' }, [
            el('div', { className: 'vt-features-viewport' }, [
                el('div', { className: 'vt-features-list', id: 'vt-features-list' }, [
                    el('div', { className: 'vt-features-notice' }, [
                        el('span', {
                            className: 'vt-features-notice-icon',
                            textContent: '!',
                            ariaHidden: 'true'
                        }),
                        el('div', { className: 'vt-features-notice-copy' }, [
                            el('span', {
                                className: 'vt-features-notice-title',
                                textContent: locale.settings.features.notice_title
                            }),
                            el('p', {
                                className: 'vt-features-notice-description',
                                textContent: locale.settings.features.notice_description
                            })
                        ])
                    ]),
                    enableFeaturesItem,
                    musicModeItem
                ]),
                el('div', { className: 'vt-scrollbar', id: 'vt-features-scrollbar' }, [
                    el('div', {
                        className: 'vt-scrollbar-thumb',
                        id: 'vt-features-scrollbar-thumb'
                    })
                ])
            ])
        ])
    },

    setup() {
        viewport.setup()
    },

    onShow() {
        viewport.reset()
        updateFeatureState()
    },

    onFocusItem(element) {
        viewport.scrollTo(element)
    },

    onConfigUpdate(config) {
        updateFeatureState(config)
    }
}
