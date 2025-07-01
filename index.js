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
const userAgent = `Mozilla/5.0 (PS4; Leanback Shell) Cobalt/26.lts.0-qa; compatible; VacuumTube/${package.version}` //leanback is really weird about its user agents, but ps4 allows the zoom hack to work for some reason. also added "compatible" and "VacuumTube" just to be transparent
const runningOnSteam = process.env.SteamOS == '1' && process.env.SteamGamepadUI == '1'

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

    electron.session.defaultSession.webRequest.onBeforeSendHeaders((details, callback) => {
        if (details.requestHeaders['User-Agent']) details.requestHeaders['User-Agent'] = userAgent;
        callback({ cancel: false, requestHeaders: details.requestHeaders })
    })

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

    createWindow()

    electron.app.on('activate', () => {
        if (electron.BrowserWindow.getAllWindows().length === 0) createWindow()
    })
}

async function createWindow() {
    let fullscreen = process.argv.includes('--fullscreen') || runningOnSteam || config.fullscreen || false;

    let mainWindow = new electron.BrowserWindow({
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

    mainWindow.setAspectRatio(16 / 9)
    mainWindow.setMenuBarVisibility(false)
    mainWindow.setAutoHideMenuBar(false)

    mainWindow.on('ready-to-show', () => {
        mainWindow.setFullScreen(fullscreen)
        mainWindow.setAlwaysOnTop(config.keep_on_top)
        mainWindow.show()
    })

    if (process.argv.includes('--debug-gpu')) {
        mainWindow.loadURL('chrome://gpu', { userAgent })
    } else {
        let url = new URL('https://www.youtube.com/tv/')
        if (config.low_memory_mode) {
            url.searchParams.append('env_isLimitedMemory', true)
        }

        url.searchParams.append('env_enableMediaStreams', true) //fixes voice search

        console.log(`loading youtube from ${url.href}`)
        mainWindow.loadURL(url.href, { userAgent })
    }

    //remember fullscreen preference
    mainWindow.on('enter-full-screen', async () => {
        configManager.update({ fullscreen: true })
        config = configManager.get()
        mainWindow.webContents.send('config-update', config)
    })

    mainWindow.on('leave-full-screen', async () => {
        configManager.update({ fullscreen: false })
        config = configManager.get()
        mainWindow.webContents.send('config-update', config)
    })

    //config management on the web side
    electron.ipcMain.on('get-config', (event) => {
        event.returnValue = config;
    })

    electron.ipcMain.on('set-config', (event, newConfig) => {
        configManager.update(newConfig)
        config = configManager.get()
        mainWindow.webContents.send('config-update', config)
        event.returnValue = config;
    })

    //for the controller support to know whether or not the window itself is in focus
    mainWindow.addListener('focus', () => {
        mainWindow.webContents.send('focus')
    })

    mainWindow.addListener('blur', () => {
        mainWindow.webContents.send('blur')
    })

    electron.ipcMain.handle('is-focused', () => {
        return mainWindow.isFocused();
    })

    //keep window title as VacuumTube
    mainWindow.webContents.on('page-title-updated', () => {
        mainWindow.setTitle('VacuumTube')
    })

    //trickery to make it always enable high res quality options
    //todo: better way to do this? the zoom hack is noticeable because the profile pictures on the "who's watching?" screen will jump a bit
    electron.ipcMain.on('player-started-loading', () => {
        mainWindow.webContents.setZoomLevel(-10)
        electron.ipcMain.once('player-finished-loading', () => {
            mainWindow.webContents.setZoomLevel(0)
        })
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