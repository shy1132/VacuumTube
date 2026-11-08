//Use native fullscreen everywhere except an explicitly selected Windows display.
function createFullscreenDisplay({ screen, getWindow, getDisplayId, platform = process.platform }) {
    function target() {
        if (platform !== 'win32' || getDisplayId() === null) return null;
        return screen.getAllDisplays().find((display) => display.id === getDisplayId()) || null;
    }

    function setFullscreen(value) {
        const win = getWindow()
        if (!win) return;
        const display = value && !win.isFullScreen() ? target() : null;
        if (display) {
            if (win.isMaximized()) win.unmaximize()
            const bounds = win.getBounds()
            const [contentWidth, contentHeight] = win.getContentSize()
            const chromeWidth = bounds.width - contentWidth;
            const chromeHeight = bounds.height - contentHeight;
            const area = display.workArea;
            const width = Math.max(1, Math.min(bounds.width, area.width,
                Math.floor((area.height - chromeHeight) * 16 / 9 + chromeWidth)))
            const height = Math.max(1, Math.round((width - chromeWidth) * 9 / 16) + chromeHeight)
            win.setBounds({
                x: area.x + Math.floor((area.width - width) / 2),
                y: area.y + Math.floor((area.height - height) / 2),
                width, height
            })
        }
        win.setFullScreen(value)
    }

    function onInput(event, input) {
        if (input.key !== 'F11' || input.control || input.alt || input.meta || input.shift || !target()) return;
        event.preventDefault()
        if (input.type === 'keyDown' && !input.isAutoRepeat) {
            const win = getWindow()
            if (win) setFullscreen(!win.isFullScreen())
        }
    }

    return { target, setFullscreen, onInput };
}

module.exports = { createFullscreenDisplay }
