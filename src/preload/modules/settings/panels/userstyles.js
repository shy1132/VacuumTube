//panel for Custom CSS (Userstyles)

const { ipcRenderer } = require('electron')
const { el, createToggle } = require('../dom')
const scroll = require('../scroll')
const configManager = require('../../../config')

const viewport = scroll.bindViewport('userstyles')

let locale = null;

async function refreshList() {
    const listContainer = document.getElementById('vt-userstyles-list')
    if (!listContainer) return;

    listContainer.replaceChildren() //clears children

    try {
        const styles = await ipcRenderer.invoke('get-userstyles')
        const disabledList = configManager.get().disabled_userstyles || []

        if (styles.length === 0) {
            listContainer.appendChild(el('div', {
                className: 'vt-userstyles-empty',
                textContent: locale.settings.userstyles.warn_empty
            }))
        } else {
            styles.forEach(({ filename }, idx) => {
                const isEnabled = !disabledList.includes(filename)
                listContainer.appendChild(el('div', {
                    className: 'vt-userstyle-item',
                    dataUserstyle: filename,
                    dataIndex: String(idx + 1)
                }, [
                    el('span', { className: 'vt-userstyle-name', textContent: filename }),
                    el('div', { className: 'vt-userstyle-toggle' }, [
                        el('div', { className: `vt-toggle ${isEnabled ? 'vt-toggle-on' : ''}`, dataUserstyleToggle: filename }, [
                            el('div', { className: 'vt-toggle-track' }, [
                                el('div', { className: 'vt-toggle-thumb' })
                            ])
                        ])
                    ])
                ]))
            })
        }

        //the "open folder" button sits after the userstyle rows, so its nav index depends on the count
        const button = document.querySelector('.vt-button[data-action="open-userstyles-folder"]')
        if (button) {
            button.dataset.index = String(styles.length + 1)
        }
    } catch (err) {
        console.error('[Settings Overlay] Failed to load userstyles:', err)

        listContainer.appendChild(el('div', {
            className: 'vt-userstyles-empty',
            textContent: locale.settings.userstyles.failed_to_load
        }))
    }
}

function toggleUserstyle(filename) {
    const disabledList = configManager.get().disabled_userstyles || []
    const isCurrentlyDisabled = disabledList.includes(filename)

    const newDisabledList = isCurrentlyDisabled
        ? disabledList.filter(f => f !== filename)
        : [ ...disabledList, filename ]

    configManager.set({ disabled_userstyles: newDisabledList })

    const toggle = document.querySelector(`.vt-toggle[data-userstyle-toggle="${filename}"]`)
    if (toggle) {
        toggle.classList.toggle('vt-toggle-on', !newDisabledList.includes(filename))
    }

    window.dispatchEvent(new CustomEvent('vt-userstyle-toggle', {
        detail: { filename, enabled: isCurrentlyDisabled }
    }))
}

module.exports = {
    id: 'userstyles',

    init(ctx) {
        locale = ctx.locale;
    },

    render() {
        return el('div', { className: 'vt-userstyles-section' }, [
            el('p', { className: 'vt-userstyles-description', textContent: locale.settings.userstyles.description }),
            el('div', {
                className: 'vt-setting-item',
                dataSetting: 'userstyles',
                dataIndex: '0'
            }, [
                el('div', { className: 'vt-setting-info' }, [
                    el('span', { className: 'vt-setting-title', textContent: locale.settings.userstyles.enable })
                ]),
                el('div', { className: 'vt-setting-control' }, [
                    createToggle('userstyles', configManager.get().userstyles)
                ])
            ]),
            el('div', { className: 'vt-userstyles-viewport' }, [
                el('div', { className: 'vt-userstyles-list', id: 'vt-userstyles-list' }),
                el('div', { className: 'vt-scrollbar', id: 'vt-userstyles-scrollbar' }, [
                    el('div', { className: 'vt-scrollbar-thumb', id: 'vt-userstyles-scrollbar-thumb' })
                ])
            ]),
            el('div', { className: 'vt-button', dataAction: 'open-userstyles-folder', dataIndex: '1' }, [
                el('span', { textContent: locale.settings.userstyles.open_folder })
            ])
        ]);
    },

    setup() {
        viewport.setup()
    },

    onShow() {
        viewport.reset()
        refreshList()
    },

    onFocusItem(element) {
        viewport.scrollTo(element)
    },

    onActivate(element) {
        const filename = element?.dataset?.userstyle;
        if (filename) toggleUserstyle(filename)
    },

    actions: {
        'open-userstyles-folder': async () => {
            await ipcRenderer.invoke('open-userstyles-folder')
        }
    }
}