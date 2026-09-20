const { ipcRenderer } = require('electron')
const configManager = require('../../../config')

async function getStyles() {
    try {
        return await ipcRenderer.invoke('get-userstyles');
    } catch (err) {
        console.error('[Settings Overlay] Failed to load userstyles:', err)
        return null;
    }
}

module.exports = {
    id: 'userstyles',

    title: (locale) => locale.userstyles.manage_link,
    description: (locale) => locale.userstyles.description,

    rows: async (config, locale) => {
        const styles = await getStyles()

        return [
            styles === null && { type: 'notice', tone: 'warning', text: locale.userstyles.failed_to_load },
            styles?.length === 0 && { type: 'notice', text: locale.userstyles.warn_empty },

            ...(styles || []).map(({ filename }) => ({
                type: 'toggle',
                id: `userstyle-${filename}`,
                title: filename,
                dependsOn: 'userstyles',
                get: (config) => !(config.disabled_userstyles || []).includes(filename),
                set: (on, config) => {
                    const disabled = (config.disabled_userstyles || []).filter((f) => f !== filename)
                    configManager.set({ disabled_userstyles: on ? disabled : [ ...disabled, filename ] })

                    window.dispatchEvent(new CustomEvent('vt-userstyle-toggle', {
                        detail: { filename, enabled: on }
                    }))
                }
            })),

            { type: 'button', title: locale.userstyles.open_folder, run: () => ipcRenderer.invoke('open-userstyles-folder') }
        ];
    }
}