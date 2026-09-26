const fs = require('fs')
const crypto = require('crypto')
const electron = require('electron')
const path = require('path')

const userData = electron.app.getPath('userData')
const legacyStateFile = path.join(userData, 'state.json')
const configFile = path.join(userData, 'config.json')
const tempConfigFile = configFile + '.tmp'
const oldConfigFile = configFile + '.old'

let changed = false;
let saveFailed = false;
let config = {}

const defaults = { //mess
    volume: 100, //video volume (0-100)
    adblock: true, //block ads
    sponsorblock: false, //enable sponsorblock
    sponsorblock_uuid: crypto.randomUUID(), //sponsorblock wants to track this per user so you can ask it for stats later
    sponsorblock_skip_sponsor: true,
    sponsorblock_skip_selfpromo: false,
    sponsorblock_skip_interaction: false,
    sponsorblock_skip_intro: false,
    sponsorblock_skip_outro: false,
    sponsorblock_skip_preview: false,
    sponsorblock_skip_hook: false,
    sponsorblock_skip_filler: false,
    dearrow: false, //replaces titles and thumbnails with more accurate and less sensationalized versions from a crowdsourced database (https://dearrow.ajay.app/)
    dislikes: false, //readds youtube dislikes via https://www.returnyoutubedislike.com/
    remove_super_resolution: false, //block "super resolution" (ai upscaled qualities)
    hide_shorts: false, //hide youtube shorts from homepage
    block_continue_watching: false, //blocks the "Video paused. Continue watching?" prompt that appears after being idle for a while
    h264ify: false, // enable codec blocking feature 
    h264ify_disable_webm: true, //when h264ify is enabled, block webm container streams
    h264ify_disable_vp8: true, //when h264ify is enabled, block vp8 streams
    h264ify_disable_vp9: true, //when h264ify is enabled, block vp9 streams
    h264ify_disable_av1: true, //when h264ify is enabled, block av1 streams
    unlock_resolution: false, //unlock resolution past window resolution
    hardware_decoding: true, //use hardware gpu video decoding
    wayland_hdr: false, //whether or not to enable wayland color management, which allows hdr but sometimes has issues on non-hdr systems
    low_memory_mode: false, //enables env_isLimitedMemory
    fullscreen: false, //whether or not to launch in fullscreen, changes automatically if user enters/exits fullscreen
    features_enabled: false, //whether or not VacuumTube extended features are enabled
    music_mode_feature: false, //whether or not the music mode *feature* is enabled
    music_mode: false, //whether or not music mode *itself* is enabled
    ultrawide_feature: false, //whether or not to expand the interface via css to fill ultrawide displays
    remaining_time_feature: false, //whether or not to show videos remaining playback time
    no_window_decorations: false, //whether or not to disable window decorations
    keep_on_top: false, //whether or not to keep window on top
    pause_on_blur: false, //whether or not to pause video when out of focus (such as tabbing out)
    userstyles: false, //whether or not to enable custom CSS injection
    disabled_userstyles: [], //array of filenames that are disabled
    touch_overlay: true, //whether or not to enable the touch overlay interface when touch is detected
    controller_support: true, //whether or not to enable game controller support
    device_discoverability: true, //whether or not to enable DIAL support
    auto_update: true //whether or not to download and install updates automatically (only on installs that support it)
}

function init(overrides = {}) {
    if (fs.existsSync(legacyStateFile) && !fs.existsSync(configFile)) {
        console.log('[config] Migrating legacy state.json')
        fs.renameSync(legacyStateFile, configFile)
    }

    let parsed = fs.existsSync(configFile) ? readConfig(configFile) : null;
    if (fs.existsSync(configFile) && !parsed) {
        console.error(`[config] ${configFile} is not valid, backing it up to ${oldConfigFile} and starting with default config`)

        try {
            fs.renameSync(configFile, oldConfigFile)
        } catch (err) {
            console.error('[config] Failed to back up invalid config file', err)
        }
    }

    if (parsed) {
        console.log(`[config] Reading config from ${configFile}`)

        if (parsed['0']) { //i was accidentally still passing the path of the config file to the init function before the overrides (old behavior), causing it to apply the path string as an override and ignore the actual overrides... oops
            for (let key of Object.keys(parsed)) {
                if (!isNaN(Number(key))) { //remove each character of the path string...
                    delete parsed[key];
                }
            }

            changed = true;
        }

        config = {
            ...defaults,
            ...parsed
        }

        if (Object.keys(config).length > Object.keys(parsed).length) { //some defaults were missing
            changed = true;
        }

        console.log('[config] Loaded config', config)
    } else {
        console.log('[config] Initializing default config')

        config = {
            ...defaults,
            ...overrides
        }

        changed = true;
    }

    save()

    setInterval(save, 500)

    return config;
}

function save() {
    if (!changed) return;

    try {
        writeConfig(config)
        changed = false;
        saveFailed = false;
        console.log('[config] Saved config to file')
        return true;
    } catch (err) {
        if (!saveFailed) {
            console.error('[config] Failed to write config file, will keep retrying', err)
        }

        saveFailed = true;
        return false; //stays changed, so it's retried on the next save
    }
}

function writeConfig(value) {
    fs.mkdirSync(userData, { recursive: true })

    //atomic write to avoid corruption
    let fd = fs.openSync(tempConfigFile, 'w')
    try {
        fs.writeSync(fd, JSON.stringify(value, null, 4))
        fs.fsyncSync(fd)
    } finally {
        fs.closeSync(fd)
    }

    fs.renameSync(tempConfigFile, configFile)
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

function readConfig(file) {
    try {
        let json = JSON.parse(fs.readFileSync(file, 'utf-8'))
        if (typeof json !== 'object' || json === null || Array.isArray(json)) return null;

        return json;
    } catch {
        return null;
    }
}

module.exports = {
    init,
    save,
    update,
    get
}