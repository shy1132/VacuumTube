//code adapted from https://github.com/erkserkserks/h264ify
//Copyright (c) 2015 erkserkserks, The MIT License (MIT)

const configManager = require('../config')
const config = configManager.get()

module.exports = () => {
    if (!config.h264ify) return;

    let video = document.createElement('video')
    let canPlayType = video.__proto__.canPlayType;
    video.__proto__.canPlayType = function (type) {
        return isBlocked(type) ? '' : canPlayType.call(this, type);
    }

    let mse = window.MediaSource;
    let isTypeSupported = mse.isTypeSupported;
    mse.isTypeSupported = function (type) {
        return isBlocked(type) ? false : isTypeSupported.call(mse, type);
    }

    function isBlocked(type) {
        return config.h264ify_disable_webm && type.includes('webm') ||
            config.h264ify_disable_vp8 && type.includes('vp8') ||
            config.h264ify_disable_vp9 && (type.includes('vp9') || type.includes('vp09')) ||
            config.h264ify_disable_av1 && type.includes('av01');
    }
}