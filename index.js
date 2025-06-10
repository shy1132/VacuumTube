//initialization
const electron = require('electron')
const { autoUpdater } = require('electron-updater')
const path = require('path')
const stateManager = require('./state.js')
const package = require('./package.json')
const { app, BrowserWindow } = electron;

app.setName('VacuumTube')

const userData = app.getPath('userData')
const sessionData = path.join(userData, 'sessionData')
app.setPath('sessionData', sessionData)

//code
const userAgent = `Mozilla/5.0 (PS4; Leanback Shell) Cobalt/26.lts.0-qa; compatible; VacuumTube/${package.version}` //leanback is really weird about its user agents, but ps4 allows the zoom hack to work for some reason. also added "compatible" and "VacuumTube" just to be transparent
const runningOnSteam = process.env.SteamOS == '1' && process.env.SteamGamepadUI == '1'

let state;

async function main() {
    if (runningOnSteam) app.commandLine.appendSwitch('--no-sandbox') //won't run without this in game mode for me

    state = await stateManager.init(path.join(userData, 'state.json'), {
        fullscreen: !!runningOnSteam //if running on steam in game mode, default fullscreen
    })

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
        height: 675,
        backgroundColor: '#282828',
        fullscreen: state.fullscreen,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: false,
            sandbox: false, //allows me to use node apis in preload, but doesn't allow youtube to do so (solely need node apis for requiring the modules)
            preload: path.join(__dirname, 'preload/index.js')
        }
    })

    mainWindow.setMenuBarVisibility(false)
    mainWindow.setAutoHideMenuBar(false)

    mainWindow.addListener('focus', () => {
        mainWindow.webContents.send('focus')
    })

    mainWindow.addListener('blur', () => {
        mainWindow.webContents.send('blur')
    })

    electron.ipcMain.handle('is-focused', () => {
        return mainWindow.isFocused();
    })

    if (process.argv.includes('--debug-gpu')) {
        mainWindow.loadURL('chrome://gpu', { userAgent })
    } else {
        mainWindow.loadURL('https://www.youtube.com/tv/', { userAgent })
    }

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

    //remember fullscreen preference
    mainWindow.on('enter-full-screen', async () => {
        state.fullscreen = true;
        await stateManager.update(state)
    })

    mainWindow.on('leave-full-screen', async () => {
        state.fullscreen = false;
        await stateManager.update(state)
    })
}

app.on('ready', () => {
    autoUpdater.checkForUpdatesAndNotify()
})

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit()
})

main()