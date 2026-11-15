//the VacuumTube settings overlay (ctrl+o)
//to add or change a setting, see schema.js

//scripts
//overlay.js builds the frame
//render.js builds the current view from the schema
//focus.js and nav.js handle arrow key movement
//input.js maps events to the actions below

const fs = require('fs')
const path = require('path')
const { ipcRenderer, shell } = require('electron')
const configManager = require('../../config')
const css = require('../../util/css')
const localeProvider = require('../../util/localeProvider')
const functions = require('../../util/functions')
const { renderCategory, renderPage } = require('./render')
const overlay = require('./overlay')
const focus = require('./focus')
const input = require('./input')
const scroll = require('./scroll')
const pages = require('./pages')
const schema = require('./schema')

let locale = null; //locale.settings
let categories = []
let markOpened = () => {}

const state = {
    open: false,
    category: 0,
    page: null //{ page, fromHeader, returnFocus, parent } while a page is open, parent is the page it was opened from
}

let renderCount = 0;
let renderedView = null;

function currentCategory() {
    return categories[state.category];
}

function categoryTabIndex() {
    return state.page?.fromHeader ? -1 : state.category;
}

async function render() {
    if (!state.open) return;

    const renderId = ++renderCount;
    const config = configManager.get()
    const context = {
        config,
        locale,
        pages,
        openPage,
        openChoice,
        goBack,
        translation: localeProvider.getTranslation(),
        openTranslation: () => shell.openExternal('https://github.com/shy1132/VacuumTube/blob/main/locale/README.md')
    }

    let view;
    if (state.page) {
        const page = state.page.page;
        const sections = page.sections ? await page.sections(config, locale) : [ { rows: await page.rows(config, locale) } ]

        if (renderId !== renderCount) return; //a newer render replaced this one

        view = renderPage(page, sections, parentTitle(), context)
    } else {
        view = renderCategory(currentCategory(), context)
    }

    overlay.list().replaceChildren(view)
    overlay.markSelectedTab(categoryTabIndex())

    const viewId = `${currentCategory().id}/${state.page?.page.id}`
    if (viewId !== renderedView) {
        renderedView = viewId;
        scroll.reset()
    }

    focus.restore()
}

function parentTitle() {
    const parent = state.page.parent?.page;
    if (parent) return typeof parent.title === 'function' ? parent.title(locale) : parent.title;

    return state.page.fromHeader ? locale.generic.title : locale.categories[currentCategory().id]?.title;
}

//actions

function openCategory(index) {
    state.category = index;
    state.page = null;
    return render();
}

async function openPage(id, { fromHeader = false, focusId = null } = {}) {
    const page = typeof id === 'string' ? pages[id] : id;

    state.page = { page, fromHeader: fromHeader || !!state.page?.fromHeader, returnFocus: focus.id(), parent: state.page }
    focus.want(focusId)
    await render()

    if (page.onOpen) {
        const refresh = () => state.open && state.page?.page === page ? render() : Promise.resolve()

        await page.onOpen({ refresh })
        await render()
    }
}

function openChoice(row) {
    const strings = locale[row.key]
    const format = row.format || String;

    return openPage({
        id: `choice:${row.key}`,
        title: row.title ?? strings?.title,
        description: row.description ?? strings?.description,
        rows: (config) => row.options.map((value) => ({
            type: 'option',
            id: `option:${value}`,
            title: format(value),
            selected: config[row.key] === value,
            select: () => {
                configManager.set({ [row.key]: value })
                goBack()
            }
        }))
    }, { focusId: `row:option:${configManager.get()[row.key]}` });
}

//closes the open page, or the overlay if no page is open
function goBack() {
    if (!state.page) return close();

    focus.want(state.page.returnFocus)
    state.page = state.page.parent;
    return render();
}

async function activate(node = focus.current()) {
    if (!node?.vtActivate) return;

    focus.set(node)

    try {
        const running = node.vtActivate()
        if (running instanceof Promise) {
            await render()
            await running;
        }
    } catch (err) {
        console.error('[Settings Overlay] Action failed:', err)
    }

    render()
}

function open() {
    if (window.ytcfg.data_.INNERTUBE_CLIENT_NAME === 'TVHTML5_FOR_KIDS') return;

    state.open = true;
    state.page = null;
    state.category = 0;
    focus.want(`tab:${currentCategory().id}`) //opens on the category tab, not the first setting
    markOpened()

    overlay.show()
    render()
}

function close() {
    state.open = false;
    overlay.hide()
}

function toggle() {
    if (state.open) {
        close()
    } else {
        open()
    }
}

module.exports = async () => {
    await localeProvider.waitUntilAvailable()
    await functions.waitForCondition(() => !!document.body)

    locale = localeProvider.getLocale().settings;
    categories = schema(locale).filter((category) => !category.hide)

    css.inject('settings', fs.readFileSync(path.join(__dirname, 'style.css'), 'utf-8'))

    document.body.appendChild(overlay.create(categories, locale, {
        //activating a tab moves focus into the settings, arrow keys across the tabs do not
        openCategory: async (index) => {
            await openCategory(index)
            focus.first()
        },
        openAbout: () => openPage('about', { fromHeader: true }),
        close
    }))

    scroll.attach(
        document.querySelector('.vt-content-viewport'),
        overlay.list(),
        document.getElementById('vt-content-scrollbar-thumb')
    )

    markOpened = input.listen({
        isOpen: () => state.open,
        toggle,
        close,
        back: goBack,
        move: (direction) => focus.move(direction, openCategory),
        activate
    }).markOpened;

    ipcRenderer.on('config-update', render)

    window.vtOpenSettingsOverlay = open;
    window.vtToggleSettingsOverlay = toggle;
}

module.exports.openSettingsOverlay = open;