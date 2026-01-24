if (location.host === 'www.youtube.com' && location.pathname === '/tv') {
    const xhrModifiers = require('./util/xhrModifiers')
    xhrModifiers.block() //it makes an xhr request pretty fast as soon as it loads, so fast that some modules don't have time to modify it...

    const fs = require('fs')
    const path = require('path')

    let modulesPath = path.join(__dirname, 'modules')
    let moduleFiles = fs.readdirSync(modulesPath, { withFileTypes: true })

    let modules = []
    for (let file of moduleFiles) {
        let modulePath;
        if (file.isDirectory()) {
            modulePath = path.join(modulesPath, file.name + '/index.js')
        } else if (file.name.endsWith('.js')) {
            modulePath = path.join(modulesPath, file.name)
        } else {
            continue;
        }

        modules.push(require(modulePath))
    }

    for (let module of modules) {
        try {
            module()
        } catch (err) {
            console.error('a module experienced failure while loading', err)
        }
    }

    xhrModifiers.unblock()
}