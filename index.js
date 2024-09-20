//initialization
const electron = require('electron')
const path = require('path')
const { app, BrowserWindow } = electron

//code
const chromeVersion = process.versions.chrome.split('.')[0]
const userAgent = `Mozilla/5.0 (Linux; Smart TV) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${chromeVersion}.0.0.0 Safari/537.36`
const runningOnDeck = process.env.SteamOS == '1' && process.env.SteamGamepadUI == '1'

let mainWindow;

async function createWindow() {
    if (runningOnDeck) app.commandLine.appendSwitch('--no-sandbox') //wont run without this in game mode, wont run on my pc with it

    mainWindow = new BrowserWindow({
        width: 1200,
        height: 600,
        useContentSize: true,
        skipTaskbar: false,
        autoHideMenuBar: true,
        backgroundColor: '#282828',
        fullscreen: !!runningOnDeck, //if running on steam deck in game mode, start in fullscreen
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: false,
            preload: path.join(__dirname, 'preload.js')
        }
    })

    mainWindow.loadURL('https://www.youtube.com/tv', { userAgent })

    electron.session.defaultSession.webRequest.onBeforeSendHeaders((details, callback) => {
        if (details.requestHeaders['User-Agent']) details.requestHeaders['User-Agent'] = userAgent
        callback({ cancel: false, requestHeaders: details.requestHeaders })
    })

    mainWindow.on('closed', () => {
        mainWindow = null;
    })
}

app.whenReady().then(createWindow)