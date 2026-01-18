const fs = require('fs')
const crypto = require('crypto')
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
    sponsorblock: false, // Enable Sponsorblock
    sponsorblock_uuid: crypto.randomUUID(), // Sponsorblock wants to track this per user so you can ask it for stats later
    dearrow: false, //replaces titles and thumbnails with more accurate and less sensationalized versions from a crowdsourced database (https://dearrow.ajay.app/)
    dislikes: false, //readds youtube dislikes via https://www.returnyoutubedislike.com/
    remove_super_resolution: false, //block "super resolution" (ai upscaled qualities)
    hide_shorts: false, //hide youtube shorts from homepage
    h264ify: false, //block non-h264 codecs for performance on slow devices
    hardware_decoding: true, //use hardware gpu video decoding
    wayland_hdr: false, //whether or not to enable wayland color management, which allows hdr but sometimes has issues on non-hdr systems
    low_memory_mode: false, //enables env_isLimitedMemory
    keep_on_top: false, //whether or not to keep window on top
    userstyles: false, //whether or not to enable custom CSS injection
    disabled_userstyles: [], //array of filenames that are disabled
    controller_support: true //whether or not to enable game controller support
}

function init(overrides = {}) {
    if (fs.existsSync(legacyStateFile)) {
        console.log('[config] migrating legacy state.json')
        fs.renameSync(legacyStateFile, configFile)
    }

    if (fs.existsSync(configFile) && isValidJson(configFile)) {
        console.log(`[config] reading config from ${configFile}`)

        let parsed = JSON.parse(fs.readFileSync(configFile, 'utf-8'))
        if (parsed['0']) { //i was accidentally still passing the path of the config file to the init function before the overrides (old behavior), causing it to apply the path string as an override and ignore the actual overrides... oops
            console.log('[config] fixing config bug')

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

        console.log('[config] loaded config', config)
    } else {
        console.log('[config] initializing default config')

        config = {
            ...defaults,
            ...overrides
        }

        try {
            fs.writeFileSync(configFile, JSON.stringify(config, null, 4))
        } catch (err) {
            console.error('[config] failed to write config file', err)
        }
    }

    setInterval(save, 500)

    return config;
}

function save() {
    if (changed) {
        console.log('[config] saving updated config to file')

        try {
            fs.writeFileSync(configFile, JSON.stringify(config, null, 4))
            return true;
        } catch (err) {
            console.error('[config] failed to write config file', err)
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
        if (typeof json !== 'object') throw new Error('not an object');

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