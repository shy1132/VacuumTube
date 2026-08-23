const childProcess = require('child_process')
const fs = require('fs')
const path = require('path')

const versionMarkerName = 'microphone-permission-version'

function resetMicrophonePermission(appId, execFile = childProcess.execFile) {
    return new Promise((resolve, reject) => {
        execFile('/usr/bin/tccutil', [ 'reset', 'Microphone', appId ], (err) => {
            if (err) {
                reject(err)
                return;
            }

            resolve()
        })
    });
}

async function resetAfterAppUpdate(options = {}, dependencies = {}) {
    const {
        appId,
        appVersion,
        isPackaged,
        platform = process.platform,
        userData
    } = options;

    if (platform !== 'darwin' || !isPackaged) return false;

    const logger = dependencies.logger || console;
    const filesystem = dependencies.fs || fs;
    const reset = dependencies.resetMicrophonePermission || resetMicrophonePermission;

    if (!appId || !appVersion || !userData) {
        logger.error('[Permissions] Cannot track microphone permission version without app metadata')
        return false;
    }

    const versionMarker = path.join(userData, versionMarkerName)
    let previousVersion = null;

    try {
        previousVersion = filesystem.readFileSync(versionMarker, 'utf-8').trim() || null;
    } catch (err) {
        if (err.code !== 'ENOENT') {
            logger.error('[Permissions] Failed to read microphone permission version:', err)
        }
    }

    if (previousVersion === appVersion) return false;

    //Record the attempt before resetting so a failed tccutil call cannot cause a
    //permission reset loop every time the app launches.
    try {
        filesystem.mkdirSync(userData, { recursive: true })
        filesystem.writeFileSync(versionMarker, `${appVersion}\n`)
    } catch (err) {
        logger.error('[Permissions] Failed to save microphone permission version:', err)
        return false;
    }

    try {
        await reset(appId)
        logger.log(`[Permissions] Reset microphone access for app version ${appVersion}`)
        return true;
    } catch (err) {
        logger.error('[Permissions] Failed to reset microphone access after app update:', err)
        return false;
    }
}

module.exports = {
    resetAfterAppUpdate,
    resetMicrophonePermission,
    versionMarkerName
}
