//transform-based scrolling for the settings overlay's viewports
//used instead of native scrolling to bypass leanback's scroll interception

const scrollOffsets = {}

function resolve(selector) {
    return document.querySelector(selector) || document.getElementById(selector.replace('#', ''));
}

function updateScrollbar(viewport, list, scrollOffset, thumbSelector) {
    if (!thumbSelector) return;

    const thumb = resolve(thumbSelector)
    const scrollbar = thumb?.parentElement;
    if (!thumb || !scrollbar) return;

    const viewportHeight = viewport.clientHeight;
    const listHeight = list.scrollHeight;

    //hide scrollbar if content fits
    if (listHeight <= viewportHeight) {
        scrollbar.classList.remove('vt-scrollbar-visible')
        return;
    }

    scrollbar.classList.add('vt-scrollbar-visible')

    //calculate thumb size (proportional to visible area)
    const thumbHeight = Math.max(30, (viewportHeight / listHeight) * viewportHeight)
    thumb.style.height = `${thumbHeight}px`

    //calculate thumb position
    const maxScroll = listHeight - viewportHeight;
    const scrollPercent = maxScroll > 0 ? scrollOffset / maxScroll : 0;
    const maxThumbTop = viewportHeight - thumbHeight;
    const thumbTop = scrollPercent * maxThumbTop;

    thumb.style.transform = `translateY(${thumbTop}px)`
}

/**
 * Updates transform-based scrolling for a viewport/list pair, scrolling the
 * focused element into view.
 *
 * @param {string} viewportSelector - CSS selector for the viewport (overflow:hidden container)
 * @param {string} listSelector - CSS selector or id for the scrollable list inside viewport
 * @param {HTMLElement} focusedElement - The element to scroll into view
 * @param {string} [scrollbarThumbSelector] - Optional CSS selector for custom scrollbar thumb
 */
function updateViewportScroll(viewportSelector, listSelector, focusedElement, scrollbarThumbSelector) {
    const viewport = document.querySelector(viewportSelector)
    const list = resolve(listSelector)
    if (!list || !viewport) return;

    const scrollId = listSelector;

    if (scrollOffsets[scrollId] === undefined) {
        scrollOffsets[scrollId] = 0;
    }

    if (!list.contains(focusedElement)) {
        list.style.transform = 'translateY(0px)'
        scrollOffsets[scrollId] = 0;
        updateScrollbar(viewport, list, 0, scrollbarThumbSelector)
        return;
    }

    const viewportHeight = viewport.clientHeight;
    const itemTop = focusedElement.offsetTop;
    const itemHeight = focusedElement.offsetHeight;
    const itemBottom = itemTop + itemHeight;

    if (itemBottom - scrollOffsets[scrollId] > viewportHeight) {
        scrollOffsets[scrollId] = itemBottom - viewportHeight + 10;
    } else if (itemTop < scrollOffsets[scrollId]) {
        scrollOffsets[scrollId] = Math.max(0, itemTop - 10)
    }

    list.style.transform = `translateY(-${scrollOffsets[scrollId]}px)`
    updateScrollbar(viewport, list, scrollOffsets[scrollId], scrollbarThumbSelector)
}

/**
 * Touch drag scrolling for a viewport/list pair. Call once per viewport after the DOM is ready.
 *
 * @param {string} viewportSelector - CSS selector for the viewport container
 * @param {string} listSelector - CSS selector or id for the scrollable list
 * @param {string} [scrollbarThumbSelector] - Optional CSS selector for scrollbar thumb
 */
function setupTouchScroll(viewportSelector, listSelector, scrollbarThumbSelector) {
    const viewport = document.querySelector(viewportSelector)
    const list = resolve(listSelector)
    if (!viewport || !list) return;

    const scrollId = listSelector;
    let touchStartY = 0;
    let startScrollOffset = 0;
    let isDragging = false;

    viewport.addEventListener('touchstart', (e) => {
        if (e.touches.length !== 1) return;
        touchStartY = e.touches[0].clientY;
        startScrollOffset = scrollOffsets[scrollId] || 0;
        isDragging = true;
        list.style.transition = 'none'
    }, { passive: true })

    viewport.addEventListener('touchmove', (e) => {
        if (!isDragging || e.touches.length !== 1) return;

        const touchY = e.touches[0].clientY;
        const deltaY = touchStartY - touchY;

        const viewportHeight = viewport.clientHeight;
        const listHeight = list.scrollHeight;
        const maxScroll = Math.max(0, listHeight - viewportHeight)

        let newOffset = startScrollOffset + deltaY;
        newOffset = Math.max(0, Math.min(maxScroll, newOffset))

        scrollOffsets[scrollId] = newOffset;
        list.style.transform = `translateY(-${newOffset}px)`
        updateScrollbar(viewport, list, newOffset, scrollbarThumbSelector)
    }, { passive: true })

    const endDrag = () => {
        if (!isDragging) return;
        isDragging = false;
        list.style.transition = ''
    }

    viewport.addEventListener('touchend', endDrag, { passive: true })
    viewport.addEventListener('touchcancel', endDrag, { passive: true })
}

/**
 * Resets the scroll position for a viewport/list pair.
 *
 * @param {string} listSelector - CSS selector or id for the scrollable list
 * @param {string} [scrollbarThumbSelector] - Optional CSS selector for custom scrollbar thumb
 */
function resetViewportScroll(listSelector, scrollbarThumbSelector) {
    const list = resolve(listSelector)
    if (list) {
        list.style.transform = 'translateY(0px)'
    }

    scrollOffsets[listSelector] = 0;

    //reset scrollbar thumb position
    if (scrollbarThumbSelector) {
        const thumb = resolve(scrollbarThumbSelector)
        if (thumb) {
            thumb.style.transform = 'translateY(0px)'
        }
    }
}

/**
 * Binds the scroll helpers to a single named viewport, following the id/class
 * convention `.vt-<name>-viewport` / `#vt-<name>-list` / `#vt-<name>-scrollbar-thumb`.
 * Lets a panel wire up scrolling without repeating selector strings.
 */
function bindViewport(name) {
    const viewport = `.vt-${name}-viewport`
    const list = `#vt-${name}-list`
    const thumb = `#vt-${name}-scrollbar-thumb`

    return {
        setup: () => setupTouchScroll(viewport, list, thumb),
        scrollTo: (element) => updateViewportScroll(viewport, list, element, thumb),
        reset: () => resetViewportScroll(list, thumb)
    };
}

module.exports = {
    updateViewportScroll,
    setupTouchScroll,
    resetViewportScroll,
    bindViewport
}