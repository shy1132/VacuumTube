if (location.host === 'www.youtube.com') {
    let modules = [
        require('./modules/flags'),
        require('./modules/settings'),
        require('./modules/fix-reloads'),
        require('./modules/enable-highres'),
        require('./modules/keybinds'),
        require('./modules/controller-support'),
        require('./modules/touch-controls'),
        require('./modules/mouse-disappear'),
        require('./modules/prevent-visibilitychange'),
        require('./modules/override-f11'),
        require('./modules/adblock'),
        require('./modules/h264ify')
    ]

    for (let module of modules) {
        try {
            module()
        } catch (err) {
            console.error('a module experienced failure while loading', err)
        }
    }
}