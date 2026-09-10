const assert = require('node:assert/strict')
const { EventEmitter } = require('node:events')
const test = require('node:test')
const package = require('../package.json')
const { detectInstallation, getManualDownloadUrl } = require('../src/updater')

function createUpdaterHarness(checkForUpdates) {
    const modulePath = require.resolve('../src/updater')
    delete require.cache[modulePath]
    const updater = require(modulePath)
    const handlers = new Map()
    const openedUrls = []
    const autoUpdater = new EventEmitter()

    autoUpdater.checkForUpdates = checkForUpdates.bind(null, autoUpdater)
    autoUpdater.downloadUpdate = async () => {}
    autoUpdater.quitAndInstall = () => {}

    updater.setup({
        autoUpdater,
        getWindow: () => null,
        electron: {
            app: {
                isPackaged: true,
                getPath: () => '/Applications/VacuumTube.app/Contents/MacOS/VacuumTube',
                getVersion: () => package.version
            },
            ipcMain: {
                handle: (name, handler) => handlers.set(name, handler)
            },
            shell: {
                openExternal: async (url) => openedUrls.push(url)
            }
        }
    })

    return { autoUpdater, handlers, openedUrls }
}

test('development builds do not offer automatic updates', () => {
    assert.deepEqual(detectInstallation({ isPackaged: false }), {
        type: 'development',
        canAutoUpdate: false
    })
})

test('macOS applications use manual downloads while releases are unsigned', () => {
    assert.deepEqual(detectInstallation({ platform: 'darwin', isPackaged: true }), {
        type: 'application',
        canAutoUpdate: false
    })
})

test('Windows only enables automatic updates for a detected installer copy', () => {
    const exePath = 'C:\\Users\\Test\\VacuumTube\\VacuumTube.exe'

    assert.deepEqual(detectInstallation({
        platform: 'win32',
        exePath,
        isPackaged: true,
        existsSync: (candidate) => candidate === 'C:\\Users\\Test\\VacuumTube\\Uninstall VacuumTube.exe'
    }), {
        type: 'installer',
        canAutoUpdate: true
    })

    assert.deepEqual(detectInstallation({
        platform: 'win32',
        exePath,
        isPackaged: true,
        existsSync: () => false
    }), {
        type: 'portable',
        canAutoUpdate: false
    })
})

test('Linux recognizes Flatpak and AppImage packaging without guessing package managers', () => {
    assert.deepEqual(detectInstallation({
        platform: 'linux',
        isPackaged: true,
        env: { FLATPAK_ID: 'rocks.shy.VacuumTube' },
        existsSync: () => false
    }), {
        type: 'flatpak',
        canAutoUpdate: false
    })

    assert.deepEqual(detectInstallation({
        platform: 'linux',
        isPackaged: true,
        env: { APPIMAGE: '/tmp/VacuumTube.AppImage' },
        existsSync: () => false
    }), {
        type: 'appimage',
        canAutoUpdate: false
    })
})

test('manual download links select stable platform artifacts', () => {
    assert.match(getManualDownloadUrl('darwin', 'arm64'), /VacuumTube-universal\.dmg$/)
    assert.match(getManualDownloadUrl('win32', 'arm64'), /VacuumTube-arm64-Portable\.zip$/)
    assert.match(getManualDownloadUrl('win32', 'x64'), /VacuumTube-x64-Portable\.zip$/)
    assert.match(getManualDownloadUrl('linux', 'x64'), /\/releases\/latest$/)
    assert.match(getManualDownloadUrl('linux', 'x64', 'flatpak'), /flathub\.org\/apps\/rocks\.shy\.VacuumTube$/)
})

test('packaged update checks publish the current version and open an allowlisted download', async () => {
    const harness = createUpdaterHarness(async (autoUpdater) => {
        autoUpdater.emit('update-not-available', { version: package.version })
        return {}
    })

    await new Promise(setImmediate)

    const installationType = process.platform === 'darwin'
        ? 'application'
        : process.platform === 'win32'
            ? 'portable'
            : 'package';

    assert.deepEqual(await harness.handlers.get('get-about-info')(), {
        status: 'current',
        currentVersion: package.version,
        latestVersion: package.version,
        platform: process.platform,
        arch: process.arch,
        installationType,
        canAutoUpdate: false,
        progress: null
    })

    await harness.handlers.get('open-update-download')()
    assert.deepEqual(harness.openedUrls, [
        getManualDownloadUrl(process.platform, process.arch, installationType)
    ])
})

test('failed update checks expose a retryable error state', async () => {
    const originalConsoleError = console.error
    console.error = () => {}

    try {
        const harness = createUpdaterHarness(async () => {
            throw new Error('offline')
        })

        await new Promise(setImmediate)

        assert.equal((await harness.handlers.get('get-about-info')()).status, 'error')
        assert.equal((await harness.handlers.get('check-for-updates')()).status, 'error')
    } finally {
        console.error = originalConsoleError
    }
})
