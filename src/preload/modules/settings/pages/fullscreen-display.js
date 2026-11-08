const { ipcRenderer } = require('electron')
const configManager = require('../../../config')

module.exports = {
    id: 'fullscreen_display',
    title: (locale) => locale.fullscreen_display.title,
    description: (locale) => locale.fullscreen_display.description,
    rows: async (config, locale) => {
        const strings = locale.fullscreen_display;
        const displays = await ipcRenderer.invoke('get-fullscreen-displays')
        return [ { id: null, label: strings.current }, ...displays ].map((display, index) => ({
            type: 'button',
            id: `display-${display.id}`,
            title: (display.label || strings.display.replace('{number}', index)) +
                (display.size ? ` (${display.size.width}×${display.size.height}, ${index})` : '') +
                (config.fullscreen_display === display.id ? ` — ${strings.selected}` : ''),
            run: () => configManager.set({ fullscreen_display: display.id })
        }));
    }
}
