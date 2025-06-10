//don't tell youtube when application is minimized, otherwise it'll sometimes stop playback

module.exports = () => {
    document.addEventListener('visibilitychange', (e) => {
        e.stopImmediatePropagation()
    })

    document.addEventListener('webkitvisibilitychange', (e) => {
        e.stopImmediatePropagation()
    })
}