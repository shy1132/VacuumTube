const crypto = require('crypto')
const package = require('../../../../../package.json')

const fallbackUUID = crypto.randomUUID()

module.exports = {
    address: '239.255.255.250',
    port: 1900,
    agent: `VacuumTube/${package.version}`,
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