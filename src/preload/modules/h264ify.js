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
            let disallowedTypes = ['webm', 'vp8', 'vp9', 'av01']

            for (let disallowedType of disallowedTypes) {
                if (type.includes(disallowedType)) {
                    return '';
                }
            }

            return canPlayType(type);
        };
    }
}
