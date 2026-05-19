//panel for macOS permissions

const { ipcRenderer } = require('electron')
const { el } = require('../dom')
const scroll = require('../scroll')

const viewport = scroll.bindViewport('permissions')

let locale = null;
let microphonePermissionStatus = 'unknown'

function getLabel(status) {
    return locale.settings.mac_permissions.statuses[status] || locale.settings.mac_permissions.statuses.unknown || status;
}

function formatStatus(status) {
    return `${locale.settings.mac_permissions.status_label}: ${getLabel(status)}`;
}

function setStatus(status) {
    microphonePermissionStatus = status || 'unknown'

    const statusElement = document.getElementById('vt-microphone-status')
    if (!statusElement) return;

    statusElement.textContent = formatStatus(microphonePermissionStatus)
    statusElement.dataset.status = microphonePermissionStatus;
}

function setLoading() {
    const statusElement = document.getElementById('vt-microphone-status')
    if (!statusElement) return;

    statusElement.textContent = locale.settings.mac_permissions.status_loading;
    delete statusElement.dataset.status;
}

function setMessage(message, type = 'info') {
    const messageElement = document.getElementById('vt-microphone-message')
    if (!messageElement) return;

    messageElement.textContent = message || ''
    messageElement.dataset.type = type;
}

function setRequestMessage(status) {
    if (status === 'granted') {
        setMessage(locale.settings.mac_permissions.request_granted, 'success')
    } else if (status === 'not-determined') {
        setMessage(locale.settings.mac_permissions.request_not_determined, 'warning')
    } else if (status === 'denied' || status === 'restricted') {
        setMessage(locale.settings.mac_permissions.request_denied_help, 'warning')
    } else {
        setMessage(locale.settings.mac_permissions.request_failed, 'warning')
    }
}

async function refresh() {
    if (process.platform !== 'darwin') return;

    const statusElement = document.getElementById('vt-microphone-status')
    if (!statusElement) return;

    setLoading()

    try {
        setStatus(await ipcRenderer.invoke('get-microphone-permission-status'))
    } catch (err) {
        console.error('[Settings Overlay] Failed to load microphone permission status:', err)
        setStatus('unknown')
    }
}

module.exports = {
    id: 'permissions',

    init(ctx) {
        locale = ctx.locale;
    },

    render() {
        //description + status card are a fixed header, only the action buttons scroll
        return el('div', { className: 'vt-permissions-section' }, [
            el('p', { className: 'vt-permissions-description', textContent: locale.settings.mac_permissions.description }),
            el('div', { className: 'vt-permission-card' }, [
                el('div', { className: 'vt-setting-info' }, [
                    el('span', { className: 'vt-setting-title', textContent: locale.settings.mac_permissions.microphone_title }),
                    el('span', { className: 'vt-setting-description', textContent: locale.settings.mac_permissions.microphone_description }),
                    el('span', {
                        className: 'vt-permission-status',
                        id: 'vt-microphone-status',
                        textContent: formatStatus(microphonePermissionStatus)
                    }),
                    el('span', {
                        className: 'vt-permission-note',
                        textContent: locale.settings.mac_permissions.restart_required
                    }),
                    el('span', {
                        className: 'vt-permission-message',
                        id: 'vt-microphone-message'
                    })
                ])
            ]),
            el('div', { className: 'vt-permissions-viewport' }, [
                el('div', { className: 'vt-permissions-list', id: 'vt-permissions-list' }, [
                    el('div', { className: 'vt-button', dataAction: 'request-microphone-permission', dataIndex: '0' }, [
                        el('span', { textContent: locale.settings.mac_permissions.request_microphone })
                    ]),
                    el('div', { className: 'vt-button', dataAction: 'open-microphone-privacy-settings', dataIndex: '1' }, [
                        el('span', { textContent: locale.settings.mac_permissions.open_microphone_settings })
                    ]),
                    el('div', { className: 'vt-button', dataAction: 'reset-microphone-permission', dataIndex: '2' }, [
                        el('span', { textContent: locale.settings.mac_permissions.reset_microphone })
                    ]),
                    el('div', { className: 'vt-button', dataAction: 'relaunch-app', dataIndex: '3' }, [
                        el('span', { textContent: locale.settings.mac_permissions.relaunch_app })
                    ])
                ]),
                el('div', { className: 'vt-scrollbar', id: 'vt-permissions-scrollbar' }, [
                    el('div', { className: 'vt-scrollbar-thumb', id: 'vt-permissions-scrollbar-thumb' })
                ])
            ])
        ]);
    },

    setup() {
        viewport.setup()
    },

    onShow() {
        viewport.reset()
        refresh()
    },

    onFocusItem(element) {
        viewport.scrollTo(element)
    },

    actions: {
        'request-microphone-permission': async () => {
            setLoading()
            setMessage('')

            try {
                const status = await ipcRenderer.invoke('request-microphone-permission')
                setStatus(status)
                setRequestMessage(status)
            } catch (err) {
                console.error('[Settings Overlay] Failed to request microphone permission:', err)
                setStatus('unknown')
            }
        },
        'reset-microphone-permission': async () => {
            setLoading()
            setMessage(locale.settings.mac_permissions.resetting_microphone)

            await ipcRenderer.invoke('reset-microphone-permission')
            const status = await ipcRenderer.invoke('request-microphone-permission')
            setStatus(status)
            setRequestMessage(status)
        },
        'open-microphone-privacy-settings': async () => {
            await ipcRenderer.invoke('open-microphone-privacy-settings')
        },
        'relaunch-app': async () => {
            await ipcRenderer.invoke('relaunch-app')
        }
    }
}