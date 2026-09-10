const fs = require('fs')
const path = require('path')

const PROJECT_URL = 'https://github.com/shy1132/VacuumTube'
const RELEASES_URL = `${PROJECT_URL}/releases/latest`
const FLATPAK_URL = 'https://flathub.org/apps/rocks.shy.VacuumTube'

let app;
let autoUpdater;
let getWindow;
let installation;
let shell;
let initialized = false;

let state = {
    status: 'idle',
    currentVersion: null,
    latestVersion: null,
    platform: process.platform,
    arch: process.arch,
    installationType: 'unknown',
    canAutoUpdate: false,
    progress: null
}

function detectInstallation({
    platform = process.platform,
    exePath = process.execPath,
    isPackaged = false,
    env = process.env,
    existsSync = fs.existsSync
} = {}) {
    if (!isPackaged) return { type: 'development', canAutoUpdate: false };

    if (platform === 'darwin') {
        return { type: 'application', canAutoUpdate: false };
    }

    if (platform === 'win32') {
        const uninstaller = path.win32.join(path.win32.dirname(exePath), 'Uninstall VacuumTube.exe')
        const installed = existsSync(uninstaller)
        return {
            type: installed ? 'installer' : 'portable',
            canAutoUpdate: installed
        };
    }

    if (env.FLATPAK_ID || existsSync('/.flatpak-info')) {
        return { type: 'flatpak', canAutoUpdate: false };
    }

    if (env.APPIMAGE) {
        return { type: 'appimage', canAutoUpdate: false };
    }

    return { type: 'package', canAutoUpdate: false };
}

function getManualDownloadUrl(platform = process.platform, arch = process.arch, installationType = 'unknown') {
    if (installationType === 'flatpak') return FLATPAK_URL;

    if (platform === 'darwin') {
        return `${RELEASES_URL}/download/VacuumTube-universal.dmg`;
    }

    if (platform === 'win32') {
        const windowsArch = arch === 'arm64' ? 'arm64' : 'x64'
        return `${RELEASES_URL}/download/VacuumTube-${windowsArch}-Portable.zip`;
    }

    return RELEASES_URL;
}

function snapshot() {
    return { ...state };
}

function publish(patch) {
    state = { ...state, ...patch }

    const win = getWindow?.()
    if (win && !win.isDestroyed()) {
        win.webContents.send('update-state-changed', snapshot())
    }
}

async function checkForUpdates() {
    if (!app.isPackaged) {
        publish({ status: 'development', progress: null })
        return snapshot();
    }

    if (installation.type === 'flatpak') {
        publish({ status: 'unsupported', progress: null })
        return snapshot();
    }

    publish({ status: 'checking', progress: null })

    try {
        const result = await autoUpdater.checkForUpdates()
        if (!result) publish({ status: 'unsupported' })
    } catch (err) {
        console.error('[Updater] Failed to check for updates:', err)
        publish({ status: 'error', progress: null })
    }

    return snapshot();
}

async function downloadUpdate() {
    if (!installation.canAutoUpdate || state.status !== 'available') return snapshot();

    publish({ status: 'downloading', progress: 0 })

    try {
        await autoUpdater.downloadUpdate()
    } catch (err) {
        console.error('[Updater] Failed to download update:', err)
        publish({ status: 'error', progress: null })
    }

    return snapshot();
}

function installUpdate() {
    if (!installation.canAutoUpdate || state.status !== 'ready') return false;

    autoUpdater.quitAndInstall(false, true)
    return true;
}

async function openExternal(url) {
    await shell.openExternal(url)
    return true;
}

function setup(options) {
    if (initialized) return;

    app = options.electron.app;
    autoUpdater = options.autoUpdater;
    getWindow = options.getWindow;
    shell = options.electron.shell;
    installation = detectInstallation({
        platform: process.platform,
        exePath: app.getPath('exe'),
        isPackaged: app.isPackaged
    })

    state = {
        ...state,
        currentVersion: app.getVersion(),
        installationType: installation.type,
        canAutoUpdate: installation.canAutoUpdate
    }

    autoUpdater.autoDownload = false;
    autoUpdater.autoInstallOnAppQuit = false;

    autoUpdater.on('checking-for-update', () => publish({ status: 'checking', progress: null }))
    autoUpdater.on('update-not-available', (info) => publish({
        status: 'current',
        latestVersion: info?.version || state.currentVersion,
        progress: null
    }))
    autoUpdater.on('update-available', (info) => publish({
        status: 'available',
        latestVersion: info?.version || null,
        progress: null
    }))
    autoUpdater.on('download-progress', (progress) => publish({
        status: 'downloading',
        progress: Math.round(progress.percent)
    }))
    autoUpdater.on('update-downloaded', (info) => publish({
        status: 'ready',
        latestVersion: info?.version || state.latestVersion,
        progress: 100
    }))
    autoUpdater.on('error', () => publish({ status: 'error', progress: null }))

    options.electron.ipcMain.handle('get-about-info', () => snapshot())
    options.electron.ipcMain.handle('check-for-updates', () => checkForUpdates())
    options.electron.ipcMain.handle('download-update', () => downloadUpdate())
    options.electron.ipcMain.handle('install-update', () => installUpdate())
    options.electron.ipcMain.handle('open-project-page', () => openExternal(PROJECT_URL))
    options.electron.ipcMain.handle('open-release-page', () => openExternal(RELEASES_URL))
    options.electron.ipcMain.handle('open-update-download', () => openExternal(
        getManualDownloadUrl(state.platform, state.arch, state.installationType)
    ))

    initialized = true;
    void checkForUpdates()
}

module.exports = {
    setup,
    detectInstallation,
    getManualDownloadUrl
}
