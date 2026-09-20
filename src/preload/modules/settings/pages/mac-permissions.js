const { ipcRenderer } = require('electron')

//page-local state, displayed by the `info` and `text` rows and updated by re-rendering
let status = null; //null while loading
let message = ''

async function invoke(channel) {
    try {
        return await ipcRenderer.invoke(channel);
    } catch (err) {
        console.error(`[Settings Overlay] ${channel} failed:`, err)
        return 'unknown';
    }
}

function requestMessage(locale, result) {
    const strings = locale.mac_permissions;
    if (result === 'granted') return strings.request_granted;
    if (result === 'not-determined') return strings.request_not_determined;
    if (result === 'denied' || result === 'restricted') return strings.request_denied_help;
    return strings.request_failed;
}

module.exports = {
    id: 'mac_permissions',

    title: (locale) => locale.mac_permissions.title,
    description: (locale) => locale.mac_permissions.description,

    async onOpen() {
        status = null;
        message = ''
        status = await invoke('get-microphone-permission-status')
    },

    rows: (config, locale) => {
        const strings = locale.mac_permissions;
        const statusText = status === null ? strings.status_loading : strings.statuses[status] || strings.statuses.unknown;

        return [
            { type: 'notice', title: strings.microphone_title, text: strings.microphone_description },
            { type: 'info', title: strings.status_label, value: statusText },
            message && { type: 'text', text: message },
            { type: 'text', text: strings.restart_required },

            {
                type: 'button', title: strings.request_microphone,
                run: async () => {
                    status = null;
                    message = ''
                    status = await invoke('request-microphone-permission')
                    message = requestMessage(locale, status)
                }
            },
            { type: 'button', title: strings.open_microphone_settings, run: () => invoke('open-microphone-privacy-settings') },
            {
                type: 'button', title: strings.reset_microphone,
                run: async () => {
                    status = null;
                    message = strings.resetting_microphone;
                    await invoke('reset-microphone-permission')
                    status = await invoke('request-microphone-permission')
                    message = requestMessage(locale, status)
                }
            },
            { type: 'button', title: strings.relaunch_app, run: () => invoke('relaunch-app') }
        ];
    }
}