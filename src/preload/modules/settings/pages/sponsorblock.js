const CATEGORIES = [ 'sponsor', 'selfpromo', 'interaction', 'intro', 'outro', 'preview', 'hook', 'filler' ]
const SPONSORBLOCK_KEYS = CATEGORIES.map((name) => `sponsorblock_skip_${name}`)

module.exports = {
    id: 'sponsorblock',
    SPONSORBLOCK_KEYS,

    title: (locale) => locale.sponsorblock.categories_link,

    rows: (config, locale) => CATEGORIES.map((name) => ({
        type: 'toggle',
        key: `sponsorblock_skip_${name}`,
        title: locale.sponsorblock.categories[name].name,
        description: locale.sponsorblock.categories[name].description,
        dependsOn: 'sponsorblock'
    }))
}