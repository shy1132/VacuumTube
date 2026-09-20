//transform-based scrolling for the settings content area
//used instead of native scrolling to bypass leanback's scroll interception

const MARGIN = 16;

let viewport = null;
let list = null;
let thumb = null;
let offset = 0;

function maxOffset() {
    return Math.max(0, list.scrollHeight - viewport.clientHeight);
}

function apply(value) {
    if (!list) return;

    offset = Math.max(0, Math.min(maxOffset(), value))
    list.style.transform = `translateY(-${offset}px)`

    const viewportHeight = viewport.clientHeight;
    const listHeight = list.scrollHeight;
    const scrollbar = thumb.parentElement;

    //hide scrollbar if content fits
    if (listHeight <= viewportHeight) {
        scrollbar.classList.remove('vt-scrollbar-visible')
        return;
    }

    scrollbar.classList.add('vt-scrollbar-visible')

    const thumbHeight = Math.max(30, (viewportHeight / listHeight) * viewportHeight)
    const thumbTop = (offset / maxOffset()) * (viewportHeight - thumbHeight)
    thumb.style.height = `${thumbHeight}px`
    thumb.style.transform = `translateY(${thumbTop}px)`
}

//scrolls an element in the list into view
function scrollTo(element) {
    if (!list || !list.contains(element)) return;

    const top = element.getBoundingClientRect().top - list.getBoundingClientRect().top;
    const bottom = top + element.offsetHeight;

    //scrolls to the top for the first focusable element, so the headers above it stay visible
    if (list.querySelector('.vt-focusable') === element) {
        apply(0)
    } else if (bottom - offset > viewport.clientHeight - MARGIN) {
        apply(bottom - viewport.clientHeight + MARGIN)
    } else if (top < offset + MARGIN) {
        apply(top - MARGIN)
    } else {
        apply(offset) //content may have changed size
    }
}

function reset() {
    apply(0)
}

//touch drag and mouse wheel scrolling, called once after the dom is injected
function attach(viewportElement, listElement, thumbElement) {
    viewport = viewportElement;
    list = listElement;
    thumb = thumbElement;

    let touchStartY = 0;
    let startOffset = 0;
    let dragging = false;

    viewport.addEventListener('touchstart', (e) => {
        if (e.touches.length !== 1) return;
        touchStartY = e.touches[0].clientY;
        startOffset = offset;
        dragging = true;
        list.style.transition = 'none'
    }, { passive: true })

    viewport.addEventListener('touchmove', (e) => {
        if (!dragging || e.touches.length !== 1) return;
        apply(startOffset + touchStartY - e.touches[0].clientY)
    }, { passive: true })

    const endDrag = () => {
        dragging = false;
        list.style.transition = ''
    }

    viewport.addEventListener('touchend', endDrag, { passive: true })
    viewport.addEventListener('touchcancel', endDrag, { passive: true })

    viewport.addEventListener('wheel', (e) => {
        e.preventDefault()
        e.stopPropagation()
        apply(offset + e.deltaY)
    }, { passive: false })
}

module.exports = {
    attach,
    scrollTo,
    reset,
    refresh: () => apply(offset)
}