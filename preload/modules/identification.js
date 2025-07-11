//overrides various internal things to properly identify the client, os, and browser (it starts out with a ps4 user agent running on cobalt, so we override it to be correct values)

const os = require('os')
const package = require('../../package.json') //it feels weird that this works
const configOverrides = require('../util/configOverrides')

const osPlatform = os.platform()
const osRelease = os.release()

const platformMap = {
    'win32': 'Windows',
    'darwin': 'Macintosh',
    'linux': 'X11' //youtube calls linux as a whole "X11" for some reason
}

const osName = platformMap[osPlatform] || ''
let osVersion;
if (osPlatform === 'win32') {
    let parts = osRelease.split('.')
    parts = parts.slice(0, 2) //first 2, like 10.0 or 5.1 etc
    osVersion = parts.join('.')
} else if (osPlatform === 'darwin') {
    osVersion = '10_15_7' //macos version in user agent is frozen
} else {
    osVersion = ''
}

module.exports = () => {
    configOverrides.environmentOverrides.push({
        platform: 'DESKTOP',
        platform_detail: '__DELETE__',
        brand: 'VacuumTube',
        model: package.version,
        engine: 'WebKit', //youtube's internal user agent parser regards chrome as WebKit based, even though it's just a holdover in the chrome ua
        browser_engine: 'WebKit',
        browser_engine_version: '537.36', //static in chrome's ua
        browser: 'Chrome',
        browser_version: process.versions.chrome,
        os: osName,
        os_version: osVersion,
        feature_switches: {
            mdx_device_label: 'VacuumTube'
        }
    })

    configOverrides.ytcfgOverrides.push({
        INNERTUBE_CONTEXT: {
            client: {
                platform: 'DESKTOP',
                platformDetail: '__DELETE__',
                clientFormFactor: 'UNKNOWN_FORM_FACTOR',
                deviceMake: 'VacuumTube',
                deviceModel: package.version,
                browserName: 'Chrome',
                browserVersion: process.versions.chrome,
                osName: osName,
                osVersion: osVersion,
                tvAppInfo: {
                    releaseVehicle: '__DELETE__'
                }
            }
        },
        WEB_PLAYER_CONTEXT_CONFIGS: {
            WEB_PLAYER_CONTEXT_CONFIG_ID_LIVING_ROOM_WATCH: {
                device: {
                    platform: 'DESKTOP',
                    brand: 'VacuumTube',
                    model: package.version,
                    browser: 'Chrome',
                    browserVersion: process.versions.chrome,
                    os: osName,
                    cobaltReleaseVehicle: '__DELETE__'
                }
            }
        }
    })
}