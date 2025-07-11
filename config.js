const fs = require('fs')
const electron = require('electron')
const path = require('path')

const userData = electron.app.getPath('userData')
const legacyStateFile = path.join(userData, 'state.json')
const configFile = path.join(userData, 'config.json')

let changed = false;
let config = {}

const defaults = {
    fullscreen: false, //changes automatically depending on user's last preference
    adblock: true, //block ads
    hardware_decoding: true, //use hardware gpu video decoding
    h264ify: false, //block non-h264 codecs for performance on slow devices
    low_memory_mode: false, //enables env_isLimitedMemory
    keep_on_top: false //whether or not to keep window on top
}

function init(overrides = {}) {
    if (fs.existsSync(legacyStateFile)) {
        console.log('migrating legacy state.json')
        fs.renameSync(legacyStateFile, configFile)
    }

    if (fs.existsSync(configFile) && isValidJson(configFile)) {
        console.log(`reading config from ${configFile}`)

        let parsed = JSON.parse(fs.readFileSync(configFile, 'utf-8'))
        if (parsed['0']) { //i was accidentally still passing the path of the config file to the init function before the overrides (old behavior), causing it to apply the path string as an override and ignore the actual ovrerides... oops
            console.log('fixing config bug')

            for (let key of Object.keys(parsed)) {
                if (!isNaN(Number(key))) { //remove each character of the path string...
                    delete parsed[key];
                }
            }

            fs.writeFileSync(configFile, JSON.stringify(parsed, null, 4))
        }

        config = {
            ...defaults,
            ...parsed
        }

        console.log('loaded config', config)
    } else {
        console.log('initializing default config')

        config = {
            ...defaults,
            ...overrides
        }

        try {
            fs.writeFileSync(configFile, JSON.stringify(config, null, 4))
        } catch (err) {
            console.error('failed to write config file', err)
        }
    }

    setInterval(save, 2500)

    return config;
}

function save() {
    if (changed) {
        console.log('saving updated config to file')

        try {
            fs.writeFileSync(configFile, JSON.stringify(config, null, 4))
            return true;
        } catch (err) {
            console.error('failed to write config file', err)
            return false;
        } finally {
            changed = false;
        }
    }
}

function update(newConfig = {}) {
    config = {
        ...defaults,
        ...config,
        ...newConfig
    }

    changed = true;
}

function get() {
    return config;
}

function isValidJson(file) {
    try {
        let text = fs.readFileSync(file, 'utf-8')
        let json = JSON.parse(text)
        if (typeof json != 'object') throw new Error('not an object');

        return true;
    } catch {
        return false;
    }
}

module.exports = {
    init,
    save,
    update,
    get
}