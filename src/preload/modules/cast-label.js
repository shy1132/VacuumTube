//label that displays when casting

const os = require('os')
const configOverrides = require('../util/configOverrides')
const xhrModifiers = require('../util/xhrModifiers')

let hostname = os.hostname() //still the same in flatpak
if (process.platform === 'darwin' && hostname.endsWith('.local')) {
    hostname = hostname.slice(0, -6)
}

const label = `${hostname} (VacuumTube)` //only mentions VacuumTube incase the user doesn't know their hostname

module.exports = () => {
    //label that displays on cast
    configOverrides.environmentOverrides.push({
        feature_switches: {
            mdx_device_label: label
        }
    })

    //when connecting to the mobile app as a remote (handoff), leanback uses the name `{brand} {model}` instead of the label
    xhrModifiers.addRequestModifier((url, body) => {
        if (!url.includes('/youtubei/v1/mdx/handoff') || typeof body !== 'string') return body;

        let json;
        try {
            json = JSON.parse(body)
        } catch {
            return body;
        }

        let params = [ json.handoffParams, ...(json.actionParams || []).map((p) => p.handoffEzParams) ]
        for (let device of params.map((p) => p?.featureData?.lrMobileKeyData?.lrDevice)) {
            if (device) {
                device.deviceName = label;
            }
        }

        return JSON.stringify(json);
    })
}