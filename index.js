//initialization
const electron = require('electron')
const { autoUpdater } = require('electron-updater')
const path = require('path')

electron.app.setName('VacuumTube')

const userData = electron.app.getPath('userData')
const sessionData = path.join(userData, 'sessionData')
electron.app.setPath('sessionData', sessionData)

const configManager = require('./config.js')
const package = require('./package.json')

//code
/*
about the user agent:
leanback is extremely weird about user agents, a lot of ones do really different things for no reason. i can't imagine what the backend code looks like for this
but, this is using the most optimal one i've been able to create

Mozilla/5.0 makes youtube think it's a "DESKTOP" device
(PS4; Leanback Shell) is part of the user agent of the ps4 youtube app, i chose ps4 because it's the most versatile in this situation since it gives the most up-to-date ui, and allows the zoom hack to work for some reason (can't replicate this on any other uas???)
Cobalt/26.lts.0-qa is the latest cobalt version, cobalt is the browser the tv youtube app tends to run in internally
the actual ps4 ua has more to it, but this is all that's needed for it to work here
the "compatible" and "VacuumTube" part are just for transparency's sake, and to make sure they can detect it so i'm not screwing up any internal logging/analytics

i currently don't like using the ps4 one, but i can't seem to find a better one. i'd prefer to use one that appears as chromium instead, so that it doesn't potentially do any cobalt-specific stuff
i also don't like that it says "PlayStation 4" in the "App version" category of settings. i have found a way to change what it displays, but i'm not going to do that in fear of it breaking some other stuff or something
if you think you can find a better one that adheres to what i think is best, please open an issue or a pr or something! i've lost hours over this lol
*/
const userAgent = `Mozilla/5.0 (PS4; Leanback Shell) Cobalt/26.lts.0-qa; compatible; VacuumTube/${package.version}`
const runningOnSteam = process.env.SteamOS == '1' && process.env.SteamGamepadUI == '1'

let win;
let config;

async function main() {
    if (process.argv.includes('--version') || process.argv.includes('-v')) {
        process.stdout.write(`VacuumTube ${package.version}\n`, () => { //console.log then process.exit isn't safe since console.log is async, so that's why it's done with process.stdout instead
            process.exit(0)
        })

        return;
    }

    if (runningOnSteam) electron.app.commandLine.appendSwitch('--no-sandbox') //won't run without this in game mode for me

    config = configManager.init(path.join(userData, 'config.json'), {
        fullscreen: !!runningOnSteam //if running on steam in game mode, override fullscreen to be on by default
    })

    if (!config.hardware_decoding) {
        electron.app.commandLine.appendSwitch('disable-accelerated-video-decode')
    }

    //not needed until i add sponsorblock and dearrow support
    /*
    electron.session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
        if (details.responseHeaders['content-security-policy']) {
            for (let i = 0; i < details.responseHeaders['content-security-policy'].length; i++) {
                let header = details.responseHeaders['content-security-policy'][i]

                let connectPattern = /connect-src\s([^;]*)/
                let match = header.match(connectPattern)
                if (match) {
                    let existing = match[1]
                    let additions = 'sponsor.ajay.app dearrow-thumb.ajay.app'
                    let updated = `connect-src ${existing} ${additions}`
                    header = header.replace(connectPattern, updated)

                    details.responseHeaders['content-security-policy'][i] = header;
                }
            }
        }

        callback({
            responseHeaders: details.responseHeaders
        })
    })
    */

    //config management on the web side
    electron.ipcMain.on('get-config', (event) => {
        event.returnValue = config;
    })

    electron.ipcMain.on('set-config', (event, newConfig) => {
        configManager.update(newConfig)
        config = configManager.get()

        if (win) {
            win.webContents.send('config-update', config)
        }

        event.returnValue = config;
    })

    electron.ipcMain.handle('is-focused', () => {
        if (win) {
            return win.isFocused();
        } else {
            return false;
        }
    })

    electron.ipcMain.handle('reload', () => {
        if (win) {
            win.webContents.reload()
        }
    })

    electron.ipcMain.handle('set-fullscreen', (e, value) => {
        if (win) {
            win.setFullScreen(value)
        }
    })

    electron.ipcMain.handle('set-on-top', (e, value) => {
        if (win) {
            win.setAlwaysOnTop(value)
        }
    })

    electron.ipcMain.handle('set-zoom', (e, amount) => {
        if (win) {
            win.webContents.setZoomLevel(amount)
        }
    })

    createWindow()

    electron.app.on('activate', () => {
        if (electron.BrowserWindow.getAllWindows().length === 0) createWindow()
    })
}

async function createWindow() {
    let fullscreen = process.argv.includes('--fullscreen') || runningOnSteam || config.fullscreen || false;

    win = new electron.BrowserWindow({
        width: 1200,
        height: 675,
        backgroundColor: '#282828',
        fullscreen, //this sometimes doesn't work for people, so it's repeated below
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: false,
            sandbox: false, //allows me to use node apis in preload, but doesn't allow youtube to do so (solely need node apis for requiring the modules)
            preload: path.join(__dirname, 'preload/index.js')
        }
    })

    // Ensure the *content* area (excluding OS window borders) stays 16:9 on all platforms.
    const [ outerW, outerH ] = win.getSize()
    const [ innerW, innerH ] = win.getContentSize()
    const extraWidth = outerW - innerW;
    const extraHeight = outerH - innerH;

    const TARGET_RATIO = 16 / 9;
    const isWindows = process.platform === 'win32'

    if (isWindows) {
        // Custom resize handling for Windows where OS chrome breaks outer-ratio locking.
        // To keep this implementation simple, we'll prevent the user from resizing
        // the window on the wide side. It will automatically adjust the height.
        win.on('will-resize', (event, newBounds) => {
            event.preventDefault()

            const contentW = newBounds.width - extraWidth;
            const adjustedContentH = Math.round(contentW / TARGET_RATIO)

            win.setBounds({
                width: newBounds.width,
                height: adjustedContentH + extraHeight
            })
        })

        win.setBounds({
            width: outerW,
            height: Math.round((outerW - extraWidth) / TARGET_RATIO) + extraHeight
        })
    } else {
        // Built-in electron aspect ratio lock works fine on Linux.
        win.setAspectRatio(TARGET_RATIO)
    }

    win.setMenuBarVisibility(false)
    win.setAutoHideMenuBar(false)

    win.on('ready-to-show', () => {
        win.setFullScreen(fullscreen)
        win.setAlwaysOnTop(config.keep_on_top)
        win.show()
    })

    if (process.argv.includes('--debug-gpu')) {
        console.log('loading chrome://gpu')
        win.loadURL('chrome://gpu', { userAgent })
        return;
    }

    let url = new URL('https://www.youtube.com/tv')
    if (config.low_memory_mode) {
        url.searchParams.append('env_isLimitedMemory', true) //makes youtube disable a lot of animations and other fancy stuff
    }

    url.searchParams.append('env_enableMediaStreams', true) //fixes voice search

    console.log(`loading youtube from ${url.href}`)
    win.loadURL(url.href, { userAgent })

    //remember fullscreen preference
    win.on('enter-full-screen', () => {
        configManager.update({ fullscreen: true })
        config = configManager.get()
        win.webContents.send('config-update', config)
    })

    win.on('leave-full-screen', () => {
        configManager.update({ fullscreen: false })
        config = configManager.get()
        win.webContents.send('config-update', config)
    })

    //for the controller support to know whether or not the window itself is in focus
    win.addListener('focus', () => {
        win.webContents.send('focus')
    })

    win.addListener('blur', () => {
        win.webContents.send('blur')
    })

    //keep window title as VacuumTube
    win.webContents.on('page-title-updated', () => {
        win.setTitle('VacuumTube')
    })
}

electron.app.once('ready', () => {
    autoUpdater.checkForUpdatesAndNotify()
    main()
})

electron.app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') electron.app.quit()
})

electron.app.on('before-quit', () => {
    configManager.save()
})