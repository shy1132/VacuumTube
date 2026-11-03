//the overlay frame: header, category tabs, and the container the current view is rendered into
//everything inside the content area is built by render.js

const { el } = require('../../util/functions')

//actions are the handlers for the frame's buttons and tabs
function create(categories, locale, actions) {
    const tabs = categories.map((category, index) => {
        const tab = el('div', {
            className: 'vt-focusable vt-tab',
            dataNavId: `tab:${category.id}`,
            dataIndex: String(index)
        }, [
            el('span', { textContent: locale.categories[category.id]?.title || category.id })
        ])

        tab.vtActivate = () => actions.openCategory(index)
        return tab;
    })

    const about = el('div', {
        className: 'vt-focusable vt-settings-icon-button',
        dataNavId: 'about',
        title: locale.about.title
    }, [ el('span', { textContent: '?' }) ])

    const close = el('div', {
        className: 'vt-focusable vt-settings-icon-button',
        dataNavId: 'close'
    }, [ el('span', { textContent: '✕' }) ])

    about.vtActivate = actions.openAbout;
    close.vtActivate = actions.close;

    return el('div', { id: 'vt-settings-overlay-root', className: 'vt-settings-hidden', tabindex: '-1' }, [
        el('div', { className: 'vt-settings-backdrop' }),
        el('div', { className: 'vt-settings-container' }, [
            //nav groups limit arrow key movement to one area at a time, see nav.js
            el('div', { className: 'vt-settings-header', dataNavGroup: 'header' }, [
                el('span', { className: 'vt-settings-title', textContent: locale.generic.title }),
                el('span', { className: 'vt-settings-hint', textContent: locale.generic.hint }),
                about,
                close
            ]),
            el('div', { className: 'vt-tabbar', dataNavGroup: 'tabs' }, tabs),
            el('div', { className: 'vt-content-viewport', dataNavGroup: 'content' }, [
                el('div', { className: 'vt-content-list', id: 'vt-content-list' }),
                el('div', { className: 'vt-scrollbar' }, [
                    el('div', { className: 'vt-scrollbar-thumb', id: 'vt-content-scrollbar-thumb' })
                ])
            ])
        ])
    ]);
}

function root() {
    return document.getElementById('vt-settings-overlay-root');
}

function list() {
    return document.getElementById('vt-content-list');
}

function show() {
    root().classList.remove('vt-settings-hidden')
    root().focus()
}

function hide() {
    root().classList.add('vt-settings-hidden')
    root().blur()
}

//highlights the open category, or no tab when a page was opened from the header
function markSelectedTab(index) {
    const tabs = root().querySelectorAll('.vt-tab')
    tabs.forEach((tab) => {
        tab.classList.toggle('vt-tab-selected', Number(tab.dataset.index) === index)
    })

    const selected = tabs[index]
    const bar = root().querySelector('.vt-tabbar')
    if (!selected || !bar) return;

    const tabBounds = selected.getBoundingClientRect()
    const barBounds = bar.getBoundingClientRect()
    if (tabBounds.left < barBounds.left) {
        bar.scrollLeft -= barBounds.left - tabBounds.left;
    } else if (tabBounds.right > barBounds.right) {
        bar.scrollLeft += tabBounds.right - barBounds.right;
    }
}

module.exports = {
    create,
    root,
    list,
    show,
    hide,
    markSelectedTab
}