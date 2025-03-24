//initialization
const electron = require('electron')
const { ElectronBlocker } = require('@ghostery/adblocker-electron')
const path = require('path')
const stateManager = require('./state.js')
const package = require('./package.json')
const { app, BrowserWindow } = electron;

app.setName('VacuumTube')

const userData = app.getPath('userData')
const sessionData = path.join(userData, 'sessionData')
app.setPath('sessionData', sessionData)

//code
const userAgent = `Mozilla/5.0 (PS4; Leanback Shell) Cobalt/26.lts.0-qa; compatible; VacuumTube/${package.version}` //leanback is really weird about its user agents, but ps4 is optimal. also, added "compatible" and VacuumTube name just to be transparent...
const runningOnDeck = process.env.SteamOS == '1' && process.env.SteamGamepadUI == '1'

let state;

async function main() {
    if (runningOnDeck) app.commandLine.appendSwitch('--no-sandbox') //wont run without this in game mode for me

    state = await stateManager.init(path.join(userData, 'state.json'), {
        fullscreen: !!runningOnDeck //if running on steam deck in game mode, default fullscreen
    })

    let blocker = await ElectronBlocker.fromPrebuiltFull()
    blocker.enableBlockingInSession(electron.session.defaultSession)

    electron.session.defaultSession.webRequest.onBeforeSendHeaders((details, callback) => {
        if (details.requestHeaders['User-Agent']) details.requestHeaders['User-Agent'] = userAgent;
        callback({ cancel: false, requestHeaders: details.requestHeaders })
    })

    createWindow()

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
}

async function createWindow() {
    let mainWindow = new BrowserWindow({
        width: 1200,
        height: 600,
        autoHideMenuBar: true,
        backgroundColor: '#282828',
        fullscreen: state.fullscreen,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: false,
            preload: path.join(__dirname, 'preload.js')
        }
    })

    mainWindow.loadURL('https://www.youtube.com/tv/', { userAgent })

    //keep window title as VacuumTube
    mainWindow.webContents.on('page-title-updated', () => {
        mainWindow.setTitle('VacuumTube')
    })

    //trickery to make it always enable high res quality options
    mainWindow.webContents.on('did-start-loading', () => {
        mainWindow.webContents.setZoomLevel(-10)
        mainWindow.webContents.once('did-finish-loading', () => {
            mainWindow.webContents.setZoomLevel(0)
        })
    })

    //remember fullscreen preference
    mainWindow.on('enter-full-screen', async () => {
        state.fullscreen = true;
        await stateManager.update(state)
    })

    mainWindow.on('leave-full-screen', async () => {
        state.fullscreen = false;
        await stateManager.update(state)
    })

    mainWindow.on('closed', () => {
        mainWindow = null;
    })
}

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit()
})

main()