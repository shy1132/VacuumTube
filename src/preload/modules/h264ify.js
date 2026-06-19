//code adapted from https://github.com/erkserkserks/h264ify
//Copyright (c) 2015 erkserkserks, The MIT License (MIT)

const configManager = require('../config')
const config = configManager.get()

module.exports = () => {
    if (!config.h264ify) return;

    let video = document.createElement('video')
    let canPlayType = video.canPlayType.bind(video)
    video.__proto__.canPlayType = makeModifiedTypeChecker()

    let mse = window.MediaSource;
    let isTypeSupported = mse.isTypeSupported.bind(mse)
    mse.isTypeSupported = makeModifiedTypeChecker(isTypeSupported)

    function makeModifiedTypeChecker() {
        return (type) => {
            if (config.h264ify_disable_webm && type.includes('webm') ||
                config.h264ify_disable_vp8 && type.includes('vp8') ||
                config.h264ify_disable_vp9 && type.includes('vp9') ||
                config.h264ify_disable_av1 && type.includes('av01')) {
                return '';
            }

            return canPlayType(type);
        };
    }
}