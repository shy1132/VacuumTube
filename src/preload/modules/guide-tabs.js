//toggle guide tabs

const xhrModifiers = require('../util/xhrModifiers')
const configManager = require('../config')
const config = configManager.get()

const map = {
    'SEARCH': 'search',
    //'WHAT_TO_WATCH': 'home', //disabling this breaks stuff because it tries to default to the home tab
    'YOUTUBE_SHORTS_FILL_24': 'shorts',
    'SUBSCRIPTIONS': 'subscriptions',
    'TAB_LIBRARY': 'library',
    'GAMING': 'gaming',
    'YOUTUBE_MUSIC': 'music',
    'NEWS': 'news',
    'BROADCAST': 'podcasts',
    'CLAPPERBOARD': 'movies_and_tv',
    'LIVE': 'live',
    'TROPHY': 'sports'
}

module.exports = () => {
    const disabledTabs = new Set(config.disabled_tabs)
    if (disabledTabs.size === 0) return;

    xhrModifiers.addResponseModifier(async (url, text) => {
        if (!url.startsWith('/youtubei/v1/guide')) return;

        let json = JSON.parse(text)
        let section = json.items[json.items.length - 1]

        if (section.guideSectionRenderer?.items) {
            section.guideSectionRenderer.items = section.guideSectionRenderer.items.filter(i => !disabledTabs.has(map[i.guideEntryRenderer?.icon?.iconType]))
        }

        return JSON.stringify(json);
    })
}