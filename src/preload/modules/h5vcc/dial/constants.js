const os = require('os')
const crypto = require('crypto')
const package = require('../../../../../package.json')

const fallbackUUID = crypto.randomUUID()

let hostname = os.hostname()
if (process.platform === 'darwin' && hostname.endsWith('.local')) {
    hostname = hostname.slice(0, -6)
}

module.exports = {
    address: '239.255.255.250',
    port: 1900,
    osAgent: `${os.platform()}/${os.release()}`,
    appAgent: `VacuumTube/${package.version}`,
    hostname,
    uuid: () => {
        try {
            let json = localStorage.getItem('yt.leanback.default::mdx-device-id')
            let obj = JSON.parse(json)
            let uuid = obj?.data;
            if (!uuid || typeof uuid !== 'string') throw new Error(`Bad device ID: ${json}`);

            return uuid;
        } catch (err) {
            console.warn('[h5vcc] DIAL: Failed to get device ID', err)
            return fallbackUUID;
        }
    }
}