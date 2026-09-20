//builds the dom for a category or a page, and is the only place that defines the row types
//an interactive row has the vt-focusable class, a data-nav-id, and a vtActivate function

const configManager = require('../../config')
const { el } = require('../../util/functions')

function rowId(row) {
    return row.id || row.key || (row.page && `link-${row.page}`) || row.title;
}

function resolve(value, ...args) {
    return typeof value === 'function' ? value(...args) : value;
}

function focusable(navId, className, children, activate) {
    const node = el('div', { className: `vt-focusable ${className}`, dataNavId: navId }, children)
    node.vtActivate = activate;
    return node;
}

function info(title, description) {
    return el('div', { className: 'vt-row-info' }, [
        el('span', { className: 'vt-row-title', textContent: title || '' }),
        description ? el('span', { className: 'vt-row-description', textContent: description }) : null
    ]);
}

/*
the row types a schema or page can use:
    toggle  - { key } for a config key, or { id, title, get(config), set(value, config) } for anything else
              also takes { page, summary?(config) }, which adds a link to a page of extra options below it while the toggle is on
    link    - { page, title, summary?(config) } opens a page that has no on/off of its own
    button  - { title, run() } runs an action, which may be async
    notice  - { text, title?, tone? } a callout, tone is info (default), success, warning or error
    info    - { title, value } a label with a read-only value
    text    - { text } a line of text, either a string or (config) => string

and the fields any row takes:
    dependsOn - config key, the row is greyed out and cannot be activated while that key is off
    disabled  - greys the row out the same way
    hide      - leaves the row out, for platform specific settings
    onChange  - toggles only, runs after the value changes
    title, description - override the text taken from the locale
*/
const rowTypes = {
    toggle(row, context) {
        const on = row.get ? !!row.get(context.config) : !!context.config[row.key]
        const strings = context.locale[row.key] //a toggle's title and description default to the locale entry for its config key

        return focusable(`row:${rowId(row)}`, 'vt-row', [
            info(row.title ?? strings?.title, row.description ?? strings?.description),
            el('div', { className: `vt-toggle${on ? ' vt-toggle-on' : ''}` }, [
                el('div', { className: 'vt-toggle-thumb' })
            ])
        ], () => {
            if (row.set) {
                row.set(!on, context.config)
            } else {
                configManager.set({ [row.key]: !on })
            }

            row.onChange?.(!on)
        });
    },

    link(row, context) {
        return focusable(`row:${rowId(row)}`, 'vt-row vt-row-link', [
            info(row.title, row.description),
            el('span', { className: 'vt-row-value', textContent: resolve(row.summary, context.config) || '' }),
            el('span', { className: 'vt-chevron', textContent: '›' })
        ], () => context.openPage(row.page));
    },

    button(row) {
        return focusable(`row:${rowId(row)}`, 'vt-row vt-row-button', [
            info(row.title, row.description)
        ], () => row.run());
    },

    notice(row, context) {
        return el('div', { className: `vt-notice vt-notice-${row.tone || 'info'}` }, [
            info(row.title, resolve(row.text, context.config))
        ]);
    },

    info(row, context) {
        return el('div', { className: 'vt-row vt-row-static' }, [
            info(row.title, row.description),
            el('span', { className: 'vt-row-value', textContent: resolve(row.value, context.config) ?? '' })
        ]);
    },

    text(row, context) {
        return el('div', { className: 'vt-text', textContent: resolve(row.text, context.config) });
    }
}

//builds the link shown below a toggle that has a page, while the toggle is on
function subLink(row, context) {
    const page = context.pages[row.page]
    const node = rowTypes.link({ page: row.page, title: resolve(page.title, context.locale), summary: row.summary }, context)
    node.classList.add('vt-row-sub')
    return node;
}

function renderRow(row, context) {
    const node = rowTypes[row.type](row, context)
    const active = (!row.dependsOn || context.config[row.dependsOn]) && !row.disabled;

    if (!active) {
        node.classList.add('vt-inactive')
        node.vtActivate = null;
    }

    if (row.type === 'toggle' && row.page && active && context.config[row.key]) {
        return [ node, subLink(row, context) ];
    }

    return [ node ];
}

//removes hidden rows and falsy entries, so pages can use `condition && row`
function visibleRows(rows) { 
    return (rows || []).filter((row) => row && !row.hide);
}

function card(rows, context) {
    return el('div', { className: 'vt-card' }, visibleRows(rows).flatMap((row) => renderRow(row, context)));
}

function viewHeader({ title, description, count, badge, icon }) {
    return el('div', { className: 'vt-view-header' }, [
        icon ? el('img', { className: 'vt-view-icon', src: icon, alt: '' }) : null,
        el('div', { className: 'vt-view-heading' }, [
            el('h2', { className: 'vt-view-title', textContent: title || '' }),
            description ? el('p', { className: 'vt-view-description', textContent: description }) : null
        ]),
        count ? el('span', { className: 'vt-view-count', textContent: count }) : null,
        badge ? el('span', { className: 'vt-view-badge', textContent: badge }) : null
    ]);
}

function countFocusable(rows) {
    return visibleRows(rows).filter((row) => [ 'toggle', 'link', 'button' ].includes(row.type)).length;
}

function renderCategory(category, context) {
    const sections = category.sections.filter((section) => !section.hide && visibleRows(section.rows).length)
    const count = sections.reduce((n, section) => n + countFocusable(section.rows), 0)
    const meta = context.locale.categories[category.id] || {}

    return el('div', { className: 'vt-view' }, [
        viewHeader({
            title: meta.title,
            description: meta.description,
            count: context.locale.generic.option_count.replace('{count}', count)
        }),
        el('div', { className: 'vt-section-grid' }, sections.map((section) =>
            el('section', { className: 'vt-section' }, [
                el('h3', { className: 'vt-section-title', textContent: context.locale.sections[section.id] || '' }),
                card(section.rows, context)
            ])
        ))
    ]);
}

//sections comes from page.sections(), or from page.rows() wrapped as a single section
//parentTitle is the view the back button returns to, shown in the breadcrumb
function renderPage(page, sections, parentTitle, context) {
    const title = resolve(page.title, context.locale)

    return el('div', { className: 'vt-view vt-view-page' }, [
        focusable('back', 'vt-back', [
            el('span', { className: 'vt-chevron', textContent: '‹' }),
            el('span', { textContent: `${parentTitle} / ${resolve(page.crumb, context.locale) || title}` })
        ], () => context.goBack()),
        viewHeader({
            title,
            description: resolve(page.description, context.locale),
            badge: resolve(page.badge, context.locale),
            icon: page.icon
        }),
        ...sections.filter((section) => section && visibleRows(section.rows).length).map((section) =>
            el('section', { className: 'vt-section' }, [
                section.title ? el('h3', { className: 'vt-section-title', textContent: section.title }) : null,
                card(section.rows, context)
            ])
        )
    ]);
}

module.exports = {
    renderCategory,
    renderPage
}