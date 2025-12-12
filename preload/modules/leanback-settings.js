//injects custom VacuumTube settings into the youtube settings page (and removes an irrelevant option from youtube settings)

const { shell } = require('electron')
const configManager = require('../config')
const jsonMod = require('../util/jsonModifiers')
const rcMod = require('../util/resolveCommandModifiers')
const localeProvider = require('../util/localeProvider')
const functions = require('../util/functions')

let config = configManager.get()

function createSettingButtonRenderer(title, summary, button, callback) {
    return {
        settingActionRenderer: {
            title: {
                runs: [ { text: title } ]
            },
            summary: {
                runs: [ { text: summary } ]
            },
            actionButton: {
                buttonRenderer: {
                    text: {
                        runs: [ { text: button } ]
                    },
                    navigationEndpoint: {
                        vtConfigOption: 'vt-button',
                        vtConfigValue: callback
                    }
                }
            }
        }
    };
}

function createSettingBooleanRenderer(title, summary, configName, dynamicFunction) {
    return {
        settingBooleanRenderer: {
            itemId: 'VOICE_AND_AUDIO_ACTIVITY', //this has to be here for it to listen to the 'enabled' flag, but it doesn't affect anything else
            enabled: config[configName],
            title: {
                runs: [
                    { text: title }
                ]
            },
            summary: {
                runs: [
                    { text: summary }
                ]
            },
            enableServiceEndpoint: {
                vtConfigOption: configName,
                vtConfigValue: true,
                dynamicFunction
            },
            disableServiceEndpoint: {
                vtConfigOption: configName,
                vtConfigValue: false,
                dynamicFunction
            }
        }
    };
}

module.exports = async () => {
    await localeProvider.waitUntilAvailable()
    await functions.waitForCondition(() => !!window.ytcfg)

    let isKids = window.ytcfg.data_.INNERTUBE_CLIENT_NAME === 'TVHTML5_FOR_KIDS' //if you enter/exit kids mode, the page reloads (and therefore, the preload modules re-inject), so this is fine to do non-dynamically
    let locale = localeProvider.getLocale()

    rcMod.addInputModifier((input) => {
        if (input.vtConfigOption) {
            if (input.vtConfigOption === 'vt-button') {
                input.vtConfigValue()
                return false;
            }

            let newConfig = {}
            newConfig[input.vtConfigOption] = input.vtConfigValue;
            configManager.set(newConfig)
            config = configManager.get()

            for (let key of Object.keys(configOptions)) {
                configOptions[key].settingBooleanRenderer.enabled = config[key] //it's actually reference based, you have to change the object itself when changing config for it to update (this took SO long to figure out, then it clicked...)
            }

            if (input.dynamicFunction) {
                input.dynamicFunction(input.vtConfigValue)
            }

            return false;
        }

        return input;
    })

    jsonMod.addModifier((json) => {
        if (json?.items?.[0]?.settingCategoryCollectionRenderer) {
            for (let item of json.items) {
                let category = item.settingCategoryCollectionRenderer;

                /*
                if you're on an in-house browser (like steel or cobalt), this shows the license for the browser
                in this case, it'd show cobalt's license since we use a ps4 user agent which uses the cobalt browser
                in situations where it runs outside of an in-house browser, it simply doesn't send the "Credits" button in the get_settings response
                since we can't change the user agent, we have to remove it manually
                */
                category.items = category.items.filter(c => c.settingReadOnlyItemRenderer?.itemId !== 'ABOUT_OPEN_SOURCE_LICENSES') //this line looks really bad out of context
            }

            if (isKids) return json; //don't show VacuumTube settings/donate in youtube kids

            json.items[0].settingCategoryCollectionRenderer.title = { //doesn't have a label by default
                runs: [
                    { text: 'YouTube' }
                ]
            }

            //VacuumTube entry point
            json.items.unshift(
                {
                    settingCategoryCollectionRenderer: {
                        categoryId: 'SETTINGS_CAT_VACUUMTUBE_OVERLAY',
                        focused: false,
                        items: [
                            createSettingButtonRenderer(
                                locale.settings.generic.title,
                                locale.settings.generic.description,
                                locale.settings.generic.button_label,
                                () => {
                                    if (window.vtOpenSettingsOverlay) {
                                        window.vtOpenSettingsOverlay()
                                    }
                                }
                            ),
                            /*
                            //don't yet have a way to receive donations
                            createSettingButtonRenderer(
                                locale.donate.setting.title,
                                locale.donate.setting.description,
                                locale.donate.setting.button_label,
                                () => {
                                    shell.openExternal('https://shy.rocks/donate')
                                }
                            )
                            */
                        ],
                        title: {
                            runs: [
                                { text: 'VacuumTube' }
                            ]
                        }
                    }
                }
            )
        }

        return json;
    })
}