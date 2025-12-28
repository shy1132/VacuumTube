const rcMod = require('../util/resolveCommandModifiers')
const localeProvider = require('../util/localeProvider')

module.exports = async () => {
    await localeProvider.waitUntilAvailable()

    let locale = localeProvider.getLocale()

    rcMod.addInputModifier((c) => {
        if (c.openPopupAction?.uniqueId === 'unknown-player-error') {
            return {
                openPopupAction: {
                    popupType: 'FULLSCREEN_OVERLAY',
                    uniqueId: 'vt-player-error',
                    popup: {
                        overlaySectionRenderer: {
                            overlay: {
                                overlayTwoPanelRenderer: {
                                    actionPanel: {
                                        overlayPanelRenderer: {
                                            header: {
                                                overlayPanelHeaderRenderer: {
                                                    title: {
                                                        simpleText: locale.general.encryption_error.title
                                                    },
                                                    subtitle: {
                                                        simpleText: locale.general.encryption_error.text
                                                    }
                                                }
                                            },
                                            footer: {
                                                overlayPanelItemListRenderer: {
                                                    items: [
                                                        {
                                                            compactLinkRenderer: {
                                                                title: {
                                                                    simpleText: locale.general.encryption_error.switch_accounts
                                                                },
                                                                serviceEndpoint: {
                                                                    commandExecutorCommand: {
                                                                        commands: [
                                                                            {
                                                                                clientActionEndpoint: {
                                                                                    action: { actionType: 'OPEN_SIGN_IN_PROMPT' }
                                                                                }
                                                                            }
                                                                        ]
                                                                    }
                                                                }
                                                            }
                                                        },
                                                        {
                                                            compactLinkRenderer: {
                                                                title: {
                                                                    simpleText: locale.general.encryption_error.okay
                                                                },
                                                                serviceEndpoint: {
                                                                    commandExecutorCommand: {
                                                                        commands: [
                                                                            { signalAction: { signal: 'HISTORY_BACK' } },
                                                                            { signalAction: { signal: 'CLOSE_POPUP' } }
                                                                        ]
                                                                    }
                                                                }
                                                            }
                                                        }
                                                    ]
                                                }
                                            }
                                        }
                                    },
                                    backButton: {
                                        buttonRenderer: {
                                            icon: { iconType: 'DISMISSAL' },
                                            command: {
                                                commandExecutorCommand: {
                                                    commands: [
                                                        { signalAction: { signal: 'HISTORY_BACK' } },
                                                        { signalAction: { signal: 'CLOSE_POPUP' } }
                                                    ]
                                                }
                                            }
                                        }
                                    }
                                }
                            },
                            dismissalCommand: {
                                commandExecutorCommand: {
                                    commands: [
                                        { signalAction: { signal: 'HISTORY_BACK' } },
                                        { signalAction: { signal: 'CLOSE_POPUP' } }
                                    ]
                                }
                            }
                        }
                    }
                }
            };
        }

        return c;
    })
}