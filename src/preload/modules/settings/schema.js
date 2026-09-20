/*
every setting in the overlay comes from this file, as categories -> sections -> rows

to add a toggle, add a row below and its title and description to locale/en.json (and any other languages you speak please...) under settings.<config key>
to add a setting with its own screen, write a page in pages/, list it in pages/index.js, and link a row to it

the row types and their fields are documented in render.js
category and section titles come from settings.categories and settings.sections in the locale
*/

const { ipcRenderer } = require('electron')
const { SPONSORBLOCK_KEYS } = require('./pages/sponsorblock')
const { CODEC_KEYS } = require('./pages/h264ify')
const { GUIDE_TABS } = require('./pages/guide-tabs')

function ratio(locale, on, total) {
    return locale.generic.ratio.replace('{on}', on).replace('{total}', total);
}

function countOn(config, keys) {
    return keys.filter((key) => config[key]).length;
}

module.exports = (locale) => [
    {
        id: 'general',
        sections: [
            {
                id: 'window',
                rows: [
                    { type: 'toggle', key: 'fullscreen', onChange: (value) => ipcRenderer.invoke('set-fullscreen', value) },
                    { type: 'toggle', key: 'no_window_decorations' },
                    { type: 'toggle', key: 'keep_on_top', onChange: (value) => ipcRenderer.invoke('set-on-top', value) }
                ]
            },
            {
                id: 'behavior',
                rows: [
                    { type: 'toggle', key: 'pause_on_blur' }
                ]
            },
            {
                id: 'updates',
                rows: [
                    { type: 'toggle', key: 'auto_update', hide: !ipcRenderer.sendSync('can-auto-update') } //hidden if installation can't auto-update to begin with
                ]
            }
        ]
    },
    {
        id: 'playback',
        sections: [
            {
                id: 'content',
                rows: [
                    { type: 'toggle', key: 'adblock' },
                    {
                        type: 'toggle', key: 'sponsorblock', page: 'sponsorblock',
                        summary: (config) => ratio(locale, countOn(config, SPONSORBLOCK_KEYS), SPONSORBLOCK_KEYS.length)
                    },
                    { type: 'toggle', key: 'block_continue_watching' },
                    { type: 'toggle', key: 'dearrow' },
                    { type: 'toggle', key: 'dislikes' }
                ]
            },
            {
                id: 'quality',
                rows: [
                    { type: 'toggle', key: 'unlock_resolution' },
                    { type: 'toggle', key: 'remove_super_resolution' },
                    { type: 'toggle', key: 'hardware_decoding' },
                    { type: 'toggle', key: 'wayland_hdr', hide: process.platform !== 'linux' },
                    {
                        type: 'toggle',key: 'h264ify', page: 'h264ify',
                        title: locale.h264ify.enable_title, description: locale.h264ify.enable_description,
                        summary: (config) => ratio(locale, countOn(config, CODEC_KEYS), CODEC_KEYS.length)
                    }
                ]
            }
        ]
    },
    {
        id: 'appearance',
        sections: [
            {
                id: 'interface',
                rows: [
                    { type: 'toggle', key: 'hide_shorts' },
                    {
                        type: 'link', page: 'guide_tabs',
                        title: locale.guide_tabs.title,
                        summary: (config) => ratio(locale, GUIDE_TABS.filter((tab) => !(config.disabled_tabs || []).includes(tab)).length, GUIDE_TABS.length)
                    }
                ]
            },
            {
                id: 'userstyles',
                rows: [
                    { type: 'toggle', key: 'userstyles', page: 'userstyles', title: locale.userstyles.enable, description: locale.userstyles.description }
                ]
            }
        ]
    },
    {
        id: 'controls',
        sections: [
            {
                id: 'input',
                rows: [
                    { type: 'toggle', key: 'controller_support' },
                    { type: 'toggle', key: 'touch_overlay' }
                ]
            },
            {
                id: 'devices',
                rows: [
                    { type: 'toggle', key: 'device_discoverability' },
                    { type: 'link', page: 'mac_permissions', title: locale.mac_permissions.title, hide: process.platform !== 'darwin' }
                ]
            }
        ]
    },
    {
        id: 'advanced',
        sections: [
            {
                id: 'performance',
                rows: [
                    { type: 'toggle', key: 'low_memory_mode' }
                ]
            },
            {
                id: 'experimental',
                rows: [
                    { type: 'notice', tone: 'warning', title: locale.features.notice_title, text: locale.features.notice_description },
                    { type: 'toggle', key: 'features_enabled', page: 'features', title: locale.features.enable_title, description: locale.features.enable_description }
                ]
            }
        ]
    }
]