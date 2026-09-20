//keeps track of the focused element and moves focus with the arrow keys
//elements with the vt-focusable class and a data-nav-id are focusable

const overlay = require('./overlay')
const scroll = require('./scroll')
const { findNext } = require('./nav')

let focusId = null;

function current() {
    return overlay.root()?.querySelector('.vt-focused') || null;
}

function id() {
    return focusId;
}

function set(node) {
    overlay.root().querySelectorAll('.vt-focused').forEach((node) => node.classList.remove('vt-focused'))

    node.classList.add('vt-focused')
    focusId = node.dataset.navId;
    scroll.scrollTo(node)
}

//sets the nav id restore() looks for after the next render
function want(navId = null) {
    focusId = navId;
}

function first() {
    const list = overlay.list()
    const node = list.querySelector('.vt-row.vt-focusable') || list.querySelector('.vt-focusable')
    if (node) set(node)
}

function restore(wanted = focusId) {
    const node = wanted && overlay.root().querySelector(`[data-nav-id="${CSS.escape(wanted)}"]`)

    if (node) {
        set(node)
    } else {
        first()
    }
}

function isTab(node) {
    return node.classList.contains('vt-tab');
}

/**
 * Moves focus one step in the given direction.
 *
 * @param {'up'|'down'|'left'|'right'} direction
 * @param {(index: number) => void} onCategoryChange - called when focus moves from one tab to another
 */
function move(direction, onCategoryChange) {
    const from = current()
    if (!from) return first();

    let next = findNext(from, direction, overlay.root())
    if (!next) return;

    if (isTab(next) && !isTab(from)) {
        next = overlay.root().querySelector('.vt-tab.vt-tab-selected') || next;
    }

    set(next)

    if (isTab(next) && isTab(from)) {
        onCategoryChange(Number(next.dataset.index))
    }
}

module.exports = {
    current,
    id,
    set,
    want,
    first,
    restore,
    move
}