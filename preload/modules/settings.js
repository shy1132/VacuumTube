// VacuumTube Settings Overlay
// Supports keyboard/mouse, touch input and gamepad navigation

const { ipcRenderer } = require('electron')
const configManager = require('../config')
const css = require('../util/css')
const localeProvider = require('../util/localeProvider')
const functions = require('../util/functions')

let overlayVisible = false
let currentTabIndex = 0
let currentItemIndex = 0
let config = configManager.get()

const scrollOffsets = {}

// Settings that should apply instantly using IPC calls
const dynamicFunction = {
    fullscreen: (value) => ipcRenderer.invoke('set-fullscreen', value),
    keep_on_top: (value) => ipcRenderer.invoke('set-on-top', value)
}

// Tab definitions - id must match config key and dataPanel attribute
const tabs = [
    { id: 'adblock', localeKey: 'ad_block' },
    { id: 'sponsorblock', localeKey: 'sponsorblock' },
    { id: 'dearrow', localeKey: 'dearrow' },
    { id: 'dislikes', localeKey: 'dislikes' },
    { id: 'remove_super_resolution', localeKey: 'remove_super_resolution' },
    { id: 'hide_shorts', localeKey: 'hide_shorts' },
    { id: 'h264ify', localeKey: 'h264ify' },
    { id: 'hardware_decoding', localeKey: 'hardware_decoding' },
    { id: 'low_memory_mode', localeKey: 'low_memory_mode' },
    { id: 'fullscreen', localeKey: 'fullscreen' },
    { id: 'keep_on_top', localeKey: 'keep_on_top' },
    { id: 'userstyles', localeKey: 'userstyles' },
    { id: 'controller_support', localeKey: 'controller_support' },
]

// Helper to create elements with attributes and children
function el(tag, attrs = {}, children = []) {
    const element = document.createElement(tag)
    for (const [key, value] of Object.entries(attrs)) {
        if (key === 'className') {
            element.className = value
        } else if (key === 'textContent') {
            element.textContent = value
        } else if (key === 'style' && typeof value === 'object') {
            Object.assign(element.style, value)
        } else if (key.startsWith('data')) {
            element.setAttribute(key.replace(/([A-Z])/g, '-$1').toLowerCase(), value)
        } else {
            element.setAttribute(key, value)
        }
    }
    for (const child of children) {
        if (child) element.appendChild(child)
    }
    return element
}

function createOverlayDOM(locale) {
    const createToggle = (configKey) => {
        return el('div', { className: `vt-toggle ${config[configKey] ? 'vt-toggle-on' : ''}`, dataConfig: configKey }, [
            el('div', { className: 'vt-toggle-track' }, [
                el('div', { className: 'vt-toggle-thumb' })
            ])
        ])
    }

    const createSettingItem = (configKey, title, description, index, focused = false) => {
        return el('div', {
            className: `vt-setting-item ${focused ? 'vt-item-focused' : ''}`,
            dataSetting: configKey,
            dataIndex: String(index)
        }, [
            el('div', { className: 'vt-setting-info' }, [
                el('span', { className: 'vt-setting-title', textContent: title }),
                el('span', { className: 'vt-setting-description', textContent: description })
            ]),
            el('div', { className: 'vt-setting-control' }, [
                createToggle(configKey)
            ])
        ])
    }

    const createTab = (id, label, index, selected = false) => {
        return el('div', {
            className: `vt-tab ${selected ? 'vt-tab-selected' : ''}`,
            dataTab: id,
            dataIndex: String(index)
        }, [
            el('span', { className: 'vt-tab-label', textContent: label })
        ])
    }

    // Building the overlay structure
    return el('div', {
        id: 'vt-settings-overlay-root',
        className: 'vt-settings-hidden',
        tabindex: '-1',
        style: {
            position: 'fixed',
            top: '0',
            left: '0',
            width: '100%',
            height: '100%',
            zIndex: '99999',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: '0',
            pointerEvents: 'none',
            transition: 'opacity 0.2s ease'
        }
    }, [
        el('div', {
            className: 'vt-settings-backdrop',
            style: {
                position: 'absolute',
                top: '0',
                left: '0',
                width: '100%',
                height: '100%',
                background: 'rgba(0, 0, 0, 0.85)'
            }
        }),
        el('div', {
            className: 'vt-settings-container',
            style: {
                position: 'relative',
                width: '100%',
                maxWidth: '75vw',
                height: '100%',
                maxHeight: '75vh',
                background: '#212121',
                borderRadius: '16px',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)'
            }
        }, [
            el('div', { className: 'vt-settings-header' }, [
                el('span', { className: 'vt-settings-title', textContent: locale.settings.generic.title }),
                el('span', { className: 'vt-settings-hint', textContent: locale.settings.generic.hint }),
                el('div', { className: 'vt-settings-close', dataAction: 'close' }, [
                    el('span', { textContent: '✕' })
                ])
            ]),
            el('div', { className: 'vt-settings-body' }, [
                el('div', { className: 'vt-tabs-viewport' }, [
                    // Add new settings tabs here
                    el('div', { className: 'vt-settings-tabs', id: 'vt-settings-tabs' }, [
                        createTab('adblock', locale.settings.ad_block.title, 0, true),
                        createTab('sponsorblock', locale.settings.sponsorblock.title, 1, false),
                        createTab('dearrow', locale.settings.dearrow.title, 2, false),
                        createTab('dislikes', locale.settings.dislikes.title, 3, false),
                        createTab('remove_super_resolution', locale.settings.remove_super_resolution.title, 4, false),
                        createTab('hide_shorts', locale.settings.hide_shorts.title, 5, false),
                        createTab('h264ify', locale.settings.h264ify.title, 6, false),
                        createTab('hardware_decoding', locale.settings.hardware_decoding.title, 7, false),
                        createTab('low_memory_mode', locale.settings.low_memory_mode.title, 8, false),
                        createTab('fullscreen', locale.settings.fullscreen.title, 9, false),
                        createTab('keep_on_top', locale.settings.keep_on_top.title, 10, false),
                        createTab('userstyles', locale.settings.userstyles.title, 11, false),
                        createTab('controller_support', locale.settings.controller_support.title, 12, false)
                    ]),
                    el('div', { className: 'vt-scrollbar vt-tabs-scrollbar', id: 'vt-tabs-scrollbar' }, [
                        el('div', { className: 'vt-scrollbar-thumb', id: 'vt-tabs-scrollbar-thumb' })
                    ])
                ]),
                // Content for settings pages
                // More advanced example in userstyles section below
                el('div', { className: 'vt-settings-content' }, [
                    el('div', { className: 'vt-content-panel vt-panel-active', dataPanel: 'adblock' }, [
                        createSettingItem('adblock', locale.settings.ad_block.title, locale.settings.ad_block.description, 0, true)
                    ]),
                    el('div', { className: 'vt-content-panel', dataPanel: 'sponsorblock' }, [
                        createSettingItem('sponsorblock', locale.settings.sponsorblock.title, locale.settings.sponsorblock.description, 0, true)
                    ]),
                    el('div', { className: 'vt-content-panel', dataPanel: 'dearrow' }, [
                        createSettingItem('dearrow', locale.settings.dearrow.title, locale.settings.dearrow.description, 0, true)
                    ]),
                    el('div', { className: 'vt-content-panel', dataPanel: 'dislikes' }, [
                        createSettingItem('dislikes', locale.settings.dislikes.title, locale.settings.dislikes.description, 0, true)
                    ]),
                    el('div', { className: 'vt-content-panel', dataPanel: 'remove_super_resolution' }, [
                        createSettingItem('remove_super_resolution', locale.settings.remove_super_resolution.title, locale.settings.remove_super_resolution.description, 0, true)
                    ]),
                    el('div', { className: 'vt-content-panel', dataPanel: 'hide_shorts' }, [
                        createSettingItem('hide_shorts', locale.settings.hide_shorts.title, locale.settings.hide_shorts.description, 0, true)
                    ]),
                    el('div', { className: 'vt-content-panel', dataPanel: 'h264ify' }, [
                        createSettingItem('h264ify', locale.settings.h264ify.title, locale.settings.h264ify.description, 0, true)
                    ]),
                    el('div', { className: 'vt-content-panel', dataPanel: 'hardware_decoding' }, [
                        createSettingItem('hardware_decoding', locale.settings.hardware_decoding.title, locale.settings.hardware_decoding.description, 0, true)
                    ]),
                    el('div', { className: 'vt-content-panel', dataPanel: 'low_memory_mode' }, [
                        createSettingItem('low_memory_mode', locale.settings.low_memory_mode.title, locale.settings.low_memory_mode.description, 0, true)
                    ]),
                    el('div', { className: 'vt-content-panel', dataPanel: 'fullscreen' }, [
                        createSettingItem('fullscreen', locale.settings.fullscreen.title, locale.settings.fullscreen.description, 0, true)
                    ]),
                    el('div', { className: 'vt-content-panel', dataPanel: 'keep_on_top' }, [
                        createSettingItem('keep_on_top', locale.settings.keep_on_top.title, locale.settings.keep_on_top.description, 0, true)
                    ]),
                    el('div', { className: 'vt-content-panel', dataPanel: 'userstyles' }, [
                        el('div', { className: 'vt-userstyles-section' }, [
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
                                    el('div', { className: `vt-toggle ${config.userstyles ? 'vt-toggle-on' : ''}`, dataConfig: 'userstyles' }, [
                                        el('div', { className: 'vt-toggle-track' }, [
                                            el('div', { className: 'vt-toggle-thumb' })
                                        ])
                                    ])
                                ])
                            ]),
                            // Scrollable viewport - uses transform-based scrolling to bypass Leanback's scroll interception
                            el('div', { className: 'vt-userstyles-viewport' }, [
                                el('div', { className: 'vt-userstyles-list', id: 'vt-userstyles-list' }),
                                el('div', { className: 'vt-scrollbar', id: 'vt-userstyles-scrollbar' }, [
                                    el('div', { className: 'vt-scrollbar-thumb', id: 'vt-userstyles-scrollbar-thumb' })
                                ])
                            ]),
                            el('div', {
                                className: 'vt-button',
                                dataAction: 'open-userstyles-folder',
                                dataIndex: '1'
                            }, [
                                el('span', { textContent: locale.settings.userstyles.open_folder })
                            ])
                        ])
                    ]),
                    el('div', { className: 'vt-content-panel', dataPanel: 'controller_support' }, [
                        createSettingItem('controller_support', locale.settings.controller_support.title, locale.settings.controller_support.description, 0, true)
                    ])
                ])
            ])
        ])
    ])
}

async function injectOverlayCSS() {
    // CSS is ours to control here, just make
    // sure to prefix `vt-` for all rules
    const styles = `
        #vt-settings-overlay-root {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            z-index: 10;
            display: flex;
            align-items: center;
            justify-content: center;
            opacity: 1;
            transition: opacity 0.2s ease;
        }

        #vt-settings-overlay-root.vt-settings-hidden {
            opacity: 0;
            pointer-events: none;
        }

        .vt-settings-backdrop {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.85);
        }

        .vt-settings-container {
            position: relative;
            width: 80%;
            max-width: 1200px;
            height: 70%;
            max-height: 700px;
            background: #212121;
            border-radius: 16px;
            display: flex;
            flex-direction: column;
            overflow: hidden;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
        }

        .vt-settings-header {
            display: flex;
            align-items: center;
            padding: 24px 32px;
            background: #212121;
        }

        .vt-settings-title {
            font-size: 28px;
            font-weight: 500;
            color: #fff;
        }

        .vt-settings-hint {
            font-size: 14px;
            color: #aaa;
            margin-left: auto;
            margin-right: 24px;
        }

        .vt-settings-close {
            width: 40px;
            height: 40px;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            border-radius: 50%;
            font-size: 20px;
            color: #aaa;
            transition: background 0.15s ease, color 0.15s ease;
        }

        .vt-settings-close:hover,
        .vt-settings-close.vt-close-focused {
            background: #333;
            color: #fff;
            outline: 2px solid #fff;
            outline-offset: 2px;
        }

        .vt-settings-body {
            display: flex;
            flex: 1;
            overflow: hidden;
        }

        .vt-tabs-viewport {
            width: 280px;
            height: calc(100% - 50px);
            background: #212121;
            overflow: hidden;
            position: relative;
        }

        .vt-settings-tabs {
            padding: 16px;
            transition: transform 0.15s ease-out;
        }

        .vt-tabs-scrollbar {
            right: 4px;
        }

        .vt-tab {
            display: flex;
            align-items: center;
            padding: 14px 20px;
            cursor: pointer;
            transition: background 0.15s ease, color 0.15s ease;
            border-radius: 8px;
            margin-bottom: 4px;
        }

        .vt-tab:hover {
            background: #333;
        }

        .vt-tab.vt-tab-selected {
            background: #fff;
        }

        .vt-tab.vt-tab-selected .vt-tab-label {
            color: #212121;
        }

        .vt-tab.vt-tab-focused {
            outline: 2px solid #fff;
            outline-offset: 2px;
        }

        .vt-tab-label {
            font-size: 18px;
            color: #fff;
        }

        .vt-settings-content {
            flex: 1;
            padding: 24px 32px;
            overflow: hidden;
            background: #212121;
            display: flex;
            flex-direction: column;
        }

        .vt-content-panel {
            display: none;
        }

        .vt-content-panel.vt-panel-active {
            display: flex;
            flex-direction: column;
            flex: 1;
            min-height: 0;
            overflow: hidden;
        }

        .vt-setting-item {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 20px 24px;
            background: #2a2a2a;
            border-radius: 12px;
            margin-bottom: 12px;
            transition: background 0.15s ease;
            cursor: pointer;
            flex-shrink: 0;
        }

        .vt-setting-item:hover {
            background: #333;
        }

        .vt-setting-item.vt-item-focused {
            background: #3a3a3a;
            outline: 2px solid #fff;
            outline-offset: -2px;
        }

        .vt-setting-info {
            display: flex;
            flex-direction: column;
            flex: 1;
            margin-right: 24px;
        }

        .vt-setting-title {
            font-size: 20px;
            font-weight: 500;
            color: #fff;
            margin-bottom: 8px;
        }

        .vt-setting-description {
            font-size: 14px;
            color: #aaa;
            line-height: 1.4;
        }

        .vt-setting-control {
            flex-shrink: 0;
        }

        .vt-toggle {
            width: 56px;
            height: 32px;
            cursor: pointer;
        }

        .vt-toggle-track {
            width: 100%;
            height: 100%;
            background: #555;
            border-radius: 16px;
            position: relative;
            transition: background 0.2s ease;
        }

        .vt-toggle.vt-toggle-on .vt-toggle-track {
            background: #fff;
        }

        .vt-toggle-thumb {
            position: absolute;
            top: 4px;
            left: 4px;
            width: 24px;
            height: 24px;
            background: #fff;
            border-radius: 50%;
            transition: transform 0.2s ease;
        }

        .vt-toggle.vt-toggle-on .vt-toggle-thumb {
            transform: translateX(24px);
            background: #212121;
        }

        .vt-placeholder {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 100%;
            min-height: 300px;
        }

        .vt-placeholder-icon {
            font-size: 64px;
            margin-bottom: 24px;
        }

        .vt-placeholder-text {
            font-size: 18px;
            color: #888;
            text-align: center;
        }

        .vt-userstyles-section {
            display: flex;
            flex-direction: column;
            flex: 1;
            min-height: 0;
            overflow: hidden;
        }

        .vt-userstyles-description {
            font-size: 14px;
            color: #aaa;
            margin-bottom: 20px;
            line-height: 1.5;
            flex-shrink: 0;
        }

        .vt-userstyles-viewport {
            flex: 1;
            min-height: 0;
            max-height: 280px;
            margin-bottom: 20px;
            overflow: hidden;
            position: relative;
        }

        .vt-userstyles-list {
            transition: transform 0.15s ease-out;
            padding-right: 16px;
        }

        .vt-scrollbar {
            position: absolute;
            top: 0;
            right: 0;
            width: 6px;
            height: 100%;
            background: rgba(255, 255, 255, 0.1);
            border-radius: 3px;
            opacity: 0;
            transition: opacity 0.2s ease;
        }

        .vt-userstyles-viewport:hover .vt-scrollbar,
        .vt-scrollbar.vt-scrollbar-visible {
            opacity: 1;
        }

        .vt-scrollbar-thumb {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            min-height: 30px;
            background: rgba(255, 255, 255, 0.5);
            border-radius: 3px;
            transition: transform 0.15s ease-out, background 0.15s ease;
        }

        .vt-scrollbar-thumb:hover {
            background: rgba(255, 255, 255, 0.7);
        }

        .vt-userstyle-item {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 12px 16px;
            background: #2a2a2a;
            border-radius: 8px;
            margin-bottom: 8px;
            cursor: pointer;
            transition: background 0.15s ease;
        }

        .vt-userstyle-item:hover {
            background: #333;
        }

        .vt-userstyle-item.vt-item-focused {
            background: #3a3a3a;
            outline: 2px solid #fff;
            outline-offset: -2px;
        }

        .vt-userstyle-name {
            font-size: 16px;
            color: #fff;
            flex: 1;
        }

        .vt-userstyle-toggle {
            flex-shrink: 0;
            margin-left: 16px;
        }

        .vt-userstyles-empty {
            font-size: 14px;
            color: #666;
            font-style: italic;
            padding: 12px 0;
        }

        .vt-button {
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 16px 24px;
            background: #2a2a2a;
            border-radius: 8px;
            cursor: pointer;
            transition: background 0.15s ease;
            font-size: 16px;
            color: #fff;
            flex-shrink: 0;
        }

        .vt-button:hover {
            background: #333;
        }

        .vt-button.vt-item-focused {
            background: #fff;
            color: #212121;
            outline: 2px solid #fff;
            outline-offset: 2px;
        }
    `

    await css.inject('settings-overlay', styles)
}

function getOverlay() {
    return document.getElementById('vt-settings-overlay-root')
}

// Cached locale for userstyles refresh
let cachedLocale = null

async function refreshUserstylesList() {
    const listContainer = document.getElementById('vt-userstyles-list')
    if (!listContainer) return

    listContainer.innerHTML = ''

    try {
        const styles = await ipcRenderer.invoke('get-userstyles')
        const disabledList = config.disabled_userstyles || []

        if (styles.length === 0) {
            const emptyMsg = el('div', {
                className: 'vt-userstyles-empty',
                textContent: cachedLocale?.settings_overlay?.userstyles.empty || 'No userstyles found'
            })
            listContainer.appendChild(emptyMsg)
        } else {
            styles.forEach(({ filename }, idx) => {
                const isEnabled = !disabledList.includes(filename)
                const item = el('div', {
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
                ])
                listContainer.appendChild(item)
            })
        }

        const button = document.querySelector('.vt-button[data-action="open-userstyles-folder"]')
        if (button) {
            button.dataset.index = String(styles.length + 1)
        }
    } catch (error) {
        console.error('[VT Settings Overlay] Failed to load userstyles:', error)
        const errorMsg = el('div', {
            className: 'vt-userstyles-empty',
            textContent: 'Failed to load userstyles'
        })
        listContainer.appendChild(errorMsg)
    }
}

function showOverlay() {
    const overlay = getOverlay()

    overlayVisible = true
    overlay.classList.remove('vt-settings-hidden')
    overlay.style.opacity = '1'
    overlay.style.pointerEvents = 'auto'
    overlay.focus()

    refreshUserstylesList()

    currentTabIndex = 0
    currentItemIndex = 0
    updateFocus('content')
}

function hideOverlay() {
    const overlay = getOverlay()
    if (!overlay) return

    overlayVisible = false
    overlay.classList.add('vt-settings-hidden')
    overlay.style.opacity = '0'
    overlay.style.pointerEvents = 'none'
}

function updateFocus(area) {
    const overlay = getOverlay()
    if (!overlay) return

    overlay.querySelectorAll('.vt-tab-focused, .vt-item-focused, .vt-close-focused').forEach(el => {
        el.classList.remove('vt-tab-focused', 'vt-item-focused', 'vt-close-focused')
    })

    focusArea = area

    if (area === 'tabs') {
        const tab = overlay.querySelector(`.vt-tab[data-index="${currentTabIndex}"]`)
        if (tab) {
            tab.classList.add('vt-tab-focused')
            updateViewportScroll('.vt-tabs-viewport', '#vt-settings-tabs', tab, '#vt-tabs-scrollbar-thumb')
        }
    } else if (area === 'content') {
        const panel = overlay.querySelector('.vt-content-panel.vt-panel-active')
        if (panel) {
            let focusedElement = null

            const item = panel.querySelector(`.vt-setting-item[data-index="${currentItemIndex}"]`)
            if (item) {
                item.classList.add('vt-item-focused')
                focusedElement = item
            }

            if (!focusedElement) {
                const userstyleItem = panel.querySelector(`.vt-userstyle-item[data-index="${currentItemIndex}"]`)
                if (userstyleItem) {
                    userstyleItem.classList.add('vt-item-focused')
                    focusedElement = userstyleItem
                }
            }

            if (!focusedElement) {
                const button = panel.querySelector(`.vt-button[data-index="${currentItemIndex}"]`)
                if (button) {
                    button.classList.add('vt-item-focused')
                    focusedElement = button
                }
            }

            if (focusedElement && tabs[currentTabIndex]?.id === 'userstyles') {
                updateViewportScroll('.vt-userstyles-viewport', '#vt-userstyles-list', focusedElement, '#vt-userstyles-scrollbar-thumb')
            }
        }
    } else if (area === 'close') {
        const closeBtn = overlay.querySelector('.vt-settings-close')
        if (closeBtn) closeBtn.classList.add('vt-close-focused')
    }
}

/**
 * Updates transform-based scrolling for a viewport/list pair.
 * Use this instead of native scrolling to bypass Leanback's scroll interception.
 *
 * @param {string} viewportSelector - CSS selector for the viewport (overflow:hidden container)
 * @param {string} listSelector - CSS selector or ID for the scrollable list inside viewport
 * @param {HTMLElement} focusedElement - The element to scroll into view
 * @param {string} [scrollbarThumbSelector] - Optional CSS selector for custom scrollbar thumb
 */
function updateViewportScroll(viewportSelector, listSelector, focusedElement, scrollbarThumbSelector) {
    const viewport = document.querySelector(viewportSelector)
    const list = document.querySelector(listSelector) || document.getElementById(listSelector.replace('#', ''))
    if (!list || !viewport) return

    const scrollId = listSelector

    if (scrollOffsets[scrollId] === undefined) {
        scrollOffsets[scrollId] = 0
    }

    if (!list.contains(focusedElement)) {
        list.style.transform = 'translateY(0px)'
        scrollOffsets[scrollId] = 0
        updateScrollbar(viewport, list, 0, scrollbarThumbSelector)
        return
    }

    const viewportHeight = viewport.clientHeight
    const itemTop = focusedElement.offsetTop
    const itemHeight = focusedElement.offsetHeight
    const itemBottom = itemTop + itemHeight

    if (itemBottom - scrollOffsets[scrollId] > viewportHeight) {
        scrollOffsets[scrollId] = itemBottom - viewportHeight + 10
    }
    else if (itemTop < scrollOffsets[scrollId]) {
        scrollOffsets[scrollId] = Math.max(0, itemTop - 10)
    }

    list.style.transform = `translateY(-${scrollOffsets[scrollId]}px)`
    updateScrollbar(viewport, list, scrollOffsets[scrollId], scrollbarThumbSelector)
}

/**
 * Updates the custom scrollbar thumb position and size.
 */
function updateScrollbar(viewport, list, scrollOffset, thumbSelector) {
    if (!thumbSelector) return

    const thumb = document.querySelector(thumbSelector) || document.getElementById(thumbSelector.replace('#', ''))
    const scrollbar = thumb?.parentElement
    if (!thumb || !scrollbar) return

    const viewportHeight = viewport.clientHeight
    const listHeight = list.scrollHeight

    // Hide scrollbar if content fits
    if (listHeight <= viewportHeight) {
        scrollbar.classList.remove('vt-scrollbar-visible')
        return
    }

    scrollbar.classList.add('vt-scrollbar-visible')

    // Calculate thumb size (proportional to visible area)
    const thumbHeight = Math.max(30, (viewportHeight / listHeight) * viewportHeight)
    thumb.style.height = `${thumbHeight}px`

    // Calculate thumb position
    const maxScroll = listHeight - viewportHeight
    const scrollPercent = maxScroll > 0 ? scrollOffset / maxScroll : 0
    const maxThumbTop = viewportHeight - thumbHeight
    const thumbTop = scrollPercent * maxThumbTop

    thumb.style.transform = `translateY(${thumbTop}px)`
}

/**
 * Touch drag scrolling for a viewport/list pair.
 * Call this once per viewport after the DOM is ready.
 *
 * @param {string} viewportSelector - CSS selector for the viewport container
 * @param {string} listSelector - CSS selector for the scrollable list
 * @param {string} [scrollbarThumbSelector] - Optional CSS selector for scrollbar thumb
 */
function setupTouchScroll(viewportSelector, listSelector, scrollbarThumbSelector) {
    const viewport = document.querySelector(viewportSelector)
    const list = document.querySelector(listSelector) || document.getElementById(listSelector.replace('#', ''))
    if (!viewport || !list) return

    const scrollId = listSelector
    let touchStartY = 0
    let startScrollOffset = 0
    let isDragging = false

    viewport.addEventListener('touchstart', (e) => {
        if (e.touches.length !== 1) return
        touchStartY = e.touches[0].clientY
        startScrollOffset = scrollOffsets[scrollId] || 0
        isDragging = true
        list.style.transition = 'none'
    }, { passive: true })

    viewport.addEventListener('touchmove', (e) => {
        if (!isDragging || e.touches.length !== 1) return

        const touchY = e.touches[0].clientY
        const deltaY = touchStartY - touchY

        const viewportHeight = viewport.clientHeight
        const listHeight = list.scrollHeight
        const maxScroll = Math.max(0, listHeight - viewportHeight)

        let newOffset = startScrollOffset + deltaY
        newOffset = Math.max(0, Math.min(maxScroll, newOffset))

        scrollOffsets[scrollId] = newOffset
        list.style.transform = `translateY(-${newOffset}px)`
        updateScrollbar(viewport, list, newOffset, scrollbarThumbSelector)
    }, { passive: true })

    const endDrag = () => {
        if (!isDragging) return
        isDragging = false
        list.style.transition = ''
    }

    viewport.addEventListener('touchend', endDrag, { passive: true })
    viewport.addEventListener('touchcancel', endDrag, { passive: true })
}

/**
 * Resets the scroll position for a viewport/list pair.
 *
 * @param {string} listSelector - CSS selector or ID for the scrollable list
 * @param {string} [scrollbarThumbSelector] - Optional CSS selector for custom scrollbar thumb
 */
function resetViewportScroll(listSelector, scrollbarThumbSelector) {
    const list = document.querySelector(listSelector) || document.getElementById(listSelector.replace('#', ''))
    if (list) {
        list.style.transform = 'translateY(0px)'
    }
    scrollOffsets[listSelector] = 0

    // Reset scrollbar thumb position
    if (scrollbarThumbSelector) {
        const thumb = document.querySelector(scrollbarThumbSelector) || document.getElementById(scrollbarThumbSelector.replace('#', ''))
        if (thumb) {
            thumb.style.transform = 'translateY(0px)'
        }
    }
}

function selectTab(index) {
    const overlay = getOverlay()
    if (!overlay) return

    resetViewportScroll('#vt-userstyles-list', '#vt-userstyles-scrollbar-thumb')

    currentTabIndex = index
    currentItemIndex = 0

    overlay.querySelectorAll('.vt-tab').forEach(tab => {
        tab.classList.remove('vt-tab-selected')
    })
    const selectedTab = overlay.querySelector(`.vt-tab[data-index="${index}"]`)
    if (selectedTab) {
        selectedTab.classList.add('vt-tab-selected')
        const tabId = selectedTab.dataset.tab

        overlay.querySelectorAll('.vt-content-panel').forEach(panel => {
            panel.classList.remove('vt-panel-active')
        })
        const activePanel = overlay.querySelector(`.vt-content-panel[data-panel="${tabId}"]`)
        if (activePanel) activePanel.classList.add('vt-panel-active')
    }
}

function toggleSetting(configKey) {
    const newValue = !config[configKey]
    configManager.set({ [configKey]: newValue })
    config = configManager.get()

    const overlay = getOverlay()
    if (overlay) {
        const toggle = overlay.querySelector(`.vt-toggle[data-config="${configKey}"]`)
        if (toggle) {
            toggle.classList.toggle('vt-toggle-on', newValue)
        }
    }

    if (dynamicFunction[configKey]) {
        dynamicFunction[configKey](newValue)
    }
}

function toggleUserstyle(filename) {
    const disabledList = config.disabled_userstyles || []
    const isCurrentlyDisabled = disabledList.includes(filename)

    let newDisabledList
    if (isCurrentlyDisabled) {
        newDisabledList = disabledList.filter(f => f !== filename)
    } else {
        newDisabledList = [...disabledList, filename]
    }

    configManager.set({ disabled_userstyles: newDisabledList })
    config = configManager.get()

    const overlay = getOverlay()
    if (overlay) {
        const toggle = overlay.querySelector(`.vt-toggle[data-userstyle-toggle="${filename}"]`)
        if (toggle) {
            toggle.classList.toggle('vt-toggle-on', !newDisabledList.includes(filename))
        }
    }

    // Notify userstyles module to update via custom DOM event
    window.dispatchEvent(new CustomEvent('vt-userstyle-toggle', {
        detail: { filename, enabled: isCurrentlyDisabled }
    }))
}

function getItemCount() {
    const overlay = getOverlay()
    if (!overlay) return 0
    const panel = overlay.querySelector('.vt-content-panel.vt-panel-active')
    if (!panel) return 0
    // Count setting items, userstyle items, and buttons
    const settingItems = panel.querySelectorAll('.vt-setting-item').length
    const userstyleItems = panel.querySelectorAll('.vt-userstyle-item').length
    const buttons = panel.querySelectorAll('.vt-button').length
    return settingItems + userstyleItems + buttons
}

let focusArea = 'content' // 'tabs', 'content', or 'close'

function handleKeyDown(e) {
    if (!overlayVisible) return

    const key = e.key

    // Handle escape/back
    if (key === 'Escape' || key === 'Backspace') {
        e.preventDefault()
        e.stopPropagation()
        hideOverlay()
        return
    }

    // Handle navigation
    if (key === 'ArrowUp') {
        e.preventDefault()
        e.stopPropagation()
        if (focusArea === 'tabs') {
            if (currentTabIndex > 0) {
                currentTabIndex--
                selectTab(currentTabIndex) // Immediately switch tab
                updateFocus('tabs')
            }
        } else if (focusArea === 'content') {
            if (currentItemIndex > 0) {
                currentItemIndex--
                updateFocus('content')
            } else {
                // Move to close button when at top of content
                focusArea = 'close'
                updateFocus('close')
            }
        }
    } else if (key === 'ArrowDown') {
        e.preventDefault()
        e.stopPropagation()
        if (focusArea === 'close') {
            // Move from close button to content
            focusArea = 'content'
            currentItemIndex = 0
            updateFocus('content')
        } else if (focusArea === 'tabs') {
            if (currentTabIndex < tabs.length - 1) {
                currentTabIndex++
                selectTab(currentTabIndex)
                updateFocus('tabs')
            }
        } else if (focusArea === 'content') {
            const maxIndex = getItemCount() - 1
            if (currentItemIndex < maxIndex) {
                currentItemIndex++
                updateFocus('content')
            }
        }
    } else if (key === 'ArrowLeft') {
        e.preventDefault()
        e.stopPropagation()
        if (focusArea === 'close') {
        } else {
            focusArea = 'tabs'
            updateFocus('tabs')
        }
    } else if (key === 'ArrowRight') {
        e.preventDefault()
        e.stopPropagation()
        if (focusArea === 'tabs') {
            focusArea = 'content'
            updateFocus('content')
        } else if (focusArea === 'content') {
            // Move to close button from content
            focusArea = 'close'
            updateFocus('close')
        }
    } else if (key === 'Enter' || key === ' ') {
        e.preventDefault()
        e.stopPropagation()
        if (focusArea === 'close') {
            hideOverlay()
        } else if (focusArea === 'tabs') {
            focusArea = 'content'
            updateFocus('content')
        } else if (focusArea === 'content') {
            // Handle the current focused item
            const overlay = getOverlay()
            const panel = overlay.querySelector('.vt-content-panel.vt-panel-active')
            if (panel) {
                const item = panel.querySelector(`.vt-setting-item[data-index="${currentItemIndex}"]`)
                if (item) {
                    const configKey = item.dataset.setting
                    if (configKey) toggleSetting(configKey)
                    return
                }

                const userstyleItem = panel.querySelector(`.vt-userstyle-item[data-index="${currentItemIndex}"]`)
                if (userstyleItem) {
                    const filename = userstyleItem.dataset.userstyle
                    if (filename) toggleUserstyle(filename)
                    return
                }

                const button = panel.querySelector(`.vt-button[data-index="${currentItemIndex}"]`)
                if (button) {
                    const action = button.dataset.action
                    if (action === 'open-userstyles-folder') {
                        ipcRenderer.invoke('open-userstyles-folder')
                    }
                    return
                }
            }
        }
    }
}

function handleGamepadInput() {
    if (!overlayVisible) return

    const gamepads = navigator.getGamepads()
    for (const gamepad of gamepads) {
        if (!gamepad) continue

        // D-pad or left stick for navigation
        const axes = gamepad.axes
        const buttons = gamepad.buttons

        // Check for button presses (with debounce handled by checking pressed state)
        // A/Cross button (index 0) - Select
        if (buttons[0]?.pressed) {
            handleKeyDown({ key: 'Enter', preventDefault: () => { }, stopPropagation: () => { } })
        }
        // B/Circle button (index 1) - Back
        if (buttons[1]?.pressed) {
            handleKeyDown({ key: 'Escape', preventDefault: () => { }, stopPropagation: () => { } })
        }

        // D-pad
        if (buttons[12]?.pressed) { // Up
            handleKeyDown({ key: 'ArrowUp', preventDefault: () => { }, stopPropagation: () => { } })
        }
        if (buttons[13]?.pressed) { // Down
            handleKeyDown({ key: 'ArrowDown', preventDefault: () => { }, stopPropagation: () => { } })
        }
        if (buttons[14]?.pressed) { // Left
            handleKeyDown({ key: 'ArrowLeft', preventDefault: () => { }, stopPropagation: () => { } })
        }
        if (buttons[15]?.pressed) { // Right
            handleKeyDown({ key: 'ArrowRight', preventDefault: () => { }, stopPropagation: () => { } })
        }
    }
}

let gamepadPollInterval = null
let lastGamepadState = {}

function startGamepadPolling() {
    if (gamepadPollInterval) return

    gamepadPollInterval = setInterval(() => {
        if (!overlayVisible) return

        const gamepads = navigator.getGamepads()
        for (let i = 0; i < gamepads.length; i++) {
            const gamepad = gamepads[i]
            if (!gamepad) continue

            const prevState = lastGamepadState[i] || {}
            const buttons = gamepad.buttons

            const checkButton = (index, key) => {
                const isPressed = buttons[index]?.pressed
                const wasPressed = prevState[index]
                if (isPressed && !wasPressed) {
                    handleKeyDown({ key, preventDefault: () => { }, stopPropagation: () => { } })
                }
                return isPressed
            }

            const newState = {}
            newState[0] = checkButton(0, 'Enter')      // A/Cross
            newState[1] = checkButton(1, 'Escape')     // B/Circle
            newState[12] = checkButton(12, 'ArrowUp')  // D-pad Up
            newState[13] = checkButton(13, 'ArrowDown') // D-pad Down
            newState[14] = checkButton(14, 'ArrowLeft') // D-pad Left
            newState[15] = checkButton(15, 'ArrowRight') // D-pad Right

            lastGamepadState[i] = newState
        }
    }, 100)
}

function setupEventListeners() {
    // Global hotkey to open settings (Ctrl+O)
    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.key.toLowerCase() === 'o' && !overlayVisible) {
            e.preventDefault()
            e.stopPropagation()
            showOverlay()
            return
        }
    }, true)

    // Keyboard events - capture phase to intercept before YouTube
    // Block ALL keyboard input when overlay is visible to prevent Leanback from receiving it
    document.addEventListener('keydown', (e) => {
        if (overlayVisible) {
            e.preventDefault()
            e.stopPropagation()
            e.stopImmediatePropagation()
            handleKeyDown(e)
        }
    }, true)

    // Block keyup events to prevent Leanback from seeing them
    document.addEventListener('keyup', (e) => {
        if (overlayVisible) {
            e.preventDefault()
            e.stopPropagation()
            e.stopImmediatePropagation()
        }
    }, true)

    // Mouse/touch events for the overlay
    document.addEventListener('click', (e) => {
        if (!overlayVisible) return

        const overlay = getOverlay()
        if (!overlay) return

        // Click on backdrop to close
        if (e.target.classList.contains('vt-settings-backdrop')) {
            hideOverlay()
            return
        }

        const closeBtn = e.target.closest('.vt-settings-close')
        if (closeBtn) {
            hideOverlay()
            return
        }

        const tab = e.target.closest('.vt-tab')
        if (tab) {
            const index = parseInt(tab.dataset.index)
            selectTab(index)
            focusArea = 'content'
            updateFocus('content')
            return
        }

        const item = e.target.closest('.vt-setting-item')
        if (item) {
            const configKey = item.dataset.setting
            if (configKey) toggleSetting(configKey)
            return
        }

        const userstyleItem = e.target.closest('.vt-userstyle-item')
        if (userstyleItem) {
            const filename = userstyleItem.dataset.userstyle
            if (filename) toggleUserstyle(filename)
            return
        }

        const button = e.target.closest('.vt-button')
        if (button) {
            const action = button.dataset.action
            if (action === 'open-userstyles-folder') {
                ipcRenderer.invoke('open-userstyles-folder')
            }
            return
        }
    }, true)

    startGamepadPolling()
}

function openSettingsOverlay() {
    showOverlay()
}

function toggleSettingsOverlay() {
    if (overlayVisible) {
        hideOverlay()
    } else {
        showOverlay()
    }
}

module.exports = async () => {
    await localeProvider.waitUntilAvailable()
    await functions.waitForCondition(() => !!document.body)

    const locale = localeProvider.getLocale()
    cachedLocale = locale

    await injectOverlayCSS()

    const overlayElement = createOverlayDOM(locale)
    document.body.appendChild(overlayElement)

    // Setup touch scrolling for viewports
    setupTouchScroll('.vt-tabs-viewport', '#vt-settings-tabs', '#vt-tabs-scrollbar-thumb')
    setupTouchScroll('.vt-userstyles-viewport', '#vt-userstyles-list', '#vt-userstyles-scrollbar-thumb')

    // Setup event listeners
    setupEventListeners()

    ipcRenderer.on('config-update', (event, newConfig) => {
        config = newConfig
        const overlay = getOverlay()
        if (overlay) {
            overlay.querySelectorAll('.vt-toggle').forEach(toggle => {
                const configKey = toggle.dataset.config
                if (configKey && config[configKey] !== undefined) {
                    toggle.classList.toggle('vt-toggle-on', config[configKey])
                }
            })
        }
    })

    window.vtOpenSettingsOverlay = openSettingsOverlay
    window.vtToggleSettingsOverlay = toggleSettingsOverlay
}

module.exports.openSettingsOverlay = openSettingsOverlay