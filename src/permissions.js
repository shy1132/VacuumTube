const electron = require('electron')
const childProcess = require('child_process')

const youtubeOrigin = 'https://www.youtube.com'
const microphonePrivacySettingsUrl = 'x-apple.systempreferences:com.apple.preference.security?Privacy_Microphone'

let appId = null;
let microphonePromptPromise = null;
let lastDeniedMicrophoneLog = 0;

function getUrlOrigin(value) {
    if (!value) return null;

    try {
        const origin = new URL(value).origin
        return origin === 'null' ? null : origin;
    } catch {
        return null;
    }
}

function isYoutubePermissionRequest(webContents, requestingOrigin, details = {}) {
    const requestingFrameOrigin = getUrlOrigin(details.requestingUrl)
        || getUrlOrigin(details.securityOrigin)
        || getUrlOrigin(requestingOrigin)

    if (requestingFrameOrigin) {
        return requestingFrameOrigin === youtubeOrigin;
    }

    return getUrlOrigin(webContents?.getURL?.()) === youtubeOrigin;
}

function isAudioMediaRequest(details = {}) {
    if (Array.isArray(details.mediaTypes)) return details.mediaTypes.length > 0 && details.mediaTypes.every((type) => type === 'audio');
    return details.mediaType === 'audio';
}

function getMicrophonePermissionStatus() {
    if (process.platform !== 'darwin') return 'unsupported';

    try {
        return electron.systemPreferences.getMediaAccessStatus('microphone');
    } catch (err) {
        console.error('[Permissions] Failed to get microphone access status:', err)
        return 'unknown';
    }
}

async function requestMicrophonePermissionStatus() {
    if (process.platform !== 'darwin') return 'unsupported';

    const status = getMicrophonePermissionStatus()
    if (status !== 'not-determined') return status;

    if (!microphonePromptPromise) {
        microphonePromptPromise = electron.systemPreferences.askForMediaAccess('microphone')
        .catch((err) => {
            console.error('[Permissions] Failed to request microphone access:', err)
            return false;
        })
        .finally(() => {
            microphonePromptPromise = null;
        })
    }

    await microphonePromptPromise;

    return getMicrophonePermissionStatus();
}

async function resetMicrophonePermissionStatus() {
    if (process.platform !== 'darwin') return 'unsupported';

    return await new Promise((resolve) => {
        childProcess.execFile('/usr/bin/tccutil', [ 'reset', 'Microphone', appId ], (err) => {
            if (err) {
                console.error('[Permissions] Failed to reset microphone access:', err)
                resolve('unknown')
                return;
            }

            resolve(getMicrophonePermissionStatus())
        })
    });
}

function isMicrophonePermissionGranted() {
    return getMicrophonePermissionStatus() === 'granted';
}

function logDeniedMicrophoneRequest(details = {}) {
    const now = Date.now()
    if ((now - lastDeniedMicrophoneLog) < 5000) return;

    lastDeniedMicrophoneLog = now;
    console.log('[Permissions] Denied microphone media request', {
        status: getMicrophonePermissionStatus(),
        requestingUrl: details.requestingUrl,
        securityOrigin: details.securityOrigin
    })
}

function setupMicrophonePermissionHandlers() {
    if (process.platform !== 'darwin') return;

    electron.session.defaultSession.setPermissionCheckHandler((webContents, permission, requestingOrigin, details = {}) => {
        if (permission !== 'media') return false;
        if (!isYoutubePermissionRequest(webContents, requestingOrigin, details)) return false;
        if (!isAudioMediaRequest(details)) return false;

        return isMicrophonePermissionGranted();
    })

    electron.session.defaultSession.setPermissionRequestHandler((webContents, permission, callback, details = {}) => {
        if (permission !== 'media' || !isYoutubePermissionRequest(webContents, null, details) || !isAudioMediaRequest(details)) {
            callback(false)
            return;
        }

        const granted = isMicrophonePermissionGranted();
        if (!granted) {
            logDeniedMicrophoneRequest(details)
        }

        callback(granted)
    })
}

//registers the session permission handlers and the renderer-facing ipc handlers
function setup(options = {}) {
    appId = options.appId;

    setupMicrophonePermissionHandlers()

    electron.ipcMain.handle('get-microphone-permission-status', () => {
        return getMicrophonePermissionStatus();
    })

    electron.ipcMain.handle('request-microphone-permission', () => {
        return requestMicrophonePermissionStatus();
    })

    electron.ipcMain.handle('reset-microphone-permission', () => {
        return resetMicrophonePermissionStatus();
    })

    electron.ipcMain.handle('open-microphone-privacy-settings', async () => {
        if (process.platform !== 'darwin') return false;

        try {
            await electron.shell.openExternal(microphonePrivacySettingsUrl)
            return true;
        } catch (err) {
            console.error('[Permissions] Failed to open microphone privacy settings:', err)
            return false;
        }
    })
}

module.exports = {
    setup
}