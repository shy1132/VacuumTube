//make mouse disappear after a bit of no movement

module.exports = () => {
    let visible = true;
    let lastUse = 0;

    setInterval(() => {
        if (!visible) return;
        if ((Date.now() - lastUse) >= 3000) {
            hideCursor()
        }
    }, 20)

    window.addEventListener('mousemove', () => {
        lastUse = Date.now()
        showCursor()
    })

    window.addEventListener('mousedown', () => {
        lastUse = Date.now()
        showCursor()
    })

    function showCursor() {
        document.documentElement.style.cursor = 'default'
        visible = true;
    }

    function hideCursor() {
        document.documentElement.style.cursor = 'none'
        visible = false;
    }
}