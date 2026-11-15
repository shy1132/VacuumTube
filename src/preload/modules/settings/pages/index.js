//every page a `link` row (or a toggle's `page`) can open, keyed by id
//a page is:
//    id
//    title(locale)                   - a string, or a function of the locale. the same applies to the optional fields below
//    rows(config, locale)            - the page's rows, may be async
//    sections(config, locale)        - used instead of rows for several cards: [{ title?, rows }]
//    description?, badge?, icon?     - extra header content (icon is an image url)
//    crumb?                          - breadcrumb label, if it should differ from the title
//    onOpen?({ refresh })            - called when the page opens, may be async. store `refresh` to redraw later

const pages = [
    require('./about'),
    require('./sponsorblock'),
    require('./h264ify'),
    require('./guide-tabs'),
    require('./userstyles'),
    require('./features'),
    require('./mac-permissions')
]

module.exports = Object.fromEntries(pages.map((page) => [ page.id, page ]))