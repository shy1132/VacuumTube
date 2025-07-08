//injects custom VacuumTube settings into the youtube settings page

const { ipcRenderer } = require('electron')
const configManager = require('../config')
const jsonMod = require('../util/jsonModifiers')
const rcMod = require('../util/resolveCommandModifiers')
const localeProvider = require('../util/localeProvider')
const functions = require('../util/functions')

let config = configManager.get()

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
        'fullscreen': createSettingBooleanRenderer( //todo: make it actively toggle fullscreen
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
        )
    }

    rcMod.addInputModifier((input) => {
        if (input.vtConfigOption) {
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
        if (isKids) return json; //don't show these in youtube kids

        if (json?.items?.[0]?.settingCategoryCollectionRenderer) {
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