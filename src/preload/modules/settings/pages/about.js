//about page, opened from the header's "?" button
//update state comes from the main process (src/updater.js), which sends it here when it changes

const fs = require('fs')
const path = require('path')
const { ipcRenderer } = require('electron')

const iconPath = path.join(__dirname, '../../../../../assets/icon.png') //good lord
const iconDataUrl = `data:image/png;base64,${fs.readFileSync(iconPath).toString('base64')}`

let refresh = null; //re-renders the overlay, set by onOpen
let state = {
    status: 'idle',
    currentVersion: '',
    latestVersion: '',
    platform: process.platform,
    arch: process.arch,
    installationType: 'unknown',
    canAutoUpdate: false,
    progress: null
}

ipcRenderer.on('update-state-changed', (event, next) => {
    state = next;
    refresh?.()
})

function fill(template, values) {
    return template.replace(/\{(\w+)\}/g, (match, key) => values[key] ?? match);
}

function platformLabel(about) {
    const platform = about.platforms[state.platform] || state.platform;
    return `${platform} · ${about.architectures[state.arch] || state.arch}`;
}

function updateMethodLabel(about) {
    if (state.canAutoUpdate) return about.update_methods.automatic;
    if (state.installationType === 'flatpak') return about.update_methods.flatpak;
    return about.update_methods.manual;
}

//the notice and button text for each updater status
function updateStatus(strings) {
    const values = {
        version: state.latestVersion || state.currentVersion,
        percent: state.progress ?? 0
    }

    switch (state.status) {
        case 'checking':
            return { tone: 'info', title: strings.checking_title, text: strings.checking_detail, button: strings.checking_button };
        case 'current':
            return { tone: 'success', title: strings.current_title, text: fill(strings.current_detail, { version: state.currentVersion }), button: strings.check_again };
        case 'available':
            return {
                tone: 'warning',
                title: fill(strings.available_title, values),
                text: state.canAutoUpdate ? strings.available_automatic_detail : strings.available_manual_detail,
                button: state.canAutoUpdate ? strings.download_update : strings.download_latest
            };
        case 'downloading':
            return { tone: 'info', title: strings.downloading_title, text: fill(strings.downloading_detail, values), button: fill(strings.downloading_button, values) };
        case 'ready':
            return { tone: 'warning', title: strings.ready_title, text: fill(strings.ready_detail, values), button: strings.install_update };
        case 'error':
            return { tone: 'error', title: strings.error_title, text: strings.error_detail, button: strings.try_again };
        case 'development':
            return { tone: 'info', title: strings.development_title, text: strings.development_detail, button: strings.view_releases };
        case 'unsupported':
            return { tone: 'info', title: strings.unsupported_title, text: strings.unsupported_detail, button: strings.view_update_source };
        default:
            return { tone: 'info', title: strings.idle_title, text: strings.idle_detail, button: strings.check_now };
    }
}

async function runUpdateAction() {
    switch (state.status) {
        case 'available':
            return ipcRenderer.invoke(state.canAutoUpdate ? 'download-update' : 'open-update-download');
        case 'ready':
            return ipcRenderer.invoke('install-update');
        case 'development':
            return ipcRenderer.invoke('open-release-page');
        case 'unsupported':
            return ipcRenderer.invoke('open-update-download');
        default:
            state = await ipcRenderer.invoke('check-for-updates');
    }
}

module.exports = {
    id: 'about',

    icon: iconDataUrl,
    title: 'VacuumTube',
    crumb: (locale) => locale.about.title,
    description: (locale) => locale.about.description,
    badge: (locale) => state.currentVersion && fill(locale.about.version, { version: state.currentVersion }),

    async onOpen(ctx) {
        refresh = ctx.refresh;

        try {
            state = await ipcRenderer.invoke('get-about-info')
        } catch (err) {
            console.error('[About] Failed to load application information:', err)
            state = { ...state, status: 'error' }
        }
    },

    sections: (config, locale) => {
        const about = locale.about;
        const update = updateStatus(about.updates)
        const busy = state.status === 'checking' || state.status === 'downloading'

        return [
            {
                rows: [
                    { type: 'notice', tone: update.tone, title: update.title, text: update.text },
                    { type: 'button', id: 'update-action', title: update.button, disabled: busy, run: runUpdateAction }
                ]
            },
            {
                rows: [
                    { type: 'info', title: about.platform_label, value: platformLabel(about) },
                    { type: 'info', title: about.installation_label, value: about.installations[state.installationType] || about.installations.unknown },
                    { type: 'info', title: about.update_method_label, value: updateMethodLabel(about) }
                ]
            },
            {
                rows: [
                    { type: 'button', title: about.view_github, run: () => ipcRenderer.invoke('open-project-page') },
                    { type: 'button', title: about.latest_releases, run: () => ipcRenderer.invoke('open-release-page') }
                ]
            }
        ];
    }
}