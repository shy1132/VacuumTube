//fix voice search

const { ipcRenderer } = require('electron')
const configOverrides = require('../util/configOverrides')
const functions = require('../util/functions')

let pendingAudioCapture = null;

function hasAudioConstraint(constraints) {
    if (!constraints || typeof constraints !== 'object') return false;
    if (!Object.prototype.hasOwnProperty.call(constraints, 'audio')) return false;

    return constraints.audio !== false;
}

function createNotAllowedError(message) {
    if (typeof DOMException === 'function') {
        return new DOMException(message, 'NotAllowedError')
    }

    const error = new Error(message)
    error.name = 'NotAllowedError'
    return error;
}

async function getNativeMicrophoneStatus() {
    try {
        return await ipcRenderer.invoke('request-microphone-permission');
    } catch (err) {
        console.error('[Voice] Failed to request microphone permission:', err)
        return 'unknown';
    }
}

function guardGetUserMedia() {
    if (process.platform !== 'darwin') return;
    if (!navigator.mediaDevices?.getUserMedia) return;
    if (navigator.mediaDevices.getUserMedia.vtMicrophoneGuarded) return;

    const originalGetUserMedia = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices)

    const guardedGetUserMedia = (constraints) => {
        if (!hasAudioConstraint(constraints)) return originalGetUserMedia(constraints);
        if (pendingAudioCapture) return pendingAudioCapture;

        pendingAudioCapture = (async () => {
            const status = await getNativeMicrophoneStatus()
            if (status !== 'granted') {
                throw createNotAllowedError(`Microphone permission is ${status}`);
            }

            return originalGetUserMedia(constraints);
        })()
        .finally(() => {
            pendingAudioCapture = null;
        })

        return pendingAudioCapture;
    }

    guardedGetUserMedia.vtMicrophoneGuarded = true;

    try {
        navigator.mediaDevices.getUserMedia = guardedGetUserMedia;
    } catch {}

    if (navigator.mediaDevices.getUserMedia !== guardedGetUserMedia) {
        try {
            Object.defineProperty(navigator.mediaDevices, 'getUserMedia', {
                configurable: true,
                writable: true,
                value: guardedGetUserMedia
            })
        } catch (err) {
            console.error('[Voice] Failed to install getUserMedia guard:', err)
        }
    }
}

module.exports = () => {
    configOverrides.overrideEnv('env_enableMediaStreams', true)

    guardGetUserMedia()

    if (process.platform === 'darwin') {
        functions.waitForCondition(() => !!navigator.mediaDevices?.getUserMedia)
        .then(guardGetUserMedia)
    }
}