//panel for toggling YouTube guide tabs

const { el } = require('../dom')
const scroll = require('../scroll')
const configManager = require('../../../config')

const viewport = scroll.bindViewport('guide-tabs')

let locale = null;

const GUIDE_TABS = [ 'search', 'shorts', 'subscriptions', 'library', 'gaming', 'music', 'news', 'podcasts', 'movies_and_tv', 'live', 'sports' ]

function disabledList() {
    return configManager.get().disabled_tabs || [];
}

function toggleTab(name) {
    const list = disabledList()
    const next = list.includes(name) ? list.filter((t) => t !== name) : [ ...list, name ];

    configManager.set({ disabled_tabs: next })
    updateStates()
}

function updateStates() {
    const root = document.querySelector('.vt-content-panel[data-panel="guide_tabs"]')
    if (!root) return;

    const list = disabledList()

    root.querySelectorAll('.vt-guide-tab-item').forEach((item) => {
        const isEnabled = !list.includes(item.dataset.tab)
        const toggle = item.querySelector('.vt-toggle')
        if (toggle) toggle.classList.toggle('vt-toggle-on', isEnabled)
    })
}

module.exports = {
    id: 'guide_tabs',

    init(ctx) {
        locale = ctx.locale;
    },

    render() {
        const disabled = disabledList()

        return el('div', { className: 'vt-guide-tabs-section' }, [
            el('p', {
                className: 'vt-guide-tabs-description',
                textContent: locale.settings.guide_tabs.description
            }),
            el('div', { className: 'vt-guide-tabs-viewport' }, [
                el('div', { className: 'vt-guide-tabs-list', id: 'vt-guide-tabs-list' },
                    GUIDE_TABS.map((name, idx) => {
                        const isEnabled = !disabled.includes(name)
                        const label = locale.settings.guide_tabs.tabs?.[name] || name;

                        return el('div', {
                            className: 'vt-guide-tab-item',
                            dataTab: name,
                            dataIndex: String(idx)
                        }, [
                            el('span', { className: 'vt-guide-tab-name', textContent: label }),
                            el('div', { className: 'vt-guide-tab-toggle' }, [
                                el('div', { className: `vt-toggle ${isEnabled ? 'vt-toggle-on' : ''}` }, [
                                    el('div', { className: 'vt-toggle-track' }, [
                                        el('div', { className: 'vt-toggle-thumb' })
                                    ])
                                ])
                            ])
                        ])
                    })
                ),
                el('div', { className: 'vt-scrollbar', id: 'vt-guide-tabs-scrollbar' }, [
                    el('div', { className: 'vt-scrollbar-thumb', id: 'vt-guide-tabs-scrollbar-thumb' })
                ])
            ])
        ])
    },

    setup() {
        viewport.setup()
    },

    onShow() {
        viewport.reset()
        updateStates()
    },

    onFocusItem(element) {
        viewport.scrollTo(element)
    },

    onActivate(element) {
        const name = element?.dataset?.tab;
        if (!name) return;

        toggleTab(name)
    },

    onConfigUpdate(config) {
        if (!config) return;
        if (config.disabled_tabs === undefined) return;

        updateStates()
    }
}