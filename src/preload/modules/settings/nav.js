//finds the nearest focusable element in a direction, using on-screen positions

//the overlay is split into regions marked with data-nav-group, and focus stays in the current region until nothing is left in that direction
//content scrolled out of sight is still present above and below the viewport, so distance alone would skip past it into another region

//distance between two 1d intervals, 0 if they overlap
function gap(a1, a2, b1, b2) {
    return Math.max(0, b1 - a2, a1 - b2);
}

//[distance along the direction, distance across it]
function measure(from, to, direction) {
    switch (direction) {
        case 'up': return [ from.top - to.bottom, gap(from.left, from.right, to.left, to.right) ];
        case 'down': return [ to.top - from.bottom, gap(from.left, from.right, to.left, to.right) ];
        case 'left': return [ from.left - to.right, gap(from.top, from.bottom, to.top, to.bottom) ];
        case 'right': return [ to.left - from.right, gap(from.top, from.bottom, to.top, to.bottom) ];
    }
}

//the closest element in nodes in that direction from origin
function nearest(origin, direction, nodes, exclude) {
    let best = null;
    let bestScore = Infinity;
    let bestAligned = false;

    for (const node of nodes) {
        if (node === exclude) continue;

        const rect = node.getBoundingClientRect()
        if (!rect.width && !rect.height) continue;

        const [ primary, cross ] = measure(origin, rect, direction)
        if (primary < -2) continue; //not in that direction

        //an element in the same column or row takes priority over one that is offset
        const aligned = cross === 0;
        const score = primary + cross * 3;

        if ((aligned && !bestAligned) || (aligned === bestAligned && score < bestScore)) {
            best = node;
            bestScore = score;
            bestAligned = aligned;
        }
    }

    return best;
}

//closest region in that direction, by the region's own box
function nextGroup(group, direction, root) {
    const origin = group.getBoundingClientRect()

    let best = null;
    let bestDistance = Infinity;

    for (const other of root.querySelectorAll('[data-nav-group]')) {
        if (other === group) continue;

        const [ primary ] = measure(origin, other.getBoundingClientRect(), direction)
        if (primary < -2 || primary >= bestDistance) continue;

        best = other;
        bestDistance = primary;
    }

    return best;
}

/**
 * @param {HTMLElement} from - the currently focused element
 * @param {'up'|'down'|'left'|'right'} direction
 * @param {HTMLElement} root - contains the `[data-nav-group]` regions
 * @returns {HTMLElement|null}
 */
function findNext(from, direction, root) {
    const origin = from.getBoundingClientRect()
    const group = from.closest('[data-nav-group]') || root;

    const inside = nearest(origin, direction, group.querySelectorAll('.vt-focusable'), from)
    if (inside) return inside;

    //skip past regions with nothing focusable in them
    for (let next = nextGroup(group, direction, root); next; next = nextGroup(next, direction, root)) {
        const nodes = next.querySelectorAll('.vt-focusable')
        if (nodes.length) return nearest(origin, direction, nodes) || nodes[0];
    }

    return null;
}

module.exports = { findNext }