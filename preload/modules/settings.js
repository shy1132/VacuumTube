const configManager = require('../config.js')
const jsonMod = require('../util/jsonModifiers.js')
const rcMod = require('../util/resolveCommandModifiers.js')

let config = configManager.get()

function createSettingBooleanRenderer(title, summary, icon, configName) {
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
            thumbnail: {
                thumbnails: [
                    { url: icon }
                ]
            },
            enableServiceEndpoint: {
                vtConfigOption: configName,
                vtConfigValue: true
            },
            disableServiceEndpoint: {
                vtConfigOption: configName,
                vtConfigValue: false
            }
        }
    };
}

module.exports = async () => {
    let configOptions = {
        'adblock': createSettingBooleanRenderer(
            'Ad Block',
            'Seamlessly blocks video and feed ads, not subject to YouTube\'s methods of preventing blockers. Restart after toggling.',
            null,
            'adblock'
        ),
        'h264ify': createSettingBooleanRenderer(
            'h264ify',
            'Forces YouTube to only stream videos in the H.264 codec. This can help with performance and battery life on slower devices, but prevents you from watching anything above 1080p. Restart after toggling.',
            null,
            'h264ify'
        ),
        'low_memory_mode': createSettingBooleanRenderer(
            'Low Memory Mode',
            'Tells YouTube to enable low memory mode, which may improve performance on slower devices at the cost of some visual effects. Restart after toggling.',
            null,
            'low_memory_mode'
        ),
        'keep_on_top': createSettingBooleanRenderer(
            'Keep on Top',
            'Makes VacuumTube launch with the window pinned on top of every other window. Doesn\'t apply in Steam Game Mode, where it\'s always on top.',
            null,
            'keep_on_top'
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

            return false;
        }

        return input;
    })

    jsonMod.addModifier((json) => {
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