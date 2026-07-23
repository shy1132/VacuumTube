const fs = require('fs')
const path = require('path')
const { ipcRenderer } = require('electron')
const { el } = require('../dom')

const iconPath = path.join(__dirname, '../../../../../assets/icon.png')
const iconDataUrl = `data:image/png;base64,${fs.readFileSync(iconPath).toString('base64')}`

let locale = null;
let updateState = {
    status: 'idle',
    currentVersion: '',
    latestVersion: '',
    platform: process.platform,
    arch: process.arch,
    installationType: 'unknown',
    canAutoUpdate: false,
    progress: null
}

function interpolate(template, values = {}) {
    let result = template;
    for (const [ key, value ] of Object.entries(values)) {
        result = result.replaceAll(`{${key}}`, String(value))
    }
    return result;
}

function platformLabel() {
    const platforms = locale.settings.about.platforms
    const architectures = locale.settings.about.architectures
    const platform = platforms[updateState.platform] || updateState.platform;
    const architectureKey = updateState.platform === 'darwin' && updateState.arch === 'arm64'
        ? 'apple_silicon'
        : updateState.arch;
    const arch = architectures[architectureKey] || updateState.arch;
    return `${platform} · ${arch}`;
}

function installationLabel() {
    return locale.settings.about.installations[updateState.installationType]
        || locale.settings.about.installations.unknown;
}

function updateMethodLabel() {
    if (updateState.canAutoUpdate) return locale.settings.about.update_methods.automatic;
    if (updateState.installationType === 'flatpak') return locale.settings.about.update_methods.flatpak;
    return locale.settings.about.update_methods.manual;
}

function statusContent() {
    const text = locale.settings.about.updates;
    const currentVersion = updateState.currentVersion;
    const latestVersion = updateState.latestVersion || currentVersion;

    switch (updateState.status) {
        case 'checking':
            return { title: text.checking_title, detail: text.checking_detail, badge: '', button: text.checking_button, tone: 'neutral' };
        case 'current':
            return {
                title: text.current_title,
                detail: interpolate(text.current_detail, { version: currentVersion }),
                badge: text.checked_badge,
                button: text.check_again,
                tone: 'success'
            };
        case 'available':
            return {
                title: interpolate(text.available_title, { version: latestVersion }),
                detail: updateState.canAutoUpdate ? text.available_automatic_detail : text.available_manual_detail,
                badge: interpolate(text.current_badge, { version: currentVersion }),
                button: updateState.canAutoUpdate ? text.download_update : text.download_latest,
                tone: 'warning'
            };
        case 'downloading':
            return {
                title: text.downloading_title,
                detail: interpolate(text.downloading_detail, { percent: updateState.progress ?? 0 }),
                badge: interpolate(text.current_badge, { version: currentVersion }),
                button: interpolate(text.downloading_button, { percent: updateState.progress ?? 0 }),
                tone: 'neutral'
            };
        case 'ready':
            return {
                title: text.ready_title,
                detail: interpolate(text.ready_detail, { version: latestVersion }),
                badge: text.ready_badge,
                button: text.install_update,
                tone: 'warning'
            };
        case 'error':
            return { title: text.error_title, detail: text.error_detail, badge: '', button: text.try_again, tone: 'error' };
        case 'development':
            return { title: text.development_title, detail: text.development_detail, badge: '', button: text.view_releases, tone: 'neutral' };
        case 'unsupported':
            return { title: text.unsupported_title, detail: text.unsupported_detail, badge: '', button: text.view_update_source, tone: 'neutral' };
        default:
            return { title: text.idle_title, detail: text.idle_detail, badge: '', button: text.check_now, tone: 'neutral' };
    }
}

function setText(id, text) {
    const node = document.getElementById(id)
    if (node) node.textContent = text;
}

function renderState() {
    setText('vt-about-version', interpolate(locale.settings.about.version, { version: updateState.currentVersion }))
    setText('vt-about-platform', platformLabel())
    setText('vt-about-installation', installationLabel())
    setText('vt-about-update-method', updateMethodLabel())

    const content = statusContent()
    setText('vt-about-update-title', content.title)
    setText('vt-about-update-detail', content.detail)
    setText('vt-about-update-button', content.button)

    const badge = document.getElementById('vt-about-update-status')
    if (badge) {
        badge.textContent = content.badge;
        badge.hidden = !content.badge;
        badge.dataset.tone = content.tone;
    }

    const button = document.querySelector('.vt-button[data-action="primary-update-action"]')
    if (button) {
        const busy = updateState.status === 'checking' || updateState.status === 'downloading'
        button.classList.toggle('vt-button-inactive', busy)
        button.setAttribute('aria-disabled', String(busy))
    }
}

async function refresh() {
    try {
        updateState = await ipcRenderer.invoke('get-about-info')
        renderState()
    } catch (err) {
        console.error('[About] Failed to load application information:', err)
        updateState = { ...updateState, status: 'error' }
        renderState()
    }
}

async function runPrimaryUpdateAction() {
    switch (updateState.status) {
        case 'checking':
        case 'downloading':
            return;
        case 'available':
            if (updateState.canAutoUpdate) {
                await ipcRenderer.invoke('download-update')
            } else {
                await ipcRenderer.invoke('open-update-download')
            }
            return;
        case 'ready':
            await ipcRenderer.invoke('install-update')
            return;
        case 'development':
            await ipcRenderer.invoke('open-release-page')
            return;
        case 'unsupported':
            await ipcRenderer.invoke('open-update-download')
            return;
        default:
            updateState = await ipcRenderer.invoke('check-for-updates')
            renderState()
    }
}

module.exports = {
    id: 'about',

    init(ctx) {
        locale = ctx.locale;
    },

    render() {
        const text = locale.settings.about;

        return el('div', { className: 'vt-about-section' }, [
            el('div', { className: 'vt-about-heading' }, [
                el('img', { className: 'vt-about-icon', src: iconDataUrl, alt: '' }),
                el('div', { className: 'vt-about-copy' }, [
                    el('span', { className: 'vt-about-name', textContent: 'VacuumTube' }),
                    el('span', { className: 'vt-about-description', textContent: text.description })
                ]),
                el('span', { className: 'vt-about-version', id: 'vt-about-version' })
            ]),
            el('div', { className: 'vt-about-update-card' }, [
                el('div', { className: 'vt-about-update-copy' }, [
                    el('span', { className: 'vt-about-update-title', id: 'vt-about-update-title' }),
                    el('span', { className: 'vt-about-update-detail', id: 'vt-about-update-detail' }),
                    el('span', { className: 'vt-about-update-status', id: 'vt-about-update-status', hidden: true })
                ]),
                el('div', { className: 'vt-button', dataAction: 'primary-update-action', dataIndex: '0' }, [
                    el('span', { id: 'vt-about-update-button' })
                ])
            ]),
            el('div', { className: 'vt-about-details' }, [
                el('div', { className: 'vt-about-detail' }, [
                    el('span', { className: 'vt-about-detail-label', textContent: text.platform_label }),
                    el('span', { className: 'vt-about-detail-value', id: 'vt-about-platform' })
                ]),
                el('div', { className: 'vt-about-detail' }, [
                    el('span', { className: 'vt-about-detail-label', textContent: text.installation_label }),
                    el('span', { className: 'vt-about-detail-value', id: 'vt-about-installation' })
                ]),
                el('div', { className: 'vt-about-detail' }, [
                    el('span', { className: 'vt-about-detail-label', textContent: text.update_method_label }),
                    el('span', { className: 'vt-about-detail-value', id: 'vt-about-update-method' })
                ])
            ]),
            el('div', { className: 'vt-about-links' }, [
                el('div', { className: 'vt-button vt-about-primary-button', dataAction: 'open-project-page', dataIndex: '1' }, [
                    el('span', { textContent: text.view_github })
                ]),
                el('div', { className: 'vt-button', dataAction: 'open-release-page', dataIndex: '2' }, [
                    el('span', { textContent: text.latest_releases })
                ])
            ])
        ]);
    },

    setup() {
        ipcRenderer.on('update-state-changed', (event, nextState) => {
            updateState = nextState;
            renderState()
        })
    },

    onShow() {
        refresh()
    },

    actions: {
        'primary-update-action': runPrimaryUpdateAction,
        'open-project-page': () => ipcRenderer.invoke('open-project-page'),
        'open-release-page': () => ipcRenderer.invoke('open-release-page')
    }
}
