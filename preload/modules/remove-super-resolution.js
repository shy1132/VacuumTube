//youtube added "super resolution", which is just ai upscaled qualities. very dumb...

const jsonMod = require('../util/jsonModifiers')
const configManager = require('../config')
const config = configManager.get()

module.exports = () => {
    jsonMod.addModifier((json) => {
        if (!config.remove_super_resolution) return json;
        if (!json?.streamingData?.adaptiveFormats) return json;

        json.streamingData.adaptiveFormats = json.streamingData.adaptiveFormats.filter(f => f.xtags !== 'CgcKAnNyEgEx') //i don't exactly know what that string means, but it does indicate that it's "Super resolution". hopefully the string doesn't change, i can't seem to figure out what script is responsible for determing if it's "Super resolution"

        return json;
    })
}