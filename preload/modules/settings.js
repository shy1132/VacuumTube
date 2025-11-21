//injects custom VacuumTube settings into the youtube settings page (and removes an irrelevant option from youtube settings)

const { ipcRenderer } = require('electron')
const configManager = require('../config')
const jsonMod = require('../util/jsonModifiers')
const rcMod = require('../util/resolveCommandModifiers')
const localeProvider = require('../util/localeProvider')
const functions = require('../util/functions')
const ui = require('../util/ui')

let cssPath = ipcRenderer.sendSync('get-userstyles-path')
let config = configManager.get()

function createSettingButtonRenderer(title, summary, callback) {
    return {
        settingActionRenderer: {
            title: {
                runs: [ { text: title } ]
            },
            subtitle: {
                runs: [ { text: summary } ]
            },
            actionButton: {
                buttonRenderer: {
                    text: {
                        runs: [ { text: title } ] 
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

    let configOptions = {
        'adblock': createSettingBooleanRenderer(
            locale.settings.ad_block.title,
            locale.settings.ad_block.description,
            'adblock'
        ),
        'sponsorblock': createSettingBooleanRenderer(
            locale.settings.sponsorblock.title,
            locale.settings.sponsorblock.description,
            'sponsorblock'
        ),
        'dearrow': createSettingBooleanRenderer(
            locale.settings.dearrow.title,
            locale.settings.dearrow.description,
            'dearrow'
        ),
        'dislikes': createSettingBooleanRenderer(
            locale.settings.dislikes.title,
            locale.settings.dislikes.description,
            'dislikes'
        ),
        'remove_super_resolution': createSettingBooleanRenderer(
            locale.settings.remove_super_resolution.title,
            locale.settings.remove_super_resolution.description,
            'remove_super_resolution'
        ),
        'hide_shorts': createSettingBooleanRenderer(
            locale.settings.hide_shorts.title,
            locale.settings.hide_shorts.description,
            'hide_shorts'
        ),
        'h264ify': createSettingBooleanRenderer(
            locale.settings.h264ify.title,
            locale.settings.h264ify.description,
            'h264ify'
        ),
        'hardware_decoding': createSettingBooleanRenderer(
            locale.settings.hardware_decoding.title,
            locale.settings.hardware_decoding.description,
            'hardware_decoding'
        ),
        'low_memory_mode': createSettingBooleanRenderer(
            locale.settings.low_memory_mode.title,
            locale.settings.low_memory_mode.description,
            'low_memory_mode'
        ),
        'fullscreen': createSettingBooleanRenderer(
            locale.settings.fullscreen.title,
            locale.settings.fullscreen.description,
            'fullscreen',
            (value) => ipcRenderer.invoke('set-fullscreen', value)
        ),
        'keep_on_top': createSettingBooleanRenderer(
            locale.settings.keep_on_top.title,
            locale.settings.keep_on_top.description,
            'keep_on_top',
            (value) => ipcRenderer.invoke('set-on-top', value)
        ),
        'userstyles': createSettingBooleanRenderer(
            locale.settings.userstyles.title,
            locale.settings.userstyles.description.replace('{path}', cssPath),
            'userstyles'
        ),
        'controller_support': createSettingBooleanRenderer(
            locale.settings.controller_support.title,
            locale.settings.controller_support.description,
            'controller_support'
        ),
        'exit': createSettingButtonRenderer(
            locale.settings.exit.title,
            locale.settings.exit.description,
            () => {
                rcMod.resolveCommand(ui.popupMenu({
                    title: locale.settings.exit.confirmation,
                    items: [
                        ui.link({
                            title: locale.settings.exit.yes,
                            callback: () => window.close(),
                            closeMenu: true
                        }),
                        ui.link({
                           title: locale.settings.exit.no,
                            closeMenu: true
                         })
                        ]    
                }))
            }
        )
    }

    rcMod.addInputModifier((input) => {
        if (input.vtConfigOption) {
            if (input.vtConfigOption === 'vt-button') {
                input.vtConfigValue()
                return false
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

            if (isKids) return json; //don't show VacuumTube settings in youtube kids

            json.items[0].settingCategoryCollectionRenderer.title = { //doesn't have a label by default
                runs: [
                    { text: 'YouTube' }
                ]
            }

            json.items.unshift(
                {
                    settingCategoryCollectionRenderer: {
                        categoryId: 'SETTINGS_CAT_VACUUMTUBE',
                        focused: false,
                        items: [
                            ...Object.values(configOptions)
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