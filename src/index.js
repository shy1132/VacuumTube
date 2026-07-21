//initialization
const electron = require('electron')
const { autoUpdater } = require('electron-updater')
const path = require('path')
const fs = require('fs')
const minimist = require('minimist')
const stringArgv = require('string-argv')
const package = require('../package.json')

const appId = package.build?.appId || 'rocks.shy.VacuumTube'

const argv = minimist(process.argv)

electron.app.setName('VacuumTube')

let userData = electron.app.getPath('userData')

let portablePath = portable()
if (portablePath) {
    electron.app.setPath('userData', portablePath)
    userData = electron.app.getPath('userData')
}

const sessionData = path.join(userData, 'sessionData')
electron.app.setPath('sessionData', sessionData)

const configManager = require('./config.js')
const permissions = require('./permissions.js')
const userstyles = require('./userstyles.js')

//code
/*
about the user agent:
leanback is extremely weird about user agents, a lot of ones do really different things for no reason. i can't imagine what the backend code looks like for this
but, this is using the most optimal one i've been able to create

Mozilla/5.0 makes youtube think it's a "DESKTOP" device
(PS4; Leanback Shell) is part of the user agent of the ps4 youtube app, i chose ps4 because it's the most versatile in this situation since it gives the most up-to-date ui
Cobalt/26.lts.0-qa is the latest cobalt version, cobalt is the browser the tv youtube app tends to run in internally
ON CLIENT SIDE: Cobalt/19.lts.0-qa is an older cobalt version so that youtube doesn't automatically assume widevine is supported
the actual ps4 ua has more to it, but this is all that's needed for it to work here
the "compatible" and "VacuumTube" part are just for transparency's sake, and to make sure they can detect it so i'm not screwing up any internal logging/analytics

this is only used because you have to have a good user agent to be "allowed" onto leanback, and many innertube endpoints check the user agent specifically to know what to send (e.g. high quality thumbnails)
VacuumTube overrides some things to identify properly, but this user agent has to be sent with every request to youtube sadly
*/
const youtubeClientUserAgent =
  `Mozilla/5.0 (PS4; Leanback Shell) Cobalt/19.lts.0-qa; compatible; VacuumTube/${package.version}`
// Cobalt 25 appears to resolve issue #198 while preserving HQ thumbnails. 
const youtubeUserAgent =
  `Mozilla/5.0 (PS4; Leanback Shell) Cobalt/25.lts.40.1035033; compatible; VacuumTube/${package.version}`
const userAgent = `VacuumTube/${package.version}` //for anything else

const youtubeUrl = 'https://www.youtube.com/tv'
const runningOnSteam = process.env.SteamOS === '1' && process.env.SteamGamepadUI === '1'

let win;
let config;

async function main() {
    if (argv['version'] || argv['v']) {
        process.stdout.write(`VacuumTube ${package.version}\n`, () => { //console.log then process.exit isn't safe since console.log is async, so that's why it's done with process.stdout instead
            process.exit(0)
        })

        return;
    }

    if (runningOnSteam) {
        electron.app.commandLine.appendSwitch('--no-sandbox') //won't run without this in game mode for me
    }

    config = configManager.init({
        fullscreen: !!runningOnSteam //if running on steam in game mode, override fullscreen to be on by default (note that this was broken from 1.3.0 until 1.3.6 due to config bug)
    })

    const flagsPath = path.join(userData, 'flags.txt')
    if (fs.existsSync(flagsPath)) {
        let extraFlags = fs.readFileSync(flagsPath, 'utf-8').trim()
        let arg = stringArgv.parseArgsStringToArgv(extraFlags)
        let parsed = minimist(arg)

        for (let [ key, value ] of Object.entries(parsed)) {
            if (key === '_') {
                continue;
            }

            electron.app.commandLine.appendSwitch(key, value)
        }
    }

    let enabledFeatures = electron.app.commandLine.getSwitchValue('enable-features').split(',')
    let disabledFeatures = electron.app.commandLine.getSwitchValue('disable-features').split(',')

    if (process.platform === 'linux' && !config.wayland_hdr) {
        disabledFeatures.push('WaylandWpColorManagerV1') //colors on wayland are super washed out in newer chromium versions for some reason, but this seems to fix it
    }

    if (!config.hardware_decoding) {
        electron.app.disableHardwareAcceleration()
    } else {
        enabledFeatures.push('AcceleratedVideoEncoder')
        enabledFeatures.push('AcceleratedVideoDecoder')

        if (process.platform === 'linux') {
            enabledFeatures.push('AcceleratedVideoDecodeLinuxGL')
            enabledFeatures.push('AcceleratedVideoDecodeLinuxZeroCopyGL')
        }
    }

    enabledFeatures = [ ...new Set(enabledFeatures.filter(f => f)) ]
    disabledFeatures = [ ...new Set(disabledFeatures.filter(f => f && !enabledFeatures.includes(f))) ]

    if (enabledFeatures.length > 0) {
        electron.app.commandLine.appendSwitch('enable-features', enabledFeatures.join(','))
    }

    if (disabledFeatures.length > 0) {
        electron.app.commandLine.appendSwitch('disable-features', disabledFeatures.join(','))
    }

    electron.app.on('window-all-closed', () => {
        if (process.platform !== 'darwin') electron.app.quit()
    })

    electron.app.on('before-quit', () => {
        configManager.save()
    })

    await electron.app.whenReady()

    autoUpdater.checkForUpdatesAndNotify()
    permissions.setup({ appId })

    //general request modification
    electron.session.defaultSession.webRequest.onBeforeRequest((details, callback) => {
        let url = new URL(details.url)
        if (url.host === 'csp.withgoogle.com') return callback({ cancel: true }); //electron refuses to modify or remove the Report-To header, so i just block csp by domain. they have specific csp endpoints for the cobalt engine, and i don't wanna mess with those analytics

        callback({ cancel: false })
    })

    //general response modification
    electron.session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
        let url = new URL(details.url)
        if (url.host !== 'www.youtube.com') return callback({ cancel: false });

        delete details.responseHeaders['content-security-policy-report-only'];

        // CSP override for userstyles and sponsorblock/dearrow support, and other minor fixes (like allowing data urls since they're used)
        if (details.responseHeaders['content-security-policy']) {
            for (let i = 0; i < details.responseHeaders['content-security-policy'].length; i++) {
                let header = details.responseHeaders['content-security-policy'][i]

                //allow eval (it's used by youtube for bot checks)
                let trustedTypesPattern = /require-trusted-types-for\s+'script'/
                let trustedTypesMatch = header.match(trustedTypesPattern)
                if (trustedTypesMatch) {
                    header = header.replace(/require-trusted-types-for\s+'script';?\s*/g, '')
                }

                // Allow unsafe-inline, data URLs, and external stylesheets for userstyles
                // Remove nonces since unsafe-inline is ignored when nonces are present
                // this has to be done even if userstyles are disabled, since they can be enabled live
                let styleSrcPattern = /style-src\s([^;]*)/
                let styleSrcMatch = header.match(styleSrcPattern)
                if (styleSrcMatch) {
                    let existing = styleSrcMatch[1]
                    // Remove all nonce values and add unsafe-inline, data URLs, and wildcard for @import
                    let withoutNonces = existing.replace(/'nonce-[^']*'/g, '').trim()
                    let updated = `style-src ${withoutNonces} 'unsafe-inline' data: *`
                    header = header.replace(styleSrcPattern, updated)
                }

                // Allow external fonts
                // also has to be done even if userstyles are disabled
                let fontSrcPattern = /font-src\s([^;]*)/
                let fontSrcMatch = header.match(fontSrcPattern)
                if (fontSrcMatch) {
                    let existing = fontSrcMatch[1]
                    let updated = `font-src ${existing} * data:`
                    header = header.replace(fontSrcPattern, updated)
                }

                //sponsorblock and return youtube dislike
                let connectPattern = /connect-src\s([^;]*)/
                let connectMatch = header.match(connectPattern)
                if (connectMatch) {
                    let existing = connectMatch[1]
                    let additions = 'sponsor.ajay.app returnyoutubedislikeapi.com data:'
                    let updated = `connect-src ${existing} ${additions}`
                    header = header.replace(connectPattern, updated)
                }

                //dearrow
                let imgPattern = /img-src\s([^;]*)/
                let imgMatch = header.match(imgPattern)
                if (imgMatch) {
                    let existing = imgMatch[1]
                    let additions = 'dearrow-thumb.ajay.app'
                    let updated = `img-src ${existing} ${additions}`
                    header = header.replace(imgPattern, updated)
                }

                details.responseHeaders['content-security-policy'][i] = header;
            }
        }

        callback({
            responseHeaders: details.responseHeaders
        })
    })

    electron.session.defaultSession.webRequest.onBeforeSendHeaders((details, callback) => {
        let url = new URL(details.url)
        if (url.host === 'www.youtube.com') {
            details.requestHeaders['User-Agent'] = youtubeUserAgent;
        } else {
            details.requestHeaders['User-Agent'] = userAgent;
        }

        callback({
            requestHeaders: details.requestHeaders
        })
    })

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

    //etc helpers
    electron.ipcMain.handle('is-focused', () => {
        if (win) {
            return win.isFocused();
        } else {
            return false;
        }
    })

    electron.ipcMain.handle('is-steam', () => {
        return runningOnSteam;
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

    electron.ipcMain.handle('get-deeplink', () => {
        let deeplink = argv._[argv._.length - 1]
        if (deeplink) {
            return deeplink;
        } else {
            return null;
        }
    })

    electron.ipcMain.handle('relaunch-app', () => {
        electron.app.relaunch()
        electron.app.quit()
    })

    userstyles.setup({ userData, getWindow: () => win })

    await createWindow()

    userstyles.startWatcher()

    electron.app.on('activate', () => {
        if (electron.BrowserWindow.getAllWindows().length === 0) createWindow()
    })
}

async function createWindow() {
    let fullscreen = argv['fullscreen'] || runningOnSteam || config.fullscreen || false;
    let noWindowDecs = argv['no-window-decorations'] || config.no_window_decorations || false;

    win = new electron.BrowserWindow({
        width: 1200,
        height: 675,
        backgroundColor: '#282828',
        fullscreen, //this sometimes doesn't work for people, so it's repeated below
        fullscreenable: true, //explicitly enable fullscreen functionality on macOS
        titleBarStyle: noWindowDecs ? 'hidden' : 'default',
        frame: noWindowDecs ? false : true,
        icon: './assets/icon.png',
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: false,
            sandbox: false, //allows me to use node apis in preload, but doesn't allow youtube to do so (solely need node apis for requiring the modules)
            nodeIntegrationInSubFrames: true, //since nodeIntegration is already false, it doesn't actually enable nodeIntegration in frames, but it does enable the preload script in frames which is needed for some weird edgecases where youtube may place the entirety of leanback in a frame
            preload: path.join(__dirname, 'preload/index.js')
        },
        title: 'VacuumTube'
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
        // Built-in electron aspect ratio lock works fine elsewhere.
        win.setAspectRatio(TARGET_RATIO)
    }

    win.setMenuBarVisibility(false)
    win.setAutoHideMenuBar(false)

    win.once('ready-to-show', () => {
        win.setFullScreen(fullscreen)
        win.setAlwaysOnTop(config.keep_on_top)
        win.show()
    })

    if (argv['debug-gpu']) {
        console.log('Loading chrome://gpu')
        win.loadURL('chrome://gpu', { userAgent })
        return;
    }

    if (argv['enable-devtools']) {
        console.log('Launching with developer tools enabled')
        win.webContents.toggleDevTools()
    }

    console.log(`Loading ${youtubeUrl}`)
    win.loadURL(youtubeUrl, { userAgent: youtubeClientUserAgent })

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

function portable() {
    try {
        let exeDir;
        if (process.platform === 'linux' && process.env.APPIMAGE) {
            exeDir = path.dirname(process.env.APPIMAGE)
        } else {
            exeDir = path.dirname(electron.app.getPath('exe'))
        }

        let portablePath = null;
        if (fs.existsSync(path.join(exeDir, './portable.txt'))) {
            let str = fs.readFileSync(path.join(exeDir, './portable.txt'), 'utf-8')
            if (str && str.trim().length !== 0) {
                portablePath = str.trim()
            } else {
                portablePath = path.join(exeDir, 'data')
            }
        } else if (argv['portable'] === true || argv['p'] === true) { //arg specified, but not set to any particular path 
            portablePath = path.join(exeDir , 'data')
        } else if (argv['portable']) { //--portable arg specified, set to particular path
            portablePath = argv['portable']
        } else if (argv['p']) { //-p arg specified, set to particular path
            portablePath = argv['p']
        }

        return portablePath;
    } catch (err) {
        console.error('Failed to detect portable mode, assuming non-portable', err)
        return null;
    }
}

main()
