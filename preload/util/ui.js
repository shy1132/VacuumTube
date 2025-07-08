const rcMod = require('./resolveCommandModifiers')

/**
 * Creates a toast in the top right using YouTube UI
 * @param {string} title - The title (top text) of the toast
 * @param {string} subtitle - The subtitle (bottom text) of the toast
 * @returns {void}
 */
function toast(title, subtitle) {
    let toastCommand = {
        openPopupAction: {
            popupType: 'TOAST',
            popup: {
                overlayToastRenderer: {
                    title: {
                        simpleText: title
                    },
                    subtitle: {
                        simpleText: subtitle
                    }
                }
            }
        }
    };

    rcMod.resolveCommand(toastCommand)
}

/**
 * Creates a popup menu configuration object for YouTube UI rendering
 * @param {Object} options - The options for the popup menu
 * @param {string} options.title - The title text to display in the popup header
 * @param {Array} options.items - Array of menu items to display in the popup
 * @param {number} [options.selectedIndex=0] - The index of the initially selected item (defaults to 0)
 * @returns {Object} A nested object structure containing the popup menu configuration
 */
function popupMenu(options) {
    return {
        openPopupAction: {
            popup: {
                overlaySectionRenderer: {
                    dismissalCommand: {
                        signalAction: {
                            signal: 'POPUP_BACK'
                        }
                    },
                    overlay: {
                        overlayTwoPanelRenderer: {
                            actionPanel: {
                                overlayPanelRenderer: {
                                    header: {
                                        overlayPanelHeaderRenderer: {
                                            title: {
                                                simpleText: options.title
                                            }
                                        }
                                    },
                                    content: {
                                        overlayPanelItemListRenderer: {
                                            selectedIndex: options.selectedIndex || 0,
                                            items: options.items,
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    };
}

/**
 * Creates a link object with specified configuration for a compact link renderer
 * @param {Object} options - Configuration options for the link
 * @param {string} options.title - The title text to display for the link
 * @param {string} [options.icon] - Optional icon type to display as secondary icon
 * @param {boolean} [options.closeMenu] - If true, adds a command to close popup menu
 * @param {Function} [options.callback] - Optional callback function to execute when link is clicked
 * @param {Function} [options.createSubMenu] - Optional function that returns submenu configuration
 * @returns {Object} Link configuration object with compactLinkRenderer structure
 */
function link(options) {
    return {
        compactLinkRenderer: {
            title: {
                simpleText: options.title
            },
            secondaryIcon: options.icon ? { iconType: options.icon } : undefined,
            serviceEndpoint: {
                commandExecutorCommand: {
                    get commands() {
                        return [
                            options.closeMenu
                                ? {
                                    signalAction: {
                                        signal: 'POPUP_BACK'
                                    }
                                }
                                : undefined,
                            options.callback
                                ? {
                                    signalAction: {
                                        get signal() {
                                            options.callback()
                                            return 'UNKNOWN';
                                        }
                                    }
                                }
                                : undefined,
                            options.createSubMenu
                                ? options.createSubMenu()
                                : undefined
                        ]
                    }
                }
            }
        }
    };
}

module.exports = {
    toast,
    popupMenu,
    link
}