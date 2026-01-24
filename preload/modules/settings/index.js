// VacuumTube Settings Overlay
// Supports keyboard/mouse, touch input and gamepad navigation

/*
notes for adding a new setting:

add it to the `tabs` array as { id: (config key), hide?: (hide condition) }
the config and locale key should all match up with the id
hide can be used to make a setting conditional / platform specific

for a custom interface, that's a bit complex... but you can start by specifying it in the `customContent` object in createOverlayDOM
*/

const fs = require('fs')
const path = require('path')
const { ipcRenderer } = require('electron')
const configManager = require('../../config')
const css = require('../../util/css')
const localeProvider = require('../../util/localeProvider')
const functions = require('../../util/functions')
const controller = require('../../util/controller')

let locale = null; //gets set in exported function
let config = configManager.get()

const scrollOffsets = {}
let overlayVisible = false;
let currentTabIndex = 0;
let currentItemIndex = 0;

//settings
let tabs = [
    { id: 'adblock' },
    { id: 'sponsorblock' },
    { id: 'dearrow' },
    { id: 'dislikes' },
    { id: 'remove_super_resolution' },
    { id: 'hide_shorts' },
    { id: 'h264ify' },
    { id: 'hardware_decoding' },
    { id: 'wayland_hdr', hide: !(process.platform === 'linux') },
    { id: 'low_memory_mode', },
    { id: 'fullscreen', func: (value) => ipcRenderer.invoke('set-fullscreen', value) },
    { id: 'no_window_decorations' },
    { id: 'keep_on_top', func: (value) => ipcRenderer.invoke('set-on-top', value) },
    { id: 'userstyles' },
    { id: 'controller_support' }
]

tabs = tabs.filter(t => !t.hide)

const dynamicFunction = {}
for (let item of tabs) {
    if (item.func) {
        dynamicFunction[item.id] = item.func;
    }
}

// Helper to create elements with attributes and children
function el(tag, attrs = {}, children = []) {
    const element = document.createElement(tag)
    for (const [ key, value ] of Object.entries(attrs)) {
        if (key === 'className') {
            element.className = value;
        } else if (key === 'textContent') {
            element.textContent = value;
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

    return element;
}

function createOverlayDOM() {
    const createToggle = (configKey) => {
        return el('div', { className: `vt-toggle ${config[configKey] ? 'vt-toggle-on' : ''}`, dataConfig: configKey }, [
            el('div', { className: 'vt-toggle-track' }, [
                el('div', { className: 'vt-toggle-thumb' })
            ])
        ]);
    }

    const createSettingItem = (configKey, title, description, focused = false) => {
        return el('div', {
            className: `vt-setting-item ${focused ? 'vt-item-focused' : ''}`,
            dataSetting: configKey,
            dataIndex: '0'
        }, [
            el('div', { className: 'vt-setting-info' }, [
                el('span', { className: 'vt-setting-title', textContent: title }),
                el('span', { className: 'vt-setting-description', textContent: description })
            ]),
            el('div', { className: 'vt-setting-control' }, [
                createToggle(configKey)
            ])
        ]);
    }

    const createTab = (id, label, index, selected = false) => {
        return el('div', {
            className: `vt-tab ${selected ? 'vt-tab-selected' : ''}`,
            dataTab: id,
            dataIndex: String(index)
        }, [
            el('span', { className: 'vt-tab-label', textContent: label })
        ]);
    }

    const customContent = {

        'userstyles': 
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

    }

    const settingsTabs = []
    for (let i = 0; i < tabs.length; i++) {
        let tab = tabs[i]
        settingsTabs.push(
            createTab(tab.id, locale.settings[tab.id].title, i, i === 0)
        )
    }

    const settingsContent = []
    for (let i = 0; i < tabs.length; i++) {
        let tab = tabs[i]
        let content = customContent[tab.id] || createSettingItem(tab.id, locale.settings[tab.id].title, locale.settings[tab.id].description, true)

        settingsContent.push(
            el('div', { className: `vt-content-panel${i === 0 ? ' vt-panel-active' : ''}`, dataPanel: tab.id }, [
                content
            ])
        )
    }

    // Building the overlay structure
    return el('div', {
        id: 'vt-settings-overlay-root',
        className: 'vt-settings-hidden',
        tabindex: '-1'
    }, [
        el('div', {
            className: 'vt-settings-backdrop'
        }),
        el('div', {
            className: 'vt-settings-container'
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
                    el('div', { className: 'vt-settings-tabs', id: 'vt-settings-tabs' }, settingsTabs),
                    el('div', { className: 'vt-scrollbar vt-tabs-scrollbar', id: 'vt-tabs-scrollbar' }, [
                        el('div', { className: 'vt-scrollbar-thumb', id: 'vt-tabs-scrollbar-thumb' })
                    ])
                ]),
                // Content for settings pages
                el('div', { className: 'vt-settings-content' }, settingsContent)
            ])
        ])
    ])
}

function getOverlay() {
    return document.getElementById('vt-settings-overlay-root');
}

async function refreshUserstylesList() {
    const listContainer = document.getElementById('vt-userstyles-list')
    if (!listContainer) return

    listContainer.replaceChildren() //clears children

    try {
        const styles = await ipcRenderer.invoke('get-userstyles')
        const disabledList = config.disabled_userstyles || []

        if (styles.length === 0) {
            const emptyMsg = el('div', {
                className: 'vt-userstyles-empty',
                textContent: locale.settings.userstyles.warn_empty
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
        console.error('[Settings Overlay] Failed to load userstyles:', error)

        const errorMsg = el('div', {
            className: 'vt-userstyles-empty',
            textContent: locale.settings.userstyles.failed_to_load
        })

        listContainer.appendChild(errorMsg)
    }
}

function showOverlay() {
    const overlay = getOverlay()

    overlayVisible = Date.now()
    overlay.classList.remove('vt-settings-hidden')
    overlay.style.opacity = '1'
    overlay.style.pointerEvents = 'auto'
    overlay.focus()

    refreshUserstylesList()

    currentTabIndex = 0;
    currentItemIndex = 0;
    updateFocus('content')
}

function hideOverlay() {
    const overlay = getOverlay()
    if (!overlay) return;

    overlayVisible = false;
    overlay.classList.add('vt-settings-hidden')
    overlay.style.opacity = '0'
    overlay.style.pointerEvents = 'none'
    overlay.blur() //unfocus
}

function updateFocus(area) {
    const overlay = getOverlay()
    if (!overlay) return;

    overlay.querySelectorAll('.vt-tab-focused, .vt-item-focused, .vt-close-focused').forEach(el => {
        el.classList.remove('vt-tab-focused', 'vt-item-focused', 'vt-close-focused')
    })

    focusArea = area;

    if (area === 'tabs') {
        const tab = overlay.querySelector(`.vt-tab[data-index="${currentTabIndex}"]`)
        if (tab) {
            tab.classList.add('vt-tab-focused')
            updateViewportScroll('.vt-tabs-viewport', '#vt-settings-tabs', tab, '#vt-tabs-scrollbar-thumb')
        }
    } else if (area === 'content') {
        const panel = overlay.querySelector('.vt-content-panel.vt-panel-active')
        if (panel) {
            let focusedElement = null;

            const item = panel.querySelector(`.vt-setting-item[data-index="${currentItemIndex}"]`)
            if (item) {
                item.classList.add('vt-item-focused')
                focusedElement = item;
            }

            if (!focusedElement) {
                const userstyleItem = panel.querySelector(`.vt-userstyle-item[data-index="${currentItemIndex}"]`)
                if (userstyleItem) {
                    userstyleItem.classList.add('vt-item-focused')
                    focusedElement = userstyleItem;
                }
            }

            if (!focusedElement) {
                const button = panel.querySelector(`.vt-button[data-index="${currentItemIndex}"]`)
                if (button) {
                    button.classList.add('vt-item-focused')
                    focusedElement = button;
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
    if (!list || !viewport) return;

    const scrollId = listSelector;

    if (scrollOffsets[scrollId] === undefined) {
        scrollOffsets[scrollId] = 0;
    }

    if (!list.contains(focusedElement)) {
        list.style.transform = 'translateY(0px)'
        scrollOffsets[scrollId] = 0;
        updateScrollbar(viewport, list, 0, scrollbarThumbSelector)
        return;
    }

    const viewportHeight = viewport.clientHeight;
    const itemTop = focusedElement.offsetTop;
    const itemHeight = focusedElement.offsetHeight;
    const itemBottom = itemTop + itemHeight;

    if (itemBottom - scrollOffsets[scrollId] > viewportHeight) {
        scrollOffsets[scrollId] = itemBottom - viewportHeight + 10;
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
    if (!thumbSelector) return;

    const thumb = document.querySelector(thumbSelector) || document.getElementById(thumbSelector.replace('#', ''))
    const scrollbar = thumb?.parentElement;
    if (!thumb || !scrollbar) return;

    const viewportHeight = viewport.clientHeight;
    const listHeight = list.scrollHeight;

    // Hide scrollbar if content fits
    if (listHeight <= viewportHeight) {
        scrollbar.classList.remove('vt-scrollbar-visible')
        return;
    }

    scrollbar.classList.add('vt-scrollbar-visible')

    // Calculate thumb size (proportional to visible area)
    const thumbHeight = Math.max(30, (viewportHeight / listHeight) * viewportHeight)
    thumb.style.height = `${thumbHeight}px`

    // Calculate thumb position
    const maxScroll = listHeight - viewportHeight;
    const scrollPercent = maxScroll > 0 ? scrollOffset / maxScroll : 0;
    const maxThumbTop = viewportHeight - thumbHeight;
    const thumbTop = scrollPercent * maxThumbTop;

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
    if (!viewport || !list) return;

    const scrollId = listSelector;
    let touchStartY = 0;
    let startScrollOffset = 0;
    let isDragging = false;

    viewport.addEventListener('touchstart', (e) => {
        if (e.touches.length !== 1) return;
        touchStartY = e.touches[0].clientY;
        startScrollOffset = scrollOffsets[scrollId] || 0;
        isDragging = true;
        list.style.transition = 'none'
    }, { passive: true })

    viewport.addEventListener('touchmove', (e) => {
        if (!isDragging || e.touches.length !== 1) return;

        const touchY = e.touches[0].clientY;
        const deltaY = touchStartY - touchY;

        const viewportHeight = viewport.clientHeight;
        const listHeight = list.scrollHeight;
        const maxScroll = Math.max(0, listHeight - viewportHeight)

        let newOffset = startScrollOffset + deltaY;
        newOffset = Math.max(0, Math.min(maxScroll, newOffset))

        scrollOffsets[scrollId] = newOffset;
        list.style.transform = `translateY(-${newOffset}px)`
        updateScrollbar(viewport, list, newOffset, scrollbarThumbSelector)
    }, { passive: true })

    const endDrag = () => {
        if (!isDragging) return;
        isDragging = false;
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

    scrollOffsets[listSelector] = 0;

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
    if (!overlay) return;

    resetViewportScroll('#vt-userstyles-list', '#vt-userstyles-scrollbar-thumb')

    currentTabIndex = index;
    currentItemIndex = 0;

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
    if (!overlay) return 0;

    const panel = overlay.querySelector('.vt-content-panel.vt-panel-active')
    if (!panel) return 0;

    // Count setting items, userstyle items, and buttons
    const settingItems = panel.querySelectorAll('.vt-setting-item').length;
    const userstyleItems = panel.querySelectorAll('.vt-userstyle-item').length;
    const buttons = panel.querySelectorAll('.vt-button').length;

    return settingItems + userstyleItems + buttons;
}

let focusArea = 'content' // 'tabs', 'content', or 'close'

function handleKeyDown(e) {
    if (!overlayVisible) return;

    const key = e.key;

    // Handle escape/back
    if (key === 'Escape' || key === 'Backspace') {
        e.preventDefault()
        e.stopPropagation()
        hideOverlay()
        return;
    }

    // Handle navigation
    if (key === 'ArrowUp') {
        e.preventDefault()
        e.stopPropagation()
        if (focusArea === 'tabs') {
            if (currentTabIndex > 0) {
                currentTabIndex--;
                selectTab(currentTabIndex) // Immediately switch tab
                updateFocus('tabs')
            }
        } else if (focusArea === 'content') {
            if (currentItemIndex > 0) {
                currentItemIndex--;
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
            currentItemIndex = 0;
            updateFocus('content')
        } else if (focusArea === 'tabs') {
            if (currentTabIndex < tabs.length - 1) {
                currentTabIndex++;
                selectTab(currentTabIndex)
                updateFocus('tabs')
            }
        } else if (focusArea === 'content') {
            const maxIndex = getItemCount() - 1;
            if (currentItemIndex < maxIndex) {
                currentItemIndex++;
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
                    const configKey = item.dataset.setting;
                    if (configKey) toggleSetting(configKey)

                    return;
                }

                const userstyleItem = panel.querySelector(`.vt-userstyle-item[data-index="${currentItemIndex}"]`)
                if (userstyleItem) {
                    const filename = userstyleItem.dataset.userstyle
                    if (filename) toggleUserstyle(filename)
                    return;
                }

                const button = panel.querySelector(`.vt-button[data-index="${currentItemIndex}"]`)
                if (button) {
                    const action = button.dataset.action;
                    if (action === 'open-userstyles-folder') {
                        ipcRenderer.invoke('open-userstyles-folder')
                    }

                    return;
                }
            }
        }
    }
}

const gamepadKeyMap = {
    0: 'Enter',        //a
    1: 'Escape',       //b
    12: 'ArrowUp',     //dpad up
    13: 'ArrowDown',   //dpad down
    14: 'ArrowLeft',   //dpad left
    15: 'ArrowRight',  //dpad right

    1012: 'ArrowUp',   //left stick up
    1014: 'ArrowDown', //left stick down
    1011: 'ArrowLeft', //left stick left
    1013: 'ArrowRight' //left stick right
}

function setupEventListeners() {
    // Global hotkey to open settings (Ctrl+O)
    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.key.toLowerCase() === 'o' && !overlayVisible) {
            e.preventDefault()
            e.stopPropagation()
            showOverlay()
            return;
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
        if (!overlayVisible) return;

        const overlay = getOverlay()
        if (!overlay) return;

        // Click on backdrop to close
        if (e.target.classList.contains('vt-settings-backdrop')) {
            hideOverlay()
            return;
        }

        const closeBtn = e.target.closest('.vt-settings-close')
        if (closeBtn) {
            hideOverlay()
            return;
        }

        const tab = e.target.closest('.vt-tab')
        if (tab) {
            const index = parseInt(tab.dataset.index)
            selectTab(index)
            focusArea = 'content'
            updateFocus('content')

            return;
        }

        const item = e.target.closest('.vt-setting-item')
        if (item) {
            const configKey = item.dataset.setting;
            if (configKey) toggleSetting(configKey)
            return;
        }

        const userstyleItem = e.target.closest('.vt-userstyle-item')
        if (userstyleItem) {
            const filename = userstyleItem.dataset.userstyle;
            if (filename) toggleUserstyle(filename)
            return;
        }

        const button = e.target.closest('.vt-button')
        if (button) {
            const action = button.dataset.action;
            if (action === 'open-userstyles-folder') {
                ipcRenderer.invoke('open-userstyles-folder')
            }

            return;
        }
    }, true)

    controller.on('down', (e) => {
        if ((Date.now() - overlayVisible) < 100) return; //dumb way to fix accidental input

        let key = gamepadKeyMap[e.code]
        if (key) {
            handleKeyDown({ key, preventDefault: () => {}, stopPropagation: () => {} })
        }
    })
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

    locale = localeProvider.getLocale()

    //inject settings css
    const cssPath = path.join(__dirname, 'style.css')
    const text = fs.readFileSync(cssPath, 'utf-8')

    css.inject('settings', text)

    //create overlay
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
                const configKey = toggle.dataset.config;
                if (configKey && config[configKey] !== undefined) {
                    toggle.classList.toggle('vt-toggle-on', config[configKey])
                }
            })
        }
    })

    window.vtOpenSettingsOverlay = openSettingsOverlay;
    window.vtToggleSettingsOverlay = toggleSettingsOverlay;
}

module.exports.openSettingsOverlay = openSettingsOverlay;