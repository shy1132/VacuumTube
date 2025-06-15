let modules = [
    require('./modules/events'),
    require('./modules/keybinds'),
    require('./modules/controller-support'),
    require('./modules/touch-controls'),
    require('./modules/mouse-disappear'),
    require('./modules/prevent-visibilitychange'),
    require('./modules/override-f11'),
    require('./modules/adblock'),
    require('./modules/h264ify'),
    require('./modules/settings')
]

if (location.host === 'www.youtube.com') {
    for (let module of modules) {
        module()
    }
}