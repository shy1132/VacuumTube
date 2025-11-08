//overrides various internal things to properly identify the client, os, and browser (it starts out with a ps4 user agent running on cobalt, so we override it to be correct values)

const os = require('os')
const package = require('../../package.json') //it feels weird that this works
const xhrModifiers = require('../util/xhrModifiers')
const configOverrides = require('../util/configOverrides')
const functions = require('../util/functions')

const osPlatform = os.platform()
const osRelease = os.release()
const hostname = os.hostname() //still the same in flatpak

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
            mdx_device_label: `VacuumTube on ${hostname}` //label that displays on cast
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

    //sometimes, xhrs can be sent (but not ran to completion) before all of this has time to kick in, so we manually patch too just to be safe
    xhrModifiers.addRequestModifier((url, body) => {
        if (!url.startsWith('/youtubei/')) return body;

        let json;
        try {
            json = JSON.parse(body)
        } catch {
            return body;
        }

        if (json?.context?.client) {
            functions.deepMerge(json.context.client, {
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
            })

            body = JSON.stringify(json)
        }

        return body;
    })

    xhrModifiers.addResponseModifier((url, text) => {
        if (!url.startsWith('/tv_config')) return;

        let parts = text.split('\n')
        let lastLine = parts[parts.length - 1]
        let json = JSON.parse(lastLine)

        functions.deepMerge(json.webPlayerContextConfig.WEB_PLAYER_CONTEXT_CONFIG_ID_LIVING_ROOM_WATCH.device, {
            platform: 'DESKTOP',
            brand: 'VacuumTube',
            model: package.version,
            browser: 'Chrome',
            browserVersion: process.versions.chrome,
            os: osName,
            cobaltReleaseVehicle: '__DELETE__'
        })

        return JSON.stringify(json);
    })
}