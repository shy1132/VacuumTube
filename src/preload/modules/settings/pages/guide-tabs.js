const configManager = require('../../../config')
const GUIDE_TABS = [ 'search', 'shorts', 'subscriptions', 'library', 'gaming', 'music', 'news', 'podcasts', 'movies_and_tv', 'live', 'sports' ]

module.exports = {
    id: 'guide_tabs',
    GUIDE_TABS,

    title: (locale) => locale.guide_tabs.title,
    description: (locale) => locale.guide_tabs.description,

    rows: (config, locale) => GUIDE_TABS.map((name) => ({
        type: 'toggle',
        id: `guide-tab-${name}`,
        title: locale.guide_tabs.tabs?.[name] || name,
        get: (config) => !(config.disabled_tabs || []).includes(name),
        set: (on, config) => {
            const disabled = (config.disabled_tabs || []).filter((tab) => tab !== name)
            configManager.set({ disabled_tabs: on ? disabled : [ ...disabled, name ] })
        }
    }))
}