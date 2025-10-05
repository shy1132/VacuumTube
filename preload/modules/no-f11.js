//block youtube from seeing f11 being pressed so it doesn't impede the user trying to toggle fullscreen

module.exports = () => {
    document.addEventListener('keydown', (e) => {
        if (e.key === 'F11') {
            e.stopImmediatePropagation()
        }
    }, true)
}