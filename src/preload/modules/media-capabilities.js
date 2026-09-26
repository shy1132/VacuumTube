//makes MediaSource.isTypeSupported behave like cobalt's
//on cobalt, isTypeSupported understands extra mime parameters (width, height, framerate, bitrate, eotf, channels, etc) and rejects values the device can't handle
//the player relies on this to find out what the device supports by checking that sane values are accepted and absurd ones (e.g. framerate=9999) are rejected
//chromium ignores these parameters and accepts everything, so every one of those checks fails, and the player falls back to assuming no hfr (capping videos at 720p30) and no hdr

const checks = {
    width: (value) => Number(value) > 0 && Number(value) <= 7680, //8k width
    height: (value) => Number(value) > 0 && Number(value) <= 4320, //8k height
    framerate: (value) => Number(value) > 0 && Number(value) <= 60, //60fps
    bitrate: (value) => Number(value) > 0 && Number(value) <= 200000000, //almost double avg bitrate of 8k video
    eotf: (value) => value === 'bt709' || ((value === 'smpte2084' || value === 'arib-std-b67') && isHdrDisplay()),
    channels: (value) => Number(value) > 0 && Number(value) <= 8, //audio channels
    cryptoblockformat: (value) => value === 'subsample',
    'decode-to-texture': (value) => value === 'true' || value === 'false'
}

function isHdrDisplay() {
    return window.matchMedia('(dynamic-range: high)').matches;
}

function isHdrCodec(codec) {
    let parts = codec.split('.')
    let transfer = parts[0] === 'vp09' ? parts[6] : (parts[0] === 'av01' ? parts[7] : undefined)
    return transfer === '16' || transfer === '18';
}

module.exports = () => {
    const isTypeSupported = MediaSource.isTypeSupported.bind(MediaSource)

    MediaSource.isTypeSupported = function (type) {
        let [ mimeType, ...params ] = String(type).split(';').map(p => p.trim())
        let kept = [ mimeType ]

        for (let param of params) {
            let [ key, ...rest ] = param.split('=')
            key = key.trim().toLowerCase()
            let value = rest.join('=').trim().replace(/^"|"$/g, '')

            if (key === 'codecs') {
                if (value.split(',').some(c => isHdrCodec(c.trim())) && !isHdrDisplay()) return false;
                kept.push(param)
            } else if (checks[key]) {
                if (!checks[key](value)) return false;
            } else {
                kept.push(param) //unknown to cobalt too, let chromium decide
            }
        }

        return isTypeSupported(kept.join('; '));
    }
}